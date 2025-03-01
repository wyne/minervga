import { useState, useEffect, useCallback } from 'react';
import { GameCanvas } from '@/components/game/Canvas';
import { createInitialState, movePlayer, buyItem, sellItem } from '@/components/game/GameLogic';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ShopItem } from '@shared/schema';

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

  const handleBuyItem = (item: ShopItem) => {
    setGameState(prevState => buyItem(prevState, item));
  };

  const handleSellItem = (item: any) => {
    setGameState(prevState => sellItem(prevState, item));
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex">
      {/* Main game area */}
      <div className="flex-1 relative">
        <GameCanvas gameState={gameState} />
      </div>

      {/* Right sidebar */}
      <div className="w-80 p-4 bg-gray-800 overflow-y-auto">
        {/* Stats */}
        <Card className="p-4 bg-gray-700 mb-4">
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Cash:</span>
              <span>${gameState.money}</span>
            </div>
            <div className="flex justify-between">
              <span>Health:</span>
              <span>{gameState.health}%</span>
            </div>
            <div className="flex justify-between">
              <span>Score:</span>
              <span>{gameState.score}</span>
            </div>
            <div className="flex justify-between">
              <span>Level:</span>
              <span>{gameState.level}</span>
            </div>
          </div>
        </Card>

        {/* Inventory */}
        <Card className="p-4 bg-gray-700 mb-4">
          <h2 className="text-xl font-bold mb-4">Inventory</h2>

          <div className="mb-4">
            <h3 className="text-sm font-semibold text-gray-400 mb-2">Tools</h3>
            <div className="space-y-2">
              {gameState.inventory
                .filter(item => item.type === 'pickaxe' || item.type === 'dynamite')
                .map((item, index) => (
                  <div key={index} className="flex justify-between items-center">
                    <span className="capitalize">{item.type}</span>
                    <span>x{item.quantity}</span>
                  </div>
                ))}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-400 mb-2">Minerals</h3>
            <div className="space-y-2">
              {gameState.inventory
                .filter(item => ['gold', 'silver', 'platinum'].includes(item.type))
                .map((item, index) => (
                  <div key={index} className="flex justify-between items-center">
                    <span className="capitalize">{item.type}</span>
                    <span>x{item.quantity}</span>
                    {gameState.activeShop?.type === 'mineral_shop' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSellItem(item)}
                      >
                        Sell (${item.value})
                      </Button>
                    )}
                  </div>
                ))}
            </div>
          </div>
        </Card>

        {/* Shop */}
        {gameState.activeShop && (
          <Card className="p-4 bg-gray-700 mb-4">
            <h2 className="text-xl font-bold mb-4">
              {gameState.activeShop.type === 'tool_shop' ? 'Tool Shop' : 'Mineral Shop'}
            </h2>
            <div className="space-y-2">
              {gameState.activeShop.items.map((item, index) => (
                <div key={index} className="flex justify-between items-center">
                  <div>
                    <div className="capitalize">{item.type}</div>
                    <div className="text-sm text-gray-400">${item.price}</div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleBuyItem(item)}
                    disabled={gameState.money < item.price}
                  >
                    Buy
                  </Button>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Controls */}
        <Button onClick={resetGame} className="w-full">New Game</Button>

        <div className="mt-4 text-sm text-gray-400">
          <p>Use arrow keys to move and dig</p>
          <p>Visit shops to buy tools and sell minerals</p>
          <p>Use the elevator to move between surface and underground</p>
        </div>
      </div>
    </div>
  );
}