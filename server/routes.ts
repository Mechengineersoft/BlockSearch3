import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { searchSheetData } from "./google-sheets";

export async function registerRoutes(app: Express): Promise<Server> {
  setupAuth(app);

  app.get("/api/search", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    const { blockNo, partNo, thickness } = req.query;

    if (!blockNo || typeof blockNo !== "string") {
      return res.status(400).send("Block number is required");
    }

    try {
      const results = await searchSheetData(
        blockNo,
        partNo as string | undefined,
        thickness as string | undefined
      );
      res.json(results);
    } catch (error) {
      console.error('Search error:', error);
      res.status(500).send("Failed to fetch search results");
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}