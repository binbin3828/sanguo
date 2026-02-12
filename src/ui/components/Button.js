/**
 * 按钮组件
 */

export class Button {
    constructor(options = {}) {
        this.x = options.x || 0;
        this.y = options.y || 0;
        this.width = options.width || 100;
        this.height = options.height || 40;
        this.text = options.text || '';
        this.enabled = options.enabled !== undefined ? options.enabled : true;
        this.visible = options.visible !== undefined ? options.visible : true;
        
        this.onClick = options.onClick || null;
        this.onHover = options.onHover || null;
        
        this.isHovered = false;
        this.isPressed = false;
        
        // 样式
        this.style = {
            backgroundColor: options.backgroundColor || '#4CAF50',
            hoverColor: options.hoverColor || '#45a049',
            pressedColor: options.pressedColor || '#3d8b40',
            textColor: options.textColor || '#ffffff',
            fontSize: options.fontSize || 16,
            fontFamily: options.fontFamily || 'Microsoft YaHei',
            borderRadius: options.borderRadius || 4,
            borderColor: options.borderColor || '#388E3C',
            borderWidth: options.borderWidth || 1
        };
    }

    /**
     * 渲染按钮
     */
    render(ctx) {
        if (!this.visible) return;

        ctx.save();

        // 设置颜色
        let bgColor = this.style.backgroundColor;
        if (!this.enabled) {
            bgColor = '#cccccc';
        } else if (this.isPressed) {
            bgColor = this.style.pressedColor;
        } else if (this.isHovered) {
            bgColor = this.style.hoverColor;
        }

        // 绘制背景
        ctx.fillStyle = bgColor;
        ctx.beginPath();
        ctx.roundRect(this.x, this.y, this.width, this.height, this.style.borderRadius);
        ctx.fill();

        // 绘制边框
        if (this.style.borderWidth > 0) {
            ctx.strokeStyle = this.style.borderColor;
            ctx.lineWidth = this.style.borderWidth;
            ctx.stroke();
        }

        // 绘制文字
        ctx.fillStyle = this.enabled ? this.style.textColor : '#666666';
        ctx.font = `${this.style.fontSize}px ${this.style.fontFamily}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(
            this.text,
            this.x + this.width / 2,
            this.y + this.height / 2
        );

        ctx.restore();
    }

    /**
     * 处理鼠标按下
     */
    onMouseDown(mouseX, mouseY) {
        if (!this.enabled || !this.visible) return false;
        
        if (this.contains(mouseX, mouseY)) {
            this.isPressed = true;
            return true;
        }
        return false;
    }

    /**
     * 处理鼠标释放
     */
    onMouseUp(mouseX, mouseY) {
        if (!this.enabled || !this.visible) return false;
        
        const wasPressed = this.isPressed;
        this.isPressed = false;
        
        if (wasPressed && this.contains(mouseX, mouseY)) {
            if (this.onClick) {
                this.onClick();
            }
            return true;
        }
        return false;
    }

    /**
     * 处理鼠标移动
     */
    onMouseMove(mouseX, mouseY) {
        if (!this.enabled || !this.visible) return;
        
        const wasHovered = this.isHovered;
        this.isHovered = this.contains(mouseX, mouseY);
        
        if (this.isHovered && !wasHovered && this.onHover) {
            this.onHover();
        }
    }

    /**
     * 检查点是否在按钮内
     */
    contains(x, y) {
        return x >= this.x && x <= this.x + this.width &&
               y >= this.y && y <= this.y + this.height;
    }

    /**
     * 设置位置
     */
    setPosition(x, y) {
        this.x = x;
        this.y = y;
    }

    /**
     * 设置文本
     */
    setText(text) {
        this.text = text;
    }

    /**
     * 设置启用状态
     */
    setEnabled(enabled) {
        this.enabled = enabled;
    }
}
