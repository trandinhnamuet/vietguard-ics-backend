import { IsEmail, IsString, Length, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyOtpDto {
  @ApiProperty({ description: 'Email address' })
  @IsEmail()
  email: string;

  @ApiProperty({ description: 'OTP code (6 digits)' })
  @IsString()
  @Length(6, 6)
  otp: string;

  @ApiProperty({ description: 'IPv4 address of the user', required: false })
  @IsOptional()
  @IsString()
  ipv4?: string;

  @ApiProperty({ description: 'IPv6 address of the user', required: false })
  @IsOptional()
  @IsString()
  ipv6?: string;
}