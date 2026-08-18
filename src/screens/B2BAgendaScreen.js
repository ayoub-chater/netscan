import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  FlatList,
  ScrollView,
  Pressable,
  RefreshControl,
  Alert,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import * as ImagePicker from 'expo-image-picker';
import {
  Avatar,
  BottomSheet,
  Button,
  Card,
  Chip,
  Input,
  Label,
  Separator,
  Skeleton,
  Surface,
  TextField,
  useBottomSheetAwareHandlers,
} from 'heroui-native';
import {
  getSpeakerPersona,
  updateSpeakerPersona,
  addSpeakerAvailability,
  deleteSpeakerAvailability,
  getSpeakerAppointments,
  updateSpeakerAppointment,
} from '../services/api';
import { useTabBarScroll } from '../context/TabBarContext';
import { useAuth } from '../context/AuthContext';
import { MEETING_LOCATION } from '../constants/b2b';
import useSheetGuard from '../components/useSheetGuard';
import MenuButton from '../components/MenuButton';
import { backIcon, latinLabel } from '../utils/rtl';
import { apiErrorMessage } from '../utils/apiError';

const ACCENT = '#286EAD';

const STATUS_COLOR = {
  confirmed: 'success',
  pending: 'warning',
  cancelled: 'danger',
  completed: 'default',
  no_show: 'danger',
};

function formatDateLabel(iso, locale) {
  try {
    const d = new Date(iso + 'T00:00:00');
    return d.toLocaleDateString(locale, { weekday: 'short', day: '2-digit', month: 'short' });
  } catch {
    return iso;
  }
}

// Local YYYY-MM-DD. Never use toISOString() here — it converts to UTC and
// shifts the day backwards for positive-offset timezones (UTC+1 → yesterday).
const iso = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// Bookable dates for the event: from max(today, start) to end (inclusive).
// Falls back to the next 14 days if the event has no dates yet.
function eventDays(bounds) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let start = bounds?.start_date ? new Date(bounds.start_date + 'T00:00:00') : today;
  const end = bounds?.end_date ? new Date(bounds.end_date + 'T00:00:00') : null;
  if (start < today) start = today;

  const out = [];
  if (end) {
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      out.push(iso(new Date(d)));
    }
  } else {
    for (let i = 0; i < 14; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      out.push(iso(d));
    }
  }
  return out;
}

// Half-hour time options from 08:00 to 20:00.
const TIME_OPTIONS = (() => {
  const out = [];
  for (let h = 8; h <= 20; h++) {
    out.push(`${String(h).padStart(2, '0')}:00`);
    if (h < 20) out.push(`${String(h).padStart(2, '0')}:30`);
  }
  return out;
})();

function meetingTypeIcon(type) {
  if (type === 'video') return 'videocam-outline';
  if (type === 'phone') return 'call-outline';
  return 'location-outline';
}

// ── A meeting booked WITH the speaker ───────────────────────────────────────
function MeetingCard({ item, onAct, locale, busyId }) {
  const { t } = useTranslation();
  const guest = item.guest || {};
  const initials = (guest.name || '?').slice(0, 2).toUpperCase();
  const busy = busyId === item.id;

  return (
    <Card className="mb-3">
      <Card.Body>
        <View className="flex-row items-center" style={{ gap: 12 }}>
          {guest.photo ? (
            <Image
              source={{ uri: guest.photo }}
              style={{ width: 44, height: 44, borderRadius: 22 }}
              resizeMode="cover"
            />
          ) : (
            <Avatar size="md" color="default" variant="soft">
              <Avatar.Fallback>{initials}</Avatar.Fallback>
            </Avatar>
          )}
          <View className="flex-1" style={{ gap: 3 }}>
            <Text className="text-base font-bold text-foreground" numberOfLines={1}>
              {guest.name || '—'}
            </Text>
            {guest.company ? (
              <Text className="text-xs text-muted" numberOfLines={1}>{guest.company}</Text>
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

        {guest.email || guest.phone ? (
          <View className="mt-3" style={{ gap: 6 }}>
            {guest.email ? (
              <Pressable
                className="flex-row items-center"
                style={{ gap: 6 }}
                onPress={() => Linking.openURL(`mailto:${guest.email}`).catch(() => {})}
              >
                <Ionicons name="mail-outline" size={14} color={ACCENT} />
                <Text className="text-xs text-accent">{guest.email}</Text>
              </Pressable>
            ) : null}
            {guest.phone ? (
              <Pressable
                className="flex-row items-center"
                style={{ gap: 6 }}
                onPress={() => Linking.openURL(`tel:${guest.phone}`).catch(() => {})}
              >
                <Ionicons name="call-outline" size={14} color={ACCENT} />
                <Text className="text-xs text-accent">{guest.phone}</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}

        {item.note ? (
          <Surface className="rounded-xl p-3 mt-3">
            <Text className="text-xs text-muted leading-5">{item.note}</Text>
          </Surface>
        ) : null}

        {/* Actions by status */}
        {busy ? (
          <View className="py-3 items-center">
            <ActivityIndicator color={ACCENT} />
          </View>
        ) : item.status === 'pending' ? (
          <View className="flex-row mt-3" style={{ gap: 8 }}>
            <Button
              variant="primary"
              size="sm"
              className="rounded-xl flex-1"
              onPress={() => onAct(item, 'confirmed')}
            >
              <Ionicons name="checkmark-circle-outline" size={16} color="#FFFFFF" />
              <Button.Label>{t('speaker.confirm')}</Button.Label>
            </Button>
            <Button
              variant="tertiary"
              size="sm"
              className="rounded-xl flex-1"
              onPress={() => onAct(item, 'cancelled')}
            >
              <Ionicons name="close-circle-outline" size={16} color="#EF4444" />
              <Button.Label style={{ color: '#EF4444' }}>{t('speaker.decline')}</Button.Label>
            </Button>
          </View>
        ) : item.status === 'confirmed' ? (
          <View className="flex-row mt-3" style={{ gap: 8 }}>
            <Button
              variant="secondary"
              size="sm"
              className="rounded-xl flex-1"
              onPress={() => onAct(item, 'completed')}
            >
              <Ionicons name="checkmark-done-outline" size={16} color={ACCENT} />
              <Button.Label>{t('speaker.markDone')}</Button.Label>
            </Button>
            <Button
              variant="tertiary"
              size="sm"
              className="rounded-xl flex-1"
              onPress={() => onAct(item, 'cancelled')}
            >
              <Ionicons name="close-circle-outline" size={16} color="#EF4444" />
              <Button.Label style={{ color: '#EF4444' }}>{t('appointments.cancel')}</Button.Label>
            </Button>
          </View>
        ) : null}
      </Card.Body>
    </Card>
  );
}

// ── Bottom-sheet aware text field ───────────────────────────────────────────
function SheetField({ label, ...props }) {
  const { onFocus, onBlur } = useBottomSheetAwareHandlers();
  return (
    <TextField>
      {label ? <Label>{label}</Label> : null}
      <Input onFocus={onFocus} onBlur={onBlur} {...props} />
    </TextField>
  );
}

// The host side of B2B: any approved participant (exposant, intervenant,
// sponsor, partenaire…) manages their bookable profile, opens time slots, and
// confirms or declines the meetings others request with them. Adding a slot is
// what actually makes them appear in the B2B directory.
export default function B2BAgendaScreen({ navigation }) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language || 'fr';
  const tabScroll = useTabBarScroll();
  const insets = useSafeAreaInsets();
  const { refreshProfile } = useAuth();

  const [tab, setTab] = useState('meetings'); // 'meetings' | 'profile'
  const [persona, setPersona] = useState(null);
  const [eventBounds, setEventBounds] = useState(null);
  const [statusSaving, setStatusSaving] = useState(false);
  const [upcoming, setUpcoming] = useState([]);
  const [past, setPast] = useState([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState(null);

  // Profile edit sheet
  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState(null);
  const [savingProfile, setSavingProfile] = useState(false);

  // Availability add sheet
  const [availOpen, setAvailOpen] = useState(false);
  const [avDate, setAvDate] = useState(null);
  const [avStart, setAvStart] = useState(null);
  const [avEnd, setAvEnd] = useState(null);
  const [savingAvail, setSavingAvail] = useState(false);

  // Keeps each sheet's native state in sync with ours — see useSheetGuard.
  const editSheet = useSheetGuard(editOpen, () => setEditOpen(false));
  const availSheet = useSheetGuard(availOpen, () => setAvailOpen(false));
  const closeEdit = editSheet.close;
  const closeAvail = availSheet.close;

  const load = async () => {
    try {
      const [pRes, aRes] = await Promise.allSettled([
        getSpeakerPersona(),
        getSpeakerAppointments(),
      ]);
      if (pRes.status === 'fulfilled') {
        setPersona(pRes.value?.data?.persona || null);
        setEventBounds(pRes.value?.data?.event || null);
      }
      if (aRes.status === 'fulfilled') {
        setUpcoming(aRes.value?.data?.upcoming || []);
        setPast(aRes.value?.data?.past || []);
        setPendingCount(aRes.value?.data?.pending_count || 0);
        // Answering a request here must clear the red dot the tab bar and the
        // agenda button draw from the auth context's cached count.
        refreshProfile();
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

  // ── Meeting status action ───────────────────────────────────────────────
  const onAct = (item, status) => {
    const confirmKey =
      status === 'confirmed' ? 'speaker.confirmMsg'
      : status === 'completed' ? 'speaker.completeMsg'
      : 'speaker.cancelMsg';
    Alert.alert(
      t('speaker.actionTitle'),
      t(confirmKey, { name: item.guest?.name || '' }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.confirm'),
          style: status === 'cancelled' ? 'destructive' : 'default',
          onPress: async () => {
            setBusyId(item.id);
            try {
              await updateSpeakerAppointment(item.id, status);
              await load();
            } catch {
              Alert.alert(t('common.error'), t('speaker.actionError'));
            } finally {
              setBusyId(null);
            }
          },
        },
      ]
    );
  };

  // ── Profile edit ────────────────────────────────────────────────────────
  const openEdit = () => {
    if (!persona) return;
    setForm({
      name: persona.name || '',
      title: persona.title || '',
      company: persona.company || '',
      bio: persona.bio || '',
      // Fixed for everyone — shown read-only, never taken from the form.
      location: MEETING_LOCATION,
      appointment_duration: String(persona.appointment_duration || 30),
      buffer_time: String(persona.buffer_time ?? 0),
      status: persona.status || 'active',
      photo: null,
      photoPreview: persona.photo || null,
    });
    setEditOpen(true);
  };

  // Quick status change from the profile header (no full edit needed).
  const applyStatus = async (status) => {
    const prev = persona;
    setPersona({ ...persona, status }); // optimistic
    setStatusSaving(true);
    try {
      const res = await updateSpeakerPersona({ status });
      if (res?.data?.persona) setPersona(res.data.persona);
    } catch {
      setPersona(prev); // rollback
      Alert.alert(t('common.error'), t('speaker.saveError'));
    } finally {
      setStatusSaving(false);
    }
  };

  const quickStatus = (status) => {
    if (!persona || persona.status === status || statusSaving) return;
    Alert.alert(
      t('speaker.statusChangeTitle'),
      t('speaker.statusChangeMsg', { status: t(`speaker.statusValue.${status}`) }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('common.confirm'), onPress: () => applyStatus(status) },
      ]
    );
  };

  const pickPhoto = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!res.canceled && res.assets?.[0]) {
      const a = res.assets[0];
      const uri = a.uri;
      const name = uri.split('/').pop() || 'photo.jpg';
      const type = a.mimeType || 'image/jpeg';
      setForm((f) => ({ ...f, photo: { uri, name, type }, photoPreview: uri }));
    }
  };

  const saveProfile = async () => {
    if (!form) return;
    setSavingProfile(true);
    try {
      const res = await updateSpeakerPersona({
        name: form.name.trim(),
        title: form.title.trim(),
        bio: form.bio.trim(),
        location: MEETING_LOCATION,
        appointment_duration: parseInt(form.appointment_duration, 10) || 30,
        buffer_time: parseInt(form.buffer_time, 10) || 0,
        status: form.status,
        photo: form.photo || undefined,
      });
      setPersona(res?.data?.persona || persona);
      closeEdit();
    } catch (e) {
      Alert.alert(t('common.error'), apiErrorMessage(e, t('speaker.saveError')));
    } finally {
      setSavingProfile(false);
    }
  };

  // ── Availability ────────────────────────────────────────────────────────
  const openAvail = () => {
    setAvDate(null);
    setAvStart(null);
    setAvEnd(null);
    setAvailOpen(true);
  };

  const saveAvail = async () => {
    if (!avDate || !avStart || !avEnd) return;
    if (avEnd <= avStart) {
      Alert.alert(t('common.error'), t('speaker.timeOrderError'));
      return;
    }
    setSavingAvail(true);
    try {
      await addSpeakerAvailability({ date: avDate, start_time: avStart, end_time: avEnd });
      closeAvail();
      await load();
    } catch (e) {
      Alert.alert(t('common.error'), apiErrorMessage(e, t('speaker.saveError')));
    } finally {
      setSavingAvail(false);
    }
  };

  const removeAvail = (id) => {
    Alert.alert(t('speaker.removeSlotTitle'), t('speaker.removeSlotMsg'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.confirm'),
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteSpeakerAvailability(id);
            await load();
          } catch {
            Alert.alert(t('common.error'), t('speaker.actionError'));
          }
        },
      },
    ]);
  };

  const meetingsData = [...upcoming, ...past];

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View className="px-4 pt-5 pb-3 flex-row items-center" style={{ gap: 12 }}>
        {navigation ? (
          <Pressable
            onPress={() => navigation.goBack()}
            className="w-10 h-10 items-center justify-center rounded-xl bg-surface"
            hitSlop={8}
          >
            <Ionicons name={backIcon()} size={22} color={ACCENT} />
          </Pressable>
        ) : null}
        <View className="flex-1">
          <Text className="text-2xl font-extrabold text-foreground">{t('speaker.title')}</Text>
          <Text className="text-sm text-muted mt-1">{t('speaker.subtitle')}</Text>
        </View>
        <MenuButton />
      </View>

      {/* Segmented */}
      <View className="px-4 mb-4">
        <View className="flex-row bg-surface rounded-2xl p-1">
          {[
            { key: 'meetings', label: t('speaker.tabMeetings', { count: pendingCount }) },
            { key: 'profile', label: t('speaker.tabProfile') },
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
                <Skeleton isLoading variant="shimmer">
                  <View className="h-16 rounded-xl bg-surface-secondary" />
                </Skeleton>
              </Card.Body>
            </Card>
          ))}
        </View>
      ) : tab === 'meetings' ? (
        <FlatList
          {...tabScroll}
          data={meetingsData}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 4, paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={ACCENT} />}
          renderItem={({ item }) => (
            <MeetingCard item={item} onAct={onAct} locale={locale} busyId={busyId} />
          )}
          ListEmptyComponent={
            <View className="items-center py-16">
              <Ionicons name="calendar-outline" size={48} color={ACCENT} />
              <Text className="text-base font-bold text-foreground mt-4 mb-2">
                {t('speaker.emptyMeetingsTitle')}
              </Text>
              <Text className="text-sm text-muted text-center leading-5 px-8">
                {t('speaker.emptyMeetingsBody')}
              </Text>
            </View>
          }
        />
      ) : (
        <ScrollView
          {...tabScroll}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 4, paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={ACCENT} />}
        >
          {/* Quick status toggle */}
          <Surface className="rounded-2xl px-4 py-3 mb-4">
            <View className="flex-row items-center justify-between mb-2">
              <Text className={`text-xs font-bold text-muted ${latinLabel('tracking-wide')}`}>
                {t('speaker.quickStatus')}
              </Text>
              {statusSaving ? <ActivityIndicator size="small" color={ACCENT} /> : null}
            </View>
            <View className="flex-row" style={{ gap: 8 }}>
              {['active', 'on_break', 'inactive'].map((s) => {
                const active = persona?.status === s;
                const dot = s === 'active' ? '#22C55E' : s === 'on_break' ? '#F59E0B' : '#EF4444';
                return (
                  <Pressable
                    key={s}
                    onPress={() => quickStatus(s)}
                    className={`flex-1 flex-row items-center justify-center py-2 rounded-xl border ${active ? 'bg-accent border-accent' : 'bg-surface-secondary border-separator'}`}
                    style={{ gap: 6 }}
                  >
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: active ? '#FFFFFF' : dot }} />
                    <Text className={`text-xs font-bold ${active ? 'text-accent-foreground' : 'text-foreground'}`}>
                      {t(`speaker.statusValue.${s}`)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </Surface>

          {/* Persona summary */}
          <Card className="mb-4">
            <Card.Body>
              <View className="flex-row items-center" style={{ gap: 14 }}>
                {persona?.photo ? (
                  <Image
                    source={{ uri: persona.photo }}
                    style={{ width: 60, height: 60, borderRadius: 30 }}
                    resizeMode="cover"
                  />
                ) : (
                  <Avatar size="lg" color="default" variant="soft">
                    <Avatar.Fallback>{(persona?.name || '?').slice(0, 2).toUpperCase()}</Avatar.Fallback>
                  </Avatar>
                )}
                <View className="flex-1" style={{ gap: 4 }}>
                  <Text className="text-lg font-extrabold text-foreground" numberOfLines={1}>
                    {persona?.name}
                  </Text>
                  {persona?.title || persona?.company ? (
                    <Text className="text-xs text-muted" numberOfLines={1}>
                      {[persona?.title, persona?.company].filter(Boolean).join(' · ')}
                    </Text>
                  ) : null}
                  <Chip size="sm" variant="soft" color={persona?.status === 'active' ? 'success' : 'warning'} className="mt-1 self-start">
                    <Chip.Label>{t(`speaker.statusValue.${persona?.status || 'active'}`)}</Chip.Label>
                  </Chip>
                </View>
              </View>
              {persona?.bio ? (
                <Text className="text-sm text-muted leading-5 mt-3">{persona.bio}</Text>
              ) : null}
              <View className="flex-row flex-wrap mt-3" style={{ gap: 14 }}>
                <View className="flex-row items-center" style={{ gap: 6 }}>
                  <Ionicons name="hourglass-outline" size={14} color={ACCENT} />
                  <Text className="text-xs text-foreground font-semibold">
                    {t('appointments.duration', { min: persona?.appointment_duration || 30 })}
                  </Text>
                </View>
                <View className="flex-row items-center" style={{ gap: 6 }}>
                  <Ionicons name="location-outline" size={14} color={ACCENT} />
                  <Text className="text-xs text-foreground font-semibold">
                    {persona?.location || MEETING_LOCATION}
                  </Text>
                </View>
              </View>
              <Button variant="secondary" size="sm" className="rounded-xl mt-4" onPress={openEdit}>
                <Ionicons name="create-outline" size={16} color={ACCENT} />
                <Button.Label>{t('speaker.editProfile')}</Button.Label>
              </Button>
            </Card.Body>
          </Card>

          {/* Availability */}
          <View className="flex-row items-center justify-between mb-2 px-1">
            <Text className="text-sm font-bold text-foreground">{t('speaker.availability')}</Text>
            <Pressable onPress={openAvail} className="flex-row items-center" style={{ gap: 4 }} hitSlop={8}>
              <Ionicons name="add-circle" size={20} color={ACCENT} />
              <Text className="text-sm font-semibold text-accent">{t('speaker.addSlot')}</Text>
            </Pressable>
          </View>

          {(persona?.availabilities?.length || 0) === 0 ? (
            <Surface className="rounded-xl p-4">
              <Text className="text-sm text-muted text-center">{t('speaker.noAvailability')}</Text>
            </Surface>
          ) : (
            persona.availabilities.map((a) => (
              <Surface key={a.id} className="rounded-xl px-4 py-3 mb-2 flex-row items-center justify-between">
                <View className="flex-row items-center" style={{ gap: 10 }}>
                  <Ionicons name="calendar-outline" size={16} color={ACCENT} />
                  <View>
                    <Text className="text-sm font-bold text-foreground">{formatDateLabel(a.date, locale)}</Text>
                    <Text className="text-xs text-muted">{a.start_time} – {a.end_time}</Text>
                  </View>
                </View>
                <Pressable onPress={() => removeAvail(a.id)} hitSlop={8} className="p-1">
                  <Ionicons name="trash-outline" size={18} color="#EF4444" />
                </Pressable>
              </Surface>
            ))
          )}
        </ScrollView>
      )}

      {/* ── Edit profile sheet ─────────────────────────── */}
      {editSheet.mounted ? (
      <BottomSheet key={editSheet.key} isOpen={editSheet.isOpen} onOpenChange={(o) => !o && closeEdit()}>
        <BottomSheet.Portal>
          <BottomSheet.Overlay />
          <BottomSheet.Content
            ref={editSheet.ref}
            {...editSheet.contentProps}
            snapPoints={['90%']}
            enableOverDrag={false}
            enableDynamicSizing={false}
            keyboardBehavior="interactive"
            keyboardBlurBehavior="restore"
            android_keyboardInputMode="adjustResize"
            contentContainerClassName="h-full"
          >
            <BottomSheetScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 14 }}>
              <Text className="text-lg font-extrabold text-foreground">{t('speaker.editProfile')}</Text>

              <Pressable onPress={pickPhoto} className="items-center">
                {form?.photoPreview ? (
                  <Image source={{ uri: form.photoPreview }} style={{ width: 88, height: 88, borderRadius: 44 }} />
                ) : (
                  <Avatar size="lg" color="default" variant="soft">
                    <Avatar.Fallback>{(form?.name || '?').slice(0, 2).toUpperCase()}</Avatar.Fallback>
                  </Avatar>
                )}
                <Text className="text-xs text-accent font-semibold mt-2">{t('speaker.changePhoto')}</Text>
              </Pressable>

              <Surface className="rounded-2xl px-5 py-5 gap-4">
                <SheetField label={t('register.fullName')} placeholder={t('register.fullNamePlaceholder')} value={form?.name} onChangeText={(v) => setForm((f) => ({ ...f, name: v }))} />
                <SheetField label={t('register.jobTitle')} placeholder={t('register.jobTitlePlaceholder')} value={form?.title} onChangeText={(v) => setForm((f) => ({ ...f, title: v }))} />
                {/* Company is set at registration — read-only here. */}
                <View>
                  <Label>{t('register.company')}</Label>
                  <View className="bg-surface-secondary rounded-xl px-4 py-3 mt-1.5 flex-row items-center justify-between">
                    <Text className="text-sm text-muted flex-1" numberOfLines={1}>
                      {form?.company || '—'}
                    </Text>
                    <Ionicons name="lock-closed-outline" size={15} color="#9CA3AF" />
                  </View>
                </View>
                <SheetField
                  label={t('register.bio')}
                  placeholder={t('register.bioPlaceholder')}
                  value={form?.bio}
                  onChangeText={(v) => setForm((f) => ({ ...f, bio: v }))}
                  multiline
                  numberOfLines={3}
                  style={{ minHeight: 72, textAlignVertical: 'top' }}
                />
                {/* All B2B meetings happen in the networking room — read-only. */}
                <View>
                  <Label>{t('speaker.location')}</Label>
                  <View className="bg-surface-secondary rounded-xl px-4 py-3 mt-1.5 flex-row items-center justify-between">
                    <Text className="text-sm text-muted flex-1" numberOfLines={1}>
                      {MEETING_LOCATION}
                    </Text>
                    <Ionicons name="lock-closed-outline" size={15} color="#9CA3AF" />
                  </View>
                  <Text className="text-xs text-muted mt-1.5">{t('speaker.locationLocked')}</Text>
                </View>
              </Surface>

              {/* Duration (presets + custom) */}
              <Surface className="rounded-2xl px-5 py-5 gap-3">
                <Label>{t('speaker.duration')}</Label>
                <View className="flex-row flex-wrap" style={{ gap: 8 }}>
                  {[15, 20, 30, 45, 60].map((d) => {
                    const active = String(d) === String(form?.appointment_duration);
                    return (
                      <Pressable
                        key={d}
                        onPress={() => setForm((f) => ({ ...f, appointment_duration: String(d) }))}
                        className={`px-4 py-2 rounded-xl border ${active ? 'bg-accent border-accent' : 'bg-surface-secondary border-separator'}`}
                      >
                        <Text className={`text-sm font-bold ${active ? 'text-accent-foreground' : 'text-foreground'}`}>{d}m</Text>
                      </Pressable>
                    );
                  })}
                </View>
                <SheetField
                  label={t('speaker.customDuration')}
                  placeholder={t('speaker.minutesPlaceholder')}
                  value={form?.appointment_duration}
                  keyboardType="number-pad"
                  onChangeText={(v) => setForm((f) => ({ ...f, appointment_duration: v.replace(/[^0-9]/g, '') }))}
                />
              </Surface>

              {/* Buffer between meetings (presets + custom) */}
              <Surface className="rounded-2xl px-5 py-5 gap-3">
                <Label>{t('speaker.buffer')}</Label>
                <Text className="text-xs text-muted -mt-1">{t('speaker.bufferHint')}</Text>
                <View className="flex-row flex-wrap" style={{ gap: 8 }}>
                  {[0, 5, 10, 15, 30].map((b) => {
                    const active = String(b) === String(form?.buffer_time);
                    return (
                      <Pressable
                        key={b}
                        onPress={() => setForm((f) => ({ ...f, buffer_time: String(b) }))}
                        className={`px-4 py-2 rounded-xl border ${active ? 'bg-accent border-accent' : 'bg-surface-secondary border-separator'}`}
                      >
                        <Text className={`text-sm font-bold ${active ? 'text-accent-foreground' : 'text-foreground'}`}>
                          {b === 0 ? t('speaker.noBuffer') : `${b}m`}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
                <SheetField
                  label={t('speaker.customBuffer')}
                  placeholder={t('speaker.minutesPlaceholder')}
                  value={form?.buffer_time}
                  keyboardType="number-pad"
                  onChangeText={(v) => setForm((f) => ({ ...f, buffer_time: v.replace(/[^0-9]/g, '') }))}
                />
              </Surface>

              {/* Status */}
              <Surface className="rounded-2xl px-5 py-5 gap-2">
                <Label>{t('speaker.statusLabel')}</Label>
                <View className="flex-row flex-wrap mt-1" style={{ gap: 8 }}>
                  {['active', 'on_break', 'inactive'].map((s) => {
                    const active = s === form?.status;
                    return (
                      <Pressable
                        key={s}
                        onPress={() => setForm((f) => ({ ...f, status: s }))}
                        className={`px-4 py-2 rounded-xl border ${active ? 'bg-accent border-accent' : 'bg-surface-secondary border-separator'}`}
                      >
                        <Text className={`text-sm font-bold ${active ? 'text-accent-foreground' : 'text-foreground'}`}>
                          {t(`speaker.statusValue.${s}`)}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </Surface>

              <Button variant="primary" size="lg" className="rounded-2xl mt-2" onPress={saveProfile} disabled={savingProfile}>
                <Button.Label>{savingProfile ? t('speaker.saving') : t('speaker.save')}</Button.Label>
              </Button>
              <Button variant="tertiary" size="lg" className="rounded-2xl" onPress={closeEdit}>
                <Button.Label>{t('common.cancel')}</Button.Label>
              </Button>
            </BottomSheetScrollView>
          </BottomSheet.Content>
        </BottomSheet.Portal>
      </BottomSheet>
      ) : null}

      {/* ── Add availability sheet ─────────────────────── */}
      {availSheet.mounted ? (
      <BottomSheet key={availSheet.key} isOpen={availSheet.isOpen} onOpenChange={(o) => !o && closeAvail()}>
        <BottomSheet.Portal>
          <BottomSheet.Overlay />
          <BottomSheet.Content
            ref={availSheet.ref}
            {...availSheet.contentProps}
            snapPoints={['80%']}
            enableOverDrag={false}
            enableDynamicSizing={false}
            keyboardBehavior="interactive"
            keyboardBlurBehavior="restore"
            android_keyboardInputMode="adjustResize"
            contentContainerClassName="h-full"
          >
            <BottomSheetScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 16 }}>
              <Text className="text-lg font-extrabold text-foreground">{t('speaker.addSlot')}</Text>

              <View>
                <Text className={`text-[10px] font-bold text-muted ${latinLabel()} mb-3`}>{t('appointments.chooseDate')}</Text>
                <View className="flex-row flex-wrap" style={{ gap: 8 }}>
                  {eventDays(eventBounds).map((d) => {
                    const active = d === avDate;
                    return (
                      <Pressable
                        key={d}
                        onPress={() => setAvDate(d)}
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

              <View>
                <Text className={`text-[10px] font-bold text-muted ${latinLabel()} mb-3`}>{t('speaker.startTime')}</Text>
                <View className="flex-row flex-wrap" style={{ gap: 8 }}>
                  {TIME_OPTIONS.map((tm) => {
                    const active = tm === avStart;
                    return (
                      <Pressable
                        key={tm}
                        onPress={() => setAvStart(tm)}
                        className={`px-3 py-2 rounded-lg border ${active ? 'bg-accent border-accent' : 'bg-surface border-separator'}`}
                      >
                        <Text className={`text-xs font-bold ${active ? 'text-accent-foreground' : 'text-foreground'}`}>{tm}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <View>
                <Text className={`text-[10px] font-bold text-muted ${latinLabel()} mb-3`}>{t('speaker.endTime')}</Text>
                <View className="flex-row flex-wrap" style={{ gap: 8 }}>
                  {TIME_OPTIONS.filter((tm) => !avStart || tm > avStart).map((tm) => {
                    const active = tm === avEnd;
                    return (
                      <Pressable
                        key={tm}
                        onPress={() => setAvEnd(tm)}
                        className={`px-3 py-2 rounded-lg border ${active ? 'bg-accent border-accent' : 'bg-surface border-separator'}`}
                      >
                        <Text className={`text-xs font-bold ${active ? 'text-accent-foreground' : 'text-foreground'}`}>{tm}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <Button
                variant="primary"
                size="lg"
                className="rounded-2xl mt-2"
                onPress={saveAvail}
                disabled={!avDate || !avStart || !avEnd || savingAvail}
              >
                <Button.Label>{savingAvail ? t('speaker.saving') : t('speaker.addSlot')}</Button.Label>
              </Button>
              <Button variant="tertiary" size="lg" className="rounded-2xl" onPress={closeAvail}>
                <Button.Label>{t('common.cancel')}</Button.Label>
              </Button>
            </BottomSheetScrollView>
          </BottomSheet.Content>
        </BottomSheet.Portal>
      </BottomSheet>
      ) : null}
    </View>
  );
}
