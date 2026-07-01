import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  Alert,
  Pressable,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { withUniwind } from 'uniwind';
import {
  Avatar,
  Chip,
  ListGroup,
  SearchField,
  Separator,
  Skeleton,
} from 'heroui-native';
import { useAuth } from '../context/AuthContext';
import { networkingHistory, deleteNetworkingRecord } from '../services/api';
import NetworkingModal from '../components/NetworkingModal';

const StyledIonicons = withUniwind(Ionicons);

export default function HistoryScreen() {
  const { badgeNumber } = useAuth();
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
    }, [badgeNumber])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchHistory();
  };

  const handleDelete = (item) => {
    Alert.alert(
      'Supprimer cette rencontre ?',
      `Retirer ${item?.person?.name || 'ce contact'} de votre journal ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            setDeleting(item.id);
            try {
              await deleteNetworkingRecord(item.id, badgeNumber);
              setHistory(prev => prev.filter(h => h.id !== item.id));
            } catch {
              Alert.alert('Erreur', 'Impossible de supprimer cette entrée.');
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
      <StatusBar style="light" />

      {/* ── Header ─────────────────────────────────── */}
      <View className="px-6 pt-5 pb-4 flex-row items-center justify-between">
        <Text className="text-2xl font-extrabold text-foreground">Journal</Text>
        {history.length > 0 && (
          <Chip size="sm" variant="soft" color="default">
            <Chip.Label>{history.length} rencontres</Chip.Label>
          </Chip>
        )}
      </View>

      {/* ── Search ─────────────────────────────────── */}
      <View className="px-6 mb-4">
        <SearchField value={query} onChange={setQuery}>
          <SearchField.Group>
            <SearchField.SearchIcon />
            <SearchField.Input placeholder="Nom, entreprise, rôle..." />
            <SearchField.ClearButton />
          </SearchField.Group>
        </SearchField>
      </View>

      {/* ── List ───────────────────────────────────── */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#286EAD" />
        }
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 120 }}
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
              {query ? 'Aucun résultat' : 'Encore aucune rencontre'}
            </Text>
            <Text className="text-sm text-muted text-center leading-5 px-8">
              {query
                ? `Aucun contact correspondant à "${query}".`
                : 'Votre réseau commencera à grandir ici dès votre premier scan.'}
            </Text>
          </View>
        ) : (
          <ListGroup>
            {filtered.map((item, index) => {
              const role = item?.person?.role || 'Visiteur';
              const name = item?.person?.name || 'Inconnu';
              const company = item?.person?.company || 'Indépendant';
              const initial = name[0]?.toUpperCase() || '?';
              const isExposant = role === 'Exposant';

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
                      <Avatar
                        size="sm"
                        color={isExposant ? 'success' : 'default'}
                        variant="soft"
                      >
                        <Avatar.Fallback>{initial}</Avatar.Fallback>
                      </Avatar>
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
