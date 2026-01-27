
// Utility to generate a resonance name from two skill names
export class ResonanceNamingService {
    static generateName(skill1Name: string, skill2Name: string): string {
        // Simple logic for now: 
        // 1. If both contain "・" (dots), maybe take parts?
        // 2. If Katakana + Katakana -> Split and Mix
        // 3. Kanji + Katakana -> Concatenate

        // Remove common prefixes/suffixes for cleaner combining?
        const s1 = this.cleanName(skill1Name);
        const s2 = this.cleanName(skill2Name);

        // Check for Katakana-only (approximate)
        const isKata1 = /^[\u30A0-\u30FF]+$/.test(s1);
        const isKata2 = /^[\u30A0-\u30FF]+$/.test(s2);

        if (isKata1 && isKata2) {
            // "Flash" + "Blade" -> "Flash Blade"? 
            // Or "Plasma" + "Nova" -> "Plasma Nova"
            // If they are long, maybe truncate?
            // "Prominence" (6 chars) + "Nova" (2) -> "Prominova"?
            if (s1.length > 3 && s2.length > 3) {
                return s1.substring(0, s1.length - 1) + s2.substring(1);
            }
            return s1 + s2;
        }

        // Kanji mixture
        // "極光" + "烈火" -> "極光烈火"
        return `${s1}${s2}`;
    }

    private static cleanName(name: string): string {
        // Remove specific decorative chars if needed
        return name.replace(/[・\s]/g, '');
    }
}
