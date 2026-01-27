import { MobileContainer } from './components/MobileContainer';
import { BattleScene } from './components/BattleScene';
import { GameUI } from './components/GameUI';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useGameStore } from './store/gameStore';
import { useEffect } from 'react';
import { useBattleLoop } from './hooks/useBattleLoop';

function App() {
  const fetchArts = useGameStore(s => s.fetchArts);

  // Init Data
  useEffect(() => {
    fetchArts();
  }, [fetchArts]);

  // Auto-Battle Loop (Refactored to Hook)
  useBattleLoop();

  return (
    <ErrorBoundary>
      <MobileContainer>
        <BattleScene />
        <GameUI />
      </MobileContainer>
    </ErrorBoundary>
  );
}

export default App;
