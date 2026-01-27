import { useEffect, useRef } from 'react';
import { useGameStore } from '../store/gameStore';
import type { Art, PartyMember } from '../store/gameStore';

interface BattleAction {
    actorId: number;
    art: Art;
    targetId: string; // 'enemy' for now
    effectiveQui: number;
    isEnemy: boolean;
}

export const useBattleLoop = () => {
    const phase = useGameStore(s => s.phase);
    const addLog = useGameStore(s => s.addLog);
    const triggerDamage = useGameStore(s => s.triggerDamage);
    // Note: Actions are accessed via getState() in loop to avoid stale closures

    // Refs for persistence across renders
    const timerRef = useRef<any>(null);
    const processingRef = useRef(false);

    // State to track previous action for resonance
    const prevActionRef = useRef<{
        actorId: number;
        art: Art;
        targetId: string
    } | null>(null);

    const enemyHpRef = useRef(3000); // MVP Enemy HP

    useEffect(() => {
        if (phase !== 'BATTLE') {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
                timerRef.current = null;
            }
            processingRef.current = false;
            prevActionRef.current = null;
            return;
        } else {
            // Reset variables on Battle Start if not already running (approx check)
            // Better: we can check if it's a "New" battle? 
            // Ideally the Store should handle "Start Battle/End Battle" signals.
            // But for now, if we enter BATTLE phase and timer is null, assume new.
            if (!timerRef.current) {
                enemyHpRef.current = 3000;
                prevActionRef.current = null;
            }
        }

        if (processingRef.current) return;

        const loop = async () => {
            processingRef.current = true;

            // 1. REGEN PHASE
            useGameStore.getState().regenResources();

            // 2. PLANNING PHASE
            const state = useGameStore.getState();
            const masterArts = state.masterArts;
            const party = state.party;

            // HP check at start (if previous loop killed it but delay pending)
            if (enemyHpRef.current <= 0) {
                useGameStore.getState().setActiveAttacker(null);
                useGameStore.getState().endBattle('WIN');
                processingRef.current = false;
                return;
            };

            const actions: BattleAction[] = [];

            // AI Selection for each member
            for (const member of party) {
                const selectedArt = selectArt(member, masterArts);
                if (selectedArt) {
                    const baseQui = member.stats?.qui || 50;
                    const variance = Math.floor(Math.random() * 6);
                    const fast = selectedArt.timing?.fast_bonus || 0;
                    const delay = selectedArt.timing?.delay_penalty || 0;
                    const effectiveQui = baseQui + variance + fast - delay;

                    actions.push({
                        actorId: member.id,
                        art: selectedArt,
                        targetId: 'enemy',
                        effectiveQui,
                        isEnemy: false
                    });
                }
            }

            actions.sort((a: BattleAction, b: BattleAction) => b.effectiveQui - a.effectiveQui);

            // 3. EXECUTION PHASE
            for (const action of actions) {
                if (useGameStore.getState().phase !== 'BATTLE') break;
                if (enemyHpRef.current <= 0) break; // Check HP before action

                // Set Active Attacker for UI
                useGameStore.getState().setActiveAttacker(action.actorId);

                // --- RESONANCE CHECK (SaGa Logic) ---
                const prev = prevActionRef.current;
                const curr = action;
                let isResonance = false;

                if (prev) {
                    const sameTarget = prev.targetId === curr.targetId;
                    const interrupt = curr.art.combo?.interrupts_chain;
                    const sendTags = prev.art.combo?.send_tags || [];
                    const receiveTags = curr.art.combo?.receive_tags || [];
                    const hasTagMatch = sendTags.some(t => receiveTags.includes(t));

                    if (sameTarget && !interrupt && hasTagMatch) {
                        isResonance = true;
                    } else {
                        isResonance = false;
                    }
                }

                if (isResonance && prev) {
                    useGameStore.getState().registerResonanceChain(prev.art.skill_id, curr.art.skill_id);
                    useGameStore.getState().incrementResonance();
                } else {
                    if (prev) {
                        useGameStore.getState().resetChain();
                    }
                }

                // Update Prev
                prevActionRef.current = action;

                // --- VISUAL & DAMAGE ---
                useGameStore.getState().consumeResource(action.actorId, action.art);

                // Set Current Action for UI (Phase 17)
                const actorName = state.party.find(p => p.id === action.actorId)?.name || 'Unknown';
                useGameStore.getState().setCurrentAction({ actorName, skillName: action.art.name_jp });

                // Calculate Damage (simplified)
                const resonanceCount = useGameStore.getState().resonanceCount;
                const baseDmg = action.art.base_power;
                const mult = Math.pow(1.5, resonanceCount); // Exponential!
                const dmg = Math.floor(baseDmg * mult);

                // 4. GLIMMER CHECK (Restored)
                const currentMember = state.party.find(p => p.id === action.actorId);
                if (currentMember) {
                    const potentialGlimmers: Art[] = Object.values(masterArts).filter(art =>
                        art.inspiration_source &&
                        Array.isArray(art.inspiration_source) &&
                        art.inspiration_source.includes(action.art.skill_id) &&
                        !currentMember.learnedArts.includes(art.skill_id)
                    );

                    if (potentialGlimmers.length > 0) {
                        const baseChance = 0.05 + (resonanceCount * 0.02);
                        for (const art of potentialGlimmers) {
                            // console.log(`Checking glimmer for ${art.name_jp}: chance ${baseChance}`);
                            if (Math.random() < baseChance) {
                                console.log(`Glimmer! ${currentMember.name} learned ${art.name_jp}`);
                                addLog(`💡 ${currentMember.name} glimmered "${art.name_jp}"!`);

                                // We need to set glimmer active state
                                useGameStore.getState().setGlimmerActive(true);
                                useGameStore.getState().learnArt(currentMember.id, art.skill_id);
                                await new Promise(r => setTimeout(r, 800)); // Pause for effect
                                useGameStore.getState().setGlimmerActive(false);
                                break; // Only learn one at a time per action
                            }
                        }
                    }
                }

                addLog(`${getActionName(action.art)}!! ${dmg} DMG`);
                triggerDamage(dmg);

                // Decrement HP
                enemyHpRef.current -= dmg;

                if (enemyHpRef.current <= 0) {
                    useGameStore.getState().setActiveAttacker(null);
                    useGameStore.getState().endBattle('WIN');
                    processingRef.current = false;
                    if (timerRef.current) clearTimeout(timerRef.current);
                    return;
                }

                // Delay
                await new Promise(r => setTimeout(r, 600));
            }

            useGameStore.getState().setActiveAttacker(null);
            processingRef.current = false;

            // Loop Again if Battle continues
            if (useGameStore.getState().phase === 'BATTLE' && enemyHpRef.current > 0) {
                timerRef.current = setTimeout(loop, 1000); // 1 sec between turns
            }
        };

        timerRef.current = setTimeout(loop, 1000);

        return () => {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
                timerRef.current = null;
            }
            processingRef.current = false;
        };

    }, [phase]); // Re-run if phase toggles
};

// Helper: Select Art (Reuse logic from App.tsx or simplify)
function selectArt(member: PartyMember, masterArts: Record<string, Art>): Art | null {
    const s = member.battleState;
    const valid = member.learnedArts.map(id => masterArts[id]).filter(a => {
        if (!a) return false;
        if (s.bp.current < a.bp_cost) return false;
        if (s.cooldowns[a.skill_id] > 0) return false;
        return true;
    });
    if (valid.length === 0) return null;
    return valid[Math.floor(Math.random() * valid.length)]; // Random for now
}

function getActionName(art: Art) {
    return art.name_jp;
}
