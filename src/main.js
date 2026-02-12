/**
 * 三国霸业 - 重置版
 * 游戏入口文件
 */

// 导入核心系统
import { GameEngine } from './core/GameEngine.js';
import { EventBus } from './core/EventBus.js';
import { StateManager } from './core/StateManager.js';

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
    
    // 创建游戏引擎
    const gameEngine = new GameEngine({
        canvas,
        eventBus,
        stateManager,
        config: GAME_CONFIG
    });
    
    // 启动游戏
    await gameEngine.init();
    
    // 设置初始屏幕为主菜单（不要注册为system，否则会被自动渲染）
    const mainMenu = new MainMenuScreen(gameEngine);
    gameEngine.setScreen(mainMenu);
    
    // 监听屏幕切换事件
    eventBus.on('screen.change', (screenName) => {
        if (typeof screenName === 'string' && SCREENS[screenName]) {
            const newScreen = new SCREENS[screenName](gameEngine);
            gameEngine.setScreen(newScreen);
        }
    });
    
    gameEngine.start();
    
    console.log('游戏初始化完成！');
}

// 页面加载完成后启动游戏
document.addEventListener('DOMContentLoaded', initGame);
