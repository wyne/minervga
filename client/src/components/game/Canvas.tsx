import { useEffect, useRef, useMemo } from 'react';
import { GameState, Block } from '@shared/schema';
import { CELL_SIZE, SURFACE_HEIGHT } from './GameLogic';

interface GameCanvasProps {
  gameState: GameState;
}

interface PatternCache {
  gold: CanvasPattern | null;
  silver: CanvasPattern | null;
  platinum: CanvasPattern | null;
  rock: CanvasPattern | null;
  unstableRock: CanvasPattern | null;
  dirt: CanvasPattern | null;
  unstableDirt: CanvasPattern | null;
}

// Cache colors to avoid object creation each render
const COLORS = {
  empty: '#87CEEB',
  dirt: '#8B4513',
  rock: '#808080',
  gold: '#FFD700',
  silver: '#C0C0C0',
  platinum: '#E5E4E2',
  wall: '#696969',
  player: '#FF0000',
  elevator: '#708090',
  shaft: '#2F4F4F',
  underground_empty: '#000',
  undiscovered: '#654321',
  water: '#0077be',
  unstable_dirt: '#A0522D',
  unstable_rock: '#696969',
} as const;

// Pre-calculate ripple positions for performance
const RIPPLE_POSITIONS = Array.from({ length: 100 }, (_, i) => Math.sin(i * 0.1) * 2);

function createMineralPattern(ctx: CanvasRenderingContext2D, baseColor: string, sparkleColor: string): CanvasPattern | null {
  const patternCanvas = document.createElement('canvas');
  patternCanvas.width = CELL_SIZE;
  patternCanvas.height = CELL_SIZE;
  const patternCtx = patternCanvas.getContext('2d');

  if (!patternCtx) return null;

  // Base color with gradient
  const gradient = patternCtx.createLinearGradient(0, 0, CELL_SIZE, CELL_SIZE);
  gradient.addColorStop(0, baseColor);
  gradient.addColorStop(0.5, sparkleColor);
  gradient.addColorStop(1, baseColor);

  patternCtx.fillStyle = gradient;
  patternCtx.fillRect(0, 0, CELL_SIZE, CELL_SIZE);

  // Add sparkles
  patternCtx.fillStyle = sparkleColor;
  for (let i = 0; i < 5; i++) {
    const x = Math.random() * CELL_SIZE;
    const y = Math.random() * CELL_SIZE;
    patternCtx.beginPath();
    patternCtx.arc(x, y, 1, 0, Math.PI * 2);
    patternCtx.fill();
  }

  return ctx.createPattern(patternCanvas, 'repeat');
}

function createRockPattern(ctx: CanvasRenderingContext2D, isUnstable: boolean): CanvasPattern | null {
  const patternCanvas = document.createElement('canvas');
  patternCanvas.width = CELL_SIZE;
  patternCanvas.height = CELL_SIZE;
  const patternCtx = patternCanvas.getContext('2d');

  if (!patternCtx) return null;

  // Base color
  patternCtx.fillStyle = isUnstable ? '#696969' : '#808080';
  patternCtx.fillRect(0, 0, CELL_SIZE, CELL_SIZE);

  // Add rock texture
  patternCtx.strokeStyle = isUnstable ? '#555555' : '#707070';
  patternCtx.lineWidth = 1;

  for (let i = 0; i < 4; i++) {
    const x1 = Math.random() * CELL_SIZE;
    const y1 = Math.random() * CELL_SIZE;
    const x2 = x1 + (Math.random() * 6 - 3);
    const y2 = y1 + (Math.random() * 6 - 3);

    patternCtx.beginPath();
    patternCtx.moveTo(x1, y1);
    patternCtx.lineTo(x2, y2);
    patternCtx.stroke();
  }

  if (isUnstable) {
    // Add crack pattern for unstable rocks
    patternCtx.strokeStyle = '#000000';
    patternCtx.beginPath();
    patternCtx.moveTo(0, 0);
    patternCtx.lineTo(CELL_SIZE, CELL_SIZE);
    patternCtx.moveTo(CELL_SIZE, 0);
    patternCtx.lineTo(0, CELL_SIZE);
    patternCtx.stroke();
  }

  return ctx.createPattern(patternCanvas, 'repeat');
}

function createDirtPattern(ctx: CanvasRenderingContext2D, isUnstable: boolean): CanvasPattern | null {
  const patternCanvas = document.createElement('canvas');
  patternCanvas.width = CELL_SIZE;
  patternCanvas.height = CELL_SIZE;
  const patternCtx = patternCanvas.getContext('2d');

  if (!patternCtx) return null;

  // Base color
  patternCtx.fillStyle = isUnstable ? '#A0522D' : '#8B4513';
  patternCtx.fillRect(0, 0, CELL_SIZE, CELL_SIZE);

  // Add dirt texture (small dots)
  patternCtx.fillStyle = isUnstable ? '#904020' : '#7B3503';
  for (let i = 0; i < 8; i++) {
    const x = Math.random() * CELL_SIZE;
    const y = Math.random() * CELL_SIZE;
    const radius = Math.random() * 2 + 1;

    patternCtx.beginPath();
    patternCtx.arc(x, y, radius, 0, Math.PI * 2);
    patternCtx.fill();
  }

  if (isUnstable) {
    // Add unstable pattern
    patternCtx.strokeStyle = '#00000040';
    patternCtx.beginPath();
    patternCtx.moveTo(0, 0);
    patternCtx.lineTo(CELL_SIZE, CELL_SIZE);
    patternCtx.moveTo(CELL_SIZE, 0);
    patternCtx.lineTo(0, CELL_SIZE);
    patternCtx.stroke();
  }

  return ctx.createPattern(patternCanvas, 'repeat');
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
      ctx.fillRect(buildingX + totalWidth/2 - 6, buildingY - 4, 12, totalHeight/4);

      // Sign
      ctx.fillStyle = '#000000';
      ctx.font = '12px Arial';
      ctx.fillText('BANK', buildingX + totalWidth/2 - 15, buildingY - totalHeight/2);
      break;

    case 'shop':
      // Red shop with window
      ctx.fillStyle = '#8B0000';
      ctx.fillRect(buildingX + 2, buildingY - (height - 1) * cellSize + 2, totalWidth - 4, totalHeight - 4);

      // Windows
      ctx.fillStyle = '#87CEEB';
      ctx.fillRect(buildingX + 6, buildingY - (height - 1) * cellSize + 4, totalWidth - 12, totalHeight/3);

      // Door
      ctx.fillStyle = '#8B4513';
      ctx.fillRect(buildingX + totalWidth/2 - 6, buildingY - 4, 12, totalHeight/4);

      // Sign
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '12px Arial';
      ctx.fillText('SHOP', buildingX + totalWidth/2 - 15, buildingY - totalHeight/2);
      break;

    case 'saloon':
      // Wooden saloon with swinging doors
      ctx.fillStyle = '#DEB887';
      ctx.fillRect(buildingX + 2, buildingY - (height - 1) * cellSize + 2, totalWidth - 4, totalHeight - 4);

      // Swinging doors
      ctx.fillStyle = '#8B4513';
      ctx.fillRect(buildingX + totalWidth/2 - 6, buildingY - 4, 12, totalHeight/4);

      // Windows
      ctx.fillStyle = '#87CEEB';
      for (let i = 0; i < width - 1; i++) {
        ctx.fillRect(buildingX + 6 + i * cellSize, buildingY - (height - 1) * cellSize + 4, cellSize - 12, totalHeight/3);
      }

      // Sign
      ctx.fillStyle = '#000000';
      ctx.font = '12px Arial';
      ctx.fillText('SALOON', buildingX + totalWidth/2 - 20, buildingY - totalHeight/2);
      break;

    case 'hospital':
      // White hospital with red cross
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(buildingX + 2, buildingY - (height - 1) * cellSize + 2, totalWidth - 4, totalHeight - 4);

      // Red cross
      ctx.fillStyle = '#FF0000';
      ctx.fillRect(buildingX + totalWidth/2 - 4, buildingY - (height - 1) * cellSize + 4, 8, totalHeight - 8);
      ctx.fillRect(buildingX + 4, buildingY - totalHeight/2 - 4, totalWidth - 8, 8);

      // Door
      ctx.fillStyle = '#8B4513';
      ctx.fillRect(buildingX + totalWidth/2 - 6, buildingY - 4, 12, totalHeight/4);

      // Sign
      ctx.fillStyle = '#000000';
      ctx.font = '10px Arial';
      ctx.fillText('HOSPITAL', buildingX + totalWidth/2 - 25, buildingY - totalHeight/2);
      break;
  }
}

export function GameCanvas({ gameState }: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const patternsRef = useRef<PatternCache>({
    gold: null,
    silver: null,
    platinum: null,
    rock: null,
    unstableRock: null,
    dirt: null,
    unstableDirt: null
  });
  const animationFrameRef = useRef<number>();
  const lastRenderTimeRef = useRef<number>(0);
  const waterOffscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Initialize patterns and offscreen canvas only once
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Create patterns once
    patternsRef.current = {
      gold: createMineralPattern(ctx, '#FFD700', '#FFF7AA'),
      silver: createMineralPattern(ctx, '#C0C0C0', '#FFFFFF'),
      platinum: createMineralPattern(ctx, '#E5E4E2', '#FFFFFF'),
      rock: createRockPattern(ctx, false),
      unstableRock: createRockPattern(ctx, true),
      dirt: createDirtPattern(ctx, false),
      unstableDirt: createDirtPattern(ctx, true)
    };

    // Create offscreen canvas for water effects
    const waterCanvas = document.createElement('canvas');
    waterCanvas.width = CELL_SIZE;
    waterCanvas.height = CELL_SIZE;
    waterOffscreenCanvasRef.current = waterCanvas;
  }, []);

  // Memoize block drawing function to avoid recreating it every frame
  const drawBlock = useMemo(() => {
    return (ctx: CanvasRenderingContext2D, block: Block, x: number, y: number, showAllBlocks: boolean) => {
      if (y < SURFACE_HEIGHT && block.type === 'empty') return;

      let fillStyle: string | CanvasPattern | null = COLORS.undiscovered;

      if (block.discovered || showAllBlocks) {
        switch (block.type) {
          case 'gold':
            fillStyle = patternsRef.current.gold;
            break;
          case 'silver':
            fillStyle = patternsRef.current.silver;
            break;
          case 'platinum':
            fillStyle = patternsRef.current.platinum;
            break;
          case 'rock':
            fillStyle = patternsRef.current.rock;
            break;
          case 'unstable_rock':
            fillStyle = patternsRef.current.unstableRock;
            break;
          case 'dirt':
            fillStyle = patternsRef.current.dirt;
            break;
          case 'unstable_dirt':
            fillStyle = patternsRef.current.unstableDirt;
            break;
          default:
            fillStyle = COLORS[block.type as keyof typeof COLORS];
        }
      }

      if (['bank', 'shop', 'saloon', 'hospital'].includes(block.type) && block.buildingWidth && block.buildingHeight) {
        drawBuilding(ctx, x, y, CELL_SIZE, block.type, block.buildingWidth, block.buildingHeight);
      } else if (!['bank', 'shop', 'saloon', 'hospital'].includes(block.type)) {
        ctx.fillStyle = fillStyle || COLORS[block.type as keyof typeof COLORS];
        ctx.fillRect(
          Math.floor(x * CELL_SIZE),
          Math.floor(y * CELL_SIZE),
          CELL_SIZE + 1,
          CELL_SIZE + 1
        );

        // Water effect using pre-calculated ripples
        if ((block.discovered || showAllBlocks) && block.floodLevel && block.floodLevel > 0) {
          const waterOpacity = block.floodLevel / 100;
          const rippleIndex = Math.floor((Date.now() / 100 + x + y) % RIPPLE_POSITIONS.length);
          const rippleHeight = RIPPLE_POSITIONS[rippleIndex];

          ctx.fillStyle = `rgba(0, 119, 190, ${waterOpacity})`;
          ctx.fillRect(
            Math.floor(x * CELL_SIZE),
            Math.floor(y * CELL_SIZE) + rippleHeight,
            CELL_SIZE + 1,
            CELL_SIZE + 1
          );
        }
      }
    };
  }, []);

  // Main render effect
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      canvas.width = parent.clientWidth;
      canvas.height = parent.clientHeight;
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Animation function with frame rate control
    const render = (timestamp: number) => {
      // Limit frame rate to 30 FPS
      if (timestamp - lastRenderTimeRef.current < 33) {
        animationFrameRef.current = requestAnimationFrame(render);
        return;
      }
      lastRenderTimeRef.current = timestamp;

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

      // Draw blocks using memoized function
      gameState.blocks.forEach((row: Block[], y: number) => {
        row.forEach((block: Block, x: number) => {
          drawBlock(ctx, block, x, y, gameState.showAllBlocks);
        });
      });

      // Draw elevator shaft
      const shaftX = gameState.elevatorPosition.x;
      for (let y = SURFACE_HEIGHT; y < gameState.blocks.length - 1; y++) {
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
      animationFrameRef.current = requestAnimationFrame(render);
    };

    // Start animation loop
    render(0);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [gameState, drawBlock]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
    />
  );
}