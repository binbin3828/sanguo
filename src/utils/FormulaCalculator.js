/**
 * 公式计算器
 * 实现游戏中所有的数值计算公式
 */

import { 
    ATK_MODULUS, 
    DEF_MODULUS, 
    SUBDUE_MATRIX,
    TERRAIN_DEF_MOD,
    FORMULA_CONSTANTS,
    CHARACTER_MODIFIERS,
    PERSUADE_MODIFIERS
} from '../utils/Constants.js';

export class FormulaCalculator {
    constructor(config = {}) {
        this.config = { ...FORMULA_CONSTANTS, ...config };
    }

    // ==================== 武将属性计算 ====================

    /**
     * 计算带兵上限
     */
    calculateMaxArms(person) {
        let arms = 0;
        arms += person.level * this.config.RATIO_ARMS_TO_LEVEL;
        arms += person.age * this.config.RATIO_ARMS_TO_AGE;
        arms += person.force * this.config.RATIO_ARMS_TO_FORCE;
        arms += person.iq * this.config.RATIO_ARMS_TO_IQ;
        return Math.min(arms, 0xFFFE); // 最大65534
    }

    /**
     * 计算攻击力
     */
    calculateAttack(person) {
        const modulus = ATK_MODULUS[person.armsType] || 1.0;
        
        let ratio = 0;
        ratio += person.iq * this.config.RATIO_ATT_TO_IQ / 10;
        ratio += person.force * this.config.RATIO_ATT_TO_FORCE / 10;
        ratio += person.age * this.config.RATIO_ATT_TO_AGE / 10;
        
        if (ratio === 0) {
            ratio = person.force; // 默认使用武力
        }
        
        return Math.floor(ratio * (person.level + 10) * modulus);
    }

    /**
     * 计算防御力
     */
    calculateDefense(person, terrain = 0) {
        const modulus = DEF_MODULUS[person.armsType] || 1.0;
        
        let ratio = 0;
        ratio += person.iq * this.config.RATIO_DEFENCE_TO_IQ / 10;
        ratio += person.force * this.config.RATIO_DEFENCE_TO_FORCE / 10;
        ratio += person.age * this.config.RATIO_DEFENCE_TO_AGE / 10;
        
        if (ratio === 0) {
            ratio = person.iq; // 默认使用智力
        }
        
        let defense = ratio * (person.level + 10) * modulus;
        
        // 应用地形防御加成
        const terrainMod = TERRAIN_DEF_MOD[terrain] || 1.0;
        defense *= terrainMod;
        
        return Math.floor(defense);
    }

    /**
     * 计算战斗HP
     */
    calculateBattleHP(person) {
        // HP = (武力 * 0.8 + 智力 * 0.3 + 等级) * 体力 / 100
        const baseHP = (person.force * 0.8 + person.iq * 0.3 + person.level);
        return Math.floor(baseHP * person.thew / 100);
    }

    /**
     * 计算战斗MP
     */
    calculateBattleMP(person) {
        // MP = (智力 * 0.8 + √武力 / 2 + 等级) * 体力 / 100
        const baseMP = (person.iq * 0.8 + Math.sqrt(person.force) / 2 + person.level);
        return Math.floor(baseMP * person.thew / 100);
    }

    /**
     * 计算移动力
     */
    calculateMovePower(person) {
        const ARMY_MOVE_BASE = [5, 4, 4, 5, 6, 3];
        let move = ARMY_MOVE_BASE[person.armsType] || 4;
        
        // TODO: 加上装备加成
        
        // 定身状态
        if (person.state === 3) { // STATE_DINGSHEN
            move = 1;
        }
        
        return Math.min(move, 8); // 最大移动力8
    }

    // ==================== 战斗伤害计算 ====================

    /**
     * 计算基础伤害
     */
    calculateDamage(attacker, defender) {
        const at = this.calculateAttack(attacker);
        const df = this.calculateDefense(defender);
        
        // 基础伤害 = (攻击/防御) * 兵力/8
        let baseDamage = (at / df) * (attacker.arms / 8);
        
        // 应用兵种相克
        const mod = SUBDUE_MATRIX[attacker.armsType]?.[defender.armsType] || 1.0;
        let damage = baseDamage * mod;
        
        // +10防止平局
        return Math.floor(damage) + 10;
    }

    /**
     * 计算技能伤害
     */
    calculateSkillDamage(skill, caster, target, weather = 1, terrain = 0) {
        const effect = skill.effect;
        if (!effect) return { armsDamage: 0, provDamage: 0, stateEffect: 0 };
        
        let armsDamage = effect.power;
        let provDamage = effect.destroy;
        
        // 天气修正
        if (weather >= 1 && weather <= 5) {
            armsDamage *= (effect.weather[weather - 1] || 100) / 100;
            provDamage *= (effect.weather[weather - 1] || 100) / 100;
        }
        
        // 目标兵种修正
        if (target.armsType >= 0 && target.armsType <= 5) {
            armsDamage *= (effect.earm[target.armsType] || 100) / 100;
        }
        
        // 目标地形修正
        if (terrain >= 0 && terrain <= 7) {
            armsDamage *= (effect.eland[terrain] || 100) / 100;
        }
        
        return {
            armsDamage: Math.floor(armsDamage),
            provDamage: Math.floor(provDamage),
            stateEffect: effect.state
        };
    }

    // ==================== 内政计算 ====================

    /**
     * 计算开垦增量
     */
    calculateFarmingIncrease(person) {
        // 基础增量 = 10 + 随机(0 ~ 智力*2)
        const baseIncrease = 10 + Math.random() * (person.iq * 2);
        return Math.floor(baseIncrease);
    }

    /**
     * 计算招商增量
     */
    calculateCommerceIncrease(person) {
        // 基础增量 = 10 + 随机(0 ~ 智力*2)
        const baseIncrease = 10 + Math.random() * (person.iq * 2);
        return Math.floor(baseIncrease);
    }

    /**
     * 计算出巡民忠增量
     */
    calculateInspectionIncrease(person) {
        let baseIncrease = 5 + Math.random() * 10;
        
        // 君主身份加成
        if (person.isKingCheck()) {
            baseIncrease *= 1.5;
        }
        
        return Math.floor(baseIncrease);
    }

    /**
     * 计算搜寻成功率
     */
    calculateSearchSuccessRate(person) {
        // 成功率 = 智力/150
        return person.iq / 150;
    }

    // ==================== 外交成功率计算 ====================

    /**
     * 计算招降成功率
     */
    calculateSurrenderRate(executor, target) {
        // 基础成功率
        let baseRate = executor.iq - target.iq + 50;
        if (baseRate > 100) baseRate = 100;
        
        // 忠诚度检查 (>60无法招降)
        if (target.devotion > 60) return 0;
        
        // 计算最终成功率
        const charMod = CHARACTER_MODIFIERS.SURRENDER[target.character] || 15;
        const finalRate = baseRate / charMod;
        
        return Math.max(0, Math.min(100, finalRate));
    }

    /**
     * 计算离间成功率
     */
    calculateAlienateRate(executor, target) {
        // 基础成功率
        const baseRate = executor.iq - target.iq + 50;
        
        // 随机判定智力差
        if (Math.random() * 100 > baseRate) return 0;
        
        // 忠诚度判定
        if (Math.random() * 100 < target.devotion) return 0;
        
        // 性格判定
        const charMod = CHARACTER_MODIFIERS.ALIENATE[target.character] || 30;
        if (Math.random() * 100 > charMod) return 0;
        
        return 100; // 成功
    }

    /**
     * 计算招揽成功率
     */
    calculateCanvassRate(executor, target) {
        // 智力差判定
        const iqDiff = executor.iq - target.iq;
        if (Math.random() * 100 > iqDiff + 100) return 0;
        
        // 忠诚度判定
        if (Math.random() * 100 < target.devotion) return 0;
        
        // 性格判定
        const charMod = CHARACTER_MODIFIERS.CANVASS[target.character] || 20;
        if (Math.random() * 100 > charMod) return 0;
        
        return 100; // 成功
    }

    /**
     * 计算策反成功率
     */
    calculateCounterespionageRate(executor, target) {
        // 基础成功率
        let baseRate = executor.iq - target.iq + 50;
        if (baseRate > 100) baseRate = 100;
        
        // 智力判定
        if (Math.random() * 100 > baseRate) return 0;
        
        // 忠诚度判定
        if (Math.random() * 100 < target.devotion) return 0;
        
        // 性格判定
        const charMod = CHARACTER_MODIFIERS.COUNTERESPIONAGE[target.character] || 30;
        if (Math.random() * 100 > charMod) return 0;
        
        return 100; // 成功
    }

    /**
     * 计算劝降成功率
     */
    calculateInduceRate(executor, targetKing, myCityCount, targetCityCount) {
        // 检查城池数量条件
        if (myCityCount < targetCityCount * 2) return 0;
        
        // 基础成功率
        const baseRate = executor.iq - targetKing.iq + 50;
        
        // 智力判定
        if (Math.random() * 100 > baseRate) return 0;
        
        // 性格判定
        const charMod = PERSUADE_MODIFIERS[targetKing.character] || 10;
        if (Math.random() * 100 > charMod) return 0;
        
        return 100; // 成功
    }

    // ==================== 资源计算 ====================

    /**
     * 计算战场粮草消耗
     */
    calculateProvenderConsumption(armyCount) {
        const ratio = this.config.RATIO_FOOD_TO_ARMS_PER_DAY || 3;
        return Math.floor(Math.sqrt(armyCount) / ratio);
    }

    /**
     * 计算城市粮草消耗
     */
    calculateCityProvenderConsumption(totalArms) {
        const ratio = this.config.RATIO_FOOD_TO_ARMS_PER_MONTH || 50;
        return Math.floor(totalArms / ratio);
    }

    /**
     * 计算征兵数量
     */
    calculateConscriptionAmount(peopleDevotion, mothballArms) {
        // 基础 = 民忠 * 配置系数
        const baseAmount = peopleDevotion * this.config.ARMS_PER_DEVOTION;
        return Math.min(baseAmount, mothballArms);
    }

    /**
     * 计算交易价格
     */
    calculateExchangeRate(commerce, commerceLimit, type) {
        const baseRate = 10; // 10粮食 = 1金钱
        const commerceFactor = commerce / commerceLimit;
        const fluctuation = 0.8 + Math.random() * 0.4; // 0.8 - 1.2
        
        if (type === 'buy') {
            return Math.floor(baseRate * (1 + commerceFactor * 0.5) * fluctuation * 1.1);
        } else {
            return Math.floor(baseRate * (1 + commerceFactor * 0.5) * fluctuation * 0.9);
        }
    }

    // ==================== 经验计算 ====================

    /**
     * 计算战斗经验获取
     */
    calculateBattleExperience(damage, isKilling = false) {
        let exp = damage / 100;
        if (isKilling) exp *= 2;
        return Math.floor(exp);
    }

    /**
     * 计算内政经验获取
     */
    calculateInternalExperience(orderType, success = true) {
        // 基础经验值
        const baseExp = {
            1: 5,  // 开垦
            2: 5,  // 招商
            3: 3,  // 搜寻
            4: 3,  // 治理
            5: 4,  // 出巡
            6: 10, // 招降
            13: 3  // 输送
        };
        
        let exp = baseExp[orderType] || 2;
        if (!success) exp = Math.floor(exp / 2);
        
        return exp;
    }
}

// 创建默认实例
export const formulaCalculator = new FormulaCalculator();
