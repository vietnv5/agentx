import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards, HttpStatus, Sse, MessageEvent } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Observable, Subject } from 'rxjs';
import { map } from 'rxjs/operators';
import { ChatService } from './chat.service';
import { OrchestratorService, ChatStreamEvent } from './orchestrator.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Chat')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('chat')
export class ChatController {
  constructor(
    private readonly chatService: ChatService,
    private readonly orchestratorService: OrchestratorService,
  ) {}

  @Post('conversations')
  @ApiOperation({ summary: 'Khởi tạo cuộc hội thoại mới' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Tạo thành công' })
  createConversation(@CurrentUser() user: any, @Body('title') title?: string) {
    return this.chatService.createConversation(user.id, title);
  }

  @Get('conversations')
  @ApiOperation({ summary: 'Lấy danh sách cuộc hội thoại của user hiện tại' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Lấy danh sách thành công' })
  findUserConversations(@CurrentUser() user: any) {
    return this.chatService.findUserConversations(user.id);
  }

  @Get('conversations/:id')
  @ApiOperation({ summary: 'Lấy chi tiết cuộc hội thoại và lịch sử tin nhắn' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Lấy chi tiết thành công' })
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.chatService.findOne(id, user.id);
  }

  @Delete('conversations/:id')
  @ApiOperation({ summary: 'Xóa cuộc hội thoại' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Xóa thành công' })
  deleteConversation(@Param('id') id: string, @CurrentUser() user: any) {
    return this.chatService.deleteConversation(id, user.id);
  }

  @Get('conversations/:id/approvals')
  @ApiOperation({ summary: 'Lấy danh sách các yêu cầu phê duyệt (Tool Approvals) đang chờ xử lý' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Lấy danh sách thành công' })
  getPendingApprovals(@Param('id') id: string, @CurrentUser() user: any) {
    return this.chatService.getPendingApprovals(id, user.id);
  }

  @Sse('conversations/:id/messages/stream')
  @ApiOperation({ summary: 'Gửi tin nhắn mới và nhận SSE Stream phản hồi từ ReAct Agent' })
  streamMessages(
    @Param('id') conversationId: string,
    @Query('content') content: string,
    @CurrentUser() user: any,
  ): Observable<MessageEvent> {
    const eventSubject = new Subject<ChatStreamEvent>();

    // Chạy xử lý hội thoại bất đồng bộ
    this.orchestratorService.processMessage(conversationId, user.id, content, eventSubject);

    return eventSubject.asObservable().pipe(
      map((event) => ({
        data: event,
      } as MessageEvent)),
    );
  }

  @Sse('conversations/:id/approval/:approvalId/decide/stream')
  @ApiOperation({ summary: 'Phê duyệt hoặc từ chối chạy tool, nhận SSE Stream tiếp tục ReAct loop' })
  decideApprovalStream(
    @Param('id') conversationId: string,
    @Param('approvalId') approvalId: string,
    @Query('approved') approvedStr: string,
    @CurrentUser() user: any,
  ): Observable<MessageEvent> {
    const eventSubject = new Subject<ChatStreamEvent>();
    const approved = approvedStr === 'true';

    // Tiếp tục xử lý ReAct loop bất đồng bộ sau phê duyệt
    this.orchestratorService.resumeAfterApproval(approvalId, approved, eventSubject);

    return eventSubject.asObservable().pipe(
      map((event) => ({
        data: event,
      } as MessageEvent)),
    );
  }
}
