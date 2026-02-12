/**
 * 事件总线系统
 * 实现发布-订阅模式，用于模块间通信
 */

export class EventBus {
    constructor() {
        // 存储所有事件监听器
        this.listeners = new Map();
        // 存储一次性监听器
        this.onceListeners = new Map();
    }

    /**
     * 订阅事件
     * @param {string} event - 事件名称
     * @param {Function} callback - 回调函数
     * @returns {Function} 取消订阅的函数
     */
    on(event, callback) {
        if (typeof callback !== 'function') {
            throw new Error('回调必须是函数');
        }

        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }

        this.listeners.get(event).add(callback);

        // 返回取消订阅的函数
        return () => this.off(event, callback);
    }

    /**
     * 一次性订阅事件
     * @param {string} event - 事件名称
     * @param {Function} callback - 回调函数
     * @returns {Function} 取消订阅的函数
     */
    once(event, callback) {
        if (typeof callback !== 'function') {
            throw new Error('回调必须是函数');
        }

        if (!this.onceListeners.has(event)) {
            this.onceListeners.set(event, new Set());
        }

        this.onceListeners.get(event).add(callback);

        return () => this.offOnce(event, callback);
    }

    /**
     * 取消订阅事件
     * @param {string} event - 事件名称
     * @param {Function} callback - 回调函数
     */
    off(event, callback) {
        if (this.listeners.has(event)) {
            this.listeners.get(event).delete(callback);
        }
    }

    /**
     * 取消一次性订阅
     * @param {string} event - 事件名称
     * @param {Function} callback - 回调函数
     */
    offOnce(event, callback) {
        if (this.onceListeners.has(event)) {
            this.onceListeners.get(event).delete(callback);
        }
    }

    /**
     * 发布事件
     * @param {string} event - 事件名称
     * @param {...any} args - 传递给回调函数的参数
     */
    emit(event, ...args) {
        // 触发普通监听器
        if (this.listeners.has(event)) {
            this.listeners.get(event).forEach(callback => {
                try {
                    callback(...args);
                } catch (error) {
                    console.error(`事件 ${event} 处理出错:`, error);
                }
            });
        }

        // 触发一次性监听器
        if (this.onceListeners.has(event)) {
            this.onceListeners.get(event).forEach(callback => {
                try {
                    callback(...args);
                } catch (error) {
                    console.error(`一次性事件 ${event} 处理出错:`, error);
                }
            });
            // 清除已触发的一次性监听器
            this.onceListeners.delete(event);
        }
    }

    /**
     * 获取事件的监听器数量
     * @param {string} event - 事件名称
     * @returns {number} 监听器数量
     */
    listenerCount(event) {
        let count = 0;
        if (this.listeners.has(event)) {
            count += this.listeners.get(event).size;
        }
        if (this.onceListeners.has(event)) {
            count += this.onceListeners.get(event).size;
        }
        return count;
    }

    /**
     * 获取所有已注册的事件名称
     * @returns {string[]} 事件名称列表
     */
    eventNames() {
        const names = new Set([
            ...this.listeners.keys(),
            ...this.onceListeners.keys()
        ]);
        return Array.from(names);
    }

    /**
     * 清除所有监听器
     */
    clear() {
        this.listeners.clear();
        this.onceListeners.clear();
    }

    /**
     * 清除特定事件的所有监听器
     * @param {string} event - 事件名称
     */
    clearEvent(event) {
        this.listeners.delete(event);
        this.onceListeners.delete(event);
    }
}

// 创建全局事件总线实例
export const globalEventBus = new EventBus();
