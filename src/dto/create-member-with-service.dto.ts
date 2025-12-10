import { IsEmail, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { ServiceDto } from '../modules/external-api/dto/create-member.dto';

export class CreateMemberWithServiceDto {
  @ApiProperty({ description: 'Member email (will be used as name)' })
  @IsEmail()
  email: string;

  @ApiProperty({ type: [ServiceDto], description: 'Array of services to assign' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ServiceDto)
  services: ServiceDto[];
}