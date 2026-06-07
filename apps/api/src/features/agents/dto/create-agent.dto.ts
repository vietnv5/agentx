import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsInt, IsArray, ValidateNested, Min } from 'class-validator';
import { Type } from 'class-transformer';

class AgentSkillDto {
  @ApiProperty({ example: 'Search user databases', description: 'Tên kỹ năng của agent' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: 'Cho phép truy vấn thông tin user', description: 'Mô tả chi tiết kỹ năng' })
  @IsString()
  @IsOptional()
  description?: string;
}

export class CreateAgentDto {
  @ApiProperty({ example: 'Leave Assistant', description: 'Tên định danh duy nhất của agent' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    example: 'Bạn là Leave Assistant, chịu trách nhiệm quản lý nghỉ phép và trả lời các thông tin liên quan.',
    description: 'Hướng dẫn hệ thống (System Prompt) cho agent'
  })
  @IsString()
  @IsNotEmpty()
  systemInstructions: string;

  @ApiPropertyOptional({ example: 'openai', description: 'Nhà cung cấp LLM' })
  @IsString()
  @IsOptional()
  llmProvider?: string;

  @ApiPropertyOptional({ example: 'gpt-4o', description: 'Model LLM' })
  @IsString()
  @IsOptional()
  llmModel?: string;

  @ApiPropertyOptional({ example: 'smart', description: 'Tier hoạt động (smart hoặc fast)' })
  @IsString()
  @IsOptional()
  tier?: string;

  @ApiPropertyOptional({ example: false, description: 'Có phải là Router Agent không' })
  @IsBoolean()
  @IsOptional()
  isRouter?: boolean;

  @ApiPropertyOptional({ example: 10, description: 'Số bước ReAct tối đa' })
  @IsInt()
  @Min(1)
  @IsOptional()
  maxSteps?: number;

  @ApiPropertyOptional({ example: {}, description: 'Cấu hình bổ sung dạng JSON' })
  @IsOptional()
  config?: any;

  @ApiPropertyOptional({ example: true, description: 'Trạng thái hoạt động' })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({ type: [AgentSkillDto], description: 'Danh sách kỹ năng của agent' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AgentSkillDto)
  @IsOptional()
  skills?: AgentSkillDto[];

  @ApiPropertyOptional({
    type: [String],
    example: ['d0d8cd52-04fa-4d92-9477-d1a1b1427c32'],
    description: 'Danh sách UUID của các tools liên kết với agent'
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  toolIds?: string[];
}
