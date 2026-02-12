/**
 * 宴请指令
 * 宴请武将，恢复其体力
 */

export class TreatCommand {
    constructor(internalAffairsSystem) {
        this.system = internalAffairsSystem;
    }

    async execute(order, person, city) {
        const targetId = order.targetId;
        if (!targetId) {
            return {
                success: false,
                message: '未选择宴请目标'
            };
        }

        const target = this.system.personRepository.getById(targetId);
        if (!target) {
            return {
                success: false,
                message: '目标武将不存在'
            };
        }

        // 检查金钱
        const cost = 100;
        if (city.money < cost) {
            return {
                success: false,
                message: `金钱不足（需要 ${cost}）`
            };
        }

        // 消耗金钱
        city.addMoney(-cost);

        // 恢复体力
        const maxThew = 100;
        const recovery = 50;
        const oldThew = target.thew;
        const actualRecovery = Math.min(recovery, maxThew - target.thew);
        target.recoverThew(actualRecovery);

        return {
            success: true,
            message: `宴请 ${target.name}，体力恢复 ${actualRecovery}，当前为 ${target.thew}`,
            data: {
                targetId: target.id,
                targetName: target.name,
                cost,
                recovery: actualRecovery,
                oldThew,
                newThew: target.thew
            }
        };
    }
}
