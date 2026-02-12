/**
 * 输送指令
 * 将物资输送到其他城市
 */

export class TransportCommand {
    constructor(internalAffairsSystem) {
        this.system = internalAffairsSystem;
    }

    async execute(order, person, city) {
        const targetCityId = order.targetCityId;
        if (!targetCityId) {
            return {
                success: false,
                message: '未选择目标城市'
            };
        }

        // 检查城市连接
        const connection = this.system.validator.validateCityConnection(city.id, targetCityId);
        if (!connection.valid) {
            return {
                success: false,
                message: connection.error
            };
        }

        const targetCity = this.system.cityRepository.getById(targetCityId);
        if (!targetCity) {
            return {
                success: false,
                message: '目标城市不存在'
            };
        }

        // 检查资源
        const food = order.food || 0;
        const money = order.money || 0;
        const arms = order.arms || 0;

        if (food > 0 && city.food < food) {
            return {
                success: false,
                message: `粮食不足（需要 ${food}）`
            };
        }
        if (money > 0 && city.money < money) {
            return {
                success: false,
                message: `金钱不足（需要 ${money}）`
            };
        }
        if (arms > 0 && city.mothballArms < arms) {
            return {
                success: false,
                message: `后备兵力不足（需要 ${arms}）`
            };
        }

        // 判定是否成功（80%成功率）
        const success = Math.random() < 0.8;

        if (success) {
            // 扣除源城市资源
            if (food > 0) city.addFood(-food);
            if (money > 0) city.addMoney(-money);
            if (arms > 0) city.addMothballArms(-arms);

            // 增加到目标城市
            if (food > 0) targetCity.addFood(food);
            if (money > 0) targetCity.addMoney(money);
            if (arms > 0) targetCity.addMothballArms(arms);

            return {
                success: true,
                message: `物资运送至 ${targetCity.name} 成功！`,
                data: {
                    targetCityId,
                    targetCityName: targetCity.name,
                    food,
                    money,
                    arms,
                    robbed: false
                }
            };
        } else {
            // 被劫
            // 扣除资源但不送达
            if (food > 0) city.addFood(-food);
            if (money > 0) city.addMoney(-money);
            if (arms > 0) city.addMothballArms(-arms);

            const dialog = this.system.dialogSystem.getTransportDialog(true);

            return {
                success: false,
                message: dialog,
                data: {
                    targetCityId,
                    targetCityName: targetCity.name,
                    robbed: true
                }
            };
        }
    }
}
