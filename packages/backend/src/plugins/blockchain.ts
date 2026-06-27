import fp from 'fastify-plugin';
import type { FastifyInstance } from 'fastify';
import type { BlockchainGateway } from '../blockchain/types.js';
import { MockGateway } from '../blockchain/mock-gateway.js';

declare module 'fastify' {
  interface FastifyInstance {
    blockchain: BlockchainGateway;
  }
}

async function blockchain(app: FastifyInstance) {
  const mode = process.env.BLOCKCHAIN_MODE || 'mock';
  let gateway: BlockchainGateway;

  if (mode === 'fabric') {
    // Dynamic import to avoid loading Fabric SDK when not needed
    const { FabricGateway } = await import('../blockchain/fabric-gateway.js');
    gateway = new FabricGateway();
  } else {
    gateway = new MockGateway();
  }

  await gateway.connect();
  app.decorate('blockchain', gateway);

  app.addHook('onClose', async () => {
    await gateway.disconnect();
  });

  app.log.info(`Blockchain gateway initialized in ${mode} mode`);
}

export const blockchainPlugin = fp(blockchain, { name: 'blockchain' });
