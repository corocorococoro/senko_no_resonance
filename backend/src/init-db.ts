import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';

async function initDB() {
    const config = {
        host: process.env.DB_HOST || 'db',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        port: Number(process.env.DB_PORT) || 4000,
        multipleStatements: true
    };

    console.log('Connecting to database...', config);

    try {
        const connection = await mysql.createConnection(config);
        console.log('Connected.');

        // 1. Run Init SQL
        const sqlPath = path.join(__dirname, '../init.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');
        console.log('Executing init.sql...');
        await connection.query(sql);
        console.log('Schema initialized.');

        // 2. Seed Skills
        const skillsPath = path.join(__dirname, './seeds/skills.json');
        if (fs.existsSync(skillsPath)) {
            console.log('Seeding skills from JSON...');
            const skillsData = JSON.parse(fs.readFileSync(skillsPath, 'utf8'));

            for (const skill of skillsData) {
                // Check if exists (upsert-ish)
                const [rows] = await connection.query('SELECT id FROM arts WHERE skill_id = ?', [skill.skill_id]);
                if ((rows as any[]).length === 0) {
                    await connection.query(
                        `INSERT INTO arts (
                            skill_id, name_jp, name_en, description, base_power, attribute, system_type, mp_cost, target_type, 
                            inspiration_source, chain_compatibility, visual_effect_instruction, sound_effect_instruction,
                            bp_cost, cooldown_turns, charges, repeat_penalty, spark, ai_tags
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                        [
                            skill.skill_id,
                            skill.name_jp,
                            skill.name_en,
                            skill.description,
                            skill.base_power,
                            skill.attribute,
                            skill.system,
                            skill.mp_cost,
                            skill.target,
                            JSON.stringify(skill.inspiration_source),
                            JSON.stringify(skill.chain_compatibility),
                            skill.visual_effect_instruction,
                            skill.sound_effect_instruction,
                            // New Fields
                            skill.bp_cost || 0,
                            skill.cooldown_turns || 0,
                            JSON.stringify(skill.charges || {}),
                            JSON.stringify(skill.repeat_penalty || {}),
                            JSON.stringify(skill.spark || {}),
                            JSON.stringify(skill.ai_tags || [])
                        ]
                    );
                    console.log(`Inserted skill: ${skill.name_jp}`);
                } else {
                    console.log(`Skill already exists: ${skill.name_jp}`);
                    // Optional: Update logic
                }
            }
            console.log('Skills seeded.');
        } else {
            console.log('No skills.json found at', skillsPath);
        }

        await connection.end();
    } catch (error) {
        console.error('Failed to initialize database:', error);
        process.exit(1);
    }
}

initDB();
