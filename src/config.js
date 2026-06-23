/**
 * 配置管理模块
 * 从环境变量和 .env 文件加载所有配置
 */

import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * 简易 .env 文件解析器（不依赖外部包）
 */
function parseEnvFile(filePath) {
  if (!existsSync(filePath)) return {};

  const content = readFileSync(filePath, 'utf-8');
  const env = {};

  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    // 跳过空行和注释
    if (!trimmed || trimmed.startsWith('#')) continue;

    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;

    const key = trimmed.slice(0, eqIndex).trim();
    let value = trimmed.slice(eqIndex + 1).trim();

    // 移除引号包裹
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    env[key] = value;
  }

  return env;
}

// 加载 .env 文件
const envPath = resolve(__dirname, '..', '.env');
const fileEnv = parseEnvFile(envPath);

// 合并环境变量：进程环境 > .env 文件
function getEnv(key, defaultValue = '') {
  return process.env[key] || fileEnv[key] || defaultValue;
}

/**
 * 应用配置对象
 */
export const config = {
  // COC API
  coc: {
    apiKey: getEnv('COC_API_KEY'),
    baseUrl: 'https://api.clashofclans.com/v1',
    playerTags: getEnv('COC_PLAYER_TAGS')
      .split(',')
      .map(tag => tag.trim())
      .filter(Boolean)
      .map(tag => tag.startsWith('#') ? tag : `#${tag}`),
  },

  // WxPusher
  wxpusher: {
    appToken: getEnv('WXPUSHER_APP_TOKEN'),
    uids: getEnv('WXPUSHER_UIDS')
      .split(',')
      .map(uid => uid.trim())
      .filter(Boolean),
    topicIds: getEnv('WXPUSHER_TOPIC_IDS')
      .split(',')
      .map(id => id.trim())
      .filter(Boolean)
      .map(Number),
    apiUrl: 'https://wxpusher.zjiecode.com/api/send/message',
  },

  // 轮询
  poll: {
    intervalMinutes: parseInt(getEnv('POLL_INTERVAL_MINUTES', '15'), 10),
  },

  // 数据存储
  data: {
    snapshotDir: resolve(__dirname, '..', 'data'),
  },
};

/**
 * 验证必需配置是否存在
 */
export function validateConfig() {
  const errors = [];

  if (!config.coc.apiKey) {
    errors.push('缺少 COC_API_KEY — 请在 .env 文件中配置');
  }

  if (config.coc.playerTags.length === 0) {
    errors.push('缺少 COC_PLAYER_TAGS — 请在 .env 文件中配置要监控的玩家标签');
  }

  if (!config.wxpusher.appToken) {
    errors.push('缺少 WXPUSHER_APP_TOKEN — 请在 .env 文件中配置 WxPusher 应用 Token');
  }

  if (config.wxpusher.uids.length === 0 && config.wxpusher.topicIds.length === 0) {
    errors.push('缺少 WXPUSHER_UIDS 或 WXPUSHER_TOPIC_IDS — 请配置至少一个推送目标');
  }

  if (config.poll.intervalMinutes < 1) {
    errors.push('POLL_INTERVAL_MINUTES 必须 >= 1 分钟');
  }

  if (config.poll.intervalMinutes < 5) {
    console.warn(`[警告] 轮询间隔 ${config.poll.intervalMinutes} 分钟可能过于频繁，建议 >= 5 分钟`);
  }

  return errors;
}
