export interface Category {
  id: string;
  name: string;
  icon: string;
}

export const CATEGORIES: Category[] = [
  { id: 'gym', name: 'Gym', icon: 'dumbbell' },
  { id: 'yoga', name: 'Yoga', icon: 'yoga' },
  { id: 'boxing', name: 'Boks', icon: 'boxing' },
  { id: 'swimming', name: 'Suzish', icon: 'waves' },
  { id: 'pilates', name: 'Pilates', icon: 'stretching' },
  { id: 'crossfit', name: 'CrossFit', icon: 'crossfit' },
  { id: 'dance', name: 'Raqs', icon: 'music' },
  { id: 'martial-arts', name: 'Jang sanʼati', icon: 'shield' },
  { id: 'cycling', name: 'Velosiped', icon: 'bike' },
  { id: 'running', name: 'Yugurish', icon: 'run' },
];
