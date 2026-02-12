/**
 * 主菜单界面 - 商业级设计
 */

import { Button } from '../components/Button.js';

export class MainMenuScreen {
    constructor(engine) {
        this.engine = engine;
        this.eventBus = engine.eventBus;
        
        this.buttons = [];
        this.animationTime = 0;
        this.particles = [];
        
        this._initButtons();
        this._initParticles();
    }

    /**
     * 初始化粒子效果
     */
    _initParticles() {
        for (let i = 0; i < 30; i++) {
            this.particles.push({
                x: Math.random() * 1024,
                y: Math.random() * 768,
                size: Math.random() * 2 + 1,
                speedX: (Math.random() - 0.5) * 0.3,
                speedY: (Math.random() - 0.5) * 0.3,
                opacity: Math.random() * 0.5 + 0.2
            });
        }
    }

    /**
     * 初始化按钮 - 商业级样式
     */
    _initButtons() {
        const centerX = 512;
        const buttonWidth = 280;
        const buttonHeight = 56;
        const spacing = 16;
        const startY = 380;

        // 主按钮样式配置
        const buttonConfigs = [
            {
                text: '新游戏',
                y: startY,
                onClick: () => this.onNewGame(),
                icon: '⚔'
            },
            {
                text: '载入游戏',
                y: startY + buttonHeight + spacing,
                onClick: () => this.onLoadGame(),
                icon: '📜'
            },
            {
                text: '退出游戏',
                y: startY + (buttonHeight + spacing) * 2,
                onClick: () => this.onExit(),
                icon: '🚪'
            }
        ];

        buttonConfigs.forEach(config => {
            this.buttons.push({
                x: centerX - buttonWidth / 2,
                y: config.y,
                width: buttonWidth,
                height: buttonHeight,
                text: config.text,
                icon: config.icon,
                onClick: config.onClick,
                isHovered: false,
                hoverProgress: 0
            });
        });
    }

    /**
     * 进入界面
     */
    onEnter() {
        console.log('进入主菜单');
        this.animationTime = 0;
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
        this.animationTime += deltaTime * 0.001;
        
        // 更新粒子
        this.particles.forEach(p => {
            p.x += p.speedX;
            p.y += p.speedY;
            
            if (p.x < 0) p.x = 1024;
            if (p.x > 1024) p.x = 0;
            if (p.y < 0) p.y = 768;
            if (p.y > 768) p.y = 0;
        });
        
        // 更新按钮悬停状态
        this.buttons.forEach(btn => {
            if (btn.isHovered && btn.hoverProgress < 1) {
                btn.hoverProgress = Math.min(1, btn.hoverProgress + deltaTime * 0.008);
            } else if (!btn.isHovered && btn.hoverProgress > 0) {
                btn.hoverProgress = Math.max(0, btn.hoverProgress - deltaTime * 0.008);
            }
        });
    }

    /**
     * 渲染
     */
    render(ctx) {
        const w = ctx.canvas.width;
        const h = ctx.canvas.height;
        
        // 1. 绘制深色渐变背景
        this._renderBackground(ctx, w, h);
        
        // 2. 绘制粒子效果
        this._renderParticles(ctx);
        
        // 3. 绘制装饰性云纹
        this._renderDecorations(ctx, w, h);
        
        // 4. 绘制标题
        this._renderTitle(ctx, w);
        
        // 5. 绘制副标题
        this._renderSubtitle(ctx, w);
        
        // 6. 绘制版本信息
        this._renderVersion(ctx, w, h);
        
        // 7. 绘制按钮
        this._renderButtons(ctx);
    }

    /**
     * 绘制背景
     */
    _renderBackground(ctx, w, h) {
        // 主背景渐变
        const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
        bgGrad.addColorStop(0, '#0a0a1a');
        bgGrad.addColorStop(0.5, '#151530');
        bgGrad.addColorStop(1, '#0d0d20');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, w, h);
        
        // 添加纹理效果
        ctx.globalAlpha = 0.03;
        for (let i = 0; i < w; i += 4) {
            for (let j = 0; j < h; j += 4) {
                if ((i + j) % 8 === 0) {
                    ctx.fillStyle = '#fff';
                    ctx.fillRect(i, j, 1, 1);
                }
            }
        }
        ctx.globalAlpha = 1;
        
        // 顶部装饰线
        const lineGrad = ctx.createLinearGradient(0, 0, w, 0);
        lineGrad.addColorStop(0, 'transparent');
        lineGrad.addColorStop(0.3, '#c9a050');
        lineGrad.addColorStop(0.7, '#c9a050');
        lineGrad.addColorStop(1, 'transparent');
        ctx.strokeStyle = lineGrad;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, 80);
        ctx.lineTo(w, 80);
        ctx.stroke();
        
        // 底部装饰线
        ctx.beginPath();
        ctx.moveTo(0, h - 60);
        ctx.lineTo(w, h - 60);
        ctx.stroke();
    }

    /**
     * 绘制粒子
     */
    _renderParticles(ctx) {
        this.particles.forEach(p => {
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(201, 160, 80, ${p.opacity})`;
            ctx.fill();
        });
    }

    /**
     * 绘制装饰元素
     */
    _renderDecorations(ctx, w, h) {
        ctx.save();
        
        // 左侧装饰 - 龙纹抽象
        ctx.globalAlpha = 0.1 + Math.sin(this.animationTime * 0.5) * 0.02;
        ctx.strokeStyle = '#c9a050';
        ctx.lineWidth = 1;
        
        // 绘制抽象云纹
        for (let i = 0; i < 3; i++) {
            const y = 150 + i * 30;
            ctx.beginPath();
            ctx.moveTo(30, y);
            ctx.bezierCurveTo(60, y - 20, 90, y + 20, 120, y);
            ctx.stroke();
        }
        
        // 右侧装饰
        for (let i = 0; i < 3; i++) {
            const y = 150 + i * 30;
            ctx.beginPath();
            ctx.moveTo(w - 30, y);
            ctx.bezierCurveTo(w - 60, y - 20, w - 90, y + 20, w - 120, y);
            ctx.stroke();
        }
        
        ctx.restore();
    }

    /**
     * 绘制标题
     */
    _renderTitle(ctx, w) {
        ctx.save();
        
        const title = '三国霸业';
        const y = 200;
        
        // 标题发光效果
        ctx.shadowColor = '#c9a050';
        ctx.shadowBlur = 30 + Math.sin(this.animationTime * 2) * 5;
        
        // 主标题 - 金色渐变
        const titleGrad = ctx.createLinearGradient(w/2 - 150, y - 40, w/2 + 150, y + 40);
        titleGrad.addColorStop(0, '#ffd700');
        titleGrad.addColorStop(0.3, '#fff8dc');
        titleGrad.addColorStop(0.5, '#c9a050');
        titleGrad.addColorStop(0.7, '#fff8dc');
        titleGrad.addColorStop(1, '#b8860b');
        
        ctx.fillStyle = titleGrad;
        ctx.font = 'bold 72px "STKaiti", "KaiTi", "SimKai", serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // 绘制多层阴影增加立体感
        ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
        ctx.shadowBlur = 4;
        ctx.shadowOffsetX = 3;
        ctx.shadowOffsetY = 3;
        ctx.fillText(title, w/2, y);
        
        ctx.restore();
    }

    /**
     * 绘制副标题
     */
    _renderSubtitle(ctx, w) {
        ctx.save();
        
        const y = 280;
        const text = 'REMASTERED';
        
        // 副标题 - 银色
        const subGrad = ctx.createLinearGradient(w/2 - 100, y, w/2 + 100, y);
        subGrad.addColorStop(0, '#888');
        subGrad.addColorStop(0.5, '#ccc');
        subGrad.addColorStop(1, '#888');
        
        ctx.fillStyle = subGrad;
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.letterSpacing = '8px';
        
        // 发光效果
        ctx.shadowColor = '#fff';
        ctx.shadowBlur = 10;
        ctx.fillText(text, w/2, y);
        
        ctx.restore();
    }

    /**
     * 绘制版本信息
     */
    _renderVersion(ctx, w, h) {
        ctx.save();
        
        ctx.fillStyle = 'rgba(150, 150, 150, 0.6)';
        ctx.font = '14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('v1.0.0  |  © 2026', w/2, h - 30);
        
        ctx.restore();
    }

    /**
     * 绘制按钮
     */
    _renderButtons(ctx) {
        this.buttons.forEach(btn => {
            const progress = btn.hoverProgress;
            const x = btn.x;
            const y = btn.y;
            const w = btn.width;
            const h = btn.height;
            
            ctx.save();
            
            // 按钮背景
            const bgGrad = ctx.createLinearGradient(x, y, x, y + h);
            
            if (progress > 0) {
                // 悬停状态
                bgGrad.addColorStop(0, `rgba(201, 160, 80, ${0.1 + progress * 0.1})`);
                bgGrad.addColorStop(0.5, `rgba(201, 160, 80, ${0.15 + progress * 0.15})`);
                bgGrad.addColorStop(1, `rgba(139, 105, 20, ${0.2 + progress * 0.1})`);
                
                ctx.shadowColor = '#c9a050';
                ctx.shadowBlur = 20 * progress;
            } else {
                // 默认状态
                bgGrad.addColorStop(0, 'rgba(30, 30, 50, 0.8)');
                bgGrad.addColorStop(0.5, 'rgba(40, 40, 60, 0.9)');
                bgGrad.addColorStop(1, 'rgba(20, 20, 40, 0.95)');
            }
            
            // 绘制按钮背景
            this._drawRoundedRect(ctx, x, y, w, h, 8, bgGrad);
            
            // 按钮边框
            const borderAlpha = 0.4 + progress * 0.6;
            ctx.strokeStyle = `rgba(201, 160, 80, ${borderAlpha})`;
            ctx.lineWidth = 1.5 + progress;
            this._drawRoundedRect(ctx, x + 1, y + 1, w - 2, h - 2, 7, null, true);
            
            // 按钮文字
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            const textGrad = ctx.createLinearGradient(x, y, x + w, y);
            if (progress > 0) {
                textGrad.addColorStop(0, '#fff');
                textGrad.addColorStop(0.5, '#ffd700');
                textGrad.addColorStop(1, '#fff');
            } else {
                textGrad.addColorStop(0, '#aaa');
                textGrad.addColorStop(0.5, '#ccc');
                textGrad.addColorStop(1, '#aaa');
            }
            
            ctx.fillStyle = textGrad;
            ctx.font = `bold ${20 + progress * 2}px "Microsoft YaHei", sans-serif`;
            
            // 绘制图标
            if (btn.icon) {
                const iconX = x + 35;
                ctx.fillText(btn.icon, iconX, y + h/2);
            }
            
            // 绘制文字
            const textX = x + w/2 + 10;
            ctx.fillText(btn.text, textX, y + h/2);
            
            ctx.restore();
        });
    }

    /**
     * 绘制圆角矩形
     */
    _drawRoundedRect(ctx, x, y, w, h, r, fillStyle, stroke = false) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
        
        if (fillStyle) {
            ctx.fillStyle = fillStyle;
            ctx.fill();
        }
        
        if (stroke) {
            ctx.stroke();
        }
    }

    /**
     * 处理鼠标按下
     */
    onMouseDown(x, y) {
        this.buttons.forEach(btn => {
            if (this._isPointInButton(x, y, btn)) {
                btn.onClick();
            }
        });
    }

    /**
     * 处理鼠标移动
     */
    onMouseMove(x, y) {
        let cursor = 'default';
        
        this.buttons.forEach(btn => {
            const isIn = this._isPointInButton(x, y, btn);
            btn.isHovered = isIn;
            if (isIn) cursor = 'pointer';
        });
        
        // 可以在这里设置canvas的cursor
    }

    /**
     * 处理鼠标松开
     */
    onMouseUp(x, y) {
        // 可以添加点击效果
    }

    /**
     * 检查点是否在按钮内
     */
    _isPointInButton(x, y, btn) {
        return x >= btn.x && x <= btn.x + btn.width &&
               y >= btn.y && y <= btn.y + btn.height;
    }
}
