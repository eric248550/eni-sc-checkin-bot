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
    dau: 79_520,
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
    newWallets: 8246,
    oldWallets: 1485, // 18% of newWallets
    totalInteractions: 55814,
    gameConnectedWallets: 945856, // 94萬
    dau: 83_519,
    mau: 971_281
  },
  '2026-02-07': {
    newWallets: 3534,
    oldWallets: 10096,
    totalInteractions: 44947,
    gameConnectedWallets: 1014483, // 101萬
    dau: 114_059,
    mau: 1_048_372
  },
  // 第五階 (2026/2/8)
  '2026-02-08': {
    newWallets: 4706,
    oldWallets: 13446,
    totalInteractions: 72855,
    gameConnectedWallets: 1033245, // 103萬
    dau: 118_364,
    mau: 1_073_829
  },
  '2026-02-09': {
    newWallets: 4821,
    oldWallets: 9642,
    totalInteractions: 43147,
    gameConnectedWallets: 1062817, // 106萬
    dau: 88_650,
    mau: 1_103_921
  },
  '2026-02-10': {
    newWallets: 4308,
    oldWallets: 8616,
    totalInteractions: 42553,
    gameConnectedWallets: 1074529, // 107萬
    dau: 113_928,
    mau: 1_119_283
  },
  '2026-02-11': {
    newWallets: 3469,
    oldWallets: 6938,
    totalInteractions: 39522,
    gameConnectedWallets: 1083641, // 108萬
    dau: 102_938,
    mau: 1_129_842
  },
  '2026-02-12': {
    newWallets: 3262,
    oldWallets: 6525,
    totalInteractions: 48188,
    gameConnectedWallets: 1107392, // 110.5萬
    dau: 92_832,
    mau: 1_154_842
  },
  '2026-02-13': {
    newWallets: 2823,
    oldWallets: 5647,
    totalInteractions: 39655,
    gameConnectedWallets: 1142758, // 114萬
    dau: 148_291,
    mau: 1_189_293
  },
  '2026-02-14': {
    newWallets: 3233,
    oldWallets: 6465,
    totalInteractions: 41685,
    gameConnectedWallets: 1153924, // 115萬
    dau: 102_931,
    mau: 1_199_845
  },
  '2026-02-15': {
    newWallets: 3688,
    oldWallets: 7376,
    totalInteractions: 58308,
    gameConnectedWallets: 1174536, // 117萬
    dau: 129_381,
    mau: 1_222_653
  },
  '2026-02-16': {
    newWallets: 2243,
    oldWallets: 10196,
    totalInteractions: 66189,
    gameConnectedWallets: 1194827, // 119萬
    dau: 139_382,
    mau: 1_239_572
  },
  '2026-02-17': {
    newWallets: 2498,
    oldWallets: 11357,
    totalInteractions: 110283,
    gameConnectedWallets: 1205614, // 120.3萬
    dau: 112_932,
    mau: 1_252_910
  },
  '2026-02-18': {
    newWallets: 2021,
    oldWallets: 9186,
    totalInteractions: 98172,
    gameConnectedWallets: 1211749, // 120.9萬
    dau: 103_982,
    mau: 1_258_844
  },
  // 第六階 (2026/2/19)
  '2026-02-19': {
    newWallets: 1645,
    oldWallets: 7480,
    totalInteractions: 83726,
    gameConnectedWallets: 1214583, // 121.2萬
    dau: 89_281,
    mau: 1_261_762
  },
  '2026-02-20': {
    newWallets: 2182,
    oldWallets: 9919,
    totalInteractions: 102932,
    gameConnectedWallets: 1220961, // 121.8萬
    dau: 92_831,
    mau: 1_267_541
  },
  '2026-02-21': {
    newWallets: 2023,
    oldWallets: 9196,
    totalInteractions: 93874,
    gameConnectedWallets: 1228374, // 122.5萬
    dau: 109_283,
    mau: 1_274_839
  },
  '2026-02-22': {
    newWallets: 1648,
    oldWallets: 7491,
    totalInteractions: 89382,
    gameConnectedWallets: 1230128, // 122.7萬
    dau: 108_372,
    mau: 1_276_801
  },
  '2026-02-23': {
    newWallets: 1247,
    oldWallets: 8313,
    totalInteractions: 128372,
    gameConnectedWallets: 1237845, // 123.5萬
    dau: 129_382,
    mau: 1_216_743
  },
  '2026-02-24': {
    newWallets: 647,
    oldWallets: 4313,
    totalInteractions: 102938,
    gameConnectedWallets: 1239217, // 123.6萬
    dau: 82_831,
    mau: 1_107_993
  },
  '2026-02-25': {
    newWallets: 914,
    oldWallets: 6091,
    totalInteractions: 169281,
    gameConnectedWallets: 1242693, // 123.9萬
    dau: 109_283,
    mau: 994_188
  },
  '2026-02-26': {
    newWallets: 869,
    oldWallets: 5794,
    totalInteractions: 132821,
    gameConnectedWallets: 1304572, // 130.1萬
    dau: 99_283,
    mau: 898_078
  },
  '2026-02-27': {
    newWallets: 446,
    oldWallets: 4951,
    totalInteractions: 201983,
    gameConnectedWallets: 1306839, // 130.3萬
    dau: 93_029,
    mau: 906_526
  },
  '2026-02-28': {
    newWallets: 388,
    oldWallets: 4313,
    totalInteractions: 109283,
    gameConnectedWallets: 1309471, // 130.6萬
    dau: 102_932,
    mau: 839_125
  },
  '2026-03-01': {
    newWallets: 339,
    oldWallets: 3764,
    totalInteractions: 112938,
    gameConnectedWallets: 1315628, // 131.2萬
    dau: 119_382,
    mau: 860_234
  },
  '2026-03-02': {
    newWallets: 437,
    oldWallets: 4861,
    totalInteractions: 138742,
    gameConnectedWallets: 1317952, // 131.4萬
    dau: 83_921,
    mau: 812_932
  },
  '2026-03-03': {
    newWallets: 422,
    oldWallets: 4686,
    totalInteractions: 149284,
    gameConnectedWallets: 1321746, // 131.8萬
    dau: 123_938,
    mau: 741_299
  },
  '2026-03-04': {
    newWallets: 630,
    oldWallets: 7001,
    totalInteractions: 158372,
    gameConnectedWallets: 1323184, // 131.9萬
    dau: 95_284,
    mau: 709_421
  },
  '2026-03-05': {
    newWallets: 549,
    oldWallets: 6098,
    totalInteractions: 192732,
    gameConnectedWallets: 1324517, // 132萬
    dau: 102_938,
    mau: 680_419
  },
  '2026-03-06': {
    newWallets: 578,
    oldWallets: 6428,
    totalInteractions: 97382,
    gameConnectedWallets: 1329863, // 132.5萬
    dau: 158_291,
    mau: 681_522
  },
  '2026-03-07': {
    newWallets: 418,
    oldWallets: 4648,
    totalInteractions: 138274,
    gameConnectedWallets: 1348291, // 134.5萬
    dau: 209_381,
    mau: 710_793
  },
  '2026-03-08': {
    newWallets: 732,
    oldWallets: 8131,
    totalInteractions: 145982,
    gameConnectedWallets: 1363725, // 136萬
    dau: 201_923,
    mau: 728_235
  },
  '2026-03-09': {
    newWallets: 386,
    oldWallets: 4821,
    totalInteractions: 100000,
    gameConnectedWallets: 1374619, // 137萬
    dau: 138_210,
    mau: 625_287
  },
  '2026-03-10': {
    newWallets: 397,
    oldWallets: 4959,
    totalInteractions: 83921,
    gameConnectedWallets: 1379283, // 137.5萬
    dau: 120_193,
    mau: 519_268
  },
  '2026-03-11': {
    newWallets: 353,
    oldWallets: 4408,
    totalInteractions: 74621,
    gameConnectedWallets: 1382947, // 137.8萬
    dau: 163_821,
    mau: 488_399
  },
  '2026-03-12': {
    newWallets: 366,
    oldWallets: 4573,
    totalInteractions: 94821,
    gameConnectedWallets: 1384562, // 138萬
    dau: 172_163,
    mau: 439_212
  },
  // 第七階 (2026/3/13)
  '2026-03-13': {
    newWallets: 386,
    oldWallets: 4821,
    totalInteractions: 84732,
    gameConnectedWallets: 1394738, // 139萬
    dau: 162_732,
    mau: 348_395
  },
  '2026-03-14': {
    newWallets: 279,
    oldWallets: 3486,
    totalInteractions: 88271,
    gameConnectedWallets: 1406451, // 140.2萬
    dau: 192_831,
    mau: 448_394
  },
  '2026-03-15': {
    newWallets: 258,
    oldWallets: 3225,
    totalInteractions: 100982,
    gameConnectedWallets: 1409827, // 140.5萬
    dau: 182_932,
    mau: 483_035
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
 * Format date to YYYY-MM-DD (using local system timezone)
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
