import { loadCatalog } from './game/GameData.js';
import { GameModel, ORDER_RULES } from './game/GameModel.js?v=20260929-classic-attack';
import { CITY_ROUTES, WORLD_MAP_POSITIONS, WORLD_MAP_SIZE, WORLD_ROUTE_PATHS } from './game/MapData.js';
import { listSlots, readSlot, writeSlot, parseImport, exportSlot } from './game/SaveStore.js';
import { TERRAIN, reachableTiles, canAttack, attackError, availableSkills, skillError, SKILLS, alive, occupantAt, rangeCells, battleRangeRule } from './game/BattleCore.js?v=20260929-classic-attack';
import { terrainVisual, visualRoadCells } from './game/TerrainVisuals.js?v=20260929-seam-fix';
import { TERRAIN_ART, ARMY_ART } from './game/BattleArt.js?v=20260929-seam-fix';

const NAMES = ['董卓弄权', '曹操崛起', '赤壁之战', '三国鼎立'];
const app = document.getElementById('app');
const ui = { screen: 'menu', commandMenu: null, generalId: null, economyDraft: null, pendingItem: null, personnelTargetId: null, moveSourceId: null, scoutSourceId: null, confirmMonth: false, pendingOrder: null, pendingDistribution: null, battleAfterDistribution: false, report: null, worldReport: null, pendingSiegeWorldReport: null, worldReportIndex: 0, worldReportFromHistory: false, saveMenu: false, saveConfirm: null, importPreview: null, importSlot: null, catalog: null, scenario: 0, ruler: null, game: null, cityId: null, unitId: null, battleMode: 'move', battleMenuOpen: false, battleSkillId: null, battlePreview: null, battleReplay: null, battleAnimating: false, battleMoreOpen: false, battleLogOpen: false, battleOverviewOpen: false, battleViewport: null, battleFocus: null, toast: '' };
let renderedScreen = null;
let battlePointer = null;
let battleDragAt = 0;
let autoEnemyTurnPending = false;
const safe = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const fmt = value => Number(value || 0).toLocaleString('zh-CN');
const maxRecruitAmount = (city, count = 1) => Math.min(city.loyalty * 20, Math.floor(city.money / Math.max(1, count)) * 10);
const exchangeLimit = (city, direction) => direction === 'buy' ? Math.floor(city.money / 5) : Math.max(0, Math.min(city.food, Math.floor((30000 - city.money) / 2)));
const exchangeDefault = (city, direction) => Math.max(0, Math.floor(exchangeLimit(city, direction) / 2) || Math.min(1, exchangeLimit(city, direction)));
const btn = (label, action, style = '', disabled = false) => `<button class="button ${style}" data-action="${action}" ${disabled ? 'disabled' : ''}>${label}</button>`;
const MAP_LANDMARKS = new Set(['北平', '邺', '长安', '洛阳', '汉中', '成都', '襄阳', '建业', '长沙']);
const FACTION_COLORS = ['#d8a966', '#92baca', '#d98f78', '#b5a3cf', '#b3c77c', '#d2a5bd', '#8cc6aa', '#c7ad8b', '#91a9d4', '#c7b66f'];
const ARMY_LOGOS = { 骑兵: 'cavalry', 步兵: 'infantry', 弓兵: 'archer', 水军: 'navy', 水兵: 'navy', 极兵: 'elite', 玄兵: 'mystic' };
const armyLogo = armsType => ARMY_ART[ARMY_LOGOS[armsType] || 'infantry'];
const terrainImageCache = new Map();

function menu() {
  return `<main class="entry"><div class="seal">漢</div><div class="eyebrow">THREE KINGDOMS · STRATEGY</div>
    <h1>三国<span>霸业</span></h1><p>执一方之印，经营城池，招揽名将，逐鹿天下。</p>
    <div class="entry-buttons">${btn('开创霸业 ↗', 'new', 'primary')}${btn('继续征途', 'load', '', !listSlots().some(item => item.save))}${btn('导入战局', 'open-saves', 'quiet')}</div>
    <small>重构预览 · 战略、内政、出征与战棋已接通</small></main>${saveManager()}`;
}

function scenarios() {
  return `<main class="selection scenario-selection"><div class="selection-top">${btn('← 返回', 'menu', 'quiet')}<span>第一步 / 选择时代</span></div>
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
  const moveSource = ui.moveSourceId === null ? null : game.city(ui.moveSourceId);
  const scoutSource = ui.scoutSourceId === null ? null : game.city(ui.scoutSourceId);
  const mapOrderSource = moveSource || scoutSource;
  const moveTargets = new Set(moveSource ? game.transportTargets(moveSource.id).map(item => item.city.id) : scoutSource ? game.cities.filter(city => city.id !== scoutSource.id && city.owner !== game.player).map(city => city.id) : []);
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
    const visible = mapOrderSource ? c.id === mapOrderSource.id || moveTargets.has(c.id) : MAP_LANDMARKS.has(c.name) || selected?.id === c.id || neighbors.has(c.name);
    const color = c.owner ? FACTION_COLORS[rulers.indexOf(c.owner) % FACTION_COLORS.length] || '#b7b6a2' : '#a8afa3';
    const style = `left:${x / WORLD_MAP_SIZE.width * 100}%;top:${y / WORLD_MAP_SIZE.height * 100}%;--faction:${color}`;
    const labelClass = `${y > 250 ? 'above' : ''} ${x > 315 ? 'edge-right' : ''} ${x < 45 ? 'edge-left' : ''}`;
    return `<button class="map-city ${kind} ${selected?.id === c.id ? 'selected' : ''} ${neighbors.has(c.name) ? 'neighbor' : ''} ${recent.has(c.id) ? 'recent' : ''} ${mapOrderSource ? moveTargets.has(c.id) ? 'move-target' : c.id === mapOrderSource.id ? 'move-source' : 'move-unavailable' : ''}" data-action="city" data-id="${c.id}" style="${style}" title="${safe(c.name)} · ${safe(c.owner || '无主')}" aria-label="${safe(c.name)}，${moveTargets.has(c.id) ? scoutSource ? '可侦察' : '可移动前往' : safe(c.owner || '无主城')}"><i></i></button>${visible ? `<span class="map-city-label ${labelClass} ${selected?.id === c.id ? 'selected' : ''} ${moveTargets.has(c.id) ? 'move-target' : ''}" style="${style}">${safe(c.name)}</span>` : ''}`;
  }).join('');
  return `<div class="map-outer"><div class="map-surface ${mapOrderSource ? 'choosing-move-target' : ''}" data-action="map-pick" role="group" aria-label="${scoutSource ? '侦察，选择发光的非己方城池' : moveSource ? '移动武将，选择发光的己方城池' : '天下地图，点击城池选中'}">
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
  const destination = ['battle', 'transport', 'move', 'scout'].includes(pending.type) ? ` · 目标 ${safe(game.city(pending.targetId)?.name)}` : pending.type === 'surrender' ? ` · 目标 ${safe(city.generals.find(g => g.id === pending.targetId)?.name || '')}` : '';
  const selectedCount = pending.selectedIds.length;
  const battleFoodNeed = pending.type === 'battle' ? Math.max(1, Math.ceil(city.generals.filter(general => pending.selectedIds.includes(general.id)).reduce((sum, general) => sum + general.troops, 0) / 250)) : 0;
  const maxRecruit = pending.type === 'recruit' ? maxRecruitAmount(city, selectedCount) : 0;
  const recruitAmount = pending.recruitAmount || 0;
  const totalCost = pending.type === 'recruit' ? recruitAmount / 10 * selectedCount : selectedCount * rule.money;
  const canAfford = city.money >= totalCost && (pending.type !== 'recruit' || recruitAmount >= 10 && recruitAmount <= maxRecruit && recruitAmount % 10 === 0) && (pending.type !== 'battle' || city.food >= battleFoodNeed);
  const recruitOptions = pending.type === 'recruit' ? [...new Set([100, 500, 1000, maxRecruit].filter(amount => amount >= 10 && amount <= maxRecruit))] : [];
  return `<div class="order-overlay"><div class="order-dialog" role="dialog" aria-modal="true" aria-labelledby="order-title">
    <div class="order-dialog-head"><div><span class="eyebrow">${safe(city.name)}${destination}</span><h2 id="order-title">${safe(rule.label)} · 选择武将</h2></div><button data-action="cancel-order" aria-label="关闭选将面板">×</button></div>
    <p>${pending.type === 'battle' ? '选择 1 至 5 名武将带兵出征。' : pending.type === 'surrender' ? '选择一名武将在月末劝降这名俘虏。' : pending.type === 'exchange' ? '选择一名武将完成交易，物资立即入库。' : pending.type === 'transport' ? '选择一名武将押送物资，月末呈报是否抵达。' : pending.type === 'move' ? '选择一名武将携带现有兵力前往目标城，月末到达。' : pending.type === 'scout' ? '选择一名武将侦察目标城，立即获得详细军情。' : pending.type === 'raid' ? '可选择多名武将在本城分别掠夺。月末每执行一条命令，民忠、农业、商业都会再减半，并分别获得金粮。' : '可勾选多名武将分别执行这项命令。'}每名武将本月只能接一项任务，各消耗 ${rule.stamina} 体力。</p>
    <div class="order-person-list"><div class="order-rank-heading">可接令 ${availableCount} 人 · 按本指令适配度排序</div>${ranked.map(({ general, available, reason }, index) => `${index === availableCount ? `<div class="order-rank-heading unavailable">本月不可接令 ${ranked.length - availableCount} 人</div>` : ''}<button class="order-person ${pending.selectedIds.includes(general.id) ? 'selected' : ''}" data-action="choose-general" data-id="${safe(general.id)}" ${available ? '' : 'disabled'}><span class="person-avatar">${safe(general.name.slice(0, 1))}</span><span><strong>${safe(general.name)}${index === 0 && available ? '<em>推荐</em>' : ''}</strong><small><img class="order-arms-logo" src="${armyLogo(general.armsType)}" alt="">${safe(general.armsType)} · 武 ${game.force(general)} · 智 ${game.intelligence(general)} · 体力 ${general.stamina} · 带兵 ${fmt(general.troops)}</small><small class="order-fit">${safe(reason)}</small></span><b>${available ? pending.selectedIds.includes(general.id) ? '✓' : '+' : '—'}</b></button>`).join('')}</div>
    ${pending.type === 'recruit' ? `<div class="recruit-amount"><label>每名武将征兵 <input data-recruit-input type="number" inputmode="numeric" min="10" max="${maxRecruit}" step="10" value="${recruitAmount}"> 人</label><small>默认填入当前最大值 ${fmt(maxRecruit)} 人；民忠上限 ${fmt(city.loyalty * 20)} 人，每 10 兵花 1 金</small><div>${recruitOptions.map(amount => `<button data-action="recruit-amount" data-amount="${amount}" class="${recruitAmount === amount ? 'selected' : ''}">${amount === maxRecruit ? `最多 ${fmt(amount)}` : fmt(amount)}</button>`).join('')}</div></div>` : ''}
    <div class="order-cost ${canAfford ? '' : 'insufficient'}">已选 ${selectedCount} 将${pending.type === 'recruit' ? ` · 共征 ${fmt(recruitAmount * selectedCount)} 兵` : pending.type === 'battle' ? ` · 至少需要 ${fmt(battleFoodNeed)} 粮，城中现有 ${fmt(city.food)} 粮` : pending.type === 'exchange' ? ` · ${pending.direction === 'buy' ? '买入' : '卖出'} ${fmt(pending.amount)} 粮 · ${pending.direction === 'buy' ? '支出' : '获得'} ${fmt(pending.amount * (pending.direction === 'buy' ? 5 : 2))} 金` : pending.type === 'transport' ? ` · 押送 ${fmt(pending.food)} 粮、${fmt(pending.money)} 金、${fmt(pending.troops)} 后备兵` : ` · 共需 ${fmt(totalCost)} 金`}${canAfford ? '' : pending.type === 'battle' ? ' · 粮草不足' : ` · 当前只有 ${fmt(city.money)} 金或兵量超限`}</div>
    <div class="order-dialog-actions">${btn('取消', 'cancel-order', 'quiet')}${btn(pending.type === 'battle' ? `确认出征（${pending.selectedIds.length} 将）` : `确认${rule.label}（${pending.selectedIds.length} 将）`, 'submit-order', 'primary', !pending.selectedIds.length || !canAfford)}</div>
  </div></div>`;
}

function reportDialog(game) {
  if (!ui.report) return '';
  return `<div class="report-overlay ${ui.report.kind === 'battle' ? 'battle-result-overlay' : ''}"><div class="report-dialog" role="dialog" aria-modal="true" aria-labelledby="report-title">
    <div class="eyebrow">${safe(ui.report.period || `${game.state.year} 年 ${game.state.month} 月`)}</div><h2 id="report-title">${safe(ui.report.title)}</h2>
    <div class="report-dialog-list">${ui.report.items.map(report => `<div><span>${safe(report.personName.slice(0, 1))}</span><section><small>${safe(game.city(report.cityId)?.name || '')} · ${safe(ORDER_RULES[report.type]?.label || report.type)}</small><strong>${safe(report.personName)}</strong><p class="${report.type === 'scout' ? 'scout-intel' : ''}">${safe(report.result)}</p></section></div>`).join('')}</div>
    ${btn('知道了', 'close-report', 'primary')}</div></div>`;
}

function worldPlaybackCards(world) {
  const cards = (world.events || []).filter(event => ['capture', 'general', 'famine', 'siege'].includes(event.type)).map(event => ({
    type: event.type,
    title: event.type === 'capture' ? '城池易主' : event.type === 'general' ? '人才归附' : event.type === 'siege' ? '敌军来袭' : '粮草告急',
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
  const symbol = { capture: '城', general: '将', famine: '粮', siege: '战', report: '令', peace: '月' }[card.type];
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
  const report = ui.game.state.lastBattleReport;
  if (!retreated && target.owner === ui.game.player) ui.cityId = targetId;
  ui.report = { kind: 'battle', title: retreated ? '撤军回报' : report?.mode === 'defend' ? report.winner === 'player' ? '守城捷报' : '城池失守' : target.owner === ui.game.player ? '攻城捷报' : '攻城失利',
    items: [{ type: 'battle', cityId: targetId, personName: '军情', result: report ? `${report.reason}，历经 ${report.round} 回合。我军损失 ${fmt(report.playerLoss)} 兵，敌军损失 ${fmt(report.enemyLoss)} 兵。` : ui.game.state.messages[0] || `${target.name}战事结束。` }] };
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
      <div class="save-slot-actions" data-slot="${slot}">${ui.game && ['game','battle'].includes(ui.screen) ? btn(save || error ? '覆盖保存' : '保存到此', 'save-slot', 'save-action') : ''}${save ? btn('读取', 'load-slot', 'save-action') + btn('导出', 'export-slot', 'save-action') : ''}${btn('导入到此', 'import-slot', 'save-action')}</div>
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
  const title = { domestic: '内政', personnel: '人事', military: '军备', diplomacy: '外交', city: '城池档案', general: '武将详情', intel: '军情', targets: '选择出征目标', captives: '选择招降对象', distribution: '选择分配武将', 'dispose-people': '选择处置武将', 'dispose-choice': '选择处置方式', 'treat-people': '宴请武将', exchange: '交易', transport: '输送', items: '道具', give: '赏赐道具', 'item-people': '选择受赏武将', confiscate: '没收道具' }[group];
  const entry = (label, detail, action, id = '', disabled = false, coming = false) => `<button class="command-entry" data-action="${action}" data-id="${safe(id)}" ${disabled ? 'disabled' : ''}><span><strong>${label}</strong><small>${detail}</small></span><b>${disabled ? coming ? '待开放' : '不可用' : '›'}</b></button>`;
  const order = (type, detail, blocked = false) => entry(ORDER_RULES[type].label, detail, 'menu-order', type, !friendly || blocked || !game.availableGenerals(city.id, type).length || city.money < ORDER_RULES[type].money);
  const soon = (label, detail) => entry(label, detail, 'unavailable', '', true, true);
  const goodDetail = item => {
    const good = game.good(item.name);
    return safe(good?.description || [good?.force ? `武力 +${good.force}` : '', good?.intelligence ? `智力 +${good.intelligence}` : '', good?.speed ? `移动 +${good.speed}` : '', good?.armyType ? `转为${good.armyType}` : ''].filter(Boolean).join(' · ') || '道具');
  };
  let body = '';
  if (group === 'domestic') body = `${order('farm', '提升农业 · 50 金', city.farming >= city.farmingLimit)}${order('trade', '提升商业 · 50 金', city.commerce >= city.commerceLimit)}${order('govern', '提升防灾 · 50 金', city.disaster >= 100)}${order('patrol', '提升民忠与人口 · 50 金', city.loyalty >= 100 && city.population >= city.populationLimit)}${order('search', '月末寻访人才或资源')}${entry('交易', '买粮 5 金 / 粮 · 卖粮 2 金 / 粮', 'open-economy', 'exchange', !friendly || !game.availableGenerals(city.id, 'exchange').length || city.money < 5 && city.food < 1)}${entry('输送', '将物资送往道路可达的己方城池', 'open-economy', 'transport', !friendly || !game.availableGenerals(city.id, 'transport').length || !game.transportTargets(city.id).length || ![city.food, city.money, city.troops].some(Boolean))}`;
  else if (group === 'exchange') {
    const draft = ui.economyDraft;
    const max = exchangeLimit(city, draft.direction);
    const presetMap = new Map([[Math.max(1, Math.floor(max / 4)), '25%'], [Math.max(1, Math.floor(max / 2)), '50%'], [Math.max(1, Math.floor(max * 3 / 4)), '75%'], [max, '全部']]);
    const presets = [...presetMap].filter(([amount]) => amount > 0);
    const cost = draft.amount * (draft.direction === 'buy' ? 5 : 2);
    const nextFood = city.food + (draft.direction === 'buy' ? draft.amount : -draft.amount);
    const nextMoney = city.money + (draft.direction === 'buy' ? -cost : cost);
    body = `<div class="economy-form exchange-form"><p>本城现有 ${fmt(city.food)} 粮、${fmt(city.money)} 金。交易立即生效，需一名武将，消耗 12 体力。</p><div class="economy-options"><button data-action="economy-direction" data-id="buy" class="${draft.direction === 'buy' ? 'selected' : ''}">买粮 · 5 金 / 粮</button><button data-action="economy-direction" data-id="sell" class="${draft.direction === 'sell' ? 'selected' : ''}">卖粮 · 2 金 / 粮</button></div><div class="exchange-quantity"><span>交易粮食</span><strong data-exchange-amount>${fmt(draft.amount)} <small>/ 最多 ${fmt(max)}</small></strong></div><input class="exchange-slider" data-economy-input="amount" type="range" min="${max ? 1 : 0}" max="${max}" step="1" value="${draft.amount}" aria-label="交易粮食数量" ${max ? '' : 'disabled'}><div class="exchange-presets">${presets.map(([amount, label]) => `<button data-action="economy-preset" data-id="${amount}" class="${draft.amount === amount ? 'selected' : ''}">${label}<small>${fmt(amount)} 粮</small></button>`).join('')}</div><div class="economy-preview">${draft.direction === 'buy' ? '支出' : '获得'} ${fmt(cost)} 金 · 交易后 ${fmt(nextFood)} 粮、${fmt(nextMoney)} 金</div>${btn('选择执行武将 →', 'economy-choose-general', 'primary', max < 1 || draft.amount < 1 || draft.amount > max)}</div>`;
  }
  else if (group === 'transport') {
    const draft = ui.economyDraft;
    const targets = game.transportTargets(city.id);
    body = `<div class="economy-form"><p>从${safe(city.name)}出发，月末判定是否送达。途中可能遭劫，需一名武将，消耗 8 体力。</p><div class="command-detail-title">目的城</div><div class="economy-targets">${targets.map(({ city: target, distance }) => `<button data-action="economy-target" data-id="${target.id}" class="${draft.targetId === target.id ? 'selected' : ''}">${safe(target.name)}<small>${distance} 段道路</small></button>`).join('')}</div>${[['food', '粮', city.food], ['money', '金', city.money], ['troops', '后备兵', city.troops]].map(([key, label, max]) => `<label>${label} · 库存 ${fmt(max)}<input data-economy-input="${key}" type="number" inputmode="numeric" min="0" max="${max}" step="1" value="${draft[key]}"></label><button class="economy-max" data-action="economy-max" data-id="${key}">全部 ${fmt(max)}</button>`).join('')}<div class="economy-preview">输送 ${fmt(draft.food)} 粮、${fmt(draft.money)} 金、${fmt(draft.troops)} 后备兵</div>${btn('选择押送武将 →', 'economy-choose-general', 'primary', !targets.some(item => item.city.id === draft.targetId) || ![draft.food, draft.money, draft.troops].some(Boolean))}</div>`;
  }
  else if (group === 'personnel') body = `${entry('招降俘虏', `${city.generals.filter(g => g.status === 'captive').length} 名俘虏 · 月末回报`, 'open-command', 'captives', !friendly || !city.generals.some(g => g.status === 'captive') || !game.availableGenerals(city.id, 'surrender').length || city.money < 100)}${entry('移动武将', '在地图上选目的城，再选武将 · 月末抵达', 'start-move-map', '', !friendly || !game.transportTargets(city.id).length || !game.availableGenerals(city.id, 'move').length)}${entry('处斩 / 流放', '处斩俘虏，或流放俘虏及本城未接令武将', 'open-command', 'dispose-people', !friendly || !city.generals.some(g => g.status === 'captive' || g.owner === game.player && g.status === 'active' && !city.acted && !game.orderFor(g.id)))}${entry('宴请', '花 100 金恢复 50 体力，并为非君主增加 1 忠诚', 'open-command', 'treat-people', !friendly || city.money < 100 || !city.generals.some(g => g.owner === game.player && g.status === 'active' && !city.acted && !game.orderFor(g.id) && (g.stamina < 100 || g.name !== game.player && g.loyalty < 100)))}${entry('道具 · 赏赐 / 没收', `库中 ${city.items.filter(item => item.found).length} 件 · 武将装备 ${city.generals.reduce((sum, person) => sum + person.equipment.length, 0)} 件`, 'open-command', 'items', !friendly)}`;
  else if (group === 'dispose-people') body = city.generals.filter(g => g.status === 'captive' || g.owner === game.player && g.status === 'active' && !city.acted && !game.orderFor(g.id)).map(g => entry(safe(g.name), g.status === 'captive' ? `俘虏 · 原属 ${safe(g.formerOwner || '未知')} · 装备 ${g.equipment.length} 件` : `本城武将 · 带兵 ${fmt(g.troops)} · 仅可流放`, 'menu-dispose-target', g.id)).join('') || '<p class="command-empty">本城没有可处置武将。</p>';
  else if (group === 'dispose-choice') { const person = city.generals.find(g => g.id === ui.personnelTargetId); body = person ? `<p class="command-empty">${safe(person.name)} · ${person.status === 'captive' ? '俘虏' : '本城武将'}</p>${entry('处斩', '武将永久离开；装备归入本城道具库', 'apply-dispose', 'execute', person.status !== 'captive')}${entry('流放', '武将成为在野人物，随机前往一座城池', 'apply-dispose', 'banish')}` : '<p class="command-empty">这名武将已不在本城。</p>'; }
  else if (group === 'treat-people') body = city.generals.filter(g => g.owner === game.player && g.status === 'active').map(g => entry(safe(g.name), `体力 ${g.stamina} → ${Math.min(100, g.stamina + 50)} · 忠诚 ${g.loyalty} → ${g.name === game.player ? g.loyalty : Math.min(100, g.loyalty + 1)}`, 'apply-treat', g.id, !!game.orderFor(g.id) || city.acted || g.stamina >= 100 && (g.name === game.player || g.loyalty >= 100))).join('') || '<p class="command-empty">本城没有可宴请武将。</p>';
  else if (group === 'items') body = `${entry('赏赐道具', `从${safe(city.name)}库中选择道具，再选武将`, 'open-command', 'give', city.acted || !city.items.some(item => item.found) || !city.generals.some(person => person.owner === game.player && person.status === 'active' && !game.orderFor(person.id)))}${entry('没收装备', '选择武将佩戴的道具', 'open-command', 'confiscate', city.acted || !city.generals.some(person => person.owner === game.player && person.status === 'active' && person.equipment.length && !game.orderFor(person.id)))}<div class="command-detail-title">城中道具</div>${city.items.filter(item => item.found).map(item => `<p class="command-log"><strong>${safe(item.name)}</strong>${goodDetail(item)}</p>`).join('') || '<p class="command-empty">道具库为空，寻访可能发现城中隐藏道具。</p>'}<div class="command-detail-title">武将装备</div>${city.generals.filter(person => person.owner === game.player && person.status === 'active' && person.equipment.length).map(person => `<p class="command-log"><strong>${safe(person.name)}</strong>${person.equipment.map(item => safe(item.name)).join('、')}</p>`).join('') || '<p class="command-empty">本城武将没有装备道具。</p>'}`;
  else if (group === 'give') body = city.items.filter(item => item.found).map(item => entry(safe(item.name), goodDetail(item), 'select-give-item', item.id)).join('') || '<p class="command-empty">城中没有可赏赐的道具。</p>';
  else if (group === 'item-people') {
    const item = city.items.find(candidate => candidate.id === ui.pendingItem?.itemId);
    const good = item && game.good(item.name);
    body = `<p class="command-log">${safe(item?.name || '道具')} · ${item ? goodDetail(item) : ''}<br>装备最多两件；使用型兵符赏赐后立即生效。</p>${city.generals.filter(person => person.owner === game.player && person.status === 'active').map(person => entry(safe(person.name), `武 ${game.force(person)} · 智 ${game.intelligence(person)} · 忠诚 ${person.loyalty} · 装备 ${person.equipment.length}/2`, 'apply-give-item', person.id, !!game.orderFor(person.id) || !good || good.type !== '使用' && person.equipment.length >= 2 || good.armyType === '玄兵' && game.intelligence(person) <= 105 || good.armyType === '极兵' && game.force(person) <= 105)).join('') || '<p class="command-empty">没有可接受道具的武将。</p>'}`;
  }
  else if (group === 'confiscate') body = city.generals.filter(person => person.owner === game.player && person.status === 'active').flatMap(person => person.equipment.map(item => `<button class="command-entry" data-action="apply-confiscate-item" data-person="${safe(person.id)}" data-id="${safe(item.id)}" ${game.orderFor(person.id) ? 'disabled' : ''}><span><strong>${safe(person.name)} · ${safe(item.name)}</strong><small>${goodDetail(item)} · 忠诚 ${person.loyalty}${person.name === game.player ? '' : ' → ' + Math.max(0, person.loyalty - 20)}</small></span><b>›</b></button>`)).join('') || '<p class="command-empty">本城没有可没收的装备。</p>';
  else if (group === 'military') {
    const enemyNeighbors = game.adjacent(city).filter(target => target.owner !== game.player);
    const ready = game.availableGenerals(city.id, 'battle').length;
    const battleHint = !enemyNeighbors.length ? '周边都是我方城池，请从边境城池出征' : ready ? `${enemyNeighbors.length} 座可选目标 · ${ready} 名武将可出征` : city.acted ? '本月城池已行动，需进入下月' : city.troops > 0 && game.generals(city.id).some(general => !game.orderFor(general.id) && !general.troops) ? '武将尚未带兵，可先分配后备兵' : '本月没有可出征武将，点入查看原因';
    body = `${entry('侦察', '地图选非己方城池 · 20 金 / 10 体力', 'start-scout-map', '', !friendly || city.money < 20 || !game.availableGenerals(city.id, 'scout').length || !game.cities.some(target => target.id !== city.id && target.owner !== game.player))}${order('recruit', '征兵进入城池后备兵', city.money < 1 || city.loyalty < 1)}${entry('分配兵力', `后备兵 ${fmt(city.troops)}`, 'open-command', 'distribution', !friendly || city.acted || !city.generals.some(g => g.owner === game.player && g.status === 'active' && !game.orderFor(g.id)))}${order('raid', '可选多名武将 · 月末逐将得金粮，城政逐次减半')}${entry('出征', battleHint, 'open-command', 'targets', !friendly)}`;
  }
  else if (group === 'diplomacy') body = `${soon('离间', '降低敌方武将忠诚')}${soon('招揽', '招募敌方武将')}${soon('策反', '争取敌方武将')}${soon('反间', '原版菜单占位')}${soon('劝降', '说服敌方城池投降')}`;
  else if (group === 'city') body = `<div class="command-stats">${meter('农业', city.farming, city.farmingLimit)}${meter('商业', city.commerce, city.commerceLimit)}${meter('人口', city.population, city.populationLimit)}${meter('民忠', city.loyalty, 100)}${meter('防灾', city.disaster, 100)}</div><div class="command-detail-title">驻城武将</div>${city.generals.filter(g => g.owner === city.owner && g.status === 'active').map(g => entry(safe(g.name), `武 ${game.force(g)} · 智 ${game.intelligence(g)} · 体力 ${g.stamina} · 带兵 ${fmt(g.troops)} · 装备 ${g.equipment.length}/2`, 'view-general', g.id)).join('') || '<p class="command-empty">暂无驻城武将</p>'}<div class="command-detail-title">本月已下令</div>${game.orders.filter(o => o.cityId === city.id).map(o => `<p class="command-log">${safe(o.personName)} · ${safe(ORDER_RULES[o.type]?.label || o.type)}：${safe(o.result || '月末结算')}</p>`).join('') || '<p class="command-empty">还没有下令</p>'}`;
  else if (group === 'general') {
    const general = city.generals.find(person => person.id === ui.generalId && person.owner === city.owner && person.status === 'active');
    if (!general) body = '<p class="command-empty">这名武将已不在本城。</p>';
    else {
      const forceBonus = game.itemBonus(general, 'force'), intelligenceBonus = game.itemBonus(general, 'intelligence'), speedBonus = game.itemBonus(general, 'speed');
      const assigned = game.orderFor(general.id);
      const equipment = general.equipment.map(item => {
        const good = game.good(item.name);
        const effects = [good?.force ? `武力 +${good.force}` : '', good?.intelligence ? `智力 +${good.intelligence}` : '', good?.speed ? `移动 +${good.speed}` : ''].filter(Boolean);
        return `<section class="general-equipment"><div><strong>${safe(item.name)}</strong><small>${safe(good?.type || '装备')}</small></div><b>当前效果：${effects.length ? safe(effects.join(' · ')) : '暂无数值加成'}</b>${good?.description ? `<p>原版描述：${safe(good.description)}</p>` : ''}</section>`;
      }).join('');
      body = `<div class="general-profile"><div class="general-profile-head"><i>${safe(general.name.slice(0, 1))}</i><div><h3>${safe(general.name)}</h3><p>${safe(general.owner)} · <img class="general-arms-logo" src="${armyLogo(general.armsType)}" alt=""> ${safe(general.armsType)} · 等级 ${general.level}</p></div></div><div class="general-attributes"><div><small>武力</small><strong>${game.force(general)}</strong><span>基础 ${general.force}${forceBonus ? ` + 装备 ${forceBonus}` : ''}</span></div><div><small>智力</small><strong>${game.intelligence(general)}</strong><span>基础 ${general.intelligence}${intelligenceBonus ? ` + 装备 ${intelligenceBonus}` : ''}</span></div><div><small>体力 / 忠诚</small><strong>${general.stamina} / ${general.loyalty}</strong><span>${assigned ? `本月已执行${safe(ORDER_RULES[assigned.type]?.label || assigned.type)}` : city.acted ? '本月不可接令' : '本月未接令'}</span></div><div><small>带兵 / 上限</small><strong>${fmt(general.troops)}</strong><span>最多 ${fmt(game.maxTroops(general))} 兵</span></div></div><div class="general-movement">战场移动 ${2 + speedBonus} 格${speedBonus ? ` · 坐骑加成 +${speedBonus}，撤退免除兵损` : ''}</div><div class="command-detail-title">装备 ${general.equipment.length} / 2</div>${equipment || '<p class="command-empty">尚未装备道具。</p>'}${friendly ? btn('分配兵力', 'general-distribute', 'primary', city.acted || !!assigned) : ''}</div>`;
    }
  }
  else if (group === 'intel') body = `<div class="command-detail-title">本月待办</div>${game.ownedCities().filter(c => game.availableCount(c.id)).map(c => entry(c.name, `${game.availableCount(c.id)} 将可接令 · ${fmt(c.money)} 金`, 'city', c.id)).join('') || '<p class="command-empty">本月可用武将都已接令</p>'}<div class="command-detail-title">回看月末播报</div>${game.worldHistory.slice(0, 12).map((world, index) => entry(`${world.year} 年 ${world.month} 月`, `${worldPlaybackCards(world).length} 件纪事 · 点击重播`, 'open-world-report', index)).join('') || '<p class="command-empty">结束本月后，重要事件会逐件播报。</p>'}<div class="command-detail-title">最新武将回报</div>${game.reports.slice(0, 12).map(r => `<p class="command-log"><small>${r.year} 年 ${r.month} 月 · ${safe(game.city(r.cityId)?.name)}</small><strong>${safe(r.personName)} · ${safe(ORDER_RULES[r.type]?.label || r.type)}</strong>${safe(r.result)}</p>`).join('') || '<p class="command-empty">暂无回报</p>'}<div class="command-detail-title">近期军情</div>${game.state.messages.map(m => `<p class="command-log">${safe(m)}</p>`).join('')}`;
  else if (group === 'targets') {
    const ready = game.availableGenerals(city.id, 'battle');
    const targets = game.adjacent(city).filter(target => target.owner !== game.player);
    const assignable = !city.acted && city.troops > 0 && game.generals(city.id).some(general => !game.orderFor(general.id) && general.stamina >= ORDER_RULES.battle.stamina && general.troops === 0);
    body = targets.length ? targets.map(target => entry(target.name, `${safe(target.owner || '无主')} · ${fmt(game.totalTroops(target))} 兵`, 'menu-battle-target', target.id, !ready.length)).join('') : '<p class="command-empty">晋阳等内陆城池的相邻城若都归我方，就无法从这里出征。请选择接壤敌城的边境城池。</p>';
    if (targets.length && !ready.length) body = `<p class="command-empty">${city.acted ? '本月城池已行动。' : assignable ? `城中还有 ${fmt(city.troops)} 后备兵，先分配给武将。` : game.generals(city.id).some(general => general.troops > 0 && !game.orderFor(general.id) && general.stamina < ORDER_RULES.battle.stamina) ? `带兵武将体力不足，出征需要 ${ORDER_RULES.battle.stamina} 体力。` : '本月武将已接令，或都未带兵。'}目标暂不可出征。</p>${assignable ? entry('分配兵力 →', '为本城未带兵武将分配后备兵，随后返回选目标', 'battle-prepare-distribution', '') : entry('结束本月 →', '进入下月，恢复可行动武将', 'battle-prepare-month', '')}${body}`;
  }
  else if (group === 'captives') body = city.generals.filter(g => g.status === 'captive').map(g => entry(g.name, `原属 ${safe(g.formerOwner || '未知')} · 忠诚 ${g.loyalty}`, 'menu-surrender-target', g.id, game.orders.some(o => o.type === 'surrender' && o.targetId === g.id))).join('') || '<p class="command-empty">本城没有俘虏</p>';
  else if (group === 'distribution') body = city.generals.filter(g => g.owner === game.player && g.status === 'active').map(g => entry(g.name, `带兵 ${fmt(g.troops)} / ${fmt(game.maxTroops(g))}`, 'menu-distribute-general', g.id, city.acted || !!game.orderFor(g.id))).join('') || '<p class="command-empty">本城没有可分配的武将</p>';
  return `<div class="command-overlay"><div class="command-dialog" role="dialog" aria-modal="true" aria-labelledby="command-title"><div class="command-head">${['targets', 'distribution', 'captives', 'dispose-people', 'dispose-choice', 'treat-people', 'exchange', 'transport', 'items', 'give', 'item-people', 'confiscate', 'general'].includes(group) ? '<button class="command-back" data-action="command-back" aria-label="返回上级">‹</button>' : ''}<div><small>${safe(city.name)} · ${safe(city.owner || '无主')}</small><h2 id="command-title">${title}</h2></div><button data-action="close-command" aria-label="关闭面板">×</button></div><div class="command-body ${['domestic', 'personnel', 'military', 'diplomacy'].includes(group) ? 'menu-grid' : ''}">${body}</div></div></div>`;
}

function gameScreen() {
  const g = ui.game, s = g.state;
  const city = g.city(ui.cityId) || g.ownedCities()[0] || g.cities[0];
  const moveSource = ui.moveSourceId === null ? null : g.city(ui.moveSourceId);
  const scoutSource = ui.scoutSourceId === null ? null : g.city(ui.scoutSourceId);
  ui.cityId = city.id;
  const friendly = city.owner === g.player;
  return `<div class="game-shell play-shell"><header class="game-header play-header"><div class="brand"><i>漢</i><div><strong>${safe(g.player)}的霸业</strong><small>${NAMES[s.scenarioId]} · ${s.year} 年 ${s.month} 月</small></div></div><button class="play-icon-button" data-action="save" aria-label="存档">存档</button></header>
    <main class="play-stage"><div class="play-map-head"><span>${scoutSource ? `从${safe(scoutSource.name)}侦察：选择发光的城池` : moveSource ? `从${safe(moveSource.name)}选择发光的目的城` : '天下形势 · 38 城全图'}</span>${scoutSource ? '<button data-action="cancel-scout-map">取消侦察 ×</button>' : moveSource ? '<button data-action="cancel-move-map">取消移动 ×</button>' : ''}</div><div class="play-map">${map(g)}</div>
      <div class="play-city-card"><div class="play-city-main"><div><small>${friendly ? '我方城池' : city.owner ? '他方城池' : '无主城池'}</small><strong>${safe(city.name)}</strong><span>${safe(city.owner || '无主')} · ${fmt(g.totalTroops(city))} 兵</span></div><button data-action="open-command" data-id="city">详情 ›</button></div>
        <div class="play-resources"><span>金 <b>${fmt(city.money)}</b></span><span>粮 <b>${fmt(city.food)}</b></span><span>后备兵 <b>${fmt(city.troops)}</b></span><span>可接令 <b>${friendly ? g.availableCount(city.id) : '—'}</b></span></div></div>
      <div class="play-command-grid"><button data-action="open-command" data-id="domestic" ${friendly ? '' : 'disabled'}><i>田</i><span>内政</span></button><button data-action="open-command" data-id="personnel" ${friendly ? '' : 'disabled'}><i>将</i><span>人事</span></button><button data-action="open-command" data-id="military" ${friendly ? '' : 'disabled'}><i>兵</i><span>军备</span></button><button data-action="open-command" data-id="diplomacy" ${friendly ? '' : 'disabled'}><i>策</i><span>外交</span></button></div>
    </main><footer class="play-footer"><button data-action="open-command" data-id="intel">军情 <b>${g.reports.length}</b></button><button data-action="month" class="play-end-month">结束本月 <span>→</span></button></footer>
    ${commandDialog(g)}${orderPicker(g)}${distributionDialog(g)}${reportDialog(g)}${worldReportDialog()}${saveManager()}
    ${ui.confirmMonth ? `<div class="month-overlay"><div class="month-dialog" role="dialog" aria-modal="true" aria-labelledby="month-title"><span class="eyebrow">月末结算</span><h2 id="month-title">进入下一月？</h2><p>${g.ownedCities().reduce((count, c) => count + g.availableCount(c.id), 0) ? `还有 ${g.ownedCities().reduce((count, c) => count + g.availableCount(c.id), 0)} 名武将未接令。` : '本月可用武将都已接令。'}结束后将结算寻访、招降、输送与掠夺，恢复武将可用状态，并推进月份。</p><div>${btn('再想想', 'cancel-month', 'quiet')}${btn('确认结束本月', 'confirm-month', 'primary')}</div></div></div>` : ''}
    ${s.winner ? `<div class="result"><div><span>天下大势</span><h2>${s.winner === 'victory' ? '一统天下' : '霸业未竟'}</h2>${btn('返回首页', 'menu', 'primary')}</div></div>` : ''}</div>`;
}

function battleCombatOptions(battle, unit) {
  if (!battle || !unit || !alive(unit) || unit.acted) return { attackReady: false, skillReady: false, anySkillReady: false };
  const enemies = battle.units.filter(enemy => enemy.side === 'enemy' && alive(enemy));
  const attackReady = enemies.some(enemy => attackError(battle, unit, enemy) === null);
  const skills = availableSkills(battle, unit).filter(item => item.available);
  const skillReady = skills.some(item => item.target === 'enemy' &&
    enemies.some(enemy => skillError(battle, unit, item.id, enemy) === null));
  const anySkillReady = skillReady || skills.some(item => item.target === 'none' || item.target === 'ally' &&
    battle.units.some(ally => ally.side === unit.side && alive(ally) && skillError(battle, unit, item.id, ally) === null));
  return { attackReady, skillReady, anySkillReady };
}

function selectBattleUnit(unitId, focus = false) {
  const battle = ui.game?.battle;
  const previous = battle?.units.find(unit => unit.id === ui.unitId && unit.side === 'player' && alive(unit));
  if (previous && previous.id !== unitId && previous.moved && !previous.acted) {
    const { attackReady, anySkillReady } = battleCombatOptions(battle, previous);
    if (!attackReady && !anySkillReady) {
      ui.game.battleWait(previous.id);
      if (scheduleEnemyTurnIfReady()) return true;
    }
  }
  ui.unitId = unitId;
  const selected = battle?.units.find(unit => unit.id === unitId);
  ui.battleMode = selected?.moved && battleCombatOptions(battle, selected).attackReady ? 'attack' : 'move';
  ui.battleMenuOpen = true;
  ui.battleSkillId = null;
  ui.battlePreview = null;
  if (focus) ui.battleFocus = selected || null;
  return false;
}

function advanceBattleSelection(completedId = null) {
  if (scheduleEnemyTurnIfReady()) return true;
  const battle = ui.game?.battle;
  if (!battle || ui.screen !== 'battle') return false;
  const players = battle.units.filter(unit => unit.side === 'player');
  const completedIndex = players.findIndex(unit => unit.id === completedId);
  const next = Array.from({ length: players.length }, (_, offset) =>
    players[(completedIndex + 1 + offset) % players.length]).find(unit => unit && alive(unit) && !unit.acted);
  if (!next) return false;
  selectBattleUnit(next.id, true);
  return false;
}

function battleScreen() {
  const g = ui.game, b = ui.battleReplay || g.battle;
  if (!b) { ui.screen = 'game'; return gameScreen(); }
  const from = g.city(b.fromId), to = g.city(b.toId);
  const chosen = b.units.find(u => u.id === ui.unitId && u.side === 'player' && alive(u));
  const skill = SKILLS[ui.battleSkillId];
  const active = chosen && !chosen.acted;
  const { attackReady, anySkillReady } = battleCombatOptions(b, chosen);
  const combatReady = attackReady || anySkillReady;
  const moves = new Set(active && ui.battleMode === 'move' ? reachableTiles(b, chosen).map(tile => `${tile.x},${tile.y}`) : []);
  const coverage = new Set(active && ['attack', 'skill'].includes(ui.battleMode) ? rangeCells(b, chosen, ui.battleMode === 'skill' ? ui.battleSkillId : null).map(tile => `${tile.x},${tile.y}`) : []);
  const targetError = unit => ui.battleMode === 'attack' ? attackError(b, chosen, unit) : skillError(b, chosen, ui.battleSkillId, unit);
  const previewTarget = b.units.find(unit => unit.id === ui.battlePreview?.targetId);
  const tiles = Array.from({ length: b.map.width * b.map.height }, (_, i) => {
    const x = i % b.map.width, y = Math.floor(i / b.map.width), unit = occupantAt(b, x, y);
    const terrain = b.map.tiles[y][x], info = TERRAIN[terrain];
    const point = `${x},${y}`;
    const validTarget = active && unit && ['attack', 'skill'].includes(ui.battleMode) && targetError(unit) === null;
    const skillTarget = validTarget && ui.battleMode === 'skill';
    const blocked = active && unit && coverage.has(point) && !validTarget && (ui.battleMode === 'attack' && unit.side === 'enemy' || ui.battleMode === 'skill' && unit.side === (skill?.target === 'ally' ? 'player' : 'enemy'));
    return `<button class="tile terrain-${terrain} ${moves.has(point) ? 'reachable' : ''} ${coverage.has(point) ? 'range-covered' : ''} ${validTarget ? 'targetable' : ''} ${skillTarget ? 'skill-target' : ''} ${unit && previewTarget?.id === unit.id ? 'preview-target' : ''} ${blocked ? 'range-blocked' : ''} ${unit?.side || ''} ${unit?.side === 'player' ? unit.acted ? 'unit-acted' : 'unit-ready' : ''} ${chosen && unit && chosen.id === unit.id ? 'selected' : ''} ${x === b.map.objective.x && y === b.map.objective.y ? 'objective' : ''}" data-action="tile" data-x="${x}" data-y="${y}" title="${safe(info.name)}${unit ? ` · ${safe(unit.name)} · ${safe(unit.armsType)} · ${fmt(unit.troops)}兵${unit.side === 'player' ? unit.acted ? ' · 已行动' : ' · 可行动' : ''}` : ''}" aria-label="${safe(info.name)}${unit ? `，${safe(unit.name)}，${safe(unit.armsType)}，${fmt(unit.troops)}兵${unit.side === 'player' ? unit.acted ? '，已行动' : '，可行动' : ''}` : ''}${validTarget && ui.battleMode === 'attack' ? '，可点击攻击' : skillTarget ? '，可点击施计' : blocked ? '，当前不可选择' : ''}">${blocked ? '<em>×</em>' : ''}${unit ? `<b class="battle-unit-logo"><img src="${armyLogo(unit.armsType)}" alt=""></b><small>${fmt(unit.troops)}</small>` : ''}${validTarget && ui.battleMode === 'attack' ? '<img class="battle-attack-mark" src="./src/assets/images/attack-target.svg" alt="" aria-hidden="true">' : ''}${skillTarget ? '<img class="battle-skill-mark" src="./src/assets/images/skill-target.svg" alt="" aria-hidden="true">' : ''}</button>`;
  }).join('');
  const skillList = chosen && ui.battleMode === 'skills' ? `<div class="battle-skill-list">${availableSkills(b, chosen).map(item => `<button data-action="battle-skill-pick" data-id="${item.id}" ${item.available ? '' : 'disabled'}><strong>${safe(item.name)}</strong><small>${item.target === 'none' ? '无需目标' : `${item.target === 'ally' ? '友军' : '敌军'} · ${rangeCells(b, chosen, item.id).length} 格`} · ${item.cost} MP${item.available ? '' : ` · ${safe(skillError(b, chosen, item.id))}`}</small></button>`).join('')}</div>` : '';
  const modeHint = !chosen ? '点选我军武将，在地图上方选择行动。' : chosen.acted ? '该武将已行动，点选下一位。' : ui.battleMode === 'attack' ? chosen.moved ? '攻击范围已高亮，点击发光的敌军直接攻击。' : '攻击范围已高亮。点击发光的敌军。' : ui.battleMode === 'skill' ? `${skill.name}范围已高亮，点击带施计图标的目标直接施计。` : ui.battleMode === 'skills' ? '在地图上方选择计谋。' : chosen.moved ? combatReady ? '行军完成：选择可用的计谋，也可待机或撤回。' : '附近没有可攻击或施计的敌军，可待机或撤回。' : '点击亮格行军；再次点武将可打开操作。';
  const postMarchButtons = `${attackReady ? btn('⚔ 攻击', 'battle-attack', ui.battleMode === 'attack' ? 'primary' : 'combat-ready') : ''}${anySkillReady ? btn('✦ 计谋', 'battle-skill-open', 'combat-ready') : ''}${btn('待机', 'battle-wait', combatReady ? 'standby' : 'primary')}${btn('↶ 撤回', 'battle-undo', 'undo')}`;
  const preMarchButtons = `${btn('◇ 移动', 'battle-move', ui.battleMode === 'move' ? 'primary' : 'quiet')}${attackReady ? btn('⚔ 攻击', 'battle-attack', 'combat-ready') : ''}${anySkillReady ? btn('✦ 计谋', 'battle-skill-open', 'combat-ready') : ''}${btn('待机', 'battle-wait', 'standby')}`;
  const contextBody = ui.battleMode === 'skills' && chosen ? `<div class="battle-context-head"><strong>${safe(chosen.name)} · 选择计谋</strong><button data-action="battle-skill-close" aria-label="返回操作">×</button></div>${skillList}`
    : `<div class="battle-context-head"><strong>${safe(chosen?.name)} · 选择行动</strong><button data-action="battle-context-close" aria-label="收起操作">×</button></div><div class="battle-context-choices">${chosen?.moved ? postMarchButtons : preMarchButtons}</div>`;
  const commandTray = !ui.battleAnimating && active && ui.battleMenuOpen ? `<div class="battle-command-tray ${ui.battleMode === 'skills' ? 'is-skills' : ''}" role="group" aria-label="武将操作">${contextBody}</div>` : '';
  return `<div class="battle-shell"><header class="battle-header"><div><div class="eyebrow">${safe(b.map.name)} · ${safe(from.name)} → ${safe(to.name)}</div><h1>第 ${b.turn}/${b.turnLimit || 12} 回合 <span>· ${safe(b.weather)}</span></h1></div><strong>粮 ${fmt(b.supplies.player)} / 敌 ${fmt(b.supplies.enemy)}<small>预报 ${safe(b.forecast)} · <button data-action="battle-log">战况</button> · <button data-action="battle-more">更多</button></small><button class="battle-end-turn" data-action="battle-turn" ${autoEnemyTurnPending ? 'disabled' : ''}>${autoEnemyTurnPending ? '敌军行动中…' : '结束回合 →'}</button></strong></header>
    <main class="battle-layout"><div class="battle-main"><div class="battle-status">${safe(b.message)}</div><div class="battle-map-toolbar"><span>${chosen ? `${safe(chosen.name)} · ${fmt(chosen.troops)} 兵` : '拖动地图查看战场'}</span><button data-action="battle-overview" title="查看整张战场">全图</button><button data-action="battle-focus-player" title="定位我军">我军</button><button data-action="battle-focus-city" title="定位城池">城池</button></div>${commandTray}<div class="battle-map-frame"><div class="battle-viewport" aria-label="战场地图，可上下左右拖动"><div class="battle-map-content"><canvas class="battle-terrain-canvas" width="${b.map.width * 32}" height="${b.map.height * 32}" aria-hidden="true"></canvas><div class="battle-grid" style="grid-template-columns:repeat(${b.map.width},var(--battle-cell));grid-template-rows:repeat(${b.map.height},var(--battle-cell));width:max-content;height:max-content">${tiles}</div></div></div></div><div class="battle-guide">${safe(modeHint)} · 拖动地图查看全场</div><div class="battle-selected-info">${chosen ? `<img class="battle-selected-logo" src="${armyLogo(chosen.armsType)}" alt="">${safe(chosen.name)} · ${safe(chosen.armsType)} · 兵 ${fmt(chosen.troops)} · HP ${chosen.hp}/${chosen.maxHp} · MP ${chosen.mp}/${chosen.maxMp}` : b.mode === 'defend' ? '守住城池核心，或击溃敌军。' : '夺取城池核心，或击溃守军。'}</div></div>
    <aside class="battle-side"><div class="battle-unit-strip">${b.units.filter(u => u.side === 'player').map(u => `<button class="unit-item ${ui.unitId === u.id ? 'selected' : ''} ${u.acted ? 'unit-acted' : 'unit-ready'}" data-action="unit" data-id="${u.id}" aria-label="${safe(u.name)}，${u.acted ? '已行动' : '可行动'}，${fmt(u.troops)}兵" ${!alive(u) ? 'disabled' : ''}><img class="battle-roster-logo" src="${armyLogo(u.armsType)}" alt=""><span class="battle-roster-copy"><span>${safe(u.name)}</span><strong>${fmt(u.troops)}</strong><small>${u.acted ? '已行动' : safe(u.armsType)}</small></span></button>`).join('')}</div></aside></main>${ui.battleMoreOpen ? `<div class="report-overlay"><div class="report-dialog battle-more-dialog" role="dialog" aria-modal="true"><h2>战场设置</h2><p>目标范围：${battleRangeRule(b) === 'classic' ? '经典掩码 · 无自动反击' : '手机版规则 · 概率反击'}</p>${btn(battleRangeRule(b) === 'classic' ? '切换到手机版范围' : '切换到经典范围（无反击）', 'battle-rule-toggle', 'quiet')}${btn('保存战局', 'save', 'quiet')}${b.mode === 'attack' ? btn('撤军', 'retreat', 'quiet') : ''}${btn('返回战场', 'battle-more-close', 'primary')}</div></div>` : ''}${ui.battleOverviewOpen ? `<div class="report-overlay"><div class="report-dialog battle-overview-dialog" role="dialog" aria-modal="true"><h2>全图态势 · ${b.map.width}×${b.map.height}</h2><p>点地图上的位置，返回战术视角。</p><canvas class="battle-overview-map" width="320" height="320" data-action="battle-overview-pick" role="button" tabindex="0" aria-label="全图态势，点选区域移动镜头"></canvas>${battleIconLegend()}${btn('返回战场', 'battle-overview-close', 'primary')}</div></div>` : ''}${ui.battleLogOpen ? `<div class="report-overlay"><div class="report-dialog battle-log-dialog" role="dialog" aria-modal="true"><h2>战场纪事</h2><div class="battle-log-entries">${(b.log || []).map(entry => `<p><b>第 ${entry.round} 回合</b> ${safe(entry.text)}</p>`).join('') || '<p>战斗刚刚开始。</p>'}</div>${btn('返回战场', 'battle-log-close', 'primary')}</div></div>` : ''}${saveManager()}</div>`;
}

function battleIconLegend() {
  const armies = [['骑兵','cavalry'], ['步兵','infantry'], ['弓兵','archer'], ['水军','navy'], ['极兵','elite'], ['玄兵','mystic']];
  return `<div class="battle-icon-legend"><strong>兵种</strong><div>${armies.map(([name, file]) => `<span><img src="${ARMY_ART[file]}" alt="">${name}</span>`).join('')}</div><strong>地形</strong><div>${Object.entries(TERRAIN).map(([file, info]) => `<span><img src="${TERRAIN_ART[file]}" alt="">${safe(info.name)}</span>`).join('')}</div></div>`;
}

function terrainImage(name) {
  if (!terrainImageCache.has(name)) terrainImageCache.set(name, new Promise(resolve => {
    const picture = new Image();
    picture.onload = () => resolve(picture);
    picture.onerror = () => resolve(null);
    picture.src = TERRAIN_ART[name] || TERRAIN_ART.plain;
  }));
  return terrainImageCache.get(name);
}

function drawBattleTerrain() {
  const canvas = app.querySelector('.battle-terrain-canvas'), map = (ui.battleReplay || ui.game?.battle)?.map;
  if (!canvas || !map) return;
  const cells = Array.from({ length: map.width * map.height }, (_, index) =>
    terrainVisual(map, index % map.width, Math.floor(index / map.width)));
  const names = [...new Set(cells)];
  Promise.all(names.map(terrainImage)).then(pictures => {
    if (!canvas.isConnected) return;
    const art = new Map(names.map((name, index) => [name, pictures[index]]));
    const context = canvas.getContext('2d');
    if (!context) return;
    context.imageSmoothingEnabled = false;
    for (let index = 0; index < cells.length; index++) {
      const x = index % map.width, y = Math.floor(index / map.width);
      const picture = art.get(cells[index]);
      if (picture) context.drawImage(picture, x * 32, y * 32, 32, 32);
    }
  });
}

function drawBattleOverview() {
  const viewport = app.querySelector('.battle-viewport');
  const battle = ui.battleReplay || ui.game?.battle;
  if (!viewport || !battle) return;
  const colors = { plain: '#b6a577', grass: '#7e9b68', mountain: '#77786c', forest: '#426e50', river: '#4b8ba2', bridge: '#c8a975', city: '#e3bb80', village: '#bda070', camp: '#9b7558' };
  for (const canvas of app.querySelectorAll('.battle-overview-map')) {
    const context = canvas.getContext('2d');
    if (!context) continue;
    const scale = canvas.width / battle.map.width;
    for (let y = 0; y < battle.map.height; y++) for (let x = 0; x < battle.map.width; x++) {
      context.fillStyle = colors[battle.map.tiles[y][x]] || '#39483b';
      context.fillRect(x * scale, y * scale, Math.ceil(scale), Math.ceil(scale));
    }
    context.fillStyle = '#dbc18d';
    for (const position of visualRoadCells(battle.map)) {
      const [x, y] = position.split(',').map(Number);
      if (!['plain', 'grass'].includes(battle.map.tiles[y]?.[x])) continue;
      context.fillRect(x * scale, y * scale, Math.max(1, scale * .65), Math.max(1, scale * .65));
    }
    for (const unit of battle.units.filter(alive)) {
      context.fillStyle = unit.side === 'player' ? '#6ee7bd' : '#f47767';
      context.fillRect(unit.x * scale - 1, unit.y * scale - 1, Math.max(5, scale * 1.4), Math.max(5, scale * 1.4));
    }
    context.strokeStyle = '#fff1c7';
    context.lineWidth = 1;
    const cell = viewport.querySelector('.tile')?.getBoundingClientRect().width || 32;
    context.strokeRect(viewport.scrollLeft / cell * scale, viewport.scrollTop / cell * scale,
      Math.min(battle.map.width, viewport.clientWidth / cell) * scale, Math.min(battle.map.height, viewport.clientHeight / cell) * scale);
  }
}

function render() {
  if (!ui.catalog) return;
  const previousViewport = app.querySelector('.battle-viewport');
  if (previousViewport && !ui.battleFocus) ui.battleViewport = { left: previousViewport.scrollLeft, top: previousViewport.scrollTop };
  document.body.classList.toggle('playing', ui.screen === 'game');
  document.body.classList.toggle('battling', ui.screen === 'battle');
  app.classList.toggle('scenario-screen', ui.screen === 'scenarios');
  const orderScrollY = app.querySelector('.order-person-list')?.scrollTop ?? 0;
  const view = { menu, scenarios, rulers, game: gameScreen, battle: battleScreen }[ui.screen] || menu;
  app.innerHTML = view() + (ui.toast ? `<div class="toast" role="status">${safe(ui.toast)}</div>` : '');
  const viewport = app.querySelector('.battle-viewport');
  if (viewport) {
    if (ui.battleFocus) {
      const cell = viewport.querySelector('.tile')?.getBoundingClientRect().width || 32;
      viewport.scrollLeft = Math.max(0, ui.battleFocus.x * cell - viewport.clientWidth / 2 + cell / 2);
      viewport.scrollTop = Math.max(0, ui.battleFocus.y * cell - viewport.clientHeight / 2 + cell / 2);
      ui.battleFocus = null;
    } else if (ui.battleViewport) {
      viewport.scrollLeft = ui.battleViewport.left;
      viewport.scrollTop = ui.battleViewport.top;
    } else if (ui.game?.battle) {
      const first = ui.game.battle.units.find(unit => unit.side === 'player' && alive(unit));
      const cell = viewport.querySelector('.tile')?.getBoundingClientRect().width || 32;
      viewport.scrollLeft = Math.max(0, (first?.x ?? 16) * cell - viewport.clientWidth / 2);
      viewport.scrollTop = Math.max(0, (first?.y ?? 16) * cell - viewport.clientHeight / 2);
    }
    ui.battleViewport = { left: viewport.scrollLeft, top: viewport.scrollTop };
    drawBattleTerrain();
    drawBattleOverview();
  }
  const newOrderList = app.querySelector('.order-person-list');
  if (newOrderList) newOrderList.scrollTop = orderScrollY;
  if (renderedScreen !== ui.screen) window.scrollTo(0, 0);
  renderedScreen = ui.screen;
}

function loadSlot(slot) {
  const save = readSlot(slot);
  if (!save) throw new Error('此位置尚无存档');
  ui.game = GameModel.restore(save.state, ui.catalog);
  ui.economyDraft = null;
  ui.pendingItem = null;
  ui.generalId = null;
  ui.cityId = ui.game.ownedCities()[0]?.id ?? 0;
  ui.commandMenu = null;
  ui.pendingOrder = null;
  ui.moveSourceId = null;
  ui.scoutSourceId = null;
  ui.pendingDistribution = null;
  ui.battleAfterDistribution = false;
  ui.report = null;
  ui.worldReport = null;
  ui.pendingSiegeWorldReport = ui.game.battle?.mode === 'defend' ? ui.game.worldHistory[0] || null : null;
  ui.worldReportIndex = 0;
  ui.worldReportFromHistory = false;
  ui.saveMenu = false;
  ui.saveConfirm = null;
  ui.importPreview = null;
  ui.unitId = null;
  ui.battleMode = 'move';
  ui.battleMenuOpen = false;
  ui.battleSkillId = null;
  ui.battlePreview = null;
  ui.battleMoreOpen = false;
  ui.battleLogOpen = false;
  ui.battleOverviewOpen = false;
  ui.battleViewport = null;
  ui.battleFocus = null;
  ui.screen = ui.game.battle ? 'battle' : 'game';
  ui.toast = '';
  render();
  if (ui.screen === 'battle') scheduleEnemyTurnIfReady();
}

function selectMoveDestination(targetId) {
  const sourceId = ui.moveSourceId;
  if (sourceId === null) return;
  const target = ui.game.transportTargets(sourceId).find(item => item.city.id === Number(targetId));
  if (!target) throw new Error('请选择地图上发光的、道路可达的己方城池');
  ui.pendingOrder = { type: 'move', cityId: sourceId, targetId: target.city.id, selectedIds: [], returnMenu: 'move-map' };
}

function selectScoutDestination(targetId) {
  const sourceId = ui.scoutSourceId;
  if (sourceId === null) return;
  const target = ui.game.city(targetId);
  if (!target || target.id === sourceId || target.owner === ui.game.player) throw new Error('请选择地图上发光的非己方城池');
  ui.pendingOrder = { type: 'scout', cityId: sourceId, targetId: target.id, selectedIds: [], returnMenu: 'scout-map' };
}

async function animateBattleMarch(path, stepDuration = 165) {
  if (path.length < 2 || document.hidden || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const grid = app.querySelector('.battle-grid');
  const viewport = app.querySelector('.battle-viewport');
  const start = path[0];
  const source = grid?.querySelector(`[data-x="${start.x}"][data-y="${start.y}"]`);
  if (!source || !viewport || !source.animate) return;
  const cell = source.getBoundingClientRect().width;
  const sprite = source.cloneNode(true);
  sprite.classList.remove('reachable', 'selected');
  sprite.classList.add('march-sprite');
  sprite.removeAttribute('data-action');
  sprite.removeAttribute('data-x');
  sprite.removeAttribute('data-y');
  sprite.setAttribute('aria-hidden', 'true');
  sprite.tabIndex = -1;
  sprite.style.left = `${start.x * cell}px`;
  sprite.style.top = `${start.y * cell}px`;
  source.classList.add('march-origin');
  grid.append(sprite);
  const routeTiles = path.slice(1).map(({ x, y }) => grid.querySelector(`[data-x="${x}"][data-y="${y}"]`));
  routeTiles.forEach(tile => tile?.classList.add('march-route'));
  try {
    for (let step = 1; step < path.length; step++) {
      const from = path[step - 1], to = path[step];
      const fromTransform = `translate(${(from.x - start.x) * cell}px, ${(from.y - start.y) * cell}px)`;
      const toTransform = `translate(${(to.x - start.x) * cell}px, ${(to.y - start.y) * cell}px)`;
      const screenX = to.x * cell - viewport.scrollLeft;
      const screenY = to.y * cell - viewport.scrollTop;
      if (screenX < cell || screenX > viewport.clientWidth - cell * 2) viewport.scrollLeft = to.x * cell - viewport.clientWidth / 2;
      if (screenY < cell || screenY > viewport.clientHeight - cell * 2) viewport.scrollTop = to.y * cell - viewport.clientHeight / 2;
      const motion = sprite.animate([{ transform: fromTransform }, { transform: toTransform }], {
        duration: stepDuration, easing: 'ease-in-out', fill: 'forwards'
      });
      await motion.finished;
      sprite.style.transform = toTransform;
      motion.cancel();
      routeTiles[step - 1]?.classList.remove('march-route');
    }
  } finally {
    sprite.remove();
    source.classList.remove('march-origin');
    routeTiles.forEach(tile => tile?.classList.remove('march-route'));
  }
}

async function finishBattleMarch(preview, unitId) {
  let autoFinishTurn = false;
  try {
    try { await animateBattleMarch(preview.path); }
    catch (error) { console.warn('行军动画中断，直接完成移动', error); }
    const targetCityId = ui.game.battle?.toId;
    ui.game.battleAction(unitId, preview.x, preview.y);
    if (!ui.game.battle) {
      ui.screen = 'game';
      ui.unitId = null;
      ui.battleMenuOpen = false;
      showBattleReport(targetCityId);
      return;
    }
    ui.battleFocus = ui.game.battle?.units.find(unit => unit.id === unitId) || null;
    const battle = ui.game.battle;
    const movedUnit = battle.units.find(unit => unit.id === unitId);
    const { attackReady, anySkillReady } = battleCombatOptions(battle, movedUnit);
    const othersCanAct = battle.units.some(unit => unit.side === 'player' && unit.id !== unitId && alive(unit) && !unit.acted);
    if (!attackReady && !anySkillReady && !othersCanAct) {
      ui.game.battleWait(unitId);
      ui.battleMode = 'move';
      ui.battleMenuOpen = false;
      autoFinishTurn = true;
    } else {
      ui.battleMode = attackReady ? 'attack' : 'move';
      ui.battleMenuOpen = true;
    }
  } catch (error) {
    console.error('行军失败', error);
    ui.toast = error.message;
  } finally {
    ui.battleAnimating = false;
    if (!autoFinishTurn || !scheduleEnemyTurnIfReady()) render();
  }
}

const battleMotionReduced = () => document.hidden || window.matchMedia('(prefers-reduced-motion: reduce)').matches;

async function playBattleHit(effect, quick = false) {
  const grid = app.querySelector('.battle-grid');
  const viewport = app.querySelector('.battle-viewport');
  const targetUnit = ui.battleReplay?.units.find(unit => unit.id === effect.targetId);
  if (!grid || !viewport || !targetUnit) return;
  const cell = grid.querySelector('.tile')?.getBoundingClientRect().width || 32;
  viewport.scrollLeft = Math.max(0, effect.to.x * cell - viewport.clientWidth / 2 + cell / 2);
  viewport.scrollTop = Math.max(0, effect.to.y * cell - viewport.clientHeight / 2 + cell / 2);
  const source = grid.querySelector(`[data-x="${effect.from.x}"][data-y="${effect.from.y}"]`);
  const target = grid.querySelector(`[data-x="${effect.to.x}"][data-y="${effect.to.y}"]`);
  if (!target) return;
  const reduced = battleMotionReduced();
  source?.classList.add('battle-strike-source');
  if (!reduced) {
    const shot = document.createElement('span');
    shot.className = effect.kind === 'skill' ? 'battle-shot skill' : ['弓兵', '水军', '玄兵'].includes(effect.armsType) ? 'battle-shot ranged' : 'battle-shot melee';
    shot.style.left = `${(effect.from.x + .5) * cell}px`;
    shot.style.top = `${(effect.from.y + .5) * cell}px`;
    grid.append(shot);
    const dx = (effect.to.x - effect.from.x) * cell, dy = (effect.to.y - effect.from.y) * cell;
    const angle = Math.atan2(dy, dx) * 180 / Math.PI;
    try {
      await shot.animate([
        { transform: `translate(-50%,-50%) rotate(${angle}deg) scale(.55)`, opacity: 0 },
        { transform: `translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px)) rotate(${angle}deg) scale(1.1)`, opacity: 1 }
      ], { duration: quick ? 135 : effect.kind === 'counter' ? 180 : 220, easing: 'ease-out', fill: 'forwards' }).finished;
    } finally { shot.remove(); }
  }
  source?.classList.remove('battle-strike-source');
  target.classList.add('battle-hit-impact');
  targetUnit.troops = effect.after;
  targetUnit.hp = effect.afterHp;
  const counter = target.querySelector('small');
  if (counter) counter.textContent = fmt(effect.after);
  const float = document.createElement('span');
  float.className = `battle-damage-float ${effect.side === 'player' ? 'friendly-loss' : 'enemy-loss'}`;
  float.textContent = `−${fmt(effect.loss)}`;
  float.style.left = `${(effect.to.x + .5) * cell}px`;
  float.style.top = `${(effect.to.y + .25) * cell}px`;
  grid.append(float);
  try {
    if (!reduced) await float.animate([
      { transform: 'translate(-50%,4px) scale(.7)', opacity: 0 },
      { transform: 'translate(-50%,-12px) scale(1.18)', opacity: 1, offset: .22 },
      { transform: 'translate(-50%,-35px) scale(1)', opacity: 0 }
    ], { duration: quick ? 440 : 640, easing: 'ease-out', fill: 'forwards' }).finished;
    else await new Promise(resolve => setTimeout(resolve, 160));
  } finally { float.remove(); target.classList.remove('battle-hit-impact'); }
}

async function playBattleEffects(effects, targetCityId, quick = false, completedId = null) {
  try {
    for (const effect of effects) {
      if (effect.type === 'move') {
        await animateBattleMarch(effect.path, quick ? 85 : 165);
        const unit = ui.battleReplay.units.find(item => item.id === effect.unitId);
        if (unit) { unit.x = effect.path.at(-1).x; unit.y = effect.path.at(-1).y; }
        render();
      } else if (effect.type === 'hit') {
        await playBattleHit(effect, quick);
        render();
      }
    }
  } catch (error) { console.warn('战斗特效中断，显示最终战况', error); }
  finally {
    ui.battleReplay = null;
    ui.battleAnimating = false;
    if (!ui.game.battle) { ui.screen = 'game'; ui.unitId = null; showBattleReport(targetCityId); }
    else if (quick) advanceBattleSelection();
    else if (advanceBattleSelection(completedId)) return;
    render();
  }
}

function scheduleEnemyTurnIfReady() {
  const battle = ui.game?.battle;
  if (autoEnemyTurnPending || ui.screen !== 'battle' || !battle) return false;
  const players = battle.units.filter(unit => unit.side === 'player' && alive(unit));
  if (!players.length || players.some(unit => !unit.acted)) return false;
  autoEnemyTurnPending = true;
  ui.battleAnimating = true;
  ui.unitId = null;
  ui.battleMode = 'move';
  ui.battleMenuOpen = false;
  ui.battleSkillId = null;
  ui.battlePreview = null;
  battle.message = '我军本回合行动完毕，敌军开始行动。';
  render();
  setTimeout(() => {
    autoEnemyTurnPending = false;
    if (ui.screen !== 'battle' || ui.game?.battle !== battle) { ui.battleAnimating = false; return; }
    ui.battleAnimating = false;
    try { if (!startBattleEffects(() => ui.game.endBattleTurn(), { resetSelection: true })) render(); }
    catch (error) { console.error('敌军回合失败', error); ui.toast = error.message; render(); }
  }, 480);
  return true;
}

function startBattleEffects(action, { resetSelection = false } = {}) {
  const before = JSON.parse(JSON.stringify(ui.game.battle));
  const completedId = resetSelection ? null : ui.unitId;
  ui.game.beginBattleEffects();
  let effects;
  try { action(); effects = ui.game.takeBattleEffects(); }
  catch (error) { ui.game.takeBattleEffects(); throw error; }
  if (resetSelection) ui.unitId = null;
  ui.battlePreview = null;
  ui.battleSkillId = null;
  ui.battleMode = 'move';
  ui.battleMenuOpen = false;
  if (!effects.length) {
    if (!ui.game.battle) { ui.screen = 'game'; showBattleReport(before.toId); }
    else if (resetSelection) advanceBattleSelection();
    return false;
  }
  ui.battleReplay = before;
  ui.battleAnimating = true;
  render();
  void playBattleEffects(effects, before.toId, resetSelection, completedId);
  return true;
}

app.addEventListener('click', event => {
  const t = event.target.closest('[data-action]');
  if (!t || t.disabled) return;
  if (t.dataset.action === 'tile' && Date.now() - battleDragAt < 350) return;
  if (ui.battleAnimating) return;
  try {
    ui.toast = '';
    const a = t.dataset.action;
    if (a === 'menu') { ui.screen = 'menu'; ui.commandMenu = null; ui.generalId = null; ui.economyDraft = null; ui.pendingItem = null; ui.moveSourceId = null; ui.scoutSourceId = null; ui.confirmMonth = false; ui.pendingOrder = null; ui.pendingDistribution = null; ui.battleAfterDistribution = false; ui.report = null; ui.worldReport = null; ui.pendingSiegeWorldReport = null; ui.worldReportIndex = 0; ui.worldReportFromHistory = false; ui.saveMenu = false; }
    else if (a === 'new') { ui.screen = 'scenarios'; ui.ruler = null; }
    else if (a === 'scenarios') ui.screen = 'scenarios';
    else if (a === 'scenario') { ui.scenario = Number(t.dataset.id); ui.ruler = null; }
    else if (a === 'rulers') ui.screen = 'rulers';
    else if (a === 'ruler') ui.ruler = t.dataset.ruler;
    else if (a === 'start') { ui.game = new GameModel(ui.catalog, ui.scenario, ui.ruler); ui.cityId = ui.game.ownedCities()[0]?.id ?? 0; ui.commandMenu = null; ui.generalId = null; ui.economyDraft = null; ui.pendingItem = null; ui.moveSourceId = null; ui.scoutSourceId = null; ui.pendingOrder = null; ui.pendingDistribution = null; ui.battleAfterDistribution = false; ui.report = null; ui.worldReport = null; ui.pendingSiegeWorldReport = null; ui.worldReportIndex = 0; ui.worldReportFromHistory = false; ui.saveMenu = false; ui.screen = 'game'; }
    else if (a === 'load' || a === 'open-saves' || a === 'save') { ui.saveMenu = true; ui.saveConfirm = null; ui.importPreview = null; }
    else if (a === 'close-saves') { ui.saveMenu = false; ui.saveConfirm = null; ui.importPreview = null; }
    else if (['save-slot', 'load-slot', 'export-slot', 'import-slot'].includes(a)) {
      const slot = Number(t.closest('[data-slot]')?.dataset.slot);
      if (a === 'save-slot') {
        if (!ui.game) throw new Error('请先进入战局');
        if (listSlots()[slot - 1]?.save || listSlots()[slot - 1]?.error) ui.saveConfirm = { slot, mode: 'save' };
        else { writeSlot(slot, ui.game.state); ui.saveMenu = false; ui.toast = `战局已保存到存档 ${slot}。`; }
      } else if (a === 'load-slot') {
        if (ui.game && ['game','battle'].includes(ui.screen)) ui.saveConfirm = { slot, mode: 'load' };
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
      if (nearest?.distance <= 25) {
        if (ui.scoutSourceId !== null) selectScoutDestination(nearest.city.id);
        else if (ui.moveSourceId !== null) selectMoveDestination(nearest.city.id);
        else ui.cityId = nearest.city.id;
      }
    }
    else if (a === 'city') { if (ui.scoutSourceId !== null) selectScoutDestination(t.dataset.id); else if (ui.moveSourceId !== null) selectMoveDestination(t.dataset.id); else { ui.moveSourceId = null; ui.scoutSourceId = null; ui.cityId = Number(t.dataset.id); ui.commandMenu = null; ui.generalId = null; ui.economyDraft = null; ui.pendingItem = null; } }
    else if (a === 'start-move-map') { ui.moveSourceId = ui.cityId; ui.commandMenu = null; }
    else if (a === 'cancel-move-map') { ui.moveSourceId = null; ui.pendingOrder = null; ui.commandMenu = 'personnel'; }
    else if (a === 'start-scout-map') { ui.scoutSourceId = ui.cityId; ui.commandMenu = null; }
    else if (a === 'cancel-scout-map') { ui.scoutSourceId = null; ui.pendingOrder = null; ui.commandMenu = 'military'; }
    else if (a === 'open-command') { ui.moveSourceId = null; ui.scoutSourceId = null; ui.battleAfterDistribution = false; ui.commandMenu = t.dataset.id; }
    else if (a === 'battle-prepare-distribution') { ui.battleAfterDistribution = true; ui.commandMenu = 'distribution'; }
    else if (a === 'battle-prepare-month') { ui.commandMenu = null; ui.confirmMonth = true; }
    else if (a === 'view-general') { ui.generalId = t.dataset.id; ui.commandMenu = 'general'; }
    else if (a === 'close-command') { ui.commandMenu = null; ui.generalId = null; ui.economyDraft = null; ui.pendingItem = null; ui.battleAfterDistribution = false; }
    else if (a === 'command-back') {
      ui.commandMenu = ui.battleAfterDistribution && ui.commandMenu === 'distribution' ? 'targets' : ui.commandMenu === 'general' ? 'city' : ['captives', 'dispose-people', 'treat-people', 'items'].includes(ui.commandMenu) ? 'personnel' : ui.commandMenu === 'dispose-choice' ? 'dispose-people' : ['exchange', 'transport'].includes(ui.commandMenu) ? 'domestic' : ui.commandMenu === 'item-people' ? 'give' : ['give', 'confiscate'].includes(ui.commandMenu) ? 'items' : 'military';
      if (ui.commandMenu === 'targets') ui.battleAfterDistribution = false;
      if (ui.commandMenu !== 'general') ui.generalId = null;
      ui.economyDraft = null;
      if (ui.commandMenu !== 'item-people') ui.pendingItem = null;
    }
    else if (a === 'select-give-item') { ui.pendingItem = { itemId: t.dataset.id }; ui.commandMenu = 'item-people'; }
    else if (a === 'apply-give-item' || a === 'apply-confiscate-item') {
      const city = ui.game.city(ui.cityId), personId = a === 'apply-give-item' ? t.dataset.id : t.dataset.person;
      const report = ui.game.manageItem(city.id, personId, a === 'apply-give-item' ? ui.pendingItem.itemId : t.dataset.id, a === 'apply-give-item' ? 'give' : 'confiscate');
      ui.commandMenu = null;
      ui.pendingItem = null;
      ui.report = { title: '道具回报', items: [report] };
    }
    else if (a === 'open-economy') {
      const type = t.dataset.id;
      ui.economyDraft = type === 'exchange' ? { type, cityId: ui.cityId, direction: 'buy', amount: exchangeDefault(ui.game.city(ui.cityId), 'buy') } : { type, cityId: ui.cityId, targetId: ui.game.transportTargets(ui.cityId)[0]?.city.id, food: 0, money: 0, troops: 0 };
      ui.commandMenu = type;
    }
    else if (a === 'economy-direction') { ui.economyDraft.direction = t.dataset.id; ui.economyDraft.amount = exchangeDefault(ui.game.city(ui.economyDraft.cityId), t.dataset.id); }
    else if (a === 'economy-preset') ui.economyDraft.amount = Number(t.dataset.id);
    else if (a === 'economy-target') ui.economyDraft.targetId = Number(t.dataset.id);
    else if (a === 'economy-max') {
      const draft = ui.economyDraft, city = ui.game.city(draft.cityId), key = t.dataset.id;
      draft[key] = key === 'amount' ? draft.direction === 'buy' ? Math.floor(city.money / 5) : Math.max(0, Math.min(city.food, Math.floor((30000 - city.money) / 2))) : city[key];
    }
    else if (a === 'economy-choose-general') {
      const draft = ui.economyDraft, city = ui.game.city(draft.cityId);
      if (draft.type === 'exchange') {
        const max = exchangeLimit(city, draft.direction);
        if (!Number.isSafeInteger(draft.amount) || draft.amount < 1 || draft.amount > max) throw new Error('交易数量超出可交易范围');
      } else if (!ui.game.transportTargets(city.id).some(item => item.city.id === draft.targetId) || ![draft.food, draft.money, draft.troops].some(Boolean)) throw new Error('请选择目的城和至少一种物资');
      ui.pendingOrder = { ...draft, selectedIds: [], returnMenu: draft.type };
      ui.commandMenu = null;
    }
    else if (a === 'menu-order') {
      const city = ui.game.city(ui.cityId), type = t.dataset.id;
      ui.pendingOrder = { type, cityId: city.id, selectedIds: [], returnMenu: ui.commandMenu, recruitAmount: type === 'recruit' ? maxRecruitAmount(city) : 0, recruitManual: false };
      ui.commandMenu = null;
    }
    else if (a === 'menu-battle-target') { ui.pendingOrder = { type: 'battle', cityId: ui.cityId, targetId: Number(t.dataset.id), selectedIds: [], returnMenu: 'targets' }; ui.commandMenu = null; }
    else if (a === 'menu-surrender-target') { ui.pendingOrder = { type: 'surrender', cityId: ui.cityId, targetId: t.dataset.id, selectedIds: [], returnMenu: 'captives' }; ui.commandMenu = null; }
    else if (a === 'menu-dispose-target') { ui.personnelTargetId = t.dataset.id; ui.commandMenu = 'dispose-choice'; }
    else if (a === 'apply-dispose') {
      const action = t.dataset.id;
      const report = ui.game.disposeGeneral(ui.cityId, ui.personnelTargetId, action);
      ui.commandMenu = null;
      ui.personnelTargetId = null;
      ui.report = { title: action === 'execute' ? '处斩回报' : '流放回报', items: [report] };
    }
    else if (a === 'apply-treat') {
      const report = ui.game.treatGeneral(ui.cityId, t.dataset.id);
      ui.commandMenu = null;
      ui.report = { title: '宴请回报', items: [report] };
    }
    else if (a === 'menu-distribute-general' || a === 'general-distribute') {
      const city = ui.game.city(ui.cityId), general = city.generals.find(person => person.id === (a === 'general-distribute' ? ui.generalId : t.dataset.id));
      ui.pendingDistribution = { cityId: city.id, personId: general.id, amount: Math.min(ui.game.maxTroops(general), city.troops + general.troops), returnMenu: ui.commandMenu };
      ui.commandMenu = null;
    }
    else if (a === 'cancel-order') { ui.commandMenu = ['move-map', 'scout-map'].includes(ui.pendingOrder?.returnMenu) ? null : ui.pendingOrder?.returnMenu || null; ui.pendingOrder = null; }
    else if (a === 'distribution-amount') ui.pendingDistribution.amount = Number(t.dataset.amount);
    else if (a === 'cancel-distribution') { ui.commandMenu = ui.pendingDistribution?.returnMenu || null; ui.pendingDistribution = null; }
    else if (a === 'save-distribution') {
      const pending = ui.pendingDistribution;
      const general = ui.game.city(pending.cityId).generals.find(person => person.id === pending.personId);
      const result = ui.game.distribute(pending.cityId, pending.personId, pending.amount);
      ui.pendingDistribution = null;
      if (ui.battleAfterDistribution) { ui.commandMenu = 'targets'; ui.battleAfterDistribution = false; }
      ui.report = { title: '兵力分配完成', items: [{ type: '兵力分配', cityId: pending.cityId, personName: general.name, result: `带兵 ${fmt(result.before)} → ${fmt(result.after)}，城池后备兵 ${fmt(result.reserve)}。` }] };
    }
    else if (a === 'choose-general') {
      const selected = ui.pendingOrder.selectedIds;
      const id = t.dataset.id;
      if (selected.includes(id)) selected.splice(selected.indexOf(id), 1);
      else if (ui.pendingOrder.type === 'battle' && selected.length >= 5) throw new Error('最多选择 5 名出征武将');
      else if (['surrender', 'exchange', 'transport', 'move', 'scout'].includes(ui.pendingOrder.type)) selected.splice(0, selected.length, id);
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
      if (pending.type === 'battle') { ui.game.startBattle(pending.cityId, pending.targetId, selectedIds); ui.screen = ui.game.battle ? 'battle' : 'game'; ui.unitId = null; ui.battleMode = 'move'; ui.battleMenuOpen = false; ui.battlePreview = null; ui.battleViewport = null; if (!ui.game.battle) showBattleReport(pending.targetId); }
      else {
        const orders = ui.game.issueOrders(pending.cityId, pending.type, selectedIds, { recruitAmount: pending.recruitAmount, targetId: pending.targetId, direction: pending.direction, amount: pending.amount, food: pending.food, money: pending.money, troops: pending.troops });
        if (['search', 'surrender', 'transport', 'move', 'raid'].includes(pending.type)) ui.toast = pending.type === 'search' ? `${orders.length} 名武将已出发寻访，结束本月后呈报结果。` : pending.type === 'surrender' ? '武将已受命招降，结束本月后呈报结果。' : pending.type === 'move' ? '武将已启程，结束本月后抵达目标城。' : pending.type === 'raid' ? `${orders.length} 名武将已受命分别掠夺本城，月末逐件呈报。` : '物资已从出发城扣除，月末呈报输送结果。';
        else ui.report = { title: `${ORDER_RULES[pending.type].label}回报`, items: orders };
      }
      ui.pendingOrder = null;
      if (pending.type === 'move') ui.moveSourceId = null;
      if (pending.type === 'scout') ui.scoutSourceId = null;
      ui.economyDraft = null;
    }
    else if (a === 'close-report') {
      ui.report = null;
      if (ui.pendingSiegeWorldReport) {
        ui.worldReport = ui.pendingSiegeWorldReport;
        ui.pendingSiegeWorldReport = null;
        ui.worldReportIndex = 0;
      }
    }
    else if (a === 'open-world-report') { ui.worldReport = ui.game.worldHistory[Number(t.dataset.id)] || null; ui.worldReportIndex = 0; ui.worldReportFromHistory = true; }
    else if (a === 'next-world-event') {
      if (ui.worldReportIndex + 1 < worldPlaybackCards(ui.worldReport).length) ui.worldReportIndex++;
      else { ui.worldReport = null; ui.worldReportIndex = 0; ui.worldReportFromHistory = false; }
    }
    else if (a === 'month') { ui.moveSourceId = null; ui.scoutSourceId = null; ui.confirmMonth = true; }
    else if (a === 'cancel-month') ui.confirmMonth = false;
    else if (a === 'confirm-month') {
      const world = ui.game.endMonth();
      if (ui.game.battle) {
        ui.pendingSiegeWorldReport = world;
        ui.worldReport = null;
        ui.screen = 'battle';
        ui.unitId = null;
        ui.battleMode = 'move';
        ui.battleMenuOpen = false;
        ui.battlePreview = null;
        ui.battleViewport = null;
      } else ui.worldReport = world;
      ui.worldReportIndex = 0;
      ui.worldReportFromHistory = false;
      ui.confirmMonth = false;
    }
    else if (a === 'unit') { if (selectBattleUnit(t.dataset.id, true)) return; }
    else if (a === 'battle-focus-player') { const unit = ui.game.battle?.units.find(item => item.side === 'player' && alive(item) && !item.acted) || ui.game.battle?.units.find(item => item.side === 'player' && alive(item)); if (unit) ui.battleFocus = unit; }
    else if (a === 'battle-focus-city') ui.battleFocus = ui.game.battle?.map.objective;
    else if (a === 'battle-overview') ui.battleOverviewOpen = true;
    else if (a === 'battle-overview-close') ui.battleOverviewOpen = false;
    else if (a === 'battle-overview-pick') { const bounds = t.getBoundingClientRect(); ui.battleFocus = { x: Math.max(0, Math.min(ui.game.battle.map.width - 1, Math.floor((event.clientX - bounds.left) / bounds.width * ui.game.battle.map.width))), y: Math.max(0, Math.min(ui.game.battle.map.height - 1, Math.floor((event.clientY - bounds.top) / bounds.height * ui.game.battle.map.height))) }; ui.battleOverviewOpen = false; }
    else if (a === 'tile') {
      const battle = ui.game.battle;
      const x = Number(t.dataset.x), y = Number(t.dataset.y), occupant = occupantAt(battle, x, y);
      const chosen = battle.units.find(unit => unit.id === ui.unitId && unit.side === 'player' && alive(unit));
      if (ui.battleMode === 'skills') throw new Error('请先选择一个计谋，或重新点选武将');
      if (ui.battleMode === 'skill') {
        const error = skillError(battle, chosen, ui.battleSkillId, occupant);
        if (!occupant || error) throw new Error(error || '请选择高亮目标');
        if (!startBattleEffects(() => ui.game.battleSkill(chosen.id, ui.battleSkillId, occupant.id)) && !advanceBattleSelection(chosen.id)) render();
        return;
      } else if (ui.battleMode === 'attack') {
        if (occupant?.side === 'player') { if (selectBattleUnit(occupant.id)) return; }
        else {
          const error = attackError(battle, chosen, occupant);
          if (error) throw new Error(error);
          if (!startBattleEffects(() => ui.game.battleAttack(chosen, occupant)) && !advanceBattleSelection(chosen.id)) render();
          return;
        }
      } else if (occupant?.side === 'player') { if (selectBattleUnit(occupant.id)) return; }
      else if (!chosen) ui.toast = `${TERRAIN[battle.map.tiles[y][x]].name} · 坐标 ${x + 1},${y + 1}。请先选择我军武将。`;
      else {
        if (occupant?.side === 'enemy') throw new Error('请先点“攻击”，再选择敌军');
        const move = reachableTiles(battle, chosen).find(tile => tile.x === x && tile.y === y);
        if (!move) throw new Error('该格无法到达');
        const unitId = ui.unitId;
        ui.battlePreview = null;
        ui.battleMenuOpen = false;
        ui.battleAnimating = true;
        render();
        void finishBattleMarch({ x, y, path: move.path }, unitId);
        return;
      }
    } else if (a === 'battle-move') { ui.battleMode = 'move'; ui.battleMenuOpen = false; ui.battleSkillId = null; ui.battlePreview = null; }
    else if (a === 'battle-attack') { ui.battleMode = 'attack'; ui.battleMenuOpen = false; ui.battleSkillId = null; ui.battlePreview = null; }
    else if (a === 'battle-skill-open') { if (!ui.unitId) throw new Error('请先选择我军武将'); ui.battleMode = 'skills'; ui.battleMenuOpen = true; ui.battlePreview = null; }
    else if (a === 'battle-skill-close') { const chosen = ui.game.battle?.units.find(unit => unit.id === ui.unitId); ui.battleMode = chosen?.moved && battleCombatOptions(ui.game.battle, chosen).attackReady ? 'attack' : 'move'; ui.battleMenuOpen = true; ui.battleSkillId = null; ui.battlePreview = null; }
    else if (a === 'battle-context-close') { ui.unitId = null; ui.battleMode = 'move'; ui.battleMenuOpen = false; ui.battleSkillId = null; ui.battlePreview = null; }
    else if (a === 'battle-log') ui.battleLogOpen = true;
    else if (a === 'battle-log-close') ui.battleLogOpen = false;
    else if (a === 'battle-more') ui.battleMoreOpen = true;
    else if (a === 'battle-more-close') ui.battleMoreOpen = false;
    else if (a === 'battle-rule-toggle') { ui.game.battle.rangeRule = battleRangeRule(ui.game.battle) === 'classic' ? 'modern' : 'classic'; ui.battleMoreOpen = false; ui.battlePreview = null; ui.toast = `已切换为${ui.game.battle.rangeRule === 'classic' ? '经典掩码' : '手机版'}目标范围`; }
    else if (a === 'battle-skill-pick') {
      const skillId = t.dataset.id;
      const chosen = ui.game.battle.units.find(unit => unit.id === ui.unitId && unit.side === 'player');
      const error = skillError(ui.game.battle, chosen, skillId);
      if (error) throw new Error(error);
      if (SKILLS[skillId].target === 'none') {
        if (!startBattleEffects(() => ui.game.battleSkill(chosen.id, skillId)) && !advanceBattleSelection(chosen.id)) render();
        return;
      } else { ui.battleMode = 'skill'; ui.battleMenuOpen = false; ui.battleSkillId = skillId; }
    }
    else if (a === 'battle-wait') { const completedId = ui.unitId; ui.game.battleWait(completedId); ui.battleMode = 'move'; ui.battleMenuOpen = false; ui.battleSkillId = null; if (advanceBattleSelection(completedId)) return; }
    else if (a === 'battle-undo') { ui.game.battleUndoMove(ui.unitId); ui.battleMode = 'move'; ui.battleMenuOpen = false; ui.battlePreview = null; }
    else if (a === 'battle-turn') { if (!startBattleEffects(() => ui.game.endBattleTurn(), { resetSelection: true })) render(); return; }
    else if (a === 'retreat') { const toId = ui.game.battle.toId; ui.game.retreat(); ui.unitId = null; ui.battleMoreOpen = false; ui.screen = 'game'; showBattleReport(toId, true); }
    render();
  } catch (error) { console.error('游戏交互失败', error); ui.toast = error.message; render(); }
});

app.addEventListener('pointerdown', event => {
  if (!event.target.closest('.battle-viewport')) return;
  battlePointer = { id: event.pointerId, x: event.clientX, y: event.clientY };
}, true);

app.addEventListener('pointermove', event => {
  if (battlePointer?.id !== event.pointerId) return;
  if (Math.hypot(event.clientX - battlePointer.x, event.clientY - battlePointer.y) > 8) battleDragAt = Date.now();
}, true);

for (const type of ['pointerup', 'pointercancel']) app.addEventListener(type, event => {
  if (battlePointer?.id === event.pointerId) battlePointer = null;
}, true);

app.addEventListener('scroll', event => {
  if (!event.target.classList?.contains('battle-viewport')) return;
  if (battlePointer) battleDragAt = Date.now();
  ui.battleViewport = { left: event.target.scrollLeft, top: event.target.scrollTop };
  drawBattleOverview();
}, true);

window.addEventListener('resize', () => { if (ui.screen === 'battle' && !ui.battleAnimating) render(); });

app.addEventListener('input', event => {
  if (event.target.matches('[data-economy-input]') && ui.economyDraft) {
    const draft = ui.economyDraft, city = ui.game.city(draft.cityId), key = event.target.dataset.economyInput;
    const max = key === 'amount' ? exchangeLimit(city, draft.direction) : city[key];
    const requested = Number(event.target.value);
    draft[key] = Number.isSafeInteger(requested) && event.target.value !== '' ? requested : 0;
    const valid = draft.type === 'exchange' ? draft.amount >= 1 && draft.amount <= max : [draft.food, draft.money, draft.troops].some(Boolean) && draft.food <= city.food && draft.money <= city.money && draft.troops <= city.troops && [draft.food, draft.money, draft.troops].every(value => Number.isSafeInteger(value) && value >= 0);
    app.querySelector('.economy-form>.button').disabled = !valid;
    app.querySelector('.economy-preview').textContent = draft.type === 'exchange' ? `${draft.direction === 'buy' ? '支出' : '获得'} ${fmt(draft.amount * (draft.direction === 'buy' ? 5 : 2))} 金 · 交易后 ${fmt(city.food + (draft.direction === 'buy' ? draft.amount : -draft.amount))} 粮、${fmt(city.money + (draft.direction === 'buy' ? -draft.amount * 5 : draft.amount * 2))} 金` : `输送 ${fmt(draft.food)} 粮、${fmt(draft.money)} 金、${fmt(draft.troops)} 后备兵`;
    if (draft.type === 'exchange') {
      app.querySelector('[data-exchange-amount]').innerHTML = `${fmt(draft.amount)} <small>/ 最多 ${fmt(max)}</small>`;
      app.querySelectorAll('.exchange-presets button').forEach(button => button.classList.toggle('selected', Number(button.dataset.id) === draft.amount));
    }
  }
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
