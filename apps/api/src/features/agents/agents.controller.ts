import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AgentsService } from './agents.service';
import { CreateAgentDto } from './dto/create-agent.dto';
import { UpdateAgentDto } from './dto/update-agent.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Admin Agents')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('admin/agents')
export class AgentsController {
  constructor(private readonly agentsService: AgentsService) {}

  @Post()
  @ApiOperation({ summary: 'Tạo mới một Agent cùng với kỹ năng và tool bindings' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Tạo Agent thành công' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Dữ liệu đầu vào không hợp lệ' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Chưa xác thực' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Không có quyền truy cập (yêu cầu ADMIN)' })
  create(@Body() createAgentDto: CreateAgentDto) {
    return this.agentsService.create(createAgentDto);
  }

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách toàn bộ Agents trong hệ thống' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Lấy danh sách thành công' })
  findAll() {
    return this.agentsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy thông tin chi tiết một Agent theo UUID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Lấy thông tin thành công' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Không tìm thấy Agent' })
  findOne(@Param('id') id: string) {
    return this.agentsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Cập nhật thông tin cấu hình, kỹ năng, tool bindings của Agent' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Cập nhật thành công' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Không tìm thấy Agent' })
  update(@Param('id') id: string, @Body() updateAgentDto: UpdateAgentDto) {
    return this.agentsService.update(id, updateAgentDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa hoàn toàn một Agent ra khỏi hệ thống' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Xóa thành công' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Không tìm thấy Agent' })
  remove(@Param('id') id: string) {
    return this.agentsService.remove(id);
  }
}
