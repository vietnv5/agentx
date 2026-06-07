import { Injectable, Inject, Logger, NotFoundException } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, sql } from 'drizzle-orm';
import { DRIZZLE_PROVIDER } from '../../database/drizzle.provider';
import * as schema from '../../database/schema';
import { LlmService } from '../llm/llm.service';

@Injectable()
export class MemoryService {
  private readonly logger = new Logger(MemoryService.name);

  constructor(
    @Inject(DRIZZLE_PROVIDER)
    private readonly db: NodePgDatabase<typeof schema>,
    private readonly llmService: LlmService,
  ) {}

  async findAllDocuments() {
    return this.db.query.knowledgeDocuments.findMany({
      orderBy: (docs, { desc }) => [desc(docs.createdAt)],
    });
  }

  async deleteDocument(id: string) {
    const doc = await this.db.query.knowledgeDocuments.findFirst({
      where: eq(schema.knowledgeDocuments.id, id),
    });

    if (!doc) {
      throw new NotFoundException(`Không tìm thấy tài liệu ID: ${id}`);
    }

    await this.db.delete(schema.knowledgeDocuments).where(eq(schema.knowledgeDocuments.id, id));
    return { success: true, message: `Đã xóa tài liệu ${doc.title} thành công` };
  }

  async uploadAndProcessDocument(
    title: string,
    sourceType: string,
    content: string,
    originalFilename: string | null,
    userId: string,
  ) {
    // 1. Tạo document ở trạng thái processing
    const [doc] = await this.db
      .insert(schema.knowledgeDocuments)
      .values({
        title,
        sourceType,
        originalFilename,
        status: 'processing',
        uploadedBy: userId,
      })
      .returning();

    // Chạy xử lý chunking và embedding nền
    this.processDocumentBackground(doc.id, content).catch((err) => {
      this.logger.error(`Lỗi background indexing cho doc ${doc.id}: ${err.message}`);
    });

    return doc;
  }

  // Thuật toán truy vấn tìm kiếm tương đồng ngữ nghĩa (pgvector cosine similarity)
  async similaritySearch(query: string, limit = 5) {
    this.logger.log(`Thực hiện semantic search cho câu hỏi: "${query}"`);
    try {
      const queryVector = await this.llmService.getEmbedding(query);
      
      // pgvector cosine distance: <=> operator (càng nhỏ càng khớp)
      // Chuyển queryVector sang dạng chuỗi vector của postgres: '[v1, v2, ...]'
      const vectorStr = `[${queryVector.join(',')}]`;
      const distance = sql`(${schema.knowledgeChunks.embedding} <=> ${vectorStr}::vector)`;

      const results = await this.db
        .select({
          id: schema.knowledgeChunks.id,
          content: schema.knowledgeChunks.content,
          documentId: schema.knowledgeChunks.documentId,
          chunkIndex: schema.knowledgeChunks.chunkIndex,
          distance: distance,
        })
        .from(schema.knowledgeChunks)
        .orderBy(distance)
        .limit(limit);

      // Trả về kết quả khớp có khoảng cách cosine nhỏ hơn 0.5 (tương đương tương đồng > 50%)
      return results.filter((r) => Number(r.distance) < 0.5);
    } catch (err) {
      this.logger.error(`Semantic search lỗi: ${err.message}`);
      return [];
    }
  }

  private async processDocumentBackground(documentId: string, content: string) {
    try {
      // 2. Chia nhỏ tài liệu thành các chunks (ví dụ: ~800 ký tự với ~150 ký tự overlap)
      const chunks = this.chunkText(content, 800, 150);
      this.logger.log(`Tài liệu ID: ${documentId} được chia thành ${chunks.length} chunks.`);

      // 3. Tính toán embeddings và lưu vào database
      for (let i = 0; i < chunks.length; i++) {
        const chunkText = chunks[i];
        const embedding = await this.llmService.getEmbedding(chunkText);
        
        await this.db.insert(schema.knowledgeChunks).values({
          documentId,
          chunkIndex: i,
          content: chunkText,
          embedding,
          tokenCount: Math.round(chunkText.length / 4), // Ước lượng tokens
        });
      }

      // 4. Cập nhật trạng thái hoàn thành
      await this.db
        .update(schema.knowledgeDocuments)
        .set({
          status: 'indexed',
          totalChunks: chunks.length,
          updatedAt: new Date(),
        })
        .where(eq(schema.knowledgeDocuments.id, documentId));

      this.logger.log(`Hoàn thành indexing cho tài liệu ID: ${documentId}`);
    } catch (err) {
      this.logger.error(`Indexing thất bại tài liệu ID: ${documentId}: ${err.message}`);
      await this.db
        .update(schema.knowledgeDocuments)
        .set({
          status: 'error',
          updatedAt: new Date(),
        })
        .where(eq(schema.knowledgeDocuments.id, documentId));
    }
  }

  private chunkText(text: string, chunkSize = 800, overlap = 150): string[] {
    const chunks: string[] = [];
    let start = 0;

    if (text.length <= chunkSize) {
      return [text];
    }

    while (start < text.length) {
      const end = Math.min(start + chunkSize, text.length);
      let chunk = text.slice(start, end);

      // Cố gắng cắt ở cuối câu hoặc từ đầy đủ
      if (end < text.length) {
        const lastSpace = chunk.lastIndexOf(' ');
        if (lastSpace > chunkSize * 0.8) {
          chunk = chunk.slice(0, lastSpace);
        }
      }

      chunks.push(chunk.trim());
      start += chunk.length - overlap;
      if (start >= text.length || chunk.length <= overlap) {
        break;
      }
    }

    return chunks;
  }
}
