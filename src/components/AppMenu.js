import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Image,
  BackHandler,
  useWindowDimensions,
  StyleSheet,
  Linking,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  interpolate,
  Extrapolation,
  Easing,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { Avatar, Chip } from 'heroui-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useTabBar, TAB_BAR_HIDDEN_OFFSET } from '../context/TabBarContext';
import { navigationRef, navigateFromRoot } from '../navigation/navigationRef';
import { roleLabel, PARTICIPATE_ICON } from '../constants/roles';
import { EVENT_WEBSITE_URL } from '../constants/api';
import { forwardIcon, isRTL, latinLabel } from '../utils/rtl';

const ACCENT = '#286EAD';
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// Each entry reuses the icon the destination already uses elsewhere in the app
// (floating tab bar / profile list), so the menu reads as the same navigation.
const ITEMS = [
  // Highlighted: this is how a plain visitor becomes an exposant, intervenant,
  // sponsor… so it sits first and gets accent styling.
  { key: 'participate', icon: PARTICIPATE_ICON, route: 'Participate', highlight: true },
  // Everyone taking part who is not a stand — intervenants, sponsors,
  // partenaires, institutions, presse. Sits above the exhibitor directory
  // because it is the wider of the two.
  { key: 'partners', icon: 'ribbon', route: 'Partenaires' },
  { key: 'exhibitors', icon: 'storefront', route: 'Exposants' },
  { key: 'scan', icon: 'qr-code', route: 'Scanner' },
  { key: 'network', icon: 'people', route: 'History' },
  { key: 'b2b', icon: 'briefcase', route: 'RDV' },
  { key: 'conference', icon: 'easel', route: 'Conference' },
  { key: 'programme', icon: 'document-text', route: 'Programme' },
  { key: 'plan', icon: 'map', route: 'Plan' },
  // Opens the event site in the phone's browser, not in an in-app WebView.
  { key: 'event', icon: 'globe', url: EVENT_WEBSITE_URL },
  { key: 'badge', icon: 'id-card', route: 'MyBadge' },
  { key: 'team', icon: 'people-circle', route: 'Team', exposantOnly: true },
  { key: 'settings', icon: 'person', route: 'Détails' },
];

function MenuRow({ item, index, progress, onPress, badge, isActive }) {
  const { t } = useTranslation();
  const rtl = isRTL();

  // Rows cascade out of the corner as the panel opens, and fold back on close.
  const style = useAnimatedStyle(() => {
    const start = Math.min(0.1 + index * 0.05, 0.55);
    const end = start + 0.45;
    const p = interpolate(progress.value, [start, end], [0, 1], Extrapolation.CLAMP);
    return {
      opacity: p,
      transform: [
        { translateX: interpolate(p, [0, 1], [rtl ? 22 : -22, 0]) },
        { translateY: interpolate(p, [0, 1], [10, 0]) },
      ],
    };
  }, [rtl]);

  return (
    <Animated.View style={style}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        // Screen readers announce the current page rather than relying on colour.
        accessibilityState={{ selected: isActive }}
        // Accent tint means "you are here". A promoted row is lifted with a
        // neutral surface instead, so a call-to-action never reads as the
        // current page.
        className={[
          'flex-row items-center rounded-2xl px-3 py-3 active:opacity-60',
          isActive ? 'bg-accent-soft' : '',
          !isActive && item.highlight ? 'bg-surface-secondary' : '',
        ].join(' ')}
        style={{ gap: 14 }}
        android_ripple={{ color: 'rgba(40,110,173,0.12)' }}
      >
        <View
          className={[
            'w-11 h-11 rounded-2xl items-center justify-center',
            isActive || item.highlight ? 'bg-accent' : 'bg-accent-soft',
          ].join(' ')}
        >
          <Ionicons
            name={item.icon}
            size={20}
            color={isActive || item.highlight ? '#FFFFFF' : ACCENT}
          />
        </View>
        <View className="flex-1">
          <View className="flex-row items-center" style={{ gap: 6 }}>
            <Text
              className={`text-[15px] font-bold ${isActive ? 'text-accent' : 'text-foreground'}`}
            >
              {t(`menu.${item.key}`)}
            </Text>
            {badge ? (
              <Chip size="sm" variant="soft" color={badge.color}>
                <Chip.Label>{badge.label}</Chip.Label>
              </Chip>
            ) : null}
          </View>
          <Text className="text-[11px] text-muted mt-0.5" numberOfLines={1}>
            {t(`menu.${item.key}Desc`)}
          </Text>
        </View>
        {/* A chevron promises navigation; you are already here, so it becomes a
            dot instead. */}
        {isActive ? (
          <View className="w-2 h-2 rounded-full bg-accent" />
        ) : (
          <Ionicons name={forwardIcon()} size={16} color={item.highlight ? ACCENT : '#9CA3AF'} />
        )}
      </Pressable>
    </Animated.View>
  );
}

const THEME_MODES = [
  { mode: 'system', labelKey: 'profile.system', icon: 'phone-portrait-outline' },
  { mode: 'light', labelKey: 'profile.light', icon: 'sunny-outline' },
  { mode: 'dark', labelKey: 'profile.dark', icon: 'moon-outline' },
];

// Segmented system/light/dark shortcut — same three modes as the Settings screen.
function ThemeSwitch({ progress }) {
  const { t } = useTranslation();
  const { themeMode, setThemeMode } = useTheme();

  const style = useAnimatedStyle(() => {
    const p = interpolate(progress.value, [0.45, 0.95], [0, 1], Extrapolation.CLAMP);
    return {
      opacity: p,
      transform: [{ translateY: interpolate(p, [0, 1], [10, 0]) }],
    };
  });

  return (
    <Animated.View style={style} className="px-4 pt-3 pb-4">
      <Text className={`text-[10px] font-bold text-muted ${latinLabel()} mb-2`}>
        {t('profile.appearance')}
      </Text>
      <View className="flex-row bg-surface rounded-2xl p-1 border border-separator" style={{ gap: 4 }}>
        {THEME_MODES.map((option) => {
          const active = themeMode === option.mode;
          return (
            <Pressable
              key={option.mode}
              onPress={() => setThemeMode(option.mode)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              className={[
                'flex-1 flex-row items-center justify-center rounded-xl py-2 active:opacity-70',
                active ? 'bg-accent' : 'bg-transparent',
              ].join(' ')}
              style={{ gap: 5 }}
            >
              <Ionicons
                name={option.icon}
                size={14}
                color={active ? '#FFFFFF' : '#9CA3AF'}
              />
              <Text
                className={`text-[11px] font-bold ${active ? 'text-accent-foreground' : 'text-muted'}`}
                numberOfLines={1}
              >
                {t(option.labelKey)}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </Animated.View>
  );
}

export default function AppMenu({ visible, onClose }) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const { scanner, participationStatus, participationRole, isExhibitorStaff, isVip } = useAuth();
  const { translateY } = useTabBar();

  // Keep the panel mounted through the closing animation.
  const [mounted, setMounted] = useState(visible);
  const progress = useSharedValue(0);

  // Which entry is the page behind the panel? This component sits above the
  // NavigationContainer (so it can draw over the floating tab bar from any
  // screen), which puts it outside navigation context — hence the ref rather
  // than `useNavigationState`. Captured when the menu opens: the route can't
  // change while it is up, and navigating closes it.
  const [activeRoute, setActiveRoute] = useState(null);
  useEffect(() => {
    if (!visible) return;
    setActiveRoute(navigationRef.isReady() ? navigationRef.getCurrentRoute()?.name ?? null : null);
  }, [visible]);

  // `onClose` is passed as an inline arrow from the host screen, so its
  // identity churns on every parent re-render (e.g. HomeScreen's 1s countdown
  // timer). Read it through a ref so the focus-effect callback below stays
  // referentially stable and doesn't get re-subscribed (and its stale
  // cleanup re-fired) on every unrelated re-render.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      progress.value = withSpring(1, { damping: 18, stiffness: 170, mass: 0.6 });
      // The floating tab bar is a sibling of the screens, so it would sit on top
      // of the overlay on Android — tuck it away while the menu is open.
      translateY.value = withTiming(TAB_BAR_HIDDEN_OFFSET);
      return;
    }

    progress.value = withTiming(0, { duration: 200, easing: Easing.in(Easing.cubic) });
    translateY.value = withTiming(0);

    // Unmount on a timer rather than the animation callback: an interrupted
    // animation never reports `finished`, which used to leave an invisible
    // full-screen overlay swallowing every tap.
    const timer = setTimeout(() => setMounted(false), 220);
    return () => clearTimeout(timer);
  }, [visible]);

  // The panel lives above the navigator now, so it survives screen changes.
  // Any navigation (bottom nav, deep link, hardware back) must still fold it
  // away and hand the tab bar back. Route the close through `onClose` — the
  // same path a normal close takes — rather than poking `mounted`/`progress`
  // directly, which used to leave the panel stuck non-interactive.
  useEffect(() => {
    let cancelled = false;
    let unsubscribe;

    const attach = () => {
      if (cancelled) return;
      // The container mounts alongside this panel, so on a cold start the ref
      // can still be a frame away from ready.
      if (!navigationRef.isReady()) {
        requestAnimationFrame(attach);
        return;
      }
      unsubscribe = navigationRef.addListener('state', () => {
        translateY.value = 0;
        onCloseRef.current();
      });
    };

    attach();
    return () => {
      cancelled = true;
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // `translateY` is owned by the TabBarContext, so it must always resolve even
  // if this component unmounts while open (e.g. logout).
  useEffect(
    () => () => {
      translateY.value = 0;
    },
    []
  );

  // Android hardware back closes the menu instead of leaving the screen.
  useEffect(() => {
    if (!visible) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });
    return () => sub.remove();
  }, [visible, onClose]);

  const role = scanner?.role || t('profile.defaultRole');
  const isExposant = role.toLowerCase() === 'exposant';
  const name = scanner?.name || t('profile.defaultName');
  const initial = name[0]?.toUpperCase() || '?';
  const photo = isExposant ? scanner?.exhibitor_logo || scanner?.image : scanner?.image;
  const isPending = participationStatus === 'pending';
  // Shown for anyone attached to an organisation; for staff it's the exhibitor
  // that added them, which the backend resolves into `company`.
  const company = isExhibitorStaff || isExposant ? scanner?.company : null;

  // Staff already take part through the exhibitor that added them — hide the
  // Participer row for them, and Team stays owner-only.
  const items = ITEMS.filter((i) => {
    if (i.key === 'participate' && (isExhibitorStaff || isVip)) return false;
    return !i.exposantOnly || (isExposant && !isExhibitorStaff);
  });

  // The Participer row carries the request's state so the drawer answers
  // "where is my application?" without opening the screen.
  const participateBadge =
    participationStatus === 'pending'
      ? { label: t('participate.badgePending'), color: 'warning' }
      : participationStatus === 'approved'
      ? { label: roleLabel(participationRole) || t('participate.badgeApproved'), color: 'success' }
      : participationStatus === 'rejected'
      ? { label: t('participate.badgeRejected'), color: 'danger' }
      : null;

  const rtl = isRTL();
  const panelWidth = Math.min(width - 32, 340);
  // Logical edge, not a branch on `rtl`: the panel hangs off the same corner
  // as the hamburger, which is the header's start. Picking `right` by hand in
  // RTL was flipping twice on Android, where the surface swap rewrites a
  // physical `right` to `end` and landed the panel on the opposite corner
  // from iOS. `transformOrigin` below still needs the branch — transforms are
  // never mirrored.
  const anchorSide = { insetInlineStart: 16 };
  // Centre the halo on the hamburger button itself so the burst starts at the corner.
  const haloAnchor = { insetInlineStart: -44 };

  const go = (item) => {
    onClose();
    if (item.url) {
      Linking.openURL(item.url).catch(() => {});
      return;
    }
    // Let the fold-back animation play before the screen swaps underneath.
    setTimeout(() => navigateFromRoot(item.route), 180);
  };

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0, 1], Extrapolation.CLAMP),
  }));

  // Grows out of the top corner: scale + a short slide along both axes.
  const panelStyle = useAnimatedStyle(() => {
    const p = progress.value;
    return {
      opacity: interpolate(p, [0, 0.35, 1], [0, 1, 1], Extrapolation.CLAMP),
      transform: [
        { translateX: interpolate(p, [0, 1], [rtl ? 34 : -34, 0]) },
        { translateY: interpolate(p, [0, 1], [-34, 0]) },
        { scale: interpolate(p, [0, 1], [0.55, 1]) },
      ],
    };
  });

  // Accent halo bursting from the same corner as the hamburger button.
  const haloStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.4, 1], [0, 0.35, 0], Extrapolation.CLAMP),
    transform: [{ scale: interpolate(progress.value, [0, 1], [0.2, 2.4], Extrapolation.CLAMP) }],
  }));

  if (!mounted) return null;

  return (
    // Rendered inline (not in a native Modal) so it shares the app's window:
    // a Modal is a separate Android window, and the screens behind it don't
    // repaint when the theme flips, which made the switch look drawer-only.
    // Must be mounted outside the host screen's safe-area padding — the panel
    // adds its own inset below.
    // `visible` (not `mounted`) gates touches: the panel stays mounted for
    // ~220ms after closing to let the fade-out animation finish, and this
    // full-screen overlay must stop intercepting taps for the screen behind
    // it (e.g. the hamburger button) the instant it's no longer open, not
    // once its fade-out is done.
    <View style={styles.overlay} pointerEvents={visible ? 'auto' : 'none'}>
      <AnimatedPressable
        style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(3,10,20,0.55)' }, backdropStyle]}
        onPress={onClose}
      />

      <Animated.View
        pointerEvents="none"
        style={[
          styles.halo,
          haloAnchor,
          { top: insets.top - 44, backgroundColor: ACCENT },
          haloStyle,
        ]}
      />

      <Animated.View
        style={[
          styles.panel,
          anchorSide,
          {
            top: insets.top + 8,
            width: panelWidth,
            maxHeight: height - insets.top - insets.bottom - 48,
            transformOrigin: rtl ? 'top right' : 'top left',
          },
          panelStyle,
        ]}
        className="bg-background rounded-3xl border border-separator overflow-hidden"
      >
        {/* ── Panel header ─────────────────────────── */}
        <View className="px-4 pt-4 pb-3 flex-row items-center" style={{ gap: 12 }}>
          {photo ? (
            <Image
              source={{ uri: photo }}
              style={{ width: 42, height: 42, borderRadius: 21 }}
              resizeMode="cover"
            />
          ) : (
            <Avatar size="md" color={isExposant ? 'success' : 'default'} variant="soft">
              <Avatar.Fallback>{initial}</Avatar.Fallback>
            </Avatar>
          )}
          <View className="flex-1">
            <Text className="text-[15px] font-extrabold text-foreground" numberOfLines={1}>
              {name}
            </Text>
            <View className="flex-row items-center mt-1" style={{ gap: 6 }}>
              <Chip size="sm" variant="soft" color={isExposant ? 'success' : 'default'}>
                <Chip.Label>{roleLabel(role)}</Chip.Label>
              </Chip>
              {isPending ? (
                <Chip size="sm" variant="soft" color="warning">
                  <Chip.Label>{t('pending.badge')}</Chip.Label>
                </Chip>
              ) : null}
            </View>
            {/* Staff act on behalf of the exhibitor that added them, so the
                organisation is part of their identity, not a detail. */}
            {company ? (
              <View className="flex-row items-center mt-1.5" style={{ gap: 5 }}>
                <Ionicons name="business-outline" size={12} color="#9CA3AF" />
                <Text className="text-[11px] font-semibold text-muted flex-1" numberOfLines={1}>
                  {company}
                </Text>
              </View>
            ) : null}
          </View>
          <Pressable
            onPress={onClose}
            hitSlop={10}
            className="w-8 h-8 rounded-full bg-surface items-center justify-center active:opacity-60"
          >
            <Ionicons name="close" size={16} color="#9CA3AF" />
          </Pressable>
        </View>

        <View className="mx-4 border-b border-separator" />

        <Text className={`text-[10px] font-bold text-muted ${latinLabel()} px-5 pt-4 pb-1`}>
          {t('menu.title')}
        </Text>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 8, paddingBottom: 4 }}
          style={{ flexShrink: 1 }}
          bounces={false}
        >
          {items.map((item, index) => (
            <MenuRow
              key={item.key}
              item={item}
              index={index}
              progress={progress}
              badge={item.key === 'participate' ? participateBadge : null}
              // `event` opens the browser, so it is never the current page.
              isActive={!!item.route && item.route === activeRoute}
              onPress={() => go(item)}
            />
          ))}
        </ScrollView>

        {/* ── Theme shortcut ───────────────────────── */}
        <View className="mx-4 border-b border-separator" />
        <ThemeSwitch progress={progress} />
        </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
    elevation: 100,
  },
  panel: {
    position: 'absolute',
    elevation: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.32,
    shadowRadius: 24,
  },
  halo: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
  },
});
