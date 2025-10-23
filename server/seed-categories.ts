
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

export async function seedCategories() {
  try {
    let addedCount = 0;
    
    for (const category of defaultCategories) {
      try {
        await db.insert(categories).values(category);
        addedCount++;
      } catch (error: any) {
        // Agar kategoriya allaqachon mavjud bo'lsa, xatolikni e'tiborsiz qoldiramiz
        if (!error.message?.includes('unique')) {
          console.error(`Kategoriya qo'shishda xatolik (${category.name}):`, error.message);
        }
      }
    }
    
    if (addedCount > 0) {
      console.log(`✓ ${addedCount} ta yangi kategoriya qo'shildi`);
    }
  } catch (error) {
    console.error("Kategoriyalarni seed qilishda xatolik:", error);
  }
}

// Agar fayl to'g'ridan-to'g'ri ishga tushirilsa
if (require.main === module) {
  seedCategories().then(() => {
    console.log("Kategoriyalar seed qilindi!");
    process.exit(0);
  }).catch((error) => {
    console.error("Xatolik:", error);
    process.exit(1);
  });
}
