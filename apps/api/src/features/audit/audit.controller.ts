import { Controller, Get, Query, UseGuards, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuditService } from './audit.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { GetLogsQueryDto } from './dto/get-logs-query.dto';

@ApiTags('Admin Audit')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('admin/audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get('tools')
  @ApiOperation({ summary: 'Lấy nhật ký gọi công cụ (tool executions) gần đây' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Lấy danh sách log thành công' })
  getToolExecutions(@Query() query: GetLogsQueryDto) {
    return this.auditService.getToolExecutions(query.limit ?? 100);
  }

  @Get('usage')
  @ApiOperation({ summary: 'Lấy nhật ký sử dụng token & chi phí LLM gần đây' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Lấy danh sách log thành công' })
  getLlmUsageLogs(@Query() query: GetLogsQueryDto) {
    return this.auditService.getLlmUsageLogs(query.limit ?? 100);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Lấy dữ liệu thống kê tổng hợp cho Admin Dashboard' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Lấy thống kê thành công' })
  getDashboardStats() {
    return this.auditService.getDashboardStats();
  }
}

