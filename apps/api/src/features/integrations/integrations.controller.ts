import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, HttpStatus, Query, ParseBoolPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { IntegrationsService } from './integrations.service';
import { CreateIntegrationDto } from './dto/create-integration.dto';
import { UpdateIntegrationDto } from './dto/update-integration.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Admin Integrations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('admin/integrations')
export class IntegrationsController {
  constructor(private readonly integrationsService: IntegrationsService) {}

  @Post()
  @ApiOperation({ summary: 'Tạo cấu hình kết nối MCP Server mới' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Tạo thành công' })
  create(@Body() createDto: CreateIntegrationDto) {
    return this.integrationsService.create(createDto);
  }

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách các MCP Server tích hợp' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Lấy danh sách thành công' })
  findAll() {
    return this.integrationsService.findAll();
  }

  @Get('tools')
  @ApiOperation({ summary: 'Lấy danh sách toàn bộ các Tools đã khám phá từ các MCP Servers' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Lấy danh sách thành công' })
  findAllTools() {
    return this.integrationsService.findAllTools();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy chi tiết cấu hình MCP Server' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Lấy thông tin thành công' })
  findOne(@Param('id') id: string) {
    return this.integrationsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Cập nhật cấu hình kết nối MCP Server' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Cập nhật thành công' })
  update(@Param('id') id: string, @Body() updateDto: UpdateIntegrationDto) {
    return this.integrationsService.update(id, updateDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa tích hợp MCP Server' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Xóa thành công' })
  remove(@Param('id') id: string) {
    return this.integrationsService.remove(id);
  }

  @Post(':id/test')
  @ApiOperation({ summary: 'Kiểm tra kết nối thử tới MCP Server' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Kiểm tra thành công (trả về kết quả success/fail và danh sách tools)' })
  testConnection(@Param('id') id: string) {
    return this.integrationsService.testConnectionById(id);
  }

  @Post(':id/sync')
  @ApiOperation({ summary: 'Yêu cầu đồng bộ danh sách tools từ MCP Server vào database' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Đồng bộ thành công' })
  syncTools(@Param('id') id: string) {
    return this.integrationsService.syncToolsById(id);
  }

  @Patch('tools/:toolId/approval')
  @ApiOperation({ summary: 'Bật/Tắt yêu cầu phê duyệt khi chạy Tool' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Cập nhật trạng thái thành công' })
  updateToolApproval(
    @Param('toolId') toolId: string,
    @Body('requiresApproval', ParseBoolPipe) requiresApproval: boolean,
  ) {
    return this.integrationsService.updateToolApproval(toolId, requiresApproval);
  }
}
