import { Controller, Get, Post, Delete, Body, Param, UseGuards, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { MemoryService } from './memory.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UploadKnowledgeDto } from './dto/upload-knowledge.dto';
import { SearchKnowledgeDto } from './dto/search-knowledge.dto';

@ApiTags('Admin Knowledge Base')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('admin/knowledge')
export class MemoryController {
  constructor(private readonly memoryService: MemoryService) {}

  @Get('documents')
  @ApiOperation({ summary: 'Lấy danh sách các tài liệu tri thức' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Lấy danh sách thành công' })
  findAll() {
    return this.memoryService.findAllDocuments();
  }

  @Delete('documents/:id')
  @ApiOperation({ summary: 'Xóa tài liệu tri thức và toàn bộ vector chunks liên quan' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Xóa thành công' })
  delete(@Param('id') id: string) {
    return this.memoryService.deleteDocument(id);
  }

  @Post('upload')
  @ApiOperation({ summary: 'Tải tài liệu tri thức lên hệ thống (dưới dạng văn bản thô/markdown)' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Tải lên thành công và bắt đầu xử lý indexing' })
  upload(
    @CurrentUser() user: any,
    @Body() body: UploadKnowledgeDto,
  ) {
    return this.memoryService.uploadAndProcessDocument(
      body.title,
      body.sourceType,
      body.content,
      body.filename ?? null,
      user.id,
    );
  }

  @Post('search')
  @ApiOperation({ summary: 'Tìm kiếm tương đồng ngữ nghĩa trên toàn bộ Cơ sở tri thức' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Truy vấn thành công' })
  search(
    @Body() body: SearchKnowledgeDto,
  ) {
    return this.memoryService.similaritySearch(body.query, body.limit ?? 5);
  }
}

