/**
 * 游戏引擎核心
 * 协调各系统运行，管理游戏主循环
 */

export class GameEngine {
    constructor(options) {
        this.canvas = options.canvas;
        this.eventBus = options.eventBus;
        this.stateManager = options.stateManager;
        this.dataService = options.dataService;
        this.config = options.config;

        this.ctx = this.canvas.getContext('2d');
        this.systems = new Map();
        this.currentScreen = null;
        
        this.isRunning = false;
        this.lastTime = 0;
        this.deltaTime = 0;
        this.fps = 0;
        this.frameCount = 0;
        this.lastFpsTime = 0;

        // 绑定方法
        this.gameLoop = this.gameLoop.bind(this);
    }

    /**
     * 初始化游戏引擎
     */
    async init() {
        console.log('初始化游戏引擎...');

        // 初始化画布
        this._initCanvas();

        // 注册输入事件
        this._initInput();

        // 订阅状态变化
        if (this.stateManager) {
            this.stateManager.subscribe((state) => {
                this.eventBus.emit('state.update', state);
            });
        }

        console.log('游戏引擎初始化完成');
    }

    /**
     * 初始化画布
     */
    _initCanvas() {
        // 设置画布样式
        this.canvas.style.display = 'block';
        
        // 禁用右键菜单
        this.canvas.addEventListener('contextmenu', (e) => {
            e.preventDefault();
        });
    }

    /**
     * 初始化输入处理
     */
    _initInput() {
        // 鼠标事件
        this.canvas.addEventListener('mousedown', (e) => {
            const pos = this._getMousePosition(e);
            const mouseData = {
                x: pos.x,
                y: pos.y,
                button: e.button
            };
            this.eventBus.emit('input.mousedown', mouseData);
            
            // 同时传递给当前屏幕
            if (this.currentScreen && this.currentScreen.onMouseDown) {
                this.currentScreen.onMouseDown(pos.x, pos.y);
            }
        });

        this.canvas.addEventListener('mousemove', (e) => {
            const pos = this._getMousePosition(e);
            const mouseData = {
                x: pos.x,
                y: pos.y
            };
            this.eventBus.emit('input.mousemove', mouseData);
            
            // 同时传递给当前屏幕
            if (this.currentScreen && this.currentScreen.onMouseMove) {
                this.currentScreen.onMouseMove(pos.x, pos.y);
            }
        });

        this.canvas.addEventListener('mouseup', (e) => {
            const pos = this._getMousePosition(e);
            const mouseData = {
                x: pos.x,
                y: pos.y,
                button: e.button
            };
            this.eventBus.emit('input.mouseup', mouseData);
            
            // 同时传递给当前屏幕
            if (this.currentScreen && this.currentScreen.onMouseUp) {
                this.currentScreen.onMouseUp(pos.x, pos.y);
            }
        });

        // 键盘事件
        window.addEventListener('keydown', (e) => {
            this.eventBus.emit('input.keydown', {
                key: e.key,
                code: e.code,
                ctrl: e.ctrlKey,
                shift: e.shiftKey,
                alt: e.altKey
            });
        });

        window.addEventListener('keyup', (e) => {
            this.eventBus.emit('input.keyup', {
                key: e.key,
                code: e.code
            });
        });

        // 滚轮事件
        this.canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            this.eventBus.emit('input.wheel', {
                deltaY: e.deltaY,
                deltaX: e.deltaX
            });
            
            // 同时传递给当前屏幕
            if (this.currentScreen && this.currentScreen.onWheel) {
                this.currentScreen.onWheel(e.deltaY);
            }
        }, { passive: false });
    }

    /**
     * 获取鼠标在画布上的位置
     */
    _getMousePosition(e) {
        const rect = this.canvas.getBoundingClientRect();
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
    }

    /**
     * 注册系统模块
     */
    registerSystem(name, system) {
        this.systems.set(name, system);
        
        // 如果系统有init方法，调用它
        if (system.init && typeof system.init === 'function') {
            system.init(this);
        }

        console.log(`系统模块 ${name} 已注册`);
    }

    /**
     * 获取系统模块
     */
    getSystem(name) {
        return this.systems.get(name);
    }

    /**
     * 设置当前屏幕
     */
    setScreen(screen) {
        // 退出当前屏幕
        if (this.currentScreen && this.currentScreen.onExit) {
            this.currentScreen.onExit();
        }

        this.currentScreen = screen;

        // 进入新屏幕
        if (screen && screen.onEnter) {
            screen.onEnter();
        }
    }

    /**
     * 启动游戏主循环
     */
    start() {
        if (this.isRunning) return;

        this.isRunning = true;
        this.lastTime = performance.now();
        
        console.log('游戏主循环启动');
        requestAnimationFrame(this.gameLoop);
    }

    /**
     * 停止游戏主循环
     */
    stop() {
        this.isRunning = false;
        console.log('游戏主循环停止');
    }

    /**
     * 暂停游戏
     */
    pause() {
        if (this.stateManager) {
            this.stateManager.set('isPaused', true);
        }
        this.eventBus.emit('game.pause');
    }

    /**
     * 恢复游戏
     */
    resume() {
        if (this.stateManager) {
            this.stateManager.set('isPaused', false);
        }
        this.lastTime = performance.now();
        this.eventBus.emit('game.resume');
    }

    /**
     * 游戏主循环
     */
    gameLoop(currentTime) {
        if (!this.isRunning) return;

        // 计算时间增量
        this.deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;

        // 计算FPS
        this.frameCount++;
        if (currentTime - this.lastFpsTime >= 1000) {
            this.fps = this.frameCount;
            this.frameCount = 0;
            this.lastFpsTime = currentTime;
        }

        // 检查是否暂停
        const isPaused = this.stateManager ? this.stateManager.get('isPaused') : false;

        if (!isPaused) {
            // 更新所有系统
            this._update(this.deltaTime);

            // 渲染
            this._render();
        }

        // 继续下一帧
        requestAnimationFrame(this.gameLoop);
    }

    /**
     * 更新所有系统
     */
    _update(deltaTime) {
        // 更新当前屏幕
        if (this.currentScreen && this.currentScreen.update) {
            this.currentScreen.update(deltaTime);
        }

        // 更新所有注册的系统
        this.systems.forEach((system, name) => {
            if (system.update && typeof system.update === 'function') {
                system.update(deltaTime);
            }
        });

        // 发布更新事件
        this.eventBus.emit('game.update', deltaTime);
    }

    /**
     * 渲染
     */
    _render() {
        // 清空画布
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // 渲染当前屏幕
        if (this.currentScreen && this.currentScreen.render) {
            this.currentScreen.render(this.ctx);
        }

        // 渲染所有系统
        this.systems.forEach((system) => {
            if (system.render && typeof system.render === 'function') {
                system.render(this.ctx);
            }
        });

        // 渲染FPS（调试用）
        if (this.config.showFPS) {
            this._renderFPS();
        }

        // 发布渲染事件
        this.eventBus.emit('game.render', this.ctx);
    }

    /**
     * 渲染FPS
     */
    _renderFPS() {
        this.ctx.fillStyle = '#00ff00';
        this.ctx.font = '14px monospace';
        this.ctx.fillText(`FPS: ${this.fps}`, 10, 20);
    }

    /**
     * 错误处理
     */
    handleError(error, context = '') {
        console.error(`游戏错误${context ? ' (' + context + ')' : ''}:`, error);
        this.eventBus.emit('game.error', { error, context });
    }

    /**
     * 销毁引擎
     */
    destroy() {
        this.stop();
        
        // 销毁所有系统
        this.systems.forEach((system) => {
            if (system.destroy && typeof system.destroy === 'function') {
                system.destroy();
            }
        });
        
        this.systems.clear();
        console.log('游戏引擎已销毁');
    }
}
