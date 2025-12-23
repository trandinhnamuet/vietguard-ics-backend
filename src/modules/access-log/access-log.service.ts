import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, FindOptionsWhere } from 'typeorm';
import { AccessLog } from '../../entities/access-log.entity';
import { RecordAccessDto } from '../../dto/record-access.dto';

export interface PaginatedAccessLogs {
  data: AccessLog[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class AccessLogService {
  constructor(
    @InjectRepository(AccessLog)
    private readonly accessLogRepo: Repository<AccessLog>,
  ) {}

  /**
   * Record access - create new or update existing
   * Priority: IPv6 > IPv4 for user identification
   * If IPv6 exists, use it as primary identifier (device-specific)
   * If no IPv6, use IPv4 as identifier
   */
  async recordAccess(dto: RecordAccessDto): Promise<AccessLog> {
    const { ipv4, ipv6 } = dto;

    // Determine primary identifier (IPv6 > IPv4)
    const primaryIdentifier = ipv6 || ipv4;
    
    if (!primaryIdentifier) {
      throw new Error('At least IPv4 or IPv6 is required');
    }

    // Build where condition based on primary identifier
    const whereCondition: FindOptionsWhere<AccessLog> = ipv6 
      ? { ipv6 }  // If IPv6 exists, match by IPv6 (device-specific)
      : { ipv4 }; // Otherwise match by IPv4

    let accessLog = await this.accessLogRepo.findOne({
      where: whereCondition,
    });

    if (accessLog) {
      // Update existing record
      accessLog.access_count += 1;
      accessLog.last_access_time = new Date();
      
      // Store both IPs if we have them
      if (ipv4 && !accessLog.ipv4) accessLog.ipv4 = ipv4;
      if (ipv6 && !accessLog.ipv6) accessLog.ipv6 = ipv6;
      
      console.log(`[AccessLog] Updated: Primary=${ipv6 ? 'IPv6' : 'IPv4'}(${primaryIdentifier}), Count=${accessLog.access_count}`);
    } else {
      // Create new record
      accessLog = new AccessLog();
      accessLog.ipv4 = ipv4 || null;
      accessLog.ipv6 = ipv6 || null;
      accessLog.access_count = 1;
      accessLog.last_access_time = new Date();
      
      console.log(`[AccessLog] Created: Primary=${ipv6 ? 'IPv6' : 'IPv4'}(${primaryIdentifier}), IPv4=${ipv4 || 'N/A'}, IPv6=${ipv6 || 'N/A'}`);
    }

    return await this.accessLogRepo.save(accessLog);
  }

  /**
   * Update email for IP/IPv6
   * Priority: IPv6 > IPv4 for user identification
   */
  async updateEmailByIp(ipv4: string | undefined, ipv6: string | undefined, email: string): Promise<void> {
    // Determine primary identifier (IPv6 > IPv4)
    const primaryIdentifier = ipv6 || ipv4;
    
    if (!primaryIdentifier) {
      console.warn('[AccessLog] updateEmailByIp: No IPv4 or IPv6 provided');
      return;
    }

    // Build where condition based on primary identifier
    const whereCondition: FindOptionsWhere<AccessLog> = ipv6 
      ? { ipv6 }  // If IPv6 exists, match by IPv6
      : { ipv4 }; // Otherwise match by IPv4

    const accessLog = await this.accessLogRepo.findOne({
      where: whereCondition,
    });

    if (accessLog && !accessLog.email) {
      accessLog.email = email;
      await this.accessLogRepo.save(accessLog);
      console.log(`[AccessLog] Email updated: Primary=${ipv6 ? 'IPv6' : 'IPv4'}(${primaryIdentifier}), Email=${email}`);
    }
  }

  /**
   * Get all access logs with pagination, sorting, and search
   */
  async getAccessLogs(
    page: number = 1,
    limit: number = 10,
    sortBy: string = 'last_access_time',
    sortOrder: 'ASC' | 'DESC' = 'DESC',
    search?: string,
  ): Promise<PaginatedAccessLogs> {
    const queryBuilder = this.accessLogRepo.createQueryBuilder('access_log');

    // Search filter
    if (search) {
      queryBuilder.where(
        '(access_log.ipv4 ILIKE :search OR access_log.ipv6 ILIKE :search OR access_log.email ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    // Validate sortBy field
    const allowedSortFields = ['id', 'ipv4', 'ipv6', 'email', 'access_count', 'last_access_time', 'created_at'];
    if (!allowedSortFields.includes(sortBy)) {
      sortBy = 'last_access_time';
    }

    // Sorting
    queryBuilder.orderBy(`access_log.${sortBy}`, sortOrder);

    // Pagination
    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit);

    // Execute query
    const [data, total] = await queryBuilder.getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get total count
   */
  async getTotalCount(): Promise<number> {
    return await this.accessLogRepo.count();
  }
}
