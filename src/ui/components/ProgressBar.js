/**
 * 进度条组件
 */

export class ProgressBar {
    constructor(options = {}) {
        this.x = options.x || 0;
        this.y = options.y || 0;
        this.width = options.width || 200;
        this.height = options.height || 20;
        this.visible = options.visible !== undefined ? options.visible : true;
        
        this.value = options.value || 0;
        this.maxValue = options.maxValue || 100;
        this.showText = options.showText !== undefined ? options.showText : true;
        this.label = options.label || '';
        
        // 样式
        this.style = {
            backgroundColor: options.backgroundColor || '#333333',
            fillColor: options.fillColor || '#4CAF50',
            borderColor: options.borderColor || '#4a4a4a',
            borderWidth: options.borderWidth || 1,
            textColor: options.textColor || '#ffffff',
            fontSize: options.fontSize || 12,
            fontFamily: options.fontFamily || 'Microsoft YaHei'
        };
    }

    /**
     * 设置值
     */
    setValue(value) {
        this.value = Math.max(0, Math.min(value, this.maxValue));
    }

    /**
     * 设置最大值
     */
    setMaxValue(maxValue) {
        this.maxValue = maxValue;
        this.value = Math.min(this.value, this.maxValue);
    }

    /**
     * 获取百分比
     */
    getPercentage() {
        if (this.maxValue === 0) return 0;
        return (this.value / this.maxValue) * 100;
    }

    /**
     * 渲染进度条
     */
    render(ctx) {
        if (!this.visible) return;

        ctx.save();

        // 绘制背景
        ctx.fillStyle = this.style.backgroundColor;
        ctx.fillRect(this.x, this.y, this.width, this.height);

        // 绘制进度
        const percentage = this.getPercentage();
        const fillWidth = (this.width * percentage) / 100;
        
        ctx.fillStyle = this.style.fillColor;
        ctx.fillRect(this.x, this.y, fillWidth, this.height);

        // 绘制边框
        if (this.style.borderWidth > 0) {
            ctx.strokeStyle = this.style.borderColor;
            ctx.lineWidth = this.style.borderWidth;
            ctx.strokeRect(this.x, this.y, this.width, this.height);
        }

        // 绘制文本
        if (this.showText) {
            ctx.fillStyle = this.style.textColor;
            ctx.font = `${this.style.fontSize}px ${this.style.fontFamily}`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            const text = this.label 
                ? `${this.label}: ${Math.floor(this.value)}/${this.maxValue}`
                : `${Math.floor(percentage)}%`;
            
            ctx.fillText(
                text,
                this.x + this.width / 2,
                this.y + this.height / 2
            );
        }

        ctx.restore();
    }

    /**
     * 设置位置
     */
    setPosition(x, y) {
        this.x = x;
        this.y = y;
    }

    /**
     * 设置尺寸
     */
    setSize(width, height) {
        this.width = width;
        this.height = height;
    }
}
