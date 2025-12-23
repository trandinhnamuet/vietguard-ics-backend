import { IsOptional, IsString, IsIP } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RecordAccessDto {
  @ApiProperty({ description: 'IPv4 address', example: '192.168.1.1', required: false })
  @IsOptional()
  @IsString()
  ipv4?: string;

  @ApiProperty({ description: 'IPv6 address', example: '::1', required: false })
  @IsOptional()
  @IsString()
  ipv6?: string;
}
