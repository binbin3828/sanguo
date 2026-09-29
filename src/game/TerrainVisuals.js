const water = kind => kind === 'river' || kind === 'bridge';
const roadCache = new WeakMap();
const key = (x, y) => `${x},${y}`;

function roadPath(map, start, end) {
  if (!start || !end) return [];
  const pending = [{ x: start.x, y: start.y, cost: 0 }];
  const best = new Map([[key(start.x, start.y), 0]]), previous = new Map();
  while (pending.length) {
    pending.sort((a, b) => a.cost - b.cost);
    const point = pending.shift(), current = key(point.x, point.y);
    if (point.cost !== best.get(current)) continue;
    if (point.x === end.x && point.y === end.y) break;
    for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) {
      const x = point.x + dx, y = point.y + dy;
      if (x < 0 || y < 0 || x >= map.width || y >= map.height) continue;
      const terrain = map.tiles[y][x];
      if (terrain === 'river') continue;
      const cost = point.cost + (terrain === 'mountain' ? 6 : terrain === 'forest' ? 4 : terrain === 'bridge' ? 2 : 1);
      const next = key(x, y);
      if (cost >= (best.get(next) ?? Infinity)) continue;
      best.set(next, cost);
      previous.set(next, current);
      pending.push({ x, y, cost });
    }
  }
  const origin = key(start.x, start.y), destination = key(end.x, end.y);
  if (destination !== origin && !previous.has(destination)) return [];
  const path = [destination];
  for (let position = destination; position !== origin;) {
    position = previous.get(position);
    path.push(position);
  }
  return path;
}

export function visualRoadCells(map) {
  if (roadCache.has(map)) return roadCache.get(map);
  const roads = new Set();
  const spawns = map.attackerSpawns || [];
  for (const index of [Math.floor(spawns.length / 4), Math.max(0, spawns.length - 2)]) {
    for (const position of roadPath(map, spawns[index], map.objective)) roads.add(position);
  }
  roadCache.set(map, roads);
  return roads;
}

export function terrainVisual(map, x, y) {
  const kind = map.tiles[y]?.[x] || 'plain';
  if (kind === 'plain' || kind === 'grass') {
    const roads = visualRoadCells(map);
    if (roads.has(key(x, y))) {
      const mask = (roads.has(key(x, y - 1)) ? 1 : 0) |
        (roads.has(key(x + 1, y)) ? 2 : 0) |
        (roads.has(key(x, y + 1)) ? 4 : 0) |
        (roads.has(key(x - 1, y)) ? 8 : 0);
      return `${kind}-road-${mask}`;
    }
    if (map.template === 0 && kind === 'plain' && (x * 13 + y * 17) % 19 === 0) return 'plain-field';
  }
  if (kind === 'river') {
    const touchesLand = (dx, dy) => {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= map.width || ny >= map.height) return false;
      return !water(map.tiles[ny][nx]);
    };
    const mask = (touchesLand(0, -1) ? 1 : 0) |
      (touchesLand(1, 0) ? 2 : 0) |
      (touchesLand(0, 1) ? 4 : 0) |
      (touchesLand(-1, 0) ? 8 : 0);
    return `river-${mask}`;
  }
  if (kind === 'bridge') {
    const left = map.tiles[y]?.[x - 1], right = map.tiles[y]?.[x + 1];
    const above = map.tiles[y - 1]?.[x], below = map.tiles[y + 1]?.[x];
    const horizontalWater = Number(above === 'river') + Number(below === 'river');
    const verticalWater = Number(left === 'river') + Number(right === 'river');
    if (horizontalWater !== verticalWater) return verticalWater > horizontalWater ? 'bridge-v' : 'bridge-h';
    const horizontalAccess = Number(Boolean(left && !water(left))) + Number(Boolean(right && !water(right)));
    const verticalAccess = Number(Boolean(above && !water(above))) + Number(Boolean(below && !water(below)));
    return verticalAccess > horizontalAccess ? 'bridge-v' : 'bridge-h';
  }
  if (['plain', 'grass', 'forest', 'mountain'].includes(kind)) return `${kind}-${(x * 7 + y * 11) % 3}`;
  return kind;
}
