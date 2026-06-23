/**
 * WxPusher 消息推送模块
 * 通过 WxPusher 服务号 API 将升级通知推送到微信
 *
 * 文档: https://wxpusher.zjiecode.com/docs/
 * 支持 contentType: 1=文字, 2=HTML, 3=Markdown
 */

import { config } from './config.js';

const WXPUSHER_API = config.wxpusher.apiUrl;

/**
 * 发送消息到 WxPusher
 *
 * @param {string} content - 消息内容
 * @param {number} contentType - 1=文字, 2=HTML, 3=Markdown
 * @param {string} summary - 消息摘要（最长100字，微信通知栏显示）
 * @returns {Promise<object>} WxPusher 响应
 */
export async function sendMessage(content, contentType = 2, summary = '') {
  const body = {
    appToken: config.wxpusher.appToken,
    content,
    summary: summary || content.slice(0, 100).replace(/<[^>]+>/g, ''),
    contentType,
  };

  // 添加推送目标
  if (config.wxpusher.uids.length > 0) {
    body.uids = config.wxpusher.uids;
  }

  if (config.wxpusher.topicIds.length > 0) {
    body.topicIds = config.wxpusher.topicIds;
  }

  try {
    const response = await fetch(WXPUSHER_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const result = await response.json();

    if (result.code !== 1000) {
      throw new Error(`WxPusher 推送失败 (code=${result.code}): ${result.msg}`);
    }

    return result;
  } catch (error) {
    console.error(`[WxPusher] 推送请求失败: ${error.message}`);
    throw error;
  }
}

/**
 * 发送升级通知（HTML 格式，微信中渲染更美观）
 *
 * @param {object} upgradeResult - detectUpgrades 返回的结果
 * @returns {Promise<object|null>} WxPusher 响应，无升级时返回 null
 */
export async function sendUpgradeNotification(upgradeResult) {
  const { playerName, playerTag, townHallLevel, upgrades } = upgradeResult;

  if (upgrades.length === 0) {
    return null;
  }

  const html = buildUpgradeHtml(playerName, playerTag, townHallLevel, upgrades);
  const summary = `${playerName} 有 ${upgrades.length} 项升级完成!`;

  return sendMessage(html, 2, summary);
}

/**
 * 发送纯文字升级通知（备用，更轻量）
 */
export async function sendUpgradeText(upgradeResult) {
  const { playerName, upgrades } = upgradeResult;

  if (upgrades.length === 0) return null;

  const lines = upgrades.map(u => {
    const maxed = u.isMaxed ? ' [满级!]' : '';
    return `${u.category} ${u.nameZh}: Lv${u.oldLevel} \u2192 Lv${u.newLevel}${maxed}`;
  });

  const text = `【COC升级通知】${playerName}\n\n${lines.join('\n')}`;
  const summary = `${playerName} 有 ${upgrades.length} 项升级完成!`;

  return sendMessage(text, 1, summary);
}

/**
 * 发送服务启动通知
 */
export async function sendStartNotification() {
  const playerTagsStr = config.coc.playerTags.join(', ');
  const intervalStr = `${config.poll.intervalMinutes} 分钟`;
  const timeStr = new Date().toLocaleString('zh-CN');

  const html = [
    '<div style="padding:16px;font-family:sans-serif;">',
    '<h2 style="color:#3B6D11;margin:0 0 12px 0;">COC 升级监控已启动</h2>',
    `<p>监控玩家: ${playerTagsStr}</p>`,
    `<p>轮询间隔: ${intervalStr}</p>`,
    `<p style="color:#888;font-size:13px;">${timeStr}</p>`,
    '</div>',
  ].join('');

  const summary = 'COC 升级监控服务已启动';

  return sendMessage(html, 2, summary);
}

/**
 * 构建升级通知 HTML 消息
 * 使用卡片样式，适配微信服务号消息展示
 */
function buildUpgradeHtml(playerName, playerTag, townHallLevel, upgrades) {
  const now = new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });

  // 按类别分组
  const grouped = {};
  for (const u of upgrades) {
    if (!grouped[u.category]) grouped[u.category] = [];
    grouped[u.category].push(u);
  }

  let itemsHtml = '';
  for (const [category, items] of Object.entries(grouped)) {
    itemsHtml += `<div style="margin:12px 0 4px;font-weight:bold;color:#185FA5;">${category}</div>`;
    for (const item of items) {
      const maxedBadge = item.isMaxed
        ? '<span style="background:#3B6D11;color:white;font-size:11px;padding:1px 6px;border-radius:3px;margin-left:6px;">\u6EE1\u7EA7</span>'
        : '';
      itemsHtml += [
        '<div style="padding:6px 12px;margin:4px 0;background:#F1EFE8;border-radius:6px;display:flex;justify-content:space-between;align-items:center;">',
        `<span>${item.nameZh}${maxedBadge}</span>`,
        `<span style="color:#5F5E5A;">Lv${item.oldLevel} <span style="color:#3B6D11;font-weight:bold;">\u2192 Lv${item.newLevel}</span> / ${item.maxLevel}</span>`,
        '</div>',
      ].join('');
    }
  }

  const parts = [
    '<div style="padding:16px;font-family:sans-serif;max-width:400px;">',
    '<h2 style="color:#185FA5;margin:0 0 4px 0;font-size:18px;">\u5347\u7EA7\u5B8C\u6210\u901A\u77E5</h2>',
    `<div style="color:#888;font-size:13px;margin-bottom:12px;">${now}</div>`,
    '<div style="padding:10px 12px;background:#EAF3DE;border-radius:8px;margin-bottom:12px;">',
    `<span style="font-weight:bold;font-size:15px;">${playerName}</span>`,
    `<span style="color:#5F5E5A;margin-left:8px;">${playerTag}</span>`,
    `<span style="float:right;color:#888;">TH${townHallLevel}</span>`,
    '</div>',
    itemsHtml,
    `<div style="margin-top:16px;padding-top:10px;border-top:1px solid #D3D1C7;color:#888;font-size:12px;">`,
    `\u5171 ${upgrades.length} \u9879\u5347\u7EA7\u5B8C\u6210 | COC Upgrade Notifier`,
    '</div>',
    '</div>',
  ];

  return parts.join('');
}
