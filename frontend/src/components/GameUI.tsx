import React, { useState, useEffect } from 'react';
import { useGameStore } from '../store/gameStore';
// import { PartyStatusMonitor } from './PartyStatusMonitor';
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

// Top Center: Special Arts Banner - REMOVED (Consolidated to Center Cut-in)

// Right Side: Active Action (Log-style or Box)
const ActiveActionDisplay: React.FC = () => {
    const currentAction = useGameStore(s => s.currentAction);
    const phase = useGameStore(s => s.phase);

    if (phase !== 'BATTLE') return null;
    if (phase !== 'BATTLE') return null;
    if (!currentAction) return null;

    // Hide during Resonance (Cut-in takes over)
    // We can infer resonance if there are multiple participants or checking a flag if we added one (we did add actorName logic, but participants.length > 1 is a safe check for now)
    const isResonance = currentAction.participants && currentAction.participants.length > 1;
    if (isResonance) return null;

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

                {/* Center - Empty/Removed */}
                <div className="ui-center-col">
                </div>

                {/* Right */}
                <div className="ui-right-col">
                    <ActiveActionDisplay />
                </div>
            </div>

            {/* Bottom Layer (Fixed) - Removed as requested */}

            {showGrimoire && <GrimoireModal onClose={() => setShowGrimoire(false)} />}
        </div>
    );
};
