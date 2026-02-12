/**
 * 出征指令
 * 发起战斗进攻敌方城市
 */

export class ExpeditionCommand {
    constructor(militarySystem) {
        this.system = militarySystem;
    }

    async execute(order, person, city) {
        const targetCityId = order.targetCityId;
        if (!targetCityId) {
            return {
                success: false,
                message: '未选择目标城市'
            };
        }

        // 验证出征条件
        const targetCity = this.system.cityRepository.getById(targetCityId);
        if (!targetCity) {
            return {
                success: false,
                message: '目标城市不存在'
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

        // 获取出征武将
        const expeditionPersons = order.personIds?.map(id => 
            this.system.personRepository.getById(id)
        ).filter(p => p && p.belong === person.belong && p.cityId === city.id);

        if (!expeditionPersons || expeditionPersons.length === 0) {
            return {
                success: false,
                message: '未选择出征武将'
            };
        }

        if (expeditionPersons.length > 10) {
            return {
                success: false,
                message: '最多只能派遣10名武将'
            };
        }

        // 获取防守方武将
        const defenderPersons = this.system.personRepository.getByCity(targetCityId)
            .filter(p => p.belong === targetCity.belong && p.arms > 0);

        // 初始化战斗
        const battleResult = await this.system.initBattle(
            expeditionPersons,
            defenderPersons,
            city,
            targetCity,
            'attack'
        );

        return {
            success: true,
            message: `出征队伍已出发，目标：${targetCity.name}`,
            data: {
                targetCityId,
                targetCityName: targetCity.name,
                attackerCount: expeditionPersons.length,
                defenderCount: defenderPersons.length,
                battleId: battleResult.battleId
            }
        };
    }
}
