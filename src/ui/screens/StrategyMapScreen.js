/**
 * 战略地图界面
 * 显示所有城市和势力分布
 */

import { Button } from '../components/Button.js';
import { Panel } from '../components/Panel.js';

export class StrategyMapScreen {
    constructor(engine) {
        this.engine = engine;
        this.eventBus = engine.eventBus;
        
        this.cities = [];
        this.selectedCity = null;
        this.camera = { x: 0, y: 0, zoom: 1 };
        
        this._initUI();
    }

    /**
     * 初始化UI
     */
    _initUI() {
        // 城市信息面板
        this.cityPanel = new Panel({
            x: 800,
            y: 50,
            width: 200,
            height: 300,
            title: '城市信息',
            visible: false
        });

        // 功能按钮
        this.nextTurnButton = new Button({
            x: 900,
            y: 700,
            width: 100,
            height: 40,
            text: '下一回合',
            onClick: () => this.onNextTurn()
        });

        this.menuButton = new Button({
            x: 50,
            y: 50,
            width: 80,
            height: 35,
            text: '菜单',
            onClick: () => this.onMenu()
        });
    }

    /**
     * 设置城市数据
     */
    setCities(cities) {
        this.cities = cities.map(city => ({
            ...city,
            screenX: this.getCityScreenX(city),
            screenY: this.getCityScreenY(city)
        }));
    }

    /**
     * 获取城市屏幕坐标X
     */
    getCityScreenX(city) {
        // 简化的坐标映射，实际需要根据实际地图
        const positions = [
            [100, 100], [300, 80], [500, 60], [700, 80], [900, 100],
            [150, 200], [350, 180], [550, 160], [750, 180], [950, 200],
            [200, 300], [400, 280], [600, 260], [800, 280], [1000, 300],
            [120, 400], [320, 380], [520, 360], [720, 380], [920, 400],
            [180, 500], [380, 480], [580, 460], [780, 480], [980, 500],
            [250, 600], [450, 580], [650, 560], [850, 580]
        ];
        const pos = positions[city.id % positions.length];
        return pos[0];
    }

    /**
     * 获取城市屏幕坐标Y
     */
    getCityScreenY(city) {
        const positions = [
            [100, 100], [300, 80], [500, 60], [700, 80], [900, 100],
            [150, 200], [350, 180], [550, 160], [750, 180], [950, 200],
            [200, 300], [400, 280], [600, 260], [800, 280], [1000, 300],
            [120, 400], [320, 380], [520, 360], [720, 380], [920, 400],
            [180, 500], [380, 480], [580, 460], [780, 480], [980, 500],
            [250, 600], [450, 580], [650, 560], [850, 580]
        ];
        const pos = positions[city.id % positions.length];
        return pos[1];
    }

    /**
     * 选择城市
     */
    onSelectCity(city) {
        this.selectedCity = city;
        this.cityPanel.visible = true;
        
        if (this.eventBus) {
            this.eventBus.emit('city.selected', city);
        }
    }

    /**
     * 进入城市
     */
    onEnterCity() {
        if (this.selectedCity && this.eventBus) {
            this.eventBus.emit('city.enter', this.selectedCity);
            this.eventBus.emit('screen.change', 'City');
        }
    }

    /**
     * 下一回合
     */
    onNextTurn() {
        if (this.eventBus) {
            this.eventBus.emit('turn.next');
        }
    }

    /**
     * 打开菜单
     */
    onMenu() {
        if (this.eventBus) {
            this.eventBus.emit('menu.open');
        }
    }

    /**
     * 渲染
     */
    render(ctx) {
        // 背景
        ctx.fillStyle = '#2d4a22'; // 地图绿色背景
        ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

        // 绘制网格（简化版）
        this.renderGrid(ctx);

        // 绘制城市连接线
        this.renderConnections(ctx);

        // 绘制城市
        this.cities.forEach(city => this.renderCity(ctx, city));

        // 绘制UI
        this.renderUI(ctx);
    }

    /**
     * 绘制网格
     */
    renderGrid(ctx) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.lineWidth = 1;
        
        for (let x = 0; x < ctx.canvas.width; x += 50) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, ctx.canvas.height);
            ctx.stroke();
        }
        
        for (let y = 0; y < ctx.canvas.height; y += 50) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(ctx.canvas.width, y);
            ctx.stroke();
        }
    }

    /**
     * 绘制城市连接线
     */
    renderConnections(ctx) {
        ctx.strokeStyle = 'rgba(200, 180, 150, 0.3)';
        ctx.lineWidth = 2;
        
        // 简化的连接，实际需要根据城市连接关系
        // TODO: 根据实际连接关系绘制
    }

    /**
     * 绘制城市
     */
    renderCity(ctx, city) {
        const x = city.screenX;
        const y = city.screenY;
        const isSelected = this.selectedCity && this.selectedCity.id === city.id;

        // 城市圆圈
        ctx.beginPath();
        ctx.arc(x, y, isSelected ? 15 : 12, 0, Math.PI * 2);
        
        // 根据归属设置颜色
        if (city.belong === 0) {
            ctx.fillStyle = '#888888'; // 无主
        } else {
            // 不同势力不同颜色
            const colors = ['#ff4444', '#4444ff', '#44ff44', '#ffff44', '#ff44ff', '#44ffff'];
            ctx.fillStyle = colors[city.belong % colors.length];
        }
        
        ctx.fill();

        // 选中高亮
        if (isSelected) {
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 3;
            ctx.stroke();
        }

        // 城市名称
        ctx.fillStyle = '#ffffff';
        ctx.font = '12px Microsoft YaHei';
        ctx.textAlign = 'center';
        ctx.fillText(city.name, x, y + 25);
    }

    /**
     * 绘制UI
     */
    renderUI(ctx) {
        // 顶部信息栏
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, ctx.canvas.width, 40);
        
        ctx.fillStyle = '#ffd700';
        ctx.font = '18px Microsoft YaHei';
        ctx.textAlign = 'left';
        ctx.fillText('190年1月', 150, 25);
        
        // 城市信息面板
        if (this.selectedCity) {
            this.renderCityPanel(ctx);
        }

        // 按钮
        this.menuButton.render(ctx);
        this.nextTurnButton.render(ctx);
    }

    /**
     * 绘制城市信息面板
     */
    renderCityPanel(ctx) {
        const panelX = 800;
        const panelY = 50;
        const panelW = 200;
        const panelH = 250;

        // 面板背景
        ctx.fillStyle = 'rgba(45, 45, 45, 0.95)';
        ctx.fillRect(panelX, panelY, panelW, panelH);
        ctx.strokeStyle = '#4a4a4a';
        ctx.lineWidth = 2;
        ctx.strokeRect(panelX, panelY, panelW, panelH);

        // 标题
        ctx.fillStyle = '#ffd700';
        ctx.font = 'bold 18px Microsoft YaHei';
        ctx.textAlign = 'center';
        ctx.fillText(this.selectedCity.name, panelX + panelW / 2, panelY + 30);

        // 信息
        ctx.textAlign = 'left';
        ctx.font = '14px Microsoft YaHei';
        
        const info = [
            { label: '农业', value: this.selectedCity.farming },
            { label: '商业', value: this.selectedCity.commerce },
            { label: '人口', value: this.selectedCity.population },
            { label: '民忠', value: this.selectedCity.peopleDevotion }
        ];

        let y = panelY + 70;
        info.forEach(item => {
            ctx.fillStyle = '#aaaaaa';
            ctx.fillText(item.label + ':', panelX + 15, y);
            ctx.fillStyle = '#ffffff';
            ctx.fillText(item.value.toString(), panelX + 80, y);
            y += 30;
        });

        // 进入城市按钮
        const enterButton = new Button({
            x: panelX + 20,
            y: panelY + panelH - 50,
            width: 160,
            height: 35,
            text: '进入城市',
            onClick: () => this.onEnterCity()
        });
        enterButton.render(ctx);
    }

    onMouseDown(x, y) {
        // 检查是否点击城市
        this.cities.forEach(city => {
            const dx = x - city.screenX;
            const dy = y - city.screenY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist < 20) {
                this.onSelectCity(city);
            }
        });

        this.menuButton.onMouseDown(x, y);
        this.nextTurnButton.onMouseDown(x, y);
    }

    onMouseUp(x, y) {
        this.menuButton.onMouseUp(x, y);
        this.nextTurnButton.onMouseUp(x, y);
    }

    onMouseMove(x, y) {
        this.menuButton.onMouseMove(x, y);
        this.nextTurnButton.onMouseMove(x, y);
    }
}
