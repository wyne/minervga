import { useState, useEffect, useCallback } from 'react';
import { GameCanvas } from '@/components/game/Canvas';
import { createInitialState, movePlayer } from '@/components/game/GameLogic';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default function Game() {
  const [gameState, setGameState] = useState(createInitialState());

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (gameState.gameOver) return;

    let dx = 0;
    let dy = 0;

    switch (e.key) {
      case 'ArrowUp':
        dy = -1;
        break;
      case 'ArrowDown':
        dy = 1;
        break;
      case 'ArrowLeft':
        dx = -1;
        break;
      case 'ArrowRight':
        dx = 1;
        break;
    }

    if (dx !== 0 || dy !== 0) {
      setGameState(prevState => movePlayer(prevState, dx, dy));
    }
  }, [gameState]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const resetGame = () => {
    setGameState(createInitialState());
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold">Miner VGA</h1>
            <div className="text-lg">
              Score: {gameState.score} | Level: {gameState.level} | Lives: {gameState.lives}
            </div>
          </div>
          <Button onClick={resetGame}>New Game</Button>
        </div>

        <Card className="p-4 bg-gray-800">
          <GameCanvas gameState={gameState} />
        </Card>

        <div className="mt-8 text-center text-gray-400">
          <p>Use arrow keys to move and dig</p>
          <p>Collect diamonds (cyan) for points</p>
          <p>Avoid rocks (gray)</p>
        </div>
      </div>
    </div>
  );
}
