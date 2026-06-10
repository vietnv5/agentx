import { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import { JSONRPCMessage } from '@modelcontextprotocol/sdk/types.js';

export class HttpClientTransport implements Transport {
  onclose?: () => void;
  onerror?: (error: Error) => void;
  onmessage?: (message: JSONRPCMessage) => void;

  constructor(
    private readonly url: URL,
    private readonly options?: {
      headers?: Record<string, string>;
    },
  ) {}

  async start(): Promise<void> {
    // Không cần duy trì kết nối cho stateless HTTP
  }

  async send(message: JSONRPCMessage): Promise<void> {
    try {
      const response = await fetch(this.url.toString(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this.options?.headers,
        },
        body: JSON.stringify(message),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const responseBody = (await response.json()) as JSONRPCMessage;

      if (this.onmessage) {
        this.onmessage(responseBody);
      }
    } catch (error: any) {
      if (this.onerror) {
        this.onerror(error);
      }
    }
  }

  async close(): Promise<void> {
    if (this.onclose) {
      this.onclose();
    }
  }
}
