import { useState, useEffect, useCallback } from 'react';
import { GameCanvas } from '@/components/game/Canvas';
import { createInitialState, movePlayer, buyItem, sellItem, toggleShowAllBlocks } from '@/components/game/GameLogic';
import { Card } from '@/components/ui/card';
import { ShopItem } from '@shared/schema';
import { Button } from '@/components/ui/button';

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

  const handleToggleDebug = () => {
    setGameState(prevState => toggleShowAllBlocks(prevState));
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex">
      {/* Main game area */}
      <div className="flex-1 relative">
        <GameCanvas gameState={gameState} />
      </div>

      {/* Right sidebar */}
      <div className="w-64 p-3 bg-gray-800 overflow-y-auto border-l border-gray-700">
        {/* Stats */}
        <Card className="p-3 bg-gray-700 mb-3 border border-gray-600">
          <div className="space-y-1 text-sm">
            <div className="flex justify-between text-amber-300">
              <span>Cash:</span>
              <span>${gameState.money}</span>
            </div>
            <div className="flex justify-between text-emerald-400">
              <span>Health:</span>
              <span>{gameState.health}%</span>
            </div>
            <div className="flex justify-between text-blue-400">
              <span>Score:</span>
              <span>{gameState.score}</span>
            </div>
            <div className="flex justify-between text-purple-400">
              <span>Level:</span>
              <span>{gameState.level}</span>
            </div>
          </div>
        </Card>

        {/* Inventory */}
        <Card className="p-3 bg-gray-700 mb-3 border border-gray-600">
          <h2 className="text-lg font-bold mb-2 text-white">Inventory</h2>

          <div className="mb-3">
            <h3 className="text-xs font-semibold text-blue-300 mb-1">Tools</h3>
            <div className="space-y-1">
              {gameState.inventory
                .filter(item => item.type === 'pickaxe' || item.type === 'dynamite')
                .map((item, index) => (
                  <div key={index} className="flex justify-between items-center bg-gray-800 p-1.5 rounded text-sm">
                    <span className="capitalize text-gray-200">{item.type}</span>
                    <span className="text-amber-400">x{item.quantity}</span>
                  </div>
                ))}
            </div>
          </div>

          <div>
            <h3 className="text-xs font-semibold text-blue-300 mb-1">Minerals</h3>
            <div className="space-y-1">
              {gameState.inventory
                .filter(item => ['silver', 'gold', 'platinum'].includes(item.type))
                .sort((a, b) => {
                  const order = { silver: 1, gold: 2, platinum: 3 };
                  return order[a.type as keyof typeof order] - order[b.type as keyof typeof order];
                })
                .map((item, index) => (
                  <div key={index} className="flex justify-between items-center bg-gray-800 p-1.5 rounded text-sm">
                    <span className={`capitalize ${
                      item.type === 'gold' ? 'text-amber-400' :
                      item.type === 'silver' ? 'text-gray-300' :
                      'text-gray-100'
                    }`}>{item.type}</span>
                    <span className="text-amber-400">x{item.quantity}</span>
                  </div>
                ))}
            </div>
          </div>
        </Card>

        <Card className="p-3 bg-gray-700 mb-3 border border-gray-600">
          <Button 
            onClick={handleToggleDebug}
            variant="outline" 
            className="w-full text-sm"
          >
            {gameState.showAllBlocks ? 'Hide Minerals' : 'Show Minerals'}
          </Button>
        </Card>

        {/* Message Log */}
        <Card className="p-3 bg-gray-700 mb-3 border border-gray-600">
          <h2 className="text-lg font-bold mb-2 text-white">Message Log</h2>
          <div className="space-y-1">
            {gameState.messages.map((msg, index) => (
              <div 
                key={index} 
                className={`text-xs ${
                  msg.type === 'success' ? 'text-green-400' :
                  msg.type === 'warning' ? 'text-yellow-400' :
                  'text-gray-300'
                }`}
              >
                {msg.text}
              </div>
            ))}
          </div>
        </Card>

        <div className="mt-3 text-xs text-gray-400">
          <p>Use arrow keys to move and dig</p>
          <p>Visit shops to buy tools and sell minerals</p>
          <p>Use the elevator to move between surface and underground</p>
        </div>
      </div>
    </div>
  );
}