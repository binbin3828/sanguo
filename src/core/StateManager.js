/**
 * 状态管理系统
 * 管理游戏所有状态，支持订阅通知和快照存档
 */

export class StateManager {
    constructor(eventBus) {
        this.eventBus = eventBus;
        this.state = this.getInitialState();
        this.subscribers = new Map();
        this.history = [];
        this.historyIndex = -1;
        this.maxHistorySize = 50;
    }

    /**
     * 获取初始状态
     */
    getInitialState() {
        return {
            // 基础状态
            playerKing: -1,              // 玩家扮演君主ID
            yearDate: 190,               // 年份
            monthDate: 1,                // 月份 (1-12)
            
            // 游戏设置
            lookEnemy: false,            // 观看敌人行动
            lookMovie: true,             // 观看动画
            moveSpeed: false,            // 移动速度
            
            // 武将数据
            persons: [],                 // 所有武将 [2000]
            personsQueue: [],            // 武将队列 [2000]
            
            // 城市数据
            cities: [],                  // 所有城市 [38]
            
            // 道具数据
            goodsQueue: [],              // 道具队列 [2000]
            
            // 战斗数据
            fightersIdx: [],             // 战斗将领索引 [30]
            fighters: [],                // 战斗数据 [30]
            orderQueue: [],              // 指令队列 [200]
            
            // 战斗运行时数据
            fightMap: [],                // 战斗地图数据
            fightMapData: [],            // 地图原始数据
            fightPath: [],               // 行军路径
            fgtAtkRng: [],               // 攻击范围
            genPos: [],                  // 将领位置 [20]
            genAtt: [],                  // 战斗属性 [2]
            fgtParam: null,              // 战斗参数
            fgtOver: 0,                  // 战斗结束标志
            fgtBoutCnt: 0,               // 战斗回合数
            fgtWeather: 1,               // 天气 (1-5)
            
            // 游戏状态
            isPaused: false,             // 是否暂停
            isGameOver: false,           // 游戏是否结束
            winner: null,                // 胜利者
            
            // 随机种子（用于存档重现）
            randomSeed: Date.now()
        };
    }

    /**
     * 获取当前状态
     */
    getState() {
        return this.state;
    }

    /**
     * 获取特定路径的状态值
     * @param {string} path - 状态路径，如 'playerKing' 或 'cities.0.name'
     */
    get(path) {
        const keys = path.split('.');
        let value = this.state;
        
        for (const key of keys) {
            if (value === null || value === undefined) {
                return undefined;
            }
            value = value[key];
        }
        
        return value;
    }

    /**
     * 更新状态
     * @param {string|object} pathOrUpdates - 状态路径或更新对象
     * @param {any} value - 新值（当pathOrUpdates为字符串时使用）
     */
    set(pathOrUpdates, value) {
        if (typeof pathOrUpdates === 'string') {
            // 单路径更新
            this._setValue(pathOrUpdates, value);
        } else if (typeof pathOrUpdates === 'object') {
            // 批量更新
            Object.entries(pathOrUpdates).forEach(([path, val]) => {
                this._setValue(path, val);
            });
        }
        
        // 触发状态变更事件
        this._notifySubscribers();
    }

    /**
     * 内部方法：设置值
     */
    _setValue(path, value) {
        const keys = path.split('.');
        let target = this.state;
        
        // 遍历到倒数第二个键
        for (let i = 0; i < keys.length - 1; i++) {
            const key = keys[i];
            if (!(key in target)) {
                target[key] = {};
            }
            target = target[key];
        }
        
        // 设置最终值
        const lastKey = keys[keys.length - 1];
        const oldValue = target[lastKey];
        target[lastKey] = value;
        
        // 记录历史
        this._addToHistory({
            path,
            oldValue,
            newValue: value,
            timestamp: Date.now()
        });
        
        // 发布特定路径的变更事件
        if (this.eventBus) {
            this.eventBus.emit(`state.change.${path}`, value, oldValue);
        }
    }

    /**
     * 订阅状态变化
     * @param {string} path - 状态路径（可选，不指定则监听所有变化）
     * @param {Function} callback - 回调函数
     */
    subscribe(path, callback) {
        if (typeof path === 'function') {
            // 如果没有提供path，path就是callback
            callback = path;
            path = '*';
        }

        if (!this.subscribers.has(path)) {
            this.subscribers.set(path, new Set());
        }

        this.subscribers.get(path).add(callback);

        // 返回取消订阅的函数
        return () => this.unsubscribe(path, callback);
    }

    /**
     * 取消订阅
     */
    unsubscribe(path, callback) {
        if (typeof path === 'function') {
            callback = path;
            path = '*';
        }

        if (this.subscribers.has(path)) {
            this.subscribers.get(path).delete(callback);
        }
    }

    /**
     * 通知所有订阅者
     */
    _notifySubscribers() {
        const state = this.state;

        // 通知特定路径的订阅者
        this.subscribers.forEach((callbacks, path) => {
            if (path === '*') {
                // 监听所有变化的订阅者
                callbacks.forEach(cb => {
                    try {
                        cb(state);
                    } catch (error) {
                        console.error('状态订阅者出错:', error);
                    }
                });
            }
        });

        // 发布全局状态变更事件
        if (this.eventBus) {
            this.eventBus.emit('state.changed', state);
        }
    }

    /**
     * 添加到历史记录
     */
    _addToHistory(change) {
        // 如果当前不是最新的历史记录，删除后面的记录
        if (this.historyIndex < this.history.length - 1) {
            this.history = this.history.slice(0, this.historyIndex + 1);
        }

        this.history.push(change);
        this.historyIndex++;

        // 限制历史记录大小
        if (this.history.length > this.maxHistorySize) {
            this.history.shift();
            this.historyIndex--;
        }
    }

    /**
     * 撤销上一次状态变更
     */
    undo() {
        if (this.historyIndex >= 0) {
            const change = this.history[this.historyIndex];
            this._setValue(change.path, change.oldValue);
            this.historyIndex--;
            
            if (this.eventBus) {
                this.eventBus.emit('state.undo', change);
            }
            
            return true;
        }
        return false;
    }

    /**
     * 重做上一次撤销的操作
     */
    redo() {
        if (this.historyIndex < this.history.length - 1) {
            this.historyIndex++;
            const change = this.history[this.historyIndex];
            this._setValue(change.path, change.newValue);
            
            if (this.eventBus) {
                this.eventBus.emit('state.redo', change);
            }
            
            return true;
        }
        return false;
    }

    /**
     * 创建状态快照（用于存档）
     */
    createSnapshot() {
        return {
            version: '1.0',
            timestamp: Date.now(),
            state: JSON.parse(JSON.stringify(this.state))
        };
    }

    /**
     * 从快照恢复状态（用于读档）
     */
    restoreSnapshot(snapshot) {
        if (!snapshot || !snapshot.state) {
            throw new Error('无效的快照数据');
        }

        // 深度克隆状态
        this.state = JSON.parse(JSON.stringify(snapshot.state));
        
        // 清除历史记录
        this.history = [];
        this.historyIndex = -1;

        // 通知订阅者
        this._notifySubscribers();

        if (this.eventBus) {
            this.eventBus.emit('state.restored', snapshot);
        }
    }

    /**
     * 重置状态到初始值
     */
    reset() {
        this.state = this.getInitialState();
        this.history = [];
        this.historyIndex = -1;
        this._notifySubscribers();

        if (this.eventBus) {
            this.eventBus.emit('state.reset');
        }
    }

    /**
     * 批量更新状态（不触发中间通知）
     */
    batchUpdate(updates) {
        Object.entries(updates).forEach(([path, value]) => {
            const keys = path.split('.');
            let target = this.state;
            
            for (let i = 0; i < keys.length - 1; i++) {
                const key = keys[i];
                if (!(key in target)) {
                    target[key] = {};
                }
                target = target[key];
            }
            
            target[keys[keys.length - 1]] = value;
        });

        this._notifySubscribers();
    }
}
