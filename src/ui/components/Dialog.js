/**
 * 对话框组件
 */

import { Panel } from './Panel.js';
import { Button } from './Button.js';

export class Dialog extends Panel {
    constructor(options = {}) {
        super(options);
        
        this.message = options.message || '';
        this.buttons = [];
        this.showCloseButton = options.showCloseButton !== undefined ? options.showCloseButton : true;
        
        // 创建按钮
        this._createButtons(options.buttons || ['确定']);
        
        // 回调
        this.onResult = options.onResult || null;
        
        // 居中显示
        this.centerInParent();
    }

    /**
     * 创建按钮
     */
    _createButtons(buttonLabels) {
        const buttonWidth = 80;
        const buttonHeight = 32;
        const buttonSpacing = 10;
        const totalWidth = buttonLabels.length * buttonWidth + (buttonLabels.length - 1) * buttonSpacing;
        const startX = this.x + (this.width - totalWidth) / 2;
        const buttonY = this.y + this.height - buttonHeight - 15;

        buttonLabels.forEach((label, index) => {
            const button = new Button({
                x: startX + index * (buttonWidth + buttonSpacing),
                y: buttonY,
                width: buttonWidth,
                height: buttonHeight,
                text: label,
                onClick: () => this.onButtonClick(label)
            });
            this.buttons.push(button);
            this.addChild(button);
        });
    }

    /**
     * 按钮点击处理
     */
    onButtonClick(label) {
        if (this.onResult) {
            this.onResult(label);
        }
        this.close();
    }

    /**
     * 关闭对话框
     */
    close() {
        this.visible = false;
        if (this.onClose) {
            this.onClose();
        }
    }

    /**
     * 显示对话框
     */
    show() {
        this.visible = true;
        this.centerInParent();
    }

    /**
     * 在父容器中居中
     */
    centerInParent() {
        // 假设父容器是1024x768
        const parentWidth = 1024;
        const parentHeight = 768;
        
        this.x = (parentWidth - this.width) / 2;
        this.y = (parentHeight - this.height) / 2;
        
        // 更新按钮位置
        this.buttons.forEach(button => {
            button.y = this.y + this.height - button.height - 15;
        });
    }

    /**
     * 渲染对话框
     */
    render(ctx) {
        if (!this.visible) return;

        // 绘制半透明背景遮罩
        ctx.save();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.restore();

        // 调用父类的渲染
        super.render(ctx);

        // 绘制消息文本
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.font = '14px Microsoft YaHei';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // 文本换行处理
        const maxWidth = this.width - 40;
        const lineHeight = 20;
        const lines = this.wrapText(ctx, this.message, maxWidth);
        const startY = this.y + this.style.titleHeight + 30;
        
        lines.forEach((line, index) => {
            ctx.fillText(
                line,
                this.x + this.width / 2,
                startY + index * lineHeight
            );
        });
        
        ctx.restore();
    }

    /**
     * 文本自动换行
     */
    wrapText(ctx, text, maxWidth) {
        const words = text.split('');
        const lines = [];
        let currentLine = words[0];

        for (let i = 1; i < words.length; i++) {
            const word = words[i];
            const width = ctx.measureText(currentLine + word).width;
            if (width < maxWidth) {
                currentLine += word;
            } else {
                lines.push(currentLine);
                currentLine = word;
            }
        }
        lines.push(currentLine);
        return lines;
    }

    /**
     * 静态方法：显示确认对话框
     */
    static confirm(options) {
        return new Dialog({
            width: 300,
            height: 150,
            title: options.title || '确认',
            message: options.message,
            buttons: options.buttons || ['确定', '取消'],
            onResult: options.onResult
        });
    }

    /**
     * 静态方法：显示警告对话框
     */
    static alert(options) {
        return new Dialog({
            width: 300,
            height: 150,
            title: options.title || '提示',
            message: options.message,
            buttons: options.buttons || ['确定'],
            onResult: options.onResult
        });
    }
}
