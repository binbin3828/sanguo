/**
 * 存档管理系统
 * 使用IndexedDB实现存档/读档功能
 */

const DB_NAME = 'SanguoBayeDB';
const DB_VERSION = 1;
const STORE_NAME = 'saves';

export class SaveManager {
    constructor(eventBus) {
        this.eventBus = eventBus;
        this.db = null;
        this.maxSaveSlots = 10;
    }

    /**
     * 初始化数据库
     */
    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = () => {
                console.error('打开IndexedDB失败');
                reject(request.error);
            };

            request.onsuccess = () => {
                this.db = request.result;
                console.log('存档数据库已打开');
                resolve();
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // 创建存档存储
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
                    store.createIndex('timestamp', 'timestamp', { unique: false });
                    store.createIndex('name', 'name', { unique: false });
                }
            };
        });
    }

    /**
     * 创建新存档
     * @param {number} slotId - 存档槽位 (0-9)
     * @param {object} gameState - 游戏状态
     * @param {string} name - 存档名称（可选）
     */
    async save(slotId, gameState, name = '') {
        if (slotId < 0 || slotId >= this.maxSaveSlots) {
            throw new Error(`存档槽位必须在 0-${this.maxSaveSlots - 1} 之间`);
        }

        const saveData = {
            id: slotId,
            name: name || `存档 ${slotId + 1}`,
            timestamp: Date.now(),
            dateString: new Date().toLocaleString('zh-CN'),
            version: '1.0',
            state: this._compressState(gameState)
        };

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.put(saveData);

            request.onsuccess = () => {
                console.log(`存档 ${slotId} 保存成功`);
                
                if (this.eventBus) {
                    this.eventBus.emit('save.created', { slotId, saveData });
                }
                
                resolve(saveData);
            };

            request.onerror = () => {
                console.error(`存档 ${slotId} 保存失败`);
                reject(request.error);
            };
        });
    }

    /**
     * 读取存档
     * @param {number} slotId - 存档槽位
     */
    async load(slotId) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([STORE_NAME], 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.get(slotId);

            request.onsuccess = () => {
                const saveData = request.result;
                
                if (saveData) {
                    // 解压状态
                    saveData.state = this._decompressState(saveData.state);
                    console.log(`存档 ${slotId} 读取成功`);
                    
                    if (this.eventBus) {
                        this.eventBus.emit('save.loaded', { slotId, saveData });
                    }
                    
                    resolve(saveData);
                } else {
                    reject(new Error(`存档槽位 ${slotId} 为空`));
                }
            };

            request.onerror = () => {
                console.error(`读取存档 ${slotId} 失败`);
                reject(request.error);
            };
        });
    }

    /**
     * 删除存档
     * @param {number} slotId - 存档槽位
     */
    async delete(slotId) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.delete(slotId);

            request.onsuccess = () => {
                console.log(`存档 ${slotId} 已删除`);
                
                if (this.eventBus) {
                    this.eventBus.emit('save.deleted', { slotId });
                }
                
                resolve();
            };

            request.onerror = () => {
                console.error(`删除存档 ${slotId} 失败`);
                reject(request.error);
            };
        });
    }

    /**
     * 获取所有存档列表
     */
    async getSaveList() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([STORE_NAME], 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.getAll();

            request.onsuccess = () => {
                const saves = request.result;
                // 按槽位ID排序
                saves.sort((a, b) => a.id - b.id);
                resolve(saves);
            };

            request.onerror = () => {
                reject(request.error);
            };
        });
    }

    /**
     * 检查存档槽位是否为空
     */
    async isSlotEmpty(slotId) {
        try {
            await this.load(slotId);
            return false;
        } catch {
            return true;
        }
    }

    /**
     * 获取第一个空槽位
     */
    async getFirstEmptySlot() {
        for (let i = 0; i < this.maxSaveSlots; i++) {
            if (await this.isSlotEmpty(i)) {
                return i;
            }
        }
        return -1;
    }

    /**
     * 导出存档为JSON字符串
     */
    async exportSave(slotId) {
        const saveData = await this.load(slotId);
        return JSON.stringify(saveData, null, 2);
    }

    /**
     * 从JSON字符串导入存档
     */
    async importSave(slotId, jsonString) {
        try {
            const saveData = JSON.parse(jsonString);
            
            // 验证存档数据
            if (!saveData.state || !saveData.version) {
                throw new Error('无效的存档数据');
            }

            // 检查版本兼容性
            if (saveData.version !== '1.0') {
                console.warn(`存档版本 ${saveData.version} 可能与当前版本不兼容`);
            }

            // 重新设置ID和时间戳
            saveData.id = slotId;
            saveData.timestamp = Date.now();
            saveData.dateString = new Date().toLocaleString('zh-CN');

            return new Promise((resolve, reject) => {
                const transaction = this.db.transaction([STORE_NAME], 'readwrite');
                const store = transaction.objectStore(STORE_NAME);
                const request = store.put(saveData);

                request.onsuccess = () => {
                    console.log(`存档导入到槽位 ${slotId} 成功`);
                    resolve(saveData);
                };

                request.onerror = () => {
                    reject(request.error);
                };
            });
        } catch (error) {
            throw new Error(`导入存档失败: ${error.message}`);
        }
    }

    /**
     * 压缩状态数据
     */
    _compressState(state) {
        // 简单的JSON序列化压缩
        // 实际项目中可以使用更高效的压缩算法
        try {
            const jsonString = JSON.stringify(state);
            return jsonString;
        } catch (error) {
            console.error('状态压缩失败:', error);
            throw error;
        }
    }

    /**
     * 解压状态数据
     */
    _decompressState(compressedState) {
        if (typeof compressedState === 'string') {
            return JSON.parse(compressedState);
        }
        return compressedState;
    }

    /**
     * 清除所有存档
     */
    async clearAllSaves() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.clear();

            request.onsuccess = () => {
                console.log('所有存档已清除');
                
                if (this.eventBus) {
                    this.eventBus.emit('save.allCleared');
                }
                
                resolve();
            };

            request.onerror = () => {
                reject(request.error);
            };
        });
    }

    /**
     * 销毁管理器
     */
    destroy() {
        if (this.db) {
            this.db.close();
            this.db = null;
        }
    }
}
