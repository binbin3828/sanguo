/**
 * 时期管理器
 * 管理4个历史时期的初始配置
 */

import { PERIODS, PERIOD_NAMES, PERIOD_YEARS } from '../utils/Constants.js';

export class PeriodManager {
    constructor(eventBus, dataLoader) {
        this.eventBus = eventBus;
        this.dataLoader = dataLoader;
        this.currentPeriod = null;
        this.periodData = null;
    }

    /**
     * 加载时期数据
     */
    async loadPeriods() {
        const data = await this.dataLoader.load();
        this.periodData = data.periods;
        return this.periodData;
    }

    /**
     * 初始化时期
     */
    initialize(periodId) {
        const period = this.periodData?.find(p => p.id === periodId);
        if (!period) {
            throw new Error(`时期 ${periodId} 不存在`);
        }

        this.currentPeriod = period;
        
        // 初始化城市
        const citySetups = this._initializeCities(period);
        
        // 初始化武将
        const personSetups = this._initializePersons(period);

        if (this.eventBus) {
            this.eventBus.emit('period.initialized', {
                periodId,
                periodName: period.name,
                year: period.year,
                cityCount: citySetups.length,
                personCount: personSetups.length
            });
        }

        return {
            period,
            citySetups,
            personSetups
        };
    }

    /**
     * 初始化城市配置
     */
    _initializeCities(period) {
        const setups = [];
        
        period.cities.forEach(cityData => {
            setups.push({
                name: cityData.name,
                belong: this._resolveBelong(cityData.belong),
                satrap: cityData.satrap,
                farming: cityData.farming,
                farmingLimit: cityData.farmingLimit,
                commerce: cityData.commerce,
                commerceLimit: cityData.commerceLimit,
                population: cityData.population,
                populationLimit: cityData.populationLimit,
                peopleDevotion: cityData.peopleDevotion,
                money: cityData.money,
                food: cityData.food,
                avoidCalamity: cityData.avoidCalamity,
                mothballArms: cityData.mothballArms,
                state: 0
            });
        });

        return setups;
    }

    /**
     * 初始化武将配置
     */
    _initializePersons(period) {
        const setups = [];
        let id = 0;
        
        period.cities.forEach(cityData => {
            cityData.persons.forEach(personData => {
                setups.push({
                    id: id++,
                    name: personData.name,
                    city: cityData.name,
                    belong: this._resolveBelong(personData.belong),
                    age: personData.age,
                    armsType: this._resolveArmyType(personData.armyType),
                    force: personData.force,
                    iq: personData.iq,
                    level: personData.level,
                    devotion: personData.devotion,
                    character: personData.character,
                    tool1: personData.tool1,
                    tool2: personData.tool2,
                    specialSkill: personData.specialSkill,
                    hometown: personData.hometown,
                    adultYear: personData.adultYear,
                    bole: personData.bole
                });
            });
        });

        return setups;
    }

    /**
     * 解析归属（君主名称转为ID）
     */
    _resolveBelong(belongName) {
        if (!belongName) return 0; // 在野
        
        // TODO: 根据君主名称查找对应的武将ID
        // 暂时返回0，需要在实际使用时根据武将名称映射
        return belongName;
    }

    /**
     * 解析兵种类型
     */
    _resolveArmyType(armyTypeName) {
        const types = {
            '骑兵': 0,
            '步兵': 1,
            '弓兵': 2,
            '水兵': 3,
            '极兵': 4,
            '玄兵': 5
        };
        return types[armyTypeName] || 1; // 默认步兵
    }

    /**
     * 获取当前时期
     */
    getCurrentPeriod() {
        return this.currentPeriod;
    }

    /**
     * 获取时期名称
     */
    getPeriodName(periodId) {
        return PERIOD_NAMES[periodId] || '未知时期';
    }

    /**
     * 获取时期起始年份
     */
    getPeriodYear(periodId) {
        return PERIOD_YEARS[periodId] || 190;
    }

    /**
     * 获取所有时期
     */
    getAllPeriods() {
        return [
            { id: PERIODS.DONG_ZHUO, name: PERIOD_NAMES[1], year: PERIOD_YEARS[1] },
            { id: PERIODS.CAO_CAO_RISE, name: PERIOD_NAMES[2], year: PERIOD_YEARS[2] },
            { id: PERIODS.CHI_BI, name: PERIOD_NAMES[3], year: PERIOD_YEARS[3] },
            { id: PERIODS.THREE_KINGDOMS, name: PERIOD_NAMES[4], year: PERIOD_YEARS[4] }
        ];
    }

    /**
     * 获取时期简介
     */
    getPeriodDescription(periodId) {
        const descriptions = {
            1: '董卓弄权（189年）- 汉末乱世初期，董卓占据洛阳、长安，吕布在麾下效力',
            2: '曹操崛起（196年）- 曹操迎献帝于许昌，势力大增，与袁绍对峙',
            3: '赤壁之战（208年）- 曹操统一北方，刘备、孙权联盟抗曹，诸葛亮登场',
            4: '三国鼎立（220年）- 魏蜀吴三国正式成立，进入三国争霸时期'
        };
        return descriptions[periodId] || '';
    }

    /**
     * 获取时期特色武将
     */
    getPeriodFeatures(periodId) {
        const features = {
            1: {
                available: ['吕布', '董卓', '袁绍', '曹操', '刘备', '孙坚'],
                unavailable: ['诸葛亮', '庞统', '姜维'],
                special: '吕布在董卓麾下，赵云在北平在野'
            },
            2: {
                available: ['荀彧', '荀攸', '程昱', '郭嘉'],
                unavailable: ['诸葛亮'],
                special: '曹操谋士团加入，孙策统一江东'
            },
            3: {
                available: ['诸葛亮', '庞统', '周瑜', '鲁肃'],
                unavailable: [],
                special: '三足鼎立局面形成，赤壁之战即将爆发'
            },
            4: {
                available: ['姜维', '邓艾', '钟会', '陆抗'],
                unavailable: ['关羽', '张飞', '刘备', '曹操'],
                special: '三国后期，新一代将领登场'
            }
        };
        return features[periodId];
    }

    /**
     * 创建状态快照
     */
    createSnapshot() {
        return {
            currentPeriod: this.currentPeriod,
            periodData: this.periodData
        };
    }

    /**
     * 从快照恢复
     */
    restoreSnapshot(snapshot) {
        this.currentPeriod = snapshot.currentPeriod;
        this.periodData = snapshot.periodData;
    }
}
