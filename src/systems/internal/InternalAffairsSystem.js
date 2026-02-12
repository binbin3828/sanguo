/**
 * 内政系统框架
 * 管理所有内政指令的执行
 */

import { Order } from '../models/Order.js';

export class InternalAffairsSystem {
    constructor(eventBus, cityRepository, personRepository, goodsRepository, 
                formulaCalculator, dialogSystem, experienceSystem, validator) {
        this.eventBus = eventBus;
        this.cityRepository = cityRepository;
        this.personRepository = personRepository;
        this.goodsRepository = goodsRepository;
        this.formulaCalculator = formulaCalculator;
        this.dialogSystem = dialogSystem;
        this.experienceSystem = experienceSystem;
        this.validator = validator;
        
        // 指令执行器映射
        this.commandExecutors = new Map();
    }

    /**
     * 注册指令执行器
     */
    registerCommandExecutor(orderType, executor) {
        this.commandExecutors.set(orderType, executor);
    }

    /**
     * 执行内政指令
     */
    async execute(order) {
        // 验证指令
        const validation = this.validator.validateOrder(order);
        if (!validation.valid) {
            return {
                success: false,
                error: validation.error || validation.errors?.[0]
            };
        }

        const person = this.personRepository.getById(order.executorId);
        const city = this.cityRepository.getById(order.cityId);

        if (!person || !city) {
            return {
                success: false,
                error: '武将或城市不存在'
            };
        }

        // 消耗体力
        if (!person.consumeThew(order.getThewCost())) {
            return {
                success: false,
                error: `${person.name} 体力不足`
            };
        }

        // 获取执行器
        const executor = this.commandExecutors.get(order.type);
        if (!executor) {
            return {
                success: false,
                error: `未知的指令类型: ${order.type}`
            };
        }

        try {
            // 执行指令
            const result = await executor.execute(order, person, city, this);

            // 计算经验
            const exp = this.formulaCalculator.calculateInternalExp(order.type, result.success);
            this.experienceSystem.gainExperience(person, exp, order.getName());

            if (this.eventBus) {
                this.eventBus.emit('internal.orderExecuted', {
                    order,
                    person,
                    city,
                    result
                });
            }

            return result;
        } catch (error) {
            console.error('内政指令执行失败:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * 获取可用的内政指令列表
     */
    getAvailableCommands(person, city) {
        const commands = [];
        
        // 基础指令（所有城市都可用）
        const baseCommands = [1, 2, 3, 4, 5]; // 开垦、招商、搜寻、治理、出巡
        
        // 管理指令（需要城中武将）
        const managementCommands = [6, 7, 8, 9, 10]; // 招降、处斩、流放、赏赐、没收
        
        // 其他指令
        const otherCommands = [11, 12, 13, 14]; // 交易、宴请、输送、移动

        // 检查每个指令是否可用
        [...baseCommands, ...managementCommands, ...otherCommands].forEach(type => {
            const canExecute = this.checkCommandAvailability(type, person, city);
            if (canExecute.available) {
                commands.push({
                    type,
                    name: Order.getTypeName(type),
                    ...canExecute
                });
            }
        });

        return commands;
    }

    /**
     * 检查指令是否可用
     */
    checkCommandAvailability(type, person, city) {
        // 检查体力
        if (person.thew < 4) {
            return { available: false, reason: '体力不足' };
        }

        switch (type) {
            case 1: // 开垦
                if (city.farming >= city.farmingLimit) {
                    return { available: false, reason: '农业开发度已达上限' };
                }
                break;

            case 2: // 招商
                if (city.commerce >= city.commerceLimit) {
                    return { available: false, reason: '商业开发度已达上限' };
                }
                break;

            case 6: // 招降
            case 7: // 处斩
            case 8: // 流放
                // TODO: 检查是否有俘虏
                break;

            case 9: // 赏赐
            case 10: // 没收
                // TODO: 检查目标武将
                break;

            case 11: // 交易
                // 需要金钱或粮食
                break;

            case 12: // 宴请
                if (city.money < 100) {
                    return { available: false, reason: '金钱不足（需要100）' };
                }
                break;

            case 13: // 输送
                // 需要目标城市
                break;

            case 14: // 移动
                // 需要目标城市
                break;
        }

        return { available: true };
    }

    /**
     * 获取开垦增量
     */
    calculateFarmingIncrease(person) {
        return this.formulaCalculator.calculateFarmingIncrease(person);
    }

    /**
     * 获取招商增量
     */
    calculateCommerceIncrease(person) {
        return this.formulaCalculator.calculateCommerceIncrease(person);
    }

    /**
     * 获取出巡民忠增量
     */
    calculateInspectionIncrease(person) {
        return this.formulaCalculator.calculateInspectionIncrease(person);
    }
}
