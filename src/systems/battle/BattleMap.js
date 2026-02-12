/**
 * 战斗地图
 * 管理战斗地图数据和地形信息
 */

import { TERRAIN_TYPES, TERRAIN_NAMES } from '../../utils/Constants.js';

export class BattleMap {
    constructor(width = 15, height = 15) {
        this.width = width;
        this.height = height;
        this.mapData = [];
        this.initMap();
    }

    /**
     * 初始化地图
     */
    initMap() {
        this.mapData = [];
        for (let y = 0; y < this.height; y++) {
            const row = [];
            for (let x = 0; x < this.width; x++) {
                row.push(TERRAIN_TYPES.GRASS);
            }
            this.mapData.push(row);
        }
    }

    /**
     * 加载地图数据
     */
    loadMap(mapData) {
        this.mapData = mapData;
        this.height = mapData.length;
        this.width = mapData[0]?.length || 0;
    }

    /**
     * 获取地形
     */
    getTerrain(x, y) {
        if (!this.isValidPosition(x, y)) {
            return null;
        }
        return this.mapData[y][x];
    }

    /**
     * 设置地形
     */
    setTerrain(x, y, terrain) {
        if (!this.isValidPosition(x, y)) {
            return false;
        }
        this.mapData[y][x] = terrain;
        return true;
    }

    /**
     * 检查位置是否有效
     */
    isValidPosition(x, y) {
        return x >= 0 && x < this.width && y >= 0 && y < this.height;
    }

    /**
     * 获取地形名称
     */
    getTerrainName(x, y) {
        const terrain = this.getTerrain(x, y);
        if (terrain === null) return '无效位置';
        return TERRAIN_NAMES[terrain] || '未知';
    }

    /**
     * 获取单位位置
     */
    getUnitPosition(units, unitId) {
        for (const unit of units.values()) {
            if (unit.id === unitId) {
                return { x: unit.x, y: unit.y };
            }
        }
        return null;
    }

    /**
     * 检查位置是否有单位
     */
    hasUnit(units, x, y) {
        for (const unit of units.values()) {
            if (unit.x === x && unit.y === y && unit.active) {
                return unit;
            }
        }
        return null;
    }

    /**
     * 检查是否是敌方单位
     */
    isEnemyUnit(unit, targetUnit) {
        return unit.side !== targetUnit.side;
    }

    /**
     * 生成随机地图
     */
    generateRandomMap() {
        const terrains = [
            TERRAIN_TYPES.GRASS,    // 草地
            TERRAIN_TYPES.GRASS,
            TERRAIN_TYPES.GRASS,
            TERRAIN_TYPES.PLAIN,    // 平原
            TERRAIN_TYPES.PLAIN,
            TERRAIN_TYPES.MOUNTAIN, // 山地
            TERRAIN_TYPES.FOREST,   // 森林
            TERRAIN_TYPES.FOREST,
            TERRAIN_TYPES.RIVER     // 河流
        ];

        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                // 随机选择地形
                const terrain = terrains[Math.floor(Math.random() * terrains.length)];
                this.setTerrain(x, y, terrain);
            }
        }

        // 在中间放置城池
        const centerX = Math.floor(this.width / 2);
        const centerY = Math.floor(this.height / 2);
        this.setTerrain(centerX, centerY, TERRAIN_TYPES.CITY);

        return this.mapData;
    }

    /**
     * 转换为JSON
     */
    toJSON() {
        return {
            width: this.width,
            height: this.height,
            mapData: this.mapData
        };
    }

    /**
     * 从JSON创建
     */
    static fromJSON(json) {
        const map = new BattleMap(json.width, json.height);
        map.loadMap(json.mapData);
        return map;
    }
}
