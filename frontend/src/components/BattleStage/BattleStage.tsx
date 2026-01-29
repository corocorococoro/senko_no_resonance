import React, { useRef, useEffect, useCallback } from 'react';
import { BattleSolver } from '../../logic/battle/BattleSolver';
import { useBattleDirector } from './Director/useBattleDirector';
import { VisualDirector } from './Director/VisualDirector';
import { usePixiStage } from './UI/usePixiStage';
import { useGameStore } from '../../store/gameStore';
import { Sprite, Container, Graphics } from 'pixi.js';

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
        const pcx = app.screen.width * 0.75;
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

            if (actorsRef.current.party[member.id]) return; // Already exists

            console.log(`Creating Party Member ${member.name}`);
            const container = new Container();
            const pos = POSITIONS[i] || { x: pcx, y: pcy };
            console.log(`Party Position: ${pos.x}, ${pos.y}`);

            container.x = pos.x;
            container.y = pos.y;

            // Sprite
            // assets is typed as { hero: Texture, ... }
            let tex = assets.hero;
            if (member.job.toLowerCase() === 'mage') tex = assets.mage;
            if (member.job.toLowerCase() === 'monk') tex = assets.monk;

            const s = new Sprite(tex);
            s.anchor.set(0.5);
            // Increase scale from 0.15 to 0.25 for better visibility
            s.scale.set(-0.25, 0.25); // Flip X to face Left
            container.addChild(s);

            // Shadow
            const shadow = new Graphics();
            shadow.ellipse(0, 0, 30, 10).fill({ color: 0x000000, alpha: 0.4 });
            shadow.y = 50;
            container.addChildAt(shadow, 0);

            // USE NEW DEDICATED LAYER 'chars'
            layers.chars.addChild(container);
            actorsRef.current.party[member.id] = container;
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
            isResonance: turnResult.isResonance
        };

        const record = BattleSolver.resolveTurn(mockState, mockCommand);

        // Play visuals
        director.playScript(record.finalScript);

        // Apply damage after a delay (during animation)
        setTimeout(() => {
            damageEnemy(turnResult.damage, turnResult.isResonance);
        }, turnResult.isResonance ? 4500 : 800);
    }, [phase, director, executeTurn, damageEnemy]);

    // Auto-battle loop
    useEffect(() => {
        if (phase !== 'BATTLE' || !pixi.isReady) return;

        const interval = setInterval(() => {
            if (!director.isPlaying && enemy.hp > 0) {
                runTurn();
            }
        }, 2000);

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
        </div>
    );
};
