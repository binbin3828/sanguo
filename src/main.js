/**
 * 三国霸业 - 重置版
 * 游戏入口文件
 */

// 导入核心系统
import { GameEngine } from './core/GameEngine.js';
import { EventBus } from './core/EventBus.js';
import { StateManager } from './core/StateManager.js';

// 导入数据服务
import { DataService } from './services/DataService.js';

// 导入UI屏幕
import { MainMenuScreen } from './ui/screens/MainMenuScreen.js';
import { PeriodSelectScreen } from './ui/screens/PeriodSelectScreen.js';
import { KingSelectScreen } from './ui/screens/KingSelectScreen.js';
import { StrategyMapScreen } from './ui/screens/StrategyMapScreen.js';
import { CityScreen } from './ui/screens/CityScreen.js';
import { BattleScreen } from './ui/screens/BattleScreen.js';
import { SaveLoadScreen } from './ui/screens/SaveLoadScreen.js';

// 游戏配置
const GAME_CONFIG = {
    canvasId: 'game-canvas',
    width: 1024,
    height: 768,
    targetFPS: 60
};

// 屏幕映射
const SCREENS = {
    'MainMenu': MainMenuScreen,
    'PeriodSelect': PeriodSelectScreen,
    'KingSelect': KingSelectScreen,
    'StrategyMap': StrategyMapScreen,
    'City': CityScreen,
    'Battle': BattleScreen,
    'SaveLoad': SaveLoadScreen
};

// 初始化游戏
async function initGame() {
    console.log('三国霸业 - 重置版 初始化中...');
    
    // 获取画布
    const canvas = document.getElementById(GAME_CONFIG.canvasId);
    if (!canvas) {
        console.error('找不到游戏画布元素');
        return;
    }
    
    // 设置画布尺寸
    canvas.width = GAME_CONFIG.width;
    canvas.height = GAME_CONFIG.height;
    
    // 创建事件总线
    const eventBus = new EventBus();
    
    // 创建状态管理器
    const stateManager = new StateManager(eventBus);
    
    // 创建数据服务
    const dataService = new DataService();
    
    // 加载游戏数据
    console.log('加载游戏数据...');
    await dataService.loadData();
    console.log('数据加载完成');
    
    // 创建游戏引擎
    const gameEngine = new GameEngine({
        canvas,
        eventBus,
        stateManager,
        dataService,
        config: GAME_CONFIG
    });
    
    // 启动游戏
    await gameEngine.init();
    
    // 设置初始屏幕为主菜单（不要注册为system，否则会被自动渲染）
    const mainMenu = new MainMenuScreen(gameEngine);
    gameEngine.setScreen(mainMenu);
    
    // 当前选中的时期和君主
    let selectedPeriod = null;
    let selectedKing = null;
    
    // 监听屏幕切换事件
    eventBus.on('screen.change', (screenName) => {
        if (typeof screenName === 'string' && SCREENS[screenName]) {
            const ScreenClass = SCREENS[screenName];
            const newScreen = new ScreenClass(gameEngine);
            
            // 如果是君主选择界面，传入当前选中的时期
            if (screenName === 'KingSelect' && selectedPeriod) {
                newScreen.setPeriod(selectedPeriod);
            }
            
            gameEngine.setScreen(newScreen);
        }
    });
    
    // 监听时期选择
    eventBus.on('period.selected', (periodId) => {
        const periodYears = { 1: 190, 2: 198, 3: 208, 4: 225 };
        const periodNames = { 1: '董卓霸京师', 2: '曹操伐董卓', 3: '赤壁之战', 4: '三国鼎立' };
        const year = periodYears[periodId] || 190;
        selectedPeriod = dataService.getPeriodByYear(year);
        // 添加剧本名称到时期数据中
        if (selectedPeriod) {
            selectedPeriod.name = periodNames[periodId] || '未知剧本';
        }
    });
    
    // 监听君主选择
    eventBus.on('king.selected', (king) => {
        selectedKing = king;
        // 设置玩家君主ID到状态管理器
        stateManager.set('playerKing', king.id || king.name);
        
        // 初始化游戏数据：设置城市、将领等到状态中
        if (selectedPeriod) {
            stateManager.batchUpdate({
                'cities': selectedPeriod.cities || [],
                'persons': selectedPeriod.generals || [],
                'yearDate': selectedPeriod.year || 190,
                'monthDate': 1
            });
        }
        
        console.log('君主已选择:', king.name);
    });
    
    // 监听城市选择
    eventBus.on('city.selected', (city) => {
        stateManager.set('selectedCity', city);
        console.log('选中城市:', city.name);
    });
    
    // 监听进入城市
    eventBus.on('city.enter', (city) => {
        console.log('进入城市:', city.name);
    });
    
    // 监听下一回合
    eventBus.on('turn.next', () => {
        const currentMonth = stateManager.get('monthDate') || 1;
        const currentYear = stateManager.get('yearDate') || 190;
        
        let newMonth = currentMonth + 1;
        let newYear = currentYear;
        
        if (newMonth > 12) {
            newMonth = 1;
            newYear += 1;
        }
        
        stateManager.batchUpdate({
            'monthDate': newMonth,
            'yearDate': newYear
        });
        
        console.log(`回合结束，现在时间: ${newYear}年${newMonth}月`);
    });
    
    // 监听战斗结束
    eventBus.on('battle.exit', () => {
        console.log('战斗结束，返回战略地图');
    });
    
    // 监听存档列表加载请求
    eventBus.on('saves.load', () => {
        const saves = JSON.parse(localStorage.getItem('sanguo_saves') || '[]');
        eventBus.emit('saves.loaded', saves);
    });
    
    // 监听创建存档
    eventBus.on('save.create', (saveData) => {
        const saves = JSON.parse(localStorage.getItem('sanguo_saves') || '[]');
        const newSave = {
            id: Date.now(),
            name: saveData.name || `存档 ${saves.length + 1}`,
            timestamp: Date.now(),
            year: stateManager.get('yearDate'),
            month: stateManager.get('monthDate'),
            king: selectedKing?.name || '未知',
            data: stateManager.createSnapshot()
        };
        
        saves.push(newSave);
        localStorage.setItem('sanguo_saves', JSON.stringify(saves));
        eventBus.emit('save.created', newSave);
        console.log('存档已创建:', newSave.name);
    });
    
    // 监听加载存档
    eventBus.on('save.load', (saveId) => {
        const saves = JSON.parse(localStorage.getItem('sanguo_saves') || '[]');
        const save = saves.find(s => s.id === saveId);
        
        if (save && save.data) {
            stateManager.restoreSnapshot(save.data);
            selectedKing = { name: save.king };
            selectedPeriod = { year: save.year };
            eventBus.emit('screen.change', 'StrategyMap');
            console.log('存档已加载:', save.name);
        } else {
            console.error('找不到存档:', saveId);
        }
    });
    
    // 监听删除存档
    eventBus.on('save.delete', (saveId) => {
        let saves = JSON.parse(localStorage.getItem('sanguo_saves') || '[]');
        saves = saves.filter(s => s.id !== saveId);
        localStorage.setItem('sanguo_saves', JSON.stringify(saves));
        eventBus.emit('save.deleted', saveId);
        console.log('存档已删除:', saveId);
    });
    
    // 监听游戏错误
    eventBus.on('game.error', ({ error, context }) => {
        console.error(`游戏错误 (${context}):`, error);
    });
    
    gameEngine.start();
    
    console.log('游戏初始化完成！');
}

// 页面加载完成后启动游戏
document.addEventListener('DOMContentLoaded', initGame);
