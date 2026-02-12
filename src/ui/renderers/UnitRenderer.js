/**
 * 单位渲染器
 * 负责渲染战斗单位
 */

export class UnitRenderer {
    constructor(ctx) {
        this.ctx = ctx;
        this.cellSize = 40;
    }

    /**
     * 渲染单位
     */
    renderUnit(unit, offsetX, offsetY) {
        const x = offsetX + unit.x * this.cellSize + this.cellSize / 2;
        const y = offsetY + unit.y * this.cellSize + this.cellSize / 2;

        // 绘制单位圆圈
        this.ctx.beginPath();
        this.ctx.arc(x, y, 15, 0, Math.PI * 2);
        
        // 根据阵营设置颜色
        this.ctx.fillStyle = unit.side === 'attacker' ? '#4444ff' : '#ff4444';
        this.ctx.fill();

        // 绘制边框
        this.ctx.strokeStyle = '#ffffff';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();

        // 绘制单位内部图标（根据兵种）
        this.renderUnitIcon(unit, x, y);

        // 绘制单位名称
        this.renderUnitName(unit, x, y - 22);

        // 绘制兵力
        this.renderUnitArms(unit, x, y + 22);

        // 绘制状态效果
        if (unit.state > 0) {
            this.renderStateEffect(unit, x, y);
        }
    }

    /**
     * 渲染单位图标
     */
    renderUnitIcon(unit, x, y) {
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = 'bold 12px Microsoft YaHei';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';

        const icons = ['骑', '步', '弓', '水', '极', '玄'];
        const icon = icons[unit.armsType] || '?';
        this.ctx.fillText(icon, x, y);
    }

    /**
     * 渲染单位名称
     */
    renderUnitName(unit, x, y) {
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '10px Microsoft YaHei';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'bottom';

        // 文字阴影
        this.ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
        this.ctx.shadowBlur = 3;
        this.ctx.fillText(unit.personName, x, y);
        this.ctx.shadowBlur = 0;
    }

    /**
     * 渲染兵力
     */
    renderUnitArms(unit, x, y) {
        this.ctx.fillStyle = unit.arms > unit.maxArms * 0.3 ? '#44ff44' : '#ff4444';
        this.ctx.font = 'bold 10px Microsoft YaHei';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'top';

        this.ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
        this.ctx.shadowBlur = 3;
        this.ctx.fillText(unit.arms.toString(), x, y);
        this.ctx.shadowBlur = 0;
    }

    /**
     * 渲染状态效果
     */
    renderStateEffect(unit, x, y) {
        const stateColors = ['#ffffff', '#ff4444', '#4444ff', '#ffff44', '#ff44ff', '#44ffff', '#ff8844', '#888888'];
        const color = stateColors[unit.state] || '#ffffff';

        // 绘制状态指示圈
        this.ctx.beginPath();
        this.ctx.arc(x + 12, y - 12, 5, 0, Math.PI * 2);
        this.ctx.fillStyle = color;
        this.ctx.fill();
    }

    /**
     * 渲染选中效果
     */
    renderSelection(unit, offsetX, offsetY) {
        const x = offsetX + unit.x * this.cellSize + this.cellSize / 2;
        const y = offsetY + unit.y * this.cellSize + this.cellSize / 2;

        // 外圈发光
        this.ctx.beginPath();
        this.ctx.arc(x, y, 18, 0, Math.PI * 2);
        this.ctx.strokeStyle = '#ffd700';
        this.ctx.lineWidth = 3;
        this.ctx.stroke();
    }

    /**
     * 渲染可移动区域
     */
    renderMoveableArea(cells, offsetX, offsetY) {
        cells.forEach(cell => {
            const x = offsetX + cell.x * this.cellSize;
            const y = offsetY + cell.y * this.cellSize;

            this.ctx.fillStyle = 'rgba(68, 255, 68, 0.3)';
            this.ctx.fillRect(x, y, this.cellSize, this.cellSize);
        });
    }

    /**
     * 渲染攻击范围
     */
    renderAttackRange(cells, offsetX, offsetY) {
        cells.forEach(cell => {
            const x = offsetX + cell.x * this.cellSize;
            const y = offsetY + cell.y * this.cellSize;

            this.ctx.fillStyle = 'rgba(255, 68, 68, 0.3)';
            this.ctx.fillRect(x, y, this.cellSize, this.cellSize);
        });
    }
}
