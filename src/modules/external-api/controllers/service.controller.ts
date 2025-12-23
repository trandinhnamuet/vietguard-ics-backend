import {
    Controller,
    Get,
    Post,
    Param,
    Query,
    Body,
    UploadedFile,
    UseInterceptors,
    ValidationPipe,
    Res,
    BadRequestException,
    NotFoundException,
    Logger,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiConsumes } from '@nestjs/swagger';
import { Response } from 'express';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ExternalApiService } from '../external-api.service';
import { CreateAppTotalGoDto } from '../dto/create-app-total-go.dto';
import { GetAppTotalGoHistoryDto } from '../dto/get-app-total-go-history.dto';
import { DownloadToken } from '../../../entities/download-token.entity';

@ApiTags('Service')
@Controller('service')
export class ServiceController {
    private readonly logger = new Logger(ServiceController.name);
    
    constructor(
        private readonly externalApiService: ExternalApiService,
        @InjectRepository(DownloadToken)
        private readonly downloadTokenRepo: Repository<DownloadToken>,
    ) {}

    @Post('app-total-go')
    @UseInterceptors(FileInterceptor('file'))
    @ApiConsumes('multipart/form-data')
    @ApiOperation({
        summary: 'Create new AppTotalGo service task',
        description: 'Create a new AppTotalGo service task for mobile app analysis',
    })
    @ApiResponse({ status: 201, description: 'Service task created successfully' })
    async createAppTotalGo(
        @Body() createAppTotalGoDto: CreateAppTotalGoDto,
        @UploadedFile() file: any,
    ) {
        this.logger.log('=== CREATE APP TOTAL GO REQUEST ===');
        this.logger.log('DTO:', JSON.stringify(createAppTotalGoDto));
        this.logger.log('File:', file ? { fieldname: file.fieldname, originalname: file.originalname, size: file.size, mimetype: file.mimetype } : null);
        
        if (!file) {
            this.logger.error('FILE IS MISSING');
            throw new BadRequestException('File is required');
        }
        if (!createAppTotalGoDto.memberName) {
            this.logger.error('MEMBER NAME IS MISSING');
            throw new BadRequestException('memberName is required');
        }
        if (!createAppTotalGoDto.clientIp) {
            this.logger.error('CLIENT IP IS MISSING');
            throw new BadRequestException('clientIp is required');
        }
        
        try {
            this.logger.log('Calling externalApiService.createAppTotalGo...');
            const result = await this.externalApiService.createAppTotalGo(createAppTotalGoDto, file);
            this.logger.log('SUCCESS:', result);
            return result;
        } catch (error) {
            this.logger.error('ERROR in createAppTotalGo:', error);
            throw error;
        }
    }

    @Get('app-total-go/status/:id')
    @ApiOperation({
        summary: 'Get AppTotalGo service task status',
        description: 'Get the status of an AppTotalGo service task',
    })
    @ApiResponse({ status: 200, description: 'Status retrieved successfully' })
    async getAppTotalGoStatus(@Param('id') id: string) {
        return await this.externalApiService.getAppTotalGoStatus(id);
    }

    @Get('app-total-go/download/:token')
    @ApiOperation({
        summary: 'Secure download with token',
        description: 'Download analysis result file using a secure token from email',
    })
    @ApiResponse({ status: 200, description: 'File downloaded successfully' })
    async secureDownload(@Param('token') token: string, @Res() res: Response) {
        try {
            this.logger.log('=== SECURE DOWNLOAD REQUEST ===');
            this.logger.log('Token:', token);
            
            // Find and validate token
            const downloadToken = await this.downloadTokenRepo.findOne({
                where: { token: token }
            });

            if (!downloadToken) {
                this.logger.error('Token not found');
                throw new NotFoundException('Invalid download link');
            }

            // Check if token is expired
            if (new Date() > downloadToken.expires_at) {
                this.logger.error('Token expired');
                throw new BadRequestException('Download link has expired');
            }

            // Check if token was already used (optional - remove if you want multiple downloads)
            // if (downloadToken.used) {
            //     this.logger.error('Token already used');
            //     throw new BadRequestException('Download link has already been used');
            // }

            this.logger.log('Token valid, fetching file for task:', downloadToken.task_id);

            // Get file from external API
            const { buffer, contentType, filename } = await this.externalApiService.getAppTotalGoFiles(downloadToken.task_id);
            
            this.logger.log('File received successfully');
            this.logger.log('File buffer size:', buffer.length, 'bytes');
            this.logger.log('Content-Type:', contentType);
            this.logger.log('Filename:', filename);

            // Mark token as used (optional)
            // downloadToken.used = true;
            // await this.downloadTokenRepo.save(downloadToken);
            
            res.setHeader('Content-Type', contentType);
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            return res.send(buffer);
        } catch (error: any) {
            this.logger.error('ERROR in secureDownload:', error);
            this.logger.error('Error message:', error.message);
            
            if (error instanceof NotFoundException || error instanceof BadRequestException) {
                throw error;
            }
            
            res.status(400).json({ error: error.message });
        }
    }

    @Get('app-total-go/files/:id')
    @ApiOperation({
        summary: 'Download analysis result file',
        description: 'Download the analysis result file from a completed AppTotalGo task',
    })
    @ApiResponse({ status: 200, description: 'File downloaded successfully' })
    async downloadAppTotalGoFile(@Param('id') id: string, @Res() res: Response) {
        try {
            this.logger.log('=== DOWNLOAD APP TOTAL GO FILE ===');
            this.logger.log('File ID:', id);
            
            const { buffer, contentType, filename } = await this.externalApiService.getAppTotalGoFiles(id);
            
            this.logger.log('File received successfully');
            this.logger.log('File buffer size:', buffer.length, 'bytes');
            this.logger.log('Content-Type:', contentType);
            this.logger.log('Filename:', filename);
            this.logger.log('First 20 bytes (hex):', buffer.slice(0, 20).toString('hex'));
            
            res.setHeader('Content-Type', contentType);
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            return res.send(buffer);
        } catch (error: any) {
            this.logger.error('ERROR in downloadAppTotalGoFile:', error);
            this.logger.error('Error message:', error.message);
            res.status(400).json({ error: error.message });
        }
    }

    @Get('app-total-go/history')
    @ApiOperation({
        summary: 'Get AppTotalGo history',
        description: 'Get AppTotalGo history (analysis task list)',
    })
    @ApiResponse({ status: 200, description: 'History retrieved successfully' })
    async getAppTotalGoHistory(@Query(ValidationPipe) getAppTotalGoHistoryDto: GetAppTotalGoHistoryDto) {
        return await this.externalApiService.getAppTotalGoHistory(getAppTotalGoHistoryDto);
    }
}