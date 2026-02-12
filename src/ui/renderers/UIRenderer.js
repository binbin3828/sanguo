/**
 * UI渲染器
 * 负责渲染通用UI元素
 */

export class UIRenderer {
    constructor(ctx) {
        this.ctx = ctx;
    }

    /**
     * 渲染文本
     */
    renderText(text, x, y, options = {}) {
        this.ctx.save();
        
        this.ctx.fillStyle = options.color || '#ffffff';
        this.ctx.font = `${options.bold ? 'bold ' : ''}${options.size || 14}px ${options.font || 'Microsoft YaHei'}`;
        this.ctx.textAlign = options.align || 'left';
        this.ctx.textBaseline = options.baseline || 'top';
        
        if (options.shadow) {
            this.ctx.shadowColor = options.shadowColor || 'rgba(0, 0, 0, 0.8)';
            this.ctx.shadowBlur = options.shadowBlur || 4;
        }
        
        this.ctx.fillText(text, x, y);
        this.ctx.restore();
    }

    /**
     * 渲染矩形
     */
    renderRect(x, y, width, height, options = {}) {
        this.ctx.save();
        
        if (options.fill) {
            this.ctx.fillStyle = options.fillColor || '#333333';
            this.ctx.fillRect(x, y, width, height);
        }
        
        if (options.stroke) {
            this.ctx.strokeStyle = options.strokeColor || '#4a4a4a';
            this.ctx.lineWidth = options.lineWidth || 1;
            this.ctx.strokeRect(x, y, width, height);
        }
        
        this.ctx.restore();
    }

    /**
     * 渲染圆角矩形
     */
    renderRoundRect(x, y, width, height, radius, options = {}) {
        this.ctx.save();
        
        this.ctx.beginPath();
        this.ctx.roundRect(x, y, width, height, radius);
        
        if (options.fill) {
            this.ctx.fillStyle = options.fillColor || '#333333';
            this.ctx.fill();
        }
        
        if (options.stroke) {
            this.ctx.strokeStyle = options.strokeColor || '#4a4a4a';
            this.ctx.lineWidth = options.lineWidth || 1;
            this.ctx.stroke();
        }
        
        this.ctx.restore();
    }

    /**
     * 渲染进度条
     */
    renderProgressBar(x, y, width, height, value, maxValue, options = {}) {
        const percentage = Math.max(0, Math.min(value / maxValue, 1));
        
        // 背景
        this.renderRect(x, y, width, height, {
            fill: true,
            fillColor: options.backgroundColor || '#333333'
        });
        
        // 进度
        const fillWidth = width * percentage;
        const fillColor = options.fillColor || '#4CAF50';
        
        this.ctx.save();
        this.ctx.fillStyle = fillColor;
        this.ctx.fillRect(x, y, fillWidth, height);
        this.ctx.restore();
        
        // 边框
        this.renderRect(x, y, width, height, {
            stroke: true,
            strokeColor: options.borderColor || '#4a4a4a'
        });
        
        // 文字
        if (options.showText !== false) {
            const text = options.text || `${Math.floor(value)}/${maxValue}`;
            this.renderText(text, x + width / 2, y + height / 2, {
                align: 'center',
                baseline: 'middle',
                size: options.fontSize || 12,
                color: options.textColor || '#ffffff'
            });
        }
    }

    /**
     * 渲染图标
     */
    renderIcon(type, x, y, size = 20) {
        this.ctx.save();
        
        const icons = {
            gold: { color: '#ffd700', shape: 'circle' },
            food: { color: '#8b4513', shape: 'square' },
            people: { color: '#4444ff', shape: 'circle' },
            army: { color: '#ff4444', shape: 'triangle' },
            city: { color: '#888888', shape: 'square' }
        };
        
        const icon = icons[type] || icons.city;
        
        this.ctx.fillStyle = icon.color;
        
        switch (icon.shape) {
            case 'circle':
                this.ctx.beginPath();
                this.ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
                this.ctx.fill();
                break;
            case 'square':
                this.ctx.fillRect(x, y, size, size);
                break;
            case 'triangle':
                this.ctx.beginPath();
                this.ctx.moveTo(x + size / 2, y);
                this.ctx.lineTo(x + size, y + size);
                this.ctx.lineTo(x, y + size);
                this.ctx.closePath();
                this.ctx.fill();
                break;
        }
        
        this.ctx.restore();
    }

    /**
     * 渲染提示信息
     */
    renderTooltip(x, y, text, options = {}) {
        const padding = 8;
        const lineHeight = 20;
        
        // 计算尺寸
        this.ctx.font = '12px Microsoft YaHei';
        const lines = text.split('\n');
        const maxWidth = Math.max(...lines.map(line => this.ctx.measureText(line).width));
        const width = maxWidth + padding * 2;
        const height = lines.length * lineHeight + padding * 2;
        
        // 背景
        this.renderRoundRect(x, y, width, height, 4, {
            fill: true,
            fillColor: 'rgba(0, 0, 0, 0.9)',
            stroke: true,
            strokeColor: '#666666'
        });
        
        // 文字
        this.ctx.save();
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '12px Microsoft YaHei';
        this.ctx.textAlign = 'left';
        this.ctx.textBaseline = 'top';
        
        lines.forEach((line, index) => {
            this.ctx.fillText(line, x + padding, y + padding + index * lineHeight);
        });
        
        this.ctx.restore();
    }
}
