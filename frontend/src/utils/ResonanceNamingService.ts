
export const ResonanceNamingService = {
    // Word pools based on attributes
    prefixes: {
        'Slash': ['空', '影', '真', '絶', '飛', '無双', '神速'],
        'Pierce': ['貫', '閃', '鋭', '一閃', '流星', '螺旋'],
        'Strike': ['剛', '砕', '激', '波動', '崩', '金剛'],
        'Fire': ['炎', '爆', '紅', '灼熱', '鳳凰', '業火'],
        'Ice': ['氷', '雪', '蒼', '絶対', '氷縛', '銀世界'],
        'Thunder': ['雷', '迅', '轟', '紫電', '天雷', '鳴神'],
        'Light': ['光', '聖', '輝', '天', '浄化', '救済'],
        'Dark': ['闇', '黒', '冥', '邪', '奈落', '虚無'],
        'None': ['無', '謎', '古', '極', '一']
    } as Record<string, string[]>,

    suffixes: {
        'Slash': ['斬', '剣', '刀', '陣', '乱舞', '断'],
        'Pierce': ['突き', '槍', '針', '牙', '穿'],
        'Strike': ['拳', '打', 'ハンマー', '掌', '撃'],
        'Fire': ['ノヴァ', 'フレア', 'バーン', '炎上', '火砲'],
        'Ice': ['ブリザード', 'フリーズ', 'コフィン', '氷河'],
        'Thunder': ['ボルト', 'サンダー', 'スパーク', '雷鳴'],
        'Light': ['レイ', 'セイバー', 'クロス', '光輪'],
        'Dark': ['ナイトメア', 'イクリプス', 'シェイド', '呪縛'],
        'None': ['アタック', 'インパクト', 'ゼロ', '終焉']
    } as Record<string, string[]>,

    // Special fixed combos (Easter eggs)
    specialCombos: {
        'Slash:Slash': '十文字斬り',
        'Fire:Ice': 'ツイン・エレメント',
        'Strike:Strike': 'オラオララッシュ',
        'Light:Dark': 'カオス・ジェネシス',
        'Slash:Fire': '炎の呼吸',
    } as Record<string, string>,

    generateName(prevResult: string | null, prevAttr: string, currName: string, currAttr: string, count: number): string {
        // 1. Check for specific 2-hit special combos if count is 2
        if (count === 2) {
            const key = `${prevAttr}:${currAttr}`;
            if (this.specialCombos[key] && Math.random() < 0.3) {
                return this.specialCombos[key];
            }
        }

        // 2. Chance to just "Evolve" the previous name if count > 2 (keeping the theme)
        if (prevResult && count > 2 && Math.random() < 0.4) {
            const modifiers = ['真・', '極・', '超・', '裏・', '神・'];
            const mod = modifiers[Math.floor(Math.random() * modifiers.length)];
            // Prevent double prefix
            if (!prevResult.includes('・')) {
                return mod + prevResult;
            }
        }

        // 3. Generate a new compound name based on attributes
        // Pick a prefix from Previous Attribute (or Current if random)
        const pPool = this.prefixes[prevAttr] || this.prefixes['None'];
        const sPool = this.suffixes[currAttr] || this.suffixes['None'];

        const prefix = pPool[Math.floor(Math.random() * pPool.length)];
        const suffix = sPool[Math.floor(Math.random() * sPool.length)];

        // Randomly insert "の" or space or nothing
        const connectors = ['', '', 'の', '・', ' '];
        const conn = connectors[Math.floor(Math.random() * connectors.length)];

        let name = `${prefix}${conn}${suffix}`;

        // 4. Sometimes, take Kanji from the actual skill names if available
        // Simple heuristic: Grab first 2 chars if they look like Kanji
        if (Math.random() < 0.5) {
            // "Basic Slash" (斬り) + "Fireball" (火の玉) -> "斬火"
            // This is hard without morphological analysis, but we can try simple slicing for "flavor"
            // Or just append the suffix to the current skill name
            if (currName.length > 2) {
                name = `${prefix}・${currName}`;
            }
        }

        // 5. High chain count epicness
        if (count >= 4) {
            const epics = ['ファイナル', 'アルティメット', 'オメガ', 'ファンタズム', 'インフィニティ'];
            const epic = epics[Math.floor(Math.random() * epics.length)];
            return `${epic}${name}`;
        }

        return name;
    }
};
