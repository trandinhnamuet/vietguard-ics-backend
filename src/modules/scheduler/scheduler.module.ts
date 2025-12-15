import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { SchedulerService } from './scheduler.service';
import { AppTotalGoTask } from '../../entities/app-total-go-task.entity';
import { ExternalApiModule } from '../external-api/external-api.module';
import { MemberModule } from '../member/member.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    TypeOrmModule.forFeature([AppTotalGoTask]),
    ExternalApiModule,
    MemberModule,
  ],
  providers: [SchedulerService],
  exports: [SchedulerService],
})
export class SchedulerModule {}
