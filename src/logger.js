/**
 * 日志系统
 * 内置轻量日志，同时写入控制台和文件
 */

import { appendFileSync, existsSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const LOG_DIR = resolve(__dirname, '..', 'data', 'logs');

function ensureLogDir() {
  if (!existsSync(LOG_DIR)) {
    mkdirSync(LOG_DIR, { recursive: true });
  }
}

function getLogFilePath() {
  const date = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  return resolve(LOG_DIR, `${date}.log`);
}

function formatTimestamp() {
  return new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });
}

function writeLog(level, message) {
  const timestamp = formatTimestamp();
  const line = `[${timestamp}] [${level}] ${message}\n`;

  // 控制台输出（带颜色）
  const colors = {
    INFO: '\x1b[36m',
    WARN: '\x1b[33m',
    ERROR: '\x1b[31m',
    SUCCESS: '\x1b[32m',
    RESET: '\x1b[0m',
  };
  const color = colors[level] || '';
  console.log(`${color}[${level}]${colors.RESET} ${message}`);

  // 文件输出
  try {
    ensureLogDir();
    appendFileSync(getLogFilePath(), line, 'utf-8');
  } catch {
    // 日志写入失败不影响主流程
  }
}

export const logger = {
  info: (msg) => writeLog('INFO', msg),
  warn: (msg) => writeLog('WARN', msg),
  error: (msg) => writeLog('ERROR', msg),
  success: (msg) => writeLog('SUCCESS', msg),
};
