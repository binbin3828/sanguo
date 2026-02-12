/**
 * 君主选择界面
 */

import { Button } from '../components/Button.js';
import { ListView } from '../components/ListView.js';

export class KingSelectScreen {
    constructor(engine) {
        this.engine = engine;
        this.eventBus = engine.eventBus;
        
        this.selectedKing = null;
        this.availableKings = [];
        
        this._initUI();
    }

    /**
     * 初始化UI
     */
    _initUI() {
        // 君主列表
        this.kingList = new ListView({
            x: 100,
            y: 150,
            width: 300,
            height: 400,
            onSelect: (item) => this.onSelectKing(item)
        });

        // 返回按钮
        this.backButton = new Button({
            x: 50,
            y: 700,
            width: 100,
            height: 40,
            text: '返回',
            backgroundColor: '#666666',
            onClick: () => this.onBack()
        });

        // 确认按钮
        this.confirmButton = new Button({
            x: 874,
            y: 700,
            width: 100,
            height: 40,
            text: '确定',
            onClick: () => this.onConfirm()
        });
    }

    /**
     * 设置可用君主列表
     */
    setAvailableKings(kings) {
        this.availableKings = kings;
        this.kingList.setItems(kings.map(k => ({
            id: k.id,
            text: k.name,
            data: k
        })));
    }

    /**
     * 选择君主
     */
    onSelectKing(item) {
        this.selectedKing = item.data;
        
        if (this.eventBus) {
            this.eventBus.emit('king.selected', this.selectedKing);
        }
    }

    /**
     * 确认选择
     */
    onConfirm() {
        if (!this.selectedKing) {
            alert('请选择一位君主');
            return;
        }

        if (this.eventBus) {
            this.eventBus.emit('king.confirm', this.selectedKing);
            this.eventBus.emit('screen.change', 'StrategyMap');
        }
    }

    /**
     * 返回
     */
    onBack() {
        if (this.eventBus) {
            this.eventBus.emit('screen.change', 'PeriodSelect');
        }
    }

    /**
     * 渲染
     */
    render(ctx) {
        // 背景
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

        // 标题
        ctx.fillStyle = '#ffd700';
        ctx.font = 'bold 36px Microsoft YaHei';
        ctx.textAlign = 'center';
        ctx.fillText('选择君主', ctx.canvas.width / 2, 80);

        // 君主列表
        this.kingList.render(ctx);

        // 绘制选中君主的详细信息
        if (this.selectedKing) {
            this.renderKingInfo(ctx);
        }

        // 按钮
        this.backButton.render(ctx);
        this.confirmButton.render(ctx);
    }

    /**
     * 绘制君主信息
     */
    renderKingInfo(ctx) {
        const infoX = 450;
        const infoY = 150;
        const infoWidth = 500;
        const infoHeight = 450;

        // 面板背景
        ctx.fillStyle = 'rgba(45, 45, 45, 0.9)';
        ctx.fillRect(infoX, infoY, infoWidth, infoHeight);
        ctx.strokeStyle = '#4a4a4a';
        ctx.lineWidth = 2;
        ctx.strokeRect(infoX, infoY, infoWidth, infoHeight);

        // 君主名称
        ctx.fillStyle = '#ffd700';
        ctx.font = 'bold 32px Microsoft YaHei';
        ctx.textAlign = 'center';
        ctx.fillText(this.selectedKing.name, infoX + infoWidth / 2, infoY + 50);

        // 属性
        ctx.textAlign = 'left';
        ctx.font = '18px Microsoft YaHei';
        
        const stats = [
            { label: '武力', value: this.selectedKing.force },
            { label: '智力', value: this.selectedKing.iq },
            { label: '兵种', value: this.getArmyTypeName(this.selectedKing.armsType) }
        ];

        let y = infoY + 120;
        stats.forEach(stat => {
            ctx.fillStyle = '#aaaaaa';
            ctx.fillText(stat.label + ':', infoX + 30, y);
            ctx.fillStyle = '#ffffff';
            ctx.fillText(stat.value.toString(), infoX + 150, y);
            y += 40;
        });

        // 所属城市
        ctx.fillStyle = '#aaaaaa';
        ctx.fillText('起始城市:', infoX + 30, y);
        ctx.fillStyle = '#ffffff';
        // TODO: 显示实际城市名称
        ctx.fillText('待获取', infoX + 150, y);
    }

    /**
     * 获取兵种名称
     */
    getArmyTypeName(type) {
        const names = ['骑兵', '步兵', '弓兵', '水军', '极兵', '玄兵'];
        return names[type] || '未知';
    }

    onMouseDown(x, y) {
        this.kingList.onMouseDown(x, y);
        this.backButton.onMouseDown(x, y);
        this.confirmButton.onMouseDown(x, y);
    }

    onMouseUp(x, y) {
        this.kingList.onMouseUp(x, y);
        this.backButton.onMouseUp(x, y);
        this.confirmButton.onMouseUp(x, y);
    }

    onMouseMove(x, y) {
        this.kingList.onMouseMove(x, y);
        this.backButton.onMouseMove(x, y);
        this.confirmButton.onMouseMove(x, y);
    }

    onWheel(deltaY) {
        this.kingList.onWheel(deltaY);
    }
}
