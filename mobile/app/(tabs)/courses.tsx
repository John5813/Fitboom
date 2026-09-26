import React, { useState } from "react";
import { Alert, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Image } from "expo-image";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ChevronRight, CreditCard, Lock, Play, Unlock, Video } from "lucide-react-native";

import { CATEGORIES } from "@shared/categories";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { request } from "@/services/api";
import { Button, Font, Radius } from "@/components/ui";

/*
 * Video kurslar — vebdagi client/src/pages/CoursesPage.tsx bilan bir xil.
 *
 * Ilgari bu ekranda uchta xato bor edi:
 *  - videolar soni doim 0 chiqardi (server `classCount` qaytaradi, ekran
 *    `videoCount` ni o'qirdi);
 *  - kurs narxi kreditda, lekin "0K so'm" deb ko'rsatilardi va "20 so'm
 *    evaziga sotib olasizmi?" deb so'ralardi;
 *  - sotib olish /user/purchases ga yuborilardi — serverda bunday manzil
 *    yo'q (404), ya'ni pullik kursni umuman ochib bo'lmasdi.
 */

interface Collection {
  id: string;
  name: string;
  description?: string;
  price: number;
  isFree: boolean;
  isPurchased?: boolean;
  thumbnailUrl?: string;
  categories?: string[];
  classCount?: number;
}

export default function CoursesScreen() {
  const { user, refetchUser } = useAuth();
  const { theme } = useTheme();
  const queryClient = useQueryClient();
  const [activeCategory, setActiveCategory] = useState("all");
  const [confirm, setConfirm] = useState<Collection | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["/collections"],
    queryFn: () => request<{ collections: Collection[] }>("/collections"),
  });
  const collections = data?.collections || [];
  const credits = user?.credits ?? 0;

  const hasAccess = (c: Collection) => !!c.isPurchased || c.isFree;
  const filtered =
    activeCategory === "all" ? collections : collections.filter((c) => (c.categories || []).includes(activeCategory));
  const mine = filtered.filter(hasAccess);
  const others = filtered.filter((c) => !hasAccess(c));
  const usedIds = new Set(collections.flatMap((c) => c.categories || []));
  const usedCategories = CATEGORIES.filter((c) => usedIds.has(c.id));

  const purchase = useMutation({
    mutationFn: (id: string) => request(`/collections/${id}/purchase`, { method: "POST" }),
    onSuccess: (_res, id) => {
      queryClient.invalidateQueries({ queryKey: ["/collections"] });
      refetchUser();
      setConfirm(null);
      router.push(`/courses/${id}` as any);
    },
    onError: (err: any) => Alert.alert("Xatolik", err?.message || "Kursni ochib bo'lmadi"),
  });

  const onCardPress = (c: Collection) => {
    if (hasAccess(c)) router.push(`/courses/${c.id}` as any);
    else setConfirm(c);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const notEnough = confirm ? credits < confirm.price : false;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]} edges={["top"]}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 110 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Qorong'i sarlavha, tilla nur */}
        <LinearGradient colors={["#020617", "#0F172A", "#020617"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
          <LinearGradient
            colors={["rgba(217,167,81,0.4)", "rgba(217,167,81,0)"]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />
          <Pressable onPress={() => router.push("/(tabs)" as any)} style={styles.back} accessibilityLabel="Orqaga">
            <ArrowLeft size={20} color="#FFFFFF" />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroTitle}>Video Kurslar</Text>
            <Text style={styles.heroSub}>{collections.length} ta kurs mavjud</Text>
          </View>
          <View style={styles.creditPill}>
            <CreditCard size={16} color="#FCD34D" />
            <Text style={styles.creditPillValue}>{credits}</Text>
            <Text style={styles.creditPillUnit}>kr</Text>
          </View>
        </LinearGradient>

        <View style={styles.body}>
          {usedCategories.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {[{ id: "all", name: "Hammasi" }, ...usedCategories].map((c) => {
                const active = activeCategory === c.id;
                return (
                  <Pressable
                    key={c.id}
                    onPress={() => setActiveCategory(c.id)}
                    style={[
                      styles.chip,
                      active
                        ? { backgroundColor: theme.primary, borderColor: theme.primary }
                        : { backgroundColor: theme.background, borderColor: theme.border },
                    ]}
                  >
                    <Text style={[styles.chipText, { color: active ? "#FFFFFF" : theme.text }]}>{c.name}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          )}

          {isLoading && !data ? (
            [0, 1, 2].map((i) => <View key={i} style={[styles.skeleton, { backgroundColor: theme.surface }]} />)
          ) : (
            <>
              {mine.length > 0 && (
                <View style={styles.section}>
                  <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
                    MENING KURSLARIM ({mine.length})
                  </Text>
                  {mine.map((c) => (
                    <CollectionCard key={c.id} col={c} access onPress={() => onCardPress(c)} />
                  ))}
                </View>
              )}
              {others.length > 0 && (
                <View style={styles.section}>
                  {mine.length > 0 && (
                    <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>BOSHQA KURSLAR</Text>
                  )}
                  {others.map((c) => (
                    <CollectionCard key={c.id} col={c} access={false} onPress={() => onCardPress(c)} />
                  ))}
                </View>
              )}
              {filtered.length === 0 && (
                <View style={styles.emptyBox}>
                  <Video size={48} color={theme.textSecondary} style={{ opacity: 0.3 }} />
                  <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                    {activeCategory === "all" ? "Hozircha kurslar yo'q" : "Bu kategoriyada kurs yo'q"}
                  </Text>
                </View>
              )}
            </>
          )}
        </View>
      </ScrollView>

      {/* Sotib olishni tasdiqlash — vebdagi Dialog */}
      <Modal visible={!!confirm} transparent animationType="fade" onRequestClose={() => setConfirm(null)}>
        <Pressable style={styles.backdrop} onPress={() => setConfirm(null)}>
          <Pressable style={[styles.dialog, { backgroundColor: theme.card }]} onPress={() => {}}>
            {confirm && (
              <>
                <Text style={[styles.dialogTitle, { color: theme.text }]}>Kursni ochish</Text>
                <Text style={[styles.dialogDesc, { color: theme.textSecondary }]}>
                  Bu kursni ochish uchun {confirm.price} kredit sarflanadi
                </Text>

                <View style={[styles.preview, { backgroundColor: theme.surface }]}>
                  {!!confirm.thumbnailUrl && <Image source={{ uri: confirm.thumbnailUrl }} style={styles.previewImg} contentFit="cover" />}
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={[styles.cardTitle, { color: theme.text }]} numberOfLines={1}>
                      {confirm.name}
                    </Text>
                    <Text style={[styles.cardMeta, { color: theme.textSecondary }]}>{confirm.classCount ?? 0} ta video</Text>
                  </View>
                </View>

                <View style={styles.costBox}>
                  <Text style={[styles.dialogDesc, { color: theme.textSecondary, marginTop: 0 }]}>Kerakli kredit:</Text>
                  <View style={styles.costValue}>
                    <CreditCard size={16} color="#D97706" />
                    <Text style={styles.costText}>{confirm.price} kredit</Text>
                  </View>
                </View>
                <View style={styles.balanceRow}>
                  <Text style={[styles.dialogDesc, { color: theme.textSecondary, marginTop: 0 }]}>Sizda mavjud:</Text>
                  <Text style={[styles.balanceText, { color: notEnough ? "#EF4444" : "#059669" }]}>{credits} kredit</Text>
                </View>
                {notEnough && (
                  <Text style={styles.notEnough}>Kredit yetarli emas. Asosiy sahifadan kredit sotib oling.</Text>
                )}

                <View style={styles.dialogButtons}>
                  <Button variant="outline" onPress={() => setConfirm(null)} style={{ flex: 1 }}>
                    Bekor qilish
                  </Button>
                  <Button
                    onPress={() => purchase.mutate(confirm.id)}
                    disabled={purchase.isPending || notEnough}
                    style={{ flex: 1 }}
                  >
                    {purchase.isPending ? "Ochilmoqda..." : `${confirm.price} kr sarfla`}
                  </Button>
                </View>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

function CollectionCard({ col, access, onPress }: { col: Collection; access: boolean; onPress: () => void }) {
  const { theme } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: theme.card, borderColor: theme.cardBorder },
        pressed && { transform: [{ scale: 0.99 }] },
      ]}
    >
      <View style={[styles.thumb, { backgroundColor: theme.surface }]}>
        {col.thumbnailUrl ? (
          <Image source={{ uri: col.thumbnailUrl }} style={StyleSheet.absoluteFill} contentFit="cover" />
        ) : (
          <Video size={28} color={theme.textSecondary} style={{ opacity: 0.3 }} />
        )}
        <View style={[StyleSheet.absoluteFill, styles.thumbOverlay, { backgroundColor: access ? "rgba(0,0,0,0.2)" : "rgba(0,0,0,0.4)" }]}>
          {access ? <Play size={28} color="#FFFFFF" /> : <Lock size={24} color="#FFFFFF" />}
        </View>
      </View>

      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[styles.cardTitle, { color: theme.text }]} numberOfLines={1}>
          {col.name}
        </Text>
        {!!col.description && (
          <Text style={[styles.cardDesc, { color: theme.textSecondary }]} numberOfLines={1}>
            {col.description}
          </Text>
        )}
        <View style={styles.cardMetaRow}>
          <View style={styles.inline}>
            <Play size={12} color={theme.textSecondary} />
            <Text style={[styles.cardMeta, { color: theme.textSecondary }]}>{col.classCount ?? 0} video</Text>
          </View>
          {col.isFree ? (
            <View style={[styles.badge, { backgroundColor: "#D1FAE5" }]}>
              <Unlock size={10} color="#047857" />
              <Text style={[styles.badgeText, { color: "#047857" }]}>Bepul</Text>
            </View>
          ) : access ? (
            <View style={[styles.badge, { backgroundColor: "#F8F5ED" }]}>
              <Text style={[styles.badgeText, { color: "#432F19" }]}>✓ Ochilgan</Text>
            </View>
          ) : (
            <View style={[styles.badge, { backgroundColor: "#FEF3C7" }]}>
              <CreditCard size={10} color="#92400E" />
              <Text style={[styles.badgeText, { color: "#92400E" }]}>{col.price} kr</Text>
            </View>
          )}
        </View>
      </View>

      <ChevronRight size={20} color={theme.textSecondary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  hero: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 20, overflow: "hidden" },
  back: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  heroTitle: { color: "#FFFFFF", fontSize: 20, lineHeight: 28, fontFamily: Font.display },
  heroSub: { color: "rgba(254,243,199,0.7)", fontSize: 14, fontFamily: Font.regular },
  creditPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: "rgba(252,211,77,0.3)",
    backgroundColor: "rgba(251,191,36,0.15)",
  },
  creditPillValue: { color: "#FFFFFF", fontSize: 14, fontFamily: Font.bold },
  creditPillUnit: { color: "rgba(254,243,199,0.8)", fontSize: 12, fontFamily: Font.regular },
  // max-w-2xl px-4 py-5 space-y-6
  body: { paddingHorizontal: 16, paddingVertical: 20, gap: 24 },
  chip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: Radius.full, borderWidth: 1 },
  chipText: { fontSize: 14, fontFamily: Font.medium },
  section: { gap: 12 },
  sectionTitle: { fontSize: 14, fontFamily: Font.semibold, letterSpacing: 0.6 },
  skeleton: { height: 112, borderRadius: Radius["2xl"], marginBottom: 12 },
  emptyBox: { alignItems: "center", paddingVertical: 80, gap: 12 },
  emptyText: { fontSize: 16, fontFamily: Font.medium },
  card: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderRadius: Radius["2xl"], borderWidth: 1 },
  thumb: { width: 112, height: 80, borderRadius: Radius.xl, overflow: "hidden", alignItems: "center", justifyContent: "center" },
  thumbOverlay: { alignItems: "center", justifyContent: "center" },
  cardTitle: { fontSize: 14, fontFamily: Font.semibold },
  cardDesc: { fontSize: 12, fontFamily: Font.regular, marginTop: 2 },
  cardMetaRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8 },
  inline: { flexDirection: "row", alignItems: "center", gap: 4 },
  cardMeta: { fontSize: 12, fontFamily: Font.regular },
  badge: { flexDirection: "row", alignItems: "center", gap: 4, height: 20, paddingHorizontal: 8, borderRadius: Radius.md },
  badgeText: { fontSize: 10, fontFamily: Font.semibold },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.8)", alignItems: "center", justifyContent: "center", padding: 16 },
  dialog: { width: "100%", maxWidth: 384, borderRadius: Radius.lg, padding: 24, gap: 16 },
  dialogTitle: { fontSize: 18, fontFamily: Font.semibold },
  dialogDesc: { fontSize: 14, fontFamily: Font.regular, marginTop: -8 },
  preview: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderRadius: Radius.xl },
  previewImg: { width: 80, height: 56, borderRadius: Radius.lg },
  costBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFBEB",
    borderRadius: Radius.xl,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  costValue: { flexDirection: "row", alignItems: "center", gap: 6 },
  costText: { color: "#B45309", fontSize: 14, fontFamily: Font.bold },
  balanceRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16 },
  balanceText: { fontSize: 14, fontFamily: Font.bold },
  notEnough: { color: "#EF4444", fontSize: 14, textAlign: "center", fontFamily: Font.regular },
  dialogButtons: { flexDirection: "row", gap: 8 },
});
