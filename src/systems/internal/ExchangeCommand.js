/**
 * 交易指令
 * 用粮食换取金钱或反之
 */

export class ExchangeCommand {
    constructor(internalAffairsSystem) {
        this.system = internalAffairsSystem;
    }

    async execute(order, person, city) {
        const type = order.exchangeType; // 'buy' 或 'sell'
        const amount = order.amount;

        if (!type || !amount || amount <= 0) {
            return {
                success: false,
                message: '未指定交易类型或数量'
            };
        }

        // 计算价格
        const rate = this.system.formulaCalculator.calculateExchangeRate(
            city.commerce,
            city.commerceLimit,
            type
        );

        if (type === 'buy') {
            // 买粮：用金钱换粮食
            const cost = amount * rate;
            
            if (city.money < cost) {
                return {
                    success: false,
                    message: `金钱不足（需要 ${cost}，现有 ${city.money}）`
                };
            }

            city.addMoney(-cost);
            city.addFood(amount);

            return {
                success: true,
                message: `花费 ${cost} 金钱购买了 ${amount} 粮食`,
                data: {
                    type: 'buy',
                    amount,
                    cost,
                    rate
                }
            };
        } else {
            // 卖粮：用粮食换金钱
            if (city.food < amount) {
                return {
                    success: false,
                    message: `粮食不足（需要 ${amount}，现有 ${city.food}）`
                };
            }

            const income = Math.floor(amount / rate);
            city.addFood(-amount);
            city.addMoney(income);

            return {
                success: true,
                message: `卖出 ${amount} 粮食获得 ${income} 金钱`,
                data: {
                    type: 'sell',
                    amount,
                    income,
                    rate
                }
            };
        }
    }
}
