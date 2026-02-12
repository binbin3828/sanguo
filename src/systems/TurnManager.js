/**
 * 回合管理器
 * 管理游戏回合流程，处理月份和年份推进
 */

import { PERIOD_YEARS } from '../utils/Constants.js';

export class TurnManager {
    constructor(eventBus, stateManager) {
        this.eventBus = eventBus;
        this.stateManager = stateManager;
        
        this.currentMonth = 1;
        this.currentYear = 190;
        this.turnCount = 0;
        this.isPlayerTurn = true;
    }

    /**
     * 初始化
     */
    initialize(startYear = 190, startMonth = 1) {
        this.currentYear = startYear;
        this.currentMonth = startMonth;
        this.turnCount = 0;
        this.isPlayerTurn = true;

        // 更新状态
        if (this.stateManager) {
            this.stateManager.set({
                'yearDate': this.currentYear,
                'monthDate': this.currentMonth
            });
        }

        if (this.eventBus) {
            this.eventBus.emit('turn.initialized', {
                year: this.currentYear,
                month: this.currentMonth
            });
        }
    }

    /**
     * 开始新回合
     */
    startTurn() {
        this.turnCount++;
        this.isPlayerTurn = true;

        if (this.eventBus) {
            this.eventBus.emit('turn.start', {
                turnCount: this.turnCount,
                year: this.currentYear,
                month: this.currentMonth,
                isPlayerTurn: true
            });
        }

        return {
            turnCount: this.turnCount,
            year: this.currentYear,
            month: this.currentMonth
        };
    }

    /**
     * 结束玩家回合，进入AI回合
     */
    endPlayerTurn() {
        this.isPlayerTurn = false;

        if (this.eventBus) {
            this.eventBus.emit('turn.playerEnd', {
                year: this.currentYear,
                month: this.currentMonth
            });
        }

        // 执行AI回合
        this._executeAITurn();
    }

    /**
     * 执行AI回合
     */
    _executeAITurn() {
        if (this.eventBus) {
            this.eventBus.emit('turn.aiStart', {
                year: this.currentYear,
                month: this.currentMonth
            });
        }

        // AI执行逻辑由AISystem处理
        // 这里只负责触发事件

        if (this.eventBus) {
            this.eventBus.emit('turn.aiEnd', {
                year: this.currentYear,
                month: this.currentMonth
            });
        }

        // 进入月末结算
        this._endTurn();
    }

    /**
     * 结束回合，进入下个月
     */
    _endTurn() {
        // 执行月末结算
        this._processEndOfMonth();

        // 进入下个月
        this._advanceMonth();

        this.isPlayerTurn = true;

        if (this.eventBus) {
            this.eventBus.emit('turn.end', {
                turnCount: this.turnCount,
                year: this.currentYear,
                month: this.currentMonth,
                isPlayerTurn: true
            });
        }

        // 开始新回合
        this.startTurn();
    }

    /**
     * 月末结算
     */
    _processEndOfMonth() {
        const settlements = {
            year: this.currentYear,
            month: this.currentMonth
        };

        if (this.eventBus) {
            this.eventBus.emit('turn.endOfMonth', settlements);
        }

        return settlements;
    }

    /**
     * 推进月份
     */
    _advanceMonth() {
        this.currentMonth++;
        
        if (this.currentMonth > 12) {
            this.currentMonth = 1;
            this.currentYear++;
            this._processEndOfYear();
        }

        // 更新状态
        if (this.stateManager) {
            this.stateManager.set({
                'yearDate': this.currentYear,
                'monthDate': this.currentMonth
            });
        }
    }

    /**
     * 年末结算
     */
    _processEndOfYear() {
        if (this.eventBus) {
            this.eventBus.emit('turn.endOfYear', {
                year: this.currentYear
            });
        }
    }

    /**
     * 获取当前时间
     */
    getCurrentTime() {
        return {
            year: this.currentYear,
            month: this.currentMonth,
            turnCount: this.turnCount
        };
    }

    /**
     * 获取时间字符串
     */
    getTimeString() {
        return `${this.currentYear}年${this.currentMonth}月`;
    }

    /**
     * 是否是玩家回合
     */
    isPlayerTurnNow() {
        return this.isPlayerTurn;
    }

    /**
     * 跳转到指定年月
     */
    jumpTo(year, month) {
        this.currentYear = year;
        this.currentMonth = month;

        if (this.stateManager) {
            this.stateManager.set({
                'yearDate': this.currentYear,
                'monthDate': this.currentMonth
            });
        }

        if (this.eventBus) {
            this.eventBus.emit('turn.jump', {
                year: this.currentYear,
                month: this.currentMonth
            });
        }
    }

    /**
     * 快进N个月
     */
    fastForward(months) {
        for (let i = 0; i < months; i++) {
            this._advanceMonth();
        }

        if (this.eventBus) {
            this.eventBus.emit('turn.fastForward', {
                months,
                year: this.currentYear,
                month: this.currentMonth
            });
        }
    }

    /**
     * 创建状态快照
     */
    createSnapshot() {
        return {
            currentMonth: this.currentMonth,
            currentYear: this.currentYear,
            turnCount: this.turnCount,
            isPlayerTurn: this.isPlayerTurn
        };
    }

    /**
     * 从快照恢复
     */
    restoreSnapshot(snapshot) {
        this.currentMonth = snapshot.currentMonth;
        this.currentYear = snapshot.currentYear;
        this.turnCount = snapshot.turnCount;
        this.isPlayerTurn = snapshot.isPlayerTurn;

        if (this.stateManager) {
            this.stateManager.set({
                'yearDate': this.currentYear,
                'monthDate': this.currentMonth
            });
        }
    }
}
