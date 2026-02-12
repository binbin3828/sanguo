/**
 * 灾害系统
 * 处理城市的灾害触发和恢复
 */

import { CITY_STATES, CITY_STATE_NAMES } from '../utils/Constants.js';

export class CalamitySystem {
    constructor(eventBus, cityRepository, randomUtil) {
        this.eventBus = eventBus;
        this.cityRepository = cityRepository;
        this.randomUtil = randomUtil;
    }

    /**
     * 检查所有城市的灾害
     */
    checkAllCalamities() {
        const calamities = [];
        const cities = this.cityRepository.getAll();

        cities.forEach(city => {
            // 跳过已有灾害的城市
            if (city.state !== CITY_STATES.NORMAL) return;

            // 计算灾害概率：100 - 防灾值
            const probability = 100 - city.avoidCalamity;
            
            if (this.randomUtil.chance(probability)) {
                // 随机选择灾害类型 (1-4)
                const calamityType = this.randomUtil.nextInt(1, 4);
                const calamity = this.triggerCalamity(city.id, calamityType);
                
                if (calamity) {
                    calamities.push(calamity);
                }
            }
        });

        if (calamities.length > 0) {
            if (this.eventBus) {
                this.eventBus.emit('calamity.triggered', calamities);
            }
        }

        return calamities;
    }

    /**
     * 触发特定灾害
     */
    triggerCalamity(cityId, calamityType) {
        const city = this.cityRepository.getById(cityId);
        if (!city) return null;

        // 已有灾害的城市不能再触发
        if (city.state !== CITY_STATES.NORMAL) {
            return null;
        }

        city.setCalamity(calamityType);

        const calamity = {
            cityId: city.id,
            cityName: city.name,
            type: calamityType,
            name: CITY_STATE_NAMES[calamityType]
        };

        if (this.eventBus) {
            this.eventBus.emit('calamity.trigger', calamity);
        }

        return calamity;
    }

    /**
     * 恢复城市灾害
     */
    recoverCalamity(cityId) {
        const city = this.cityRepository.getById(cityId);
        if (!city) return false;

        if (city.state === CITY_STATES.NORMAL) {
            return false;
        }

        const oldState = city.state;
        const recovered = city.recoverState();

        if (recovered) {
            // 增加防灾值
            city.increaseAvoidCalamity(5);

            if (this.eventBus) {
                this.eventBus.emit('calamity.recover', {
                    cityId: city.id,
                    cityName: city.name,
                    oldState: oldState,
                    oldStateName: CITY_STATE_NAMES[oldState]
                });
            }
        }

        return recovered;
    }

    /**
     * 获取灾害效果描述
     */
    getCalamityEffect(type) {
        const effects = {
            [CITY_STATES.FAMINE]: {
                name: '饥荒',
                description: '农业收益减半，民忠下降',
                farmingMultiplier: 0.5,
                devotionDecrease: 5
            },
            [CITY_STATES.DROUGHT]: {
                name: '旱灾',
                description: '农业收益减半，粮食产量下降',
                farmingMultiplier: 0.5,
                foodMultiplier: 0.5
            },
            [CITY_STATES.FLOOD]: {
                name: '水灾',
                description: '商业收益减半，民忠下降',
                commerceMultiplier: 0.5,
                devotionDecrease: 3
            },
            [CITY_STATES.RIOT]: {
                name: '暴动',
                description: '无法执行内政指令，资源收益停止',
                disableInternal: true
            }
        };

        return effects[type] || null;
    }

    /**
     * 应用灾害效果（月末调用）
     */
    applyCalamityEffects(city) {
        const effect = this.getCalamityEffect(city.state);
        if (!effect) return null;

        const results = {
            cityId: city.id,
            cityName: city.name,
            effects: []
        };

        // 农业收益减半
        if (effect.farmingMultiplier) {
            results.effects.push({
                type: 'farming',
                multiplier: effect.farmingMultiplier
            });
        }

        // 商业收益减半
        if (effect.commerceMultiplier) {
            results.effects.push({
                type: 'commerce',
                multiplier: effect.commerceMultiplier
            });
        }

        // 民忠下降
        if (effect.devotionDecrease) {
            const oldDevotion = city.peopleDevotion;
            city.decreaseDevotion(effect.devotionDecrease);
            results.effects.push({
                type: 'devotion',
                decrease: oldDevotion - city.peopleDevotion
            });
        }

        return results;
    }

    /**
     * 批量应用所有灾害效果
     */
    applyAllCalamityEffects() {
        const results = [];
        const cities = this.cityRepository.getAll();

        cities.forEach(city => {
            if (city.state !== CITY_STATES.NORMAL) {
                const result = this.applyCalamityEffects(city);
                if (result) {
                    results.push(result);
                }
            }
        });

        return results;
    }

    /**
     * 获取所有有灾害的城市
     */
    getCitiesWithCalamity() {
        return this.cityRepository.getCitiesWithCalamity();
    }

    /**
     * 随机恢复部分灾害（用于自然恢复）
     */
    randomRecovery() {
        const recovered = [];
        const citiesWithCalamity = this.getCitiesWithCalamity();

        citiesWithCalamity.forEach(city => {
            // 20%概率自然恢复
            if (this.randomUtil.chance(20)) {
                if (this.recoverCalamity(city.id)) {
                    recovered.push({
                        cityId: city.id,
                        cityName: city.name
                    });
                }
            }
        });

        return recovered;
    }

    /**
     * 创建状态快照
     */
    createSnapshot() {
        return {
            // 灾害系统不需要额外状态，数据存储在cityRepository中
        };
    }

    /**
     * 从快照恢复
     */
    restoreSnapshot(snapshot) {
        // 灾害状态存储在城市数据中
    }
}
