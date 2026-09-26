import type { LucideIcon } from "lucide-react";
import { ICON_TILES, type IconTileKind } from "@shared/iconTiles";

/** Rangli gradient plitka ichida oq ikonka (ilovada: mobile/components/IconTile.tsx) */
export default function IconTile({
  icon: Icon,
  kind,
  size = 40,
}: {
  icon: LucideIcon;
  kind: IconTileKind;
  size?: number;
}) {
  const [from, to] = ICON_TILES[kind];
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-xl shadow-sm"
      style={{
        width: size,
        height: size,
        background: `linear-gradient(135deg, ${from}, ${to})`,
        boxShadow: `0 4px 12px -4px ${to}88`,
      }}
      aria-hidden
    >
      <Icon className="text-white" style={{ width: size * 0.5, height: size * 0.5 }} strokeWidth={2.25} />
    </div>
  );
}
