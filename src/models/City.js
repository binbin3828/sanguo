/**
 * 城市数据模型
 */

import { CITY_STATES, CITY_STATE_NAMES } from '../utils/Constants.js';

export class City {
    constructor(data = {}) {
        // 基础属性
        this.id = data.id || 0;
        this.name = data.name || '';
        
        // 归属和治理
        this.belong = data.belong || 0;          // 归属势力（武将ID+1，0=无主）
        this.satrapId = data.satrapId || -1;     // 太守编号（武将ID+1）
        
        // 开发度
        this.farming = data.farming || 0;                    // 当前农业开发度
        this.farmingLimit = data.farmingLimit || 5000;       // 农业开发上限
        this.commerce = data.commerce || 0;                  // 当前商业开发度
        this.commerceLimit = data.commerceLimit || 5000;     // 商业开发上限
        
        // 人口和民心
        this.population = data.population || 0;              // 当前人口
        this.populationLimit = data.populationLimit || 200000; // 人口上限
        this.peopleDevotion = data.peopleDevotion || 50;     // 民忠 (0-100)
        this.avoidCalamity = data.avoidCalamity || 50;       // 防灾值 (0-100)
        
        // 资源
        this.money = data.money || 0;           // 金钱
        this.food = data.food || 0;             // 粮食
        this.mothballArms = data.mothballArms || 0;  // 后备兵力
        
        // 状态
        this.state = data.state || CITY_STATES.NORMAL;  // 城市状态
        
        // 城中数据
        this.personQueue = data.personQueue || [];  // 城中武将队列
        this.toolQueue = data.toolQueue || [];      // 城中道具队列
    }

    /**
     * 获取城市状态名称
     */
    getStateName() {
        return CITY_STATE_NAMES[this.state] || '未知';
    }

    /**
     * 设置城市归属
     */
    setBelong(kingId) {
        this.belong = kingId;
    }

    /**
     * 设置太守
     */
    setSatrap(personId) {
        this.satrapId = personId;
    }

    /**
     * 增加农业开发度
     */
    increaseFarming(amount) {
        const oldValue = this.farming;
        this.farming = Math.min(this.farming + amount, this.farmingLimit);
        return this.farming - oldValue;
    }

    /**
     * 增加商业开发度
     */
    increaseCommerce(amount) {
        const oldValue = this.commerce;
        this.commerce = Math.min(this.commerce + amount, this.commerceLimit);
        return this.commerce - oldValue;
    }

    /**
     * 增加民忠
     */
    increaseDevotion(amount) {
        const oldValue = this.peopleDevotion;
        this.peopleDevotion = Math.min(this.peopleDevotion + amount, 100);
        return this.peopleDevotion - oldValue;
    }

    /**
     * 增加防灾值
     */
    increaseAvoidCalamity(amount) {
        const oldValue = this.avoidCalamity;
        this.avoidCalamity = Math.min(this.avoidCalamity + amount, 100);
        return this.avoidCalamity - oldValue;
    }

    /**
     * 恢复城市状态为正常
     */
    recoverState() {
        if (this.state !== CITY_STATES.NORMAL) {
            this.state = CITY_STATES.NORMAL;
            return true;
        }
        return false;
    }

    /**
     * 设置灾害状态
     */
    setCalamity(calamityType) {
        this.state = calamityType;
    }

    /**
     * 增加金钱
     */
    addMoney(amount) {
        this.money = Math.max(0, this.money + amount);
    }

    /**
     * 增加粮食
     */
    addFood(amount) {
        this.food = Math.max(0, this.food + amount);
    }

    /**
     * 增加后备兵力
     */
    addMothballArms(amount) {
        this.mothballArms = Math.max(0, this.mothballArms + amount);
    }

    /**
     * 是否可以征兵
     */
    canConscript() {
        return this.mothballArms > 0 && this.peopleDevotion >= 30;
    }

    /**
     * 是否有灾害
     */
    hasCalamity() {
        return this.state !== CITY_STATES.NORMAL;
    }

    /**
     * 月末资源增长
     */
    monthlyGrowth() {
        // 粮食增长 = 农业/10
        const foodGrowth = Math.floor(this.farming / 10);
        this.food = Math.min(this.food + foodGrowth, 65535);

        // 金钱增长 = 商业/10
        const moneyGrowth = Math.floor(this.commerce / 10);
        this.money = Math.min(this.money + moneyGrowth, 65535);

        // 人口增长 = 当前人口 * 1%
        const popGrowth = Math.floor(this.population * 0.01);
        this.population = Math.min(this.population + popGrowth, this.populationLimit);

        return {
            food: foodGrowth,
            money: moneyGrowth,
            population: popGrowth
        };
    }

    /**
     * 每月粮草消耗
     */
    monthlyFoodConsumption() {
        // 简化计算：每50个士兵消耗1份粮食
        const consumption = Math.floor(this.mothballArms / 50);
        this.food = Math.max(0, this.food - consumption);
        return consumption;
    }

    /**
     * 转换为JSON
     */
    toJSON() {
        return {
            id: this.id,
            name: this.name,
            belong: this.belong,
            satrapId: this.satrapId,
            farming: this.farming,
            farmingLimit: this.farmingLimit,
            commerce: this.commerce,
            commerceLimit: this.commerceLimit,
            population: this.population,
            populationLimit: this.populationLimit,
            peopleDevotion: this.peopleDevotion,
            avoidCalamity: this.avoidCalamity,
            money: this.money,
            food: this.food,
            mothballArms: this.mothballArms,
            state: this.state,
            personQueue: this.personQueue,
            toolQueue: this.toolQueue
        };
    }

    /**
     * 从JSON创建
     */
    static fromJSON(json) {
        return new City(json);
    }
}
