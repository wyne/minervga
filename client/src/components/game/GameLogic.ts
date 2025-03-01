import { GameState, Position, Block, InventoryItem, Shop, ShopItem } from "@shared/schema";

export const GRID_SIZE = 32;
export const CELL_SIZE = 20;
export const GRID_WIDTH = 40;
export const GRID_HEIGHT = 25;
export const SURFACE_HEIGHT = 5; // Height of above-ground area

const INITIAL_LIVES = 3;
const INITIAL_MONEY = 100;

const SHOP_ITEMS: Record<string, ShopItem[]> = {
  tool_shop: [
    { type: 'pickaxe', price: 50, description: 'Mine faster' },
    { type: 'dynamite', price: 100, description: 'Clear multiple blocks' }
  ],
  mineral_shop: [
    { type: 'diamond', price: 100, description: 'Sell diamonds' },
    { type: 'rock', price: 10, description: 'Sell rocks' }
  ]
};

export function createInitialState(): GameState {
  const blocks: Block[][] = Array(GRID_HEIGHT).fill(null).map((_, y) => 
    Array(GRID_WIDTH).fill(null).map((_, x): Block => ({
      type: generateBlockType(x, y),
      position: { x, y }
    }))
  );

  // Add shops and surface features
  addSurfaceFeatures(blocks);

  return {
    player: { x: 5, y: SURFACE_HEIGHT - 2 }, // Start above ground near the tool shop
    blocks,
    score: 0,
    level: 1,
    lives: INITIAL_LIVES,
    gameOver: false,
    money: INITIAL_MONEY,
    inventory: [
      { type: 'pickaxe', quantity: 1, value: 50 }
    ],
    activeShop: null,
    isAboveGround: true,
    elevatorPosition: { x: GRID_WIDTH - 2, y: SURFACE_HEIGHT - 2 } // Start elevator at surface
  };
}

function addSurfaceFeatures(blocks: Block[][]) {
  // Create surface layer
  for (let y = 0; y < SURFACE_HEIGHT; y++) {
    for (let x = 0; x < GRID_WIDTH; x++) {
      if (y === SURFACE_HEIGHT - 1) {
        blocks[y][x].type = 'wall'; // Ground level
      } else {
        blocks[y][x].type = 'empty'; // Sky
      }
    }
  }

  // Add shops
  blocks[SURFACE_HEIGHT - 2][5].type = 'shop'; // Tool shop
  blocks[SURFACE_HEIGHT - 2][GRID_WIDTH - 6].type = 'shop'; // Mineral shop

  // Add elevator shaft
  const ladderX = GRID_WIDTH - 2; // Place elevator near right edge
  blocks[SURFACE_HEIGHT - 1][ladderX].type = 'ladder';
  blocks[SURFACE_HEIGHT - 1][ladderX - 1].type = 'empty'; // Remove wall at elevator entrance

  // Create empty elevator shaft going down
  for (let y = SURFACE_HEIGHT; y < GRID_HEIGHT - 1; y++) {
    blocks[y][ladderX].type = 'empty';
    blocks[y][ladderX - 1].type = 'empty'; // Clear space next to shaft
  }
}

function generateBlockType(x: number, y: number): Block['type'] {
  if (y < SURFACE_HEIGHT) {
    return 'empty'; // Will be modified by addSurfaceFeatures
  }

  if (x === 0 || x === GRID_WIDTH - 1 || y === GRID_HEIGHT - 1) {
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

  // Prevent moving above sky level
  if (newY < SURFACE_HEIGHT - 2) {
    return state;
  }

  if (!isValidMove(state, newX, newY)) {
    return state;
  }

  const newState = { ...state };
  const block = state.blocks[newY][newX];

  // Handle different block interactions
  switch (block.type) {
    case 'diamond':
      newState.inventory.push({ type: 'diamond', quantity: 1, value: 100 });
      newState.score += 10;
      playSound('collect');
      break;
    case 'dirt':
      if (hasPickaxe(state.inventory)) {
        playSound('dig');
        newState.blocks[newY][newX] = { ...block, type: 'empty' };
      } else {
        return state; // Can't dig without pickaxe
      }
      break;
    case 'shop':
      newState.activeShop = getShopAtPosition(newX, newY);
      break;
    case 'ladder':
      // Only allow elevator use when at the carriage position
      if (newX === state.elevatorPosition.x && newY === state.elevatorPosition.y) {
        newState.isAboveGround = !state.isAboveGround;
        // Move player and elevator together
        const newElevatorY = state.isAboveGround ? SURFACE_HEIGHT : SURFACE_HEIGHT - 2;
        newState.elevatorPosition = { ...state.elevatorPosition, y: newElevatorY };
        newState.player = { x: newX, y: newElevatorY };
        return newState;
      }
      break;
  }

  if (block.type !== 'shop' && block.type !== 'ladder') {
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

function hasPickaxe(inventory: InventoryItem[]): boolean {
  return inventory.some(item => item.type === 'pickaxe' && item.quantity > 0);
}

function isValidMove(state: GameState, x: number, y: number): boolean {
  // Check boundaries
  if (x < 0 || x >= GRID_WIDTH || y < 0 || y >= GRID_HEIGHT) {
    return false;
  }

  const block = state.blocks[y][x];

  // Special handling for above ground movement
  if (y < SURFACE_HEIGHT) {
    // Allow movement in shop area and to elevator
    return block.type === 'empty' || block.type === 'shop' || block.type === 'ladder';
  }

  // Below ground rules
  // Allow movement to elevator shaft only at carriage position
  if (x === GRID_WIDTH - 2) {
    return y === state.elevatorPosition.y;
  }

  // Can't move through walls
  if (block.type === 'wall') {
    return false;
  }

  // Can move through dirt only with pickaxe
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
      type: item.type,
      quantity: 1,
      value: item.price
    });
  }

  return newState;
}

export function sellItem(state: GameState, item: InventoryItem): GameState {
  if (!state.activeShop) {
    return state;
  }

  const inventoryItem = state.inventory.find(i => i.type === item.type);
  if (!inventoryItem || inventoryItem.quantity <= 0) {
    return state;
  }

  const newState = { ...state };
  inventoryItem.quantity -= 1;
  newState.money += item.value;

  return newState;
}