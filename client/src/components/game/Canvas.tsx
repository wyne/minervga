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
  undiscovered: '#654321', // Dark brown for undiscovered blocks
  water: '#0077be', // Deep blue for water
  unstable_dirt: '#A0522D', // Darker brown for unstable dirt
  unstable_rock: '#696969', // Darker gray for unstable rock
};

interface GameCanvasProps {
  gameState: GameState;
}

function drawPlayer(ctx: CanvasRenderingContext2D, x: number, y: number, cellSize: number) {
  const centerX = x * cellSize + cellSize / 2;
  const centerY = y * cellSize + cellSize / 2;

  // Draw head
  ctx.fillStyle = '#FFD700'; // Gold color for head
  ctx.beginPath();
  ctx.arc(centerX, centerY - cellSize * 0.2, cellSize * 0.2, 0, Math.PI * 2);
  ctx.fill();

  // Draw body
  ctx.fillStyle = '#FF0000'; // Red color for body
  ctx.fillRect(
    centerX - cellSize * 0.15,
    centerY,
    cellSize * 0.3,
    cellSize * 0.4
  );

  // Draw arms
  ctx.strokeStyle = '#FF0000';
  ctx.lineWidth = 3;
  ctx.beginPath();
  // Left arm
  ctx.moveTo(centerX - cellSize * 0.15, centerY + cellSize * 0.1);
  ctx.lineTo(centerX - cellSize * 0.35, centerY + cellSize * 0.25);
  // Right arm
  ctx.moveTo(centerX + cellSize * 0.15, centerY + cellSize * 0.1);
  ctx.lineTo(centerX + cellSize * 0.35, centerY + cellSize * 0.25);
  ctx.stroke();

  // Draw legs
  ctx.beginPath();
  // Left leg
  ctx.moveTo(centerX - cellSize * 0.15, centerY + cellSize * 0.4);
  ctx.lineTo(centerX - cellSize * 0.25, centerY + cellSize * 0.6);
  // Right leg
  ctx.moveTo(centerX + cellSize * 0.15, centerY + cellSize * 0.4);
  ctx.lineTo(centerX + cellSize * 0.25, centerY + cellSize * 0.6);
  ctx.stroke();
}

function drawBuilding(ctx: CanvasRenderingContext2D, x: number, y: number, cellSize: number, type: string) {
  const buildingX = x * cellSize;
  const buildingY = y * cellSize;
  const width = cellSize;
  const height = cellSize;

  // Common building base
  ctx.fillStyle = '#8B4513'; // Brown base for all buildings
  ctx.fillRect(buildingX, buildingY, width, height);

  // Building-specific details
  switch (type) {
    case 'bank':
      // Gold/yellow bank with columns
      ctx.fillStyle = '#DAA520';
      ctx.fillRect(buildingX + 2, buildingY + 2, width - 4, height - 4);

      // Columns
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(buildingX + 4, buildingY + 4, 4, height - 8);
      ctx.fillRect(buildingX + width - 8, buildingY + 4, 4, height - 8);

      // Sign
      ctx.fillStyle = '#000000';
      ctx.font = '8px Arial';
      ctx.fillText('BANK', buildingX + 4, buildingY + height - 4);
      break;

    case 'shop':
      // Red shop with window
      ctx.fillStyle = '#8B0000';
      ctx.fillRect(buildingX + 2, buildingY + 2, width - 4, height - 4);

      // Window
      ctx.fillStyle = '#87CEEB';
      ctx.fillRect(buildingX + 6, buildingY + 4, width - 12, height / 2 - 4);

      // Sign
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '8px Arial';
      ctx.fillText('SHOP', buildingX + 4, buildingY + height - 4);
      break;

    case 'saloon':
      // Wooden saloon with swinging doors
      ctx.fillStyle = '#DEB887';
      ctx.fillRect(buildingX + 2, buildingY + 2, width - 4, height - 4);

      // Swinging doors
      ctx.fillStyle = '#8B4513';
      ctx.fillRect(buildingX + width / 2 - 6, buildingY + height / 2, 12, height / 2 - 4);

      // Sign
      ctx.fillStyle = '#000000';
      ctx.font = '8px Arial';
      ctx.fillText('SALOON', buildingX + 2, buildingY + height - 4);
      break;

    case 'hospital':
      // White hospital with red cross
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(buildingX + 2, buildingY + 2, width - 4, height - 4);

      // Red cross
      ctx.fillStyle = '#FF0000';
      ctx.fillRect(buildingX + width / 2 - 2, buildingY + 4, 4, height - 8);
      ctx.fillRect(buildingX + 4, buildingY + height / 2 - 2, width - 8, 4);

      // Sign
      ctx.fillStyle = '#000000';
      ctx.font = '7px Arial';
      ctx.fillText('HOSPITAL', buildingX + 2, buildingY + height - 4);
      break;
  }
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

        if (['bank', 'shop', 'saloon', 'hospital'].includes(block.type)) {
          drawBuilding(ctx, x, y, CELL_SIZE, block.type);
        } else {
          ctx.fillStyle = color;
          ctx.fillRect(
            Math.floor(x * CELL_SIZE),
            Math.floor(y * CELL_SIZE),
            CELL_SIZE + 1,
            CELL_SIZE + 1
          );

          // Only show water and instability effects if block is discovered or debug mode is on
          if (block.discovered || gameState.showAllBlocks) {
            // Add water effect
            if (block.floodLevel && block.floodLevel > 0) {
              ctx.fillStyle = `rgba(0, 119, 190, ${block.floodLevel / 100})`;
              ctx.fillRect(
                Math.floor(x * CELL_SIZE),
                Math.floor(y * CELL_SIZE),
                CELL_SIZE + 1,
                CELL_SIZE + 1
              );
            }

            // Add unstable block indicators
            if ((block.type === 'unstable_dirt' || block.type === 'unstable_rock') &&
              block.stabilityLevel && block.stabilityLevel < 50) {
              // Add crack pattern
              ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
              ctx.lineWidth = 1;
              ctx.beginPath();
              ctx.moveTo(x * CELL_SIZE, y * CELL_SIZE);
              ctx.lineTo((x + 1) * CELL_SIZE, (y + 1) * CELL_SIZE);
              ctx.moveTo((x + 1) * CELL_SIZE, y * CELL_SIZE);
              ctx.lineTo(x * CELL_SIZE, (y + 1) * CELL_SIZE);
              ctx.stroke();
            }
          }

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
    drawPlayer(ctx, gameState.player.x, gameState.player.y, CELL_SIZE);

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