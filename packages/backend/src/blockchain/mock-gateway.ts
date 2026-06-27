import { v4 as uuid } from 'uuid';
import type { BlockchainGateway, BlockEventData } from './types.js';

export class MockGateway implements BlockchainGateway {
  private state = new Map<string, string>();
  private blockNumber = 0;
  private connected = false;
  private listeners: ((event: BlockEventData) => void)[] = [];

  async connect(): Promise<void> {
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    this.connected = false;
    this.listeners = [];
  }

  async submitTransaction(contract: string, method: string, ...args: string[]): Promise<string> {
    if (!this.connected) throw new Error('Mock gateway not connected');

    const txId = `mock_tx_${uuid()}`;
    this.blockNumber++;

    // Store the transaction data
    const key = args[0] || txId;
    const value = args[1] || JSON.stringify({ method, args, txId });
    this.state.set(`${contract}:${key}`, value);

    // Emit block event
    const event: BlockEventData = {
      blockNumber: this.blockNumber,
      txId,
      contract,
      method,
      timestamp: new Date(),
    };
    this.listeners.forEach((cb) => cb(event));

    return txId;
  }

  async evaluateTransaction(contract: string, method: string, ...args: string[]): Promise<string> {
    if (!this.connected) throw new Error('Mock gateway not connected');

    const key = args[0];
    if (!key) return JSON.stringify(null);

    const value = this.state.get(`${contract}:${key}`);
    return value || JSON.stringify(null);
  }

  getStatus() {
    return {
      connected: this.connected,
      mode: 'mock' as const,
      latestBlock: this.blockNumber,
    };
  }

  onEvent(callback: (event: BlockEventData) => void): void {
    this.listeners.push(callback);
  }
}
