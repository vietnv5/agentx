import { Injectable, Logger } from '@nestjs/common';
import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';

@Injectable()
export class LlmProviderFactory {
  private readonly logger = new Logger(LlmProviderFactory.name);

  getProvider(provider: string, model: string, config: any = {}): any {
    const apiKey = config.apiKey || this.getApiKeyFromEnv(provider);
    const baseURL = config.baseUrl || this.getBaseUrlFromEnv(provider);

    this.logger.log(`Khởi tạo LLM Provider: ${provider}, Model: ${model}`);

    if (provider.toLowerCase() === 'openai') {
      const openai = createOpenAI({
        apiKey,
        baseURL,
      });
      return openai(model);
    } else if (provider.toLowerCase() === 'anthropic') {
      const anthropic = createAnthropic({
        apiKey,
        baseURL,
      });
      return anthropic(model);
    }

    throw new Error(`LLM Provider '${provider}' không hỗ trợ. Chỉ hỗ trợ 'openai' và 'anthropic'.`);
  }

  getEmbeddingProvider(model: string, config: any = {}): any {
    const apiKey = config.apiKey || this.getApiKeyFromEnv('openai');
    const baseURL = config.baseUrl || this.getBaseUrlFromEnv('openai');
    this.logger.log(`Khởi tạo OpenAI Embedding Model: ${model}`);
    const openai = createOpenAI({
      apiKey,
      baseURL,
    });
    return openai.embedding(model as any);
  }

  private getApiKeyFromEnv(provider: string): string {
    if (provider.toLowerCase() === 'openai') {
      return process.env.OPENAI_API_KEY || '';
    }
    if (provider.toLowerCase() === 'anthropic') {
      return process.env.ANTHROPIC_API_KEY || '';
    }
    return '';
  }

  private getBaseUrlFromEnv(provider: string): string | undefined {
    if (provider.toLowerCase() === 'openai') {
      return process.env.OPENAI_BASE_URL;
    }
    if (provider.toLowerCase() === 'anthropic') {
      return process.env.ANTHROPIC_BASE_URL;
    }
    return undefined;
  }
}
