import { type User, type InsertUser, type Gym, type InsertGym, type OnlineClass, type InsertOnlineClass } from "@shared/schema";
import { randomUUID } from "crypto";
import Database from "@replit/database";

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
  getClasses(): Promise<OnlineClass[]>;
  createClass(onlineClass: InsertOnlineClass): Promise<OnlineClass>;
  deleteClass(id: string): Promise<void>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private gyms: Map<string, Gym>;
  private db: Database;

  constructor() {
    this.users = new Map();
    this.gyms = new Map();
    this.db = new Database();
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
    const gyms = await this.getGyms();
    return gyms.find(gym => gym.id === id);
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

  async getClasses(): Promise<OnlineClass[]> {
    try {
      const classes = await this.db.get("classes");
      return classes || [];
    } catch (error) {
      return [];
    }
  }

  async createClass(insertClass: InsertOnlineClass): Promise<OnlineClass> {
    const id = randomUUID();
    const onlineClass: OnlineClass = { ...insertClass, id };

    const classes = await this.getClasses();
    classes.push(onlineClass);
    await this.db.set("classes", classes);

    return onlineClass;
  }

  async deleteClass(id: string): Promise<void> {
    const classes = await this.getClasses();
    const filteredClasses = classes.filter(cls => cls.id !== id);
    await this.db.set("classes", filteredClasses);
  }
}

export const storage = new MemStorage();