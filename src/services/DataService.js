/**
 * 数据加载服务 - 解析 dat.xml
 */

export class DataService {
    constructor() {
        this.data = null;
    }

    async loadData() {
        try {
            const response = await fetch('data/dat.xml');
            const xmlText = await response.text();
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
            this.data = this.parseData(xmlDoc);
            return this.data;
        } catch (error) {
            console.error('加载数据失败:', error);
            return null;
        }
    }

    parseData(xmlDoc) {
        const root = xmlDoc.querySelector('root');
        
        // 解析城池数据
        const cities = this.parseCities(root);
        
        // 解析道具
        const items = this.parseItems(root);
        
        // 解析技能
        const skills = this.parseSkills(root);
        
        // 解析时期
        const periods = this.parsePeriods(root);
        
        return {
            cities,
            items,
            skills,
            periods
        };
    }

    parseCities(root) {
        const cityElements = root.querySelectorAll('城池');
        return Array.from(cityElements).map(cityEl => ({
            name: cityEl.getAttribute('名称'),
            owner: cityEl.getAttribute('归属') || '',
            governor: cityEl.getAttribute('太守') || '',
            agriculture: parseInt(cityEl.getAttribute('农业') || 0),
            agricultureLimit: parseInt(cityEl.getAttribute('农业上限') || 0),
            commerce: parseInt(cityEl.getAttribute('商业') || 0),
            commerceLimit: parseInt(cityEl.getAttribute('商业上限') || 0),
            population: parseInt(cityEl.getAttribute('人口') || 0),
            populationLimit: parseInt(cityEl.getAttribute('人口上限') || 0),
            loyalty: parseInt(cityEl.getAttribute('民忠') || 0),
            money: parseInt(cityEl.getAttribute('金钱') || 0),
            food: parseInt(cityEl.getAttribute('粮食') || 0),
            disaster: parseInt(cityEl.getAttribute('防灾') || 0),
            troops: parseInt(cityEl.getAttribute('后备兵力') || 0)
        }));
    }

    parseItems(root) {
        const itemElements = root.querySelectorAll('道具');
        return Array.from(itemElements).map(itemEl => ({
            name: itemEl.getAttribute('名称'),
            type: itemEl.getAttribute('类型'),
            intelligence: parseInt(itemEl.getAttribute('加智力') || 0),
            force: parseInt(itemEl.getAttribute('加武力') || 0),
            speed: parseInt(itemEl.getAttribute('加速度') || 0),
            armyType: itemEl.getAttribute('变兵种') || '',
            description: itemEl.getAttribute('描述') || ''
        }));
    }

    parseSkills(root) {
        const skillElements = root.querySelectorAll('技能');
        return Array.from(skillElements).map(skillEl => ({
            name: skillEl.getAttribute('名称')
        }));
    }

    parsePeriods(root) {
        const periodElements = root.querySelectorAll('时期');
        return Array.from(periodElements).map(periodEl => {
            const year = parseInt(periodEl.getAttribute('起始年') || 0);
            const cities = this.parsePeriodCities(periodEl);
            const generals = this.parsePeriodGenerals(periodEl);
            const rulers = this.extractRulers(cities, generals);
            
            return {
                year,
                cities,
                generals,
                rulers
            };
        });
    }

    parsePeriodCities(periodEl) {
        const cityElements = periodEl.querySelectorAll('城池');
        return Array.from(cityElements).map(cityEl => ({
            name: cityEl.getAttribute('名称'),
            owner: cityEl.getAttribute('归属') || '',
            governor: cityEl.getAttribute('太守') || '',
            agriculture: parseInt(cityEl.getAttribute('农业') || 0),
            agricultureLimit: parseInt(cityEl.getAttribute('农业上限') || 0),
            commerce: parseInt(cityEl.getAttribute('商业') || 0),
            commerceLimit: parseInt(cityEl.getAttribute('商业上限') || 0),
            population: parseInt(cityEl.getAttribute('人口') || 0),
            populationLimit: parseInt(cityEl.getAttribute('人口上限') || 0),
            loyalty: parseInt(cityEl.getAttribute('民忠') || 0),
            money: parseInt(cityEl.getAttribute('金钱') || 0),
            food: parseInt(cityEl.getAttribute('粮食') || 0),
            disaster: parseInt(cityEl.getAttribute('防灾') || 0),
            troops: parseInt(cityEl.getAttribute('后备兵力') || 0)
        }));
    }

    parsePeriodGenerals(periodEl) {
        const generalElements = periodEl.querySelectorAll('人物');
        const generals = [];
        
        generalElements.forEach(generalEl => {
            const owner = generalEl.getAttribute('归属');
            // 只保存有归属的将领（归属于某个君主的）
            if (owner && owner.trim() !== '') {
                generals.push({
                    name: generalEl.getAttribute('名称'),
                    owner: owner,
                    age: parseInt(generalEl.getAttribute('年龄') || 0),
                    armyType: generalEl.getAttribute('兵种') || '',
                    force: parseInt(generalEl.getAttribute('武力') || 0),
                    iq: parseInt(generalEl.getAttribute('智力') || 0),
                    level: parseInt(generalEl.getAttribute('等级') || 1),
                    loyalty: parseInt(generalEl.getAttribute('忠诚') || 0),
                    personality: parseInt(generalEl.getAttribute('性格') || 0),
                    item1: generalEl.getAttribute('道具1') || '',
                    item2: generalEl.getAttribute('道具2') || '',
                    specialty: generalEl.getAttribute('专长') || '',
                    birthplace: generalEl.getAttribute('出生地') || '',
                    adultYear: parseInt(generalEl.getAttribute('成年') || 0)
                });
            }
        });
        
        return generals;
    }

    extractRulers(cities, generals) {
        const rulerSet = new Set();
        
        // 从城池归属提取君主
        cities.forEach(city => {
            if (city.owner && city.owner.trim() !== '') {
                rulerSet.add(city.owner);
            }
        });
        
        // 从将领归属提取君主
        generals.forEach(general => {
            if (general.owner && general.owner.trim() !== '') {
                rulerSet.add(general.owner);
            }
        });
        
        // 转换为数组，每个君主包含基本信息
        return Array.from(rulerSet).map(rulerName => {
            // 找到该君主的将领信息
            const rulerGenerals = generals.filter(g => g.owner === rulerName);
            
            // 找到该君主的城池
            const rulerCities = cities.filter(c => c.owner === rulerName);
            
            // 找到君主自己的数据（如果有）
            const rulerGeneral = rulerGenerals.find(g => g.name === rulerName);
            
            return {
                id: rulerName,
                name: rulerName,
                force: rulerGeneral ? rulerGeneral.force : 70,
                iq: rulerGeneral ? rulerGeneral.iq : 70,
                armyType: rulerGeneral ? rulerGeneral.armyType : '步兵',
                loyalty: 100,
                level: rulerGeneral ? rulerGeneral.level : 1,
                cities: rulerCities.length,
                generals: rulerGenerals.length,
                cityList: rulerCities.map(c => c.name)
            };
        });
    }

    // 根据年份获取时期
    getPeriodByYear(year) {
        if (!this.data || !this.data.periods) return null;
        return this.data.periods.find(p => p.year === year);
    }

    // 获取所有时期
    getAllPeriods() {
        if (!this.data || !this.data.periods) return [];
        return this.data.periods;
    }
}
