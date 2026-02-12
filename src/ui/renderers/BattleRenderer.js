/**
 * 战斗渲染器
 * 负责渲染战斗场景
 */

import { UnitRenderer } from './UnitRenderer.js';

export class BattleRenderer {
    constructor(ctx) {
        this.ctx = ctx;
        this.unitRenderer = new UnitRenderer(ctx);
        this.offsetX = 100;
        this.offsetY = 100;
    }

    /**
     * 渲染战斗场景
     */
    renderBattle(battle, selectedUnit = null) {
        // 清空画布
        this.ctx.fillStyle = '#1a3d1a';
        this.ctx.fillRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);

        // 渲染地图
        this.renderMap(battle.map);

        // 渲染单位
        this.renderUnits(battle.units, selectedUnit);

        // 渲染UI信息
        this.renderBattleInfo(battle);
    }

    /**
     * 渲染战斗地图
     */
    renderMap(map) {
        if (!map) return;

        const cellSize = 40;

        // 绘制网格
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        this.ctx.lineWidth = 1;

        for (let y = 0; y < map.length; y++) {
            for (let x = 0; x < map[y].length; x++) {
                const cellX = this.offsetX + x * cellSize;
                const cellY = this.offsetY + y * cellSize;

                // 绘制地形
                this.renderTerrain(map[y][x], cellX, cellY, cellSize);

                // 绘制网格线
                this.ctx.strokeRect(cellX, cellY, cellSize, cellSize);
            }
        }
    }

    /**
     * 渲染地形
     */
    renderTerrain(terrainType, x, y, size) {
        const terrainColors = [
            '#2d5a27', // 草地
            '#4a7c45', // 平原
            '#6b6b6b', // 山地
            '#1a4a1a', // 森林
            '#8b7355', // 村庄
            '#8b4513', // 城池
            '#5a4a3a', // 营寨
            '#1a3d5c'  // 河流
        ];

        const color = terrainColors[terrainType] || terrainColors[0];
        this.ctx.fillStyle = color;
        this.ctx.fillRect(x, y, size, size);
    }

    /**
     * 渲染单位
     */
    renderUnits(units, selectedUnit) {
        if (!units) return;

        units.forEach(unit => {
            if (!unit.active) return;

            // 渲染单位
            this.unitRenderer.renderUnit(unit, this.offsetX, this.offsetY);

            // 如果是选中单位，渲染选中效果
            if (selectedUnit && selectedUnit.id === unit.id) {
                this.unitRenderer.renderSelection(unit, this.offsetX, this.offsetY);
            }
        });
    }

    /**
     * 渲染战斗信息
     */
    renderBattleInfo(battle) {
        const x = this.ctx.canvas.width - 300;
        const y = 50;

        // 信息面板背景
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(x, y, 280, 150);

        // 标题
        this.ctx.fillStyle = '#ffd700';
        this.ctx.font = 'bold 18px Microsoft YaHei';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(`第 ${battle.turn || 1} 回合`, x + 140, y + 30);

        // 当前回合方
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '14px Microsoft YaHei';
        const sideText = battle.currentSide === 'attacker' ? '进攻方回合' : '防守方回合';
        this.ctx.fillText(sideText, x + 140, y + 60);

        // 天气
        const weatherNames = ['晴', '阴', '风', '雨', '冰雹'];
        this.ctx.fillText(`天气: ${weatherNames[battle.weather - 1] || '晴'}`, x + 140, y + 90);

        // 剩余单位数
        const attackerCount = Array.from(battle.units.values()).filter(u => u.side === 'attacker' && u.active).length;
        const defenderCount = Array.from(battle.units.values()).filter(u => u.side === 'defender' && u.active).length;
        
        this.ctx.fillStyle = '#4444ff';
        this.ctx.fillText(`进攻方: ${attackerCount}人`, x + 70, y + 120);
        
        this.ctx.fillStyle = '#ff4444';
        this.ctx.fillText(`防守方: ${defenderCount}人`, x + 210, y + 120);
    }

    /**
     * 渲染可移动区域
     */
    renderMoveableArea(cells) {
        this.unitRenderer.renderMoveableArea(cells, this.offsetX, this.offsetY);
    }

    /**
     * 渲染攻击范围
     */
    renderAttackRange(cells) {
        this.unitRenderer.renderAttackRange(cells, this.offsetX, this.offsetY);
    }
}
