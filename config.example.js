// Example configuration file
// Copy this to a .env file and fill in your values

export const config = {
  // Database connection string
  DATABASE_URL: 'postgres://username:password@host:port/database',
  
  // Smart contract address
  CONTRACT_ADDRESS: '0x34473292ceb92186e31ff4cb6db53eac17f89104',
  
  // RPC endpoint for ENI mainnet (official)
  RPC_URL: 'https://rpc.eniac.network',
  
  // Alternative RPC endpoints:
  // - wss://rpc.eniac.network/ws/ (WebSocket)
  // - https://rpc-testnet.eniac.network (Testnet)
  // - wss://rpc-testnet.eniac.network/ws/ (Testnet WebSocket)
  
  // Chain ID for ENI mainnet
  CHAIN_ID: 173
};

