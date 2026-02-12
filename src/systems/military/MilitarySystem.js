/**
 * 军事系统框架
 * 管理所有军事指令的执行
 */

import { Order } from '../models/Order.js';

export class MilitarySystem {
    constructor(eventBus, cityRepository, personRepository, 
                formulaCalculator, validator, battleSystem) {
        this.eventBus = eventBus;
        this.cityRepository = cityRepository;
        this.personRepository = personRepository;
        this.formulaCalculator = formulaCalculator;
        this.validator = validator;
        this.battleSystem = battleSystem;
        
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
     * 执行军事指令
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

            if (this.eventBus) {
                this.eventBus.emit('military.orderExecuted', {
                    order,
                    person,
                    city,
                    result
                });
            }

            return result;
        } catch (error) {
            console.error('军事指令执行失败:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * 获取可用的军事指令列表
     */
    getAvailableCommands(person, city) {
        const commands = [];
        const militaryCommands = [20, 21, 22]; // 征兵、出征、调兵

        // 检查每个指令是否可用
        militaryCommands.forEach(type => {
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
        switch (type) {
            case 20: // 征兵
                if (city.mothballArms <= 0) {
                    return { available: false, reason: '没有后备兵力' };
                }
                if (city.peopleDevotion < 30) {
                    return { available: false, reason: '民忠太低' };
                }
                break;

            case 21: // 出征
                // 需要有可出征的武将
                const availablePersons = this.personRepository.getByBelong(person.belong)
                    .filter(p => p.cityId === city.id && p.arms > 0 && p.thew >= 20);
                if (availablePersons.length === 0) {
                    return { available: false, reason: '没有可出征的武将' };
                }
                break;

            case 22: // 调兵
                // 需要有其他己方城市
                const myCities = this.cityRepository.getByBelong(person.belong);
                if (myCities.length < 2) {
                    return { available: false, reason: '没有其他城市可调兵' };
                }
                break;
        }

        return { available: true };
    }

    /**
     * 初始化战斗
     */
    async initBattle(attackerPersons, defenderPersons, attackerCity, defenderCity, mode) {
        return await this.battleSystem.initBattle({
            attackerPersons,
            defenderPersons,
            attackerCity,
            defenderCity,
            mode
        });
    }
}
