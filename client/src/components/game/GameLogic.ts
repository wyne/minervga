import { GameState, Position, Block } from "@shared/schema";

export const GRID_SIZE = 32;
export const CELL_SIZE = 20;
export const GRID_WIDTH = 40;
export const GRID_HEIGHT = 25;

const INITIAL_LIVES = 3;

export function createInitialState(): GameState {
  const blocks: Block[][] = Array(GRID_HEIGHT).fill(null).map((_, y) => 
    Array(GRID_WIDTH).fill(null).map((_, x): Block => ({
      type: generateBlockType(x, y),
      position: { x, y }
    }))
  );

  return {
    player: { x: 1, y: 1 },
    blocks,
    score: 0,
    level: 1,
    lives: INITIAL_LIVES,
    gameOver: false
  };
}

function generateBlockType(x: number, y: number): Block['type'] {
  if (x === 0 || x === GRID_WIDTH - 1 || y === 0 || y === GRID_HEIGHT - 1) {
    return 'wall';
  }

  const rand = Math.random();
  if (rand < 0.6) return 'dirt';
  if (rand < 0.8) return 'rock';
  if (rand < 0.9) return 'diamond';
  return 'empty';
}

export function movePlayer(state: GameState, dx: number, dy: number): GameState {
  const newX = state.player.x + dx;
  const newY = state.player.y + dy;

  if (!isValidMove(state, newX, newY)) {
    return state;
  }

  const newState = { ...state };
  const block = state.blocks[newY][newX];

  if (block.type === 'diamond') {
    newState.score += 10;
    playSound('collect');
  } else if (block.type === 'dirt') {
    playSound('dig');
  }

  newState.blocks[newY][newX] = { ...block, type: 'empty' };
  newState.player = { x: newX, y: newY };

  return newState;
}

function isValidMove(state: GameState, x: number, y: number): boolean {
  if (x < 0 || x >= GRID_WIDTH || y < 0 || y >= GRID_HEIGHT) {
    return false;
  }

  const block = state.blocks[y][x];
  return block.type !== 'wall' && block.type !== 'rock';
}

// Fix WebAudioContext type declaration
declare global {
  interface Window {
    webkitAudioContext: typeof AudioContext;
  }
}

const audioContext = new (window.AudioContext || window.webkitAudioContext)();

function playSound(type: 'dig' | 'collect') {
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  if (type === 'dig') {
    oscillator.frequency.setValueAtTime(150, audioContext.currentTime);
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
  } else {
    oscillator.frequency.setValueAtTime(440, audioContext.currentTime);
    gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
  }

  oscillator.start();
  gainNode.gain.exponentialRampToValueAtTime(0.00001, audioContext.currentTime + 0.1);
  oscillator.stop(audioContext.currentTime + 0.1);
}