/**
 * 移动指令
 * 调动武将到指定城市
 */

export class MoveCommand {
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

        // 检查目标城市归属
        if (targetCity.belong !== 0 && targetCity.belong !== person.belong) {
            return {
                success: false,
                message: '不能移动到敌方城市'
            };
        }

        // 移动武将
        this.system.personRepository.moveToCity(order.executorId, targetCityId);

        // 如果目标城市无归属，设置为该武将所属势力
        if (targetCity.belong === 0) {
            targetCity.setBelong(person.belong);
        }

        return {
            success: true,
            message: `${person.name} 已移动至 ${targetCity.name}`,
            data: {
                personId: person.id,
                personName: person.name,
                fromCityId: city.id,
                fromCityName: city.name,
                toCityId: targetCityId,
                toCityName: targetCity.name
            }
        };
    }
}
