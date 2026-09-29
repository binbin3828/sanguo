import { CLASSIC_ATTACK_ROWS, CLASSIC_SKILL_ROWS } from './ClassicBattleRanges.js';
import { makeLargeBattleMap, MAP_NAMES, MAX_BATTLE_GENERALS } from './BattleMaps.js?v=20260929-expedition-ten';

export const BATTLE_WIDTH = 32;
export const BATTLE_HEIGHT = 32;
export { MAP_NAMES, MAX_BATTLE_GENERALS };
export const WEATHER = ['晴', '阴', '风', '雨', '冰雹'];
export const TERRAIN = {
  plain: { name: '平原', defense: 1 }, grass: { name: '草地', defense: 1 },
  mountain: { name: '山地', defense: 1.3 }, forest: { name: '森林', defense: 1.15 },
  village: { name: '村庄', defense: 1.1 }, city: { name: '城池', defense: 1.5 },
  camp: { name: '营寨', defense: 1.2 }, river: { name: '河流', defense: .8 },
  bridge: { name: '桥梁', defense: .8 }
};
export const ARMIES = {
  骑兵: { move: 5, attack: 1, defense: .7, range: [1, 1] },
  步兵: { move: 4, attack: .8, defense: 1.2, range: [1, 1] },
  弓兵: { move: 4, attack: .9, defense: 1, range: [1, 3] },
  水军: { move: 5, attack: .8, defense: 1.1, range: [1, 2] },
  极兵: { move: 6, attack: 1.3, defense: 1.2, range: [1, 2] },
  玄兵: { move: 3, attack: .4, defense: .6, range: [1, 2] }
};
// iBaye pconst.c:dFgtLandF, ordered as grass, plain, mountain, forest,
// village, city, camp, river. A non-negative value 0–3 shifts attack and defense.
const CLASSIC_LAND_SHIFT = {
  骑兵: { grass: 0, plain: 0, mountain: 2, forest: 1, village: 0, city: 0, camp: 0, river: 3 },
  步兵: { grass: 0, plain: 0, mountain: 0, forest: 0, village: 0, city: 0, camp: 0, river: 2 },
  弓兵: { grass: 0, plain: 0, mountain: 0, forest: 0, village: 0, city: 0, camp: 0, river: 2 },
  水军: { grass: 1, plain: 1, mountain: 3, forest: 2, village: 0, city: 0, camp: 0, river: 0 },
  极兵: { grass: 0, plain: 0, mountain: 1, forest: 1, village: 0, city: 0, camp: 0, river: 1 },
  玄兵: { grass: 0, plain: 0, mountain: 0, forest: 0, village: 0, city: 0, camp: 0, river: 1 }
};
const SUBDUE = {
  骑兵: { 步兵: 1.2, 弓兵: .8, 极兵: .7, 玄兵: 1.3 },
  步兵: { 骑兵: .8, 弓兵: 1.2, 极兵: .6, 玄兵: 1.2 },
  弓兵: { 骑兵: 1.2, 步兵: .8, 极兵: 1.1, 玄兵: 1.2 },
  极兵: { 骑兵: 1.1, 步兵: 1.3, 弓兵: .9, 玄兵: 1.5 },
  玄兵: { 骑兵: .6, 步兵: .6, 弓兵: .6, 水军: .6, 极兵: .6, 玄兵: .6 }
};
export const SKILLS = {
  charge: { name: '冲锋', classicId: 2, arms: ['骑兵', '极兵'], cost: 12, target: 'enemy', range: [1, 1] },
  volley: { name: '飞矢', classicId: 9, arms: ['弓兵'], cost: 10, target: 'enemy', range: [2, 3] },
  arrows: { name: '箭雨', classicId: 10, arms: ['弓兵'], level: 3, cost: 22, target: 'enemy', range: [2, 3] },
  fire: { name: '火攻', classicId: 5, arms: ['玄兵', '弓兵'], level: 2, cost: 18, target: 'enemy', range: [1, 3] },
  rock: { name: '落石', classicId: 7, arms: ['玄兵', '步兵'], level: 2, cost: 18, target: 'enemy', range: [1, 2] },
  flood: { name: '水淹', classicId: 12, arms: ['水军', '玄兵'], level: 2, cost: 18, target: 'enemy', range: [1, 2] },
  bind: { name: '定身', classicId: 15, arms: ['玄兵'], level: 2, cost: 16, target: 'enemy', range: [1, 2] },
  reinforce: { name: '援兵', classicId: 17, arms: ['步兵', '玄兵'], level: 2, cost: 16, target: 'ally', range: [0, 2] },
  ward: { name: '奇门', classicId: 20, arms: ['玄兵'], level: 3, cost: 14, target: 'ally', range: [0, 2] },
  change: { name: '天变', classicId: 22, arms: ['玄兵'], level: 4, cost: 24, target: 'none', range: [0, 0] }
};

const key = (x, y) => `${x},${y}`;
export const distance = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
export const alive = unit => Boolean(unit && unit.troops > 0 && unit.hp > 0);
export const army = unit => ARMIES[unit.armsType] || ARMIES.步兵;
export const tileAt = (battle, x, y) => battle.map?.tiles[y]?.[x] || null;
export const occupantAt = (battle, x, y) => battle.units.find(unit => alive(unit) && unit.x === x && unit.y === y);

export function makeBattleMap(fromId, toId) {
  return makeLargeBattleMap(fromId, toId);
}

export function movementCost(unit, tile) {
  if (!tile) return Infinity;
  if (tile === 'river' && unit.armsType !== '水军') return Infinity;
  if (tile === 'river' && unit.armsType === '水军') return 1;
  if (tile === 'bridge') return unit.armsType === '水军' ? 1 : 2;
  if (tile === 'mountain') return unit.armsType === '骑兵' ? 4 : 3;
  if (tile === 'forest') return unit.armsType === '骑兵' ? 3 : 2;
  if (tile === 'city') return 2;
  return 1;
}

// Reverse Dijkstra field lets AI judge a distant objective through bridges and mountain passes.
export function distanceField(battle, unit, target) {
  const keyOf = (x, y) => `${x},${y}`;
  const costs = new Map([[keyOf(target.x, target.y), 0]]);
  const pending = [{ x: target.x, y: target.y, cost: 0 }];
  while (pending.length) {
    pending.sort((a, b) => a.cost - b.cost);
    const point = pending.shift();
    if (point.cost !== costs.get(keyOf(point.x, point.y))) continue;
    for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
      const x = point.x + dx, y = point.y + dy;
      if (x < 0 || y < 0 || x >= battle.map.width || y >= battle.map.height) continue;
      const cost = point.cost + movementCost(unit, tileAt(battle, point.x, point.y));
      const next = keyOf(x, y);
      if (cost >= (costs.get(next) ?? Infinity)) continue;
      costs.set(next, cost); pending.push({ x, y, cost });
    }
  }
  return costs;
}

export function reachableTiles(battle, unit) {
  if (!unit || !alive(unit) || unit.moved || unit.acted || unit.status?.bind) return [];
  const budget = Math.min(8, army(unit).move + (unit.speed || 0));
  const costs = new Map([[key(unit.x, unit.y), 0]]);
  const previous = new Map();
  const pending = [{ x: unit.x, y: unit.y, cost: 0 }];
  while (pending.length) {
    pending.sort((a, b) => a.cost - b.cost);
    const current = pending.shift();
    if (current.cost !== costs.get(key(current.x, current.y))) continue;
    for (const [dx, dy] of [[0,-1],[0,1],[-1,0],[1,0]]) {
      const x = current.x + dx, y = current.y + dy;
      if (occupantAt(battle, x, y)) continue;
      const cost = current.cost + movementCost(unit, tileAt(battle, x, y));
      const position = key(x, y);
      if (cost > budget || cost >= (costs.get(position) ?? Infinity)) continue;
      costs.set(position, cost); previous.set(position, key(current.x, current.y)); pending.push({ x, y, cost });
    }
  }
  return [...costs].filter(([position]) => position !== key(unit.x, unit.y)).map(([position, cost]) => {
    const path = [];
    for (let step = position; step; step = previous.get(step)) {
      const [x, y] = step.split(',').map(Number);
      path.push({ x, y });
    }
    path.reverse();
    const { x, y } = path[path.length - 1];
    return { x, y, cost, path };
  });
}

export function inRange(unit, target, range = army(unit).range) {
  const d = distance(unit, target);
  return d >= range[0] && d <= range[1];
}

export const battleRangeRule = battle => battle?.rangeRule === 'classic' ? 'classic' : 'modern';

function maskContains(rows, source, target) {
  const center = Math.floor(rows.length / 2);
  const x = target.x - source.x + center, y = target.y - source.y + center;
  return rows[y]?.[x] === '1';
}

function modernAttackRange(battle, unit, target) {
  const d = distance(unit, target);
  if (unit.armsType === '弓兵') return d >= 1 && d <= 3;
  if (unit.armsType === '玄兵') return d >= 1 && d <= 2;
  if (unit.armsType === '极兵') return d === 1 || d === 2 && (unit.x === target.x || unit.y === target.y);
  if (unit.armsType === '水军') return d === 1 || d === 2 && ['river', 'bridge'].includes(tileAt(battle, unit.x, unit.y));
  return d === 1;
}

export function attackRangeContains(battle, unit, target) {
  if (!unit || !target) return false;
  if (battleRangeRule(battle) === 'classic') return maskContains(CLASSIC_ATTACK_ROWS[unit.armsType] || CLASSIC_ATTACK_ROWS.步兵, unit, target);
  return modernAttackRange(battle, unit, target);
}

export function skillRangeContains(battle, unit, skillId, target) {
  const skill = SKILLS[skillId];
  if (!skill || !unit || !target || skill.target === 'none') return false;
  if (battleRangeRule(battle) === 'classic') return maskContains(CLASSIC_SKILL_ROWS[skill.classicId], unit, target);
  const d = distance(unit, target);
  if (skillId === 'charge') return unit.armsType === '极兵' ? d === 1 || d === 2 && (unit.x === target.x || unit.y === target.y) : d === 1;
  if (['volley', 'arrows'].includes(skillId)) return d >= 1 && d <= 3;
  if (skillId === 'fire') return unit.armsType === '弓兵' ? d >= 2 && d <= 3 : d >= 1 && d <= 2;
  if (skillId === 'rock') return unit.armsType === '步兵' ? d === 1 : d >= 1 && d <= 2;
  if (skillId === 'flood') return unit.armsType === '水军' && ['river', 'bridge'].includes(tileAt(battle, unit.x, unit.y)) ? d >= 1 && d <= 3 : d >= 1 && d <= 2;
  return d >= skill.range[0] && d <= skill.range[1];
}

export function rangeCells(battle, unit, skillId = null) {
  if (!battle || !unit) return [];
  const cells = [];
  for (let y = 0; y < battle.map.height; y++) for (let x = 0; x < battle.map.width; x++) {
    const point = { x, y };
    if (skillId ? skillRangeContains(battle, unit, skillId, point) : attackRangeContains(battle, unit, point)) cells.push(point);
  }
  return cells;
}

export function attackError(battle, unit, target, { ignoreAction = false } = {}) {
  if (!battle || !alive(unit) || (!ignoreAction && unit.acted)) return '该部队已行动';
  if (!alive(target) || unit.side === target.side) return '请选择敌军';
  if (!attackRangeContains(battle, unit, target)) return '目标不在攻击范围';
  if (battleRangeRule(battle) === 'classic') return null;
  const steps = Math.max(Math.abs(target.x - unit.x), Math.abs(target.y - unit.y));
  if (steps <= 1) return null;
  for (let step = 1; step < steps; step++) {
    const x = Math.round(unit.x + (target.x - unit.x) * step / steps);
    const y = Math.round(unit.y + (target.y - unit.y) * step / steps);
    if (['mountain', 'city'].includes(tileAt(battle, x, y)) || occupantAt(battle, x, y)) return '射线被地形或部队阻挡';
  }
  return null;
}

export function canAttack(battle, unit, target) {
  return attackError(battle, unit, target, { ignoreAction: true }) === null;
}

export function availableSkills(battle, unit) {
  if (!unit || !alive(unit)) return [];
  return Object.entries(SKILLS).filter(([, skill]) => skill.arms.includes(unit.armsType)).map(([id, skill]) => ({ id, ...skill, available: skillError(battle, unit, id) === null }));
}

export function skillError(battle, unit, skillId, target = null) {
  const skill = SKILLS[skillId];
  if (!skill || !skill.arms.includes(unit?.armsType)) return '此武将未习得该计谋';
  if ((unit.level || 1) < (skill.level || 1)) return `需要等级 ${skill.level}`;
  if (skillId === 'change' && !unit.isRuler) return '仅君主可施展天变';
  if (!alive(unit) || unit.acted) return '该部队已行动';
  if (unit.status?.silence) return '武将被禁咒';
  if (unit.mp < skill.cost) return '计谋点不足';
  if (skillId === 'fire' && ['雨','冰雹'].includes(battle.weather)) return '雨雪天气无法火攻';
  if (skillId === 'rock' && tileAt(battle, unit.x, unit.y) !== 'mountain') return '须在山地施展落石';
  if (skillId === 'flood' && battle.weather !== '雨' && tileAt(battle, unit.x, unit.y) !== 'river') return '须在河流或雨天施展水淹';
  if (skillId === 'charge' && (!unit.moved || ['mountain','forest'].includes(tileAt(battle, unit.x, unit.y)))) return '须在开阔地移动后冲锋';
  if (skill.target === 'none') return null;
  if (!target) return null;
  if (!alive(target) || !skillRangeContains(battle, unit, skillId, target)) return '目标不在施展范围';
  if (battleRangeRule(battle) === 'modern' && ['volley', 'arrows'].includes(skillId)) {
    const blocked = attackError(battle, { ...unit, acted: false }, target);
    if (blocked === '射线被地形或部队阻挡') return blocked;
  }
  if (skill.target === 'enemy' && unit.side === target.side || skill.target === 'ally' && unit.side !== target.side) return '目标阵营不符';
  if (skillId === 'reinforce' && target.troops >= target.initialTroops) return '目标兵力已满';
  return null;
}

export function attackDamage(battle, source, target, multiplier = 1, { basicAttack = true } = {}) {
  const atk = army(source), def = army(target);
  const subdue = SUBDUE[source.armsType]?.[target.armsType] || 1;
  const weather = ['雨','冰雹'].includes(battle.weather) && source.armsType === '弓兵' ? .85 : 1;
  const closeBow = basicAttack && battleRangeRule(battle) === 'modern' && source.armsType === '弓兵' && distance(source, target) === 1 ? .7 : 1;
  if (basicAttack) {
    // iBaye FgtCount.c:BuiltAtkAttr + CountAtkHurt. Bridge is a new tile;
    // treat its attack footing as plain while retaining its river defense value.
    const sourceTerrain = tileAt(battle, source.x, source.y);
    const targetTerrain = tileAt(battle, target.x, target.y);
    const attackShift = CLASSIC_LAND_SHIFT[source.armsType]?.[sourceTerrain] ?? 0;
    const defenseShift = CLASSIC_LAND_SHIFT[target.armsType]?.[targetTerrain] ?? 0;
    const attack = Math.trunc((source.force || 0) * ((source.level || 1) + 10) * atk.attack) >> attackShift;
    const defenseBase = Math.trunc((target.intelligence || 0) * ((target.level || 1) + 10) * def.defense) >> defenseShift;
    const defense = Math.max(1, Math.trunc(defenseBase * TERRAIN[targetTerrain].defense * (target.status?.ward ? 1.3 : 1)));
    const classic = Math.trunc(Math.trunc(attack / defense * Math.floor(source.troops / 8)) * subdue) + 10;
    return Math.max(1, Math.round(classic * multiplier * weather * closeBow));
  }
  // Skills retain the mobile game's separate balance until their original rules are decoded.
  const attack = (source.force + 25) * atk.attack;
  const defense = (target.intelligence + 25) * def.defense * TERRAIN[tileAt(battle, target.x, target.y)].defense * (target.status?.ward ? 1.3 : 1);
  const ratio = Math.max(.6, Math.min(1.5, attack / Math.max(1, defense)));
  return Math.max(25, Math.round(source.troops * .105 * ratio * subdue * weather * multiplier * closeBow));
}

export function counterattackChance(battle, defender, attacker) {
  // Original iBaye FgtDrvCmd/CMD_ATK resolves a single attack without retaliation.
  // The mobile rule keeps a rare, light counter only outside classic range mode.
  if (battleRangeRule(battle) === 'classic' || !alive(defender) || !alive(attacker) ||
      defender.acted || defender.countered || defender.status?.bind || !canAttack(battle, defender, attacker)) return 0;
  return .3;
}

export function skillDamage(battle, source, target, skillId) {
  const bonuses = { charge: 1.6, volley: 1.3, arrows: .85, fire: battle.weather === '风' ? 1.8 : 1.45, rock: 1.6, flood: 1.3 };
  const terrain = tileAt(battle, target.x, target.y);
  const terrainBonus = skillId === 'fire' && ['forest', 'camp'].includes(terrain) ? 1.25 : skillId === 'flood' && ['river', 'bridge'].includes(terrain) ? 1.2 : 1;
  const moveBonus = skillId === 'charge' ? 1 + Math.min(3, source.moveDistance || 0) * .1 : 1;
  return attackDamage(battle, source, target, (bonuses[skillId] || 1) * terrainBonus * moveBonus, { basicAttack: false });
}

export function nextWeather(battle) {
  battle.rngState = (Math.imul(battle.rngState, 1664525) + 1013904223) >>> 0;
  const roll = battle.rngState % 100;
  if (roll < 52) return battle.weather;
  return WEATHER[(WEATHER.indexOf(battle.weather) + 1 + (battle.rngState >>> 8) % 4) % 5];
}
