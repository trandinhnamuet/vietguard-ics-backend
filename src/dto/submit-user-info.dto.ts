import { IsEmail, IsString, IsOptional, Length } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SubmitUserInfoDto {
  @ApiProperty({ description: 'Email address' })
  @IsEmail()
  email: string;

  @ApiProperty({ description: 'OTP code (6 digits)' })
  @IsString()
  @Length(6, 6)
  otp: string;

  @ApiProperty({ description: 'Full name' })
  @IsString()
  full_name: string;

  @ApiProperty({ description: 'Company name' })
  @IsString()
  company_name: string;

  @ApiPropertyOptional({ description: 'Phone number' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ description: 'Note' })
  @IsOptional()
  @IsString()
  note?: string;
}