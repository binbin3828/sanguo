/**
 * 城市数据仓库
 * 管理所有城市数据的CRUD操作
 */

import { City } from '../models/City.js';

export class CityRepository {
    constructor(eventBus) {
        this.eventBus = eventBus;
        this.cities = new Map();
        this.connections = new Map();  // 城市连接关系
    }

    /**
     * 初始化城市数据
     */
    initialize(cityDataArray) {
        this.cities.clear();
        
        cityDataArray.forEach((data, index) => {
            const city = new City({ ...data, id: index });
            this.cities.set(index, city);
        });

        // 初始化城市连接关系（这里需要根据游戏地图定义）
        this._initializeConnections();

        if (this.eventBus) {
            this.eventBus.emit('cities.initialized', this.cities.size);
        }
    }

    /**
     * 初始化城市连接关系
     */
    _initializeConnections() {
        // TODO: 根据实际地图定义城市连接关系
        // 这里只是一个示例结构
        this.connections = new Map();
    }

    /**
     * 获取所有城市
     */
    getAll() {
        return Array.from(this.cities.values());
    }

    /**
     * 根据ID获取城市
     */
    getById(id) {
        return this.cities.get(id);
    }

    /**
     * 根据名称获取城市
     */
    getByName(name) {
        for (const city of this.cities.values()) {
            if (city.name === name) {
                return city;
            }
        }
        return null;
    }

    /**
     * 更新城市数据
     */
    update(id, updates) {
        const city = this.cities.get(id);
        if (!city) {
            console.warn(`城市 ${id} 不存在`);
            return null;
        }

        Object.assign(city, updates);

        if (this.eventBus) {
            this.eventBus.emit('city.updated', { id, city, updates });
        }

        return city;
    }

    /**
     * 获取城市连接关系
     */
    getConnections(cityId) {
        return this.connections.get(cityId) || [];
    }

    /**
     * 检查两座城市是否相邻
     */
    isConnected(cityId1, cityId2) {
        const connections = this.connections.get(cityId1);
        return connections ? connections.includes(cityId2) : false;
    }

    /**
     * 设置城市归属
     */
    setBelong(cityId, kingId) {
        const city = this.getById(cityId);
        if (city) {
            const oldBelong = city.belong;
            city.setBelong(kingId);
            
            if (this.eventBus) {
                this.eventBus.emit('city.belongChanged', {
                    cityId,
                    oldBelong,
                    newBelong: kingId
                });
            }
        }
        return city;
    }

    /**
     * 设置城市太守
     */
    setSatrap(cityId, personId) {
        const city = this.getById(cityId);
        if (city) {
            city.setSatrap(personId);
            
            if (this.eventBus) {
                this.eventBus.emit('city.satrapChanged', { cityId, personId });
            }
        }
        return city;
    }

    /**
     * 获取某势力的所有城市
     */
    getByBelong(kingId) {
        return this.getAll().filter(city => city.belong === kingId);
    }

    /**
     * 获取某势力的城市数量
     */
    getCityCount(kingId) {
        return this.getByBelong(kingId).length;
    }

    /**
     * 获取无主城市
     */
    getUnownedCities() {
        return this.getAll().filter(city => city.belong === 0);
    }

    /**
     * 获取有灾害的城市
     */
    getCitiesWithCalamity() {
        return this.getAll().filter(city => city.hasCalamity());
    }

    /**
     * 执行月末资源增长
     */
    processMonthlyGrowth() {
        const results = [];
        
        this.cities.forEach((city, id) => {
            const growth = city.monthlyGrowth();
            const consumption = city.monthlyFoodConsumption();
            
            results.push({
                cityId: id,
                cityName: city.name,
                growth,
                foodConsumption: consumption
            });
        });

        if (this.eventBus) {
            this.eventBus.emit('cities.monthlyGrowth', results);
        }

        return results;
    }

    /**
     * 月末灾害检查
     */
    checkCalamities(randomUtil) {
        const calamities = [];
        
        this.cities.forEach((city, id) => {
            // 跳过已有灾害的城市
            if (city.hasCalamity()) return;

            // 计算灾害概率：100 - 防灾值
            const probability = 100 - city.avoidCalamity;
            
            if (randomUtil.chance(probability)) {
                // 随机选择灾害类型 (1-4)
                const calamityType = randomUtil.nextInt(1, 4);
                city.setCalamity(calamityType);
                
                calamities.push({
                    cityId: id,
                    cityName: city.name,
                    type: calamityType
                });
            }
        });

        if (calamities.length > 0 && this.eventBus) {
            this.eventBus.emit('cities.calamities', calamities);
        }

        return calamities;
    }

    /**
     * 创建状态快照
     */
    createSnapshot() {
        const snapshot = {};
        this.cities.forEach((city, id) => {
            snapshot[id] = city.toJSON();
        });
        return snapshot;
    }

    /**
     * 从快照恢复
     */
    restoreSnapshot(snapshot) {
        Object.entries(snapshot).forEach(([id, data]) => {
            const cityId = parseInt(id);
            this.cities.set(cityId, City.fromJSON(data));
        });

        if (this.eventBus) {
            this.eventBus.emit('cities.restored');
        }
    }

    /**
     * 获取城市统计信息
     */
    getStatistics() {
        const allCities = this.getAll();
        
        return {
            total: allCities.length,
            withCalamity: allCities.filter(c => c.hasCalamity()).length,
            unowned: allCities.filter(c => c.belong === 0).length,
            byBelong: this._groupByBelong(allCities)
        };
    }

    /**
     * 按归属分组
     */
    _groupByBelong(cities) {
        const groups = {};
        cities.forEach(city => {
            const belong = city.belong;
            if (!groups[belong]) {
                groups[belong] = [];
            }
            groups[belong].push(city.id);
        });
        return groups;
    }

    /**
     * 清空数据
     */
    clear() {
        this.cities.clear();
        this.connections.clear();
    }
}
