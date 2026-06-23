/**
 * 单元测试 - 升级检测引擎
 * 运行: node src/test.js
 */

import { detectUpgrades, formatUpgradeText } from './detector.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  \x1b[32mPASS\x1b[0m ${message}`);
    passed++;
  } else {
    console.log(`  \x1b[31mFAIL\x1b[0m ${message}`);
    failed++;
  }
}

// 构造基础玩家数据
function makePlayer(overrides = {}) {
  return {
    name: 'TestChief',
    tag: '#TEST123',
    townHallLevel: 14,
    townHallWeaponLevel: 5,
    builderHallLevel: 10,
    troops: [
      { name: 'Barbarian', level: 5, maxLevel: 10, village: 'HOME_VILLAGE' },
      { name: 'Archer', level: 3, maxLevel: 10, village: 'HOME_VILLAGE' },
    ],
    heroes: [
      { name: 'Barbarian King', level: 30, maxLevel: 80, village: 'HOME_VILLAGE' },
    ],
    spells: [
      { name: 'Lightning Spell', level: 5, maxLevel: 9, village: 'HOME_VILLAGE' },
    ],
    heroEquipment: [],
    ...overrides,
  };
}

// ===== 测试 1: 首次运行（无快照） =====
console.log('\n[测试1] 首次运行 - 无快照');
const r1 = detectUpgrades(makePlayer(), null);
assert(r1.upgrades.length === 0, '首次运行应报告 0 个升级');
assert(r1.playerName === 'TestChief', '应正确返回玩家名');

// ===== 测试 2: 部队升级 =====
console.log('\n[测试2] 部队升级检测');
const prev2 = {
  tag: '#TEST123', name: 'TestChief',
  townHallLevel: 14, townHallWeaponLevel: 5, builderHallLevel: 10,
  troops: {
    'Barbarian': { level: 5, maxLevel: 10, village: 'HOME_VILLAGE' },
    'Archer': { level: 3, maxLevel: 10, village: 'HOME_VILLAGE' },
  },
  heroes: { 'Barbarian King': { level: 30, maxLevel: 80, village: 'HOME_VILLAGE' } },
  spells: { 'Lightning Spell': { level: 5, maxLevel: 9, village: 'HOME_VILLAGE' } },
  heroEquipment: {},
};

const curr2 = makePlayer({
  troops: [
    { name: 'Barbarian', level: 6, maxLevel: 10, village: 'HOME_VILLAGE' },
    { name: 'Archer', level: 3, maxLevel: 10, village: 'HOME_VILLAGE' },
  ],
});
const r2 = detectUpgrades(curr2, prev2);
assert(r2.upgrades.length === 1, '应检测到 1 个升级');
assert(r2.upgrades[0].name === 'Barbarian', '升级项应为 Barbarian');
assert(r2.upgrades[0].oldLevel === 5, '旧等级应为 5');
assert(r2.upgrades[0].newLevel === 6, '新等级应为 6');
assert(!r2.upgrades[0].isMaxed, 'Lv6/max10 不是满级');

// ===== 测试 3: 多项同时升级 =====
console.log('\n[测试3] 多项同时升级');
const curr3 = makePlayer({
  troops: [
    { name: 'Barbarian', level: 6, maxLevel: 10, village: 'HOME_VILLAGE' },
    { name: 'Archer', level: 4, maxLevel: 10, village: 'HOME_VILLAGE' },
  ],
  heroes: [
    { name: 'Barbarian King', level: 31, maxLevel: 80, village: 'HOME_VILLAGE' },
  ],
  spells: [
    { name: 'Lightning Spell', level: 6, maxLevel: 9, village: 'HOME_VILLAGE' },
  ],
});
const r3 = detectUpgrades(curr3, prev2);
assert(r3.upgrades.length === 4, '应检测到 4 个升级 (部队2+英雄1+法术1)');

// ===== 测试 4: 满级检测 =====
console.log('\n[测试4] 满级检测');
const prev4 = {
  ...prev2,
  troops: {
    'Barbarian': { level: 9, maxLevel: 10, village: 'HOME_VILLAGE' },
    'Archer': { level: 3, maxLevel: 10, village: 'HOME_VILLAGE' },
  },
  spells: {
    'Lightning Spell': { level: 8, maxLevel: 9, village: 'HOME_VILLAGE' },
  },
};
const curr4 = makePlayer({
  troops: [
    { name: 'Barbarian', level: 10, maxLevel: 10, village: 'HOME_VILLAGE' },
    { name: 'Archer', level: 3, maxLevel: 10, village: 'HOME_VILLAGE' },
  ],
  spells: [
    { name: 'Lightning Spell', level: 9, maxLevel: 9, village: 'HOME_VILLAGE' },
  ],
  heroes: [
    { name: 'Barbarian King', level: 30, maxLevel: 80, village: 'HOME_VILLAGE' },
  ],
});
const r4 = detectUpgrades(curr4, prev4);
assert(r4.upgrades.length === 2, '应检测到 2 个升级');
assert(r4.upgrades[0].isMaxed === true, 'Barbarian Lv10 应标记满级');
assert(r4.upgrades[1].isMaxed === true, 'Lightning Lv9 应标记满级');

// ===== 测试 5: 大本营升级 =====
console.log('\n[测试5] 大本营升级检测');
const prev5 = { ...prev2, townHallLevel: 13, townHallWeaponLevel: 0 };
const curr5 = makePlayer({ townHallLevel: 14, townHallWeaponLevel: 1 });
const r5 = detectUpgrades(curr5, prev5);
const thUp = r5.upgrades.find(u => u.nameZh === '\u5927\u672C\u8425');
assert(thUp !== undefined, '应检测到大本营升级');
assert(thUp.oldLevel === 13, '大本营旧等级 13');
assert(thUp.newLevel === 14, '大本营新等级 14');

// ===== 测试 6: 格式化文本 =====
console.log('\n[测试6] 格式化文本');
const text6a = formatUpgradeText({
  category: '\u90E8\u961F', nameZh: 'Barbarian', oldLevel: 5, newLevel: 6, maxLevel: 10, isMaxed: false,
});
assert(text6a.includes('5'), '\u5E94\u5305\u542B\u65E7\u7B49\u7EA7');
assert(!text6a.includes('\u6EE1\u7EA7'), '\u975E\u6EE1\u7EA7\u4E0D\u5E94\u51FA\u73B0\u6EE1\u7EA7\u6807\u8BB0');

const text6b = formatUpgradeText({
  category: '\u6CD5\u672F', nameZh: 'Lightning', oldLevel: 8, newLevel: 9, maxLevel: 9, isMaxed: true,
});
assert(text6b.includes('\u6EE1\u7EA7'), '\u6EE1\u7EA7\u65F6\u5E94\u6807\u8BB0');

// ===== 汇总 =====
console.log('\n' + '='.repeat(40));
console.log(`\u6D4B\u8BD5\u7ED3\u679C: ${passed} \u901A\u8FC7, ${failed} \u5931\u8D25`);
console.log('='.repeat(40));
if (failed > 0) process.exit(1);
