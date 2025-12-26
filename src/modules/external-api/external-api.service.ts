import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { Member } from '../../entities/member.entity';
import { AppTotalGoTask } from '../../entities/app-total-go-task.entity';
import { CreateMemberDto } from './dto/create-member.dto';
import { GetMembersDto } from './dto/get-members.dto';
import { AssignServicesDto } from './dto/assign-services.dto';
import { CreateAppTotalGoDto } from './dto/create-app-total-go.dto';
import { GetAppTotalGoHistoryDto, AppTotalGoHistoryResponse } from './dto/get-app-total-go-history.dto';

@Injectable()
export class ExternalApiService {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly logger = new Logger(ExternalApiService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    @InjectRepository(Member)
    private readonly memberRepo: Repository<Member>,
    @InjectRepository(AppTotalGoTask)
    private readonly taskRepo: Repository<AppTotalGoTask>,
  ) {
    this.baseUrl = this.configService.get<string>('EXTERNAL_API_URL', '');
    this.apiKey = this.configService.get<string>('EXTERNAL_API_KEY', '');
    this.logger.log('=== ExternalApiService initialized ===');
    this.logger.log('EXTERNAL_API_URL:', this.baseUrl);
    this.logger.log('EXTERNAL_API_KEY:', this.apiKey ? '***' : 'NOT SET');
  }

  private getHeaders(contentType: string = 'application/json') {
    return {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': contentType,
      'accept': 'text/plain',
    };
  }

  // DEALERS ENDPOINTS
  async exportServiceUsageLogs(): Promise<Buffer> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.baseUrl.replace(/\/$/, '')}/api/dealers/export-service-usage-logs`, {
          headers: this.getHeaders(),
          responseType: 'arraybuffer',
          timeout: 120000, // 2 minutes timeout for export
          maxContentLength: 50 * 1024 * 1024, // 50MB max file size
          maxBodyLength: 50 * 1024 * 1024, // 50MB max body size
        }),
      );
      return Buffer.from(response.data);
    } catch (error) {
      throw new HttpException('Failed to export service usage logs', HttpStatus.BAD_REQUEST);
    }
  }

  // MEMBERS ENDPOINTS
  async createMember(createMemberDto: CreateMemberDto): Promise<any> {
    try {
      this.logger.log('=== CREATE MEMBER ===');
      this.logger.log('BaseUrl:', this.baseUrl);
      this.logger.log('ApiKey set:', this.apiKey ? 'YES' : 'NO');
      this.logger.log('Payload:', JSON.stringify(createMemberDto));
      
      const url = `${this.baseUrl.replace(/\/$/, '')}/api/members`;
      const headers = this.getHeaders();
      this.logger.log('POST URL:', url);
      this.logger.log('Headers:', { 'accept': 'text/plain', 'Authorization': this.apiKey ? 'Bearer ***' : 'NOT SET', 'Content-Type': 'application/json' });
      
      const response = await firstValueFrom(
        this.httpService.post(
          url,
          createMemberDto,
          { headers },
        ),
      );
      
      this.logger.log('SUCCESS Response:', response.data);
      return response.data;
    } catch (error: any) {
      this.logger.error('ERROR in createMember - Message:', error.message);
      this.logger.error('ERROR in createMember - Response Data:', error.response?.data);
      this.logger.error('ERROR in createMember - Status:', error.response?.status);
      this.logger.error('ERROR in createMember - Status Text:', error.response?.statusText);
      
      const errorMessage = error.response?.data?.message || error.response?.statusText || error.message || 'Unknown error from external API';
      throw new HttpException(
        `External API Error: ${errorMessage}`,
        error.response?.status || HttpStatus.BAD_REQUEST
      );
    }
  }

  async getMembers(getMembersDto: GetMembersDto): Promise<any> {
    try {
      const params = new URLSearchParams();
      if (getMembersDto.page) params.append('page', getMembersDto.page.toString());
      if (getMembersDto.pageSize) params.append('pageSize', getMembersDto.pageSize.toString());
      if (getMembersDto.sortOrder) params.append('sortOrder', getMembersDto.sortOrder);
      if (getMembersDto.memberName) params.append('memberName', getMembersDto.memberName);
      if (getMembersDto.dealerName) params.append('dealerName', getMembersDto.dealerName);
      if (getMembersDto.sortBy) params.append('sortBy', getMembersDto.sortBy);

      const queryString = params.toString();
      const url = `${this.baseUrl.replace(/\/$/, '')}/api/members${queryString ? '?' + queryString : ''}`;

      const response = await firstValueFrom(
        this.httpService.get(url, {
          headers: this.getHeaders(),
        }),
      );
      return response.data;
    } catch (error) {
      throw new HttpException('Failed to get members', HttpStatus.BAD_REQUEST);
    }
  }

  async assignServices(assignServicesDto: AssignServicesDto): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.baseUrl.replace(/\/$/, '')}/api/members/services`,
          assignServicesDto,
          { headers: this.getHeaders() },
        ),
      );
      return response.data;
    } catch (error) {
      throw new HttpException('Failed to assign services', HttpStatus.BAD_REQUEST);
    }
  }

  // SERVICE ENDPOINTS
  async createAppTotalGo(createAppTotalGoDto: CreateAppTotalGoDto, file: any): Promise<any> {
    try {
      this.logger.log('=== CREATE APP TOTAL GO SERVICE ===');
      this.logger.log('BaseUrl:', this.baseUrl);
      this.logger.log('ApiKey set:', this.apiKey ? 'YES' : 'NO');
      
      // Convert memberName from email to Guest{id} if possible
      let memberName = createAppTotalGoDto.memberName;
      if (memberName && memberName.includes('@')) {
        // Query database to find member by email
        const member = await this.memberRepo.findOne({ where: { email: memberName } });
        if (member && member.id) {
          memberName = `Guest${member.id}`;
          this.logger.log(`Member found by email: ${memberName}`);
        } else {
          this.logger.warn(`Member not found for email: ${memberName}, using original memberName`);
        }
      }
      
      this.logger.log('Final memberName for external API:', memberName);
      this.logger.log('DTO:', JSON.stringify({ ...createAppTotalGoDto, memberName }));
      this.logger.log('File:', file ? { fieldname: file.fieldname, originalname: file.originalname, size: file.size, mimetype: file.mimetype } : null);
      
      const FormData = require('form-data');
      const formData = new FormData();
      
      // Append form data in exact order as curl command
      formData.append('ClientIp', createAppTotalGoDto.clientIp || '');
      formData.append('File', file.buffer, {
        filename: file.originalname,
        contentType: file.mimetype || 'application/octet-stream',
      });
      formData.append('MemberName', memberName || '');

      const url = `${this.baseUrl.replace(/\/$/, '')}/api/service/app-total-go`;
      this.logger.log('POST URL:', url);
      
      // Match headers from curl command with Bearer token
      const headers = {
        'accept': 'text/plain',
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': `multipart/form-data; boundary=${formData.getBoundary()}`,
        ...formData.getHeaders(),
      };
      this.logger.log('Headers:', { 'accept': 'text/plain', 'Authorization': this.apiKey ? 'Bearer ***' : 'NOT SET', 'Content-Type': 'multipart/form-data' });

      this.logger.log('Making POST request...');
      const response = await firstValueFrom(
        this.httpService.post(
          url,
          formData,
          { headers },
        ),
      );
      
      this.logger.log('SUCCESS Response:', response.data);
      
      // Save task to database for scheduler to track
      if (response.data?.data?.id) {
        try {
          const taskId = response.data.data.id;
          const member = await this.memberRepo.findOne({ where: { email: createAppTotalGoDto.memberName } });
          
          if (member) {
            const newTask = this.taskRepo.create({
              member_id: member.id,
              external_task_id: taskId,
              file_name: file.originalname,
              status: 'InProgress', // Start with InProgress status
            });
            await this.taskRepo.save(newTask);
            this.logger.log(`✅ Task saved to DB: ID=${taskId}, Member=${member.id}`);
          } else {
            this.logger.warn(`⚠️ Member not found for email ${createAppTotalGoDto.memberName}, task not saved`);
          }
        } catch (saveError) {
          this.logger.error('Failed to save task to database:', saveError.message);
          // Don't throw, just log - still return successful response to user
        }
      }
      
      return response.data;
    } catch (error: any) {
      this.logger.error('FULL ERROR STACK:', error.stack);
      this.logger.error('ERROR in createAppTotalGo - Message:', error.message);
      this.logger.error('ERROR in createAppTotalGo - Response Data:', error.response?.data);
      this.logger.error('ERROR in createAppTotalGo - Status:', error.response?.status);
      this.logger.error('ERROR in createAppTotalGo - Status Text:', error.response?.statusText);
      this.logger.error('ERROR in createAppTotalGo - URL Attempted:', `${this.baseUrl.replace(/\/$/, '')}/api/service/app-total-go`);
      
      // Throw detailed error message
      const errorMessage = error.response?.data?.message || error.response?.statusText || error.message || 'Unknown error from external API';
      throw new HttpException(
        `External API Error: ${errorMessage}`,
        error.response?.status || HttpStatus.BAD_REQUEST
      );
    }
  }

  async getAppTotalGoStatus(id: string): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(
          `${this.baseUrl.replace(/\/$/, '')}/api/service/app-total-go/status/${id}`,
          { headers: this.getHeaders() },
        ),
      );
      // Extract status from nested data object
      // API returns: { code: '0', message: 'Success', data: { id: '20343', status: 'InProgress' } }
      // We need to return: { status: 'InProgress' }
      if (response.data?.data?.status) {
        return { status: response.data.data.status };
      }
      return response.data;
    } catch (error) {
      throw new HttpException('Failed to get AppTotalGo status', HttpStatus.BAD_REQUEST);
    }
  }

  async getAppTotalGoFiles(id: string): Promise<{ buffer: Buffer; contentType: string; filename: string }> {
    try {
      const url = `${this.baseUrl.replace(/\/$/, '')}/api/service/app-total-go/files/${id}`;
      const headers = this.getHeaders();
      
      this.logger.log('=== GET APP TOTAL GO FILES ===');
      this.logger.log('BaseUrl:', this.baseUrl);
      this.logger.log('ApiKey set:', this.apiKey ? 'YES' : 'NO');
      this.logger.log('File ID:', id);
      this.logger.log('GET URL:', url);
      this.logger.log('Headers:', { 'accept': 'text/plain', 'Authorization': this.apiKey ? 'Bearer ***' : 'NOT SET', 'Content-Type': 'application/json' });
      
      this.logger.log('Making GET request...');
      const response = await firstValueFrom(
        this.httpService.get(
          url,
          {
            headers: headers,
            responseType: 'arraybuffer',
            timeout: 300000, // 5 minutes timeout for large PDF files
            maxContentLength: 100 * 1024 * 1024, // 100MB max file size
            maxBodyLength: 100 * 1024 * 1024, // 100MB max body size
          },
        ),
      );
      
      this.logger.log('SUCCESS Response received');
      this.logger.log('Response size:', response.data.length, 'bytes');
      
      // Detect file type from buffer magic numbers
      const fileBuffer = Buffer.from(response.data);
      let contentType = 'application/octet-stream';
      let filename = `analysis-result-${id}`;
      
      // Check for PDF (25 50 44 46 = %PDF)
      if (fileBuffer[0] === 0x25 && fileBuffer[1] === 0x50 && fileBuffer[2] === 0x44 && fileBuffer[3] === 0x46) {
        contentType = 'application/pdf';
        filename = `${filename}.pdf`;
        this.logger.log('File type detected: PDF');
      }
      // Check for ZIP (50 4B 03 04 = PK..)
      else if (fileBuffer[0] === 0x50 && fileBuffer[1] === 0x4B && fileBuffer[2] === 0x03 && fileBuffer[3] === 0x04) {
        contentType = 'application/zip';
        filename = `${filename}.zip`;
        this.logger.log('File type detected: ZIP');
      }
      // Check for GZIP (1F 8B)
      else if (fileBuffer[0] === 0x1F && fileBuffer[1] === 0x8B) {
        contentType = 'application/gzip';
        filename = `${filename}.gz`;
        this.logger.log('File type detected: GZIP');
      }
      // Check for RAR (52 61 72 21 = Rar!)
      else if (fileBuffer[0] === 0x52 && fileBuffer[1] === 0x61 && fileBuffer[2] === 0x72 && fileBuffer[3] === 0x21) {
        contentType = 'application/x-rar-compressed';
        filename = `${filename}.rar`;
        this.logger.log('File type detected: RAR');
      }
      
      this.logger.log('Content-Type:', contentType);
      this.logger.log('Filename:', filename);
      
      return { buffer: fileBuffer, contentType, filename };
    } catch (error: any) {
      this.logger.error('FULL ERROR STACK:', error.stack);
      this.logger.error('ERROR in getAppTotalGoFiles - Message:', error.message);
      this.logger.error('ERROR in getAppTotalGoFiles - Response Data:', error.response?.data);
      this.logger.error('ERROR in getAppTotalGoFiles - Status:', error.response?.status);
      this.logger.error('ERROR in getAppTotalGoFiles - Status Text:', error.response?.statusText);
      this.logger.error('ERROR in getAppTotalGoFiles - URL Attempted:', `${this.baseUrl.replace(/\/$/, '')}/api/service/app-total-go/files/${id}`);
      
      throw new HttpException('Failed to get AppTotalGo files', HttpStatus.BAD_REQUEST);
    }
  }

  async getAppTotalGoHistory(getAppTotalGoHistoryDto: GetAppTotalGoHistoryDto): Promise<AppTotalGoHistoryResponse> {
    try {
      const params = new URLSearchParams();
      if (getAppTotalGoHistoryDto.startTime) params.append('startTime', getAppTotalGoHistoryDto.startTime);
      if (getAppTotalGoHistoryDto.endTime) params.append('endTime', getAppTotalGoHistoryDto.endTime);

      const queryString = params.toString();
      const url = `${this.baseUrl.replace(/\/$/, '')}/api/service/app-total-go/history${queryString ? '?' + queryString : ''}`;

      const response = await firstValueFrom(
        this.httpService.get(url, {
          headers: this.getHeaders(),
        }),
      );
      return response.data;
    } catch (error) {
      throw new HttpException('Failed to get AppTotalGo history', HttpStatus.BAD_REQUEST);
    }
  }
}