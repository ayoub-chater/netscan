import { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, Image, FlatList, Pressable, RefreshControl, Alert, StyleSheet } from 'react-native';
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
import { backIcon, forwardIcon, latinLabel } from '../utils/rtl';
import { tr, dateLocale } from '../utils/localized';
import { roleLabel as visitorRoleLabel } from '../constants/roles';

const StyledIonicons = withUniwind(Ionicons);

// Session types sent by the API (panels.type). Networking and closing are
// moments in the day, not talks: they render as a slim row with no sheet.
const TYPE_STYLE = {
  ceremony: { icon: 'ribbon-outline', color: 'warning' },
  keynote: { icon: 'mic-outline', color: 'accent' },
  panel: { icon: 'people-outline', color: 'success' },
  networking: { icon: 'wine-outline', color: 'default' },
  closing: { icon: 'flag-outline', color: 'default' },
};
const SLIM_TYPES = ['networking', 'closing'];

// Roles the back office offers as presets; anything else is free text from an
// older panel and goes through the visitor-role labels as before.
const KNOWN_ROLES = ['moderator', 'keynote', 'speaker', 'presenter'];
const FEMALE_CIVILITIES = ['mme', 'mlle', 's.e.mme', 'pr.e'];

// Banners are shown whole, edge to edge: the box takes the image's own aspect
// ratio, so `cover` has nothing to crop. Only images taller than a square are
// capped (and then trimmed top/bottom) so a portrait upload can't fill the screen.
const MIN_BANNER_RATIO = 1;

function useImageRatio(uri, fallback = 16 / 9) {
  const [ratio, setRatio] = useState(fallback);
  useEffect(() => {
    if (!uri) return undefined;
    let alive = true;
    Image.getSize(
      uri,
      (width, height) => {
        if (alive && width && height) setRatio(Math.max(width / height, MIN_BANNER_RATIO));
      },
      () => {}
    );
    return () => { alive = false; };
  }, [uri]);
  return ratio;
}

function FitImage({ uri, style }) {
  const ratio = useImageRatio(uri);
  return (
    <Image
      source={{ uri }}
      style={[{ width: '100%', aspectRatio: ratio }, style]}
      resizeMode="cover"
    />
  );
}

function formatTime(t) {
  if (!t) return '';
  return /^\d{2}:\d{2}/.test(t) ? t.slice(0, 5) : t;
}

function formatDate(iso, options) {
  try {
    return new Date(iso + 'T00:00:00').toLocaleDateString(dateLocale(), options);
  } catch {
    return iso;
  }
}

function initials(name) {
  return (name || '?')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

function todayIso() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function useRoleLabel() {
  const { t } = useTranslation();
  return (speaker) => {
    const role = speaker?.role;
    if (!role) return '';
    if (!KNOWN_ROLES.includes(role)) return visitorRoleLabel(role);
    const female = FEMALE_CIVILITIES.includes((speaker.civility || '').toLowerCase());
    return t(`conference.roles.${role}`, { context: female ? 'female' : undefined });
  };
}

// ── Small pieces ─────────────────────────────────────────────────────────────

function TypeChip({ type }) {
  const { t } = useTranslation();
  const style = TYPE_STYLE[type] || TYPE_STYLE.panel;
  return (
    <Chip size="sm" variant="soft" color={style.color}>
      <Chip.Label>{t(`conference.types.${type || 'panel'}`)}</Chip.Label>
    </Chip>
  );
}

// Seat status badge — informational only on the list card; the actual
// reserve/cancel action lives in the detail sheet (single clear tap target).
function SeatBadge({ panel }) {
  const { t } = useTranslation();
  if (panel.is_reservable === false) return null;
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

function SpeakerAvatar({ speaker, size = 'sm' }) {
  return (
    <Avatar size={size} color="default" variant="soft">
      {speaker.photo ? <Avatar.Image source={{ uri: speaker.photo }} /> : null}
      <Avatar.Fallback>
        {speaker.is_organization ? (
          <StyledIonicons name="business-outline" size={size === 'sm' ? 12 : 16} className="text-muted" />
        ) : (
          initials(speaker.name)
        )}
      </Avatar.Fallback>
    </Avatar>
  );
}

// Pill row used for the view switch and the day picker. Plain pressables in a
// flex row: they mirror under RTL with no measuring, unlike an indicator that
// slides by a measured x offset.
function Segments({ items, value, onChange }) {
  return (
    <View className="flex-row rounded-2xl bg-surface p-1" style={{ gap: 4 }}>
      {items.map((item) => {
        const active = item.value === value;
        return (
          <Pressable
            key={item.value}
            onPress={() => onChange(item.value)}
            className={`flex-1 items-center justify-center rounded-xl py-2 ${active ? 'bg-background' : ''}`}
          >
            <Text className={`text-xs font-extrabold ${active ? 'text-foreground' : 'text-muted'}`} numberOfLines={1}>
              {item.label}
            </Text>
            {item.sublabel ? (
              <Text className={`text-[10px] mt-0.5 ${active ? 'text-muted' : 'text-muted opacity-70'}`} numberOfLines={1}>
                {item.sublabel}
              </Text>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

// ── Session rows ─────────────────────────────────────────────────────────────

function TimeColumn({ panel }) {
  return (
    <View className="items-center" style={{ width: 46 }}>
      <Text className="text-sm font-extrabold text-foreground" style={styles.latin}>{formatTime(panel.start_time)}</Text>
      {panel.end_time ? (
        <Text className="text-[11px] text-muted" style={styles.latin}>{formatTime(panel.end_time)}</Text>
      ) : null}
    </View>
  );
}

function SlimRow({ panel }) {
  const style = TYPE_STYLE[panel.type] || TYPE_STYLE.networking;
  return (
    <View className="flex-row items-center mb-3 rounded-2xl bg-surface px-3 py-3" style={{ gap: 12 }}>
      <TimeColumn panel={panel} />
      <View className="w-8 h-8 rounded-full bg-background items-center justify-center">
        <StyledIonicons name={style.icon} size={16} className="text-muted" />
      </View>
      <Text className="flex-1 text-sm font-bold text-foreground">{tr(panel, 'name')}</Text>
    </View>
  );
}

function SessionCard({ panel, onPress }) {
  const { t } = useTranslation();
  const speakers = panel.speakers || [];
  const tagline = tr(panel, 'tagline');
  return (
    <Card className="mb-3">
      <Pressable onPress={() => onPress(panel)}>
        {panel.banner ? (
          <FitImage uri={panel.banner} style={{ borderRadius: 14, marginBottom: 10 }} />
        ) : null}
        <View className="flex-row" style={{ gap: 12 }}>
          <TimeColumn panel={panel} />
          <View className="flex-1" style={{ gap: 6 }}>
            <View className="flex-row items-center flex-wrap" style={{ gap: 6 }}>
              <TypeChip type={panel.type} />
              <Text className="text-[11px] font-bold text-muted">{tr(panel, 'subject')}</Text>
              <View className="flex-1" />
              <SeatBadge panel={panel} />
            </View>
            <Card.Title>{tr(panel, 'name')}</Card.Title>
            {tagline ? <Text className="text-[11px] text-muted italic">{tagline}</Text> : null}
            {tr(panel, 'location') ? (
              <View className="flex-row items-center" style={{ gap: 4 }}>
                <StyledIonicons name="location-outline" size={12} className="text-muted" />
                <Text className="text-[11px] text-muted">{tr(panel, 'location')}</Text>
              </View>
            ) : null}
            {speakers.length > 0 && (
              <View className="flex-row items-center mt-1" style={{ gap: 8 }}>
                <View className="flex-row">
                  {speakers.slice(0, 4).map((speaker, idx) => (
                    <View key={speaker.id} style={{ marginStart: idx === 0 ? 0 : -8, zIndex: 10 - idx }}>
                      <SpeakerAvatar speaker={speaker} />
                    </View>
                  ))}
                </View>
                <Text className="text-[11px] text-muted">
                  {t('conference.speakerCount', { count: speakers.length })}
                </Text>
              </View>
            )}
          </View>
        </View>
      </Pressable>
    </Card>
  );
}

// ── Speaker rows ─────────────────────────────────────────────────────────────

function SpeakerRow({ speaker, onPress }) {
  const { t } = useTranslation();
  const roleLabel = useRoleLabel();
  const title = tr(speaker, 'title');
  const company = tr(speaker, 'company');
  const note = tr(speaker, 'note');
  const body = (
    <View className="flex-row items-center py-3" style={{ gap: 12 }}>
      <SpeakerAvatar speaker={speaker} size="md" />
      <View className="flex-1" style={{ gap: 2 }}>
        <Text className="text-sm font-bold text-foreground">
          {speaker.civility && !speaker.is_organization ? `${speaker.civility} ` : ''}{tr(speaker, 'name')}
        </Text>
        {(title || company) ? (
          <Text className="text-xs text-muted" numberOfLines={3}>
            {[title, company].filter(Boolean).join(' · ')}
          </Text>
        ) : null}
        {note || speaker.duration_minutes ? (
          <Text className="text-xs text-foreground">
            {[note, speaker.duration_minutes ? t('conference.minutes', { count: speaker.duration_minutes }) : null].filter(Boolean).join(' · ')}
          </Text>
        ) : null}
      </View>
      {speaker.role ? (
        <Chip size="sm" variant="soft" color="accent">
          <Chip.Label>{roleLabel(speaker)}</Chip.Label>
        </Chip>
      ) : null}
    </View>
  );
  return onPress ? <Pressable onPress={onPress}>{body}</Pressable> : body;
}

function DirectoryRow({ speaker, onPress }) {
  const { t } = useTranslation();
  const title = tr(speaker, 'title');
  const company = tr(speaker, 'company');
  return (
    <Pressable onPress={() => onPress(speaker)} className="flex-row items-center py-3 border-b border-border" style={{ gap: 12 }}>
      <SpeakerAvatar speaker={speaker} size="md" />
      <View className="flex-1" style={{ gap: 2 }}>
        <Text className="text-sm font-bold text-foreground">
          {speaker.civility ? `${speaker.civility} ` : ''}{tr(speaker, 'name')}
        </Text>
        {(title || company) ? (
          <Text className="text-xs text-muted" numberOfLines={2}>
            {[title, company].filter(Boolean).join(' · ')}
          </Text>
        ) : null}
        {speaker.sessions?.length > 1 ? (
          <Text className="text-[11px] text-muted">{t('conference.sessionCount', { count: speaker.sessions.length })}</Text>
        ) : null}
      </View>
      <StyledIonicons name={forwardIcon()} size={16} className="text-muted" />
    </Pressable>
  );
}

// ── Screen ───────────────────────────────────────────────────────────────────

export default function ConferenceScreen({ navigation }) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const tabScroll = useTabBarScroll();
  const roleLabel = useRoleLabel();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [conference, setConference] = useState(null);
  const [isPreview, setIsPreview] = useState(false);
  const [panels, setPanels] = useState([]);
  const [directory, setDirectory] = useState([]);
  const [view, setView] = useState('programme');
  const [day, setDay] = useState(null);
  // What the sheet shows: { kind: 'panel' | 'speaker', id }.
  const [sheetItem, setSheetItem] = useState(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [busyPanelId, setBusyPanelId] = useState(null);

  // Keeps the sheet's native state in sync with ours — see useSheetGuard.
  const sheet = useSheetGuard(sheetOpen, () => {
    setSheetOpen(false);
    setSheetItem(null);
  });
  const closeSheet = sheet.close;

  const load = useCallback(async () => {
    try {
      const res = await getConference();
      setConference(res.data?.conference || null);
      setIsPreview(!!res.data?.preview);
      setPanels(res.data?.panels || []);
      setDirectory(res.data?.speakers || []);
    } catch {
      setConference(null);
      setPanels([]);
      setDirectory([]);
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

  const days = useMemo(
    () => Array.from(new Set(panels.map((p) => p.date).filter(Boolean))).sort(),
    [panels]
  );
  // Today during the event, the first day otherwise.
  const activeDay = day && days.includes(day) ? day : (days.includes(todayIso()) ? todayIso() : days[0]);
  const dayPanels = panels.filter((p) => p.date === activeDay);

  // Institutions (ministries, ports) appear on their sessions, not in the
  // people directory.
  const people = directory.filter((s) => !s.is_organization);

  const selectedPanel = sheetItem?.kind === 'panel' ? panels.find((p) => p.id === sheetItem.id) : null;
  const selectedSpeaker = sheetItem?.kind === 'speaker' ? directory.find((s) => s.id === sheetItem.id) : null;

  const openPanel = (panel) => {
    setSheetItem({ kind: 'panel', id: panel.id });
    setSheetOpen(true);
  };
  const openSpeaker = (speaker) => {
    setSheetItem({ kind: 'speaker', id: speaker.id });
    setSheetOpen(true);
  };

  const patchPanel = (panelId, patch) => {
    setPanels((prev) => prev.map((p) => (p.id === panelId ? { ...p, ...patch } : p)));
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
      const code = e?.response?.data?.code;
      if (code === 'PANEL_FULL') {
        patchPanel(panel.id, { is_full: true });
        Alert.alert(t('conference.fullTitle'), t('conference.fullMessage'));
      } else if (code === 'NOT_RESERVABLE') {
        patchPanel(panel.id, { is_reservable: false });
        Alert.alert(t('conference.title'), t('conference.noReservation'));
      } else {
        Alert.alert(t('common.error'), t('conference.reserveError'));
      }
    } finally {
      setBusyPanelId(null);
    }
  };

  const bannerRatio = useImageRatio(conference?.banner, 3);
  const title = tr(conference, 'title') || t('conference.title');
  const subtitle = tr(conference, 'description');

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

  const previewBadge = isPreview ? (
    <View className="self-start mt-1">
      <Chip size="sm" variant="soft" color="warning">
        <StyledIonicons name="eye-outline" size={11} className="text-warning" />
        <Chip.Label>{t('conference.preview')}</Chip.Label>
      </Chip>
    </View>
  ) : null;

  // Moderators first, as on the printed programme.
  const sheetSpeakers = selectedPanel ? [...(selectedPanel.speakers || [])] : [];
  const moderators = sheetSpeakers.filter((s) => s.role === 'moderator');
  const others = sheetSpeakers.filter((s) => s.role !== 'moderator');

  const speakerSessions = selectedSpeaker
    ? (selectedSpeaker.sessions || [])
        .map((session) => ({ ...session, panel: panels.find((p) => p.id === session.panel_id) }))
        .filter((session) => session.panel)
    : [];

  const listHeader = (
    <View style={{ gap: 12 }} className="pb-2">
      <Segments
        value={view}
        onChange={setView}
        items={[
          { value: 'programme', label: t('conference.tabProgramme') },
          { value: 'speakers', label: `${t('conference.tabSpeakers')} · ${people.length}` },
        ]}
      />
      {view === 'programme' && days.length > 1 ? (
        <Segments
          value={activeDay}
          onChange={setDay}
          items={days.map((d, idx) => ({
            value: d,
            label: t('conference.day', { n: idx + 1 }),
            sublabel: formatDate(d, { weekday: 'short', day: 'numeric', month: 'short' }),
          }))}
        />
      ) : null}
      {view === 'programme' && activeDay ? (
        <Text className={`text-xs font-extrabold text-muted ${latinLabel('tracking-wide')} mt-1`}>
          {formatDate(activeDay, { weekday: 'long', day: 'numeric', month: 'long' })}
          {tr(conference, 'venue') ? ` · ${tr(conference, 'venue')}` : ''}
        </Text>
      ) : null}
    </View>
  );

  return (
    <View className="flex-1 bg-background">
      {/* ── Header ─────────────────────────────────── */}
      {conference?.banner ? (
        <View style={{ paddingTop: insets.top }}>
          {/* Full width at the image's own ratio — nothing is cropped. The
              title moves under the image so a short, wide banner stays clean. */}
          <View style={{ width: '100%', aspectRatio: bannerRatio }}>
            <Image source={{ uri: conference.banner }} style={StyleSheet.absoluteFill} resizeMode="cover" />
            {/* One full-width row instead of two edge-pinned boxes: flex mirrors
                itself under RTL with no measurement pass — see ScannerScreen. */}
            <View
              style={{ position: 'absolute', top: 8, left: 12, right: 12 }}
              className="flex-row items-center justify-between"
              pointerEvents="box-none"
            >
              {backButton}
              {/* Over the artwork the surface chrome disappears — a dark chip
                  carries the contrast, so the icon goes white. */}
              <MenuButton
                color="#FFFFFF"
                className="w-10 h-10 rounded-xl items-center justify-center"
                style={styles.bannerBackButton}
              />
            </View>
          </View>
          <View className="px-4 pt-3 pb-3">
            <Text className="text-xl font-extrabold text-foreground">
              {title}
            </Text>
            {subtitle ? (
              <Text className="text-xs text-muted mt-0.5" numberOfLines={2}>
                {subtitle}
              </Text>
            ) : null}
            {previewBadge}
          </View>
        </View>
      ) : (
        <View className="px-4 pb-4" style={{ paddingTop: insets.top + 20 }}>
          <View className="flex-row items-center" style={{ gap: 12 }}>
            {backButton}
            <View className="flex-1">
              <Text className="text-xl font-extrabold text-foreground">
                {title}
              </Text>
              {subtitle ? (
                <Text className="text-xs text-muted mt-0.5" numberOfLines={1}>
                  {subtitle}
                </Text>
              ) : null}
              {previewBadge}
            </View>
            <MenuButton />
          </View>
        </View>
      )}

      {loading ? (
        <View className="px-4" style={{ gap: 12 }}>
          <Skeleton className="h-12 w-full rounded-2xl" />
          <Skeleton className="h-28 w-full rounded-2xl" />
          <Skeleton className="h-28 w-full rounded-2xl" />
        </View>
      ) : panels.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8" style={{ gap: 8 }}>
          <StyledIonicons name="calendar-outline" size={40} className="text-muted" />
          <Text className="text-sm font-bold text-foreground text-center">
            {t('conference.emptyTitle')}
          </Text>
          <Text className="text-xs text-muted text-center">
            {t('conference.emptySubtitle')}
          </Text>
        </View>
      ) : view === 'programme' ? (
        <FlatList
          {...tabScroll}
          data={dayPanels}
          keyExtractor={(item) => String(item.id)}
          ListHeaderComponent={listHeader}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 4, paddingBottom: 120 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          renderItem={({ item }) =>
            SLIM_TYPES.includes(item.type) && !(item.speakers || []).length
              ? <SlimRow panel={item} />
              : <SessionCard panel={item} onPress={openPanel} />
          }
        />
      ) : (
        <FlatList
          {...tabScroll}
          data={people}
          keyExtractor={(item) => `s-${item.id}`}
          ListHeaderComponent={listHeader}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 4, paddingBottom: 120 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <Text className="text-xs text-muted text-center mt-8">{t('conference.speakersEmpty')}</Text>
          }
          renderItem={({ item }) => <DirectoryRow speaker={item} onPress={openSpeaker} />}
        />
      )}

      {/* ── Detail BottomSheet (session or speaker) ─── */}
      {sheet.mounted ? (
      <BottomSheet key={sheet.key} isOpen={sheet.isOpen} onOpenChange={(o) => { if (!o) closeSheet(); }}>
        <BottomSheet.Portal>
          <BottomSheet.Overlay />
          <BottomSheet.Content ref={sheet.ref} {...sheet.contentProps} snapPoints={['80%']} enableOverDrag={false} enableDynamicSizing={false} contentContainerClassName="h-full">
            {selectedPanel ? (
              <>
                <BottomSheetScrollView contentContainerStyle={{ paddingBottom: 16 }}>
                  {selectedPanel.banner ? (
                    <FitImage uri={selectedPanel.banner} style={{ borderRadius: 16, marginBottom: 12 }} />
                  ) : null}
                  <View className="flex-row items-center flex-wrap mb-2" style={{ gap: 6 }}>
                    <TypeChip type={selectedPanel.type} />
                    <Text className="text-[11px] font-bold text-muted">{tr(selectedPanel, 'subject')}</Text>
                  </View>
                  <BottomSheet.Title>{tr(selectedPanel, 'name')}</BottomSheet.Title>
                  {tr(selectedPanel, 'tagline') ? (
                    <BottomSheet.Description>{tr(selectedPanel, 'tagline')}</BottomSheet.Description>
                  ) : null}

                  <View className="flex-row items-center mt-3" style={{ gap: 6 }}>
                    <StyledIonicons name="time-outline" size={14} className="text-muted" />
                    <Text className="text-xs font-bold text-muted">
                      {formatDate(selectedPanel.date, { weekday: 'long', day: 'numeric', month: 'long' })}
                    </Text>
                    <Text className="text-xs font-bold text-muted" style={styles.latin}>
                      {formatTime(selectedPanel.start_time)}{selectedPanel.end_time ? ` – ${formatTime(selectedPanel.end_time)}` : ''}
                    </Text>
                  </View>

                  {tr(selectedPanel, 'location') || tr(conference, 'venue') ? (
                    <View className="flex-row items-center mt-1" style={{ gap: 6 }}>
                      <StyledIonicons name="location-outline" size={14} className="text-muted" />
                      <Text className="text-xs text-muted">{tr(selectedPanel, 'location') || tr(conference, 'venue')}</Text>
                    </View>
                  ) : null}

                  {selectedPanel.is_reservable !== false && selectedPanel.capacity ? (
                    <View className="flex-row items-center mt-1" style={{ gap: 6 }}>
                      <StyledIonicons name="people-outline" size={14} className="text-muted" />
                      <Text className="text-xs text-muted">
                        {t('conference.seatsLeft', {
                          count: Math.max(selectedPanel.capacity - (selectedPanel.attendees_count || 0), 0),
                        })}
                      </Text>
                    </View>
                  ) : null}

                  {tr(selectedPanel, 'description') ? (
                    <Text className="text-sm text-foreground mt-4 leading-5">{tr(selectedPanel, 'description')}</Text>
                  ) : null}

                  {moderators.length > 0 && (
                    <View className="mt-5">
                      <Text className={`text-xs font-extrabold text-muted ${latinLabel('tracking-wide')} mb-1`}>
                        {t('conference.moderation')}
                      </Text>
                      {moderators.map((speaker) => (
                        <SpeakerRow key={speaker.id} speaker={speaker} />
                      ))}
                    </View>
                  )}

                  {others.length > 0 && (
                    <View className="mt-4">
                      <Text className={`text-xs font-extrabold text-muted ${latinLabel('tracking-wide')} mb-1`}>
                        {t('conference.speakers')}
                      </Text>
                      {others.map((speaker) => (
                        <SpeakerRow key={speaker.id} speaker={speaker} />
                      ))}
                    </View>
                  )}
                </BottomSheetScrollView>

                <View className="pt-3">
                  {selectedPanel.is_reservable === false ? (
                    <View className="flex-row items-center justify-center rounded-2xl bg-surface py-3" style={{ gap: 6 }}>
                      <StyledIonicons name="enter-outline" size={16} className="text-muted" />
                      <Text className="text-xs font-bold text-muted">{t('conference.noReservation')}</Text>
                    </View>
                  ) : selectedPanel.reserved ? (
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
            ) : selectedSpeaker ? (
              <BottomSheetScrollView contentContainerStyle={{ paddingBottom: 24 }}>
                <View className="items-center mt-2" style={{ gap: 8 }}>
                  <SpeakerAvatar speaker={selectedSpeaker} size="lg" />
                  <BottomSheet.Title className="text-center">
                    {selectedSpeaker.civility ? `${selectedSpeaker.civility} ` : ''}{tr(selectedSpeaker, 'name')}
                  </BottomSheet.Title>
                  {tr(selectedSpeaker, 'title') ? (
                    <Text className="text-xs text-muted text-center px-4">{tr(selectedSpeaker, 'title')}</Text>
                  ) : null}
                  {tr(selectedSpeaker, 'company') || tr(selectedSpeaker, 'country') ? (
                    <Text className="text-xs text-muted text-center">
                      {[tr(selectedSpeaker, 'company'), tr(selectedSpeaker, 'country')].filter(Boolean).join(' · ')}
                    </Text>
                  ) : null}
                </View>

                {tr(selectedSpeaker, 'bio') ? (
                  <Text className="text-sm text-foreground mt-5 leading-5">{tr(selectedSpeaker, 'bio')}</Text>
                ) : null}

                {speakerSessions.length > 0 && (
                  <View className="mt-5" style={{ gap: 8 }}>
                    <Text className={`text-xs font-extrabold text-muted ${latinLabel('tracking-wide')}`}>
                      {t('conference.sessions')}
                    </Text>
                    {speakerSessions.map(({ panel, role }) => (
                      <Pressable
                        key={panel.id}
                        onPress={() => setSheetItem({ kind: 'panel', id: panel.id })}
                        className="flex-row items-center rounded-2xl bg-surface px-3 py-3"
                        style={{ gap: 12 }}
                      >
                        <TimeColumn panel={panel} />
                        <View className="flex-1" style={{ gap: 2 }}>
                          <Text className="text-[11px] text-muted">
                            {formatDate(panel.date, { weekday: 'short', day: 'numeric', month: 'short' })}
                            {' · '}{roleLabel({ role, civility: selectedSpeaker.civility })}
                          </Text>
                          <Text className="text-sm font-bold text-foreground">{tr(panel, 'name')}</Text>
                        </View>
                        <StyledIonicons name={forwardIcon()} size={16} className="text-muted" />
                      </Pressable>
                    ))}
                  </View>
                )}
              </BottomSheetScrollView>
            ) : null}
          </BottomSheet.Content>
        </BottomSheet.Portal>
      </BottomSheet>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bannerBackButton: {
    backgroundColor: 'rgba(3,10,20,0.4)',
  },
  // Times are Latin digits: keep "10:00 – 11:30" in reading order inside an
  // Arabic paragraph.
  latin: {
    writingDirection: 'ltr',
  },
});
