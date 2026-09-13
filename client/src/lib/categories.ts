import { CATEGORIES, type Category } from "@shared/categories";

/**
 * Kategoriya ID sini o'qiladigan nomga o'giradi.
 *
 * Ilgari UI da `gym.categories.join(', ')` ishlatilardi va foydalanuvchi
 * "gym, pool" kabi ichki ID larni ko'rardi.
 */
export function categoryLabel(id: string): string {
  return CATEGORIES.find((c) => c.id === id)?.name ?? id;
}

/** ["gym","yoga"] -> "Gym, Yoga" */
export function categoryLabels(ids: string[] | null | undefined, separator = ", "): string {
  if (!ids || ids.length === 0) return "";
  return ids.map(categoryLabel).join(separator);
}

export function findCategory(id: string): Category | undefined {
  return CATEGORIES.find((c) => c.id === id);
}
