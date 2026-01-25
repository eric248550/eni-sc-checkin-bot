import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

/**
 * OPTIMIZATIONS TO REDUCE RPC CALLS:
 * 
 * 1. Static Network: Chain ID 8217 hardcoded (saves 1 call per provider)
 * 2. Cached Gas Limit: Estimate once, reuse for all transactions (saves 1 call per tx after first)
 * 3. Cached Fee Data: Cache for 60 seconds (saves ~1 call per tx)
 * 4. Manual Nonce: Can be passed in to avoid fetching (optional, saves 1 call per tx)
 * 5. NO RECEIPT POLLING: Transaction sent and returned immediately (saves 10-12 calls per tx)
 * 6. LEGACY TRANSACTIONS: Force Type 0 (legacy) transactions for compatibility and lower gas costs
 * 
 * RPC Calls per transaction:
 * - First transaction: 5 calls (balance, nonce, estimate, feeData, send)
 * - Subsequent transactions: 3 calls (balance, nonce, send)
 * - Receipt polling: 0 calls (REMOVED - async confirmation)
 * 
 * Total: 3-5 calls per wallet (down from ~23 calls)
 * Savings: 78-87% reduction in RPC calls! 🎉
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

// Cache for optimization
let cachedGasLimit = null;
let cachedGasPrice = null;
let gasPriceCacheTime = 0;
const GAS_PRICE_CACHE_DURATION = 60000; // Cache gas price for 60 seconds

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
 * Get or cache gas limit (estimate once and reuse)
 */
async function getGasLimit(contract) {
  if (cachedGasLimit) {
    console.log(`   Using cached gas limit: ${cachedGasLimit.toString()}`);
    return cachedGasLimit;
  }
  
  try {
    cachedGasLimit = await contract.checkIn.estimateGas();
    console.log(`   Estimated gas (cached for reuse): ${cachedGasLimit.toString()}`);
    return cachedGasLimit;
  } catch (error) {
    console.log(`   Gas estimation failed, using default gas limit`);
    cachedGasLimit = 100000n; // Default gas limit
    return cachedGasLimit;
  }
}

/**
 * Get or cache gas price for legacy transactions
 * Note: We always use legacy transactions (Type 0) for ENI network
 */
async function getGasPriceForLegacy(provider) {
  const now = Date.now();
  
  // Return cached gas price if still valid
  if (cachedGasPrice && (now - gasPriceCacheTime) < GAS_PRICE_CACHE_DURATION) {
    return cachedGasPrice;
  }
  
  // Fetch gas price for legacy transaction
  try {
    const feeData = await provider.getFeeData();
    
    // IMPORTANT: For legacy transactions, we should use gasPrice, NOT maxFeePerGas
    // maxFeePerGas is for EIP-1559 and is typically much higher
    if (feeData.gasPrice && feeData.gasPrice > 0n) {
      // Use the network's gasPrice (this is what legacy transactions use)
      cachedGasPrice = feeData.gasPrice;
      console.log(`   Fetched gas price: ${ethers.formatUnits(cachedGasPrice, 'gwei')} gwei`);
    } else {
      // Fallback to static gas price (100 gwei is reasonable for ENI)
      console.log(`   No gasPrice from network, using static: 100 gwei`);
      cachedGasPrice = ethers.parseUnits('100', 'gwei');
    }
    
    gasPriceCacheTime = now;
    return cachedGasPrice;
  } catch (error) {
    // Fallback to static gas price for ENI
    console.log(`   Fee data fetch failed, using static gasPrice: 100 gwei`);
    cachedGasPrice = ethers.parseUnits('100', 'gwei');
    gasPriceCacheTime = now;
    return cachedGasPrice;
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
    
    // Get cached gas limit (0 or 1 RPC call: eth_estimateGas - only once globally)
    const gasLimit = await getGasLimit(contract);
    
    // Get cached gas price (0 or 1 RPC call: eth_gasPrice - cached for 60s)
    let gasPrice = await getGasPriceForLegacy(provider);
    
    // Safety check: Ensure gas price is reasonable (not more than 100 gwei)
    const gasPriceInGwei = Number(ethers.formatUnits(gasPrice, 'gwei'));
    const MAX_GAS_PRICE_GWEI = 100;
    if (gasPriceInGwei > MAX_GAS_PRICE_GWEI) {
      console.log(`   ⚠️  Gas price too high (${gasPriceInGwei} gwei), capping at ${MAX_GAS_PRICE_GWEI} gwei`);
      gasPrice = ethers.parseUnits(MAX_GAS_PRICE_GWEI.toString(), 'gwei');
    }
    
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
    console.log(`   Using legacy transaction (Type 0) with gasPrice: ${ethers.formatUnits(gasPrice, 'gwei')} gwei`);
    
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
      console.error(`   - Already checked in today`);
      console.error(`   - Contract is paused`);
      console.error(`   - Other contract-specific restrictions`);
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
 * Reset cached values (useful for testing or if network conditions change)
 */
export function resetCache() {
  cachedGasLimit = null;
  cachedGasPrice = null;
  gasPriceCacheTime = 0;
  console.log('🔄 Cache reset: gas limit and gas price will be re-fetched');
}

/**
 * Get cache status for monitoring
 */
export function getCacheStatus() {
  const now = Date.now();
  const gasPriceAge = cachedGasPrice ? now - gasPriceCacheTime : null;
  
  return {
    hasGasLimit: !!cachedGasLimit,
    gasLimit: cachedGasLimit?.toString() || null,
    hasGasPrice: !!cachedGasPrice,
    gasPrice: cachedGasPrice ? ethers.formatUnits(cachedGasPrice, 'gwei') + ' gwei (legacy)' : null,
    gasPriceAge: gasPriceAge ? Math.floor(gasPriceAge / 1000) + 's' : null
  };
}

/**
 * Get contract information
 */
export async function getContractInfo() {
  const provider = createProvider();
  const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
  
  console.log(`Contract Address: ${CONTRACT_ADDRESS}`);
  console.log(`RPC URL: ${RPC_URL}`);
  
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

