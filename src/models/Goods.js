/**
 * 道具数据模型
 */

export class Goods {
    constructor(data = {}) {
        this.id = data.id || 0;
        this.name = data.name || '';
        this.type = data.type || '装备';  // 装备/使用/消耗
        this.description = data.description || '';
        
        // 属性加成
        this.iqBonus = data.iqBonus || 0;        // 智力加成
        this.forceBonus = data.forceBonus || 0;  // 武力加成
        this.moveBonus = data.moveBonus || 0;    // 移动力加成
        
        // 兵种改变
        this.armyChange = data.armyChange || ''; // 改变的兵种名称
        
        // 攻击范围（武器特有）
        this.attackRange = data.attackRange || null;
    }

    /**
     * 获取道具类型名称
     */
    getTypeName() {
        const typeNames = {
            '装备': '装备类',
            '使用': '消耗类',
            '消耗': '消耗类'
        };
        return typeNames[this.type] || this.type;
    }

    /**
     * 是否是武器
     */
    isWeapon() {
        return this.forceBonus > 0;
    }

    /**
     * 是否是防具
     */
    isArmor() {
        // 根据名称判断
        return ['白银铠', '黄金铠', '铁铠', '皮铠'].includes(this.name);
    }

    /**
     * 是否是坐骑
     */
    isMount() {
        return this.moveBonus > 0;
    }

    /**
     * 是否是兵书
     */
    isBook() {
        return this.iqBonus > 0 && !this.isWeapon();
    }

    /**
     * 是否是兵符
     */
    isToken() {
        return this.armyChange !== '';
    }

    /**
     * 是否可装备
     */
    isEquippable() {
        return this.type === '装备';
    }

    /**
     * 是否可使用
     */
    isUsable() {
        return this.type === '使用' || this.type === '消耗';
    }

    /**
     * 获取装备效果描述
     */
    getEffectDescription() {
        const effects = [];
        
        if (this.forceBonus > 0) {
            effects.push(`武力+${this.forceBonus}`);
        }
        if (this.iqBonus > 0) {
            effects.push(`智力+${this.iqBonus}`);
        }
        if (this.moveBonus > 0) {
            effects.push(`移动力+${this.moveBonus}`);
        }
        if (this.armyChange) {
            effects.push(`变为${this.armyChange}`);
        }
        
        return effects.join('，') || '无特殊效果';
    }

    /**
     * 转换为JSON
     */
    toJSON() {
        return {
            id: this.id,
            name: this.name,
            type: this.type,
            description: this.description,
            iqBonus: this.iqBonus,
            forceBonus: this.forceBonus,
            moveBonus: this.moveBonus,
            armyChange: this.armyChange,
            attackRange: this.attackRange
        };
    }

    /**
     * 从JSON创建
     */
    static fromJSON(json) {
        return new Goods(json);
    }
}
