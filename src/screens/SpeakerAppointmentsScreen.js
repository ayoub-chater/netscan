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

// Next `count` calendar days as YYYY-MM-DD.
function nextDays(count) {
  const out = [];
  const base = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    out.push(d.toISOString().slice(0, 10));
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
          <Avatar size="md" color="default" variant="soft">
            <Avatar.Fallback>{initials}</Avatar.Fallback>
          </Avatar>
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

export default function SpeakerAppointmentsScreen() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language || 'fr';
  const tabScroll = useTabBarScroll();
  const insets = useSafeAreaInsets();

  const [tab, setTab] = useState('meetings'); // 'meetings' | 'profile'
  const [persona, setPersona] = useState(null);
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

  const load = async () => {
    try {
      const [pRes, aRes] = await Promise.allSettled([
        getSpeakerPersona(),
        getSpeakerAppointments(),
      ]);
      if (pRes.status === 'fulfilled') setPersona(pRes.value?.data?.persona || null);
      if (aRes.status === 'fulfilled') {
        setUpcoming(aRes.value?.data?.upcoming || []);
        setPast(aRes.value?.data?.past || []);
        setPendingCount(aRes.value?.data?.pending_count || 0);
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
      location: persona.location || '',
      video_link: persona.video_link || '',
      appointment_duration: String(persona.appointment_duration || 30),
      status: persona.status || 'active',
      photo: null,
      photoPreview: persona.photo || null,
    });
    setEditOpen(true);
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
        company: form.company.trim(),
        bio: form.bio.trim(),
        location: form.location.trim(),
        video_link: form.video_link.trim(),
        appointment_duration: parseInt(form.appointment_duration, 10) || 30,
        status: form.status,
        photo: form.photo || undefined,
      });
      setPersona(res?.data?.persona || persona);
      setEditOpen(false);
    } catch (e) {
      Alert.alert(t('common.error'), e?.response?.data?.message || t('speaker.saveError'));
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
      setAvailOpen(false);
      await load();
    } catch (e) {
      Alert.alert(t('common.error'), e?.response?.data?.message || t('speaker.saveError'));
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
      <View className="px-4 pt-5 pb-3">
        <Text className="text-2xl font-extrabold text-foreground">{t('speaker.title')}</Text>
        <Text className="text-sm text-muted mt-1">{t('speaker.subtitle')}</Text>
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
                {persona?.location ? (
                  <View className="flex-row items-center" style={{ gap: 6 }}>
                    <Ionicons name="location-outline" size={14} color={ACCENT} />
                    <Text className="text-xs text-foreground font-semibold">{persona.location}</Text>
                  </View>
                ) : null}
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
      <BottomSheet isOpen={editOpen} onOpenChange={(o) => !o && setEditOpen(false)}>
        <BottomSheet.Portal>
          <BottomSheet.Overlay />
          <BottomSheet.Content snapPoints={['90%']} enableOverDrag={false} enableDynamicSizing={false} contentContainerClassName="h-full">
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

              <SheetField label={t('register.fullName')} value={form?.name} onChangeText={(v) => setForm((f) => ({ ...f, name: v }))} />
              <SheetField label={t('register.jobTitle')} value={form?.title} onChangeText={(v) => setForm((f) => ({ ...f, title: v }))} />
              <SheetField label={t('register.company')} value={form?.company} onChangeText={(v) => setForm((f) => ({ ...f, company: v }))} />
              <SheetField
                label={t('register.bio')}
                value={form?.bio}
                onChangeText={(v) => setForm((f) => ({ ...f, bio: v }))}
                multiline
                numberOfLines={3}
                style={{ minHeight: 72, textAlignVertical: 'top' }}
              />
              <SheetField label={t('speaker.location')} value={form?.location} onChangeText={(v) => setForm((f) => ({ ...f, location: v }))} />
              <SheetField label={t('speaker.videoLink')} value={form?.video_link} autoCapitalize="none" keyboardType="url" onChangeText={(v) => setForm((f) => ({ ...f, video_link: v }))} />

              {/* Duration */}
              <View>
                <Label>{t('speaker.duration')}</Label>
                <View className="flex-row flex-wrap mt-2" style={{ gap: 8 }}>
                  {[15, 20, 30, 45, 60].map((d) => {
                    const active = String(d) === String(form?.appointment_duration);
                    return (
                      <Pressable
                        key={d}
                        onPress={() => setForm((f) => ({ ...f, appointment_duration: String(d) }))}
                        className={`px-4 py-2 rounded-xl border ${active ? 'bg-accent border-accent' : 'bg-surface border-separator'}`}
                      >
                        <Text className={`text-sm font-bold ${active ? 'text-accent-foreground' : 'text-foreground'}`}>{d}m</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* Status */}
              <View>
                <Label>{t('speaker.statusLabel')}</Label>
                <View className="flex-row flex-wrap mt-2" style={{ gap: 8 }}>
                  {['active', 'on_break', 'inactive'].map((s) => {
                    const active = s === form?.status;
                    return (
                      <Pressable
                        key={s}
                        onPress={() => setForm((f) => ({ ...f, status: s }))}
                        className={`px-4 py-2 rounded-xl border ${active ? 'bg-accent border-accent' : 'bg-surface border-separator'}`}
                      >
                        <Text className={`text-sm font-bold ${active ? 'text-accent-foreground' : 'text-foreground'}`}>
                          {t(`speaker.statusValue.${s}`)}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <Button variant="primary" size="lg" className="rounded-2xl mt-2" onPress={saveProfile} disabled={savingProfile}>
                <Button.Label>{savingProfile ? t('speaker.saving') : t('speaker.save')}</Button.Label>
              </Button>
              <Button variant="tertiary" size="lg" className="rounded-2xl" onPress={() => setEditOpen(false)}>
                <Button.Label>{t('common.cancel')}</Button.Label>
              </Button>
            </BottomSheetScrollView>
          </BottomSheet.Content>
        </BottomSheet.Portal>
      </BottomSheet>

      {/* ── Add availability sheet ─────────────────────── */}
      <BottomSheet isOpen={availOpen} onOpenChange={(o) => !o && setAvailOpen(false)}>
        <BottomSheet.Portal>
          <BottomSheet.Overlay />
          <BottomSheet.Content snapPoints={['80%']} enableOverDrag={false} enableDynamicSizing={false} contentContainerClassName="h-full">
            <BottomSheetScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 16 }}>
              <Text className="text-lg font-extrabold text-foreground">{t('speaker.addSlot')}</Text>

              <View>
                <Text className="text-[10px] font-bold text-muted uppercase tracking-widest mb-3">{t('appointments.chooseDate')}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                  {nextDays(21).map((d) => {
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
                </ScrollView>
              </View>

              <View>
                <Text className="text-[10px] font-bold text-muted uppercase tracking-widest mb-3">{t('speaker.startTime')}</Text>
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
                <Text className="text-[10px] font-bold text-muted uppercase tracking-widest mb-3">{t('speaker.endTime')}</Text>
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
              <Button variant="tertiary" size="lg" className="rounded-2xl" onPress={() => setAvailOpen(false)}>
                <Button.Label>{t('common.cancel')}</Button.Label>
              </Button>
            </BottomSheetScrollView>
          </BottomSheet.Content>
        </BottomSheet.Portal>
      </BottomSheet>
    </View>
  );
}
