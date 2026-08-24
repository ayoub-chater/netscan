import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Image,
  RefreshControl,
  Modal,
  StyleSheet,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import { withUniwind } from 'uniwind';
import { withTiming } from 'react-native-reanimated';
import {
  Avatar,
  Button,
  Card,
  Chip,
  Skeleton,
  Surface,
} from 'heroui-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useTabBar, TAB_BAR_HIDDEN_OFFSET } from '../context/TabBarContext';
import { networkingHistory, getUnreadNotificationCount } from '../services/api';
import NetworkingModal from '../components/NetworkingModal';
import MenuButton from '../components/MenuButton';
import { roleLabel, PARTICIPATE_ICON } from '../constants/roles';
import { arrowForwardIcon, forwardIcon, latinLabel } from '../utils/rtl';

const StyledIonicons = withUniwind(Ionicons);

const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

// Keep the banner's own proportions so nothing is cropped on any screen width.
const BADGE_BANNER = require('../../assets/banner-badge.png');
const badgeBannerSource = Image.resolveAssetSource(BADGE_BANNER);
const BADGE_BANNER_RATIO =
  badgeBannerSource?.width && badgeBannerSource?.height
    ? badgeBannerSource.width / badgeBannerSource.height
    : 16 / 9;

// Accent (#286EAD) lifted and deepened at the two ends of the diagonal.
const PARTICIPATE_GRADIENT = ['#4A9BE0', '#286EAD', '#1B4E7C'];

function CountdownDigit({ value, label }) {
  const { isDark } = useTheme();
  return (
    <View className="items-center">
      <View className="w-[62px] h-[62px] rounded-xl bg-surface border border-separator items-center justify-center">
        <Text className="text-2xl font-extrabold" style={{ color: isDark ? '#FFFFFF' : '#286EAD' }}>{value}</Text>
      </View>
      <Text className={`text-[10px] font-semibold text-muted mt-1 ${latinLabel()}`}>
        {label}
      </Text>
    </View>
  );
}

function ContactRow({ item, onPress }) {
  const { t } = useTranslation();
  const role = item?.person?.role || t('profile.defaultRole');
  const name = item?.person?.name || t('common.unknown');
  const company = item?.person?.company || t('common.independent');
  const initial = name[0]?.toUpperCase() || '?';
  const isExposant = role === 'Exposant';
  const photo = isExposant
    ? item?.person?.exhibitor_logo || item?.person?.image
    : item?.person?.image;
  const timeStr = item.scanned_at
    ? new Date(item.scanned_at).toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';

  return (
    <Pressable
      onPress={() => onPress(item)}
      className="flex-row items-center bg-surface rounded-xl px-4 py-3.5 mb-2.5 active:opacity-70"
    >
      {photo ? (
        <Image
          source={{ uri: photo }}
          style={{ width: 40, height: 40, borderRadius: 20 }}
          resizeMode="cover"
        />
      ) : (
        <Avatar size="md" color={isExposant ? 'success' : 'default'} variant="soft">
          <Avatar.Fallback>{initial}</Avatar.Fallback>
        </Avatar>
      )}
      <View className="flex-1 ms-3">
        <Text className="text-sm font-bold text-foreground">{name}</Text>
        <Text className="text-xs text-muted mt-0.5">{company}</Text>
      </View>
      <View className="items-end" style={{ gap: 6 }}>
        <Chip size="sm" variant="soft" color={isExposant ? 'success' : 'default'}>
          <Chip.Label>{roleLabel(role)}</Chip.Label>
        </Chip>
        <Text className="text-[10px] text-muted font-medium">{timeStr}</Text>
      </View>
    </Pressable>
  );
}

// Big entry point into the "Participer" flow. Its look follows where the user
// stands: an invitation before applying, a status card after.
function ParticipateBanner({ status, role, membershipStatus, pendingExhibitor, onPress }) {
  const { t } = useTranslation();
  const forward = arrowForwardIcon();

  // ── Waiting on the stand owner ──────────────────────────────────────────
  // The organiser validated them, but the organisation they named already
  // exhibits and its owner decides who joins. Their participation reads
  // "approved" — saying so here would be a lie, they are not on the stand.
  const awaitingOwner = membershipStatus === 'pending';

  // ── Invitation ──────────────────────────────────────────────────────────
  // Nothing requested yet: this is the dashboard's primary call to action, so
  // it gets the full accent treatment instead of blending into the surface
  // cards around it. Colours are literals rather than theme tokens — the
  // gradient is the same in light and dark, and white always reads on it.
  if (!status) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={t('participate.bannerTitle')}
        className="mx-4 mb-4 active:opacity-90"
        style={styles.participateShadow}
      >
        <LinearGradient
          colors={PARTICIPATE_GRADIENT}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.participateCard}
        >
          {/* Soft highlights give the flat gradient some depth. */}
          <View style={styles.participateGlowTop} pointerEvents="none" />
          <View style={styles.participateGlowBottom} pointerEvents="none" />

          <View className="flex-row items-center" style={{ gap: 14 }}>
            <View style={styles.participateIcon}>
              <Ionicons name={PARTICIPATE_ICON} size={26} color="#FFFFFF" />
            </View>
            <View className="flex-1">
              <Text className="text-[17px] font-extrabold" style={{ color: '#FFFFFF' }}>
                {t('participate.bannerTitle')}
              </Text>
              <Text
                className="text-xs mt-1 leading-5"
                style={{ color: 'rgba(255,255,255,0.85)' }}
              >
                {t('participate.bannerBody')}
              </Text>
            </View>
            <View style={styles.participateArrow}>
              <Ionicons name={forward} size={18} color="#FFFFFF" />
            </View>
          </View>
        </LinearGradient>
      </Pressable>
    );
  }

  // ── Status ──────────────────────────────────────────────────────────────
  // A request exists, so the card is informational and steps back to the
  // surface styling shared with the rest of the dashboard.
  // Class names are written out in full — Uniwind resolves them statically,
  // so an interpolated `bg-${tint}-soft` would never be generated.
  const variant = awaitingOwner
    ? { icon: 'hourglass-outline', bubble: 'bg-warning-soft', iconColor: 'text-warning', titleKey: 'participate.bannerTeamPendingTitle', bodyKey: 'participate.bannerTeamPendingBody' }
    : status === 'approved'
      ? { icon: 'checkmark-circle', bubble: 'bg-success-soft', iconColor: 'text-success', titleKey: 'participate.bannerApprovedTitle', bodyKey: 'participate.bannerApprovedBody' }
      : status === 'pending'
      ? { icon: 'time-outline', bubble: 'bg-warning-soft', iconColor: 'text-warning', titleKey: 'participate.bannerPendingTitle', bodyKey: 'participate.bannerPendingBody' }
      : { icon: 'refresh-circle-outline', bubble: 'bg-warning-soft', iconColor: 'text-warning', titleKey: 'participate.bannerRejectedTitle', bodyKey: 'participate.bannerRejectedBody' };

  return (
    <Pressable
      onPress={onPress}
      className="mx-4 mb-4 rounded-2xl bg-surface border border-separator px-4 py-4 flex-row items-center active:opacity-80"
      style={{ gap: 14 }}
    >
      <View className={`w-12 h-12 rounded-2xl items-center justify-center ${variant.bubble}`}>
        <StyledIonicons name={variant.icon} size={24} className={variant.iconColor} />
      </View>
      <View className="flex-1">
        <View className="flex-row items-center" style={{ gap: 8 }}>
          <Text className="text-base font-extrabold text-foreground">
            {t(variant.titleKey)}
          </Text>
          {role ? (
            <Chip size="sm" variant="soft" color={status === 'approved' ? 'success' : 'warning'}>
              <Chip.Label>{roleLabel(role)}</Chip.Label>
            </Chip>
          ) : null}
        </View>
        <Text className="text-xs text-muted mt-1 leading-5">
          {t(variant.bodyKey, { company: pendingExhibitor || '' })}
        </Text>
      </View>
      <Ionicons name={forwardIcon()} size={18} color="#9CA3AF" />
    </Pressable>
  );
}

export default function HomeScreen({ navigation }) {
  const { t } = useTranslation();
  const {
    scanner,
    badgeNumber,
    eventInfo,
    participationStatus,
    participationRole,
    isExhibitorStaff,
    isVip,
    membershipStatus,
    pendingExhibitor,
    refreshProfile,
  } = useAuth();
  const { translateY } = useTabBar();
  const insets = useSafeAreaInsets();
  const lastScrollY = useRef(0);
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [badgeModalVisible, setBadgeModalVisible] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [timeLeft, setTimeLeft] = useState({ d: '00', h: '00', m: '00', s: '00' });

  const loadHistory = async () => {
    if (!badgeNumber) return;
    try {
      const res = await networkingHistory(badgeNumber);
      setHistory(res?.data?.history || []);
    } catch {}
    finally {
      setRefreshing(false);
      setLoadingHistory(false);
    }
  };

  const loadUnreadCount = async () => {
    try {
      const res = await getUnreadNotificationCount();
      setUnreadCount(res?.data?.unread_count || 0);
    } catch {}
  };

  useFocusEffect(
    React.useCallback(() => {
      loadHistory();
      loadUnreadCount();
      // Picks up participation decisions and the B2B pending count, which the
      // tab bar reads to draw its red dot — Home is the screen users return to.
      refreshProfile();
    }, [badgeNumber])
  );

  // A push arriving while Home is on screen should bump the bell badge.
  useEffect(() => {
    const sub = Notifications.addNotificationReceivedListener(() => loadUnreadCount());
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (!eventInfo?.start_date) return;

    const timer = setInterval(() => {
      const target = new Date(eventInfo.start_date);
      const now = new Date();
      const diff = target - now;

      if (diff <= 0) {
        setTimeLeft({ d: '00', h: '00', m: '00', s: '00' });
        clearInterval(timer);
        return;
      }

      const d = Math.floor(diff / (1000 * 60 * 60 * 24));
      const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const m = Math.floor((diff / (1000 * 60)) % 60);
      const s = Math.floor((diff / 1000) % 60);

      setTimeLeft({
        d: d.toString().padStart(2, '0'),
        h: h.toString().padStart(2, '0'),
        m: m.toString().padStart(2, '0'),
        s: s.toString().padStart(2, '0'),
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [eventInfo?.start_date]);

  const onRefresh = () => {
    setRefreshing(true);
    loadHistory();
    loadUnreadCount();
  };

  // Reveal the tab bar whenever the Home screen regains focus.
  useFocusEffect(
    React.useCallback(() => {
      lastScrollY.current = 0;
      translateY.value = withTiming(0);
    }, [])
  );

  // Hide the bar while scrolling down the content, reveal it when scrolling back up.
  const handleScroll = (e) => {
    const y = e.nativeEvent.contentOffset.y;
    const diff = y - lastScrollY.current;
    if (y <= 0) {
      translateY.value = withTiming(0);
    } else if (diff > 6) {
      translateY.value = withTiming(TAB_BAR_HIDDEN_OFFSET);
    } else if (diff < -6) {
      translateY.value = withTiming(0);
    }
    lastScrollY.current = y;
  };

  const role = scanner?.role || t('profile.defaultRole');
  const currentDayIndex = (new Date().getDay() + 6) % 7;

  const todayCount = history.filter(h => {
    if (!h.scanned_at) return false;
    return new Date(h.scanned_at).toDateString() === new Date().toDateString();
  }).length;

  return (
    // Safe-area padding lives on the inner container so overlays mounted at the
    // root (the menu) can still cover the status bar area.
    <View className="flex-1 bg-background">
      <View style={{ flex: 1, paddingTop: insets.top }}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#286EAD" />
          }
          contentContainerStyle={{ paddingBottom: 120 }}
        >
          {/* ── Header ─────────────────────────────────── */}
          <View className="px-3 pt-5 pb-4 flex-row items-center justify-between">
            <View className="flex-row items-center" style={{ gap: 10, flex: 1 }}>
              <MenuButton />
              <View style={{ flex: 1 }} />
            </View>
            <Pressable
              onPress={() => navigation.navigate('Notifications')}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel={t('notifications.title')}
              className="w-10 h-10 rounded-2xl bg-surface border border-separator items-center justify-center active:opacity-70"
              style={{ flexShrink: 0 }}
            >
              <Ionicons name="notifications-outline" size={19} color="#286EAD" />
              {unreadCount > 0 && (
                <View
                  className="absolute bg-danger rounded-full items-center justify-center"
                  style={{ top: -4, insetInlineEnd: -4, minWidth: 18, height: 18, paddingHorizontal: 4 }}
                >
                  <Text className="text-[10px] font-extrabold text-danger-foreground">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </Text>
                </View>
              )}
            </Pressable>
            <Pressable
              onPress={() => navigation.navigate('MyBadge')}
              className="flex-row items-center bg-surface rounded-xl py-1.5 ps-3 pe-1.5 active:opacity-70"
              hitSlop={8}
              style={{ gap: 8, flexShrink: 0, marginStart: 8 }}
            >
              <Text className="text-xs font-bold text-foreground">{role}</Text>
              <View className="w-7 h-7 rounded-lg bg-accent items-center justify-center">
                <Ionicons name="qr-code" size={15} color="#FFFFFF" />
              </View>
            </Pressable>
          </View>

          {/* ── Day Selector ───────────────────────────── */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
            style={{ marginBottom: 20 }}
          >
            {DAY_KEYS.map((dayKey, i) => {
              const isActive = i === currentDayIndex;
              return (
                <View
                  key={dayKey}
                  className={[
                    'items-center px-3 py-2 rounded-xl',
                    isActive ? 'bg-accent' : 'bg-surface',
                  ].join(' ')}
                >
                  <Text
                    className={`text-xs font-bold ${isActive ? 'text-accent-foreground' : 'text-muted'}`}
                  >
                    {t(`home.dayShort.${dayKey}`)}
                  </Text>
                  <View
                    className={[
                      'w-1 h-1 rounded-full mt-1',
                      isActive ? 'bg-accent-foreground' : 'bg-transparent',
                    ].join(' ')}
                  />
                </View>
              );
            })}
          </ScrollView>

          {/* ── Participer ─────────────────────────────── */}
          {/* Staff take part through the exhibitor that added them, and VIPs
              were registered in their role already — neither has anything to
              apply for. */}
          {!isExhibitorStaff && !isVip && (
            <ParticipateBanner
              status={participationStatus}
              role={participationRole}
              membershipStatus={membershipStatus}
              pendingExhibitor={pendingExhibitor}
              onPress={() => navigation.navigate('Participate')}
            />
          )}

          {/* ── Badge Banner ───────────────────────────── */}
          <Pressable
            onPress={() => setBadgeModalVisible(true)}
            className="mx-4 mb-5 rounded-2xl overflow-hidden active:opacity-80"
          >
            <Image
              source={BADGE_BANNER}
              style={{ width: '100%', height: undefined, aspectRatio: BADGE_BANNER_RATIO }}
              resizeMode="stretch"
            />
          </Pressable>

          {/* ── Countdown ──────────────────────────────── */}
          <Card className="mx-4 mb-4">
            <Card.Body>
              <Text className={`text-[10px] font-bold text-muted ${latinLabel()} mb-3`}>
                {t('home.eventOpening')}
              </Text>
              <View className="flex-row justify-center items-start" style={{ gap: 8 }}>
                <CountdownDigit value={timeLeft.d} label={t('home.days')} />
                <Text className="text-xl font-light text-muted" style={{ marginTop: 16 }}>:</Text>
                <CountdownDigit value={timeLeft.h} label={t('home.hours')} />
                <Text className="text-xl font-light text-muted" style={{ marginTop: 16 }}>:</Text>
                <CountdownDigit value={timeLeft.m} label={t('home.minutes')} />
                <Text className="text-xl font-light text-muted" style={{ marginTop: 16 }}>:</Text>
                <CountdownDigit value={timeLeft.s} label={t('home.seconds')} />
              </View>
            </Card.Body>
          </Card>

          {/* ── Stats ──────────────────────────────────── */}
          <View className="flex-row px-4 mb-4" style={{ gap: 12 }}>
            <Card className="flex-1">
              <Card.Body className="items-center py-4">
                <Text className="text-3xl font-extrabold text-accent">{todayCount}</Text>
                <Text className="text-[11px] text-muted font-semibold mt-1 text-center">
                  {t('home.scansToday')}
                </Text>
              </Card.Body>
            </Card>
            <Card className="flex-1">
              <Card.Body className="items-center py-4">
                <Text className="text-3xl font-extrabold text-foreground">{history.length}</Text>
                <Text className="text-[11px] text-muted font-semibold mt-1 text-center">
                  {t('home.totalNetwork')}
                </Text>
              </Card.Body>
            </Card>
          </View>

          {/* ── Scan CTA ───────────────────────────────── */}
          <View className="px-4 mb-6">
            <Button
              variant="primary"
              size="lg"
              className="rounded-2xl"
              onPress={() => navigation.navigate('Scanner')}
            >
              <Ionicons name="qr-code-outline" size={20} color="#FFFFFF" />
              <Button.Label>{t('home.scanNow')}</Button.Label>
            </Button>
          </View>

          {/* ── Recent Contacts ────────────────────────── */}
          <View className="px-4">
            <View className="flex-row justify-between items-center mb-3">
              <View className="flex-row items-center" style={{ gap: 8 }}>
                <Text className="text-base font-bold text-foreground">
                  {t('home.meetingsJournal')}
                </Text>
                {history.length > 0 && (
                  <Chip size="sm" variant="soft" color="default">
                    <Chip.Label>{history.length}</Chip.Label>
                  </Chip>
                )}
              </View>
              <Pressable onPress={() => navigation.navigate('History')} hitSlop={8}>
                <Text className="text-sm font-semibold text-accent">{t('home.seeAll')}</Text>
              </Pressable>
            </View>

            {loadingHistory ? (
              [0, 1, 2].map(i => (
                <View
                  key={i}
                  className="flex-row items-center bg-surface rounded-xl px-4 py-3.5 mb-2.5"
                >
                  <Skeleton isLoading variant="shimmer">
                    <View className="w-10 h-10 rounded-full bg-surface-secondary" />
                  </Skeleton>
                  <View className="flex-1 ms-3" style={{ gap: 8 }}>
                    <Skeleton isLoading variant="shimmer">
                      <View className="h-3.5 rounded-full bg-surface-secondary" style={{ width: 128 }} />
                    </Skeleton>
                    <Skeleton isLoading variant="shimmer">
                      <View className="h-3 rounded-full bg-surface-secondary" style={{ width: 96 }} />
                    </Skeleton>
                  </View>
                </View>
              ))
            ) : history.length === 0 ? (
              <View className="items-center py-10 bg-surface rounded-2xl border border-separator">
                <Ionicons name="people-outline" size={40} color="#286EAD" />
                <Text className="text-sm font-bold text-foreground mt-3 mb-1">
                  {t('home.emptyTitle')}
                </Text>
                <Text className="text-xs text-muted text-center leading-5 px-8">
                  {t('home.emptyBody')}
                </Text>
              </View>
            ) : (
              history.slice(0, 4).map((item, index) => (
                <ContactRow
                  key={item.id || index}
                  item={item}
                  onPress={setSelectedItem}
                />
              ))
            )}
          </View>
        </ScrollView>
      </View>

      {/* ── Networking Modal ───────────────────────── */}
      <NetworkingModal
        visible={!!selectedItem}
        result={selectedItem}
        viewOnly
        onClose={() => setSelectedItem(null)}
      />

      {/* ── Badge Info Modal ───────────────────────── */}
      <Modal
        visible={badgeModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setBadgeModalVisible(false)}
      >
        <Pressable
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.65)',
            justifyContent: 'center',
            alignItems: 'center',
            paddingHorizontal: 24,
          }}
          onPress={() => setBadgeModalVisible(false)}
        >
          <Pressable onPress={() => {}}>
            <Surface className="rounded-2xl p-6 items-center" style={{ width: '100%' }}>
              <View className="w-14 h-14 rounded-full bg-accent-soft items-center justify-center mb-4">
                <Ionicons name="ticket-outline" size={28} color="#286EAD" />
              </View>
              <Text className="text-lg font-extrabold text-foreground mb-2">
                {t('home.badgeModalTitle')}
              </Text>
              <Text className="text-sm text-muted text-center leading-5 mb-6">
                {t('home.badgeModalBody')}
              </Text>
              <Button
                variant="primary"
                size="md"
                className="rounded-xl w-full"
                onPress={() => setBadgeModalVisible(false)}
              >
                <Button.Label className="flex-1 text-center">{t('common.ok')}</Button.Label>
              </Button>
            </Surface>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  // Lifted off the background so the CTA reads as the top layer of the page.
  participateShadow: {
    shadowColor: '#286EAD',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 10,
  },
  participateCard: {
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 20,
    overflow: 'hidden',
  },
  participateIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.20)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.30)',
  },
  participateArrow: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  // Decorative only — clipped by the card's `overflow: hidden`.
  participateGlowTop: {
    position: 'absolute',
    top: -56,
    right: -32,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(255,255,255,0.13)',
  },
  participateGlowBottom: {
    position: 'absolute',
    bottom: -70,
    left: -30,
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
});
