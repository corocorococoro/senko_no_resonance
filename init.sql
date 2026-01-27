CREATE DATABASE IF NOT EXISTS senko_resonance;
USE senko_resonance;

CREATE TABLE IF NOT EXISTS characters (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    job VARCHAR(255) NOT NULL,
    -- Simple stats for MVP
    hp INT DEFAULT 100,
    mp INT DEFAULT 50,
    qui INT DEFAULT 10,
    combo_rate INT DEFAULT 5,
    str INT DEFAULT 10,
    vit INT DEFAULT 10,
    dex INT DEFAULT 10,
    agi INT DEFAULT 10,
    int_stat INT DEFAULT 10,
    spi INT DEFAULT 10,
    job_id VARCHAR(50),  -- Link to Job
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS jobs (
    id VARCHAR(50) PRIMARY KEY,
    name_jp VARCHAR(255) NOT NULL,
    name_en VARCHAR(255) NOT NULL,
    role VARCHAR(50), -- Attacker, Healer, Tank, Tech, Buffer, Support
    weapon_type VARCHAR(50),
    stat_bias JSON -- e.g. {"str": 1.2, "agi": 0.8}
);

DROP TABLE IF EXISTS character_arts;
DROP TABLE IF EXISTS arts;
CREATE TABLE IF NOT EXISTS arts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    skill_id VARCHAR(50) UNIQUE NOT NULL,
    name_jp VARCHAR(255) NOT NULL,
    name_en VARCHAR(255) NOT NULL,
    description TEXT,
    base_power INT DEFAULT 0,
    attribute VARCHAR(50),
    system_type VARCHAR(50),
    mp_cost INT DEFAULT 0,
    bp_cost INT DEFAULT 0,
    target_type VARCHAR(50),
    
    -- Deep JSON Fields for SaGa Logic
    inspiration_source JSON,
    chain_compatibility JSON,
    
    combo JSON,    -- send_tags, receive_tags, weight...
    timing JSON,   -- fast_bonus, delay_penalty
    stance JSON,   -- enter, exit, lock
    charges JSON,  -- max, start, regen
    repeat_penalty JSON,
    spark JSON,
    ai_tags JSON,
    learnable_jobs JSON, -- Array of job_ids who can learn this. If null/empty, anyone.

    visual_effect_instruction TEXT,
    sound_effect_instruction TEXT,
    
    cooldown_turns INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS character_arts (
    character_id INT,
    art_id INT,
    mastery_level INT DEFAULT 1,
    PRIMARY KEY (character_id, art_id),
    FOREIGN KEY (character_id) REFERENCES characters(id),
    FOREIGN KEY (art_id) REFERENCES arts(id)
);

-- DATA SEEDING will be handled partially by Backend for randomness, but we can seed Jobs/Arts here.

-- 1. Jobs Data (20 Classes)
INSERT INTO jobs (id, name_jp, name_en, role, weapon_type, stat_bias) VALUES
('mercenary', '傭兵', 'Mercenary', 'Attacker', 'Greatsword', '{"str": 1.5, "vit": 1.2}'),
('fencer', '剣士', 'Fencer', 'Attacker', 'Sword', '{"dex": 1.4, "agi": 1.2}'),
('monk', '武闘家', 'Monk', 'Attacker', 'Fist', '{"agi": 1.5, "str": 1.1}'),
('paladin', '聖騎士', 'Paladin', 'Tank', 'Sword/Shield', '{"vit": 1.5, "spi": 1.2}'),
('mage', '魔術師', 'Mage', 'Magic', 'Staff', '{"int_stat": 1.5, "mp": 1.4}'),
('cleric', '僧侶', 'Cleric', 'Healer', 'Mace', '{"spi": 1.5, "mp": 1.3}'),
('ranger', '狩人', 'Ranger', 'Ranged', 'Bow', '{"dex": 1.3, "qui": 1.3}'),
('ninja', '密偵', 'Ninja', 'Tech', 'Katana/Kunai', '{"agi": 1.6, "dex": 1.2}'),
('heavy_knight', '重装兵', 'Heavy Knight', 'Tank', 'Axe', '{"vit": 1.6, "str": 1.3}'),
('samurai', '侍', 'Samurai', 'Attacker', 'Katana', '{"str": 1.4, "dex": 1.2}'),
('dragoon', '竜騎士', 'Dragoon', 'Attacker', 'Spear', '{"str": 1.3, "agi": 1.3}'),
('onmyoji', '陰陽師', 'Onmyoji', 'Buffer', 'Talisman', '{"int_stat": 1.3, "spi": 1.4}'),
('gunner', '銃士', 'Gunner', 'Ranged', 'Rifle', '{"dex": 1.6}'),
('bard', '吟遊詩人', 'Bard', 'Support', 'Instrument', '{"qui": 1.4}'),
('dancer', '踊り子', 'Dancer', 'Support', 'Fan', '{"agi": 1.4}'),
('chronomancer', '時魔道士', 'Chronomancer', 'Magic', 'Time Piece', '{"int_stat": 1.4, "qui": 1.4}'),
('assassin', '暗殺者', 'Assassin', 'Tech', 'Dagger', '{"agi": 1.4, "dex": 1.4}'),
('machinist', '機工士', 'Machinist', 'Tech', 'Tool', '{"dex": 1.3, "int_stat": 1.3}'),
('summoner', '召喚士', 'Summoner', 'Magic', 'Book', '{"mp": 1.8}'),
('adventurer', '冒険者', 'Adventurer', 'Jack-of-all', 'Any', '{"hp": 1.2, "mp": 1.2}');

-- 2. Arts Data
INSERT INTO arts (skill_id, name_jp, name_en, description, base_power, attribute, system_type, mp_cost, bp_cost, target_type, inspiration_source, chain_compatibility, combo, timing, stance, charges, repeat_penalty, spark, ai_tags, learnable_jobs, visual_effect_instruction, sound_effect_instruction, cooldown_turns) VALUES 
('basic_slash', 'ベーシックスラッシュ', 'Basic Slash', 'すべての剣技の起点となる基本斬撃。', 80, '斬', '剣技', 2, 2, '単体', '[]', '{"next_attribute_bonus": "突", "chain_bonus_rate": 1.2}', '{"send_tags": ["Move"], "receive_tags": ["Move", "Down"], "never_combo": false, "interrupts_chain": false, "combo_weight": 1.0, "combo_role": "starter", "max_combo_depth": 1}', '{"fast_bonus": 0, "delay_penalty": 0}', '{"enter": "none", "exit": "none", "lock_turns": 0, "shift_bp_cost": 0}', '{"max": 0, "start": 0, "regen_interval_turns": 0}', '{"same_skill_decay": [1, 0.85, 0.7], "same_attribute_decay": [1, 0.9, 0.8], "reset_after_turns": 2}', '{"is_provisional_on_learn": false, "provisional_uses_per_battle": 0, "stabilize": {"condition": "use_total", "value": 0}}', '["starter", "chain_builder"]', '[]', '白い斬線が高速で走る。', '軽い金属スラッシュ音。', 0),
('basic_punch', 'ベーシックパンチ', 'Basic Punch', '体術連携の起点となる直線打撃。', 75, '打', '拳法', 2, 2, '単体', '[]', '{"next_attribute_bonus": "雷", "chain_bonus_rate": 1.2}', '{"send_tags": ["Down"], "receive_tags": ["Move", "Down"], "never_combo": false, "interrupts_chain": false, "combo_weight": 1.0, "combo_role": "starter", "max_combo_depth": 1}', '{"fast_bonus": 1, "delay_penalty": 0}', '{"enter": "none", "exit": "none", "lock_turns": 0, "shift_bp_cost": 0}', '{"max": 0, "start": 0, "regen_interval_turns": 0}', '{"same_skill_decay": [1, 0.85, 0.7], "same_attribute_decay": [1, 0.9, 0.8], "reset_after_turns": 2}', '{"is_provisional_on_learn": false, "provisional_uses_per_battle": 0, "stabilize": {"condition": "use_total", "value": 0}}', '["starter", "chain_builder"]', '拳の残像が短く残る。', '乾いた打撃音。', 0),
('basic_fire', 'ベーシックファイア', 'Basic Fire', '火術連携の起点となる小火球。', 85, '火', '術法', 3, 3, '単体', '[]', '{"next_attribute_bonus": "風", "chain_bonus_rate": 1.25}', '{"send_tags": ["Hot"], "receive_tags": ["Hot", "Move"], "never_combo": false, "interrupts_chain": false, "combo_weight": 1.0, "combo_role": "starter", "max_combo_depth": 1}', '{"fast_bonus": 0, "delay_penalty": 0}', '{"enter": "none", "exit": "none", "lock_turns": 0, "shift_bp_cost": 0}', '{"max": 0, "start": 0, "regen_interval_turns": 0}', '{"same_skill_decay": [1, 0.85, 0.7], "same_attribute_decay": [1, 0.9, 0.8], "reset_after_turns": 2}', '{"is_provisional_on_learn": false, "provisional_uses_per_battle": 0, "stabilize": {"condition": "use_total", "value": 0}}', '["starter", "chain_builder"]', '小さな火球が直進する。', '点火音と小爆発。', 0),
('slash_double_cut', '二段斬り', 'Double Cut', '素早く二度斬りつける基本派生。', 120, '斬', '剣技', 5, 4, '単体', '["basic_slash"]', '{"next_attribute_bonus": "斬", "chain_bonus_rate": 1.3}', '{"send_tags": ["Move", "Down"], "receive_tags": ["Move"], "never_combo": false, "interrupts_chain": false, "combo_weight": 1.1, "combo_role": "connector", "max_combo_depth": 3}', '{"fast_bonus": 0, "delay_penalty": 0}', '{"enter": "none", "exit": "none", "lock_turns": 0, "shift_bp_cost": 0}', '{"max": 0, "start": 0, "regen_interval_turns": 0}', '{"same_skill_decay": [1, 0.8, 0.6], "same_attribute_decay": [1, 0.85, 0.7], "reset_after_turns": 2}', '{"is_provisional_on_learn": false, "provisional_uses_per_battle": 0, "stabilize": {"condition": "use_total", "value": 0}}', '["chain_builder"]', '斬線が二本連続で走る。', '金属音二連。', 1),
('slash_cross', '十字斬', 'Cross Slash', '交差する二閃で確実に切り裂く。', 135, '斬', '剣技', 6, 5, '単体', '["slash_double_cut"]', '{"next_attribute_bonus": "突", "chain_bonus_rate": 1.35}', '{"send_tags": ["Down"], "receive_tags": ["Move", "InstantStop"], "never_combo": false, "interrupts_chain": false, "combo_weight": 1.15, "combo_role": "connector", "max_combo_depth": 4}', '{"fast_bonus": 0, "delay_penalty": 0}', '{"enter": "none", "exit": "none", "lock_turns": 0, "shift_bp_cost": 0}', '{"max": 0, "start": 0, "regen_interval_turns": 0}', '{"same_skill_decay": [1, 0.8, 0.6], "same_attribute_decay": [1, 0.85, 0.7], "reset_after_turns": 2}', '{"is_provisional_on_learn": false, "provisional_uses_per_battle": 0, "stabilize": {"condition": "use_total", "value": 0}}', '["chain_builder"]', '交差する斬線が光る。', '重なった斬撃音。', 1),
('slash_finisher_arc', '終刃・円閃', 'Final Arc', '連携の締めに最適な高威力回転斬り。', 190, '斬', '剣技', 10, 8, '単体', '["slash_cross"]', '{"next_attribute_bonus": "無", "chain_bonus_rate": 1.5}', '{"send_tags": ["Down"], "receive_tags": ["Move", "InstantStop", "DeadStop"], "never_combo": false, "interrupts_chain": false, "combo_weight": 1.3, "combo_role": "finisher", "max_combo_depth": 99}', '{"fast_bonus": -1, "delay_penalty": 1}', '{"enter": "assault", "exit": "none", "lock_turns": 1, "shift_bp_cost": 1}', '{"max": 1, "start": 1, "regen_interval_turns": 4}', '{"same_skill_decay": [1, 0.7, 0.5], "same_attribute_decay": [1, 0.8, 0.6], "reset_after_turns": 3}', '{"is_provisional_on_learn": true, "provisional_uses_per_battle": 1, "stabilize": {"condition": "use_total", "value": 8}}', '["finisher"]', '巨大な円状斬撃が広がる。', '重低音の斬撃SE。', 2),
('punch_upper', 'アッパー', 'Uppercut', '敵を浮かせる上方向の打撃。', 115, '打', '拳法', 5, 4, '単体', '["basic_punch"]', '{"next_attribute_bonus": "斬", "chain_bonus_rate": 1.3}', '{"send_tags": ["InstantStop"], "receive_tags": ["Down"], "never_combo": false, "interrupts_chain": false, "combo_weight": 1.1, "combo_role": "connector", "max_combo_depth": 3}', '{"fast_bonus": 1, "delay_penalty": 0}', '{"enter": "none", "exit": "none", "lock_turns": 0, "shift_bp_cost": 0}', '{"max": 0, "start": 0, "regen_interval_turns": 0}', '{"same_skill_decay": [1, 0.8, 0.6], "same_attribute_decay": [1, 0.85, 0.7], "reset_after_turns": 2}', '{"is_provisional_on_learn": false, "provisional_uses_per_battle": 0, "stabilize": {"condition": "use_total", "value": 0}}', '["chain_builder"]', '拳が上方向へ跳ね上がる。', '重い打撃音。', 1),
('punch_combo_rush', '連打拳', 'Combo Rush', '素早い連続打撃で隙を与えない。', 140, '打', '拳法', 6, 5, '単体', '["punch_upper"]', '{"next_attribute_bonus": "雷", "chain_bonus_rate": 1.35}', '{"send_tags": ["Down"], "receive_tags": ["InstantStop", "Spark"], "never_combo": false, "interrupts_chain": false, "combo_weight": 1.15, "combo_role": "connector", "max_combo_depth": 4}', '{"fast_bonus": 1, "delay_penalty": 0}', '{"enter": "none", "exit": "none", "lock_turns": 0, "shift_bp_cost": 0}', '{"max": 0, "start": 0, "regen_interval_turns": 0}', '{"same_skill_decay": [1, 0.8, 0.6], "same_attribute_decay": [1, 0.85, 0.7], "reset_after_turns": 2}', '{"is_provisional_on_learn": false, "provisional_uses_per_battle": 0, "stabilize": {"condition": "use_total", "value": 0}}', '["chain_builder"]', '拳影が連続で叩き込まれる。', '高速打撃音の連打。', 1),
('punch_finisher_break', '破砕掌', 'Break Palm', '全体重を乗せた決定打。', 200, '打', '体術奥義', 11, 9, '単体', '["punch_combo_rush"]', '{"next_attribute_bonus": "雷", "chain_bonus_rate": 1.5}', '{"send_tags": ["Down"], "receive_tags": ["InstantStop", "DeadStop"], "never_combo": false, "interrupts_chain": false, "combo_weight": 1.3, "combo_role": "finisher", "max_combo_depth": 99}', '{"fast_bonus": -1, "delay_penalty": 1}', '{"enter": "assault", "exit": "none", "lock_turns": 1, "shift_bp_cost": 1}', '{"max": 1, "start": 1, "regen_interval_turns": 4}', '{"same_skill_decay": [1, 0.7, 0.5], "same_attribute_decay": [1, 0.8, 0.6], "reset_after_turns": 3}', '{"is_provisional_on_learn": true, "provisional_uses_per_battle": 1, "stabilize": {"condition": "use_total", "value": 8}}', '["finisher"]', '衝撃波が前方へ爆発。', '重低音の掌打音。', 2),
('fire_burst', 'フレイムバースト', 'Flame Burst', '爆発的な火炎で追撃する中継術。', 130, '火', '術法', 6, 5, '単体', '["basic_fire"]', '{"next_attribute_bonus": "雷", "chain_bonus_rate": 1.35}', '{"send_tags": ["Hot", "BlackOut"], "receive_tags": ["Hot"], "never_combo": false, "interrupts_chain": false, "combo_weight": 1.15, "combo_role": "connector", "max_combo_depth": 3}', '{"fast_bonus": 0, "delay_penalty": 0}', '{"enter": "none", "exit": "none", "lock_turns": 0, "shift_bp_cost": 0}', '{"max": 0, "start": 0, "regen_interval_turns": 0}', '{"same_skill_decay": [1, 0.8, 0.6], "same_attribute_decay": [1, 0.85, 0.7], "reset_after_turns": 2}', '{"is_provisional_on_learn": false, "provisional_uses_per_battle": 0, "stabilize": {"condition": "use_total", "value": 0}}', '["chain_builder"]', '火炎が一気に膨張して爆ぜる。', '爆発音＋熱風。', 1),
('fire_chain_inferno', '連炎獄', 'Chain Inferno', '連携数に応じて激化する業火。', 210, '火', '術法奥義', 12, 9, '単体', '["fire_burst"]', '{"next_attribute_bonus": "闇", "chain_bonus_rate": 1.55}', '{"send_tags": ["Hot"], "receive_tags": ["Hot", "BlackOut", "DeadStop"], "never_combo": false, "interrupts_chain": false, "combo_weight": 1.35, "combo_role": "finisher", "max_combo_depth": 99}', '{"fast_bonus": -1, "delay_penalty": 1}', '{"enter": "none", "exit": "none", "lock_turns": 0, "shift_bp_cost": 0}', '{"max": 1, "start": 1, "regen_interval_turns": 4}', '{"same_skill_decay": [1, 0.7, 0.5], "same_attribute_decay": [1, 0.8, 0.6], "reset_after_turns": 3}', '{"is_provisional_on_learn": true, "provisional_uses_per_battle": 1, "stabilize": {"condition": "use_total", "value": 8}}', '["finisher"]', '炎が連鎖して敵を包む。', '燃え盛る轟音。', 2);
