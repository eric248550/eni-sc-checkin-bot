import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

/**
 * OPTIMIZATIONS TO REDUCE RPC CALLS:
 * 
 * 1. Static Network: Chain ID 173 hardcoded (saves 1 call per provider)
 * 2. Fixed Gas Price: 100 gwei hardcoded (ENI minimum, saves 1 call per tx, no errors)
 * 3. Manual Nonce: Can be passed in to avoid fetching (optional, saves 1 call per tx)
 * 4. LEGACY TRANSACTIONS: Force Type 0 (legacy) transactions for compatibility
 * 
 * IMPORTANT: Gas estimation is done PER WALLET (not cached)
 * - This is critical to detect if wallet already checked in today
 * - If wallet already checked in, gas estimation will fail with revert
 * - Prevents sending transactions that will fail (saves gas fees!)
 * 
 * RPC Calls per transaction:
 * - Per transaction: 4 calls (balance, nonce, estimate, send)
 * - Receipt polling: 0 calls (async confirmation by default)
 */

const CONTRACT_ABI = [
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "user",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "day",
        "type": "uint256"
      }
    ],
    "name": "CheckIn",
    "type": "event"
  },
  {
    "inputs": [],
    "name": "checkIn",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];

const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS || '0x34473292ceb92186e31ff4cb6db53eac17f89104';
const RPC_URL = process.env.RPC_URL || 'https://rpc.eniac.network';
const CHAIN_ID = parseInt(process.env.CHAIN_ID) || 173; // ENI mainnet - static, no need to fetch

// Fixed gas price (no caching needed for gas limit - estimate per wallet!)
const FIXED_GAS_PRICE = ethers.parseUnits('100', 'gwei'); // ENI network minimum

/**
 * Create provider for ENI network with static chain ID
 */
function createProvider() {
  // Use staticNetwork to avoid eth_chainId call
  const network = ethers.Network.from({
    name: 'eni',
    chainId: CHAIN_ID
  });
  
  return new ethers.JsonRpcProvider(RPC_URL, network, {
    staticNetwork: network,
    batchMaxCount: 1 // Disable batching to avoid extra calls
  });
}

/**
 * Small delay helper for rate limiting
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Estimate gas limit for this specific wallet
 * IMPORTANT: This is NOT cached - each wallet needs its own estimation
 * This allows us to detect if the wallet has already checked in today
 * 
 * @param {Contract} contract - Contract instance connected to the wallet (has signer)
 * @param {string} walletAddress - Wallet address for logging
 * @returns {Promise<bigint>} Estimated gas limit
 */
async function estimateGasLimit(contract, walletAddress) {
  try {
    // CRITICAL: contract must be connected to wallet (has signer)
    // This ensures estimateGas() uses the correct 'from' address
    // If wallet already checked in, this will revert
    const gasLimit = await contract.checkIn.estimateGas();
    console.log(`   Gas estimation for ${walletAddress}: ${gasLimit.toString()}`);
    return gasLimit;
  } catch (error) {
    // Gas estimation failed - wallet likely already checked in or contract issue
    console.log(`   ⚠️  Gas estimation failed for ${walletAddress}`);
    
    if (error.message?.includes('revert') || error.code === 'CALL_EXCEPTION') {
      throw new Error('Wallet already checked in today or contract reverted during estimation');
    }
    
    throw error;
  }
}

/**
 * Execute check-in for a wallet with optimized RPC calls
 */
export async function executeCheckIn(privateKey, walletAddress, manualNonce = null) {
  try {
    console.log(`\n🔄 Processing wallet: ${walletAddress}`);
    
    // Create provider and wallet with static network (saves eth_chainId call)
    const provider = createProvider();
    const wallet = new ethers.Wallet(privateKey, provider);
    
    // Verify wallet address matches (no RPC call)
    if (wallet.address.toLowerCase() !== walletAddress.toLowerCase()) {
      throw new Error(`Wallet address mismatch: ${wallet.address} vs ${walletAddress}`);
    }
    
    // Create contract instance (no RPC call)
    const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, wallet);
    
    // Check balance (1 RPC call: eth_getBalance)
    const balance = await provider.getBalance(walletAddress);
    const balanceInEgas = ethers.formatEther(balance);
    console.log(`   Balance: ${balanceInEgas} EGAS`);
    
    if (balance === 0n) {
      throw new Error('Insufficient balance for gas fees');
    }
    
    // Small delay to respect rate limits
    await delay(200);
    
    // Get nonce (1 RPC call: eth_getTransactionCount) - only if not provided
    let nonce;
    if (manualNonce !== null) {
      nonce = manualNonce;
      console.log(`   Using manual nonce: ${nonce}`);
    } else {
      nonce = await provider.getTransactionCount(walletAddress, 'pending');
      console.log(`   Nonce: ${nonce}`);
    }
    
    // Small delay
    await delay(200);
    
    // Estimate gas limit for THIS wallet (not cached - critical for detecting already checked in)
    const gasLimit = await estimateGasLimit(contract, walletAddress);
    
    // Use fixed gas price (100 gwei - ENI network minimum, no RPC call needed)
    const gasPrice = FIXED_GAS_PRICE;
    console.log(`   Gas price: 100 gwei (ENI minimum)`);
    
    // Check if balance is sufficient for gas
    const estimatedGasCostInWei = gasLimit * gasPrice;
    const estimatedGasCostInEgas = ethers.formatEther(estimatedGasCostInWei);
    
    if (balance < estimatedGasCostInWei) {
      throw new Error(`Insufficient balance for gas. Need ${estimatedGasCostInEgas} EGAS, have ${balanceInEgas} EGAS`);
    }
    
    // Small delay
    await delay(200);
    
    // Execute check-in (1 RPC call: eth_sendRawTransaction)
    console.log(`   Sending check-in transaction...`);
    
    // Build transaction options for legacy transaction
    const txOptions = {
      gasLimit: gasLimit,
      gasPrice: gasPrice, // Use gasPrice for Type 0 (legacy) transaction
      nonce: nonce,
      type: 0 // Force legacy transaction (Type 0) for compatibility and lower gas
    };
    
    const tx = await contract.checkIn(txOptions);
    
    console.log(`   Transaction sent: ${tx.hash}`);
    console.log(`   ✅ Transaction broadcast successful! (confirmation will happen asynchronously)`);
    
    // NO POLLING - Transaction sent successfully, return immediately
    // This saves 10-12 RPC calls (eth_getTransactionReceipt polling)
    // The transaction will be confirmed by the network asynchronously
    
    return {
      success: true,
      txHash: tx.hash,
      blockNumber: null, // Will be set when mined (not waiting)
      gasUsed: gasLimit.toString(), // Estimated (actual will be lower)
      gasCostInEgas: estimatedGasCostInEgas, // Estimated cost calculated earlier
      nonce: nonce, // Return nonce for sequential processing
      pending: true // Flag to indicate tx is pending confirmation
    };
    
  } catch (error) {
    console.error(`   ❌ Error: ${error.message}`);
    
    // Handle specific errors
    if (error.code === 'CALL_EXCEPTION') {
      console.error(`   Contract call failed - possible reasons:`);
      console.error(`   - Already checked in today (most common)`);
      console.error(`   - Contract is paused`);
      console.error(`   - Other contract-specific restrictions`);
    } else if (error.message?.includes('already checked in')) {
      console.error(`   Wallet has already checked in today - skipping`);
    } else if (error.code === 'INSUFFICIENT_FUNDS') {
      console.error(`   Insufficient funds for gas`);
    } else if (error.code === 'NONCE_EXPIRED') {
      console.error(`   Nonce error - transaction might already be pending`);
    } else if (error.code === 'SERVER_ERROR' || error.message?.includes('429') || error.message?.includes('rate limit')) {
      console.error(`   🚫 Rate limit or server error - will retry automatically`);
    }
    
    return {
      success: false,
      error: error.message,
      code: error.code,
      nonce: manualNonce // Return nonce even on failure
    };
  }
}

/**
 * Get contract information
 */
export async function getContractInfo() {
  const provider = createProvider();
  const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
  
  console.log(`Contract Address: ${CONTRACT_ADDRESS}`);
  console.log(`RPC URL: ${RPC_URL}`);
  console.log(`Gas Price: 100 gwei (fixed - ENI minimum)`);
  console.log(`Note: Gas limit estimated per wallet (not cached)`);
  
  try {
    const code = await provider.getCode(CONTRACT_ADDRESS);
    if (code === '0x') {
      console.log('⚠️  Warning: No code at contract address!');
    } else {
      console.log('✅ Contract verified');
    }
  } catch (error) {
    console.error('Error checking contract:', error.message);
  }
}

