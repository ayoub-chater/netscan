import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  Linking,
  Alert,
} from 'react-native';
import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { StatusBar } from 'expo-status-bar';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { withUniwind } from 'uniwind';
import {
  Avatar,
  BottomSheet,
  Button,
  Card,
  Chip,
  ListGroup,
  SearchField,
  Separator,
  Skeleton,
  Surface,
  TagGroup,
} from 'heroui-native';
import { getExposants, networkingHistory, deleteNetworkingRecord } from '../services/api';
import { useAuth } from '../context/AuthContext';

const StyledIonicons = withUniwind(Ionicons);

const CATEGORIES = ['Tous', 'Tech', 'Startups', 'AI', 'Finance', 'Santé', 'Logistique'];

function ExposantCard({ item, isMine, onPress }) {
  const displayName = item.company || item.name;
  const initials = displayName ? displayName.slice(0, 2).toUpperCase() : '??';

  return (
    <Card className="mb-3">
      <Card.Header>
        <View className="flex-row items-center" style={{ gap: 12 }}>
          <Avatar size="md" color={isMine ? 'success' : 'default'} variant="soft">
            <Avatar.Fallback>{initials}</Avatar.Fallback>
          </Avatar>
          <View className="flex-1" style={{ gap: 4 }}>
            <Text className="text-base font-bold text-foreground" numberOfLines={1}>
              {displayName}
            </Text>
            {item.secteur ? (
              <Chip size="sm" variant="soft" color="default">
                <Chip.Label>{item.secteur}</Chip.Label>
              </Chip>
            ) : null}
          </View>
          {isMine ? (
            <Chip size="sm" variant="soft" color="success">
              <Chip.Label>Moi</Chip.Label>
            </Chip>
          ) : null}
        </View>
      </Card.Header>
      {item.description || item.email ? (
        <Card.Body>
          <Text className="text-sm text-muted leading-5" numberOfLines={2}>
            {item.description || item.email}
          </Text>
        </Card.Body>
      ) : null}
      <Card.Footer>
        <Button
          variant={isMine ? 'primary' : 'secondary'}
          size="sm"
          className="rounded-xl flex-1"
          onPress={() => onPress(item)}
        >
          <Button.Label>{isMine ? 'Mon profil' : 'Voir détails'}</Button.Label>
        </Button>
      </Card.Footer>
    </Card>
  );
}

export default function ExposantsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { exhibitorId, badgeNumber } = useAuth();
  const [connectedMap, setConnectedMap] = useState(new Map()); // email → scan_id
  const [deletingConnection, setDeletingConnection] = useState(false);
  const [exposants, setExposants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetExposant, setSheetExposant] = useState(null);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('Tous');

  const load = async () => {
    try {
      const [exposantsRes, historyRes] = await Promise.allSettled([
        getExposants(),
        badgeNumber ? networkingHistory(badgeNumber) : Promise.resolve(null),
      ]);

      if (exposantsRes.status === 'fulfilled') {
        setExposants(exposantsRes.value?.data?.data || []);
      } else {
        setExposants([]);
      }

      if (historyRes.status === 'fulfilled' && historyRes.value?.data?.history) {
        const map = new Map();
        historyRes.value.data.history.forEach(h => {
          const email = h?.person?.email?.toLowerCase();
          if (email && !map.has(email)) {
            map.set(email, h.id);
          }
        });
        setConnectedMap(map);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const isMineCheck = (item) => !!exhibitorId && item.exhibitor_id === exhibitorId;

  const openDetail = (item) => {
    setSheetExposant(item);
    setSheetOpen(true);
  };

  const openLink = (url) => {
    if (!url) return;
    const prefixed = url.startsWith('http') ? url : `https://${url}`;
    Linking.openURL(prefixed).catch(() => {});
  };

  const handleDeleteConnection = () => {
    const email = sheetExposant?.email?.toLowerCase();
    const scanId = email ? connectedMap.get(email) : null;
    if (!scanId) return;

    Alert.alert(
      'Retirer du journal ?',
      `Supprimer la connexion avec ${sheetExposant.company || sheetExposant.name} ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            setDeletingConnection(true);
            try {
              await deleteNetworkingRecord(scanId, badgeNumber);
              setConnectedMap(prev => {
                const next = new Map(prev);
                next.delete(email);
                return next;
              });
              setSheetOpen(false);
            } catch {
              Alert.alert('Erreur', 'Impossible de supprimer cette connexion.');
            } finally {
              setDeletingConnection(false);
            }
          },
        },
      ]
    );
  };

  const filtered = (() => {
    let list = exposants;
    if (search.trim()) {
      list = list.filter(e =>
        e.company?.toLowerCase().includes(search.toLowerCase()) ||
        e.name?.toLowerCase().includes(search.toLowerCase()) ||
        e.secteur?.toLowerCase().includes(search.toLowerCase())
      );
    }
    if (activeCategory !== 'Tous') {
      list = list.filter(e =>
        e.secteur?.toLowerCase().includes(activeCategory.toLowerCase())
      );
    }
    const rank = (item) => {
      if (isMineCheck(item)) return 2;
      if (item.email && connectedMap.has(item.email.toLowerCase())) return 1;
      return 0;
    };
    return [...list].sort((a, b) => rank(b) - rank(a));
  })();

  // Persistent data for close animation
  const displayName = sheetExposant ? (sheetExposant.company || sheetExposant.name) : '';
  const sheetInitials = displayName ? displayName.slice(0, 2).toUpperCase() : '??';
  const isMine = sheetExposant ? isMineCheck(sheetExposant) : false;
  const isConnected = sheetExposant?.email
    ? connectedMap.has(sheetExposant.email.toLowerCase())
    : false;

  const contactItems = sheetExposant
    ? [
        sheetExposant.email && {
          icon: 'mail-outline',
          label: 'Email',
          value: sheetExposant.email,
          onPress: () => Linking.openURL(`mailto:${sheetExposant.email}`),
        },
        sheetExposant.phone && {
          icon: 'call-outline',
          label: 'Téléphone',
          value: sheetExposant.phone,
          onPress: () => Linking.openURL(`tel:${sheetExposant.phone}`),
        },
        sheetExposant.address && {
          icon: 'location-outline',
          label: 'Adresse',
          value: sheetExposant.address,
          onPress: null,
        },
        sheetExposant.website && {
          icon: 'globe-outline',
          label: 'Site web',
          value: sheetExposant.website,
          onPress: () => openLink(sheetExposant.website),
        },
      ].filter(Boolean)
    : [];

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      <StatusBar style="light" />

      {/* ── Header ─────────────────────────────────── */}
      <View className="px-6 pt-5 pb-4 flex-row items-center justify-between">
        <Text className="text-2xl font-extrabold text-foreground">Exposants</Text>
        {exposants.length > 0 && (
          <Chip size="sm" variant="soft" color="default">
            <Chip.Label>{exposants.length}</Chip.Label>
          </Chip>
        )}
      </View>

      {/* ── Search ─────────────────────────────────── */}
      <View className="px-6 mb-4">
        <SearchField value={search} onChange={setSearch}>
          <SearchField.Group>
            <SearchField.SearchIcon />
            <SearchField.Input placeholder="Rechercher un exposant..." />
            <SearchField.ClearButton />
          </SearchField.Group>
        </SearchField>
      </View>

      {/* ── Category Filter ────────────────────────── */}
      <View className="px-6 mb-4">
        <TagGroup
          selectionMode="single"
          selectedKeys={new Set([activeCategory])}
          onSelectionChange={keys => {
            const first = [...keys][0];
            if (first) setActiveCategory(String(first));
          }}
          size="sm"
        >
          <TagGroup.List style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {CATEGORIES.map(cat => (
              <TagGroup.Item key={cat} id={cat}>{cat}</TagGroup.Item>
            ))}
          </TagGroup.List>
        </TagGroup>
      </View>

      {/* ── Exposant List ──────────────────────────── */}
      {loading ? (
        <View className="px-6" style={{ gap: 12 }}>
          {[0, 1, 2].map(i => (
            <Card key={i}>
              <Card.Body>
                <View className="flex-row items-center" style={{ gap: 12 }}>
                  <Skeleton isLoading variant="shimmer">
                    <View className="w-12 h-12 rounded-full bg-surface-secondary" />
                  </Skeleton>
                  <View className="flex-1" style={{ gap: 8 }}>
                    <Skeleton isLoading variant="shimmer">
                      <View
                        className="h-4 rounded-full bg-surface-secondary"
                        style={{ width: 160 }}
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
              </Card.Body>
            </Card>
          ))}
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => String(item.id)}
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#286EAD" />
          }
          renderItem={({ item }) => (
            <ExposantCard item={item} isMine={isMineCheck(item)} onPress={openDetail} />
          )}
          ListEmptyComponent={
            <View className="items-center py-16">
              <Ionicons name="business-outline" size={48} color="#2db067" />
              <Text className="text-base font-bold text-foreground mt-4 mb-2">
                Aucun exposant trouvé
              </Text>
              <Text className="text-sm text-muted text-center leading-5 px-8">
                Les exposants apparaîtront ici une fois l'événement configuré.
              </Text>
            </View>
          }
        />
      )}

      {/* ── Detail BottomSheet ─────────────────────── */}
      <BottomSheet
        isOpen={sheetOpen}
        onOpenChange={open => {
          if (!open) setSheetOpen(false);
        }}
      >
        <BottomSheet.Portal>
          <BottomSheet.Overlay />
          <BottomSheet.Content
            snapPoints={['85%']}
            enableOverDrag={false}
            enableDynamicSizing={false}
            contentContainerClassName="h-full"
          >
            <BottomSheetScrollView contentContainerStyle={{ paddingBottom: 40 }}>
              {/* Hero */}
              <View className="items-center pt-3 pb-6 px-6 border-b border-separator">
                <Avatar size="lg" color={isMine ? 'success' : 'default'} variant="soft">
                  <Avatar.Fallback>{sheetInitials}</Avatar.Fallback>
                </Avatar>
                <Text className="text-xl font-extrabold text-foreground mt-4 mb-2 text-center">
                  {displayName}
                </Text>
                <View className="flex-row items-center" style={{ gap: 8 }}>
                  {sheetExposant?.secteur ? (
                    <Chip size="sm" variant="soft" color="default">
                      <Chip.Label>{sheetExposant.secteur}</Chip.Label>
                    </Chip>
                  ) : null}
                  {isMine ? (
                    <Chip size="sm" variant="soft" color="success">
                      <Chip.Label>Votre organisation</Chip.Label>
                    </Chip>
                  ) : null}
                </View>
              </View>

              {/* Contact info */}
              {contactItems.length > 0 ? (
                <View className="px-6 pt-5">
                  <Text className="text-[10px] font-bold text-muted uppercase tracking-widest mb-3">
                    Contact
                  </Text>
                  <ListGroup>
                    {contactItems.map((ci, index) => (
                      <React.Fragment key={ci.label}>
                        {index > 0 && <Separator className="mx-4" />}
                        <ListGroup.Item onPress={ci.onPress} disabled={!ci.onPress}>
                          <ListGroup.ItemPrefix>
                            <Ionicons
                              name={ci.icon}
                              size={18}
                              color="#2db067"
                            />
                          </ListGroup.ItemPrefix>
                          <ListGroup.ItemContent>
                            <ListGroup.ItemDescription>{ci.label}</ListGroup.ItemDescription>
                            <ListGroup.ItemTitle numberOfLines={1}>{ci.value}</ListGroup.ItemTitle>
                          </ListGroup.ItemContent>
                          {ci.onPress ? <ListGroup.ItemSuffix /> : null}
                        </ListGroup.Item>
                      </React.Fragment>
                    ))}
                  </ListGroup>
                </View>
              ) : null}

              {/* Description */}
              {sheetExposant?.description ? (
                <View className="px-6 pt-5">
                  <Text className="text-[10px] font-bold text-muted uppercase tracking-widest mb-3">
                    À propos
                  </Text>
                  <Surface className="rounded-xl p-4">
                    <Text className="text-sm text-muted leading-5">
                      {sheetExposant.description}
                    </Text>
                  </Surface>
                </View>
              ) : null}

              {/* Action buttons */}
              <View className="px-6 pt-6" style={{ gap: 12 }}>
                {isMine ? (
                  <Button
                    variant="primary"
                    size="lg"
                    className="rounded-2xl"
                    onPress={() => {
                      setSheetOpen(false);
                      navigation.navigate('Team');
                    }}
                  >
                    <Button.Label>Mon Équipe</Button.Label>
                  </Button>
                ) : null}
                {isConnected && !isMine ? (
                  <Button
                    variant="tertiary"
                    size="lg"
                    className="rounded-2xl"
                    onPress={handleDeleteConnection}
                    disabled={deletingConnection}
                  >
                    <Ionicons
                      name="trash-outline"
                      size={18}
                      color="#EF4444"
                    />
                    <Button.Label style={{ color: '#EF4444' }}>
                      {deletingConnection ? 'Suppression…' : 'Retirer du journal'}
                    </Button.Label>
                  </Button>
                ) : null}
                <Button
                  variant="tertiary"
                  size="lg"
                  className="rounded-2xl"
                  onPress={() => setSheetOpen(false)}
                >
                  <Button.Label>Fermer</Button.Label>
                </Button>
              </View>
            </BottomSheetScrollView>
          </BottomSheet.Content>
        </BottomSheet.Portal>
      </BottomSheet>
    </View>
  );
}
