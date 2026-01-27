import React, { useEffect, useRef } from 'react';
import { Application, Container, Graphics, Text, TextStyle, Assets, Sprite, Texture } from 'pixi.js';
import { useGameStore } from '../store/gameStore';

export const BattleScene: React.FC = () => {
    const containerRef = useRef<HTMLDivElement>(null);
    const appRef = useRef<Application | null>(null);

    // Refs for loop access
    const phaseRef = useRef<string>('EXPLORATION');
    const glimmerRef = useRef<boolean>(false);
    const lastDamageRef = useRef<{ value: number, timestamp: number } | null>(null);
    const resonanceRef = useRef<number>(0);
    const activeAttackerRef = useRef<number | null>(null);

    // Sync Store
    const phase = useGameStore(s => s.phase);
    const glimmerActive = useGameStore(s => s.glimmerActive);
    const lastDamage = useGameStore(s => s.lastDamage);
    const resonanceCount = useGameStore(s => s.resonanceCount);
    const activeAttackerId = useGameStore(s => s.activeAttackerId);

    // Derived state refs
    useEffect(() => { phaseRef.current = phase; }, [phase]);
    useEffect(() => { glimmerRef.current = glimmerActive; }, [glimmerActive]);
    useEffect(() => { lastDamageRef.current = lastDamage; }, [lastDamage]);
    useEffect(() => { resonanceRef.current = resonanceCount; }, [resonanceCount]);
    useEffect(() => { activeAttackerRef.current = activeAttackerId; }, [activeAttackerId]);

    // Initialize PixiJS
    useEffect(() => {
        const initPixi = async () => {
            if (appRef.current || !containerRef.current) return;

            const app = new Application();
            await app.init({
                width: containerRef.current.clientWidth,
                height: containerRef.current.clientHeight,
                backgroundColor: 0x111111,
                resolution: window.devicePixelRatio || 1,
                autoDensity: true,
                resizeTo: containerRef.current
            });

            if (containerRef.current) {
                containerRef.current.appendChild(app.canvas);
            }
            appRef.current = app;

            // Load Assets
            const heroTex = await Assets.load('/assets/hero.png');
            const mageTex = await Assets.load('/assets/mage.png');
            const monkTex = await Assets.load('/assets/monk.png');
            const enemyTex = await Assets.load('/assets/enemy.png');

            // Force Nearest Neighbor Scaling for Pixel Art
            [heroTex, mageTex, monkTex, enemyTex].forEach(tex => {
                tex.source.scaleMode = 'nearest';
            });

            const width = app.screen.width;
            const height = app.screen.height;

            // --- Scene Layers ---
            const sceneLayer = new Container();
            app.stage.addChild(sceneLayer);
            const uiLayer = new Container();
            app.stage.addChild(uiLayer);
            const popupLayer = new Container();
            app.stage.addChild(popupLayer);

            // 0. Background (Starfield)
            const starCount = 200;
            const stars: { sprite: Graphics, x: number, y: number, z: number }[] = [];
            const starContainer = new Container();
            sceneLayer.addChildAt(starContainer, 0);

            for (let i = 0; i < starCount; i++) {
                const s = new Graphics();
                s.circle(0, 0, 3).fill(0xffffff);
                const star = {
                    sprite: s,
                    x: (Math.random() - 0.5) * width * 2,
                    y: (Math.random() - 0.5) * height * 2,
                    z: Math.random() * 2 + 0.1
                };
                starContainer.addChild(s);
                stars.push(star);
            }

            // --- VISUAL ASSETS ---
            // 1. Enemy
            // 1. Enemy
            const enemy = new Container();
            const enemySprite = new Sprite(enemyTex);
            enemySprite.anchor.set(0.5);
            enemySprite.scale.set(0.25); // Scale down 1024px to ~256px
            enemy.addChild(enemySprite);

            // Text Label hidden or smaller? kept for clarity
            const label = new Text({ text: 'ENEMY', style: { fill: 0xffffff, fontSize: 16 } });
            label.anchor.set(0.5);
            label.y = -130; // Above sprite
            enemy.addChild(label);

            enemy.x = width / 2;
            enemy.y = height * 0.55; // Lowered to be clearly below Special Arts
            enemy.visible = false;
            sceneLayer.addChild(enemy);

            // 2. Party Members Container
            const partyVisuals: Record<number, {
                container: Container,
                bpBar: Graphics,
                skillText: Text,
                baseX: number,
                baseY: number
            }> = {};

            const partyY = height * 0.55;
            const textures = [heroTex, mageTex, monkTex]; // Cycle these
            // Dynamic generation based on Party Size (Assume 5 for layout calculation even if initially empty)
            // But we need the IDs. We can wait for party? Or assume IDs 1..5 for visual init?
            // VISUAL INIT must happen once. 
            // Better: Create a POOL of 5 visuals, and assign them to party members as they appear.

            const maxMembers = 5;
            const partySpacing = width / (maxMembers + 1); // Distribute evenly

            for (let i = 0; i < maxMembers; i++) {
                const cx = partySpacing * (i + 1);
                const tex = textures[i % textures.length];

                const m = new Container();
                m.x = cx;
                m.y = partyY;

                // Sprite
                const s = new Sprite(tex);
                s.anchor.set(0.5);
                s.scale.set(0.12);
                m.addChild(s);

                // BP Bar
                const bpBg = new Graphics();
                bpBg.rect(-30, 40, 60, 8).fill(0x333333);
                m.addChild(bpBg);
                const bpFill = new Graphics();
                bpFill.rect(-30, 40, 60, 8).fill(0x00ccff);
                m.addChild(bpFill);

                // Skill Popup
                const skillTxt = new Text({
                    text: '',
                    style: {
                        fill: '#ffff00',
                        fontSize: 24,
                        fontWeight: '900',
                        stroke: { color: 'black', width: 4 },
                        dropShadow: true
                    }
                });
                skillTxt.anchor.set(0.5, 1);
                skillTxt.y = -50;
                skillTxt.visible = false;
                m.addChild(skillTxt);

                m.visible = false; // Hidden until assigned
                sceneLayer.addChild(m);

                // Map visual slot by index for now (will map to ID in ticker)
                // Actually we need to map ID -> Visual.
                // We'll store these in a list "visualSlots" and assign in Ticker.
            }
            // Temporarily store slots to be bound in ticker
            const visualSlots: any[] = sceneLayer.children.slice(-maxMembers); // Last 5 added

            // ... inside ticker ...
            // We need to change how we access visuals in ticker.
            // Let's attach them to partyVisuals map dynamically in ticker?
            // Or just redo this section to NOT use fixed ID mapping during init.


            // Chain UI handled by React Overlay (GameUI) now
            // const chainText = new Text({ text: '', style: { fill: 0x00ffff, fontSize: 36, fontWeight: 'bold' } });
            // chainText.anchor.set(1, 0);
            // chainText.x = width - 20;
            // chainText.y = 80;
            // uiLayer.addChild(chainText);

            // Glimmer
            const flash = new Graphics();
            flash.rect(0, 0, width, height).fill(0xffffff);
            flash.alpha = 0;
            uiLayer.addChild(flash);

            const glimmerContainer = new Container();
            glimmerContainer.x = width / 2;
            glimmerContainer.y = height / 2;
            glimmerContainer.visible = false;
            const bulbText = new Text({ text: '💡', style: new TextStyle({ fontSize: 100 }) });
            bulbText.anchor.set(0.5);
            glimmerContainer.addChild(bulbText);
            uiLayer.addChild(glimmerContainer);

            // Logic Vars
            let flashDuration = 0;
            let shakeDuration = 0;
            let lastProcessedDamageTime = 0;
            let activePopups: any[] = [];
            let lastActiveId: number | null = null;

            // --- TICKER ---
            app.ticker.add(() => {
                const currentPhase = phaseRef.current;
                const currentResonance = resonanceRef.current;
                const activeId = activeAttackerRef.current;

                // ... (content omitted, just ensure start is correct)


                // 0. Starfield Update (Run ALWAYS for visual feedback)
                // Speed adjustment: 0.5 is fast enough for "warp", 0.05 for drift
                let speed = currentPhase === 'EXPLORATION' ? 0.3 : 0.02;

                stars.forEach(star => {
                    star.z -= speed;
                    if (star.z <= 0.2) { // Reset before hitting camera
                        star.z = 4; // Start further back
                        star.x = (Math.random() - 0.5) * width * 3; // Wider field
                        star.y = (Math.random() - 0.5) * height * 3;
                    }

                    const k = 128.0 / star.z;
                    star.sprite.x = (width / 2) + star.x * k;
                    star.sprite.y = (height / 2) + star.y * k;

                    // Scale star by Z (closer = bigger)
                    const scale = (1 - (star.z / 4)) * 2;
                    star.sprite.scale.set(Math.max(0.5, scale));

                    // Fade in/out
                    star.sprite.alpha = Math.min(1, (star.z - 0.2) * 2);
                });

                // 1. Scene Visibility & Battle Checks
                if (currentPhase !== 'BATTLE') {
                    // Hide Battle Elements
                    Object.values(partyVisuals).forEach(v => v.container.visible = false);
                    enemy.visible = false;
                    Object.values(partyVisuals).forEach(v => v.container.visible = false);
                    enemy.visible = false;
                    // chainText.text = '';
                    // Do NOT return here, keeps stars moving
                } else {
                    // SHOW Battle Elements
                    enemy.visible = true;

                    // Shake
                    let shakeX = 0, shakeY = 0;
                    if (shakeDuration > 0) {
                        shakeDuration--;
                        const intensity = 10 + currentResonance * 2;
                        shakeX = (Math.random() - 0.5) * intensity;
                        shakeY = (Math.random() - 0.5) * intensity;
                    }
                    enemy.x = (width / 2) + shakeX;
                    enemy.y = (height / 4) + shakeY;

                    // Chain Text Removed
                    // if (currentResonance > 0) {
                    //     chainText.text = `${currentResonance} CHAIN!`;
                    //     chainText.scale.set(1 + Math.sin(Date.now() * 0.01) * 0.1);
                    // } else {
                    //     chainText.text = '';
                    // }

                    // Party Updates
                    const currentParty = useGameStore.getState().party;

                    visualSlots.forEach((visualContainer, i) => {
                        if (i >= currentParty.length) {
                            visualContainer.visible = false;
                            return;
                        }

                        const member = currentParty[i];
                        visualContainer.visible = true;

                        // Position check
                        const isActing = activeId === member.id;

                        // Scale/Position
                        if (isActing) {
                            visualContainer.y = partyY - 30; // Jump slightly when acting
                            visualContainer.scale.set(1.1); // Slightly larger
                        } else {
                            visualContainer.y = partyY;
                            visualContainer.scale.set(1.0); // Reset scale
                        }

                        // BP Bar
                        const bpBg = visualContainer.getChildAt(1) as Graphics; // 0 is Sprite
                        const bpFill = visualContainer.getChildAt(2) as Graphics;

                        const bpPct = member.battleState.bp.current / member.battleState.bp.max;
                        bpFill.clear();
                        const barColor = bpPct < 0.3 ? 0xff0000 : (bpPct < 0.7 ? 0xffff00 : 0x00ccff);
                        bpFill.rect(-30, 60, 60 * bpPct, 8).fill(barColor);

                        // Overhead Skill Text removed
                    });

                    lastActiveId = activeId;

                    // Damage Popups logic
                    const currentDamage = lastDamageRef.current;
                    if (currentDamage && currentDamage.timestamp > lastProcessedDamageTime) {
                        lastProcessedDamageTime = currentDamage.timestamp;
                        shakeDuration = 10 + currentResonance;

                        const size = Math.min(100, 40 + Math.log10(currentDamage.value) * 10);
                        const popup = new Text({
                            text: currentDamage.value.toString(),
                            style: {
                                fill: 0xffaa00,
                                fontSize: size,
                                fontWeight: '900',
                                stroke: { color: 'black', width: 4 },
                                dropShadow: true,
                            }
                        });
                        popup.anchor.set(0.5);
                        popup.x = enemy.x + (Math.random() - 0.5) * 60;
                        popup.y = enemy.y - 60;
                        popupLayer.addChild(popup);
                        activePopups.push({ container: popup, life: 60, vy: -5 - (currentResonance * 0.2) });
                    }
                } // End BATTLE check

                // Popups cleanup (Global)
                for (let i = activePopups.length - 1; i >= 0; i--) {
                    const p = activePopups[i];
                    p.life--;
                    p.container.y += p.vy;
                    p.vy += 0.2;
                    p.container.alpha = Math.min(1, p.life / 20);
                    if (p.life <= 0) {
                        popupLayer.removeChild(p.container);
                        activePopups.splice(i, 1);
                    }
                }

                // Glimmer (Global)
                if (glimmerRef.current) {
                    glimmerContainer.visible = true;
                    glimmerContainer.rotation = Math.sin(Date.now() * 0.05) * 0.2;
                    if (flashDuration === 0) {
                        flash.alpha = 1;
                        flashDuration = 1;
                    }
                } else {
                    glimmerContainer.visible = false;
                    flashDuration = 0;
                }
                if (flash.alpha > 0) flash.alpha -= 0.1;
            });
        };

        initPixi();

        return () => {
            if (appRef.current) {
                appRef.current.destroy({ removeView: true });
                appRef.current = null;
            }
        };
    }, []);

    return (
        <div
            ref={containerRef}
            style={{
                width: '100%',
                height: '100%',
                position: 'absolute',
                top: 0,
                left: 0,
            }}
        />
    );
};
