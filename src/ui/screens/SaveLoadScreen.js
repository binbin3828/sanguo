/**
 * 存档界面
 * 管理游戏存档的保存和读取
 */

import { Button } from '../components/Button.js';
import { ListView } from '../components/ListView.js';
import { Dialog } from '../components/Dialog.js';

export class SaveLoadScreen {
    constructor(engine) {
        this.engine = engine;
        this.eventBus = engine.eventBus;
        this.mode = 'save'; // 'save' 或 'load'
        this.saves = [];
        this.selectedSlot = -1;
        
        this._initUI();
    }

    _initUI() {
        // 存档列表
        this.saveList = new ListView({
            x: 200, y: 150, width: 624, height: 350,
            onSelect: (item, index) => this.onSelectSlot(index)
        });

        // 返回按钮
        this.backButton = new Button({
            x: 50, y: 700, width: 100, height: 40,
            text: '返回',
            onClick: () => this.onBack()
        });

        // 保存/读取按钮
        this.actionButton = new Button({
            x: 874, y: 700, width: 100, height: 40,
            text: '保存',
            onClick: () => this.onAction()
        });

        // 删除按钮
        this.deleteButton = new Button({
            x: 462, y: 550, width: 100, height: 35,
            text: '删除',
            backgroundColor: '#ff4444',
            onClick: () => this.onDelete()
        });
    }

    setMode(mode) {
        this.mode = mode;
        this.actionButton.text = mode === 'save' ? '保存' : '读取';
        this.loadSaveList();
    }

    setSaves(saves) {
        this.saves = saves;
        this.updateSaveList();
    }

    updateSaveList() {
        const items = this.saves.map((save, index) => ({
            id: save.id,
            text: save.name || `存档 ${index + 1}`,
            subtext: save.dateString || '空存档',
            data: save
        }));
        this.saveList.setItems(items);
    }

    loadSaveList() {
        // TODO: 从SaveManager加载存档列表
        if (this.eventBus) {
            this.eventBus.emit('saves.load');
        }
    }

    onSelectSlot(index) {
        this.selectedSlot = index;
    }

    onAction() {
        if (this.mode === 'save') {
            this.onSave();
        } else {
            this.onLoad();
        }
    }

    onSave() {
        if (this.selectedSlot < 0) {
            Dialog.alert({ message: '请选择一个存档槽位' });
            return;
        }

        const saveName = prompt('请输入存档名称:', `存档 ${this.selectedSlot + 1}`);
        if (saveName) {
            if (this.eventBus) {
                this.eventBus.emit('save.create', {
                    slot: this.selectedSlot,
                    name: saveName
                });
            }
        }
    }

    onLoad() {
        if (this.selectedSlot < 0) {
            Dialog.alert({ message: '请选择一个存档' });
            return;
        }

        const save = this.saves[this.selectedSlot];
        if (!save) {
            Dialog.alert({ message: '选择的存档为空' });
            return;
        }

        Dialog.confirm({
            message: `确定要读取存档 "${save.name}" 吗？`,
            onResult: (result) => {
                if (result === '确定') {
                    if (this.eventBus) {
                        this.eventBus.emit('save.load', this.selectedSlot);
                    }
                }
            }
        });
    }

    onDelete() {
        if (this.selectedSlot < 0) {
            Dialog.alert({ message: '请选择一个存档' });
            return;
        }

        const save = this.saves[this.selectedSlot];
        if (!save) return;

        Dialog.confirm({
            message: `确定要删除存档 "${save.name}" 吗？`,
            onResult: (result) => {
                if (result === '确定') {
                    if (this.eventBus) {
                        this.eventBus.emit('save.delete', this.selectedSlot);
                    }
                }
            }
        });
    }

    onBack() {
        if (this.eventBus) {
            this.eventBus.emit('screen.change', 'MainMenu');
        }
    }

    render(ctx) {
        // 背景
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

        // 标题
        ctx.fillStyle = '#ffd700';
        ctx.font = 'bold 36px Microsoft YaHei';
        ctx.textAlign = 'center';
        ctx.fillText(
            this.mode === 'save' ? '保存游戏' : '读取存档',
            ctx.canvas.width / 2,
            80
        );

        // 存档列表
        this.saveList.render(ctx);

        // 按钮
        this.backButton.render(ctx);
        this.actionButton.render(ctx);
        this.deleteButton.render(ctx);
    }

    onMouseDown(x, y) {
        this.saveList.onMouseDown(x, y);
        this.backButton.onMouseDown(x, y);
        this.actionButton.onMouseDown(x, y);
        this.deleteButton.onMouseDown(x, y);
    }

    onMouseUp(x, y) {
        this.saveList.onMouseUp(x, y);
        this.backButton.onMouseUp(x, y);
        this.actionButton.onMouseUp(x, y);
        this.deleteButton.onMouseUp(x, y);
    }

    onMouseMove(x, y) {
        this.saveList.onMouseMove(x, y);
        this.backButton.onMouseMove(x, y);
        this.actionButton.onMouseMove(x, y);
        this.deleteButton.onMouseMove(x, y);
    }

    onWheel(deltaY) {
        this.saveList.onWheel(deltaY);
    }
}
