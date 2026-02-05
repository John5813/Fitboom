import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Globe } from "lucide-react";

export function LanguageSelector() {
  const { language, setLanguage } = useLanguage();

  const langs = {
    uz: "UZB",
    ru: "RUS",
    en: "ENG"
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2 h-8 px-2 font-medium" data-testid="button-language-selector">
          <Globe className="h-4 w-4" />
          <span>{langs[language]}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setLanguage("uz")} data-testid="lang-uz">
          O'zbekcha (UZB)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setLanguage("ru")} data-testid="lang-ru">
          Русский (RUS)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setLanguage("en")} data-testid="lang-en">
          English (ENG)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
