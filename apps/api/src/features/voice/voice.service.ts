import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class VoiceService {
  private readonly logger = new Logger(VoiceService.name);
  private openai: OpenAI;
  private readonly tempDir = path.join(process.cwd(), 'temp_voice');

  constructor(private readonly configService: ConfigService) {
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (apiKey) {
      this.openai = new OpenAI({ apiKey });
    }
  }

  async transcribeVoice(file: Express.Multer.File): Promise<{ text: string }> {
    if (!this.openai) {
      // Mock for development if no API key
      return { text: "Xin chào, đây là văn bản được chuyển đổi từ giọng nói (Mock)." };
    }

    const fileId = uuidv4();
    const ext = path.extname(file.originalname) || '.webm';
    const filePath = path.join(this.tempDir, `${fileId}${ext}`);

    try {
      await fs.promises.writeFile(filePath, file.buffer);

      const response = await this.openai.audio.transcriptions.create({
        file: fs.createReadStream(filePath),
        model: 'whisper-1',
        language: 'vi',
      });

      return { text: response.text };
    } catch (error) {
      this.logger.error(`Error transcribing voice: ${error.message}`);
      throw new InternalServerErrorException('Error transcribing voice');
    } finally {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
  }
}
