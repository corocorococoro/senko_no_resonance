import React, { useState, useEffect } from 'react';
import { useGameStore } from '../store/gameStore';
import { PartyStatusMonitor } from './PartyStatusMonitor';
import { GrimoireModal } from './GrimoireModal';
import './GameUI.css';

// --- Atomic Components ---

const Header: React.FC<{ onOpenGrimoire: () => void }> = ({ onOpenGrimoire }) => {
    const floor = useGameStore(s => s.floor);
    return (
        <div className="ui-header">
            <div className="status-bar">
                <span className="floor-indicator">B{floor}F</span>
            </div>
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    onOpenGrimoire();
                }}
                className="grimoire-button"
            >
                📖
            </button>
        </div>
    );
};

// Top Left: Hits Only
const ComboGauge: React.FC = () => {
    const stats = useGameStore(s => s.stats);
    const phase = useGameStore(s => s.phase);

    if (phase !== 'BATTLE') return null;
    // Only show if we have hits
    if (stats.resonanceTotal <= 0 && stats.totalDamage <= 0) return null;

    return (
        <div className="ui-combo-gauge">
            <div className="hits-row">
                <span className="hits-label">HIT</span>
                <span className="hits-val">{stats.resonanceTotal}</span>
            </div>
            <div className="dmg-row">
                <span className="dmg-label">TOTAL</span>
                <span className="dmg-val">{stats.totalDamage.toLocaleString()}</span>
            </div>
        </div>
    );
};

// Top Center: Special Arts Banner
const SpecialArtsBanner: React.FC = () => {
    const lastResonance = useGameStore(s => s.lastResonance);
    const phase = useGameStore(s => s.phase);
    const [visible, setVisible] = useState(false);
    const [displayParams, setDisplayParams] = useState<{ name: string; count: number } | null>(null);

    useEffect(() => {
        if (lastResonance && (Date.now() - lastResonance.timestamp < 3000)) {
            // Only show if count >= 2 (which it should be for resonance)
            setDisplayParams({ name: lastResonance.name, count: lastResonance.count });
            setVisible(true);
            const timer = setTimeout(() => setVisible(false), 2500);
            return () => clearTimeout(timer);
        }
    }, [lastResonance]);

    if (phase !== 'BATTLE') return null;
    if (!visible || !displayParams) return null;

    return (
        <div className="ui-special-arts-banner">
            <div className="banner-label">SPECIAL ARTS</div>
            <div className="banner-content">
                <div className="chain-counter">{displayParams.count} CHAIN!!</div>
                <div className="banner-text">{displayParams.name}</div>
            </div>
        </div>
    );
};

// Right Side: Active Action (Log-style or Box)
const ActiveActionDisplay: React.FC = () => {
    const currentAction = useGameStore(s => s.currentAction);
    const phase = useGameStore(s => s.phase);

    if (phase !== 'BATTLE') return null;
    if (!currentAction) return null;

    // Unique key to force animation restart on change
    return (
        <div key={`${currentAction.actorName}-${currentAction.skillName}`} className="ui-active-action-right">
            <div className="action-card">
                <div className="actor-name">{currentAction.actorName}</div>
                <div className="skill-name">{currentAction.skillName}</div>
            </div>
        </div>
    );
};

// Bottom: Party Status
const PartyStatusWrapper: React.FC = () => {
    const phase = useGameStore(s => s.phase);

    // Hide in Exploration for a cleaner view ("Sukkiri")
    if (phase !== 'BATTLE') return null;

    return (
        <div className="ui-party-bottom-bar">
            <PartyStatusMonitor />
        </div>
    );
};

// --- Main ---
export const GameUI: React.FC = () => {
    const phase = useGameStore(s => s.phase);
    const advance = useGameStore(s => s.advance);
    const fetchArts = useGameStore(s => s.fetchArts);
    const fetchParty = useGameStore(s => s.fetchParty);
    const [showGrimoire, setShowGrimoire] = useState(false);

    useEffect(() => {
        const init = async () => {
            await fetchArts();
            await fetchParty();
        };
        init();
    }, []);

    const handleTap = (e: React.MouseEvent) => {
        if ((e.target as HTMLElement).closest('button')) return;
        if (phase !== 'BATTLE' && !showGrimoire) {
            advance();
        }
    };

    return (
        <div className="game-ui-overlay" onClick={handleTap}>
            <Header onOpenGrimoire={() => setShowGrimoire(true)} />

            {/* Battle Layout Layer */}
            <div className="ui-battle-layout">
                {/* Left */}
                <div className="ui-left-col">
                    <ComboGauge />
                </div>

                {/* Center */}
                <div className="ui-center-col">
                    <SpecialArtsBanner />
                </div>

                {/* Right */}
                <div className="ui-right-col">
                    <ActiveActionDisplay />
                </div>
            </div>

            {/* Bottom Layer (Fixed) */}
            <PartyStatusWrapper />

            {showGrimoire && <GrimoireModal onClose={() => setShowGrimoire(false)} />}
        </div>
    );
};
