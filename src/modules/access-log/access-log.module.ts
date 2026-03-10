import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccessLog } from '../../entities/access-log.entity';
import { AccessLogService } from './access-log.service';
import { AccessLogController } from './access-log.controller';
import { AdminGuard } from '../admin/admin.guard';

@Module({
  imports: [TypeOrmModule.forFeature([AccessLog])],
  controllers: [AccessLogController],
  providers: [AccessLogService, AdminGuard],
  exports: [AccessLogService],
})
export class AccessLogModule {}
