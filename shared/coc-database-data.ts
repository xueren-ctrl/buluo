/**
 * CoC 游戏数值数据库（静态数据）
 * ============================================
 * 数据来源：Supercell 官方博客「Clash of Titans」更新公告（2026-11-16）
 *           + ClashRecord TH19 满级表 + GiBiArena/ClashKing 游戏文件数据
 *           + chiefpansancolt/clash-of-clans-data 游戏数据包（SC ID 与逐级时间/大本要求）
 *           + 国服 TapTap（19.100.1，2026-11-20）
 * 更新日期：2026-11-20 (TH19 版本)
 *
 * 数据精度：
 * - 满级：以官方公告 + ClashRecord TH19 表为准，并与游戏数据包逐项核对一致
 * - 逐级升级时间 / 大本要求：新条目直接采用游戏数据包数值；TH19 新增等级
 *   的时间按尾值递增估算并在条目注释中标注「估算」；老条目沿用原有估算
 * - 仍未核实的 4 项（尖刺塔/烟花投手塔/守卫神殿/英勇法术）
 *   因查不到 SC ID，本版暂未入库；小队训练营已于 2026-11-27
 *   由用户实导确认 SC ID 1000106 并入库
 *
 * 注意：CoC 频繁调整升级时间和成本，本数据为近似值。
 * 推荐算法基于 priority 和相对时间比较，绝对值误差不影响推荐质量。
 */

import type { CocItemDef, BuildCategory } from "./coc-database";

// ── 辅助函数 ─────────────────────────────────

/** 生成 thRequired 数组：从 startTH 开始，每 levelsPerTH 级升 1 TH */
function genTH(maxLevel: number, startTH: number, levelsPerTH: number = 1): number[] {
  const arr: number[] = [];
  for (let i = 0; i < maxLevel; i++) {
    arr.push(Math.min(startTH + Math.floor(i / levelsPerTH), 19));
  }
  return arr;
}

/** 生成估算升级时间数组：从 startSec 线性增长到 peakSec */
function estTime(maxLevel: number, startSec: number, peakSec: number): number[] {
  const arr: number[] = [];
  const n = maxLevel - 1;
  for (let i = 0; i < n; i++) {
    const t = i / Math.max(n - 1, 1);
    arr.push(Math.round(startSec + (peakSec - startSec) * t * t));
  }
  return arr;
}

const DAY = 86400;
const HOUR = 3600;

// TH19 满级 27 的装备（Buluo 106000xxx 编号；官方公告 + ClashRecord TH19 表）
const EQ27 = [106000004, 106000006, 106000007, 106000008, 106000010, 106000013, 106000014, 106000016, 106000022, 106000024, 106000032, 106000034, 106000035, 106000039, 106000040, 106000041, 106000042, 106000043, 106000044, 106000047, 106000048, 106000049, 106000050, 106000051, 106000052, 106000053, 106000056, 106000057, 106000059, 106000060, 106000061]; // 史诗装备满级 27，普通 18（2026-11-27 按用户实导截图核对；035/039/049/053 沿用旧稀有度标注，待核实）

// ── 数据录入 ─────────────────────────────────

const RAW_DATA: CocItemDef[] = [
  // ============ 建筑 buildings ============
  // 核心功能建筑
  { scId: 1000001, category: "buildings", zh: "大本营", en: "Town Hall", buildCategory: "utility", maxLevel: 19, upgradeTimeSec: [10,3600,7200,14400,28800,43200,86400,172800,345600,432000,518400,691200,864000,1036800,1296000,1296000,1296000,1209600,1123200], thRequired: genTH(19,1,1), priority: 10, usesBuilder: true },
  { scId: 1000007, category: "buildings", zh: "实验室", en: "Laboratory", buildCategory: "offense", maxLevel: 17, upgradeTimeSec: [0,3600,14400,28800,57600,86400,172800,259200,432000,518400,691200,864000,1036800,1036800,864000,864000,1296000], thRequired: genTH(17,3,1), priority: 10, usesBuilder: true },
  { scId: 1000014, category: "buildings", zh: "部落城堡", en: "Clan Castle", buildCategory: "utility", maxLevel: 15, upgradeTimeSec: [0,0,3600,14400,28800,43200,86400,172800,345600,518400,691200,864000,1036800,950400,1382400], thRequired: genTH(15,1,1), priority: 9, usesBuilder: true },
  { scId: 1000000, category: "buildings", zh: "兵营", en: "Army Camp", buildCategory: "offense", maxLevel: 14, upgradeTimeSec: [0,300,1800,3600,14400,28800,43200,86400,172800,345600,518400,691200,864000,864000], thRequired: genTH(14,1,1), priority: 9, usesBuilder: true },
  { scId: 1000006, category: "buildings", zh: "训练营", en: "Barracks", buildCategory: "offense", maxLevel: 19, upgradeTimeSec: [0,300,1800,3600,14400,28800,43200,86400,172800,259200,432000,518400,691200,864000,950400,1036800,864000,864000,950400], thRequired: genTH(19,1,1), priority: 7, usesBuilder: true },
  // 小队训练营：SC ID 1000106 由用户实导确认（2026-11-27，#QG9U2G00U，0 级在建）；12 级，每级解锁一个小队，8 本起每本 1 级；逐级时间来自 VillageForge TH19 表
  { scId: 1000106, category: "buildings", zh: "小队训练营", en: "Squad Barracks", buildCategory: "offense", maxLevel: 12, upgradeTimeSec: [172800,259200,432000,518400,604800,648000,691200,820800,864000,950400,1166400,1382400], thRequired: genTH(12,8,1), priority: 8, usesBuilder: true },
  { scId: 1000020, category: "buildings", zh: "法术工厂", en: "Spell Factory", buildCategory: "offense", maxLevel: 10, upgradeTimeSec: [0,3600,14400,28800,43200,86400,172800,432000,691200,907200], thRequired: genTH(10,5,1), priority: 9, usesBuilder: true },
  { scId: 1000026, category: "buildings", zh: "暗黑训练营", en: "Dark Barracks", buildCategory: "offense", maxLevel: 13, upgradeTimeSec: [0,3600,14400,28800,43200,86400,172800,432000,691200,864000,1036800,1209600,1296000], thRequired: genTH(13,7,1), priority: 7, usesBuilder: true },
  { scId: 1000029, category: "buildings", zh: "暗黑法术工厂", en: "Dark Spell Factory", buildCategory: "offense", maxLevel: 8, upgradeTimeSec: [0,3600,14400,28800,43200,86400,432000,691200], thRequired: genTH(8,8,1), priority: 8, usesBuilder: true },
  { scId: 1000059, category: "buildings", zh: "战车工坊", en: "Workshop", buildCategory: "offense", maxLevel: 9, upgradeTimeSec: [0,43200,86400,172800,432000,691200,950400,1036800,1209600], thRequired: genTH(9,12,1), priority: 7, usesBuilder: true },
  { scId: 1000068, category: "buildings", zh: "战宠小屋", en: "Pet House", buildCategory: "offense", maxLevel: 12, upgradeTimeSec: [0,43200,86400,259200,432000,691200,950400,777600,864000,950400,1036800,1123200], thRequired: genTH(12,14,1), priority: 7, usesBuilder: true },
  { scId: 1000070, category: "buildings", zh: "铁匠铺", en: "Blacksmith", buildCategory: "offense", maxLevel: 10, upgradeTimeSec: [0,43200,86400,259200,432000,691200,864000,864000,950400,1036800], thRequired: genTH(10,13,1), priority: 8, usesBuilder: true },
  { scId: 1000071, category: "buildings", zh: "英雄殿堂", en: "Hero Hall", buildCategory: "offense", maxLevel: 13, upgradeTimeSec: [0,43200,86400,172800,432000,691200,864000,950400,1036800,950400,864000,864000,1296000], thRequired: genTH(13,7,1), priority: 8, usesBuilder: true },
  { scId: 1000064, category: "buildings", zh: "小博木屋", en: "B.O.B's Hut", buildCategory: "utility", maxLevel: 1, upgradeTimeSec: [0], thRequired: genTH(1,14,1), priority: 4, usesBuilder: true },
  { scId: 1000093, category: "buildings", zh: "帮手小屋", en: "Helper Hut", buildCategory: "utility", maxLevel: 1, upgradeTimeSec: [0], thRequired: genTH(1,14,1), priority: 5, usesBuilder: true },

  // 资源建筑
  { scId: 1000002, category: "buildings", zh: "圣水采集器", en: "Elixir Collector", buildCategory: "resource", maxLevel: 18, upgradeTimeSec: estTime(18, 300, 4*DAY), thRequired: genTH(18,1,1), priority: 4, usesBuilder: true },
  { scId: 1000003, category: "buildings", zh: "圣水瓶", en: "Elixir Storage", buildCategory: "resource", maxLevel: 20, upgradeTimeSec: estTime(20, 300, 7*DAY), thRequired: genTH(20,1,1), priority: 5, usesBuilder: true },
  { scId: 1000004, category: "buildings", zh: "金矿", en: "Gold Mine", buildCategory: "resource", maxLevel: 18, upgradeTimeSec: estTime(18, 300, 4*DAY), thRequired: genTH(18,1,1), priority: 4, usesBuilder: true },
  { scId: 1000005, category: "buildings", zh: "储金罐", en: "Gold Storage", buildCategory: "resource", maxLevel: 20, upgradeTimeSec: estTime(20, 300, 7*DAY), thRequired: genTH(20,1,1), priority: 5, usesBuilder: true },
  { scId: 1000023, category: "buildings", zh: "暗黑重油钻井", en: "Dark Elixir Drill", buildCategory: "resource", maxLevel: 12, upgradeTimeSec: estTime(12, 3600, 6*DAY), thRequired: genTH(12,7,1), priority: 6, usesBuilder: true },
  { scId: 1000024, category: "buildings", zh: "暗黑重油罐", en: "Dark Elixir Storage", buildCategory: "resource", maxLevel: 14, upgradeTimeSec: estTime(14, 3600, 8*DAY), thRequired: genTH(14,7,1), priority: 6, usesBuilder: true },

  // 防御建筑 - 核心
  { scId: 1000008, category: "buildings", zh: "加农炮", en: "Cannon", buildCategory: "defense", maxLevel: 21, upgradeTimeSec: estTime(21, 300, 10*DAY), thRequired: genTH(21,1,1), priority: 5, usesBuilder: true },
  { scId: 1000009, category: "buildings", zh: "箭塔", en: "Archer Tower", buildCategory: "defense", maxLevel: 21, upgradeTimeSec: estTime(21, 600, 12*DAY), thRequired: genTH(21,2,1), priority: 6, usesBuilder: true },
  { scId: 1000010, category: "buildings", zh: "城墙", en: "Wall", buildCategory: "defense", maxLevel: 20, upgradeTimeSec: [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], thRequired: genTH(20,2,1), priority: 3, usesBuilder: true }, // 仅 150/350 块城墙可升 20 级，单 maxLevel 无法表达数量上限
  { scId: 1000011, category: "buildings", zh: "法师塔", en: "Wizard Tower", buildCategory: "defense", maxLevel: 17, upgradeTimeSec: estTime(17, 3600, 9*DAY), thRequired: genTH(17,5,1), priority: 7, usesBuilder: true },
  { scId: 1000012, category: "buildings", zh: "防空火箭", en: "Air Defense", buildCategory: "defense", maxLevel: 17, upgradeTimeSec: estTime(17, 3600, 10*DAY), thRequired: genTH(17,4,1), priority: 8, usesBuilder: true },
  { scId: 1000013, category: "buildings", zh: "迫击炮", en: "Mortar", buildCategory: "defense", maxLevel: 18, upgradeTimeSec: estTime(18, 3600, 8*DAY), thRequired: genTH(18,3,1), priority: 5, usesBuilder: true },
  { scId: 1000019, category: "buildings", zh: "特斯拉电磁塔", en: "Hidden Tesla", buildCategory: "defense", maxLevel: 18, upgradeTimeSec: estTime(18, 3600, 14*DAY), thRequired: genTH(18,6,1), priority: 7, usesBuilder: true },
  { scId: 1000021, category: "buildings", zh: "X连弩", en: "X-Bow", buildCategory: "defense", maxLevel: 14, upgradeTimeSec: estTime(14, 14400, 14*DAY), thRequired: genTH(14,9,1), priority: 8, usesBuilder: true },
  { scId: 1000027, category: "buildings", zh: "地狱塔", en: "Inferno Tower", buildCategory: "defense", maxLevel: 12, upgradeTimeSec: estTime(12, 14400, 14*DAY), thRequired: genTH(12,10,1), priority: 8, usesBuilder: true },
  { scId: 1000028, category: "buildings", zh: "空气炮", en: "Air Sweeper", buildCategory: "defense", maxLevel: 7, upgradeTimeSec: estTime(7, 3600, 7*DAY), thRequired: genTH(7,6,1), priority: 4, usesBuilder: true },
  { scId: 1000031, category: "buildings", zh: "天鹰火炮", en: "Eagle Artillery", buildCategory: "defense", maxLevel: 7, upgradeTimeSec: estTime(7, 43200, 16*DAY), thRequired: genTH(7,11,1), priority: 9, usesBuilder: true },
  { scId: 1000032, category: "buildings", zh: "炸弹塔", en: "Bomb Tower", buildCategory: "defense", maxLevel: 13, upgradeTimeSec: estTime(13, 14400, 10*DAY), thRequired: genTH(13,8,1), priority: 6, usesBuilder: true },
  { scId: 1000067, category: "buildings", zh: "投石炮", en: "Scattershot", buildCategory: "defense", maxLevel: 7, upgradeTimeSec: estTime(7, 43200, 15*DAY), thRequired: genTH(7,13,1), priority: 8, usesBuilder: true },
  { scId: 1000072, category: "buildings", zh: "法术塔", en: "Spell Tower", buildCategory: "defense", maxLevel: 4, upgradeTimeSec: estTime(4, 43200, 12*DAY), thRequired: genTH(4,14,1), priority: 7, usesBuilder: true },
  { scId: 1000077, category: "buildings", zh: "擎天巨柱", en: "Monolith", buildCategory: "defense", maxLevel: 5, upgradeTimeSec: estTime(5, 43200, 16*DAY), thRequired: genTH(5,15,1), priority: 9, usesBuilder: true },
  { scId: 1000015, category: "buildings", zh: "工人小屋", en: "Builder Hut", buildCategory: "utility", maxLevel: 9, upgradeTimeSec: estTime(9, 3600, 14*DAY), thRequired: genTH(9,14,1), priority: 6, usesBuilder: true },

  // ── TH19 新增防御（游戏数据包 SC ID + 逐级数据；中文名尚未核实，zh 暂用英文原文）──
  // TH19 新增一级的升级时间按 15 天估算
  { scId: 1000084, category: "buildings", zh: "Multi-Archer Tower", en: "Multi-Archer Tower", buildCategory: "defense", maxLevel: 5, upgradeTimeSec: [604800,691200,777600,1209600,1296000], thRequired: [16,16,17,18,19], priority: 7, usesBuilder: true },
  { scId: 1000079, category: "buildings", zh: "Multi-Gear Tower", en: "Multi-Gear Tower", buildCategory: "defense", maxLevel: 4, upgradeTimeSec: [691200,777600,1209600,1296000], thRequired: [17,17,18,19], priority: 7, usesBuilder: true },
  { scId: 1000085, category: "buildings", zh: "Ricochet Cannon", en: "Ricochet Cannon", buildCategory: "defense", maxLevel: 5, upgradeTimeSec: [604800,691200,777600,1166400,1296000], thRequired: [16,16,17,18,19], priority: 7, usesBuilder: true },
  { scId: 1000089, category: "buildings", zh: "Firespitter", en: "Firespitter", buildCategory: "defense", maxLevel: 3, upgradeTimeSec: [734400,864000,1296000], thRequired: [17,17,18], priority: 8, usesBuilder: true },
  { scId: 1000086, category: "buildings", zh: "Revenge Tower", en: "Revenge Tower", buildCategory: "defense", maxLevel: 2, upgradeTimeSec: [1123205,1209600], thRequired: [18,18], priority: 8, usesBuilder: true },
  { scId: 1000102, category: "buildings", zh: "Super Wizard Tower", en: "Super Wizard Tower", buildCategory: "defense", maxLevel: 2, upgradeTimeSec: [1123200,1209600], thRequired: [18,18], priority: 8, usesBuilder: true },

  // ============ 守卫 guardians（TH18 新增；导出字段未确认，解析为预留） ============
  // 升级时间：游戏数据包逐级值；粉碎者 6-10 级按 14/15/16/17/18 天递增估算
  { scId: 107000000, category: "guardians", zh: "Longshot", en: "Longshot", buildCategory: "defense", maxLevel: 5, upgradeTimeSec: [0,604800,777600,950400,1123200], thRequired: [18,18,18,18,18], priority: 8, usesBuilder: true },
  { scId: 107000001, category: "guardians", zh: "粉碎者", en: "Smasher", buildCategory: "defense", maxLevel: 10, upgradeTimeSec: [0,604800,777600,950400,1123200,1209600,1296000,1382400,1468800,1555200], thRequired: [18,18,18,18,18,19,19,19,19,19], priority: 8, usesBuilder: true },
  { scId: 107000008, category: "guardians", zh: "Logger", en: "Logger", buildCategory: "defense", maxLevel: 5, upgradeTimeSec: [0,604800,777600,950400,1123200], thRequired: [18,18,18,18,18], priority: 8, usesBuilder: true },

  // ============ 法术 spells ============
  { scId: 26000000, category: "spells", zh: "闪电法术", en: "Lightning Spell", buildCategory: "offense", maxLevel: 14, upgradeTimeSec: estTime(14, 3600, 14*DAY), thRequired: genTH(14,5,1), priority: 6, usesBuilder: false },
  { scId: 26000001, category: "spells", zh: "治疗法术", en: "Healing Spell", buildCategory: "offense", maxLevel: 13, upgradeTimeSec: estTime(13, 3600, 14*DAY), thRequired: genTH(13,6,1), priority: 6, usesBuilder: false },
  { scId: 26000002, category: "spells", zh: "狂暴法术", en: "Rage Spell", buildCategory: "offense", maxLevel: 7, upgradeTimeSec: estTime(7, 3600, 14*DAY), thRequired: genTH(7,7,1), priority: 7, usesBuilder: false },
  { scId: 26000003, category: "spells", zh: "弹跳法术", en: "Jump Spell", buildCategory: "offense", maxLevel: 5, upgradeTimeSec: estTime(5, 3600, 10*DAY), thRequired: genTH(5,6,1), priority: 4, usesBuilder: false },
  { scId: 26000005, category: "spells", zh: "冰冻法术", en: "Freeze Spell", buildCategory: "offense", maxLevel: 8, upgradeTimeSec: estTime(8, 3600, 14*DAY), thRequired: genTH(8,9,1), priority: 7, usesBuilder: false },
  { scId: 26000009, category: "spells", zh: "毒药法术", en: "Poison Spell", buildCategory: "offense", maxLevel: 13, upgradeTimeSec: estTime(13, 3600, 11*DAY), thRequired: genTH(13,8,1), priority: 5, usesBuilder: false },
  { scId: 26000010, category: "spells", zh: "地震法术", en: "Earthquake Spell", buildCategory: "offense", maxLevel: 8, upgradeTimeSec: estTime(8, 3600, 11*DAY), thRequired: genTH(8,8,1), priority: 4, usesBuilder: false },
  { scId: 26000011, category: "spells", zh: "极速法术", en: "Haste Spell", buildCategory: "offense", maxLevel: 8, upgradeTimeSec: estTime(8, 3600, 11*DAY), thRequired: genTH(8,9,1), priority: 4, usesBuilder: false },
  { scId: 26000016, category: "spells", zh: "镜像法术", en: "Clone Spell", buildCategory: "offense", maxLevel: 9, upgradeTimeSec: estTime(9, 3600, 14*DAY), thRequired: genTH(9,10,1), priority: 5, usesBuilder: false },
  { scId: 26000017, category: "spells", zh: "铁皮法术", en: "Skeleton Spell", buildCategory: "offense", maxLevel: 8, upgradeTimeSec: estTime(8, 3600, 11*DAY), thRequired: genTH(8,9,1), priority: 4, usesBuilder: false },
  { scId: 26000028, category: "spells", zh: "蝙蝠法术", en: "Bat Spell", buildCategory: "offense", maxLevel: 9, upgradeTimeSec: estTime(9, 3600, 12*DAY), thRequired: genTH(9,10,1), priority: 5, usesBuilder: false },
  { scId: 26000035, category: "spells", zh: "隐身法术", en: "Invisibility Spell", buildCategory: "offense", maxLevel: 4, upgradeTimeSec: estTime(4, 3600, 14*DAY), thRequired: genTH(4,12,1), priority: 6, usesBuilder: false },
  { scId: 26000053, category: "spells", zh: "回溯法术", en: "Recall Spell", buildCategory: "offense", maxLevel: 7, upgradeTimeSec: estTime(7, 3600, 12*DAY), thRequired: genTH(7,13,1), priority: 5, usesBuilder: false },
  { scId: 26000070, category: "spells", zh: "蔓生法术", en: "Overgrowth Spell", buildCategory: "offense", maxLevel: 5, upgradeTimeSec: [0,864000,1036800,1296000,1382400], thRequired: genTH(5,12,1), priority: 5, usesBuilder: false },

  // ── TH19 新增法术（游戏数据包 SC ID + 逐级研究时间；Totem 5 级时间按 17 天估算）──
  { scId: 26000120, category: "spells", zh: "图腾法术", en: "Totem Spell", buildCategory: "offense", maxLevel: 5, upgradeTimeSec: [0,1036800,1209600,1382400,1468800], thRequired: [13,16,17,17,19], priority: 6, usesBuilder: false },
  { scId: 26000098, category: "spells", zh: "复活法术", en: "Revive Spell", buildCategory: "offense", maxLevel: 5, upgradeTimeSec: [0,604800,691200,993600,1382400], thRequired: [12,15,16,17,17], priority: 5, usesBuilder: false },
  { scId: 26000109, category: "spells", zh: "Ice Block Spell", en: "Ice Block Spell", buildCategory: "offense", maxLevel: 6, upgradeTimeSec: [0,864000,950400,1036800,1209600,1382400], thRequired: [12,14,15,16,17,18], priority: 5, usesBuilder: false },
  { scId: 26000123, category: "spells", zh: "愤怒法术", en: "Angry Spell", buildCategory: "offense", maxLevel: 4, upgradeTimeSec: [0,806400,1036800,1296000], thRequired: [15,16,17,18], priority: 5, usesBuilder: false },

  // ============ 英雄 heroes ============
  // ID 顺序按英雄发布顺序：国王(TH7) → 女皇(TH9) → 大守护者(TH11) → 飞盾战神(TH13) → 亡灵王子(TH17, 2024-11) → 龙公爵(TH15)
  // 升级时间：游戏数据包逐级精确值（至 TH18 满级）；TH19 新增 5 级每级按 8 天估算
    { scId: 28000000, category: "heroes", zh: "蛮王", en: "Barbarian King", buildCategory: "offense", maxLevel: 115, upgradeTimeSec: [0,7200,14400,28800,36000,43200,50400,57600,64800,72000,79200,86400,86400,86400,86400,86400,86400,86400,86400,86400,86400,86400,86400,86400,86400,172800,172800,172800,172800,172800,194400,194400,194400,194400,194400,216000,216000,216000,216000,216000,259200,259200,259200,259200,259200,259200,259200,259200,259200,259200,259200,259200,259200,259200,259200,259200,259200,259200,259200,259200,345600,345600,345600,345600,345600,345600,345600,345600,345600,345600,345600,345600,345600,345600,345600,345600,345600,345600,345600,345600,432000,432000,432000,432000,432000,518400,518400,518400,518400,518400,604800,604800,604800,604800,604800,691200,691200,691200,691200,691200,691200,691200,691200,691200,691200,691200,691200,691200,691200,691200,691200,691200,691200,691200,691200], thRequired: genTH(115,7,1), priority: 8, usesBuilder: false },
    { scId: 28000001, category: "heroes", zh: "女王", en: "Archer Queen", buildCategory: "offense", maxLevel: 115, upgradeTimeSec: [0,7200,14400,28800,36000,43200,50400,57600,64800,72000,79200,86400,86400,86400,86400,86400,86400,86400,86400,86400,86400,86400,86400,86400,86400,172800,172800,172800,172800,172800,194400,194400,194400,194400,194400,216000,216000,216000,216000,216000,259200,259200,259200,259200,259200,259200,259200,259200,259200,259200,259200,259200,259200,259200,259200,259200,259200,259200,259200,259200,345600,345600,345600,345600,345600,345600,345600,345600,345600,345600,345600,345600,345600,345600,345600,345600,345600,345600,345600,345600,432000,432000,432000,432000,432000,518400,518400,518400,518400,518400,604800,604800,604800,604800,604800,691200,691200,691200,691200,691200,691200,691200,691200,691200,691200,691200,691200,691200,691200,691200,691200,691200,691200,691200,691200], thRequired: genTH(115,9,1), priority: 9, usesBuilder: false },
    { scId: 28000002, category: "heroes", zh: "永王", en: "Grand Warden", buildCategory: "offense", maxLevel: 90, upgradeTimeSec: [0,7200,14400,28800,36000,43200,50400,57600,64800,72000,86400,86400,86400,86400,86400,86400,86400,86400,86400,86400,86400,86400,86400,86400,86400,129600,129600,129600,129600,129600,172800,172800,172800,172800,172800,172800,172800,172800,172800,172800,259200,259200,259200,259200,259200,259200,259200,259200,259200,259200,345600,345600,345600,345600,345600,345600,345600,345600,345600,345600,518400,518400,518400,518400,518400,604800,604800,604800,604800,648000,691200,691200,691200,691200,691200,691200,691200,691200,691200,691200,691200,691200,691200,691200,691200,691200,691200,691200,691200,691200], thRequired: genTH(90,11,1), priority: 8, usesBuilder: false },
    { scId: 28000004, category: "heroes", zh: "闰土", en: "Royal Champion", buildCategory: "offense", maxLevel: 60, upgradeTimeSec: [0,14400,36000,43200,72000,86400,86400,86400,86400,86400,86400,86400,86400,86400,86400,129600,129600,129600,129600,129600,172800,172800,172800,172800,172800,259200,259200,259200,259200,259200,345600,345600,345600,345600,345600,432000,432000,432000,432000,432000,432000,518400,561600,604800,648000,691200,691200,691200,691200,691200,691200,691200,691200,691200,691200,691200,691200,691200,691200,691200], thRequired: genTH(60,13,1), priority: 8, usesBuilder: false },
    { scId: 28000006, category: "heroes", zh: "王子", en: "Minion Prince", buildCategory: "offense", maxLevel: 100, upgradeTimeSec: [0,7200,14400,28800,36000,43200,50400,57600,64800,72000,79200,86400,86400,86400,86400,86400,86400,86400,86400,86400,86400,86400,86400,86400,86400,129600,129600,129600,129600,129600,172800,172800,172800,172800,172800,172800,172800,172800,172800,172800,194400,194400,194400,194400,194400,259200,259200,259200,259200,259200,345600,345600,345600,345600,345600,345600,345600,345600,345600,345600,432000,432000,432000,432000,432000,518400,518400,518400,518400,518400,604800,604800,604800,604800,604800,648000,648000,648000,648000,648000,691200,691200,691200,691200,691200,691200,691200,691200,691200,691200,691200,691200,691200,691200,691200,691200,691200,691200,691200,691200], thRequired: genTH(100,17,1), priority: 8, usesBuilder: false },

  // TH19 新增英雄：龙公爵（游戏数据包 SC ID；英雄殿堂 9 级解锁，即 TH15；末 5 级时间按 8 天估算）
  { scId: 28000007, category: "heroes", zh: "龙公爵", en: "Dragon Duke", buildCategory: "offense", maxLevel: 30, upgradeTimeSec: [0,21600,43200,86400,86400,172800,172800,172800,259200,259200,345600,432000,432000,518400,518400,604800,604800,691200,691200,691200,691200,691200,691200,691200,691200,691200,691200,691200,691200,691200], thRequired: genTH(30,15,1), priority: 8, usesBuilder: false },

  // ============ 宠物 pets ============
  ...[73000000,73000001,73000002,73000003,73000004,73000005,73000006,73000007,73000008,73000009,73000010].map((id, i) => {
    const names = [
      ["莱西","L.A.S.S.I"],["闪枭","Electro Owl"],["大牦","Mighty Yak"],["独角","Unicorn"],
      ["冰牙","Frosty"],["地兽","Diggy"],["猛蜥","Poison Lizard"],["凤凰","Phoenix"],
      ["灵狐","Spirit Fox"],["水母","Angry Jelly"],["啾啾","Sneezy"]
    ];
    return {
      scId: id, category: "pets", zh: names[i][0], en: names[i][1],
      buildCategory: "offense" as BuildCategory,
      maxLevel: [15,15,15,15,15,15,15,10,10,15,10][i], upgradeTimeSec: estTime(15, 3600, 8*DAY),
      thRequired: genTH(15, 14, 1), priority: 5, usesBuilder: false
    };
  }),

  // TH19 新增战宠：贪婪乌鸦（游戏数据包 SC ID；中文名未核实）
  { scId: 73000017, category: "pets", zh: "Greedy Raven", en: "Greedy Raven", buildCategory: "offense", maxLevel: 10, upgradeTimeSec: [0,691200,691200,691200,691200,691200,691200,691200,691200,691200], thRequired: [18,18,18,18,18,18,18,18,18,18], priority: 5, usesBuilder: false },

  // ============ 装备 equipment ============
  ...[
    [106000000,"野蛮人傀儡","Barbarian Puppet"],[106000001,"狂暴药瓶","Rage Vial"],
    [106000002,"弓箭手木偶","Archer Puppet"],[106000003,"隐形药水瓶","Invisibility Vial"],
    [106000004,"永恒书卷","Eternal Tome"],[106000005,"生命宝石","Life Gem"],
    [106000006,"寻踪飞盾","Seeking Shield"],[106000007,"皇家宝石","Royal Gem"],
    [106000008,"地震金靴","Earthquake Boots"],[106000009,"野猪骑士木偶","Hog Rider Puppet"],
    [106000010,"巨型手套","Giant Gauntlet"],[106000011,"治疗胡须","Vampstache"],
    [106000012,"急速药水瓶","Haste Vial"],[106000013,"火箭飞矛","Rocket Spear"],
    [106000014,"尖刺足球","Spiky Ball"],[106000015,"魔镜","Magic Mirror"],
    [106000016,"擎天箭矢","Monolith Arrow"],[106000017,"巨型箭失","Giant Arrow"],
    [106000019,"未知装备","Unknown Equipment"],[106000020,"天使木偶","Healer Puppet"],
    [106000022,"巨大火球","Fireball"],[106000024,"狂暴宝石","Rage Gem"],
    [106000032,"灵蛇手镯","Snake Bracelet"],[106000034,"治疗书卷","Healing Tome"],
    [106000035,"冠军之冠","Champion's Crown"],[106000039,"野蛮人门徒","Barbarian Disciple"],
    [106000040,"雷电战靴","Electro Boots"],[106000041,"熔岩气球玩偶","Lavaloon Puppet"],
    [106000042,"护卫玩偶","Henchmen Puppet"],[106000043,"暗黑魔球","Dark Orb"],
    [106000044,"铁甲短裤","Metal Pants"],[106000047,"贵族铁铃","Noble Iron"],
    [106000048,"动作人偶","Action Figure"],[106000049,"骷髅钥匙","Skeleton Key"],
    [106000050,"冷冽水晶","Frost Flake"],[106000051,"木棍马狗","Stick Horse"],
    [106000052,"烈焰之心","Fire Heart"],[106000053,"闪电护符","Lightning Charm"],
    [106000056,"爆震器","Stun Blaster"],[106000057,"助燃器","Flame Blower"],[106000059,"雷电獠牙","Electro Fangs"],[106000060,"反击卡组","Revenge Deck"],[106000061,"传送吊坠","Portal Pendant"]
  ].map(([id,zh,en]) => ({
    scId: id as number, category: "equipment", zh: zh as string, en: en as string,
    buildCategory: "offense" as BuildCategory,
    // 史诗装备满级 27，普通装备满级 18（EQ27 为史诗 ID 表）
    maxLevel: EQ27.includes(id as number) ? 27 : 18,
    upgradeTimeSec: EQ27.includes(id as number) ? estTime(27, 1800, 4*DAY) : estTime(18, 1800, 4*DAY),
    thRequired: EQ27.includes(id as number) ? genTH(27, 13, 1) : genTH(18, 13, 1), priority: 6, usesBuilder: false
  })),

  // ============ 兵种 units ============
  // 中文名参考部落小工具 APK，ID 顺序按 COC 兵营解锁顺序
  ...[
    [4000000,"野蛮人","Barbarian"],[4000001,"弓箭手","Archer"],[4000002,"哥布林","Goblin"],
    [4000003,"巨人","Giant"],[4000004,"炸弹人","Wall Breaker"],[4000005,"气球","Balloon"],
    [4000006,"法师","Wizard"],[4000007,"天使","Healer"],[4000008,"飞龙","Dragon"],
    [4000009,"皮卡","P.E.K.K.A"],[4000010,"亡灵","Minion"],[4000011,"野猪骑士","Hog Rider"],
    [4000012,"武神","Valkyrie"],[4000013,"石头人","Golem"],[4000015,"女巫","Witch"],
    [4000017,"熔岩猎犬","Lava Hound"],[4000022,"蓝胖","Bowler"],[4000023,"龙宝","Baby Dragon"],
    [4000024,"矿工","Miner"],[4000053,"雪怪","Yeti"],
    [4000058,"冰人","Ice Golem"],[4000059,"雷龙","Electro Dragon"],
    [4000065,"龙骑","Dragon Rider"],[4000082,"英雄猎手","Headhunter"],
    [4000095,"雷霆泰坦","Electro Titan"],[4000097,"守护者学徒","Apprentice Warden"],
    [4000110,"根蔓骑士","Root Rider"]
  ].map(([id,zh,en], i) => ({
    scId: id as number, category: "units", zh: zh as string, en: en as string,
    buildCategory: "offense" as BuildCategory,
    maxLevel: [14,15,11,15,15,14,15,12,14,14,15,16,13,16,9,9,11,13,13,9,9,10,7,5,6,4,5][i] || 10,
    upgradeTimeSec: estTime(16, 3600, 15*DAY),
    thRequired: genTH(16, 1, 1), priority: 5, usesBuilder: false
  })),

  // ── TH19 新增兵种（游戏数据包 SC ID + 逐级研究时间；TH19 新增一级时间估算）──
  { scId: 4000132, category: "units", zh: "Thrower", en: "Thrower", buildCategory: "offense", maxLevel: 5, upgradeTimeSec: [0,820800,907200,1296000,1382400], thRequired: [16,16,17,18,19], priority: 5, usesBuilder: false },
  { scId: 4000177, category: "units", zh: "Meteor Golem", en: "Meteor Golem", buildCategory: "offense", maxLevel: 4, upgradeTimeSec: [0,1209600,1382400,1468800], thRequired: [17,17,18,19], priority: 5, usesBuilder: false },
  { scId: 4000123, category: "units", zh: "德鲁伊", en: "Druid", buildCategory: "offense", maxLevel: 7, upgradeTimeSec: [0,691200,777600,950400,1036800,1339200,1382400], thRequired: [14,14,15,16,17,18,19], priority: 5, usesBuilder: false },
  { scId: 4000109, category: "units", zh: "Ruin Witch", en: "Ruin Witch", buildCategory: "offense", maxLevel: 5, upgradeTimeSec: [0,950400,1036800,1339200,1382400], thRequired: [16,16,17,18,19], priority: 5, usesBuilder: false },
  { scId: 4000150, category: "units", zh: "Furnace", en: "Furnace", buildCategory: "offense", maxLevel: 4, upgradeTimeSec: [0,777600,950400,1296000], thRequired: [15,15,16,17], priority: 5, usesBuilder: false },

  // ============ 助力 helpers ============
  ...[
    [124000000,"工人助手","Builder Helper"],[124000001,"实验室助手","Lab Helper"],
    [124000002,"炼金术师","Alchemist"],[124000003,"探矿者","Prospector"]
  ].map(([id,zh,en]) => ({
    scId: id as number, category: "helpers", zh: zh as string, en: en as string,
    buildCategory: "utility" as BuildCategory,
    maxLevel: 5, upgradeTimeSec: estTime(5, 3600, 5*DAY),
    thRequired: genTH(5, 14, 1), priority: 4, usesBuilder: false
  })),

  // ============ 攻城机器 siege_machines ============
  ...[
    [4000051,"攻城战车","Wall Wrecker"],[4000052,"攻城飞艇","Battle Blimp"],
    [4000062,"攻城投石车","Stone Slammer"],[4000075,"战营","Siege Barracks"],
    [4000087,"滚木车","Log Launcher"],[4000091,"喷火器","Flame Flinger"],
    [4000092,"钻地机","Battle Drill"],[4000135,"部队发射器","Troop Launcher"],
    [4000188,"空中部队发射器","Sky Wagon"]
  ].map(([id,zh,en], i) => ({
    scId: id as number, category: "siege_machines", zh: zh as string, en: en as string,
    buildCategory: "offense" as BuildCategory,
    // TH19：攻城战车/飞艇/投石车/战营/滚木车/喷火器/钻地机满级 6，部队发射器/天空战车满级 4
    maxLevel: [6,6,6,6,6,6,6,4,4][i], upgradeTimeSec: estTime(6, 3600, 12*DAY),
    thRequired: genTH(6, 12, 1), priority: 5, usesBuilder: false
  })),

  // ============ 陷阱 traps（TH19 新增入库；游戏数据包 SC ID + 逐级数据） ============
  // TH19 新增一级的升级时间按尾值 +1 天估算；解析器早已支持 traps 类别
  { scId: 12000000, category: "traps", zh: "隐形炸弹", en: "Bomb", buildCategory: "defense", maxLevel: 14, upgradeTimeSec: [0,60,300,2400,3600,7200,10800,14400,21600,43200,64800,86400,172800,691200], thRequired: [3,3,5,7,8,9,10,11,13,14,15,16,17,18], priority: 4, usesBuilder: true },
  { scId: 12000001, category: "traps", zh: "弹簧", en: "Spring Trap", buildCategory: "defense", maxLevel: 14, upgradeTimeSec: [0,3600,7200,10800,14400,21600,28800,43200,64800,86400,172800,259200,950400,1036800], thRequired: [4,7,8,9,10,11,12,13,14,15,16,17,18,19], priority: 4, usesBuilder: true },
  { scId: 12000002, category: "traps", zh: "巨型炸弹", en: "Giant Bomb", buildCategory: "defense", maxLevel: 12, upgradeTimeSec: [0,3600,10800,14400,36000,39600,43200,86400,172800,216000,345600,907200], thRequired: [6,6,8,10,11,13,13,14,15,16,17,18], priority: 5, usesBuilder: true },
  { scId: 12000005, category: "traps", zh: "红雷", en: "Air Bomb", buildCategory: "defense", maxLevel: 14, upgradeTimeSec: [0,1800,3600,14400,28800,43200,50400,57600,86400,129600,172800,259200,777600,864000], thRequired: [5,5,7,9,11,12,13,13,14,15,16,17,18,19], priority: 6, usesBuilder: true },
  { scId: 12000006, category: "traps", zh: "黑雷", en: "Seeking Air Mine", buildCategory: "defense", maxLevel: 8, upgradeTimeSec: [0,21600,86400,129600,172800,259200,432000,993600], thRequired: [7,9,10,13,15,16,17,18], priority: 6, usesBuilder: true },
  { scId: 12000008, category: "traps", zh: "骷髅陷阱", en: "Skeleton Trap", buildCategory: "defense", maxLevel: 6, upgradeTimeSec: [0,18000,28800,43200,604800,691200], thRequired: [8,8,9,10,18,19], priority: 4, usesBuilder: true },
  { scId: 12000016, category: "traps", zh: "飓风陷阱", en: "Tornado Trap", buildCategory: "defense", maxLevel: 3, upgradeTimeSec: [0,86400,172800], thRequired: [11,11,12], priority: 5, usesBuilder: true },
  { scId: 12000020, category: "traps", zh: "Giga Bomb", en: "Giga Bomb", buildCategory: "defense", maxLevel: 4, upgradeTimeSec: [0,345600,432000,1123200], thRequired: [17,17,17,18], priority: 5, usesBuilder: true },
  // ============ 夜世界建筑 buildings2 ============
  // 中文名参考部落小工具 APK
  ...[
    [1000033,"城墙(夜)","BH Wall"],[1000034,"建筑大师大本营","BH Town Hall"],
    [1000035,"圣水采集器(夜)","BH Elixir Collector"],[1000036,"圣水瓶(夜)","BH Elixir Storage"],
    [1000037,"金矿(夜)","BH Gold Mine"],[1000038,"储金罐(夜)","BH Gold Storage"],
    [1000039,"时光钟楼","BH Clock Tower"],[1000040,"建筑大师训练营","BH Barracks"],
    [1000041,"双管加农炮","BH Double Cannon"],[1000042,"兵营(夜)","BH Army Camp"],
    [1000043,"特斯拉电磁塔(夜)","BH Hidden Tesla"],[1000044,"加农炮(夜)","BH Cannon"],
    [1000045,"多管迫击炮","BH Multi Mortar"],[1000046,"星空实验室","BH Star Laboratory"],
    [1000048,"箭塔(夜)","BH Archer Tower"],[1000049,"预备营","BH Guard Post"],
    [1000050,"防空火箭(夜)","BH Air Defense"],[1000051,"守卫哨岗","BH Guard Post"],
    [1000052,"超级特斯拉电磁塔","BH Mega Tesla"],[1000053,"重建战斗机器","BH Battle Machine"],
    [1000054,"空中炸弹发射器(夜)","BH Air Bombs"],[1000055,"撼地巨石","BH Crusher"],
    [1000056,"熔岩火炮(夜)","BH Roaster"],[1000057,"巨型加农炮","BH Giant Cannon"],
    [1000058,"宝石矿井","BH Gem Mine"],[1000063,"熔岩发射器(夜)","BH Lava Launcher"],
    [1000065,"小博控制室","BH OTTO Hut"],[1000078,"奥仔哨站","BH OTTO Outpost"],
    [1000080,"重建战斗直升机","BH Battle Copter"],[1000081,"X连弩(夜)","BH X-Bow"],
    [1000082,"治疗小屋","BH Healing Hut"]
  ].map(([id,zh,en]) => ({
    scId: id as number, category: "buildings2", zh: zh as string, en: en as string,
    buildCategory: "defense" as BuildCategory,
    maxLevel: 10, upgradeTimeSec: estTime(10, 300, 5*DAY),
    thRequired: genTH(10, 2, 1), priority: 3, usesBuilder: true
  })),

  // ============ 夜世界英雄 heroes2 ============
  ...[
    [28000003,"战斗机器","Battle Machine"],[28000005,"战斗直升机","Battle Copter"]
  ].map(([id,zh,en]) => ({
    scId: id as number, category: "heroes2", zh: zh as string, en: en as string,
    buildCategory: "offense" as BuildCategory,
    maxLevel: 35, upgradeTimeSec: estTime(35, 3600, 5*DAY),
    thRequired: genTH(35, 5, 1), priority: 5, usesBuilder: false
  })),

  // ============ 夜世界兵种 units2 ============
  // 中文名参考部落小工具 APK
  ...[
    [4000031,"狂暴野蛮人","Raged Barbarian"],[4000032,"隐秘弓箭手","Sneaky Archer"],
    [4000033,"异变亡灵","Beta Minion"],[4000034,"巨人拳击手","Boxer Giant"],
    [4000035,"炸弹兵","Bomber"],[4000036,"雷霆皮卡","Cannon Cart"],
    [4000037,"加农炮战车","Drop Ship"],[4000038,"骷髅气球","Night Witch"],
    [4000041,"飞龙宝宝","BH Baby Dragon"],[4000042,"暗夜女巫","Power P.E.K.K.A"],
    [4000070,"野猪飞骑","Hog Glider"]
  ].map(([id,zh,en]) => ({
    scId: id as number, category: "units2", zh: zh as string, en: en as string,
    buildCategory: "offense" as BuildCategory,
    maxLevel: 12, upgradeTimeSec: estTime(12, 3600, 5*DAY),
    thRequired: genTH(12, 2, 1), priority: 3, usesBuilder: false
  })),
];

// ── 导出 ─────────────────────────────────

export const COC_DATABASE_VERSION = "2026.11-TH19";
export const COC_DATABASE_UPDATED_AT = "2026-11-20";
export const COC_DATABASE_SOURCE = "Supercell 官方博客 + ClashRecord TH19 表 + chiefpansancolt 游戏数据包 + 国服 TapTap";

export const COC_ITEM_DEFS: CocItemDef[] = RAW_DATA;

/** 按 SC ID 索引的查找表 */
export const COC_ITEM_BY_ID: Record<number, CocItemDef> = Object.fromEntries(
  RAW_DATA.map((d) => [d.scId, d])
);
