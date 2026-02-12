/**
 * 指令数据模型
 * 用于内政、外交、军事等各类指令
 */

export class Order {
    constructor(data = {}) {
        this.id = data.id || 0;                  // 指令ID
        this.type = data.type || 0;              // 指令类型
        
        // 执行信息
        this.executorId = data.executorId || -1; // 执行武将ID
        this.cityId = data.cityId || -1;         // 所在城市ID
        
        // 目标信息
        this.targetId = data.targetId || -1;     // 目标对象ID（武将/城市）
        this.targetCityId = data.targetCityId || -1; // 目标城市ID
        
        // 资源
        this.arms = data.arms || 0;              // 士兵数量
        this.food = data.food || 0;              // 粮食数量
        this.money = data.money || 0;            // 金钱数量
        
        // 时间
        this.consume = data.consume || 1;        // 消耗时间（月）
        this.timeCount = data.timeCount || 0;    // 执行累时
        
        // 状态
        this.status = data.status || 'pending';  // pending/executing/completed/failed
        this.result = data.result || null;       // 执行结果
    }

    /**
     * 指令类型名称
     */
    static getTypeName(type) {
        const names = {
            0: '无操作',
            1: '开垦',
            2: '招商',
            3: '搜寻',
            4: '治理',
            5: '出巡',
            6: '招降',
            7: '处斩',
            8: '流放',
            9: '赏赐',
            10: '没收',
            11: '交易',
            12: '宴请',
            13: '输送',
            14: '移动',
            15: '离间',
            16: '招揽',
            17: '策反',
            18: '反间',
            19: '劝降',
            20: '征兵',
            21: '出征',
            22: '调兵'
        };
        return names[type] || '未知指令';
    }

    /**
     * 获取指令名称
     */
    getName() {
        return Order.getTypeName(this.type);
    }

    /**
     * 是否是内政指令
     */
    isInternal() {
        return this.type >= 0 && this.type <= 14;
    }

    /**
     * 是否是外交指令
     */
    isDiplomacy() {
        return this.type >= 15 && this.type <= 19;
    }

    /**
     * 是否是军事指令
     */
    isMilitary() {
        return this.type >= 20 && this.type <= 22;
    }

    /**
     * 是否需要冷却
     */
    needsCooldown() {
        // 开垦、招商、出巡、输送需要1个月冷却
        return [1, 2, 5, 13].includes(this.type);
    }

    /**
     * 获取冷却时间
     */
    getCooldown() {
        return this.needsCooldown() ? 1 : 0;
    }

    /**
     * 获取消耗的体力
     */
    getThewCost() {
        return 4; // 所有指令消耗4点体力
    }

    /**
     * 验证指令是否有效
     */
    validate() {
        const errors = [];

        if (this.executorId < 0) {
            errors.push('未指定执行武将');
        }

        if (this.cityId < 0) {
            errors.push('未指定所在城市');
        }

        // 外交指令需要目标
        if (this.isDiplomacy() && this.targetId < 0) {
            errors.push('外交指令需要指定目标');
        }

        // 出征指令需要目标城市
        if (this.type === 21 && this.targetCityId < 0) {
            errors.push('出征指令需要指定目标城市');
        }

        // 输送指令需要目标城市
        if (this.type === 13 && this.targetCityId < 0) {
            errors.push('输送指令需要指定目标城市');
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    /**
     * 设置执行中
     */
    setExecuting() {
        this.status = 'executing';
    }

    /**
     * 设置已完成
     */
    setCompleted(result) {
        this.status = 'completed';
        this.result = result;
    }

    /**
     * 设置失败
     */
    setFailed(error) {
        this.status = 'failed';
        this.result = { error };
    }

    /**
     * 是否已完成
     */
    isCompleted() {
        return this.status === 'completed' || this.status === 'failed';
    }

    /**
     * 推进执行时间
     */
    advanceTime(months = 1) {
        this.timeCount += months;
        return this.timeCount >= this.consume;
    }

    /**
     * 转换为JSON
     */
    toJSON() {
        return {
            id: this.id,
            type: this.type,
            executorId: this.executorId,
            cityId: this.cityId,
            targetId: this.targetId,
            targetCityId: this.targetCityId,
            arms: this.arms,
            food: this.food,
            money: this.money,
            consume: this.consume,
            timeCount: this.timeCount,
            status: this.status,
            result: this.result
        };
    }

    /**
     * 从JSON创建
     */
    static fromJSON(json) {
        return new Order(json);
    }

    /**
     * 创建内政指令
     */
    static createInternal(type, executorId, cityId, options = {}) {
        return new Order({
            type,
            executorId,
            cityId,
            ...options
        });
    }

    /**
     * 创建外交指令
     */
    static createDiplomacy(type, executorId, cityId, targetId, options = {}) {
        return new Order({
            type,
            executorId,
            cityId,
            targetId,
            ...options
        });
    }

    /**
     * 创建军事指令
     */
    static createMilitary(type, executorId, cityId, options = {}) {
        return new Order({
            type,
            executorId,
            cityId,
            ...options
        });
    }
}
