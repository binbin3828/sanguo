/**
 * 流放指令
 * 释放俘虏，使其成为在野武将
 */

export class BanishCommand {
    constructor(internalAffairsSystem) {
        this.system = internalAffairsSystem;
    }

    async execute(order, person, city) {
        const targetId = order.targetId;
        if (!targetId) {
            return {
                success: false,
                message: '未选择流放目标'
            };
        }

        const target = this.system.personRepository.getById(targetId);
        if (!target) {
            return {
                success: false,
                message: '目标武将不存在'
            };
        }

        // 改变归属为在野
        target.changeBelong(0);
        target.devotion = 0;

        return {
            success: true,
            message: `${target.name} 已被流放，成为在野武将。`,
            data: {
                targetId: target.id,
                targetName: target.name
            }
        };
    }
}
