/**
 * 面板组件
 */

export class Panel {
    constructor(options = {}) {
        this.x = options.x || 0;
        this.y = options.y || 0;
        this.width = options.width || 200;
        this.height = options.height || 150;
        this.visible = options.visible !== undefined ? options.visible : true;
        this.title = options.title || '';
        
        // 子组件
        this.children = [];
        
        // 样式
        this.style = {
            backgroundColor: options.backgroundColor || 'rgba(45, 45, 45, 0.95)',
            borderColor: options.borderColor || '#4a4a4a',
            borderWidth: options.borderWidth || 2,
            borderRadius: options.borderRadius || 8,
            titleColor: options.titleColor || '#ffd700',
            titleHeight: options.titleHeight || 30,
            padding: options.padding || 10,
            shadowColor: options.shadowColor || 'rgba(0, 0, 0, 0.5)',
            shadowBlur: options.shadowBlur || 10
        };
    }

    /**
     * 添加子组件
     */
    addChild(child) {
        this.children.push(child);
        child.parent = this;
    }

    /**
     * 移除子组件
     */
    removeChild(child) {
        const index = this.children.indexOf(child);
        if (index > -1) {
            this.children.splice(index, 1);
            child.parent = null;
        }
    }

    /**
     * 渲染面板
     */
    render(ctx) {
        if (!this.visible) return;

        ctx.save();

        // 绘制阴影
        ctx.shadowColor = this.style.shadowColor;
        ctx.shadowBlur = this.style.shadowBlur;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 4;

        // 绘制背景
        ctx.fillStyle = this.style.backgroundColor;
        ctx.beginPath();
        ctx.roundRect(this.x, this.y, this.width, this.height, this.style.borderRadius);
        ctx.fill();

        // 重置阴影
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;

        // 绘制边框
        if (this.style.borderWidth > 0) {
            ctx.strokeStyle = this.style.borderColor;
            ctx.lineWidth = this.style.borderWidth;
            ctx.stroke();
        }

        // 绘制标题栏
        if (this.title) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
            ctx.beginPath();
            ctx.roundRect(
                this.x,
                this.y,
                this.width,
                this.style.titleHeight,
                [this.style.borderRadius, this.style.borderRadius, 0, 0]
            );
            ctx.fill();

            ctx.fillStyle = this.style.titleColor;
            ctx.font = 'bold 16px Microsoft YaHei';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(
                this.title,
                this.x + this.width / 2,
                this.y + this.style.titleHeight / 2
            );
        }

        ctx.restore();

        // 渲染子组件
        this.children.forEach(child => {
            if (child.render) {
                child.render(ctx);
            }
        });
    }

    /**
     * 处理鼠标事件
     */
    onMouseDown(x, y) {
        if (!this.visible) return false;
        
        for (let i = this.children.length - 1; i >= 0; i--) {
            if (this.children[i].onMouseDown && this.children[i].onMouseDown(x, y)) {
                return true;
            }
        }
        return this.contains(x, y);
    }

    onMouseUp(x, y) {
        if (!this.visible) return false;
        
        for (let i = this.children.length - 1; i >= 0; i--) {
            if (this.children[i].onMouseUp && this.children[i].onMouseUp(x, y)) {
                return true;
            }
        }
        return false;
    }

    onMouseMove(x, y) {
        if (!this.visible) return;
        
        this.children.forEach(child => {
            if (child.onMouseMove) {
                child.onMouseMove(x, y);
            }
        });
    }

    /**
     * 检查点是否在面板内
     */
    contains(x, y) {
        return x >= this.x && x <= this.x + this.width &&
               y >= this.y && y <= this.y + this.height;
    }

    /**
     * 获取内容区域
     */
    getContentRect() {
        return {
            x: this.x + this.style.padding,
            y: this.y + this.style.titleHeight + this.style.padding,
            width: this.width - this.style.padding * 2,
            height: this.height - this.style.titleHeight - this.style.padding * 2
        };
    }
}
