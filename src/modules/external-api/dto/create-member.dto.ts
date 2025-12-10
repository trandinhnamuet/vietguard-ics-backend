import { IsString, IsArray, ValidateNested, IsInt } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class ServiceDto {
  @ApiProperty({ description: 'Service type. 4=AppTotalGo' })
  @IsInt()
  serviceType: number;
}

export class CreateMemberDto {
  @ApiProperty({ description: 'Member name' })
  @IsString()
  name: string;

  @ApiProperty({ type: [ServiceDto], description: 'Array of service type and usage limits' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ServiceDto)
  services: ServiceDto[];
}