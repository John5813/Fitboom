import { Button } from "@/components/ui/button";
import { Dumbbell, MapPin, Video, CreditCard } from "lucide-react";
import heroImage from "@assets/generated_images/Hero_gym_interior_scene_687053fc.png";

interface WelcomeScreenProps {
  onStart: () => void;
}

export default function WelcomeScreen({ onStart }: WelcomeScreenProps) {
  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden">
      <div 
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${heroImage})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/60 to-black/80" />
      
      <div className="relative z-10 text-center px-6 max-w-2xl">
        <h1 className="font-display font-bold text-4xl md:text-5xl text-white mb-4">
          FitBoom ga xush kelibsiz
        </h1>
        <p className="text-white/90 text-lg mb-8">
          Bir kredit tizimi orqali shaharning eng yaxshi sport zallariga kirish imkoniyati
        </p>
        
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-white/10 backdrop-blur-md rounded-md p-4 border border-white/20">
            <Dumbbell className="w-8 h-8 text-primary mx-auto mb-2" />
            <p className="text-white text-sm">Koʻplab sport zallari</p>
          </div>
          <div className="bg-white/10 backdrop-blur-md rounded-md p-4 border border-white/20">
            <CreditCard className="w-8 h-8 text-primary mx-auto mb-2" />
            <p className="text-white text-sm">Kredit tizimi</p>
          </div>
          <div className="bg-white/10 backdrop-blur-md rounded-md p-4 border border-white/20">
            <Video className="w-8 h-8 text-primary mx-auto mb-2" />
            <p className="text-white text-sm">Online darslar</p>
          </div>
          <div className="bg-white/10 backdrop-blur-md rounded-md p-4 border border-white/20">
            <MapPin className="w-8 h-8 text-primary mx-auto mb-2" />
            <p className="text-white text-sm">Qulay joylashuv</p>
          </div>
        </div>
        
        <Button 
          onClick={onStart}
          size="lg"
          className="w-full bg-accent text-accent-foreground border border-accent-border hover-elevate active-elevate-2"
          data-testid="button-start"
        >
          Boshlash
        </Button>
      </div>
    </div>
  );
}
