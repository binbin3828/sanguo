# 三国霸业-重置版 项目开发规划

## 项目概述

**项目名称**: 三国霸业-重置版 (Sanguo Baye Remastered)  
**项目类型**: 回合制策略战旗游戏 (SLG)  
**技术栈**: HTML5 + JavaScript (ES6+) + Canvas API  
**目标**: 基于原始C++游戏逻辑，使用现代Web技术重构，保留所有数值系统和算法

---

## 一、项目目录结构

```
sanguobaye-remastered/
├── docs/                          # 设计文档（已有）
│   ├── 01-游戏总体概述.md
│   ├── 02-内政系统详细设计.md
│   ├── 03-外交系统详细设计.md
│   ├── 04-战斗系统详细设计.md
│   ├── 05-数值计算与公式汇总.md
│   ├── 06-游戏数据配置与静态资源.md
│   ├── 07-游戏数据配置说明.md
│   └── 08-文档修正记录.md
│
├── data/                          # 游戏数据
│   └── game_config.json          # 主配置文件（38城/200将/4时期）
│
├── src/                           # 源代码
│   ├── core/                      # 核心系统
│   │   ├── GameEngine.js         # 游戏引擎主类
│   │   ├── EventBus.js           # 事件总线
│   │   ├── StateManager.js       # 状态管理
│   │   └── SaveManager.js        # 存档管理
│   │
│   ├── data/                      # 数据层
│   │   ├── DataLoader.js         # 数据加载器
│   │   ├── CityRepository.js     # 城市数据仓库
│   │   ├── PersonRepository.js   # 武将数据仓库
│   │   ├── SkillRepository.js    # 技能数据仓库
│   │   └── GoodsRepository.js    # 道具数据仓库
│   │
│   ├── models/                    # 数据模型
│   │   ├── City.js               # 城市模型
│   │   ├── Person.js             # 武将模型
│   │   ├── Skill.js              # 技能模型
│   │   ├── Goods.js              # 道具模型
│   │   ├── BattleUnit.js         # 战斗单位模型
│   │   └── Order.js              # 指令模型
│   │
│   ├── systems/                   # 游戏系统
│   │   ├── internal/              # 内政系统
│   │   │   ├── InternalAffairsSystem.js
│   │   │   ├── AssartCommand.js     # 开垦
│   │   │   ├── BusinessCommand.js   # 招商
│   │   │   ├── SearchCommand.js     # 搜寻
│   │   │   ├── FatherCommand.js     # 治理
│   │   │   ├── InspectionCommand.js # 出巡
│   │   │   ├── SurrenderCommand.js  # 招降
│   │   │   ├── KillCommand.js       # 处斩
│   │   │   ├── BanishCommand.js     # 流放
│   │   │   ├── LargessCommand.js    # 赏赐
│   │   │   ├── ConfiscateCommand.js # 没收
│   │   │   ├── ExchangeCommand.js   # 交易
│   │   │   ├── TreatCommand.js      # 宴请
│   │   │   ├── TransportCommand.js  # 输送
│   │   │   └── MoveCommand.js       # 移动
│   │   │
│   │   ├── diplomacy/             # 外交系统
│   │   │   ├── DiplomacySystem.js
│   │   │   ├── AlienateCommand.js   # 离间
│   │   │   ├── CanvassCommand.js    # 招揽
│   │   │   ├── CounterespionageCommand.js # 策反
│   │   │   └── InduceCommand.js     # 劝降
│   │   │
│   │   ├── military/              # 军事系统
│   │   │   ├── MilitarySystem.js
│   │   │   ├── ConscriptionCommand.js # 征兵
│   │   │   ├── ExpeditionCommand.js   # 出征
│   │   │   └── TroopMoveCommand.js    # 调兵
│   │   │
│   │   ├── battle/                # 战斗系统
│   │   │   ├── BattleSystem.js      # 战斗系统
│   │   │   ├── BattleMap.js         # 战斗地图
│   │   │   ├── PathFinder.js        # 路径查找(BFS)
│   │   │   ├── CombatCalculator.js  # 战斗计算
│   │   │   ├── SkillSystem.js       # 技能系统
│   │   │   ├── WeatherSystem.js     # 天气系统
│   │   │   └── AIController.js      # AI控制器
│   │   │
│   │   ├── PeriodManager.js       # 时期管理
│   │   ├── TurnManager.js         # 回合管理
│   │   └── CalamitySystem.js      # 灾害系统
│   │
│   ├── utils/                     # 工具类
│   │   ├── FormulaCalculator.js   # 公式计算器
│   │   ├── RandomUtil.js          # 随机数工具
│   │   ├── PathUtil.js            # 路径工具
│   │   ├── Validator.js           # 验证器
│   │   └── Constants.js           # 常量定义
│   │
│   ├── ui/                        # UI层
│   │   ├── components/            # 通用组件
│   │   │   ├── Button.js
│   │   │   ├── Panel.js
│   │   │   ├── Dialog.js
│   │   │   ├── ListView.js
│   │   │   └── ProgressBar.js
│   │   │
│   │   ├── screens/               # 游戏界面
│   │   │   ├── MainMenuScreen.js      # 主菜单
│   │   │   ├── PeriodSelectScreen.js  # 时期选择
│   │   │   ├── KingSelectScreen.js    # 君主选择
│   │   │   ├── StrategyMapScreen.js   # 战略地图
│   │   │   ├── CityScreen.js          # 城市界面
│   │   │   ├── BattleScreen.js        # 战斗界面
│   │   │   └── SaveLoadScreen.js      # 存档界面
│   │   │
│   │   ├── renderers/             # 渲染器
│   │   │   ├── MapRenderer.js
│   │   │   ├── CityRenderer.js
│   │   │   ├── UnitRenderer.js
│   │   │   ├── BattleRenderer.js
│   │   │   └── UIRenderer.js
│   │   │
│   │   └── InputHandler.js        # 输入处理
│   │
│   ├── assets/                    # 静态资源
│   │   └── images/                # 图片资源（SVG）
│   │       ├── terrain/           # 地形
│   │       │   ├── grass.svg
│   │       │   ├── plain.svg
│   │       │   ├── mountain.svg
│   │       │   ├── forest.svg
│   │       │   ├── village.svg
│   │       │   ├── city.svg
│   │       │   ├── camp.svg
│   │       │   └── river.svg
│   │       │
│   │       ├── army/              # 兵种图标
│   │       │   ├── cavalry.svg    # 骑兵
│   │       │   ├── infantry.svg   # 步兵
│   │       │   ├── archer.svg     # 弓箭兵
│   │       │   ├── navy.svg       # 水军
│   │       │   ├── elite.svg      # 极兵
│   │       │   └── mystic.svg     # 玄兵
│   │       │
│   │       ├── ui/                # UI元素
│   │       │   ├── button_bg.svg
│   │       │   ├── panel_bg.svg
│   │       │   ├── dialog_bg.svg
│   │       │   └── icons/         # 功能图标
│   │       │
│   │       ├── portraits/         # 武将头像（统一风格SVG）
│   │       │   ├── generic_male.svg
│   │       │   ├── generic_female.svg
│   │       │   └── kings/         # 君主头像
│   │       │
│   │       └── map_bg.svg         # 战略地图背景
│   │
│   └── main.js                    # 入口文件
│
├── tests/                         # 测试文件
│   ├── unit/                      # 单元测试
│   │   ├── models/
│   │   ├── systems/
│   │   └── utils/
│   ├── integration/               # 集成测试
│   └── test-runner.html           # 测试运行器
│
├── tools/                         # 开发工具
│   └── generate-assets.js         # SVG资源生成脚本
│
├── index.html                     # 主页面
├── styles.css                     # 全局样式
├── package.json                   # 项目配置
└── README.md                      # 项目说明
```

---

## 二、技术架构

### 2.1 架构模式
- **MVC + 组件化**: Model-View-Controller分离，UI组件化
- **事件驱动**: 使用EventBus进行模块间通信
- **状态管理**: 集中式状态管理，支持存档/读档
- **模块化**: ES6模块系统，按需加载

### 2.2 核心类图

```
GameEngine
├── state: GameState
├── eventBus: EventBus
├── systems: Map<System>
└── currentScreen: Screen
    │
    ├── StateManager ←──→ EventBus ←──→ Renderer
    │
    └─ Game Systems
       ├── InternalAffairsSystem
       ├── DiplomacySystem
       ├── MilitarySystem
       └── BattleSystem
```

### 2.3 数据流
```
User Input → InputHandler → EventBus → System → Model → StateManager → Renderer → Display
```

---

## 三、开发任务规划

### 任务总览

| 阶段 | 任务组 | 任务数 | 预计工期 |
|------|--------|--------|----------|
| **Phase 1** | 基础架构 | 8个 | 3天 |
| **Phase 2** | 数据层 | 6个 | 2天 |
| **Phase 3** | 核心系统 | 10个 | 5天 |
| **Phase 4** | 内政系统 | 15个 | 5天 |
| **Phase 5** | 外交系统 | 6个 | 3天 |
| **Phase 6** | 军事与战斗 | 12个 | 7天 |
| **Phase 7** | UI系统 | 10个 | 5天 |
| **Phase 8** | 资源生成 | 5个 | 2天 |
| **Phase 9** | 集成测试 | 4个 | 3天 |
| **总计** | - | **76个任务** | **35天** |

---

### Phase 1: 基础架构 (第1-3天)

#### 任务 1.1: 项目初始化
**文件**: `package.json`, `index.html`, `styles.css`, `src/main.js`  
**描述**: 创建项目基础结构，配置开发环境  
**测试文件**: `tests/unit/core/ProjectInit.test.js`
- 验证项目结构完整
- 验证HTML能正常加载
- 验证CSS样式生效

#### 任务 1.2: 事件总线系统
**文件**: `src/core/EventBus.js`  
**描述**: 实现发布-订阅模式的事件系统  
**测试要求**:
```javascript
test('订阅和发布事件')
test('取消订阅事件')
test('多次订阅同一事件')
test('事件参数传递')
test('一次性事件订阅')
```

#### 任务 1.3: 状态管理系统
**文件**: `src/core/StateManager.js`  
**描述**: 实现游戏状态管理，支持状态快照  
**测试要求**:
```javascript
test('状态初始化')
test('状态更新')
test('状态订阅通知')
test('创建状态快照')
test('从快照恢复状态')
test('状态变更历史记录')
```

#### 任务 1.4: 游戏引擎核心
**文件**: `src/core/GameEngine.js`  
**描述**: 主游戏引擎，协调各系统运行  
**测试要求**:
```javascript
test('引擎初始化')
test('注册系统模块')
test('游戏主循环')
test('系统间通信')
test('错误处理')
```

#### 任务 1.5: 存档管理系统
**文件**: `src/core/SaveManager.js`  
**描述**: 实现存档/读档功能，使用IndexedDB  
**测试要求**:
```javascript
test('创建新存档')
test('读取存档')
test('删除存档')
test('存档列表管理')
test('存档数据压缩')
test('存档版本兼容')
```

#### 任务 1.6: 常量定义
**文件**: `src/utils/Constants.js`  
**描述**: 定义所有游戏常量  
**测试**: 验证所有常量定义正确且不可修改

#### 任务 1.7: 随机数工具
**文件**: `src/utils/RandomUtil.js`  
**描述**: 实现可种子的随机数生成器（用于战斗重现）  
**测试要求**:
```javascript
test('相同种子产生相同序列')
test('随机范围正确')
test('概率判定功能')
test('随机选择功能')
test('随机打乱数组')
```

#### 任务 1.8: 测试框架搭建
**文件**: `tests/test-runner.html`, `tests/test-utils.js`  
**描述**: 搭建浏览器端测试框架

---

### Phase 2: 数据层 (第4-5天)

#### 任务 2.1: 数据加载器
**文件**: `src/data/DataLoader.js`  
**描述**: 加载和解析 game_config.json  
**测试要求**:
```javascript
test('成功加载JSON数据')
test('解析城市数据')
test('解析武将数据')
test('解析技能数据')
test('解析道具数据')
test('错误处理')
```

#### 任务 2.2: 城市数据仓库
**文件**: `src/data/CityRepository.js`, `src/models/City.js`  
**描述**: 城市数据的CRUD操作  
**测试要求**:
```javascript
test('获取所有城市')
test('根据ID获取城市')
test('更新城市数据')
test('城市连接关系')
test('城市归属变更')
```

#### 任务 2.3: 武将数据仓库
**文件**: `src/data/PersonRepository.js`, `src/models/Person.js`  
**描述**: 武将数据的CRUD操作  
**测试要求**:
```javascript
test('获取所有武将')
test('根据ID获取武将')
test('根据势力获取武将')
test('根据城市获取武将')
test('武将属性更新')
test('武将移动')
```

#### 任务 2.4: 技能数据仓库
**文件**: `src/data/SkillRepository.js`, `src/models/Skill.js`  
**描述**: 技能数据的查询  
**测试要求**:
```javascript
test('获取所有技能')
test('根据ID获取技能')
test('获取武将可学技能')
test('技能效果计算')
```

#### 任务 2.5: 道具数据仓库
**文件**: `src/data/GoodsRepository.js`, `src/models/Goods.js`  
**描述**: 道具数据的CRUD操作  
**测试要求**:
```javascript
test('获取所有道具')
test('根据ID获取道具')
test('道具装备/卸下')
test('道具属性计算')
```

#### 任务 2.6: 指令模型
**文件**: `src/models/Order.js`  
**描述**: 指令数据模型  
**测试要求**:
```javascript
test('创建指令')
test('指令验证')
test('指令序列化')
```

---

### Phase 3: 核心系统 (第6-10天)

#### 任务 3.1: 公式计算器
**文件**: `src/utils/FormulaCalculator.js`  
**描述**: 实现所有数值计算公式（根据docs/05）  
**测试要求（覆盖所有公式）**:
```javascript
test('攻击力计算')
test('防御力计算')
test('带兵上限计算')
test('战斗HP计算')
test('战斗MP计算')
test('移动力计算')
test('伤害计算')
test('技能伤害计算')
test('离间成功率')
test('招揽成功率')
test('策反成功率')
test('招降成功率')
test('劝降成功率')
test('开垦增量')
test('招商增量')
test('搜寻成功率')
test('出巡民忠增量')
test('战场粮草消耗')
test('经验获取')
```

#### 任务 3.2: 时期管理器
**文件**: `src/systems/PeriodManager.js`  
**描述**: 管理4个历史时期的初始配置  
**测试要求**:
```javascript
test('加载时期配置')
test('时期1初始化')
test('时期2初始化')
test('时期3初始化')
test('时期4初始化')
test('城市初始归属')
test('武将初始位置')
```

#### 任务 3.3: 回合管理器
**文件**: `src/systems/TurnManager.js`  
**描述**: 管理游戏回合流程  
**测试要求**:
```javascript
test('月份递增')
test('年份递增')
test('回合切换')
test('月末结算触发')
test('回合事件分发')
```

#### 任务 3.4: 灾害系统
**文件**: `src/systems/CalamitySystem.js`  
**描述**: 灾害触发和恢复系统  
**测试要求**:
```javascript
test('灾害触发概率')
test('灾害类型选择')
test('灾害效果应用')
test('灾害恢复')
test('防灾值影响')
```

#### 任务 3.5: 路径查找工具
**文件**: `src/utils/PathUtil.js`  
**描述**: BFS路径查找算法（根据docs/04）  
**测试要求**:
```javascript
test('基础BFS路径查找')
test('地形阻力计算')
test('敌方阻挡检测')
test('友方阻挡检测')
test('移动力限制')
test('攻击范围计算')
```

#### 任务 3.6: 验证器
**文件**: `src/utils/Validator.js`  
**描述**: 数据验证工具  
**测试要求**:
```javascript
test('城市连接验证')
test('武将归属验证')
test('资源充足验证')
test('指令合法性验证')
```

#### 任务 3.7: 指令队列系统
**文件**: `src/systems/OrderQueue.js`  
**描述**: 管理待执行指令队列  
**测试要求**:
```javascript
test('添加指令到队列')
test('移除指令')
test('批量执行指令')
test('指令冷却管理')
```

#### 任务 3.8: 对话系统
**文件**: `src/systems/DialogSystem.js`  
**描述**: 管理游戏内对话显示  
**测试要求**: 对话模板管理、参数替换、忠诚度区间对话选择

#### 任务 3.9: 经验系统
**文件**: `src/systems/ExperienceSystem.js`  
**描述**: 经验获取和升级系统  
**测试要求**:
```javascript
test('获得经验值')
test('升级判定')
test('属性增长')
test('等级上限')
```

#### 任务 3.10: 资源管理系统
**文件**: `src/systems/ResourceSystem.js`  
**描述**: 城市资源自动增长和消耗  
**测试要求**:
```javascript
test('粮食自动增长')
test('金钱自动增长')
test('人口增长')
test('粮草消耗')
```

---

### Phase 4: 内政系统 (第11-15天)

#### 任务 4.1: 内政系统框架
**文件**: `src/systems/internal/InternalAffairsSystem.js`  
**描述**: 内政系统基类和通用逻辑  
**测试要求**: 系统初始化、指令分发、体力消耗、通用结果处理

#### 任务 4.2: 开垦指令
**文件**: `src/systems/internal/AssartCommand.js`  
**描述**: 开垦-增加农业开发度  
**测试要求**:
```javascript
test('计算农业增量')
test('不能超过上限')
test('体力消耗')
test('成功结果')
test('已达上限提示')
```

#### 任务 4.3: 招商指令
**文件**: `src/systems/internal/BusinessCommand.js`  
**描述**: 招商-增加商业开发度  
**测试要求**: 计算商业增量、上限检查、体力消耗

#### 任务 4.4: 搜寻指令
**文件**: `src/systems/internal/SearchCommand.js`  
**描述**: 搜寻-随机事件  
**测试要求**:
```javascript
test('一无所获')
test('发现人才')
test('伯乐必定成功')
test('发现道具')
test('获得金钱')
test('获得粮食')
```

#### 任务 4.5: 治理指令
**文件**: `src/systems/internal/FatherCommand.js`  
**描述**: 治理-恢复状态或增加防灾  
**测试要求**: 状态恢复、防灾增加、优先级判定

#### 任务 4.6: 出巡指令
**文件**: `src/systems/internal/InspectionCommand.js`  
**描述**: 出巡-增加民忠  
**测试要求**: 民忠计算、君主加成、上限检查

#### 任务 4.7: 招降指令
**文件**: `src/systems/internal/SurrenderCommand.js`  
**描述**: 招降-招降俘虏  
**测试要求**:
```javascript
test('成功率计算')
test('忠诚度检查')
test('招降成功')
test('招降失败')
test('忠诚度降低')
```

#### 任务 4.8: 处斩指令
**文件**: `src/systems/internal/KillCommand.js`  
**描述**: 处斩-处决俘虏  
**测试要求**: 武将移除、君主保护

#### 任务 4.9: 流放指令
**文件**: `src/systems/internal/BanishCommand.js`  
**描述**: 流放-释放俘虏  
**测试要求**: 变为在野状态

#### 任务 4.10: 赏赐指令
**文件**: `src/systems/internal/LargessCommand.js`  
**描述**: 赏赐-增加忠诚  
**测试要求**: 金钱赏赐效果、道具赏赐效果

#### 任务 4.11: 没收指令
**文件**: `src/systems/internal/ConfiscateCommand.js`  
**描述**: 没收-夺取道具  
**测试要求**: 道具转移、忠诚惩罚

#### 任务 4.12: 交易指令
**文件**: `src/systems/internal/ExchangeCommand.js`  
**描述**: 交易-买卖物资  
**测试要求**: 买粮价格计算、卖粮价格计算、商业发展度影响

#### 任务 4.13: 宴请指令
**文件**: `src/systems/internal/TreatCommand.js`  
**描述**: 宴请-恢复体力  
**测试要求**: 体力恢复量、成本扣除

#### 任务 4.14: 输送指令
**文件**: `src/systems/internal/TransportCommand.js`  
**描述**: 输送-物资运输  
**测试要求**:
```javascript
test('成功率判定')
test('成功输送')
test('被劫事件')
test('资源扣除')
```

#### 任务 4.15: 移动指令
**文件**: `src/systems/internal/MoveCommand.js`  
**描述**: 移动-调动武将  
**测试要求**:
```javascript
test('移动条件检查')
test('敌方城市不能移动')
test('不相邻城市不能移动')
test('武将成功移动')
```

---

### Phase 5: 外交系统 (第16-18天)

#### 任务 5.1: 外交系统框架
**文件**: `src/systems/diplomacy/DiplomacySystem.js`  
**描述**: 外交系统基类  
**测试要求**: 系统初始化、指令分发

#### 任务 5.2: 离间指令
**文件**: `src/systems/diplomacy/AlienateCommand.js`  
**描述**: 离间-降低忠诚度  
**测试要求**:
```javascript
test('成功率计算')
test('智力差判定')
test('忠诚度判定')
test('性格判定')
test('成功效果')
test('失败效果')
test('对话显示')
```

#### 任务 5.3: 招揽指令
**文件**: `src/systems/diplomacy/CanvassCommand.js`  
**描述**: 招揽-招募武将  
**测试要求**:
```javascript
test('成功率计算')
test('成功招揽')
test('武将移动')
test('归属变更')
test('失败效果')
```

#### 任务 5.4: 策反指令
**文件**: `src/systems/diplomacy/CounterespionageCommand.js`  
**描述**: 策反-使太守独立  
**测试要求**:
```javascript
test('太守身份检查')
test('成功率计算')
test('策反成功-新君主')
test('城市归属变更')
test('城中武将归属变更')
test('失败效果')
```

#### 任务 5.5: 劝降指令
**文件**: `src/systems/diplomacy/InduceCommand.js`  
**描述**: 劝降-使势力归降  
**测试要求**:
```javascript
test('城池数量条件检查')
test('成功率计算')
test('劝降成功')
test('所有城市归属变更')
test('武将处理')
test('失败效果')
```

#### 任务 5.6: AI外交行为
**文件**: `src/systems/diplomacy/AIDiplomacy.js`  
**描述**: AI外交决策逻辑  
**测试要求**: 目标选择策略、指令优先级、执行逻辑

---

### Phase 6: 军事与战斗系统 (第19-25天)

#### 任务 6.1: 军事系统框架
**文件**: `src/systems/military/MilitarySystem.js`  
**描述**: 军事系统基类

#### 任务 6.2: 征兵指令
**文件**: `src/systems/military/ConscriptionCommand.js`  
**描述**: 征兵-招募士兵  
**测试要求**:
```javascript
test('征兵数量计算')
test('民忠影响')
test('后备兵力限制')
test('金钱消耗')
```

#### 任务 6.3: 出征指令
**文件**: `src/systems/military/ExpeditionCommand.js`  
**描述**: 出征-发起战斗  
**测试要求**:
```javascript
test('出征条件检查')
test('武将选择')
test('兵力配置')
test('粮草配置')
test('战斗初始化')
```

#### 任务 6.4: 调兵指令
**文件**: `src/systems/military/TroopMoveCommand.js`  
**描述**: 调兵-移动兵力

#### 任务 6.5: 战斗系统核心
**文件**: `src/systems/battle/BattleSystem.js`  
**描述**: 战斗系统主类  
**测试要求**:
```javascript
test('战斗初始化')
test('回合流程')
test('胜负判定')
test('战斗结束处理')
```

#### 任务 6.6: 战斗地图
**文件**: `src/systems/battle/BattleMap.js`  
**描述**: 战斗地图数据和操作  
**测试要求**:
```javascript
test('地图加载')
test('地形获取')
test('单位位置')
test('地图边界检查')
```

#### 任务 6.7: BFS路径查找器
**文件**: `src/systems/battle/PathFinder.js`  
**描述**: BFS行军路径算法  
**测试要求**:
```javascript
test('15x15区域初始化')
test('地形阻力映射')
test('敌方阻挡设置')
test('友方阻挡设置')
test('BFS路径展开')
test('可移动区域计算')
test('攻击范围计算')
```

#### 任务 6.8: 战斗计算器
**文件**: `src/systems/battle/CombatCalculator.js`  
**描述**: 战斗伤害计算  
**测试要求**:
```javascript
test('攻击力计算')
test('防御力计算')
test('基础伤害计算')
test('兵种相克应用')
test('地形防御加成')
test('伤害浮动')
```

#### 任务 6.9: 战斗单位模型
**文件**: `src/models/BattleUnit.js`  
**描述**: 战斗中的单位数据  
**测试要求**:
```javascript
test('从武将创建战斗单位')
test('HP计算')
test('MP计算')
test('移动力计算')
test('状态管理')
test('装备效果应用')
```

#### 任务 6.10: 技能系统
**文件**: `src/systems/battle/SkillSystem.js`  
**描述**: 战斗技能管理  
**测试要求**:
```javascript
test('获取武将技能列表')
test('技能使用条件检查')
test('技能范围计算')
test('技能伤害计算')
test('状态效果应用')
test('MP消耗')
```

#### 任务 6.11: 天气系统
**文件**: `src/systems/battle/WeatherSystem.js`  
**描述**: 战斗天气管理  
**测试要求**:
```javascript
test('天气类型定义')
test('天气随机变换')
test('天气对技能影响')
test('天变技能效果')
```

#### 任务 6.12: AI战斗控制器
**文件**: `src/systems/battle/AIController.js`  
**描述**: 战斗AI逻辑  
**测试要求**:
```javascript
test('寻找最近敌人')
test('移动位置评估')
test('攻击目标选择')
test('技能使用决策')
test('地形利用')
test('进攻/防守策略')
```

---

### Phase 7: UI系统 (第26-30天)

#### 任务 7.1: 基础UI组件
**文件**: `src/ui/components/*.js`  
**描述**: 按钮、面板、对话框等基础组件
- Button.js - 按钮组件
- Panel.js - 面板组件
- Dialog.js - 对话框组件
- ListView.js - 列表组件
- ProgressBar.js - 进度条组件

#### 任务 7.2: 输入处理器
**文件**: `src/ui/InputHandler.js`  
**描述**: 鼠标/触摸/键盘输入处理  
**测试要求**: 点击事件、拖拽事件、键盘快捷键

#### 任务 7.3-7.9: 游戏界面
**文件**: `src/ui/screens/*.js`
- MainMenuScreen.js - 主菜单
- PeriodSelectScreen.js - 时期选择
- KingSelectScreen.js - 君主选择
- StrategyMapScreen.js - 战略地图
- CityScreen.js - 城市界面
- BattleScreen.js - 战斗界面
- SaveLoadScreen.js - 存档界面

#### 任务 7.10: 渲染器
**文件**: `src/ui/renderers/*.js`
- MapRenderer.js
- CityRenderer.js
- UnitRenderer.js
- BattleRenderer.js

---

### Phase 8: 资源生成 (第31-32天)

#### 任务 8.1: 地形SVG资源
**文件**: `src/assets/images/terrain/*.svg` (8种)  
**工具**: `tools/generate-assets.js`

#### 任务 8.2: 兵种SVG资源
**文件**: `src/assets/images/army/*.svg` (6种)  
**工具**: `tools/generate-assets.js`

#### 任务 8.3: UI元素SVG
**文件**: `src/assets/images/ui/*.svg`  
**工具**: `tools/generate-assets.js`

#### 任务 8.4: 武将头像SVG
**文件**: `src/assets/images/portraits/*.svg`  
**工具**: `tools/generate-assets.js`

#### 任务 8.5: 战略地图背景
**文件**: `src/assets/images/map_bg.svg`  
**工具**: `tools/generate-assets.js`

---

### Phase 9: 集成测试 (第33-35天)

#### 任务 9.1: 内政系统集成测试
**文件**: `tests/integration/InternalAffairs.integration.test.js`  
**描述**: 内政指令端到端测试

#### 任务 9.2: 外交系统集成测试
**文件**: `tests/integration/Diplomacy.integration.test.js`  
**描述**: 外交指令端到端测试

#### 任务 9.3: 战斗系统集成测试
**文件**: `tests/integration/Battle.integration.test.js`  
**描述**: 完整战斗流程测试

#### 任务 9.4: 完整游戏流程测试
**文件**: `tests/integration/GameFlow.integration.test.js`  
**描述**: 从开始到胜利的游戏流程

---

## 四、开发顺序建议

### 每日开发计划

| 天数 | 主要任务 | 产出 |
|------|----------|------|
| 1 | 项目初始化 + 事件总线 | 可运行的基础框架 |
| 2 | 状态管理 + 存档系统 | 状态管理功能 |
| 3 | 游戏引擎 + 测试框架 | 可测试的引擎 |
| 4 | 数据加载 + 公式计算 | 所有公式可计算 |
| 5 | 数据仓库 + 模型 | 数据层完成 |
| 6-7 | 核心系统 | 时期、回合、灾害系统 |
| 8-10 | 内政系统核心指令 | 开垦、招商、搜寻、治理 |
| 11-12 | 内政系统高级指令 | 招降、赏赐、交易等 |
| 13-15 | 剩余内政指令 + 测试 | 内政系统完成 |
| 16-18 | 外交系统 | 离间、招揽、策反、劝降 |
| 19-20 | 军事系统基础 | 征兵、出征、调兵 |
| 21-23 | 战斗系统核心 | 战斗初始化、路径、伤害 |
| 24-25 | 战斗系统高级 | 技能、天气、AI |
| 26-27 | UI基础组件 | 可复用的UI组件 |
| 28-30 | 游戏界面 | 所有游戏界面 |
| 31-32 | 资源生成 | 所有SVG资源 |
| 33-35 | 集成测试 + 修复 | 完整的测试覆盖 |

---

## 五、测试规范

### 5.1 测试文件命名
- 单元测试: `{ModuleName}.test.js`
- 集成测试: `{Feature}.integration.test.js`

### 5.2 测试覆盖率要求
- 核心系统: **≥ 90%**
- 数据层: **≥ 95%**
- 公式计算: **100%**
- 工具类: **≥ 90%**

### 5.3 测试结构模板
```javascript
// tests/unit/example.test.js
describe('ModuleName', () => {
  beforeEach(() => {
    // 初始化
  });

  afterEach(() => {
    // 清理
  });

  describe('功能分组', () => {
    test('具体测试用例', () => {
      // Arrange
      const input = ...;
      
      // Act
      const result = functionUnderTest(input);
      
      // Assert
      expect(result).toBe(expected);
    });
  });
});
```

---

## 六、注意事项

### 6.1 数值准确性
- 所有公式必须严格按文档实现
- 关键数值要有边界测试
- 随机数使用可种子化的生成器

### 6.2 性能考虑
- 路径查找使用BFS而非A*（按原设计）
- 大地图使用视口裁剪
- 频繁操作使用缓存

### 6.3 兼容性
- 支持现代浏览器（Chrome, Firefox, Safari, Edge）
- 响应式布局支持
- 触摸设备支持

### 6.4 代码规范
- 使用ES6+语法
- 类名使用PascalCase
- 方法和变量使用camelCase
- 常量使用UPPER_SNAKE_CASE

---

## 七、附录

### 7.1 设计文档索引
| 文档 | 主要内容 | 相关任务 |
|------|----------|----------|
| 01-游戏总体概述.md | 架构、数据结构 | 所有任务 |
| 02-内政系统详细设计.md | 14个内政指令 | Phase 4 |
| 03-外交系统详细设计.md | 5个外交指令 | Phase 5 |
| 04-战斗系统详细设计.md | 战斗机制、AI | Phase 6 |
| 05-数值计算与公式汇总.md | 所有公式 | 任务3.1, 6.8 |
| 06-游戏数据配置与静态资源.md | 数据格式 | Phase 2 |
| 07-游戏数据配置说明.md | 完整数据列表 | Phase 2 |
| 08-文档修正记录.md | 修正记录 | 参考 |

### 7.2 配置文件说明
- `data/game_config.json`: 38城、200将、4时期、16技能、24道具

---

**文档版本**: 1.0  
**创建日期**: 2026-02-11  
**计划工期**: 35天  
**任务总数**: 76个任务
