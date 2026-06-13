import { Controller, Get, Patch, Post, Delete, Body, Param, UseGuards, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { CreateToolPermissionDto } from './dto/create-tool-permission.dto';
import { UpdateToolPermissionDto } from './dto/update-tool-permission.dto';

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
    @Body() updateData: UpdateUserDto,
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
  @ApiOperation({ summary: 'Thêm mới một quy tắc phân quyền sử dụng công cụ' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Thêm mới phân quyền thành công' })
  createToolPermission(
    @Param('roleId') roleId: string,
    @Body() body: CreateToolPermissionDto,
  ) {
    return this.usersService.createToolPermission(roleId, body);
  }

  @Patch('permissions/:id')
  @ApiOperation({ summary: 'Cập nhật một quy tắc phân quyền cụ thể (cho phép/từ chối hoặc kích hoạt/vô hiệu hóa)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Cập nhật quy tắc phân quyền thành công' })
  updatePermission(
    @Param('id') id: string,
    @Body() body: UpdateToolPermissionDto,
  ) {
    return this.usersService.updatePermission(id, body);
  }

  @Delete('permissions/:id')
  @ApiOperation({ summary: 'Xóa hoàn toàn một quy tắc phân quyền sử dụng công cụ khỏi cơ sở dữ liệu' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Xóa quy tắc phân quyền thành công' })
  deletePermission(@Param('id') id: string) {
    return this.usersService.deletePermission(id);
  }

  @Post()
  @ApiOperation({ summary: 'Tạo người dùng mới' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Tạo thành công' })
  createUser(@Body() createData: CreateUserDto) {
    return this.usersService.createUser(createData);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa người dùng' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Xóa thành công' })
  deleteUser(@Param('id') id: string) {
    return this.usersService.deleteUser(id);
  }
}

