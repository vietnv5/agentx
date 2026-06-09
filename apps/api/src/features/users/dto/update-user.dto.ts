import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsBoolean, IsOptional, IsUUID, IsEmail, MinLength } from 'class-validator';

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'Nguyễn Văn A', description: 'Họ và tên' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ example: 'user@agentx.local', description: 'Địa chỉ email' })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ example: '123456', description: 'Mật khẩu mới' })
  @IsString()
  @MinLength(6)
  @IsOptional()
  password?: string;

  @ApiPropertyOptional({
    example: '28131ce8-862c-4574-a9c5-47a2b521f5d9',
    description: 'ID của vai trò (Role) mới gán cho người dùng',
  })
  @IsUUID()
  @IsOptional()
  roleId?: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Trạng thái hoạt động của tài khoản người dùng',
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
