import React, { useState } from 'react';
import { useGameStore } from '../store/gameStore';

interface GrimoireModalProps {
    onClose: () => void;
}

export const GrimoireModal: React.FC<GrimoireModalProps> = ({ onClose }) => {
    const { party, masterArts, grimoire } = useGameStore();
    const [activeTab, setActiveTab] = useState<'PARTY' | 'RESONANCE'>('PARTY');
    const [selectedMemberId, setSelectedMemberId] = useState<number>(1);

    const currentMember = party.find(p => p.id === selectedMemberId) || party[0];

    return (
        <div style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
            padding: '20px',
            color: '#eee',
            fontFamily: '"Courier New", monospace'
        }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #444', paddingBottom: '10px' }}>
                <h2 style={{ margin: 0, color: '#d4af37' }}>📖 GRIMOIRE</h2>
                <button onClick={onClose} style={{ background: 'none', border: '1px solid #666', color: '#fff', padding: '5px 10px', cursor: 'pointer' }}>CLOSE</button>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', marginBottom: '20px' }}>
                <button
                    onClick={() => setActiveTab('PARTY')}
                    style={{
                        flex: 1,
                        padding: '10px',
                        background: activeTab === 'PARTY' ? '#333' : '#111',
                        border: '1px solid #444',
                        color: activeTab === 'PARTY' ? '#fff' : '#888',
                        fontWeight: 'bold'
                    }}>
                    PARTY ARTS
                </button>
                <button
                    onClick={() => setActiveTab('RESONANCE')}
                    style={{
                        flex: 1,
                        padding: '10px',
                        background: activeTab === 'RESONANCE' ? '#333' : '#111',
                        border: '1px solid #444',
                        color: activeTab === 'RESONANCE' ? '#fff' : '#888',
                        fontWeight: 'bold'
                    }}>
                    RESONANCE
                </button>
            </div>

            {/* Content */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
                {activeTab === 'PARTY' && (
                    <div>
                        {/* Member Selector */}
                        <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                            {party.map(p => (
                                <button
                                    key={p.id}
                                    onClick={() => setSelectedMemberId(p.id)}
                                    style={{
                                        flex: 1,
                                        padding: '8px',
                                        background: selectedMemberId === p.id ? '#446644' : '#222',
                                        border: '1px solid #444',
                                        color: '#fff'
                                    }}
                                >
                                    {p.name}
                                </button>
                            ))}
                        </div>

                        {/* Arts List */}
                        <div style={{ display: 'grid', gap: '10px' }}>
                            {currentMember.learnedArts.map(skillId => {
                                const art = masterArts[skillId];
                                if (!art) return null;
                                return (
                                    <div key={skillId} style={{ background: '#222', padding: '10px', borderLeft: `4px solid ${getAttributeColor(art.attribute)}` }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                                            <span style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{art.name_jp}</span>
                                            <span style={{ fontSize: '0.8rem', color: '#aaa' }}>{art.attribute} / {art.system}</span>
                                        </div>
                                        <div style={{ fontSize: '0.8rem', color: '#ccc', marginBottom: '5px' }}>{art.description}</div>
                                        <div style={{ display: 'flex', gap: '10px', fontSize: '0.75rem', color: '#888' }}>
                                            <span>Pow: {art.base_power}</span>
                                            <span>BP: {art.bp_cost}</span>
                                            <span>CD: {art.cooldown_turns}</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {activeTab === 'RESONANCE' && (
                    <div>
                        <div style={{ marginBottom: '10px', fontSize: '0.8rem', color: '#aaa' }}>
                            Discovered Combinations: {grimoire.discoveredResonances.length}
                        </div>
                        <div style={{ display: 'grid', gap: '8px' }}>
                            {grimoire.discoveredResonances.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '20px', color: '#555' }}>No resonances discovered yet.</div>
                            ) : (
                                grimoire.discoveredResonances.map((res, idx) => {
                                    const { key, name } = res;
                                    const [prev, curr] = key.split(':');
                                    const prevArt = masterArts[prev];
                                    const currArt = masterArts[curr];

                                    // Calculate compatibility for display
                                    let rate = 1.0;
                                    if (prevArt && currArt && prevArt.chain_compatibility) {
                                        if (prevArt.chain_compatibility.next_attribute_bonus === currArt.attribute) {
                                            rate = prevArt.chain_compatibility.chain_bonus_rate;
                                        }
                                    }

                                    return (
                                        <div key={idx} style={{
                                            background: '#1a1a1a',
                                            padding: '10px',
                                            border: '1px solid #333',
                                            marginBottom: '5px'
                                        }}>
                                            <div style={{
                                                fontSize: '1.1rem',
                                                color: '#d4af37',
                                                fontWeight: 'bold',
                                                marginBottom: '5px',
                                                borderBottom: '1px solid #333',
                                                paddingBottom: '2px'
                                            }}>
                                                {name}
                                            </div>
                                            <div style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                fontSize: '0.9rem'
                                            }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <span style={{ color: '#aaa' }}>{prevArt ? prevArt.name_jp : prev}</span>
                                                    <span style={{ color: '#444' }}>▶</span>
                                                    <span style={{ color: '#fff' }}>{currArt ? currArt.name_jp : curr}</span>
                                                </div>
                                                <div style={{ color: rate > 1.0 ? '#ffcc00' : '#888' }}>
                                                    x{rate.toFixed(1)}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

function getAttributeColor(attr: string): string {
    switch (attr) {
        case '斬': return '#ff5555';
        case '打': return '#aa5555';
        case '突': return '#ffaa55';
        case '火': return '#ff4400';
        case '水': return '#4444ff';
        case '風': return '#44ff44';
        case '土': return '#aa7744';
        case '光': return '#ffff88';
        case '闇': return '#880088';
        case '雷': return '#ccddff';
        default: return '#888888';
    }
}
