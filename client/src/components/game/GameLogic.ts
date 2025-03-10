import { GameState, Position, Block, InventoryItem, Shop, ShopItem, MineralType, ToolType } from "@shared/schema";

export const GRID_SIZE = 32;
export const CELL_SIZE = 20;
export const GRID_WIDTH = 40;
export const GRID_HEIGHT = 30;
export const SURFACE_HEIGHT = 5;

const INITIAL_LIVES = 3;
const INITIAL_MONEY = 1500;  // Changed from 100 to 1500
const INITIAL_HEALTH = 100;
const MINING_COST = 20;      // Added mining cost
const ELEVATOR_DESCENT_COST = 30;  // Added elevator cost

const WATER_SPREAD_RATE = 10; // How fast water spreads per tick
const STABILITY_THRESHOLD = 30; // Below this stability percentage, blocks may collapse
const CAVE_IN_DAMAGE = 25; // Damage taken when caught in a cave-in
const CAVE_IN_SPREAD_CHANCE = 0.4; // Chance for cave-in to spread to adjacent blocks

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
  mineral_shop: []
};

export function createInitialState(): GameState {
  const blocks: Block[][] = Array(GRID_HEIGHT).fill(null).map((_, y) =>
    Array(GRID_WIDTH).fill(null).map((_, x): Block => ({
      type: generateBlockType(x, y),
      position: { x, y },
      discovered: y < SURFACE_HEIGHT,
      floodLevel: 0,
      stabilityLevel: generateStabilityLevel(x, y),
      isBuildingDoor: false,
      buildingWidth: 0,
      buildingHeight: 0,
    }))
  );

  addSurfaceFeatures(blocks);
  addWaterSources(blocks);

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
    messages: [],
    lastUpdate: Date.now(),
    lastMinedMineral: null
  };
}

// Modify block generation to increase unstable block frequency
function generateBlockType(x: number, y: number): Block['type'] {
  // Always keep elevator shaft clear
  if (x === GRID_WIDTH - 2) { // Elevator shaft column
    return y < SURFACE_HEIGHT ? 'empty' : 'empty';
  }

  if (y < SURFACE_HEIGHT) {
    return 'empty';
  }

  if (x === 0 || x === GRID_WIDTH - 1 || y === GRID_HEIGHT - 1) {
    return 'wall';
  }

  // Increase chances for hazards below certain depth
  const depthFactor = (y - SURFACE_HEIGHT) / (GRID_HEIGHT - SURFACE_HEIGHT);
  const hazardChance = Math.min(0.4, 0.1 + depthFactor * 0.3); // More hazards deeper down

  const rand = Math.random();

  // Water pockets (more common in deeper levels)
  if (rand < 0.05 + depthFactor * 0.1) return 'water';

  // Unstable blocks (matching water frequency)
  if (rand < 0.10 + depthFactor * 0.2) {
    return Math.random() < 0.5 ? 'unstable_dirt' : 'unstable_rock';
  }

  // Basic blocks
  if (rand < 0.6) return 'dirt';
  if (rand < 0.8) return 'rock';

  // Minerals (rarer)
  if (rand < 0.85) return 'gold';
  if (rand < 0.90) return 'silver';
  if (rand < 0.93) return 'platinum';

  return 'empty';
}

function generateStabilityLevel(x: number, y: number): number {
  // Elevator shaft is always stable
  if (x === GRID_WIDTH - 2) return 100;

  if (y < SURFACE_HEIGHT) return 100;

  // More unstable blocks deeper underground
  const depthFactor = (y - SURFACE_HEIGHT) / (GRID_HEIGHT - SURFACE_HEIGHT);
  const baseStability = 100 - (depthFactor * 40); // Decreases with depth
  const randomVariation = Math.random() * 20 - 10; // ±10 variation

  return Math.min(100, Math.max(0, baseStability + randomVariation));
}

function addWaterSources(blocks: Block[][]): void {
  // Add some water pockets underground
  for (let y = SURFACE_HEIGHT + 5; y < GRID_HEIGHT - 5; y++) {
    for (let x = 1; x < GRID_WIDTH - 1; x++) {
      // Skip elevator shaft column
      if (x === GRID_WIDTH - 2) continue;

      // More water sources in deeper levels, but much rarer
      const depthFactor = (y - SURFACE_HEIGHT) / (GRID_HEIGHT - SURFACE_HEIGHT);
      const waterChance = 0.01 + depthFactor * 0.01; // Reduced chance significantly

      if (Math.random() < waterChance && blocks[y][x].type === 'empty') {
        blocks[y][x].type = 'water';
        blocks[y][x].floodLevel = 100;

        // Sometimes create larger water pockets
        if (Math.random() < 0.2) { // Reduced chance of large pockets
          const adjacentPositions = [
            [x+1, y], [x-1, y],
            [x, y+1], [x, y-1]
          ];

          for (const [adjX, adjY] of adjacentPositions) {
            // Skip elevator shaft column for adjacent blocks too
            if (adjX === GRID_WIDTH - 2) continue;

            if (adjX > 0 && adjX < GRID_WIDTH - 1 && 
                adjY > SURFACE_HEIGHT && adjY < GRID_HEIGHT - 1 &&
                blocks[adjY][adjX].type === 'empty' && 
                Math.random() < 0.3) { // Added randomness to adjacent blocks
              blocks[adjY][adjX].type = 'water';
              blocks[adjY][adjX].floodLevel = 100;
            }
          }
        }
      }
    }
  }
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

  // Place surface buildings at specific positions
  const surfaceY = SURFACE_HEIGHT - 2;

  // Bank (leftmost building)
  blocks[surfaceY][3].type = 'bank';
  blocks[surfaceY][3].isBuildingDoor = true;
  blocks[surfaceY][3].buildingWidth = 3;
  blocks[surfaceY][3].buildingHeight = 2;

  // Shop (tool shop)
  blocks[surfaceY][8].type = 'shop';
  blocks[surfaceY][8].isBuildingDoor = true;
  blocks[surfaceY][8].buildingWidth = 3;
  blocks[surfaceY][8].buildingHeight = 2;

  // Saloon
  blocks[surfaceY][13].type = 'saloon';
  blocks[surfaceY][13].isBuildingDoor = true;
  blocks[surfaceY][13].buildingWidth = 4;
  blocks[surfaceY][13].buildingHeight = 2;

  // Hospital
  blocks[surfaceY][18].type = 'hospital';
  blocks[surfaceY][18].isBuildingDoor = true;
  blocks[surfaceY][18].buildingWidth = 3;
  blocks[surfaceY][18].buildingHeight = 2;

  // Create entrance for elevator
  const ladderX = GRID_WIDTH - 2;
  blocks[SURFACE_HEIGHT - 1][ladderX].type = 'empty';

  // Create elevator shaft
  for (let y = SURFACE_HEIGHT; y < GRID_HEIGHT - 1; y++) {
    blocks[y][ladderX].type = 'empty';
  }
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

  if (newY < SURFACE_HEIGHT - 2) {
    return newState;
  }

  // Check for water damage
  const targetBlock = newState.blocks[newY][newX];
  if (targetBlock.type === 'water' || (targetBlock.floodLevel && targetBlock.floodLevel > 50)) {
    newState.health -= 10;
    playSound('damage');
    addMessage(newState, "You're taking damage from the water!", 'warning');
    if (newState.health <= 0) {
      newState.gameOver = true;
      addMessage(newState, "Game Over - You drowned!", 'warning');
      return newState;
    }
  }

  // Handle elevator movement and costs
  if (newX === state.elevatorPosition.x && state.player.x === state.elevatorPosition.x) {
    if ((newY >= SURFACE_HEIGHT - 2 && newY <= SURFACE_HEIGHT - 1) ||
        (newY >= SURFACE_HEIGHT && newY < GRID_HEIGHT - 1)) {
      // Check if moving from surface downward
      if (state.player.y < SURFACE_HEIGHT && newY >= SURFACE_HEIGHT) {
        if (state.money < ELEVATOR_DESCENT_COST) {
          addMessage(newState, `Need $${ELEVATOR_DESCENT_COST} to use elevator!`, 'warning');
          return newState;
        }
        newState.money -= ELEVATOR_DESCENT_COST;
        addMessage(newState, `Paid $${ELEVATOR_DESCENT_COST} for elevator descent`, 'info');
      }
      newState.player = { x: newX, y: newY };
      newState.elevatorPosition = { ...newState.elevatorPosition, y: newY };
      return newState;
    }
  }

  if (!isValidMove(state, newX, newY)) {
    const block = state.blocks[newY][newX];
    if (block.type === 'rock' && !hasDynamite(state.inventory)) {
      playSound('blocked');
      addMessage(newState, "You need dynamite to break this rock!", 'warning');
    } else if (block.type === 'dirt' && !hasPickaxe(state.inventory)) {
      addMessage(newState, "You need a pickaxe to dig this dirt!", 'warning');
    } else if (block.type === 'unstable_dirt' || block.type === 'unstable_rock') {
      playSound('blocked');
      addMessage(newState, "This area is too unstable to mine!", 'warning');
    }
    return newState;
  }

  const block = state.blocks[newY][newX];

  // Check if this is a minable block and apply cost
  if (['dirt', 'rock', 'gold', 'silver', 'platinum'].includes(block.type) && 
      block.type !== 'unstable_dirt' && block.type !== 'unstable_rock') {
    if (state.money < MINING_COST) {
      addMessage(newState, `Need $${MINING_COST} to mine this block!`, 'warning');
      return newState;
    }
    newState.money -= MINING_COST;
    addMessage(newState, `Spent $${MINING_COST} on mining`, 'info');
  }

  newState.lastMinedMineral = null; // Clear previous mined mineral

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
      playSound('collect', mineral);
      addMessage(newState, `Found ${mineral}! Worth $${value}`, 'success');
      newState.lastMinedMineral = {x: newX, y: newY, type: mineral}; //Set lastMinedMineral
      break;
    case 'shop':
    case 'bank':
    case 'saloon':
    case 'hospital':
      if (block.isBuildingDoor) {
        // Handle building interaction here
        newState.activeShop = getShopAtPosition(newX, newY);
      }
      break;
  }

  if (!['shop', 'bank', 'saloon', 'hospital'].includes(block.type)) {
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
    // Only allow movement into empty spaces or building doors
    return block.type === 'empty' || (block.isBuildingDoor && ['bank', 'shop', 'saloon', 'hospital'].includes(block.type));
  }

  if (x === state.elevatorPosition.x) {
    return y === state.elevatorPosition.y;
  }

  if (block.type === 'wall') {
    return false;
  }

  if (block.type === 'rock') {
    if (!hasDynamite(state.inventory)) {
      playHazardBlockedSound();
      return false;
    }
    return true;
  }

  if (block.type === 'dirt') {
    return hasPickaxe(state.inventory);
  }

  // Add hazard sounds for water and unstable blocks
  if (block.type === 'water' || block.type === 'unstable_dirt' || block.type === 'unstable_rock') {
    playHazardBlockedSound();
    return false;
  }

  return true;
}


// Audio Context Setup
const getAudioContext = () => {
  if (typeof window === 'undefined') return null;
  return new (window.AudioContext || (window as any).webkitAudioContext)();
};

let audioContext: AudioContext | null = null;

export function initAudio() {
  if (!audioContext) {
    audioContext = getAudioContext();
    if (audioContext?.state === 'suspended') {
      audioContext.resume();
    }
  }
}

export function playSound(type: 'dig' | 'collect' | 'explosion' | 'damage' | 'blocked', mineralType?: MineralType): void {
  if (!audioContext) return; // Don't try to play if audio context isn't ready

  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  switch (type) {
    case 'dig':
      oscillator.frequency.setValueAtTime(150, audioContext.currentTime);
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      oscillator.start();
      gainNode.gain.exponentialRampToValueAtTime(0.00001, audioContext.currentTime + 0.1);
      oscillator.stop(audioContext.currentTime + 0.1);
      break;

    case 'collect':
      if (mineralType) {
        switch (mineralType) {
          case 'silver':
            oscillator.frequency.setValueAtTime(300, audioContext.currentTime);
            gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
            oscillator.start();
            gainNode.gain.exponentialRampToValueAtTime(0.00001, audioContext.currentTime + 0.2);
            oscillator.stop(audioContext.currentTime + 0.2);
            break;

          case 'gold':
            const goldOsc1 = audioContext.createOscillator();
            const goldOsc2 = audioContext.createOscillator();
            const goldGain1 = audioContext.createGain();
            const goldGain2 = audioContext.createGain();

            goldOsc1.connect(goldGain1).connect(audioContext.destination);
            goldOsc2.connect(goldGain2).connect(audioContext.destination);

            goldOsc1.frequency.setValueAtTime(400, audioContext.currentTime);
            goldGain1.gain.setValueAtTime(0.2, audioContext.currentTime);
            goldOsc1.start(audioContext.currentTime);
            goldGain1.gain.exponentialRampToValueAtTime(0.00001, audioContext.currentTime + 0.15);
            goldOsc1.stop(audioContext.currentTime + 0.15);

            goldOsc2.frequency.setValueAtTime(600, audioContext.currentTime + 0.1);
            goldGain2.gain.setValueAtTime(0.2, audioContext.currentTime + 0.1);
            goldOsc2.start(audioContext.currentTime + 0.1);
            goldGain2.gain.exponentialRampToValueAtTime(0.00001, audioContext.currentTime + 0.25);
            goldOsc2.stop(audioContext.currentTime + 0.25);
            break;

          case 'platinum':
            const platOsc1 = audioContext.createOscillator();
            const platOsc2 = audioContext.createOscillator();
            const platOsc3 = audioContext.createOscillator();
            const platOsc4 = audioContext.createOscillator();
            const platGain1 = audioContext.createGain();
            const platGain2 = audioContext.createGain();
            const platGain3 = audioContext.createGain();
            const platGain4 = audioContext.createGain();

            platOsc1.connect(platGain1).connect(audioContext.destination);
            platOsc2.connect(platGain2).connect(audioContext.destination);
            platOsc3.connect(platGain3).connect(audioContext.destination);
            platOsc4.connect(platGain4).connect(audioContext.destination);

            // Increased frequencies for platinum (1200/1500/1800/2100 Hz)
            platOsc1.frequency.setValueAtTime(1200, audioContext.currentTime);
            platGain1.gain.setValueAtTime(0.2, audioContext.currentTime);
            platOsc1.start(audioContext.currentTime);
            platGain1.gain.exponentialRampToValueAtTime(0.00001, audioContext.currentTime + 0.15);
            platOsc1.stop(audioContext.currentTime + 0.15);

            platOsc2.frequency.setValueAtTime(1500, audioContext.currentTime + 0.1);
            platGain2.gain.setValueAtTime(0.2, audioContext.currentTime + 0.1);
            platOsc2.start(audioContext.currentTime + 0.1);
            platGain2.gain.exponentialRampToValueAtTime(0.00001, audioContext.currentTime + 0.25);
            platOsc2.stop(audioContext.currentTime + 0.25);

            platOsc3.frequency.setValueAtTime(1800, audioContext.currentTime + 0.2);
            platGain3.gain.setValueAtTime(0.2, audioContext.currentTime + 0.2);
            platOsc3.start(audioContext.currentTime + 0.2);
            platGain3.gain.exponentialRampToValueAtTime(0.00001, audioContext.currentTime + 0.35);
            platOsc3.stop(audioContext.currentTime + 0.35);

            platOsc4.frequency.setValueAtTime(2100, audioContext.currentTime + 0.3);
            platGain4.gain.setValueAtTime(0.2, audioContext.currentTime + 0.3);
            platOsc4.start(audioContext.currentTime + 0.3);
            platGain4.gain.exponentialRampToValueAtTime(0.00001, audioContext.currentTime + 0.45);
            platOsc4.stop(audioContext.currentTime + 0.45);
            break;
        }
        return;
      }
      oscillator.frequency.setValueAtTime(440, audioContext.currentTime);
      gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
      break;

    case 'explosion':
      oscillator.frequency.setValueAtTime(80, audioContext.currentTime);
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      oscillator.start();
      gainNode.gain.exponentialRampToValueAtTime(0.00001, audioContext.currentTime + 0.1);
      oscillator.stop(audioContext.currentTime + 0.1);
      break;

    case 'damage':
      oscillator.frequency.setValueAtTime(200, audioContext.currentTime);
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      oscillator.frequency.linearRampToValueAtTime(100, audioContext.currentTime + 0.1);
      oscillator.start();
      gainNode.gain.exponentialRampToValueAtTime(0.00001, audioContext.currentTime + 0.1);
      oscillator.stop(audioContext.currentTime + 0.1);
      break;

    case 'blocked':
      // Three low tones in sequence
      const blockOsc1 = audioContext.createOscillator();
      const blockOsc2 = audioContext.createOscillator();
      const blockOsc3 = audioContext.createOscillator();
      const blockGain1 = audioContext.createGain();
      const blockGain2 = audioContext.createGain();
      const blockGain3 = audioContext.createGain();

      blockOsc1.connect(blockGain1).connect(audioContext.destination);
      blockOsc2.connect(blockGain2).connect(audioContext.destination);
      blockOsc3.connect(blockGain3).connect(audioContext.destination);

      // First tone
      blockOsc1.frequency.setValueAtTime(100, audioContext.currentTime);
      blockGain1.gain.setValueAtTime(0.2, audioContext.currentTime);
      blockOsc1.start(audioContext.currentTime);
      blockGain1.gain.exponentialRampToValueAtTime(0.00001, audioContext.currentTime + 0.1);
      blockOsc1.stop(audioContext.currentTime + 0.1);

      // Second tone
      blockOsc2.frequency.setValueAtTime(100, audioContext.currentTime + 0.1);
      blockGain2.gain.setValueAtTime(0.2, audioContext.currentTime + 0.1);
      blockOsc2.start(audioContext.currentTime + 0.1);
      blockGain2.gain.exponentialRampToValueAtTime(0.00001, audioContext.currentTime + 0.2);
      blockOsc2.stop(audioContext.currentTime + 0.2);

      // Third tone
      blockOsc3.frequency.setValueAtTime(100, audioContext.currentTime + 0.2);
      blockGain3.gain.setValueAtTime(0.2, audioContext.currentTime + 0.2);
      blockOsc3.start(audioContext.currentTime + 0.2);
      blockGain3.gain.exponentialRampToValueAtTime(0.00001, audioContext.currentTime + 0.3);
      blockOsc3.stop(audioContext.currentTime + 0.3);
      break;
  }
}

// Helper function to generate new block after collapse
function generateCollapsedBlock(): Block['type'] {
  const rand = Math.random();

  // 10% chance for minerals
  if (rand < 0.04) return 'gold';
  if (rand < 0.07) return 'silver';
  if (rand < 0.10) return 'platinum';

  // 15% chance for hazards
  if (rand < 0.17) return 'unstable_dirt';
  if (rand < 0.25) return 'unstable_rock';

  // Remaining chances for basic blocks
  return rand < 0.6 ? 'dirt' : 'rock';
}

function checkCaveIns(state: GameState): void {
  const { blocks } = state;
  let caveInOccurred = false;
  const fallingBlocks: Position[] = [];

  // Check for cave-ins from top to bottom
  for (let y = SURFACE_HEIGHT; y < GRID_HEIGHT - 1; y++) {
    for (let x = 1; x < GRID_WIDTH - 1; x++) {
      const block = blocks[y][x];

      if ((block.type === 'unstable_dirt' || block.type === 'unstable_rock') &&
          block.stabilityLevel && block.stabilityLevel < STABILITY_THRESHOLD) {
        // Check if block above is unsupported
        if (blocks[y - 1][x].type !== 'empty') {
          // Mark block for cave-in
          fallingBlocks.push({ x, y });
          caveInOccurred = true;
        }
      }
    }
  }

  if (caveInOccurred) {
    playSound('damage'); // Play collapse sound
    addMessage(state, "The mine is collapsing!", 'warning');

    // Process all falling blocks
    fallingBlocks.forEach(pos => {
      const { x, y } = pos;

      // Convert unstable block to empty
      blocks[y][x].type = 'empty';

      // Fill 2 block radius with new blocks including empty spaces
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          const newX = x + dx;
          const newY = y + dy;

          // Skip out of bounds and elevator shaft
          if (newX <= 0 || newX >= GRID_WIDTH - 1 || 
              newY <= SURFACE_HEIGHT || newY >= GRID_HEIGHT - 1 ||
              newX === GRID_WIDTH - 2) { 
            continue;
          }

          // Only fill empty spaces
          if (blocks[newY][newX].type === 'empty') {
            blocks[newY][newX].type = generateCollapsedBlock();
            blocks[newY][newX].discovered = true;
            blocks[newY][newX].stabilityLevel = 100; // Reset stability
          }
        }
      }

      // Check for player proximity and apply damage
      const playerDistance = Math.abs(state.player.x - x) + Math.abs(state.player.y - y);
      if (playerDistance <= 2) {
        state.health -= CAVE_IN_DAMAGE;
        addMessage(state, "You were caught in the cave-in!", 'warning');

        if (state.health <= 0) {
          state.gameOver = true;
          addMessage(state, "Game Over - Crushed by falling rocks!", 'warning');
        }
      }

      // Spread instability to adjacent blocks
      [[-1, 0], [1, 0], [0, -1], [0, 1]].forEach(([dx, dy]) => {
        const newX = x + dx;
        const newY = y + dy;

        if (newX <= 0 || newX >= GRID_WIDTH - 1 || 
            newY <= SURFACE_HEIGHT || newY >= GRID_HEIGHT - 1 ||
            newX === GRID_WIDTH - 2) {
          return;
        }

        const neighbor = blocks[newY][newX];
        if (neighbor.type === 'dirt' || neighbor.type === 'rock') {
          if (Math.random() < CAVE_IN_SPREAD_CHANCE) {
            neighbor.type = neighbor.type === 'dirt' ? 'unstable_dirt' : 'unstable_rock';
            neighbor.stabilityLevel = Math.max(0, (neighbor.stabilityLevel || 100) - 20);
          }
        }
      });
    });
  }
}

export function playHazardBlockedSound(): void {
  if (!audioContext) return;

  // Create three oscillators for the repeating falling tone
  for (let i = 0; i < 3; i++) {
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    // Start frequency higher and fall
    const startTime = audioContext.currentTime + (i * 0.2); // Space out each tone
    oscillator.frequency.setValueAtTime(400, startTime);
    oscillator.frequency.exponentialRampToValueAtTime(100, startTime + 0.15);

    gainNode.gain.setValueAtTime(0.2, startTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + 0.15);

    oscillator.start(startTime);
    oscillator.stop(startTime + 0.15);
  }
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

export function updateHazards(state: GameState): GameState {
  const newState = { ...state };
  const now = Date.now();
  const deltaTime = now - state.lastUpdate;

  if (deltaTime < 100) return state; // Only update every 100ms

  newState.lastUpdate = now;

  // Update water physics
  updateWater(newState);

  // Check for cave-ins
  checkCaveIns(newState);

  return newState;
}

function updateWater(state: GameState): void {
  const { blocks } = state;

  // Process water spreading from bottom to top, right to left
  for (let y = GRID_HEIGHT - 2; y >= SURFACE_HEIGHT; y--) {
    for (let x = GRID_WIDTH - 2; x >= 1; x--) {
      const block = blocks[y][x];

      if (block.type === 'water' || (block.type === 'empty' && block.floodLevel && block.floodLevel > 0)) {
        // Spread water down
        if (blocks[y + 1][x].type === 'empty') {
          const transferAmount = Math.min(block.floodLevel || 0, WATER_SPREAD_RATE);
          blocks[y + 1][x].floodLevel = (blocks[y + 1][x].floodLevel || 0) + transferAmount;
          block.floodLevel! -= transferAmount;
          blocks[y + 1][x].type = 'water';
        }

        // Spread water sideways if high enough
        if (block.floodLevel && block.floodLevel > 50) {
          [-1, 1].forEach(dx => {
            const neighborBlock = blocks[y][x + dx];
            if (neighborBlock.type === 'empty') {
              const transferAmount = Math.min((block.floodLevel || 0) - 50, WATER_SPREAD_RATE) / 2;
              neighborBlock.floodLevel = (neighborBlock.floodLevel || 0) + transferAmount;
              block.floodLevel! -= transferAmount;
              neighborBlock.type = 'water';
            }
          });
        }
      }
    }
  }
}

}