import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ExternalApiModule } from './modules/external-api/external-api.module';
import { MemberModule } from './modules/member/member.module';
import { SchedulerModule } from './modules/scheduler/scheduler.module';
import { AccessLogModule } from './modules/access-log/access-log.module';
import { AppDataSource } from '../data-source';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRoot(AppDataSource.options),
    ExternalApiModule,
    MemberModule,
    SchedulerModule,
    AccessLogModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
