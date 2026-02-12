/**
 * 指令队列系统
 * 管理待执行指令队列，月末批量执行
 */

import { Order } from '../models/Order.js';

export class OrderQueue {
    constructor(eventBus) {
        this.eventBus = eventBus;
        this.orders = new Map(); // personId -> Order
        this.maxOrders = 200;
        this.cooldowns = new Map(); // personId -> { orderType, remainingMonths }
    }

    /**
     * 添加指令到队列
     */
    addOrder(order) {
        // 验证指令
        const validation = order.validate();
        if (!validation.valid) {
            return {
                success: false,
                error: validation.errors?.[0] || '指令验证失败'
            };
        }

        // 检查队列容量
        if (this.orders.size >= this.maxOrders) {
            return {
                success: false,
                error: '指令队列已满'
            };
        }

        // 检查冷却时间
        if (this.isOnCooldown(order.executorId, order.type)) {
            const cooldown = this.cooldowns.get(order.executorId);
            return {
                success: false,
                error: `该武将需要等待 ${cooldown.remainingMonths} 个月才能再次执行此指令`
            };
        }

        // 检查武将是否已有指令
        if (this.orders.has(order.executorId)) {
            return {
                success: false,
                error: '该武将已有待执行指令'
            };
        }

        // 添加到队列
        this.orders.set(order.executorId, order);

        if (this.eventBus) {
            this.eventBus.emit('order.added', order);
        }

        return { success: true, order };
    }

    /**
     * 移除指令
     */
    removeOrder(personId) {
        const order = this.orders.get(personId);
        if (order) {
            this.orders.delete(personId);

            if (this.eventBus) {
                this.eventBus.emit('order.removed', order);
            }

            return order;
        }
        return null;
    }

    /**
     * 获取武将的待执行指令
     */
    getOrder(personId) {
        return this.orders.get(personId);
    }

    /**
     * 获取所有待执行指令
     */
    getAllOrders() {
        return Array.from(this.orders.values());
    }

    /**
     * 获取某城市的所有指令
     */
    getOrdersByCity(cityId) {
        return this.getAllOrders().filter(order => order.cityId === cityId);
    }

    /**
     * 检查是否处于冷却
     */
    isOnCooldown(personId, orderType) {
        const cooldown = this.cooldowns.get(personId);
        if (cooldown && cooldown.orderType === orderType && cooldown.remainingMonths > 0) {
            return true;
        }
        return false;
    }

    /**
     * 设置冷却
     */
    setCooldown(personId, orderType, months) {
        this.cooldowns.set(personId, {
            orderType,
            remainingMonths: months
        });
    }

    /**
     * 更新冷却时间
     */
    updateCooldowns() {
        this.cooldowns.forEach((cooldown, personId) => {
            cooldown.remainingMonths--;
            if (cooldown.remainingMonths <= 0) {
                this.cooldowns.delete(personId);

                if (this.eventBus) {
                    this.eventBus.emit('order.cooldownEnd', {
                        personId,
                        orderType: cooldown.orderType
                    });
                }
            }
        });
    }

    /**
     * 批量执行指令
     */
    async executeAll(executor) {
        const results = [];
        const orders = this.getAllOrders();

        for (const order of orders) {
            const result = await this.executeOrder(order, executor);
            results.push(result);

            // 设置冷却
            if (result.success && order.needsCooldown()) {
                this.setCooldown(order.executorId, order.type, order.getCooldown());
            }

            // 从队列移除
            this.orders.delete(order.executorId);
        }

        // 更新冷却时间
        this.updateCooldowns();

        if (this.eventBus) {
            this.eventBus.emit('order.batchExecuted', results);
        }

        return results;
    }

    /**
     * 执行单个指令
     */
    async executeOrder(order, executor) {
        try {
            order.setExecuting();

            const result = await executor.execute(order);

            if (result.success) {
                order.setCompleted(result);
            } else {
                order.setFailed(result.error);
            }

            if (this.eventBus) {
                this.eventBus.emit('order.executed', {
                    order,
                    result
                });
            }

            return { success: result.success, order, result };
        } catch (error) {
            order.setFailed(error.message);

            return {
                success: false,
                order,
                error: error.message
            };
        }
    }

    /**
     * 清空队列
     */
    clear() {
        this.orders.clear();
        this.cooldowns.clear();

        if (this.eventBus) {
            this.eventBus.emit('order.cleared');
        }
    }

    /**
     * 创建状态快照
     */
    createSnapshot() {
        return {
            orders: Array.from(this.orders.entries()).map(([personId, order]) => ({
                personId,
                order: order.toJSON()
            })),
            cooldowns: Array.from(this.cooldowns.entries())
        };
    }

    /**
     * 从快照恢复
     */
    restoreSnapshot(snapshot) {
        this.orders.clear();
        this.cooldowns.clear();

        snapshot.orders.forEach(({ personId, order }) => {
            this.orders.set(personId, Order.fromJSON(order));
        });

        snapshot.cooldowns.forEach(([personId, cooldown]) => {
            this.cooldowns.set(personId, cooldown);
        });
    }
}
