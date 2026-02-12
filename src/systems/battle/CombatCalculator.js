/**
 * 战斗计算器
 * 管理战斗中的所有数值计算
 */

import { 
    ATK_MODULUS, 
    DEF_MODULUS, 
    SUBDUE_MATRIX,
    TERRAIN_DEF_MOD 
} from '../../utils/Constants.js';

export class CombatCalculator {
    constructor(formulaCalculator) {
        this.formulaCalculator = formulaCalculator;
    }

    /**
     * 计算攻击力
     */
    calculateAttack(unit) {
        const modulus = ATK_MODULUS[unit.armsType] || 1.0;
        return Math.floor(unit.force * (unit.level + 10) * modulus);
    }

    /**
     * 计算防御力
     */
    calculateDefense(unit, terrain = 0) {
        const modulus = DEF_MODULUS[unit.armsType] || 1.0;
        let defense = unit.iq * (unit.level + 10) * modulus;

        // 应用地形防御加成
        const terrainMod = TERRAIN_DEF_MOD[terrain] || 1.0;
        defense *= terrainMod;

        return Math.floor(defense);
    }

    /**
     * 计算伤害
     */
    calculateDamage(attacker, defender, terrain = 0) {
        const at = this.calculateAttack(attacker);
        const df = this.calculateDefense(defender, terrain);

        // 基础伤害 = (攻击/防御) * 兵力/8
        let baseDamage = (at / df) * (attacker.arms / 8);

        // 应用兵种相克
        const mod = SUBDUE_MATRIX[attacker.armsType]?.[defender.armsType] || 1.0;
        let damage = baseDamage * mod;

        // +10防止平局
        damage = Math.floor(damage) + 10;

        // 随机浮动 (-10% 到 +10%)
        const fluctuation = 0.9 + Math.random() * 0.2;
        damage = Math.floor(damage * fluctuation);

        return Math.max(1, damage);
    }

    /**
     * 计算技能伤害
     */
    calculateSkillDamage(skill, caster, target, weather, terrain) {
        const effect = skill.effect;
        if (!effect) {
            return { armsDamage: 0, provDamage: 0, stateEffect: 0 };
        }

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

    /**
     * 计算经验获取
     */
    calculateExpGain(unit, damage, isKill = false) {
        let exp = Math.floor(damage / 100);
        if (isKill) exp *= 2;
        return Math.max(1, exp);
    }

    /**
     * 计算士气影响
     */
    calculateMoraleEffect(baseDamage, morale) {
        // 士气范围 0-100，50为基准
        const multiplier = 0.5 + (morale / 100);
        return Math.floor(baseDamage * multiplier);
    }

    /**
     * 计算连击伤害递减
     */
    calculateComboDamage(baseDamage, comboCount) {
        // 每次连击伤害递减20%
        const multiplier = Math.max(0.2, 1 - (comboCount * 0.2));
        return Math.floor(baseDamage * multiplier);
    }

    /**
     * 计算反击伤害
     */
    calculateCounterDamage(baseDamage) {
        // 反击伤害为正常伤害的70%
        return Math.floor(baseDamage * 0.7);
    }

    /**
     * 计算士气变化
     */
    calculateMoraleChange(currentMorale, event) {
        const changes = {
            win: 10,
            lose: -10,
            kill: 15,
            killed: -15,
            skill_success: 5,
            skill_fail: -5
        };

        const change = changes[event] || 0;
        return Math.max(0, Math.min(100, currentMorale + change));
    }
}
