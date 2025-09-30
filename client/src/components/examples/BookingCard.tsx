import BookingCard from '../BookingCard';
import gymImage from '@assets/generated_images/Standard_gym_facility_interior_f255ae25.png';

export default function BookingCardExample() {
  return (
    <BookingCard 
      id="1"
      gymName="PowerFit Gym"
      gymImage={gymImage}
      date="10 Okt"
      time="18:00"
      onScanQR={(id) => console.log('Scan QR:', id)}
      onCancel={(id) => console.log('Cancel booking:', id)}
    />
  );
}
