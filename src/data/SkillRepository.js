/**
 * 技能数据仓库
 */

import { Skill } from '../models/Skill.js';

export class SkillRepository {
    constructor(eventBus) {
        this.eventBus = eventBus;
        this.skills = new Map();
        this.armySkills = new Map();  // 兵种技能映射
    }

    /**
     * 初始化技能数据
     */
    initialize(skillDataArray) {
        this.skills.clear();
        this.armySkills.clear();
        
        skillDataArray.forEach((data, index) => {
            const skill = new Skill({ ...data, id: index });
            this.skills.set(index, skill);
        });

        // 初始化兵种技能映射
        this._initializeArmySkills();

        if (this.eventBus) {
            this.eventBus.emit('skills.initialized', this.skills.size);
        }
    }

    /**
     * 初始化兵种技能映射
     */
    _initializeArmySkills() {
        // 骑兵技能
        this.armySkills.set(0, [0, 1, 2]); // 践踏、冲锋、突击
        
        // 步兵技能
        this.armySkills.set(1, [3, 7, 13, 8]); // 突袭、奋战、撞击、飞矢
        
        // 弓兵技能
        this.armySkills.set(2, [8, 9, 10]); // 飞矢、箭雨、火箭
        
        // 水军技能
        this.armySkills.set(3, [11, 12, 13]); // 水淹、海啸、撞击
        
        // 极兵技能
        this.armySkills.set(4, [3, 7, 27, 28]); // 突袭、奋战、围攻、急行
        
        // 玄兵技能
        this.armySkills.set(5, [4, 5, 6, 14, 15, 16, 17, 20, 21]); // 火攻、滚木、落石、咒封、定身、流言、援兵、奇门、遁甲
    }

    /**
     * 获取所有技能
     */
    getAll() {
        return Array.from(this.skills.values());
    }

    /**
     * 根据ID获取技能
     */
    getById(id) {
        return this.skills.get(id);
    }

    /**
     * 根据名称获取技能
     */
    getByName(name) {
        for (const skill of this.skills.values()) {
            if (skill.name === name) {
                return skill;
            }
        }
        return null;
    }

    /**
     * 获取武将可学习的技能
     */
    getAvailableSkills(person) {
        const skills = [];
        
        // 1. 特有技能
        if (person.specialSkill) {
            const skill = this.getById(person.specialSkill);
            if (skill) {
                skills.push(skill);
            }
        }
        
        // 2. 君主特有技能（天变）
        if (person.isKingCheck()) {
            const tianBian = this.getByName('天变');
            if (tianBian) {
                skills.push(tianBian);
            }
        }
        
        // 3. 兵种技能
        const armySkillIds = this.armySkills.get(person.armsType) || [];
        const skillCount = Math.floor(armySkillIds.length * person.level / 21) + 1;
        
        for (let i = 0; i < skillCount && i < armySkillIds.length; i++) {
            const skill = this.getById(armySkillIds[i]);
            if (skill && !skills.find(s => s.id === skill.id)) {
                skills.push(skill);
            }
        }
        
        return skills;
    }

    /**
     * 按类型获取技能
     */
    getByType(type) {
        return this.getAll().filter(skill => skill.getType() === type);
    }

    /**
     * 获取攻击类技能
     */
    getAttackSkills() {
        return this.getByType('attack');
    }

    /**
     * 获取控制类技能
     */
    getControlSkills() {
        return this.getByType('control');
    }

    /**
     * 获取辅助类技能
     */
    getSupportSkills() {
        return this.getByType('support');
    }

    /**
     * 搜索技能
     */
    search(query) {
        return this.getAll().filter(skill => 
            skill.name.includes(query) || 
            skill.description.includes(query)
        );
    }

    /**
     * 创建状态快照
     */
    createSnapshot() {
        const snapshot = {};
        this.skills.forEach((skill, id) => {
            snapshot[id] = skill.toJSON();
        });
        return snapshot;
    }

    /**
     * 从快照恢复
     */
    restoreSnapshot(snapshot) {
        this.skills.clear();
        Object.entries(snapshot).forEach(([id, data]) => {
            this.skills.set(parseInt(id), Skill.fromJSON(data));
        });
    }

    /**
     * 清空数据
     */
    clear() {
        this.skills.clear();
        this.armySkills.clear();
    }
}
