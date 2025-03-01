import { useEffect, useRef } from 'react';
import { GameState } from '@shared/schema';
import { CELL_SIZE } from './GameLogic';

const COLORS = {
  empty: '#000',
  dirt: '#8B4513',
  rock: '#808080',
  diamond: '#00FFFF',
  wall: '#696969',
  player: '#FF0000'
};

interface GameCanvasProps {
  gameState: GameState;
}

export function GameCanvas({ gameState }: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw blocks
    gameState.blocks.forEach((row, y) => {
      row.forEach((block, x) => {
        ctx.fillStyle = COLORS[block.type];
        ctx.fillRect(
          x * CELL_SIZE,
          y * CELL_SIZE,
          CELL_SIZE,
          CELL_SIZE
        );
      });
    });

    // Draw player
    ctx.fillStyle = COLORS.player;
    ctx.fillRect(
      gameState.player.x * CELL_SIZE,
      gameState.player.y * CELL_SIZE,
      CELL_SIZE,
      CELL_SIZE
    );
  }, [gameState]);

  return (
    <canvas
      ref={canvasRef}
      width={800}
      height={500}
      className="border border-gray-700 bg-black"
    />
  );
}
