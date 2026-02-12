/**
 * 城市渲染器
 * 负责渲染城市和相关UI
 */

export class CityRenderer {
    constructor(ctx) {
        this.ctx = ctx;
    }

    /**
     * 渲染城市
     */
    renderCity(city, isSelected = false) {
        const x = city.screenX;
        const y = city.screenY;

        // 城市圆圈
        this.ctx.beginPath();
        this.ctx.arc(x, y, isSelected ? 15 : 12, 0, Math.PI * 2);

        // 根据归属设置颜色
        const color = this.getBelongColor(city.belong);
        this.ctx.fillStyle = color;
        this.ctx.fill();

        // 选中高亮
        if (isSelected) {
            this.ctx.strokeStyle = '#ffffff';
            this.ctx.lineWidth = 3;
            this.ctx.stroke();

            // 外发光效果
            this.ctx.shadowColor = color;
            this.ctx.shadowBlur = 15;
            this.ctx.stroke();
            this.ctx.shadowBlur = 0;
        }

        // 城市名称
        this.renderCityName(city, x, y + 25);

        // 太守标识
        if (city.satrapId >= 0) {
            this.renderSatrapIndicator(x, y - 20);
        }
    }

    /**
     * 获取归属颜色
     */
    getBelongColor(belong) {
        if (belong === 0) return '#888888';
        
        const colors = [
            '#ff4444', '#4444ff', '#44ff44',
            '#ffff44', '#ff44ff', '#44ffff',
            '#ff8844', '#8844ff', '#44ff88'
        ];
        return colors[belong % colors.length];
    }

    /**
     * 渲染城市名称
     */
    renderCityName(city, x, y) {
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = 'bold 12px Microsoft YaHei';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'top';

        // 文字阴影
        this.ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
        this.ctx.shadowBlur = 4;
        this.ctx.fillText(city.name, x, y);
        this.ctx.shadowBlur = 0;
    }

    /**
     * 渲染太守标识
     */
    renderSatrapIndicator(x, y) {
        this.ctx.fillStyle = '#ffd700';
        this.ctx.beginPath();
        this.ctx.moveTo(x, y);
        this.ctx.lineTo(x - 5, y + 8);
        this.ctx.lineTo(x + 5, y + 8);
        this.ctx.closePath();
        this.ctx.fill();
    }

    /**
     * 渲染城市信息面板
     */
    renderCityPanel(city, x, y, width, height) {
        // 面板背景
        this.ctx.fillStyle = 'rgba(45, 45, 45, 0.95)';
        this.ctx.fillRect(x, y, width, height);

        // 边框
        this.ctx.strokeStyle = '#4a4a4a';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(x, y, width, height);

        // 标题
        this.renderPanelTitle(city.name, x + width / 2, y + 30);

        // 信息项
        const info = [
            { label: '农业', value: `${city.farming}/${city.farmingLimit}` },
            { label: '商业', value: `${city.commerce}/${city.commerceLimit}` },
            { label: '人口', value: city.population.toString() },
            { label: '民忠', value: city.peopleDevotion.toString() }
        ];

        let currentY = y + 70;
        info.forEach(item => {
            this.renderInfoRow(item.label, item.value, x + 15, currentY);
            currentY += 30;
        });
    }

    /**
     * 渲染面板标题
     */
    renderPanelTitle(text, x, y) {
        this.ctx.fillStyle = '#ffd700';
        this.ctx.font = 'bold 18px Microsoft YaHei';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(text, x, y);
    }

    /**
     * 渲染信息行
     */
    renderInfoRow(label, value, x, y) {
        this.ctx.fillStyle = '#aaaaaa';
        this.ctx.font = '14px Microsoft YaHei';
        this.ctx.textAlign = 'left';
        this.ctx.fillText(`${label}:`, x, y);

        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillText(value, x + 70, y);
    }
}
