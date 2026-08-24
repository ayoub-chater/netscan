import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  FlatList,
  Pressable,
  RefreshControl,
  Linking,
  Alert,
  ActivityIndicator,
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
  Input,
  Separator,
  Skeleton,
  Surface,
  TextField,
  useBottomSheetAwareHandlers,
} from 'heroui-native';
import {
  getInstitutionalAppointments,
  getPersonas,
  getPersonaSlots,
  bookAppointment,
  getMyAppointments,
  cancelAppointment,
} from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useTabBarScroll } from '../context/TabBarContext';
import { MEETING_LOCATION } from '../constants/b2b';
import useSheetGuard from '../components/useSheetGuard';
import MenuButton from '../components/MenuButton';
import { forwardIcon, latinLabel } from '../utils/rtl';
import { apiErrorMessage } from '../utils/apiError';

const ACCENT = '#286EAD';

const STATUS_COLOR = {
  confirmed: 'success',
  pending: 'warning',
  cancelled: 'danger',
  completed: 'default',
  no_show: 'danger',
};

// Format an ISO date (YYYY-MM-DD) into a short localized label.
function formatDateLabel(iso, locale) {
  try {
    const d = new Date(iso + 'T00:00:00');
    return d.toLocaleDateString(locale, { weekday: 'short', day: '2-digit', month: 'short' });
  } catch {
    return iso;
  }
}

function meetingTypeIcon(type) {
  if (type === 'video') return 'videocam-outline';
  if (type === 'phone') return 'call-outline';
  return 'location-outline';
}

// Note input — lives inside the BottomSheet so it can use the sheet-aware
// focus handlers (keeps the field visible above the keyboard).
function NoteField({ value, onChangeText }) {
  const { t } = useTranslation();
  const { onFocus, onBlur } = useBottomSheetAwareHandlers();
  return (
    <TextField>
      <Input
        placeholder={t('appointments.notePlaceholder')}
        value={value}
        onChangeText={onChangeText}
        onFocus={onFocus}
        onBlur={onBlur}
        multiline
        numberOfLines={3}
        style={{ minHeight: 72, textAlignVertical: 'top' }}
      />
    </TextField>
  );
}

// Status dot color for a persona.
function statusDot(status) {
  return status === 'active' ? '#22C55E' : status === 'on_break' ? '#F59E0B' : '#EF4444';
}

// ── Persona card (bookable contact) ─────────────────────────────────────────
function PersonaCard({ item, onBook, onView }) {
  const { t } = useTranslation();
  const initials = (item.name || '?').slice(0, 2).toUpperCase();
  // Backend's `bookable` flag can say true even when `available_dates` ends up
  // empty (e.g. its only slots are already past or blocked) — always require
  // real dates client-side too, so the button never opens an empty booking sheet.
  const bookable = (item.bookable ?? true) && (item.available_dates?.length || 0) > 0;
  const status = item.status || 'active';
  const off = status !== 'active';

  return (
    <Card className="mb-3">
      <Pressable onPress={() => onView(item)}>
        <Card.Header>
          <View className="flex-row items-center" style={{ gap: 12 }}>
            {item.photo ? (
              <Image
                source={{ uri: item.photo }}
                style={{ width: 48, height: 48, borderRadius: 24 }}
                resizeMode="cover"
              />
            ) : (
              <Avatar size="md" color="default" variant="soft">
                <Avatar.Fallback>{initials}</Avatar.Fallback>
              </Avatar>
            )}
            <View className="flex-1 items-start" style={{ gap: 4 }}>
              <View className="flex-row items-center" style={{ gap: 8 }}>
                <Text className="text-base font-bold text-foreground" numberOfLines={1}>
                  {item.name}
                </Text>
                {off ? (
                  <View className="flex-row items-center" style={{ gap: 4 }}>
                    <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: statusDot(status) }} />
                    <Text className="text-[10px] font-bold text-muted uppercase">
                      {t(`speaker.statusValue.${status}`)}
                    </Text>
                  </View>
                ) : null}
              </View>
              {item.title || item.company ? (
                <Text className="text-xs text-muted" numberOfLines={1}>
                  {[item.title, item.company].filter(Boolean).join(' · ')}
                </Text>
              ) : null}
            </View>
            <Ionicons name={forwardIcon()} size={18} color="#9CA3AF" />
          </View>
        </Card.Header>
        {item.bio ? (
          <Card.Body className="pt-2 pb-1">
            <Text className="text-sm text-muted leading-5" numberOfLines={2}>
              {item.bio}
            </Text>
          </Card.Body>
        ) : null}
      </Pressable>
      <Card.Footer className="pt-3">
        <Button
          variant={bookable ? 'primary' : 'secondary'}
          size="sm"
          className="rounded-xl flex-1"
          onPress={() => onBook(item)}
          disabled={!bookable}
        >
          <Ionicons name="calendar-outline" size={16} color={bookable ? '#FFFFFF' : ACCENT} />
          <Button.Label>
            {bookable
              ? t('appointments.book')
              : item.already_booked
              ? t('appointments.alreadyBookedShort')
              : off
              ? t('appointments.speakerUnavailable')
              : t('appointments.noSlots')}
          </Button.Label>
        </Button>
      </Card.Footer>
    </Card>
  );
}

// ── Appointment card (my bookings) ──────────────────────────────────────────
// ── A meeting the organiser arranged between two institutions ────────────────
//
// Green throughout, so it reads as a different programme from the blue
// peer-to-peer meetings around it. Nothing is actionable here: the event owns
// the schedule and the status, and tapping opens the institutional screen.
function InstitutionalAppointmentCard({ item, locale, onPress }) {
  const { t } = useTranslation();
  const other = item.counterpart || {};

  return (
    <Pressable
      onPress={onPress}
      className="rounded-2xl bg-surface border border-success/30 px-4 py-4 mb-3 active:opacity-80"
      style={{ gap: 12 }}
    >
      <View className="flex-row items-start justify-between" style={{ gap: 8 }}>
        <View className="flex-1" style={{ gap: 2 }}>
          <View className="flex-row items-center" style={{ gap: 6 }}>
            <Ionicons name="business" size={13} color="#16A34A" />
            <Text className="text-[10px] font-extrabold text-success uppercase tracking-wide">
              {t('institutional.short')}
            </Text>
          </View>
          <Text className="text-base font-bold text-foreground leading-6">
            {other.company || other.name || t('institutional.unknownCounterpart')}
          </Text>
          {other.company && other.name ? (
            <Text className="text-xs text-muted">{other.name}</Text>
          ) : null}
        </View>
        <Chip size="sm" variant="soft" color={item.status === 'cancelled' ? 'danger' : item.status === 'confirmed' ? 'success' : 'warning'}>
          <Chip.Label>{t(`institutional.status.${item.status}`)}</Chip.Label>
        </Chip>
      </View>

      <View className="flex-row flex-wrap" style={{ gap: 14 }}>
        <View className="flex-row items-center" style={{ gap: 6 }}>
          <Ionicons name="calendar-outline" size={14} color="#16A34A" />
          <Text className="text-xs font-semibold text-foreground">
            {item.date ? formatDateLabel(item.date, locale) : t('institutional.toBeDefined')}
          </Text>
        </View>
        {item.start_time && item.end_time ? (
          <View className="flex-row items-center" style={{ gap: 6 }}>
            <Ionicons name="time-outline" size={14} color="#16A34A" />
            <Text className="text-xs font-semibold text-foreground">
              {item.start_time} – {item.end_time}
            </Text>
          </View>
        ) : null}
        <View className="flex-row items-center" style={{ gap: 6 }}>
          <Ionicons name="location-outline" size={14} color="#16A34A" />
          <Text className="text-xs font-semibold text-foreground">{item.location}</Text>
        </View>
      </View>
    </Pressable>
  );
}

function AppointmentCard({ item, onCancel, locale }) {
  const { t } = useTranslation();
  const persona = item.persona || {};
  const initials = (persona.name || '?').slice(0, 2).toUpperCase();
  const canCancel = item.status === 'confirmed' || item.status === 'pending';

  return (
    <Card className="mb-3">
      <Card.Body>
        <View className="flex-row items-center" style={{ gap: 12 }}>
          {persona.photo ? (
            <Image
              source={{ uri: persona.photo }}
              style={{ width: 44, height: 44, borderRadius: 22 }}
              resizeMode="cover"
            />
          ) : (
            <Avatar size="md" color="default" variant="soft">
              <Avatar.Fallback>{initials}</Avatar.Fallback>
            </Avatar>
          )}
          <View className="flex-1" style={{ gap: 4 }}>
            <Text className="text-base font-bold text-foreground" numberOfLines={1}>
              {persona.name}
            </Text>
            {persona.company ? (
              <Text className="text-xs text-muted" numberOfLines={1}>{persona.company}</Text>
            ) : null}
          </View>
          <Chip size="sm" variant="soft" color={STATUS_COLOR[item.status] || 'default'}>
            <Chip.Label>{t(`appointments.status.${item.status}`)}</Chip.Label>
          </Chip>
        </View>

        <Separator className="my-3" />

        <View className="flex-row items-center flex-wrap" style={{ gap: 14 }}>
          <View className="flex-row items-center" style={{ gap: 6 }}>
            <Ionicons name="calendar-outline" size={15} color={ACCENT} />
            <Text className="text-xs font-semibold text-foreground">
              {formatDateLabel(item.date, locale)}
            </Text>
          </View>
          <View className="flex-row items-center" style={{ gap: 6 }}>
            <Ionicons name="time-outline" size={15} color={ACCENT} />
            <Text className="text-xs font-semibold text-foreground">
              {item.start_time} – {item.end_time}
            </Text>
          </View>
          <View className="flex-row items-center" style={{ gap: 6 }}>
            <Ionicons name={meetingTypeIcon(item.meeting_type)} size={15} color={ACCENT} />
            <Text className="text-xs font-semibold text-foreground">
              {t(`appointments.type.${item.meeting_type}`, item.meeting_type)}
            </Text>
          </View>
        </View>

        {item.meeting_type === 'video' && persona.video_link && item.status === 'confirmed' ? (
          <Button
            variant="secondary"
            size="sm"
            className="rounded-xl mt-3"
            onPress={() => Linking.openURL(persona.video_link).catch(() => {})}
          >
            <Ionicons name="videocam-outline" size={16} color={ACCENT} />
            <Button.Label>{t('appointments.joinVideo')}</Button.Label>
          </Button>
        ) : null}

        {canCancel ? (
          <Button
            variant="tertiary"
            size="sm"
            className="rounded-xl mt-2"
            onPress={() => onCancel(item)}
          >
            <Ionicons name="close-circle-outline" size={16} color="#EF4444" />
            <Button.Label style={{ color: '#EF4444' }}>{t('appointments.cancel')}</Button.Label>
          </Button>
        ) : null}
      </Card.Body>
    </Card>
  );
}

export default function AppointmentsScreen({ navigation }) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language || 'fr';
  const tabScroll = useTabBarScroll();
  const insets = useSafeAreaInsets();
  // B2B is peer-to-peer between approved participants — a plain visitor can
  // neither book nor be booked, and is sent to "Participer" instead.
  const { isParticipant, isExhibitorMember, isInstitutional, b2bPendingCount, refreshProfile } =
    useAuth();

  const [tab, setTab] = useState('contacts'); // 'contacts' | 'mine'
  const [personas, setPersonas] = useState([]);
  const [upcoming, setUpcoming] = useState([]);
  const [past, setPast] = useState([]);
  // Meetings the organiser arranged between institutions. They belong in this
  // list too — for an institution they are the appointments that matter most.
  const [institutional, setInstitutional] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Profile view sheet
  const [profileOpen, setProfileOpen] = useState(false);
  const [profilePersona, setProfilePersona] = useState(null);

  // Booking sheet state
  const [sheetOpen, setSheetOpen] = useState(false);
  const [activePersona, setActivePersona] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [slots, setSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [note, setNote] = useState('');
  const [booking, setBooking] = useState(false);

  const load = async () => {
    // Also re-reads `b2b_pending_count`, so the dot on the agenda button and
    // the tab bar reflects requests that arrived since the last visit.
    refreshProfile();
    try {
      const [pRes, aRes, iRes] = await Promise.allSettled([
        getPersonas(),
        getMyAppointments(),
        isInstitutional ? getInstitutionalAppointments() : Promise.resolve(null),
      ]);
      if (pRes.status === 'fulfilled') setPersonas(pRes.value?.data?.data || []);
      if (aRes.status === 'fulfilled') {
        setUpcoming(aRes.value?.data?.upcoming || []);
        setPast(aRes.value?.data?.past || []);
      }
      if (iRes.status === 'fulfilled' && iRes.value) {
        // Only my own: the rest of the programme lives on its own screen.
        setInstitutional((iRes.value?.data?.data || []).filter((a) => a.is_mine !== false));
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
    }, [isParticipant])
  );

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  // Keeps each sheet's native state in sync with ours — see useSheetGuard.
  const profileSheet = useSheetGuard(profileOpen, () => setProfileOpen(false));
  const bookingSheet = useSheetGuard(sheetOpen, () => setSheetOpen(false));
  const closeProfile = profileSheet.close;
  const closeBooking = bookingSheet.close;

  const openProfile = (persona) => {
    setProfilePersona(persona);
    setProfileOpen(true);
  };

  // ── Booking flow ──────────────────────────────────────────────────────────
  const openBooking = (persona) => {
    // Never open the sheet for a persona with no real availability — surfaces
    // as a blank/broken sheet otherwise (see bookable computation above).
    if (!persona?.available_dates?.length) return;
    closeProfile();
    setActivePersona(persona);
    setSelectedSlot(null);
    setSlots([]);
    setNote('');
    const firstDate = persona.available_dates?.[0] || null;
    setSelectedDate(firstDate);
    setSheetOpen(true);
    if (firstDate) fetchSlots(persona.slug, firstDate);
  };

  const fetchSlots = async (slug, date) => {
    setLoadingSlots(true);
    setSelectedSlot(null);
    try {
      const res = await getPersonaSlots(slug, date);
      setSlots(res?.data?.slots || []);
    } catch {
      setSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  };

  const pickDate = (date) => {
    setSelectedDate(date);
    if (activePersona) fetchSlots(activePersona.slug, date);
  };

  const confirmBooking = async () => {
    if (!activePersona || !selectedDate || !selectedSlot) return;
    setBooking(true);
    try {
      const res = await bookAppointment({
        persona_slug: activePersona.slug,
        date: selectedDate,
        start_time: selectedSlot.start,
        note: note.trim() || undefined,
      });
      closeBooking();
      // Speaker-managed personas start pending (they confirm); admin personas
      // are auto-confirmed. Message follows the real returned status.
      const pending = res?.data?.appointment?.status === 'pending';
      Alert.alert(
        pending ? t('appointments.requestSentTitle') : t('appointments.bookedTitle'),
        pending
          ? t('appointments.requestSentBody', { name: activePersona.name })
          : t('appointments.bookedBody', { name: activePersona.name })
      );
      setTab('mine');
      load();
    } catch (e) {
      const code = e?.response?.data?.code;
      const msg =
        code === 'SLOT_TAKEN'
          ? t('appointments.slotTaken')
          : code === 'ALREADY_BOOKED'
          ? t('appointments.alreadyBooked')
          : code === 'SPEAKER_UNAVAILABLE'
          ? t('appointments.speakerUnavailableMsg')
          : apiErrorMessage(e, t('appointments.bookError'));
      Alert.alert(t('common.error'), msg);
      // Refresh slots if the chosen one was taken.
      if (code === 'SLOT_TAKEN' && activePersona) fetchSlots(activePersona.slug, selectedDate);
    } finally {
      setBooking(false);
    }
  };

  const handleCancel = (item) => {
    Alert.alert(
      t('appointments.cancelTitle'),
      t('appointments.cancelBody', { name: item.persona?.name || '' }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('appointments.cancelConfirm'),
          style: 'destructive',
          onPress: async () => {
            try {
              await cancelAppointment(item.id);
              load();
            } catch {
              Alert.alert(t('common.error'), t('appointments.cancelError'));
            }
          },
        },
      ]
    );
  };

  // Institutional meetings first: they are scheduled by the event, not
  // requested, so they are commitments rather than pending asks.
  const mineData = [
    ...institutional.map((a) => ({ ...a, __institutional: true })),
    ...upcoming,
    ...past,
  ];

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      {/* ── Header ─────────────────────────────────── */}
      {/* The agenda button keeps the top-right corner — it is this screen's
          own counterpart, and the red dot has to be visible at a glance. */}
      <View className="px-4 pt-5 pb-3 flex-row items-start" style={{ gap: 12 }}>
        <MenuButton />
        <View className="flex-1">
          <Text className="text-2xl font-extrabold text-foreground">{t('b2b.title')}</Text>
          <Text className="text-sm text-muted mt-1">{t('b2b.subtitle')}</Text>
        </View>

        {isParticipant && !isExhibitorMember && (
          <Pressable
            onPress={() => navigation.navigate('B2BAgenda')}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={t('b2b.myAgenda')}
            className="h-11 px-3 rounded-2xl bg-accent flex-row items-center justify-center active:opacity-70"
            style={{ gap: 6 }}
          >
            <Ionicons name="briefcase-outline" size={18} color="#FFFFFF" />
            <Text className="text-sm font-bold text-accent-foreground" numberOfLines={1}>
              {t('b2b.myAgendaShort')}
            </Text>
            {b2bPendingCount > 0 && (
              <View
                className="absolute bg-danger rounded-full items-center justify-center"
                style={{ top: -3, insetInlineEnd: -3, minWidth: 18, height: 18, paddingHorizontal: 4 }}
              >
                <Text className="text-[10px] font-extrabold text-danger-foreground">
                  {b2bPendingCount > 9 ? '9+' : b2bPendingCount}
                </Text>
              </View>
            )}
          </Pressable>
        )}
      </View>

      {/* Institutional access. A separate programme deserves a separate door,
          in its own colour: cramming it next to the agenda made both buttons
          shrink and told the reader nothing about how they differ. */}
      {isInstitutional && (
        <Pressable
          onPress={() => navigation.navigate('InstitutionalB2B')}
          className="mx-4 mb-3 rounded-2xl bg-success-soft border border-success/30 px-4 py-3 flex-row items-center active:opacity-80"
          style={{ gap: 12 }}
        >
          <View className="w-10 h-10 rounded-xl bg-success items-center justify-center">
            <Ionicons name="business" size={20} color="#FFFFFF" />
          </View>
          <View className="flex-1">
            <Text className="text-sm font-extrabold text-foreground">{t('institutional.title')}</Text>
            <Text className="text-xs text-muted mt-0.5" numberOfLines={1}>
              {institutional.length > 0
                ? t('institutional.countMine', { count: institutional.length })
                : t('institutional.subtitle')}
            </Text>
          </View>
          <Ionicons name={forwardIcon()} size={18} color="#16A34A" />
        </Pressable>
      )}

      {/* ── Segmented control ──────────────────────── */}
      <View className="px-4 mb-4">
        <View className="flex-row bg-surface rounded-2xl p-1">
          {[
            { key: 'contacts', label: t('appointments.tabContacts') },
            { key: 'mine', label: t('appointments.tabMine', { count: upcoming.length + institutional.length }) },
          ].map((s) => {
            const active = tab === s.key;
            return (
              <Pressable
                key={s.key}
                onPress={() => setTab(s.key)}
                className={`flex-1 py-2.5 rounded-xl items-center ${active ? 'bg-accent' : ''}`}
              >
                <Text className={`text-sm font-bold ${active ? 'text-accent-foreground' : 'text-muted'}`}>
                  {s.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {loading ? (
        <View className="px-4" style={{ gap: 12 }}>
          {[0, 1, 2].map((i) => (
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
      ) : tab === 'contacts' ? (
        <FlatList
          {...tabScroll}
          data={personas}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 4, paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={ACCENT} />}
          renderItem={({ item }) => <PersonaCard item={item} onBook={openBooking} onView={openProfile} />}
          ListEmptyComponent={
            <View className="items-center py-16">
              <Ionicons name="people-outline" size={48} color={ACCENT} />
              <Text className="text-base font-bold text-foreground mt-4 mb-2">
                {t('appointments.emptyContactsTitle')}
              </Text>
              <Text className="text-sm text-muted text-center leading-5 px-8">
                {t('appointments.emptyContactsBody')}
              </Text>
            </View>
          }
        />
      ) : (
        <FlatList
          {...tabScroll}
          data={mineData}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 4, paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={ACCENT} />}
          keyExtractor={(item) => (item.__institutional ? `inst-${item.id}` : `apt-${item.id}`)}
          renderItem={({ item }) =>
            item.__institutional ? (
              <InstitutionalAppointmentCard
                item={item}
                locale={locale}
                onPress={() => navigation.navigate('InstitutionalB2B')}
              />
            ) : (
              <AppointmentCard item={item} onCancel={handleCancel} locale={locale} />
            )
          }
          ListEmptyComponent={
            <View className="items-center py-16">
              <Ionicons name="calendar-outline" size={48} color={ACCENT} />
              <Text className="text-base font-bold text-foreground mt-4 mb-2">
                {t('appointments.emptyMineTitle')}
              </Text>
              <Text className="text-sm text-muted text-center leading-5 px-8">
                {t('appointments.emptyMineBody')}
              </Text>
            </View>
          }
        />
      )}

      {/* ── Profile view BottomSheet ───────────────── */}
      {profileSheet.mounted ? (
      <BottomSheet key={profileSheet.key} isOpen={profileSheet.isOpen} onOpenChange={(o) => !o && closeProfile()}>
        <BottomSheet.Portal>
          <BottomSheet.Overlay />
          <BottomSheet.Content ref={profileSheet.ref} {...profileSheet.contentProps} snapPoints={['70%']} enableOverDrag={false} enableDynamicSizing={false} contentContainerClassName="h-full">
            <BottomSheetScrollView contentContainerStyle={{ paddingBottom: 40 }}>
              <View className="items-center pt-3 pb-5 px-4 border-b border-separator">
                {profilePersona?.photo ? (
                  <Image source={{ uri: profilePersona.photo }} style={{ width: 84, height: 84, borderRadius: 42 }} resizeMode="cover" />
                ) : (
                  <Avatar size="lg" color="default" variant="soft">
                    <Avatar.Fallback>{(profilePersona?.name || '?').slice(0, 2).toUpperCase()}</Avatar.Fallback>
                  </Avatar>
                )}
                <Text className="text-xl font-extrabold text-foreground mt-3 text-center">{profilePersona?.name}</Text>
                {profilePersona?.title || profilePersona?.company ? (
                  <Text className="text-sm text-muted mt-1 text-center">
                    {[profilePersona?.title, profilePersona?.company].filter(Boolean).join(' · ')}
                  </Text>
                ) : null}
                <View className="flex-row items-center mt-2" style={{ gap: 6 }}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: statusDot(profilePersona?.status || 'active') }} />
                  <Text className="text-xs font-bold text-muted uppercase">
                    {t(`speaker.statusValue.${profilePersona?.status || 'active'}`)}
                  </Text>
                </View>
              </View>

              <View className="px-4 pt-4" style={{ gap: 14 }}>
                {profilePersona?.bio ? (
                  <View>
                    <Text className={`text-[10px] font-bold text-muted ${latinLabel()} mb-1`}>{t('appointments.aboutLabel')}</Text>
                    <Text className="text-sm text-foreground leading-6">{profilePersona.bio}</Text>
                  </View>
                ) : null}
                <View style={{ gap: 10 }}>
                  {profilePersona?.company ? (
                    <View className="flex-row items-center" style={{ gap: 8 }}>
                      <Ionicons name="business-outline" size={15} color={ACCENT} />
                      <Text className="text-sm text-foreground">{profilePersona.company}</Text>
                    </View>
                  ) : null}
                  {profilePersona?.title ? (
                    <View className="flex-row items-center" style={{ gap: 8 }}>
                      <Ionicons name="briefcase-outline" size={15} color={ACCENT} />
                      <Text className="text-sm text-foreground">{profilePersona.title}</Text>
                    </View>
                  ) : null}
                  {/* Same room for everyone, so it is shown even on personas
                      saved before the location was fixed. */}
                  <View className="flex-row items-center" style={{ gap: 8 }}>
                    <Ionicons name="location-outline" size={15} color={ACCENT} />
                    <Text className="text-sm text-foreground">
                      {profilePersona?.location || MEETING_LOCATION}
                    </Text>
                  </View>
                  {profilePersona?.appointment_duration ? (
                    <View className="flex-row items-center" style={{ gap: 8 }}>
                      <Ionicons name="hourglass-outline" size={15} color={ACCENT} />
                      <Text className="text-sm text-foreground">
                        {t('appointments.duration', { min: profilePersona.appointment_duration })}
                      </Text>
                    </View>
                  ) : null}
                  {(profilePersona?.meeting_types?.length || 0) > 0 ? (
                    <View className="flex-row items-center" style={{ gap: 8 }}>
                      <Ionicons name={meetingTypeIcon(profilePersona.meeting_types[0])} size={15} color={ACCENT} />
                      <Text className="text-sm text-foreground">
                        {profilePersona.meeting_types
                          .map((m) => t(`appointments.type.${m}`, m))
                          .join(' · ')}
                      </Text>
                    </View>
                  ) : null}
                  {(profilePersona?.languages?.length || 0) > 0 ? (
                    <View className="flex-row items-center" style={{ gap: 8 }}>
                      <Ionicons name="language-outline" size={15} color={ACCENT} />
                      <Text className="text-sm text-foreground">{profilePersona.languages.join(' · ')}</Text>
                    </View>
                  ) : null}
                  {(profilePersona?.available_dates?.length || 0) > 0 ? (
                    <View className="flex-row items-start" style={{ gap: 8 }}>
                      <Ionicons name="calendar-outline" size={15} color={ACCENT} style={{ marginTop: 2 }} />
                      <Text className="text-sm text-foreground flex-1">
                        {profilePersona.available_dates
                          .map((d) => formatDateLabel(d, locale))
                          .join(' · ')}
                      </Text>
                    </View>
                  ) : null}
                </View>
                {(profilePersona?.tags?.length || 0) > 0 ? (
                  <View className="flex-row flex-wrap" style={{ gap: 8 }}>
                    {profilePersona.tags.map((tag) => (
                      <Chip key={tag} size="sm" variant="soft" color="default">
                        <Chip.Label>{tag}</Chip.Label>
                      </Chip>
                    ))}
                  </View>
                ) : null}
              </View>

              <View className="px-4 pt-6" style={{ gap: 12 }}>
                {((profilePersona?.bookable ?? true) && (profilePersona?.available_dates?.length || 0) > 0) ? (
                  <Button variant="primary" size="lg" className="rounded-2xl" onPress={() => openBooking(profilePersona)}>
                    <Ionicons name="calendar-outline" size={18} color="#FFFFFF" />
                    <Button.Label>{t('appointments.book')}</Button.Label>
                  </Button>
                ) : (
                  <Surface className="rounded-xl p-4">
                    <Text className="text-sm text-muted text-center">
                      {profilePersona?.already_booked
                        ? t('appointments.alreadyBookedMsg')
                        : (profilePersona?.status && profilePersona.status !== 'active')
                        ? t('appointments.speakerUnavailableMsg')
                        : t('appointments.noSlots')}
                    </Text>
                  </Surface>
                )}
                <Button variant="tertiary" size="lg" className="rounded-2xl" onPress={closeProfile}>
                  <Button.Label>{t('common.close')}</Button.Label>
                </Button>
              </View>
            </BottomSheetScrollView>
          </BottomSheet.Content>
        </BottomSheet.Portal>
      </BottomSheet>
      ) : null}

      {/* ── Booking BottomSheet ────────────────────── */}
      {bookingSheet.mounted ? (
      <BottomSheet
        key={bookingSheet.key}
        isOpen={bookingSheet.isOpen}
        onOpenChange={(open) => {
          if (!open) closeBooking();
        }}
      >
        <BottomSheet.Portal>
          <BottomSheet.Overlay />
          <BottomSheet.Content
            ref={bookingSheet.ref}
            {...bookingSheet.contentProps}
            snapPoints={['85%']}
            enableOverDrag={false}
            enableDynamicSizing={false}
            keyboardBehavior="interactive"
            keyboardBlurBehavior="restore"
            android_keyboardInputMode="adjustResize"
            contentContainerClassName="h-full"
          >
            <BottomSheetScrollView contentContainerStyle={{ paddingBottom: 40 }}>
              {/* Persona hero */}
              <View className="items-center pt-3 pb-5 px-4 border-b border-separator">
                {activePersona?.photo ? (
                  <Image
                    source={{ uri: activePersona.photo }}
                    style={{ width: 64, height: 64, borderRadius: 32 }}
                    resizeMode="cover"
                  />
                ) : (
                  <Avatar size="lg" color="default" variant="soft">
                    <Avatar.Fallback>
                      {(activePersona?.name || '?').slice(0, 2).toUpperCase()}
                    </Avatar.Fallback>
                  </Avatar>
                )}
                <Text className="text-xl font-extrabold text-foreground mt-3 text-center">
                  {activePersona?.name}
                </Text>
                {activePersona?.title || activePersona?.company ? (
                  <Text className="text-sm text-muted mt-1 text-center">
                    {[activePersona?.title, activePersona?.company].filter(Boolean).join(' · ')}
                  </Text>
                ) : null}
                {activePersona?.appointment_duration ? (
                  <Chip size="sm" variant="soft" color="default" className="mt-2">
                    <Chip.Label>
                      {t('appointments.duration', { min: activePersona.appointment_duration })}
                    </Chip.Label>
                  </Chip>
                ) : null}
              </View>

              {/* Date picker */}
              <View className="px-4 pt-5">
                <Text className={`text-[10px] font-bold text-muted ${latinLabel()} mb-3`}>
                  {t('appointments.chooseDate')}
                </Text>
                <View className="flex-row flex-wrap" style={{ gap: 8 }}>
                  {(activePersona?.available_dates || []).map((d) => {
                    const active = d === selectedDate;
                    return (
                      <Pressable
                        key={d}
                        onPress={() => pickDate(d)}
                        className={`px-4 py-2.5 rounded-xl border ${active ? 'bg-accent border-accent' : 'bg-surface border-separator'}`}
                      >
                        <Text className={`text-xs font-bold ${active ? 'text-accent-foreground' : 'text-foreground'}`}>
                          {formatDateLabel(d, locale)}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* Slots */}
              <View className="px-4 pt-5">
                <Text className={`text-[10px] font-bold text-muted ${latinLabel()} mb-3`}>
                  {t('appointments.chooseSlot')}
                </Text>
                {loadingSlots ? (
                  <View className="py-6 items-center">
                    <ActivityIndicator color={ACCENT} />
                  </View>
                ) : slots.length === 0 ? (
                  <Surface className="rounded-xl p-4">
                    <Text className="text-sm text-muted text-center">{t('appointments.noSlotsDate')}</Text>
                  </Surface>
                ) : (
                  <View className="flex-row flex-wrap" style={{ gap: 8 }}>
                    {slots.map((slot) => {
                      const isBooked = slot.status === 'booked';
                      const active = selectedSlot?.start === slot.start;
                      return (
                        <Pressable
                          key={slot.start}
                          onPress={() => !isBooked && setSelectedSlot(slot)}
                          disabled={isBooked}
                          className={`px-4 py-2.5 rounded-xl border ${
                            isBooked
                              ? 'bg-surface-secondary border-separator'
                              : active
                              ? 'bg-accent border-accent'
                              : 'bg-surface border-separator'
                          }`}
                        >
                          <Text
                            className={`text-sm font-bold ${
                              isBooked
                                ? 'text-muted line-through'
                                : active
                                ? 'text-accent-foreground'
                                : 'text-foreground'
                            }`}
                          >
                            {slot.label || slot.start}
                          </Text>
                          {isBooked ? (
                            <Text className={`text-[9px] text-muted mt-0.5 ${latinLabel('tracking-wide')}`}>
                              {t('appointments.booked')}
                            </Text>
                          ) : null}
                        </Pressable>
                      );
                    })}
                  </View>
                )}
              </View>

              {/* Optional note */}
              <View className="px-4 pt-5">
                <Text className={`text-[10px] font-bold text-muted ${latinLabel()} mb-3`}>
                  {t('appointments.noteLabel')}
                </Text>
                <Surface className="rounded-2xl px-5 py-5">
                  <NoteField value={note} onChangeText={setNote} />
                </Surface>
              </View>

              {/* Confirm */}
              <View className="px-4 pt-6" style={{ gap: 12 }}>
                <Button
                  variant="primary"
                  size="lg"
                  className="rounded-2xl"
                  onPress={confirmBooking}
                  disabled={!selectedSlot || booking}
                >
                  <Button.Label>
                    {booking ? t('appointments.booking') : t('appointments.confirmBooking')}
                  </Button.Label>
                </Button>
                <Button
                  variant="tertiary"
                  size="lg"
                  className="rounded-2xl"
                  onPress={closeBooking}
                >
                  <Button.Label>{t('common.cancel')}</Button.Label>
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
