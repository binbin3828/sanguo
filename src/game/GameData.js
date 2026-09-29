import { CITY_POSITIONS, WORLD_MAP_POSITIONS } from './MapData.js';

const children = (element, tag) => [...element.children].filter(child => child.tagName === tag);
const first = (element, tag) => children(element, tag)[0];
const number = (element, attribute, fallback = 0) => Number(element.getAttribute(attribute) ?? fallback);

export async function loadCatalog() {
  const response = await fetch('./data/dat.xml');
  if (!response.ok) throw new Error(`剧本数据加载失败：HTTP ${response.status}`);
  const document = new DOMParser().parseFromString(await response.text(), 'application/xml');
  if (document.querySelector('parsererror')) throw new Error('剧本 XML 格式错误');
  const patch = first(document.documentElement, 'patch');
  if (!patch) throw new Error('剧本数据缺少 patch 节点');
  const goods = children(first(patch, '道具清单'), '道具').map(node => ({
    name: node.getAttribute('名称'), type: node.getAttribute('类型') || '装备',
    force: number(node, '加武力'), intelligence: number(node, '加智力'),
    speed: number(node, '加速度'), armyType: node.getAttribute('变兵种') || '',
    description: node.getAttribute('描述') || ''
  }));
  const goodsByName = new Map(goods.map(good => [good.name, good]));

  const names = children(first(patch, '城池清单'), '城池').map(node => node.getAttribute('名称'));
  const scenarios = children(first(patch, '时期清单'), '时期').map((period, index) => {
    const configuredCities = new Map(children(first(period, '城池清单'), '城池')
      .map(city => [city.getAttribute('名称'), city]));
    const cities = names.map((name, id) => {
      const node = configuredCities.get(name);
      if (!node) throw new Error(`剧本 ${index + 1} 缺少城池：${name}`);
      const people = first(node, '城中人物');
      const generals = people ? children(people, '人物').map((person, personIndex) => {
        const equipmentNames = [1, 2].map(slot => person.getAttribute(`道具${slot}`)).filter(Boolean);
        for (const itemName of equipmentNames) if (!goodsByName.has(itemName)) throw new Error(`未知武将道具：${itemName}`);
        return {
          id: `${id}-${personIndex}`,
          name: person.getAttribute('名称'),
          owner: person.getAttribute('归属') || null,
          status: person.getAttribute('归属') ? 'active' : 'free',
          formerOwner: null,
          cityId: id,
          force: number(person, '武力', 50) - equipmentNames.reduce((sum, name) => sum + goodsByName.get(name).force, 0),
          intelligence: number(person, '智力', 50) - equipmentNames.reduce((sum, name) => sum + goodsByName.get(name).intelligence, 0),
          level: number(person, '等级', 1),
          troops: 0,
          stamina: 100,
          loyalty: number(person, '忠诚', 0),
          character: number(person, '性格', 0),
          armsType: person.getAttribute('兵种') || '步兵',
          equipment: equipmentNames.map((itemName, slot) => ({ id: `${index}:g:${id}:${personIndex}:${slot}`, name: itemName }))
        };
      }) : [];
      const hiddenItems = first(node, '城中道具');
      const items = hiddenItems ? children(hiddenItems, '道具').map((item, itemIndex) => {
        const itemName = item.getAttribute('名称');
        if (!goodsByName.has(itemName)) throw new Error(`未知城池道具：${itemName}`);
        return { id: `${index}:c:${id}:${itemIndex}`, name: itemName, found: false };
      }) : [];
      const owner = node.getAttribute('归属') || null;
      return {
        id, name, owner, governor: node.getAttribute('太守') || '',
        farming: number(node, '农业'), farmingLimit: number(node, '农业上限', 5000),
        commerce: number(node, '商业'), commerceLimit: number(node, '商业上限', 5000),
        population: number(node, '人口'), populationLimit: number(node, '人口上限', 200000),
        loyalty: number(node, '民忠', 50), money: number(node, '金钱'),
        food: number(node, '粮食'), disaster: number(node, '防灾', 50),
        troops: number(node, '后备兵力') + (owner ? 550 + generals.filter(g => g.owner === owner).length * 160 : 300),
        generals, items, acted: false
      };
    });
    const rulers = [...new Set(cities.map(city => city.owner).filter(Boolean))];
    return { id: index, year: number(period, '起始年'), cities, rulers };
  });

  const missingPositions = names.filter(name => !CITY_POSITIONS[name] || !WORLD_MAP_POSITIONS[name]);
  if (missingPositions.length) throw new Error(`缺少城市地图坐标：${missingPositions.join('、')}`);
  return { names, scenarios, goods };
}
