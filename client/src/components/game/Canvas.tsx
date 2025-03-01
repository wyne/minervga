import { useEffect, useRef } from 'react';
import { GameState } from '@shared/schema';
import { CELL_SIZE, SURFACE_HEIGHT } from './GameLogic';

const COLORS = {
  empty: '#87CEEB', // Sky blue for above ground
  dirt: '#8B4513',
  rock: '#808080',
  diamond: '#00FFFF',
  wall: '#696969',
  player: '#FF0000',
  shop: '#FFD700', // Gold for shops
  ladder: '#8B4513', // Brown for ladder
  underground_empty: '#000', // Black for underground empty spaces
  elevator: '#708090', // Slate gray for elevator carriage
  shaft: '#2F4F4F' // Dark slate gray for shaft
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
    ctx.fillStyle = gameState.isAboveGround ? COLORS.empty : COLORS.underground_empty;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw blocks
    gameState.blocks.forEach((row, y) => {
      row.forEach((block, x) => {
        // Skip empty blocks above ground
        if (y < SURFACE_HEIGHT && block.type === 'empty') return;

        // Use underground empty color for empty spaces below ground
        const color = block.type === 'empty' && y >= SURFACE_HEIGHT 
          ? COLORS.underground_empty 
          : COLORS[block.type];

        ctx.fillStyle = color;
        ctx.fillRect(
          x * CELL_SIZE,
          y * CELL_SIZE,
          CELL_SIZE,
          CELL_SIZE
        );

        // Add details for special blocks
        if (block.type === 'shop') {
          ctx.fillStyle = '#000';
          ctx.font = '12px Arial';
          ctx.fillText(
            'SHOP',
            x * CELL_SIZE + 2,
            y * CELL_SIZE + CELL_SIZE - 5
          );
        }
      });
    });

    // Draw elevator shaft
    const shaftX = gameState.elevatorPosition.x;
    for (let y = SURFACE_HEIGHT; y < SURFACE_HEIGHT + 10; y++) {
      // Draw shaft background
      ctx.fillStyle = COLORS.shaft;
      ctx.fillRect(
        (shaftX - 1) * CELL_SIZE,
        y * CELL_SIZE,
        CELL_SIZE * 3,
        CELL_SIZE
      );

      // Draw shaft walls
      ctx.fillStyle = '#000';
      ctx.fillRect(
        (shaftX - 1) * CELL_SIZE,
        y * CELL_SIZE,
        2,
        CELL_SIZE
      );
      ctx.fillRect(
        (shaftX + 1) * CELL_SIZE,
        y * CELL_SIZE,
        2,
        CELL_SIZE
      );

      // Add wall details
      ctx.strokeStyle = '#363636';
      ctx.lineWidth = 1;
      for (let i = 1; i <= 3; i++) {
        ctx.beginPath();
        ctx.moveTo((shaftX - 1) * CELL_SIZE, y * CELL_SIZE + (i * CELL_SIZE / 4));
        ctx.lineTo((shaftX + 1) * CELL_SIZE + 2, y * CELL_SIZE + (i * CELL_SIZE / 4));
        ctx.stroke();
      }
    }

    // Draw elevator carriage
    ctx.fillStyle = COLORS.elevator;
    ctx.fillRect(
      gameState.elevatorPosition.x * CELL_SIZE - 2,
      gameState.elevatorPosition.y * CELL_SIZE,
      CELL_SIZE + 4,
      CELL_SIZE * 1.5
    );

    // Add elevator details
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    // Outer frame
    ctx.strokeRect(
      gameState.elevatorPosition.x * CELL_SIZE - 2,
      gameState.elevatorPosition.y * CELL_SIZE,
      CELL_SIZE + 4,
      CELL_SIZE * 1.5
    );

    // Door lines
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(gameState.elevatorPosition.x * CELL_SIZE + CELL_SIZE/2, gameState.elevatorPosition.y * CELL_SIZE);
    ctx.lineTo(gameState.elevatorPosition.x * CELL_SIZE + CELL_SIZE/2, gameState.elevatorPosition.y * CELL_SIZE + CELL_SIZE * 1.5);
    ctx.stroke();

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
      className="border border-gray-700"
    />
  );
}