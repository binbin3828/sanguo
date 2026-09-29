import { CITY_POSITIONS } from './MapData.js';
import { CLASSIC_TERRAIN_ROWS } from './ClassicBattleMaps.js';

export const MAP_NAMES = ['北方开阔', '西北关隘', '荆南林谷', '大河争桥', '江淮水网', '海港登陆', '都城纵深'];
export const MAX_BATTLE_GENERALS = 10;
const CITY_GROUPS = [
  '北平 南皮 邺 平原 濮阳 许昌 小沛',
  '西凉 安定 天水 晋阳 河内 汉中 梓潼 棉竹 巴郡 云南 建宁',
  '襄平 武陵 零陵 桂阳',
  '徐州 下邳 寿春 襄阳 江夏 柴桑 长沙',
  '北海 庐江 建业',
  '吴 会稽',
  '洛阳 长安 宛城 成都'
].map(names => new Set(names.split(' ')));
const CLASSIC_BASE = [4, 6, 1, 0, 3, 5, 4];
const TERRAIN = { P: 'plain', G: 'grass', C: 'city', V: 'village', F: 'forest', M: 'mountain', W: 'river', K: 'camp' };
const SIZE = 32;
const key = (x, y) => `${x},${y}`;
const clamp = value => Math.max(2, Math.min(29, Math.round(value)));

function harborTerrain() {
  return Array.from({ length: SIZE }, (_, y) => Array.from({ length: SIZE }, (_, x) => {
    if (x >= 11) return x > 25 && (y < 7 || y > 25) ? 'forest' : (x + y) % 5 === 0 ? 'grass' : 'plain';
    if (x <= 3 && y > 3 && y < 28) return 'plain';
    if (y >= 8 && y <= 10 || y >= 21 && y <= 23) return 'bridge';
    return 'river';
  }));
}

function addCapitalDefense(tiles, city) {
  for (let y = city.y - 4; y <= city.y + 4; y++) {
    for (let x = city.x - 4; x <= city.x + 4; x++) {
      if (x < 1 || y < 1 || x >= 31 || y >= 31) continue;
      if (Math.abs(x - city.x) === 4 || Math.abs(y - city.y) === 4) {
        tiles[y][x] = x === city.x && Math.abs(y - city.y) === 4 ? 'bridge' : 'river';
      }
    }
  }
  for (const x of [city.x - 8, city.x + 8]) if (x > 0 && x < 31) tiles[city.y][x] = 'camp';
}

function nearestLand(tiles, preferred, used, maxRadius = 16) {
  for (let radius = 0; radius < maxRadius; radius++) {
    for (let dy = -radius; dy <= radius; dy++) for (let dx = -radius; dx <= radius; dx++) {
      if (Math.abs(dx) + Math.abs(dy) !== radius) continue;
      const x = preferred.x + dx, y = preferred.y + dy;
      if (x < 1 || y < 1 || x >= 31 || y >= 31 || tiles[y][x] === 'river' || used.has(key(x, y))) continue;
      used.add(key(x, y));
      return { x, y };
    }
  }
  const point = { x: clamp(preferred.x), y: clamp(preferred.y) };
  tiles[point.y][point.x] = 'plain';
  used.add(key(point.x, point.y));
  return point;
}

// Make the cheapest landward path passable. Rivers crossed by it become explicit bridges.
function connectLandRoute(tiles, start, end) {
  const pending = [{ ...start, cost: 0 }];
  const best = new Map([[key(start.x, start.y), 0]]), previous = new Map();
  while (pending.length) {
    pending.sort((a, b) => a.cost - b.cost);
    const point = pending.shift(), position = key(point.x, point.y);
    if (point.cost !== best.get(position)) continue;
    if (point.x === end.x && point.y === end.y) break;
    for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
      const x = point.x + dx, y = point.y + dy;
      if (x < 0 || y < 0 || x >= SIZE || y >= SIZE) continue;
      const next = key(x, y);
      const cost = point.cost + (tiles[y][x] === 'river' ? 8 : tiles[y][x] === 'mountain' ? 2 : 1);
      if (cost >= (best.get(next) ?? Infinity)) continue;
      best.set(next, cost); previous.set(next, position); pending.push({ x, y, cost });
    }
  }
  const origin = key(start.x, start.y);
  let position = key(end.x, end.y);
  while (position !== origin && previous.has(position)) {
    const [x, y] = position.split(',').map(Number);
    if (tiles[y][x] === 'river') tiles[y][x] = 'bridge';
    position = previous.get(position);
  }
}

function approachSide(from, to) {
  const dx = from[0] - to[0], dy = from[1] - to[1];
  if (Math.abs(dx) > Math.abs(dy) * 1.5) return dx < 0 ? 'W' : 'E';
  if (Math.abs(dy) > Math.abs(dx) * 1.5) return dy < 0 ? 'N' : 'S';
  return `${dy < 0 ? 'N' : 'S'}${dx < 0 ? 'W' : 'E'}`;
}

function entrance(side, city, index) {
  const rank = Math.floor(index / 5);
  const offset = (index % 5 - 2) * 3;
  if (side === 'W') return { x: 2 + rank * 2, y: clamp(city.y + offset) };
  if (side === 'E') return { x: 29 - rank * 2, y: clamp(city.y + offset) };
  if (side === 'N') return { x: clamp(city.x + offset), y: 2 + rank * 2 };
  if (side === 'S') return { x: clamp(city.x + offset), y: 29 - rank * 2 };
  return {
    x: side.includes('W') ? 2 + rank * 2 : 29 - rank * 2,
    y: side.includes('N') ? clamp(city.y + offset) : clamp(city.y - offset)
  };
}

export function makeLargeBattleMap(fromId, toId) {
  const names = Object.keys(CITY_POSITIONS);
  const fromName = names[fromId], toName = names[toId];
  const template = Math.max(0, CITY_GROUPS.findIndex(group => group.has(toName)));
  const tiles = template === 5 ? harborTerrain() : CLASSIC_TERRAIN_ROWS[CLASSIC_BASE[template]].map(row => [...row].map(code => TERRAIN[code]));
  let objective;
  for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) if (tiles[y][x] === 'city') objective = { x, y };
  if (!objective || template === 5) objective = { x: 16, y: 16 };
  for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) if (tiles[y][x] === 'city') tiles[y][x] = 'plain';
  if (template === 6) addCapitalDefense(tiles, objective);
  tiles[objective.y][objective.x] = 'city';
  const side = approachSide(CITY_POSITIONS[fromName] || [0, 0], CITY_POSITIONS[toName] || [1, 0]);
  const used = new Set([key(objective.x, objective.y)]);
  const attackerSpawns = Array.from({ length: MAX_BATTLE_GENERALS }, (_, index) => nearestLand(tiles, entrance(side, objective, index), used, 8));
  for (const spawn of attackerSpawns) if (tiles[spawn.y][spawn.x] === 'mountain') tiles[spawn.y][spawn.x] = 'plain';
  const defenderSpawns = [
    { x: objective.x - 2, y: objective.y - 2 }, { x: objective.x + 2, y: objective.y - 2 },
    { x: objective.x + 2, y: objective.y + 2 }, { x: objective.x - 2, y: objective.y + 2 },
    { x: objective.x, y: objective.y - 5 }, { x: objective.x, y: objective.y + 5 },
    { x: objective.x - 5, y: objective.y }, { x: objective.x + 5, y: objective.y },
    { x: objective.x - 3, y: objective.y + 4 }, { x: objective.x + 3, y: objective.y - 4 }
  ].map(point => nearestLand(tiles, point, used));
  for (const spawn of attackerSpawns) connectLandRoute(tiles, spawn, objective);
  return {
    width: SIZE, height: SIZE, template, cityName: toName, name: `${toName}·${MAP_NAMES[template]}`,
    sourceMapId: CLASSIC_BASE[template], approach: side, tiles, objective, attackerSpawns, defenderSpawns
  };
}
