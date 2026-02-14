/**
 * 时期选择界面 - 商业级设计
 */

export class PeriodSelectScreen {
    constructor(engine) {
        this.engine = engine;
        this.eventBus = engine.eventBus;
        
        this.selectedPeriod = 1;
        this.periods = [
            { id: 1, name: '董卓弄权', year: '190年', desc: '汉末乱世初期', color: '#8b0000', accent: '#ff4500' },
            { id: 2, name: '曹操崛起', year: '198年', desc: '中原争霸', color: '#1a472a', accent: '#228b22' },
            { id: 3, name: '赤壁之战', year: '208年', desc: '三国鼎立前夕', color: '#1a3a5c', accent: '#4169e1' },
            { id: 4, name: '三国鼎立', year: '225年', desc: '魏蜀吴三国形成', color: '#4a3a1a', accent: '#ffd700' }
        ];
        
        this.cards = [];
        this.animationTime = 0;
        this.particles = [];
        this.titleGlow = 0;
        
        this._initParticles();
        this._initCards();
    }

    _initParticles() {
        for (let i = 0; i < 20; i++) {
            this.particles.push({
                x: Math.random() * 1024,
                y: Math.random() * 768,
                size: Math.random() * 2 + 1,
                speedX: (Math.random() - 0.5) * 0.2,
                speedY: (Math.random() - 0.5) * 0.2,
                opacity: Math.random() * 0.4 + 0.1
            });
        }
    }

    _initCards() {
        const cardWidth = 320;
        const cardHeight = 180;
        const spacingX = 40;
        const spacingY = 35;
        const totalWidth = cardWidth * 2 + spacingX;
        const startX = (1024 - totalWidth) / 2;
        const startY = 200;
        
        this.periods.forEach((period, index) => {
            this.cards.push({
                id: period.id,
                x: startX + (index % 2) * (cardWidth + spacingX),
                y: startY + Math.floor(index / 2) * (cardHeight + spacingY),
                width: cardWidth,
                height: cardHeight,
                period: period,
                hoverProgress: 0,
                isHovered: false,
                selectProgress: 0
            });
        });
    }

    onEnter() {
        this.animationTime = 0;
    }

    onSelectPeriod(periodId) {
        this.selectedPeriod = periodId;
        const period = this.periods.find(p => p.id === periodId);
        if (this.eventBus) {
            this.eventBus.emit('period.selected', periodId, period ? period.name : '');
            this.eventBus.emit('screen.change', 'KingSelect');
        }
    }

    onBack() {
        if (this.eventBus) {
            this.eventBus.emit('screen.change', 'MainMenu');
        }
    }

    update(deltaTime) {
        this.animationTime += deltaTime * 0.001;
        this.titleGlow = Math.sin(this.animationTime * 2) * 0.3 + 0.7;
        
        this.particles.forEach(p => {
            p.x += p.speedX;
            p.y += p.speedY;
            if (p.x < 0) p.x = 1024;
            if (p.x > 1024) p.x = 0;
            if (p.y < 0) p.y = 768;
            if (p.y > 768) p.y = 0;
        });
        
        this.cards.forEach(card => {
            const targetHover = card.isHovered ? 1 : 0;
            const targetSelect = card.id === this.selectedPeriod ? 1 : 0;
            
            if (card.hoverProgress < targetHover) {
                card.hoverProgress = Math.min(1, card.hoverProgress + deltaTime * 0.006);
            } else if (card.hoverProgress > targetHover) {
                card.hoverProgress = Math.max(0, card.hoverProgress - deltaTime * 0.006);
            }
            
            if (card.selectProgress < targetSelect) {
                card.selectProgress = Math.min(1, card.selectProgress + deltaTime * 0.01);
            } else if (card.selectProgress > targetSelect) {
                card.selectProgress = Math.max(0, card.selectProgress - deltaTime * 0.01);
            }
        });
    }

    render(ctx) {
        const w = ctx.canvas.width;
        const h = ctx.canvas.height;
        
        this._renderBackground(ctx, w, h);
        this._renderParticles(ctx);
        this._renderTitle(ctx, w);
        this._renderCards(ctx);
        this._renderBackButton(ctx, w, h);
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
        ctx.moveTo(0, h - 70);
        ctx.lineTo(w, h - 70);
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
        ctx.shadowBlur = 25 * this.titleGlow;
        
        const titleGrad = ctx.createLinearGradient(w/2 - 120, 50, w/2 + 120, 50);
        titleGrad.addColorStop(0, '#ffd700');
        titleGrad.addColorStop(0.2, '#fff8dc');
        titleGrad.addColorStop(0.5, '#c9a050');
        titleGrad.addColorStop(0.8, '#fff8dc');
        titleGrad.addColorStop(1, '#b8860b');
        
        ctx.fillStyle = titleGrad;
        ctx.font = 'bold 42px "STKaiti", "KaiTi", "SimKai", serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('选择历史剧本', w/2, 55);
        
        ctx.restore();
    }

    _renderCards(ctx) {
        this.cards.forEach(card => {
            this._renderCard(ctx, card);
        });
    }

    _renderCard(ctx, card) {
        const x = card.x;
        const y = card.y;
        const w = card.width;
        const h = card.height;
        const hover = card.hoverProgress;
        const select = card.selectProgress;
        const period = card.period;
        
        ctx.save();
        
        const centerX = x + w / 2;
        const centerY = y + h / 2;
        
        if (hover > 0 || select > 0) {
            ctx.shadowColor = period.accent;
            ctx.shadowBlur = 25 * Math.max(hover, select);
        }
        
        const bgGrad = ctx.createLinearGradient(x, y, x, y + h);
        if (select > 0) {
            const r = parseInt(period.color.slice(1, 3), 16);
            const g = parseInt(period.color.slice(3, 5), 16);
            const b = parseInt(period.color.slice(5, 7), 16);
            bgGrad.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${0.35 + select * 0.25})`);
            bgGrad.addColorStop(1, `rgba(${r}, ${g}, ${b}, ${0.2 + select * 0.15})`);
        } else if (hover > 0) {
            bgGrad.addColorStop(0, `rgba(40, 40, 65, ${0.7 + hover * 0.15})`);
            bgGrad.addColorStop(1, `rgba(25, 25, 45, ${0.85 + hover * 0.1})`);
        } else {
            bgGrad.addColorStop(0, 'rgba(25, 25, 45, 0.7)');
            bgGrad.addColorStop(1, 'rgba(15, 15, 35, 0.85)');
        }
        
        this._drawRoundedRect(ctx, x, y, w, h, 12, bgGrad);
        
        const borderAlpha = 0.3 + Math.max(hover, select) * 0.7;
        ctx.strokeStyle = `rgba(201, 160, 80, ${borderAlpha})`;
        ctx.lineWidth = 1 + Math.max(hover, select) * 2;
        this._drawRoundedRect(ctx, x + 1, y + 1, w - 2, h - 2, 11, null, true);
        
        this._renderCardDecor(ctx, x, y, w, h, period, select);
        
        const textAlpha = 0.6 + Math.max(hover, select) * 0.4;
        ctx.globalAlpha = textAlpha;
        
        ctx.fillStyle = select > 0 ? '#ffd700' : (hover > 0 ? '#fff' : '#aaa');
        ctx.font = 'bold 28px "STKaiti", "KaiTi", "SimKai", serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        ctx.shadowBlur = 4;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;
        ctx.fillText(period.name, centerX, centerY);
        
        ctx.font = '16px "Microsoft YaHei", sans-serif';
        ctx.fillStyle = select > 0 ? '#fff' : '#888';
        ctx.fillText(period.year, centerX, centerY + 35);
        
        ctx.restore();
    }

    _renderCardDecor(ctx, x, y, w, h, period, select) {
        ctx.save();
        ctx.globalAlpha = 0.1 + select * 0.15;
        
        const cx = x + w / 2;
        const cy = y + h / 2;
        
        if (period.id === 1) {
            ctx.fillStyle = '#ff4500';
            ctx.beginPath();
            ctx.moveTo(cx, cy - 40);
            ctx.quadraticCurveTo(cx + 25, cy - 10, cx, cy + 15);
            ctx.quadraticCurveTo(cx - 25, cy - 10, cx, cy - 40);
            ctx.fill();
            ctx.fillStyle = '#ffa500';
            ctx.beginPath();
            ctx.arc(cx, cy - 15, 12, 0, Math.PI * 2);
            ctx.fill();
        } else if (period.id === 2) {
            ctx.fillStyle = period.accent;
            ctx.fillRect(cx - 4, cy - 45, 8, 90);
            ctx.fillStyle = '#2d5a3d';
            ctx.beginPath();
            ctx.moveTo(cx, cy - 45);
            ctx.lineTo(cx + 40, cy - 15);
            ctx.lineTo(cx, cy + 15);
            ctx.closePath();
            ctx.fill();
        } else if (period.id === 3) {
            ctx.strokeStyle = '#4169e1';
            ctx.lineWidth = 3;
            for (let i = 0; i < 3; i++) {
                ctx.beginPath();
                ctx.moveTo(cx - 40, cy - 15 + i * 15);
                ctx.quadraticCurveTo(cx, cy - 20 + i * 15, cx + 40, cy - 15 + i * 15);
                ctx.stroke();
            }
            ctx.fillStyle = '#ff4500';
            ctx.beginPath();
            ctx.arc(cx + 25, cy - 20, 10, 0, Math.PI * 2);
            ctx.fill();
        } else if (period.id === 4) {
            ctx.strokeStyle = '#ffd700';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(cx - 30, cy + 20);
            ctx.lineTo(cx, cy - 25);
            ctx.lineTo(cx + 30, cy + 20);
            ctx.closePath();
            ctx.stroke();
            
            const colors = ['#ff4444', '#44ff44', '#4444ff'];
            const positions = [
                { x: cx - 18, y: cy },
                { x: cx, y: cy - 15 },
                { x: cx + 18, y: cy }
            ];
            positions.forEach((pos, i) => {
                ctx.strokeStyle = colors[i];
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(pos.x, pos.y, 8, 0, Math.PI * 2);
                ctx.stroke();
            });
        }
        
        ctx.restore();
    }

    _renderBackButton(ctx, w, h) {
        const x = 20;
        const y = 20;
        const btnW = 140;
        const btnH = 50;
        
        ctx.save();
        
        const bgGrad = ctx.createLinearGradient(x, y, x, y + btnH);
        bgGrad.addColorStop(0, 'rgba(35, 35, 55, 0.8)');
        bgGrad.addColorStop(1, 'rgba(20, 20, 40, 0.9)');
        
        ctx.fillStyle = bgGrad;
        this._drawRoundedRect(ctx, x, y, btnW, btnH, 8, bgGrad);
        
        ctx.strokeStyle = 'rgba(201, 160, 80, 0.4)';
        ctx.lineWidth = 1.5;
        this._drawRoundedRect(ctx, x + 1, y + 1, btnW - 2, btnH - 2, 7, null, true);
        
        const textGrad = ctx.createLinearGradient(x, y, x + btnW, y);
        textGrad.addColorStop(0, '#888');
        textGrad.addColorStop(0.5, '#aaa');
        textGrad.addColorStop(1, '#888');
        
        ctx.fillStyle = textGrad;
        ctx.font = 'bold 18px "Microsoft YaHei", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('← 返回主菜单', x + btnW/2, y + btnH/2);
        
        ctx.restore();
        
        this._backBtn = { x, y, w: btnW, h: btnH };
    }

    _renderVersion(ctx, w, h) {
        ctx.save();
        ctx.fillStyle = 'rgba(100, 100, 120, 0.4)';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('v1.0.0  |  © 2026', w/2, h - 20);
        ctx.restore();
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

    onMouseDown(x, y) {
        this.cards.forEach(card => {
            if (x >= card.x && x <= card.x + card.width &&
                y >= card.y && y <= card.y + card.height) {
                this.onSelectPeriod(card.id);
            }
        });
        
        if (this._backBtn) {
            if (x >= this._backBtn.x && x <= this._backBtn.x + this._backBtn.w &&
                y >= this._backBtn.y && y <= this._backBtn.y + this._backBtn.h) {
                this.onBack();
            }
        }
    }

    onMouseMove(x, y) {
        this.cards.forEach(card => {
            card.isHovered = x >= card.x && x <= card.x + card.width &&
                           y >= card.y && y <= card.y + card.height;
        });
    }

    onMouseUp(x, y) {
    }
}
