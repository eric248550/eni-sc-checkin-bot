import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
import { ethers } from 'ethers';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const RPC_URL = process.env.RPC_URL || 'https://rpc.eniac.network';
const CHAIN_ID = 173;

function createProvider() {
  const network = ethers.Network.from({ name: 'eni', chainId: CHAIN_ID });
  return new ethers.JsonRpcProvider(RPC_URL, network, { staticNetwork: network });
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  const dryRun = !process.argv.includes('--write');
  
  console.log(dryRun ? '🔍 DRY RUN MODE\n' : '✍️  WRITE MODE\n');
  
  try {
    const provider = createProvider();
    
    // Get wallets with balance > 0
    const { rows } = await pool.query(`
      SELECT id, address, received_amount
      FROM eni_wallet
      WHERE received_amount > 0
      ORDER BY updated_at DESC NULLS LAST
    `);
    
    console.log(`Checking ${rows.length} wallets...\n`);
    
    let matches = 0;
    let mismatches = 0;
    let updated = 0;
    
    for (const wallet of rows) {
      const onchainBalance = await provider.getBalance(wallet.address);
      const onchain = parseFloat(ethers.formatEther(onchainBalance));
      const db = parseFloat(wallet.received_amount);
      const diff = Math.abs(onchain - db);
      
      if (diff < 0.00001) {
        console.log(`✅ ${wallet.address}: ${onchain.toFixed(6)} EGAS`);
        matches++;
      } else {
        console.log(`❌ ${wallet.address}`);
        console.log(`   DB: ${db.toFixed(6)} | On-chain: ${onchain.toFixed(6)} | Diff: ${diff.toFixed(6)}`);
        mismatches++;
        
        if (!dryRun) {
          await pool.query(
            'UPDATE eni_wallet SET received_amount = $1 WHERE id = $2',
            [onchain.toFixed(18), wallet.id]
          );
          console.log(`   ✅ Updated`);
          updated++;
        }
      }
      
      await delay(100);
    }
    
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Matches: ${matches} | Mismatches: ${mismatches}`);
    if (!dryRun) console.log(`Updated: ${updated}`);
    if (dryRun && mismatches > 0) console.log(`\nRun with --write to update database`);
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

main();
