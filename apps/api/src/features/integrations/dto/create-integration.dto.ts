import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsIn, IsObject, IsArray } from 'class-validator';

export class CreateIntegrationDto {
  @ApiProperty({ example: 'Git MCP Server', description: 'Tên định danh tích hợp' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: 'Tích hợp Git MCP cho phép Agent tương tác với git repository', description: 'Mô tả tích hợp' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: 'stdio', enum: ['sse', 'stdio'], description: 'Phương thức giao tiếp (transport)' })
  @IsString()
  @IsIn(['sse', 'stdio'])
  transport: 'sse' | 'stdio';

  @ApiPropertyOptional({ example: 'http://localhost:3001/sse', description: 'SSE endpoint (nếu transport là sse)' })
  @IsString()
  @IsOptional()
  endpoint?: string;

  @ApiPropertyOptional({ example: { Authorization: 'Bearer my-token' }, description: 'Headers tùy chỉnh khi gọi SSE (nếu transport là sse)' })
  @IsObject()
  @IsOptional()
  headers?: Record<string, any>;

  @ApiPropertyOptional({ example: 'npx', description: 'Lệnh chạy MCP server (nếu transport là stdio)' })
  @IsString()
  @IsOptional()
  command?: string;

  @ApiPropertyOptional({ example: ['-y', '@modelcontextprotocol/server-git', '--repository', '/path/to/repo'], description: 'Đối số truyền cho lệnh (nếu transport là stdio)' })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  args?: string[];

  @ApiPropertyOptional({ example: { GIT_AUTHOR_NAME: 'AgentX' }, description: 'Biến môi trường (nếu transport là stdio)' })
  @IsObject()
  @IsOptional()
  env?: Record<string, string>;

  @ApiPropertyOptional({ example: {}, description: 'Cấu hình bảo mật, authentication tùy chọn' })
  @IsObject()
  @IsOptional()
  authConfig?: Record<string, any>;

  @ApiPropertyOptional({ example: 'active', enum: ['active', 'inactive', 'error'], description: 'Trạng thái tích hợp' })
  @IsString()
  @IsIn(['active', 'inactive', 'error'])
  @IsOptional()
  status?: 'active' | 'inactive' | 'error';
}
