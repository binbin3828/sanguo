/**
 * 君主选择界面 - 商业级设计
 */

export class KingSelectScreen {
    constructor(engine) {
        this.engine = engine;
        this.eventBus = engine.eventBus;
        
        this.selectedKing = null;
        this.availableKings = [];
        this.animationTime = 0;
        this.particles = [];
        
        this._initParticles();
    }

    _initParticles() {
        for (let i = 0; i < 15; i++) {
            this.particles.push({
                x: Math.random() * 1024,
                y: Math.random() * 768,
                size: Math.random() * 2 + 1,
                speedX: (Math.random() - 0.5) * 0.2,
                speedY: (Math.random() - 0.5) * 0.2,
                opacity: Math.random() * 0.3 + 0.1
            });
        }
    }

    onEnter() {
        this.animationTime = 0;
    }

    setPeriod(periodData) {
        this.periodData = periodData;
        if (periodData && periodData.rulers) {
            this.availableKings = periodData.rulers;
            console.log('设置可用君主:', this.availableKings);
        }
    }

    setAvailableKings(kings) {
        this.availableKings = kings || [];
    }

    onSelectKing(king) {
        this.selectedKing = king;
    }

    onConfirm() {
        if (!this.selectedKing) {
            return;
        }

        if (this.eventBus) {
            this.eventBus.emit('king.selected', this.selectedKing);
            this.eventBus.emit('screen.change', 'StrategyMap');
        }
    }

    onBack() {
        if (this.eventBus) {
            this.eventBus.emit('screen.change', 'PeriodSelect');
        }
    }

    update(deltaTime) {
        this.animationTime += deltaTime * 0.001;
        
        this.particles.forEach(p => {
            p.x += p.speedX;
            p.y += p.speedY;
            if (p.x < 0) p.x = 1024;
            if (p.x > 1024) p.x = 0;
            if (p.y < 0) p.y = 768;
            if (p.y > 768) p.y = 0;
        });
    }

    render(ctx) {
        const w = ctx.canvas.width;
        const h = ctx.canvas.height;
        
        this._renderBackground(ctx, w, h);
        this._renderParticles(ctx);
        this._renderTitle(ctx, w);
        this._renderKingList(ctx, w, h);
        this._renderKingInfo(ctx, w, h);
        this._renderButtons(ctx, w, h);
        this._renderVersion(ctx, w, h);
    }

    _renderBackground(ctx, w, h) {
        const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
        bgGrad.addColorStop(0, '#0a0a1a');
        bgGrad.addColorStop(0.3, '#121225');
        bgGrad.addColorStop(0.7, '#101020');
        bgGrad.addColorStop(1, '#080812');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, w, h);
        
        ctx.globalAlpha = 0.02;
        for (let i = 0; i < w; i += 4) {
            for (let j = 0; j < h; j += 8) {
                if ((i + j) % 16 === 0) {
                    ctx.fillStyle = '#fff';
                    ctx.fillRect(i, j, 1, 1);
                }
            }
        }
        ctx.globalAlpha = 1;
        
        const lineGrad = ctx.createLinearGradient(0, 0, w, 0);
        lineGrad.addColorStop(0, 'transparent');
        lineGrad.addColorStop(0.2, 'rgba(201, 160, 80, 0.4)');
        lineGrad.addColorStop(0.8, 'rgba(201, 160, 80, 0.4)');
        lineGrad.addColorStop(1, 'transparent');
        ctx.strokeStyle = lineGrad;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, 90);
        ctx.lineTo(w, 90);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(0, h - 80);
        ctx.lineTo(w, h - 80);
        ctx.stroke();
    }

    _renderParticles(ctx) {
        this.particles.forEach(p => {
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(201, 160, 80, ${p.opacity})`;
            ctx.fill();
        });
    }

    _renderTitle(ctx, w) {
        ctx.save();
        
        ctx.shadowColor = '#c9a050';
        ctx.shadowBlur = 20;
        
        const titleGrad = ctx.createLinearGradient(w/2 - 100, 50, w/2 + 100, 50);
        titleGrad.addColorStop(0, '#ffd700');
        titleGrad.addColorStop(0.5, '#fff8dc');
        titleGrad.addColorStop(1, '#c9a050');
        
        ctx.fillStyle = titleGrad;
        ctx.font = 'bold 36px "STKaiti", "KaiTi", serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('选择君主', w/2, 55);
        
        ctx.restore();
    }

    _renderKingList(ctx, w, h) {
        const listX = 80;
        const listY = 140;
        const listW = 280;
        const listH = 450;
        
        ctx.save();
        
        const bgGrad = ctx.createLinearGradient(listX, listY, listX + listW, listY + listH);
        bgGrad.addColorStop(0, 'rgba(25, 25, 45, 0.85)');
        bgGrad.addColorStop(1, 'rgba(15, 15, 35, 0.9)');
        
        ctx.fillStyle = bgGrad;
        ctx.fillRect(listX, listY, listW, listH);
        
        ctx.strokeStyle = 'rgba(201, 160, 80, 0.3)';
        ctx.lineWidth = 1;
        ctx.strokeRect(listX, listY, listW, listH);
        
        ctx.fillStyle = 'rgba(201, 160, 80, 0.15)';
        ctx.fillRect(listX, listY, listW, 40);
        
        ctx.fillStyle = '#c9a050';
        ctx.font = 'bold 16px "Microsoft YaHei"';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('可选君主', listX + listW/2, listY + 20);
        
        const kings = this.availableKings.length > 0 ? this.availableKings : [
            { id: 1, name: '曹操', force: 85, iq: 95, armyType: '骑兵', cities: 3, generals: 10 },
            { id: 2, name: '刘备', force: 75, iq: 90, armyType: '骑兵', cities: 1, generals: 5 },
            { id: 3, name: '孙权', force: 70, iq: 88, armyType: '水军', cities: 1, generals: 6 },
            { id: 4, name: '袁绍', force: 80, iq: 75, armyType: '骑兵', cities: 2, generals: 12 }
        ];
        
        const itemHeight = 45;
        const startY = listY + 50;
        
        kings.forEach((king, index) => {
            const itemY = startY + index * itemHeight;
            const isSelected = this.selectedKing && this.selectedKing.id === king.id;
            const isHovered = this._hoveredIndex === index;
            
            if (isSelected) {
                ctx.fillStyle = 'rgba(201, 160, 80, 0.3)';
            } else if (isHovered) {
                ctx.fillStyle = 'rgba(60, 60, 90, 0.5)';
            } else {
                ctx.fillStyle = 'rgba(40, 40, 60, 0.3)';
            }
            
            ctx.fillRect(listX + 5, itemY, listW - 10, itemHeight - 2);
            
            if (isSelected) {
                ctx.strokeStyle = '#c9a050';
                ctx.lineWidth = 2;
                ctx.strokeRect(listX + 5, itemY, listW - 10, itemHeight - 2);
            }
            
            ctx.fillStyle = isSelected ? '#ffd700' : '#ccc';
            ctx.font = 'bold 16px "Microsoft YaHei"';
            ctx.textAlign = 'left';
            ctx.fillText(king.name, listX + 20, itemY + itemHeight/2);
            
            if (isSelected) {
                ctx.fillStyle = '#888';
                ctx.font = '12px "Microsoft YaHei"';
                ctx.fillText('已选择', listX + listW - 60, itemY + itemHeight/2);
            }
        });
        
        this._kingListBounds = { x: listX + 5, y: startY, w: listW - 10, h: itemHeight, itemHeight };
        this._kings = kings;
        
        ctx.restore();
    }

    _renderKingInfo(ctx, w, h) {
        const infoX = 420;
        const infoY = 140;
        const infoW = 530;
        const infoH = 450;
        
        const king = this.selectedKing;
        
        ctx.save();
        
        const bgGrad = ctx.createLinearGradient(infoX, infoY, infoX + infoW, infoY + infoH);
        bgGrad.addColorStop(0, 'rgba(25, 25, 45, 0.85)');
        bgGrad.addColorStop(1, 'rgba(15, 15, 35, 0.9)');
        
        ctx.fillStyle = bgGrad;
        ctx.fillRect(infoX, infoY, infoW, infoH);
        
        ctx.strokeStyle = king ? 'rgba(201, 160, 80, 0.5)' : 'rgba(201, 160, 80, 0.2)';
        ctx.lineWidth = king ? 2 : 1;
        ctx.strokeRect(infoX, infoY, infoW, infoH);
        
        if (!king) {
            ctx.fillStyle = 'rgba(100, 100, 120, 0.5)';
            ctx.font = '20px "Microsoft YaHei"';
            ctx.textAlign = 'center';
            ctx.fillText('请从左侧选择一位君主', infoX + infoW/2, infoY + infoH/2);
            ctx.restore();
            return;
        }
        
        ctx.fillStyle = 'rgba(201, 160, 80, 0.15)';
        ctx.fillRect(infoX, infoY, infoW, 50);
        
        ctx.shadowColor = '#ffd700';
        ctx.shadowBlur = 15;
        ctx.fillStyle = '#ffd700';
        ctx.font = 'bold 28px "STKaiti", "KaiTi", serif';
        ctx.textAlign = 'center';
        ctx.fillText(king.name, infoX + infoW/2, infoY + 35);
        ctx.shadowBlur = 0;
        
        const statsY = infoY + 100;
        const stats = [
            { label: '武力', value: king.force || 70 },
            { label: '智力', value: king.iq || 70 },
            { label: '兵种', value: king.armyType || '步兵' },
            { label: '城池', value: king.cities || 0 },
            { label: '将领', value: king.generals || 0 }
        ];
        
        stats.forEach((stat, i) => {
            const statY = statsY + i * 60;
            
            ctx.fillStyle = '#888';
            ctx.font = '16px "Microsoft YaHei"';
            ctx.textAlign = 'left';
            ctx.fillText(stat.label + '：', infoX + 40, statY);
            
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 20px "Microsoft YaHei"';
            ctx.fillText(stat.value.toString(), infoX + 120, statY);
            
            const barWidth = 200;
            const barHeight = 12;
            const barX = infoX + 180;
            const barY = statY - 8;
            
            ctx.fillStyle = 'rgba(50, 50, 70, 0.8)';
            ctx.fillRect(barX, barY, barWidth, barHeight);
            
            const fillWidth = (stat.value / 100) * barWidth;
            const barGrad = ctx.createLinearGradient(barX, barY, barX + fillWidth, barY);
            barGrad.addColorStop(0, '#c9a050');
            barGrad.addColorStop(1, '#ffd700');
            ctx.fillStyle = barGrad;
            ctx.fillRect(barX, barY, fillWidth, barHeight);
        });
        
        ctx.restore();
    }

    getArmyTypeName(type) {
        if (typeof type === 'string') return type;
        const names = ['骑兵', '步兵', '弓兵', '水军', '极兵', '玄兵'];
        return names[type] || '步兵';
    }

    _renderButtons(ctx, w, h) {
        // 左上角返回按钮 - 商业级样式
        ctx.save();
        
        const btnX = 10;
        const btnY = 10;
        const btnW = 120;
        const btnH = 40;
        
        const bgGrad = ctx.createLinearGradient(btnX, btnY, btnX, btnY + btnH);
        bgGrad.addColorStop(0, 'rgba(35, 35, 55, 0.9)');
        bgGrad.addColorStop(1, 'rgba(20, 20, 40, 0.95)');
        
        ctx.fillStyle = bgGrad;
        this._drawRoundedRect(ctx, btnX, btnY, btnW, btnH, 6, bgGrad);
        
        ctx.strokeStyle = 'rgba(201, 160, 80, 0.5)';
        ctx.lineWidth = 1.5;
        this._drawRoundedRect(ctx, btnX + 1, btnY + 1, btnW - 2, btnH - 2, 5, null, true);
        
        ctx.fillStyle = '#aaa';
        ctx.font = 'bold 14px "Microsoft YaHei"';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('← 返回', btnX + btnW/2, btnY + btnH/2);
        
        ctx.restore();
        
        // 右下角确认按钮
        ctx.save();
        
        const confirmX = w - 160;
        const confirmY = h - 70;
        const confirmW = 140;
        const confirmH = 45;
        
        const confirmGrad = ctx.createLinearGradient(confirmX, confirmY, confirmX, confirmY + confirmH);
        confirmGrad.addColorStop(0, '#c9a050');
        confirmGrad.addColorStop(1, '#8b6914');
        
        ctx.fillStyle = confirmGrad;
        this._drawRoundedRect(ctx, confirmX, confirmY, confirmW, confirmH, 8, confirmGrad);
        
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 1;
        this._drawRoundedRect(ctx, confirmX + 1, confirmY + 1, confirmW - 2, confirmH - 2, 7, null, true);
        
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 16px "Microsoft YaHei"';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
        ctx.shadowBlur = 4;
        ctx.fillText('开始游戏 →', confirmX + confirmW/2, confirmY + confirmH/2);
        
        ctx.restore();
    }

    _renderTitle(ctx, w) {
        ctx.save();
        
        ctx.shadowColor = '#c9a050';
        ctx.shadowBlur = 20;
        
        const titleGrad = ctx.createLinearGradient(w/2 - 100, 50, w/2 + 100, 50);
        titleGrad.addColorStop(0, '#ffd700');
        titleGrad.addColorStop(0.5, '#fff8dc');
        titleGrad.addColorStop(1, '#c9a050');
        
        ctx.fillStyle = titleGrad;
        ctx.font = 'bold 36px "STKaiti", "KaiTi", serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('选择君主', w/2, 50);
        
        ctx.restore();
    }

    _renderButton(ctx, x, y, w, h, text, color, onClick, name = 'back') {
        ctx.save();
        
        const bgGrad = ctx.createLinearGradient(x, y, x, y + h);
        bgGrad.addColorStop(0, color);
        bgGrad.addColorStop(1, this._darkenColor(color, 30));
        
        ctx.fillStyle = bgGrad;
        this._drawRoundedRect(ctx, x, y, w, h, 8);
        
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 1;
        this._drawRoundedRect(ctx, x + 1, y + 1, w - 2, h - 2, 7, null, true);
        
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 16px "Microsoft YaHei"';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, x + w/2, y + h/2);
        
        ctx.restore();
        
        if (name === 'back') {
            this._backBtn = { x, y, w, h, onClick };
        } else if (name === 'confirm') {
            this._confirmBtn = { x, y, w, h, onClick };
        }
    }

    _darkenColor(color, amount) {
        const hex = color.replace('#', '');
        const r = Math.max(0, parseInt(hex.slice(0, 2), 16) - amount);
        const g = Math.max(0, parseInt(hex.slice(2, 4), 16) - amount);
        const b = Math.max(0, parseInt(hex.slice(4, 6), 16) - amount);
        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    }

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

    _renderVersion(ctx, w, h) {
        ctx.save();
        ctx.fillStyle = 'rgba(100, 100, 120, 0.4)';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('v1.0.0  |  © 2026', w/2, h - 30);
        ctx.restore();
    }

    onMouseDown(x, y) {
        // 返回按钮 (左上角)
        if (x >= 10 && x <= 130 && y >= 10 && y <= 50) {
            this.onBack();
            return;
        }
        
        // 确认按钮 (右下角)
        if (x >= 1024 - 160 && x <= 1024 - 20 && y >= 768 - 70 && y <= 768 - 25) {
            this.onConfirm();
            return;
        }
        
        // 检查君主列表点击
        if (this._kingListBounds && this._kings) {
            const bounds = this._kingListBounds;
            if (x >= bounds.x && x <= bounds.x + bounds.w &&
                y >= bounds.y && y <= bounds.y + bounds.h) {
                const index = Math.floor((y - bounds.y) / bounds.itemHeight);
                if (index >= 0 && index < this._kings.length) {
                    this.selectedKing = this._kings[index];
                }
            }
        }
    }

    onMouseMove(x, y) {
        if (this._kingListBounds && this._kings) {
            const bounds = this._kingListBounds;
            if (x >= bounds.x && x <= bounds.x + bounds.w &&
                y >= bounds.y && y <= bounds.y + bounds.h) {
                this._hoveredIndex = Math.floor((y - bounds.y) / bounds.itemHeight);
            } else {
                this._hoveredIndex = -1;
            }
        }
    }

    onMouseUp(x, y) {
    }
}
