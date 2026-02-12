/**
 * 招揽指令
 * 招募敌方武将
 */

export class CanvassCommand {
    constructor(diplomacySystem) {
        this.system = diplomacySystem;
    }

    async execute(order, executor, target) {
        // 检查目标城市
        const targetCity = this.system.cityRepository.getById(
            this.system.personRepository.getPersonCity(target.id)
        );

        if (!targetCity) {
            return {
                success: false,
                message: '目标武将不在城中'
            };
        }

        // 计算成功率
        const successRate = this.system.formulaCalculator.calculateCanvassRate(executor, target);

        // 判定智力差
        const iqDiff = executor.iq - target.iq;
        const roll1 = Math.random() * 100;
        if (roll1 + 100 > iqDiff + 100) {
            const failDialog = this.system.dialogSystem.getCanvassDialog(false);
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

        // 判定忠诚度
        const roll2 = Math.random() * 100;
        if (roll2 < target.devotion) {
            const failDialog = this.system.dialogSystem.getCanvassDialog(false);
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

        // 判定性格
        const characterMods = [15, 40, 30, 20, 5]; // 卤莽、怕死、贪财、大志、忠义
        const roll3 = Math.random() * 100;
        if (roll3 > characterMods[target.character]) {
            const failDialog = this.system.dialogSystem.getCanvassDialog(false);
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

        // 招揽成功
        // 从原城市移除
        // TODO: 实现从原城市移除武将的逻辑

        // 添加到执行者城市
        const executorCityId = this.system.personRepository.getPersonCity(executor.id);
        this.system.personRepository.moveToCity(target.id, executorCityId);

        // 改变归属
        target.changeBelong(executor.belong);
        target.devotion = 40 + Math.floor(Math.random() * 40);

        // 获取成功对话
        const successDialog = this.system.dialogSystem.getCanvassDialog(true);

        return {
            success: true,
            message: `${target.name}："${successDialog}"`,
            data: {
                targetId: target.id,
                targetName: target.name,
                newDevotion: target.devotion,
                newCity: executorCityId
            }
        };
    }
}
