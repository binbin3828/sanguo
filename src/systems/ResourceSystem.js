/**
 * 资源管理系统
 * 管理城市资源的自动增长和消耗
 */

export class ResourceSystem {
    constructor(eventBus, cityRepository, personRepository, formulaCalculator) {
        this.eventBus = eventBus;
        this.cityRepository = cityRepository;
        this.personRepository = personRepository;
        this.formulaCalculator = formulaCalculator;
    }

    /**
     * 月末资源结算
     */
    processEndOfMonth() {
        const results = [];
        const cities = this.cityRepository.getAll();

        cities.forEach(city => {
            const result = {
                cityId: city.id,
                cityName: city.name,
                growth: {},
                consumption: {},
                netChange: {}
            };

            // 1. 资源增长
            result.growth = this._calculateGrowth(city);

            // 2. 资源消耗
            result.consumption = this._calculateConsumption(city);

            // 3. 应用变化
            this._applyChanges(city, result.growth, result.consumption);

            // 4. 计算净变化
            result.netChange = {
                food: result.growth.food - result.consumption.food,
                money: result.growth.money - result.consumption.money,
                population: result.growth.population
            };

            results.push(result);
        });

        if (this.eventBus) {
            this.eventBus.emit('resource.endOfMonth', results);
        }

        return results;
    }

    /**
     * 计算资源增长
     */
    _calculateGrowth(city) {
        // 检查是否有灾害影响
        let farmingMultiplier = 1;
        let commerceMultiplier = 1;

        if (city.state === 1 || city.state === 2) { // 饥荒、旱灾
            farmingMultiplier = 0.5;
        }
        if (city.state === 3) { // 水灾
            commerceMultiplier = 0.5;
        }
        if (city.state === 4) { // 暴动
            farmingMultiplier = 0;
            commerceMultiplier = 0;
        }

        // 粮食增长 = 农业/10
        const foodGrowth = Math.floor((city.farming / 10) * farmingMultiplier);

        // 金钱增长 = 商业/10
        const moneyGrowth = Math.floor((city.commerce / 10) * commerceMultiplier);

        // 人口增长 = 当前人口 * 1%
        const popGrowth = Math.floor(city.population * 0.01);

        return {
            food: foodGrowth,
            money: moneyGrowth,
            population: popGrowth
        };
    }

    /**
     * 计算资源消耗
     */
    _calculateConsumption(city) {
        // 粮草消耗 = 后备兵力 / 50
        const foodConsumption = this.formulaCalculator.calculateCityProvenderConsumption(
            city.mothballArms
        );

        return {
            food: foodConsumption,
            money: 0, // 金钱消耗由其他系统处理
            population: 0
        };
    }

    /**
     * 应用资源变化
     */
    _applyChanges(city, growth, consumption) {
        // 应用增长
        city.food = Math.min(city.food + growth.food, 65535);
        city.money = Math.min(city.money + growth.money, 65535);
        city.population = Math.min(city.population + growth.population, city.populationLimit);

        // 应用消耗
        city.food = Math.max(0, city.food - consumption.food);
    }

    /**
     * 年末资源结算
     */
    processEndOfYear() {
        const results = [];
        const cities = this.cityRepository.getAll();

        cities.forEach(city => {
            // 年末特殊处理（如果有的话）
            const result = {
                cityId: city.id,
                cityName: city.name,
                year: 'end'
            };

            results.push(result);
        });

        if (this.eventBus) {
            this.eventBus.emit('resource.endOfYear', results);
        }

        return results;
    }

    /**
     * 检查资源不足的城市
     */
    checkResourceShortage() {
        const shortages = [];
        const cities = this.cityRepository.getAll();

        cities.forEach(city => {
            const shortage = {
                cityId: city.id,
                cityName: city.name,
                foodShortage: false,
                moneyShortage: false
            };

            // 检查粮食是否足够支撑下个月
            const foodConsumption = this.formulaCalculator.calculateCityProvenderConsumption(
                city.mothballArms
            );
            if (city.food < foodConsumption * 3) { // 不足3个月的量
                shortage.foodShortage = true;
            }

            // 检查金钱是否过低
            if (city.money < 100) {
                shortage.moneyShortage = true;
            }

            if (shortage.foodShortage || shortage.moneyShortage) {
                shortages.push(shortage);
            }
        });

        if (shortages.length > 0 && this.eventBus) {
            this.eventBus.emit('resource.shortage', shortages);
        }

        return shortages;
    }

    /**
     * 获取资源统计
     */
    getResourceStatistics() {
        const cities = this.cityRepository.getAll();

        let totalFood = 0;
        let totalMoney = 0;
        let totalPopulation = 0;
        let totalArms = 0;

        cities.forEach(city => {
            totalFood += city.food;
            totalMoney += city.money;
            totalPopulation += city.population;
            totalArms += city.mothballArms;
        });

        return {
            totalFood,
            totalMoney,
            totalPopulation,
            totalArms,
            cityCount: cities.length,
            averageFood: Math.floor(totalFood / cities.length),
            averageMoney: Math.floor(totalMoney / cities.length)
        };
    }

    /**
     * 获取势力资源统计
     */
    getKingdomStatistics(kingId) {
        const cities = this.cityRepository.getByBelong(kingId);

        let totalFood = 0;
        let totalMoney = 0;
        let totalPopulation = 0;
        let totalArms = 0;

        cities.forEach(city => {
            totalFood += city.food;
            totalMoney += city.money;
            totalPopulation += city.population;
            totalArms += city.mothballArms;
        });

        return {
            kingId,
            cityCount: cities.length,
            totalFood,
            totalMoney,
            totalPopulation,
            totalArms
        };
    }

    /**
     * 转移资源
     */
    transferResources(fromCityId, toCityId, resources) {
        const fromCity = this.cityRepository.getById(fromCityId);
        const toCity = this.cityRepository.getById(toCityId);

        if (!fromCity || !toCity) {
            return { success: false, error: '城市不存在' };
        }

        // 检查资源是否充足
        if (resources.food && fromCity.food < resources.food) {
            return { success: false, error: '粮食不足' };
        }
        if (resources.money && fromCity.money < resources.money) {
            return { success: false, error: '金钱不足' };
        }
        if (resources.arms && fromCity.mothballArms < resources.arms) {
            return { success: false, error: '兵力不足' };
        }

        // 扣除资源
        if (resources.food) fromCity.food -= resources.food;
        if (resources.money) fromCity.money -= resources.money;
        if (resources.arms) fromCity.mothballArms -= resources.arms;

        // 增加资源
        if (resources.food) toCity.food = Math.min(toCity.food + resources.food, 65535);
        if (resources.money) toCity.money = Math.min(toCity.money + resources.money, 65535);
        if (resources.arms) toCity.mothballArms = Math.min(toCity.mothballArms + resources.arms, 65535);

        if (this.eventBus) {
            this.eventBus.emit('resource.transferred', {
                fromCityId,
                toCityId,
                resources
            });
        }

        return { success: true };
    }
}
