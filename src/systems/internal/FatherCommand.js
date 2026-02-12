/**
 * 治理指令
 * 恢复城市状态或增加防灾
 */

import { CITY_STATES } from '../../utils/Constants.js';

export class FatherCommand {
    constructor(internalAffairsSystem) {
        this.system = internalAffairsSystem;
    }

    async execute(order, person, city) {
        // 如果城市有灾害，优先恢复状态
        if (city.state !== CITY_STATES.NORMAL) {
            const oldState = city.state;
            const recovered = city.recoverState();
            
            if (recovered) {
                // 增加防灾值
                city.increaseAvoidCalamity(5);
                
                return {
                    success: true,
                    message: `城市状态恢复正常，防灾值增加，当前为 ${city.avoidCalamity}`,
                    data: {
                        oldState,
                        newState: CITY_STATES.NORMAL,
                        avoidCalamity: city.avoidCalamity
                    }
                };
            }
        }

        // 如果没有灾害，增加防灾值
        const oldValue = city.avoidCalamity;
        const increase = 5 + Math.floor(Math.random() * 5);
        const actualIncrease = city.increaseAvoidCalamity(increase);

        if (actualIncrease === 0) {
            return {
                success: true,
                message: '防灾值已达上限',
                data: {
                    current: city.avoidCalamity,
                    limit: 100
                }
            };
        }

        return {
            success: true,
            message: `防灾值增加 ${actualIncrease}，当前为 ${city.avoidCalamity}`,
            data: {
                increase: actualIncrease,
                current: city.avoidCalamity
            }
        };
    }
}
