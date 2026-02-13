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
        const year = periodYears[periodId] || 190;
        selectedPeriod = dataService.getPeriodByYear(year);
        console.log(`选择时期 ${year}年:`, selectedPeriod ? `找到 ${selectedPeriod.rulers?.length || 0} 个君主` : '未找到');
        if (selectedPeriod && selectedPeriod.rulers) {
            console.log('君主列表:', selectedPeriod.rulers.map(r => r.name).join(', '));
        }
    });
    
    gameEngine.start();
    
    console.log('游戏初始化完成！');
}

// 页面加载完成后启动游戏
document.addEventListener('DOMContentLoaded', initGame);
