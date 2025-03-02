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

function drawDirtTexture(ctx: CanvasRenderingContext2D, x: number, y: number, cellSize: number) {
  // Use x and y to generate consistent dot positions
  const dotCount = 12;
  const dots = Array(dotCount).fill(0).map((_, i) => {
    const angle = (i / dotCount) * Math.PI * 2;
    const radius = cellSize * 0.3;
    return {
      x: x * cellSize + cellSize/2 + Math.cos(angle) * radius,
      y: y * cellSize + cellSize/2 + Math.sin(angle) * radius,
    };
  });

  ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
  dots.forEach(dot => {
    ctx.beginPath();
    ctx.arc(dot.x, dot.y, 1, 0, Math.PI * 2);
    ctx.fill();
  });

  // Add consistent lines based on position
  const lineCount = 3;
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
  ctx.lineWidth = 0.5;

  for (let i = 0; i < lineCount; i++) {
    const startAngle = ((x + y + i) % 6) * Math.PI / 3;
    const length = cellSize * 0.4;

    ctx.beginPath();
    ctx.moveTo(
      x * cellSize + cellSize/2 + Math.cos(startAngle) * length,
      y * cellSize + cellSize/2 + Math.sin(startAngle) * length
    );
    ctx.lineTo(
      x * cellSize + cellSize/2 - Math.cos(startAngle) * length,
      y * cellSize + cellSize/2 - Math.sin(startAngle) * length
    );
    ctx.stroke();
  }
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

function drawBuilding(ctx: CanvasRenderingContext2D, x: number, y: number, cellSize: number, type: string, width: number, height: number) {
  const buildingX = x * cellSize;
  const buildingY = y * cellSize;
  const totalWidth = width * cellSize;
  const totalHeight = height * cellSize;

  // Common building base
  ctx.fillStyle = '#8B4513'; // Brown base for all buildings
  ctx.fillRect(buildingX, buildingY - (height - 1) * cellSize, totalWidth, totalHeight);

  // Building-specific details
  switch (type) {
    case 'bank':
      // Gold/yellow bank with columns
      ctx.fillStyle = '#DAA520';
      ctx.fillRect(buildingX + 2, buildingY - (height - 1) * cellSize + 2, totalWidth - 4, totalHeight - 4);

      // Columns
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(buildingX + 4, buildingY - (height - 1) * cellSize + 4, 4, totalHeight - 8);
      ctx.fillRect(buildingX + totalWidth - 8, buildingY - (height - 1) * cellSize + 4, 4, totalHeight - 8);

      // Door
      ctx.fillStyle = '#8B4513';
      ctx.fillRect(buildingX + totalWidth / 2 - 6, buildingY - 4, 12, totalHeight / 4);

      // Sign
      ctx.fillStyle = '#000000';
      ctx.font = '12px Arial';
      ctx.fillText('BANK', buildingX + totalWidth / 2 - 15, buildingY - totalHeight / 2);
      break;

    case 'shop':
      // Red shop with window
      ctx.fillStyle = '#8B0000';
      ctx.fillRect(buildingX + 2, buildingY - (height - 1) * cellSize + 2, totalWidth - 4, totalHeight - 4);

      // Windows
      ctx.fillStyle = '#87CEEB';
      ctx.fillRect(buildingX + 6, buildingY - (height - 1) * cellSize + 4, totalWidth - 12, totalHeight / 3);

      // Door
      ctx.fillStyle = '#8B4513';
      ctx.fillRect(buildingX + totalWidth / 2 - 6, buildingY - 4, 12, totalHeight / 4);

      // Sign
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '12px Arial';
      ctx.fillText('SHOP', buildingX + totalWidth / 2 - 15, buildingY - totalHeight / 2);
      break;

    case 'saloon':
      // Wooden saloon with swinging doors
      ctx.fillStyle = '#DEB887';
      ctx.fillRect(buildingX + 2, buildingY - (height - 1) * cellSize + 2, totalWidth - 4, totalHeight - 4);

      // Swinging doors
      ctx.fillStyle = '#8B4513';
      ctx.fillRect(buildingX + totalWidth / 2 - 6, buildingY - 4, 12, totalHeight / 4);

      // Windows
      ctx.fillStyle = '#87CEEB';
      for (let i = 0; i < width - 1; i++) {
        ctx.fillRect(buildingX + 6 + i * cellSize, buildingY - (height - 1) * cellSize + 4, cellSize - 12, totalHeight / 3);
      }

      // Sign
      ctx.fillStyle = '#000000';
      ctx.font = '12px Arial';
      ctx.fillText('SALOON', buildingX + totalWidth / 2 - 20, buildingY - totalHeight / 2);
      break;

    case 'hospital':
      // White hospital with red cross
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(buildingX + 2, buildingY - (height - 1) * cellSize + 2, totalWidth - 4, totalHeight - 4);

      // Red cross
      ctx.fillStyle = '#FF0000';
      ctx.fillRect(buildingX + totalWidth / 2 - 4, buildingY - (height - 1) * cellSize + 4, 8, totalHeight - 8);
      ctx.fillRect(buildingX + 4, buildingY - totalHeight / 2 - 4, totalWidth - 8, 8);

      // Door
      ctx.fillStyle = '#8B4513';
      ctx.fillRect(buildingX + totalWidth / 2 - 6, buildingY - 4, 12, totalHeight / 4);

      // Sign
      ctx.fillStyle = '#000000';
      ctx.font = '10px Arial';
      ctx.fillText('HOSPITAL', buildingX + totalWidth / 2 - 25, buildingY - totalHeight / 2);
      break;
  }
}

function drawElevatorShaft(ctx: CanvasRenderingContext2D, gameState: GameState) {
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
}

export function GameCanvas({ gameState }: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

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

    const render = () => {
      ctx.imageSmoothingEnabled = false;

      ctx.fillStyle = gameState.isAboveGround ? COLORS.empty : COLORS.underground_empty;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const scaleX = canvas.width / (CELL_SIZE * 40);
      const scaleY = canvas.height / (CELL_SIZE * 25);
      const scale = Math.min(scaleX, scaleY);

      const offsetX = (canvas.width - (CELL_SIZE * 40 * scale)) / 2;
      const offsetY = (canvas.height - (CELL_SIZE * 25 * scale)) / 2;

      ctx.save();
      ctx.translate(offsetX, offsetY);
      ctx.scale(scale, scale);

      // Draw blocks
      gameState.blocks.forEach((row, y) => {
        row.forEach((block, x) => {
          if (y < SURFACE_HEIGHT && block.type === 'empty') return;

          let color;
          if (!block.discovered && !gameState.showAllBlocks && y >= SURFACE_HEIGHT) {
            color = COLORS.undiscovered;
          } else {
            color = block.type === 'empty' && y >= SURFACE_HEIGHT
              ? COLORS.underground_empty
              : COLORS[block.type as keyof typeof COLORS];
          }

          if (['bank', 'shop', 'saloon', 'hospital'].includes(block.type) && block.buildingWidth && block.buildingHeight) {
            drawBuilding(ctx, x, y, CELL_SIZE, block.type, block.buildingWidth, block.buildingHeight);
          } else if (!['bank', 'shop', 'saloon', 'hospital'].includes(block.type)) {
            // Draw base block
            ctx.fillStyle = color;
            ctx.fillRect(
              Math.floor(x * CELL_SIZE),
              Math.floor(y * CELL_SIZE),
              CELL_SIZE + 1,
              CELL_SIZE + 1
            );

            // Add dirt texture
            if (block.type === 'dirt' || block.type === 'unstable_dirt' || 
                (!block.discovered && !gameState.showAllBlocks && y >= SURFACE_HEIGHT)) {
              drawDirtTexture(ctx, x, y, CELL_SIZE);
            }

            if (block.discovered || gameState.showAllBlocks) {
              if (block.floodLevel && block.floodLevel > 0) {
                ctx.fillStyle = `rgba(0, 119, 190, ${block.floodLevel / 100})`;
                ctx.fillRect(
                  Math.floor(x * CELL_SIZE),
                  Math.floor(y * CELL_SIZE),
                  CELL_SIZE + 1,
                  CELL_SIZE + 1
                );
              }

              if ((block.type === 'unstable_dirt' || block.type === 'unstable_rock') &&
                block.stabilityLevel && block.stabilityLevel < 50) {
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
          }
        });
      });

      // Draw elevator shaft and player after all blocks
      drawElevatorShaft(ctx, gameState);
      drawPlayer(ctx, gameState.player.x, gameState.player.y, CELL_SIZE);

      ctx.restore();

      // Schedule next frame
      animationFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [gameState]);

  return (
    <div className="relative w-full h-full">
      <canvas
        ref={canvasRef}
        className="absolute inset-0"
      />
    </div>
  );
}

interface GameCanvasProps {
  gameState: GameState;
}