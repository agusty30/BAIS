export interface BlockchainTransaction {
  txId: string;
  blockNumber: number;
  timestamp: Date;
  contract: string;
  method: string;
  status: 'confirmed' | 'failed';
}

export interface BlockEvent {
  blockNumber: number;
  txCount: number;
  timestamp: Date;
  transactions: BlockchainTransaction[];
}

export interface BlockchainProof {
  txId: string;
  blockNumber: number;
  timestamp: Date;
  dataHash: string;
  previousHash: string;
}

export interface BlockchainStatus {
  connected: boolean;
  mode: 'mock' | 'fabric';
  latestBlock: number;
  peerCount: number;
}
