import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsInt, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class SearchKnowledgeDto {
  @ApiProperty({
    example: 'Cách xin nghỉ phép?',
    description: 'Câu hỏi hoặc nội dung cần tìm kiếm tương đồng ngữ nghĩa',
  })
  @IsString()
  @IsNotEmpty()
  query: string;

  @ApiPropertyOptional({
    example: 5,
    description: 'Số lượng kết quả phù hợp nhất cần trả về',
    default: 5,
  })
  @IsInt()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  limit?: number;
}
