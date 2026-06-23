/**
 * Clash of Clans API 客户端
 * 封装对 Supercell 官方 API 的调用
 */

import { config } from './config.js';

const BASE_URL = config.coc.baseUrl;
const API_KEY = config.coc.apiKey;

/**
 * 通用 API 请求方法
 * @param {string} endpoint - API 路径
 * @returns {Promise<object>} API 响应 JSON
 */
async function apiRequest(endpoint) {
  const url = `${BASE_URL}${endpoint}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Accept': 'application/json',
    },
  });

  // 处理 HTTP 错误
  if (response.status === 429) {
    throw new Error('COC API 请求频率超限 (429)，请增大轮询间隔');
  }

  if (response.status === 403) {
    throw new Error('COC API 认证失败 (403)，请检查 API Key 和 IP 绑定');
  }

  if (response.status === 404) {
    throw new Error(`COC API 资源未找到 (404): ${endpoint}`);
  }

  if (response.status === 503) {
    throw new Error('COC API 服务维护中 (503)，稍后重试');
  }

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`COC API 请求失败 (${response.status}): ${body}`);
  }

  return response.json();
}

/**
 * 获取玩家完整信息
 * 包含 troops、heroes、spells 的当前 level 和 maxLevel
 *
 * @param {string} playerTag - 玩家标签，如 #PQR8L20Y
 * @returns {Promise<object>} 玩家数据
 *
 * 返回的关键字段:
 *   - name: 玩家名
 *   - tag: 玩家标签
 *   - townHallLevel: 大本营等级
 *   - troops[]: { name, level, maxLevel, village, superTroopIsActive }
 *   - heroes[]: { name, level, maxLevel, village }
 *   - spells[]: { name, level, maxLevel, village }
 *   - heroEquipment[]: { name, level, maxLevel, village }
 */
export async function getPlayer(playerTag) {
  const encodedTag = encodeURIComponent(playerTag);
  return apiRequest(`/players/${encodedTag}`);
}

/**
 * 批量获取多个玩家信息
 * 内置节流控制，避免触发 API 限流（建议 1 请求/秒）
 *
 * @param {string[]} playerTags - 玩家标签数组
 * @param {number} delayMs - 请求间隔毫秒数，默认 1200ms
 * @returns {Promise<object[]>} 玩家数据数组
 */
export async function getPlayers(playerTags, delayMs = 1200) {
  const results = [];

  for (const tag of playerTags) {
    try {
      const player = await getPlayer(tag);
      results.push({ success: true, tag, data: player });
    } catch (error) {
      results.push({ success: false, tag, error: error.message });
      console.error(`[COC] 获取玩家 ${tag} 失败: ${error.message}`);
    }

    // 间隔控制（最后一个不需要等）
    if (tag !== playerTags[playerTags.length - 1]) {
      await sleep(delayMs);
    }
  }

  return results;
}

/**
 * 健康检查 - 验证 API Key 是否有效
 * @returns {Promise<boolean>}
 */
export async function healthCheck() {
  try {
    if (config.coc.playerTags.length === 0) return false;
    await getPlayer(config.coc.playerTags[0]);
    return true;
  } catch (error) {
    if (error.message.includes('403')) return false;
    // 其他错误（如 404 玩家不存在）可能 API Key 本身有效
    if (error.message.includes('404')) return true;
    throw error;
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
