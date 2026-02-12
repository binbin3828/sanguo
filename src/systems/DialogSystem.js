/**
 * 对话系统
 * 管理游戏内对话显示和台词选择
 */

export class DialogSystem {
    constructor(eventBus) {
        this.eventBus = eventBus;
        this.dialogs = this._initializeDialogs();
    }

    /**
     * 初始化对话库
     */
    _initializeDialogs() {
        return {
            // 搜寻成功
            search: {
                person_found: [
                    "听说城中有位贤者，臣已访到，此人正是 {name}！",
                    "在城中寻访多日，终于找到 {name}，此人愿意归顺！",
                    "臣在城中偶遇 {name}，此人有意投奔主公！"
                ],
                person_not_found: [
                    "听说城中有位贤者，可惜臣未能访到。",
                    "臣在城中寻访多日，未发现贤才踪迹。",
                    "城中虽传有贤者，但臣遍寻不得。"
                ],
                tool_found: [
                    "在城中找到 {name}！",
                    "在城中意外发现 {name}！",
                    "寻访贤者时，偶然发现 {name}！"
                ]
            },

            // 招降
            surrender: {
                success: [
                    "我愿加入，为主公效力！",
                    "承蒙主公不弃，愿效犬马之劳！",
                    "既被擒获，愿降！"
                ],
                fail_high_devotion: [
                    "哼！我岂是贪生怕死之徒！",
                    "你还是少费唇舌，我是不会背信弃义的！",
                    "就凭你要我归降，笑话！"
                ]
            },

            // 离间成功（按忠诚度区间）
            alienate: {
                high: [     // >80
                    "主多疑而不用，吾当如何处之！"
                ],
                medium_high: [  // >60
                    "赏罚不明，何以服众！"
                ],
                medium: [   // >40
                    "优柔寡断，非明主之像！"
                ],
                low: [      // <=40
                    "鼠目寸光，岂为明主邪！"
                ]
            },

            // 离间失败
            alienate_fail: {
                high: [     // >80
                    "天选之子，吾誓死守护！"
                ],
                medium: [   // >60
                    "鼠辈安敢行此卑鄙之事!"
                ],
                low: [      // <=60
                    "疏不间亲，阁下自重！"
                ]
            },

            // 招揽成功
            canvass_success: [
                "良禽择木而栖，贤臣择主而仕",
                "伏处一方，唯待明主，其在君乎?",
                "闻君贤名久矣，愿为君牵马坠镫！",
                "固所愿也，不敢请尔!",
                "赴汤蹈火，在所不辞！"
            ],

            // 招揽失败
            canvass_fail: [
                "燕雀安知鸿鹄之志哉!",
                "无能之辈，焉敢如此！",
                "忠臣不仕二主！"
            ],

            // 策反成功
            counterespionage_success: [
                "王侯将相，宁有种乎！",
                "揭竿而起，为民请命！",
                "积粮聚兵，逐鹿天下！"
            ],

            // 策反失败
            counterespionage_fail: [
                "君臣相得，岂屑小所可趁也！",
                "赤胆忠心，誓佐明主定天下！"
            ],

            // 劝降成功
            induce_success: [
                "事到如今，也只好降了……",
                "此乃天命，请明公善待我的部属和百姓。",
                "为了避免生灵涂炭，降也是无可奈何……",
                "我乃竭诚投降，请明公勿疑！"
            ],

            // 劝降失败
            induce_fail: [
                "此事不必再说，战场上分高低！",
                "你快回去备好兵马，我到战场上再答复你。",
                "笑话，该投降的是你们吧！",
                "大胆！竟敢小看我，滚回去喜好脖子！"
            ],

            // 输送被劫
            transport_robbed: [
                "途中遇到山贼，所输送物质被抢劫一空！"
            ],

            // 处斩确认
            kill_confirm: [
                "此人罪大恶极，当斩！",
                "斩立决！"
            ],

            // 没收惩罚
            confiscate_penalty: [
                "一片忠诚，竟遭此待遇……",
                "长此以往，人心难留……",
                "主公此举自有道理，我却无法理解……"
            ]
        };
    }

    /**
     * 获取搜寻对话
     */
    getSearchDialog(type, params = {}) {
        const dialogs = this.dialogs.search;
        let template;

        switch (type) {
            case 'person_found':
                template = this._randomChoice(dialogs.person_found);
                break;
            case 'person_not_found':
                template = this._randomChoice(dialogs.person_not_found);
                break;
            case 'tool_found':
                template = this._randomChoice(dialogs.tool_found);
                break;
            default:
                return '';
        }

        return this._format(template, params);
    }

    /**
     * 获取招降对话
     */
    getSurrenderDialog(success, devotion = 50) {
        const dialogs = this.dialogs.surrender;

        if (success) {
            return this._randomChoice(dialogs.success);
        } else {
            return this._randomChoice(dialogs.fail_high_devotion);
        }
    }

    /**
     * 获取离间对话
     */
    getAlienateDialog(success, devotion) {
        const dialogs = this.dialogs;
        let level;

        if (devotion > 80) level = 'high';
        else if (devotion > 60) level = 'medium_high';
        else if (devotion > 40) level = 'medium';
        else level = 'low';

        if (success) {
            return this._randomChoice(dialogs.alienate[level]);
        } else {
            const failLevel = level === 'medium_high' ? 'medium' : level;
            return this._randomChoice(dialogs.alienate_fail[failLevel]);
        }
    }

    /**
     * 获取招揽对话
     */
    getCanvassDialog(success) {
        const dialogs = this.dialogs;
        return this._randomChoice(
            success ? dialogs.canvass_success : dialogs.canvass_fail
        );
    }

    /**
     * 获取策反对话
     */
    getCounterespionageDialog(success) {
        const dialogs = this.dialogs;
        return this._randomChoice(
            success ? dialogs.counterespionage_success : dialogs.counterespionage_fail
        );
    }

    /**
     * 获取劝降对话
     */
    getInduceDialog(success) {
        const dialogs = this.dialogs;
        return this._randomChoice(
            success ? dialogs.induce_success : dialogs.induce_fail
        );
    }

    /**
     * 获取输送对话
     */
    getTransportDialog(robbed) {
        if (robbed) {
            return this.dialogs.transport_robbed[0];
        }
        return "物资运送完毕。";
    }

    /**
     * 获取没收惩罚对话
     */
    getConfiscatePenaltyDialog() {
        return this._randomChoice(this.dialogs.confiscate_penalty);
    }

    /**
     * 显示对话框
     */
    showDialog(speaker, message, options = {}) {
        const dialog = {
            speaker,
            message,
            ...options
        };

        if (this.eventBus) {
            this.eventBus.emit('dialog.show', dialog);
        }

        return dialog;
    }

    /**
     * 显示选择对话框
     */
    showChoiceDialog(speaker, message, choices) {
        return this.showDialog(speaker, message, {
            type: 'choice',
            choices
        });
    }

    /**
     * 显示确认对话框
     */
    showConfirmDialog(speaker, message, onConfirm, onCancel) {
        return this.showDialog(speaker, message, {
            type: 'confirm',
            onConfirm,
            onCancel
        });
    }

    /**
     * 格式化字符串
     */
    _format(template, params) {
        return template.replace(/{(\w+)}/g, (match, key) => {
            return params[key] !== undefined ? params[key] : match;
        });
    }

    /**
     * 随机选择
     */
    _randomChoice(array) {
        if (!array || array.length === 0) return '';
        return array[Math.floor(Math.random() * array.length)];
    }
}
