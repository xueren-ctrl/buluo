/**
 * GitHub Gist 快照存储模块
 * 用于 GitHub Actions 环境（每次运行是全新容器，本地文件不会保留）
 * 将快照数据保存到 GitHub Gist，实现跨运行的状态持久化
 *
 * 同时保留本地文件存储能力，在没有 Gist 配置时自动降级
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { resolve } from 'path';
import { config } from './config.js';

const SNAPSHOT_DIR = config.data.snapshotDir;

// Gist 配置（通过环境变量传入）
const GIST_TOKEN = process.env.GIST_TOKEN || '';
const GIST_ID = process.env.GIST_ID || '';

const GIST_API = `https://api.github.com/gists/${GIST_ID}`;

/**
 * 是否启用 Gist 存储
 */
export function isGistEnabled() {
  return !!(GIST_TOKEN && GIST_ID);
}

/**
 * 保存快照 - 自动选择 Gist 或本地文件
 *
 * @param {string} playerTag - 玩家标签
 * @param {object} playerData - COC API 返回的完整玩家数据
 * @returns {Promise<object>} 保存的快照数据
 */
export async function saveSnapshot(playerTag, playerData) {
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

  const key = tagToKey(playerTag);

  if (isGistEnabled()) {
    await saveToGist(key, snapshot);
  } else {
    saveToLocal(key, snapshot);
  }

  return snapshot;
}

/**
 * 读取快照 - 自动选择 Gist 或本地文件
 *
 * @param {string} playerTag - 玩家标签
 * @returns {Promise<object|null>} 上次快照数据，不存在则返回 null
 */
export async function loadSnapshot(playerTag) {
  const key = tagToKey(playerTag);

  if (isGistEnabled()) {
    return loadFromGist(key);
  } else {
    return loadFromLocal(key);
  }
}

// ===== Gist 存储 =====

/**
 * 从 Gist 读取全部数据
 */
async function getGistData() {
  try {
    const res = await fetch(GIST_API, {
      headers: {
        'Authorization': `token ${GIST_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'coc-upgrade-notifier',
      },
    });

    if (!res.ok) {
      throw new Error(`Gist API 请求失败 (${res.status})`);
    }

    const gist = await res.json();
    const file = gist.files['coc-snapshots.json'];

    if (!file || !file.content) return {};

    return JSON.parse(file.content);
  } catch (error) {
    console.error(`[Gist] 读取失败: ${error.message}`);
    return {};
  }
}

/**
 * 向 Gist 写入全部数据
 */
async function setGistData(data) {
  try {
    const res = await fetch(GIST_API, {
      method: 'PATCH',
      headers: {
        'Authorization': `token ${GIST_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'coc-upgrade-notifier',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        files: {
          'coc-snapshots.json': {
            content: JSON.stringify(data, null, 2),
          },
        },
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Gist 写入失败 (${res.status}): ${body}`);
    }

    return true;
  } catch (error) {
    console.error(`[Gist] 写入失败: ${error.message}`);
    return false;
  }
}

async function saveToGist(key, snapshot) {
  const data = await getGistData();
  data[key] = snapshot;
  await setGistData(data);
  console.log(`[Gist] 快照已保存: ${key}`);
}

async function loadFromGist(key) {
  const data = await getGistData();
  return data[key] || null;
}

// ===== 本地文件存储（降级方案） =====

function ensureDir() {
  if (!existsSync(SNAPSHOT_DIR)) {
    mkdirSync(SNAPSHOT_DIR, { recursive: true });
  }
}

function tagToKey(playerTag) {
  return playerTag.replace('#', '');
}

function tagToFilename(playerTag) {
  return tagToKey(playerTag) + '.json';
}

function saveToLocal(key, snapshot) {
  ensureDir();
  const filePath = resolve(SNAPSHOT_DIR, `${key}.json`);
  writeFileSync(filePath, JSON.stringify(snapshot, null, 2), 'utf-8');
}

function loadFromLocal(key) {
  const filePath = resolve(SNAPSHOT_DIR, `${key}.json`);
  if (!existsSync(filePath)) return null;

  try {
    const content = readFileSync(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`[本地] 读取快照失败: ${error.message}`);
    return null;
  }
}

// ===== 工具函数 =====

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
