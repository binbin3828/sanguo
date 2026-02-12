/**
 * 外交系统框架
 * 管理所有外交指令的执行
 */

import { Order } from '../../models/Order.js';

export class DiplomacySystem {
    constructor(eventBus, cityRepository, personRepository, 
                formulaCalculator, dialogSystem, experienceSystem, validator) {
        this.eventBus = eventBus;
        this.cityRepository = cityRepository;
        this.personRepository = personRepository;
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
     * 执行外交指令
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

        // 获取目标武将
        const target = this.personRepository.getById(order.targetId);
        if (!target) {
            return {
                success: false,
                error: '目标武将不存在'
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
            const result = await executor.execute(order, person, target, this);

            // 计算经验
            const exp = this.formulaCalculator.calculateInternalExp(order.type, result.success);
            this.experienceSystem.gainExperience(person, exp, order.getName());

            if (this.eventBus) {
                this.eventBus.emit('diplomacy.orderExecuted', {
                    order,
                    person,
                    target,
                    result
                });
            }

            return result;
        } catch (error) {
            console.error('外交指令执行失败:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * 获取可用的外交指令列表
     */
    getAvailableCommands(person, targetCity) {
        const commands = [];
        const diplomacyCommands = [15, 16, 17, 19]; // 离间、招揽、策反、劝降

        // 检查每个指令是否可用
        diplomacyCommands.forEach(type => {
            const canExecute = this.checkCommandAvailability(type, person, targetCity);
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
    checkCommandAvailability(type, person, targetCity) {
        // 检查体力
        if (person.thew < 4) {
            return { available: false, reason: '体力不足' };
        }

        // 目标城市必须是敌方
        if (targetCity.belong === person.belong) {
            return { available: false, reason: '不能对自己势力执行外交指令' };
        }

        // 检查是否有目标武将
        const targets = this.personRepository.getByCity(targetCity.id);
        if (targets.length === 0) {
            return { available: false, reason: '目标城市没有武将' };
        }

        return { available: true };
    }

    /**
     * 获取可用的目标武将列表
     */
    getAvailableTargets(cityId, commandType, executor) {
        const targets = this.personRepository.getByCity(cityId);
        
        return targets.filter(target => {
            // 排除自己
            if (target.id === executor.id) return false;
            
            // 招揽不能针对君主
            if (commandType === 16 && target.isKingCheck()) return false;
            
            // 策反必须针对太守
            if (commandType === 17) {
                const city = this.cityRepository.getById(cityId);
                if (city.satrapId !== target.id) return false;
            }
            
            // 劝降必须针对君主
            if (commandType === 19 && !target.isKingCheck()) return false;
            
            return true;
        });
    }
}
