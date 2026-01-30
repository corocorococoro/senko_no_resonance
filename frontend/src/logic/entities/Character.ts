import type { PartyMember, Art } from '../../store/gameStore';

export class Character {
    // --- Data ---
    public readonly id: number;
    private _data: PartyMember;   // The backing DTO (from Store)

    // --- Computed/Cached ---
    // private _jobStats: { class: string; role: string }; // Derived from job string

    constructor(data: PartyMember) {
        this.id = data.id;
        this._data = data;

        // Simple Job Parsing (Placeholder for future Job Class)
        // this._jobStats = this.parseJob(data.job);
    }

    // --- Accessors ---
    public get name() { return this._data.name; }
    public get jobName() { return this._data.job; }
    public get jobId() { return this._data.job_id; }
    public get hp() { return 1000; } // Placeholder until HP is implemented in Store
    public get maxHp() { return 1000; }

    // Stats
    public get qui() { return this._data.stats.qui; }
    public get comboRate() { return this._data.stats.combo_rate; }

    // Battle State
    public get currentBp() { return this._data.battleState.bp.current; }
    public get maxBp() { return this._data.battleState.bp.max; }
    public get cooldowns() { return this._data.battleState.cooldowns; }
    public get charges() { return this._data.battleState.charges; }
    public get history() { return this._data.battleState.history; }
    public get chainMeter() { return this._data.battleState.chainMeter; }

    // --- Visuals (Procedural) ---
    /** Returns a stable color based on Job */
    public getBaseColor(): number {
        // Convert to Int color (simplified: just use specific hexes for now)
        if (this.jobName === 'Hero') return 0x4488FF;
        if (this.jobName === 'Mage') return 0xFF4444;
        if (this.jobName === 'Monk') return 0x44FF44;

        // Fallback procedural color
        return 0x888888;
    }

    /** Returns a CSS color string version of base color */
    public getCssColor(): string {
        const c = this.getBaseColor();
        const r = (c >> 16) & 0xFF;
        const g = (c >> 8) & 0xFF;
        const b = c & 0xFF;
        return `rgb(${r}, ${g}, ${b})`;
    }

    /** Returns a shape type for rendering */
    public getShapeType(): 'circle' | 'square' | 'triangle' {
        const job = this.jobName.toLowerCase();
        if (job.includes('mage')) return 'triangle';
        if (job.includes('monk')) return 'circle';
        return 'square'; // Hero
    }

    // --- Logic / Behavior ---
    /** Returns the list of Arts (Skills) this character knows */
    public getArts(masterArts: Record<string, Art>): Art[] {
        return this._data.learnedArts
            .map(id => masterArts[id])
            .filter(Boolean);
    }

    /** Returns the currently selected Art */
    public getCurrentArt(masterArts: Record<string, Art>): Art | undefined {
        return masterArts[this._data.currentArtId];
    }

    /** Returns true if character can act (has BP, not stunned, etc) */
    public canAct(): boolean {
        return this.currentBp > 0;
    }

    /** Validates if an Art can be used (BP cost, Cooldown, Charges) */
    public canUseArt(art: Art): boolean {
        // 1. BP Check
        if (this.currentBp < art.bp_cost) return false;

        // 2. Cooldown Check
        if ((this.cooldowns[art.skill_id] || 0) > 0) return false;

        // 3. Charge Check
        if (art.charges) {
            const charge = this.charges[art.skill_id];
            if (!charge || charge.current <= 0) return false;
        }

        return true;
    }

    // --- Private Helpers ---
    private parseJob(job: string) {
        // "Mage" -> { class: 'Mage', role: 'DPS' }
        return { class: job, role: 'Unknown' };
    }
}
