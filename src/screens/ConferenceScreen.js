import { useCallback, useState } from 'react';
import { View, Text, Image, SectionList, Pressable, RefreshControl, Alert, StyleSheet } from 'react-native';
import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { withUniwind } from 'uniwind';
import { useTranslation } from 'react-i18next';
import {
  Avatar,
  BottomSheet,
  Button,
  Card,
  Chip,
  Skeleton,
} from 'heroui-native';
import { getConference, reservePanelSeat, cancelPanelSeat } from '../services/api';
import useSheetGuard from '../components/useSheetGuard';
import { useTabBarScroll } from '../context/TabBarContext';
import MenuButton from '../components/MenuButton';
import { backIcon, latinLabel } from '../utils/rtl';
import { roleLabel } from '../constants/roles';

const StyledIonicons = withUniwind(Ionicons);

function formatTime(t) {
  if (!t) return '';
  return /^\d{2}:\d{2}/.test(t) ? t.slice(0, 5) : t;
}

function formatDateHeading(iso, locale) {
  try {
    const d = new Date(iso + 'T00:00:00');
    return d.toLocaleDateString(locale, { weekday: 'long', day: '2-digit', month: 'long' });
  } catch {
    return iso;
  }
}

function groupByDate(panels) {
  const byDate = new Map();
  for (const panel of panels) {
    const key = panel.date || '';
    if (!byDate.has(key)) byDate.set(key, []);
    byDate.get(key).push(panel);
  }
  return Array.from(byDate.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, data]) => ({ title: date, data }));
}

// Seat status badge — informational only on the list card; the actual
// reserve/cancel action lives in the detail sheet (single clear tap target).
function SeatBadge({ panel }) {
  const { t } = useTranslation();
  if (panel.reserved) {
    return (
      <Chip size="sm" variant="soft" color="success">
        <StyledIonicons name="checkmark-circle" size={11} className="text-success" />
        <Chip.Label>{t('conference.reserved')}</Chip.Label>
      </Chip>
    );
  }
  if (panel.is_full) {
    return (
      <Chip size="sm" variant="soft" color="danger">
        <Chip.Label>{t('conference.full')}</Chip.Label>
      </Chip>
    );
  }
  if (panel.capacity) {
    return (
      <Chip size="sm" variant="soft" color="default">
        <Chip.Label>{panel.attendees_count}/{panel.capacity}</Chip.Label>
      </Chip>
    );
  }
  return null;
}

// ── Panel row ────────────────────────────────────────────────────────────────
function PanelCard({ panel, onPress }) {
  const { t } = useTranslation();
  const speakers = panel.speakers || [];
  return (
    <Card className="mb-3">
      <Pressable onPress={() => onPress(panel)}>
        {panel.banner ? (
          <Image
            source={{ uri: panel.banner }}
            style={{ width: '100%', height: 110, borderRadius: 14, marginBottom: 10 }}
            resizeMode="cover"
          />
        ) : null}
        <Card.Header>
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center" style={{ gap: 6 }}>
              <StyledIonicons name="time-outline" size={14} className="text-muted" />
              <Text className="text-xs font-bold text-muted">
                {formatTime(panel.start_time)} - {formatTime(panel.end_time)}
              </Text>
            </View>
            <SeatBadge panel={panel} />
          </View>
        </Card.Header>
        <Card.Body>
          <Card.Title>{panel.name}</Card.Title>
          <Card.Description>{panel.subject}</Card.Description>
          {panel.location ? (
            <View className="flex-row items-center mt-1" style={{ gap: 4 }}>
              <StyledIonicons name="location-outline" size={12} className="text-muted" />
              <Text className="text-[11px] text-muted">{panel.location}</Text>
            </View>
          ) : null}
        </Card.Body>
        {speakers.length > 0 && (
          <Card.Footer>
            <View className="flex-row items-center mt-2" style={{ gap: 8 }}>
              <View className="flex-row" style={{ marginStart: 8 }}>
                {speakers.slice(0, 4).map((speaker, idx) => (
                  <View key={speaker.id} style={{ marginStart: idx === 0 ? 0 : -8, zIndex: 10 - idx }}>
                    <Avatar size="sm" color="default" variant="soft">
                      {speaker.photo ? <Avatar.Image source={{ uri: speaker.photo }} /> : null}
                      <Avatar.Fallback>{(speaker.name || '?').slice(0, 2).toUpperCase()}</Avatar.Fallback>
                    </Avatar>
                  </View>
                ))}
              </View>
              <Text className="text-[11px] text-muted">
                {t('conference.speakerCount', { count: speakers.length })}
              </Text>
            </View>
          </Card.Footer>
        )}
      </Pressable>
    </Card>
  );
}

// ── Speaker row (detail sheet) ───────────────────────────────────────────────
function SpeakerRow({ speaker }) {
  const initials = (speaker.name || '?').slice(0, 2).toUpperCase();
  return (
    <View className="flex-row items-center py-3" style={{ gap: 12 }}>
      <Avatar size="md" color="default" variant="soft">
        {speaker.photo ? <Avatar.Image source={{ uri: speaker.photo }} /> : null}
        <Avatar.Fallback>{initials}</Avatar.Fallback>
      </Avatar>
      <View className="flex-1" style={{ gap: 2 }}>
        <Text className="text-sm font-bold text-foreground">{speaker.name}</Text>
        {(speaker.title || speaker.company) ? (
          <Text className="text-xs text-muted">
            {[speaker.title, speaker.company].filter(Boolean).join(' · ')}
          </Text>
        ) : null}
      </View>
      {speaker.role ? (
        <Chip size="sm" variant="soft" color="accent">
          <Chip.Label>{roleLabel(speaker.role)}</Chip.Label>
        </Chip>
      ) : null}
    </View>
  );
}

export default function ConferenceScreen({ navigation }) {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const tabScroll = useTabBarScroll();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [conference, setConference] = useState(null);
  const [panels, setPanels] = useState([]);
  const [selectedPanel, setSelectedPanel] = useState(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [busyPanelId, setBusyPanelId] = useState(null);

  // Keeps the sheet's native state in sync with ours — see useSheetGuard.
  const sheet = useSheetGuard(sheetOpen, () => {
    setSheetOpen(false);
    setSelectedPanel(null);
  });
  const closeSheet = sheet.close;

  const load = useCallback(async () => {
    try {
      const res = await getConference();
      setConference(res.data?.conference || null);
      setPanels(res.data?.panels || []);
    } catch {
      setConference(null);
      setPanels([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const openPanel = (panel) => {
    setSelectedPanel(panel);
    setSheetOpen(true);
  };

  const patchPanel = (panelId, patch) => {
    setPanels((prev) => prev.map((p) => (p.id === panelId ? { ...p, ...patch } : p)));
    setSelectedPanel((prev) => (prev && prev.id === panelId ? { ...prev, ...patch } : prev));
  };

  const toggleReservation = async (panel) => {
    if (busyPanelId === panel.id) return;
    setBusyPanelId(panel.id);
    const wasReserved = panel.reserved;

    // Optimistic update — reverted below if the request fails.
    patchPanel(panel.id, {
      reserved: !wasReserved,
      attendees_count: (panel.attendees_count || 0) + (wasReserved ? -1 : 1),
    });

    try {
      if (wasReserved) {
        await cancelPanelSeat(panel.id);
      } else {
        await reservePanelSeat(panel.id);
      }
    } catch (e) {
      patchPanel(panel.id, { reserved: wasReserved, attendees_count: panel.attendees_count });
      if (e?.response?.data?.code === 'PANEL_FULL') {
        patchPanel(panel.id, { is_full: true });
        Alert.alert(t('conference.fullTitle'), t('conference.fullMessage'));
      } else {
        Alert.alert(t('common.error'), t('conference.reserveError'));
      }
    } finally {
      setBusyPanelId(null);
    }
  };

  const sections = groupByDate(panels);

  const backButton = (
    <Pressable
      onPress={() => navigation.goBack()}
      className={conference?.banner ? 'w-10 h-10 rounded-xl items-center justify-center' : 'w-10 h-10 rounded-xl bg-surface items-center justify-center'}
      style={conference?.banner ? styles.bannerBackButton : undefined}
      hitSlop={8}
    >
      {conference?.banner ? (
        <Ionicons name={backIcon()} size={22} color="#FFFFFF" />
      ) : (
        <StyledIonicons name={backIcon()} size={22} className="text-foreground" />
      )}
    </Pressable>
  );

  return (
    <View className="flex-1 bg-background">
      {/* ── Header ─────────────────────────────────── */}
      {conference?.banner ? (
        <View style={{ height: 200 + insets.top }}>
          <Image source={{ uri: conference.banner }} style={StyleSheet.absoluteFill} resizeMode="cover" />
          <View style={[StyleSheet.absoluteFill, styles.bannerScrim]} />
          {/* One full-width row instead of two edge-pinned boxes: flex mirrors
              itself under RTL with no measurement pass — see ScannerScreen. */}
          <View
            style={{ position: 'absolute', top: insets.top + 8, left: 16, right: 16 }}
            className="flex-row items-center justify-between"
            pointerEvents="box-none"
          >
            {backButton}
            {/* Over the banner artwork the surface chrome disappears — the
                scrim carries the contrast, so the icon goes white. */}
            <MenuButton
              color="#FFFFFF"
              className="w-10 h-10 rounded-xl items-center justify-center"
              style={styles.bannerBackButton}
            />
          </View>
          <View style={{ position: 'absolute', bottom: 16, left: 16, right: 16 }}>
            <Text className="text-2xl font-extrabold" style={{ color: '#FFFFFF' }}>
              {conference.title || t('conference.title')}
            </Text>
            {conference.description ? (
              <Text className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.85)' }} numberOfLines={2}>
                {conference.description}
              </Text>
            ) : null}
          </View>
        </View>
      ) : (
        <View className="px-4 pb-4" style={{ paddingTop: insets.top + 20 }}>
          <View className="flex-row items-center" style={{ gap: 12 }}>
            {backButton}
            <View className="flex-1">
              <Text className="text-xl font-extrabold text-foreground">
                {conference?.title || t('conference.title')}
              </Text>
              {conference?.description ? (
                <Text className="text-xs text-muted mt-0.5" numberOfLines={1}>
                  {conference.description}
                </Text>
              ) : null}
            </View>
            <MenuButton />
          </View>
        </View>
      )}

      {loading ? (
        <View className="px-4" style={{ gap: 12 }}>
          <Skeleton className="h-28 w-full rounded-2xl" />
          <Skeleton className="h-28 w-full rounded-2xl" />
          <Skeleton className="h-28 w-full rounded-2xl" />
        </View>
      ) : sections.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8" style={{ gap: 8 }}>
          <StyledIonicons name="calendar-outline" size={40} className="text-muted" />
          <Text className="text-sm font-bold text-foreground text-center">
            {t('conference.emptyTitle')}
          </Text>
          <Text className="text-xs text-muted text-center">
            {t('conference.emptySubtitle')}
          </Text>
        </View>
      ) : (
        <SectionList
          {...tabScroll}
          sections={sections}
          stickySectionHeadersEnabled={false}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 4, paddingBottom: 120 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          renderSectionHeader={({ section }) => (
            <Text className={`text-xs font-extrabold text-muted ${latinLabel('tracking-wide')} mt-4 mb-2`}>
              {formatDateHeading(section.title, i18n.language)}
            </Text>
          )}
          renderItem={({ item }) => <PanelCard panel={item} onPress={openPanel} />}
        />
      )}

      {/* ── Panel detail BottomSheet ────────────────── */}
      {sheet.mounted ? (
      <BottomSheet key={sheet.key} isOpen={sheet.isOpen} onOpenChange={(o) => { if (!o) closeSheet(); }}>
        <BottomSheet.Portal>
          <BottomSheet.Overlay />
          <BottomSheet.Content ref={sheet.ref} {...sheet.contentProps} snapPoints={['80%']} enableOverDrag={false} enableDynamicSizing={false} contentContainerClassName="h-full">
            {selectedPanel ? (
              <>
                <BottomSheetScrollView contentContainerStyle={{ paddingBottom: 16 }}>
                  {selectedPanel.banner ? (
                    <Image
                      source={{ uri: selectedPanel.banner }}
                      style={{ width: '100%', height: 160, borderRadius: 16, marginBottom: 12 }}
                      resizeMode="cover"
                    />
                  ) : null}
                  <View className="flex-row items-center mb-1" style={{ gap: 6 }}>
                    <StyledIonicons name="time-outline" size={14} className="text-muted" />
                    <Text className="text-xs font-bold text-muted">
                      {formatDateHeading(selectedPanel.date, i18n.language)} · {formatTime(selectedPanel.start_time)} - {formatTime(selectedPanel.end_time)}
                    </Text>
                  </View>
                  <BottomSheet.Title>{selectedPanel.name}</BottomSheet.Title>
                  <BottomSheet.Description>{selectedPanel.subject}</BottomSheet.Description>

                  {selectedPanel.location ? (
                    <View className="flex-row items-center mt-2" style={{ gap: 6 }}>
                      <StyledIonicons name="location-outline" size={14} className="text-muted" />
                      <Text className="text-xs text-muted">{selectedPanel.location}</Text>
                    </View>
                  ) : null}

                  {selectedPanel.capacity ? (
                    <View className="flex-row items-center mt-1" style={{ gap: 6 }}>
                      <StyledIonicons name="people-outline" size={14} className="text-muted" />
                      <Text className="text-xs text-muted">
                        {t('conference.seatsLeft', {
                          count: Math.max(selectedPanel.capacity - (selectedPanel.attendees_count || 0), 0),
                        })}
                      </Text>
                    </View>
                  ) : null}

                  {selectedPanel.description ? (
                    <Text className="text-sm text-foreground mt-4">{selectedPanel.description}</Text>
                  ) : null}

                  {(selectedPanel.speakers || []).length > 0 && (
                    <View className="mt-5">
                      <Text className={`text-xs font-extrabold text-muted ${latinLabel('tracking-wide')} mb-1`}>
                        {t('conference.speakers')}
                      </Text>
                      {selectedPanel.speakers.map((speaker) => (
                        <SpeakerRow key={speaker.id} speaker={speaker} />
                      ))}
                    </View>
                  )}
                </BottomSheetScrollView>

                <View className="pt-3">
                  {selectedPanel.reserved ? (
                    <Button
                      variant="tertiary"
                      size="lg"
                      className="rounded-2xl"
                      disabled={busyPanelId === selectedPanel.id}
                      onPress={() => toggleReservation(selectedPanel)}
                    >
                      <StyledIonicons name="close-circle-outline" size={18} className="text-foreground" />
                      <Button.Label>{t('conference.cancelReservation')}</Button.Label>
                    </Button>
                  ) : (
                    <Button
                      variant="primary"
                      size="lg"
                      className="rounded-2xl"
                      disabled={selectedPanel.is_full || busyPanelId === selectedPanel.id}
                      onPress={() => toggleReservation(selectedPanel)}
                    >
                      <Ionicons name="add-circle-outline" size={18} color="#FFFFFF" />
                      <Button.Label>
                        {selectedPanel.is_full ? t('conference.full') : t('conference.reserve')}
                      </Button.Label>
                    </Button>
                  )}
                </View>
              </>
            ) : null}
          </BottomSheet.Content>
        </BottomSheet.Portal>
      </BottomSheet>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bannerScrim: {
    backgroundColor: 'rgba(3,10,20,0.45)',
  },
  bannerBackButton: {
    backgroundColor: 'rgba(3,10,20,0.4)',
  },
});
