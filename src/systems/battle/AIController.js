/**
 * AI战斗控制器
 * 管理AI在战斗中的决策和行为
 */

export class AIController {
    constructor(eventBus, pathFinder, combatCalculator, skillSystem) {
        this.eventBus = eventBus;
        this.pathFinder = pathFinder;
        this.combatCalculator = combatCalculator;
        this.skillSystem = skillSystem;
    }

    /**
     * 执行AI回合
     */
    async executeTurn(battle, aiSide) {
        const aiUnits = Array.from(battle.units.values())
            .filter(u => u.side === aiSide && u.active && !u.hasActed);

        const results = [];

        for (const unit of aiUnits) {
            const action = await this.decideAction(battle, unit);
            results.push({
                unitId: unit.id,
                action
            });
        }

        return results;
    }

    /**
     * 决定行动
     */
    async decideAction(battle, unit) {
        // 获取敌方单位
        const enemies = this.getEnemies(battle, unit);
        if (enemies.length === 0) {
            return { type: 'rest' };
        }

        // 尝试使用技能
        const skillAction = await this.tryUseSkill(battle, unit, enemies);
        if (skillAction) {
            return skillAction;
        }

        // 尝试攻击
        const attackAction = await this.tryAttack(battle, unit, enemies);
        if (attackAction) {
            return attackAction;
        }

        // 向敌方移动
        const moveAction = await this.decideMove(battle, unit, enemies);
        if (moveAction) {
            return moveAction;
        }

        // 默认休息
        return { type: 'rest' };
    }

    /**
     * 尝试使用技能
     */
    async tryUseSkill(battle, unit, enemies) {
        // 如果处于禁咒状态，不能使用技能
        if (unit.state === 2) {
            return null;
        }

        const availableSkills = this.skillSystem.getAvailableSkills(unit);
        if (availableSkills.length === 0) {
            return null;
        }

        // 选择最佳技能
        const bestSkill = this.selectBestSkill(unit, enemies, availableSkills);
        if (!bestSkill) {
            return null;
        }

        // 获取技能范围
        const range = this.skillSystem.getSkillRange(bestSkill, unit.x, unit.y);

        // 选择技能范围内的目标
        const targets = enemies.filter(e => 
            range.some(r => r.x === e.x && r.y === e.y)
        );

        if (targets.length === 0) {
            return null;
        }

        return {
            type: 'skill',
            skillId: bestSkill.id,
            targetIds: targets.slice(0, 3).map(t => t.id)
        };
    }

    /**
     * 选择最佳技能
     */
    selectBestSkill(unit, enemies, skills) {
        // 优先选择攻击类技能
        const attackSkills = skills.filter(s => s.effect?.power > 0);
        if (attackSkills.length > 0) {
            // 选择威力最大的
            return attackSkills.sort((a, b) => b.effect.power - a.effect.power)[0];
        }

        // 其次选择控制类技能
        const controlSkills = skills.filter(s => s.effect?.state > 0);
        if (controlSkills.length > 0) {
            return controlSkills[0];
        }

        // 最后选择辅助类技能
        const supportSkills = skills.filter(s => s.effect?.power < 0);
        if (supportSkills.length > 0 && unit.arms < unit.maxArms * 0.5) {
            return supportSkills[0];
        }

        return null;
    }

    /**
     * 尝试攻击
     */
    async tryAttack(battle, unit, enemies) {
        // 获取攻击范围内的敌人
        const attackRange = this.pathFinder.calculateAttackRange(unit.x, unit.y, 1, battle.map);
        
        const targetsInRange = enemies.filter(e => 
            attackRange.some(r => r.x === e.x && r.y === e.y)
        );

        if (targetsInRange.length === 0) {
            return null;
        }

        // 选择最佳目标（优先攻击血量低的）
        const target = targetsInRange.sort((a, b) => a.arms - b.arms)[0];

        return {
            type: 'attack',
            targetId: target.id
        };
    }

    /**
     * 决定移动
     */
    async decideMove(battle, unit, enemies) {
        // 找到最近的敌人
        const nearestEnemy = this.findNearestEnemy(unit, enemies);
        if (!nearestEnemy) {
            return null;
        }

        // 计算可移动区域
        const obstacles = this.getObstacles(battle, unit);
        const moveArea = this.pathFinder.calculateMoveArea(
            unit.x, unit.y, unit.move, unit.armsType, battle.map, obstacles
        );

        // 选择最佳的移动位置
        const bestPosition = this.selectBestPosition(
            moveArea.movableArea, 
            nearestEnemy,
            enemies,
            battle.map
        );

        if (!bestPosition) {
            return null;
        }

        return {
            type: 'move',
            x: bestPosition.x,
            y: bestPosition.y
        };
    }

    /**
     * 选择最佳位置
     */
    selectBestPosition(positions, target, enemies, map) {
        let bestPos = null;
        let bestScore = -9999;

        for (const pos of positions) {
            let score = 0;

            // 距离目标越近越好
            const distToTarget = Math.abs(pos.x - target.x) + Math.abs(pos.y - target.y);
            score -= distToTarget * 10;

            // 地形防御加成
            const terrain = this.pathFinder.getTerrain(pos.x, pos.y, map);
            const terrainBonus = [0, 0, 20, 15, 10, 50, 20, -20];
            score += terrainBonus[terrain] || 0;

            // 攻击范围内有敌人的加分
            const attackRange = this.pathFinder.calculateAttackRange(pos.x, pos.y, 1, map);
            const canAttack = enemies.some(e => 
                attackRange.some(r => r.x === e.x && r.y === e.y)
            );
            if (canAttack) {
                score += 50;
            }

            if (score > bestScore) {
                bestScore = score;
                bestPos = pos;
            }
        }

        return bestPos;
    }

    /**
     * 找到最近的敌人
     */
    findNearestEnemy(unit, enemies) {
        let nearest = null;
        let minDist = Infinity;

        for (const enemy of enemies) {
            const dist = Math.abs(unit.x - enemy.x) + Math.abs(unit.y - enemy.y);
            if (dist < minDist) {
                minDist = dist;
                nearest = enemy;
            }
        }

        return nearest;
    }

    /**
     * 获取敌方单位
     */
    getEnemies(battle, unit) {
        return Array.from(battle.units.values())
            .filter(u => u.side !== unit.side && u.active);
    }

    /**
     * 获取障碍物
     */
    getObstacles(battle, unit) {
        const obstacles = [];
        
        battle.units.forEach(u => {
            if (u.id !== unit.id && u.active) {
                obstacles.push({
                    x: u.x,
                    y: u.y,
                    type: u.side === unit.side ? 'ally' : 'enemy'
                });
            }
        });

        return obstacles;
    }
}
