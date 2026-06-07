import { Controller, Get, Patch, Post, Body, Param, UseGuards, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Admin Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('admin/users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách tất cả người dùng kèm vai trò' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Lấy danh sách thành công' })
  findAll() {
    return this.usersService.findAll();
  }

  @Get('roles')
  @ApiOperation({ summary: 'Lấy danh sách các vai trò (Roles) trong hệ thống' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Lấy danh sách vai trò thành công' })
  findAllRoles() {
    return this.usersService.findAllRoles();
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Cập nhật trạng thái kích hoạt hoặc vai trò của người dùng' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Cập nhật thành công' })
  updateUser(
    @Param('id') id: string,
    @Body() updateData: { roleId?: string; isActive?: boolean },
  ) {
    return this.usersService.updateUser(id, updateData);
  }

  @Get('roles/:roleId/permissions')
  @ApiOperation({ summary: 'Lấy ma trận phân quyền sử dụng công cụ (tool permissions) theo vai trò' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Lấy quyền thành công' })
  getToolPermissions(@Param('roleId') roleId: string) {
    return this.usersService.getToolPermissions(roleId);
  }

  @Post('roles/:roleId/permissions')
  @ApiOperation({ summary: 'Cập nhật phân quyền sử dụng công cụ theo vai trò' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Cập nhật phân quyền thành công' })
  updateToolPermission(
    @Param('roleId') roleId: string,
    @Body() body: { toolPattern: string; allowed: boolean },
  ) {
    return this.usersService.updateToolPermission(roleId, body.toolPattern, body.allowed);
  }
}
