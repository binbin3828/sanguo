/**
 * 处斩指令
 * 处决俘虏
 */

export class KillCommand {
    constructor(internalAffairsSystem) {
        this.system = internalAffairsSystem;
    }

    async execute(order, person, city) {
        const targetId = order.targetId;
        if (!targetId) {
            return {
                success: false,
                message: '未选择处斩目标'
            };
        }

        const target = this.system.personRepository.getById(targetId);
        if (!target) {
            return {
                success: false,
                message: '目标武将不存在'
            };
        }

        // 不能处斩君主
        if (target.isKingCheck()) {
            return {
                success: false,
                message: '不能处斩君主！'
            };
        }

        // 处斩武将
        // TODO: 从游戏中移除武将
        // 这里简化处理，将在俘虏系统中实现

        return {
            success: true,
            message: `${target.name} 已被处斩！`,
            data: {
                targetId: target.id,
                targetName: target.name
            }
        };
    }
}
