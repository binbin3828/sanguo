import { adjacentCityNames } from './MapData.js';

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const copy = value => JSON.parse(JSON.stringify(value));
export const ORDER_RULES = Object.freeze({
  farm: { label: '开垦', money: 50, stamina: 8 },
  trade: { label: '招商', money: 50, stamina: 8 },
  search: { label: '寻访', money: 0, stamina: 8 },
  govern: { label: '治理', money: 50, stamina: 8 },
  patrol: { label: '出巡', money: 50, stamina: 8 },
  surrender: { label: '招降', money: 100, stamina: 15 },
  recruit: { label: '征兵', money: 0, stamina: 12 },
  battle: { label: '出征', money: 0, stamina: 20 }
});

export class GameModel {
  constructor(catalog, scenarioId, player) {
    const scenario = catalog.scenarios[scenarioId];
    if (!scenario || !scenario.rulers.includes(player)) throw new Error('无效的剧本或君主');
    this.state = {
      version: 5, scenarioId, player, year: scenario.year, month: 1,
      cities: copy(scenario.cities), orders: [], reports: [], worldHistory: [], battle: null, messages: [], winner: null
    };
    this.cities.forEach(city => this.migrateCityTroops(city));
    this.log(`${player}举兵，霸业始于${scenario.year}年。`);
  }

  static restore(snapshot) {
    if (!snapshot || ![2, 3, 4, 5].includes(snapshot.version) || !Array.isArray(snapshot.cities)) {
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
    game.state.worldHistory = Array.isArray(game.state.worldHistory) ? game.state.worldHistory.slice(0, 12) : [];
    game.cities.forEach(city => {
      city.generals.forEach(general => {
        general.stamina ??= 100;
        general.level ??= 1;
        if (game.state.version >= 4) general.troops ??= 0;
        general.status ??= general.owner ? 'active' : 'free';
        general.formerOwner ??= null;
      });
      if (game.state.version < 4) game.migrateCityTroops(city);
    });
    game.state.version = 5;
    return game;
  }

  get cities() { return this.state.cities; }
  get player() { return this.state.player; }
  get battle() { return this.state.battle; }
  get orders() { return this.state.orders; }
  get reports() { return this.state.reports; }
  get worldHistory() { return this.state.worldHistory; }
  maxTroops(general) { return general.level * 100 + general.force * 10 + general.intelligence * 10; }
  developmentGain(general) { return Math.floor(general.intelligence / 10) * (2 + Math.floor(Math.random() * 4)) + Math.floor(general.intelligence / 2); }
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
        score = general.intelligence;
        reason = `智力 ${general.intelligence} · 开发增量随智力提升`;
      } else if (type === 'search') {
        score = general.intelligence;
        reason = `智力 ${general.intelligence} · 寻访人才与资源更有利`;
      } else if (type === 'surrender') {
        const chance = captive ? clamp(50 + general.intelligence - captive.intelligence - Math.floor(captive.loyalty / 3), 10, 80) : 0;
        score = chance * 100 + general.intelligence;
        reason = captive ? `预计招降成功率 ${chance}% · 智力 ${general.intelligence}` : `智力 ${general.intelligence}`;
      } else if (type === 'battle') {
        const attack = Math.max(80, Math.floor(general.force * 2.8 + general.troops * 0.28));
        score = general.troops + attack * 2;
        reason = `带兵 ${general.troops} · 武力 ${general.force} · 平地伤害约 ${attack}`;
      } else {
        score = -Math.max(general.intelligence, general.force);
        reason = '指令收益固定 · 优先使用非专精武将';
      }
      const order = this.orderFor(general.id);
      const unavailableReason = order ? `本月已执行${ORDER_RULES[order.type]?.label || '指令'}`
        : city.acted ? '旧存档本月已行动'
          : general.stamina < ORDER_RULES[type].stamina ? `体力不足，需 ${ORDER_RULES[type].stamina} 点`
            : type === 'battle' && !general.troops ? '尚未分配兵力' : '当前不可接令';
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
    if (!general || city.acted || this.orderFor(personId)) throw new Error('这名武将本月正在执行其他指令');
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
    if (captive && this.orders.some(order => order.type === 'surrender' && order.targetId === captive.id)) throw new Error('这名俘虏本月已有人招降');
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
      const order = { type, cityId: city.id, personId: general.id, personName: general.name, resolved: type !== 'search' && type !== 'surrender' };
      if (captive) order.targetId = captive.id;
      this.orders.push(order);
      issued.push(order);
      switch (type) {
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
      if (order.resolved || !['search', 'surrender'].includes(order.type)) continue;
      const city = this.city(order.cityId);
      const general = city?.generals.find(item => item.id === order.personId);
      if (!city || !general || city.owner !== general.owner) {
        reports.push(this.report(order, `${ORDER_RULES[order.type].label}因城池易主而中断。`));
        order.resolved = true;
        continue;
      }
      if (order.type === 'surrender') {
        const captive = city.generals.find(item => item.id === order.targetId && item.status === 'captive');
        if (!captive) reports.push(this.report(order, '目标俘虏已不在本城，招降中止。'));
        else {
          const chance = clamp(50 + general.intelligence - captive.intelligence - Math.floor(captive.loyalty / 3), 10, 80);
          if (Math.random() * 100 < chance) {
            captive.owner = general.owner;
            captive.status = 'active';
            captive.formerOwner = null;
            captive.loyalty = 40 + Math.floor(Math.random() * 41);
            this.log(`${general.name}劝降${captive.name}成功，已加入${city.name}。`);
            reports.push(this.report(order, `${captive.name}接受招降，成为我方武将，忠诚 ${captive.loyalty}。`));
          } else {
            captive.loyalty = Math.max(0, captive.loyalty - Math.max(1, Math.floor(captive.loyalty / 10)));
            this.log(`${general.name}劝降${captive.name}未成。`);
            reports.push(this.report(order, `${captive.name}拒绝招降，忠诚降至 ${captive.loyalty}，下月可再试。`));
          }
        }
        order.resolved = true;
        continue;
      }
      const outcome = Math.floor(Math.random() * 4);
      const possible = city.generals.filter(item => item.status === 'free' && !item.owner);
      if (outcome === 1 && possible.length && Math.floor(Math.random() * 150) < general.intelligence) {
        const found = possible[Math.floor(Math.random() * possible.length)];
        found.owner = general.owner;
        found.status = 'active';
        found.formerOwner = null;
        found.loyalty = 70 + Math.floor(Math.random() * 30);
        this.log(`${general.name}在${city.name}寻得${found.name}，成功招入麾下。`);
        reports.push(this.report(order, `寻得${found.name}，已招入麾下。`));
      } else if (outcome === 2 || outcome === 3) {
        const amount = 10 + Math.floor(Math.random() * Math.max(1, general.intelligence * 2));
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
      const candidates = this.cities.filter(city => city.owner === ruler && this.availableGenerals(city.id, 'battle').some(person => person.troops >= 400))
        .sort((a, b) => this.totalTroops(b) - this.totalTroops(a));
      const source = candidates.find(city => {
        const strongest = Math.max(...this.availableGenerals(city.id, 'battle').map(person => person.troops));
        return this.adjacent(city).some(target => target.owner !== ruler && this.totalTroops(target) < strongest * 0.45);
      });
      if (!source) continue;
      const target = this.adjacent(source).filter(city => city.owner !== ruler)
        .sort((a, b) => this.totalTroops(a) - this.totalTroops(b))[0];
      if (!target) continue;
      const commander = this.availableGenerals(source.id, 'battle').sort((a, b) => b.troops - a.troops)[0];
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
          const chance = clamp(50 + general.intelligence - captive.intelligence - Math.floor(captive.loyalty / 3), 10, 80);
          if (Math.random() * 100 < chance) {
            captive.owner = city.owner;
            captive.status = 'active';
            captive.formerOwner = null;
            captive.loyalty = 40 + Math.floor(Math.random() * 41);
            events.push({ type: 'general', ruler: city.owner, cityId: city.id, text: `${city.owner}在${city.name}招降${captive.name}。` });
          } else captive.loyalty = Math.max(0, captive.loyalty - Math.max(1, Math.floor(captive.loyalty / 10)));
        } else if (type === 'search') {
          const outcome = Math.floor(Math.random() * 4);
          if (outcome === 1 && free.length && Math.floor(Math.random() * 150) < general.intelligence) {
            const found = free[Math.floor(Math.random() * free.length)];
            found.owner = city.owner;
            found.status = 'active';
            found.formerOwner = null;
            found.loyalty = 70 + Math.floor(Math.random() * 30);
            events.push({ type: 'general', ruler: city.owner, cityId: city.id, text: `${city.owner}在${city.name}寻得${found.name}。` });
          } else if (outcome === 2 || outcome === 3) {
            const amount = 10 + Math.floor(Math.random() * Math.max(1, general.intelligence * 2));
            if (outcome === 2) city.money += amount;
            else city.food += amount;
          }
        }
      }
    }
    return events;
  }

  startBattle(fromId, toId, personIds) {
    const source = this.city(fromId), target = this.city(toId);
    if (!source || !target || source.owner !== this.player || target.owner === this.player) throw new Error('出征目标无效');
    if (this.battle || this.state.winner) throw new Error('当前无法出征');
    if (!this.adjacent(source).includes(target)) throw new Error('只能进攻相邻城池');
    if (!Array.isArray(personIds)) throw new Error('请选择出征武将');
    const uniqueIds = [...new Set(personIds)];
    if (!uniqueIds.length || uniqueIds.length > 3 || uniqueIds.length !== personIds.length) throw new Error('请选择 1 至 3 名出征武将');
    const available = this.availableGenerals(source.id, 'battle');
    const selected = uniqueIds.map(id => available.find(general => general.id === id));
    if (selected.some(general => !general)) throw new Error('所选武将本月无法出征');
    const makeUnits = (city, side) => {
      const generals = side === 'player' ? selected : city.owner ? city.generals.filter(g => g.owner === city.owner && g.troops > 0).sort((a, b) => b.troops - a.troops).slice(0, 3) : [];
      const commanders = generals.length ? generals : city.troops > 0 ? [{ name: '守城军', force: 55, id: null, troops: city.troops }] : [];
      return commanders.map((g, index) => ({
        id: `${side}-${index}`, personId: g.id, name: g.name, side,
        force: g.force, troops: g.troops,
        x: side === 'player' ? 1 : 7, y: 1 + index * 2, acted: false
      }));
    };
    for (const general of selected) {
      general.stamina -= ORDER_RULES.battle.stamina;
      this.orders.push({ type: 'battle', cityId: source.id, personId: general.id, personName: general.name, resolved: true });
    }
    this.state.battle = {
      fromId: source.id, toId: target.id, targetOwner: target.owner,
      turn: 1, units: [...makeUnits(source, 'player'), ...makeUnits(target, 'enemy')],
      message: `从${source.name}进攻${target.name}。选择己方部队，再选择格子移动或攻击。`
    };
    this.finishBattleIfNeeded();
  }

  battleAction(unitId, x, y) {
    const battle = this.battle;
    const unit = battle?.units.find(item => item.id === unitId && item.side === 'player' && item.troops > 0);
    if (!unit || unit.acted) throw new Error('请选择本回合尚未行动的己方部队');
    const distance = Math.abs(unit.x - x) + Math.abs(unit.y - y);
    const target = battle.units.find(item => item.x === x && item.y === y && item.troops > 0);
    if (target?.side === 'enemy' && distance === 1) {
      this.hit(unit, target);
      battle.message = `${unit.name}攻击${target.name}，敌军剩余 ${target.troops}。`;
    } else if (!target && x >= 0 && x < 9 && y >= 0 && y < 7 && distance > 0 && distance <= 2) {
      unit.x = x; unit.y = y;
      battle.message = `${unit.name}移动到 (${x + 1}, ${y + 1})。`;
    } else throw new Error('请选择两格内空地，或相邻敌军');
    unit.acted = true;
    this.finishBattleIfNeeded();
    if (this.battle && this.battle.units.filter(item => item.side === 'player' && item.troops > 0).every(item => item.acted)) this.endBattleTurn();
  }

  hit(attacker, defender) {
    const forest = (defender.x * 3 + defender.y * 5) % 7 === 0;
    const damage = Math.max(80, Math.floor((attacker.force * 2.8 + attacker.troops * 0.28) * (forest ? 0.8 : 1)));
    defender.troops = Math.max(0, defender.troops - damage);
  }

  endBattleTurn() {
    const battle = this.battle;
    if (!battle) return;
    for (const enemy of battle.units.filter(unit => unit.side === 'enemy' && unit.troops > 0)) {
      const players = battle.units.filter(unit => unit.side === 'player' && unit.troops > 0);
      if (!players.length) break;
      const target = players.sort((a, b) =>
        (Math.abs(enemy.x - a.x) + Math.abs(enemy.y - a.y)) - (Math.abs(enemy.x - b.x) + Math.abs(enemy.y - b.y)))[0];
      const distance = Math.abs(enemy.x - target.x) + Math.abs(enemy.y - target.y);
      if (distance === 1) this.hit(enemy, target);
      else {
        const options = [[enemy.x - 1, enemy.y], [enemy.x, enemy.y - 1], [enemy.x, enemy.y + 1], [enemy.x + 1, enemy.y]]
          .filter(([x, y]) => x >= 0 && x < 9 && y >= 0 && y < 7 && !battle.units.some(unit => unit.troops > 0 && unit.x === x && unit.y === y));
        options.sort((a, b) => (Math.abs(a[0] - target.x) + Math.abs(a[1] - target.y)) - (Math.abs(b[0] - target.x) + Math.abs(b[1] - target.y)));
        if (options[0]) [enemy.x, enemy.y] = options[0];
      }
      if (this.finishBattleIfNeeded()) return;
    }
    battle.turn++;
    battle.units.forEach(unit => { unit.acted = false; });
    battle.message = `第 ${battle.turn} 回合。己方部队可以行动。`;
  }

  finishBattleIfNeeded() {
    const battle = this.battle;
    if (!battle) return true;
    const players = battle.units.filter(unit => unit.side === 'player' && unit.troops > 0);
    const enemies = battle.units.filter(unit => unit.side === 'enemy' && unit.troops > 0);
    if (players.length && enemies.length) return false;
    const source = this.city(battle.fromId), target = this.city(battle.toId);
    for (const unit of battle.units) {
      const city = unit.side === 'player' ? source : target;
      if (unit.personId) {
        const general = city.generals.find(person => person.id === unit.personId);
        if (general) general.troops = unit.troops;
      } else if (unit.side === 'enemy') target.troops = unit.troops;
    }
    if (players.length) {
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
      this.log(`我军攻占${target.name}，参战武将余兵 ${players.reduce((sum, unit) => sum + unit.troops, 0)}。`);
    } else {
      for (const unit of battle.units.filter(item => item.side === 'player' && item.personId)) {
        const index = source.generals.findIndex(general => general.id === unit.personId);
        if (index < 0) continue;
        const [general] = source.generals.splice(index, 1);
        this.captureGeneral(general);
        general.cityId = target.id;
        target.generals.push(general);
      }
      this.log(`进攻${target.name}失利，参战武将被俘，守军余兵 ${enemies.reduce((sum, unit) => sum + unit.troops, 0)}。`);
    }
    this.state.battle = null;
    this.checkWinner();
    return true;
  }

  retreat() {
    const battle = this.battle;
    if (!battle) return;
    const source = this.city(battle.fromId);
    const target = this.city(battle.toId);
    for (const unit of battle.units) {
      const city = unit.side === 'player' ? source : target;
      if (unit.personId) {
        const general = city.generals.find(person => person.id === unit.personId);
        if (general) general.troops = unit.side === 'player' ? Math.floor(unit.troops * 0.8) : unit.troops;
      } else if (unit.side === 'enemy') target.troops = unit.troops;
    }
    this.state.battle = null;
    this.log(`我军从${target.name}撤退，回到${source.name}。`);
  }

  checkWinner() {
    if (!this.ownedCities().length) this.state.winner = 'defeat';
    else if (this.cities.every(city => city.owner === this.player)) this.state.winner = 'victory';
  }
}
