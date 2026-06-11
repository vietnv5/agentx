import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class UpdateToolApprovalDto {
  @ApiProperty({ example: false, description: 'Yêu cầu phê duyệt từ người dùng khi chạy tool' })
  @IsBoolean()
  requiresApproval: boolean;
}
