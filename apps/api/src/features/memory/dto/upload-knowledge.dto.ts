import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class UploadKnowledgeDto {
  @ApiProperty({
    example: 'Quy trình xin nghỉ phép năm 2026',
    description: 'Tiêu đề tài liệu tri thức',
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    example: 'Nội dung chi tiết quy trình xin nghỉ phép...',
    description: 'Nội dung dạng văn bản thô hoặc Markdown để lập chỉ mục tìm kiếm ngữ nghĩa',
  })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiProperty({
    example: 'markdown',
    description: 'Định dạng nguồn của tài liệu (ví dụ: markdown, text)',
  })
  @IsString()
  @IsNotEmpty()
  sourceType: string;

  @ApiPropertyOptional({
    example: 'quy-trinh-nghi-phep.md',
    description: 'Tên file gốc tải lên hệ thống',
  })
  @IsString()
  @IsOptional()
  filename?: string;
}
