/**
 * 输入处理器
 * 处理鼠标、键盘和触摸输入
 */

export class InputHandler {
    constructor(canvas, eventBus) {
        this.canvas = canvas;
        this.eventBus = eventBus;
        
        this.mouse = {
            x: 0,
            y: 0,
            isDown: false,
            button: 0
        };
        
        this.keys = new Map();
        this.touches = new Map();
        
        this.handlers = {
            mouseDown: [],
            mouseUp: [],
            mouseMove: [],
            click: [],
            keyDown: [],
            keyUp: [],
            wheel: []
        };
        
        this._init();
    }

    /**
     * 初始化事件监听
     */
    _init() {
        // 鼠标事件
        this.canvas.addEventListener('mousedown', (e) => this._onMouseDown(e));
        this.canvas.addEventListener('mouseup', (e) => this._onMouseUp(e));
        this.canvas.addEventListener('mousemove', (e) => this._onMouseMove(e));
        this.canvas.addEventListener('wheel', (e) => this._onWheel(e));
        this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
        
        // 键盘事件
        window.addEventListener('keydown', (e) => this._onKeyDown(e));
        window.addEventListener('keyup', (e) => this._onKeyUp(e));
        
        // 触摸事件（移动端支持）
        this.canvas.addEventListener('touchstart', (e) => this._onTouchStart(e));
        this.canvas.addEventListener('touchend', (e) => this._onTouchEnd(e));
        this.canvas.addEventListener('touchmove', (e) => this._onTouchMove(e));
    }

    /**
     * 获取鼠标在canvas中的位置
     */
    _getMousePosition(e) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        
        return {
            x: (e.clientX - rect.left) * scaleX,
            y: (e.clientY - rect.top) * scaleY
        };
    }

    /**
     * 鼠标按下处理
     */
    _onMouseDown(e) {
        const pos = this._getMousePosition(e);
        this.mouse.x = pos.x;
        this.mouse.y = pos.y;
        this.mouse.isDown = true;
        this.mouse.button = e.button;

        const event = {
            type: 'mousedown',
            x: pos.x,
            y: pos.y,
            button: e.button,
            ctrl: e.ctrlKey,
            shift: e.shiftKey,
            alt: e.altKey
        };

        this._emit('mouseDown', event);
        
        if (this.eventBus) {
            this.eventBus.emit('input.mousedown', event);
        }
    }

    /**
     * 鼠标释放处理
     */
    _onMouseUp(e) {
        const pos = this._getMousePosition(e);
        this.mouse.x = pos.x;
        this.mouse.y = pos.y;
        this.mouse.isDown = false;

        const event = {
            type: 'mouseup',
            x: pos.x,
            y: pos.y,
            button: e.button
        };

        this._emit('mouseUp', event);
        
        // 触发点击事件
        const clickEvent = {
            type: 'click',
            x: pos.x,
            y: pos.y,
            button: e.button
        };
        this._emit('click', clickEvent);
        
        if (this.eventBus) {
            this.eventBus.emit('input.mouseup', event);
            this.eventBus.emit('input.click', clickEvent);
        }
    }

    /**
     * 鼠标移动处理
     */
    _onMouseMove(e) {
        const pos = this._getMousePosition(e);
        this.mouse.x = pos.x;
        this.mouse.y = pos.y;

        const event = {
            type: 'mousemove',
            x: pos.x,
            y: pos.y,
            dx: e.movementX,
            dy: e.movementY,
            isDown: this.mouse.isDown
        };

        this._emit('mouseMove', event);
        
        if (this.eventBus) {
            this.eventBus.emit('input.mousemove', event);
        }
    }

    /**
     * 滚轮处理
     */
    _onWheel(e) {
        e.preventDefault();
        
        const event = {
            type: 'wheel',
            deltaX: e.deltaX,
            deltaY: e.deltaY,
            deltaZ: e.deltaZ,
            x: this.mouse.x,
            y: this.mouse.y
        };

        this._emit('wheel', event);
        
        if (this.eventBus) {
            this.eventBus.emit('input.wheel', event);
        }
    }

    /**
     * 键盘按下处理
     */
    _onKeyDown(e) {
        this.keys.set(e.code, true);

        const event = {
            type: 'keydown',
            key: e.key,
            code: e.code,
            ctrl: e.ctrlKey,
            shift: e.shiftKey,
            alt: e.altKey,
            repeat: e.repeat
        };

        this._emit('keyDown', event);
        
        if (this.eventBus) {
            this.eventBus.emit('input.keydown', event);
        }

        // 处理快捷键
        this._handleShortcuts(e);
    }

    /**
     * 键盘释放处理
     */
    _onKeyUp(e) {
        this.keys.set(e.code, false);

        const event = {
            type: 'keyup',
            key: e.key,
            code: e.code
        };

        this._emit('keyUp', event);
        
        if (this.eventBus) {
            this.eventBus.emit('input.keyup', event);
        }
    }

    /**
     * 处理快捷键
     */
    _handleShortcuts(e) {
        // ESC键
        if (e.key === 'Escape') {
            if (this.eventBus) {
                this.eventBus.emit('input.escape');
            }
        }
        
        // 空格键
        if (e.key === ' ' && !e.repeat) {
            if (this.eventBus) {
                this.eventBus.emit('input.space');
            }
        }
        
        // 回车键
        if (e.key === 'Enter') {
            if (this.eventBus) {
                this.eventBus.emit('input.enter');
            }
        }
    }

    /**
     * 触摸开始处理
     */
    _onTouchStart(e) {
        e.preventDefault();
        
        for (let i = 0; i < e.changedTouches.length; i++) {
            const touch = e.changedTouches[i];
            const rect = this.canvas.getBoundingClientRect();
            const scaleX = this.canvas.width / rect.width;
            const scaleY = this.canvas.height / rect.height;
            
            const pos = {
                x: (touch.clientX - rect.left) * scaleX,
                y: (touch.clientY - rect.top) * scaleY
            };
            
            this.touches.set(touch.identifier, pos);
            
            // 模拟鼠标事件
            this._emit('mouseDown', {
                type: 'touchstart',
                x: pos.x,
                y: pos.y,
                touchId: touch.identifier
            });
        }
    }

    /**
     * 触摸结束处理
     */
    _onTouchEnd(e) {
        e.preventDefault();
        
        for (let i = 0; i < e.changedTouches.length; i++) {
            const touch = e.changedTouches[i];
            const pos = this.touches.get(touch.identifier);
            
            if (pos) {
                this._emit('mouseUp', {
                    type: 'touchend',
                    x: pos.x,
                    y: pos.y,
                    touchId: touch.identifier
                });
                
                this.touches.delete(touch.identifier);
            }
        }
    }

    /**
     * 触摸移动处理
     */
    _onTouchMove(e) {
        e.preventDefault();
        
        for (let i = 0; i < e.changedTouches.length; i++) {
            const touch = e.changedTouches[i];
            const rect = this.canvas.getBoundingClientRect();
            const scaleX = this.canvas.width / rect.width;
            const scaleY = this.canvas.height / rect.height;
            
            const pos = {
                x: (touch.clientX - rect.left) * scaleX,
                y: (touch.clientY - rect.top) * scaleY
            };
            
            this.touches.set(touch.identifier, pos);
            
            this._emit('mouseMove', {
                type: 'touchmove',
                x: pos.x,
                y: pos.y,
                touchId: touch.identifier
            });
        }
    }

    /**
     * 注册事件处理器
     */
    on(event, handler) {
        if (this.handlers[event]) {
            this.handlers[event].push(handler);
        }
    }

    /**
     * 移除事件处理器
     */
    off(event, handler) {
        if (this.handlers[event]) {
            const index = this.handlers[event].indexOf(handler);
            if (index > -1) {
                this.handlers[event].splice(index, 1);
            }
        }
    }

    /**
     * 触发事件
     */
    _emit(event, data) {
        if (this.handlers[event]) {
            this.handlers[event].forEach(handler => handler(data));
        }
    }

    /**
     * 检查按键是否按下
     */
    isKeyPressed(code) {
        return this.keys.get(code) || false;
    }

    /**
     * 获取鼠标位置
     */
    getMousePosition() {
        return { x: this.mouse.x, y: this.mouse.y };
    }

    /**
     * 检查鼠标是否按下
     */
    isMouseDown() {
        return this.mouse.isDown;
    }
}
