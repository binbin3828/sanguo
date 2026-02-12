/**
 * 数据加载器
 * 加载和解析 data/dat.xml 数据
 */

export class DataLoader {
    constructor() {
        this.data = null;
        this.isLoaded = false;
    }

    /**
     * 加载数据文件
     */
    async load() {
        try {
            const response = await fetch('data/dat.xml');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const xmlText = await response.text();
            this.data = this._parseXML(xmlText);
            this.isLoaded = true;
            
            console.log('游戏数据加载完成');
            return this.data;
        } catch (error) {
            console.error('加载游戏数据失败:', error);
            throw error;
        }
    }

    /**
     * 解析 XML 数据
     */
    _parseXML(xmlText) {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
        
        const root = xmlDoc.querySelector('root > patch');
        if (!root) {
            throw new Error('Invalid XML structure');
        }

        return {
            cities: this._parseCities(root),
            goods: this._parseGoods(root),
            skills: this._parseSkills(root),
            periods: this._parsePeriods(root)
        };
    }

    /**
     * 解析城池列表
     */
    _parseCities(root) {
        const cities = [];
        const cityNodes = root.querySelectorAll('城池清单 > 城池');
        
        cityNodes.forEach((node, index) => {
            cities.push({
                id: index,
                name: node.getAttribute('名称') || `城市${index}`,
                // 基础属性（会在时期数据中覆盖）
                belong: 0,
                satrapId: -1,
                farming: 0,
                farmingLimit: 5000,
                commerce: 0,
                commerceLimit: 5000,
                peopleDevotion: 50,
                avoidCalamity: 50,
                population: 0,
                populationLimit: 200000,
                money: 0,
                food: 0,
                mothballArms: 0,
                state: 0
            });
        });

        return cities;
    }

    /**
     * 解析道具列表
     */
    _parseGoods(root) {
        const goods = [];
        const goodsNodes = root.querySelectorAll('道具清单 > 道具');
        
        goodsNodes.forEach((node, index) => {
            goods.push({
                id: index,
                name: node.getAttribute('名称') || `道具${index}`,
                type: node.getAttribute('类型') || '装备',
                iqBonus: parseInt(node.getAttribute('加智力')) || 0,
                forceBonus: parseInt(node.getAttribute('加武力')) || 0,
                moveBonus: parseInt(node.getAttribute('加速度')) || 0,
                armyChange: node.getAttribute('变兵种') || '',
                description: node.getAttribute('描述') || ''
            });
        });

        return goods;
    }

    /**
     * 解析技能列表
     */
    _parseSkills(root) {
        const skills = [];
        const skillNodes = root.querySelectorAll('技能清单 > 技能');
        
        skillNodes.forEach((node, index) => {
            skills.push({
                id: index,
                name: node.getAttribute('名称') || `技能${index}`,
                // 技能效果将在 Skill 模型中定义
                effect: null
            });
        });

        return skills;
    }

    /**
     * 解析时期列表
     */
    _parsePeriods(root) {
        const periods = [];
        const periodNodes = root.querySelectorAll('时期清单 > 时期');
        
        periodNodes.forEach((node, index) => {
            const startYear = parseInt(node.getAttribute('起始年')) || 190;
            
            periods.push({
                id: index + 1,
                name: this._getPeriodName(index + 1),
                year: startYear,
                cities: this._parsePeriodCities(node),
                persons: this._parsePeriodPersons(node)
            });
        });

        return periods;
    }

    /**
     * 获取时期名称
     */
    _getPeriodName(id) {
        const names = ['', '董卓弄权', '曹操崛起', '赤壁之战', '三国鼎立'];
        return names[id] || `时期${id}`;
    }

    /**
     * 解析时期中的城市配置
     */
    _parsePeriodCities(periodNode) {
        const cities = [];
        const cityNodes = periodNode.querySelectorAll('城池清单 > 城池');
        
        cityNodes.forEach((node) => {
            const name = node.getAttribute('名称');
            const persons = this._parseCityPersons(node);
            const tools = this._parseCityTools(node);
            
            cities.push({
                name: name,
                belong: node.getAttribute('归属') || '',
                satrap: node.getAttribute('太守') || '',
                farming: parseInt(node.getAttribute('农业')) || 0,
                farmingLimit: parseInt(node.getAttribute('农业上限')) || 5000,
                commerce: parseInt(node.getAttribute('商业')) || 0,
                commerceLimit: parseInt(node.getAttribute('商业上限')) || 5000,
                population: parseInt(node.getAttribute('人口')) || 0,
                populationLimit: parseInt(node.getAttribute('人口上限')) || 200000,
                peopleDevotion: parseInt(node.getAttribute('民忠')) || 50,
                money: parseInt(node.getAttribute('金钱')) || 0,
                food: parseInt(node.getAttribute('粮食')) || 0,
                avoidCalamity: parseInt(node.getAttribute('防灾')) || 50,
                mothballArms: parseInt(node.getAttribute('后备兵力')) || 0,
                persons: persons,
                tools: tools
            });
        });

        return cities;
    }

    /**
     * 解析城市中的武将
     */
    _parseCityPersons(cityNode) {
        const persons = [];
        const personNodes = cityNode.querySelectorAll('城中人物 > 人物');
        
        personNodes.forEach((node) => {
            persons.push({
                name: node.getAttribute('名称') || '',
                belong: node.getAttribute('归属') || '',
                age: parseInt(node.getAttribute('年龄')) || 20,
                armyType: node.getAttribute('兵种') || '步兵',
                force: parseInt(node.getAttribute('武力')) || 50,
                iq: parseInt(node.getAttribute('智力')) || 50,
                level: parseInt(node.getAttribute('等级')) || 1,
                devotion: parseInt(node.getAttribute('忠诚')) || 70,
                character: parseInt(node.getAttribute('性格')) || 0,
                tool1: node.getAttribute('道具1') || '',
                tool2: node.getAttribute('道具2') || '',
                specialSkill: node.getAttribute('专长') || '',
                hometown: node.getAttribute('出生地') || '',
                adultYear: parseInt(node.getAttribute('成年')) || 0,
                bole: node.getAttribute('伯乐') || ''
            });
        });

        return persons;
    }

    /**
     * 解析城市中的道具
     */
    _parseCityTools(cityNode) {
        const tools = [];
        const toolNodes = cityNode.querySelectorAll('城中道具 > 道具');
        
        toolNodes.forEach((node) => {
            const name = node.getAttribute('名称');
            if (name) {
                tools.push(name);
            }
        });

        return tools;
    }

    /**
     * 解析时期中的所有武将（汇总）
     */
    _parsePeriodPersons(periodNode) {
        const persons = [];
        const cityNodes = periodNode.querySelectorAll('城池清单 > 城池');
        
        cityNodes.forEach((cityNode) => {
            const cityName = cityNode.getAttribute('名称');
            const personNodes = cityNode.querySelectorAll('城中人物 > 人物');
            
            personNodes.forEach((node) => {
                persons.push({
                    name: node.getAttribute('名称') || '',
                    city: cityName,
                    belong: node.getAttribute('归属') || '',
                    age: parseInt(node.getAttribute('年龄')) || 20,
                    armyType: node.getAttribute('兵种') || '步兵',
                    force: parseInt(node.getAttribute('武力')) || 50,
                    iq: parseInt(node.getAttribute('智力')) || 50,
                    level: parseInt(node.getAttribute('等级')) || 1,
                    devotion: parseInt(node.getAttribute('忠诚')) || 70,
                    character: parseInt(node.getAttribute('性格')) || 0,
                    tool1: node.getAttribute('道具1') || '',
                    tool2: node.getAttribute('道具2') || '',
                    specialSkill: node.getAttribute('专长') || '',
                    hometown: node.getAttribute('出生地') || '',
                    adultYear: parseInt(node.getAttribute('成年')) || 0,
                    bole: node.getAttribute('伯乐') || ''
                });
            });
        });

        return persons;
    }

    /**
     * 获取加载的数据
     */
    getData() {
        if (!this.isLoaded) {
            throw new Error('数据尚未加载，请先调用 load()');
        }
        return this.data;
    }

    /**
     * 获取城池数据
     */
    getCities() {
        return this.getData().cities;
    }

    /**
     * 获取道具数据
     */
    getGoods() {
        return this.getData().goods;
    }

    /**
     * 获取技能数据
     */
    getSkills() {
        return this.getData().skills;
    }

    /**
     * 获取时期数据
     */
    getPeriods() {
        return this.getData().periods;
    }

    /**
     * 根据名称查找道具
     */
    findGoodsByName(name) {
        return this.getGoods().find(g => g.name === name);
    }

    /**
     * 根据名称查找技能
     */
    findSkillByName(name) {
        return this.getSkills().find(s => s.name === name);
    }
}

// 创建单例实例
export const dataLoader = new DataLoader();
