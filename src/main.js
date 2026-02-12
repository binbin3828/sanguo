/**
 * 三国霸业 - 重置版
 * 游戏入口文件
 */

// 导入核心系统
import { GameEngine } from './core/GameEngine.js';
import { EventBus } from './core/EventBus.js';
import { StateManager } from './core/StateManager.js';

// 游戏配置
const GAME_CONFIG = {
    canvasId: 'game-canvas',
    width: 1024,
    height: 768,
    targetFPS: 60
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
    gameEngine.start();
    
    console.log('游戏初始化完成！');
}

// 页面加载完成后启动游戏
document.addEventListener('DOMContentLoaded', initGame);
