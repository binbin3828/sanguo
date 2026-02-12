/**
 * 赏赐指令
 * 赏赐武将，增加其忠诚度
 */

export class LargessCommand {
    constructor(internalAffairsSystem) {
        this.system = internalAffairsSystem;
    }

    async execute(order, person, city) {
        const targetId = order.targetId;
        if (!targetId) {
            return {
                success: false,
                message: '未选择赏赐目标'
            };
        }

        const target = this.system.personRepository.getById(targetId);
        if (!target) {
            return {
                success: false,
                message: '目标武将不存在'
            };
        }

        // 检查资源
        const money = order.money || 0;
        const goodsId = order.goodsId || 0;

        if (money > 0) {
            if (city.money < money) {
                return {
                    success: false,
                    message: '金钱不足'
                };
            }
            city.addMoney(-money);

            // 每100金钱增加1-3点忠诚
            const devotionIncrease = Math.floor(money / 100) * (1 + Math.floor(Math.random() * 3));
            target.increaseDevotion(devotionIncrease);

            return {
                success: true,
                message: `赏赐 ${target.name} ${money} 金钱，忠诚度增加 ${devotionIncrease}，当前为 ${target.devotion}`,
                data: {
                    targetId: target.id,
                    targetName: target.name,
                    money,
                    devotionIncrease,
                    currentDevotion: target.devotion
                }
            };
        }

        if (goodsId > 0) {
            // 道具赏赐
            target.increaseDevotion(10 + Math.floor(Math.random() * 20));

            return {
                success: true,
                message: `赏赐 ${target.name} 道具，忠诚度增加，当前为 ${target.devotion}`,
                data: {
                    targetId: target.id,
                    targetName: target.name,
                    goodsId,
                    currentDevotion: target.devotion
                }
            };
        }

        return {
            success: false,
            message: '未指定赏赐内容'
        };
    }
}
