import { useEffect, useRef } from 'react';
import { GameState } from '@shared/schema';
import { CELL_SIZE, SURFACE_HEIGHT, GRID_HEIGHT } from './GameLogic';

const COLORS = {
  empty: '#87CEEB', // Sky blue for above ground
  dirt: '#8B4513',
  rock: '#808080',
  gold: '#FFD700',
  silver: '#C0C0C0',
  platinum: '#E5E4E2',
  wall: '#696969',
  player: '#FF0000',
  shop: '#FFD700',
  elevator: '#708090', // Slate gray for elevator carriage
  shaft: '#2F4F4F', // Dark slate gray for shaft
  underground_empty: '#000', // Black for underground empty spaces
  undiscovered: '#654321' // Dark brown for undiscovered blocks
};

interface GameCanvasProps {
  gameState: GameState;
}

export function GameCanvas({ gameState }: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Match canvas to parent container size
    const resizeCanvas = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      canvas.width = parent.clientWidth;
      canvas.height = parent.clientHeight;
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Enable image smoothing for better block rendering
    ctx.imageSmoothingEnabled = false;

    // Clear canvas
    ctx.fillStyle = gameState.isAboveGround ? COLORS.empty : COLORS.underground_empty;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Calculate scale to fill the screen while maintaining aspect ratio
    const scaleX = canvas.width / (CELL_SIZE * 40);
    const scaleY = canvas.height / (CELL_SIZE * 25);
    const scale = Math.min(scaleX, scaleY);

    // Center the game view
    const offsetX = (canvas.width - (CELL_SIZE * 40 * scale)) / 2;
    const offsetY = (canvas.height - (CELL_SIZE * 25 * scale)) / 2;

    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.scale(scale, scale);

    // Draw blocks
    gameState.blocks.forEach((row, y) => {
      row.forEach((block, x) => {
        // Skip empty blocks above ground
        if (y < SURFACE_HEIGHT && block.type === 'empty') return;

        let color;
        if (!block.discovered && !gameState.showAllBlocks && y >= SURFACE_HEIGHT) {
          // Show undiscovered blocks as generic dirt
          color = COLORS.undiscovered;
        } else {
          // Use underground empty color for empty spaces below ground
          color = block.type === 'empty' && y >= SURFACE_HEIGHT
            ? COLORS.underground_empty
            : COLORS[block.type];
        }

        ctx.fillStyle = color;
        ctx.fillRect(
          Math.floor(x * CELL_SIZE),
          Math.floor(y * CELL_SIZE),
          CELL_SIZE + 1, // Add 1 pixel to prevent gaps
          CELL_SIZE + 1  // Add 1 pixel to prevent gaps
        );

        // Add details for shops
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
    for (let y = SURFACE_HEIGHT; y < GRID_HEIGHT - 1; y++) {
      // Draw shaft background
      ctx.fillStyle = COLORS.shaft;
      ctx.fillRect(
        shaftX * CELL_SIZE,
        y * CELL_SIZE,
        CELL_SIZE,
        CELL_SIZE
      );

      // Add shaft details
      ctx.strokeStyle = '#363636';
      ctx.lineWidth = 1;
      for (let i = 1; i <= 3; i++) {
        ctx.beginPath();
        ctx.moveTo(shaftX * CELL_SIZE, y * CELL_SIZE + (i * CELL_SIZE / 4));
        ctx.lineTo(shaftX * CELL_SIZE + CELL_SIZE, y * CELL_SIZE + (i * CELL_SIZE / 4));
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
    ctx.moveTo(gameState.elevatorPosition.x * CELL_SIZE + CELL_SIZE / 2, gameState.elevatorPosition.y * CELL_SIZE);
    ctx.lineTo(gameState.elevatorPosition.x * CELL_SIZE + CELL_SIZE / 2, gameState.elevatorPosition.y * CELL_SIZE + CELL_SIZE * 1.5);
    ctx.stroke();

    // Draw player
    ctx.fillStyle = COLORS.player;
    ctx.fillRect(
      gameState.player.x * CELL_SIZE,
      gameState.player.y * CELL_SIZE,
      CELL_SIZE,
      CELL_SIZE
    );

    ctx.restore();

    return () => window.removeEventListener('resize', resizeCanvas);
  }, [gameState]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
    />
  );
}