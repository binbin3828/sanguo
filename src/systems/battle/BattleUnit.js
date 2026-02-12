/**
 * 战斗单位模型
 * 战斗中的武将数据
 */

export class BattleUnit {
    constructor(data = {}) {
        this.id = data.id || 0;
        this.personId = data.personId || 0;
        this.personName = data.personName || '';
        this.side = data.side || 'attacker'; // attacker 或 defender

        // 基础属性
        this.level = data.level || 1;
        this.force = data.force || 50;
        this.iq = data.iq || 50;
        this.armsType = data.armsType || 1;
        this.character = data.character || 0;

        // 战斗属性
        this.hp = data.hp || 100;
        this.maxHp = data.maxHp || 100;
        this.mp = data.mp || 50;
        this.maxMp = data.maxMp || 50;
        this.move = data.move || 4;
        this.arms = data.arms || 100;
        this.maxArms = data.arms || 100;

        // 位置
        this.x = data.x || 0;
        this.y = data.y || 0;

        // 状态
        this.state = data.state || 0; // 0=正常, 1=混乱, 2=禁咒, 3=定身, ...
        this.active = data.active !== undefined ? data.active : true;
        this.hasActed = data.hasActed || false;

        // 装备
        this.equip = data.equip || [0, 0];

        // 士气
        this.morale = data.morale || 50;

        // 经验
        this.expGained = 0;

        // 统计
        this.stats = {
            damageDealt: 0,
            damageTaken: 0,
            kills: 0,
            skillsUsed: 0
        };
    }

    /**
     * 受到伤害
     */
    takeDamage(damage) {
        this.arms = Math.max(0, this.arms - damage);
        this.stats.damageTaken += damage;

        if (this.arms <= 0) {
            this.active = false;
        }

        return this.arms <= 0;
    }

    /**
     * 造成伤害
     */
    dealDamage(damage) {
        this.stats.damageDealt += damage;
    }

    /**
     * 记录击杀
     */
    recordKill() {
        this.stats.kills++;
    }

    /**
     * 消耗MP
     */
    consumeMp(amount) {
        if (this.mp >= amount) {
            this.mp -= amount;
            this.stats.skillsUsed++;
            return true;
        }
        return false;
    }

    /**
     * 恢复HP
     */
    recoverHp(amount) {
        this.hp = Math.min(this.maxHp, this.hp + amount);
    }

    /**
     * 恢复MP
     */
    recoverMp(amount) {
        this.mp = Math.min(this.maxMp, this.mp + amount);
    }

    /**
     * 设置状态
     */
    setState(state, duration = 1) {
        this.state = state;
        this.stateDuration = duration;
    }

    /**
     * 清除状态
     */
    clearState() {
        this.state = 0;
        this.stateDuration = 0;
    }

    /**
     * 更新状态持续时间
     */
    updateState() {
        if (this.stateDuration > 0) {
            this.stateDuration--;
            if (this.stateDuration <= 0) {
                this.clearState();
            }
        }
    }

    /**
     * 移动
     */
    moveTo(x, y) {
        this.x = x;
        this.y = y;
    }

    /**
     * 增加经验
     */
    gainExp(amount) {
        this.expGained += amount;
    }

    /**
     * 获取状态名称
     */
    getStateName() {
        const stateNames = ['正常', '混乱', '禁咒', '定身', '奇门', '遁甲', '石阵', '潜踪', '死亡'];
        return stateNames[this.state] || '未知';
    }

    /**
     * 检查是否可以使用技能
     */
    canUseSkill(skill) {
        // 检查MP
        if (this.mp < skill.effect?.useMp) {
            return false;
        }

        // 检查状态（禁咒状态不能使用技能）
        if (this.state === 2) { // STATE_JINZHOU
            return false;
        }

        return true;
    }

    /**
     * 检查是否可以移动
     */
    canMove() {
        // 定身状态不能移动
        if (this.state === 3) { // STATE_DINGSHEN
            return false;
        }

        // 混乱状态可以移动但方向随机
        return this.active && !this.hasActed;
    }

    /**
     * 检查是否可以攻击
     */
    canAttack() {
        // 混乱状态不能攻击
        if (this.state === 1) { // STATE_CHAOS
            return false;
        }

        return this.active && !this.hasActed && this.arms > 0;
    }

    /**
     * 转换为JSON
     */
    toJSON() {
        return {
            id: this.id,
            personId: this.personId,
            personName: this.personName,
            side: this.side,
            level: this.level,
            force: this.force,
            iq: this.iq,
            armsType: this.armsType,
            hp: this.hp,
            maxHp: this.maxHp,
            mp: this.mp,
            maxMp: this.maxMp,
            move: this.move,
            arms: this.arms,
            maxArms: this.maxArms,
            x: this.x,
            y: this.y,
            state: this.state,
            active: this.active,
            hasActed: this.hasActed,
            morale: this.morale,
            stats: { ...this.stats }
        };
    }

    /**
     * 从JSON创建
     */
    static fromJSON(json) {
        return new BattleUnit(json);
    }
}
