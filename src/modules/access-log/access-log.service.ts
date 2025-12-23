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
   */
  async recordAccess(dto: RecordAccessDto): Promise<AccessLog> {
    const { ipv4, ipv6 } = dto;

    // Build where conditions for finding existing record
    const whereConditions: FindOptionsWhere<AccessLog>[] = [];
    if (ipv4) whereConditions.push({ ipv4 });
    if (ipv6) whereConditions.push({ ipv6 });

    let accessLog: AccessLog | null = null;
    
    if (whereConditions.length > 0) {
      accessLog = await this.accessLogRepo.findOne({
        where: whereConditions,
      });
    }

    if (accessLog) {
      // Update existing record
      accessLog.access_count += 1;
      accessLog.last_access_time = new Date();
      if (ipv4 && !accessLog.ipv4) accessLog.ipv4 = ipv4;
      if (ipv6 && !accessLog.ipv6) accessLog.ipv6 = ipv6;
    } else {
      // Create new record
      accessLog = new AccessLog();
      accessLog.ipv4 = ipv4 || null;
      accessLog.ipv6 = ipv6 || null;
      accessLog.access_count = 1;
      accessLog.last_access_time = new Date();
    }

    return await this.accessLogRepo.save(accessLog);
  }

  /**
   * Update email for IP
   */
  async updateEmailByIp(ipv4: string | undefined, ipv6: string | undefined, email: string): Promise<void> {
    const whereConditions: FindOptionsWhere<AccessLog>[] = [];
    if (ipv4) whereConditions.push({ ipv4 });
    if (ipv6) whereConditions.push({ ipv6 });

    if (whereConditions.length === 0) return;

    const accessLog = await this.accessLogRepo.findOne({
      where: whereConditions,
    });

    if (accessLog && !accessLog.email) {
      accessLog.email = email;
      await this.accessLogRepo.save(accessLog);
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
