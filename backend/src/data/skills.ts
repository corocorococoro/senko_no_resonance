
export const SKILL_DEFINITIONS = [
    // ------------------------------------------------------------------
    // ⚔️ Sword / Greatsword (Slash)
    // ------------------------------------------------------------------
    {
        skill_id: "basic_slash",
        name_jp: "基本斬撃",
        name_en: "Basic Slash",
        description: "剣の基本となる一撃。",
        base_power: 80, attribute: "斬", system_type: "剣技",
        mp_cost: 2, bp_cost: 2, target_type: "単体",
        // Broad Receive: Can start from almost any physical hit or magic
        combo: { send_tags: ["Slash"], receive_tags: ["Slash", "Blunt", "Pierce", "Magic"], combo_weight: 1.0, combo_role: "starter", max_combo_depth: 1 },
        ai_tags: ["starter"], visual_effect_instruction: "白線スラッシュ", sound_effect_instruction: "剣撃音"
    },
    {
        skill_id: "cross_cut",
        name_jp: "十字斬り",
        name_en: "Cross Cut",
        description: "縦横二連の斬撃を見舞う。",
        base_power: 110, attribute: "斬", system_type: "剣技",
        mp_cost: 4, bp_cost: 3, target_type: "単体",
        // Strict Receive: Needs Slash setup
        combo: { send_tags: ["Slash", "Cross"], receive_tags: ["Slash"], combo_weight: 1.1, combo_role: "connector", max_combo_depth: 3 },
        ai_tags: ["chain_builder"], visual_effect_instruction: "十字のエフェクト", sound_effect_instruction: "二連斬り"
    },
    {
        skill_id: "sonic_blade",
        name_jp: "空破斬",
        name_en: "Sonic Blade",
        description: "遠距離まで届く衝撃波。",
        base_power: 90, attribute: "風", system_type: "剣技",
        mp_cost: 5, bp_cost: 3, target_type: "単体",
        combo: { send_tags: ["Slash", "Wind"], receive_tags: ["Slash", "Wind"], combo_weight: 1.0, combo_role: "starter", max_combo_depth: 2 },
        ai_tags: ["starter"], visual_effect_instruction: "風の刃が飛ぶ", sound_effect_instruction: "風切り音"
    },
    {
        // Greatsword Specific
        skill_id: "basic_smash",
        name_jp: "兜割り",
        name_en: "Helm Smash",
        description: "体重を乗せた重い一撃。",
        base_power: 100, attribute: "打", system_type: "大剣",
        mp_cost: 3, bp_cost: 3, target_type: "単体",
        // Broad Receive: Good link from light attacks
        combo: { send_tags: ["Blunt", "Down"], receive_tags: ["Slash", "Pierce", "Blunt"], combo_weight: 1.1, combo_role: "starter", max_combo_depth: 1 },
        ai_tags: ["starter"], visual_effect_instruction: "垂直に叩きつけ", sound_effect_instruction: "鈍い衝撃音"
    },
    {
        skill_id: "ground_breaker",
        name_jp: "地裂斬",
        name_en: "Ground Breaker",
        description: "地面ごと敵を粉砕する。",
        base_power: 140, attribute: "斬", system_type: "大剣",
        mp_cost: 8, bp_cost: 6, target_type: "単体",
        // Strict Receive: Only from heavy impacts (Down/Blunt)
        combo: { send_tags: ["Down", "Quake"], receive_tags: ["Down", "Blunt"], combo_weight: 1.2, combo_role: "connector", max_combo_depth: 4 },
        ai_tags: ["chain_builder"], visual_effect_instruction: "地面が割れる", sound_effect_instruction: "轟音"
    },

    // ------------------------------------------------------------------
    // 🗡️ Dagger / Katana (Tech)
    // ------------------------------------------------------------------
    {
        skill_id: "basic_trust",
        name_jp: "小突き",
        name_en: "Quick Thrust",
        description: "素早い突き攻撃。",
        base_power: 70, attribute: "突", system_type: "短剣",
        mp_cost: 1, bp_cost: 1, target_type: "単体",
        // Very Broad Receive: Can interrupt anything
        combo: { send_tags: ["Pierce"], receive_tags: ["Slash", "Blunt", "Pierce", "Magic"], combo_weight: 1.0, combo_role: "starter", max_combo_depth: 1 },
        ai_tags: ["starter"], visual_effect_instruction: "小さな発光", sound_effect_instruction: "チクッ"
    },
    {
        skill_id: "shadow_stitch",
        name_jp: "影縫い",
        name_en: "Shadow Stitch",
        description: "敵の影を縫い留め動きを封じる。",
        base_power: 50, attribute: "闇", system_type: "短剣",
        mp_cost: 5, bp_cost: 2, target_type: "単体",
        // Strict: Needs a fast setup (Pierce)
        combo: { send_tags: ["InstantStop", "Dark"], receive_tags: ["Pierce"], combo_weight: 1.1, combo_role: "connector", max_combo_depth: 2 },
        ai_tags: ["chain_builder"], visual_effect_instruction: "黒い針", sound_effect_instruction: "何かを刺す音"
    },
    {
        skill_id: "trick_step",
        name_jp: "背後斬り",
        name_en: "Trick Step",
        description: "瞬時に背後に回り込み斬りつける。",
        base_power: 90, attribute: "斬", system_type: "短剣",
        mp_cost: 4, bp_cost: 2, target_type: "単体",
        combo: { send_tags: ["Slash", "Move"], receive_tags: ["Pierce", "InstantStop"], combo_weight: 1.1, combo_role: "connector", max_combo_depth: 3 },
        ai_tags: ["chain_builder"], visual_effect_instruction: "残像移動", sound_effect_instruction: "シュンッ"
    },
    {
        // Katana
        skill_id: "basic_iai",
        name_jp: "居合い",
        name_en: "Iai Strike",
        description: "神速の抜刀術。",
        base_power: 95, attribute: "斬", system_type: "刀",
        mp_cost: 3, bp_cost: 3, target_type: "単体",
        // Specific: Reactive art
        combo: { send_tags: ["Slash", "InstantStop"], receive_tags: ["Slash", "InstantStop"], combo_weight: 1.1, combo_role: "starter", max_combo_depth: 1 },
        ai_tags: ["starter"], visual_effect_instruction: "横一文字", sound_effect_instruction: "キンッ"
    },
    {
        skill_id: "helm_split_k",
        name_jp: "唐竹割り",
        name_en: "Bamboo Split",
        description: "脳天から真っ二つにする。",
        base_power: 160, attribute: "斬", system_type: "刀",
        mp_cost: 10, bp_cost: 7, target_type: "単体",
        // Finisher: Needs a stop or strong slash
        combo: { send_tags: ["DeadStop"], receive_tags: ["InstantStop", "Slash"], combo_weight: 1.3, combo_role: "finisher", max_combo_depth: 99 },
        ai_tags: ["finisher"], visual_effect_instruction: "赤い太い斬線", sound_effect_instruction: "肉を切る音"
    },

    // ------------------------------------------------------------------
    // 🔱 Spear / Axe (Heavy/Reach)
    // ------------------------------------------------------------------
    {
        skill_id: "spear_thrust",
        name_jp: "多段突き",
        name_en: "Multi Thrust",
        description: "高速の突き連打。",
        base_power: 90, attribute: "突", system_type: "槍",
        mp_cost: 3, bp_cost: 3, target_type: "単体",
        // Broad
        combo: { send_tags: ["Pierce"], receive_tags: ["Pierce", "Slash", "Magic"], combo_weight: 1.0, combo_role: "starter", max_combo_depth: 2 },
        ai_tags: ["starter"], visual_effect_instruction: "突きの雨", sound_effect_instruction: "連撃音"
    },
    {
        skill_id: "dragoon_dive",
        name_jp: "ドラゴンダイブ",
        name_en: "Dragon Dive",
        description: "上空からの落下攻撃。",
        base_power: 150, attribute: "突", system_type: "槍",
        mp_cost: 8, bp_cost: 6, target_type: "単体",
        // Finisher: From Launcher or Down
        combo: { send_tags: ["Down", "Quake"], receive_tags: ["Launcher", "Down", "Pierce"], combo_weight: 1.25, combo_role: "finisher", max_combo_depth: 99 },
        ai_tags: ["finisher"], visual_effect_instruction: "上空から着地爆発", sound_effect_instruction: "落下音"
    },
    {
        skill_id: "tomahawk",
        name_jp: "トマホーク",
        name_en: "Tomahawk",
        description: "回転する斧を投げつける。",
        base_power: 95, attribute: "斬", system_type: "斧",
        mp_cost: 3, bp_cost: 3, target_type: "単体",
        combo: { send_tags: ["Slash", "Rotate"], receive_tags: ["Slash", "Blunt"], combo_weight: 1.0, combo_role: "starter", max_combo_depth: 1 },
        ai_tags: ["starter"], visual_effect_instruction: "回転斧", sound_effect_instruction: "風切り回転音"
    },

    // ------------------------------------------------------------------
    // 👊 Fist (Monk/Dancer)
    // ------------------------------------------------------------------
    {
        skill_id: "basic_punch",
        name_jp: "正拳突き",
        name_en: "Straight Punch",
        description: "基本の突き。",
        base_power: 75, attribute: "打", system_type: "拳法",
        mp_cost: 2, bp_cost: 2, target_type: "単体",
        // Broad Start
        combo: { send_tags: ["Blunt"], receive_tags: ["Blunt", "Slash", "Pierce"], combo_weight: 1.0, combo_role: "starter", max_combo_depth: 1 },
        ai_tags: ["starter"], visual_effect_instruction: "拳エフェクト", sound_effect_instruction: "打撃音"
    },
    {
        skill_id: "lightning_kick",
        name_jp: "稲妻キック",
        name_en: "Lightning Kick",
        description: "帯電した高速蹴り。",
        base_power: 110, attribute: "雷", system_type: "拳法",
        mp_cost: 5, bp_cost: 4, target_type: "単体",
        // Strict: Needs momentum (Blunt) or Speed (Spark)
        combo: { send_tags: ["Spark", "Blunt"], receive_tags: ["Blunt", "Spark"], combo_weight: 1.1, combo_role: "connector", max_combo_depth: 3 },
        ai_tags: ["chain_builder"], visual_effect_instruction: "黄色い軌跡", sound_effect_instruction: "電撃音"
    },
    {
        skill_id: "aura_blast",
        name_jp: "気孔弾",
        name_en: "Aura Blast",
        description: "練り上げた気を放つ。",
        base_power: 130, attribute: "光", system_type: "拳法",
        mp_cost: 8, bp_cost: 5, target_type: "単体",
        // Mid Range: Connects physical to magic
        combo: { send_tags: ["Magic", "Light"], receive_tags: ["Blunt", "Magic"], combo_weight: 1.2, combo_role: "connector", max_combo_depth: 4 },
        ai_tags: ["chain_builder"], visual_effect_instruction: "白い光球", sound_effect_instruction: "波動音"
    },

    // ------------------------------------------------------------------
    // 🏹 Bow / Gun (Ranged)
    // ------------------------------------------------------------------
    {
        skill_id: "power_shot",
        name_jp: "強弓",
        name_en: "Power Shot",
        description: "引き絞った強烈な一矢。",
        base_power: 90, attribute: "突", system_type: "弓",
        mp_cost: 3, bp_cost: 3, target_type: "単体",
        combo: { send_tags: ["Pierce"], receive_tags: ["Pierce", "Magic"], combo_weight: 1.0, combo_role: "starter", max_combo_depth: 2 },
        ai_tags: ["starter"], visual_effect_instruction: "太い矢", sound_effect_instruction: "弦音"
    },
    {
        skill_id: "rapid_fire",
        name_jp: "五月雨撃ち",
        name_en: "Rapid Fire",
        description: "雨のように矢を降らせる。",
        base_power: 80, attribute: "突", system_type: "弓",
        mp_cost: 5, bp_cost: 4, target_type: "全体",
        combo: { send_tags: ["Pierce"], receive_tags: ["Pierce"], combo_weight: 1.1, combo_role: "starter", max_combo_depth: 2 },
        ai_tags: ["starter"], visual_effect_instruction: "多数の矢", sound_effect_instruction: "連続ヒット音"
    },
    {
        skill_id: "aim_shot",
        name_jp: "精密射撃",
        name_en: "Aim Shot",
        description: "急所を狙い撃つ。",
        base_power: 95, attribute: "突", system_type: "銃",
        mp_cost: 3, bp_cost: 3, target_type: "単体",
        // Strict: Needs setup (Spotter logic -> Pierce)
        combo: { send_tags: ["InstantStop", "Pierce"], receive_tags: ["Pierce", "Blunt"], combo_weight: 1.0, combo_role: "starter", max_combo_depth: 2 },
        ai_tags: ["starter"], visual_effect_instruction: "照準ターゲット", sound_effect_instruction: "銃声"
    },
    {
        skill_id: "grenade_shot",
        name_jp: "グレネード",
        name_en: "Grenade",
        description: "爆裂弾を撃ち込む。",
        base_power: 120, attribute: "火", system_type: "銃",
        mp_cost: 6, bp_cost: 5, target_type: "単体",
        // Fire Logic
        combo: { send_tags: ["Hot", "Down"], receive_tags: ["Hot", "Pierce"], combo_weight: 1.2, combo_role: "connector", max_combo_depth: 3 },
        ai_tags: ["chain_builder"], visual_effect_instruction: "着弾爆発", sound_effect_instruction: "爆音"
    },

    // ------------------------------------------------------------------
    // 🪄 Magic (Mage/Cleric/Summoner)
    // ------------------------------------------------------------------
    {
        skill_id: "basic_fire",
        name_jp: "ファイアボルト",
        name_en: "Firebolt",
        description: "基本の火炎弾。",
        base_power: 85, attribute: "火", system_type: "魔法",
        mp_cost: 3, bp_cost: 2, target_type: "単体",
        // Broad Element Start: Accepts physical to ignite
        combo: { send_tags: ["Hot", "Magic"], receive_tags: ["Magic", "Slash", "Blunt"], combo_weight: 1.0, combo_role: "starter", max_combo_depth: 1 },
        ai_tags: ["starter"], visual_effect_instruction: "火球", sound_effect_instruction: "燃焼音"
    },
    {
        skill_id: "eruption",
        name_jp: "エラプション",
        name_en: "Eruption",
        description: "足元から溶岩を噴出させる。",
        base_power: 140, attribute: "火", system_type: "魔法",
        mp_cost: 10, bp_cost: 5, target_type: "全体",
        // Strict: Needs Fire or Downed enemy
        combo: { send_tags: ["Hot", "Down"], receive_tags: ["Hot", "Down"], combo_weight: 1.2, combo_role: "connector", max_combo_depth: 3 },
        ai_tags: ["chain_builder"], visual_effect_instruction: "マグマ噴出", sound_effect_instruction: "地響き"
    },
    {
        skill_id: "ice_needle",
        name_jp: "アイスニードル",
        name_en: "Ice Needle",
        description: "鋭い氷の棘を飛ばす。",
        base_power: 85, attribute: "氷", system_type: "魔法",
        mp_cost: 3, bp_cost: 2, target_type: "単体",
        // Broad Element Start
        combo: { send_tags: ["Cold", "Magic"], receive_tags: ["Magic", "Pierce"], combo_weight: 1.0, combo_role: "starter", max_combo_depth: 1 },
        ai_tags: ["starter"], visual_effect_instruction: "氷柱", sound_effect_instruction: "氷結音"
    },
    {
        skill_id: "blizzard",
        name_jp: "ブリザード",
        name_en: "Blizzard",
        description: "猛吹雪で敵全体を凍らせる。",
        base_power: 130, attribute: "氷", system_type: "魔法",
        mp_cost: 12, bp_cost: 6, target_type: "全体",
        // Finisher logic
        combo: { send_tags: ["Cold", "Snow"], receive_tags: ["Cold", "Magic"], combo_weight: 1.3, combo_role: "finisher", max_combo_depth: 99 },
        ai_tags: ["finisher"], visual_effect_instruction: "吹雪", sound_effect_instruction: "風雪音"
    },
    {
        skill_id: "lightning_bolt",
        name_jp: "ライトニング",
        name_en: "Lightning Bolt",
        description: "頭上から雷を落とす。",
        base_power: 90, attribute: "雷", system_type: "魔法",
        mp_cost: 4, bp_cost: 3, target_type: "単体",
        combo: { send_tags: ["Spark", "Magic"], receive_tags: ["Magic", "Spark", "Pierce"], combo_weight: 1.0, combo_role: "starter", max_combo_depth: 2 },
        ai_tags: ["starter"], visual_effect_instruction: "落雷", sound_effect_instruction: "落雷音"
    },
    {
        skill_id: "shadow_ball",
        name_jp: "シャドウボール",
        name_en: "Shadow Ball",
        description: "視界を奪う闇の球。",
        base_power: 90, attribute: "闇", system_type: "魔法",
        mp_cost: 5, bp_cost: 3, target_type: "単体",
        // Dark Magic: Connects from anything
        combo: { send_tags: ["Dark", "Magic"], receive_tags: ["Magic", "Blunt", "Slash", "Pierce"], combo_weight: 1.1, combo_role: "connector", max_combo_depth: 3 },
        ai_tags: ["chain_builder"], visual_effect_instruction: "黒い球", sound_effect_instruction: "不穏な音"
    },
    {
        skill_id: "gravity_press",
        name_jp: "グラビティプレス",
        name_en: "Gravity Press",
        description: "超重力で押し潰す。",
        base_power: 170, attribute: "闇", system_type: "魔法",
        mp_cost: 15, bp_cost: 8, target_type: "全体",
        // Ultimate Finisher
        combo: { send_tags: ["DeadStop"], receive_tags: ["Dark", "Magic", "Down"], combo_weight: 1.4, combo_role: "finisher", max_combo_depth: 99 },
        ai_tags: ["finisher"], visual_effect_instruction: "黒い重力波", sound_effect_instruction: "圧壊音"
    },
    {
        // Light/Heal
        skill_id: "holy_light",
        name_jp: "ホーリーライト",
        name_en: "Holy Light",
        description: "聖なる光で浄化する。",
        base_power: 100, attribute: "光", system_type: "魔法",
        mp_cost: 6, bp_cost: 4, target_type: "単体",
        // Broad
        combo: { send_tags: ["Light", "Magic"], receive_tags: ["Magic", "Blunt"], combo_weight: 1.0, combo_role: "starter", max_combo_depth: 2 },
        ai_tags: ["starter"], visual_effect_instruction: "光の柱", sound_effect_instruction: "ベルの音"
    }
];
