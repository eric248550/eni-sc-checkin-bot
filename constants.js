/**
 * Daily Target Constants for ENI Check-in Bot
 * 
 * 配置說明：
 * - newWallets: 需要創建的新錢包數量（eni_wallet.received_amount = 0）
 * - oldWallets: 舊錢包數量（15-20% of newWallets）
 * - totalInteractions: 所有錢包需要進行的交互總次數
 * - gameConnectedWallets: 連接遊戲的錢包數量（目前暫無作用）
 */

export const DAILY_TARGETS = {
  // test data
  // '2026-01-23': {
  //   newWallets: 888,
  //   oldWallets: 0,
  //   totalInteractions: 3333,
  // },
  '2026-01-23': {
    newWallets: 8888,
    oldWallets: 0,
    totalInteractions: 33333,
    gameConnectedWallets: 287523 // 28萬
  },
  // 第一階 (2026/1/24)
  '2026-01-24': {
    newWallets: 12222,
    oldWallets: 2200, // 18% of newWallets
    totalInteractions: 44444,
    gameConnectedWallets: 304841 // 30萬
  },
  '2026-01-25': {
    newWallets: 9898,
    oldWallets: 1534, // 15.5% of newWallets
    totalInteractions: 55555,
    gameConnectedWallets: 346256 // 34萬
  },
  
  // 第二階 (2026/1/26)
  '2026-01-26': {
    newWallets: 12121,
    oldWallets: 2060, // 17% of newWallets
    totalInteractions: 56565,
    gameConnectedWallets: 385673 // 38萬
  },
  // 第三階 (2026/1/27)
  '2026-01-27': {
    newWallets: 11111,
    oldWallets: 1889, // 17% of newWallets
    totalInteractions: 62731,
    gameConnectedWallets: 427189 // 42萬
  },
  '2026-01-28': {
    newWallets: 13529,
    oldWallets: 2435, // 18% of newWallets
    totalInteractions: 65729,
    gameConnectedWallets: 473342 // 47萬
  },
  '2026-01-29': {
    newWallets: 15235,
    oldWallets: 2743, // 18% of newWallets
    totalInteractions: 39841,
    gameConnectedWallets: 508928 // 50萬
  },
  '2026-01-30': {
    newWallets: 18292,
    oldWallets: 3111, // 17% of newWallets
    totalInteractions: 65909,
    gameConnectedWallets: 564417 // 56萬
  },
  '2026-01-31': {
    newWallets: 13201,
    oldWallets: 2244, // 17% of newWallets
    totalInteractions: 48727,
    gameConnectedWallets: 615834 // 61萬
  },
  '2026-02-01': {
    newWallets: 15493,
    oldWallets: 2789, // 18% of newWallets
    totalInteractions: 57472,
    gameConnectedWallets: 672591, // 67萬
    dau: 107_845,
    mau: 730_182
  },
  // 第四階 (2026/2/2)
  '2026-02-02': { 
    newWallets: 13984,
    oldWallets: 2377, // 17% of newWallets
    totalInteractions: 83772,
    gameConnectedWallets: 726763, // 72萬
    dau: 62_655,
    mau: 748_219
  },
  '2026-02-03': {
    newWallets: 13212,
    oldWallets: 2378, // 18% of newWallets
    totalInteractions: 72611,
    gameConnectedWallets: 784245, // 78萬
    dau: 80_471,
    mau: 809_831
  },
  '2026-02-04': {
    newWallets: 19482,
    oldWallets: 3216, // 16.5% of newWallets
    totalInteractions: 78392,
    gameConnectedWallets: 847619, // 84萬
    dau: 78_042,
    mau: 869_281
  },
  '2026-02-05': {
    newWallets: 12111,
    oldWallets: 2059, // 17% of newWallets
    totalInteractions: 72903,
    gameConnectedWallets: 893372, // 89萬
    dau: 75_420,
    mau: 920_938
  },
  '2026-02-06': {
    newWallets: 16492,
    oldWallets: 2969, // 18% of newWallets
    totalInteractions: 83721,
    gameConnectedWallets: 945856, // 94萬
    dau: 83_519,
    mau: 971_281
  },
  '2026-02-07': {
    newWallets: 20192,
    oldWallets: 3433, // 17% of newWallets
    totalInteractions: 67421,
    gameConnectedWallets: 1014483, // 101萬
    dau: 114_059,
    mau: 1_042_810
  },
  // 第五階 (2026/2/8)
  '2026-02-08': {
    newWallets: 26892,
    oldWallets: 4573, // 17% of newWallets
    totalInteractions: 109283,
    gameConnectedWallets: 1076927, // 107萬
    dau: 118_364,
    mau: 1_110_292
  },
  '2026-02-09': {
    newWallets: 19283,
    oldWallets: 3471, // 18% of newWallets
    totalInteractions: 84721,
    gameConnectedWallets: 1125634, // 112萬
    dau: 71_369,
    mau: 1_149_281
  },
  '2026-02-10': {
    newWallets: 17231,
    oldWallets: 2929, // 17% of newWallets
    totalInteractions: 63829,
    gameConnectedWallets: 1208815, // 120萬
    dau: 113_928,
    mau: 1_229_831
  },
  '2026-02-11': {
    newWallets: 13875,
    oldWallets: 2359, // 17% of newWallets
    totalInteractions: 109283,
    gameConnectedWallets: 1274492, // 127萬
    dau: 102_938,
    mau: 1_293_872
  },
  '2026-02-12': {
    newWallets: 13049,
    oldWallets: 2349, // 18% of newWallets
    totalInteractions: 159282,
    gameConnectedWallets: 1337761, // 133萬
    dau: 92_832,
    mau: 1_361_290
  },
  '2026-02-13': {
    newWallets: 11293,
    oldWallets: 1920, // 17% of newWallets
    totalInteractions: 59483,
    gameConnectedWallets: 1506348, // 150萬
    dau: 148_291,
    mau: 1_538_492
  },
  '2026-02-14': {
    newWallets: 12930,
    oldWallets: 2327, // 18% of newWallets
    totalInteractions: 62528,
    gameConnectedWallets: 1573629, // 157萬
    dau: 102_931,
    mau: 1_612_938
  },
  '2026-02-15': {
    newWallets: 14752,
    oldWallets: 2508, // 17% of newWallets
    totalInteractions: 87462,
    gameConnectedWallets: 1668917, // 166萬
    dau: 129_381,
    mau: 1_692_831
  },
  '2026-02-16': {
    newWallets: 20391,
    oldWallets: 3670, // 18% of newWallets
    totalInteractions: 99283,
    gameConnectedWallets: 1754482, // 175萬
    dau: 139_382,
    mau: 1_802_981
  },
  '2026-02-17': {
    newWallets: 22713,
    oldWallets: 3861, // 17% of newWallets
    totalInteractions: 110283,
    gameConnectedWallets: 1826736, // 182萬
    dau: 112_932,
    mau: 1_850_290
  },
  '2026-02-18': {
    newWallets: 18372,
    oldWallets: 3307, // 18% of newWallets
    totalInteractions: 98172,
    gameConnectedWallets: 1897591, // 189萬
    dau: 103_982,
    mau: 1_929_381
  },
  // 第六階 (2026/2/19)
  '2026-02-19': {
    newWallets: 14959,
    oldWallets: 2543, // 17% of newWallets
    totalInteractions: 83726,
    gameConnectedWallets: 1943823, // 194萬
    dau: 89_281,
    mau: 1_973_002
  },
  '2026-02-20': {
    newWallets: 19837,
    oldWallets: 3571, // 18% of newWallets
    totalInteractions: 102932,
    gameConnectedWallets: 1995647, // 199萬
    dau: 92_831,
    mau: 2_023_991
  },
  '2026-02-21': {
    newWallets: 18392,
    oldWallets: 3127, // 17% of newWallets
    totalInteractions: 93874,
    gameConnectedWallets: 2046315, // 204萬
    dau: 109_283,
    mau: 2_068_371
  },
  '2026-02-22': {
    newWallets: 14982,
    oldWallets: 2697, // 18% of newWallets
    totalInteractions: 89382,
    gameConnectedWallets: 2107928, // 210萬
    dau: 108_372,
    mau: 2_130_291
  },
  '2026-02-23': {
    newWallets: 24938,
    oldWallets: 4239, // 17% of newWallets
    totalInteractions: 128372,
    gameConnectedWallets: 2185576, // 218萬
    dau: 129_382,
    mau: 2_173_739
  },
  '2026-02-24': {
    newWallets: 12938,
    oldWallets: 2329, // 18% of newWallets
    totalInteractions: 102938,
    gameConnectedWallets: 2238841, // 223萬
    dau: 82_831,
    mau: 2_135_987
  },
  '2026-02-25': {
    newWallets: 18273,
    oldWallets: 3106, // 17% of newWallets
    totalInteractions: 169281,
    gameConnectedWallets: 2304467, // 230萬
    dau: 109_283,
    mau: 2_115_853
  },
  '2026-02-26': {
    newWallets: 17382,
    oldWallets: 3129, // 18% of newWallets
    totalInteractions: 132821,
    gameConnectedWallets: 2336792, // 233萬
    dau: 99_283,
    mau: 2_104_842
  },
  '2026-02-27': {
    newWallets: 14853,
    oldWallets: 2525, // 17% of newWallets
    totalInteractions: 201983,
    gameConnectedWallets: 2395634, // 239萬
    dau: 93_029,
    mau: 2_113_290
  },
  '2026-02-28': {
    newWallets: 12939,
    oldWallets: 2329, // 18% of newWallets
    totalInteractions: 109283,
    gameConnectedWallets: 2507219, // 250萬
    dau: 102_932,
    mau: 2_134_117
  },
  '2026-03-01': {
    newWallets: 11293,
    oldWallets: 1920, // 17% of newWallets
    totalInteractions: 112938,
    gameConnectedWallets: 2586753, // 258萬
    dau: 119_382,
    mau: 2_155_226
  },
  '2026-03-02': {
    newWallets: 0,
    oldWallets: 0,
    totalInteractions: 0,
    gameConnectedWallets: 2149884, // 214萬
    dau: 83_921,
    mau: 2_149_884
  },
  '2026-03-03': {
    newWallets: 0,
    oldWallets: 0,
    totalInteractions: 0,
    gameConnectedWallets: 2140220, // 214萬
    dau: 123_938,
    mau: 2_140_220
  },
  '2026-03-04': {
    newWallets: 0,
    oldWallets: 0,
    totalInteractions: 0,
    gameConnectedWallets: 2150377, // 215萬
    dau: 72_812,
    mau: 2_150_377
  },
  '2026-03-05': {
    newWallets: 0,
    oldWallets: 0,
    totalInteractions: 0,
    gameConnectedWallets: 2172844, // 217萬
    dau: 102_938,
    mau: 2_172_844
  },
  '2026-03-06': {
    newWallets: 0,
    oldWallets: 0,
    totalInteractions: 0,
    gameConnectedWallets: 2253093, // 225萬
    dau: 158_291,
    mau: 2_253_093
  },
  '2026-03-07': {
    newWallets: 0,
    oldWallets: 0,
    totalInteractions: 0,
    gameConnectedWallets: 2387054, // 238萬
    dau: 209_381,
    mau: 2_387_054
  },
  '2026-03-08': {
    newWallets: 0,
    oldWallets: 0,
    totalInteractions: 0,
    gameConnectedWallets: 2505458, // 250萬
    dau: 201_923,
    mau: 2_505_458
  },
  '2026-03-09': {
    newWallets: 0,
    oldWallets: 0,
    totalInteractions: 0,
    gameConnectedWallets: 2402510, // 240萬
    dau: 138_210,
    mau: 2_402_510
  },
  '2026-03-10': {
    newWallets: 0,
    oldWallets: 0,
    totalInteractions: 0,
    gameConnectedWallets: 2296491, // 229萬
    dau: 120_193,
    mau: 2_296_491
  },
  '2026-03-11': {
    newWallets: 0,
    oldWallets: 0,
    totalInteractions: 0,
    gameConnectedWallets: 2238578, // 223萬
    dau: 163_821,
    mau: 2_238_578
  },
  '2026-03-12': {
    newWallets: 0,
    oldWallets: 0,
    totalInteractions: 0,
    gameConnectedWallets: 2132427, // 213萬
    dau: 172_163,
    mau: 2_132_427
  },
  // 第七階 (2026/3/13)
  '2026-03-13': {
    newWallets: 0,
    oldWallets: 0,
    totalInteractions: 0,
    gameConnectedWallets: 2041610, // 204萬
    dau: 162_732,
    mau: 2_041_610
  },
  '2026-03-14': {
    newWallets: 0,
    oldWallets: 0,
    totalInteractions: 0,
    gameConnectedWallets: 2141609, // 214萬
    dau: 192_831,
    mau: 2_141_609
  },
  '2026-03-15': {
    newWallets: 0,
    oldWallets: 0,
    totalInteractions: 0,
    gameConnectedWallets: 2176250, // 217萬
    dau: 182_932,
    mau: 2_176_250
  }
};

/**
 * Get target configuration for a specific date
 * @param {Date|string} date - The date to get configuration for (default: today)
 * @returns {Object|null} Target configuration or null if not found
 */
export function getDailyTarget(date = new Date()) {
  const dateStr = formatDate(date);
  return DAILY_TARGETS[dateStr] || null;
}

/**
 * Get today's target configuration
 * @returns {Object|null} Target configuration or null if not found
 */
export function getTodayTarget() {
  return getDailyTarget(new Date());
}

/**
 * Format date to YYYY-MM-DD
 * @param {Date|string} date - Date object or string
 * @returns {string} Formatted date string
 */
export function formatDate(date) {
  // If already a string in YYYY-MM-DD format, return as-is
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return date;
  }
  
  const d = typeof date === 'string' ? new Date(date + 'T00:00:00') : date;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Display today's target summary
 */
export function displayTodayTarget() {
  const target = getTodayTarget();
  
  if (!target) {
    console.log('❌ No target configuration found for today');
    return;
  }
  
  const today = formatDate(new Date());
  
  console.log('\n' + '='.repeat(60));
  console.log(`📅 Daily Target for ${today}`);
  console.log('='.repeat(60));
  console.log(`📝 New Wallets: ${target.newWallets.toLocaleString()}`);
  console.log(`🔄 Total Interactions: ${target.totalInteractions.toLocaleString()}`);
  
  if (target.gameConnectedWallets) {
    console.log(`🎮 Game Connected Wallets: ${(target.gameConnectedWallets / 10000).toFixed(0)}萬 (${target.gameConnectedWallets.toLocaleString()})`);
  }
  console.log('='.repeat(60) + '\n');
}

// Export default object with all functions
export default {
  DAILY_TARGETS,
  getDailyTarget,
  getTodayTarget,
  formatDate,
  displayTodayTarget
};
