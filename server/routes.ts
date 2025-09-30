import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertGymSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Gym routes
  app.get("/api/gyms", async (req, res) => {
    try {
      const gyms = await storage.getGyms();
      res.json({ gyms });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch gyms" });
    }
  });

  app.post("/api/gyms", async (req, res) => {
    try {
      const gymData = insertGymSchema.parse(req.body);
      const gym = await storage.createGym(gymData);
      res.json({ gym });
    } catch (error) {
      res.status(400).json({ error: "Invalid gym data" });
    }
  });

  app.get("/api/gyms/:id", async (req, res) => {
    try {
      const gym = await storage.getGym(req.params.id);
      if (!gym) {
        return res.status(404).json({ error: "Gym not found" });
      }
      res.json({ gym });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch gym" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
