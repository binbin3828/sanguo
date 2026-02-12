/**
 * 战斗系统核心
 * 管理战斗流程和状态
 */

import { BATTLE_CONSTANTS, WEATHER_TYPES } from '../utils/Constants.js';

export class BattleSystem {
    constructor(eventBus, formulaCalculator, pathFinder, skillSystem, weatherSystem) {
        this.eventBus = eventBus;
        this.formulaCalculator = formulaCalculator;
        this.pathFinder = pathFinder;
        this.skillSystem = skillSystem;
        this.weatherSystem = weatherSystem;
        
        this.battles = new Map();
        this.currentBattle = null;
    }

    /**
     * 初始化战斗
     */
    async initBattle(params) {
        const battleId = Date.now().toString(36) + Math.random().toString(36).substr(2);
        
        const battle = {
            id: battleId,
            attackerPersons: params.attackerPersons.slice(0, 10),
            defenderPersons: params.defenderPersons.slice(0, 10),
            attackerCity: params.attackerCity,
            defenderCity: params.defenderCity,
            mode: params.mode || 'attack',
            
            // 战斗状态
            turn: 0,
            currentSide: 'attacker', // attacker 或 defender
            currentUnitIndex: 0,
            
            // 天气
            weather: this.weatherSystem.getRandomWeather(),
            
            // 战斗单位
            units: new Map(),
            
            // 战斗结果
            winner: null,
            isOver: false
        };

        // 初始化战斗单位
        this._initBattleUnits(battle);

        // 初始化战斗地图
        battle.map = this._initBattleMap();

        this.battles.set(battleId, battle);
        this.currentBattle = battle;

        if (this.eventBus) {
            this.eventBus.emit('battle.init', battle);
        }

        return battle;
    }

    /**
     * 初始化战斗单位
     */
    _initBattleUnits(battle) {
        let unitId = 0;

        // 初始化进攻方单位
        battle.attackerPersons.forEach((person, index) => {
            const unit = this._createBattleUnit(person, unitId++, 'attacker', index);
            battle.units.set(unit.id, unit);
        });

        // 初始化防守方单位
        battle.defenderPersons.forEach((person, index) => {
            const unit = this._createBattleUnit(person, unitId++, 'defender', index);
            battle.units.set(unit.id, unit);
        });
    }

    /**
     * 创建战斗单位
     */
    _createBattleUnit(person, id, side, positionIndex) {
        const hp = this.formulaCalculator.calculateBattleHP(person);
        const mp = this.formulaCalculator.calculateBattleMP(person);
        const move = this.formulaCalculator.calculateMovePower(person);

        return {
            id,
            personId: person.id,
            personName: person.name,
            side,
            
            // 基础属性
            level: person.level,
            force: person.force,
            iq: person.iq,
            armsType: person.armsType,
            
            // 战斗属性
            hp,
            maxHp: hp,
            mp,
            maxMp: mp,
            move,
            arms: person.arms,
            
            // 位置
            x: 0,
            y: 0,
            
            // 状态
            state: 0, // 0=正常
            active: true,
            hasActed: false
        };
    }

    /**
     * 初始化战斗地图
     */
    _initBattleMap() {
        // 简化的15x15战斗地图
        const size = 15;
        const map = [];

        for (let y = 0; y < size; y++) {
            const row = [];
            for (let x = 0; x < size; x++) {
                // 默认草地
                row.push(0);
            }
            map.push(row);
        }

        // 设置一些地形
        // 中间设置一些障碍物
        map[7][7] = 5; // 城池

        return map;
    }

    /**
     * 开始战斗回合
     */
    startTurn(battleId) {
        const battle = this.battles.get(battleId);
        if (!battle) return null;

        battle.turn++;
        battle.currentSide = battle.turn % 2 === 1 ? 'attacker' : 'defender';
        battle.currentUnitIndex = 0;

        // 重置单位行动状态
        battle.units.forEach(unit => {
            if (unit.side === battle.currentSide && unit.active) {
                unit.hasActed = false;
            }
        });

        // 天气变化
        if (battle.turn > 1) {
            battle.weather = this.weatherSystem.changeWeather(battle.weather);
        }

        if (this.eventBus) {
            this.eventBus.emit('battle.turnStart', {
                battleId,
                turn: battle.turn,
                side: battle.currentSide,
                weather: battle.weather
            });
        }

        return battle;
    }

    /**
     * 获取当前行动单位
     */
    getCurrentUnit(battleId) {
        const battle = this.battles.get(battleId);
        if (!battle) return null;

        const units = Array.from(battle.units.values())
            .filter(u => u.side === battle.currentSide && u.active && !u.hasActed);

        return units[0] || null;
    }

    /**
     * 执行单位行动
     */
    async executeUnitAction(battleId, unitId, action, params) {
        const battle = this.battles.get(battleId);
        if (!battle) return { success: false, error: '战斗不存在' };

        const unit = battle.units.get(unitId);
        if (!unit) return { success: false, error: '单位不存在' };

        if (unit.hasActed) {
            return { success: false, error: '该单位已行动' };
        }

        let result;

        switch (action) {
            case 'move':
                result = await this._executeMove(battle, unit, params);
                break;
            case 'attack':
                result = await this._executeAttack(battle, unit, params);
                break;
            case 'skill':
                result = await this._executeSkill(battle, unit, params);
                break;
            case 'rest':
                result = await this._executeRest(battle, unit);
                break;
            default:
                return { success: false, error: '未知行动类型' };
        }

        if (result.success) {
            unit.hasActed = true;

            if (this.eventBus) {
                this.eventBus.emit('battle.unitAction', {
                    battleId,
                    unitId,
                    action,
                    result
                });
            }

            // 检查战斗是否结束
            this._checkBattleEnd(battle);
        }

        return result;
    }

    /**
     * 执行移动
     */
    async _executeMove(battle, unit, params) {
        const { x, y } = params;
        
        unit.x = x;
        unit.y = y;

        return {
            success: true,
            message: `${unit.personName} 移动至 (${x}, ${y})`,
            data: { x, y }
        };
    }

    /**
     * 执行攻击
     */
    async _executeAttack(battle, attacker, params) {
        const targetId = params.targetId;
        const target = battle.units.get(targetId);

        if (!target) {
            return { success: false, error: '目标不存在' };
        }

        if (target.side === attacker.side) {
            return { success: false, error: '不能攻击友方' };
        }

        // 计算伤害
        const damage = this.formulaCalculator.calculateDamage(
            { ...attacker, arms: attacker.arms },
            { ...target, arms: target.arms }
        );

        // 应用伤害
        target.arms = Math.max(0, target.arms - damage);
        
        // 检查目标是否被击败
        if (target.arms <= 0) {
            target.active = false;
        }

        return {
            success: true,
            message: `${attacker.personName} 攻击 ${target.personName}，造成 ${damage} 伤害`,
            data: {
                targetId,
                damage,
                targetDefeated: !target.active
            }
        };
    }

    /**
     * 执行技能
     */
    async _executeSkill(battle, unit, params) {
        return this.skillSystem.executeSkill(battle, unit, params);
    }

    /**
     * 执行休息
     */
    async _executeRest(battle, unit) {
        // 恢复少量HP和MP
        const hpRecovery = Math.floor(unit.maxHp * 0.1);
        const mpRecovery = Math.floor(unit.maxMp * 0.1);

        unit.hp = Math.min(unit.maxHp, unit.hp + hpRecovery);
        unit.mp = Math.min(unit.maxMp, unit.mp + mpRecovery);

        return {
            success: true,
            message: `${unit.personName} 休息，恢复 ${hpRecovery} HP 和 ${mpRecovery} MP`,
            data: { hpRecovery, mpRecovery }
        };
    }

    /**
     * 检查战斗是否结束
     */
    _checkBattleEnd(battle) {
        const attackerUnits = Array.from(battle.units.values())
            .filter(u => u.side === 'attacker' && u.active);
        const defenderUnits = Array.from(battle.units.values())
            .filter(u => u.side === 'defender' && u.active);

        if (attackerUnits.length === 0) {
            battle.winner = 'defender';
            battle.isOver = true;
        } else if (defenderUnits.length === 0) {
            battle.winner = 'attacker';
            battle.isOver = true;
        } else if (battle.turn >= BATTLE_CONSTANTS.MAX_FGT_BOUT) {
            // 超过最大回合数，防守方胜利
            battle.winner = 'defender';
            battle.isOver = true;
        }

        if (battle.isOver && this.eventBus) {
            this.eventBus.emit('battle.end', {
                battleId: battle.id,
                winner: battle.winner,
                turns: battle.turn
            });
        }
    }

    /**
     * 结束战斗
     */
    endBattle(battleId, winner) {
        const battle = this.battles.get(battleId);
        if (!battle) return null;

        battle.winner = winner;
        battle.isOver = true;

        if (this.eventBus) {
            this.eventBus.emit('battle.end', {
                battleId,
                winner,
                turns: battle.turn
            });
        }

        return battle;
    }

    /**
     * 获取战斗信息
     */
    getBattle(battleId) {
        return this.battles.get(battleId);
    }

    /**
     * 获取当前战斗
     */
    getCurrentBattle() {
        return this.currentBattle;
    }
}
