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
  getPersonas,
  getPersonaSlots,
  bookAppointment,
  getMyAppointments,
  cancelAppointment,
} from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useTabBarScroll } from '../context/TabBarContext';
import PendingApproval from '../components/PendingApproval';
import SpeakerAppointmentsScreen from './SpeakerAppointmentsScreen';

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
  // Backend flags: `bookable` = active + has availability. Fall back to
  // available_dates for older payloads.
  const bookable = item.bookable ?? ((item.available_dates?.length || 0) > 0);
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
            <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
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
  const { isApproved, isSpeaker } = useAuth();

  const [tab, setTab] = useState('contacts'); // 'contacts' | 'mine'
  const [personas, setPersonas] = useState([]);
  const [upcoming, setUpcoming] = useState([]);
  const [past, setPast] = useState([]);
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
    try {
      const [pRes, aRes] = await Promise.allSettled([getPersonas(), getMyAppointments()]);
      if (pRes.status === 'fulfilled') setPersonas(pRes.value?.data?.data || []);
      if (aRes.status === 'fulfilled') {
        setUpcoming(aRes.value?.data?.upcoming || []);
        setPast(aRes.value?.data?.past || []);
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

  const openProfile = (persona) => {
    setProfilePersona(persona);
    setProfileOpen(true);
  };

  // ── Booking flow ──────────────────────────────────────────────────────────
  const openBooking = (persona) => {
    setProfileOpen(false);
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
      setSheetOpen(false);
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
          : e?.response?.data?.message || t('appointments.bookError');
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

  // Speakers get their own management dashboard — but only once an admin has
  // approved them (same gating as exhibitors).
  if (isSpeaker) {
    if (!isApproved) {
      return (
        <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
          <View className="px-4 pt-5 pb-4">
            <Text className="text-2xl font-extrabold text-foreground">{t('speaker.title')}</Text>
          </View>
          <PendingApproval />
        </View>
      );
    }
    return <SpeakerAppointmentsScreen />;
  }

  if (!isApproved) {
    return (
      <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
        <View className="px-4 pt-5 pb-4">
          <Text className="text-2xl font-extrabold text-foreground">{t('appointments.title')}</Text>
        </View>
        <PendingApproval />
      </View>
    );
  }

  const mineData = [...upcoming, ...past];

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      {/* ── Header ─────────────────────────────────── */}
      <View className="px-4 pt-5 pb-3">
        <Text className="text-2xl font-extrabold text-foreground">{t('appointments.title')}</Text>
        <Text className="text-sm text-muted mt-1">{t('appointments.subtitle')}</Text>
      </View>

      {/* ── Segmented control ──────────────────────── */}
      <View className="px-4 mb-4">
        <View className="flex-row bg-surface rounded-2xl p-1">
          {[
            { key: 'contacts', label: t('appointments.tabContacts') },
            { key: 'mine', label: t('appointments.tabMine', { count: upcoming.length }) },
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
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 4, paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={ACCENT} />}
          renderItem={({ item }) => (
            <AppointmentCard item={item} onCancel={handleCancel} locale={locale} />
          )}
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
      <BottomSheet isOpen={profileOpen} onOpenChange={(o) => !o && setProfileOpen(false)}>
        <BottomSheet.Portal>
          <BottomSheet.Overlay />
          <BottomSheet.Content snapPoints={['70%']} enableOverDrag={false} enableDynamicSizing={false} contentContainerClassName="h-full">
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
                    <Text className="text-[10px] font-bold text-muted uppercase tracking-widest mb-1">{t('appointments.aboutLabel')}</Text>
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
                  {profilePersona?.location ? (
                    <View className="flex-row items-center" style={{ gap: 8 }}>
                      <Ionicons name="location-outline" size={15} color={ACCENT} />
                      <Text className="text-sm text-foreground">{profilePersona.location}</Text>
                    </View>
                  ) : null}
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
                {(profilePersona?.bookable ?? ((profilePersona?.available_dates?.length || 0) > 0)) ? (
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
                <Button variant="tertiary" size="lg" className="rounded-2xl" onPress={() => setProfileOpen(false)}>
                  <Button.Label>{t('common.close')}</Button.Label>
                </Button>
              </View>
            </BottomSheetScrollView>
          </BottomSheet.Content>
        </BottomSheet.Portal>
      </BottomSheet>

      {/* ── Booking BottomSheet ────────────────────── */}
      <BottomSheet
        isOpen={sheetOpen}
        onOpenChange={(open) => {
          if (!open) setSheetOpen(false);
        }}
      >
        <BottomSheet.Portal>
          <BottomSheet.Overlay />
          <BottomSheet.Content
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
                <Text className="text-[10px] font-bold text-muted uppercase tracking-widest mb-3">
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
                <Text className="text-[10px] font-bold text-muted uppercase tracking-widest mb-3">
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
                            <Text className="text-[9px] text-muted mt-0.5 uppercase tracking-wide">
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
                <Text className="text-[10px] font-bold text-muted uppercase tracking-widest mb-3">
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
                  onPress={() => setSheetOpen(false)}
                >
                  <Button.Label>{t('common.cancel')}</Button.Label>
                </Button>
              </View>
            </BottomSheetScrollView>
          </BottomSheet.Content>
        </BottomSheet.Portal>
      </BottomSheet>
    </View>
  );
}
