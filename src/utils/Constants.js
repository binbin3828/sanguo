/**
 * 游戏常量定义
 * 所有游戏相关的常量都在此定义
 */

// ==================== 基础常量 ====================

export const GAME_CONFIG = {
    MAX_PERSONS: 2000,          // 最大武将数
    MAX_CITIES: 38,             // 最大城市数
    MAX_LEVEL: 20,              // 最大等级
    MAX_THEW: 100,              // 最大体力
    MAX_EXP: 100,               // 经验值上限（满100升级）
    MAX_DEVOTION: 100,          // 最大忠诚度
    MAX_FOOD: 65535,            // 最大粮食
    MAX_MONEY: 65535,           // 最大金钱
    PERSON_LIFETIME: 90,        // 武将寿命
    PERSON_APPEAR_AGE: 16       // 武将出现年龄
};

// ==================== 兵种常量 ====================

export const ARMY_TYPES = {
    CAVALRY: 0,      // 骑兵
    INFANTRY: 1,     // 步兵
    ARCHER: 2,       // 弓兵
    NAVY: 3,         // 水军
    ELITE: 4,        // 极兵
    MYSTIC: 5        // 玄兵
};

export const ARMY_NAMES = ['骑兵', '步兵', '弓兵', '水军', '极兵', '玄兵'];

// 兵种基础移动力
export const ARMY_MOVE_BASE = [5, 4, 4, 5, 6, 3];

// 兵种攻击系数
export const ATK_MODULUS = [1.0, 1.2, 0.9, 0.8, 1.3, 0.4];

// 兵种防御系数
export const DEF_MODULUS = [0.7, 1.2, 1.0, 1.1, 1.2, 0.6];

// 兵种相克矩阵 [攻击方][防守方]
export const SUBDUE_MATRIX = [
    [1.0, 1.2, 0.8, 1.0, 0.7, 1.3], // 骑兵攻击
    [0.8, 1.0, 1.2, 1.0, 0.6, 1.2], // 步兵攻击
    [1.2, 0.8, 1.0, 1.0, 1.1, 1.2], // 弓兵攻击
    [1.0, 1.0, 1.0, 1.0, 1.0, 1.0], // 水军攻击
    [1.1, 1.3, 0.9, 1.0, 1.0, 1.5], // 极兵攻击
    [0.6, 0.6, 0.6, 0.6, 0.6, 0.6]  // 玄兵攻击
];

// ==================== 地形常量 ====================

export const TERRAIN_TYPES = {
    GRASS: 0,        // 草地
    PLAIN: 1,        // 平原
    MOUNTAIN: 2,     // 山地
    FOREST: 3,       // 森林
    VILLAGE: 4,      // 村庄
    CITY: 5,         // 城池
    CAMP: 6,         // 营寨
    RIVER: 7         // 河流
};

export const TERRAIN_NAMES = ['草地', '平原', '山地', '森林', '村庄', '城池', '营寨', '河流'];

// 地形移动力消耗
export const TERRAIN_MOVE_COST = [2, 1, 3, 3, 2, 4, 2, 4];

// 地形防御加成
export const TERRAIN_DEF_MOD = [1.0, 1.0, 1.3, 1.15, 1.1, 1.5, 1.2, 0.8];

// ==================== 状态常量 ====================

export const STATES = {
    NORMAL: 0,       // 正常
    CHAOS: 1,        // 混乱
    JINZHOU: 2,      // 禁咒
    DINGSHEN: 3,     // 定身
    QIMEN: 4,        // 奇门
    DUNJIA: 5,       // 遁甲
    SHIZHEN: 6,      // 石阵
    QIANZONG: 7,     // 潜踪
    DEAD: 8          // 死亡
};

export const STATE_NAMES = ['正常', '混乱', '禁咒', '定身', '奇门', '遁甲', '石阵', '潜踪', '死亡'];

// ==================== 城市状态常量 ====================

export const CITY_STATES = {
    NORMAL: 0,       // 正常
    FAMINE: 1,       // 饥荒
    DROUGHT: 2,      // 旱灾
    FLOOD: 3,        // 水灾
    RIOT: 4          // 暴动
};

export const CITY_STATE_NAMES = ['正常', '饥荒', '旱灾', '水灾', '暴动'];

// ==================== 性格常量（武将） ====================

export const CHARACTER_TYPES = {
    TEMERITY: 0,     // 卤莽
    DREAD: 1,        // 怕死
    AVARICE: 2,      // 贪财
    IDEAL: 3,        // 大志
    LOYALISM: 4      // 忠义
};

export const CHARACTER_NAMES = ['卤莽', '怕死', '贪财', '大志', '忠义'];

// 性格对外交成功率的影响
export const CHARACTER_MODIFIERS = {
    // 离间系数
    ALIENATE: [50, 30, 40, 30, 5],
    // 招揽系数
    CANVASS: [15, 40, 30, 20, 5],
    // 策反系数
    COUNTERESPIONAGE: [30, 10, 20, 60, 5],
    // 招降系数
    SURRENDER: [15, 60, 30, 20, 5]
};

// ==================== 君主性格常量 ====================

export const KING_CHARACTER_TYPES = {
    RASH: 0,         // 冒进
    CRAZY: 1,        // 狂人
    DUPLICITY: 2,    // 奸诈
    JUSTICE: 3,      // 大义
    PEACE: 4         // 和平
};

export const KING_CHARACTER_NAMES = ['冒进', '狂人', '奸诈', '大义', '和平'];

// 劝降系数
export const PERSUADE_MODIFIERS = [10, 1, 20, 5, 15];

// ==================== 天气常量 ====================

export const WEATHER_TYPES = {
    SUNNY: 1,        // 晴
    CLOUDY: 2,       // 阴
    WINDY: 3,        // 风
    RAINY: 4,        // 雨
    HAIL: 5          // 冰雹
};

export const WEATHER_NAMES = ['晴', '阴', '风', '雨', '冰雹'];

// ==================== 内政指令常量 ====================

export const ORDERS = {
    NOP: 0,                  // 无操作
    ASSART: 1,               // 开垦
    ACCRACTBUSINESS: 2,      // 招商
    SEARCH: 3,               // 搜寻
    FATHER: 4,               // 治理
    INSPECTION: 5,           // 出巡
    SURRENDER: 6,            // 招降
    KILL: 7,                 // 处斩
    BANISH: 8,               // 流放
    LARGESS: 9,              // 赏赐
    CONFISCATE: 10,          // 没收
    EXCHANGE: 11,            // 交易
    TREAT: 12,               // 宴请
    TRANSPORTATION: 13,      // 输送
    MOVE: 14                 // 移动
};

export const ORDER_NAMES = [
    '无操作', '开垦', '招商', '搜寻', '治理', '出巡',
    '招降', '处斩', '流放', '赏赐', '没收', '交易',
    '宴请', '输送', '移动'
];

// ==================== 外交指令常量 ====================

export const DIPLOMACY_ORDERS = {
    ALIENATE: 15,            // 离间
    CANVASS: 16,             // 招揽
    COUNTERESPIONAGE: 17,    // 策反
    REALIENATE: 18,          // 反间（未实现）
    INDUCE: 19               // 劝降
};

export const DIPLOMACY_ORDER_NAMES = ['', '', '', '', '',
    '', '', '', '', '',
    '', '', '', '', '',
    '离间', '招揽', '策反', '反间', '劝降'
];

// ==================== 军事指令常量 ====================

export const MILITARY_ORDERS = {
    CONSCRIPTION: 20,        // 征兵
    EXPEDITION: 21,          // 出征
    TROOP_MOVE: 22           // 调兵
};

// ==================== 指令消耗 ====================

export const ORDER_CONSUME_THEW = 4;  // 所有指令消耗4点体力

// ==================== 数值计算常量 ====================

export const FORMULA_CONSTANTS = {
    // 基础比例
    ARMS_PER_MONEY: 10,              // 每金钱可买兵数
    ARMS_PER_DEVOTION: 20,           // 征兵量与民忠关系
    
    // 带兵量计算
    RATIO_ARMS_TO_LEVEL: 100,
    RATIO_ARMS_TO_AGE: 0,
    RATIO_ARMS_TO_IQ: 10,
    RATIO_ARMS_TO_FORCE: 10,
    
    // 攻击力计算
    RATIO_ATT_TO_FORCE: 10,
    RATIO_ATT_TO_IQ: 0,
    RATIO_ATT_TO_AGE: 0,
    
    // 防御力计算
    RATIO_DEFENCE_TO_IQ: 10,
    RATIO_DEFENCE_TO_FORCE: 0,
    RATIO_DEFENCE_TO_AGE: 0,
    
    // 粮草消耗
    RATIO_FOOD_TO_ARMS_PER_MONTH: 50,   // 市政粮草消耗
    RATIO_FOOD_TO_ARMS_PER_DAY: 3       // 战场粮草消耗
};

// ==================== 路径查找常量 ====================

export const PATH_CONSTANTS = {
    MOV_RSTD: 0x80,      // 地形阻力基准值
    MOV_NOT: 0xFE,       // 不可移动点
    MOV_OVER: 0xFF,      // 超出地图范围
    PATH_GRID_SIZE: 15   // 路径计算区域大小 (15x15)
};

// ==================== 战斗常量 ====================

export const BATTLE_CONSTANTS = {
    FGT_PLAMAX: 10,      // 每方最大将领数
    FGT_EXPMAX: 100,     // 最大经验值
    MAX_FGT_BOUT: 30,    // 最大战斗回合数
    ATTACK_RANGE: 5      // 基础攻击范围
};

// ==================== 时期常量 ====================

export const PERIODS = {
    DONG_ZHUO: 1,        // 董卓弄权 (189年)
    CAO_CAO_RISE: 2,     // 曹操崛起 (196年)
    CHI_BI: 3,           // 赤壁之战 (208年)
    THREE_KINGDOMS: 4    // 三国鼎立 (220年)
};

export const PERIOD_NAMES = ['', '董卓弄权', '曹操崛起', '赤壁之战', '三国鼎立'];

export const PERIOD_YEARS = [0, 189, 196, 208, 220];

// ==================== 引擎配置默认值 ====================

export const DEFAULT_ENGINE_CONFIG = {
    enableCustomRatio: false,
    enableScript: false,
    disableExpGrowing: false,
    disableAgeGrow: false,
    disableSL: false,
    aiLevelUpSpeed: 0,
    aiDefenceMode: 0,
    aiAttackMethod: 0
};
