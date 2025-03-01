import { pgTable, text, serial, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const highScores = pgTable("high_scores", {
  id: serial("id").primaryKey(),
  playerName: text("player_name").notNull(),
  score: integer("score").notNull(),
  level: integer("level").notNull()
});

export const insertHighScoreSchema = createInsertSchema(highScores).pick({
  playerName: true,
  score: true,
  level: true
});

export type InsertHighScore = z.infer<typeof insertHighScoreSchema>;
export type HighScore = typeof highScores.$inferSelect;

// Game Types
export type Position = {
  x: number;
  y: number;
};

export type Block = {
  type: 'empty' | 'dirt' | 'rock' | 'gold' | 'silver' | 'platinum' | 'wall' | 'bank' | 'shop' | 'saloon' | 'hospital' | 'water' | 'unstable_dirt' | 'unstable_rock';
  position: Position;
  discovered: boolean;
  floodLevel?: number;
  stabilityLevel?: number;
};

export type MineralType = 'gold' | 'silver' | 'platinum';
export type ToolType = 'pickaxe' | 'dynamite';

export type InventoryItem = {
  type: MineralType | ToolType;
  quantity: number;
  value: number;
};

export type Shop = {
  position: Position;
  type: 'tool_shop' | 'mineral_shop';
  items: ShopItem[];
};

export type ShopItem = {
  type: ToolType;
  price: number;
  description: string;
};

export type GameMessage = {
  text: string;
  type: 'info' | 'success' | 'warning';
  timestamp: number;
};

export type GameState = {
  player: Position;
  blocks: Block[][];
  score: number;
  level: number;
  lives: number;
  health: number;
  gameOver: boolean;
  money: number;
  inventory: InventoryItem[];
  activeShop: Shop | null;
  isAboveGround: boolean;
  elevatorPosition: Position;
  showAllBlocks: boolean;
  messages: GameMessage[];
  lastUpdate: number;
};