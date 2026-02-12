/**
 * 征兵指令
 * 在城市中招募士兵
 */

export class ConscriptionCommand {
    constructor(militarySystem) {
        this.system = militarySystem;
    }

    async execute(order, person, city) {
        // 计算可征兵数量
        const maxAmount = this.system.formulaCalculator.calculateConscriptionAmount(
            city.peopleDevotion,
            city.mothballArms
        );

        if (maxAmount <= 0) {
            return {
                success: false,
                message: '没有可征召的兵力'
            };
        }

        // 扣除后备兵力
        const actualAmount = Math.min(maxAmount, city.mothballArms);
        city.addMothballArms(-actualAmount);

        // 分配给武将
        person.arms += actualAmount;

        return {
            success: true,
            message: `成功征召 ${actualAmount} 士兵，${person.name} 当前兵力 ${person.arms}`,
            data: {
                amount: actualAmount,
                personId: person.id,
                personName: person.name,
                currentArms: person.arms
            }
        };
    }
}
