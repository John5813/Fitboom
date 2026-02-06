import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Play, Lock, Clock, User } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface OnlineClassCardProps {
  id: string;
  title: string;
  category: string;
  duration: string;
  instructor: string;
  thumbnailUrl: string;
  isLocked?: boolean;
  onClick: (id: string) => void;
}

export default function OnlineClassCard({ 
  id,
  title, 
  category, 
  duration, 
  instructor, 
  thumbnailUrl, 
  isLocked = false,
  onClick
}: OnlineClassCardProps) {
  const { t } = useLanguage();
  return (
    <Card 
      className={`overflow-hidden cursor-pointer hover-elevate ${isLocked ? 'opacity-75' : ''}`}
      onClick={() => !isLocked && onClick(id)}
      data-testid={`card-class-${id}`}
    >
      <div className="relative">
        <img 
          src={thumbnailUrl} 
          alt={title}
          className={`w-full h-40 object-cover ${isLocked ? 'blur-sm' : ''}`}
        />
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
          {isLocked ? (
            <Lock className="w-12 h-12 text-white" />
          ) : (
            <Play className="w-12 h-12 text-white" />
          )}
        </div>
        <Badge className="absolute top-2 right-2 bg-black/60 text-white border-white/20">
          {category}
        </Badge>
      </div>
      <CardContent className="p-4">
        <h3 className="font-semibold mb-2" data-testid={`text-class-title-${id}`}>{title}</h3>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>{duration}</span>
          </div>
          <div className="flex items-center gap-1">
            <User className="w-3 h-3" />
            <span>{instructor}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
