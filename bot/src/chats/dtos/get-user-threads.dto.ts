// src/thread/dto/get-user-threads.dto.ts
import {
  IsInt,
  IsOptional,
  IsArray,
  ArrayNotEmpty,
  ArrayUnique,
  IsIn,
  IsString,
} from 'class-validator';
import { Type } from 'class-transformer';

export class GetUserThreadsQuery {
  @IsOptional()
  @IsString()
  userIds?: string;

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sort?: 'asc' | 'desc' = 'desc';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  limit?: number = 10;
}
