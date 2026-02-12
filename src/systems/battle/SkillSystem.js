/**
 * 技能系统
 * 管理战斗技能的使用和效果
 */

export class SkillSystem {
    constructor(eventBus, combatCalculator) {
        this.eventBus = eventBus;
        this.combatCalculator = combatCalculator;
    }

    /**
     * 执行技能
     */
    async executeSkill(battle, caster, params) {
        const skillId = params.skillId;
        const targetIds = params.targetIds || [];

        // 获取技能
        const skill = this.getSkill(skillId);
        if (!skill) {
            return { success: false, error: '技能不存在' };
        }

        // 检查MP
        if (!caster.consumeMp(skill.effect?.useMp || 0)) {
            return { success: false, error: 'MP不足' };
        }

        const results = [];

        // 对每个目标执行技能效果
        for (const targetId of targetIds) {
            const target = battle.units.get(targetId);
            if (!target) continue;

            const result = this.applySkillEffect(skill, caster, target, battle.weather);
            results.push(result);
        }

        if (this.eventBus) {
            this.eventBus.emit('battle.skillUsed', {
                battleId: battle.id,
                casterId: caster.id,
                skillId,
                results
            });
        }

        return {
            success: true,
            message: `${caster.personName} 使用了 ${skill.name}`,
            data: { results }
        };
    }

    /**
     * 应用技能效果
     */
    applySkillEffect(skill, caster, target, weather) {
        const effect = skill.effect;
        if (!effect) {
            return { targetId: target.id, damage: 0 };
        }

        // 获取目标位置的地形
        const terrain = 0; // TODO: 从地图获取实际地形

        // 计算伤害
        const damage = this.combatCalculator.calculateSkillDamage(
            skill, caster, target, weather, terrain
        );

        // 应用兵力伤害
        if (damage.armsDamage > 0) {
            const isKilled = target.takeDamage(damage.armsDamage);
            caster.dealDamage(damage.armsDamage);

            if (isKilled) {
                caster.recordKill();
            }
        }

        // 应用状态效果
        if (damage.stateEffect > 0) {
            target.setState(damage.stateEffect, 3); // 持续3回合
        }

        return {
            targetId: target.id,
            targetName: target.personName,
            armsDamage: damage.armsDamage,
            provDamage: damage.provDamage,
            stateEffect: damage.stateEffect,
            killed: !target.active
        };
    }

    /**
     * 获取技能
     */
    getSkill(skillId) {
        // TODO: 从技能仓库获取
        const skills = this.getAllSkills();
        return skills.find(s => s.id === skillId);
    }

    /**
     * 获取所有技能
     */
    getAllSkills() {
        return [
            { id: 4, name: '火攻', effect: { power: 150, useMp: 20, weather: [100, 110, 130, 50, 80] } },
            { id: 11, name: '水淹', effect: { power: 140, useMp: 20, weather: [100, 110, 80, 130, 120] } },
            { id: 5, name: '滚木', effect: { power: 120, useMp: 15 } },
            { id: 6, name: '落石', effect: { power: 130, useMp: 15 } },
            { id: 14, name: '咒封', effect: { power: 0, useMp: 25, state: 2 } },
            { id: 15, name: '定身', effect: { power: 0, useMp: 25, state: 3 } },
            { id: 16, name: '混乱', effect: { power: 0, useMp: 25, state: 1 } },
            { id: 17, name: '援兵', effect: { power: -100, useMp: 30 } },
            { id: 29, name: '天变', effect: { power: 0, useMp: 50 } }
        ];
    }

    /**
     * 获取单位可用的技能
     */
    getAvailableSkills(unit) {
        const allSkills = this.getAllSkills();
        return allSkills.filter(skill => {
            // 检查MP
            if (unit.mp < (skill.effect?.useMp || 0)) {
                return false;
            }

            // 检查状态（禁咒状态不能使用技能）
            if (unit.state === 2) {
                return false;
            }

            return true;
        });
    }

    /**
     * 获取技能范围
     */
    getSkillRange(skill, casterX, casterY) {
        // 简化的范围计算，返回5x5范围
        const range = [];
        for (let dy = -2; dy <= 2; dy++) {
            for (let dx = -2; dx <= 2; dx++) {
                range.push({
                    x: casterX + dx,
                    y: casterY + dy
                });
            }
        }
        return range;
    }

    /**
     * 检查技能是否可以使用
     */
    canUseSkill(skill, unit, weather, terrain) {
        // 检查MP
        if (unit.mp < (skill.effect?.useMp || 0)) {
            return false;
        }

        // 检查状态
        if (unit.state === 2) { // 禁咒
            return false;
        }

        // 检查天气
        if (skill.effect?.weather && weather >= 1 && weather <= 5) {
            if (skill.effect.weather[weather - 1] === 0) {
                return false;
            }
        }

        return true;
    }
}
