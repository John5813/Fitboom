import { type User, type InsertUser, type Gym, type InsertGym } from "@shared/schema";
import { randomUUID } from "crypto";

// modify the interface with any CRUD methods
// you might need

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getGyms(): Promise<Gym[]>;
  getGym(id: string): Promise<Gym | undefined>;
  createGym(gym: InsertGym): Promise<Gym>;
  updateGym(id: string, updateData: Partial<InsertGym>): Promise<Gym | undefined>;
  deleteGym(id: string): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private gyms: Map<string, Gym>;

  constructor() {
    this.users = new Map();
    this.gyms = new Map();
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id, credits: insertUser.credits ?? 0 };
    this.users.set(id, user);
    return user;
  }

  async getGyms(): Promise<Gym[]> {
    return Array.from(this.gyms.values());
  }

  async getGym(id: string): Promise<Gym | undefined> {
    return this.gyms.get(id);
  }

  async createGym(insertGym: InsertGym): Promise<Gym> {
    const id = randomUUID();
    const gym: Gym = { 
      id,
      name: insertGym.name,
      category: insertGym.category,
      credits: insertGym.credits,
      distance: insertGym.distance ?? "0 km",
      hours: insertGym.hours ?? "00:00 - 24:00",
      imageUrl: insertGym.imageUrl,
      address: insertGym.address,
      description: insertGym.description ?? null,
      rating: insertGym.rating ?? 5,
      facilities: insertGym.facilities ?? null,
      createdAt: new Date(),
    };
    this.gyms.set(id, gym);
    return gym;
  }

  async updateGym(id: string, updateData: Partial<InsertGym>): Promise<Gym | undefined> {
    const gym = this.gyms.get(id);
    if (!gym) return undefined;
    
    const updatedGym: Gym = { ...gym, ...updateData };
    this.gyms.set(id, updatedGym);
    return updatedGym;
  }

  async deleteGym(id: string): Promise<boolean> {
    return this.gyms.delete(id);
  }
}

export const storage = new MemStorage();
