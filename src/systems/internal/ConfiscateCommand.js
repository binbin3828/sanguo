/**
 * 没收指令
 * 没收武将装备或城中道具
 */

export class ConfiscateCommand {
    constructor(internalAffairsSystem) {
        this.system = internalAffairsSystem;
    }

    async execute(order, person, city) {
        // TODO: 实现没收道具逻辑
        // 这里简化处理

        const targetId = order.targetId;
        const slot = order.slot; // 0 或 1

        if (targetId) {
            // 没收武将装备
            const target = this.system.personRepository.getById(targetId);
            if (!target) {
                return {
                    success: false,
                    message: '目标武将不存在'
                };
            }

            // 降低忠诚度
            const penalty = 10 + Math.floor(Math.random() * 10);
            target.decreaseDevotion(penalty);

            // TODO: 转移道具到城中

            // 获取惩罚对话
            const dialog = this.system.dialogSystem.getConfiscatePenaltyDialog();

            return {
                success: true,
                message: `没收了 ${target.name} 的装备。${target.name}："${dialog}"`,
                data: {
                    targetId: target.id,
                    targetName: target.name,
                    devotionPenalty: penalty,
                    currentDevotion: target.devotion
                }
            };
        } else {
            // 没收城中道具
            // TODO: 实现没收城中道具逻辑

            return {
                success: true,
                message: '从城中没收了道具',
                data: {
                    goodsId: order.goodsId
                }
            };
        }
    }
}
