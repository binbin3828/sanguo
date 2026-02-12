/**
 * 验证器
 * 验证数据合法性和指令可执行性
 */

import { CITY_STATES } from '../utils/Constants.js';

export class Validator {
    constructor(cityRepository, personRepository) {
        this.cityRepository = cityRepository;
        this.personRepository = personRepository;
    }

    /**
     * 验证城市连接
     */
    validateCityConnection(cityId1, cityId2) {
        const city1 = this.cityRepository.getById(cityId1);
        const city2 = this.cityRepository.getById(cityId2);

        if (!city1 || !city2) {
            return { valid: false, error: '城市不存在' };
        }

        const connections = this.cityRepository.getConnections(cityId1);
        if (!connections.includes(cityId2)) {
            return { valid: false, error: `${city1.name} 与 ${city2.name} 不相邻` };
        }

        return { valid: true };
    }

    /**
     * 验证武将归属
     */
    validatePersonBelong(personId, kingId) {
        const person = this.personRepository.getById(personId);
        if (!person) {
            return { valid: false, error: '武将不存在' };
        }

        if (person.belong !== kingId) {
            return { valid: false, error: `${person.name} 不属于该势力` };
        }

        return { valid: true };
    }

    /**
     * 验证资源是否充足
     */
    validateResource(cityId, money = 0, food = 0, arms = 0) {
        const city = this.cityRepository.getById(cityId);
        if (!city) {
            return { valid: false, error: '城市不存在' };
        }

        const errors = [];

        if (money > 0 && city.money < money) {
            errors.push(`金钱不足（需要 ${money}，现有 ${city.money}）`);
        }

        if (food > 0 && city.food < food) {
            errors.push(`粮食不足（需要 ${food}，现有 ${city.food}）`);
        }

        if (arms > 0 && city.mothballArms < arms) {
            errors.push(`后备兵力不足（需要 ${arms}，现有 ${city.mothballArms}）`);
        }

        if (errors.length > 0) {
            return { valid: false, errors };
        }

        return { valid: true };
    }

    /**
     * 验证指令合法性
     */
    validateOrder(order, city, person) {
        const result = order.validate();
        if (!result.valid) {
            return result;
        }

        // 验证城市
        if (!city) {
            return { valid: false, error: '城市不存在' };
        }

        // 验证武将
        if (!person) {
            return { valid: false, error: '武将不存在' };
        }

        // 验证体力
        if (person.thew < order.getThewCost()) {
            return { 
                valid: false, 
                error: `${person.name} 体力不足（需要 ${order.getThewCost()}，现有 ${person.thew}）` 
            };
        }

        // 验证城市状态
        if (city.state === CITY_STATES.RIOT && order.isInternal()) {
            return { valid: false, error: `${city.name} 发生暴动，无法执行内政指令` };
        }

        // 特定指令验证
        switch (order.type) {
            case 1: // 开垦
                if (city.farming >= city.farmingLimit) {
                    return { valid: false, error: '农业开发度已达上限' };
                }
                break;

            case 2: // 招商
                if (city.commerce >= city.commerceLimit) {
                    return { valid: false, error: '商业开发度已达上限' };
                }
                break;

            case 6: // 招降
                // TODO: 验证目标俘虏是否存在
                break;

            case 13: // 输送
                const connection = this.validateCityConnection(order.cityId, order.targetCityId);
                if (!connection.valid) {
                    return connection;
                }
                break;

            case 14: // 移动
                if (order.targetCityId !== undefined) {
                    const targetCity = this.cityRepository.getById(order.targetCityId);
                    if (targetCity && targetCity.belong !== 0 && targetCity.belong !== person.belong) {
                        return { valid: false, error: '不能移动到敌方城市' };
                    }
                }
                break;

            case 21: // 出征
                if (order.targetCityId === undefined) {
                    return { valid: false, error: '出征必须指定目标城市' };
                }
                const targetCity = this.cityRepository.getById(order.targetCityId);
                if (targetCity && targetCity.belong === person.belong) {
                    return { valid: false, error: '不能出征己方城市' };
                }
                break;
        }

        return { valid: true };
    }

    /**
     * 验证出征条件
     */
    validateExpedition(persons, city, targetCity) {
        const errors = [];

        if (!city) {
            return { valid: false, error: '出发城市不存在' };
        }

        if (!targetCity) {
            return { valid: false, error: '目标城市不存在' };
        }

        // 验证城市连接
        const connection = this.validateCityConnection(city.id, targetCity.id);
        if (!connection.valid) {
            return connection;
        }

        // 验证武将
        if (!persons || persons.length === 0) {
            return { valid: false, error: '未选择出征武将' };
        }

        if (persons.length > 10) {
            return { valid: false, error: '最多只能派遣10名武将' };
        }

        // 验证每个武将
        for (const person of persons) {
            if (person.belong !== city.belong) {
                errors.push(`${person.name} 不属于该势力`);
            }
            if (person.arms === 0) {
                errors.push(`${person.name} 没有带兵`);
            }
            if (person.thew < 20) {
                errors.push(`${person.name} 体力不足`);
            }
        }

        if (errors.length > 0) {
            return { valid: false, errors };
        }

        return { valid: true };
    }

    /**
     * 验证外交指令
     */
    validateDiplomacy(order, executor, target) {
        if (!executor) {
            return { valid: false, error: '执行武将不存在' };
        }

        if (!target) {
            return { valid: false, error: '目标武将不存在' };
        }

        // 验证目标不是君主（招揽时）
        if (order.type === 16 && target.isKingCheck()) { // 招揽
            return { valid: false, error: '不能招揽君主' };
        }

        // 验证目标是太守（策反时）
        if (order.type === 17) { // 策反
            // TODO: 验证目标是否为太守
        }

        return { valid: true };
    }

    /**
     * 验证劝降条件
     */
    validateInduce(executor, targetKing, myCityCount, targetCityCount) {
        if (!executor) {
            return { valid: false, error: '执行武将不存在' };
        }

        if (!targetKing) {
            return { valid: false, error: '目标君主不存在' };
        }

        if (myCityCount < targetCityCount * 2) {
            return { 
                valid: false, 
                error: `我方城池数量不足（需要至少 ${targetCityCount * 2} 座，现有 ${myCityCount} 座）` 
            };
        }

        return { valid: true };
    }

    /**
     * 验证交易
     */
    validateExchange(city, type, amount) {
        if (!city) {
            return { valid: false, error: '城市不存在' };
        }

        if (type === 'buy') {
            // 买粮需要金钱
            // TODO: 计算价格
        } else if (type === 'sell') {
            if (city.food < amount) {
                return { 
                    valid: false, 
                    error: `粮食不足（需要 ${amount}，现有 ${city.food}）` 
                };
            }
        }

        return { valid: true };
    }
}
