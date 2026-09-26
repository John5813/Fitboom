import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CalendarOff, Loader2, Plus, Save, Trash2, Wand2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import ScheduleGrid from "./ScheduleGrid";
import {
  DAY_NAMES_UZ, WEEK_ORDER, defaultGymHours, toMinutes, toTimeString,
  findPeakWindow, type HoursRow, type PeakWindowRow,
} from "@shared/schedule";

interface ScheduleResponse {
  hours: HoursRow[];
  peakWindows: PeakWindowRow[];
  closures: Array<{ id: string; date: string; reason: string | null }>;
}

interface ScheduleTabProps {
  gymId: string;
  ownerHeaders: (extra?: Record<string, string>) => Record<string, string>;
}

/**
 * Zal egasining jadval boshqaruvi.
 *
 * Uchta alohida narsa, uchta alohida bo'lim:
 *   1. Ish vaqti   — zal qachon ochiq
 *   2. Pik vaqtlar — zal ochiq, lekin FitBoom mijozlariga yopiq
 *   3. Yopiq sanalar — aniq kunlardagi istisnolar
 */
export default function ScheduleTab({ gymId, ownerHeaders }: ScheduleTabProps) {
  const { toast } = useToast();

  // Shu hafta oralig'i — to'rdagi kataklarda haqiqiy bandlikni ko'rsatish uchun
  const weekRange = useMemo(() => {
    const now = new Date();
    const iso = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const monday = new Date(now);
    // getDay(): 0 = yakshanba -> dushanbaga qaytish uchun 6 kun orqaga
    monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return { from: iso(monday), to: iso(sunday) };
  }, []);

  const { data: occupancyData } = useQuery<{
    occupancy: Array<{ timeSlotId: string; date: string; bookedCount: number }>;
  }>({
    queryKey: ["/api/gyms", gymId, "occupancy", weekRange.from],
    enabled: !!gymId,
    queryFn: () =>
      fetch(`/api/gyms/${gymId}/occupancy?from=${weekRange.from}&to=${weekRange.to}`, {
        credentials: "include",
        headers: ownerHeaders(),
      }).then((r) => r.json()),
  });

  const { data: slotsData } = useQuery<{ timeSlots: Array<{ id: string; dayOfWeek: string; startTime: string; capacity: number }> }>({
    queryKey: ["/api/time-slots", gymId],
    enabled: !!gymId,
    queryFn: () => fetch(`/api/time-slots?gymId=${gymId}`, { credentials: "include" }).then((r) => r.json()),
  });

  /** (dayOfWeek-HH:MM) -> band joylar / sig'im */
  const { cellOccupancy, cellCapacity } = useMemo(() => {
    const slots = slotsData?.timeSlots ?? [];
    const byId = new Map(slots.map((s) => [s.id, s]));
    const occ = new Map<string, number>();
    const cap = new Map<string, number>();

    for (const s of slots) {
      const dayNum = DAY_NAMES_UZ.indexOf(s.dayOfWeek as (typeof DAY_NAMES_UZ)[number]);
      if (dayNum >= 0) cap.set(`${dayNum}-${s.startTime}`, s.capacity);
    }
    for (const row of occupancyData?.occupancy ?? []) {
      const slot = byId.get(row.timeSlotId);
      if (!slot) continue;
      const dayNum = DAY_NAMES_UZ.indexOf(slot.dayOfWeek as (typeof DAY_NAMES_UZ)[number]);
      if (dayNum < 0) continue;
      const key = `${dayNum}-${slot.startTime}`;
      occ.set(key, (occ.get(key) ?? 0) + row.bookedCount);
    }
    return { cellOccupancy: occ, cellCapacity: cap };
  }, [slotsData, occupancyData]);

  // Mavjud slotlarning sig'imini boshlang'ich qiymat sifatida ko'rsatamiz
  useEffect(() => {
    const first = slotsData?.timeSlots?.[0];
    if (first?.capacity) setSlotCapacity(first.capacity);
  }, [slotsData]);

  const { data, isLoading } = useQuery<ScheduleResponse>({
    queryKey: ["/api/gyms", gymId, "schedule"],
    enabled: !!gymId,
    queryFn: () => fetch(`/api/gyms/${gymId}/schedule`, { credentials: "include" }).then((r) => r.json()),
  });

  const [hours, setHours] = useState<HoursRow[]>(defaultGymHours());
  const [peakWindows, setPeakWindows] = useState<PeakWindowRow[]>([]);
  const [isDirty, setIsDirty] = useState(false);
  const [slotCapacity, setSlotCapacity] = useState(15);
  const [newClosureDate, setNewClosureDate] = useState("");
  const [newClosureReason, setNewClosureReason] = useState("");

  // Serverdan kelgan holatni faqat tahrirlanmagan bo'lsa qabul qilamiz —
  // aks holda foydalanuvchining saqlanmagan o'zgarishlari yo'qoladi.
  useEffect(() => {
    if (!data || isDirty) return;
    setHours(data.hours.length ? data.hours : defaultGymHours());
    setPeakWindows(data.peakWindows ?? []);
  }, [data, isDirty]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/gyms/${gymId}/schedule`, {
        method: "PUT",
        headers: ownerHeaders({ "Content-Type": "application/json" }),
        credentials: "include",
        body: JSON.stringify({ hours, peakWindows }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Saqlashda xatolik");
      return json as { affectedBookings: number };
    },
    onSuccess: (result) => {
      setIsDirty(false);
      queryClient.invalidateQueries({ queryKey: ["/api/gyms", gymId, "schedule"] });
      queryClient.invalidateQueries({ queryKey: ["/api/gym-owner", gymId] });
      toast({
        title: "Jadval saqlandi",
        description: result.affectedBookings > 0
          ? `Diqqat: ${result.affectedBookings} ta mavjud bron yangi pik vaqtga tushadi. Ular bekor qilinmadi.`
          : "O'zgarishlar kuchga kirdi",
      });
    },
    onError: (err: Error) => {
      toast({ title: "Xatolik", description: err.message, variant: "destructive" });
    },
  });

  const addClosureMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/gyms/${gymId}/closures`, {
        method: "POST",
        headers: ownerHeaders({ "Content-Type": "application/json" }),
        credentials: "include",
        body: JSON.stringify({ date: newClosureDate, reason: newClosureReason || null }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Qo'shishda xatolik");
      return json;
    },
    onSuccess: () => {
      setNewClosureDate("");
      setNewClosureReason("");
      queryClient.invalidateQueries({ queryKey: ["/api/gyms", gymId, "schedule"] });
      toast({ title: "Qo'shildi", description: "Bu sanada zal yopiq deb belgilandi" });
    },
    onError: (err: Error) => toast({ title: "Xatolik", description: err.message, variant: "destructive" }),
  });

  const deleteClosureMutation = useMutation({
    mutationFn: async (date: string) => {
      const res = await fetch(`/api/gyms/${gymId}/closures/${date}`, {
        method: "DELETE",
        headers: ownerHeaders(),
        credentials: "include",
      });
      if (!res.ok) throw new Error("O'chirishda xatolik");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/gyms", gymId, "schedule"] });
      toast({ title: "O'chirildi" });
    },
  });

  const regenerateMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/time-slots/auto-generate", {
        method: "POST",
        headers: ownerHeaders({ "Content-Type": "application/json" }),
        credentials: "include",
        body: JSON.stringify({ gymId, capacity: slotCapacity }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Yaratishda xatolik");
      return json as { count: number; message: string };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["/api/time-slots", gymId] });
      queryClient.invalidateQueries({ queryKey: ["/api/gyms", gymId, "occupancy"] });
      toast({ title: "Slotlar yangilandi", description: result.message });
    },
    onError: (err: Error) => toast({ title: "Xatolik", description: err.message, variant: "destructive" }),
  });

  function updateDay(dayOfWeek: number, patch: Partial<HoursRow>) {
    setIsDirty(true);
    setHours((prev) => {
      const existing = prev.find((h) => h.dayOfWeek === dayOfWeek);
      if (!existing) {
        return [...prev, { dayOfWeek, openTime: "09:00", closeTime: "22:00", isClosed: false, ...patch }];
      }
      return prev.map((h) => (h.dayOfWeek === dayOfWeek ? { ...h, ...patch } : h));
    });
  }

  /** Katakni bosish — o'sha soatni pik qilish yoki pikdan chiqarish */
  function toggleCell(dayOfWeek: number, startTime: string, endTime: string) {
    setIsDirty(true);
    setPeakWindows((prev) => {
      const existing = findPeakWindow(prev, dayOfWeek, startTime, endTime);
      if (existing) {
        // Kesishgan oynalarni shu soatga tegmaydigan qilib qirqamiz
        return prev.flatMap((w) => {
          if (w.dayOfWeek !== dayOfWeek) return [w];
          if (toMinutes(startTime) >= toMinutes(w.endTime) || toMinutes(w.startTime) >= toMinutes(endTime)) {
            return [w];
          }
          const pieces: PeakWindowRow[] = [];
          if (toMinutes(w.startTime) < toMinutes(startTime)) {
            pieces.push({ ...w, endTime: startTime });
          }
          if (toMinutes(w.endTime) > toMinutes(endTime)) {
            pieces.push({ ...w, startTime: endTime });
          }
          return pieces;
        });
      }
      return [...prev, { dayOfWeek, startTime, endTime, maxCapacity: 0 }];
    });
  }

  /** Ketma-ket soatlarni bitta oynaga birlashtirib ko'rsatish */
  const mergedPeaks = useMemo(() => {
    const byDay = new Map<number, PeakWindowRow[]>();
    for (const w of peakWindows) {
      byDay.set(w.dayOfWeek, [...(byDay.get(w.dayOfWeek) ?? []), w]);
    }
    const result: PeakWindowRow[] = [];
    for (const [day, windows] of byDay) {
      const sorted = [...windows].sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime));
      let current = { ...sorted[0] };
      for (const w of sorted.slice(1)) {
        if (toMinutes(w.startTime) <= toMinutes(current.endTime) && w.maxCapacity === current.maxCapacity) {
          current.endTime = toTimeString(Math.max(toMinutes(current.endTime), toMinutes(w.endTime)));
        } else {
          result.push(current);
          current = { ...w };
        }
      }
      if (current) result.push({ ...current, dayOfWeek: day });
    }
    return result.sort((a, b) => a.dayOfWeek - b.dayOfWeek || toMinutes(a.startTime) - toMinutes(b.startTime));
  }, [peakWindows]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-w-0 space-y-4">
      {/* Haftalik to'r */}
      <Card>
        <CardHeader className="flex-row items-center justify-between gap-3 space-y-0">
          <div>
            <CardTitle className="text-base">Haftalik jadval</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Kataklardagi raqamlar — shu haftadagi bandlik. Katakni bosib pik vaqt
              qiling: o'sha soatda FitBoom mijozlari bron qila olmaydi.
              Kun nomini bosib dam kuni qilasiz.
            </p>
          </div>
          {isDirty && (
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} data-testid="button-save-schedule">
              {saveMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Saqlash
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <ScheduleGrid
            hours={hours}
            peakWindows={peakWindows}
            occupancy={cellOccupancy}
            capacityByCell={cellCapacity}
            onToggleCell={toggleCell}
            onToggleDay={(day) => {
              const row = hours.find((h) => h.dayOfWeek === day);
              updateDay(day, { isClosed: !row?.isClosed });
            }}
          />
          {isDirty && (
            <p className="mt-3 flex items-center gap-2 text-xs text-amber-600 dark:text-amber-500">
              <AlertTriangle className="h-3.5 w-3.5" />
              Saqlanmagan o'zgarishlar bor
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Ish vaqti */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ish vaqti</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {WEEK_ORDER.map((dayOfWeek) => {
              const row = hours.find((h) => h.dayOfWeek === dayOfWeek)
                ?? { dayOfWeek, openTime: "09:00", closeTime: "22:00", isClosed: false };
              return (
                <div
                  key={dayOfWeek}
                  className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b pb-2 last:border-0 sm:border-0 sm:pb-0"
                >
                  {/* Tor ekranda kun nomi va tugma alohida qatorda — shunda
                      vaqt maydonlariga to'liq kenglik qoladi va matn kesilmaydi */}
                  <div className="flex w-full items-center gap-2 sm:w-auto">
                    <Switch
                      checked={!row.isClosed}
                      onCheckedChange={(checked) => updateDay(dayOfWeek, { isClosed: !checked })}
                      data-testid={`switch-day-${dayOfWeek}`}
                    />
                    <span className="w-24 text-sm">{DAY_NAMES_UZ[dayOfWeek]}</span>
                  </div>
                  {row.isClosed ? (
                    <span className="text-sm text-muted-foreground">Dam kuni</span>
                  ) : (
                    <div className="flex min-w-0 flex-1 items-center gap-2">
                      <Input
                        type="time"
                        value={row.openTime}
                        onChange={(e) => updateDay(dayOfWeek, { openTime: e.target.value })}
                        className="h-8 min-w-0 flex-1 tabular-nums sm:max-w-[8rem]"
                        data-testid={`input-open-${dayOfWeek}`}
                      />
                      <span className="shrink-0 text-muted-foreground">–</span>
                      <Input
                        type="time"
                        value={row.closeTime}
                        onChange={(e) => updateDay(dayOfWeek, { closeTime: e.target.value })}
                        className="h-8 min-w-0 flex-1 tabular-nums sm:max-w-[8rem]"
                        data-testid={`input-close-${dayOfWeek}`}
                      />
                    </div>
                  )}
                </div>
              );
            })}

            <div className="space-y-3 border-t pt-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm">Har soatga</span>
                <Input
                  type="number"
                  min={1}
                  max={1000}
                  value={slotCapacity}
                  onChange={(e) => setSlotCapacity(Math.max(1, Number(e.target.value) || 1))}
                  className="h-8 w-20 tabular-nums"
                  data-testid="input-slot-capacity"
                />
                <span className="text-sm text-muted-foreground">ta FitBoom mijozi</span>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => regenerateMutation.mutate()}
                disabled={regenerateMutation.isPending || isDirty}
                data-testid="button-regenerate-slots"
              >
                {regenerateMutation.isPending
                  ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  : <Wand2 className="mr-2 h-4 w-4" />}
                Vaqt slotlarini qayta yaratish
              </Button>
              <p className="text-xs text-muted-foreground">
                Ish vaqtiga qarab soatlik slotlar yaratadi va sig'imni yuqoridagi
                songa o'rnatadi.{" "}
                {isDirty
                  ? "Avval jadvalni saqlang."
                  : "Mavjud slotlar qayta yaratiladi — kelgusi bronlar saqlanib qoladi."}
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {/* Pik vaqtlar ro'yxati */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Pik vaqtlar</CardTitle>
              <p className="text-sm text-muted-foreground">
                Bu vaqtlarda zal o'z mijozlari bilan band — FitBoom mijozlari bron qila olmaydi.
              </p>
            </CardHeader>
            <CardContent>
              {mergedPeaks.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  Pik vaqt belgilanmagan. Yuqoridagi to'rdan katak tanlang.
                </p>
              ) : (
                <div className="space-y-1.5">
                  {mergedPeaks.map((w, i) => (
                    <div key={i} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                      <span>
                        <span className="font-medium">{DAY_NAMES_UZ[w.dayOfWeek]}</span>
                        <span className="ml-2 tabular-nums text-muted-foreground">{w.startTime}–{w.endTime}</span>
                      </span>
                      <Badge variant={w.maxCapacity === 0 ? "destructive" : "secondary"}>
                        {w.maxCapacity === 0 ? "Yopiq" : `${w.maxCapacity} kishi`}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Yopiq sanalar */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <CalendarOff className="h-4 w-4 text-muted-foreground" />
                Yopiq sanalar
              </CardTitle>
              <p className="text-sm text-muted-foreground">Bayram, ta'mir yoki boshqa bir martalik yopilish.</p>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  type="date"
                  value={newClosureDate}
                  onChange={(e) => setNewClosureDate(e.target.value)}
                  className="h-9 w-40"
                  data-testid="input-closure-date"
                />
                <Input
                  placeholder="Sabab (ixtiyoriy)"
                  value={newClosureReason}
                  onChange={(e) => setNewClosureReason(e.target.value)}
                  className="h-9 flex-1 min-w-[8rem]"
                  data-testid="input-closure-reason"
                />
                <Button
                  size="sm"
                  onClick={() => addClosureMutation.mutate()}
                  disabled={!newClosureDate || addClosureMutation.isPending}
                  data-testid="button-add-closure"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {(data?.closures ?? []).length === 0 ? (
                <p className="py-2 text-sm text-muted-foreground">Yopiq sana belgilanmagan.</p>
              ) : (
                <div className="space-y-1.5">
                  {data!.closures.map((c) => (
                    <div key={c.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                      <span>
                        <span className="font-medium tabular-nums">{c.date}</span>
                        {c.reason && <span className="ml-2 text-muted-foreground">{c.reason}</span>}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => deleteClosureMutation.mutate(c.date)}
                        data-testid={`button-delete-closure-${c.date}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
