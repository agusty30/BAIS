import type { BlockchainGateway, BlockEventData } from './types.js';

export class FabricGateway implements BlockchainGateway {
  async connect(): Promise<void> {
    // TODO: Implement Fabric SDK connection
    // const { connect, Identity, Signer, signers } = await import('@hyperledger/fabric-gateway');
    throw new Error('Fabric gateway not yet implemented. Set BLOCKCHAIN_MODE=mock for development.');
  }

  async disconnect(): Promise<void> {
    // TODO: Close gateway and gRPC connection
  }

  async submitTransaction(_contract: string, _method: string, ..._args: string[]): Promise<string> {
    throw new Error('Fabric gateway not yet implemented');
  }

  async evaluateTransaction(_contract: string, _method: string, ..._args: string[]): Promise<string> {
    throw new Error('Fabric gateway not yet implemented');
  }

  getStatus() {
    return { connected: false, mode: 'fabric' as const, latestBlock: 0 };
  }

  onEvent(_callback: (event: BlockEventData) => void): void {
    // TODO: Subscribe to block events
  }
}
