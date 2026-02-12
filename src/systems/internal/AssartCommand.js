/**
 * 开垦指令
 * 增加城市农业开发度
 */

export class AssartCommand {
    constructor(internalAffairsSystem) {
        this.system = internalAffairsSystem;
    }

    async execute(order, person, city) {
        // 检查是否已达上限
        if (city.farming >= city.farmingLimit) {
            return {
                success: false,
                message: '农业开发度已达上限'
            };
        }

        // 计算增量
        const increase = this.system.calculateFarmingIncrease(person);
        const actualIncrease = city.increaseFarming(increase);

        return {
            success: true,
            message: `农业开发度增加 ${actualIncrease}，当前为 ${city.farming}/${city.farmingLimit}`,
            data: {
                increase: actualIncrease,
                current: city.farming,
                limit: city.farmingLimit
            }
        };
    }
}
