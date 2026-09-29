import { loadCatalog } from './game/GameData.js';
import { GameModel, ORDER_RULES } from './game/GameModel.js';
import { CITY_ROUTES, WORLD_MAP_POSITIONS, WORLD_MAP_SIZE, WORLD_ROUTE_PATHS } from './game/MapData.js';
import { listSlots, readSlot, writeSlot, parseImport, exportSlot } from './game/SaveStore.js';

const NAMES = ['董卓弄权', '曹操崛起', '赤壁之战', '三国鼎立'];
const app = document.getElementById('app');
const ui = { screen: 'menu', commandMenu: null, confirmMonth: false, pendingOrder: null, pendingDistribution: null, report: null, worldReport: null, worldReportIndex: 0, worldReportFromHistory: false, saveMenu: false, saveConfirm: null, importPreview: null, importSlot: null, catalog: null, scenario: 0, ruler: null, game: null, cityId: null, unitId: null, toast: '' };
let renderedScreen = null;
const safe = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const fmt = value => Number(value || 0).toLocaleString('zh-CN');
const maxRecruitAmount = (city, count = 1) => Math.min(city.loyalty * 20, Math.floor(city.money / Math.max(1, count)) * 10);
const btn = (label, action, style = '', disabled = false) => `<button class="button ${style}" data-action="${action}" ${disabled ? 'disabled' : ''}>${label}</button>`;
const MAP_LANDMARKS = new Set(['北平', '邺', '长安', '洛阳', '汉中', '成都', '襄阳', '建业', '长沙']);
const FACTION_COLORS = ['#d8a966', '#92baca', '#d98f78', '#b5a3cf', '#b3c77c', '#d2a5bd', '#8cc6aa', '#c7ad8b', '#91a9d4', '#c7b66f'];

function menu() {
  return `<main class="entry"><div class="seal">漢</div><div class="eyebrow">THREE KINGDOMS · STRATEGY</div>
    <h1>三国<span>霸业</span></h1><p>执一方之印，经营城池，招揽名将，逐鹿天下。</p>
    <div class="entry-buttons">${btn('开创霸业 ↗', 'new', 'primary')}${btn('继续征途', 'load', '', !listSlots().some(item => item.save))}${btn('导入战局', 'open-saves', 'quiet')}</div>
    <small>重构预览 · 战略、内政、出征与战棋已接通</small></main>${saveManager()}`;
}

function scenarios() {
  return `<main class="selection"><div class="selection-top">${btn('← 返回', 'menu', 'quiet')}<span>第一步 / 选择时代</span></div>
    <div class="eyebrow">乱世篇章</div><h1>选择一个<span>历史剧本</span></h1>
    <div class="scenario-grid">${ui.catalog.scenarios.map((s, id) => `<button class="scenario-card ${ui.scenario === id ? 'selected' : ''}" data-action="scenario" data-id="${id}">
      <span>0${id + 1}</span><small>${s.year} 年</small><strong>${NAMES[id] || `剧本 ${id + 1}`}</strong>
      <em>${s.rulers.length} 方势力 · ${s.cities.length} 座城池</em><b>↗</b></button>`).join('')}</div>
    <div class="selection-bottom">${btn('选择君主 →', 'rulers', 'primary')}</div></main>`;
}

function rulers() {
  const s = ui.catalog.scenarios[ui.scenario];
  return `<main class="selection"><div class="selection-top">${btn('← 返回', 'scenarios', 'quiet')}<span>第二步 / 选择君主</span></div>
    <div class="eyebrow">${NAMES[ui.scenario]} · ${s.year} 年</div><h1>选择你的<span>势力</span></h1>
    <div class="ruler-grid">${s.rulers.map(ruler => {
      const cities = s.cities.filter(city => city.owner === ruler);
      return `<button class="ruler-card ${ui.ruler === ruler ? 'selected' : ''}" data-action="ruler" data-ruler="${safe(ruler)}">
        <i>${safe(ruler.slice(0, 1))}</i><strong>${safe(ruler)}</strong><small>${cities.length} 城 · ${cities.reduce((n, c) => n + c.generals.filter(g => g.owner === ruler).length, 0)} 将</small>
        <span>${safe(cities.slice(0, 3).map(c => c.name).join('、'))}</span></button>`;
    }).join('')}</div><div class="selection-bottom">${btn('进入乱世 →', 'start', 'primary', !ui.ruler)}</div></main>`;
}

function map(game) {
  const selected = game.city(ui.cityId);
  const neighbors = new Set(selected ? game.adjacent(selected).map(city => city.name) : []);
  const recent = new Set(game.worldHistory[0]?.events.filter(event => event.type === 'capture').map(event => event.cityId) || []);
  const rulers = ui.catalog.scenarios[game.state.scenarioId].rulers;
  const positions = WORLD_MAP_POSITIONS;
  const routes = CITY_ROUTES.map(([a, b], index) => {
    const [x1, y1] = positions[a], [x2, y2] = positions[b];
    const linked = selected && (a === selected.name || b === selected.name);
    const destination = a === selected?.name ? game.cities.find(city => city.name === b) : b === selected?.name ? game.cities.find(city => city.name === a) : null;
    const bend = (index % 2 ? 1 : -1) * Math.min(9, Math.hypot(x2 - x1, y2 - y1) / 10);
    const middleX = (x1 + x2) / 2 - (y2 - y1) / Math.hypot(x2 - x1, y2 - y1) * bend;
    const middleY = (y1 + y2) / 2 + (x2 - x1) / Math.hypot(x2 - x1, y2 - y1) * bend;
    const path = WORLD_ROUTE_PATHS[`${a}:${b}`] || `M${x1} ${y1} Q${middleX.toFixed(1)} ${middleY.toFixed(1)} ${x2} ${y2}`;
    const canAttack = selected?.owner === game.player && game.availableGenerals(selected.id, 'battle').length && destination?.owner !== game.player;
    return `<path class="world-route ${linked ? canAttack ? 'attack' : 'linked' : ''}" d="${path}"/>`;
  }).join('');
  const cities = game.cities.map(c => {
    const [x, y] = positions[c.name];
    const kind = c.owner === game.player ? 'friendly' : c.owner ? 'hostile' : 'neutral';
    const visible = MAP_LANDMARKS.has(c.name) || selected?.id === c.id || neighbors.has(c.name);
    const color = c.owner ? FACTION_COLORS[rulers.indexOf(c.owner) % FACTION_COLORS.length] || '#b7b6a2' : '#a8afa3';
    const style = `left:${x / WORLD_MAP_SIZE.width * 100}%;top:${y / WORLD_MAP_SIZE.height * 100}%;--faction:${color}`;
    const labelClass = `${y > 250 ? 'above' : ''} ${x > 315 ? 'edge-right' : ''} ${x < 45 ? 'edge-left' : ''}`;
    return `<button class="map-city ${kind} ${selected?.id === c.id ? 'selected' : ''} ${neighbors.has(c.name) ? 'neighbor' : ''} ${recent.has(c.id) ? 'recent' : ''}" data-action="city" data-id="${c.id}" style="${style}" title="${safe(c.name)} · ${safe(c.owner || '无主')}" aria-label="${safe(c.name)}，${safe(c.owner || '无主城')}"><i></i></button>${visible ? `<span class="map-city-label ${labelClass} ${selected?.id === c.id ? 'selected' : ''}" style="${style}">${safe(c.name)}</span>` : ''}`;
  }).join('');
  return `<div class="map-outer"><div class="map-surface" data-action="map-pick" role="group" aria-label="天下地图，点击城池选中">
    <svg class="world-map-art" viewBox="0 0 360 300" preserveAspectRatio="none" aria-hidden="true">
      <path class="world-land" d="M10 45 Q35 12 90 31 Q115 13 160 29 Q200 31 235 18 Q277 4 344 15 L353 255 Q339 291 285 296 Q225 289 191 298 L110 288 Q72 296 17 279 Q5 206 13 147 Z"/>
      <path class="world-river" d="M44 165 Q89 145 119 158 T194 195 Q230 207 268 197 T353 211"/>
      <path class="world-mountain" d="M19 105 L43 92 L52 103 L68 84 L88 100 M79 177 L93 164 L106 178 L120 167 L133 182 M137 235 L150 224 L164 237"/>
      <text x="28" y="118">西北</text><text x="222" y="35">河北</text><text x="171" y="155">中原</text><text x="40" y="246">巴蜀</text><text x="179" y="240">荆楚</text><text x="291" y="230">江东</text>
      <g class="world-routes">${routes}</g>
    </svg>${cities}<div class="map-compass">北 ↑</div>
  </div></div>`;
}

function meter(label, value, max) {
  return `<div class="meter"><div><span>${label}</span><strong>${fmt(value)} <small>/ ${fmt(max)}</small></strong></div><i><b style="width:${Math.min(100, Math.max(0, value / (max || 1) * 100))}%"></b></i></div>`;
}

function orderPicker(game) {
  const pending = ui.pendingOrder;
  if (!pending) return '';
  const city = game.city(pending.cityId);
  const rule = ORDER_RULES[pending.type];
  const ranked = game.rankedGenerals(city.id, pending.type, { targetId: pending.targetId });
  const availableCount = ranked.filter(item => item.available).length;
  const destination = pending.type === 'battle' ? ` · 目标 ${safe(game.city(pending.targetId)?.name)}` : pending.type === 'surrender' ? ` · 目标 ${safe(city.generals.find(g => g.id === pending.targetId)?.name || '')}` : '';
  const selectedCount = pending.selectedIds.length;
  const maxRecruit = pending.type === 'recruit' ? maxRecruitAmount(city, selectedCount) : 0;
  const recruitAmount = pending.recruitAmount || 0;
  const totalCost = pending.type === 'recruit' ? recruitAmount / 10 * selectedCount : selectedCount * rule.money;
  const canAfford = city.money >= totalCost && (pending.type !== 'recruit' || recruitAmount >= 10 && recruitAmount <= maxRecruit && recruitAmount % 10 === 0);
  const recruitOptions = pending.type === 'recruit' ? [...new Set([100, 500, 1000, maxRecruit].filter(amount => amount >= 10 && amount <= maxRecruit))] : [];
  return `<div class="order-overlay"><div class="order-dialog" role="dialog" aria-modal="true" aria-labelledby="order-title">
    <div class="order-dialog-head"><div><span class="eyebrow">${safe(city.name)}${destination}</span><h2 id="order-title">${safe(rule.label)} · 选择武将</h2></div><button data-action="cancel-order" aria-label="关闭选将面板">×</button></div>
    <p>${pending.type === 'battle' ? '选择 1 至 3 名武将带兵出征。' : pending.type === 'surrender' ? '选择一名武将在月末劝降这名俘虏。' : '可勾选多名武将分别执行这项命令。'}每名武将本月只能接一项任务，各消耗 ${rule.stamina} 体力。</p>
    <div class="order-person-list"><div class="order-rank-heading">可接令 ${availableCount} 人 · 按本指令适配度排序</div>${ranked.map(({ general, available, reason }, index) => `${index === availableCount ? `<div class="order-rank-heading unavailable">本月不可接令 ${ranked.length - availableCount} 人</div>` : ''}<button class="order-person ${pending.selectedIds.includes(general.id) ? 'selected' : ''}" data-action="choose-general" data-id="${safe(general.id)}" ${available ? '' : 'disabled'}><span class="person-avatar">${safe(general.name.slice(0, 1))}</span><span><strong>${safe(general.name)}${index === 0 && available ? '<em>推荐</em>' : ''}</strong><small>武 ${general.force} · 智 ${general.intelligence} · 体力 ${general.stamina} · 带兵 ${fmt(general.troops)}</small><small class="order-fit">${safe(reason)}</small></span><b>${available ? pending.selectedIds.includes(general.id) ? '✓' : '+' : '—'}</b></button>`).join('')}</div>
    ${pending.type === 'recruit' ? `<div class="recruit-amount"><label>每名武将征兵 <input data-recruit-input type="number" inputmode="numeric" min="10" max="${maxRecruit}" step="10" value="${recruitAmount}"> 人</label><small>默认填入当前最大值 ${fmt(maxRecruit)} 人；民忠上限 ${fmt(city.loyalty * 20)} 人，每 10 兵花 1 金</small><div>${recruitOptions.map(amount => `<button data-action="recruit-amount" data-amount="${amount}" class="${recruitAmount === amount ? 'selected' : ''}">${amount === maxRecruit ? `最多 ${fmt(amount)}` : fmt(amount)}</button>`).join('')}</div></div>` : ''}
    <div class="order-cost ${canAfford ? '' : 'insufficient'}">已选 ${selectedCount} 将${pending.type === 'recruit' ? ` · 共征 ${fmt(recruitAmount * selectedCount)} 兵` : ''} · 共需 ${fmt(totalCost)} 金${canAfford ? '' : ` · 当前只有 ${fmt(city.money)} 金或兵量超限`}</div>
    <div class="order-dialog-actions">${btn('取消', 'cancel-order', 'quiet')}${btn(pending.type === 'battle' ? `确认出征（${pending.selectedIds.length} 将）` : `确认${rule.label}（${pending.selectedIds.length} 将）`, 'submit-order', 'primary', !pending.selectedIds.length || !canAfford)}</div>
  </div></div>`;
}

function reportDialog(game) {
  if (!ui.report) return '';
  return `<div class="report-overlay"><div class="report-dialog" role="dialog" aria-modal="true" aria-labelledby="report-title">
    <div class="eyebrow">${safe(ui.report.period || `${game.state.year} 年 ${game.state.month} 月`)}</div><h2 id="report-title">${safe(ui.report.title)}</h2>
    <div class="report-dialog-list">${ui.report.items.map(report => `<div><span>${safe(report.personName.slice(0, 1))}</span><section><small>${safe(game.city(report.cityId)?.name || '')} · ${safe(ORDER_RULES[report.type]?.label || report.type)}</small><strong>${safe(report.personName)}</strong><p>${safe(report.result)}</p></section></div>`).join('')}</div>
    ${btn('知道了', 'close-report', 'primary')}</div></div>`;
}

function worldPlaybackCards(world) {
  const cards = (world.events || []).filter(event => ['capture', 'general', 'famine'].includes(event.type)).map(event => ({
    type: event.type,
    title: event.type === 'capture' ? '城池易主' : event.type === 'general' ? '人才归附' : '粮草告急',
    text: event.text
  }));
  for (const report of world.reports || []) cards.push({
    type: 'report', title: `${ORDER_RULES[report.type]?.label || '武将'}回报`,
    text: `${report.personName}：${report.result}`
  });
  return cards.length ? cards : [{ type: 'peace', title: '天下暂安', text: '本月没有城池易主、人才归附或粮草危机。各方休养生息。' }];
}

function worldReportDialog() {
  const world = ui.worldReport;
  if (!world) return '';
  const cards = worldPlaybackCards(world);
  const index = Math.min(ui.worldReportIndex, cards.length - 1);
  const card = cards[index];
  const symbol = { capture: '城', general: '将', famine: '粮', report: '令', peace: '月' }[card.type];
  return `<div class="world-report-overlay"><div class="world-report-dialog" role="dialog" aria-modal="true" aria-labelledby="world-report-title">
    <div class="world-report-period">${world.year} 年 ${world.month} 月 · 天下纪事</div>
    <div class="world-report-emblem ${card.type}">${symbol}</div>
    <div class="world-report-count">第 ${index + 1} 件 / 共 ${cards.length} 件</div>
    <h2 id="world-report-title">${safe(card.title)}</h2>
    <p>${safe(card.text)}</p>
    <div class="world-report-progress"><i style="width:${(index + 1) / cards.length * 100}%"></i></div>
    <button class="world-report-done" data-action="next-world-event">${index + 1 < cards.length ? '下一件 →' : ui.worldReportFromHistory ? '返回军情 →' : '进入下月 →'}</button>
  </div></div>`;
}

function showBattleReport(targetId, retreated = false) {
  const target = ui.game.city(targetId);
  if (!retreated && target.owner === ui.game.player) ui.cityId = targetId;
  ui.report = { title: retreated ? '撤军回报' : target.owner === ui.game.player ? '攻城捷报' : '攻城失利',
    items: [{ type: 'battle', cityId: targetId, personName: '军情', result: ui.game.state.messages[0] || `${target.name}战事结束。` }] };
}

function distributionDialog(game) {
  const pending = ui.pendingDistribution;
  if (!pending) return '';
  const city = game.city(pending.cityId);
  const general = city.generals.find(person => person.id === pending.personId);
  const max = Math.min(game.maxTroops(general), city.troops + general.troops);
  return `<div class="report-overlay"><div class="report-dialog distribution-dialog" role="dialog" aria-modal="true" aria-labelledby="distribution-title">
    <div class="eyebrow">${safe(city.name)} · 后备兵 ${fmt(city.troops)}</div><h2 id="distribution-title">为${safe(general.name)}分配兵力</h2>
    <p>当前带兵 ${fmt(general.troops)}，已默认填入目前可分配的最大兵数 ${fmt(max)}。调整后，多余兵力返回城池后备兵；分配立即生效，不消耗本月行动。</p>
    <label>目标带兵 <input data-distribution-input type="number" inputmode="numeric" min="0" max="${max}" step="1" value="${pending.amount}"> 人</label>
    <div class="distribution-presets"><button data-action="distribution-amount" data-amount="0">全部归还</button><button data-action="distribution-amount" data-amount="${max}">最多 ${fmt(max)}</button></div>
    <div class="order-dialog-actions">${btn('取消', 'cancel-distribution', 'quiet')}${btn('确认分配', 'save-distribution', 'primary')}</div>
  </div></div>`;
}

function saveManager() {
  if (!ui.saveMenu) return '';
  const slots = listSlots();
  const confirmation = ui.saveConfirm;
  const preview = ui.importPreview;
  return `<div class="save-overlay"><div class="save-dialog" role="dialog" aria-modal="true" aria-labelledby="save-title">
    <div class="save-heading"><div><span class="eyebrow">战局档案</span><h2 id="save-title">保存与读取</h2></div><button data-action="close-saves" aria-label="关闭存档面板">×</button></div>
    <p>存档保存在当前浏览器。导出 JSON 文件后，可在其他浏览器导入。</p>
    ${ui.toast ? `<div class="save-message" role="status">${safe(ui.toast)}</div>` : ''}
    <div class="save-slot-list">${slots.map(({slot,save,error}) => `<section class="save-slot"><div class="save-slot-top"><strong>存档 ${slot}</strong><small>${error ? '无法读取' : save?.legacy ? '旧版存档' : save?.savedAt ? new Date(save.savedAt).toLocaleString('zh-CN') : '空位'}</small></div>
      ${save ? `<div class="save-slot-info">${safe(save.state.player)} · ${safe(NAMES[save.state.scenarioId] || '历史剧本')} · ${save.state.year} 年 ${save.state.month} 月</div>` : error ? `<div class="save-slot-info">${safe(error)}</div>` : '<div class="save-slot-info">还没有战局</div>'}
      <div class="save-slot-actions" data-slot="${slot}">${ui.game && ui.screen === 'game' ? btn(save || error ? '覆盖保存' : '保存到此', 'save-slot', 'save-action') : ''}${save ? btn('读取', 'load-slot', 'save-action') + btn('导出', 'export-slot', 'save-action') : ''}${btn('导入到此', 'import-slot', 'save-action')}</div>
      </section>`).join('')}</div>
    ${confirmation ? `<div class="save-decision"><strong>${confirmation.mode === 'save' ? `覆盖存档 ${confirmation.slot}？` : `读取存档 ${confirmation.slot}？`}</strong><p>${confirmation.mode === 'save' ? '此位置原有战局会被替换。' : '当前尚未保存的进度会丢失。'}</p><div>${btn('取消', 'cancel-save-confirm', 'quiet')}${btn('确认', 'confirm-save-action', 'primary')}</div></div>` : ''}
    ${preview ? `<div class="save-decision"><strong>导入到存档 ${preview.slot}</strong><p>${safe(preview.state.player)} · ${preview.state.year} 年 ${preview.state.month} 月。${slots[preview.slot - 1].save || slots[preview.slot - 1].error ? '此位置原有战局会被替换。' : ''}</p><div>${btn('取消', 'cancel-import', 'quiet')}${btn('确认导入', 'confirm-import', 'primary')}</div></div>` : ''}
    <input class="save-file-input" type="file" accept=".json,application/json" aria-label="选择存档文件">
  </div></div>`;
}

function commandDialog(game) {
  const group = ui.commandMenu;
  if (!group) return '';
  const city = game.city(ui.cityId);
  const friendly = city?.owner === game.player;
  const title = { domestic: '内政', personnel: '人事', military: '军备', diplomacy: '外交', cities: '选择城池', city: '城池档案', intel: '军情', targets: '选择出征目标', captives: '选择招降对象', distribution: '选择分配武将' }[group];
  const entry = (label, detail, action, id = '', disabled = false, coming = false) => `<button class="command-entry" data-action="${action}" data-id="${safe(id)}" ${disabled ? 'disabled' : ''}><span><strong>${label}</strong><small>${detail}</small></span><b>${disabled ? coming ? '待开放' : '不可用' : '›'}</b></button>`;
  const order = (type, detail, blocked = false) => entry(ORDER_RULES[type].label, detail, 'menu-order', type, !friendly || blocked || !game.availableGenerals(city.id, type).length || city.money < ORDER_RULES[type].money);
  const soon = (label, detail) => entry(label, detail, 'unavailable', '', true, true);
  let body = '';
  if (group === 'domestic') body = `${order('farm', '提升农业 · 50 金', city.farming >= city.farmingLimit)}${order('trade', '提升商业 · 50 金', city.commerce >= city.commerceLimit)}${order('govern', '提升防灾 · 50 金', city.disaster >= 100)}${order('patrol', '提升民忠与人口 · 50 金', city.loyalty >= 100 && city.population >= city.populationLimit)}${order('search', '月末寻访人才或资源')}${soon('交易', '买卖金粮')}${soon('输送', '在己方城池间调运资源')}`;
  else if (group === 'personnel') body = `${entry('招降俘虏', `${city.generals.filter(g => g.status === 'captive').length} 名俘虏 · 月末回报`, 'open-command', 'captives', !friendly || !city.generals.some(g => g.status === 'captive') || !game.availableGenerals(city.id, 'surrender').length || city.money < 100)}${soon('移动武将', '调往己方其他城池')}${soon('处斩 / 流放', '处置俘虏')}${soon('赏赐 / 没收', '需要道具系统')}${soon('宴请', '提升武将关系')}`;
  else if (group === 'military') body = `${order('recruit', '征兵进入城池后备兵', city.money < 1 || city.loyalty < 1)}${entry('分配兵力', `后备兵 ${fmt(city.troops)}`, 'open-command', 'distribution', !friendly || city.acted || !city.generals.some(g => g.owner === game.player && g.status === 'active' && !game.orderFor(g.id)))}${entry('出征', '选相邻目标，再选 1–3 名武将', 'open-command', 'targets', !friendly || !game.availableGenerals(city.id, 'battle').length || !game.adjacent(city).some(c => c.owner !== game.player))}${soon('侦察', '查看敌城详细军情')}${soon('掠夺', '获取资源但损害民忠')}`;
  else if (group === 'diplomacy') body = `${soon('离间', '降低敌方武将忠诚')}${soon('招揽', '招募敌方武将')}${soon('策反', '争取敌方武将')}${soon('反间', '原版菜单占位')}${soon('劝降', '说服敌方城池投降')}`;
  else if (group === 'cities') body = `<div class="command-city-grid">${[...game.cities].sort((a, b) => Number(b.owner === game.player) - Number(a.owner === game.player) || a.id - b.id).map(c => `<button data-action="menu-city" data-id="${c.id}" class="${c.id === city.id ? 'selected' : ''} ${c.owner === game.player ? 'friendly' : ''}"><strong>${safe(c.name)}</strong><small>${safe(c.owner || '无主')}</small></button>`).join('')}</div>`;
  else if (group === 'city') body = `<div class="command-stats">${meter('农业', city.farming, city.farmingLimit)}${meter('商业', city.commerce, city.commerceLimit)}${meter('人口', city.population, city.populationLimit)}${meter('民忠', city.loyalty, 100)}${meter('防灾', city.disaster, 100)}</div><div class="command-detail-title">驻城武将</div>${city.generals.filter(g => g.owner === city.owner && g.status === 'active').map(g => entry(g.name, `武 ${g.force} · 智 ${g.intelligence} · 体力 ${g.stamina} · 带兵 ${fmt(g.troops)}`, 'menu-distribute-general', g.id, !friendly || city.acted || !!game.orderFor(g.id))).join('') || '<p class="command-empty">暂无驻城武将</p>'}<div class="command-detail-title">本月已下令</div>${game.orders.filter(o => o.cityId === city.id).map(o => `<p class="command-log">${safe(o.personName)} · ${safe(ORDER_RULES[o.type]?.label || o.type)}：${safe(o.result || '月末结算')}</p>`).join('') || '<p class="command-empty">还没有下令</p>'}`;
  else if (group === 'intel') body = `<div class="command-detail-title">本月待办</div>${game.ownedCities().filter(c => game.availableCount(c.id)).map(c => entry(c.name, `${game.availableCount(c.id)} 将可接令 · ${fmt(c.money)} 金`, 'menu-city', c.id)).join('') || '<p class="command-empty">本月可用武将都已接令</p>'}<div class="command-detail-title">回看月末播报</div>${game.worldHistory.slice(0, 12).map((world, index) => entry(`${world.year} 年 ${world.month} 月`, `${worldPlaybackCards(world).length} 件纪事 · 点击重播`, 'open-world-report', index)).join('') || '<p class="command-empty">结束本月后，重要事件会逐件播报。</p>'}<div class="command-detail-title">最新武将回报</div>${game.reports.slice(0, 12).map(r => `<p class="command-log"><small>${r.year} 年 ${r.month} 月 · ${safe(game.city(r.cityId)?.name)}</small><strong>${safe(r.personName)} · ${safe(ORDER_RULES[r.type]?.label || r.type)}</strong>${safe(r.result)}</p>`).join('') || '<p class="command-empty">暂无回报</p>'}<div class="command-detail-title">近期军情</div>${game.state.messages.map(m => `<p class="command-log">${safe(m)}</p>`).join('')}`;
  else if (group === 'targets') body = game.adjacent(city).filter(c => c.owner !== game.player).map(c => entry(c.name, `${safe(c.owner || '无主')} · ${fmt(game.totalTroops(c))} 兵`, 'menu-battle-target', c.id)).join('') || '<p class="command-empty">没有可出征的相邻城池</p>';
  else if (group === 'captives') body = city.generals.filter(g => g.status === 'captive').map(g => entry(g.name, `原属 ${safe(g.formerOwner || '未知')} · 忠诚 ${g.loyalty}`, 'menu-surrender-target', g.id, game.orders.some(o => o.type === 'surrender' && o.targetId === g.id))).join('') || '<p class="command-empty">本城没有俘虏</p>';
  else if (group === 'distribution') body = city.generals.filter(g => g.owner === game.player && g.status === 'active').map(g => entry(g.name, `带兵 ${fmt(g.troops)} / ${fmt(game.maxTroops(g))}`, 'menu-distribute-general', g.id, city.acted || !!game.orderFor(g.id))).join('') || '<p class="command-empty">本城没有可分配的武将</p>';
  return `<div class="command-overlay"><div class="command-dialog" role="dialog" aria-modal="true" aria-labelledby="command-title"><div class="command-head">${['targets', 'distribution', 'captives'].includes(group) ? '<button class="command-back" data-action="command-back" aria-label="返回上级">‹</button>' : ''}<div><small>${safe(city.name)} · ${safe(city.owner || '无主')}</small><h2 id="command-title">${title}</h2></div><button data-action="close-command" aria-label="关闭面板">×</button></div><div class="command-body ${['domestic', 'personnel', 'military', 'diplomacy'].includes(group) ? 'menu-grid' : ''}">${body}</div></div></div>`;
}

function gameScreen() {
  const g = ui.game, s = g.state;
  const city = g.city(ui.cityId) || g.ownedCities()[0] || g.cities[0];
  ui.cityId = city.id;
  const friendly = city.owner === g.player;
  return `<div class="game-shell play-shell"><header class="game-header play-header"><div class="brand"><i>漢</i><div><strong>${safe(g.player)}的霸业</strong><small>${NAMES[s.scenarioId]} · ${s.year} 年 ${s.month} 月</small></div></div><button class="play-icon-button" data-action="save" aria-label="存档">存档</button></header>
    <main class="play-stage"><div class="play-map-head"><span>天下形势 · 38 城全图</span><button data-action="open-command" data-id="cities">选城 ▾</button></div><div class="play-map">${map(g)}</div>
      <div class="play-city-card"><div class="play-city-main"><div><small>${friendly ? '我方城池' : city.owner ? '他方城池' : '无主城池'}</small><strong>${safe(city.name)}</strong><span>${safe(city.owner || '无主')} · ${fmt(g.totalTroops(city))} 兵</span></div><button data-action="open-command" data-id="city">详情 ›</button></div>
        <div class="play-resources"><span>金 <b>${fmt(city.money)}</b></span><span>粮 <b>${fmt(city.food)}</b></span><span>后备兵 <b>${fmt(city.troops)}</b></span><span>可接令 <b>${friendly ? g.availableCount(city.id) : '—'}</b></span></div></div>
      <div class="play-command-grid"><button data-action="open-command" data-id="domestic" ${friendly ? '' : 'disabled'}><i>田</i><span>内政</span></button><button data-action="open-command" data-id="personnel" ${friendly ? '' : 'disabled'}><i>将</i><span>人事</span></button><button data-action="open-command" data-id="military" ${friendly ? '' : 'disabled'}><i>兵</i><span>军备</span></button><button data-action="open-command" data-id="diplomacy" ${friendly ? '' : 'disabled'}><i>策</i><span>外交</span></button></div>
    </main><footer class="play-footer"><button data-action="open-command" data-id="intel">军情 <b>${g.reports.length}</b></button><button data-action="month" class="play-end-month">结束本月 <span>→</span></button></footer>
    ${commandDialog(g)}${orderPicker(g)}${distributionDialog(g)}${reportDialog(g)}${worldReportDialog()}${saveManager()}
    ${ui.confirmMonth ? `<div class="month-overlay"><div class="month-dialog" role="dialog" aria-modal="true" aria-labelledby="month-title"><span class="eyebrow">月末结算</span><h2 id="month-title">进入下一月？</h2><p>${g.ownedCities().reduce((count, c) => count + g.availableCount(c.id), 0) ? `还有 ${g.ownedCities().reduce((count, c) => count + g.availableCount(c.id), 0)} 名武将未接令。` : '本月可用武将都已接令。'}结束后将结算寻访与招降、恢复武将可用状态，并推进月份。</p><div>${btn('再想想', 'cancel-month', 'quiet')}${btn('确认结束本月', 'confirm-month', 'primary')}</div></div></div>` : ''}
    ${s.winner ? `<div class="result"><div><span>天下大势</span><h2>${s.winner === 'victory' ? '一统天下' : '霸业未竟'}</h2>${btn('返回首页', 'menu', 'primary')}</div></div>` : ''}</div>`;
}

function battleScreen() {
  const g = ui.game, b = g.battle;
  if (!b) { ui.screen = 'game'; return gameScreen(); }
  const from = g.city(b.fromId), to = g.city(b.toId);
  const chosen = b.units.find(u => u.id === ui.unitId && u.troops > 0);
  const tiles = Array.from({ length: 63 }, (_, i) => {
    const x = i % 9, y = Math.floor(i / 9), unit = b.units.find(u => u.troops > 0 && u.x === x && u.y === y);
    const forest = (x * 3 + y * 5) % 7 === 0, distance = chosen ? Math.abs(chosen.x - x) + Math.abs(chosen.y - y) : 99;
    const available = chosen && !chosen.acted && (unit?.side === 'enemy' ? distance === 1 : !unit && distance > 0 && distance <= 2);
    return `<button class="tile ${forest ? 'forest' : ''} ${available ? 'reachable' : ''} ${unit?.side || ''} ${chosen?.id === unit?.id ? 'selected' : ''}" data-action="tile" data-x="${x}" data-y="${y}" title="${unit ? safe(unit.name) + ' · ' + fmt(unit.troops) + ' 兵' : forest ? '林地：守军减伤' : '平地'}">${unit ? `<b>${safe(unit.name.slice(0, 1))}</b><small>${fmt(unit.troops)}</small>` : forest ? '<span>♠</span>' : ''}</button>`;
  }).join('');
  return `<div class="battle-shell"><header class="battle-header"><div><div class="eyebrow">战场 / TACTICAL BATTLE</div><h1>${safe(from.name)} <span>→</span> ${safe(to.name)}</h1></div><strong>第 ${b.turn} 回合</strong></header>
    <main class="battle-layout"><div class="battle-main"><div class="battle-status">${safe(b.message)}</div><div class="battle-grid">${tiles}</div><p>选择蓝色部队，再点击高亮格子移动或攻击。林地能减轻伤害。</p></div>
    <aside class="battle-side"><div class="eyebrow">交战双方</div><h3>我军 · ${safe(g.player)}</h3>
      ${b.units.filter(u => u.side === 'player').map(u => `<button class="unit-item ${ui.unitId === u.id ? 'selected' : ''}" data-action="unit" data-id="${u.id}" ${u.troops <= 0 ? 'disabled' : ''}><span>${safe(u.name)}</span><strong>${fmt(u.troops)}</strong>${u.acted ? '<small>已行动</small>' : ''}</button>`).join('')}
      <h3>守军 · ${safe(to.owner || '无主')}</h3>${b.units.filter(u => u.side === 'enemy').map(u => `<div class="unit-item enemy"><span>${safe(u.name)}</span><strong>${fmt(u.troops)}</strong></div>`).join('')}
      <div class="battle-actions">${btn('结束战斗回合 →', 'battle-turn', 'primary')}${btn('撤军', 'retreat', 'quiet')}</div></aside></main></div>`;
}

function render() {
  if (!ui.catalog) return;
  document.body.classList.toggle('playing', ui.screen === 'game');
  const orderScrollY = app.querySelector('.order-person-list')?.scrollTop ?? 0;
  const view = { menu, scenarios, rulers, game: gameScreen, battle: battleScreen }[ui.screen] || menu;
  app.innerHTML = view() + (ui.toast ? `<div class="toast" role="status">${safe(ui.toast)}</div>` : '');
  const newOrderList = app.querySelector('.order-person-list');
  if (newOrderList) newOrderList.scrollTop = orderScrollY;
  if (renderedScreen !== ui.screen) window.scrollTo(0, 0);
  renderedScreen = ui.screen;
}

function loadSlot(slot) {
  const save = readSlot(slot);
  if (!save) throw new Error('此位置尚无存档');
  ui.game = GameModel.restore(save.state);
  ui.cityId = ui.game.ownedCities()[0]?.id ?? 0;
  ui.commandMenu = null;
  ui.pendingOrder = null;
  ui.pendingDistribution = null;
  ui.report = null;
  ui.worldReport = null;
  ui.worldReportIndex = 0;
  ui.worldReportFromHistory = false;
  ui.saveMenu = false;
  ui.saveConfirm = null;
  ui.importPreview = null;
  ui.screen = ui.game.battle ? 'battle' : 'game';
  ui.toast = '';
  render();
}

app.addEventListener('click', event => {
  const t = event.target.closest('[data-action]');
  if (!t || t.disabled) return;
  try {
    ui.toast = '';
    const a = t.dataset.action;
    if (a === 'menu') { ui.screen = 'menu'; ui.commandMenu = null; ui.confirmMonth = false; ui.pendingOrder = null; ui.pendingDistribution = null; ui.report = null; ui.worldReport = null; ui.worldReportIndex = 0; ui.worldReportFromHistory = false; ui.saveMenu = false; }
    else if (a === 'new') { ui.screen = 'scenarios'; ui.ruler = null; }
    else if (a === 'scenarios') ui.screen = 'scenarios';
    else if (a === 'scenario') { ui.scenario = Number(t.dataset.id); ui.ruler = null; }
    else if (a === 'rulers') ui.screen = 'rulers';
    else if (a === 'ruler') ui.ruler = t.dataset.ruler;
    else if (a === 'start') { ui.game = new GameModel(ui.catalog, ui.scenario, ui.ruler); ui.cityId = ui.game.ownedCities()[0]?.id ?? 0; ui.commandMenu = null; ui.pendingOrder = null; ui.pendingDistribution = null; ui.report = null; ui.worldReport = null; ui.worldReportIndex = 0; ui.worldReportFromHistory = false; ui.saveMenu = false; ui.screen = 'game'; }
    else if (a === 'load' || a === 'open-saves' || a === 'save') { ui.saveMenu = true; ui.saveConfirm = null; ui.importPreview = null; }
    else if (a === 'close-saves') { ui.saveMenu = false; ui.saveConfirm = null; ui.importPreview = null; }
    else if (['save-slot', 'load-slot', 'export-slot', 'import-slot'].includes(a)) {
      const slot = Number(t.closest('[data-slot]')?.dataset.slot);
      if (a === 'save-slot') {
        if (!ui.game || ui.game.battle) throw new Error('请在战略地图存档');
        if (listSlots()[slot - 1]?.save || listSlots()[slot - 1]?.error) ui.saveConfirm = { slot, mode: 'save' };
        else { writeSlot(slot, ui.game.state); ui.saveMenu = false; ui.toast = `战局已保存到存档 ${slot}。`; }
      } else if (a === 'load-slot') {
        if (ui.game && ui.screen === 'game') ui.saveConfirm = { slot, mode: 'load' };
        else return loadSlot(slot);
      } else if (a === 'export-slot') {
        const data = exportSlot(slot);
        const save = readSlot(slot);
        const url = URL.createObjectURL(new Blob([data], { type: 'application/json' }));
        const link = document.createElement('a');
        link.href = url;
        link.download = `三国霸业-${save.state.player}-${save.state.year}年${save.state.month}月-存档${slot}.json`;
        document.body.append(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 30000);
        ui.toast = `存档 ${slot} 已导出。`;
      } else {
        ui.importSlot = slot;
        app.querySelector('.save-file-input')?.click();
        return;
      }
    }
    else if (a === 'cancel-save-confirm') ui.saveConfirm = null;
    else if (a === 'confirm-save-action') {
      const { slot, mode } = ui.saveConfirm;
      if (mode === 'load') return loadSlot(slot);
      writeSlot(slot, ui.game.state);
      ui.saveConfirm = null;
      ui.saveMenu = false;
      ui.toast = `战局已保存到存档 ${slot}。`;
    }
    else if (a === 'cancel-import') ui.importPreview = null;
    else if (a === 'confirm-import') {
      const { slot, state } = ui.importPreview;
      writeSlot(slot, state);
      ui.importPreview = null;
      ui.saveMenu = false;
      ui.toast = `战局已导入到存档 ${slot}。`;
    }
    else if (a === 'map-pick') {
      const rect = t.getBoundingClientRect();
      const x = event.clientX - rect.left, y = event.clientY - rect.top;
      const nearest = ui.game.cities.map(city => {
        const [mapX, mapY] = WORLD_MAP_POSITIONS[city.name];
        return { city, distance: Math.hypot(x - mapX / WORLD_MAP_SIZE.width * rect.width, y - mapY / WORLD_MAP_SIZE.height * rect.height) };
      }).sort((left, right) => left.distance - right.distance)[0];
      if (nearest?.distance <= 25) ui.cityId = nearest.city.id;
    }
    else if (a === 'city' || a === 'menu-city') { ui.cityId = Number(t.dataset.id); ui.commandMenu = null; }
    else if (a === 'open-command') ui.commandMenu = t.dataset.id;
    else if (a === 'close-command') ui.commandMenu = null;
    else if (a === 'command-back') ui.commandMenu = ui.commandMenu === 'captives' ? 'personnel' : 'military';
    else if (a === 'menu-order') {
      const city = ui.game.city(ui.cityId), type = t.dataset.id;
      ui.pendingOrder = { type, cityId: city.id, selectedIds: [], returnMenu: ui.commandMenu, recruitAmount: type === 'recruit' ? maxRecruitAmount(city) : 0, recruitManual: false };
      ui.commandMenu = null;
    }
    else if (a === 'menu-battle-target') { ui.pendingOrder = { type: 'battle', cityId: ui.cityId, targetId: Number(t.dataset.id), selectedIds: [], returnMenu: 'targets' }; ui.commandMenu = null; }
    else if (a === 'menu-surrender-target') { ui.pendingOrder = { type: 'surrender', cityId: ui.cityId, targetId: t.dataset.id, selectedIds: [], returnMenu: 'captives' }; ui.commandMenu = null; }
    else if (a === 'menu-distribute-general') {
      const city = ui.game.city(ui.cityId), general = city.generals.find(person => person.id === t.dataset.id);
      ui.pendingDistribution = { cityId: city.id, personId: general.id, amount: Math.min(ui.game.maxTroops(general), city.troops + general.troops), returnMenu: ui.commandMenu };
      ui.commandMenu = null;
    }
    else if (a === 'cancel-order') { ui.commandMenu = ui.pendingOrder?.returnMenu || null; ui.pendingOrder = null; }
    else if (a === 'distribution-amount') ui.pendingDistribution.amount = Number(t.dataset.amount);
    else if (a === 'cancel-distribution') { ui.commandMenu = ui.pendingDistribution?.returnMenu || null; ui.pendingDistribution = null; }
    else if (a === 'save-distribution') {
      const pending = ui.pendingDistribution;
      const general = ui.game.city(pending.cityId).generals.find(person => person.id === pending.personId);
      const result = ui.game.distribute(pending.cityId, pending.personId, pending.amount);
      ui.pendingDistribution = null;
      ui.report = { title: '兵力分配完成', items: [{ type: '兵力分配', cityId: pending.cityId, personName: general.name, result: `带兵 ${fmt(result.before)} → ${fmt(result.after)}，城池后备兵 ${fmt(result.reserve)}。` }] };
    }
    else if (a === 'choose-general') {
      const selected = ui.pendingOrder.selectedIds;
      const id = t.dataset.id;
      if (selected.includes(id)) selected.splice(selected.indexOf(id), 1);
      else if (ui.pendingOrder.type === 'battle' && selected.length >= 3) throw new Error('最多选择 3 名出征武将');
      else if (ui.pendingOrder.type === 'surrender') selected.splice(0, selected.length, id);
      else selected.push(id);
      if (ui.pendingOrder.type === 'recruit') {
        const city = ui.game.city(ui.pendingOrder.cityId);
        const maxAmount = maxRecruitAmount(city, selected.length);
        ui.pendingOrder.recruitAmount = maxAmount >= 10 ? ui.pendingOrder.recruitManual ? Math.min(ui.pendingOrder.recruitAmount, maxAmount) : maxAmount : 0;
      }
    }
    else if (a === 'recruit-amount') { ui.pendingOrder.recruitAmount = Number(t.dataset.amount); ui.pendingOrder.recruitManual = true; }
    else if (a === 'submit-order') {
      const pending = ui.pendingOrder;
      if (!pending?.selectedIds.length) throw new Error('请选择执行武将');
      const selectedIds = ui.game.rankedGenerals(pending.cityId, pending.type, { targetId: pending.targetId })
        .filter(item => pending.selectedIds.includes(item.general.id)).map(item => item.general.id);
      if (pending.type === 'battle') { ui.game.startBattle(pending.cityId, pending.targetId, selectedIds); ui.screen = ui.game.battle ? 'battle' : 'game'; ui.unitId = null; if (!ui.game.battle) showBattleReport(pending.targetId); }
      else {
        const orders = ui.game.issueOrders(pending.cityId, pending.type, selectedIds, { recruitAmount: pending.recruitAmount, targetId: pending.targetId });
        if (pending.type === 'search' || pending.type === 'surrender') ui.toast = pending.type === 'search' ? `${orders.length} 名武将已出发寻访，结束本月后呈报结果。` : '武将已受命招降，结束本月后呈报结果。';
        else ui.report = { title: `${ORDER_RULES[pending.type].label}回报`, items: orders };
      }
      ui.pendingOrder = null;
    }
    else if (a === 'close-report') ui.report = null;
    else if (a === 'open-world-report') { ui.worldReport = ui.game.worldHistory[Number(t.dataset.id)] || null; ui.worldReportIndex = 0; ui.worldReportFromHistory = true; }
    else if (a === 'next-world-event') {
      if (ui.worldReportIndex + 1 < worldPlaybackCards(ui.worldReport).length) ui.worldReportIndex++;
      else { ui.worldReport = null; ui.worldReportIndex = 0; ui.worldReportFromHistory = false; }
    }
    else if (a === 'month') ui.confirmMonth = true;
    else if (a === 'cancel-month') ui.confirmMonth = false;
    else if (a === 'confirm-month') {
      ui.worldReport = ui.game.endMonth();
      ui.worldReportIndex = 0;
      ui.worldReportFromHistory = false;
      ui.confirmMonth = false;
    }
    else if (a === 'unit') ui.unitId = t.dataset.id;
    else if (a === 'tile') {
      const toId = ui.game.battle.toId;
      const x = Number(t.dataset.x), y = Number(t.dataset.y), occupant = ui.game.battle.units.find(u => u.troops > 0 && u.x === x && u.y === y);
      if (occupant?.side === 'player') ui.unitId = occupant.id;
      else { ui.game.battleAction(ui.unitId, x, y); ui.unitId = null; }
      if (!ui.game.battle) { ui.screen = 'game'; showBattleReport(toId); }
    } else if (a === 'battle-turn') { const toId = ui.game.battle.toId; ui.game.endBattleTurn(); ui.unitId = null; if (!ui.game.battle) { ui.screen = 'game'; showBattleReport(toId); } }
    else if (a === 'retreat') { const toId = ui.game.battle.toId; ui.game.retreat(); ui.unitId = null; ui.screen = 'game'; showBattleReport(toId, true); }
    render();
  } catch (error) { console.error('游戏交互失败', error); ui.toast = error.message; render(); }
});

app.addEventListener('change', event => {
  if (event.target.matches('.save-file-input')) {
    const file = event.target.files?.[0];
    if (!file) return;
    const slot = ui.importSlot;
    ui.importSlot = null;
    if (file.size > 3_000_000) { ui.toast = '存档文件超过 3 MB。'; render(); return; }
    file.text().then(text => {
      const imported = parseImport(text);
      ui.importPreview = { slot, state: imported.state };
      ui.saveConfirm = null;
      render();
    }).catch(error => { ui.toast = `导入失败：${error.message}`; render(); });
    return;
  }
  if (event.target.matches('[data-distribution-input]') && ui.pendingDistribution) {
    const city = ui.game.city(ui.pendingDistribution.cityId);
    const general = city.generals.find(person => person.id === ui.pendingDistribution.personId);
    const max = Math.min(ui.game.maxTroops(general), city.troops + general.troops);
    const requested = Number(event.target.value);
    ui.pendingDistribution.amount = Math.min(max, Math.max(0, Number.isFinite(requested) ? Math.floor(requested) : general.troops));
    render();
    return;
  }
  if (!event.target.matches('[data-recruit-input]') || !ui.pendingOrder || ui.pendingOrder.type !== 'recruit') return;
  const city = ui.game.city(ui.pendingOrder.cityId);
  const count = Math.max(1, ui.pendingOrder.selectedIds.length);
  const maxAmount = maxRecruitAmount(city, count);
  const requested = Math.round(Number(event.target.value) / 10) * 10;
  ui.pendingOrder.recruitAmount = maxAmount >= 10 ? Math.min(maxAmount, Math.max(10, Number.isFinite(requested) ? requested : 10)) : 0;
  ui.pendingOrder.recruitManual = true;
  render();
});

loadCatalog().then(catalog => { ui.catalog = catalog; render(); }).catch(error => {
  app.innerHTML = `<div class="load-error"><h1>剧本加载失败</h1><p>${safe(error.message)}</p><p>请通过本地开发服务器打开项目。</p></div>`;
});
