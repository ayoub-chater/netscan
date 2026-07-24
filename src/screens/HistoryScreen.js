import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  RefreshControl,
  Alert,
  Pressable,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { withUniwind } from 'uniwind';
import { withTiming } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import {
  Avatar,
  Chip,
  ListGroup,
  SearchField,
  Separator,
  Skeleton,
} from 'heroui-native';
import { useAuth } from '../context/AuthContext';
import { useTabBar, useTabBarScroll } from '../context/TabBarContext';
import { networkingHistory, deleteNetworkingRecord } from '../services/api';
import NetworkingModal from '../components/NetworkingModal';

const StyledIonicons = withUniwind(Ionicons);

export default function HistoryScreen() {
  const { t } = useTranslation();
  const { badgeNumber } = useAuth();
  const { translateY } = useTabBar();
  const tabScroll = useTabBarScroll();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [query, setQuery] = useState('');
  const [deleting, setDeleting] = useState(null);

  const fetchHistory = async () => {
    if (!badgeNumber) {
      setLoading(false);
      return;
    }
    try {
      const res = await networkingHistory(badgeNumber);
      setHistory(res?.data?.history || []);
    } catch {}
    finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchHistory();
      // Ensure the floating navbar is visible on this sub-page.
      translateY.value = withTiming(0);
    }, [badgeNumber])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchHistory();
  };

  const handleDelete = (item) => {
    Alert.alert(
      t('history.deleteTitle'),
      t('history.deleteBody', { name: item?.person?.name || t('history.thisContact') }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            setDeleting(item.id);
            try {
              await deleteNetworkingRecord(item.id, badgeNumber);
              setHistory(prev => prev.filter(h => h.id !== item.id));
            } catch {
              Alert.alert(t('common.error'), t('history.deleteError'));
            } finally {
              setDeleting(null);
            }
          },
        },
      ]
    );
  };

  const filtered = query.trim()
    ? history.filter(item => {
        const q = query.toLowerCase();
        return (
          item?.person?.name?.toLowerCase().includes(q) ||
          item?.person?.company?.toLowerCase().includes(q) ||
          item?.person?.role?.toLowerCase().includes(q)
        );
      })
    : history;

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>

      {/* ── Header ─────────────────────────────────── */}
      <View className="px-4 pt-5 pb-4 flex-row items-center" style={{ gap: 12 }}>
        <Pressable
          onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Dashboard'))}
          className="w-10 h-10 rounded-xl bg-surface items-center justify-center active:opacity-70"
          hitSlop={8}
        >
          <StyledIonicons name="chevron-back" size={22} className="text-foreground" />
        </Pressable>
        <Text className="flex-1 text-2xl font-extrabold text-foreground">{t('history.title')}</Text>
        {history.length > 0 && (
          <Chip size="sm" variant="soft" color="default">
            <Chip.Label>{t('history.meetings', { count: history.length })}</Chip.Label>
          </Chip>
        )}
      </View>

      {/* ── Search ─────────────────────────────────── */}
      <View className="px-4 mb-4">
        <SearchField value={query} onChange={setQuery}>
          <SearchField.Group>
            <SearchField.SearchIcon />
            <SearchField.Input placeholder={t('history.searchPlaceholder')} />
            <SearchField.ClearButton />
          </SearchField.Group>
        </SearchField>
      </View>

      {/* ── List ───────────────────────────────────── */}
      <ScrollView
        {...tabScroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#286EAD" />
        }
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 120 }}
      >
        {loading ? (
          [0, 1, 2, 3, 4].map(i => (
            <View
              key={i}
              className="flex-row items-center bg-surface rounded-xl px-4 py-3.5 mb-2"
            >
              <Skeleton isLoading variant="shimmer">
                <View className="w-10 h-10 rounded-full bg-surface-secondary" />
              </Skeleton>
              <View className="flex-1 ml-3" style={{ gap: 8 }}>
                <Skeleton isLoading variant="shimmer">
                  <View
                    className="h-3.5 rounded-full bg-surface-secondary"
                    style={{ width: 140 }}
                  />
                </Skeleton>
                <Skeleton isLoading variant="shimmer">
                  <View
                    className="h-3 rounded-full bg-surface-secondary"
                    style={{ width: 100 }}
                  />
                </Skeleton>
              </View>
            </View>
          ))
        ) : filtered.length === 0 ? (
          <View className="items-center py-16">
            <Ionicons name="people-outline" size={48} color="#2db067" />
            <Text className="text-base font-bold text-foreground mt-4 mb-2">
              {query ? t('history.noResults') : t('history.noMeetingsTitle')}
            </Text>
            <Text className="text-sm text-muted text-center leading-5 px-8">
              {query
                ? t('history.noResultsBody', { query })
                : t('history.noMeetingsBody')}
            </Text>
          </View>
        ) : (
          <ListGroup>
            {filtered.map((item, index) => {
              const role = item?.person?.role || t('profile.defaultRole');
              const name = item?.person?.name || t('common.unknown');
              const company = item?.person?.company || t('common.independent');
              const initial = name[0]?.toUpperCase() || '?';
              const isExposant = role === 'Exposant';
              const photo = isExposant
                ? item?.person?.exhibitor_logo || item?.person?.image
                : item?.person?.image;

              const dateStr = item.scanned_at
                ? new Date(item.scanned_at).toLocaleDateString('fr-FR', {
                    day: '2-digit',
                    month: 'short',
                  })
                : '';
              const timeStr = item.scanned_at
                ? new Date(item.scanned_at).toLocaleTimeString('fr-FR', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : '';

              return (
                <React.Fragment key={item.id || index}>
                  {index > 0 && <Separator className="mx-4" />}
                  <ListGroup.Item onPress={() => setSelectedItem(item)}>
                    <ListGroup.ItemPrefix>
                      {photo ? (
                        <Image
                          source={{ uri: photo }}
                          style={{ width: 32, height: 32, borderRadius: 16 }}
                          resizeMode="cover"
                        />
                      ) : (
                        <Avatar
                          size="sm"
                          color={isExposant ? 'success' : 'default'}
                          variant="soft"
                        >
                          <Avatar.Fallback>{initial}</Avatar.Fallback>
                        </Avatar>
                      )}
                    </ListGroup.ItemPrefix>
                    <ListGroup.ItemContent>
                      <ListGroup.ItemTitle>{name}</ListGroup.ItemTitle>
                      <ListGroup.ItemDescription>{company}</ListGroup.ItemDescription>
                    </ListGroup.ItemContent>
                    <ListGroup.ItemSuffix>
                      <View className="flex-row items-center" style={{ gap: 10 }}>
                        <View className="items-end" style={{ gap: 4 }}>
                          <Chip
                            size="sm"
                            variant="soft"
                            color={isExposant ? 'success' : 'default'}
                          >
                            <Chip.Label>{role}</Chip.Label>
                          </Chip>
                          <Text className="text-[10px] text-muted font-medium">
                            {dateStr} {timeStr}
                          </Text>
                        </View>
                        <Pressable
                          onPress={() => handleDelete(item)}
                          hitSlop={8}
                          disabled={deleting === item.id}
                          className="w-8 h-8 rounded-xl bg-surface-secondary items-center justify-center"
                        >
                          <Ionicons
                            name="trash-outline"
                            size={15}
                            color={deleting === item.id ? '#9CA3AF' : '#EF4444'}
                          />
                        </Pressable>
                      </View>
                    </ListGroup.ItemSuffix>
                  </ListGroup.Item>
                </React.Fragment>
              );
            })}
          </ListGroup>
        )}
      </ScrollView>

      {/* ── Detail Modal ───────────────────────────── */}
      <NetworkingModal
        visible={!!selectedItem}
        result={selectedItem}
        viewOnly
        onClose={() => setSelectedItem(null)}
      />
    </View>
  );
}
