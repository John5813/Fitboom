import { db } from "./db";
import { categories } from "@shared/schema";

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const defaultCategories = [
  { name: "Gym", icon: "💪" },
  { name: "Yoga", icon: "🧘" },
  { name: "Boks", icon: "🥊" },
  { name: "Suzish", icon: "🏊" },
  { name: "Fitnes", icon: "🏋️" },
  { name: "Pilates", icon: "🤸" },
  { name: "Crossfit", icon: "⚡" },
  { name: "Karate", icon: "🥋" },
  { name: "Velosport", icon: "🚴" },
  { name: "Ot sporti", icon: "🐎" },
];

async function seedCategories() {
  try {
    console.log("Kategoriyalar qo'shilmoqda...");
    
    for (const category of defaultCategories) {
      try {
        await db.insert(categories).values(category);
        console.log(`✓ ${category.name} qo'shildi`);
      } catch (error: any) {
        if (error.message?.includes('unique')) {
          console.log(`- ${category.name} allaqachon mavjud`);
        } else {
          console.error(`✗ ${category.name} qo'shishda xatolik:`, error.message);
        }
      }
    }
    
    console.log("Kategoriyalar muvaffaqiyatli qo'shildi!");
    process.exit(0);
  } catch (error) {
    console.error("Xatolik:", error);
    process.exit(1);
  }
}

seedCategories();
