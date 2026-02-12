/**
 * 道具数据仓库
 */

import { Goods } from '../models/Goods.js';

export class GoodsRepository {
    constructor(eventBus) {
        this.eventBus = eventBus;
        this.goods = new Map();
        this.cityGoods = new Map();  // 城市道具映射
        this.personEquip = new Map();  // 武将装备映射
    }

    /**
     * 初始化道具数据
     */
    initialize(goodsDataArray) {
        this.goods.clear();
        this.cityGoods.clear();
        this.personEquip.clear();
        
        goodsDataArray.forEach((data, index) => {
            const goods = new Goods({ ...data, id: index });
            this.goods.set(index, goods);
        });

        if (this.eventBus) {
            this.eventBus.emit('goods.initialized', this.goods.size);
        }
    }

    /**
     * 获取所有道具
     */
    getAll() {
        return Array.from(this.goods.values());
    }

    /**
     * 根据ID获取道具
     */
    getById(id) {
        return this.goods.get(id);
    }

    /**
     * 根据名称获取道具
     */
    getByName(name) {
        for (const goods of this.goods.values()) {
            if (goods.name === name) {
                return goods;
            }
        }
        return null;
    }

    /**
     * 获取某城市的所有道具
     */
    getByCity(cityId) {
        const goodsIds = this.cityGoods.get(cityId) || [];
        return goodsIds.map(id => this.goods.get(id)).filter(g => g);
    }

    /**
     * 获取某武将的装备
     */
    getPersonEquip(personId) {
        const equipIds = this.personEquip.get(personId);
        if (!equipIds) {
            return [null, null];
        }
        return [
            equipIds[0] ? this.goods.get(equipIds[0]) : null,
            equipIds[1] ? this.goods.get(equipIds[1]) : null
        ];
    }

    /**
     * 分配道具到城市
     */
    assignToCity(goodsId, cityId) {
        if (!this.cityGoods.has(cityId)) {
            this.cityGoods.set(cityId, []);
        }
        
        const cityGoodsList = this.cityGoods.get(cityId);
        if (!cityGoodsList.includes(goodsId)) {
            cityGoodsList.push(goodsId);
            
            if (this.eventBus) {
                this.eventBus.emit('goods.assignedToCity', { goodsId, cityId });
            }
        }
    }

    /**
     * 从城市移除道具
     */
    removeFromCity(goodsId, cityId) {
        const cityGoodsList = this.cityGoods.get(cityId);
        if (cityGoodsList) {
            const index = cityGoodsList.indexOf(goodsId);
            if (index > -1) {
                cityGoodsList.splice(index, 1);
                
                if (this.eventBus) {
                    this.eventBus.emit('goods.removedFromCity', { goodsId, cityId });
                }
            }
        }
    }

    /**
     * 装备道具给武将
     */
    equipToPerson(goodsId, personId, slot) {
        if (!this.personEquip.has(personId)) {
            this.personEquip.set(personId, [0, 0]);
        }
        
        const equip = this.personEquip.get(personId);
        
        // 卸下当前位置的装备
        if (equip[slot] !== 0) {
            this.unequipFromPerson(personId, slot);
        }
        
        equip[slot] = goodsId;
        
        if (this.eventBus) {
            this.eventBus.emit('goods.equipped', { goodsId, personId, slot });
        }
    }

    /**
     * 从武将卸下道具
     */
    unequipFromPerson(personId, slot) {
        const equip = this.personEquip.get(personId);
        if (equip && equip[slot] !== 0) {
            const goodsId = equip[slot];
            equip[slot] = 0;
            
            if (this.eventBus) {
                this.eventBus.emit('goods.unequipped', { goodsId, personId, slot });
            }
            
            return goodsId;
        }
        return 0;
    }

    /**
     * 按类型获取道具
     */
    getByType(type) {
        return this.getAll().filter(goods => goods.type === type);
    }

    /**
     * 获取所有武器
     */
    getWeapons() {
        return this.getAll().filter(goods => goods.isWeapon());
    }

    /**
     * 获取所有防具
     */
    getArmors() {
        return this.getAll().filter(goods => goods.isArmor());
    }

    /**
     * 获取所有坐骑
     */
    getMounts() {
        return this.getAll().filter(goods => goods.isMount());
    }

    /**
     * 获取所有兵书
     */
    getBooks() {
        return this.getAll().filter(goods => goods.isBook());
    }

    /**
     * 获取所有兵符
     */
    getTokens() {
        return this.getAll().filter(goods => goods.isToken());
    }

    /**
     * 搜索道具
     */
    search(query) {
        return this.getAll().filter(goods => 
            goods.name.includes(query) || 
            goods.description.includes(query)
        );
    }

    /**
     * 计算装备后的属性
     */
    calculateEquippedStats(personId) {
        const equip = this.getPersonEquip(personId);
        const stats = {
            forceBonus: 0,
            iqBonus: 0,
            moveBonus: 0
        };
        
        equip.forEach(goods => {
            if (goods) {
                stats.forceBonus += goods.forceBonus;
                stats.iqBonus += goods.iqBonus;
                stats.moveBonus += goods.moveBonus;
            }
        });
        
        return stats;
    }

    /**
     * 创建状态快照
     */
    createSnapshot() {
        return {
            goods: Array.from(this.goods.entries()).reduce((obj, [id, goods]) => {
                obj[id] = goods.toJSON();
                return obj;
            }, {}),
            cityGoods: Array.from(this.cityGoods.entries()),
            personEquip: Array.from(this.personEquip.entries())
        };
    }

    /**
     * 从快照恢复
     */
    restoreSnapshot(snapshot) {
        this.goods.clear();
        Object.entries(snapshot.goods).forEach(([id, data]) => {
            this.goods.set(parseInt(id), Goods.fromJSON(data));
        });
        
        this.cityGoods = new Map(snapshot.cityGoods);
        this.personEquip = new Map(snapshot.personEquip);
    }

    /**
     * 清空数据
     */
    clear() {
        this.goods.clear();
        this.cityGoods.clear();
        this.personEquip.clear();
    }
}
