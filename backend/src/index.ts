import express from 'express';
import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
// import { SKILL_DEFINITIONS } from './data/skills'; // Removed

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
      console.log('Inserting default jobs from JSON...');
      // Load Jobs from JSON
      const jobsPath = path.join(__dirname, 'resources', 'jobs.json');
      const jobsData = JSON.parse(fs.readFileSync(jobsPath, 'utf-8'));

      const values = jobsData.map((job: any) => [
        job.id, job.name_jp, job.name_en, job.role, job.weapon_type, JSON.stringify(job.stat_bias), JSON.stringify(job.initial_skills || [])
      ]);

      // Add column if not exists (Hack for migration) - simplified: assuming schema handles it or we use JSON in memory for now.
      // Actually, we don't need to store initial_skills in DB jobs table if we only use it for seeding characters.
      // But wait, we iterate over `selectedJobs` later. `selectedJobs` comes from DB query.
      // So we DO need to persist it or re-read it.
      // For simplicity in this "Seed" context: I will just re-read the JSON to find the skills for the selected jobs, 
      // OR I can add a column. Adding a column is cleaner for future.
      // Let's add the column `initial_skills` to `jobs` table.

      try {
        await connection.query('ALTER TABLE jobs ADD COLUMN initial_skills JSON');
      } catch (e) { /* ignore if exists */ }

      await connection.query(
        'INSERT INTO jobs (id, name_jp, name_en, role, weapon_type, stat_bias, initial_skills) VALUES ?',
        [values]
      );
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
    // Insert Skills
    const skillsPath = path.join(__dirname, 'resources', 'skills.json');
    const skillsData = JSON.parse(fs.readFileSync(skillsPath, 'utf-8'));

    for (const skill of skillsData) {
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
    const namesPath = path.join(__dirname, 'resources', 'names.json');
    const names = JSON.parse(fs.readFileSync(namesPath, 'utf-8'));

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

    // Lookup definition from DB or JSON. Since we might have just inserted, we can read from JSON for guaranteed data.
    const jobsPath = path.join(__dirname, 'resources', 'jobs.json');
    const jobsDataForSkills = JSON.parse(fs.readFileSync(jobsPath, 'utf-8'));
    const jobSkillMap = jobsDataForSkills.reduce((acc: any, job: any) => ({ ...acc, [job.id]: job.initial_skills || [] }), {});

    const charArtsValues: any[] = [];
    for (const char of (chars as any[])) {
      const skills = jobSkillMap[char.job_id] || ['basic_slash']; // Fallback

      for (const skillId of skills) {
        if (artMap[skillId]) {
          charArtsValues.push([char.id, artMap[skillId], 1]);
        }
      }
    }

    if (charArtsValues.length > 0) {
      await connection.query(
        'INSERT INTO character_arts (character_id, art_id, mastery_level) VALUES ?',
        [charArtsValues]
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
