import { TERRAIN, alive, attackDamage, attackError, counterattackChance, distance, distanceField, reachableTiles, tileAt } from './BattleCore.js?v=20260929-classic-attack';

const fieldDistance = (field, point) => field.get(`${point.x},${point.y}`) ?? Infinity;

function exposure(battle, unit, enemies) {
  let loss = 0;
  for (const enemy of enemies) {
    if (attackError(battle, enemy, unit, { ignoreAction: true }) === null) {
      loss += Math.min(unit.troops, attackDamage(battle, enemy, unit));
    }
  }
  return loss;
}

function attackScore(battle, unit, enemy) {
  const damage = Math.min(enemy.troops, attackDamage(battle, unit, enemy));
  const counterChance = counterattackChance(battle, enemy, unit);
  const counterLoss = counterChance ? attackDamage(battle, enemy, unit, .25) * counterChance : 0;
  const core = battle.map.objective;
  const coreThreat = battle.mode === 'defend' ? Math.max(0, 6 - distance(enemy, core)) * 6 : 0;
  return damage + (damage >= enemy.troops ? 85 : 0) + (enemy.id === 'enemy-0' ? 35 : 0) + coreThreat - counterLoss;
}

function bestAttack(battle, unit, enemies) {
  return enemies.reduce((best, enemy) => {
    if (attackError(battle, unit, enemy) !== null) return best;
    const score = attackScore(battle, unit, enemy);
    return !best || score > best.score ? { type: 'attack', unitId: unit.id, targetId: enemy.id, score } : best;
  }, null);
}

function planUnit(battle, unit, enemies) {
  const direct = bestAttack(battle, unit, enemies);
  if (direct) return { ...direct, priority: 1000 + direct.score };
  if (unit.moved) return { type: 'wait', unitId: unit.id, priority: 90 };

  const moves = reachableTiles(battle, unit);
  const core = battle.map.objective;
  const guardingCore = battle.mode === 'defend' && unit.x === core.x && unit.y === core.y;
  let strikeMove = null;
  let advanceMove = null;
  const focus = battle.mode === 'defend'
    ? [...enemies].sort((a, b) => distance(a, core) - distance(b, core))[0]
    : [...enemies].sort((a, b) => distance(a, unit) - distance(b, unit))[0];
  const goal = battle.mode === 'attack' ? core : focus;
  let field = goal ? distanceField(battle, unit, goal) : null;
  if (field && !Number.isFinite(fieldDistance(field, unit)) && focus && focus !== goal) field = distanceField(battle, unit, focus);
  const startDistance = field ? fieldDistance(field, unit) : Infinity;

  for (const move of moves) {
    if (guardingCore) continue;
    const movedUnit = { ...unit, x: move.x, y: move.y, moved: true, moveDistance: distance(unit, move) };
    const movedBattle = { ...battle, units: battle.units.map(other => other.id === unit.id ? movedUnit : other) };
    const risk = exposure(movedBattle, movedUnit, enemies);
    if (risk >= unit.troops * .8) continue;
    const attack = bestAttack(movedBattle, movedUnit, enemies);
    if (attack) {
      const score = attack.score - risk * .35 - move.cost * .8;
      if (!strikeMove || score > strikeMove.score) strikeMove = { type: 'move', unitId: unit.id, x: move.x, y: move.y, path: move.path, score, priority: 800 + score };
    }
    const remaining = field ? fieldDistance(field, move) : Infinity;
    if (!Number.isFinite(startDistance) || !Number.isFinite(remaining)) continue;
    const progress = startDistance - remaining;
    if (progress <= 0) continue;
    const terrain = TERRAIN[tileAt(battle, move.x, move.y)];
    const coreGain = battle.mode === 'attack' ? Math.max(0, distance(unit, core) - distance(move, core)) * 3 : 0;
    const score = progress * 9 + coreGain + ((terrain?.defense || 1) - 1) * 15 - risk * .45 - move.cost * .5;
    if (!advanceMove || score > advanceMove.score) advanceMove = { type: 'move', unitId: unit.id, x: move.x, y: move.y, path: move.path, score, priority: 100 + score };
  }

  if (strikeMove) return strikeMove;
  return advanceMove || { type: 'wait', unitId: unit.id, priority: 0 };
}

export function planAutoBattleAction(battle, preferredId = null) {
  if (!battle) return null;
  const players = battle.units.filter(unit => unit.side === 'player' && alive(unit) && !unit.acted);
  const enemies = battle.units.filter(unit => unit.side === 'enemy' && alive(unit));
  if (!players.length || !enemies.length) return null;
  const preferred = players.find(unit => unit.id === preferredId && unit.moved);
  if (preferred) return planUnit(battle, preferred, enemies);
  return players.map(unit => planUnit(battle, unit, enemies)).sort((a, b) => b.priority - a.priority)[0];
}
