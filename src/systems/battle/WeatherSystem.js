/**
 * 天气系统
 * 管理战斗中的天气变化
 */

import { WEATHER_TYPES, WEATHER_NAMES } from '../../utils/Constants.js';

export class WeatherSystem {
    constructor(eventBus, randomUtil) {
        this.eventBus = eventBus;
        this.randomUtil = randomUtil;
        this.currentWeather = WEATHER_TYPES.SUNNY;
    }

    /**
     * 获取随机天气
     */
    getRandomWeather() {
        // 晴天概率最高
        const weights = [40, 25, 15, 15, 5]; // 晴、阴、风、雨、冰雹
        const totalWeight = weights.reduce((a, b) => a + b, 0);
        let random = Math.random() * totalWeight;

        for (let i = 0; i < weights.length; i++) {
            random -= weights[i];
            if (random <= 0) {
                return i + 1; // 天气类型从1开始
            }
        }

        return WEATHER_TYPES.SUNNY;
    }

    /**
     * 改变天气
     */
    changeWeather(currentWeather) {
        // 每回合有20%概率改变天气
        if (Math.random() > 0.2) {
            return currentWeather;
        }

        const newWeather = this.getRandomWeather();

        if (this.eventBus && newWeather !== currentWeather) {
            this.eventBus.emit('weather.changed', {
                oldWeather: currentWeather,
                newWeather,
                oldName: this.getWeatherName(currentWeather),
                newName: this.getWeatherName(newWeather)
            });
        }

        return newWeather;
    }

    /**
     * 获取天气名称
     */
    getWeatherName(weather) {
        return WEATHER_NAMES[weather - 1] || '未知';
    }

    /**
     * 获取当前天气
     */
    getCurrentWeather() {
        return this.currentWeather;
    }

    /**
     * 设置天气
     */
    setWeather(weather) {
        const oldWeather = this.currentWeather;
        this.currentWeather = weather;

        if (this.eventBus) {
            this.eventBus.emit('weather.set', {
                oldWeather,
                newWeather: weather,
                name: this.getWeatherName(weather)
            });
        }
    }

    /**
     * 获取天气对技能的影响
     */
    getWeatherEffect(weather, skillType) {
        const effects = {
            // 火系技能
            fire: {
                [WEATHER_TYPES.SUNNY]: 1.0,
                [WEATHER_TYPES.CLOUDY]: 1.1,
                [WEATHER_TYPES.WINDY]: 1.3,
                [WEATHER_TYPES.RAINY]: 0.5,
                [WEATHER_TYPES.HAIL]: 0.8
            },
            // 水系技能
            water: {
                [WEATHER_TYPES.SUNNY]: 1.0,
                [WEATHER_TYPES.CLOUDY]: 1.1,
                [WEATHER_TYPES.WINDY]: 0.8,
                [WEATHER_TYPES.RAINY]: 1.3,
                [WEATHER_TYPES.HAIL]: 1.2
            },
            // 其他技能
            other: {
                [WEATHER_TYPES.SUNNY]: 1.0,
                [WEATHER_TYPES.CLOUDY]: 1.0,
                [WEATHER_TYPES.WINDY]: 1.0,
                [WEATHER_TYPES.RAINY]: 1.0,
                [WEATHER_TYPES.HAIL]: 0.9
            }
        };

        const skillEffects = effects[skillType] || effects.other;
        return skillEffects[weather] || 1.0;
    }

    /**
     * 检查天气是否影响技能
     */
    isSkillAffectedByWeather(skill, weather) {
        // 检查技能是否有天气限制
        if (skill.effect?.weather) {
            return skill.effect.weather[weather - 1] !== 100;
        }
        return false;
    }
}
