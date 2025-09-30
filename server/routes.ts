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

  app.put("/api/gyms/:id", async (req, res) => {
    try {
      const updateData = insertGymSchema.partial().parse(req.body);
      const gym = await storage.updateGym(req.params.id, updateData);
      if (!gym) {
        return res.status(404).json({ error: "Gym not found" });
      }
      res.json({ gym });
    } catch (error) {
      res.status(400).json({ error: "Invalid gym data" });
    }
  });

  app.delete("/api/gyms/:id", async (req, res) => {
    try {
      const success = await storage.deleteGym(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Gym not found" });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete gym" });
    }
  });

  // Online Classes routes
  app.get('/api/classes', async (req, res) => {
    try {
      const classes = await storage.getClasses();
      res.json({ classes });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch classes' });
    }
  });

  app.post('/api/classes', async (req, res) => {
    try {
      const onlineClass = await storage.createClass(req.body);
      res.json(onlineClass);
    } catch (error) {
      res.status(500).json({ error: 'Failed to create class' });
    }
  });

  app.delete('/api/classes/:id', async (req, res) => {
    try {
      await storage.deleteClass(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete class' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}