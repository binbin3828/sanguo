/**
 * 招商指令
 * 增加城市商业开发度
 */

export class BusinessCommand {
    constructor(internalAffairsSystem) {
        this.system = internalAffairsSystem;
    }

    async execute(order, person, city) {
        // 检查是否已达上限
        if (city.commerce >= city.commerceLimit) {
            return {
                success: false,
                message: '商业开发度已达上限'
            };
        }

        // 计算增量
        const increase = this.system.calculateCommerceIncrease(person);
        const actualIncrease = city.increaseCommerce(increase);

        return {
            success: true,
            message: `商业开发度增加 ${actualIncrease}，当前为 ${city.commerce}/${city.commerceLimit}`,
            data: {
                increase: actualIncrease,
                current: city.commerce,
                limit: city.commerceLimit
            }
        };
    }
}
