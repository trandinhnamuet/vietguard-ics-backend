import { IsOptional, IsInt, IsString, IsEnum, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export enum SortOrder {
  Asc = 'Asc',
  Desc = 'Desc',
}

export enum SortBy {
  MemberName = 'MemberName',
  DealerName = 'DealerName',
  CreatedAt = 'CreatedAt',
}

export class GetMembersDto {
  @ApiPropertyOptional({ description: 'Page number (default: 1)', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page (default: 10)', default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageSize?: number = 10;

  @ApiPropertyOptional({ enum: SortOrder, description: 'Sort order', default: SortOrder.Asc })
  @IsOptional()
  @IsEnum(SortOrder)
  sortOrder?: SortOrder = SortOrder.Asc;

  @ApiPropertyOptional({ description: 'Member name (fuzzy search)' })
  @IsOptional()
  @IsString()
  memberName?: string;

  @ApiPropertyOptional({ description: 'Dealer name (fuzzy search)' })
  @IsOptional()
  @IsString()
  dealerName?: string;

  @ApiPropertyOptional({ enum: SortBy, description: 'Sort field', default: SortBy.CreatedAt })
  @IsOptional()
  @IsEnum(SortBy)
  sortBy?: SortBy = SortBy.CreatedAt;
}