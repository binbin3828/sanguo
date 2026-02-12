/**
 * AI外交行为
 * 管理AI势力的外交决策
 */

export class AIDiplomacy {
    constructor(diplomacySystem, randomUtil) {
        this.system = diplomacySystem;
        this.randomUtil = randomUtil;
    }

    /**
     * 执行AI外交回合
     */
    async executeTurn(kingId) {
        const decisions = [];

        // 获取可用武将
        const availablePersons = this.getAvailablePersons(kingId);
        if (availablePersons.length === 0) {
            return decisions;
        }

        // 获取敌方城市
        const enemyCities = this.getEnemyCities(kingId);
        if (enemyCities.length === 0) {
            return decisions;
        }

        // 为每个可用武将分配外交任务
        for (const person of availablePersons) {
            const decision = this.makeDecision(person, enemyCities);
            if (decision) {
                decisions.push(decision);
            }
        }

        return decisions;
    }

    /**
     * 获取可用武将
     */
    getAvailablePersons(kingId) {
        const persons = this.system.personRepository.getByBelong(kingId);
        return persons.filter(person => 
            person.thew >= 4 && 
            person.iq >= 70 // 外交需要一定智力
        );
    }

    /**
     * 获取敌方城市
     */
    getEnemyCities(kingId) {
        const allCities = this.system.cityRepository.getAll();
        return allCities.filter(city => 
            city.belong !== 0 && 
            city.belong !== kingId
        );
    }

    /**
     * 做出外交决策
     */
    makeDecision(person, enemyCities) {
        // 选择目标城市
        const targetCity = this.selectTargetCity(person, enemyCities);
        if (!targetCity) {
            return null;
        }

        // 选择外交类型
        const commandType = this.selectCommandType(person, targetCity);
        if (!commandType) {
            return null;
        }

        // 选择目标武将
        const targetPerson = this.selectTargetPerson(person, targetCity, commandType);
        if (!targetPerson) {
            return null;
        }

        return {
            personId: person.id,
            personName: person.name,
            commandType,
            targetCityId: targetCity.id,
            targetCityName: targetCity.name,
            targetPersonId: targetPerson.id,
            targetPersonName: targetPerson.name
        };
    }

    /**
     * 选择目标城市
     */
    selectTargetCity(person, enemyCities) {
        // 优先选择相邻城市
        const myCities = this.system.cityRepository.getByBelong(person.belong);
        const adjacentCities = [];

        myCities.forEach(myCity => {
            enemyCities.forEach(enemyCity => {
                if (this.system.cityRepository.isConnected(myCity.id, enemyCity.id)) {
                    adjacentCities.push(enemyCity);
                }
            });
        });

        if (adjacentCities.length > 0) {
            return this.randomUtil.choice(adjacentCities);
        }

        // 如果没有相邻城市，随机选择
        return this.randomUtil.choice(enemyCities);
    }

    /**
     * 选择外交类型
     */
    selectCommandType(person, targetCity) {
        // 根据情况选择指令
        const priorities = [];

        // 离间 - 高能力武将中等忠诚度
        priorities.push({ type: 15, weight: 30 }); // 离间

        // 招揽 - 低忠诚度武将
        priorities.push({ type: 16, weight: 25 }); // 招揽

        // 策反 - 如果目标城市太守忠诚度较低
        const satrap = this.system.personRepository.getById(targetCity.satrapId);
        if (satrap && satrap.devotion < 60) {
            priorities.push({ type: 17, weight: 20 }); // 策反
        }

        // 劝降 - 如果我方优势明显
        const myCityCount = this.system.cityRepository.getByBelong(person.belong).length;
        const targetCityCount = this.system.cityRepository.getByBelong(targetCity.belong).length;
        if (myCityCount >= targetCityCount * 2) {
            priorities.push({ type: 19, weight: 10 }); // 劝降
        }

        // 根据权重选择
        const totalWeight = priorities.reduce((sum, p) => sum + p.weight, 0);
        let roll = Math.random() * totalWeight;

        for (const priority of priorities) {
            roll -= priority.weight;
            if (roll <= 0) {
                return priority.type;
            }
        }

        return priorities[0]?.type || 15;
    }

    /**
     * 选择目标武将
     */
    selectTargetPerson(person, targetCity, commandType) {
        const targets = this.system.personRepository.getByCity(targetCity.id);

        if (targets.length === 0) {
            return null;
        }

        switch (commandType) {
            case 15: // 离间
                // 优先选择高能力、中等忠诚度的武将
                return targets
                    .filter(t => t.devotion > 40 && t.devotion < 90)
                    .sort((a, b) => (b.force + b.iq) - (a.force + a.iq))[0] || 
                    this.randomUtil.choice(targets);

            case 16: // 招揽
                // 优先选择低忠诚度的武将
                return targets
                    .filter(t => !t.isKingCheck())
                    .sort((a, b) => a.devotion - b.devotion)[0] || 
                    this.randomUtil.choice(targets.filter(t => !t.isKingCheck()));

            case 17: // 策反
                // 必须是太守
                return targets.find(t => targetCity.satrapId === t.id);

            case 19: // 劝降
                // 必须是君主
                return targets.find(t => t.isKingCheck());

            default:
                return this.randomUtil.choice(targets);
        }
    }

    /**
     * 评估外交成功率
     */
    evaluateSuccessRate(person, target, commandType) {
        let rate = 0;

        switch (commandType) {
            case 15: // 离间
                rate = this.system.formulaCalculator.calculateAlienateRate(person, target);
                break;
            case 16: // 招揽
                rate = this.system.formulaCalculator.calculateCanvassRate(person, target);
                break;
            case 17: // 策反
                rate = this.system.formulaCalculator.calculateCounterespionageRate(person, target);
                break;
            case 19: // 劝降
                const myCities = this.system.cityRepository.getByBelong(person.belong).length;
                const targetCities = this.system.cityRepository.getByBelong(target.belong).length;
                rate = this.system.formulaCalculator.calculateInduceRate(person, target, myCities, targetCities);
                break;
        }

        return rate;
    }
}
