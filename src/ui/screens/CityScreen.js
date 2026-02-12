/**
 * 城市界面
 * 显示城市详细信息，执行内政、外交、军事指令
 */

import { Button } from '../components/Button.js';
import { Panel } from '../components/Panel.js';
import { ListView } from '../components/ListView.js';

export class CityScreen {
    constructor(engine) {
        this.engine = engine;
        this.eventBus = engine.eventBus;
        this.city = null;
        this.currentTab = 'internal'; // internal, diplomacy, military
        
        this._initUI();
    }

    _initUI() {
        // 返回按钮
        this.backButton = new Button({
            x: 50, y: 700, width: 100, height: 40,
            text: '返回地图',
            onClick: () => this.onBack()
        });

        // 标签页按钮
        this.tabButtons = {
            internal: new Button({
                x: 200, y: 100, width: 100, height: 35,
                text: '内政',
                onClick: () => this.switchTab('internal')
            }),
            diplomacy: new Button({
                x: 310, y: 100, width: 100, height: 35,
                text: '外交',
                onClick: () => this.switchTab('diplomacy')
            }),
            military: new Button({
                x: 420, y: 100, width: 100, height: 35,
                text: '军事',
                onClick: () => this.switchTab('military')
            })
        };
    }

    setCity(city) {
        this.city = city;
    }

    switchTab(tab) {
        this.currentTab = tab;
    }

    onBack() {
        if (this.eventBus) {
            this.eventBus.emit('screen.change', 'StrategyMap');
        }
    }

    render(ctx) {
        // 背景
        ctx.fillStyle = '#2d2d2d';
        ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

        if (!this.city) return;

        // 标题
        ctx.fillStyle = '#ffd700';
        ctx.font = 'bold 28px Microsoft YaHei';
        ctx.textAlign = 'center';
        ctx.fillText(this.city.name, ctx.canvas.width / 2, 50);

        // 城市基本信息
        this.renderCityInfo(ctx);

        // 标签页按钮
        Object.values(this.tabButtons).forEach(btn => btn.render(ctx));

        // 根据当前标签绘制内容
        switch(this.currentTab) {
            case 'internal':
                this.renderInternalTab(ctx);
                break;
            case 'diplomacy':
                this.renderDiplomacyTab(ctx);
                break;
            case 'military':
                this.renderMilitaryTab(ctx);
                break;
        }

        // 返回按钮
        this.backButton.render(ctx);
    }

    renderCityInfo(ctx) {
        const infoX = 50;
        const infoY = 150;
        
        ctx.fillStyle = '#aaaaaa';
        ctx.font = '14px Microsoft YaHei';
        ctx.textAlign = 'left';
        
        const info = [
            `农业: ${this.city.farming}/${this.city.farmingLimit}`,
            `商业: ${this.city.commerce}/${this.city.commerceLimit}`,
            `人口: ${this.city.population}/${this.city.populationLimit}`,
            `民忠: ${this.city.peopleDevotion}`,
            `防灾: ${this.city.avoidCalamity}`,
            `金钱: ${this.city.money}`,
            `粮食: ${this.city.food}`,
            `后备兵: ${this.city.mothballArms}`
        ];
        
        let y = infoY;
        info.forEach(line => {
            ctx.fillText(line, infoX, y);
            y += 25;
        });
    }

    renderInternalTab(ctx) {
        // 内政指令列表
        const commands = [
            '开垦', '招商', '搜寻', '治理', '出巡',
            '招降', '处斩', '流放', '赏赐', '没收',
            '交易', '宴请', '输送', '移动'
        ];
        
        // 简化的指令按钮网格
        ctx.fillStyle = '#aaaaaa';
        ctx.fillText('内政指令', 300, 200);
    }

    renderDiplomacyTab(ctx) {
        ctx.fillStyle = '#aaaaaa';
        ctx.fillText('外交指令', 300, 200);
    }

    renderMilitaryTab(ctx) {
        ctx.fillStyle = '#aaaaaa';
        ctx.fillText('军事指令', 300, 200);
    }

    onMouseDown(x, y) {
        this.backButton.onMouseDown(x, y);
        Object.values(this.tabButtons).forEach(btn => btn.onMouseDown(x, y));
    }

    onMouseUp(x, y) {
        this.backButton.onMouseUp(x, y);
        Object.values(this.tabButtons).forEach(btn => btn.onMouseUp(x, y));
    }

    onMouseMove(x, y) {
        this.backButton.onMouseMove(x, y);
        Object.values(this.tabButtons).forEach(btn => btn.onMouseMove(x, y));
    }
}
