/**
 * 武将数据模型
 */

import { 
    ARMY_TYPES, 
    CHARACTER_TYPES, 
    CHARACTER_NAMES,
    GAME_CONFIG 
} from '../utils/Constants.js';

export class Person {
    constructor(data = {}) {
        // 基础属性
        this.id = data.id || 0;
        this.name = data.name || '';
        
        // 归属
        this.oldBelong = data.oldBelong || 0;    // 原归属
        this.belong = data.belong || 0;          // 当前归属（势力ID，0=在野）
        
        // 能力值
        this.force = data.force || 50;           // 武力
        this.iq = data.iq || 50;                 // 智力
        
        // 性格
        this.character = data.character || CHARACTER_TYPES.TEMERITY;
        
        // 兵种
        this.armsType = data.armsType || ARMY_TYPES.INFANTRY;
        
        // 状态
        this.level = data.level || 1;            // 等级
        this.experience = data.experience || 0;  // 经验值 (0-99)
        this.devotion = data.devotion || 70;     // 忠诚度 (0-100)
        this.thew = data.thew || 100;            // 体力 (0-100)
        this.arms = data.arms || 0;              // 兵力
        
        // 装备
        this.equip = data.equip || [0, 0];       // 装备道具 [道具1, 道具2]
        
        // 年龄
        this.age = data.age || 20;               // 年龄
        
        // 特有技能
        this.specialSkill = data.specialSkill || 0;
        
        // 其他
        this.isKing = data.isKing || false;      // 是否君主
    }

    /**
     * 获取性格名称
     */
    getCharacterName() {
        return CHARACTER_NAMES[this.character] || '未知';
    }

    /**
     * 获取兵种名称
     */
    getArmyTypeName() {
        const names = ['骑兵', '步兵', '弓兵', '水军', '极兵', '玄兵'];
        return names[this.armsType] || '未知';
    }

    /**
     * 是否是君主
     */
    isKingCheck() {
        return this.isKing || this.belong === this.id + 1;
    }

    /**
     * 是否在野
     */
    isUnemployed() {
        return this.belong === 0;
    }

    /**
     * 获得经验
     */
    gainExperience(exp) {
        this.experience += exp;
        
        // 检查升级
        let leveledUp = false;
        while (this.experience >= GAME_CONFIG.MAX_EXP) {
            this.experience -= GAME_CONFIG.MAX_EXP;
            this.levelUp();
            leveledUp = true;
        }
        
        return leveledUp;
    }

    /**
     * 升级
     */
    levelUp() {
        if (this.level >= GAME_CONFIG.MAX_LEVEL) {
            return false;
        }

        this.level++;
        
        // 随机提升属性
        if (Math.random() > 0.5) {
            this.force++;
        }
        if (Math.random() > 0.5) {
            this.iq++;
        }
        
        // 恢复体力
        this.thew = GAME_CONFIG.MAX_THEW;
        
        return true;
    }

    /**
     * 消耗体力
     */
    consumeThew(amount) {
        if (this.thew >= amount) {
            this.thew -= amount;
            return true;
        }
        return false;
    }

    /**
     * 恢复体力
     */
    recoverThew(amount) {
        this.thew = Math.min(this.thew + amount, GAME_CONFIG.MAX_THEW);
    }

    /**
     * 改变归属
     */
    changeBelong(newBelong) {
        this.oldBelong = this.belong;
        this.belong = newBelong;
    }

    /**
     * 增加忠诚
     */
    increaseDevotion(amount) {
        this.devotion = Math.min(this.devotion + amount, 100);
    }

    /**
     * 降低忠诚
     */
    decreaseDevotion(amount) {
        this.devotion = Math.max(this.devotion - amount, 0);
    }

    /**
     * 计算带兵上限
     */
    calculateMaxArms() {
        // 基础公式：等级*100 + 武力*10 + 智力*10
        let maxArms = this.level * 100 + this.force * 10 + this.iq * 10;
        return Math.min(maxArms, 0xFFFE); // 最大65534
    }

    /**
     * 计算攻击力
     */
    calculateAttack() {
        const ATK_MODULUS = [1.0, 1.2, 0.9, 0.8, 1.3, 0.4];
        const modulus = ATK_MODULUS[this.armsType] || 1.0;
        return Math.floor(this.force * (this.level + 10) * modulus);
    }

    /**
     * 计算防御力
     */
    calculateDefense() {
        const DEF_MODULUS = [0.7, 1.2, 1.0, 1.1, 1.2, 0.6];
        const modulus = DEF_MODULUS[this.armsType] || 1.0;
        return Math.floor(this.iq * (this.level + 10) * modulus);
    }

    /**
     * 计算战斗HP
     */
    calculateBattleHP() {
        // HP = (武力 * 0.8 + 智力 * 0.3 + 等级) * 体力 / 100
        const baseHP = (this.force * 0.8 + this.iq * 0.3 + this.level);
        return Math.floor(baseHP * this.thew / 100);
    }

    /**
     * 计算战斗MP
     */
    calculateBattleMP() {
        // MP = (智力 * 0.8 + √武力 / 2 + 等级) * 体力 / 100
        const baseMP = (this.iq * 0.8 + Math.sqrt(this.force) / 2 + this.level);
        return Math.floor(baseMP * this.thew / 100);
    }

    /**
     * 计算移动力
     */
    calculateMovePower() {
        const ARMY_MOVE_BASE = [5, 4, 4, 5, 6, 3];
        let move = ARMY_MOVE_BASE[this.armsType] || 4;
        
        // TODO: 加上装备加成
        
        return Math.min(move, 8); // 最大移动力8
    }

    /**
     * 装备道具
     */
    equipItem(slot, itemId) {
        if (slot >= 0 && slot < this.equip.length) {
            this.equip[slot] = itemId;
            return true;
        }
        return false;
    }

    /**
     * 卸下道具
     */
    unequipItem(slot) {
        if (slot >= 0 && slot < this.equip.length) {
            const itemId = this.equip[slot];
            this.equip[slot] = 0;
            return itemId;
        }
        return 0;
    }

    /**
     * 改变兵种
     */
    changeArmyType(newType) {
        if (newType >= 0 && newType <= 5) {
            this.armsType = newType;
            return true;
        }
        return false;
    }

    /**
     * 年龄增长
     */
    ageUp() {
        this.age++;
        // TODO: 检查是否超过寿命
    }

    /**
     * 转换为JSON
     */
    toJSON() {
        return {
            id: this.id,
            name: this.name,
            oldBelong: this.oldBelong,
            belong: this.belong,
            force: this.force,
            iq: this.iq,
            character: this.character,
            armsType: this.armsType,
            level: this.level,
            experience: this.experience,
            devotion: this.devotion,
            thew: this.thew,
            arms: this.arms,
            equip: [...this.equip],
            age: this.age,
            specialSkill: this.specialSkill,
            isKing: this.isKing
        };
    }

    /**
     * 从JSON创建
     */
    static fromJSON(json) {
        return new Person(json);
    }
}
