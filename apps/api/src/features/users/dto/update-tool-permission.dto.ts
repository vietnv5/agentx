import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsBoolean } from 'class-validator';

export class UpdateToolPermissionDto {
  @ApiProperty({
    example: 'git:*',
    description: 'Mẫu regex/wildcard định dạng của tool được cấu hình phân quyền',
  })
  @IsString()
  @IsNotEmpty()
  toolPattern: string;

  @ApiProperty({
    example: true,
    description: 'Cho phép hoặc từ chối chạy các tool khớp với mẫu trên',
  })
  @IsBoolean()
  allowed: boolean;
}
