import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ArrowLeft, Users, TrendingUp, DollarSign, Activity,
  UserCheck, UserX, Target, Calculator, Plus, Trash2,
  BarChart3, PieChart, Wallet, AlertTriangle
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { User, AdminExpense } from "@shared/schema";

const MONTHS = [
  "Yanvar", "Fevral", "Mart", "Aprel", "May", "Iyun",
  "Iyul", "Avgust", "Sentabr", "Oktabr", "Noyabr", "Dekabr"
];

function formatCurrency(amount: number): string {
  return amount.toLocaleString('uz-UZ') + " so'm";
}

export default function AdminAnalyticsPage() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [isVerified, setIsVerified] = useState(() => sessionStorage.getItem('adminVerified') === 'true');
  const [isExpenseDialogOpen, setIsExpenseDialogOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [expenseForm, setExpenseForm] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    marketingSpend: 0,
    operationalCosts: 0,
    notes: "",
  });

  useEffect(() => {
    if (!isVerified) setLocation('/admin');
  }, [isVerified, setLocation]);

  const { data: metrics, isLoading: metricsLoading } = useQuery<{
    dau: number; mau: number; totalRevenue: number; mrr: number; arpu: number; ltv: number;
    totalUsers: number; newUsersThisMonth: number; activeUsersToday: number; activeUsersMonth: number;
  }>({
    queryKey: ['/api/admin/analytics'],
    enabled: isVerified,
  });

  const { data: cacData } = useQuery<{
    month: number; year: number; totalMarketing: number;
    newUsersCount: number; cac: number; totalOperational: number;
  }>({
    queryKey: ['/api/admin/analytics/cac', selectedMonth, selectedYear],
    queryFn: async () => {
      const res = await fetch(`/api/admin/analytics/cac?month=${selectedMonth}&year=${selectedYear}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
    enabled: isVerified,
  });

  const { data: atRiskUsers = [] } = useQuery<User[]>({
    queryKey: ['/api/admin/analytics/at-risk-users'],
    enabled: isVerified,
  });

  const { data: topUsers = [] } = useQuery<{ user: User; activityScore: number }[]>({
    queryKey: ['/api/admin/analytics/top-users'],
    enabled: isVerified,
  });

  const { data: expenses = [] } = useQuery<AdminExpense[]>({
    queryKey: ['/api/admin/expenses'],
    enabled: isVerified,
  });

  const saveExpenseMutation = useMutation({
    mutationFn: async (data: typeof expenseForm) => {
      const res = await apiRequest('POST', '/api/admin/expenses', data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/expenses'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/analytics/cac'] });
      setIsExpenseDialogOpen(false);
      toast({ title: "Xarajat saqlandi" });
    },
    onError: () => toast({ title: "Xatolik", variant: "destructive" }),
  });

  const deleteExpenseMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest('DELETE', `/api/admin/expenses/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/expenses'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/analytics/cac'] });
      toast({ title: "O'chirildi" });
    },
  });

  if (!isVerified) return null;

  const mainMetrics = [
    { label: "DAU", desc: "Kunlik aktiv", value: metrics?.dau || 0, icon: Activity, color: "from-blue-500 to-cyan-500" },
    { label: "MAU", desc: "Oylik aktiv", value: metrics?.mau || 0, icon: Users, color: "from-violet-500 to-purple-500" },
    { label: "MRR", desc: "Oylik daromad", value: formatCurrency(metrics?.mrr || 0), icon: TrendingUp, color: "from-emerald-500 to-green-500" },
    { label: "ARPU", desc: "Har bir foydalanuvchi", value: formatCurrency(metrics?.arpu || 0), icon: DollarSign, color: "from-amber-500 to-orange-500" },
    { label: "LTV", desc: "Mijoz umrlik qiymati", value: formatCurrency(metrics?.ltv || 0), icon: Target, color: "from-rose-500 to-pink-500" },
  ];

  const secondaryMetrics = [
    { label: "Jami foydalanuvchilar", value: metrics?.totalUsers || 0, icon: Users },
    { label: "Bu oydagi yangi", value: metrics?.newUsersThisMonth || 0, icon: UserCheck },
    { label: "Jami daromad", value: formatCurrency(metrics?.totalRevenue || 0), icon: Wallet },
    { label: "Xavfli foydalanuvchilar", value: atRiskUsers.length, icon: AlertTriangle },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white">
        <div className="max-w-5xl mx-auto px-4 py-5 sm:px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/admin">
                <Button variant="ghost" size="icon" className="text-blue-200/70 hover:text-white hover:bg-white/10 h-9 w-9" data-testid="button-back">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-xl font-bold flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Analitika
                </h1>
                <p className="text-blue-200/60 text-sm">Biznes ko'rsatkichlari va moliya</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 -mt-3 space-y-5 pb-8">
        {metricsLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[1,2,3,4].map(i => <div key={i} className="h-28 rounded-xl bg-muted/50 animate-pulse" />)}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {mainMetrics.map((m) => (
                <Card key={m.label} className="overflow-hidden border shadow-sm">
                  <CardContent className="p-0">
                    <div className={`bg-gradient-to-br ${m.color} p-3`}>
                      <div className="flex items-center gap-2">
                        <m.icon className="h-4 w-4 text-white/80" />
                        <span className="text-xs font-medium text-white/80">{m.label}</span>
                      </div>
                    </div>
                    <div className="p-3">
                      <p className="text-xl font-bold" data-testid={`metric-${m.label}`}>{m.value}</p>
                      <p className="text-[10px] text-muted-foreground">{m.desc}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {secondaryMetrics.map((m) => (
                <div key={m.label} className="rounded-xl bg-card border shadow-sm p-3.5">
                  <div className="flex items-center gap-2 mb-1">
                    <m.icon className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-[11px] text-muted-foreground">{m.label}</span>
                  </div>
                  <p className="text-lg font-bold">{m.value}</p>
                </div>
              ))}
            </div>
          </>
        )}

        <div className="grid sm:grid-cols-2 gap-4">
          <Card className="border shadow-sm">
            <CardContent className="p-0">
              <div className="bg-gradient-to-r from-orange-500/10 to-red-500/10 p-4 border-b">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Calculator className="h-4 w-4 text-orange-600" />
                    CAC — Mijoz narxi
                  </h3>
                  <div className="flex gap-1.5">
                    <Select value={String(selectedMonth)} onValueChange={(v) => setSelectedMonth(Number(v))}>
                      <SelectTrigger className="h-7 w-24 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {MONTHS.map((name, i) => (
                          <SelectItem key={i} value={String(i + 1)}>{name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
                      <SelectTrigger className="h-7 w-20 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[2024, 2025, 2026, 2027].map(y => (
                          <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <div className="p-4 space-y-3">
                <div className="text-center py-3">
                  <p className="text-3xl font-bold text-orange-600" data-testid="metric-cac">
                    {cacData ? formatCurrency(cacData.cac) : "—"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Bitta mijozni jalb qilish narxi</p>
                </div>
                <div className="grid grid-cols-2 gap-2 text-center">
                  <div className="rounded-lg bg-muted/50 p-2.5">
                    <p className="text-xs text-muted-foreground">Marketing xarajati</p>
                    <p className="text-sm font-semibold">{cacData ? formatCurrency(cacData.totalMarketing) : "—"}</p>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-2.5">
                    <p className="text-xs text-muted-foreground">Yangi foydalanuvchilar</p>
                    <p className="text-sm font-semibold">{cacData?.newUsersCount ?? "—"}</p>
                  </div>
                </div>
                <div className="bg-muted/30 rounded-lg p-2 text-center">
                  <p className="text-[10px] text-muted-foreground">Formula: Marketing xarajati / Yangi foydalanuvchilar</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border shadow-sm">
            <CardContent className="p-0">
              <div className="bg-gradient-to-r from-blue-500/10 to-indigo-500/10 p-4 border-b">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Wallet className="h-4 w-4 text-blue-600" />
                    Xarajatlar
                  </h3>
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => {
                    setExpenseForm({
                      month: new Date().getMonth() + 1,
                      year: new Date().getFullYear(),
                      marketingSpend: 0, operationalCosts: 0, notes: "",
                    });
                    setIsExpenseDialogOpen(true);
                  }} data-testid="button-add-expense">
                    <Plus className="h-3 w-3 mr-1" />
                    Qo'shish
                  </Button>
                </div>
              </div>
              <div className="p-4">
                {expenses.length === 0 ? (
                  <div className="text-center py-6">
                    <PieChart className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
                    <p className="text-sm text-muted-foreground">Xarajatlar kiritilmagan</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {[...expenses]
                      .sort((a, b) => (b.year * 12 + b.month) - (a.year * 12 + a.month))
                      .map((exp) => (
                      <div key={exp.id} className="flex items-center justify-between px-3 py-2.5 bg-muted/30 rounded-lg border text-sm" data-testid={`expense-row-${exp.id}`}>
                        <div>
                          <p className="font-medium text-xs">{MONTHS[exp.month - 1]} {exp.year}</p>
                          <div className="flex gap-3 mt-0.5">
                            <span className="text-[10px] text-muted-foreground">
                              Marketing: <span className="text-foreground font-medium">{formatCurrency(exp.marketingSpend)}</span>
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              Operatsion: <span className="text-foreground font-medium">{formatCurrency(exp.operationalCosts)}</span>
                            </span>
                          </div>
                        </div>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-600"
                          onClick={() => deleteExpenseMutation.mutate(exp.id)}
                          data-testid={`button-delete-expense-${exp.id}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <Card className="border shadow-sm">
            <CardContent className="p-0">
              <div className="bg-gradient-to-r from-emerald-500/10 to-green-500/10 p-4 border-b">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Target className="h-4 w-4 text-emerald-600" />
                    Top Aktiv Foydalanuvchilar
                  </h3>
                  <Badge variant="secondary" className="text-[10px]">Top {topUsers.length}</Badge>
                </div>
              </div>
              <div className="p-4">
                {topUsers.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Ma'lumot yo'q</p>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {topUsers.map((item, idx) => (
                      <div key={item.user.id} className="flex items-center justify-between px-3 py-2 bg-muted/30 rounded-lg border" data-testid={`top-user-${item.user.id}`}>
                        <div className="flex items-center gap-2.5">
                          <div className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                            idx === 0 ? 'bg-amber-500' : idx === 1 ? 'bg-gray-400' : idx === 2 ? 'bg-orange-600' : 'bg-muted-foreground/30'
                          }`}>
                            {idx + 1}
                          </div>
                          <div>
                            <p className="text-sm font-medium">{item.user.name || item.user.phone || 'Nomsiz'}</p>
                            <p className="text-[10px] text-muted-foreground">{item.user.phone}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-emerald-600">{item.activityScore}</p>
                          <p className="text-[10px] text-muted-foreground">faollik</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border shadow-sm">
            <CardContent className="p-0">
              <div className="bg-gradient-to-r from-red-500/10 to-rose-500/10 p-4 border-b">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold flex items-center gap-2">
                    <UserX className="h-4 w-4 text-red-600" />
                    Xavf ostidagi foydalanuvchilar
                  </h3>
                  <Badge variant="destructive" className="text-[10px]">{atRiskUsers.length} kishi</Badge>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">7+ kun faoliyatsiz foydalanuvchilar</p>
              </div>
              <div className="p-4">
                {atRiskUsers.length === 0 ? (
                  <div className="text-center py-4">
                    <UserCheck className="h-8 w-8 mx-auto text-emerald-500/30 mb-2" />
                    <p className="text-sm text-muted-foreground">Barcha foydalanuvchilar faol</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {atRiskUsers.slice(0, 20).map((user) => (
                      <div key={user.id} className="flex items-center justify-between px-3 py-2 bg-muted/30 rounded-lg border" data-testid={`at-risk-user-${user.id}`}>
                        <div className="flex items-center gap-2.5">
                          <div className="h-7 w-7 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                            <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">{user.name || 'Nomsiz'}</p>
                            <p className="text-[10px] text-muted-foreground">{user.phone}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge variant="outline" className="text-[10px]">{user.credits} kredit</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={isExpenseDialogOpen} onOpenChange={setIsExpenseDialogOpen}>
        <DialogContent className="max-w-sm" data-testid="dialog-expense">
          <DialogHeader>
            <DialogTitle>Xarajat Kiritish</DialogTitle>
            <DialogDescription>Oylik marketing va operatsion xarajatlarni kiriting</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Oy</Label>
                <Select value={String(expenseForm.month)} onValueChange={(v) => setExpenseForm(prev => ({ ...prev, month: Number(v) }))}>
                  <SelectTrigger data-testid="select-expense-month"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((name, i) => (
                      <SelectItem key={i} value={String(i + 1)}>{name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Yil</Label>
                <Select value={String(expenseForm.year)} onValueChange={(v) => setExpenseForm(prev => ({ ...prev, year: Number(v) }))}>
                  <SelectTrigger data-testid="select-expense-year"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[2024, 2025, 2026, 2027].map(y => (
                      <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs">Marketing xarajati (so'm)</Label>
              <Input
                type="number"
                value={expenseForm.marketingSpend || ''}
                onChange={(e) => setExpenseForm(prev => ({ ...prev, marketingSpend: Number(e.target.value) || 0 }))}
                placeholder="0"
                data-testid="input-marketing-spend"
              />
              <p className="text-[10px] text-muted-foreground mt-1">Facebook, Instagram, Telegram reklama</p>
            </div>
            <div>
              <Label className="text-xs">Operatsion xarajat (so'm)</Label>
              <Input
                type="number"
                value={expenseForm.operationalCosts || ''}
                onChange={(e) => setExpenseForm(prev => ({ ...prev, operationalCosts: Number(e.target.value) || 0 }))}
                placeholder="0"
                data-testid="input-operational-costs"
              />
              <p className="text-[10px] text-muted-foreground mt-1">Server, xodimlar, ofis</p>
            </div>
            <div>
              <Label className="text-xs">Izoh</Label>
              <Textarea
                value={expenseForm.notes}
                onChange={(e) => setExpenseForm(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Qo'shimcha izoh..."
                rows={2}
                data-testid="input-expense-notes"
              />
            </div>
            <Button
              className="w-full"
              onClick={() => saveExpenseMutation.mutate(expenseForm)}
              disabled={saveExpenseMutation.isPending}
              data-testid="button-save-expense"
            >
              {saveExpenseMutation.isPending ? 'Saqlanmoqda...' : 'Saqlash'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
