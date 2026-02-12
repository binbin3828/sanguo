/**
 * 调兵指令
 * 在城市之间调动兵力
 */

export class TroopMoveCommand {
    constructor(militarySystem) {
        this.system = militarySystem;
    }

    async execute(order, person, city) {
        const targetCityId = order.targetCityId;
        const arms = order.arms || 0;

        if (!targetCityId) {
            return {
                success: false,
                message: '未选择目标城市'
            };
        }

        if (arms <= 0) {
            return {
                success: false,
                message: '未指定调动兵力数量'
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

        // 检查目标城市归属
        if (targetCity.belong !== city.belong) {
            return {
                success: false,
                message: '不能向敌方城市调兵'
            };
        }

        // 检查兵力
        if (city.mothballArms < arms) {
            return {
                success: false,
                message: `后备兵力不足（需要 ${arms}，现有 ${city.mothballArms}）`
            };
        }

        // 转移兵力
        city.addMothballArms(-arms);
        targetCity.addMothballArms(arms);

        return {
            success: true,
            message: `成功调动 ${arms} 兵力至 ${targetCity.name}`,
            data: {
                fromCityId: city.id,
                fromCityName: city.name,
                toCityId: targetCityId,
                toCityName: targetCity.name,
                arms
            }
        };
    }
}
