import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExternalApiService } from './external-api.service';
import { DealersController } from './controllers/dealers.controller';
import { MembersController } from './controllers/members.controller';
import { ServiceController } from './controllers/service.controller';
import { Member } from '../../entities/member.entity';
import { AppTotalGoTask } from '../../entities/app-total-go-task.entity';
import { DownloadToken } from '../../entities/download-token.entity';

@Module({
  imports: [
    HttpModule.register({
      timeout: 30000, // 30 seconds timeout for file uploads
      maxRedirects: 5,
    }),
    ConfigModule,
    TypeOrmModule.forFeature([Member, AppTotalGoTask, DownloadToken]),
  ],
  controllers: [
    DealersController,
    MembersController,
    ServiceController,
  ],
  providers: [ExternalApiService],
  exports: [ExternalApiService],
})
export class ExternalApiModule {}