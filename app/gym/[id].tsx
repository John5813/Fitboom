import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
  Platform,
  Linking,
  Dimensions,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";

import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { getGymById, getGymSlots, bookGym } from "@/services/api";
import Colors from "@/constants/Colors";

const { width } = Dimensions.get("window");

const DAYS = ["Dushanba", "Seshanba", "Chorshanba", "Payshanba", "Juma", "Shanba", "Yakshanba"];

function ImageWithFallback({ uri, style }: { uri: string; style: any }) {
  const [error, setError] = useState(false);
  if (error) {
    return (
      <View style={[style, { backgroundColor: "#2c3e5a", justifyContent: "center", alignItems: "center" }]}>
        <Feather name="activity" size={64} color="rgba(255,255,255,0.3)" />
      </View>
    );
  }
  return (
    <Image
      source={{ uri }}
      style={style}
      contentFit="cover"
      transition={300}
      onError={() => setError(true)}
    />
  );
}

function getCategoryLabel(cat: any): string {
  if (!cat) return "";
  if (typeof cat === "string") return cat;
  return cat.name || cat.id || "";
}

export default function GymDetailScreen() {
  const { id, distanceKm: distanceKmParam } = useLocalSearchParams<{ id: string; distanceKm?: string }>();
  const insets = useSafeAreaInsets();
  const { user, refetchUser } = useAuth();
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [imageIndex, setImageIndex] = useState(0);
  const [bookingModal, setBookingModal] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<any>(null);
  const [selectedDayOffset, setSelectedDayOffset] = useState(0);

  const { data: gymData, isLoading } = useQuery({
    queryKey: [`/api/gyms/${id}`],
    queryFn: () => (id ? getGymById(id) : Promise.resolve(null)),
    enabled: !!id,
  });

  const gym = gymData?.gym || gymData;

  const distanceKm = distanceKmParam ? parseFloat(distanceKmParam) : null;
  const distanceText =
    distanceKm != null && !isNaN(distanceKm)
      ? distanceKm < 1
        ? `${Math.round(distanceKm * 1000)} ${t("gym.distance_away_m")}`
        : `${distanceKm.toFixed(1)} ${t("gym.distance_away_km")}`
      : null;

  const selectedDate = new Date();
  selectedDate.setDate(selectedDate.getDate() + selectedDayOffset);
  const pad = (n: number) => String(n).padStart(2, "0");
  const selectedDateStr = `${selectedDate.getFullYear()}-${pad(selectedDate.getMonth() + 1)}-${pad(selectedDate.getDate())}`;

  const { data: slotsData, isLoading: slotsLoading } = useQuery({
    queryKey: [`/api/gyms/${id}/slots`, selectedDateStr],
    queryFn: () => (id ? getGymSlots(id, selectedDateStr) : Promise.resolve({ slots: [], is_day_off: false })),
    enabled: !!id,
  });

  const isDayOff = slotsData?.is_day_off === true || slotsData?.isClosed === true;
  const slots = slotsData?.slots || [];
  const needSlot = slots.length > 0 && !selectedSlot;

  const bookMutation = useMutation({
    mutationFn: (data: any) => bookGym(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      refetchUser();
      setBookingModal(false);
      setSelectedSlot(null);
      Alert.alert(t("gym.booked"), `${gym?.credits} ${t("gym.booked_msg")}`);
    },
    onError: (err: any) => {
      Alert.alert(t("common.error"), err.message || t("gym.book_error"));
    },
  });

  const handleBook = async () => {
    if (!user) {
      router.push("/auth" as any);
      return;
    }
    if ((user.credits || 0) < (gym?.credits || 0)) {
      Alert.alert(
        t("gym.not_enough"),
        `${t("gym.not_enough_have")} ${user.credits} ${t("gym.not_enough_credits_word")} ${gym?.credits} ${t("gym.not_enough_need")}`,
        [
          { text: t("common.cancel"), style: "cancel" },
          {
            text: t("home.topup"),
            onPress: () => router.push("/payment" as any),
          },
        ]
      );
      return;
    }
    setBookingModal(true);
  };

  const confirmBooking = () => {
    if (slots.length > 0 && !selectedSlot) {
      Alert.alert(t("gym.select_time_required_title"), t("gym.select_time_required_msg"));
      return;
    }
    bookMutation.mutate({
      gymId: id,
      timeSlotId: selectedSlot?.id || null,
      scheduledDate: selectedDateStr,
      startTime: selectedSlot?.startTime,
      endTime: selectedSlot?.endTime,
    });
  };

  const hasCoordinates =
    !!gym?.latitude &&
    !!gym?.longitude &&
    !isNaN(parseFloat(gym.latitude)) &&
    !isNaN(parseFloat(gym.longitude));

  const addressIsUrl =
    !!gym?.address && (gym.address.trim().toLowerCase().startsWith("http://") || gym.address.trim().toLowerCase().startsWith("https://"));

  const openMapUrl = async (mode: "view" | "directions") => {
    if (!hasCoordinates) {
      if (addressIsUrl) await Linking.openURL(gym!.address);
      return;
    }
    const lat = parseFloat(gym!.latitude!);
    const lng = parseFloat(gym!.longitude!);

    const yandexView = `yandexmaps://maps.yandex.ru/?pt=${lng},${lat}&z=16`;
    const yandexDir = `yandexmaps://build_route_on_map?lat_to=${lat}&lon_to=${lng}`;
    const googleView = `https://www.google.com/maps?q=${lat},${lng}`;
    const googleDir = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;

    const yandexUrl = mode === "directions" ? yandexDir : yandexView;
    const googleUrl = mode === "directions" ? googleDir : googleView;

    if (Platform.OS === "ios") {
      const appleView = `maps://?ll=${lat},${lng}&q=${lat},${lng}`;
      const appleDir = `maps://?daddr=${lat},${lng}`;
      const appleUrl = mode === "directions" ? appleDir : appleView;
      const canYandex = await Linking.canOpenURL(yandexUrl);
      if (canYandex) {
        await Linking.openURL(yandexUrl);
      } else {
        Linking.openURL(appleUrl).catch(() => Linking.openURL(googleUrl));
      }
    } else {
      const canYandex = await Linking.canOpenURL(yandexUrl);
      await Linking.openURL(canYandex ? yandexUrl : googleUrl);
    }
  };

  const viewOnMap = () => openMapUrl("view");
  const getDirections = () => openMapUrl("directions");

  const images = gym
    ? [gym.imageUrl, ...(gym.images || [])].filter(Boolean)
    : [];

  if (isLoading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!gym) {
    return (
      <View style={styles.loader}>
        <Text style={styles.errorText}>{t("gym.not_found")}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.imageContainer}>
          {images.length === 0 ? (
            <View style={[styles.image, { width, backgroundColor: "#2c3e5a", justifyContent: "center", alignItems: "center" }]}>
              <Feather name="activity" size={64} color="rgba(255,255,255,0.3)" />
            </View>
          ) : (
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(e) => {
                setImageIndex(Math.round(e.nativeEvent.contentOffset.x / width));
              }}
            >
              {images.map((img: string, idx: number) => (
                <ImageWithFallback
                  key={idx}
                  uri={img}
                  style={[styles.image, { width }]}
                />
              ))}
            </ScrollView>
          )}

          <TouchableOpacity
            style={[styles.backBtn, { top: (Platform.OS === "web" ? 67 : insets.top) + 8 }]}
            onPress={() => router.back()}
          >
            <Feather name="arrow-left" size={20} color="#fff" />
          </TouchableOpacity>

          {images.length > 1 && (
            <View style={styles.imageDots}>
              {images.map((_: any, idx: number) => (
                <View
                  key={idx}
                  style={[styles.dot, imageIndex === idx && styles.dotActive]}
                />
              ))}
            </View>
          )}

          <LinearGradient
            colors={["transparent", "rgba(0,0,0,0.6)"]}
            style={styles.imageGradient}
          >
            <View style={styles.creditBadge}>
              <Feather name="key" size={14} color="#fff" />
              <Text style={styles.creditBadgeText}>{gym.credits} {t("common.credit")}</Text>
            </View>
          </LinearGradient>
        </View>

        <View style={styles.content}>
          <View style={styles.nameRow}>
            <Text style={styles.gymName}>{gym.name}</Text>
            {gym.avgRating && (
              <View style={styles.ratingBox}>
                <Feather name="star" size={14} color="#F59E0B" />
                <Text style={styles.ratingText}>
                  {Number(gym.avgRating).toFixed(1)}
                </Text>
              </View>
            )}
          </View>

          {(gym.categories || []).length > 0 && (
            <View style={styles.categoriesRow}>
              {(gym.categories || []).map((cat: any, i: number) => (
                <View key={i} style={styles.categoryTag}>
                  <Text style={styles.categoryTagText}>{getCategoryLabel(cat)}</Text>
                </View>
              ))}
            </View>
          )}

          <View style={styles.infoCard}>
            {distanceText && (
              <View style={styles.infoRow}>
                <View style={styles.infoIconBox}>
                  <Feather name="map-pin" size={16} color={Colors.primary} />
                </View>
                <View style={styles.infoText}>
                  <Text style={styles.infoLabel}>{t("gym.distance_label")}</Text>
                  <Text style={styles.infoValue}>{distanceText}</Text>
                </View>
              </View>
            )}
            <View style={[styles.infoRow, distanceText ? styles.infoRowBorder : null]}>
              <View style={styles.infoIconBox}>
                <Feather name="clock" size={16} color={Colors.primary} />
              </View>
              <View style={styles.infoText}>
                <Text style={styles.infoLabel}>{t("gym.hours")}</Text>
                <Text style={styles.infoValue}>{gym.hours || "00:00 - 24:00"}</Text>
              </View>
            </View>
            {(hasCoordinates || addressIsUrl) && (
              <View style={[styles.mapBtnRow, styles.infoRowBorder]}>
                <TouchableOpacity style={styles.mapActionBtn} onPress={viewOnMap}>
                  <Feather name="map" size={16} color="#fff" />
                  <Text style={styles.mapActionText}>{t("gym.view_on_map")}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.directionsBtn} onPress={getDirections}>
                  <Feather name="navigation" size={16} color={Colors.primary} />
                  <Text style={styles.directionsBtnText}>{t("gym.directions")}</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {gym.description && (
            <View style={styles.descCard}>
              <Text style={styles.descTitle}>{t("gym.description")}</Text>
              <Text style={styles.descText}>{gym.description}</Text>
            </View>
          )}

          {gym.facilities && (
            <View style={styles.descCard}>
              <Text style={styles.descTitle}>{t("gym.facilities")}</Text>
              <Text style={styles.descText}>{gym.facilities}</Text>
            </View>
          )}

          <View style={{ height: 100 }} />
        </View>
      </ScrollView>

      <View
        style={[
          styles.bottomBar,
          { paddingBottom: Platform.OS === "web" ? 34 : insets.bottom + 16 },
        ]}
      >
        <View style={styles.bottomCreditInfo}>
          <Text style={styles.bottomCreditLabel}>{t("gym.you_have")}</Text>
          <Text style={styles.bottomCreditAmount}>{user?.credits ?? 0} {t("common.credit")}</Text>
        </View>
        <TouchableOpacity style={styles.bookBtn} onPress={handleBook}>
          <Text style={styles.bookBtnText}>{t("gym.book_now")}</Text>
          <Feather name="calendar" size={16} color="#fff" />
        </TouchableOpacity>
      </View>

      <Modal
        visible={bookingModal}
        transparent
        animationType="slide"
        onRequestClose={() => setBookingModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t("gym.book")}</Text>
              <TouchableOpacity onPress={() => setBookingModal(false)} hitSlop={10}>
                <Feather name="x" size={22} color={Colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ gap: 14, paddingBottom: 8 }}
            >
            <Text style={styles.sectionLabel}>{t("gym.select_date")}</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.dayScroll}
              contentContainerStyle={{ gap: 8, paddingHorizontal: 4 }}
            >
              {[0, 1, 2, 3, 4, 5, 6].map((offset) => {
                const d = new Date();
                d.setDate(d.getDate() + offset);
                return (
                  <TouchableOpacity
                    key={offset}
                    style={[
                      styles.dayBtn,
                      selectedDayOffset === offset && styles.dayBtnActive,
                    ]}
                    onPress={() => {
                      setSelectedDayOffset(offset);
                      setSelectedSlot(null);
                    }}
                  >
                    <Text
                      style={[
                        styles.dayBtnDay,
                        selectedDayOffset === offset && styles.dayBtnDayActive,
                      ]}
                    >
                      {DAYS[d.getDay() === 0 ? 6 : d.getDay() - 1].slice(0, 3)}
                    </Text>
                    <Text
                      style={[
                        styles.dayBtnDate,
                        selectedDayOffset === offset && styles.dayBtnDateActive,
                      ]}
                    >
                      {d.getDate()}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <Text style={styles.sectionLabel}>{t("gym.select_slot")}</Text>

            {slotsLoading ? (
              <View style={styles.dayOffBox}>
                <ActivityIndicator size="small" color={Colors.primary} />
                <Text style={styles.dayOffSub}>{t("common.loading_short")}</Text>
              </View>
            ) : isDayOff ? (
              <View style={styles.dayOffBox}>
                <Feather name="moon" size={24} color={Colors.textSecondary} />
                <Text style={styles.dayOffText}>{t("gym.day_off")}</Text>
                <Text style={styles.dayOffSub}>{t("gym.day_off_desc")}</Text>
              </View>
            ) : slots.length === 0 ? (
              <Text style={styles.noSlotsText}>{t("gym.no_slots")}</Text>
            ) : (
              <View style={styles.slotsGrid}>
                {slots.map((slot: any) => {
                  const isFull = slot.availableSpots === 0;
                  const isActive = selectedSlot?.id === slot.id;
                  const lowSpots = slot.availableSpots > 0 && slot.availableSpots <= 3;
                  return (
                    <TouchableOpacity
                      key={slot.id}
                      style={[
                        styles.slotBtn,
                        isActive && styles.slotBtnActive,
                        isFull && styles.slotBtnFull,
                      ]}
                      onPress={() => {
                        if (!isFull) setSelectedSlot(slot);
                      }}
                      disabled={isFull}
                      activeOpacity={0.85}
                    >
                      <Text
                        style={[
                          styles.slotBtnText,
                          isActive && styles.slotBtnTextActive,
                          isFull && styles.slotBtnTextFull,
                        ]}
                        numberOfLines={1}
                      >
                        {slot.startTime} – {slot.endTime}
                      </Text>
                      <View style={styles.slotMetaRow}>
                        <View
                          style={[
                            styles.slotDot,
                            {
                              backgroundColor: isActive
                                ? "#fff"
                                : isFull
                                ? "#9CA3AF"
                                : lowSpots
                                ? "#F59E0B"
                                : Colors.primary,
                            },
                          ]}
                        />
                        <Text
                          style={[
                            styles.slotCapacity,
                            isActive && { color: "#fff" },
                            isFull && { color: "#9CA3AF", textDecorationLine: "line-through" },
                            lowSpots && !isActive && { color: "#B45309", fontFamily: "Inter_600SemiBold" },
                          ]}
                          numberOfLines={1}
                        >
                          {isFull
                            ? t("gym.slot_full")
                            : lowSpots
                            ? `${t("gym.slot_low")} · ${slot.availableSpots}/${slot.capacity}`
                            : `${slot.availableSpots}/${slot.capacity} ${t("gym.slot_spots")}`}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
            </ScrollView>

            {!isDayOff && !slotsLoading && (
              <TouchableOpacity
                style={[
                  styles.confirmBtn,
                  (bookMutation.isPending || needSlot) && { opacity: 0.5 },
                ]}
                onPress={confirmBooking}
                disabled={bookMutation.isPending}
              >
                {bookMutation.isPending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.confirmBtnText}>
                    {needSlot
                      ? t("gym.select_slot")
                      : `${t("gym.confirm_booking")} (${gym.credits} ${t("gyms.credits")})`}
                  </Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  loader: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: Colors.background },
  errorText: {
    fontSize: 16,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
  },
  imageContainer: { position: "relative", height: 280 },
  image: { height: 280, backgroundColor: Colors.surface },
  backBtn: {
    position: "absolute",
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  imageDots: {
    position: "absolute",
    bottom: 16,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.5)",
  },
  dotActive: { backgroundColor: "#fff", width: 16 },
  imageGradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
    justifyContent: "flex-end",
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  creditBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    alignSelf: "flex-end",
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  creditBadgeText: {
    color: "#fff",
    fontSize: 14,
    fontFamily: "Inter_700Bold",
  },
  content: { padding: 20, gap: 16 },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  gymName: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
    flex: 1,
  },
  ratingBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(245,158,11,0.12)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  ratingText: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    color: "#F59E0B",
  },
  categoriesRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  categoryTag: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  categoryTagText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.primary,
  },
  infoCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 12,
  },
  infoRowBorder: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  infoIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.primaryLight,
    justifyContent: "center",
    alignItems: "center",
  },
  infoText: { flex: 1 },
  mapBtnRow: {
    flexDirection: "row",
    padding: 12,
    gap: 10,
  },
  mapActionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: Colors.primary,
    paddingVertical: 11,
    borderRadius: 10,
  },
  mapActionText: {
    color: "#fff",
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  directionsBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: Colors.primaryLight,
    paddingVertical: 11,
    borderRadius: 10,
  },
  directionsBtnText: {
    color: Colors.primary,
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  infoLabel: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
  },
  infoValue: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: Colors.text,
    marginTop: 2,
  },
  descCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  descTitle: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  descText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    lineHeight: 21,
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.card,
    paddingTop: 16,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: Colors.cardBorder,
    gap: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 10,
  },
  bottomCreditInfo: { flex: 1 },
  bottomCreditLabel: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
  },
  bottomCreditAmount: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  bookBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingHorizontal: 24,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  bookBtnText: {
    color: "#fff",
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: Colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 28,
    gap: 12,
    maxHeight: "90%",
    minHeight: "55%",
    borderTopWidth: 1,
    borderTopColor: Colors.cardBorder,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  sectionLabel: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  dayScroll: { marginHorizontal: -4 },
  dayBtn: {
    width: 60,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    gap: 4,
  },
  dayBtnActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  dayBtnDay: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
  },
  dayBtnDayActive: { color: Colors.primary },
  dayBtnDate: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  dayBtnDateActive: { color: Colors.primary },
  dayOffBox: {
    alignItems: "center",
    paddingVertical: 24,
    gap: 8,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  dayOffText: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  dayOffSub: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
  },
  noSlotsText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    textAlign: "center",
    paddingVertical: 8,
  },
  slotsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    columnGap: 10,
    rowGap: 10,
  },
  slotBtn: {
    flexBasis: "48%",
    flexGrow: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    alignItems: "center",
    gap: 4,
  },
  slotBtnActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary,
  },
  slotBtnFull: {
    opacity: 0.55,
    backgroundColor: "#F1F5F9",
    borderStyle: "dashed",
  },
  slotBtnText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  slotBtnTextActive: { color: "#fff" },
  slotBtnTextFull: { color: Colors.textSecondary, textDecorationLine: "line-through" },
  slotMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  slotDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  slotCapacity: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
  },
  confirmBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 4,
  },
  confirmBtnText: {
    color: "#fff",
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
});
