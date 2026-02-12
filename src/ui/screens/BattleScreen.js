/**
 * 战斗界面
 * 战旗式战斗显示
 */

import { Button } from '../components/Button.js';
import { Panel } from '../components/Panel.js';

export class BattleScreen {
    constructor(engine) {
        this.engine = engine;
        this.eventBus = engine.eventBus;
        this.battle = null;
        this.selectedUnit = null;
        this.selectedAction = null;
        
        this._initUI();
    }

    _initUI() {
        // 行动按钮
        this.actionButtons = {
            move: new Button({ x: 50, y: 600, width: 80, height: 35, text: '移动' }),
            attack: new Button({ x: 140, y: 600, width: 80, height: 35, text: '攻击' }),
            skill: new Button({ x: 230, y: 600, width: 80, height: 35, text: '技能' }),
            rest: new Button({ x: 320, y: 600, width: 80, height: 35, text: '休息' })
        };

        // 结束回合按钮
        this.endTurnButton = new Button({
            x: 900, y: 600, width: 100, height: 40,
            text: '结束回合',
            onClick: () => this.onEndTurn()
        });

        // 退出按钮
        this.exitButton = new Button({
            x: 50, y: 50, width: 80, height: 35,
            text: '退出',
            onClick: () => this.onExit()
        });
    }

    setBattle(battle) {
        this.battle = battle;
    }

    onEndTurn() {
        if (this.eventBus) {
            this.eventBus.emit('battle.endTurn');
        }
    }

    onExit() {
        if (this.eventBus) {
            this.eventBus.emit('battle.exit');
            this.eventBus.emit('screen.change', 'StrategyMap');
        }
    }

    render(ctx) {
        // 背景
        ctx.fillStyle = '#1a3d1a';
        ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

        if (!this.battle) return;

        // 绘制战斗地图
        this.renderMap(ctx);

        // 绘制单位
        this.renderUnits(ctx);

        // 绘制UI
        this.renderUI(ctx);
    }

    renderMap(ctx) {
        const cellSize = 40;
        const offsetX = 100;
        const offsetY = 100;

        // 绘制网格
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 1;

        for (let y = 0; y < 15; y++) {
            for (let x = 0; x < 15; x++) {
                ctx.strokeRect(
                    offsetX + x * cellSize,
                    offsetY + y * cellSize,
                    cellSize,
                    cellSize
                );
            }
        }
    }

    renderUnits(ctx) {
        if (!this.battle.units) return;

        this.battle.units.forEach(unit => {
            if (!unit.active) return;

            const cellSize = 40;
            const offsetX = 100;
            const offsetY = 100;
            const x = offsetX + unit.x * cellSize + cellSize / 2;
            const y = offsetY + unit.y * cellSize + cellSize / 2;

            // 绘制单位
            ctx.beginPath();
            ctx.arc(x, y, 15, 0, Math.PI * 2);
            ctx.fillStyle = unit.side === 'attacker' ? '#4444ff' : '#ff4444';
            ctx.fill();

            // 选中高亮
            if (this.selectedUnit && this.selectedUnit.id === unit.id) {
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 3;
                ctx.stroke();
            }

            // 单位名称
            ctx.fillStyle = '#ffffff';
            ctx.font = '10px Microsoft YaHei';
            ctx.textAlign = 'center';
            ctx.fillText(unit.personName, x, y - 20);

            // 兵力
            ctx.fillText(unit.arms.toString(), x, y + 25);
        });
    }

    renderUI(ctx) {
        // 回合信息
        ctx.fillStyle = '#ffd700';
        ctx.font = 'bold 20px Microsoft YaHei';
        ctx.textAlign = 'center';
        ctx.fillText(
            `第 ${this.battle.turn || 1} 回合 - ${this.battle.currentSide === 'attacker' ? '进攻方' : '防守方'}`,
            ctx.canvas.width / 2,
            30
        );

        // 行动按钮
        Object.values(this.actionButtons).forEach(btn => btn.render(ctx));
        
        // 结束回合和退出按钮
        this.endTurnButton.render(ctx);
        this.exitButton.render(ctx);

        // 选中单位信息
        if (this.selectedUnit) {
            this.renderUnitInfo(ctx);
        }
    }

    renderUnitInfo(ctx) {
        const panelX = 700;
        const panelY = 400;
        const panelW = 280;
        const panelH = 200;

        // 面板背景
        ctx.fillStyle = 'rgba(45, 45, 45, 0.9)';
        ctx.fillRect(panelX, panelY, panelW, panelH);

        // 信息
        ctx.fillStyle = '#ffffff';
        ctx.font = '14px Microsoft YaHei';
        ctx.textAlign = 'left';
        
        const info = [
            this.selectedUnit.personName,
            `HP: ${this.selectedUnit.hp}/${this.selectedUnit.maxHp}`,
            `MP: ${this.selectedUnit.mp}/${this.selectedUnit.maxMp}`,
            `兵力: ${this.selectedUnit.arms}`,
            `移动力: ${this.selectedUnit.move}`
        ];

        let y = panelY + 30;
        info.forEach(line => {
            ctx.fillText(line, panelX + 15, y);
            y += 25;
        });
    }

    onMouseDown(x, y) {
        // 检查是否点击单位
        if (this.battle && this.battle.units) {
            const cellSize = 40;
            const offsetX = 100;
            const offsetY = 100;

            this.battle.units.forEach(unit => {
                if (!unit.active) return;
                
                const unitX = offsetX + unit.x * cellSize + cellSize / 2;
                const unitY = offsetY + unit.y * cellSize + cellSize / 2;
                
                const dx = x - unitX;
                const dy = y - unitY;
                const dist = Math.sqrt(dx * dx + dy * dy);
                
                if (dist < 20) {
                    this.selectedUnit = unit;
                }
            });
        }

        Object.values(this.actionButtons).forEach(btn => btn.onMouseDown(x, y));
        this.endTurnButton.onMouseDown(x, y);
        this.exitButton.onMouseDown(x, y);
    }

    onMouseUp(x, y) {
        Object.values(this.actionButtons).forEach(btn => btn.onMouseUp(x, y));
        this.endTurnButton.onMouseUp(x, y);
        this.exitButton.onMouseUp(x, y);
    }

    onMouseMove(x, y) {
        Object.values(this.actionButtons).forEach(btn => btn.onMouseMove(x, y));
        this.endTurnButton.onMouseMove(x, y);
        this.exitButton.onMouseMove(x, y);
    }
}
