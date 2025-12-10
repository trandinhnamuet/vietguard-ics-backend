import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class GetAppTotalGoHistoryDto {
  @ApiPropertyOptional({ description: 'Query start time (ISO8601 format)' })
  @IsOptional()
  @IsString()
  startTime?: string;

  @ApiPropertyOptional({ description: 'Query end time (ISO8601 format)' })
  @IsOptional()
  @IsString()
  endTime?: string;
}

export interface AppTotalGoHistoryResponse {
  code: string;
  message: string;
  data: {
    sequence: string;
    taskId: string;
    fileName: string;
    executetime: string;
    result: string;
  }[];
}