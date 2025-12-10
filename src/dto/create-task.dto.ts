import { IsEmail, IsString, IsIP } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTaskDto {
  @ApiProperty({ description: 'Member email (name)' })
  @IsEmail()
  memberName: string;

  @ApiProperty({ description: 'Client IP address' })
  @IsIP()
  clientIp: string;

  @ApiProperty({ 
    description: 'Mobile application file (.apk, .aab, .ipa)',
    type: 'string',
    format: 'binary'
  })
  file: any;
}