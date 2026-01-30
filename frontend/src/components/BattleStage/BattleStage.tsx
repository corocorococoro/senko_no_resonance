import React, { useRef, useEffect, useCallback } from 'react';
import { BattleSolver } from '../../logic/battle/BattleSolver';
import { useBattleDirector } from './Director/useBattleDirector';
import { VisualDirector } from './Director/VisualDirector';
import { usePixiStage } from './UI/usePixiStage';
import { useGameStore } from '../../store/gameStore';
import { Sprite, Container, Graphics, Text, TextStyle } from 'pixi.js';
import { Character } from '../../logic/entities/Character';

export const BattleStage: React.FC = () => {
    const containerRef = useRef<HTMLDivElement>(null);
    const pixi = usePixiStage(containerRef);
    const { app, layers, assets } = pixi; // Destructure commonly used props
    const director = useBattleDirector();

    // --- Character Rendering Logic ---
    const actorsRef = useRef<{
        enemy: Sprite | null;
        party: Record<number, Container>;
    }>({ enemy: null, party: {} });

    // Game Store Subscriptions
    const party = useGameStore(s => s.party);
    const lastResonance = useGameStore(s => s.lastResonance);
    const currentAction = useGameStore(s => s.currentAction);

    // Cut-in State
    const [cutInSequence, setCutInSequence] = React.useState<{ active: boolean, participants: number[], name: string, count: number }>({ active: false, participants: [], name: '', count: 0 });

    // Initialize Actors when Pixi is ready
    useEffect(() => {
        if (!pixi.isReady || !app || !layers || !assets) return;

        // Check for stale references (Survivors from previous context?)
        if (actorsRef.current.enemy && actorsRef.current.enemy.parent !== layers.chars) {
            console.warn("Found stale enemy ref! Clearing.");
            actorsRef.current.enemy = null;
        }

        // 1. Enemy Setup
        if (!actorsRef.current.enemy) {
            console.log(`Screen Dimensions: ${app.screen.width} x ${app.screen.height}`);
            console.log(`Enemy Texture: ${assets.enemy.width}x${assets.enemy.height}`);

            const enemySprite = new Sprite(assets.enemy);
            enemySprite.anchor.set(0.5);
            // Increase scale from 0.35 to 0.5
            enemySprite.scale.set(0.5);
            enemySprite.x = app.screen.width * 0.25;
            enemySprite.y = app.screen.height * 0.55;

            // FIX: Render on chars layer to ensure persistence (UI layer is cleared by VisualDirector)
            layers.chars.addChild(enemySprite);
            actorsRef.current.enemy = enemySprite;
        }

        // 2. Party Setup
        // FIX LAYOUT: Shift party left from 0.75 to 0.70 to prevent clipping
        const pcx = app.screen.width * 0.70;
        const pcy = app.screen.height * 0.55;
        const colSpacing = 80;
        const rowSpacing = 90;

        // Simple Formation Positions
        const POSITIONS = [
            { x: pcx - colSpacing, y: pcy - rowSpacing * 0.6 }, // Front Top
            { x: pcx - colSpacing, y: pcy + rowSpacing * 0.6 }, // Front Bottom
            { x: pcx + colSpacing, y: pcy },              // Back Mid
            { x: pcx + colSpacing, y: pcy - rowSpacing }, // Back Top
            { x: pcx + colSpacing, y: pcy + rowSpacing }, // Back Bottom
        ];

        party.forEach((member, i) => {
            // Check for stale member refs
            if (actorsRef.current.party[member.id] && actorsRef.current.party[member.id].parent !== layers.chars) {
                console.warn(`Found stale party ref for ${member.name}! Clearing.`);
                delete actorsRef.current.party[member.id];
            }

            let container = actorsRef.current.party[member.id];
            const pos = POSITIONS[i] || { x: pcx, y: pcy };

            // 1. Create if missing
            if (!actorsRef.current.party[member.id]) {
                console.log(`Creating Party Member ${member.name}`);
                container = new Container();
                container.x = pos.x;
                container.y = pos.y;

                // --- OOP Rendering ---
                const char = new Character(member);
                const color = char.getBaseColor();
                const shape = char.getShapeType();

                const g = new Graphics();
                g.clear();

                // Draw procedural shape
                const size = 30; // approx radius

                if (shape === 'circle') {
                    g.circle(0, 0, size);
                } else if (shape === 'triangle') {
                    // Draw triangle pointing Left (facing enemy)
                    g.poly([
                        size, -size,  // Top Right
                        size, size,   // Bottom Right
                        -size, 0      // Left Tip
                    ]);
                } else {
                    // Square
                    g.rect(-size, -size, size * 2, size * 2);
                }

                g.fill({ color, alpha: 1 });
                g.stroke({ width: 2, color: 0xFFFFFF }); // Outline

                container.addChild(g);

                // Shadow
                const shadow = new Graphics();
                shadow.ellipse(0, 0, 30, 10).fill({ color: 0x000000, alpha: 0.4 });
                shadow.y = 50;
                container.addChildAt(shadow, 0);

                // USE NEW DEDICATED LAYER 'chars'
                layers.chars.addChild(container);
                actorsRef.current.party[member.id] = container;
            }

            // 2. Update Gauges (Run every render)
            if (container) {
                // Find or Create Gauge Container
                let gauge = container.getChildByName('gauge_ui') as Container;
                if (!gauge) {
                    gauge = new Container();
                    gauge.label = 'gauge_ui'; // For debug
                    (gauge as any).name = 'gauge_ui'; // For getChildByName
                    gauge.y = 35; // Stick to character bottom (size is 30)
                    container.addChild(gauge);
                }

                // Redraw Gauges
                gauge.removeChildren().forEach(c => c.destroy());

                const w = 50;
                const h = 5;
                const gap = 2;

                // Background
                const bg = new Graphics();
                bg.rect(-w / 2 - 1, -1, w + 2, (h * 2) + gap + 2).fill(0x000000);
                bg.alpha = 0.5;
                gauge.addChild(bg);

                // HP Bar (Top) - Green
                const hpPct = 1.0; // Mock HP
                const hp = new Graphics();
                hp.rect(-w / 2, 0, w * hpPct, h).fill(0x00ff00);
                gauge.addChild(hp);

                // BP Bar (Bottom) - Yellow/Blue
                const bpPct = Math.min(1, Math.max(0, member.battleState.bp.current / member.battleState.bp.max));
                const isMax = bpPct >= 1.0;
                const bpColor = bpPct < 0.3 ? 0xff0000 : (isMax ? 0xffff00 : 0x00ccff);

                const bp = new Graphics();
                bp.rect(-w / 2, h + gap, w * bpPct, h).fill(bpColor);
                gauge.addChild(bp);

                if (isMax) {
                    bp.stroke({ width: 2, color: 0xffffff, alpha: 0.5 });
                }

                // 3. Update Nameplate (Name + Job)
                let nameplate = container.getChildByName('nameplate_ui') as Container;
                if (!nameplate) {
                    nameplate = new Container();
                    nameplate.label = 'nameplate_ui';
                    (nameplate as any).name = 'nameplate_ui';
                    nameplate.y = 10; // Overlap with character body
                    container.addChild(nameplate);
                }

                // Render Text if not already present (optimization: text doesn't change mid-battle usually)
                if (nameplate.children.length === 0) {
                    // Name Text
                    const nameStyle = new TextStyle({
                        fontFamily: 'Arial',
                        fontSize: 14,
                        fontWeight: 'bold',
                        fill: 0xffffff,
                        stroke: { color: 0x000000, width: 4, join: 'round' }, // Thick outline for readability
                        align: 'center',
                    });
                    const nameText = new Text({ text: member.name, style: nameStyle });
                    nameText.anchor.set(0.5, 1); // Bottom Center
                    nameText.y = -18; // Spacing above Job
                    nameText.eventMode = 'none'; // Passive

                    // Job Text
                    const jobStyle = new TextStyle({
                        fontFamily: 'Arial',
                        fontSize: 12,
                        fontWeight: 'normal',
                        fill: 0xcccccc, // Light gray
                        stroke: { color: 0x000000, width: 3, join: 'round' },
                        align: 'center',
                    });
                    const jobText = new Text({ text: member.job, style: jobStyle });
                    jobText.anchor.set(0.5, 1); // Bottom Center
                    jobText.y = 0;
                    jobText.eventMode = 'none';

                    nameplate.addChild(nameText, jobText);
                }
            }
        });

    }, [pixi.isReady, party]); // Depend on party data updates

    // Update Actors Loop (Idle animation)
    useEffect(() => {
        if (!pixi.isReady || !app) return;

        const tick = () => {
            const time = Date.now() / 1000;

            // Enemy Idle (Breath)
            if (actorsRef.current.enemy) {
                actorsRef.current.enemy.scale.y = 0.35 + Math.sin(time * 2) * 0.005;
                actorsRef.current.enemy.scale.x = 0.35 + Math.cos(time * 1.5) * 0.005;
            }

            // Party Idle
            Object.values(actorsRef.current.party).forEach((c, i) => {
                c.y += Math.sin(time * 3 + i) * 0.2; // Tiny float
            });
        };

        app.ticker.add(tick);
        return () => {
            if (app?.ticker) app.ticker.remove(tick);
        };
    }, [pixi.isReady]);

    // Game Store
    const phase = useGameStore(s => s.phase);
    const enemy = useGameStore(s => s.enemy);
    const executeTurn = useGameStore(s => s.executeTurn);
    const damageEnemy = useGameStore(s => s.damageEnemy);
    const addLog = useGameStore(s => s.addLog);

    // Execute turn and play visuals
    const runTurn = useCallback(() => {
        if (phase !== 'BATTLE' || director.isPlaying) return;

        const turnResult = executeTurn();
        if (!turnResult) return;

        console.log('[BattleStage] Turn Result:', turnResult);

        // Generate visual script
        const mockState = { party: [], enemy: {} } as any;
        const mockCommand = {
            actorId: 1,
            skillName: turnResult.skillName,
            isResonance: turnResult.isResonance,
            actorName: turnResult.actorName,
            damage: turnResult.damage // Pass real damage
        };

        const record = BattleSolver.resolveTurn(mockState, mockCommand);

        // Play visuals
        director.playScript(record.finalScript);

        // Apply damage after a delay (during animation)
        setTimeout(() => {
            damageEnemy(turnResult.damage, turnResult.isResonance);

            // Log Event
            if (turnResult.isResonance) {
                addLog(`⚡️ RESONANCE: ${turnResult.actorName}らの "${turnResult.skillName}"!! ${turnResult.damage} DMG`);
            } else {
                addLog(`${turnResult.actorName}の ${turnResult.skillName}!! ${turnResult.damage} DMG`);
            }
        }, turnResult.isResonance ? 2600 : 400);
    }, [phase, director, executeTurn, damageEnemy]);

    // Auto-battle loop
    useEffect(() => {
        if (phase !== 'BATTLE' || !pixi.isReady) return;

        const interval = setInterval(() => {
            if (!director.isPlaying && enemy.hp > 0) {
                runTurn();
            }
        }, 1200);

        // Trigger first turn immediately
        const timeout = setTimeout(() => {
            if (!director.isPlaying && enemy.hp > 0) {
                runTurn();
            }
        }, 500);

        return () => {
            clearInterval(interval);
            clearTimeout(timeout);
        };
    }, [phase, pixi.isReady, director.isPlaying, enemy.hp, runTurn]);

    // Sync with Resonance Action for Cut-in
    useEffect(() => {
        if (lastResonance && lastResonance.count >= 2 && currentAction?.participants && currentAction.participants.length >= 2) {
            // Cut-in starts after 500ms delay to sync with "Gyueen" effect
            const startTimer = setTimeout(() => {
                console.log(`[SEQ] 🎥 Visual Phase 2: Cut-in Start at ${Date.now()}`); // TRACE
                setCutInSequence({
                    active: true,
                    participants: currentAction.participants || [],
                    name: lastResonance.name || "RESONANCE CHAIN!!",
                    count: lastResonance.count
                });

                // Auto-hide after sequence
                const totalDuration = 2200;
                setTimeout(() => {
                    console.log(`[SEQ] 🎥 Visual Phase 3: Cut-in End at ${Date.now()}`); // TRACE
                    setCutInSequence(prev => ({ ...prev, active: false }));
                }, totalDuration);

            }, 100);

            return () => clearTimeout(startTimer);
        }
    }, [lastResonance, currentAction]);

    return (
        <div style={{
            width: '100%',
            height: '100%',
            position: 'relative',
            background: '#000'
        }}>
            {/* Visual Canvas */}
            <div
                ref={containerRef}
                style={{
                    width: '100%',
                    height: '100%',
                    position: 'absolute',
                    top: 0,
                    left: 0
                }}
            >
                {pixi.isReady && (
                    <VisualDirector
                        currentEvent={director.currentEvent}
                        onEventComplete={director.nextEvent}
                        pixi={pixi}
                    />
                )}

                {!pixi.isReady && (
                    <div style={{
                        position: 'absolute', top: '50%', left: '50%',
                        transform: 'translate(-50%, -50%)', color: '#888'
                    }}>
                        Loading...
                    </div>
                )}
            </div>

            {/* Enemy HP Bar */}
            <div style={{
                position: 'absolute',
                top: 20,
                left: '50%',
                transform: 'translateX(-50%)',
                width: '60%',
                maxWidth: 400
            }}>
                <div style={{
                    textAlign: 'center',
                    color: '#fff',
                    fontSize: 14,
                    marginBottom: 4,
                    textShadow: '0 0 4px #000'
                }}>
                    {enemy.name}
                </div>
                <div style={{
                    height: 12,
                    background: 'rgba(0,0,0,0.6)',
                    borderRadius: 6,
                    overflow: 'hidden',
                    border: '1px solid rgba(255,255,255,0.2)'
                }}>
                    <div style={{
                        height: '100%',
                        width: `${(enemy.hp / enemy.maxHp) * 100}%`,
                        background: 'linear-gradient(180deg, #ff6b6b 0%, #c92a2a 100%)',
                        transition: 'width 0.3s ease-out'
                    }} />
                </div>
                <div style={{
                    textAlign: 'center',
                    color: '#aaa',
                    fontSize: 11,
                    marginTop: 2
                }}>
                    {enemy.hp} / {enemy.maxHp}
                </div>
            </div>

            {/* Cut-in Overlay */}
            {cutInSequence.active && (
                <div className="cut-in-overlay" style={{
                    position: 'absolute',
                    top: 0, left: 0, width: '100%', height: '100%',
                    background: 'rgba(0,0,0,0.7)',
                    zIndex: 200,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    pointerEvents: 'none',
                    animation: 'fadeIn 0.2s ease-out'
                }}>
                    <div style={{
                        position: 'absolute',
                        width: '100%',
                        height: '200px',
                        background: 'linear-gradient(90deg, rgba(0,255,255,0) 0%, rgba(0,255,255,0.8) 50%, rgba(0,255,255,0) 100%)',
                        transform: 'skewY(-5deg)',
                        boxShadow: '0 0 50px rgba(0,255,255,0.5)',
                        animation: 'slideIn 0.3s cubic-bezier(0.17, 0.67, 0.83, 0.67)'
                    }} />

                    <h1 style={{
                        position: 'relative',
                        color: '#fff',
                        fontSize: '4rem',
                        fontFamily: 'Noto Serif JP',
                        textShadow: '0 0 20px #00ffff',
                        zIndex: 201,
                        margin: 0,
                        animation: 'scaleUp 0.3s ease-out',
                        textAlign: 'center'
                    }}>
                        <div style={{ fontSize: '2rem', color: '#00ffff', marginBottom: '-10px' }}>
                            {cutInSequence.count} CHAIN!!
                        </div>
                        {cutInSequence.name}
                    </h1>

                    {/* Character Portraits Strip */}
                    <div style={{
                        display: 'flex',
                        gap: '20px',
                        marginTop: '40px',
                        zIndex: 201
                    }}>
                        {cutInSequence.participants.map((pid, idx) => (
                            <div key={pid} style={{
                                width: '100px',
                                height: '100px',
                                border: '2px solid #fff',
                                background: '#222',
                                borderRadius: '50%',
                                overflow: 'hidden',
                                boxShadow: '0 0 15px #00ffff',
                                animation: `popIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) ${0.3 + (idx * 0.2)}s backwards`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '2rem'
                            }}>
                                {pid === 1 ? '🗡️' : (pid === 2 ? '🔥' : '👊')}
                            </div>
                        ))}
                    </div>

                    <style>{`
                       @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                       @keyframes slideIn { from { transform: translateX(-100%) skewY(-5deg); } to { transform: translateX(0) skewY(-5deg); } }
                       @keyframes scaleUp { from { transform: scale(3); opacity: 0; } to { transform: scale(1); opacity: 1; } }
                       @keyframes popIn { from { transform: scale(0); } to { transform: scale(1); } }
                   `}</style>
                </div>
            )}
        </div>
    );
};
