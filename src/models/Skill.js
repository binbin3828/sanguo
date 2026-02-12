/**
 * 技能数据模型
 */

export class Skill {
    constructor(data = {}) {
        this.id = data.id || 0;
        this.name = data.name || '';
        this.description = data.description || '';
        
        // 技能效果
        this.effect = data.effect || {
            aim: 0,              // 施展目标 0=敌方, 1=我方
            state: 0,            // 对目标状态的影响
            power: 0,            // 对兵力的基本伤害
            destroy: 0,          // 对粮草的基本伤害
            useMp: 0,            // 消耗技能点
            weather: [100, 100, 100, 100, 100],  // 天气效果 [5] 百分比
            eland: [100, 100, 100, 100, 100, 100, 100, 100],  // 敌人地形效果 [8] 百分比
            oland: [100, 100, 100, 100, 100, 100, 100, 100],  // 我方地形效果 [8] 百分比
            earm: [100, 100, 100, 100, 100, 100]   // 敌人兵种效果 [6] 百分比
        };
        
        // 攻击范围 (9x9 网格)
        this.range = data.range || new Array(81).fill(0);
    }

    /**
     * 获取技能类型
     */
    getType() {
        // 根据名称或效果判断技能类型
        const attackSkills = ['践踏', '冲锋', '突击', '突袭', '奋战', '飞矢', '箭雨', '火箭', '撞击', '烈火', '海啸', '围攻'];
        const controlSkills = ['咒封', '定身', '流言', '石阵', '陷阱'];
        const supportSkills = ['援兵', '援军', '奇门', '遁甲', '潜踪', '天籁', '急行', '谍报'];
        const specialSkills = ['天变', '火攻', '水淹', '滚木', '落石'];
        
        if (attackSkills.includes(this.name)) return 'attack';
        if (controlSkills.includes(this.name)) return 'control';
        if (supportSkills.includes(this.name)) return 'support';
        if (specialSkills.includes(this.name)) return 'special';
        
        return 'unknown';
    }

    /**
     * 计算技能伤害
     */
    calculateDamage(caster, target, weather, terrain) {
        const effect = this.effect;
        
        // 基础伤害
        let armsDamage = effect.power;
        let provDamage = effect.destroy;
        
        // 应用天气修正
        if (weather >= 1 && weather <= 5) {
            armsDamage *= effect.weather[weather - 1] / 100;
            provDamage *= effect.weather[weather - 1] / 100;
        }
        
        // 应用目标兵种修正
        if (target.armsType >= 0 && target.armsType <= 5) {
            armsDamage *= effect.earm[target.armsType] / 100;
        }
        
        // 应用目标地形修正
        if (terrain >= 0 && terrain <= 7) {
            armsDamage *= effect.eland[terrain] / 100;
        }
        
        return {
            armsDamage: Math.floor(armsDamage),
            provDamage: Math.floor(provDamage),
            stateEffect: effect.state
        };
    }

    /**
     * 检查是否可以使用
     */
    canUse(person, mp, weather, terrain) {
        // 检查MP
        if (mp < this.effect.useMp) {
            return false;
        }
        
        // 检查天气
        if (weather >= 1 && weather <= 5) {
            if (this.effect.weather[weather - 1] === 0) {
                return false;
            }
        }
        
        // 检查地形
        if (terrain >= 0 && terrain <= 7) {
            if (this.effect.oland[terrain] === 0) {
                return false;
            }
        }
        
        return true;
    }

    /**
     * 获取MP消耗
     */
    getMpCost() {
        return this.effect.useMp;
    }

    /**
     * 转换为JSON
     */
    toJSON() {
        return {
            id: this.id,
            name: this.name,
            description: this.description,
            effect: { ...this.effect },
            range: [...this.range]
        };
    }

    /**
     * 从JSON创建
     */
    static fromJSON(json) {
        return new Skill(json);
    }
}
