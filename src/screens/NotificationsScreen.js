import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  RefreshControl,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { withUniwind } from 'uniwind';
import { useTranslation } from 'react-i18next';
import { Chip, Skeleton } from 'heroui-native';
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from '../services/api';

const StyledIonicons = withUniwind(Ionicons);

// Ionicon + accent colour per notification `type` sent by the backend.
const TYPE_ICONS = {
  connection: { icon: 'people', color: '#2db067' },
  appointment: { icon: 'calendar', color: '#286EAD' },
  general: { icon: 'notifications', color: '#286EAD' },
};

function typeMeta(type) {
  return TYPE_ICONS[type] || TYPE_ICONS.general;
}

export default function NotificationsScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);

  const unreadCount = items.filter(n => !n.read).length;

  const fetchNotifications = async () => {
    try {
      const res = await getNotifications();
      setItems(res?.data?.notifications || []);
    } catch {}
    finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchNotifications();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchNotifications();
  };

  const handleMarkAllRead = async () => {
    if (!unreadCount || markingAll) return;
    const now = new Date().toISOString();
    // Optimistic: the list flips to "read" immediately, reverted on failure.
    const previous = items;
    setItems(prev => prev.map(n => (n.read ? n : { ...n, read: true, read_at: now })));
    setMarkingAll(true);
    try {
      await markAllNotificationsRead();
    } catch {
      setItems(previous);
    } finally {
      setMarkingAll(false);
    }
  };

  const handlePress = async (item) => {
    if (!item.read) {
      setItems(prev =>
        prev.map(n => (n.id === item.id ? { ...n, read: true, read_at: new Date().toISOString() } : n))
      );
      markNotificationRead(item.id).catch(() => {});
    }

    if (item.type === 'connection') {
      navigation.navigate('Main', { screen: 'History' });
    } else if (item.type === 'appointment') {
      navigation.navigate('Main', { screen: 'RDV' });
    }
  };

  const formatDate = (iso) => {
    if (!iso) return '';
    const date = new Date(iso);
    const today = new Date();
    const isToday = date.toDateString() === today.toDateString();
    const time = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    if (isToday) return t('notifications.todayAt', { time });
    return `${date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })} ${time}`;
  };

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>

      {/* ── Header ─────────────────────────────────── */}
      <View className="px-4 pt-5 pb-4 flex-row items-center" style={{ gap: 12 }}>
        <Pressable
          onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Main'))}
          className="w-10 h-10 rounded-xl bg-surface items-center justify-center active:opacity-70"
          hitSlop={8}
        >
          <StyledIonicons name="chevron-back" size={22} className="text-foreground" />
        </Pressable>
        <Text className="flex-1 text-2xl font-extrabold text-foreground">
          {t('notifications.title')}
        </Text>
        {unreadCount > 0 && (
          <Chip size="sm" variant="soft" color="accent">
            <Chip.Label>{t('notifications.unreadCount', { count: unreadCount })}</Chip.Label>
          </Chip>
        )}
      </View>

      {/* ── Mark all as read ───────────────────────── */}
      {items.length > 0 && (
        <View className="px-4 mb-3 items-end">
          <Pressable
            onPress={handleMarkAllRead}
            disabled={!unreadCount || markingAll}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={t('notifications.markAllRead')}
            className={[
              'flex-row items-center rounded-xl bg-surface border border-separator px-3 py-2',
              unreadCount && !markingAll ? 'active:opacity-70' : 'opacity-40',
            ].join(' ')}
            style={{ gap: 6 }}
          >
            <Ionicons name="checkmark-done" size={16} color="#286EAD" />
            <Text className="text-xs font-bold text-accent">
              {t('notifications.markAllRead')}
            </Text>
          </Pressable>
        </View>
      )}

      {/* ── List ───────────────────────────────────── */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#286EAD" />
        }
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 4, paddingBottom: 120 }}
      >
        {loading ? (
          [0, 1, 2, 3].map(i => (
            <View key={i} className="flex-row items-center bg-surface rounded-2xl px-4 py-4 mb-2.5">
              <Skeleton isLoading variant="shimmer">
                <View className="w-10 h-10 rounded-full bg-surface-secondary" />
              </Skeleton>
              <View className="flex-1 ml-3" style={{ gap: 8 }}>
                <Skeleton isLoading variant="shimmer">
                  <View className="h-3.5 rounded-full bg-surface-secondary" style={{ width: 180 }} />
                </Skeleton>
                <Skeleton isLoading variant="shimmer">
                  <View className="h-3 rounded-full bg-surface-secondary" style={{ width: 90 }} />
                </Skeleton>
              </View>
            </View>
          ))
        ) : items.length === 0 ? (
          <View className="items-center py-16">
            <Ionicons name="notifications-off-outline" size={48} color="#286EAD" />
            <Text className="text-base font-bold text-foreground mt-4 mb-2">
              {t('notifications.emptyTitle')}
            </Text>
            <Text className="text-sm text-muted text-center leading-5 px-8">
              {t('notifications.emptyBody')}
            </Text>
          </View>
        ) : (
          items.map((item) => {
            const meta = typeMeta(item.type);
            const unread = !item.read;
            return (
              <Pressable
                key={item.id}
                onPress={() => handlePress(item)}
                className={[
                  'flex-row items-start rounded-2xl px-4 py-4 mb-2.5 active:opacity-70 border',
                  unread ? 'bg-accent-soft border-accent' : 'bg-surface border-separator',
                ].join(' ')}
              >
                <View
                  className="w-10 h-10 rounded-full items-center justify-center"
                  style={{ backgroundColor: `${meta.color}22` }}
                >
                  <Ionicons
                    name={unread ? meta.icon : `${meta.icon}-outline`}
                    size={19}
                    color={meta.color}
                  />
                </View>

                <View className="flex-1 ml-3">
                  <Text
                    className={[
                      'text-sm text-foreground',
                      unread ? 'font-extrabold' : 'font-medium',
                    ].join(' ')}
                  >
                    {item.title || item.name || t(`notifications.type.${item.type}`, {
                      defaultValue: t('notifications.type.general'),
                    })}
                  </Text>
                  <Text
                    className={[
                      'text-xs mt-1 leading-5',
                      unread ? 'text-foreground' : 'text-muted',
                    ].join(' ')}
                  >
                    {item.message}
                  </Text>
                  <Text className="text-[10px] text-muted font-medium mt-1.5">
                    {formatDate(item.created_at)}
                  </Text>
                </View>

                {unread && <View className="w-2.5 h-2.5 rounded-full bg-accent mt-1.5 ml-2" />}
              </Pressable>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}
