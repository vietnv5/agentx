import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class UpdateToolActiveDto {
  @ApiProperty({ example: true, description: 'Trạng thái hoạt động (Active/Inactive) của tool' })
  @IsBoolean()
  isActive: boolean;
}
