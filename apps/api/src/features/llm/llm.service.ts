import { Injectable, Logger } from '@nestjs/common';
import { generateText, streamText, jsonSchema, embed } from 'ai';
import { LlmProviderFactory } from './llm-provider.factory';

@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name);

  constructor(private readonly providerFactory: LlmProviderFactory) {}

  async getEmbedding(text: string, model = 'text-embedding-3-small'): Promise<number[]> {
    try {
      const llmModel = this.providerFactory.getEmbeddingProvider(model);
      const { embedding } = await embed({
        model: llmModel,
        value: text,
      });
      return embedding;
    } catch (error) {
      this.logger.error(`Tạo embedding thất bại: ${error.message}`);
      throw error;
    }
  }

  async generate({
    provider,
    model,
    system,
    prompt,
    tools,
    config = {},
  }: {
    provider: string;
    model: string;
    system?: string;
    prompt: string;
    tools?: Array<{ name: string; description: string; inputSchema: any }>;
    config?: any;
  }) {
    const llmModel = this.providerFactory.getProvider(provider, model, config);

    // Convert tool format for Vercel AI SDK
    const sdkTools: Record<string, any> = {};
    const hasTools = tools && tools.length > 0;
    if (hasTools) {
      for (const t of tools!) {
        sdkTools[t.name] = {
          description: t.description,
          parameters: jsonSchema(t.inputSchema),
        };
      }
    }

    try {
      const response = await generateText({
        model: llmModel,
        system,
        prompt,
        tools: hasTools ? sdkTools : undefined,
      });

      const usage = response.usage as any;
      const promptTokens = usage.promptTokens ?? 0;
      const completionTokens = usage.completionTokens ?? 0;
      const totalTokens = usage.totalTokens ?? 0;
      const costUsd = this.calculateCost(provider, model, promptTokens, completionTokens);

      return {
        text: response.text,
        toolCalls: response.toolCalls,
        promptTokens,
        completionTokens,
        totalTokens,
        costUsd,
      };
    } catch (error) {
      this.logger.error(`Gọi LLM thất bại: ${error.message}`);
      throw error;
    }
  }

  // Stream text generator
  async stream({
    provider,
    model,
    system,
    prompt,
    tools,
    config = {},
  }: {
    provider: string;
    model: string;
    system?: string;
    prompt: string;
    tools?: Array<{ name: string; description: string; inputSchema: any }>;
    config?: any;
  }): Promise<any> {
    const llmModel = this.providerFactory.getProvider(provider, model, config);

    const sdkTools: Record<string, any> = {};
    const hasTools = tools && tools.length > 0;
    if (hasTools) {
      for (const t of tools!) {
        sdkTools[t.name] = {
          description: t.description,
          parameters: jsonSchema(t.inputSchema),
        };
      }
    }

    try {
      return streamText({
        model: llmModel,
        system,
        prompt,
        tools: hasTools ? sdkTools : undefined,
      });
    } catch (error) {
      this.logger.error(`Gọi LLM stream thất bại: ${error.message}`);
      throw error;
    }
  }

  calculateCost(provider: string, model: string, promptTokens: number, completionTokens: number): string {
    const p = provider.toLowerCase();
    const m = model.toLowerCase();

    let inputRatePerMillion = 0;
    let outputRatePerMillion = 0;

    if (p === 'openai') {
      if (m.includes('gpt-4o-mini')) {
        inputRatePerMillion = 0.15;
        outputRatePerMillion = 0.6;
      } else if (m.includes('gpt-4o')) {
        inputRatePerMillion = 5.0;
        outputRatePerMillion = 15.0;
      } else if (m.includes('o1')) {
        inputRatePerMillion = 15.0;
        outputRatePerMillion = 60.0;
      } else {
        inputRatePerMillion = 10.0; // Fallback
        outputRatePerMillion = 30.0;
      }
    } else if (p === 'anthropic') {
      if (m.includes('claude-3-5-sonnet')) {
        inputRatePerMillion = 3.0;
        outputRatePerMillion = 15.0;
      } else if (m.includes('claude-3-5-haiku')) {
        inputRatePerMillion = 0.25;
        outputRatePerMillion = 1.25;
      } else if (m.includes('opus')) {
        inputRatePerMillion = 15.0;
        outputRatePerMillion = 75.0;
      } else {
        inputRatePerMillion = 8.0; // Fallback
        outputRatePerMillion = 24.0;
      }
    } else {
      inputRatePerMillion = 1.0;
      outputRatePerMillion = 3.0;
    }

    const cost = (promptTokens / 1_000_000) * inputRatePerMillion + (completionTokens / 1_000_000) * outputRatePerMillion;
    return cost.toFixed(6);
  }
}
