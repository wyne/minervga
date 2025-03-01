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
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="space-y-2 mb-8">
              <h1 className="text-3xl font-bold">Miner VGA</h1>
              <div className="text-lg space-x-4">
                <span>Score: {gameState.score}</span>
                <span>Level: {gameState.level}</span>
                <span>Lives: {gameState.lives}</span>
                <span>Money: ${gameState.money}</span>
              </div>
            </div>

            <Card className="p-4 bg-gray-800">
              <GameCanvas gameState={gameState} />
            </Card>

            <div className="mt-4">
              <Button onClick={resetGame}>New Game</Button>
            </div>
          </div>

          <div className="w-64 ml-8">
            <Card className="p-4 bg-gray-800">
              <h2 className="text-xl font-bold mb-4">Inventory</h2>
              <div className="space-y-2">
                {gameState.inventory.map((item, index) => (
                  <div key={index} className="flex justify-between items-center">
                    <span className="capitalize">{item.type}</span>
                    <span>x{item.quantity}</span>
                    {gameState.activeShop?.type === 'mineral_shop' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSellItem(item)}
                        disabled={item.type === 'pickaxe'}
                      >
                        Sell
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </Card>

            {gameState.activeShop && (
              <Card className="p-4 bg-gray-800 mt-4">
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
          </div>
        </div>

        <div className="mt-8 text-center text-gray-400">
          <p>Use arrow keys to move and dig</p>
          <p>Visit shops to buy tools and sell minerals</p>
          <p>Use the ladder to move between surface and underground</p>
        </div>
      </div>
    </div>
  );
}