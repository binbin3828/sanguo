/**
 * 列表视图组件
 */

import { Button } from './Button.js';

export class ListView {
    constructor(options = {}) {
        this.x = options.x || 0;
        this.y = options.y || 0;
        this.width = options.width || 200;
        this.height = options.height || 300;
        this.visible = options.visible !== undefined ? options.visible : true;
        
        this.items = options.items || [];
        this.selectedIndex = options.selectedIndex || -1;
        this.itemHeight = options.itemHeight || 30;
        
        this.onSelect = options.onSelect || null;
        this.onDoubleClick = options.onDoubleClick || null;
        
        // 滚动
        this.scrollY = 0;
        this.maxScrollY = 0;
        
        // 样式
        this.style = {
            backgroundColor: options.backgroundColor || '#2d2d2d',
            itemColor: options.itemColor || '#3d3d3d',
            selectedColor: options.selectedColor || '#4CAF50',
            hoverColor: options.hoverColor || '#4a4a4a',
            textColor: options.textColor || '#ffffff',
            selectedTextColor: options.selectedTextColor || '#ffffff',
            fontSize: options.fontSize || 14,
            fontFamily: options.fontFamily || 'Microsoft YaHei',
            borderColor: options.borderColor || '#4a4a4a',
            borderWidth: options.borderWidth || 1
        };
        
        this.hoveredIndex = -1;
    }

    /**
     * 设置数据
     */
    setItems(items) {
        this.items = items;
        this.selectedIndex = -1;
        this.scrollY = 0;
        this.updateMaxScroll();
    }

    /**
     * 更新最大滚动值
     */
    updateMaxScroll() {
        const contentHeight = this.items.length * this.itemHeight;
        this.maxScrollY = Math.max(0, contentHeight - this.height);
    }

    /**
     * 渲染列表
     */
    render(ctx) {
        if (!this.visible) return;

        ctx.save();

        // 绘制背景
        ctx.fillStyle = this.style.backgroundColor;
        ctx.fillRect(this.x, this.y, this.width, this.height);

        // 绘制边框
        if (this.style.borderWidth > 0) {
            ctx.strokeStyle = this.style.borderColor;
            ctx.lineWidth = this.style.borderWidth;
            ctx.strokeRect(this.x, this.y, this.width, this.height);
        }

        // 裁剪区域
        ctx.beginPath();
        ctx.rect(this.x, this.y, this.width, this.height);
        ctx.clip();

        // 绘制列表项
        const startIndex = Math.floor(this.scrollY / this.itemHeight);
        const endIndex = Math.min(
            startIndex + Math.ceil(this.height / this.itemHeight) + 1,
            this.items.length
        );

        for (let i = startIndex; i < endIndex; i++) {
            this.renderItem(ctx, i);
        }

        // 绘制滚动条
        if (this.maxScrollY > 0) {
            this.renderScrollbar(ctx);
        }

        ctx.restore();
    }

    /**
     * 渲染列表项
     */
    renderItem(ctx, index) {
        const itemY = this.y + index * this.itemHeight - this.scrollY;
        
        if (itemY + this.itemHeight < this.y || itemY > this.y + this.height) {
            return;
        }

        const isSelected = index === this.selectedIndex;
        const isHovered = index === this.hoveredIndex;

        // 绘制背景
        if (isSelected) {
            ctx.fillStyle = this.style.selectedColor;
        } else if (isHovered) {
            ctx.fillStyle = this.style.hoverColor;
        } else {
            ctx.fillStyle = this.style.itemColor;
        }
        ctx.fillRect(this.x, itemY, this.width, this.itemHeight);

        // 绘制文本
        ctx.fillStyle = isSelected ? this.style.selectedTextColor : this.style.textColor;
        ctx.font = `${this.style.fontSize}px ${this.style.fontFamily}`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        
        const item = this.items[index];
        const text = typeof item === 'string' ? item : item.text || item.name || '';
        ctx.fillText(text, this.x + 10, itemY + this.itemHeight / 2);
    }

    /**
     * 渲染滚动条
     */
    renderScrollbar(ctx) {
        const scrollbarWidth = 8;
        const scrollbarHeight = (this.height / (this.items.length * this.itemHeight)) * this.height;
        const scrollbarY = this.y + (this.scrollY / this.maxScrollY) * (this.height - scrollbarHeight);

        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.fillRect(
            this.x + this.width - scrollbarWidth - 2,
            scrollbarY,
            scrollbarWidth,
            scrollbarHeight
        );
    }

    /**
     * 处理鼠标按下
     */
    onMouseDown(x, y) {
        if (!this.visible || !this.contains(x, y)) return false;

        const index = this.getItemIndexAt(y);
        if (index >= 0 && index < this.items.length) {
            this.selectedIndex = index;
            
            if (this.onSelect) {
                this.onSelect(this.items[index], index);
            }
            
            return true;
        }
        
        return false;
    }

    /**
     * 处理鼠标移动
     */
    onMouseMove(x, y) {
        if (!this.visible) return;
        
        if (this.contains(x, y)) {
            this.hoveredIndex = this.getItemIndexAt(y);
        } else {
            this.hoveredIndex = -1;
        }
    }

    /**
     * 处理滚轮
     */
    onWheel(deltaY) {
        if (!this.visible) return;
        
        this.scrollY += deltaY;
        this.scrollY = Math.max(0, Math.min(this.scrollY, this.maxScrollY));
    }

    /**
     * 获取指定位置的项索引
     */
    getItemIndexAt(y) {
        const relativeY = y - this.y + this.scrollY;
        return Math.floor(relativeY / this.itemHeight);
    }

    /**
     * 检查点是否在列表内
     */
    contains(x, y) {
        return x >= this.x && x <= this.x + this.width &&
               y >= this.y && y <= this.y + this.height;
    }

    /**
     * 获取选中的项
     */
    getSelectedItem() {
        if (this.selectedIndex >= 0 && this.selectedIndex < this.items.length) {
            return this.items[this.selectedIndex];
        }
        return null;
    }
}
