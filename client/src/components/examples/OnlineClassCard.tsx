import OnlineClassCard from '../OnlineClassCard';
import classImage from '@assets/generated_images/Online_fitness_class_instructor_ef28ee4a.png';

export default function OnlineClassCardExample() {
  return (
    <div className="grid grid-cols-2 gap-4">
      <OnlineClassCard 
        id="1"
        title="HIIT Mashq"
        category="Cardio"
        duration="30 min"
        instructor="Aziza Karimova"
        thumbnailUrl={classImage}
        onClick={(id) => console.log('Play class:', id)}
      />
      <OnlineClassCard 
        id="2"
        title="Yoga Asoslari"
        category="Yoga"
        duration="45 min"
        instructor="Nodira Yusupova"
        thumbnailUrl={classImage}
        isLocked={true}
        onClick={(id) => console.log('Play class:', id)}
      />
    </div>
  );
}
