import { GameState, Position, Block, InventoryItem, Shop, ShopItem, MineralType, ToolType } from "@shared/schema";

export const GRID_SIZE = 32;
export const CELL_SIZE = 20;
export const GRID_WIDTH = 40;
export const GRID_HEIGHT = 30; // Increased from 25 to 30 for more mining space
export const SURFACE_HEIGHT = 5;

const INITIAL_LIVES = 3;
const INITIAL_MONEY = 100;
const INITIAL_HEALTH = 100;

const MINERAL_VALUES: Record<MineralType, number> = {
  gold: 50,
  silver: 25,
  platinum: 100
};

const SHOP_ITEMS: Record<string, ShopItem[]> = {
  tool_shop: [
    { type: 'pickaxe', price: 50, description: 'Mine dirt and minerals' },
    { type: 'dynamite', price: 100, description: 'Break rocks' }
  ],
  mineral_shop: [] // Buying not allowed, only selling
};

export function createInitialState(): GameState {
  const blocks: Block[][] = Array(GRID_HEIGHT).fill(null).map((_, y) =>
    Array(GRID_WIDTH).fill(null).map((_, x): Block => ({
      type: generateBlockType(x, y),
      position: { x, y },
      discovered: y < SURFACE_HEIGHT // Surface blocks start discovered
    }))
  );

  addSurfaceFeatures(blocks);

  return {
    player: { x: 5, y: SURFACE_HEIGHT - 2 },
    blocks,
    score: 0,
    level: 1,
    lives: INITIAL_LIVES,
    health: INITIAL_HEALTH,
    gameOver: false,
    money: INITIAL_MONEY,
    inventory: [
      { type: 'pickaxe', quantity: 1, value: 50 }
    ],
    activeShop: null,
    isAboveGround: true,
    elevatorPosition: { x: GRID_WIDTH - 2, y: SURFACE_HEIGHT - 2 },
    showAllBlocks: false,
    messages: []
  };
}

function addSurfaceFeatures(blocks: Block[][]) {
  for (let y = 0; y < SURFACE_HEIGHT; y++) {
    for (let x = 0; x < GRID_WIDTH; x++) {
      if (y === SURFACE_HEIGHT - 1) {
        blocks[y][x].type = 'wall';
      } else {
        blocks[y][x].type = 'empty';
      }
    }
  }

  blocks[SURFACE_HEIGHT - 2][5].type = 'shop';
  blocks[SURFACE_HEIGHT - 2][GRID_WIDTH - 6].type = 'shop';

  const ladderX = GRID_WIDTH - 2;
  blocks[SURFACE_HEIGHT - 1][ladderX].type = 'empty';

  for (let y = SURFACE_HEIGHT; y < GRID_HEIGHT - 1; y++) {
    blocks[y][ladderX].type = 'empty';
  }
}

function generateBlockType(x: number, y: number): Block['type'] {
  if (y < SURFACE_HEIGHT) {
    return 'empty';
  }

  if (x === 0 || x === GRID_WIDTH - 1 || y === GRID_HEIGHT - 1) {
    return 'wall';
  }

  const rand = Math.random();
  if (rand < 0.5) return 'dirt';
  if (rand < 0.7) return 'rock';
  if (rand < 0.8) return 'gold';
  if (rand < 0.85) return 'silver';
  if (rand < 0.88) return 'platinum';
  return 'empty';
}

function hasDynamite(inventory: InventoryItem[]): boolean {
  return inventory.some(item => item.type === 'dynamite' && item.quantity > 0);
}

function hasPickaxe(inventory: InventoryItem[]): boolean {
  return inventory.some(item => item.type === 'pickaxe' && item.quantity > 0);
}

function useDynamite(inventory: InventoryItem[]): void {
  const dynamite = inventory.find(item => item.type === 'dynamite');
  if (dynamite) {
    dynamite.quantity--;
  }
}

function addMessage(state: GameState, text: string, type: 'info' | 'success' | 'warning'): void {
  state.messages.unshift({
    text,
    type,
    timestamp: Date.now()
  });

  // Keep only the last 5 messages
  if (state.messages.length > 5) {
    state.messages.pop();
  }
}

export function movePlayer(state: GameState, dx: number, dy: number): GameState {
  const newX = state.player.x + dx;
  const newY = state.player.y + dy;

  // First create new state
  const newState = { ...state };

  // Check boundaries before attempting to access or modify blocks
  if (newX < 0 || newX >= GRID_WIDTH || newY < 0 || newY >= GRID_HEIGHT) {
    return newState;
  }

  // Only discover the block in the movement direction if within bounds
  newState.blocks[newY][newX].discovered = true;

  // Prevent moving above sky level
  if (newY < SURFACE_HEIGHT - 2) {
    return newState;
  }

  if (newX === state.elevatorPosition.x && state.player.x === state.elevatorPosition.x) {
    if ((newY >= SURFACE_HEIGHT - 2 && newY <= SURFACE_HEIGHT - 1) || 
        (newY >= SURFACE_HEIGHT && newY < GRID_HEIGHT - 1)) {
      newState.player = { x: newX, y: newY };
      newState.elevatorPosition = { ...newState.elevatorPosition, y: newY };
      return newState;
    }
  }

  if (!isValidMove(state, newX, newY)) {
    const block = state.blocks[newY][newX];
    if (block.type === 'rock' && !hasDynamite(state.inventory)) {
      addMessage(newState, "You need dynamite to break this rock!", 'warning');
    } else if (block.type === 'dirt' && !hasPickaxe(state.inventory)) {
      addMessage(newState, "You need a pickaxe to dig this dirt!", 'warning');
    }
    return newState;
  }

  const block = state.blocks[newY][newX];

  switch (block.type) {
    case 'rock':
      if (!hasDynamite(state.inventory)) {
        return newState;
      }
      useDynamite(newState.inventory);
      playSound('explosion');
      addMessage(newState, "Used dynamite to break the rock!", 'success');
      break;
    case 'dirt':
      if (!hasPickaxe(state.inventory)) {
        return newState;
      }
      playSound('dig');
      addMessage(newState, "Dug through dirt with pickaxe", 'info');
      break;
    case 'gold':
    case 'silver':
    case 'platinum':
      const mineral = block.type;
      const value = MINERAL_VALUES[mineral];
      const inventoryItem = newState.inventory.find(i => i.type === mineral);
      if (inventoryItem) {
        inventoryItem.quantity++;
      } else {
        newState.inventory.push({
          type: mineral,
          quantity: 1,
          value
        });
      }
      newState.score += value;
      playSound('collect');
      addMessage(newState, `Found ${mineral}! Worth $${value}`, 'success');
      break;
    case 'shop':
      newState.activeShop = getShopAtPosition(newX, newY);
      break;
  }

  if (block.type !== 'shop') {
    newState.blocks[newY][newX] = { ...block, type: 'empty' };
  }

  newState.player = { x: newX, y: newY };
  return newState;
}

function getShopAtPosition(x: number, y: number): Shop {
  const type = x < GRID_WIDTH / 2 ? 'tool_shop' : 'mineral_shop';
  return {
    position: { x, y },
    type,
    items: SHOP_ITEMS[type]
  };
}

function isValidMove(state: GameState, x: number, y: number): boolean {
  if (x < 0 || x >= GRID_WIDTH || y < 0 || y >= GRID_HEIGHT) {
    return false;
  }

  const block = state.blocks[y][x];

  if (y < SURFACE_HEIGHT) {
    return block.type === 'empty' || block.type === 'shop';
  }

  if (x === state.elevatorPosition.x) {
    return y === state.elevatorPosition.y;
  }

  if (block.type === 'wall') {
    return false;
  }

  if (block.type === 'rock') {
    return hasDynamite(state.inventory);
  }

  if (block.type === 'dirt') {
    return hasPickaxe(state.inventory);
  }

  return true;
}

// Audio context setup
declare global {
  interface Window {
    webkitAudioContext: typeof AudioContext;
  }
}

const audioContext = new (window.AudioContext || window.webkitAudioContext)();

function playSound(type: 'dig' | 'collect' | 'explosion') {
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  switch (type) {
    case 'dig':
      oscillator.frequency.setValueAtTime(150, audioContext.currentTime);
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      break;
    case 'collect':
      oscillator.frequency.setValueAtTime(440, audioContext.currentTime);
      gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
      break;
    case 'explosion':
      oscillator.frequency.setValueAtTime(80, audioContext.currentTime);
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      break;
  }

  oscillator.start();
  gainNode.gain.exponentialRampToValueAtTime(0.00001, audioContext.currentTime + 0.1);
  oscillator.stop(audioContext.currentTime + 0.1);
}

export function buyItem(state: GameState, item: ShopItem): GameState {
  if (!state.activeShop || state.money < item.price) {
    return state;
  }

  const newState = { ...state };
  newState.money -= item.price;

  const inventoryItem = newState.inventory.find(i => i.type === item.type);
  if (inventoryItem) {
    inventoryItem.quantity += 1;
  } else {
    newState.inventory.push({
      type: item.type as ToolType,
      quantity: 1,
      value: item.price
    });
  }

  return newState;
}

export function sellItem(state: GameState, item: InventoryItem): GameState {
  if (!state.activeShop || state.activeShop.type !== 'mineral_shop') {
    return state;
  }

  const inventoryItem = state.inventory.find(i => i.type === item.type);
  if (!inventoryItem || inventoryItem.quantity <= 0 || item.type === 'pickaxe' || item.type === 'dynamite') {
    return state;
  }

  const newState = { ...state };
  inventoryItem.quantity -= 1;
  newState.money += item.value;

  return newState;
}

export function toggleShowAllBlocks(state: GameState): GameState {
  return {
    ...state,
    showAllBlocks: !state.showAllBlocks
  };
}