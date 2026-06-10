import { Controller, Post, UseInterceptors, UploadedFile, UseGuards, HttpStatus, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { VoiceService } from './voice.service';
import { JwtAuthGuard } from '../../features/auth/guards/jwt-auth.guard';

@ApiTags('Voice')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('voice')
export class VoiceController {
  constructor(private readonly voiceService: VoiceService) {}

  @Post('to-text')
  @ApiOperation({ summary: 'Chuyển đổi giọng nói thành văn bản' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Audio file (webm, mp3, m4a, wav)',
        },
      },
    },
  })
  @ApiResponse({ status: HttpStatus.OK, description: 'Chuyển đổi thành công' })
  @UseInterceptors(FileInterceptor('file'))
  async transcribeVoice(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Audio file không được để trống');
    }
    return this.voiceService.transcribeVoice(file);
  }
}
