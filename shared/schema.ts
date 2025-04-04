import { pgTable, text, serial, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull().unique(),
});

export const searchResultSchema = z.object({
  blockNo: z.string(),
  partNo: z.string(),
  thickness: z.string(),
  nos: z.string(),
  grinding: z.string(),
  netting: z.string(),
  epoxy: z.string(),
  polished: z.string(),
  leather: z.string(),
  polished2: z.string(),
  lapotra: z.string(),
  honed: z.string(),
  shot: z.string(),
  polR: z.string(),
  bal: z.string(),
  bSP: z.string(),
  edge: z.string(),
  meas: z.string(),
  lCm: z.string(),
  hCm: z.string(),
  color1: z.string(),
  color2: z.string()
});

export type SearchResult = z.infer<typeof searchResultSchema>;
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  email: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export interface SearchResult {
  blockNo: string;
  partNo: string;
  thickness: string;
  nos: string;
  grinding: string;
  netting: string;
  epoxy: string;
  polished: string;
  leather: string;
  lapotra: string;
  honed: string;
  shot: string;
  polR: string;
  bal: string;
  bSP: string;
  edge: string;
  meas: string;
  lCm: string;
  hCm: string;
  color1: string;
  color2: string;
  status: string;
  date: string;
}
