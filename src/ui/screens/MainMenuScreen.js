/**
 * 主菜单界面
 */

import { Button } from '../components/Button.js';

export class MainMenuScreen {
    constructor(engine) {
        this.engine = engine;
        this.eventBus = engine.eventBus;
        
        this.buttons = [];
        this._initButtons();
    }

    /**
     * 初始化按钮
     */
    _initButtons() {
        const centerX = 512; // 1024 / 2
        const startY = 300;
        const buttonWidth = 200;
        const buttonHeight = 50;
        const spacing = 20;

        // 新游戏
        this.buttons.push(new Button({
            x: centerX - buttonWidth / 2,
            y: startY,
            width: buttonWidth,
            height: buttonHeight,
            text: '新游戏',
            onClick: () => this.onNewGame()
        }));

        // 读取存档
        this.buttons.push(new Button({
            x: centerX - buttonWidth / 2,
            y: startY + buttonHeight + spacing,
            width: buttonWidth,
            height: buttonHeight,
            text: '读取存档',
            onClick: () => this.onLoadGame()
        }));

        // 游戏设置
        this.buttons.push(new Button({
            x: centerX - buttonWidth / 2,
            y: startY + (buttonHeight + spacing) * 2,
            width: buttonWidth,
            height: buttonHeight,
            text: '游戏设置',
            onClick: () => this.onSettings()
        }));

        // 退出游戏
        this.buttons.push(new Button({
            x: centerX - buttonWidth / 2,
            y: startY + (buttonHeight + spacing) * 3,
            width: buttonWidth,
            height: buttonHeight,
            text: '退出游戏',
            onClick: () => this.onExit()
        }));
    }

    /**
     * 进入界面
     */
    onEnter() {
        console.log('进入主菜单');
    }

    /**
     * 退出界面
     */
    onExit() {
        console.log('退出主菜单');
    }

    /**
     * 新游戏
     */
    onNewGame() {
        if (this.eventBus) {
            this.eventBus.emit('screen.change', 'PeriodSelect');
        }
    }

    /**
     * 读取存档
     */
    onLoadGame() {
        if (this.eventBus) {
            this.eventBus.emit('screen.change', 'SaveLoad');
        }
    }

    /**
     * 游戏设置
     */
    onSettings() {
        console.log('打开设置');
    }

    /**
     * 退出游戏
     */
    onExit() {
        if (confirm('确定要退出游戏吗？')) {
            window.close();
        }
    }

    /**
     * 更新
     */
    update(deltaTime) {
        // 更新逻辑
    }

    /**
     * 渲染
     */
    render(ctx) {
        // 绘制背景
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

        // 绘制标题
        ctx.fillStyle = '#ffd700';
        ctx.font = 'bold 48px Microsoft YaHei';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('三国霸业', ctx.canvas.width / 2, 150);
        
        ctx.fillStyle = '#aaaaaa';
        ctx.font = '20px Microsoft YaHei';
        ctx.fillText('重置版', ctx.canvas.width / 2, 200);

        // 绘制按钮
        this.buttons.forEach(button => button.render(ctx));
    }

    /**
     * 处理输入
     */
    onMouseDown(x, y) {
        this.buttons.forEach(button => button.onMouseDown(x, y));
    }

    onMouseUp(x, y) {
        this.buttons.forEach(button => button.onMouseUp(x, y));
    }

    onMouseMove(x, y) {
        this.buttons.forEach(button => button.onMouseMove(x, y));
    }
}
