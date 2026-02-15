/**
 * 战略地图界面
 * 显示完整地图和所有城池，支持点击己方城池进入城市指令系统
 */

import { Button } from '../components/Button.js';

export class StrategyMapScreen {
    constructor(engine) {
        this.engine = engine;
        this.eventBus = engine.eventBus;
        this.stateManager = engine.stateManager;
        
        this.cities = [];
        this.selectedCity = null;
        this.playerKing = null;
        this.periodData = null;
        this.year = 190;
        this.month = 1;
        
        // 地图相关
        this.mapImage = null;
        this.mapLoaded = false;
        this.mapX = 20; // 左边距
        this.mapY = 80; // 上方留出更大空隙（信息栏40 + 间距40）
        this.mapWidth = 984; // 1024 - 左右边距20*2
        this.mapHeight = 620; // 768 - 80(上边距) - 68(底部留白)
        this.mapBorderColor = '#c9a050'; // 金色边框
        this.mapBorderWidth = 3;
        
        // 城池图标
        this.cityIcons = {};
        this.iconsLoaded = {};
        
        // 城市坐标映射(基于实际地图)
        this.cityCoordinates = {
            '西凉': { x: 70, y: 65 },
            '北平': { x: 450, y: 55 },
            '襄平': { x: 550, y: 40 },
            '安定': { x: 130, y: 100 },
            '晋阳': { x: 280, y: 100 },
            '平原': { x: 350, y: 115 },
            '南皮': { x: 400, y: 115 },
            '北海': { x: 490, y: 125 },
            '天水': { x: 155, y: 138 },
            '河内': { x: 220, y: 130 },
            '长安': { x: 275, y: 150 },
            '邺': { x: 350, y: 155 },
            '濮阳': { x: 405, y: 155 },
            '徐州': { x: 450, y: 160 },
            '汉中': { x: 195, y: 235 },
            '洛阳': { x: 310, y: 205 },
            '许昌': { x: 370, y: 200 },
            '小沛': { x: 450, y: 235 },
            '下邳': { x: 510, y: 230 },
            '梓潼': { x: 150, y: 268 },
            '宛城': { x: 270, y: 270 },
            '寿春': { x: 320, y: 245 },
            '建业': { x: 505, y: 275 },
            '吴': { x: 540, y: 270 },
            '成都': { x: 110, y: 320 },
            '棉竹': { x: 153, y: 314 },
            '襄阳': { x: 270, y: 335 },
            '江夏': { x: 350, y: 315 },
            '庐江': { x: 410, y: 320 },
            '会稽': { x: 520, y: 320 },
            '云南': { x: 58, y: 363 },
            '巴郡': { x: 160, y: 353 },
            '武陵': { x: 222, y: 345 },
            '长沙': { x: 380, y: 360 },
            '柴桑': { x: 465, y: 345 },
            '零陵': { x: 260, y: 390 },
            '桂阳': { x: 335, y: 405 },
            '建宁': { x: 452, y: 382 }
        };
        
        // 城市连接关系（根据坐标连接最近的城市，避免交叉，每个城市1-4个连接）
        this.cityConnections = [
            // 西北纵向线
            ['西凉', '安定'],
            ['安定', '天水'],
            ['天水', '汉中'],
            ['汉中', '梓潼'],
            ['梓潼', '成都'],
            ['成都', '云南'],
            
            // 北方横向线
            ['西凉', '晋阳'],
            ['北平', '襄平'],
            ['北平', '北海'],
            ['北平', '南皮'],
            
            // 中原纵向线（西线）
            ['天水', '河内'],
            ['天水', '汉中'],
            ['河内', '长安'],
            ['长安', '汉中'],
            ['长安', '洛阳'],
            ['长安', '宛城'],
            ['洛阳', '许昌'],
            ['许昌', '寿春'],
            ['寿春', '建业'],
            ['建业', '吴'],
            
            // 中原纵向线（东线）
            ['晋阳', '长安'],
            ['邺', '濮阳'],
            ['濮阳', '徐州'],
            ['徐州', '小沛'],
            ['小沛', '下邳'],
            
            // 中部横向连接线
            ['汉中', '宛城'],
            ['宛城', '襄阳'],
            ['襄阳', '江夏'],
            ['江夏', '庐江'],
            ['庐江', '柴桑'],
            
            // 南方纵向线
            ['成都', '巴郡'],
            ['巴郡', '武陵'],
            ['武陵', '零陵'],
            ['零陵', '桂阳'],
            ['桂阳', '建宁'],
            
            // 南方横向连接线
            ['巴郡', '棉竹'],
            ['武陵', '长沙'],
            ['长沙', '柴桑'],
            ['柴桑', '会稽'],
            
            // 补充连接（确保每个城市都有连接）
            ['平原', '南皮'],
            ['平原', '晋阳'],
            ['平原', '邺'],
            ['南皮', '濮阳'],
            ['濮阳', '许昌'],
            ['邺', '洛阳'],
            ['北海', '徐州'],
            ['梓潼', '棉竹'],
            ['襄阳', '武陵'],
            ['江夏', '长沙']
        ];
        
        // 城池归属映射
        this.cityOwnershipMap = {};
        
        // 城市信息面板
        this.showCityInfoPanel = false;
        
        // 动画
        this.animationTime = 0;
        
        this._initMap();
        this._initIcons();
        this._initUI();
    }
    
    /**
     * 初始化地图
     */
    _initMap() {
        this.mapImage = new Image();
        this.mapImage.src = 'src/assets/sanguoditu.png';
        this.mapImage.onload = () => {
            this.mapLoaded = true;
            console.log('战略地图加载完成');
        };
        this.mapImage.onerror = () => {
            console.error('战略地图加载失败');
        };
    }
    
    /**
     * 初始化城池图标
     */
    _initIcons() {
        const iconTypes = ['friendly', 'enemy', 'neutral'];
        iconTypes.forEach(type => {
            const img = new Image();
            img.src = `src/assets/icons/city-${type}-classic.svg`;
            img.onload = () => {
                this.iconsLoaded[type] = true;
            };
            this.cityIcons[type] = img;
        });
    }
    
    /**
     * 初始化UI
     */
    _initUI() {
        // 关闭按钮（用于城市信息面板）
        this.closeButton = new Button({
            x: 0, // 动态计算
            y: 0, // 动态计算
            width: 100,
            height: 35,
            text: '关闭',
            backgroundColor: '#8b4513',
            hoverColor: '#a0522d',
            onClick: () => this._closeCityInfo()
        });
        
        // 进入城市按钮
        this.enterCityButton = new Button({
            x: 0, // 动态计算
            y: 0, // 动态计算
            width: 100,
            height: 35,
            text: '进入城市',
            backgroundColor: '#2e8b57',
            hoverColor: '#3cb371',
            onClick: () => this.onEnterCity()
        });
    }
    
    /**
     * 设置数据
     */
    setData(data) {
        this.cities = data.cities || [];
        this.playerKing = data.playerKing;
        this.periodData = data.periodData;
        this.year = data.year || 190;
        this.month = data.month || 1;
        
        // 构建城池归属映射
        this._buildCityOwnershipMap();
        
        console.log('战略地图数据已设置:', {
            cityCount: this.cities.length,
            playerKing: this.playerKing,
            year: this.year,
            month: this.month
        });
    }
    
    /**
     * 构建城池归属映射
     */
    _buildCityOwnershipMap() {
        this.cityOwnershipMap = {};
        
        // 从城市数据中获取归属
        this.cities.forEach(city => {
            // 优先使用city.owner，否则使用city.belong
            const owner = city.owner || city.belong || '';
            this.cityOwnershipMap[city.name] = owner;
        });
        
        console.log('城池归属映射:', this.cityOwnershipMap);
    }
    
    /**
     * 获取城市类型
     */
    _getCityType(cityName) {
        const owner = this.cityOwnershipMap[cityName];
        
        if (!owner || owner === '' || owner === '0') {
            return 'neutral'; // 未占领
        }
        
        // 比较owner和playerKing
        if (owner === this.playerKing || owner.toString() === this.playerKing.toString()) {
            return 'friendly'; // 己方
        }
        
        return 'enemy'; // 敌方
    }
    
    /**
     * 选择城市
     */
    onSelectCity(city) {
        this.selectedCity = city;
        
        // 检查是否是己方城市
        const cityType = this._getCityType(city.name);
        
        if (cityType === 'friendly') {
            // 显示城市信息面板
            this._showCityInfo(city);
        }
        
        if (this.eventBus) {
            this.eventBus.emit('city.selected', city);
        }
    }
    
    /**
     * 显示城市信息面板
     */
    _showCityInfo(city) {
        this.showCityInfoPanel = true;
        
        // 更新按钮位置
        const panelW = 320;
        const panelH = 420;
        const panelX = (1024 - panelW) / 2;
        const panelY = (768 - panelH) / 2;
        
        this.closeButton.setPosition(panelX + panelW - 120, panelY + panelH - 55);
        this.enterCityButton.setPosition(panelX + 20, panelY + panelH - 55);
    }
    
    /**
     * 关闭城市信息面板
     */
    _closeCityInfo() {
        this.showCityInfoPanel = false;
        this.selectedCity = null;
    }
    
    /**
     * 进入城市
     */
    onEnterCity() {
        if (this.selectedCity && this.eventBus) {
            this.showCityInfoPanel = false;
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
     * 更新
     */
    update(deltaTime) {
        this.animationTime += deltaTime * 0.001;
    }
    
    /**
     * 渲染
     */
    render(ctx) {
        // 清空画布
        ctx.fillStyle = '#1a1a2a';
        ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        
        // 绘制地图
        this._renderMap(ctx);
        
        // 绘制城市连线
        this._renderConnections(ctx);
        
        // 绘制城池
        this._renderCities(ctx);
        
        // 绘制UI
        this._renderUI(ctx);
        
        // 绘制城市信息面板
        if (this.showCityInfoPanel && this.selectedCity) {
            this._renderCityInfoPanel(ctx);
        }
    }
    
    /**
     * 绘制地图
     */
    _renderMap(ctx) {
        if (this.mapLoaded && this.mapImage) {
            // 绘制地图(保持比例并居中)
            const mapAspect = this.mapImage.width / this.mapImage.height;
            const screenAspect = this.mapWidth / this.mapHeight;
            
            let drawWidth = this.mapWidth;
            let drawHeight = this.mapHeight;
            let drawX = this.mapX;
            let drawY = this.mapY;
            
            if (mapAspect > screenAspect) {
                // 地图更宽，以宽度为准
                drawHeight = this.mapWidth / mapAspect;
                drawY = this.mapY + (this.mapHeight - drawHeight) / 2;
            } else {
                // 地图更高，以高度为准
                drawWidth = this.mapHeight * mapAspect;
                drawX = this.mapX + (this.mapWidth - drawWidth) / 2;
            }
            
            this.mapDrawInfo = {
                x: drawX,
                y: drawY,
                width: drawWidth,
                height: drawHeight,
                scaleX: drawWidth / this.mapImage.width,
                scaleY: drawHeight / this.mapImage.height
            };
            
            ctx.drawImage(this.mapImage, drawX, drawY, drawWidth, drawHeight);
            
            // 绘制地图边框
            ctx.strokeStyle = this.mapBorderColor;
            ctx.lineWidth = this.mapBorderWidth;
            ctx.strokeRect(drawX, drawY, drawWidth, drawHeight);
            
            // 绘制内边框装饰线
            ctx.strokeStyle = 'rgba(201, 160, 80, 0.4)';
            ctx.lineWidth = 1;
            ctx.strokeRect(drawX + 3, drawY + 3, drawWidth - 6, drawHeight - 6);
        } else {
            // 地图未加载，显示占位背景
            ctx.fillStyle = '#2d4a22';
            ctx.fillRect(this.mapX, this.mapY, this.mapWidth, this.mapHeight);
            
            // 绘制边框
            ctx.strokeStyle = this.mapBorderColor;
            ctx.lineWidth = this.mapBorderWidth;
            ctx.strokeRect(this.mapX, this.mapY, this.mapWidth, this.mapHeight);
            
            ctx.fillStyle = '#666';
            ctx.font = '20px Microsoft YaHei';
            ctx.textAlign = 'center';
            ctx.fillText('加载地图中...', this.mapX + this.mapWidth / 2, this.mapY + this.mapHeight / 2);
        }
    }
    
    /**
     * 绘制城市连线
     */
    _renderConnections(ctx) {
        if (!this.mapDrawInfo) return;
        
        const { x: mapX, y: mapY, scaleX, scaleY } = this.mapDrawInfo;
        
        // 绘制所有城市连接线 - 使用更明显的颜色和更粗的线
        ctx.strokeStyle = 'rgba(255, 200, 100, 0.6)';
        ctx.lineWidth = 3;
        
        // 记录已绘制的连接，避免重复绘制
        const drawnConnections = new Set();
        
        this.cityConnections.forEach(([city1, city2]) => {
            // 创建唯一键（按字母顺序排序，确保 A-B 和 B-A 是同一个键）
            const connectionKey = [city1, city2].sort().join('-');
            
            // 如果已经绘制过，跳过
            if (drawnConnections.has(connectionKey)) return;
            drawnConnections.add(connectionKey);
            
            // 获取两座城市坐标
            const coord1 = this.cityCoordinates[city1];
            const coord2 = this.cityCoordinates[city2];
            
            if (coord1 && coord2) {
                const x1 = mapX + coord1.x * scaleX;
                const y1 = mapY + coord1.y * scaleY;
                const x2 = mapX + coord2.x * scaleX;
                const y2 = mapY + coord2.y * scaleY;
                
                // 绘制连线
                ctx.beginPath();
                ctx.moveTo(x1, y1);
                ctx.lineTo(x2, y2);
                ctx.stroke();
            }
        });
    }
    
    /**
     * 绘制城池
     */
    _renderCities(ctx) {
        if (!this.mapDrawInfo) return;
        
        const { x: mapX, y: mapY, scaleX, scaleY } = this.mapDrawInfo;
        
        // 遍历所有城池坐标
        Object.entries(this.cityCoordinates).forEach(([cityName, coord]) => {
            // 计算屏幕坐标
            const screenX = mapX + coord.x * scaleX;
            const screenY = mapY + coord.y * scaleY;
            
            // 获取城池类型和对应颜色
            const cityType = this._getCityType(cityName);
            const isSelected = this.selectedCity && this.selectedCity.name === cityName;
            
            // 绘制城池图标或圆点
            this._drawCityIcon(ctx, screenX, screenY, cityType, isSelected);
            
            // 绘制城池名称
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 11px Microsoft YaHei';
            ctx.textAlign = 'center';
            ctx.shadowColor = '#000';
            ctx.shadowBlur = 3;
            ctx.fillText(cityName, screenX, screenY - 15);
            ctx.shadowBlur = 0;
        });
    }
    
    /**
     * 绘制城池图标
     */
    _drawCityIcon(ctx, x, y, type, isSelected) {
        const icon = this.cityIcons[type];
        const loaded = this.iconsLoaded[type];
        
        if (icon && loaded) {
            // 绘制SVG图标
            const size = isSelected ? 32 : 24;
            ctx.drawImage(icon, x - size / 2, y - size / 2, size, size);
        } else {
            // 图标未加载，绘制备用圆点
            ctx.beginPath();
            ctx.arc(x, y, isSelected ? 10 : 7, 0, Math.PI * 2);
            
            // 根据类型设置颜色
            if (type === 'friendly') {
                ctx.fillStyle = '#4682B4'; // 蓝色-己方
            } else if (type === 'enemy') {
                ctx.fillStyle = '#DC143C'; // 红色-敌方
            } else {
                ctx.fillStyle = '#C0C0C0'; // 灰色-未占领
            }
            
            ctx.fill();
            
            // 选中高亮
            if (isSelected) {
                ctx.strokeStyle = '#FFD700';
                ctx.lineWidth = 3;
                ctx.stroke();
            }
        }
    }
    
    /**
     * 绘制UI
     */
    _renderUI(ctx) {
        // 顶部信息栏背景
        ctx.fillStyle = 'rgba(10, 10, 26, 0.9)';
        ctx.fillRect(0, 0, ctx.canvas.width, 40);
        
        // 顶部边框线
        ctx.strokeStyle = 'rgba(201, 160, 80, 0.4)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, 40);
        ctx.lineTo(ctx.canvas.width, 40);
        ctx.stroke();
        
        // 日期显示
        ctx.fillStyle = '#c9a050';
        ctx.font = 'bold 18px Microsoft YaHei';
        ctx.textAlign = 'left';
        ctx.fillText(`${this.year}年${this.month}月`, 20, 26);
        
        // 君主显示
        if (this.playerKing) {
            ctx.fillStyle = '#ffd700';
            ctx.textAlign = 'center';
            ctx.fillText(`君主: ${this.playerKing}`, ctx.canvas.width / 2, 26);
        }
        
        // 城市数量统计
        const friendlyCount = Object.values(this.cityOwnershipMap).filter(
            owner => owner === this.playerKing || owner.toString() === this.playerKing?.toString()
        ).length;
        ctx.fillStyle = '#aaa';
        ctx.textAlign = 'right';
        ctx.fillText(`城池: ${friendlyCount}/${Object.keys(this.cityOwnershipMap).length}`, ctx.canvas.width - 20, 26);
        
        // 操作提示
        if (this.selectedCity) {
            const cityType = this._getCityType(this.selectedCity.name);
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.fillRect(ctx.canvas.width / 2 - 150, ctx.canvas.height - 80, 300, 30);
            ctx.fillStyle = cityType === 'friendly' ? '#90EE90' : '#fff';
            ctx.font = '14px Microsoft YaHei';
            ctx.textAlign = 'center';
            const hint = cityType === 'friendly' ? '点击己方城池可查看详细信息' : '敌方城池，不可查看';
            ctx.fillText(hint, ctx.canvas.width / 2, ctx.canvas.height - 60);
        }
    }
    
    /**
     * 绘制城市信息面板
     */
    _renderCityInfoPanel(ctx) {
        const city = this.selectedCity;
        if (!city) return;
        
        // 面板尺寸
        const panelW = 320;
        const panelH = 420;
        const panelX = (ctx.canvas.width - panelW) / 2;
        const panelY = (ctx.canvas.height - panelH) / 2;
        
        // 半透明背景遮罩
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        
        // 面板背景 - 渐变深蓝（无边框）
        const bgGrad = ctx.createLinearGradient(panelX, panelY, panelX, panelY + panelH);
        bgGrad.addColorStop(0, 'rgba(25, 25, 45, 0.95)');
        bgGrad.addColorStop(1, 'rgba(15, 15, 35, 0.95)');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(panelX, panelY, panelW, panelH);
        
        // 顶部标题栏背景（无边框装饰）
        const titleGrad = ctx.createLinearGradient(panelX, panelY, panelX, panelY + 50);
        titleGrad.addColorStop(0, 'rgba(201, 160, 80, 0.15)');
        titleGrad.addColorStop(1, 'rgba(201, 160, 80, 0.02)');
        ctx.fillStyle = titleGrad;
        ctx.fillRect(panelX, panelY, panelW, 50);
        
        // 城市名称标题 - 金色发光效果
        ctx.save();
        ctx.shadowColor = '#c9a050';
        ctx.shadowBlur = 15;
        ctx.fillStyle = '#ffd700';
        ctx.font = 'bold 26px "STKaiti", "KaiTi", serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(city.name || '未知城市', panelX + panelW / 2, panelY + 30);
        ctx.restore();
        
        // 准备城市数据
        const cityData = [
            { label: '归属', value: city.owner || city.belong || '未知', color: '#ffd700' },
            { label: '太守', value: city.satrapId || '暂无', color: '#fff' },
            { label: '农业', value: `${city.farming || 0}/${city.farmingLimit || 0}`, color: '#90EE90' },
            { label: '商业', value: `${city.commerce || 0}/${city.commerceLimit || 0}`, color: '#87CEEB' },
            { label: '民忠', value: `${city.peopleDevotion || 0}%`, color: '#FFB6C1' },
            { label: '防灾', value: city.avoidCalamity || 0, color: '#DDA0DD' },
            { label: '人口', value: `${city.population || 0}/${city.populationLimit || 0}`, color: '#F0E68C' },
            { label: '金钱', value: city.money || 0, color: '#FFD700' },
            { label: '粮食', value: city.food || 0, color: '#DEB887' }
        ];
        
        // 绘制数据列表
        const startY = panelY + 80;
        const rowHeight = 32;
        const labelX = panelX + 30;
        const valueX = panelX + panelW - 30;
        
        cityData.forEach((item, index) => {
            const y = startY + index * rowHeight;
            
            // 交替行背景
            if (index % 2 === 0) {
                ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
                ctx.fillRect(panelX + 15, y - 18, panelW - 30, rowHeight - 2);
            }
            
            // 标签 - 灰色
            ctx.fillStyle = '#aaa';
            ctx.font = '16px "Microsoft YaHei", sans-serif';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            ctx.fillText(item.label + '：', labelX, y);
            
            // 值 - 根据类型使用不同颜色
            ctx.fillStyle = item.color;
            ctx.font = 'bold 16px "Microsoft YaHei", sans-serif';
            ctx.textAlign = 'right';
            ctx.fillText(item.value.toString(), valueX, y);
        });
        
        // 底部按钮区域背景
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.fillRect(panelX, panelY + panelH - 70, panelW, 70);
        
        // 绘制按钮
        this.enterCityButton.render(ctx);
        this.closeButton.render(ctx);
    }
    
    /**
     * 鼠标按下
     */
    onMouseDown(x, y) {
        // 检查是否点击城市信息面板
        if (this.showCityInfoPanel) {
            this.closeButton.onMouseDown(x, y);
            this.enterCityButton.onMouseDown(x, y);
            
            // 检查是否点击面板外部（关闭面板）
            const panelW = 320;
            const panelH = 420;
            const panelX = (1024 - panelW) / 2;
            const panelY = (768 - panelH) / 2;
            
            if (x < panelX || x > panelX + panelW || y < panelY || y > panelY + panelH) {
                this._closeCityInfo();
            }
            return;
        }
        
        // 检查是否点击城市
        if (this.mapDrawInfo) {
            const { x: mapX, y: mapY, scaleX, scaleY } = this.mapDrawInfo;
            
            Object.entries(this.cityCoordinates).forEach(([cityName, coord]) => {
                const screenX = mapX + coord.x * scaleX;
                const screenY = mapY + coord.y * scaleY;
                
                const dx = x - screenX;
                const dy = y - screenY;
                const dist = Math.sqrt(dx * dx + dy * dy);
                
                if (dist < 20) {
                    // 找到对应的城市数据
                    const cityData = this.cities.find(c => c.name === cityName) || { name: cityName };
                    this.onSelectCity(cityData);
                }
            });
        }
    }
    
    /**
     * 鼠标移动
     */
    onMouseMove(x, y) {
        if (this.showCityInfoPanel) {
            this.closeButton.onMouseMove(x, y);
            this.enterCityButton.onMouseMove(x, y);
        }
    }
    
    /**
     * 鼠标释放
     */
    onMouseUp(x, y) {
        if (this.showCityInfoPanel) {
            this.closeButton.onMouseUp(x, y);
            this.enterCityButton.onMouseUp(x, y);
        }
    }
}