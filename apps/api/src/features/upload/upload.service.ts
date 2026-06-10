import { Injectable, Logger, Inject } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE_PROVIDER } from '../../database/drizzle.provider';
import * as schema from '../../database/schema';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);
  private readonly uploadDir = path.join(process.cwd(), 'uploads');

  constructor(
    @Inject(DRIZZLE_PROVIDER)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  async uploadFile(file: Express.Multer.File): Promise<{ id: string; url: string; name: string; type: string; size: number }> {
    // Sửa lỗi hiển thị font tiếng Việt của Multer (Multer thường đọc nhầm chuỗi UTF-8 thành Latin1)
    const utf8Name = Buffer.from(file.originalname, 'latin1').toString('utf8');
    
    const fileId = uuidv4();
    const ext = path.extname(utf8Name);
    const filename = `${fileId}${ext}`;
    const filePath = path.join(this.uploadDir, filename);
    const publicUrl = `/uploads/${filename}`;

    await fs.promises.writeFile(filePath, file.buffer);

    // Save metadata to database
    const [insertedFile] = await this.db.insert(schema.files).values({
      filename: utf8Name,
      path: filePath,
      url: publicUrl,
      mimeType: file.mimetype,
      sizeBytes: file.size,
      provider: 'local',
    }).returning();

    return {
      id: insertedFile.id,
      url: insertedFile.url,
      name: insertedFile.filename,
      type: insertedFile.mimeType || file.mimetype,
      size: insertedFile.sizeBytes || file.size,
    };
  }
}
