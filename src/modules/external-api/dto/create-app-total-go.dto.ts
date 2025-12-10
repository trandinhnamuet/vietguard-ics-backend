import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateAppTotalGoDto {
  @ApiProperty({ description: 'Mobile application file (.apk, .aab, .ipa)', type: 'string', format: 'binary' })
  file: any;

  @ApiProperty({ description: 'Member name who will use this service' })
  @IsString()
  memberName: string;

  @ApiProperty({ description: 'Client IP address for request tracking' })
  @IsString()
  clientIp: string;
}