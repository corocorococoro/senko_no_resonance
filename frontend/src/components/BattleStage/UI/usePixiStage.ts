import { useEffect, useRef, useState } from 'react';
import { Application, Assets, Texture, Container, Graphics } from 'pixi.js';

export function usePixiStage(containerRef: React.RefObject<HTMLDivElement | null>) {
    const appRef = useRef<Application | null>(null);
    const [isReady, setIsReady] = useState(false);
    const [layers, setLayers] = useState<{
        bg: Container;
        actors: Container;
        vfx: Container;
        chars: Container;
        ui: Container;
    } | null>(null);

    // Asset Cache
    const assets = useRef<{
        hero: Texture;
        mage: Texture;
        monk: Texture;
        enemy: Texture;
    } | null>(null);

    useEffect(() => {
        if (!containerRef.current || appRef.current) return;

        let aborted = false;

        const init = async () => {
            console.log("[PixiStage] Initializing...");
            try {
                const app = new Application();
                await app.init({
                    resizeTo: containerRef.current || window,
                    backgroundColor: 0x220033, // Slightly purple to distinguish from black
                    resolution: window.devicePixelRatio || 1,
                    autoDensity: true,
                });

                if (aborted) {
                    console.log("[PixiStage] Aborted during init. Destroying app.");
                    app.destroy(true, { children: true, texture: false });
                    return;
                }

                console.log("[PixiStage] App Initialized");

                if (containerRef.current) {
                    containerRef.current.appendChild(app.canvas);
                }

                // Load Assets with individual catches
                const loadAsset = async (path: string, color: string = 'red') => {
                    try {
                        console.log(`[PixiStage] Loading ${path}...`);
                        return await Assets.load(path);
                    } catch (e) {
                        console.error(`[PixiStage] Failed to load ${path}`, e);
                        // Create visible fallback
                        const g = new Graphics().rect(0, 0, 100, 100).fill(color);
                        return app.renderer.generateTexture(g);
                    }
                };

                const [hero, mage, monk, enemy] = await Promise.all([
                    loadAsset('/assets/hero.png', 'cyan'),
                    loadAsset('/assets/mage.png', 'blue'),
                    loadAsset('/assets/monk.png', 'orange'),
                    loadAsset('/assets/enemy.png', 'red'),
                ]);

                if (aborted) {
                    app.destroy(true, { children: true, texture: false });
                    return;
                }

                // Nearest Neighbor
                [hero, mage, monk, enemy].forEach(t => t.source.scaleMode = 'nearest');

                assets.current = { hero, mage, monk, enemy };
                console.log("[PixiStage] Assets Loaded");

                // Setup Layers (Create FRESH containers for this app instance)
                const newLayers = {
                    bg: new Container(),
                    vfx: new Container(),
                    actors: new Container(), // Legacy/Unused
                    chars: new Container(), // NEW: Dedicated Character Layer
                    ui: new Container()
                };

                app.stage.addChild(newLayers.bg); // 0
                app.stage.addChild(newLayers.actors); // 1
                app.stage.addChild(newLayers.chars); // 2
                app.stage.addChild(newLayers.vfx); // 3 (VFX on top of chars)
                app.stage.addChild(newLayers.ui); // 4 (Topmost, ephemerally cleared)

                // Add Starfield
                const starBg = new Graphics();
                for (let i = 0; i < 200; i++) {
                    starBg.circle(Math.random() * app.screen.width, Math.random() * app.screen.height, Math.random() * 2);
                    starBg.fill('white');
                }
                newLayers.bg.addChild(starBg);

                appRef.current = app;
                setLayers(newLayers);
                setIsReady(true);
                console.log("[PixiStage] Ready!");
            } catch (err) {
                console.error("[PixiStage] Fatal Init Error:", err);
            }
        };

        init();

        return () => {
            console.log("[PixiStage] Cleaning up...");
            aborted = true;
            setIsReady(false);
            setLayers(null);

            if (appRef.current) {
                appRef.current.destroy(true, { children: true, texture: false });
                appRef.current = null;
            }
        };
    }, [containerRef]);

    return {
        app: appRef.current,
        isReady,
        layers: layers,
        assets: assets.current
    };
}
