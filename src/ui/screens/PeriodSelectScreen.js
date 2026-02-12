/**
 * 时期选择界面
 */

import { Button } from '../components/Button.js';
import { Panel } from '../components/Panel.js';

export class PeriodSelectScreen {
    constructor(engine) {
        this.engine = engine;
        this.eventBus = engine.eventBus;
        
        this.selectedPeriod = 1;
        this.buttons = [];
        this.backButton = null;
        
        this._initUI();
    }

    /**
     * 初始化UI
     */
    _initUI() {
        // 时期选择按钮
        const periods = [
            { id: 1, name: '董卓弄权', year: '189年', desc: '汉末乱世初期' },
            { id: 2, name: '曹操崛起', year: '196年', desc: '中原争霸' },
            { id: 3, name: '赤壁之战', year: '208年', desc: '三强鼎立' },
            { id: 4, name: '三国鼎立', year: '220年', desc: '魏蜀吴三国正式成立' }
        ];

        const startX = 150;
        const startY = 200;
        const width = 300;
        const height = 80;
        const spacing = 30;

        periods.forEach((period, index) => {
            const button = new Button({
                x: startX + (index % 2) * (width + spacing),
                y: startY + Math.floor(index / 2) * (height + spacing),
                width: width,
                height: height,
                text: period.name,
                onClick: () => this.onSelectPeriod(period.id)
            });
            button.periodData = period;
            this.buttons.push(button);
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
     * 选择时期
     */
    onSelectPeriod(periodId) {
        this.selectedPeriod = periodId;
        
        // 更新按钮选中状态
        this.buttons.forEach(button => {
            button.style.backgroundColor = button.periodData.id === periodId 
                ? '#45a049' 
                : '#4CAF50';
        });

        if (this.eventBus) {
            this.eventBus.emit('period.selected', periodId);
        }
    }

    /**
     * 确认选择
     */
    onConfirm() {
        if (this.eventBus) {
            this.eventBus.emit('period.confirm', this.selectedPeriod);
            this.eventBus.emit('screen.change', 'KingSelect');
        }
    }

    /**
     * 返回
     */
    onBack() {
        if (this.eventBus) {
            this.eventBus.emit('screen.change', 'MainMenu');
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
        ctx.fillText('选择历史时期', ctx.canvas.width / 2, 80);

        // 绘制时期按钮
        this.buttons.forEach(button => {
            button.render(ctx);
            
            // 绘制时期信息
            ctx.fillStyle = '#aaaaaa';
            ctx.font = '14px Microsoft YaHei';
            ctx.textAlign = 'center';
            ctx.fillText(
                button.periodData.year + ' - ' + button.periodData.desc,
                button.x + button.width / 2,
                button.y + button.height + 20
            );
        });

        // 绘制选中时期的详细信息
        this.renderPeriodInfo(ctx);

        // 返回和确认按钮
        this.backButton.render(ctx);
        this.confirmButton.render(ctx);
    }

    /**
     * 绘制时期详细信息
     */
    renderPeriodInfo(ctx) {
        const selectedButton = this.buttons.find(b => b.periodData.id === this.selectedPeriod);
        if (!selectedButton) return;

        const infoX = 700;
        const infoY = 200;
        const infoWidth = 280;
        const infoHeight = 300;

        // 信息面板背景
        ctx.fillStyle = 'rgba(45, 45, 45, 0.9)';
        ctx.fillRect(infoX, infoY, infoWidth, infoHeight);
        ctx.strokeStyle = '#4a4a4a';
        ctx.strokeRect(infoX, infoY, infoWidth, infoHeight);

        // 标题
        ctx.fillStyle = '#ffd700';
        ctx.font = 'bold 24px Microsoft YaHei';
        ctx.textAlign = 'center';
        ctx.fillText(selectedButton.periodData.name, infoX + infoWidth / 2, infoY + 40);

        // 年份
        ctx.fillStyle = '#ffffff';
        ctx.font = '18px Microsoft YaHei';
        ctx.fillText(selectedButton.periodData.year, infoX + infoWidth / 2, infoY + 80);

        // 描述
        ctx.fillStyle = '#cccccc';
        ctx.font = '14px Microsoft YaHei';
        ctx.fillText(selectedButton.periodData.desc, infoX + infoWidth / 2, infoY + 110);

        // 特色信息（简化版）
        ctx.fillStyle = '#aaaaaa';
        ctx.font = '12px Microsoft YaHei';
        ctx.textAlign = 'left';
        
        const features = this.getPeriodFeatures(this.selectedPeriod);
        let y = infoY + 150;
        features.forEach(feature => {
            ctx.fillText('• ' + feature, infoX + 20, y);
            y += 25;
        });
    }

    /**
     * 获取时期特色
     */
    getPeriodFeatures(periodId) {
        const features = {
            1: ['吕布在董卓麾下', '诸葛亮尚未登场', '群雄割据'],
            2: ['曹操迎献帝', '孙策统一江东', '郭嘉等谋士登场'],
            3: ['诸葛亮登场', '三足鼎立初现', '赤壁之战即将爆发'],
            4: ['魏蜀吴正式建国', '三国鼎立形成', '新一代将领登场']
        };
        return features[periodId] || [];
    }

    onMouseDown(x, y) {
        this.buttons.forEach(b => b.onMouseDown(x, y));
        this.backButton.onMouseDown(x, y);
        this.confirmButton.onMouseDown(x, y);
    }

    onMouseUp(x, y) {
        this.buttons.forEach(b => b.onMouseUp(x, y));
        this.backButton.onMouseUp(x, y);
        this.confirmButton.onMouseUp(x, y);
    }

    onMouseMove(x, y) {
        this.buttons.forEach(b => b.onMouseMove(x, y));
        this.backButton.onMouseMove(x, y);
        this.confirmButton.onMouseMove(x, y);
    }
}
