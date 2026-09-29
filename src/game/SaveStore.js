import { GameModel } from './GameModel.js';
import { CITY_POSITIONS } from './MapData.js';

const LEGACY_KEY = 'sanguo-baye-v2-save';
const SLOT_KEY = slot => `sanguo-baye-save-slot-${slot}`;
export const SAVE_SLOT_COUNT = 3;
const FORMAT = 'sanguo-baye-save';

function checkSlot(slot) {
  if (!Number.isInteger(slot) || slot < 1 || slot > SAVE_SLOT_COUNT) throw new Error('存档位置无效');
}

function normalizeState(snapshot) {
  let state;
  try { state = GameModel.restore(snapshot).state; }
  catch { throw new Error('存档内容损坏或版本不兼容'); }
  if (typeof state.player !== 'string' || !state.player ||
      !Number.isInteger(state.scenarioId) || state.scenarioId < 0 || state.scenarioId > 3 ||
      !Number.isInteger(state.year) || !Number.isInteger(state.month) || state.month < 1 || state.month > 12 ||
      state.cities.length !== 38 || !Array.isArray(state.orders) || !Array.isArray(state.reports)) {
    throw new Error('存档内容不完整');
  }
  const ids = new Set(), names = new Set(), personIds = new Set(), itemIds = new Set();
  if (!Array.isArray(state.goods) || typeof state.itemSystemInitialized !== 'boolean' || state.goods.some(good => typeof good.name !== 'string' || !good.name || !['装备', '使用'].includes(good.type))) throw new Error('道具数据损坏');
  const goodNames = new Set(state.goods.map(good => good.name));
  const validItem = item => {
    if (!item || typeof item.id !== 'string' || !item.id || itemIds.has(item.id) || !goodNames.has(item.name)) throw new Error('道具归属数据损坏');
    itemIds.add(item.id);
  };
  for (const city of state.cities) {
    if (!Number.isInteger(city.id) || city.id < 0 || city.id >= 38 || ids.has(city.id) || names.has(city.name) || !CITY_POSITIONS[city.name] ||
        !Array.isArray(city.generals) || !Number.isFinite(city.troops) || city.troops < 0 ||
        !Number.isFinite(city.money) || !Number.isFinite(city.food) || !Array.isArray(city.items)) throw new Error('城池数据损坏');
    ids.add(city.id);
    names.add(city.name);
    city.items.forEach(item => { validItem(item); if (typeof item.found !== 'boolean') throw new Error('城池道具状态损坏'); });
    for (const general of city.generals) {
      if (typeof general.id !== 'string' || personIds.has(general.id) || typeof general.name !== 'string' ||
          !Number.isFinite(general.troops) || general.troops < 0 ||
          !['active', 'free', 'captive'].includes(general.status) ||
          (general.status === 'active' && !general.owner) ||
          (general.status !== 'active' && (general.owner || general.troops !== 0)) ||
          !Number.isFinite(general.force) || !Number.isFinite(general.intelligence) || !Array.isArray(general.equipment) || general.equipment.length > 2) throw new Error('武将数据损坏');
      personIds.add(general.id);
      general.equipment.forEach(validItem);
    }
  }
  for (const order of state.orders) {
    if (order.type !== 'move' || order.resolved) continue;
    const general = order.traveler;
    if (!general || typeof general.id !== 'string' || general.id !== order.personId || personIds.has(general.id) ||
        general.status !== 'active' || !general.owner || !Number.isFinite(general.troops) || general.troops < 0 ||
        !Array.isArray(general.equipment) || general.equipment.length > 2 ||
        !state.cities.some(city => city.id === order.cityId) || !state.cities.some(city => city.id === order.targetId)) throw new Error('移动武将数据损坏');
    personIds.add(general.id);
    general.equipment.forEach(validItem);
  }
  return state;
}

function unpack(raw, legacy = false) {
  const parsed = JSON.parse(raw);
  const snapshot = parsed?.format === FORMAT && parsed.formatVersion === 1 ? parsed.state : legacy ? parsed : null;
  if (!snapshot) throw new Error('存档文件格式不兼容');
  const state = normalizeState(snapshot);
  return { state, savedAt: legacy ? null : parsed.savedAt || null, legacy };
}

export function readSlot(slot) {
  checkSlot(slot);
  const stored = localStorage.getItem(SLOT_KEY(slot));
  if (stored) return unpack(stored);
  if (slot === 1) {
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy) return unpack(legacy, true);
  }
  return null;
}

export function listSlots() {
  return Array.from({ length: SAVE_SLOT_COUNT }, (_, index) => {
    const slot = index + 1;
    try { return { slot, save: readSlot(slot) }; }
    catch (error) { return { slot, error: error.message }; }
  });
}

export function writeSlot(slot, snapshot) {
  checkSlot(slot);
  const state = normalizeState(snapshot);
  const save = { format: FORMAT, formatVersion: 1, savedAt: Date.now(), state };
  localStorage.setItem(SLOT_KEY(slot), JSON.stringify(save));
  return save;
}

export function parseImport(text) {
  const parsed = JSON.parse(text);
  if (parsed?.format === FORMAT && parsed.formatVersion === 1) return unpack(text);
  return unpack(text, true);
}

export function exportSlot(slot) {
  const save = readSlot(slot);
  if (!save) throw new Error('此位置尚无存档');
  return JSON.stringify({ format: FORMAT, formatVersion: 1, savedAt: save.savedAt || Date.now(), state: save.state }, null, 2);
}
