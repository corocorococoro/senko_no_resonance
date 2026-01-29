import React, { useEffect, useRef } from 'react';
import { Application, Container, Graphics, Text, TextStyle, Assets, Sprite } from 'pixi.js';
import { useGameStore } from '../store/gameStore';

export const BattleScene: React.FC = () => {
    const containerRef = useRef<HTMLDivElement>(null);
    const appRef = useRef<Application | null>(null);

    // Refs for loop access
    const phaseRef = useRef<string>('EXPLORATION');
    const glimmerRef = useRef<boolean>(false);
    const lastDamageRef = useRef<{ value: number, timestamp: number; isResonance?: boolean } | null>(null);
    const resonanceRef = useRef<number>(0);
    const activeAttackerRef = useRef<number | null>(null);

    // Sync Store
    const phase = useGameStore(s => s.phase);
    const glimmerActive = useGameStore(s => s.glimmerActive);
    const lastDamage = useGameStore(s => s.lastDamage);
    const resonanceCount = useGameStore(s => s.resonanceCount);
    const activeAttackerId = useGameStore(s => s.activeAttackerId);
    const currentAction = useGameStore(s => s.currentAction);
    const lastResonance = useGameStore(s => s.lastResonance);

    // Cut-in State
    const [cutInSequence, setCutInSequence] = React.useState<{ active: boolean, participants: number[], name: string }>({ active: false, participants: [], name: '' });

    // Derived state refs
    useEffect(() => { phaseRef.current = phase; }, [phase]);
    useEffect(() => { glimmerRef.current = glimmerActive; }, [glimmerActive]);
    useEffect(() => { lastDamageRef.current = lastDamage; }, [lastDamage]);
    useEffect(() => { resonanceRef.current = resonanceCount; }, [resonanceCount]);
    useEffect(() => { activeAttackerRef.current = activeAttackerId; }, [activeAttackerId]);

    // Initialize PixiJS
    useEffect(() => {
        let aborted = false;

        const initPixi = async () => {
            if (appRef.current) return;

            try {
                const app = new Application();
                await app.init({
                    width: containerRef.current?.clientWidth || 800,
                    height: containerRef.current?.clientHeight || 600,
                    backgroundColor: 0x111111,
                    resolution: window.devicePixelRatio || 1,
                    autoDensity: true,
                    resizeTo: containerRef.current || window
                });

                if (aborted) {
                    app.destroy();
                    return;
                }

                if (containerRef.current) {
                    containerRef.current.appendChild(app.canvas);
                }
                appRef.current = app;

                // Load Assets
                const heroTex = await Assets.load('/assets/hero.png');
                const mageTex = await Assets.load('/assets/mage.png');
                const monkTex = await Assets.load('/assets/monk.png');
                const enemyTex = await Assets.load('/assets/enemy.png');

                if (aborted) return;

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
                // 1. Enemy (Left Side)
                const enemy = new Container();
                const enemySprite = new Sprite(enemyTex);
                enemySprite.anchor.set(0.5);
                enemySprite.scale.set(0.25);
                // Enemy faces Right by default
                enemy.addChild(enemySprite);

                // Text Label
                const label = new Text({ text: 'ENEMY', style: { fill: 0xffffff, fontSize: 16 } });
                label.anchor.set(0.5);
                label.y = -130;
                enemy.addChild(label);

                enemy.x = width * 0.25; // Left Side
                enemy.y = height * 0.55;
                enemy.visible = false;
                sceneLayer.addChild(enemy);

                // 2. Party Members Container (Right Side)
                const partyVisuals: Record<number, {
                    container: Container,
                    bpBar: Graphics,
                    skillText: Text,
                    baseX: number,
                    baseY: number
                }> = {};


                // AFK Arena Style Formation (Right Side Team)
                // Front Row: Closer to Enemy (Leftward relative to center of group)
                // Back Row: Further from Enemy (Rightward)

                const pcx = width * 0.75; // Right Side Center
                const pcy = height * 0.55;

                // Offsets
                const colSpacing = 80;
                const rowSpacing = 90;

                const POSITIONS = [
                    // Front Row (Closer to Enemy -> Left)
                    { x: pcx - colSpacing, y: pcy - rowSpacing * 0.6 }, // Front Top
                    { x: pcx - colSpacing, y: pcy + rowSpacing * 0.6 }, // Front Bottom

                    // Back Row (Further -> Right)
                    { x: pcx + colSpacing, y: pcy },              // Back Mid
                    { x: pcx + colSpacing, y: pcy - rowSpacing }, // Back Top
                    { x: pcx + colSpacing, y: pcy + rowSpacing }, // Back Bottom
                ];

                const textures = [heroTex, mageTex, monkTex];
                const maxMembers = 5;

                for (let i = 0; i < maxMembers; i++) {
                    const pos = POSITIONS[i] || { x: pcx, y: pcy };
                    const tex = textures[i % textures.length];

                    const m = new Container();
                    m.x = pos.x;
                    m.y = pos.y;

                    // Sprite (Face Left: scale.x negative)
                    const s = new Sprite(tex);
                    s.anchor.set(0.5);
                    s.scale.set(-0.12, 0.12); // Flip X to face Left
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
                let zoomIntensity = 0;
                let lastProcessedDamageTime = 0;
                let lastProcessedResonance = 0;

                // Hitstop Vars
                let hitStop = 0;
                let pendingZoom = 0;
                let pendingShake = 0;
                let pendingFlash = 0;

                let activePopups: any[] = [];
                let impactTextDuration = 0;

                // Impact Text (The "Pay-off")
                // Impact Text (The "Pay-off")
                const impactText = new Text('IMPACT', {
                    fontFamily: 'Orbitron',
                    fontSize: 80,
                    fill: '#00ffff', // Simplified for debug
                    stroke: { color: '#000033', width: 8 },
                    fontWeight: '900',
                });
                impactText.anchor.set(0.5);
                impactText.x = width / 2;
                impactText.y = height * 0.3; // Top Center
                impactText.visible = false;
                uiLayer.addChild(impactText);

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

                        // Hitstop Logic (Pre-Impact Delay)
                        if (hitStop > 0) {
                            hitStop--;
                            if (hitStop <= 0) {
                                // TRIGGER IMPACT (Zudon!)
                                console.log(`[SEQ] 💥 Visual Phase 5: Hitstop End/Impact Triggered!`);
                                shakeDuration = pendingShake;
                                zoomIntensity = pendingZoom;
                                flashDuration = pendingFlash;

                                // Show Impact Text (Technique Name)
                                const lastRes = useGameStore.getState().lastResonance;
                                if (lastRes) {
                                    impactText.text = lastRes.name;
                                    impactText.visible = true;
                                    impactText.scale.set(1.5); // Pop in large
                                    impactText.alpha = 1;
                                    impactTextDuration = 120; // 2 seconds display
                                }
                            }
                        }

                        // Impact Text Animation
                        if (impactTextDuration > 0) {
                            impactTextDuration--;
                            // Scale down slam effect
                            if (impactText.scale.x > 1.0) {
                                impactText.scale.x -= 0.05;
                                impactText.scale.y -= 0.05;
                            }
                            // Fade out at end
                            if (impactTextDuration < 20) {
                                impactText.alpha = impactTextDuration / 20;
                            }
                        } else {
                            impactText.visible = false;
                        }

                        // Shake
                        let shakeX = 0, shakeY = 0;
                        if (shakeDuration > 0) {
                            shakeDuration--;
                            const intensity = 10 + currentResonance * 2;
                            shakeX = (Math.random() - 0.5) * intensity;
                            shakeY = (Math.random() - 0.5) * intensity;
                        }
                        enemy.x = (width * 0.25) + shakeX;
                        enemy.y = (height * 0.55) + shakeY;

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

                            // We rely on the initial placement in m.x/m.y
                            // But wait, the ticker loop doesn't have access to POSITIONS.
                            // We should store the base position on the container or similar?
                            // Actually, 'visualContainer' retains its x/y.
                            // We just need to modify it relative to its base.

                            // BUT: We don't have "BaseX/BaseY" stored easily accessible to reset.
                            // Let's attach them to the container type or just use a small offset reset?
                            // If we jump -30, we must jump back +30? No, that drifts.
                            // We need the base Y.

                            // Hack: Store baseY in the visualSlots lookup?
                            // Or just checking: visualSlots is just an array of Containers.
                            // We can read the initial Y from a map if we kept it?
                            // Let's assume we don't modify Y PERMANENTLY.
                            // Wait, previous code: `visualContainer.y = partyY`
                            // It was resetting to a constant global `partyY`. 
                            // Now we have dynamic Y. 

                            // Workaround: We will use a "Shake/Jump" container inside the main container?
                            // Or just simpler: don't animate Y position for now, just Scale.
                            // Scale is enough for "Acting" feedback.

                            if (isActing) {
                                // Maintain negative X scale if flipped
                                const scaleSign = visualContainer.scale.x < 0 ? -1 : 1;
                                visualContainer.scale.set(1.1 * scaleSign, 1.1);
                                visualContainer.alpha = 1.0;
                            } else {
                                const scaleSign = visualContainer.scale.x < 0 ? -1 : 1;
                                visualContainer.scale.set(1.0 * scaleSign, 1.0);
                                visualContainer.alpha = 0.9;
                            }

                            // BP Bar (bpBg at index 1, bpFill at index 2)
                            const bpFill = visualContainer.getChildAt(2) as Graphics;

                            const bpPct = member.battleState.bp.current / member.battleState.bp.max;
                            bpFill.clear();
                            const barColor = bpPct < 0.3 ? 0xff0000 : (bpPct < 0.7 ? 0xffff00 : 0x00ccff);
                            bpFill.rect(-30, 60, 60 * bpPct, 8).fill(barColor);

                            // Overhead Skill Text removed
                        });


                        // Damage Popups logic moved to end of loop (sync with Hitstop)
                        // ...
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
                    }

                    // --- Gyuin Gyuin Effect (Resonance Zoom) ---
                    // Triggered by resonance change detection (needs state tracking)
                    // We compare currentResonance with a local tracker
                    // Note: We need a ref for previousResonance to detect EDGE
                    // For this implementation, we'll use a hack: check if banner just appeared? 
                    // Better: Use a dedicated trigger var in store? 
                    // Or just:

                    // (This part requires a ref to store prevResonance, which we can add outside ticker)
                    // Let's assume we added `const prevResonanceRef = useRef(0);` at top of component.
                    // Since I can't add refs easily without rewriting top, I will use a local closure var `localPrevResonance` if possible?
                    // No, ticker is a closure. I can use a let outside ticker.

                    // (See `let lastProcessedResonance = 0;` added in variable section below)

                    if (currentResonance > lastProcessedResonance) {
                        lastProcessedResonance = currentResonance;
                        if (currentResonance >= 2) {
                            // Calculate Impact based on Chain Count
                            const intensityMult = Math.min(3, currentResonance - 1);

                            // 1. Anticipation (Hitstop)
                            // SYNC FIX: Needs to be long enough for the Cut-in to appear and be read.
                            // 3.5 seconds = ~210 frames
                            hitStop = 210 + (intensityMult * 10);

                            console.log(`[SEQ] 🎬 Visual Phase 1: Gyueen/Hitstop Start at ${Date.now()} (Frames: ${hitStop})`); // TRACE

                            // 2. Scheduled Impact (Zudon)
                            pendingZoom = 0.2 + (intensityMult * 0.15);
                            pendingShake = 15 + (intensityMult * 10);
                            pendingFlash = 4 + (intensityMult * 2);
                        }
                    }

                    // Apply Zoom
                    if (zoomIntensity > 0) {
                        // Zoom towards center
                        const scale = 1 + zoomIntensity;
                        sceneLayer.scale.set(scale);
                        sceneLayer.x = (width / 2) * (1 - scale);
                        sceneLayer.y = (height / 2) * (1 - scale);

                        // Decay fast
                        zoomIntensity = Math.max(0, zoomIntensity - 0.02);
                    } else {
                        sceneLayer.scale.set(1);
                        sceneLayer.x = 0;
                        sceneLayer.y = 0;
                    }

                    // Apply Flash
                    if (flashDuration > 0) {
                        flash.alpha = flashDuration / 5; // Fade out
                        flashDuration--;
                    } else if (!glimmerRef.current) {
                        // Only clear if not glimmering
                        if (flash.alpha > 0) flash.alpha -= 0.1;
                    }

                    // Damage Popups logic (Now inside motion update to respect Hitstop)
                    const currentDamage = lastDamageRef.current;
                    if (currentDamage && currentDamage.timestamp > lastProcessedDamageTime) {
                        lastProcessedDamageTime = currentDamage.timestamp;
                        shakeDuration = 10 + currentResonance;

                        // Style Selection: Use explicit flag from Store (Robust)
                        const isResonanceHit = !!currentDamage.isResonance;

                        const spawnPopup = () => {
                            console.log(`[SEQ] 💥 Visual Phase 4: Damage Popup Spawned at ${Date.now()}`); // TRACE

                            const baseSize = 40 + Math.log10(currentDamage.value) * 10;
                            const size = isResonanceHit ? baseSize * 1.5 : baseSize; // 50% larger

                            const fill = isResonanceHit
                                ? ['#ffffff', '#00ffff', '#0099ff']
                                : '#ffaa00';

                            const stroke = isResonanceHit ? '#000033' : 'black';
                            const strokeThickness = isResonanceHit ? 6 : 4;

                            const popup = new Text(
                                currentDamage.value.toString() + (isResonanceHit ? '!!' : ''),
                                {
                                    fill: fill as any,
                                    fontSize: size,
                                    fontWeight: '900',
                                    stroke: { color: stroke, width: strokeThickness },
                                    dropShadow: {
                                        alpha: 0.5,
                                        blur: isResonanceHit ? 10 : 4,
                                        color: isResonanceHit ? '#00ccff' : '#000000',
                                        distance: 5,
                                        angle: Math.PI / 6,
                                    },
                                    fontFamily: isResonanceHit ? 'Orbitron' : 'Arial'
                                }
                            );
                            popup.anchor.set(0.5);
                            popup.x = enemy.x + (Math.random() - 0.5) * 60;
                            popup.y = enemy.y - 60;
                            popupLayer.addChild(popup);

                            // Resonance hits fly up faster
                            const vy = isResonanceHit ? -8 : -5;
                            activePopups.push({ container: popup, life: 60, vy: vy - (currentResonance * 0.2) });

                            // TRIGGER IMPACT (Zudon)
                            // Both Normal and Resonance should shake!
                            pendingShake = isResonanceHit ? 20 : 5;
                            pendingZoom = isResonanceHit ? 0.2 : 0;
                            if (!isResonanceHit) {
                                pendingFlash = 4; // Small flash for normal hits
                            }
                        };

                        if (isResonanceHit) {
                            // DELAYED IMPACT: Wait for Cut-in (approx 3.5s)
                            setTimeout(spawnPopup, 3500);
                        } else {
                            // IMMEDIATE
                            spawnPopup();
                        }
                    }
                }); // Closes app.ticker.add(() => { ... });
            } catch (err) {
                console.error("Failed to init PixiJS:", err);
            }
        };

        const executeInit = async () => {
            await initPixi();
        }
        executeInit();

        return () => {
            aborted = true;
            if (appRef.current) {
                appRef.current.destroy({ removeView: true });
                appRef.current = null;
            }
        };
    }, []);

    // Sync with Resonance Action for Cut-in
    useEffect(() => {
        if (lastResonance && lastResonance.count >= 2 && currentAction?.participants && currentAction.participants.length >= 2) {
            // 1. Gyueen starts immediately (handled by Ticker)

            // 2. Cut-in starts after 500ms delay
            const startTimer = setTimeout(() => {
                console.log(`[SEQ] 🎥 Visual Phase 2: Cut-in Start at ${Date.now()}`); // TRACE
                setCutInSequence({
                    active: true,
                    participants: currentAction.participants || [],
                    name: "RESONANCE CHAIN!!" // Generic Hype Text
                });

                // Auto-hide after sequence
                // Duration = Intro(0.1) + Display + Outro
                // Eliminate gap: Last until Impact (3.5s) + small overlap
                const totalDuration = 3500;
                setTimeout(() => {
                    console.log(`[SEQ] 🎥 Visual Phase 3: Cut-in End at ${Date.now()}`); // TRACE
                    setCutInSequence(prev => ({ ...prev, active: false }));
                }, totalDuration);

            }, 100); // 0.1s Snappy Start

            return () => clearTimeout(startTimer);
        }
    }, [lastResonance, currentAction]);

    return (
        <>
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
                        animation: 'scaleUp 0.3s ease-out'
                    }}>
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
        </>
    );
};
