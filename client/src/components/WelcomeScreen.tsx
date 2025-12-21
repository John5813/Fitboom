
import { Button } from "@/components/ui/button";
import { Dumbbell, MapPin, Video, CreditCard, Clock, Users, QrCode, Shield, Star, TrendingUp } from "lucide-react";
import heroImage from "@assets/814914041712414214qaranliqenerji_1765638608962.jpg";

interface WelcomeScreenProps {
  onStart: () => void;
}

export default function WelcomeScreen({ onStart }: WelcomeScreenProps) {
  return (
    <div className="min-h-screen overflow-y-auto">
      {/* Hero Section */}
      <div className="relative min-h-screen flex items-center justify-center">
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

          {/* Scroll indicator */}
          <div className="mt-8 animate-bounce">
            <p className="text-white/70 text-sm mb-2">Pastga aylantiring</p>
            <div className="w-6 h-10 border-2 border-white/50 rounded-full mx-auto flex items-start justify-center p-2">
              <div className="w-1 h-3 bg-white/70 rounded-full"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="bg-background py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="font-display font-bold text-3xl mb-4">FitBoom nima?</h2>
            <p className="text-muted-foreground text-lg">
              Sport hayotingizni yanada qulay va arzon qilish uchun yaratilgan platforma
            </p>
          </div>

          {/* Main Features */}
          <div className="space-y-12">
            {/* Credit System */}
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="flex-shrink-0 w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                <CreditCard className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h3 className="font-bold text-xl mb-2">💳 Kredit Tizimi</h3>
                <p className="text-muted-foreground">
                  Bir marta kredit sotib olib, turli sport zallariga kiring. 6, 13 yoki 24 kredit paketlari mavjud. Barcha kreditlar 30 kun amal qiladi.
                </p>
              </div>
            </div>

            {/* Gyms */}
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="flex-shrink-0 w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                <Dumbbell className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h3 className="font-bold text-xl mb-2">🏋️ Sport Zallari</h3>
                <p className="text-muted-foreground">
                  Shaharning turli sport zallarini ko'ring va qidiring. Gym, Yoga, Boks, Suzish, Pilates va boshqa kategoriyalar. Haritada eng yaqin zallarni topib, kredit bilan bron qiling.
                </p>
              </div>
            </div>

            {/* QR Code */}
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="flex-shrink-0 w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                <QrCode className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h3 className="font-bold text-xl mb-2">📱 QR Kod Tizimi</h3>
                <p className="text-muted-foreground">
                  Bronlashdan keyin QR kod oling. Zalga kirishda QR kodni skanerlang. Tez va xavfsiz kirish tizimi.
                </p>
              </div>
            </div>

            {/* Video Courses */}
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="flex-shrink-0 w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                <Video className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h3 className="font-bold text-xl mb-2">🎥 Video Kurslar</h3>
                <p className="text-muted-foreground">
                  Onlayn fitnes darsliklari to'plamlari. Professional ustozlar bilan uyda mashq qilish imkoniyati.
                </p>
              </div>
            </div>

            {/* Profile Management */}
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="flex-shrink-0 w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                <Users className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h3 className="font-bold text-xl mb-2">👤 Profil Boshqaruvi</h3>
                <p className="text-muted-foreground">
                  Telegram orqali qulay ro'yxatdan o'tish. Bronlar tarixi va kredit balansi hamda muddat kuzatuvi.
                </p>
              </div>
            </div>

            {/* For Gym Owners */}
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="flex-shrink-0 w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                <Shield className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h3 className="font-bold text-xl mb-2">🏢 Zal Egalari Uchun</h3>
                <p className="text-muted-foreground">
                  O'z zalingizni boshqarish paneli. Mehmonlar va daromad statistikasi hamda to'lovlar tarixi.
                </p>
              </div>
            </div>
          </div>

          {/* Benefits Section */}
          <div className="mt-16 bg-card rounded-lg p-8 border">
            <h3 className="font-bold text-2xl mb-6 text-center">Afzalliklar</h3>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Star className="w-6 h-6 text-primary" />
                </div>
                <h4 className="font-semibold mb-2">Tejamkorlik</h4>
                <p className="text-sm text-muted-foreground">
                  Bir kredit bilan ko'plab sport zallariga kirish
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Clock className="w-6 h-6 text-primary" />
                </div>
                <h4 className="font-semibold mb-2">Qulay</h4>
                <p className="text-sm text-muted-foreground">
                  Istalgan vaqt, istalgan joyda sport qiling
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                  <TrendingUp className="w-6 h-6 text-primary" />
                </div>
                <h4 className="font-semibold mb-2">Moslashuvchan</h4>
                <p className="text-sm text-muted-foreground">
                  Turli sport turlari va zallarni sinab ko'ring
                </p>
              </div>
            </div>
          </div>

          {/* How it works */}
          <div className="mt-16">
            <h3 className="font-bold text-2xl mb-8 text-center">Qanday ishlaydi?</h3>
            <div className="space-y-6">
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-10 h-10 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold">
                  1
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Ro'yxatdan o'ting</h4>
                  <p className="text-muted-foreground text-sm">Telegram orqali tez va oson ro'yxatdan o'ting</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-10 h-10 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold">
                  2
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Kredit sotib oling</h4>
                  <p className="text-muted-foreground text-sm">O'zingizga mos paketni tanlang va to'lang</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-10 h-10 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold">
                  3
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Zalni bron qiling</h4>
                  <p className="text-muted-foreground text-sm">Haritadan yoki ro'yxatdan sport zalini tanlang va bron qiling</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-10 h-10 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold">
                  4
                </div>
                <div>
                  <h4 className="font-semibold mb-1">QR kodni skanerlang</h4>
                  <p className="text-muted-foreground text-sm">Zalga borib, QR kodni ko'rsating va mashg'ulotni boshlang</p>
                </div>
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="mt-16 text-center">
            <Button 
              onClick={onStart}
              size="lg"
              className="bg-accent text-accent-foreground border border-accent-border hover-elevate"
            >
              Hozir Boshlash
            </Button>
            <p className="text-sm text-muted-foreground mt-4">
              Sport hayotingizni yangi bosqichga olib chiqing!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
