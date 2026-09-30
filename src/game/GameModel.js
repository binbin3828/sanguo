import { adjacentCityNames } from './MapData.js';
import { makeBattleMap, MAX_BATTLE_GENERALS, reachableTiles, distanceField, canAttack, attackError, alive, attackDamage, counterattackChance, skillDamage, nextWeather, WEATHER, skillError, SKILLS, tileAt, occupantAt } from './BattleCore.js?v=20260929-expedition-ten';

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const copy = value => JSON.parse(JSON.stringify(value));
export const ORDER_RULES = Object.freeze({
  farm: { label: '开垦', money: 50, stamina: 8 },
  trade: { label: '招商', money: 50, stamina: 8 },
  search: { label: '寻访', money: 0, stamina: 8 },
  govern: { label: '治理', money: 50, stamina: 8 },
  patrol: { label: '出巡', money: 50, stamina: 8 },
  exchange: { label: '交易', money: 0, stamina: 12 },
  transport: { label: '输送', money: 0, stamina: 8 },
  surrender: { label: '招降', money: 100, stamina: 15 },
  move: { label: '移动武将', money: 0, stamina: 0 },
  recruit: { label: '征兵', money: 0, stamina: 12 },
  scout: { label: '侦察', money: 20, stamina: 10 },
  raid: { label: '掠夺', money: 0, stamina: 12 },
  alienate: { label: '离间', money: 50, stamina: 20 },
  canvass: { label: '招揽', money: 50, stamina: 20 },
  counterespionage: { label: '策反', money: 50, stamina: 20 },
  induce: { label: '劝降', money: 0, stamina: 10 },
  battle: { label: '出征', money: 0, stamina: 20 }
});

const DIPLOMACY_TYPES = new Set(['alienate', 'canvass', 'counterespionage', 'induce']);
const DIPLOMACY_CHARACTER_ODDS = Object.freeze({
  alienate: [50, 30, 40, 30, 5],
  canvass: [15, 40, 30, 20, 5],
  counterespionage: [30, 10, 20, 60, 5],
  induce: [10, 1, 20, 5, 15]
});
const CHARACTER_NAMES = ['卤莽', '怕死', '贪财', '大志', '忠义'];

// iBaye FgtCount.c::CountProvUse: integer square root of living troops / 3.
export const battleFoodConsumption = troops => Math.floor(Math.floor(Math.sqrt(Math.max(0, troops))) / 3);

export class GameModel {
  constructor(catalog, scenarioId, player) {
    const scenario = catalog.scenarios[scenarioId];
    if (!scenario || !scenario.rulers.includes(player)) throw new Error('无效的剧本或君主');
    this.state = {
      version: 8, scenarioId, player, year: scenario.year, month: 1,
      cities: copy(scenario.cities), goods: copy(catalog.goods), itemSystemInitialized: true,
      orders: [], reports: [], worldHistory: [], battle: null, messages: [], winner: null
    };
    this.cities.forEach(city => this.migrateCityTroops(city));
    this.log(`${player}举兵，霸业始于${scenario.year}年。`);
  }

  static restore(snapshot, catalog = null) {
    if (!snapshot || ![2, 3, 4, 5, 6, 7, 8].includes(snapshot.version) || !Array.isArray(snapshot.cities)) {
      throw new Error('存档版本不兼容');
    }
    const game = Object.create(GameModel.prototype);
    game.state = copy(snapshot);
    if (game.state.version === 2) {
      game.state.orders = [];
      // Old saves only know whether a city acted, so keep it locked for this one month.
    }
    game.state.orders ||= [];
    game.state.reports ||= [];
    game.state.goods ||= [];
    game.state.itemSystemInitialized ??= false;
    game.state.worldHistory = Array.isArray(game.state.worldHistory) ? game.state.worldHistory.slice(0, 12) : [];
    game.cities.forEach(city => {
      city.items ||= [];
      city.generals.forEach(general => {
        general.stamina ??= 100;
        general.level ??= 1;
        general.experience ??= 0;
        if (game.state.version >= 4) general.troops ??= 0;
        general.status ??= general.owner ? 'active' : 'free';
        general.formerOwner ??= null;
        general.equipment ||= [];
        general.character ??= 0;
      });
      if (game.state.version < 4) game.migrateCityTroops(city);
    });
    if (!game.state.itemSystemInitialized && catalog) {
      const initial = catalog.scenarios[game.state.scenarioId];
      game.state.goods = copy(catalog.goods);
      const initialEquipment = new Map(initial.cities.flatMap(city => city.generals.map(general => [general.id, general.equipment])));
      for (const city of game.cities) {
        city.items = copy(initial.cities[city.id].items);
        for (const general of city.generals) {
          general.equipment = copy(initialEquipment.get(general.id) || []);
          general.force -= game.itemBonus(general, 'force');
          general.intelligence -= game.itemBonus(general, 'intelligence');
        }
      }
      game.state.itemSystemInitialized = true;
    }
    if (game.state.battle && !game.state.battle.map) game.state.battle = null;
    if (game.state.battle && (game.state.battle.version !== 2 ||
      !Array.isArray(game.state.battle.units) || !Array.isArray(game.state.battle.map.tiles) ||
      !game.state.battle.map.objective || !game.state.battle.supplies)) throw new Error('战斗存档数据损坏');
    if (game.state.battle) {
      game.state.battle.rangeRule ||= 'modern';
      game.state.battle.money ||= { player: 0, enemy: 0 };
      game.state.battle.initialSupplies ||= copy(game.state.battle.supplies);
    }
    game.state.version = 8;
    return game;
  }

  get cities() { return this.state.cities; }
  get player() { return this.state.player; }
  get battle() { return this.state.battle; }
  get orders() { return this.state.orders; }
  get reports() { return this.state.reports; }
  get worldHistory() { return this.state.worldHistory; }
  good(name) { return this.state.goods.find(good => good.name === name); }
  itemBonus(general, key) { return (general.equipment || []).reduce((sum, item) => sum + (this.good(item.name)?.[key] || 0), 0); }
  force(general) { return general.force + this.itemBonus(general, 'force'); }
  intelligence(general) { return general.intelligence + this.itemBonus(general, 'intelligence'); }
  maxTroops(general) { return general.level * 100 + this.force(general) * 10 + this.intelligence(general) * 10; }
  developmentGain(general) { const iq = this.intelligence(general); return Math.floor(iq / 10) * (2 + Math.floor(Math.random() * 4)) + Math.floor(iq / 2); }
  manageItem(cityId, personId, itemId, action) {
    const city = this.city(cityId);
    if (!city || city.owner !== this.player || this.battle || this.state.winner) throw new Error('当前无法管理该城道具');
    const general = city.generals.find(person => person.id === personId && person.owner === this.player && person.status === 'active');
    if (!general || city.acted || this.orderFor(personId)) throw new Error('请选择本月尚未接令的本城武将');
    if (action === 'give') {
      const index = city.items.findIndex(item => item.id === itemId && item.found);
      if (index < 0) throw new Error('本城没有这件可赏赐的道具');
      const item = city.items[index], good = this.good(item.name);
      if (!good) throw new Error('道具配置缺失');
      if (good.type === '使用') {
        if (good.armyType === '玄兵' && this.intelligence(general) <= 105 || good.armyType === '极兵' && this.force(general) <= 105) throw new Error('武将属性不足，无法使用这枚兵符');
        if (good.armyType) general.armsType = good.armyType;
      } else {
        if (general.equipment.length >= 2) throw new Error('这名武将已装备两件道具');
        general.equipment.push({ id: item.id, name: item.name });
      }
      city.items.splice(index, 1);
      if (general.name !== this.player) general.loyalty = clamp(general.loyalty + 8, 0, 100);
      this.log(`${city.name}将${item.name}赏赐给${general.name}。`);
      return this.report({ type: '道具', cityId: city.id, personId: general.id, personName: general.name }, `${general.name}${good.type === '使用' ? `使用${item.name}，兵种变为${general.armsType}` : `装备${item.name}`}；忠诚 ${general.loyalty}。`);
    }
    if (action === 'confiscate') {
      const index = general.equipment.findIndex(item => item.id === itemId);
      if (index < 0) throw new Error('这名武将未装备该道具');
      const [item] = general.equipment.splice(index, 1);
      city.items.push({ ...item, found: true });
      if (general.name !== this.player) general.loyalty = clamp(general.loyalty - 20, 0, 100);
      this.log(`${city.name}没收${general.name}的${item.name}。`);
      return this.report({ type: '道具', cityId: city.id, personId: general.id, personName: general.name }, `没收${general.name}的${item.name}，已入${city.name}库；忠诚 ${general.loyalty}。`);
    }
    throw new Error('未知道具操作');
  }
  captureGeneral(general) {
    general.formerOwner = general.owner;
    general.owner = null;
    general.status = 'captive';
    general.troops = 0;
  }
  releaseGeneral(general) {
    general.owner = null;
    general.formerOwner = null;
    general.status = 'free';
    general.troops = 0;
  }
  liberateCaptives(city, owner) {
    const liberated = city.generals.filter(general => general.status === 'captive' && general.formerOwner === owner);
    for (const general of liberated) {
      general.owner = owner;
      general.formerOwner = null;
      general.status = 'active';
    }
    return liberated;
  }
  totalTroops(city) { return city.troops + city.generals.filter(general => city.owner && general.owner === city.owner && general.status === 'active').reduce((total, general) => total + (general.troops || 0), 0); }
  worldSnapshot() {
    const result = new Map();
    for (const city of this.cities) {
      if (!city.owner) continue;
      const faction = result.get(city.owner) || { owner: city.owner, cities: 0, troops: 0, money: 0, food: 0 };
      faction.cities++;
      faction.troops += this.totalTroops(city);
      faction.money += city.money;
      faction.food += city.food;
      result.set(city.owner, faction);
    }
    return result;
  }
  migrateCityTroops(city) {
    const generals = city.owner ? city.generals.filter(general => general.owner === city.owner) : [];
    const share = generals.length ? Math.floor(city.troops / generals.length) : 0;
    for (const general of city.generals) {
      general.level ??= 1;
      general.experience ??= 0;
      general.troops ??= 0;
    }
    for (const general of generals) {
      const assigned = Math.min(share, this.maxTroops(general));
      general.troops = assigned;
      city.troops -= assigned;
    }
  }
  city(id) { return this.cities.find(city => city.id === Number(id)); }
  adjacent(city) { return adjacentCityNames(city.name).map(name => this.cities.find(c => c.name === name)).filter(Boolean); }
  ownedCities() { return this.cities.filter(city => city.owner === this.player); }
  transportTargets(cityId) {
    const source = this.city(cityId);
    if (!source || source.owner !== this.player) return [];
    const reached = new Set([source.id]);
    const queue = [{ city: source, distance: 0 }];
    const targets = [];
    for (let index = 0; index < queue.length; index++) {
      const { city, distance } = queue[index];
      for (const neighbor of this.adjacent(city)) {
        if (neighbor.owner !== this.player || reached.has(neighbor.id)) continue;
        reached.add(neighbor.id);
        const next = { city: neighbor, distance: distance + 1 };
        targets.push(next);
        queue.push(next);
      }
    }
    return targets.sort((a, b) => a.distance - b.distance || a.city.id - b.city.id);
  }
  surrenderChance(officer, captive) {
    const first = clamp(50 + this.intelligence(officer) - this.intelligence(captive), 0, 100);
    if (captive.loyalty > 60) return 0;
    const modifier = [2, 5, 4, 3, 1][captive.character] || 2;
    return Math.round(first * (1 - Math.floor(captive.loyalty / modifier) / 100));
  }
  attemptSurrender(officer, captive) {
    const first = clamp(50 + this.intelligence(officer) - this.intelligence(captive), 0, 100);
    if (Math.random() * 100 >= first) return false;
    const loyalty = captive.loyalty;
    captive.loyalty = Math.max(0, loyalty - Math.floor(loyalty / 10));
    if (loyalty > 60) return false;
    const modifier = [2, 5, 4, 3, 1][captive.character] || 2;
    if (Math.random() * 100 < Math.floor(loyalty / modifier)) return false;
    captive.owner = officer.owner;
    captive.status = 'active';
    captive.formerOwner = null;
    captive.loyalty = 40 + Math.floor(Math.random() * 40);
    return true;
  }
  diplomacyChance(officer, target, type) {
    const intelligenceDifference = this.intelligence(officer) - this.intelligence(target);
    const iqThreshold = (intelligenceDifference + (type === 'canvass' ? 0 : 50)) & 0xff;
    const iqChance = Math.min(100, iqThreshold + 1);
    const loyaltyChance = type === 'induce' ? 100 : 100 - clamp(target.loyalty || 0, 0, 100);
    const characterChance = Math.min(100, (DIPLOMACY_CHARACTER_ODDS[type]?.[target.character] ?? 0) + 1);
    return Math.round(iqChance * loyaltyChance * characterChance / 10000);
  }
  rollDiplomacy(officer, target, type) {
    const difference = this.intelligence(officer) - this.intelligence(target);
    const threshold = (difference + (type === 'canvass' ? 0 : 50)) & 0xff;
    if (Math.floor(Math.random() * 100) > threshold) return false;
    if (type !== 'induce' && Math.floor(Math.random() * 100) < (target.loyalty || 0)) return false;
    return Math.floor(Math.random() * 100) <= (DIPLOMACY_CHARACTER_ODDS[type]?.[target.character] ?? 0);
  }
  resolveDiplomacy(order, officer, target, targetCity, targetOwner) {
    const type = order.type;
    if (type === 'induce') {
      const ourCities = this.cities.filter(city => city.owner === officer.owner);
      const enemyCities = this.cities.filter(city => city.owner === targetOwner);
      const enoughPower = ourCities.length >= enemyCities.length * 2;
      const succeeded = enoughPower && this.rollDiplomacy(officer, target, type);
      if (!succeeded) return enoughPower
        ? `劝降${targetOwner}失败（我方 ${ourCities.length} 城，对方 ${enemyCities.length} 城；${target.name}性格：${CHARACTER_NAMES[target.character] || '未知'}）。`
        : `劝降失败：需我方城池数至少为${targetOwner}的两倍（我方 ${ourCities.length} 城，对方 ${enemyCities.length} 城）。`;
      for (const city of enemyCities) {
        city.owner = officer.owner;
        for (const general of city.generals) {
          if (general.owner === targetOwner && general.status === 'active') general.owner = officer.owner;
        }
      }
      for (const city of this.cities) for (const general of city.generals) {
        if (general.owner === targetOwner && general.status === 'free') {
          general.owner = null;
          general.formerOwner = null;
        }
      }
      this.checkWinner();
      return `${targetOwner}接受劝降，${enemyCities.length} 座城池及其在城武将归顺${officer.owner}。`;
    }
    if (!targetCity || target.status !== 'active' || target.owner !== targetOwner) {
      return '外交目标已变动，行动未能生效。';
    }
    if (type === 'alienate' && this.rollDiplomacy(officer, target, type)) {
      const before = target.loyalty || 0;
      target.loyalty = Math.max(0, before - 4);
      return `离间成功：${target.name}对${targetOwner}的忠诚 ${before} → ${target.loyalty}。`;
    }
    if (type === 'canvass' && this.rollDiplomacy(officer, target, type)) {
      if (target.name === targetOwner) return '招揽未成：此人是该势力君主，需使用劝降。';
      const sourceCity = targetCity;
      sourceCity.generals.splice(sourceCity.generals.indexOf(target), 1);
      if (sourceCity.governor === target.name) sourceCity.governor = sourceCity.generals.find(person => person.owner === targetOwner && person.status === 'active')?.name || targetOwner;
      target.owner = officer.owner;
      target.formerOwner = null;
      target.status = 'active';
      target.loyalty = 40 + Math.floor(Math.random() * 40);
      target.cityId = order.cityId;
      this.city(order.cityId).generals.push(target);
      return `招揽成功：${target.name}离开${targetOwner}，加入${officer.owner}，忠诚 ${target.loyalty}。`;
    }
    if (type === 'counterespionage' && this.rollDiplomacy(officer, target, type)) {
      if (target.name === targetOwner || targetCity.governor !== target.name) return '策反未成：目标不是敌方城池太守。';
      targetCity.owner = target.name;
      targetCity.governor = target.name;
      for (const general of targetCity.generals) {
        if (general.owner === targetOwner && general.status === 'active') general.owner = target.name;
      }
      return `策反成功：${target.name}反叛${targetOwner}，在${targetCity.name}自立。该城守将转而效忠新主。`;
    }
    return `${order.type === 'alienate' ? '离间' : order.type === 'canvass' ? '招揽' : '策反'}${target.name}未能成功（智力差、忠诚及性格影响成功率；目标性格：${CHARACTER_NAMES[target.character] || '未知'}）。`;
  }
  treatGeneral(cityId, personId) {
    const city = this.city(cityId);
    if (!city || city.owner !== this.player || this.battle || this.state.winner) throw new Error('当前无法宴请');
    const general = city.generals.find(person => person.id === personId && person.owner === this.player && person.status === 'active');
    if (!general || city.acted || this.orderFor(personId)) throw new Error('请选择本月未接令的本城武将');
    if (city.money < 100) throw new Error('宴请需要 100 金');
    if (general.stamina >= 100 && (general.name === this.player || general.loyalty >= 100)) throw new Error('这名武将的体力和忠诚已满');
    const before = general.stamina, loyaltyBefore = general.loyalty;
    city.money -= 100;
    general.stamina = Math.min(100, general.stamina + 50);
    if (general.name !== this.player) general.loyalty = Math.min(100, general.loyalty + 1);
    this.log(`${city.name}宴请${general.name}，体力 ${before} → ${general.stamina}。`);
    return this.report({ type: '宴请', cityId: city.id, personId, personName: general.name }, `体力 ${before} → ${general.stamina}，忠诚 ${loyaltyBefore} → ${general.loyalty}；支出 100 金。`);
  }
  disposeGeneral(cityId, personId, action) {
    const city = this.city(cityId);
    if (!city || city.owner !== this.player || this.battle || this.state.winner) throw new Error('当前无法处置武将');
    if (!['execute', 'banish'].includes(action)) throw new Error('未知处置方式');
    const index = city.generals.findIndex(person => person.id === personId && (person.status === 'captive' || action === 'banish' && person.owner === this.player && person.status === 'active' && !city.acted && !this.orderFor(personId)));
    if (index < 0) throw new Error('只能处置本城俘虏，或流放本月未接令的己方武将');
    const [general] = city.generals.splice(index, 1);
    let result;
    if (action === 'execute') {
      city.items.push(...general.equipment.map(item => ({ ...item, found: true })));
      result = `${general.name}已被处斩${general.equipment.length ? `，${general.equipment.map(item => item.name).join('、')}留在${city.name}道具库` : ''}。`;
    } else {
      const returnedTroops = general.troops;
      if (returnedTroops) city.troops += returnedTroops;
      const destinations = this.cities.filter(target => target.id !== city.id);
      const destination = destinations[Math.floor(Math.random() * destinations.length)];
      this.releaseGeneral(general);
      general.cityId = destination.id;
      destination.generals.push(general);
      result = `${general.name}已被流放，成为在野武将，去向不明${returnedTroops ? `；原带 ${returnedTroops} 兵已归还本城后备兵` : ''}。`;
    }
    this.log(`${city.name}：${result}`);
    return this.report({ type: action === 'execute' ? '处斩' : '流放', cityId: city.id, personId, personName: general.name }, result);
  }
  generals(cityId) {
    const city = this.city(cityId);
    return city?.owner ? city.generals.filter(general => general.owner === city.owner && general.status === 'active') : [];
  }
  orderFor(personId) { return this.orders.find(order => order.personId === personId); }
  availableGenerals(cityId, type = 'farm') {
    const city = this.city(cityId);
    if (!city || !city.owner || city.acted) return [];
    const stamina = ORDER_RULES[type]?.stamina ?? 8;
    return this.generals(cityId).filter(general => !this.orderFor(general.id) && general.stamina >= stamina && (type !== 'battle' || general.troops > 0));
  }
  rankedGenerals(cityId, type, options = {}) {
    const city = this.city(cityId);
    if (!city || !ORDER_RULES[type]) return [];
    const availableIds = new Set(this.availableGenerals(cityId, type).map(general => general.id));
    const captive = type === 'surrender' ? city.generals.find(general => general.id === options.targetId && general.status === 'captive') : null;
    const ranked = this.generals(cityId).map(general => {
      const available = availableIds.has(general.id);
      let score, reason;
      if (type === 'farm' || type === 'trade') {
        score = this.intelligence(general);
        reason = `智力 ${this.intelligence(general)} · 开发增量随智力提升`;
      } else if (type === 'search') {
        score = this.intelligence(general);
        reason = `智力 ${this.intelligence(general)} · 寻访人才、道具与资源更有利`;
      } else if (type === 'surrender') {
        const chance = captive ? this.surrenderChance(general, captive) : 0;
        score = chance * 100 + this.intelligence(general);
        reason = captive ? `预计招降成功率 ${chance}% · 智力 ${this.intelligence(general)}` : `智力 ${this.intelligence(general)}`;
      } else if (DIPLOMACY_TYPES.has(type)) {
        const targetCity = this.city(options.targetCityId);
        const target = type === 'induce'
          ? targetCity?.generals.find(person => person.name === options.targetOwner && person.owner === options.targetOwner && person.status === 'active')
          : targetCity?.generals.find(person => person.id === options.targetId);
        score = target ? this.diplomacyChance(general, target, type) : 0;
        reason = target ? `预计成功率 ${score}% · 智力 ${this.intelligence(general)}` : `智力 ${this.intelligence(general)}`;
      } else if (type === 'raid') {
        score = this.force(general) + this.intelligence(general);
        reason = `武力 + 智力 ${score} · 月末获得 ${score * 2} 金、${score * 5} 粮`;
      } else if (type === 'battle') {
        const attack = Math.max(80, Math.floor(this.force(general) * 2.8 + general.troops * 0.28));
        score = general.troops + attack * 2;
        reason = `带兵 ${general.troops} · 武力 ${this.force(general)} · 平地伤害约 ${attack}`;
      } else {
        score = -Math.max(this.intelligence(general), this.force(general));
        reason = '指令收益固定 · 优先使用非专精武将';
      }
      const order = this.orderFor(general.id);
      const unavailableReason = order ? '本月已接令'
        : city.acted ? '本月已行动'
          : general.stamina < ORDER_RULES[type].stamina ? '体力不足'
            : type === 'battle' && !general.troops ? '尚未带兵' : '当前不可接令';
      return { general, available, score, reason: available ? reason : unavailableReason };
    });
    return ranked.sort((a, b) => Number(b.available) - Number(a.available) || b.score - a.score || b.general.stamina - a.general.stamina || a.general.id.localeCompare(b.general.id));
  }
  availableCount(cityId) { return this.availableGenerals(cityId).length; }
  log(message) { this.state.messages.unshift(message); this.state.messages.length = Math.min(7, this.state.messages.length); }
  report(order, result) {
    const report = {
      type: order.type, cityId: order.cityId, personId: order.personId,
      personName: order.personName, result, year: this.state.year, month: this.state.month
    };
    order.result = result;
    this.reports.unshift(report);
    this.reports.length = Math.min(80, this.reports.length);
    return report;
  }

  distribute(cityId, personId, amount) {
    const city = this.city(cityId);
    if (!city || city.owner !== this.player || this.battle || this.state.winner) throw new Error('当前无法在该城分配兵力');
    const general = city.generals.find(person => person.id === personId && person.owner === this.player && person.status === 'active');
    if (!general) throw new Error('请选择本城的己方在职武将');
    const max = Math.min(this.maxTroops(general), city.troops + general.troops);
    if (!Number.isSafeInteger(amount) || amount < 0 || amount > max) throw new Error(`可设置的带兵数为 0 至 ${max}`);
    const before = general.troops;
    city.troops += before - amount;
    general.troops = amount;
    this.log(`${general.name}在${city.name}调整带兵 ${before} → ${amount}，后备兵 ${city.troops}。`);
    return { before, after: amount, reserve: city.troops };
  }

  action(cityId, type, personId, options) {
    return this.issueOrders(cityId, type, [personId], options)[0];
  }

  issueOrders(cityId, type, personIds, options = {}) {
    const city = this.city(cityId);
    if (!city || city.owner !== this.player) throw new Error('只能治理己方城池');
    if (this.battle || this.state.winner) throw new Error('当前无法执行城市指令');
    const rule = ORDER_RULES[type];
    if (!rule || type === 'battle') throw new Error('未知城市指令');
    if (!Array.isArray(personIds) || !personIds.length || new Set(personIds).size !== personIds.length) throw new Error('请选择不同的执行武将');
    const available = this.availableGenerals(cityId, type);
    const selected = personIds.map(id => available.find(general => general.id === id));
    if (selected.some(general => !general)) throw new Error('所选武将本月无法执行该指令');
    const captive = type === 'surrender' ? city.generals.find(general => general.id === options.targetId && general.status === 'captive') : null;
    if (type === 'surrender' && (selected.length !== 1 || !captive)) throw new Error('请选择一名执行武将和本城俘虏');
    if ((['exchange', 'transport', 'move', 'scout'].includes(type) || DIPLOMACY_TYPES.has(type)) && selected.length !== 1) throw new Error(`${rule.label}只能选择一名执行武将`);
    if (captive && this.orders.some(order => order.type === 'surrender' && order.targetId === captive.id)) throw new Error('这名俘虏本月已有人招降');
    const exchangeAmount = type === 'exchange' ? Number(options.amount) : 0;
    const exchangeDirection = options.direction;
    if (type === 'exchange') {
      if (!['buy', 'sell'].includes(exchangeDirection) || !Number.isSafeInteger(exchangeAmount) || exchangeAmount < 1) throw new Error('请选择买粮或卖粮，并输入有效粮食数量');
      if (exchangeDirection === 'buy' && exchangeAmount > Math.floor(city.money / 5)) throw new Error('金钱不足，每买 1 粮需要 5 金');
      if (exchangeDirection === 'sell' && (exchangeAmount > city.food || exchangeAmount > Math.floor((30000 - city.money) / 2))) throw new Error('粮食不足，或卖出后金钱将超过 30000 上限');
    }
    const cargo = type === 'transport' ? { food: Number(options.food), money: Number(options.money), troops: Number(options.troops) } : null;
    const transportTarget = type === 'transport' ? this.transportTargets(city.id).find(item => item.city.id === Number(options.targetId)) : null;
    const moveTarget = type === 'move' ? this.transportTargets(city.id).find(item => item.city.id === Number(options.targetId)) : null;
    if (type === 'move' && !moveTarget) throw new Error('请选择道路可达的己方城池');
    const scoutTarget = type === 'scout' ? this.city(options.targetId) : null;
    if (type === 'scout' && (!scoutTarget || scoutTarget.id === city.id || scoutTarget.owner === this.player)) throw new Error('请选择一座非己方目标城池');
    const diplomacyTargetCity = DIPLOMACY_TYPES.has(type) ? this.city(options.targetCityId) : null;
    const diplomacyTargetOwner = type === 'induce' ? options.targetOwner : diplomacyTargetCity?.owner;
    const diplomacyTarget = DIPLOMACY_TYPES.has(type)
      ? type === 'induce'
        ? diplomacyTargetCity?.generals.find(person => person.name === diplomacyTargetOwner && person.owner === diplomacyTargetOwner && person.status === 'active')
        : diplomacyTargetCity?.generals.find(person => person.id === options.targetId)
      : null;
    if (DIPLOMACY_TYPES.has(type)) {
      if (!diplomacyTarget || diplomacyTarget.status !== 'active' || !diplomacyTargetOwner ||
        diplomacyTargetOwner === this.player || diplomacyTarget.owner !== diplomacyTargetOwner) throw new Error('外交目标已不符合行动条件');
      if (type === 'counterespionage' && (diplomacyTarget.name === diplomacyTargetOwner || diplomacyTargetCity.governor !== diplomacyTarget.name)) throw new Error('策反目标必须是敌方城池的太守');
    }
    if (type === 'transport' && (!transportTarget || Object.values(cargo).some(amount => !Number.isSafeInteger(amount) || amount < 0) ||
      !Object.values(cargo).some(Boolean) || cargo.food > city.food || cargo.money > city.money || cargo.troops > city.troops)) {
      throw new Error('请选择道路可达的己方城池，并输入不超过本城库存的粮、金或后备兵');
    }
    const recruitAmount = type === 'recruit' ? Number(options.recruitAmount) : 0;
    if (type === 'recruit' && (!Number.isSafeInteger(recruitAmount) || recruitAmount < 10 || recruitAmount % 10 !== 0 || recruitAmount > city.loyalty * 20)) {
      throw new Error(`每名武将征兵须为 10 的倍数，且不超过民忠上限 ${city.loyalty * 20} 兵`);
    }
    const totalCost = type === 'recruit' ? recruitAmount / 10 * selected.length : rule.money * selected.length;
    if (city.money < totalCost) throw new Error(`${selected.length} 名武将执行${rule.label}需要 ${totalCost} 金`);
    if (type === 'farm' && city.farming >= city.farmingLimit) throw new Error('农业已达上限');
    if (type === 'trade' && city.commerce >= city.commerceLimit) throw new Error('商业已达上限');
    if (type === 'govern' && city.disaster >= 100) throw new Error('防灾已达上限');
    if (type === 'patrol' && city.loyalty >= 100 && city.population >= city.populationLimit) throw new Error('民忠和人口均已达上限');
    const issued = [];
    for (const general of selected) {
      const atLimit = type === 'farm' && city.farming >= city.farmingLimit ||
        type === 'trade' && city.commerce >= city.commerceLimit ||
        type === 'govern' && city.disaster >= 100 ||
        type === 'patrol' && city.loyalty >= 100 && city.population >= city.populationLimit;
      if (atLimit) {
        issued.push({ type, cityId: city.id, personId: general.id, personName: general.name, resolved: true,
          result: '前一位武将已使城池达到上限，本次未执行，也未扣除金钱和体力。' });
        continue;
      }
      city.money -= type === 'recruit' ? recruitAmount / 10 : rule.money;
      general.stamina -= rule.stamina;
      const order = { type, cityId: city.id, personId: general.id, personName: general.name, resolved: !['search', 'surrender', 'transport', 'move', 'raid'].includes(type) };
      if (captive) order.targetId = captive.id;
      if (DIPLOMACY_TYPES.has(type)) {
        order.targetId = type === 'induce' ? diplomacyTargetOwner : diplomacyTarget.id;
        order.targetCityId = diplomacyTargetCity.id;
        order.targetOwner = diplomacyTargetOwner;
        order.targetName = diplomacyTarget.name;
      }
      if (type === 'transport') { order.targetId = transportTarget.city.id; order.cargo = cargo; }
      if (type === 'move') { order.targetId = moveTarget.city.id; order.traveler = general; city.generals.splice(city.generals.indexOf(general), 1); }
      if (type === 'scout') order.targetId = scoutTarget.id;
      this.orders.push(order);
      issued.push(order);
      switch (type) {
        case 'alienate':
        case 'canvass':
        case 'counterespionage':
        case 'induce': {
          const result = this.resolveDiplomacy(order, general, diplomacyTarget, diplomacyTargetCity, diplomacyTargetOwner);
          this.report(order, result);
          this.log(`${general.name}在${city.name}执行${rule.label}：${result}`);
          break;
        }
        case 'scout': {
          const defenders = scoutTarget.generals.filter(person => person.status === 'active' && person.owner === scoutTarget.owner);
          const detail = `${scoutTarget.name}（${scoutTarget.owner || '无主'}）\n守军 ${this.totalTroops(scoutTarget)} 兵，其中后备 ${scoutTarget.troops} 兵\n金 ${scoutTarget.money} · 粮 ${scoutTarget.food}\n农业 ${scoutTarget.farming} · 商业 ${scoutTarget.commerce} · 人口 ${scoutTarget.population}\n民忠 ${scoutTarget.loyalty} · 防灾 ${scoutTarget.disaster}\n守将：${defenders.length ? defenders.map(person => `${person.name}（武 ${this.force(person)} / 智 ${this.intelligence(person)} / 兵 ${person.troops}）`).join('、') : '无'}。`;
          this.report(order, detail);
          this.log(`${general.name}侦察${scoutTarget.name}，获得城池军情。`);
          break;
        }
        case 'raid':
          order.result = `月末在${city.name}掠夺；民忠、农业、商业将减半。`;
          this.log(`${general.name}受命在${city.name}掠夺，月末呈报。`);
          break;
        case 'move':
          order.result = `携带 ${general.troops} 兵前往${moveTarget.city.name}，月末抵达。`;
          this.log(`${general.name}从${city.name}启程前往${moveTarget.city.name}。`);
          break;
        case 'exchange': {
          if (exchangeDirection === 'buy') {
            city.money -= exchangeAmount * 5;
            city.food += exchangeAmount;
            this.report(order, `买入 ${exchangeAmount} 粮，支出 ${exchangeAmount * 5} 金；现有 ${city.food} 粮、${city.money} 金。`);
          } else {
            city.food -= exchangeAmount;
            city.money += exchangeAmount * 2;
            this.report(order, `卖出 ${exchangeAmount} 粮，获得 ${exchangeAmount * 2} 金；现有 ${city.food} 粮、${city.money} 金。`);
          }
          this.log(`${general.name}在${city.name}${exchangeDirection === 'buy' ? '买入' : '卖出'} ${exchangeAmount} 粮。`);
          break;
        }
        case 'transport':
          city.food -= cargo.food;
          city.money -= cargo.money;
          city.troops -= cargo.troops;
          order.result = `送往${transportTarget.city.name}：${cargo.food} 粮、${cargo.money} 金、${cargo.troops} 后备兵，月末呈报。`;
          this.log(`${general.name}从${city.name}输送物资往${transportTarget.city.name}，途中待报。`);
          break;
        case 'farm': {
          const before = city.farming;
          const development = this.developmentGain(general);
          city.farming = clamp(city.farming + development, 0, city.farmingLimit);
          this.report(order, `农业 ${before} → ${city.farming}，实际增加 ${city.farming - before}；支出 ${rule.money} 金。`);
          this.log(`${general.name}在${city.name}开垦，农业升至 ${city.farming}。`);
          break;
        }
        case 'trade': {
          const before = city.commerce;
          const development = this.developmentGain(general);
          city.commerce = clamp(city.commerce + development, 0, city.commerceLimit);
          this.report(order, `商业 ${before} → ${city.commerce}，实际增加 ${city.commerce - before}；支出 ${rule.money} 金。`);
          this.log(`${general.name}在${city.name}招商，商业升至 ${city.commerce}。`);
          break;
        }
        case 'recruit':
          city.troops += recruitAmount;
          order.amount = recruitAmount;
          this.report(order, `征得 ${recruitAmount} 兵，已入城池后备兵，现有后备兵 ${city.troops}；支出 ${recruitAmount / 10} 金。可在武将卡片中分配兵力。`);
          this.log(`${general.name}在${city.name}征得 ${recruitAmount} 兵。`);
          break;
        case 'govern': {
          const before = city.disaster;
          city.disaster = clamp(city.disaster + 1 + Math.floor(Math.random() * 4), 0, 100);
          this.report(order, `防灾 ${before} → ${city.disaster}，实际增加 ${city.disaster - before}；支出 ${rule.money} 金。`);
          this.log(`${general.name}在${city.name}治理，防灾升至 ${city.disaster}。`);
          break;
        }
        case 'patrol': {
          const loyaltyBefore = city.loyalty, populationBefore = city.population;
          city.loyalty = clamp(city.loyalty + 1 + Math.floor(Math.random() * 4), 0, 100);
          city.population = Math.min(city.populationLimit, city.population + 100);
          this.report(order, `民忠 ${loyaltyBefore} → ${city.loyalty}（+${city.loyalty - loyaltyBefore}），人口 ${populationBefore} → ${city.population}（+${city.population - populationBefore}）；支出 ${rule.money} 金。`);
          this.log(`${general.name}在${city.name}出巡，民忠升至 ${city.loyalty}。`);
          break;
        }
        case 'search':
          this.log(`${general.name}受命在${city.name}寻访，结果将在月末呈报。`);
          break;
        case 'surrender':
          this.log(`${general.name}受命劝降${captive.name}，结果将在月末呈报。`);
          break;
      }
    }
    return issued;
  }

  resolveOrders() {
    const reports = [];
    for (const order of this.orders) {
      if (order.resolved || !['search', 'surrender', 'transport', 'move', 'raid'].includes(order.type)) continue;
      const city = this.city(order.cityId);
      if (order.type === 'move') {
        const traveler = order.traveler, target = this.city(order.targetId);
        const destination = target?.owner === traveler.owner ? target : city?.owner === traveler.owner ? city : this.cities.find(item => item.owner === traveler.owner);
        if (destination) {
          traveler.cityId = destination.id;
          destination.generals.push(traveler);
          reports.push(this.report(order, destination === target ? `抵达${target.name}，随行 ${traveler.troops} 兵。` : `目标城易主，${traveler.name}改往${destination.name}，随行 ${traveler.troops} 兵。`));
        } else {
          this.releaseGeneral(traveler);
          traveler.cityId = city.id;
          city.generals.push(traveler);
          reports.push(this.report(order, '所属势力已失去全部城池，武将成为在野。'));
        }
        this.log(`${traveler.name}移动：${order.result}`);
        delete order.traveler;
        order.resolved = true;
        continue;
      }
      const general = city?.generals.find(item => item.id === order.personId);
      if (!city || !general || city.owner !== general.owner) {
        reports.push(this.report(order, `${ORDER_RULES[order.type].label}因城池易主而中断。`));
        order.resolved = true;
        continue;
      }
      if (order.type === 'raid') {
        const before = { loyalty: city.loyalty, farming: city.farming, commerce: city.commerce };
        city.loyalty = Math.floor(city.loyalty / 2);
        city.farming = Math.floor(city.farming / 2);
        city.commerce = Math.floor(city.commerce / 2);
        const combined = this.force(general) + this.intelligence(general);
        const money = combined * 2, food = combined * 5;
        city.money += money;
        city.food += food;
        reports.push(this.report(order, `获得 ${money} 金、${food} 粮；民忠 ${before.loyalty} → ${city.loyalty}，农业 ${before.farming} → ${city.farming}，商业 ${before.commerce} → ${city.commerce}。`));
        this.log(`${general.name}在${city.name}掠夺：${order.result}`);
        order.resolved = true;
        continue;
      }
      if (order.type === 'transport') {
        const target = this.city(order.targetId);
        const cargo = order.cargo;
        if (!target || target.owner !== this.player) {
          reports.push(this.report(order, `通往目标城的道路已失守，${cargo.food} 粮、${cargo.money} 金、${cargo.troops} 后备兵未能送达。`));
        } else if (Math.floor(Math.random() * 100) > 20) {
          target.food += cargo.food;
          target.money += cargo.money;
          target.troops += cargo.troops;
          reports.push(this.report(order, `抵达${target.name}，送达 ${cargo.food} 粮、${cargo.money} 金、${cargo.troops} 后备兵。`));
        } else {
          reports.push(this.report(order, `前往${target.name}途中遭劫，损失 ${cargo.food} 粮、${cargo.money} 金、${cargo.troops} 后备兵。`));
        }
        this.log(`${general.name}输送至${target?.name || '目标城'}：${order.result}`);
        order.resolved = true;
        continue;
      }
      if (order.type === 'surrender') {
        const captive = city.generals.find(item => item.id === order.targetId && item.status === 'captive');
        if (!captive) reports.push(this.report(order, '目标俘虏已不在本城，招降中止。'));
        else {
          if (this.attemptSurrender(general, captive)) {
            this.log(`${general.name}劝降${captive.name}成功，已加入${city.name}。`);
            reports.push(this.report(order, `${captive.name}接受招降，成为我方武将，忠诚 ${captive.loyalty}。`));
          } else {
            this.log(`${general.name}劝降${captive.name}未成。`);
            reports.push(this.report(order, `${captive.name}拒绝招降，忠诚降至 ${captive.loyalty}，下月可再试。`));
          }
        }
        order.resolved = true;
        continue;
      }
      const outcome = Math.floor(Math.random() * 4);
      const possible = city.generals.filter(item => item.status === 'free' && !item.owner);
      const hidden = city.items.filter(item => !item.found);
      if (outcome === 1 && Math.floor(Math.random() * 150) < this.intelligence(general) && (possible.length || hidden.length)) {
        if (hidden.length && (!possible.length || Math.random() < 0.5)) {
          const found = hidden[Math.floor(Math.random() * hidden.length)];
          found.found = true;
          this.log(`${general.name}在${city.name}寻得道具${found.name}。`);
          reports.push(this.report(order, `寻得${found.name}，已入${city.name}道具库，可在「人事」中赏赐。`));
        } else {
          const found = possible[Math.floor(Math.random() * possible.length)];
          found.owner = general.owner;
          found.status = 'active';
          found.formerOwner = null;
          found.loyalty = 70 + Math.floor(Math.random() * 30);
          this.log(`${general.name}在${city.name}寻得${found.name}，成功招入麾下。`);
          reports.push(this.report(order, `寻得${found.name}，已招入麾下。`));
        }
      } else if (outcome === 2 || outcome === 3) {
        const amount = 10 + Math.floor(Math.random() * Math.max(1, this.intelligence(general) * 2));
        if (outcome === 2) city.money += amount;
        else city.food += amount;
        this.log(`${general.name}在${city.name}寻得${amount}${outcome === 2 ? '金' : '粮'}。`);
        reports.push(this.report(order, `寻得 ${amount} ${outcome === 2 ? '金' : '粮'}。`));
      } else {
        this.log(`${general.name}在${city.name}寻访，未有所获。`);
        reports.push(this.report(order, '寻访未有所获。'));
      }
      order.resolved = true;
    }
    return reports;
  }

  endMonth() {
    if (this.battle || this.state.winner) throw new Error('当前无法结束月份');
    const year = this.state.year, month = this.state.month;
    const before = this.worldSnapshot();
    const events = this.runAI();
    const monthlyReports = this.resolveOrders();
    for (const city of this.cities) {
      const income = Math.max(15, Math.floor(city.commerce / 110));
      const harvest = Math.max(20, Math.floor(city.farming / 95));
      city.money += income;
      city.food += harvest - Math.ceil(this.totalTroops(city) / 100);
      if (city.food < 0) {
        if (city.owner) events.push({ type: 'famine', ruler: city.owner, cityId: city.id, text: `${city.name}粮草不足，发生兵力损失，民忠下降。` });
        let losses = -city.food * 8;
        const reserveLoss = Math.min(city.troops, losses);
        city.troops -= reserveLoss;
        losses -= reserveLoss;
        for (const general of city.generals.filter(person => person.owner === city.owner).sort((a, b) => b.troops - a.troops)) {
          const loss = Math.min(general.troops, losses);
          general.troops -= loss;
          losses -= loss;
          if (!losses) break;
        }
        city.food = 0;
        city.loyalty = clamp(city.loyalty - 3, 0, 100);
      }
      city.population = Math.min(city.populationLimit, city.population + Math.max(0, Math.floor(city.population / 1200)));
      city.acted = false;
      city.generals.forEach(general => { general.stamina = Math.min(100, general.stamina + 4); });
    }
    this.state.orders = [];
    this.state.month++;
    if (this.state.month > 12) { this.state.month = 1; this.state.year++; }
    this.log(`进入 ${this.state.year} 年 ${this.state.month} 月，各城完成收支结算。`);
    this.checkWinner();
    const after = this.worldSnapshot();
    const factions = [...new Set([...before.keys(), ...after.keys()])].map(owner => ({
      owner, before: before.get(owner) || { cities: 0, troops: 0, money: 0, food: 0 },
      after: after.get(owner) || { cities: 0, troops: 0, money: 0, food: 0 }
    })).sort((a, b) => b.after.cities - a.after.cities || a.owner.localeCompare(b.owner));
    const world = { year, month, events, factions, reports: monthlyReports };
    this.worldHistory.unshift(world);
    this.state.worldHistory.length = Math.min(this.worldHistory.length, 12);
    return world;
  }

  runAI() {
    const enemies = this.cities.filter(city => city.owner && city.owner !== this.player);
    const rulers = [...new Set(enemies.map(city => city.owner))];
    const events = [];
    for (const city of enemies) {
      for (const general of this.generals(city.id)) {
        const addition = Math.min(city.troops, Math.max(0, this.maxTroops(general) - general.troops));
        general.troops += addition;
        city.troops -= addition;
      }
    }
    for (const ruler of rulers) {
      const candidates = this.cities.filter(city => city.owner === ruler && city.food > 0 && this.availableGenerals(city.id, 'battle').some(person => person.troops >= 400))
        .sort((a, b) => this.totalTroops(b) - this.totalTroops(a));
      const source = candidates.find(city => {
        const strongest = Math.max(...this.availableGenerals(city.id, 'battle').map(person => person.troops));
        return this.adjacent(city).some(target => target.owner !== ruler && this.totalTroops(target) < strongest * 0.45);
      });
      if (!source) continue;
      const target = this.adjacent(source).filter(city => city.owner !== ruler)
        .sort((a, b) => this.totalTroops(a) - this.totalTroops(b))[0];
      if (!target) continue;
      if (this.battle && [source.id, target.id].some(id => id === this.battle.fromId || id === this.battle.toId)) continue;
      const commander = this.availableGenerals(source.id, 'battle').sort((a, b) => b.troops - a.troops)[0];
      if (target.owner === this.player) {
        if (!this.battle) {
          this.startDefenseBattle(source, target, commander);
          events.push(this.battle
            ? { type: 'siege', ruler, cityId: target.id, text: `${ruler}从${source.name}进攻${target.name}，我军必须守城。` }
            : { type: 'capture', ruler, cityId: target.id, text: `${ruler}攻占${target.name}：我军粮草耗尽，守城失利。` });
        }
        continue;
      }
      const losses = Math.ceil(this.totalTroops(target) * 0.45);
      const previousOwner = target.owner;
      target.owner = ruler;
      target.troops = 0;
      commander.troops = Math.max(1, commander.troops - losses);
      commander.stamina -= ORDER_RULES.battle.stamina;
      this.orders.push({ type: 'battle', cityId: source.id, personId: commander.id, personName: commander.name, resolved: true });
      const commanderIndex = source.generals.findIndex(g => g.id === commander.id);
      if (commanderIndex >= 0) {
        const [moved] = source.generals.splice(commanderIndex, 1);
        moved.cityId = target.id;
        target.generals.push(moved);
        target.governor = moved.name;
      } else target.governor = ruler;
      target.generals.filter(g => previousOwner && g.owner === previousOwner).forEach(g => {
        if (g.name === previousOwner) this.captureGeneral(g);
        else this.releaseGeneral(g);
      });
      this.liberateCaptives(target, ruler);
      const message = `${ruler}从${source.name}出兵，夺取${target.name}${previousOwner ? `（原属${previousOwner}）` : '（原为无主城）'}。`;
      events.push({ type: 'capture', ruler, cityId: target.id, text: message });
      this.log(message);
    }
    for (const city of enemies.filter(item => item.owner !== this.player)) {
      for (let actionIndex = 0; actionIndex < 2; actionIndex++) {
        const available = this.availableGenerals(city.id);
        if (!available.length) break;
        const captive = city.generals.find(general => general.status === 'captive' && !this.orders.some(order => order.type === 'surrender' && order.targetId === general.id));
        const free = city.generals.filter(general => general.status === 'free');
        const recruitAmount = Math.min(350, city.loyalty * 20, Math.floor(city.money) * 10);
        const shortOnFood = city.food < Math.ceil(this.totalTroops(city) / 100) * 4 + 80;
        const needsTroops = this.totalTroops(city) < Math.max(700, this.generals(city.id).length * 650);
        const choices = [];
        if (captive && city.money >= 100) choices.push('surrender');
        if (needsTroops && recruitAmount >= 10) choices.push('recruit');
        if (shortOnFood && city.farming < city.farmingLimit && city.money >= 50) choices.push('farm');
        if (city.loyalty < 65 && city.money >= 50) choices.push('patrol');
        if (city.money < 180 && city.commerce < city.commerceLimit && city.money >= 50) choices.push('trade');
        if (city.disaster < 55 && city.money >= 50) choices.push('govern');
        if (free.length) choices.push('search');
        if (city.farming < city.farmingLimit && city.money >= 50) choices.push('farm');
        if (city.commerce < city.commerceLimit && city.money >= 50) choices.push('trade');
        if (city.loyalty < 100 && city.money >= 50) choices.push('patrol');
        choices.push('search');
        const type = choices.find(candidate => this.availableGenerals(city.id, candidate).length);
        if (!type) break;
        const general = this.rankedGenerals(city.id, type, { targetId: captive?.id }).find(item => item.available)?.general;
        if (!general) break;
        city.money -= type === 'recruit' ? recruitAmount / 10 : ORDER_RULES[type].money;
        general.stamina -= ORDER_RULES[type].stamina;
        this.orders.push({ type, cityId: city.id, personId: general.id, personName: general.name, targetId: type === 'surrender' ? captive.id : undefined, resolved: true });
        if (type === 'recruit') {
          city.troops += recruitAmount;
          for (const person of this.generals(city.id)) {
            const addition = Math.min(city.troops, Math.max(0, this.maxTroops(person) - person.troops));
            person.troops += addition;
            city.troops -= addition;
          }
        } else if (type === 'farm') city.farming = Math.min(city.farmingLimit, city.farming + this.developmentGain(general));
        else if (type === 'trade') city.commerce = Math.min(city.commerceLimit, city.commerce + this.developmentGain(general));
        else if (type === 'patrol') {
          city.loyalty = Math.min(100, city.loyalty + 1 + Math.floor(Math.random() * 4));
          city.population = Math.min(city.populationLimit, city.population + 100);
        } else if (type === 'govern') city.disaster = Math.min(100, city.disaster + 1 + Math.floor(Math.random() * 4));
        else if (type === 'surrender') {
          if (this.attemptSurrender(general, captive)) {
            events.push({ type: 'general', ruler: city.owner, cityId: city.id, text: `${city.owner}在${city.name}招降${captive.name}。` });
          }
        } else if (type === 'search') {
          const outcome = Math.floor(Math.random() * 4);
          const hidden = city.items.filter(item => !item.found);
          if (outcome === 1 && (free.length || hidden.length) && Math.floor(Math.random() * 150) < this.intelligence(general)) {
            if (hidden.length && (!free.length || Math.random() < 0.5)) hidden[Math.floor(Math.random() * hidden.length)].found = true;
            else {
              const found = free[Math.floor(Math.random() * free.length)];
              found.owner = city.owner;
              found.status = 'active';
              found.formerOwner = null;
              found.loyalty = 70 + Math.floor(Math.random() * 30);
              events.push({ type: 'general', ruler: city.owner, cityId: city.id, text: `${city.owner}在${city.name}寻得${found.name}。` });
            }
          } else if (outcome === 2 || outcome === 3) {
            const amount = 10 + Math.floor(Math.random() * Math.max(1, this.intelligence(general) * 2));
            if (outcome === 2) city.money += amount;
            else city.food += amount;
          }
        }
      }
    }
    return events;
  }

  startBattle(fromId, toId, personIds, cargo = {}) {
    const source = this.city(fromId), target = this.city(toId);
    if (!source || !target || source.owner !== this.player || target.owner === this.player) throw new Error('出征目标无效');
    if (this.battle || this.state.winner) throw new Error('当前无法出征');
    if (!this.adjacent(source).includes(target)) throw new Error('只能进攻相邻城池');
    if (!Array.isArray(personIds)) throw new Error('请选择出征武将');
    const uniqueIds = [...new Set(personIds)];
    if (!uniqueIds.length || uniqueIds.length > MAX_BATTLE_GENERALS || uniqueIds.length !== personIds.length) throw new Error(`请选择 1 至 ${MAX_BATTLE_GENERALS} 名出征武将`);
    const available = this.availableGenerals(source.id, 'battle');
    const selected = uniqueIds.map(id => available.find(general => general.id === id));
    if (selected.some(general => !general)) throw new Error('所选武将本月无法出征');
    const map = makeBattleMap(fromId, toId);
    const defenders = target.owner ? target.generals.filter(g => g.owner === target.owner && g.troops > 0).sort((a, b) => b.troops - a.troops).slice(0, MAX_BATTLE_GENERALS - (target.troops > 0 ? 1 : 0)) : [];
    const defenderUnits = [...defenders];
    if (target.troops > 0) defenderUnits.push({ name: '守城军', force: 55, intelligence: 45, level: 1, armsType: '步兵', id: null, troops: target.troops });
    if (!defenderUnits.length) defenderUnits.push({ name: '守城军', force: 40, intelligence: 35, level: 1, armsType: '步兵', id: null, troops: 200 });
    const makeUnits = (generals, side, spawns, rulerName) => generals.map((g, index) => {
      const force = g.id ? this.force(g) : g.force;
      const intelligence = g.id ? this.intelligence(g) : g.intelligence;
      const stamina = g.stamina ?? 100;
      const hp = Math.max(25, Math.round((force * .8 + intelligence * .3 + (g.level || 1)) * stamina / 100));
      const mp = Math.max(15, Math.round((intelligence * .8 + Math.sqrt(force) / 2 + (g.level || 1)) * stamina / 100));
      return { id: `${side}-${index}`, personId: g.id, name: g.name, side, force, intelligence,
        level: g.level || 1, isRuler: g.name === rulerName, armsType: g.armsType === '水兵' ? '水军' : g.armsType || '步兵', speed: g.id ? this.itemBonus(g, 'speed') : 0,
        troops: g.troops, initialTroops: g.troops, hp, maxHp: hp, mp, maxMp: mp,
        x: spawns[index].x, y: spawns[index].y, moved: false, acted: false, status: {} };
    });
    const playerNeed = battleFoodConsumption(selected.reduce((sum, general) => sum + general.troops, 0));
    const playerSupply = cargo.food ?? Math.min(source.food, Math.max(1, playerNeed * 30 + 1));
    const playerMoney = cargo.money ?? 0;
    if (!Number.isSafeInteger(playerSupply) || playerSupply < 1 || playerSupply > source.food) throw new Error(`携带粮食须为 1 至 ${source.food} 的整数，请先补粮或调整数量`);
    if (!Number.isSafeInteger(playerMoney) || playerMoney < 0 || playerMoney > source.money) throw new Error(`携带金钱须为 0 至 ${source.money} 的整数`);
    const enemySupply = target.food;
    source.food -= playerSupply;
    source.money -= playerMoney;
    target.food -= enemySupply;
    for (const general of selected) {
      general.stamina -= ORDER_RULES.battle.stamina;
      this.orders.push({ type: 'battle', cityId: source.id, personId: general.id, personName: general.name, resolved: true });
    }
    this.state.battle = {
      version: 2, mode: 'attack', rangeRule: 'modern', fromId: source.id, toId: target.id, targetOwner: target.owner,
      map, turn: 1, turnLimit: 30, weather: WEATHER[(fromId + toId + this.state.month) % WEATHER.length],
      rngState: (Date.now() ^ fromId * 101 ^ toId * 65537) >>> 0,
      supplies: { player: playerSupply, enemy: enemySupply },
      initialSupplies: { player: playerSupply, enemy: enemySupply }, money: { player: playerMoney, enemy: 0 },
      units: [...makeUnits(selected, 'player', map.attackerSpawns, this.player), ...makeUnits(defenderUnits, 'enemy', map.defenderSpawns, target.owner)],
      message: `进攻${target.name}·${map.name}。夺取城池核心并守过敌军回合，或击溃守军。`
    };
    this.battle.forecast = nextWeather(this.battle);
    this.battleLog(`出征携带 ${playerSupply} 粮、${playerMoney} 金；当前兵力每回合耗粮 ${playerNeed}。`);
    if (!enemySupply) this.finishBattle('player', '敌军粮草耗尽');
  }

  startDefenseBattle(source, target, commander) {
    const map = makeBattleMap(source.id, target.id);
    const defenders = target.generals.filter(g => g.owner === this.player && g.troops > 0).sort((a, b) => b.troops - a.troops).slice(0, MAX_BATTLE_GENERALS - (target.troops > 0 ? 1 : 0));
    if (target.troops > 0) defenders.push({ id: null, name: '守城军', force: 55, intelligence: 45, level: 1, armsType: '步兵', troops: target.troops });
    if (!defenders.length) defenders.push({ id: null, name: '守城军', force: 40, intelligence: 35, level: 1, armsType: '步兵', troops: 200 });
    const attackers = [commander];
    const playerSupply = target.food, enemySupply = source.food;
    target.food -= playerSupply; source.food -= enemySupply;
    commander.stamina = Math.max(0, commander.stamina - ORDER_RULES.battle.stamina);
    this.orders.push({ type: 'battle', cityId: source.id, personId: commander.id, personName: commander.name, resolved: true });
    const units = [];
    const add = (generals, side, spawns) => generals.forEach((g, index) => {
      const force = g.id ? this.force(g) : g.force, intelligence = g.id ? this.intelligence(g) : g.intelligence;
      const health = Math.max(25, Math.round((force * .8 + intelligence * .3 + (g.level || 1)) * (g.stamina ?? 100) / 100));
      const mp = Math.max(15, Math.round((intelligence * .8 + Math.sqrt(force) / 2 + (g.level || 1)) * (g.stamina ?? 100) / 100));
      units.push({ id: `${side}-${index}`, personId: g.id, name: g.name, side, force, intelligence,
        level: g.level || 1, isRuler: g.name === (side === 'player' ? this.player : source.owner),
        armsType: g.armsType === '水兵' ? '水军' : g.armsType || '步兵',
        speed: g.id ? this.itemBonus(g, 'speed') : 0, troops: g.troops, initialTroops: g.troops,
        hp: health, maxHp: health, mp, maxMp: mp, x: spawns[index].x, y: spawns[index].y,
        moved: false, acted: false, status: {} });
    });
    add(defenders, 'player', map.defenderSpawns);
    add(attackers, 'enemy', map.attackerSpawns);
    this.state.battle = { version: 2, mode: 'defend', rangeRule: 'modern', fromId: source.id, toId: target.id, attackerOwner: source.owner, targetOwner: target.owner,
      map, turn: 1, turnLimit: 30, weather: WEATHER[(source.id + target.id + this.state.month) % WEATHER.length],
      rngState: (Date.now() ^ source.id * 101 ^ target.id * 65537) >>> 0,
      supplies: { player: playerSupply, enemy: enemySupply },
      initialSupplies: { player: playerSupply, enemy: enemySupply }, money: { player: 0, enemy: 0 }, units,
      message: `${source.owner}来犯${target.name}！守住城池核心三十回合，或击溃敌军。` };
    this.battle.forecast = nextWeather(this.battle);
    if (!playerSupply) this.finishBattle('enemy', '我军粮草耗尽');
    else if (!enemySupply) this.finishBattle('player', '敌军粮草耗尽');
  }

  battleAction(unitId, x, y) {
    const battle = this.battle;
    const unit = battle?.units.find(item => item.id === unitId && item.side === 'player' && alive(item));
    if (!unit || unit.acted) throw new Error('请选择本回合可行动的我军');
    const target = occupantAt(battle, x, y);
    if (target?.side === 'enemy') return this.battleAttack(unit, target);
    if (target || !reachableTiles(battle, unit).some(tile => tile.x === x && tile.y === y)) throw new Error('该格无法到达');
    unit.previous = { x: unit.x, y: unit.y };
    unit.moveDistance = Math.abs(unit.x - x) + Math.abs(unit.y - y);
    unit.x = x; unit.y = y; unit.moved = true;
    this.battleLog(`${unit.name}移至${tileAt(battle, x, y) === 'city' ? '城池核心' : '新位置'}，还可攻击、施计或待机。`);
    this.finishBattleIfNeeded();
  }

  battleUndoMove(unitId) {
    const unit = this.battle?.units.find(item => item.id === unitId && item.side === 'player' && alive(item));
    if (!unit || !unit.moved || unit.acted || !unit.previous) throw new Error('当前无法撤回移动');
    if (occupantAt(this.battle, unit.previous.x, unit.previous.y)) throw new Error('原位置已被其他部队占据');
    unit.x = unit.previous.x; unit.y = unit.previous.y;
    unit.moved = false; unit.previous = null; unit.moveDistance = 0;
    this.battleLog(`${unit.name}撤回移动，可重新选择路线。`);
  }

  battleLog(message) {
    if (!this.battle) return;
    this.battle.message = message;
    this.battle.log ||= [];
    this.battle.log.unshift({ round: this.battle.turn, text: message });
    this.battle.log.length = Math.min(30, this.battle.log.length);
  }

  battleExperience(attacker, targetLevel, losses, defeated = false) {
    if (!attacker?.personId || losses <= 0) return 0;
    const level = attacker.level || 1;
    const base = Math.floor(Math.sqrt(losses) / 4);
    const gain = (level < targetLevel ? base + targetLevel - level : Math.max(0, base - (level - targetLevel))) + 2;
    const bonus = defeated
      ? level < targetLevel && targetLevel - level < 32 ? 24 : level === targetLevel ? 16 : 8
      : 0;
    const total = gain + bonus;
    const cityId = this.battle.mode === 'defend'
      ? attacker.side === 'player' ? this.battle.toId : this.battle.fromId
      : attacker.side === 'player' ? this.battle.fromId : this.battle.toId;
    const general = this.city(cityId)?.generals.find(person => person.id === attacker.personId);
    if (!general) return total;
    general.experience = (general.experience || 0) + total;
    let leveled = false;
    if (general.experience >= 100) {
      general.experience -= 100;
      if (general.level < 20) {
        general.level++;
        attacker.level = general.level;
        leveled = true;
      }
    }
    this.battleLog(`${general.name}获得战场经验 ${total}${leveled ? `，升至 ${general.level} 级` : ''}（${general.experience}/100）。`);
    return total;
  }

  beginBattleEffects() { this.battleEffects = []; }

  takeBattleEffects() {
    const effects = this.battleEffects || [];
    this.battleEffects = null;
    return effects;
  }

  recordBattleHit(attacker, target, before, kind = 'attack') {
    if (!this.battleEffects) return;
    this.battleEffects.push({ type: 'hit', kind, attackerId: attacker.id, targetId: target.id,
      from: { x: attacker.x, y: attacker.y }, to: { x: target.x, y: target.y },
      armsType: attacker.armsType, side: target.side, before, after: target.troops, afterHp: target.hp,
      loss: before - target.troops });
  }

  battleAttack(unit, target, multiplier = 1) {
    const error = attackError(this.battle, unit, target);
    if (error) throw new Error(error);
    const damage = attackDamage(this.battle, unit, target, multiplier);
    const before = target.troops;
    target.troops = Math.max(0, target.troops - damage);
    target.hp = Math.max(0, target.hp - Math.max(2, Math.floor(damage / 45)));
    this.recordBattleHit(unit, target, before);
    this.battleExperience(unit, target.level || 1, before - target.troops, target.troops <= 0);
    unit.acted = true;
    const counter = this.battleCounterattack(target, unit);
    this.battleLog(`${unit.name}攻击${target.name}，伤兵 ${before - target.troops}${counter ? `；${target.name}反击伤兵 ${counter}` : ''}。`);
    this.finishBattleIfNeeded();
  }

  battleCounterattack(defender, attacker) {
    const chance = counterattackChance(this.battle, defender, attacker);
    if (!chance) return 0;
    this.battle.rngState = (Math.imul(this.battle.rngState || 0, 1664525) + 1013904223) >>> 0;
    if (this.battle.rngState / 0x100000000 >= chance) return 0;
    const damage = attackDamage(this.battle, defender, attacker, .25);
    const before = attacker.troops;
    attacker.troops = Math.max(0, attacker.troops - damage);
    attacker.hp = Math.max(0, attacker.hp - Math.max(1, Math.floor(damage / 55)));
    this.recordBattleHit(defender, attacker, before, 'counter');
    defender.countered = true;
    return before - attacker.troops;
  }

  battleSkill(unitId, skillId, targetId = null) {
    return this.battleSkillForSide(unitId, skillId, targetId, 'player');
  }

  battleSkillForSide(unitId, skillId, targetId, side) {
    const battle = this.battle;
    const unit = battle?.units.find(item => item.id === unitId && item.side === side);
    const target = battle?.units.find(item => item.id === targetId);
    const error = skillError(battle, unit, skillId, target);
    if (error) throw new Error(error);
    const skill = SKILLS[skillId];
    if (skill.target !== 'none' && !target) throw new Error('请选择计谋目标');
    unit.mp -= skill.cost;
    unit.acted = true;
    if (skillId === 'change') {
      battle.forecast = WEATHER[(WEATHER.indexOf(battle.weather) + 2) % WEATHER.length];
      this.battleLog(`${unit.name}施展天变，下回合天气将变为${battle.forecast}。`);
    } else if (skillId === 'reinforce') {
      const restored = Math.min(target.initialTroops - target.troops, Math.max(50, Math.floor(unit.intelligence * 1.5)));
      const cost = Math.ceil(restored / 20);
      if (battle.supplies[side] < cost) { unit.mp += skill.cost; unit.acted = false; throw new Error(`援兵还需要 ${cost} 粮`); }
      target.troops += restored; battle.supplies[side] -= cost;
      this.battleLog(`${unit.name}为${target.name}补充 ${restored} 兵，消耗 ${cost} 粮。`);
    } else if (skillId === 'ward') {
      target.status.ward = 2;
      this.battleLog(`${unit.name}施展奇门，${target.name}防御提高至下回合。`);
    } else if (skillId === 'bind') {
      target.status.bind = 2;
      this.battleLog(`${unit.name}定住${target.name}，对方下回合无法移动。`);
    } else {
      const damage = skillDamage(battle, unit, target, skillId);
      const before = target.troops;
      target.troops = Math.max(0, target.troops - damage);
      target.hp = Math.max(0, target.hp - Math.max(2, Math.floor(damage / 40)));
      this.recordBattleHit(unit, target, before, 'skill');
      let totalLosses = before - target.troops;
      if (skillId === 'arrows') {
        for (const other of battle.units.filter(item => item.side !== unit.side && item.id !== target.id && alive(item) && Math.abs(item.x - target.x) + Math.abs(item.y - target.y) === 1)) {
          const splash = Math.floor(damage * .55);
          const otherBefore = other.troops;
          other.troops = Math.max(0, other.troops - splash);
          other.hp = Math.max(0, other.hp - Math.max(1, Math.floor(splash / 45)));
          this.recordBattleHit(unit, other, otherBefore, 'skill');
          totalLosses += otherBefore - other.troops;
        }
      }
      if (skillId === 'flood') target.status.bind = 2;
      this.battleExperience(unit, target.level || 1, totalLosses);
      this.battleLog(`${unit.name}施展${skill.name}，${target.name}损失 ${before - target.troops} 兵。`);
    }
    this.finishBattleIfNeeded();
  }

  battleWait(unitId) {
    const unit = this.battle?.units.find(item => item.id === unitId && item.side === 'player' && alive(item));
    if (!unit || unit.acted) throw new Error('请选择尚未下令的我军');
    unit.acted = true;
    unit.hp = Math.min(unit.maxHp, unit.hp + 5);
    this.battleLog(`${unit.name}待机整队，恢复少量体力。`);
  }

  endBattleTurn() {
    const battle = this.battle;
    if (!battle) return;
    if (battle.mode === 'defend' && occupantAt(battle, battle.map.objective.x, battle.map.objective.y)?.side === 'enemy') {
      this.finishBattle('enemy', '敌军攻占城池核心'); return;
    }
    for (const enemy of battle.units.filter(unit => unit.side === 'enemy' && unit.troops > 0)) {
      if (!alive(enemy)) continue;
      const players = battle.units.filter(unit => unit.side === 'player' && alive(unit));
      if (!players.length) break;
      const objective = battle.map.objective;
      const target = players.sort((a, b) => Math.abs(enemy.x - a.x) + Math.abs(enemy.y - a.y) - Math.abs(enemy.x - b.x) - Math.abs(enemy.y - b.y))[0];
      if ((!canAttack(battle, enemy, target) || battle.mode === 'defend') && !enemy.status?.bind) {
        const destination = battle.mode === 'defend' ? objective : target;
        const field = distanceField(battle, enemy, destination);
        const options = reachableTiles(battle, enemy).sort((a, b) => {
          const score = point => battle.mode === 'defend'
            ? (field.get(`${point.x},${point.y}`) ?? Infinity)
            : (field.get(`${point.x},${point.y}`) ?? Infinity) + (Math.abs(point.x - objective.x) + Math.abs(point.y - objective.y)) * .1;
          return score(a) - score(b);
        });
        if (options[0]) {
          if (this.battleEffects) this.battleEffects.push({ type: 'move', unitId: enemy.id, path: options[0].path });
          enemy.moveDistance = Math.abs(enemy.x - options[0].x) + Math.abs(enemy.y - options[0].y);
          enemy.x = options[0].x; enemy.y = options[0].y; enemy.moved = true;
        }
      }
      const attackable = players.filter(player => canAttack(battle, enemy, player)).sort((a, b) => a.troops - b.troops);
      if (!attackable.length) {
        const cast = Object.entries(SKILLS).find(([id, skill]) => skill.target === 'enemy' &&
          ['volley', 'fire', 'rock', 'flood', 'bind'].includes(id) &&
          players.some(player => !skillError(battle, enemy, id, player)));
        if (cast) {
          const victim = players.find(player => !skillError(battle, enemy, cast[0], player));
          this.battleSkillForSide(enemy.id, cast[0], victim.id, 'enemy');
          if (!this.battle) return;
          continue;
        }
      }
      if (attackable[0]) {
        const victim = attackable[0], damage = attackDamage(battle, enemy, victim);
        const before = victim.troops;
        victim.troops = Math.max(0, victim.troops - damage);
        victim.hp = Math.max(0, victim.hp - Math.max(2, Math.floor(damage / 45)));
        this.recordBattleHit(enemy, victim, before);
        this.battleExperience(enemy, victim.level || 1, before - victim.troops, victim.troops <= 0);
        const counter = this.battleCounterattack(victim, enemy);
        this.battleLog(`${enemy.name}攻击${victim.name}，我军损失 ${before - victim.troops} 兵${counter ? `；${victim.name}反击伤兵 ${counter}` : ''}。`);
      }
      enemy.acted = true;
      if (this.finishBattleIfNeeded()) return;
    }
    const core = occupantAt(battle, battle.map.objective.x, battle.map.objective.y);
    if (battle.mode === 'attack' && core?.side === 'player') { this.finishBattle('player', '攻占城池核心'); return; }
    for (const side of ['player', 'enemy']) {
      const need = battleFoodConsumption(battle.units.filter(unit => unit.side === side && alive(unit)).reduce((sum, unit) => sum + unit.troops, 0));
      const used = Math.min(battle.supplies[side], need);
      battle.supplies[side] = Math.max(0, battle.supplies[side] - need);
      this.battleLog(`${side === 'player' ? '我军' : '敌军'}消耗 ${used} 粮，剩余 ${battle.supplies[side]} 粮。`);
    }
    if (!battle.supplies.player) { this.finishBattle('enemy', '我军粮草耗尽'); return; }
    if (!battle.supplies.enemy) { this.finishBattle('player', '敌军粮草耗尽'); return; }
    if (battle.turn >= (battle.turnLimit || 12)) { this.finishBattle(battle.mode === 'defend' ? 'player' : 'enemy', `守军坚守${battle.turnLimit || 12}回合`); return; }
    battle.turn++;
    battle.units.forEach(unit => {
      unit.acted = false; unit.moved = false; unit.countered = false; unit.moveDistance = 0; unit.previous = null;
      for (const status of Object.keys(unit.status || {})) if (--unit.status[status] <= 0) delete unit.status[status];
    });
    battle.weather = battle.forecast;
    battle.forecast = nextWeather(battle);
    this.battleLog(`第 ${battle.turn} 回合，天气${battle.weather}。我军可以行动。`);
  }

  finishBattleIfNeeded() {
    const battle = this.battle;
    if (!battle) return true;
    const players = battle.units.filter(unit => unit.side === 'player' && alive(unit));
    const enemies = battle.units.filter(unit => unit.side === 'enemy' && alive(unit));
    if (!players.length) return this.finishBattle('enemy', '我军全军失能');
    if (!enemies.length) return this.finishBattle('player', '守军全军失能');
    if (!alive(battle.units.find(unit => unit.id === 'player-0'))) return this.finishBattle('enemy', '我军主将失能');
    if (!alive(battle.units.find(unit => unit.id === 'enemy-0'))) return this.finishBattle('player', '守军主将失能');
    return false;
  }

  finishBattle(winner, reason, { retreated = false } = {}) {
    const battle = this.battle;
    if (!battle) return true;
    const players = battle.units.filter(unit => unit.side === 'player' && alive(unit));
    const enemies = battle.units.filter(unit => unit.side === 'enemy' && alive(unit));
    const source = this.city(battle.fromId), target = this.city(battle.toId);
    // iBaye citycmdd.c::FightResultDeal gives both armies' remaining food to the battle city.
    const suppliesReport = {
      foodUsed: Math.max(0, (battle.initialSupplies?.player ?? battle.supplies.player) - battle.supplies.player),
      foodSettled: battle.supplies.player + battle.supplies.enemy,
      moneySettled: (battle.money?.player || 0) + (battle.money?.enemy || 0), supplyCityId: target.id
    };
    target.food += suppliesReport.foodSettled;
    target.money += suppliesReport.moneySettled;
    for (const unit of battle.units) {
      const city = unit.side === 'player' ? battle.mode === 'defend' ? target : source : battle.mode === 'defend' ? source : target;
      if (unit.personId) {
        const general = city.generals.find(person => person.id === unit.personId);
        if (general) general.troops = unit.troops;
      } else if (unit.side === 'enemy' && battle.mode === 'attack' || unit.side === 'player' && battle.mode === 'defend') target.troops = unit.troops;
    }
    if (battle.mode === 'defend') {
      if (winner === 'player') {
        this.log(`${target.name}守城成功（${reason}），我军余兵 ${players.reduce((sum, unit) => sum + unit.troops, 0)}。`);
      } else {
        const conqueror = battle.attackerOwner;
        target.owner = conqueror; target.troops = 0;
        const index = source.generals.findIndex(g => g.id === battle.units.find(unit => unit.side === 'enemy')?.personId);
        if (index >= 0) {
          const [general] = source.generals.splice(index, 1);
          general.cityId = target.id; target.generals.push(general); target.governor = general.name;
        } else target.governor = conqueror;
        const retreatIds = retreated ? new Set(battle.units.filter(unit => unit.side === 'player').map(unit => unit.personId)) : new Set();
        for (const general of target.generals.filter(g => g.owner === this.player && !retreatIds.has(g.id))) {
          if (general.name === this.player || battle.units.some(unit => unit.personId === general.id && !alive(unit))) this.captureGeneral(general);
          else this.releaseGeneral(general);
        }
        this.log(`${conqueror}攻占${target.name}（${reason}），我军守城失利。`);
      }
      const retreatResult = retreated ? this.resolveRetreat(battle, target, target) : {};
      this.state.lastBattleReport = { cityId: target.id, mode: 'defend', winner, reason, retreated, ...retreatResult, round: battle.turn, ...suppliesReport,
        playerLoss: battle.units.filter(unit => unit.side === 'player').reduce((sum, unit) => sum + unit.initialTroops - unit.troops, 0),
        enemyLoss: battle.units.filter(unit => unit.side === 'enemy').reduce((sum, unit) => sum + unit.initialTroops - unit.troops, 0) };
      this.state.battle = null; this.checkWinner(); return true;
    }
    if (winner === 'player') {
      const foughtIds = new Set(battle.units.filter(unit => unit.side === 'enemy' && unit.personId).map(unit => unit.personId));
      target.owner = this.player;
      target.troops = 0;
      target.governor = players[0].name;
      for (const unit of players) {
        const index = source.generals.findIndex(g => g.id === unit.personId);
        if (index >= 0) { const [general] = source.generals.splice(index, 1); general.cityId = target.id; target.generals.push(general); }
      }
      target.generals.filter(g => battle.targetOwner && g.owner === battle.targetOwner).forEach(g => {
        if (foughtIds.has(g.id) || g.name === battle.targetOwner) this.captureGeneral(g);
        else this.releaseGeneral(g);
      });
      const liberated = this.liberateCaptives(target, this.player);
      if (liberated.length) this.log(`在${target.name}救回${liberated.map(general => general.name).join('、')}。`);
      this.log(`我军攻占${target.name}（${reason}），参战武将余兵 ${players.reduce((sum, unit) => sum + unit.troops, 0)}。`);
    } else if (!retreated) {
      for (const unit of battle.units.filter(item => item.side === 'player' && item.personId && !alive(item))) {
        const index = source.generals.findIndex(general => general.id === unit.personId);
        if (index < 0) continue;
        const [general] = source.generals.splice(index, 1);
        this.captureGeneral(general);
        general.cityId = target.id;
        target.generals.push(general);
      }
      this.log(`进攻${target.name}失利（${reason}），守军余兵 ${enemies.reduce((sum, unit) => sum + unit.troops, 0)}。`);
    }
    const retreatResult = retreated ? this.resolveRetreat(battle, source, target) : {};
    this.state.lastBattleReport = { cityId: target.id, mode: 'attack', winner, reason, retreated, ...retreatResult, round: battle.turn, ...suppliesReport,
      playerLoss: battle.units.filter(unit => unit.side === 'player').reduce((sum, unit) => sum + unit.initialTroops - unit.troops, 0),
      enemyLoss: battle.units.filter(unit => unit.side === 'enemy').reduce((sum, unit) => sum + unit.initialTroops - unit.troops, 0) };
    this.state.battle = null;
    this.checkWinner();
    return true;
  }

  resolveRetreat(battle, origin, target) {
    const escaped = [], captured = [];
    const destinations = this.ownedCities();
    // iBaye TheLoserDeal: rand()%100 > IQ means capture; otherwise LostEscape picks a friendly city.
    for (const unit of battle.units.filter(item => item.side === 'player' && item.personId)) {
      const index = origin.generals.findIndex(person => person.id === unit.personId);
      if (index < 0) continue;
      const [general] = origin.generals.splice(index, 1);
      const roll = Math.floor(Math.random() * 100);
      if (roll <= this.intelligence(general) && destinations.length) {
        const destination = destinations[Math.floor(Math.random() * destinations.length)];
        general.cityId = destination.id;
        general.troops = unit.troops;
        destination.generals.push(general);
        if (origin.governor === general.name && origin.id !== destination.id) origin.governor = origin.generals.find(person => person.owner === origin.owner && person.status === 'active')?.name || origin.owner;
        escaped.push({ name: general.name, cityId: destination.id });
      } else {
        unit.troops = 0;
        this.captureGeneral(general);
        general.cityId = target.id;
        target.generals.push(general);
        if (origin.governor === general.name && origin.id !== target.id) origin.governor = origin.generals.find(person => person.owner === origin.owner && person.status === 'active')?.name || origin.owner;
        captured.push(general.name);
      }
    }
    if (battle.mode === 'defend') battle.units.filter(unit => unit.side === 'player' && !unit.personId).forEach(unit => { unit.troops = 0; });
    this.log(`我军从${target.name}撤军，${escaped.length} 将逃脱、${captured.length} 将被俘；余粮和随军金钱留给敌军。`);
    return { escaped, captured };
  }

  retreat() {
    if (!this.battle) throw new Error('当前没有可撤退的战斗');
    return this.finishBattle('enemy', '主动撤军', { retreated: true });
  }

  checkWinner() {
    if (!this.ownedCities().length) this.state.winner = 'defeat';
    else if (this.cities.every(city => city.owner === this.player)) this.state.winner = 'victory';
  }
}
