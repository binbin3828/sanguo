/**
 * 劝降指令
 * 劝说敌方君主带领所有城市归降
 */

export class InduceCommand {
    constructor(diplomacySystem) {
        this.system = diplomacySystem;
    }

    async execute(order, executor, target) {
        // 检查目标是否为君主
        if (!target.isKingCheck()) {
            return {
                success: false,
                message: '目标不是君主，无法劝降'
            };
        }

        // 获取双方城池数量
        const myCities = this.system.cityRepository.getByBelong(executor.belong);
        const targetCities = this.system.cityRepository.getByBelong(target.belong);

        // 检查城池数量条件
        if (myCities.length < targetCities.length * 2) {
            return {
                success: false,
                message: '我方城池数量不足（需要至少' + (targetCities.length * 2) + '座）'
            };
        }

        // 计算成功率
        const successRate = this.system.formulaCalculator.calculateInduceRate(
            executor, target, myCities.length, targetCities.length
        );

        // 判定智力
        const baseRate = executor.iq - target.iq + 50;
        const roll1 = Math.random() * 100;
        if (roll1 > baseRate) {
            const failDialog = this.system.dialogSystem.getInduceDialog(false);
            return {
                success: false,
                message: target.name + '："' + failDialog + '"',
                data: {
                    targetId: target.id,
                    targetName: target.name,
                    reason: '智力判定失败'
                }
            };
        }

        // 判定性格
        const characterMods = [10, 1, 20, 5, 15]; // 冒进、狂人、奸诈、大义、和平
        const roll2 = Math.random() * 100;
        if (roll2 > characterMods[target.character]) {
            const failDialog = this.system.dialogSystem.getInduceDialog(false);
            return {
                success: false,
                message: target.name + '："' + failDialog + '"',
                data: {
                    targetId: target.id,
                    targetName: target.name,
                    reason: '性格抵抗'
                }
            };
        }

        // 劝降成功
        // 1. 改变所有城市归属
        targetCities.forEach(city => {
            city.setBelong(executor.belong);

            // 城中武将归属改变
            const cityPersons = this.system.personRepository.getByCity(city.id);
            cityPersons.forEach(person => {
                person.changeBelong(executor.belong);
            });
        });

        // 2. 处理不在城中的人员
        const targetKingId = target.belong;
        const allPersons = this.system.personRepository.getAll();
        allPersons.forEach(person => {
            if (person.belong === targetKingId) {
                if (person.id === target.id) {
                    // 君主本人归降
                    person.changeBelong(executor.belong);
                } else {
                    // 其他人员变为在野
                    person.changeBelong(0);
                }
            }
        });

        // 获取成功对话
        const successDialog = this.system.dialogSystem.getInduceDialog(true);

        return {
            success: true,
            message: target.name + '势力归降！' + target.name + '："' + successDialog + '"',
            data: {
                targetId: target.id,
                targetName: target.name,
                citiesCount: targetCities.length,
                affectedPersons: allPersons.filter(p => p.belong === executor.belong).length
            }
        };
    }
}
