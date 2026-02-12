/**
 * 武将数据仓库
 * 管理所有武将数据的CRUD操作
 */

import { Person } from '../models/Person.js';

export class PersonRepository {
    constructor(eventBus) {
        this.eventBus = eventBus;
        this.persons = new Map();
        this.cityAssignments = new Map();  // 武将所在城市映射
    }

    /**
     * 初始化武将数据
     */
    initialize(personDataArray) {
        this.persons.clear();
        this.cityAssignments.clear();
        
        personDataArray.forEach((data, index) => {
            const person = new Person({ ...data, id: index });
            this.persons.set(index, person);
            
            // 记录城市分配
            if (data.city) {
                this.cityAssignments.set(index, data.city);
            }
        });

        if (this.eventBus) {
            this.eventBus.emit('persons.initialized', this.persons.size);
        }
    }

    /**
     * 获取所有武将
     */
    getAll() {
        return Array.from(this.persons.values());
    }

    /**
     * 根据ID获取武将
     */
    getById(id) {
        return this.persons.get(id);
    }

    /**
     * 根据名称获取武将
     */
    getByName(name) {
        for (const person of this.persons.values()) {
            if (person.name === name) {
                return person;
            }
        }
        return null;
    }

    /**
     * 更新武将数据
     */
    update(id, updates) {
        const person = this.persons.get(id);
        if (!person) {
            console.warn(`武将 ${id} 不存在`);
            return null;
        }

        Object.assign(person, updates);

        if (this.eventBus) {
            this.eventBus.emit('person.updated', { id, person, updates });
        }

        return person;
    }

    /**
     * 获取某势力的所有武将
     */
    getByBelong(kingId) {
        return this.getAll().filter(person => person.belong === kingId);
    }

    /**
     * 获取某城市的所有武将
     */
    getByCity(cityId) {
        const result = [];
        this.cityAssignments.forEach((city, personId) => {
            if (city === cityId) {
                const person = this.persons.get(personId);
                if (person) {
                    result.push(person);
                }
            }
        });
        return result;
    }

    /**
     * 获取在野武将
     */
    getUnemployed() {
        return this.getAll().filter(person => person.isUnemployed());
    }

    /**
     * 获取君主列表
     */
    getKings() {
        return this.getAll().filter(person => person.isKingCheck());
    }

    /**
     * 移动武将到城市
     */
    moveToCity(personId, cityId) {
        this.cityAssignments.set(personId, cityId);
        
        if (this.eventBus) {
            this.eventBus.emit('person.moved', { personId, cityId });
        }
    }

    /**
     * 获取武将所在城市
     */
    getPersonCity(personId) {
        return this.cityAssignments.get(personId);
    }

    /**
     * 改变武将归属
     */
    changeBelong(personId, newBelong) {
        const person = this.persons.get(personId);
        if (person) {
            const oldBelong = person.belong;
            person.changeBelong(newBelong);
            
            if (this.eventBus) {
                this.eventBus.emit('person.belongChanged', {
                    personId,
                    oldBelong,
                    newBelong
                });
            }
        }
        return person;
    }

    /**
     * 查找武将（按名称模糊搜索）
     */
    findByName(query) {
        return this.getAll().filter(person => 
            person.name.includes(query)
        );
    }

    /**
     * 按武力排序
     */
    getTopByForce(count = 10) {
        return this.getAll()
            .sort((a, b) => b.force - a.force)
            .slice(0, count);
    }

    /**
     * 按智力排序
     */
    getTopByIQ(count = 10) {
        return this.getAll()
            .sort((a, b) => b.iq - a.iq)
            .slice(0, count);
    }

    /**
     * 获取可出征武将（有兵力、有体力）
     */
    getAvailableForBattle(kingId) {
        return this.getByBelong(kingId).filter(person => 
            person.arms > 0 && person.thew >= 20
        );
    }

    /**
     * 获取可执行指令的武将
     */
    getAvailableForOrder(kingId, cityId) {
        const persons = this.getByCity(cityId);
        return persons.filter(person => 
            person.belong === kingId && person.thew >= 4
        );
    }

    /**
     * 批量更新（月末处理）
     */
    processMonthlyUpdate() {
        const results = {
            aged: [],
            leveledUp: []
        };

        this.persons.forEach((person, id) => {
            // 年龄增长
            person.ageUp();
            results.aged.push(id);

            // 体力自然恢复（少量）
            if (person.thew < 100) {
                person.recoverThew(5);
            }
        });

        if (this.eventBus) {
            this.eventBus.emit('persons.monthlyUpdate', results);
        }

        return results;
    }

    /**
     * 创建状态快照
     */
    createSnapshot() {
        const snapshot = {
            persons: {},
            cityAssignments: {}
        };
        
        this.persons.forEach((person, id) => {
            snapshot.persons[id] = person.toJSON();
        });
        
        this.cityAssignments.forEach((city, personId) => {
            snapshot.cityAssignments[personId] = city;
        });
        
        return snapshot;
    }

    /**
     * 从快照恢复
     */
    restoreSnapshot(snapshot) {
        this.persons.clear();
        this.cityAssignments.clear();
        
        Object.entries(snapshot.persons).forEach(([id, data]) => {
            const personId = parseInt(id);
            this.persons.set(personId, Person.fromJSON(data));
        });
        
        Object.entries(snapshot.cityAssignments).forEach(([personId, city]) => {
            this.cityAssignments.set(parseInt(personId), city);
        });

        if (this.eventBus) {
            this.eventBus.emit('persons.restored');
        }
    }

    /**
     * 获取武将统计
     */
    getStatistics() {
        const all = this.getAll();
        
        return {
            total: all.length,
            employed: all.filter(p => !p.isUnemployed()).length,
            unemployed: all.filter(p => p.isUnemployed()).length,
            kings: all.filter(p => p.isKingCheck()).length,
            averageForce: Math.floor(all.reduce((sum, p) => sum + p.force, 0) / all.length),
            averageIQ: Math.floor(all.reduce((sum, p) => sum + p.iq, 0) / all.length),
            byBelong: this._groupByBelong(all)
        };
    }

    /**
     * 按归属分组
     */
    _groupByBelong(persons) {
        const groups = {};
        persons.forEach(person => {
            const belong = person.belong;
            if (!groups[belong]) {
                groups[belong] = 0;
            }
            groups[belong]++;
        });
        return groups;
    }

    /**
     * 清空数据
     */
    clear() {
        this.persons.clear();
        this.cityAssignments.clear();
    }
}
