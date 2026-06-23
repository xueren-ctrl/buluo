/**
 * 状态快照管理模块
 * 负责保存/读取玩家升级状态快照到 JSON 文件
 * 每次轮询后将当前状态持久化，用于下次对比
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'fs';
import { resolve } from 'path';
import { config } from './config.js';

const SNAPSHOT_DIR = config.data.snapshotDir;

/**
 * 确保快照目录存在
 */
function ensureDir() {
  if (!existsSync(SNAPSHOT_DIR)) {
    mkdirSync(SNAPSHOT_DIR, { recursive: true });
  }
}

/**
 * 将玩家 tag 转为安全的文件名
 * #PQR8L20Y -> PQR8L20Y
 */
function tagToFilename(playerTag) {
  return playerTag.replace('#', '') + '.json';
}

/**
 * 保存玩家状态快照
 * 只保存升级相关的核心字段，不保存战绩等易变数据
 *
 * @param {string} playerTag - 玩家标签
 * @param {object} playerData - COC API 返回的完整玩家数据
 */
export function saveSnapshot(playerTag, playerData) {
  ensureDir();

  const snapshot = {
    tag: playerData.tag,
    name: playerData.name,
    townHallLevel: playerData.townHallLevel,
    townHallWeaponLevel: playerData.townHallWeaponLevel || 0,
    builderHallLevel: playerData.builderHallLevel || 0,
    timestamp: new Date().toISOString(),
    troops: extractItemLevels(playerData.troops || []),
    heroes: extractItemLevels(playerData.heroes || []),
    spells: extractItemLevels(playerData.spells || []),
    heroEquipment: extractItemLevels(playerData.heroEquipment || []),
  };

  const filePath = resolve(SNAPSHOT_DIR, tagToFilename(playerTag));
  writeFileSync(filePath, JSON.stringify(snapshot, null, 2), 'utf-8');
  return snapshot;
}

/**
 * 读取玩家上一次的快照
 * @param {string} playerTag - 玩家标签
 * @returns {object|null} 上次快照数据，不存在则返回 null
 */
export function loadSnapshot(playerTag) {
  const filePath = resolve(SNAPSHOT_DIR, tagToFilename(playerTag));

  if (!existsSync(filePath)) return null;

  try {
    const content = readFileSync(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`[快照] 读取 ${playerTag} 快照失败: ${error.message}`);
    return null;
  }
}

/**
 * 从 API 返回的 items 列表中提取 level 信息
 * 构建: { "Barbarian": { level: 5, maxLevel: 10 }, ... }
 *
 * @param {Array} items - troops/heroes/spells 数组
 * @returns {object} 精简的等级映射
 */
function extractItemLevels(items) {
  const map = {};

  for (const item of items) {
    const name = item.name;
    if (!name) continue;
    map[name] = {
      level: item.level,
      maxLevel: item.maxLevel,
      village: item.village,
    };

    if (item.superTroopIsActive !== undefined) {
      map[name].superTroopIsActive = item.superTroopIsActive;
    }
  }

  return map;
}

/**
 * 列出所有已保存快照的玩家标签
 * @returns {string[]}
 */
export function listSavedTags() {
  ensureDir();
  const files = readdirSync(SNAPSHOT_DIR);
  return files
    .filter(f => f.endsWith('.json'))
    .map(f => '#' + f.replace('.json', ''));
}
