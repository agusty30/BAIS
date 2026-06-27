export interface BlockchainGateway {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  submitTransaction(contract: string, method: string, ...args: string[]): Promise<string>;
  evaluateTransaction(contract: string, method: string, ...args: string[]): Promise<string>;
  getStatus(): { connected: boolean; mode: string; latestBlock: number };
  onEvent(callback: (event: BlockEventData) => void): void;
}

export interface BlockEventData {
  blockNumber: number;
  txId: string;
  contract: string;
  method: string;
  timestamp: Date;
}
