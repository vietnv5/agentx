import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class GetLogsQueryDto {
  @ApiPropertyOptional({
    example: 50,
    description: 'Số lượng dòng nhật ký tối đa cần lấy',
    default: 100,
  })
  @IsInt()
  @Min(1)
  @Max(500)
  @IsOptional()
  @Type(() => Number)
  limit?: number;
}
