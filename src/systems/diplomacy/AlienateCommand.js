/**
 * 离间指令
 * 降低敌方武将忠诚度
 */

export class AlienateCommand {
    constructor(diplomacySystem) {
        this.system = diplomacySystem;
    }

    async execute(order, executor, target) {
        // 计算成功率
        const successRate = this.system.formulaCalculator.calculateAlienateRate(executor, target);

        // 判定是否成功
        const roll1 = Math.random() * 100;
        if (roll1 > executor.iq - target.iq + 50) {
            // 智力差判定失败
            const failDialog = this.system.dialogSystem.getAlienateDialog(false, target.devotion);
            return {
                success: false,
                message: `${target.name}："${failDialog}"`,
                data: {
                    targetId: target.id,
                    targetName: target.name,
                    reason: '智力差判定失败'
                }
            };
        }

        const roll2 = Math.random() * 100;
        if (roll2 < target.devotion) {
            // 忠诚度判定失败
            const failDialog = this.system.dialogSystem.getAlienateDialog(false, target.devotion);
            return {
                success: false,
                message: `${target.name}："${failDialog}"`,
                data: {
                    targetId: target.id,
                    targetName: target.name,
                    devotion: target.devotion,
                    reason: '忠诚度太高'
                }
            };
        }

        // 性格判定
        const characterMods = [50, 30, 40, 30, 5]; // 卤莽、怕死、贪财、大志、忠义
        const roll3 = Math.random() * 100;
        if (roll3 > characterMods[target.character]) {
            // 性格抵抗成功
            const failDialog = this.system.dialogSystem.getAlienateDialog(false, target.devotion);
            return {
                success: false,
                message: `${target.name}："${failDialog}"`,
                data: {
                    targetId: target.id,
                    targetName: target.name,
                    reason: '性格抵抗'
                }
            };
        }

        // 离间成功
        const oldDevotion = target.devotion;
        target.decreaseDevotion(4);

        // 获取成功对话
        const successDialog = this.system.dialogSystem.getAlienateDialog(true, oldDevotion);

        return {
            success: true,
            message: `${target.name}："${successDialog}"`,
            data: {
                targetId: target.id,
                targetName: target.name,
                oldDevotion,
                newDevotion: target.devotion,
                decrease: oldDevotion - target.devotion
            }
        };
    }
}
