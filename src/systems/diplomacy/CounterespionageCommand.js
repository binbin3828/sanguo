/**
 * 策反指令
 * 策反敌方太守，使其独立
 */

export class CounterespionageCommand {
    constructor(diplomacySystem) {
        this.system = diplomacySystem;
    }

    async execute(order, executor, target) {
        // 检查目标是否为太守
        const targetCity = this.system.cityRepository.getById(
            this.system.personRepository.getPersonCity(target.id)
        );

        if (!targetCity || targetCity.satrapId !== target.id) {
            return {
                success: false,
                message: '目标不是太守，无法策反'
            };
        }

        // 计算成功率
        const successRate = this.system.formulaCalculator.calculateCounterespionageRate(executor, target);

        // 判定智力
        const baseRate = Math.min(executor.iq - target.iq + 50, 100);
        const roll1 = Math.random() * 100;
        if (roll1 > baseRate) {
            const failDialog = this.system.dialogSystem.getCounterespionageDialog(false);
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

        // 判定忠诚度
        const roll2 = Math.random() * 100;
        if (roll2 < target.devotion) {
            const failDialog = this.system.dialogSystem.getCounterespionageDialog(false);
            return {
                success: false,
                message: target.name + '："' + failDialog + '"',
                data: {
                    targetId: target.id,
                    targetName: target.name,
                    devotion: target.devotion,
                    reason: '忠诚度太高'
                }
            };
        }

        // 判定性格
        const characterMods = [30, 10, 20, 60, 5]; // 卤莽、怕死、贪财、大志、忠义
        const roll3 = Math.random() * 100;
        if (roll3 > characterMods[target.character]) {
            const failDialog = this.system.dialogSystem.getCounterespionageDialog(false);
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

        // 策反成功
        // 1. 目标自立为新君主
        target.belong = target.id + 1;
        target.devotion = 100;

        // 2. 改变城市归属
        targetCity.setBelong(target.id + 1);

        // 3. 城中所有武将归属改变
        const cityPersons = this.system.personRepository.getByCity(targetCity.id);
        cityPersons.forEach(person => {
            if (person.id !== target.id) {
                person.changeBelong(target.id + 1);
            }
        });

        // 获取成功对话
        const successDialog = this.system.dialogSystem.getCounterespionageDialog(true);

        return {
            success: true,
            message: target.name + '被策反，成为新君主！' + target.name + '："' + successDialog + '"',
            data: {
                targetId: target.id,
                targetName: target.name,
                cityId: targetCity.id,
                cityName: targetCity.name,
                newKingId: target.id,
                affectedPersons: cityPersons.length
            }
        };
    }
}
