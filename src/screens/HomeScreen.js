import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Image,
  RefreshControl,
  Modal,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
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
import { networkingHistory } from '../services/api';
import NetworkingModal from '../components/NetworkingModal';

const StyledIonicons = withUniwind(Ionicons);

const DAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

function CountdownDigit({ value, label }) {
  const { isDark } = useTheme();
  return (
    <View className="items-center">
      <View className="w-[62px] h-[62px] rounded-xl bg-surface border border-separator items-center justify-center">
        <Text className="text-2xl font-extrabold" style={{ color: isDark ? '#FFFFFF' : '#286EAD' }}>{value}</Text>
      </View>
      <Text className="text-[10px] font-semibold text-muted mt-1 uppercase tracking-widest">
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
      <View className="flex-1 ml-3">
        <Text className="text-sm font-bold text-foreground">{name}</Text>
        <Text className="text-xs text-muted mt-0.5">{company}</Text>
      </View>
      <View className="items-end" style={{ gap: 6 }}>
        <Chip size="sm" variant="soft" color={isExposant ? 'success' : 'default'}>
          <Chip.Label>{role}</Chip.Label>
        </Chip>
        <Text className="text-[10px] text-muted font-medium">{timeStr}</Text>
      </View>
    </Pressable>
  );
}

export default function HomeScreen({ navigation }) {
  const { t, i18n } = useTranslation();
  const { scanner, badgeNumber, eventInfo } = useAuth();
  const { translateY } = useTabBar();
  const insets = useSafeAreaInsets();
  const lastScrollY = useRef(0);
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [badgeModalVisible, setBadgeModalVisible] = useState(false);
  const [timeLeft, setTimeLeft] = useState({ d: '00', h: '00', m: '00', s: '00' });
  const [displayedHi, setDisplayedHi] = useState('');
  const [displayedName, setDisplayedName] = useState('');

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

  useFocusEffect(
    React.useCallback(() => {
      loadHistory();
    }, [badgeNumber])
  );

  useFocusEffect(
    React.useCallback(() => {
      const fullHi = t('home.greeting');
      const fullName = scanner?.name || t('home.friend');
      let hiIndex = 0;
      let nameIndex = 0;
      let timeout1, timeout2;

      setDisplayedHi('');
      setDisplayedName('');

      const typeHi = () => {
        if (hiIndex < fullHi.length) {
          setDisplayedHi(fullHi.slice(0, hiIndex + 1));
          hiIndex++;
          timeout1 = setTimeout(typeHi, 40);
        } else {
          timeout1 = setTimeout(typeName, 100);
        }
      };

      const typeName = () => {
        if (nameIndex < fullName.length) {
          setDisplayedName(fullName.slice(0, nameIndex + 1));
          nameIndex++;
          timeout2 = setTimeout(typeName, 40);
        }
      };

      timeout1 = setTimeout(typeHi, 300);

      return () => {
        clearTimeout(timeout1);
        clearTimeout(timeout2);
      };
    }, [scanner?.name, i18n.language])
  );

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
  const isExposant = role === 'Exposant';
  const scannerInitial = (scanner?.name || t('home.friend'))[0]?.toUpperCase() || '?';
  const profileImage = isExposant
    ? scanner?.exhibitor_logo || scanner?.image
    : scanner?.image;
  const currentDayIndex = (new Date().getDay() + 6) % 7;

  const todayCount = history.filter(h => {
    if (!h.scanned_at) return false;
    return new Date(h.scanned_at).toDateString() === new Date().toDateString();
  }).length;

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
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
        <View className="px-3 pt-5 pb-4 flex-row items-end justify-between">
          <View className="flex-row items-center" style={{ gap: 12, flex: 1 }}>
            {profileImage ? (
              <Image
                source={{ uri: profileImage }}
                style={{ width: 48, height: 48, borderRadius: 24 }}
                resizeMode="cover"
              />
            ) : (
              <Avatar size="lg" color={isExposant ? 'success' : 'default'} variant="soft">
                <Avatar.Fallback>{scannerInitial}</Avatar.Fallback>
              </Avatar>
            )}
            <View style={{ minHeight: 64, justifyContent: 'flex-end', flex: 1 }}>
              <Text className="text-base font-medium text-muted">
                {displayedHi || '​'}
              </Text>
              <Text className="text-2xl font-extrabold text-foreground leading-tight">
                {displayedName || '​'}
              </Text>
            </View>
          </View>
          <Pressable
            onPress={() => navigation.navigate('MyBadge')}
            className="flex-row items-center bg-surface rounded-xl py-1.5 pl-3 pr-1.5 active:opacity-70"
            hitSlop={8}
            style={{ gap: 8 }}
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
          {DAYS.map((d, i) => {
            const isActive = i === currentDayIndex;
            return (
              <View
                key={d}
                className={[
                  'items-center px-3 py-2 rounded-xl',
                  isActive ? 'bg-accent' : 'bg-surface',
                ].join(' ')}
              >
                <Text
                  className={`text-xs font-bold ${isActive ? 'text-accent-foreground' : 'text-muted'}`}
                >
                  {d}
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

        {/* ── Badge Banner ───────────────────────────── */}
        <Pressable
          onPress={() => setBadgeModalVisible(true)}
          className="mx-4 mb-5 rounded-2xl overflow-hidden active:opacity-80"
          style={{ height: 140 }}
        >
          <Image
            source={require('../../assets/banner-badge.png')}
            style={{ width: '100%', height: '100%' }}
            resizeMode="cover"
          />
        </Pressable>

        {/* ── Countdown ──────────────────────────────── */}
        <Card className="mx-4 mb-4">
          <Card.Body>
            <Text className="text-[10px] font-bold text-muted uppercase tracking-widest mb-3">
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
                <View className="flex-1 ml-3" style={{ gap: 8 }}>
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
