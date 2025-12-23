import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Member } from '../../entities/member.entity';
import { MemberVerification } from '../../entities/member-verification.entity';
import { MemberService as MemberServiceEntity } from '../../entities/member-service.entity';
import { AppTotalGoTask } from '../../entities/app-total-go-task.entity';
import { DownloadToken } from '../../entities/download-token.entity';
import { MemberService } from './member.service';
import { MemberController } from './member.controller';
import { ExternalApiModule } from '../external-api/external-api.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Member,
      MemberVerification,
      MemberServiceEntity,
      AppTotalGoTask,
      DownloadToken,
    ]),
    ExternalApiModule,
  ],
  controllers: [MemberController],
  providers: [MemberService],
  exports: [MemberService],
})
export class MemberModule {}