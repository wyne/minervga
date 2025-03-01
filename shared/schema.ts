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
  type: 'empty' | 'dirt' | 'rock' | 'diamond' | 'wall';
  position: Position;
};

export type GameState = {
  player: Position;
  blocks: Block[][];
  score: number;
  level: number;
  lives: number;
  gameOver: boolean;
};
