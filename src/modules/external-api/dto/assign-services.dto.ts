import { IsInt, IsArray, ValidateNested, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ServiceAssignmentDto {
  @ApiProperty({ description: 'Service type. 4=AppTotalGo' })
  @IsInt()
  serviceType: number;
}

export class AssignServicesDto {
  @ApiProperty({ description: 'Member ID to assign services to' })
  @IsInt()
  id: number;

  @ApiPropertyOptional({ description: 'Dealer ID. Required only when called by administrator.' })
  @IsOptional()
  @IsInt()
  dealerId?: number;

  @ApiProperty({ type: [ServiceAssignmentDto], description: 'Array of service type and usage limits' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ServiceAssignmentDto)
  services: ServiceAssignmentDto[];
}