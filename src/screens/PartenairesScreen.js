import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  FlatList,
  RefreshControl,
  Linking,
} from 'react-native';
import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import {
  Avatar,
  BottomSheet,
  Button,
  Card,
  Chip,
  ListGroup,
  Separator,
  Skeleton,
  Surface,
} from 'heroui-native';
import { getPartenaires } from '../services/api';
import { useTabBarScroll } from '../context/TabBarContext';
import useSheetGuard from '../components/useSheetGuard';
import MenuButton from '../components/MenuButton';
import SearchBar from '../components/SearchBar';
import AvailabilityBadge, { AvailabilityNote } from '../components/AvailabilityBadge';
import { roleLabel } from '../constants/roles';
import { latinLabel, forwardIcon } from '../utils/rtl';

/**
 * The other half of the directory.
 *
 * Exhibitors are organisations and get their own page; a partner is a person —
 * a speaker, a sponsor's representative, an institution's delegate — so this
 * lists people. Same card, same detail sheet, same booking rule as the
 * exhibitor directory: the "book" button appears exactly when the backend says
 * a meeting would be accepted (`bookable`), and the badge says why when it
 * would not. Institutions are listed but never bookable — the event arranges
 * their meetings.
 */

function PartenaireCard({ item, onPress, onBook }) {
  const { t } = useTranslation();
  const displayName = item.name || item.company;
  const initials = displayName ? displayName.slice(0, 2).toUpperCase() : '??';

  return (
    <Card className="mb-3">
      <Card.Header>
        <View className="flex-row items-center" style={{ gap: 12 }}>
          {item.logo ? (
            <Image
              source={{ uri: item.logo }}
              style={{ width: 40, height: 40, borderRadius: 20 }}
              resizeMode="cover"
            />
          ) : (
            <Avatar size="md" color={item.is_mine ? 'success' : 'default'} variant="soft">
              <Avatar.Fallback>{initials}</Avatar.Fallback>
            </Avatar>
          )}
          <View className="flex-1 items-start" style={{ gap: 6 }}>
            <Text className="text-base font-bold text-foreground" numberOfLines={1}>
              {displayName}
            </Text>
            {item.role ? (
              <Chip size="sm" variant="soft" color="default">
                <Chip.Label>{roleLabel(item.role)}</Chip.Label>
              </Chip>
            ) : null}
            {item.is_mine ? null : (
              <AvailabilityBadge availability={item.availability} size="sm" />
            )}
          </View>
          {item.is_mine ? (
            <Chip size="sm" variant="soft" color="success">
              <Chip.Label>{t('exposants.me')}</Chip.Label>
            </Chip>
          ) : null}
        </View>
      </Card.Header>
      {item.company || item.description ? (
        <Card.Body className="pt-2 pb-1">
          <Text className="text-sm text-muted leading-5" numberOfLines={2}>
            {item.description || item.company}
          </Text>
        </Card.Body>
      ) : null}
      {/* Booking sits on the card itself, not only in the sheet: a partner is
          a person, and the whole reason to open this list is to ask for a
          meeting. Absent whenever the backend says the request would be
          refused — institutions, paused agendas, yourself. */}
      <Card.Footer className="pt-3 flex-row" style={{ gap: 8 }}>
        <Button
          variant="secondary"
          size="sm"
          className="rounded-xl flex-1"
          onPress={() => onPress(item)}
        >
          <Button.Label>{t('exposants.viewDetails')}</Button.Label>
        </Button>
        {item.bookable && item.persona_slug ? (
          <Button
            variant="primary"
            size="sm"
            className="rounded-xl flex-1"
            onPress={() => onBook(item)}
          >
            <Ionicons name="calendar-outline" size={16} color="#FFFFFF" />
            <Button.Label>{t('appointments.book')}</Button.Label>
          </Button>
        ) : null}
      </Card.Footer>
    </Card>
  );
}

export default function PartenairesScreen({ navigation }) {
  const { t } = useTranslation();
  const tabScroll = useTabBarScroll();
  const insets = useSafeAreaInsets();
  const [partenaires, setPartenaires] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetPartner, setSheetPartner] = useState(null);
  const [search, setSearch] = useState('');

  const load = async () => {
    try {
      const res = await getPartenaires();
      setPartenaires(res?.data?.data || []);
    } catch {
      setPartenaires([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const sheet = useSheetGuard(sheetOpen, () => setSheetOpen(false));
  const closeSheet = sheet.close;

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

  const openDetail = (item) => {
    setSheetPartner(item);
    setSheetOpen(true);
  };

  // The B2B tab owns the dates, slots and the request itself — going through
  // it keeps one booking flow instead of two that can drift apart.
  const openBooking = (item) => {
    if (!item?.persona_slug) return;
    navigation.navigate('RDV', { bookPersonaSlug: item.persona_slug });
  };

  const openLink = (url) => {
    if (!url) return;
    const prefixed = url.startsWith('http') ? url : `https://${url}`;
    Linking.openURL(prefixed).catch(() => {});
  };

  const filtered = (() => {
    if (!search.trim()) return partenaires;
    const needle = search.toLowerCase();
    return partenaires.filter(p =>
      p.name?.toLowerCase().includes(needle) ||
      p.company?.toLowerCase().includes(needle) ||
      p.secteur?.toLowerCase().includes(needle) ||
      roleLabel(p.role)?.toLowerCase().includes(needle)
    );
  })();

  // Persistent data for close animation
  const displayName = sheetPartner ? (sheetPartner.name || sheetPartner.company) : '';
  const sheetInitials = displayName ? displayName.slice(0, 2).toUpperCase() : '??';

  const contactItems = sheetPartner
    ? [
        sheetPartner.company && {
          icon: 'business-outline',
          label: t('partenaires.organisation'),
          value: sheetPartner.company,
          onPress: null,
        },
        sheetPartner.email && {
          icon: 'mail-outline',
          label: t('exposants.email'),
          value: sheetPartner.email,
          onPress: () => Linking.openURL(`mailto:${sheetPartner.email}`),
        },
        sheetPartner.phone && {
          icon: 'call-outline',
          label: t('exposants.phone'),
          value: sheetPartner.phone,
          onPress: () => Linking.openURL(`tel:${sheetPartner.phone}`),
        },
        sheetPartner.address && {
          icon: 'location-outline',
          label: t('exposants.address'),
          value: sheetPartner.address,
          onPress: null,
        },
        sheetPartner.website && {
          icon: 'globe-outline',
          label: t('exposants.website'),
          value: sheetPartner.website,
          onPress: () => openLink(sheetPartner.website),
        },
      ].filter(Boolean)
    : [];

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>

      {/* ── Header ─────────────────────────────────── */}
      <View className="px-4 pt-5 pb-4 flex-row items-center" style={{ gap: 12 }}>
        <MenuButton />
        <Text className="flex-1 text-2xl font-extrabold text-foreground">
          {t('partenaires.title')}
        </Text>
        {partenaires.length > 0 && (
          <Chip size="sm" variant="soft" color="default">
            <Chip.Label>{partenaires.length}</Chip.Label>
          </Chip>
        )}
      </View>

      {/* ── Search ─────────────────────────────────── */}
      <View className="px-4 mb-4">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder={t('partenaires.searchPlaceholder')}
        />
      </View>

      {/* ── Partner list ───────────────────────────── */}
      {loading ? (
        <View className="px-4" style={{ gap: 12 }}>
          {[0, 1, 2].map(i => (
            <Card key={i}>
              <Card.Body>
                <View className="flex-row items-center" style={{ gap: 12 }}>
                  <Skeleton isLoading variant="shimmer">
                    <View className="w-12 h-12 rounded-full bg-surface-secondary" />
                  </Skeleton>
                  <View className="flex-1" style={{ gap: 8 }}>
                    <Skeleton isLoading variant="shimmer">
                      <View className="h-4 rounded-full bg-surface-secondary" style={{ width: 160 }} />
                    </Skeleton>
                    <Skeleton isLoading variant="shimmer">
                      <View className="h-3 rounded-full bg-surface-secondary" style={{ width: 100 }} />
                    </Skeleton>
                  </View>
                </View>
              </Card.Body>
            </Card>
          ))}
        </View>
      ) : (
        <FlatList
          {...tabScroll}
          data={filtered}
          keyExtractor={item => String(item.id)}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 6, paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#286EAD" />
          }
          renderItem={({ item }) => (
            <PartenaireCard item={item} onPress={openDetail} onBook={openBooking} />
          )}
          ListEmptyComponent={
            <View className="items-center py-16">
              <Ionicons name="ribbon-outline" size={48} color="#2db067" />
              <Text className="text-base font-bold text-foreground mt-4">
                {t('partenaires.emptyTitle')}
              </Text>
              <Text className="text-sm text-muted text-center leading-5 px-8 mt-2">
                {t('partenaires.emptyBody')}
              </Text>
            </View>
          }
        />
      )}

      {/* ── Detail BottomSheet ─────────────────────── */}
      {sheet.mounted ? (
      <BottomSheet
        key={sheet.key}
        isOpen={sheet.isOpen}
        onOpenChange={open => {
          if (!open) closeSheet();
        }}
      >
        <BottomSheet.Portal>
          <BottomSheet.Overlay />
          <BottomSheet.Content
            ref={sheet.ref}
            {...sheet.contentProps}
            snapPoints={['85%']}
            enableOverDrag={false}
            enableDynamicSizing={false}
            contentContainerClassName="h-full"
          >
            <BottomSheetScrollView contentContainerStyle={{ paddingBottom: 40 }}>
              {/* Hero */}
              <View className="items-center pt-3 pb-6 px-4 border-b border-separator">
                {sheetPartner?.logo ? (
                  <Image
                    source={{ uri: sheetPartner.logo }}
                    style={{ width: 64, height: 64, borderRadius: 32 }}
                    resizeMode="cover"
                  />
                ) : (
                  <Avatar size="lg" color={sheetPartner?.is_mine ? 'success' : 'default'} variant="soft">
                    <Avatar.Fallback>{sheetInitials}</Avatar.Fallback>
                  </Avatar>
                )}
                <Text className="text-xl font-extrabold text-foreground mt-4 mb-2 text-center">
                  {displayName}
                </Text>
                <View
                  className="flex-row flex-wrap items-center justify-center"
                  style={{ gap: 8 }}
                >
                  {sheetPartner?.role ? (
                    <Chip size="sm" variant="soft" color="default" style={{ flexShrink: 1 }}>
                      <Chip.Label numberOfLines={1}>{roleLabel(sheetPartner.role)}</Chip.Label>
                    </Chip>
                  ) : null}
                  {sheetPartner?.secteur ? (
                    <Chip size="sm" variant="soft" color="default" style={{ flexShrink: 1 }}>
                      <Chip.Label numberOfLines={1}>{sheetPartner.secteur}</Chip.Label>
                    </Chip>
                  ) : null}
                  {sheetPartner?.is_mine ? null : (
                    <AvailabilityBadge availability={sheetPartner?.availability} />
                  )}
                </View>
                {sheetPartner?.is_mine ? null : (
                  <View className="px-6 mt-3">
                    <AvailabilityNote availability={sheetPartner?.availability} />
                  </View>
                )}
              </View>

              {/* Contact info */}
              {contactItems.length > 0 ? (
                <View className="px-4 pt-5">
                  <Text className={`text-[10px] font-bold text-muted ${latinLabel()} mb-3`}>
                    {t('exposants.contact')}
                  </Text>
                  <ListGroup>
                    {contactItems.map((ci, index) => (
                      <React.Fragment key={ci.label}>
                        {index > 0 && <Separator className="mx-4" />}
                        <ListGroup.Item onPress={ci.onPress} disabled={!ci.onPress}>
                          <ListGroup.ItemPrefix>
                            <Ionicons name={ci.icon} size={18} color="#2db067" />
                          </ListGroup.ItemPrefix>
                          <ListGroup.ItemContent>
                            <ListGroup.ItemDescription>{ci.label}</ListGroup.ItemDescription>
                            <ListGroup.ItemTitle numberOfLines={1}>{ci.value}</ListGroup.ItemTitle>
                          </ListGroup.ItemContent>
                          {ci.onPress ? (
                            <ListGroup.ItemSuffix>
                              <Ionicons name={forwardIcon()} size={18} color="#9CA3AF" />
                            </ListGroup.ItemSuffix>
                          ) : null}
                        </ListGroup.Item>
                      </React.Fragment>
                    ))}
                  </ListGroup>
                </View>
              ) : null}

              {/* About */}
              {sheetPartner?.description ? (
                <View className="px-4 pt-5">
                  <Text className={`text-[10px] font-bold text-muted ${latinLabel()} mb-3`}>
                    {t('exposants.about')}
                  </Text>
                  <Surface className="rounded-xl p-4">
                    <Text className="text-sm text-muted leading-5">
                      {sheetPartner.description}
                    </Text>
                  </Surface>
                </View>
              ) : null}

              {/* Actions */}
              <View className="px-4 pt-6" style={{ gap: 12 }}>
                {/* The B2B tab owns dates and slots, so the request is handed
                    to it rather than rebuilt here — same as the exhibitor
                    directory. `bookable` is false for institutions, for anyone
                    paused, and for yourself. */}
                {sheetPartner?.bookable && sheetPartner?.persona_slug ? (
                  <Button
                    variant="primary"
                    size="lg"
                    className="rounded-2xl"
                    onPress={() => {
                      const slug = sheetPartner.persona_slug;
                      closeSheet();
                      navigation.navigate('RDV', { bookPersonaSlug: slug });
                    }}
                  >
                    <Ionicons name="calendar-outline" size={18} color="#FFFFFF" />
                    <Button.Label>{t('appointments.book')}</Button.Label>
                  </Button>
                ) : null}
                <Button
                  variant="tertiary"
                  size="lg"
                  className="rounded-2xl"
                  onPress={closeSheet}
                >
                  <Button.Label>{t('exposants.close')}</Button.Label>
                </Button>
              </View>
            </BottomSheetScrollView>
          </BottomSheet.Content>
        </BottomSheet.Portal>
      </BottomSheet>
      ) : null}
    </View>
  );
}
