import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bug, Check, ChevronDown, Loader2, Trash2, Undo2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import AdminHeader, { AdminOverlapSection } from "@/components/shared/PageHeader";
import StatTile from "@/components/shared/StatTile";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

interface ErrorEntry {
  id: string;
  source: "server" | "client";
  message: string;
  stack: string | null;
  context: string | null;
  count: number;
  resolved: boolean;
  firstSeen: string;
  lastSeen: string;
}

export default function AdminErrorsPage() {
  const { toast } = useToast();
  const [view, setView] = useState<"open" | "resolved">("open");
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data, isLoading } = useQuery<{ errors: ErrorEntry[] }>({
    queryKey: ["/api/admin/errors", view],
    queryFn: () =>
      fetch(`/api/admin/errors?resolved=${view === "resolved"}`, { credentials: "include" })
        .then((r) => r.json()),
    refetchInterval: 60_000,
  });

  const errors = data?.errors ?? [];

  const resolveMutation = useMutation({
    mutationFn: async ({ id, resolved }: { id: string; resolved: boolean }) => {
      await apiRequest(`/api/admin/errors/${id}`, "PUT", { resolved });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/admin/errors"] }),
    onError: () => toast({ title: "Xatolik", variant: "destructive" }),
  });

  const clearMutation = useMutation({
    mutationFn: async () => {
      const r = await apiRequest("/api/admin/errors/resolved", "DELETE");
      return r.json();
    },
    onSuccess: (r: { deleted: number }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/errors"] });
      toast({ title: "Tozalandi", description: `${r.deleted} ta yozuv o'chirildi` });
    },
  });

  const totalOccurrences = errors.reduce((s, e) => s + e.count, 0);
  const clientErrors = errors.filter((e) => e.source === "client").length;

  return (
    <div className="min-h-screen bg-background">
      <AdminHeader title="Xatolar" subtitle={`${errors.length} ta xato turi`} backHref="/admin" />

      <AdminOverlapSection className="-mt-3 space-y-4 pb-8">
        <div className="grid grid-cols-3 gap-3">
          <StatTile label="Xato turlari" value={errors.length} icon={Bug}
            tone={view === "open" && errors.length > 0 ? "warning" : "neutral"} />
          <StatTile label="Jami hodisa" value={totalOccurrences} />
          <StatTile label="Ilovada" value={clientErrors} />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <Tabs value={view} onValueChange={(v) => setView(v as typeof view)}>
            <TabsList>
              <TabsTrigger value="open" data-testid="tab-errors-open">Ochiq</TabsTrigger>
              <TabsTrigger value="resolved" data-testid="tab-errors-resolved">Hal qilingan</TabsTrigger>
            </TabsList>
          </Tabs>

          {view === "resolved" && errors.length > 0 && (
            <Button variant="outline" size="sm" onClick={() => clearMutation.mutate()}
              disabled={clearMutation.isPending} data-testid="button-clear-resolved">
              <Trash2 className="mr-1.5 h-4 w-4" />
              Tozalash
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : errors.length === 0 ? (
          <Card>
            <CardContent className="py-14 text-center">
              <Check className="mx-auto mb-3 h-10 w-10 text-green-600/40" />
              <p className="text-sm text-muted-foreground">
                {view === "open" ? "Ochiq xato yo'q" : "Hal qilingan xato yo'q"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {errors.map((err) => (
              <Card key={err.id} data-testid={`row-error-${err.id}`}>
                <CardContent className="p-0">
                  <button
                    type="button"
                    onClick={() => setExpanded(expanded === err.id ? null : err.id)}
                    className="flex w-full items-start gap-3 p-4 text-left"
                  >
                    <div className={cn(
                      "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                      err.source === "client" ? "bg-amber-500/10" : "bg-destructive/10",
                    )}>
                      <Bug className={cn("h-4 w-4",
                        err.source === "client" ? "text-amber-600" : "text-destructive")} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="break-words text-sm font-medium leading-snug">{err.message}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        <Badge variant="secondary" className="tabular-nums">{err.count}×</Badge>
                        <span>{err.source === "client" ? "Ilovada" : "Serverda"}</span>
                        {err.context && <span className="truncate font-mono">{err.context}</span>}
                        <span className="tabular-nums">{formatDateTime(err.lastSeen)}</span>
                      </div>
                    </div>

                    <ChevronDown className={cn(
                      "mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform",
                      expanded === err.id && "rotate-180",
                    )} />
                  </button>

                  {expanded === err.id && (
                    <div className="border-t px-4 py-3">
                      <p className="mb-2 text-xs text-muted-foreground">
                        Birinchi marta: {formatDateTime(err.firstSeen)}
                      </p>
                      {err.stack && (
                        <pre className="max-h-56 overflow-auto rounded-lg bg-muted p-3 text-[11px] leading-relaxed">
                          {err.stack}
                        </pre>
                      )}
                      <Button
                        variant={err.resolved ? "outline" : "default"}
                        size="sm"
                        className="mt-3"
                        onClick={() => resolveMutation.mutate({ id: err.id, resolved: !err.resolved })}
                        disabled={resolveMutation.isPending}
                        data-testid={`button-resolve-${err.id}`}
                      >
                        {err.resolved
                          ? <><Undo2 className="mr-1.5 h-4 w-4" />Qayta ochish</>
                          : <><Check className="mr-1.5 h-4 w-4" />Hal qilindi</>}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </AdminOverlapSection>
    </div>
  );
}
