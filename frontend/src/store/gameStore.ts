import { create } from 'zustand';

type GamePhase = 'EXPLORATION' | 'BATTLE' | 'RESULT';

export interface Art {
    skill_id: string; // unique
    name_jp: string;
    name_en?: string;
    description?: string;

    base_power: number;
    attribute: string;
    system?: string;

    mp_cost?: number; // Optional for now
    bp_cost: number;

    target?: string;

    inspiration_source: string[];

    chain_compatibility: {
        next_attribute_bonus: string;
        chain_bonus_rate: number;
    };

    combo: {
        send_tags: string[];
        receive_tags: string[];
        never_combo: boolean;
        interrupts_chain: boolean;
        combo_weight: number;
        combo_role?: string;
        max_combo_depth?: number;
    };

    cooldown_turns: number;

    charges?: {
        max: number;
        start: number;
        regen_interval_turns: number;
    };

    stance?: {
        enter: string;
        exit: string;
        lock_turns: number;
        shift_bp_cost: number;
    };

    repeat_penalty?: {
        same_skill_decay: number[];
        same_attribute_decay: number[];
        reset_after_turns: number;
    };

    spark?: {
        is_provisional_on_learn: boolean;
        provisional_uses_per_battle: number;
        stabilize?: {
            condition: string;
            value: number;
        };
    };

    timing?: {
        fast_bonus: number;
        delay_penalty: number;
    };

    ai_tags?: string[];

    visual_effect_instruction?: string;
    sound_effect_instruction?: string;
}

interface BattleState {
    bp: { current: number; max: number; regen: number };
    cooldowns: Record<string, number>; // skill_id -> turns
    charges: Record<string, { current: number; turns_until_regen: number }>; // skill_id -> charge state
    history: { skillId: string; attribute: string }[];
    chainMeter: number;
}

export interface PartyMember {
    id: number;
    name: string;
    job: string;
    job_id?: string;

    // Base Stats
    stats: {
        qui: number;        // Quickness: Affects turn order
        combo_rate: number; // Base probability to participate in combo
    };

    currentArtId: string;
    learnedArts: string[];
    battleState: BattleState; // New battle state container
}

// import { ResonanceNamingService } from '../utils/ResonanceNamingService';

interface DiscoveredResonance {
    key: string;
    name: string;
}

interface GameState {
    floor: number;
    phase: GamePhase;
    // logs: string[]; // Replaced by stats
    glimmerActive: boolean;
    lastDamage: { value: number; timestamp: number } | null;
    lastDamage: { value: number; timestamp: number } | null;
    lastResonance: { name: string; count: number; timestamp: number } | null; // Added count

    stats: {
        totalDamage: number;
        maxDamage: number;
        resonanceTotal: number;
        skillCounts: Record<string, number>;
    };
    grimoire: {
        discoveredResonances: DiscoveredResonance[];
    };

    // Phase 4: Resonance & Party
    resonanceCount: number;
    party: PartyMember[];
    activeResonanceName: string | null;
    activeAttackerId: number | null;
    currentAction: { actorName: string; skillName: string } | null; // Added for Phase 17

    // Phase 5: Skills Data
    masterArts: Record<string, Art>;

    // Actions
    advance: () => void;
    advance_impl: () => void; // Added for refactoring
    startBattle: () => void;
    endBattle: (result: 'WIN' | 'LOSE') => void;
    addLog: (message: string) => void;
    setGlimmerActive: (active: boolean) => void;
    triggerDamage: (value: number) => void;
    incrementResonance: () => void;
    resetResonance: () => void;
    resetChain: () => void;
    setActiveAttacker: (id: number | null) => void;
    setCurrentAction: (action: { actorName: string; skillName: string } | null) => void;
    fetchArts: () => Promise<void>;
    fetchParty: () => Promise<void>;
    learnArt: (memberId: number, skillId: string) => void;

    // New Battle Actions
    initBattleState: () => void;
    regenResources: () => void; // Call every "turn" or round
    consumeResource: (memberId: number, art: Art) => void;
    registerResonanceChain: (prevId: string, currId: string) => void;
}

const DEFAULT_BATTLE_STATE: BattleState = {
    bp: { current: 10, max: 10, regen: 3 },
    cooldowns: {},
    charges: {},
    history: [],
    chainMeter: 0
};

export const useGameStore = create<GameState>((set, get) => ({
    floor: 1,
    phase: 'EXPLORATION',
    glimmerActive: false,
    lastDamage: null,
    lastResonance: null,
    stats: {
        totalDamage: 0,
        maxDamage: 0,
        resonanceTotal: 0,
        skillCounts: {}
    },
    grimoire: {
        discoveredResonances: []
    },

    // Phase 4 Defaults
    resonanceCount: 0,
    activeResonanceName: null,
    activeAttackerId: null,
    currentAction: null, // Initial State
    party: [
        {
            id: 1,
            name: 'Hero',
            job: 'Hero', // Default
            stats: { qui: 70, combo_rate: 5 },
            currentArtId: 'basic_slash',
            learnedArts: ['basic_slash'],
            battleState: JSON.parse(JSON.stringify(DEFAULT_BATTLE_STATE))
        },
        {
            id: 2,
            name: 'Mage',
            job: 'Mage', // Default
            stats: { qui: 40, combo_rate: 10 },
            currentArtId: 'basic_fire',
            learnedArts: ['basic_fire'],
            battleState: JSON.parse(JSON.stringify(DEFAULT_BATTLE_STATE))
        },
        {
            id: 3,
            name: 'Monk',
            job: 'Monk', // Default
            stats: { qui: 90, combo_rate: 5 },
            currentArtId: 'basic_punch',
            learnedArts: ['basic_punch'],
            battleState: JSON.parse(JSON.stringify(DEFAULT_BATTLE_STATE))
        }
    ],

    masterArts: {},

    fetchArts: async () => {
        try {
            const res = await fetch('http://localhost:8080/api/arts');
            const data = await res.json();
            const artMap: Record<string, Art> = {};

            data.forEach((d: any) => {
                let inspiration = [];
                try {
                    inspiration = typeof d.inspiration_source === 'string' ? JSON.parse(d.inspiration_source) : (d.inspiration_source || []);
                } catch (e) { inspiration = []; }

                let compatibility = { next_attribute_bonus: 'None', chain_bonus_rate: 1.0 };
                try {
                    compatibility = typeof d.chain_compatibility === 'string' ? JSON.parse(d.chain_compatibility) : (d.chain_compatibility || compatibility);
                } catch (e) { }

                const parseJson = (field: any, fallback: any) => {
                    try { return typeof field === 'string' ? JSON.parse(field) : (field || fallback); } catch (e) { return fallback; }
                };

                artMap[d.skill_id] = {
                    ...d,
                    inspiration_source: Array.isArray(inspiration) ? inspiration : [],
                    chain_compatibility: compatibility,
                    combo: parseJson(d.combo, { send_tags: [], receive_tags: [], never_combo: false, interrupts_chain: false, combo_weight: 1.0 }),
                    timing: parseJson(d.timing, { fast_bonus: 0, delay_penalty: 0 }),
                    stance: parseJson(d.stance, undefined),
                    charges: parseJson(d.charges, undefined),
                    repeat_penalty: parseJson(d.repeat_penalty, undefined),
                    spark: parseJson(d.spark, undefined),
                    ai_tags: parseJson(d.ai_tags, [])
                };
            });

            set(() => {
                // Keep party learnedArts pointers valid but update masterArts
                return { masterArts: artMap };
            });

            get().addLog('System: Skills data loaded v2.');
        } catch (e) {
            console.error('Failed to fetch arts', e);
            get().addLog('System: Failed to load skills data.');
        }
    },

    fetchParty: async () => {
        try {
            const res = await fetch('http://localhost:8080/api/party');
            const data = await res.json();

            if (!Array.isArray(data) || data.length === 0) return;

            set(state => {
                const newParty = data.map((d: any) => {
                    // Initialize Battle State for fetched character
                    const battleState = JSON.parse(JSON.stringify(DEFAULT_BATTLE_STATE));

                    // Initialize Charges based on known Master Arts (if loaded)
                    const charges: Record<string, any> = {};
                    (d.learnedArts || []).forEach((skillId: string) => {
                        const art = state.masterArts[skillId];
                        if (art && art.charges) {
                            charges[skillId] = { current: art.charges.start, turns_until_regen: art.charges.regen_interval_turns };
                        }
                    });

                    battleState.charges = charges;

                    return {
                        id: d.id,
                        name: d.name,
                        job: d.job,
                        job_id: d.job_id,
                        stats: d.stats, // Should match interface
                        currentArtId: d.currentArtId,
                        learnedArts: d.learnedArts,
                        battleState: battleState
                    };
                });
                return { party: newParty };
            });
            get().addLog('System: Party data loaded from persistence.');
        } catch (e) {
            console.error('Failed to fetch party', e);
            get().addLog('System: Failed to load party data.');
        }
    },

    advance: () => {
        get().advance_impl();
    },
    advance_impl: () => {
        const { floor, addLog, startBattle } = get();
        const isBattle = Math.random() < 0.4;
        if (isBattle) {
            addLog(`Encountered an enemy at Floor ${floor}!`);
            startBattle();
        } else {
            set((state) => ({ floor: state.floor + 1 }));
            addLog(`Advanced to Floor ${floor + 1}. Nothing happened.`);
        }
    },

    startBattle: () => {
        get().initBattleState(); // Reset states
        set({ phase: 'BATTLE', resonanceCount: 0 });
    },

    endBattle: (result) => {
        const { addLog } = get();

        const resetStats = {
            totalDamage: 0,
            maxDamage: 0,
            resonanceTotal: 0,
            skillCounts: {} // Optional: Keep skill counts if we want persistent stats, but for battle UI cleanup we likely want reset. 
            // Actually, let's keep skillCounts for the run, but reset battle-specific trackers.
        };

        const battleCleanUp = {
            resonanceCount: 0,
            activeResonanceName: null,
            activeAttackerId: null,
            currentAction: null,
            lastResonance: null,
            stats: {
                ...get().stats,
                totalDamage: 0,
                resonanceTotal: 0
            }
        };

        if (result === 'WIN') {
            addLog('Victory! Gained experience.');
            set((state) => ({
                phase: 'EXPLORATION',
                floor: state.floor + 1,
                ...battleCleanUp
            }));
        } else {
            addLog('Defeat... Returning to base.');
            set({
                phase: 'EXPLORATION',
                floor: 1,
                ...battleCleanUp,
                stats: { // Full Reset on Defeat (Game Over mostly)
                    totalDamage: 0,
                    maxDamage: 0,
                    resonanceTotal: 0,
                    skillCounts: {}
                }
            });
        }
    },

    addLog: (message) => {
        console.log(`[LOG] ${message}`);
        // No updates to state.logs
    },

    setGlimmerActive: (active) => {
        set({ glimmerActive: active });
    },

    triggerDamage: (value) => {
        set(state => {
            const newTotal = state.stats.totalDamage + value;
            const newMax = Math.max(state.stats.maxDamage, value);
            return {
                lastDamage: { value, timestamp: Date.now() },
                stats: { ...state.stats, totalDamage: newTotal, maxDamage: newMax }
            };
        });
    },

    incrementResonance: () => {
        set((state) => ({
            resonanceCount: state.resonanceCount + 1,
            stats: { ...state.stats, resonanceTotal: state.stats.resonanceTotal + 1 }
        }));
    },

    resetResonance: () => set({ resonanceCount: 0, activeResonanceName: null }),
    resetChain: () => set({ resonanceCount: 0, activeResonanceName: null }),

    setActiveAttacker: (id) => set({ activeAttackerId: id }),
    setCurrentAction: (action) => set({ currentAction: action }), // Added

    learnArt: (memberId, skillId) => {
        set(state => ({
            party: state.party.map(p => {
                if (p.id === memberId && !p.learnedArts.includes(skillId)) {
                    const art = state.masterArts[skillId];
                    const charges = { ...p.battleState.charges };
                    if (art && art.charges) {
                        charges[skillId] = { current: art.charges.start, turns_until_regen: art.charges.regen_interval_turns };
                    }
                    return {
                        ...p,
                        learnedArts: [...p.learnedArts, skillId],
                        currentArtId: skillId,
                        battleState: { ...p.battleState, charges }
                    };
                }
                return p;
            })
        }));
    },

    initBattleState: () => {
        const { masterArts } = get();
        set(state => ({
            party: state.party.map(p => {
                const charges: Record<string, any> = {};
                p.learnedArts.forEach(skillId => {
                    const art = masterArts[skillId];
                    if (art && art.charges) {
                        charges[skillId] = { current: art.charges.start, turns_until_regen: art.charges.regen_interval_turns };
                    }
                });
                return {
                    ...p,
                    battleState: {
                        ...JSON.parse(JSON.stringify(DEFAULT_BATTLE_STATE)),
                        charges // Reset but keep structure
                    }
                };
            }),
            activeAttackerId: null,
            // Reset Stats for new battle
            stats: {
                totalDamage: 0,
                maxDamage: 0,
                resonanceTotal: 0,
                skillCounts: {}
            }
        }));
    },

    regenResources: () => {
        // Logic same as before (omitted for brevity in prompt, but keeping existing logic)
        // Actually I need to Include the body if I am replacing the block. 
        // Wait, replace target is huge.
        // Let's rely on the fact that I am replacing the ACTIONS area.

        // RE-IMPLEMENTING regenResources fully because replace target covers it
        const { masterArts, party } = get();
        const newParty = party.map(p => {
            const s = p.battleState;

            // BP
            const newBp = Math.min(s.bp.max, s.bp.current + s.bp.regen);

            // CD
            const newCooldowns: Record<string, number> = {};
            for (const [skillId, turns] of Object.entries(s.cooldowns)) {
                if (turns > 0) newCooldowns[skillId] = Math.max(0, turns - 1);
            }

            // Charges
            const newCharges = { ...s.charges };
            Object.keys(newCharges).forEach(skillId => {
                const art = masterArts[skillId];
                if (art && art.charges) {
                    const chargeState = newCharges[skillId];
                    if (chargeState.current < art.charges.max) {
                        chargeState.turns_until_regen--;
                        if (chargeState.turns_until_regen <= 0) {
                            chargeState.current++;
                            chargeState.turns_until_regen = art.charges.regen_interval_turns;
                        }
                    }
                }
            });

            return {
                ...p,
                battleState: { ...s, bp: { ...s.bp, current: newBp }, cooldowns: newCooldowns, charges: newCharges }
            };
        });
        set({ party: newParty });
    },

    consumeResource: (memberId, art) => {
        set(state => {
            // Update Skill Counts
            const newSkillCounts = { ...state.stats.skillCounts };
            newSkillCounts[art.name_jp] = (newSkillCounts[art.name_jp] || 0) + 1;

            return {
                stats: { ...state.stats, skillCounts: newSkillCounts },
                party: state.party.map(p => {
                    if (p.id !== memberId) return p;

                    const s = p.battleState;
                    const newBp = s.bp.current - (art.bp_cost || 0);

                    const newCooldowns = { ...s.cooldowns };
                    if (art.cooldown_turns > 0) newCooldowns[art.skill_id] = art.cooldown_turns;

                    const newCharges = { ...s.charges };
                    if (art.charges && newCharges[art.skill_id]) {
                        newCharges[art.skill_id].current--;
                    }

                    const newHistory = [...s.history, { skillId: art.skill_id, attribute: art.attribute }].slice(-5);

                    return {
                        ...p,
                        battleState: {
                            ...s,
                            bp: { ...s.bp, current: newBp },
                            cooldowns: newCooldowns,
                            charges: newCharges,
                            history: newHistory
                        }
                    };
                })
            };
        });
    },

    registerResonanceChain: (prevSkillId, currentSkillId) => {
        set(state => {
            const prevArt = state.masterArts[prevSkillId];
            const currArt = state.masterArts[currentSkillId];

            if (!prevArt || !currArt) return {};

            // Accumulative Naming Logic
            // Accumulative Naming Logic
            let baseName = state.activeResonanceName;
            let currentCount = state.resonanceCount + 1; // Increment local count for display

            if (!baseName) {
                // If this is the start of a chain, use previous art as base
                baseName = prevArt.name_jp;
                currentCount = 2; // Start at 2 for a chain
            }

            // Simple concatenation as requested by user ("Slash" + "Fire" -> "SlashFire")
            const newName =
                (state.resonanceCount === 0)
                    ? (prevArt.name_jp + currArt.name_jp) // First link: A + B
                    : (baseName + currArt.name_jp);       // Subsequent: AB + C

            // Update Grimoire logic (omitted for brevity, keep existing flow if possible or just update name)
            const key = `${prevSkillId}:${currentSkillId}`;
            const alreadyDiscovered = state.grimoire.discoveredResonances.some(r => r.key === key);
            let newGrimoire = state.grimoire;
            if (!alreadyDiscovered) {
                newGrimoire = {
                    ...state.grimoire,
                    discoveredResonances: [...state.grimoire.discoveredResonances, { key, name: newName }]
                };
            }

            return {
                grimoire: newGrimoire,
                activeResonanceName: newName,
                // Trigger Visual Callout with accumulated name AND count
                lastResonance: { name: newName, count: currentCount, timestamp: Date.now() }
            };
        });
    }
}));
