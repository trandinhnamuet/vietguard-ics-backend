import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  ValidationPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { AccessLogService, PaginatedAccessLogs } from './access-log.service';
import { RecordAccessDto } from '../../dto/record-access.dto';

@ApiTags('Access Logs')
@Controller('access-logs')
export class AccessLogController {
  constructor(private readonly accessLogService: AccessLogService) {}

  @Post('record')
  @ApiOperation({
    summary: 'Record access',
    description: 'Record user access with IP address',
  })
  @ApiResponse({ status: 201, description: 'Access recorded successfully' })
  async recordAccess(@Body(ValidationPipe) dto: RecordAccessDto) {
    const result = await this.accessLogService.recordAccess(dto);
    return {
      message: 'Access recorded successfully',
      data: {
        id: result.id,
        access_count: result.access_count,
      },
    };
  }

  @Get()
  @ApiOperation({
    summary: 'Get all access logs',
    description: 'Get all access logs with pagination, sorting, and search',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page' })
  @ApiQuery({ name: 'sortBy', required: false, type: String, description: 'Sort by field' })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['ASC', 'DESC'], description: 'Sort order' })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Search by ipv4, ipv6, or email' })
  @ApiResponse({ status: 200, description: 'Access logs retrieved successfully' })
  async getAccessLogs(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'ASC' | 'DESC',
    @Query('search') search?: string,
  ): Promise<PaginatedAccessLogs> {
    return await this.accessLogService.getAccessLogs(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 10,
      sortBy || 'last_access_time',
      sortOrder || 'DESC',
      search,
    );
  }

  @Get('count')
  @ApiOperation({
    summary: 'Get total access count',
    description: 'Get total number of unique visitors',
  })
  @ApiResponse({ status: 200, description: 'Total count retrieved successfully' })
  async getTotalCount() {
    const count = await this.accessLogService.getTotalCount();
    return { total: count };
  }
}
