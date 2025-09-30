import GymCard from '../GymCard';
import gymImage from '@assets/generated_images/Standard_gym_facility_interior_f255ae25.png';

export default function GymCardExample() {
  return (
    <GymCard 
      id="1"
      name="PowerFit Gym"
      category="Gym"
      credits={4}
      distance="1.2 km"
      hours="06:00 - 23:00"
      imageUrl={gymImage}
      onBook={(id) => console.log('Book gym:', id)}
    />
  );
}
