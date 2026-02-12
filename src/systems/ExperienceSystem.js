/**
 * 经验系统
 * 管理经验获取和升级逻辑
 */

import { GAME_CONFIG } from '../utils/Constants.js';

export class ExperienceSystem {
    constructor(eventBus) {
        this.eventBus = eventBus;
        this.expTable = this._initializeExpTable();
    }

    /**
     * 初始化经验表
     */
    _initializeExpTable() {
        // 升级所需经验（简单线性增长）
        const table = {};
        for (let level = 1; level < GAME_CONFIG.MAX_LEVEL; level++) {
            table[level] = GAME_CONFIG.MAX_EXP; // 每级固定100经验
        }
        return table;
    }

    /**
     * 获得经验
     */
    gainExperience(person, exp, source = '') {
        if (exp <= 0) return { leveledUp: false, expGained: 0 };

        const oldLevel = person.level;
        person.experience += exp;

        let leveledUp = false;

        // 检查升级
        while (person.experience >= this.getExpToLevel(person.level)) {
            if (person.level >= GAME_CONFIG.MAX_LEVEL) {
                person.experience = this.getExpToLevel(GAME_CONFIG.MAX_LEVEL - 1);
                break;
            }

            person.experience -= this.getExpToLevel(person.level);
            this._levelUp(person);
            leveledUp = true;
        }

        if (this.eventBus) {
            this.eventBus.emit('exp.gained', {
                personId: person.id,
                personName: person.name,
                expGained: exp,
                source,
                newExp: person.experience,
                leveledUp
            });

            if (leveledUp) {
                this.eventBus.emit('exp.leveledUp', {
                    personId: person.id,
                    personName: person.name,
                    oldLevel,
                    newLevel: person.level
                });
            }
        }

        return {
            leveledUp,
            expGained: exp,
            newLevel: person.level,
            newExp: person.experience
        };
    }

    /**
     * 内部升级方法
     */
    _levelUp(person) {
        if (person.level >= GAME_CONFIG.MAX_LEVEL) {
            return false;
        }

        const oldForce = person.force;
        const oldIQ = person.iq;

        person.level++;

        // 随机提升属性
        const forceUp = Math.random() > 0.5 ? 1 : 0;
        const iqUp = Math.random() > 0.5 ? 1 : 0;

        if (forceUp) person.force++;
        if (iqUp) person.iq++;

        // 恢复体力
        const oldThew = person.thew;
        person.thew = GAME_CONFIG.MAX_THEW;

        if (this.eventBus) {
            this.eventBus.emit('exp.levelUp', {
                personId: person.id,
                personName: person.name,
                newLevel: person.level,
                forceUp,
                iqUp,
                newForce: person.force,
                newIQ: person.iq
            });
        }

        return true;
    }

    /**
     * 获取升级所需经验
     */
    getExpToLevel(currentLevel) {
        return this.expTable[currentLevel] || GAME_CONFIG.MAX_EXP;
    }

    /**
     * 计算战斗经验
     */
    calculateBattleExp(damage, isKill = false, isVictory = false) {
        let exp = Math.floor(damage / 100);

        if (isKill) exp *= 2;
        if (isVictory) exp += 10;

        return Math.max(1, exp);
    }

    /**
     * 计算内政经验
     */
    calculateInternalExp(orderType, success = true) {
        const baseExp = {
            1: 5,   // 开垦
            2: 5,   // 招商
            3: 3,   // 搜寻
            4: 3,   // 治理
            5: 4,   // 出巡
            6: 10,  // 招降
            13: 3,  // 输送
            15: 5,  // 离间
            16: 8,  // 招揽
            17: 15, // 策反
            19: 20  // 劝降
        };

        let exp = baseExp[orderType] || 2;
        if (!success) exp = Math.floor(exp / 2);

        return exp;
    }

    /**
     * 计算战斗胜利经验
     */
    calculateVictoryExp(person, battleResult) {
        let exp = 50; // 基础经验

        // 根据战果调整
        if (battleResult.kills > 0) {
            exp += battleResult.kills * 20;
        }

        if (battleResult.damage > 0) {
            exp += Math.floor(battleResult.damage / 50);
        }

        return exp;
    }

    /**
     * 批量添加经验
     */
    batchGainExperience(persons, exp, source = '') {
        const results = [];

        persons.forEach(person => {
            const result = this.gainExperience(person, exp, source);
            results.push({
                personId: person.id,
                personName: person.name,
                ...result
            });
        });

        return results;
    }

    /**
     * 获取距离下一级所需经验
     */
    getExpToNextLevel(person) {
        if (person.level >= GAME_CONFIG.MAX_LEVEL) {
            return 0;
        }
        return this.getExpToLevel(person.level) - person.experience;
    }

    /**
     * 获取升级进度百分比
     */
    getLevelProgress(person) {
        if (person.level >= GAME_CONFIG.MAX_LEVEL) {
            return 100;
        }
        const required = this.getExpToLevel(person.level);
        return Math.floor((person.experience / required) * 100);
    }
}
