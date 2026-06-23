/**
 * 升级检测引擎
 * 对比当前 API 数据与上次快照，发现等级提升事件
 *
 * 核心原理：COC API 不提供 "正在升级" 的字段，
 * 但可以通过对比两次查询间的 level 变化来推断升级完成：
 *   - 上次查询: Barbarian level=4, maxLevel=9
 *   - 本次查询: Barbarian level=5
 *   → 推断: Barbarian 升级完成 (4→5)
 *
 * 同理适用于 heroes、spells、heroEquipment、大本营等
 */

/**
 * 检测单个玩家的升级事件
 *
 * @param {object} currentData - 当前 API 返回的玩家数据
 * @param {object|null} previousSnapshot - 上次保存的快照（null 表示首次运行）
 * @returns {object} { playerName, playerTag, upgrades: UpgradeEvent[] }
 */
export function detectUpgrades(currentData, previousSnapshot) {
  const result = {
    playerName: currentData.name,
    playerTag: currentData.tag,
    townHallLevel: currentData.townHallLevel,
    upgrades: [],
  };

  // 首次运行，没有快照 → 保存当前状态但不报升级
  if (!previousSnapshot) {
    return result;
  }

  // 1. 检测大本营升级
  detectTownHallUpgrade(currentData, previousSnapshot, result.upgrades);

  // 2. 检测部队升级
  detectCategoryUpgrades('troops', '部队', currentData, previousSnapshot, result.upgrades);

  // 3. 检测英雄升级
  detectCategoryUpgrades('heroes', '英雄', currentData, previousSnapshot, result.upgrades);

  // 4. 检测法术升级
  detectCategoryUpgrades('spells', '法术', currentData, previousSnapshot, result.upgrades);

  // 5. 检测英雄装备升级
  detectCategoryUpgrades('heroEquipment', '英雄装备', currentData, previousSnapshot, result.upgrades);

  return result;
}

/**
 * 检测大本营等级变化
 */
function detectTownHallUpgrade(currentData, prev, upgrades) {
  if (currentData.townHallLevel > (prev.townHallLevel || 0)) {
    upgrades.push({
      category: '大本营',
      name: 'Town Hall',
      nameZh: '大本营',
      oldLevel: prev.townHallLevel || 0,
      newLevel: currentData.townHallLevel,
      maxLevel: currentData.townHallLevel,
      village: 'HOME_VILLAGE',
    });
  }

  // 大本营武器 (14级+)
  if ((currentData.townHallWeaponLevel || 0) > (prev.townHallWeaponLevel || 0)) {
    upgrades.push({
      category: '大本营',
      name: 'Town Hall Weapon',
      nameZh: '大本营武器',
      oldLevel: prev.townHallWeaponLevel || 0,
      newLevel: currentData.townHallWeaponLevel,
      maxLevel: currentData.townHallWeaponLevel,
      village: 'HOME_VILLAGE',
    });
  }

  // 建筑大师大本营
  if ((currentData.builderHallLevel || 0) > (prev.builderHallLevel || 0)) {
    upgrades.push({
      category: '大本营',
      name: 'Builder Hall',
      nameZh: '建筑大师大本营',
      oldLevel: prev.builderHallLevel || 0,
      newLevel: currentData.builderHallLevel,
      maxLevel: currentData.builderHallLevel,
      village: 'BUILDER_BASE',
    });
  }
}

/**
 * 通用类别升级检测
 * 对比 troops/heroes/spells/heroEquipment 的 level 变化
 */
function detectCategoryUpgrades(field, categoryZh, currentData, prev, upgrades) {
  const currentItems = currentData[field] || [];
  const prevMap = prev[field] || {};

  for (const item of currentItems) {
    const name = item.name;
    if (!name) continue;

    const prevItem = prevMap[name];

    // 新增项目（可能是刚解锁的）
    if (!prevItem) continue;

    const oldLevel = prevItem.level;
    const newLevel = item.level;

    // 等级提升 = 升级完成
    if (newLevel > oldLevel) {
      upgrades.push({
        category: categoryZh,
        name: name,
        nameZh: name,
        oldLevel,
        newLevel,
        maxLevel: item.maxLevel,
        village: item.village || prevItem.village,
        isMaxed: newLevel >= item.maxLevel,
      });
    }
  }
}

/**
 * 格式化升级事件为可读文本
 * @param {object} upgrade - 单个升级事件
 * @returns {string}
 */
export function formatUpgradeText(upgrade) {
  const maxedTag = upgrade.isMaxed ? ' [满级!]' : '';
  return `${upgrade.category} ${upgrade.nameZh}: ${upgrade.oldLevel} → ${upgrade.newLevel}${maxedTag}`;
}
