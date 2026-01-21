import { getEligibleWallets } from './database.js';
import { getContractInfo } from './contract.js';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Test script to verify database and contract connections
 */
async function testConnections() {
  console.log('🔍 Testing Connections...\n');
  
  // Test database connection
  console.log('1️⃣ Testing Database Connection:');
  console.log('   DATABASE_URL:', process.env.DATABASE_URL ? '✅ Set' : '❌ Not set');
  
  try {
    const wallets = await getEligibleWallets();
    console.log(`   ✅ Database connected successfully`);
    console.log(`   Found ${wallets.length} eligible wallet(s)`);
    
    if (wallets.length > 0) {
      console.log(`\n   Sample wallet:`);
      console.log(`   - Address: ${wallets[0].address}`);
      console.log(`   - Has private key: ${wallets[0].private_key ? '✅ Yes' : '❌ No'}`);
      console.log(`   - Received amount: ${wallets[0].received_amount} EGAS`);
      console.log(`   - Has game record: ${wallets[0].has_game_record}`);
    }
  } catch (error) {
    console.error(`   ❌ Database connection failed:`, error.message);
  }
  
  // Test contract connection
  console.log('\n2️⃣ Testing Smart Contract Connection:');
  console.log('   CONTRACT_ADDRESS:', process.env.CONTRACT_ADDRESS || '0x34473292ceb92186e31ff4cb6db53eac17f89104');
  console.log('   RPC_URL:', process.env.RPC_URL || 'https://rpc.eniac.network');
  
  try {
    await getContractInfo();
    console.log(`   ✅ Contract connection successful`);
  } catch (error) {
    console.error(`   ❌ Contract connection failed:`, error.message);
  }
  
  console.log('\n✨ Connection test completed\n');
  process.exit(0);
}

testConnections().catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});

