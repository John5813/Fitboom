import GymFilters from '../GymFilters';
import { useState } from 'react';

export default function GymFiltersExample() {
  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');
  
  return (
    <GymFilters 
      categories={['Gym', 'Suzish', 'Yoga', 'Boks']}
      selectedCategory={category}
      onCategoryChange={setCategory}
      searchQuery={search}
      onSearchChange={setSearch}
    />
  );
}
