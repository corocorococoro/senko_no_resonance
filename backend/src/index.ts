import express from 'express';
import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { SKILL_DEFINITIONS } from './data/skills';

const app = express();
const port = 8080;

app.get('/', (req, res) => {
  res.send('Senko no Resonance Backend API');
});

// CORS Middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

// Database connection test
app.get('/health', async (req, res) => {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'db',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      port: Number(process.env.DB_PORT) || 4000,
      database: process.env.DB_DATABASE || 'senko_resonance'
    });
    await connection.end();
    res.json({ status: 'ok', db: 'connected' });
  } catch (error: any) {
    res.status(500).json({ status: 'error', db: error.message });
  }
});

// Get All Arts
app.get('/api/arts', async (req, res) => {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'db',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      port: Number(process.env.DB_PORT) || 4000,
      database: process.env.DB_DATABASE || 'senko_resonance'
    });
    const [rows] = await connection.query('SELECT * FROM arts');
    await connection.end();
    res.json(rows);
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// Get Current Party
app.get('/api/party', async (req, res) => {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'db',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      port: Number(process.env.DB_PORT) || 4000,
      database: process.env.DB_DATABASE || 'senko_resonance'
    });

    const [chars] = await connection.query('SELECT * FROM characters');
    const characterList = chars as any[];

    if (characterList.length === 0) {
      await connection.end();
      return res.json([]);
    }

    const [charArts] = await connection.query(`
            SELECT ca.character_id, a.skill_id 
            FROM character_arts ca
            JOIN arts a ON ca.art_id = a.id
        `);
    const artsMap = (charArts as any[]).reduce((acc: any, row: any) => {
      if (!acc[row.character_id]) acc[row.character_id] = [];
      acc[row.character_id].push(row.skill_id);
      return acc;
    }, {});

    const party = characterList.map(c => ({
      id: c.id,
      name: c.name,
      job: c.job,
      job_id: c.job_id,
      stats: {
        qui: c.qui,
        combo_rate: c.combo_rate,
        str: c.str,
        vit: c.vit,
        dex: c.dex,
        agi: c.agi,
        int_stat: c.int_stat,
        spi: c.spi,
        hp: c.hp,
        mp: c.mp
      },
      currentArtId: artsMap[c.id]?.[0] || 'basic_slash',
      learnedArts: artsMap[c.id] || []
    }));

    await connection.end();
    res.json(party);
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// Seed Database Endpoint
app.post('/api/seed_db', async (req, res) => {
  let connection;
  try {
    // 2. Connect to specific database for data generation
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'db',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      port: Number(process.env.DB_PORT) || 4000,
      database: process.env.DB_DATABASE || 'senko_resonance',
      multipleStatements: true
    });

    // Explicitly ensure Jobs table exists to avoid init.sql parsing issues
    await connection.query(`
        CREATE TABLE IF NOT EXISTS jobs (
            id VARCHAR(50) PRIMARY KEY,
            name_jp VARCHAR(255) NOT NULL,
            name_en VARCHAR(255) NOT NULL,
            role VARCHAR(50), 
            weapon_type VARCHAR(50),
            stat_bias JSON
        )
    `);

    // Ensure Jobs Data exists
    const [existingJobs] = await connection.query('SELECT COUNT(*) as count FROM jobs');
    const count = (existingJobs as any[])[0].count;

    if (count === 0) {
      console.log('Inserting default jobs...');
      await connection.query(`
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
            ('adventurer', '冒険者', 'Adventurer', 'Jack-of-all', 'Any', '{"hp": 1.2, "mp": 1.2}')
        `);
    }

    // --- POPULATE ARTS TABLE FROM SKILL_DEFINITIONS ---
    console.log('Seeding Arts Table...');
    // Wipe characters & Arts manually
    // Use FK disable to ensure clean drop even if circular deps exist
    await connection.query('SET FOREIGN_KEY_CHECKS = 0');
    await connection.query('TRUNCATE TABLE arts');
    await connection.query('DROP TABLE IF EXISTS character_arts');
    await connection.query('DROP TABLE IF EXISTS characters');
    await connection.query('SET FOREIGN_KEY_CHECKS = 1');

    // Insert Skills
    for (const skill of SKILL_DEFINITIONS) {
      await connection.query(`
            INSERT INTO arts 
            (skill_id, name_jp, name_en, description, base_power, attribute, system_type, mp_cost, bp_cost, target_type, 
             combo, visual_effect_instruction, sound_effect_instruction, ai_tags)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
        skill.skill_id, skill.name_jp, skill.name_en, skill.description,
        skill.base_power, skill.attribute, skill.system_type,
        skill.mp_cost, skill.bp_cost, skill.target_type,
        JSON.stringify(skill.combo),
        skill.visual_effect_instruction, skill.sound_effect_instruction,
        JSON.stringify(skill.ai_tags)
      ]);
    }


    // Explicitly Create Characters Table with job_id
    await connection.query(`
        CREATE TABLE IF NOT EXISTS characters (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            job VARCHAR(255) NOT NULL,
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
            job_id VARCHAR(50),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Recreate character_arts as well since we dropped it
    await connection.query(`
        CREATE TABLE IF NOT EXISTS character_arts (
            character_id INT,
            art_id INT,
            mastery_level INT DEFAULT 1,
            PRIMARY KEY (character_id, art_id),
            FOREIGN KEY (character_id) REFERENCES characters(id),
            FOREIGN KEY (art_id) REFERENCES arts(id)
        )
    `);

    // 3. Fetch Jobs
    const [jobs] = await connection.query('SELECT * FROM jobs');
    const jobList = jobs as any[];

    // 4. Randomly select 5 unique jobs
    const shuffled = jobList.sort(() => 0.5 - Math.random());
    const selectedJobs = shuffled.slice(0, 5);

    console.log('Selected Jobs:', selectedJobs.map(j => j.name_en));

    // 5. Create Characters
    const names = [
      "Claude", "Rena", "Celine", "Bowman", "Dias", "Precis", "Ashton", "Leon", "Noel", "Chisato", "Opera", "Ernest",
      "Fayt", "Sophia", "Cliff", "Maria", "Nel", "Albel", "Roger", "Peppita", "Mirage", "Adray",
      "Roddick", "Ilia", "Ronyx", "Millie", "Cyuss", "Ashlay", "Phia", "Ioshua", "Mavelle", "Pericci",
      "Edge", "Reimi", "Faize", "Lymle", "Bacchus", "Meracle", "Myuria", "Arumat", "Sarah",
      "Fidel", "Miki", "Victor", "Fiore", "Emmerson", "Anne", "Relia"
    ];

    const shuffledNames = names.sort(() => 0.5 - Math.random());

    const values = selectedJobs.map((job, index) => {
      const stats = job.stat_bias || {};
      const base = (val: number, bias: number | undefined) => Math.floor(val * (bias || 1.0));
      const charName = shuffledNames[index];

      return [
        charName,    // Randomized Name
        job.name_jp, // Job Name (JP) instead of Role for display
        base(100, stats.vit), // HP
        base(50, stats.mp),   // MP
        base(10, stats.qui),  // QUI
        5, // Combo Rate
        base(10, stats.str),
        base(10, stats.vit),
        base(10, stats.dex),
        base(10, stats.agi),
        base(10, stats.int_stat),
        base(10, stats.spi),
        job.id // job_id
      ];
    });

    await connection.query(
      'INSERT INTO characters (name, job, hp, mp, qui, combo_rate, str, vit, dex, agi, int_stat, spi, job_id) VALUES ?',
      [values]
    );

    // 6. Give Job-Specific Arts
    const [chars] = await connection.query('SELECT id, job_id FROM characters');
    const [arts] = await connection.query('SELECT id, skill_id FROM arts');
    const artMap = (arts as any[]).reduce((acc, art) => ({ ...acc, [art.skill_id]: art.id }), {});

    // Updated Mapping: Job/Weapon -> Skills
    const weaponSkillMap: Record<string, string[]> = {
      'Sword': ['basic_slash', 'cross_cut', 'sonic_blade', 'basic_iai'],
      'Greatsword': ['basic_smash', 'ground_breaker'],
      'Katana': ['basic_iai', 'helm_split_k', 'basic_slash'],
      'Dagger': ['basic_trust', 'shadow_stitch', 'trick_step'],
      'Spear': ['spear_thrust', 'dragoon_dive'],
      'Axe': ['tomahawk', 'basic_smash'],
      'Fist': ['basic_punch', 'lightning_kick', 'aura_blast'],
      'Bow': ['power_shot', 'rapid_fire'],
      'Rifle': ['aim_shot', 'grenade_shot'],
      'Staff': ['basic_fire', 'ice_needle', 'lightning_bolt', 'shadow_ball'],
      'Talisman': ['holy_light', 'shadow_ball'],
      'Mace': ['holy_light', 'basic_smash'],
      'Book': ['basic_fire', 'ice_needle', 'lightning_bolt'],
      'Fan': ['basic_punch', 'lightning_kick'],
      'Instrument': ['basic_trust', 'holy_light'],
      'Time Piece': ['shadow_ball', 'basic_trust'],
      'Tool': ['aim_shot', 'grenade_shot'],
      'Any': ['basic_slash', 'basic_punch', 'basic_fire'] // Adventurer
    };

    const robustArtValues = [];

    for (const char of (chars as any[])) {
      // Find Character's Weapon Type
      const job = (jobList as any[]).find(j => j.id === char.job_id);
      const weapon = job ? job.weapon_type : 'Sword';

      // Handle "Sword/Shield" -> "Sword"
      const primaryWeapon = weapon.split('/')[0];

      const pool = weaponSkillMap[primaryWeapon] || ['basic_slash'];

      // Give 2 random skills from pool (or all if small)
      // Ensure at least 1 basic
      const starers = pool.filter(s => s.startsWith('basic_'));
      const others = pool.filter(s => !s.startsWith('basic_'));

      // 1. Give 1 Basic
      if (starers.length > 0) {
        const pick = starers[Math.floor(Math.random() * starers.length)];
        if (artMap[pick]) robustArtValues.push([char.id, artMap[pick], 1]);
      } else {
        // Fallback
        if (artMap['basic_slash']) robustArtValues.push([char.id, artMap['basic_slash'], 1]);
      }

      // 2. Chance to give 2nd skill from full pool
      if (Math.random() > 0.3 && pool.length > 1) {
        const pick = pool[Math.floor(Math.random() * pool.length)];
        const already = robustArtValues.some(v => v[0] === char.id && v[1] === artMap[pick]);
        if (!already && artMap[pick]) robustArtValues.push([char.id, artMap[pick], 1]);
      }
    }

    if (robustArtValues.length > 0) {
      // Use INSERT IGNORE to handle dupes safely
      await connection.query(
        'INSERT IGNORE INTO character_arts (character_id, art_id, mastery_level) VALUES ?',
        [robustArtValues]
      );
    }

    await connection.end();

    console.log('Database Seeded with Random Party & New Skills!');
    res.json({ status: 'ok', message: 'Ready with Job-Specific Skills!', party: selectedJobs.map(j => j.name_en) });

  } catch (error: any) {
    console.error(error);
    if (connection) await connection.end().catch(() => { });
    res.status(500).json({ error: error.message });
  }
});

app.listen(port, () => {
  console.log(`Backend server listening at http://localhost:${port}`);
});
