/**
 * 招降指令
 * 招降俘虏
 */

export class SurrenderCommand {
    constructor(internalAffairsSystem) {
        this.system = internalAffairsSystem;
    }

    async execute(order, person, city) {
        // TODO: 需要俘虏系统支持
        // 这里简化处理

        const targetId = order.targetId;
        if (!targetId) {
            return {
                success: false,
                message: '未选择招降目标'
            };
        }

        const target = this.system.personRepository.getById(targetId);
        if (!target) {
            return {
                success: false,
                message: '目标武将不存在'
            };
        }

        // 计算成功率
        const successRate = this.system.formulaCalculator.calculateSurrenderRate(person, target);

        // 降低目标忠诚度
        target.decreaseDevotion(target.devotion / 10);

        // 判定是否成功
        if (Math.random() * 100 < successRate) {
            // 招降成功
            target.changeBelong(person.belong);
            target.devotion = 40 + Math.floor(Math.random() * 40);

            // 获取对话
            const dialog = this.system.dialogSystem.getSurrenderDialog(true);

            return {
                success: true,
                message: `${target.name} ${dialog}`,
                data: {
                    targetId: target.id,
                    targetName: target.name,
                    newDevotion: target.devotion,
                    success: true
                }
            };
        } else {
            // 招降失败
            const dialog = this.system.dialogSystem.getSurrenderDialog(false, target.devotion);

            return {
                success: false,
                message: dialog,
                data: {
                    targetId: target.id,
                    targetName: target.name,
                    devotionDecrease: target.devotion / 10,
                    success: false
                }
            };
        }
    }
}
