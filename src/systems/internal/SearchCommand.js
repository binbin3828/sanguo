/**
 * 搜寻指令
 * 在城中搜索人才或道具
 */

export class SearchCommand {
    constructor(internalAffairsSystem) {
        this.system = internalAffairsSystem;
        this.randomUtil = internalAffairsSystem.system?.randomUtil;
    }

    async execute(order, person, city) {
        // 随机选择事件类型
        const eventType = Math.random();
        
        // 一无所获 25%
        if (eventType < 0.25) {
            return {
                success: true,
                message: '搜寻了一整天，一无所获。',
                data: { type: 'nothing' }
            };
        }
        
        // 发现人才或道具 25%
        if (eventType < 0.50) {
            return await this.searchForPersonOrTool(order, person, city);
        }
        
        // 获得金钱 25%
        if (eventType < 0.75) {
            const money = Math.floor(10 + Math.random() * (person.iq * 2));
            city.addMoney(money);
            
            return {
                success: true,
                message: `在城中发现了 ${money} 金钱！`,
                data: { type: 'money', amount: money }
            };
        }
        
        // 获得粮食 25%
        const food = Math.floor(10 + Math.random() * (person.iq * 2));
        city.addFood(food);
        
        return {
            success: true,
            message: `在城中发现了 ${food} 粮食！`,
            data: { type: 'food', amount: food }
        };
    }

    async searchForPersonOrTool(order, person, city) {
        // TODO: 实现搜索人才或道具的逻辑
        // 这里简化处理，50%人才50%道具
        
        if (Math.random() < 0.5) {
            // 搜索人才
            const successRate = person.iq / 150;
            
            if (Math.random() < successRate) {
                return {
                    success: true,
                    message: '听说城中有位贤者，臣已访到！',
                    data: { type: 'person', personId: null } // TODO: 返回实际找到的人才
                };
            } else {
                return {
                    success: true,
                    message: '听说城中有位贤者，可惜臣未能访到。',
                    data: { type: 'person_not_found' }
                };
            }
        } else {
            // 搜索道具
            return {
                success: true,
                message: '在城中找到了一些有用的物品！',
                data: { type: 'tool', toolId: null } // TODO: 返回实际找到的道具
            };
        }
    }
}
