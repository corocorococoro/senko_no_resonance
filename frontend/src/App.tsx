import { MobileContainer } from './components/MobileContainer';
import { BattleStage } from './components/BattleStage/BattleStage';
import { GameUI } from './components/GameUI';
import { ErrorBoundary } from './components/ErrorBoundary';
import { BattleLog } from './components/BattleLog';
import { useGameStore } from './store/gameStore';
import { useEffect } from 'react';

// Exploration Screen Component
const ExplorationScreen = () => {
  const floor = useGameStore(s => s.floor);
  const advance = useGameStore(s => s.advance);

  return (
    <div
      onClick={advance}
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        background: 'linear-gradient(180deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
        cursor: 'pointer',
        userSelect: 'none'
      }}
    >
      <div style={{
        fontSize: 64,
        marginBottom: 20,
        filter: 'drop-shadow(0 0 10px rgba(255,255,255,0.3))'
      }}>
        🏰
      </div>
      <div style={{
        color: '#8892b0',
        fontSize: 14,
        letterSpacing: 2,
        marginBottom: 8
      }}>
        FLOOR
      </div>
      <div style={{
        color: '#fff',
        fontSize: 48,
        fontWeight: 'bold',
        textShadow: '0 0 20px rgba(100,200,255,0.5)'
      }}>
        B{floor}F
      </div>
      <div style={{
        color: '#4a5568',
        fontSize: 12,
        marginTop: 40,
        animation: 'pulse 2s infinite'
      }}>
        TAP TO EXPLORE
      </div>
      <style>{`
                @keyframes pulse {
                    0%, 100% { opacity: 0.5; }
                    50% { opacity: 1; }
                }
            `}</style>
    </div>
  );
};

// Result Screen Component
const ResultScreen = () => {
  const floor = useGameStore(s => s.floor);
  const stats = useGameStore(s => s.stats);
  const advance = useGameStore(s => s.advance);

  return (
    <div
      onClick={advance}
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        background: 'linear-gradient(180deg, #0d1117 0%, #1a1a2e 100%)',
        cursor: 'pointer'
      }}
    >
      <div style={{
        fontSize: 48,
        color: '#ffd700',
        marginBottom: 20
      }}>
        ⭐ VICTORY ⭐
      </div>
      <div style={{ color: '#8892b0', fontSize: 14, marginBottom: 30 }}>
        Floor B{floor}F Cleared!
      </div>
      <div style={{
        background: 'rgba(255,255,255,0.05)',
        padding: 20,
        borderRadius: 10,
        minWidth: 200
      }}>
        <div style={{ color: '#aaa', fontSize: 12, marginBottom: 8 }}>STATS</div>
        <div style={{ color: '#fff', fontSize: 16 }}>
          Total Damage: {stats.totalDamage.toLocaleString()}
        </div>
        <div style={{ color: '#0ff', fontSize: 16 }}>
          Resonances: {stats.resonanceTotal}
        </div>
      </div>
      <div style={{ color: '#4a5568', fontSize: 12, marginTop: 40 }}>
        TAP TO CONTINUE
      </div>
    </div>
  );
};

function App() {
  const phase = useGameStore(s => s.phase);
  const fetchArts = useGameStore(s => s.fetchArts);
  const fetchParty = useGameStore(s => s.fetchParty);

  const isDataLoaded = useGameStore(s => s.isDataLoaded);

  // Init Data
  useEffect(() => {
    fetchArts();
    fetchParty();
  }, [fetchArts, fetchParty]);

  if (!isDataLoaded) {
    return (
      <div style={{
        width: '100vw', height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center',
        background: '#0a0a10', color: '#0ff', fontFamily: 'monospace'
      }}>
        INITIALIZING SYSTEM...
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <MobileContainer>
        {phase === 'EXPLORATION' && <ExplorationScreen />}
        {phase === 'BATTLE' && (
          <>
            <BattleStage />
            <GameUI />
            <BattleLog />
          </>
        )}
        {phase === 'RESULT' && <ResultScreen />}
      </MobileContainer>
    </ErrorBoundary>
  );
}

export default App;
