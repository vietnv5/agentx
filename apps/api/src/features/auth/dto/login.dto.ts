import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'admin@agentx.local', description: 'Địa chỉ email đăng nhập' })
  @IsEmail({}, { message: 'Địa chỉ email không hợp lệ' })
  @IsNotEmpty({ message: 'Email không được để trống' })
  email: string;

  @ApiProperty({ example: 'Admin@123456', description: 'Mật khẩu người dùng' })
  @IsString()
  @IsNotEmpty({ message: 'Mật khẩu không được để trống' })
  @MinLength(6, { message: 'Mật khẩu phải dài tối thiểu 6 ký tự' })
  password: string;
}
