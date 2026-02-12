/**
 * 出巡指令
 * 增加城市民忠
 */

export class InspectionCommand {
    constructor(internalAffairsSystem) {
        this.system = internalAffairsSystem;
    }

    async execute(order, person, city) {
        // 计算民忠增量
        let increase = 5 + Math.floor(Math.random() * 10);
        
        // 君主身份有额外加成
        if (person.isKingCheck()) {
            increase = Math.floor(increase * 1.5);
        }

        const oldValue = city.peopleDevotion;
        const actualIncrease = city.increaseDevotion(increase);

        if (actualIncrease === 0) {
            return {
                success: true,
                message: '民忠已达上限',
                data: {
                    current: city.peopleDevotion,
                    limit: 100
                }
            };
        }

        return {
            success: true,
            message: `民忠增加 ${actualIncrease}，当前为 ${city.peopleDevotion}`,
            data: {
                increase: actualIncrease,
                current: city.peopleDevotion,
                executorIsKing: person.isKingCheck()
            }
        };
    }
}
