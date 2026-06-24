/**
 * COC Upgrade Notifier - 主入口
 * 部落冲突升级完成 → 微信推送通知
 *
 * 运行方式:
 *   常驻模式: node src/index.js
 *   单次模式: node src/index.js --once （适合 GitHub Actions / 定时任务）
 *
 * 需要 Node.js >= 18（内置 fetch）
 */

import { config, validateConfig } from './config.js';
import { getPlayer, getPlayers, healthCheck } from './coc-client.js';
import { isGistEnabled } from './gist-store.js';
import { saveSnapshot, loadSnapshot } from './gist-store.js';
import { detectUpgrades, formatUpgradeText } from './detector.js';
import { sendUpgradeNotification, sendStartNotification } from './wxpusher.js';
import { logger } from './logger.js';

// 是否只执行一次（--once 参数）
const RUN_ONCE = process.argv.includes('--once');

// ===== 启动入口 =====

async function main() {
  console.log('');
  console.log('='.repeat(50));
  console.log('  COC Upgrade Notifier v1.1.0');
  console.log('  部落冲突升级完成 -> 微信推送通知');
  console.log('='.repeat(50));
  console.log('');

  if (RUN_ONCE) {
    console.log('  模式: 单次执行 (GitHub Actions / 定时任务)');
  }
  if (isGistEnabled()) {
    console.log('  快照存储: GitHub Gist');
  } else {
    console.log('  快照存储: 本地文件');
  }
  console.log('');

  // 1. 验证配置
  const configErrors = validateConfig();
  if (configErrors.length > 0) {
    console.error('[启动失败] 配置错误:');
    configErrors.forEach(err => console.error(`  - ${err}`));
    console.error('\n请复制 .env.example 为 .env 并填入正确配置');
    process.exit(1);
  }

  logger.info('配置验证通过');
  logger.info(`监控玩家: ${config.coc.playerTags.join(', ')}`);
  logger.info(`轮询间隔: ${config.poll.intervalMinutes} 分钟`);
  logger.info(`推送目标 UID: ${config.wxpusher.uids.join(', ') || '无'}`);
  logger.info(`推送目标主题: ${config.wxpusher.topicIds.join(', ') || '无'}`);

  // 2. 验证 COC API 连通性
  logger.info('验证 COC API 连通性...');
  try {
    const isHealthy = await healthCheck();
    if (!isHealthy) {
      logger.error('COC API 认证失败，请检查 API Key 和 IP 绑定');
      process.exit(1);
    }
    logger.success('COC API 连通性验证通过');
  } catch (error) {
    logger.error(`COC API 连接失败: ${error.message}`);
    logger.warn('将在下次轮询时重试...');
  }

  // 3. 发送启动通知（仅在常驻模式下发送，避免 Actions 每次启动都推送）
  if (!RUN_ONCE) {
    try {
      await sendStartNotification();
      logger.success('启动通知已发送到微信');
    } catch (error) {
      logger.warn(`启动通知发送失败: ${error.message}（不影响监控运行）`);
    }
  }

  // 4. 执行检测
  if (RUN_ONCE) {
    // 单次模式：执行一次后退出
    await pollAllPlayers();
    logger.info('单次检测完成，程序退出');
    return;
  }

  // 常驻模式：设置定时轮询
  const intervalMs = config.poll.intervalMinutes * 60 * 1000;
  logger.info(`开始定时轮询（每 ${config.poll.intervalMinutes} 分钟一次）`);
  console.log('');

  // 立即执行一次
  await pollAllPlayers();

  // 设置定时轮询
  setInterval(async () => {
    await pollAllPlayers();
  }, intervalMs);

  // 优雅退出
  process.on('SIGINT', () => {
    logger.info('收到 SIGINT，优雅退出...');
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    logger.info('收到 SIGTERM，优雅退出...');
    process.exit(0);
  });
}

// ===== 轮询核心逻辑 =====

/**
 * 轮询所有玩家并检测升级
 */
async function pollAllPlayers() {
  const now = new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });
  logger.info(`--- 开始轮询 [${now}] ---`);

  const results = await getPlayers(config.coc.playerTags);

  let totalUpgrades = 0;

  for (const result of results) {
    if (!result.success) {
      logger.error(`玩家 ${result.tag} 数据获取失败: ${result.error}`);
      continue;
    }

    const playerData = result.data;
    const playerTag = playerData.tag;
    const playerName = playerData.name;

    // 读取上次快照
    const prevSnapshot = await loadSnapshot(playerTag);

    // 检测升级
    const upgradeResult = detectUpgrades(playerData, prevSnapshot);

    if (upgradeResult.upgrades.length > 0) {
      logger.success(`${playerName} 检测到 ${upgradeResult.upgrades.length} 项升级!`);
      for (const u of upgradeResult.upgrades) {
        logger.info(`  ${formatUpgradeText(u)}`);
      }

      // 发送微信推送
      try {
        await sendUpgradeNotification(upgradeResult);
        logger.success(`已推送 ${playerName} 的升级通知到微信`);
      } catch (error) {
        logger.error(`推送 ${playerName} 升级通知失败: ${error.message}`);
      }

      totalUpgrades += upgradeResult.upgrades.length;
    } else {
      logger.info(`${playerName} 暂无新升级`);
    }

    // 保存当前快照（无论是否有升级都要保存）
    await saveSnapshot(playerTag, playerData);
  }

  logger.info(`--- 轮询结束，共检测到 ${totalUpgrades} 项升级 ---`);
  console.log('');
}

// ===== 启动 =====

main().catch(error => {
  console.error(`[致命错误] 启动异常: ${error.message}`);
  process.exit(1);
});
