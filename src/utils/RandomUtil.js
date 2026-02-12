/**
 * 随机数工具
 * 实现可种子的随机数生成器，用于战斗重现
 */

export class RandomUtil {
    constructor(seed = null) {
        this.seed = seed !== null ? seed : Date.now();
        this.initialSeed = this.seed;
    }

    /**
     * 设置随机种子
     */
    setSeed(seed) {
        this.seed = seed;
        this.initialSeed = seed;
    }

    /**
     * 获取当前种子
     */
    getSeed() {
        return this.seed;
    }

    /**
     * 重置随机数生成器
     */
    reset() {
        this.seed = this.initialSeed;
    }

    /**
     * 生成下一个随机数 (0-1)
     * 使用线性同余生成器 (LCG)
     */
    next() {
        // LCG 参数
        const a = 1664525;
        const c = 1013904223;
        const m = 4294967296; // 2^32

        this.seed = (a * this.seed + c) % m;
        return this.seed / m;
    }

    /**
     * 生成指定范围内的随机整数 [min, max]
     */
    nextInt(min, max) {
        if (min > max) {
            [min, max] = [max, min];
        }
        return Math.floor(this.next() * (max - min + 1)) + min;
    }

    /**
     * 生成指定范围内的随机浮点数 [min, max)
     */
    nextFloat(min, max) {
        return this.next() * (max - min) + min;
    }

    /**
     * 生成符合高斯分布的随机数
     */
    nextGaussian(mean = 0, stdDev = 1) {
        // Box-Muller 变换
        let u = 0, v = 0;
        while (u === 0) u = this.next();
        while (v === 0) v = this.next();
        
        const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
        return z * stdDev + mean;
    }

    /**
     * 概率判定
     * @param {number} probability - 概率 (0-100)
     * @returns {boolean} 是否成功
     */
    chance(probability) {
        return this.next() * 100 < probability;
    }

    /**
     * 从数组中随机选择一个元素
     */
    choice(array) {
        if (!array || array.length === 0) {
            return null;
        }
        const index = this.nextInt(0, array.length - 1);
        return array[index];
    }

    /**
     * 从数组中随机选择多个元素（不重复）
     */
    choices(array, count) {
        if (!array || array.length === 0 || count <= 0) {
            return [];
        }
        
        count = Math.min(count, array.length);
        const shuffled = this.shuffle([...array]);
        return shuffled.slice(0, count);
    }

    /**
     * 随机打乱数组（Fisher-Yates 算法）
     */
    shuffle(array) {
        const result = [...array];
        
        for (let i = result.length - 1; i > 0; i--) {
            const j = this.nextInt(0, i);
            [result[i], result[j]] = [result[j], result[i]];
        }
        
        return result;
    }

    /**
     * 生成随机ID
     */
    generateId(length = 8) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let id = '';
        
        for (let i = 0; i < length; i++) {
            id += chars[this.nextInt(0, chars.length - 1)];
        }
        
        return id;
    }

    /**
     * 生成正态分布的随机数（使用中心极限定理近似）
     */
    nextNormal(mean = 0, stdDev = 1) {
        let sum = 0;
        for (let i = 0; i < 12; i++) {
            sum += this.next();
        }
        return (sum - 6) * stdDev + mean;
    }

    /**
     * 生成布尔值
     */
    nextBoolean() {
        return this.next() < 0.5;
    }

    /**
     * 克隆当前的随机数生成器状态
     */
    clone() {
        const cloned = new RandomUtil(this.initialSeed);
        cloned.seed = this.seed;
        return cloned;
    }
}

// 创建全局随机数生成器实例
export const globalRandom = new RandomUtil();

// 便捷的静态方法
export const Random = {
    /**
     * 生成随机整数 [min, max]
     */
    int: (min, max) => globalRandom.nextInt(min, max),

    /**
     * 生成随机浮点数 [min, max)
     */
    float: (min, max) => globalRandom.nextFloat(min, max),

    /**
     * 概率判定
     */
    chance: (probability) => globalRandom.chance(probability),

    /**
     * 随机选择
     */
    choice: (array) => globalRandom.choice(array),

    /**
     * 随机打乱
     */
    shuffle: (array) => globalRandom.shuffle(array),

    /**
     * 设置种子
     */
    setSeed: (seed) => globalRandom.setSeed(seed),

    /**
     * 重置
     */
    reset: () => globalRandom.reset()
};
