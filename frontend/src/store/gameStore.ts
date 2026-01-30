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
    hasActed: boolean;
}

export interface PartyMember {
    id: number;
    name: string;
    job: string;
    job_id?: string;

    // Base Stats
    stats: {
        str: number;
        vit: number;
        dex: number;
        agi: number;
        int_stat: number; // Avoid keyword 'int'
        spi: number;
        qui: number;        // Quickness: Affects turn order
        combo_rate: number; // Base probability to participate in combo
    };

    currentArtId: string;
    learnedArts: string[];
    battleState: BattleState; // New battle state container
}

import { ResonanceNamingService } from '../utils/ResonanceNamingService';

interface DiscoveredResonance {
    key: string;
    name: string;
}

interface CurrentAction {
    actorName: string;
    skillName: string;
    participants?: number[]; // IDs of participants for Cut-in
}

interface GameState {
    floor: number;
    phase: GamePhase;
    glimmerActive: boolean;
    logs: string[]; // Added logs
    lastDamage: { value: number; timestamp: number; isResonance?: boolean } | null;
    lastResonance: { name: string; count: number; timestamp: number } | null;

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
    currentAction: CurrentAction | null;

    // System
    isDataLoaded: boolean;

    // Phase 5: Skills Data & Master Data
    masterArts: Record<string, Art>;
    weaponTypes: Record<string, { scaling_stat: string }>;
    attributes: Record<string, { type: 'physical' | 'magic' }>;

    // Phase 6: Enemy State
    enemy: {
        hp: number;
        maxHp: number;
        name: string;
        stats: {
            str: number;
            def: number; // Using DEF as primary resistance for now, or split?
            agi: number;
            int_stat: number;
        };
    };

    // Phase 7: Game Constants
    constants: {
        battle: {
            initial_bp: number;
            max_bp: number;
            bp_regen_per_turn: number;
            encounter_rate: number;
        };
        resonance: {
            chain_start_chance: number;
            chain_continue_chance: number;
            max_chain: number;
        };
        glimmer: {
            base_chance: number;
            chain_bonus: number;
        };
        damage: {
            defense_factor: number;
            variance: number;
            crit_base_chance: number;
            crit_multiplier: number;
            attribute_bonus: number;
        };
    };

    // Actions
    advance: () => void;
    advance_impl: () => void; // Added for refactoring
    startBattle: () => void;
    endBattle: (result: 'WIN' | 'LOSE') => void;
    addLog: (message: string) => void;
    setGlimmerActive: (active: boolean) => void;
    triggerDamage: (value: number, isResonance?: boolean) => void;
    incrementResonance: () => void;
    resetResonance: () => void;
    resetChain: () => void;
    setActiveAttacker: (id: number | null) => void;
    setCurrentAction: (action: { actorName: string; skillName: string; participants?: number[] } | null) => void;
    fetchConstants: () => Promise<void>;
    fetchWeaponTypes: () => Promise<void>;
    fetchAttributes: () => Promise<void>;
    learnArt: (memberId: number, skillId: string) => void;

    // New Battle Actions
    initBattleState: () => void;
    regenResources: () => void;
    consumeResource: (memberId: number, art: Art) => void;
    registerResonanceChain: (prevId: string, currId: string) => void;

    // v2 Battle Actions
    damageEnemy: (amount: number, isResonance?: boolean) => void;
    executeTurn: () => { isResonance: boolean; skillName: string; damage: number; participants: number[]; actorName: string } | null;
}

const DEFAULT_BATTLE_STATE: BattleState = {
    bp: { current: 10, max: 10, regen: 3 },
    cooldowns: {},
    charges: {},
    history: [],
    chainMeter: 0,
    hasActed: false
};

export const useGameStore = create<GameState>((set, get) => ({
    floor: 1,
    phase: 'EXPLORATION',
    glimmerActive: false,
    lastDamage: null,
    lastResonance: null,
    logs: [], // Initialize
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

    isDataLoaded: false,

    constants: {
        battle: { initial_bp: 0, max_bp: 0, bp_regen_per_turn: 0, encounter_rate: 0 },
        resonance: { chain_start_chance: 0, chain_continue_chance: 0, max_chain: 0 },
        glimmer: { base_chance: 0, chain_bonus: 0 },
        damage: { defense_factor: 0, variance: 0, crit_base_chance: 0, crit_multiplier: 0, attribute_bonus: 0 }
    },

    masterArts: {},
    weaponTypes: {},
    attributes: {},

    party: [
        {
            id: 1, name: 'Hero', job: 'Hero', currentArtId: 'basic_slash', learnedArts: ['basic_slash'],
            battleState: JSON.parse(JSON.stringify(DEFAULT_BATTLE_STATE)),
            stats: { str: 10, vit: 10, dex: 10, agi: 10, int_stat: 10, spi: 10, qui: 70, combo_rate: 5 }
        },
        {
            id: 2, seed: 67890, name: 'Mage', job: 'Mage', currentArtId: 'basic_fire', learnedArts: ['basic_fire'],
            battleState: JSON.parse(JSON.stringify(DEFAULT_BATTLE_STATE)),
            stats: { str: 10, vit: 10, dex: 10, agi: 10, int_stat: 10, spi: 10, qui: 40, combo_rate: 10 }
        },
        {
            id: 3, seed: 13579, name: 'Monk', job: 'Monk', currentArtId: 'basic_punch', learnedArts: ['basic_punch'],
            battleState: JSON.parse(JSON.stringify(DEFAULT_BATTLE_STATE)),
            stats: { str: 10, vit: 10, dex: 10, agi: 10, int_stat: 10, spi: 10, qui: 90, combo_rate: 5 }
        }
    ],

    // Enemy State
    enemy: {
        hp: 0,
        maxHp: 0,
        name: '',
        stats: { str: 0, def: 0, agi: 0, int_stat: 0 }
    },

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

            // get().addLog('System: Skills data loaded v2.');

            // Fetch Constants
            try {
                const cRes = await fetch('http://localhost:8080/api/constants');
                if (cRes.ok) {
                    const cData = await cRes.json();
                    set({ constants: cData, isDataLoaded: true });
                    console.log("Game Constants Loaded:", cData);
                } else {
                    console.error("Failed to load constants, using defaults (Zeroed!)");
                }
            } catch (e) {
                console.error('Failed to fetch constants', e);
            }

        } catch (e) {
            console.error('Failed to fetch arts', e);
            // get().addLog('System: Failed to load skills data.');
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
                        seed: d.seed || (d.id * 12345), // Fallback seed
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
            // get().addLog('System: Party data loaded from persistence.');
        } catch (e) {
            console.error('Failed to fetch party', e);
            // get().addLog('System: Failed to load party data.');
        }
    },

    advance: () => {
        get().advance_impl();
    },
    advance_impl: () => {
        const { floor, addLog, startBattle, party, phase } = get();

        // 1. Exploration Phase
        if (phase === 'EXPLORATION') {
            const isBattle = Math.random() < get().constants.battle.encounter_rate;
            if (isBattle) {
                addLog(`Encountered an enemy at Floor ${floor}!`);
                startBattle();
            } else {
                set((state) => ({ floor: state.floor + 1 }));
                addLog(`Advanced to Floor ${floor + 1}. Nothing happened.`);
            }
            return;
        }

        // 2. Battle Phase (Turn Execution)
        // Simple Turn System: Pick next actor who is ready (cooldowns etc - simplified here as "Anyone can act")
        // We will randomly pick an actor for this demo, BUT check for Resonance with others.

        // Mock Timeline: Sort by QUI (Desc)
        const availableMembers = party.filter(p => p.battleState.bp.current > 0);

        if (availableMembers.length === 0) {
            get().regenResources();
            return;
        }

        // Sort by speed
        availableMembers.sort((a, b) => b.stats.qui - a.stats.qui);
        const leader = availableMembers[0];

        // CHECK RESONANCE (Lookahead)
        const participants = [leader];
        const names: string[] = [leader.currentArtId];
        const masterArts = get().masterArts;
        const leaderArt = masterArts[leader.currentArtId];

        // Check art existence
        if (!leaderArt) {
            console.warn(`Leader Art not found: ${leader.currentArtId}`);
        }

        for (let i = 1; i < availableMembers.length; i++) {
            const nextMem = availableMembers[i];
            const nextArt = masterArts[nextMem.currentArtId];

            if (!nextArt) break;

            // Link Check
            const { chain_start_chance, chain_continue_chance } = get().constants.resonance;
            // const chance = (participants.length === 1) ? chain_start_chance : chain_continue_chance; 
            // Simplified: logic in registerResonanceChain is cleaner, but hered we are forecasting.
            // Let's match the logic: 1st link uses start_chance, subsequent use continue_chance.

            const chance = (participants.length === 1) ? chain_start_chance : chain_continue_chance;
            const roll = Math.random();
            const linkSuccess = roll < chance;

            if (linkSuccess && participants.length < 5) {
                participants.push(nextMem);
                names.push(nextArt.skill_id);
            } else {
                break; // Chain broken
            }
        }

        // Create the Action(s)
        const isResonance = participants.length > 1;

        if (isResonance) {
            // GROUP ACTION
            // 1. Generate Name
            let resonanceName = "Resonance Action";
            // We can use NamingService here iteratively
            let tempName = "";
            participants.forEach((p, idx) => {
                const art = masterArts[p.currentArtId];
                if (idx === 0) tempName = art.name_jp;
                else {
                    const prevArt = masterArts[participants[idx - 1].currentArtId];
                    tempName = ResonanceNamingService.generateName(tempName, prevArt.attribute, art.name_jp, art.attribute, idx + 1);
                }
            });
            resonanceName = tempName;

            // 2. Set State
            set({
                activeAttackerId: leader.id, // Primary
                currentAction: {
                    actorName: "Party Chain",
                    skillName: resonanceName,
                    participants: participants.map(p => p.id) // NEW: List of IDs
                },
                activeResonanceName: resonanceName,
                resonanceCount: participants.length,
                lastResonance: { name: resonanceName, count: participants.length, timestamp: Date.now() }
            });

            // 3. Log
            addLog(`Resonance Triggered! ${participants.map(p => p.name).join(' -> ')}: ${resonanceName}`);

            // 4. Consume Resources for ALL
            participants.forEach(p => {
                get().consumeResource(p.id, masterArts[p.currentArtId]);
            });

        } else {
            // SOLO ACTION
            const art = leaderArt;
            set({
                activeAttackerId: leader.id,
                currentAction: { actorName: leader.name, skillName: art.name_jp },
                activeResonanceName: null,
                resonanceCount: 0
            });
            get().consumeResource(leader.id, art);
            // Setup single hit (maybe trigger logic in BattleScene)
        }
    },

    startBattle: async () => {
        get().initBattleState();

        // Strict Mode: No hardcoded fallback.
        // If API fails, we start with 0 HP (Instant Win/Bug) to alert dev.
        let enemyData = { hp: 0, maxHp: 0, name: 'LOADING_ERROR', stats: { str: 0, def: 0, agi: 0, int_stat: 0 } };

        try {
            const currentFloor = get().floor;
            const res = await fetch(`http://localhost:8080/api/encounter?floor=${currentFloor}`);
            if (res.ok) {
                const data = await res.json();
                enemyData = {
                    hp: data.hp,
                    maxHp: data.max_hp,
                    name: data.name_jp,
                    stats: data.stats || { str: 10, def: 5, agi: 5, int_stat: 5 } // Fallback
                };
                console.log("Encountered:", data);
            } else {
                console.error("Encounter API returned error");
            }
        } catch (e) {
            console.error("Failed to fetch enemy encounter", e);
        }

        set({
            phase: 'BATTLE',
            resonanceCount: 0,
            enemy: enemyData
        });
    },

    endBattle: (result) => {
        const { addLog } = get();

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
        set(state => ({
            logs: [...state.logs, message].slice(-50) // Keep last 50
        }));
    },

    setGlimmerActive: (active) => {
        set({ glimmerActive: active });
    },

    triggerDamage: (amount, isResonance = false) => {
        set(state => ({
            lastDamage: { value: amount, timestamp: Date.now(), isResonance }, // Pass flag
            stats: {
                ...state.stats,
                totalDamage: state.stats.totalDamage + amount,
                maxDamage: Math.max(state.stats.maxDamage, amount),
                resonanceTotal: state.stats.resonanceTotal + (isResonance ? 1 : 0)
            }
        }));
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

    fetchConstants: async () => {
        try {
            const res = await fetch('http://localhost:8080/api/constants');
            if (res.ok) {
                const data = await res.json();
                set({ constants: data });
                console.log("Constants Loaded:", data);
            }
        } catch (e) {
            console.error("Failed to load constants", e);
        }
    },

    fetchWeaponTypes: async () => {
        try {
            const res = await fetch('http://localhost:8080/api/weapon_types');
            if (res.ok) {
                const list = await res.json();
                const map: Record<string, any> = {};
                list.forEach((item: any) => map[item.key] = item);
                set({ weaponTypes: map });
            }
        } catch (e) { console.error("Failed to load weapon types", e); }
    },

    fetchAttributes: async () => {
        try {
            const res = await fetch('http://localhost:8080/api/attributes');
            if (res.ok) {
                const list = await res.json();
                const map: Record<string, any> = {};
                list.forEach((item: any) => map[item.key] = item);
                set({ attributes: map });
            }
        } catch (e) { console.error("Failed to load attributes", e); }
    },

    initBattleState: () => {
        const { masterArts } = get();
        set(state => ({
            logs: [], // Clear logs on new battle
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
            const regen = get().constants.battle.bp_regen_per_turn;
            const newBp = Math.min(s.bp.max, s.bp.current + regen);

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
                battleState: { ...s, hasActed: false, bp: { ...s.bp, current: newBp }, cooldowns: newCooldowns, charges: newCharges }
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
                            hasActed: true,
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

            // Default: New Chain (Count 1)
            let newResonanceCount = 1;
            let newBaseName = currArt.name_jp;
            let isChainSuccess = false;

            // Frequency Tuning
            // User feedback: "Too many resonances". We want it to be special.
            const { chain_start_chance, chain_continue_chance, max_chain } = state.constants.resonance;
            // const CHAIN_START_CHANCE = 0.3; // 30% chance to connect 1->2
            // const CHAIN_CONTINUE_CHANCE = 0.5; // 50% chance to keep going

            if (state.resonanceCount === 0) {
                // Initial State: First attack
                // Next attack will try to chain from this 1.
                newResonanceCount = 1;
                newBaseName = currArt.name_jp;
            } else {
                // Attempting compatibility
                // Logic:
                // 1. Check Technical Compatibility (Tags, etc - Mocked here as always true for now)
                // 2. Check Random Chance (The "Wakuwaku" factor)

                const chance = (state.resonanceCount === 1) ? chain_start_chance : chain_continue_chance;
                const roll = Math.random();

                const shouldChain = (roll < chance) && (state.resonanceCount < max_chain);

                if (shouldChain) {
                    isChainSuccess = true;
                    newResonanceCount = state.resonanceCount + 1;

                    if (state.resonanceCount === 1) {
                        // 1 -> 2: Start of named chain
                        newBaseName = prevArt.name_jp + "・" + currArt.name_jp;
                    } else {
                        // 2+ -> 3+: Append
                        newBaseName = (state.activeResonanceName || prevArt.name_jp) + "・" + currArt.name_jp;
                    }
                } else {
                    // Failed to chain -> Reset to 1 (New starter)
                    newResonanceCount = 1;
                    newBaseName = currArt.name_jp;
                    isChainSuccess = false;
                }
            }

            // If we reset (failed chain), we return simpler state
            if (!isChainSuccess) {
                // Important: We must update the state so the Next attack sees Count=1
                return {
                    resonanceCount: 1,
                    activeResonanceName: newBaseName
                };
            }

            // Success!! Update Grimoire & Trigger Visuals
            const key = `${prevSkillId}:${currentSkillId}`;
            const alreadyDiscovered = state.grimoire.discoveredResonances.some(r => r.key === key);
            let newGrimoire = state.grimoire;
            if (!alreadyDiscovered) {
                newGrimoire = {
                    ...state.grimoire,
                    discoveredResonances: [...state.grimoire.discoveredResonances, { key, name: newBaseName }]
                };
            }

            return {
                grimoire: newGrimoire,
                activeResonanceName: newBaseName,
                resonanceCount: newResonanceCount,
                lastResonance: { name: newBaseName, count: newResonanceCount, timestamp: Date.now() }
            };
        });
    },

    // v2 Battle Actions
    damageEnemy: (amount: number, isResonance: boolean = false) => {
        set(state => {
            const newHp = Math.max(0, state.enemy.hp - amount);
            return { enemy: { ...state.enemy, hp: newHp } };
        });

        // Trigger Damage Event (Updates Logic/Stats)
        get().triggerDamage(amount, isResonance);

        // Check for victory
        const { enemy, endBattle } = get();
        if (enemy.hp <= 0) {
            setTimeout(() => endBattle('WIN'), 1500);
        }
    },

    executeTurn: () => {
        const { party, masterArts, phase } = get();

        if (phase !== 'BATTLE') return null;

        // Sort by QUI (speed) but only pick active members who haven't acted yet
        const availableMembers = party.filter(p =>
            p.battleState.bp.current > 0 &&
            !p.battleState.hasActed
        );
        if (availableMembers.length === 0) {
            get().regenResources();
            return null;
        }

        availableMembers.sort((a, b) => b.stats.qui - a.stats.qui);
        const leader = availableMembers[0];
        const leaderArt = masterArts[leader.currentArtId];

        if (!leaderArt) return null;

        // Check for Resonance (Chain)
        const participants = [leader];

        for (let i = 1; i < availableMembers.length && participants.length < 5; i++) {
            const nextMem = availableMembers[i];
            const nextArt = masterArts[nextMem.currentArtId];
            if (!nextArt) break;

            // Dynamic Chain Chance
            const { chain_start_chance, chain_continue_chance } = get().constants.resonance;
            const chance = (participants.length === 1) ? chain_start_chance : chain_continue_chance;

            if (Math.random() < chance) {
                participants.push(nextMem);
            } else {
                break;
            }
        }

        const isResonance = participants.length > 1;

        // Calculate damage
        // Calculate damage
        let totalDamage = 0;
        let skillName = leaderArt.name_jp;
        const { damage: dmgConfig, glimmer } = get().constants;

        participants.forEach((p) => {
            const art = masterArts[p.currentArtId];
            if (!art) return;

            // 1. Identify Scaling Stat
            // Job -> Weapon Type -> Scaling Stat
            // Note: Job data is not in store, but we successfully mapped stats in backend. 
            // We need to know WHICH stat to use.
            // Helper: We need to know the weapon type of the job.
            // Since we don't have job config here, we might have to approximate or fetch job config.
            // Ideally PartyMember has `weaponType` or we infer from Job Name.
            // For now, let's use STR as default if unknown, or guess based on Class Name map?
            // BETTER: PartyMember should have `weaponType` string from backend!
            // Backend `top` query didn't send weaponType.
            // Fallback: Use STR for all for now, OR check if we can get it.
            // Wait, we have `weaponTypes` map but we don't know the character's weapon type key.
            // Let's assume 'str' for now to unblock, or use max stat?
            // Max stat is a good heuristic!
            const stats = p.stats as Record<string, number>;
            const maxStat = Object.keys(stats).reduce((a, b) => stats[a] > stats[b] ? a : b);

            const statValue = stats[maxStat] || 10;

            // 2. Base Damage
            let base = (statValue * art.base_power) / 100;

            // 3. Variance
            const variance = 1 + (Math.random() * dmgConfig.variance * 2 - dmgConfig.variance); // +/- variance
            base *= variance;

            // 4. Critical Hit
            // Crit Chance = Config Base + (DEX + LUC/QUI)/200 ? 
            // Simplified: Base + (DEX * 0.001)
            const dex = p.stats.dex || 10;
            const critChance = dmgConfig.crit_base_chance + (dex * 0.002);
            const isCrit = Math.random() < critChance;
            if (isCrit) base *= dmgConfig.crit_multiplier;

            // 5. Defense
            const def = get().enemy.stats.def || 0;
            const mitigation = def * dmgConfig.defense_factor;

            let dmg = Math.max(1, base - mitigation);

            // 6. Resonance Bonus (Individual)
            if (isResonance) {
                dmg *= (1 + (participants.length * glimmer.chain_bonus));
            }

            totalDamage += Math.floor(dmg);
        });

        if (isResonance) {
            let tempName = "";
            participants.forEach((p, idx) => {
                const art = masterArts[p.currentArtId];
                if (idx === 0) tempName = art.name_jp;
                else {
                    const prevArt = masterArts[participants[idx - 1].currentArtId];
                    tempName = ResonanceNamingService.generateName(tempName, prevArt.attribute, art.name_jp, art.attribute, idx + 1);
                }
            });
            skillName = tempName;

            // Resonance State Update
            set({
                activeAttackerId: leader.id,
                currentAction: {
                    actorName: "Party Chain",
                    skillName: skillName,
                    participants: participants.map(p => p.id)
                },
                activeResonanceName: skillName,
                resonanceCount: participants.length,
                lastResonance: { name: skillName, count: participants.length, timestamp: Date.now() }
            });
            // Log
            get().addLog(`Resonance! ${participants.map(p => p.name).join('->')} : ${totalDamage} dmg`);

        } else {
            set({
                activeAttackerId: leader.id,
                currentAction: { actorName: leader.name, skillName: leaderArt.name_jp },
                activeResonanceName: null,
                resonanceCount: 0
            });
            get().addLog(`${leader.name} uses ${leaderArt.name_jp}! ${totalDamage} dmg`);
        }

        // Apply Damage
        get().damageEnemy(totalDamage, isResonance);

        // Consume Resources
        participants.forEach(p => {
            get().consumeResource(p.id, masterArts[p.currentArtId]);
        });

        return { isResonance, skillName, damage: totalDamage, participants: participants.map(p => p.id), actorName: isResonance ? "Chain" : leader.name };
    },
}));
