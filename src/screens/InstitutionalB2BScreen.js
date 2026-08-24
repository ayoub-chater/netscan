import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, Pressable, RefreshControl, Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { withUniwind } from 'uniwind';
import { useTranslation } from 'react-i18next';
import { Alert, Chip, Surface } from 'heroui-native';
import { getInstitutionalAppointments } from '../services/api';
import { apiErrorMessage } from '../utils/apiError';
import { backIcon, latinLabel } from '../utils/rtl';

const StyledIonicons = withUniwind(Ionicons);

// The institutional programme's own colour, distinct from the blue of
// peer-to-peer B2B: these meetings are arranged by the event, not requested.
const GREEN = '#16A34A';

function formatDateLabel(iso, locale) {
  try {
    const d = new Date(iso + 'T00:00:00');
    return d.toLocaleDateString(locale, { weekday: 'long', day: '2-digit', month: 'long' });
  } catch {
    return iso;
  }
}

const STATUS_COLOR = {
  // Matched, slot not fixed yet — a real state, not a missing value.
  to_schedule: 'warning',
  scheduled: 'default',
  confirmed: 'success',
  completed: 'default',
  cancelled: 'danger',
};

/**
 * Institutional B2B.
 *
 * Two halves: the meetings this institution is part of, in full, and the
 * confirmed programme between the others — who is meeting whom, without their
 * contact details. Read-only throughout: the organiser owns every schedule and
 * every status, so nothing here books, moves or cancels.
 */
export default function InstitutionalB2BScreen({ navigation }) {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();

  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);

  const load = useCallback(async () => {
    setErrorMsg(null);
    try {
      const res = await getInstitutionalAppointments();
      setAppointments(res?.data?.data ?? []);
    } catch (e) {
      setErrorMsg(apiErrorMessage(e, t('institutional.errorLoad')));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const mine = appointments.filter((a) => a.is_mine !== false);
  const others = appointments.filter((a) => a.is_mine === false);

  const upcoming = mine.filter((a) => a.status !== 'cancelled' && a.status !== 'completed');
  const past = mine.filter((a) => a.status === 'cancelled' || a.status === 'completed');

  const statusChip = (status) => (
    <Chip size="sm" variant="soft" color={STATUS_COLOR[status] || 'default'}>
      <Chip.Label>{t(`institutional.status.${status}`)}</Chip.Label>
    </Chip>
  );

  // Date · time · place, the three facts every card repeats.
  const metaRow = (item, muted = false) => (
    <View className="flex-row flex-wrap" style={{ gap: 14 }}>
      <View className="flex-row items-center" style={{ gap: 6 }}>
        <StyledIonicons
          name="calendar-outline"
          size={14}
          className={muted ? 'text-muted' : 'text-foreground'}
        />
        <Text className={`text-xs ${muted ? 'text-muted' : 'font-semibold text-foreground'}`}>
          {item.date ? formatDateLabel(item.date, i18n.language) : t('institutional.toBeDefined')}
        </Text>
      </View>

      {item.start_time && item.end_time ? (
        <View className="flex-row items-center" style={{ gap: 6 }}>
          <StyledIonicons
            name="time-outline"
            size={14}
            className={muted ? 'text-muted' : 'text-foreground'}
          />
          <Text className={`text-xs ${muted ? 'text-muted' : 'font-semibold text-foreground'}`}>
            {item.start_time} – {item.end_time}
          </Text>
        </View>
      ) : null}

      <View className="flex-row items-center" style={{ gap: 6 }}>
        <StyledIonicons
          name="location-outline"
          size={14}
          className={muted ? 'text-muted' : 'text-foreground'}
        />
        <Text className={`text-xs ${muted ? 'text-muted' : 'font-semibold text-foreground'}`}>
          {item.location}
        </Text>
      </View>
    </View>
  );

  // ── My own meeting: everything, contact details included ──────────────────
  const renderCard = (item) => {
    const other = item.counterpart || {};

    return (
      <Surface key={item.id} className="rounded-2xl mb-3 overflow-hidden">
        {/* A coloured spine rather than an avatar: institution names run long,
            and a two-letter circle told the reader nothing. */}
        <View className="flex-row">
          <View style={{ width: 4, backgroundColor: GREEN }} />

          <View className="flex-1 px-4 py-4" style={{ gap: 12 }}>
            <View className="flex-row items-start justify-between" style={{ gap: 8 }}>
              <View className="flex-1" style={{ gap: 2 }}>
                <Text className="text-[10px] font-extrabold text-muted uppercase tracking-wide">
                  {t('institutional.withLabel')}
                </Text>
                <Text className="text-base font-bold text-foreground leading-6">
                  {other.company || other.name || t('institutional.unknownCounterpart')}
                </Text>
                {other.company && other.name && other.company !== other.name ? (
                  <Text className="text-xs text-muted">{other.name}</Text>
                ) : null}
              </View>
              {statusChip(item.status)}
            </View>

            <View className="h-px bg-separator" />

            {metaRow(item)}

            {item.note ? (
              <View className="rounded-xl bg-surface-secondary px-3 py-2">
                <Text className="text-[10px] font-bold text-muted uppercase mb-1">
                  {t('institutional.organiserNote')}
                </Text>
                <Text className="text-xs text-foreground leading-5">{item.note}</Text>
              </View>
            ) : null}

            {other.email || other.phone ? (
              <View className="flex-row flex-wrap" style={{ gap: 8 }}>
                {other.email ? (
                  <Pressable
                    onPress={() => Linking.openURL(`mailto:${other.email}`)}
                    className="flex-row items-center rounded-xl bg-surface-secondary px-3 py-2 active:opacity-70"
                    style={{ gap: 6 }}
                  >
                    <StyledIonicons name="mail-outline" size={14} className="text-accent" />
                    <Text className={`text-xs text-foreground ${latinLabel()}`}>{other.email}</Text>
                  </Pressable>
                ) : null}
                {other.phone ? (
                  <Pressable
                    onPress={() => Linking.openURL(`tel:${other.phone}`)}
                    className="flex-row items-center rounded-xl bg-surface-secondary px-3 py-2 active:opacity-70"
                    style={{ gap: 6 }}
                  >
                    <StyledIonicons name="call-outline" size={14} className="text-accent" />
                    <Text className={`text-xs text-foreground ${latinLabel()}`}>{other.phone}</Text>
                  </Pressable>
                ) : null}
              </View>
            ) : null}
          </View>
        </View>
      </Surface>
    );
  };

  // ── Someone else's confirmed meeting: who meets whom, nothing more ────────
  const renderOtherCard = (item) => {
    const parties = item.parties || [];

    return (
      <Surface key={`other-${item.id}`} className="rounded-2xl px-4 py-3 mb-2" style={{ gap: 10 }}>
        <View className="flex-row items-start justify-between" style={{ gap: 8 }}>
          <View className="flex-1" style={{ gap: 6 }}>
            {parties.map((p, index) => (
              <View key={`${item.id}-p-${index}`} style={{ gap: 2 }}>
                {index > 0 ? (
                  <View className="flex-row items-center" style={{ gap: 6 }}>
                    <View className="h-px flex-1 bg-separator" />
                    <Text className="text-[10px] font-bold text-muted uppercase">
                      {t('institutional.with')}
                    </Text>
                    <View className="h-px flex-1 bg-separator" />
                  </View>
                ) : null}
                <Text className="text-sm font-semibold text-foreground leading-5">
                  {p.company || p.name}
                </Text>
              </View>
            ))}
          </View>
          {statusChip(item.status)}
        </View>

        {metaRow(item, true)}
      </Surface>
    );
  };

  const sectionTitle = (key, hint) => (
    <View className="px-1 mb-2 mt-5">
      <Text className="text-xs font-extrabold text-muted uppercase tracking-wide">{t(key)}</Text>
      {hint ? <Text className="text-xs text-muted mt-1 leading-4">{t(hint)}</Text> : null}
    </View>
  );

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      {/* ── Header ─────────────────────────────────── */}
      <View className="flex-row items-center px-4 pt-2 pb-3" style={{ gap: 12 }}>
        <Pressable
          onPress={() => navigation.goBack()}
          className="w-10 h-10 rounded-xl bg-surface items-center justify-center"
          hitSlop={8}
        >
          <StyledIonicons name={backIcon()} size={22} className="text-foreground" />
        </Pressable>
        <View className="flex-1">
          <Text className="text-xl font-extrabold text-foreground">{t('institutional.title')}</Text>
          <Text className="text-xs text-muted mt-0.5">{t('institutional.subtitle')}</Text>
        </View>
        <View
          className="w-10 h-10 rounded-xl items-center justify-center"
          style={{ backgroundColor: GREEN }}
        >
          <Ionicons name="business" size={20} color="#FFFFFF" />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={GREEN} />}
      >
        {errorMsg ? (
          <Alert status="danger" className="rounded-xl items-center mb-3">
            <Alert.Indicator className="pt-0" />
            <Alert.Content>
              <Alert.Title>{errorMsg}</Alert.Title>
            </Alert.Content>
          </Alert>
        ) : null}

        {/* Two numbers, so the page opens with an answer rather than a wall. */}
        <View className="flex-row" style={{ gap: 10 }}>
          <Surface className="flex-1 rounded-2xl px-4 py-3">
            <Text className="text-2xl font-extrabold text-foreground">{upcoming.length}</Text>
            <Text className="text-[11px] text-muted mt-0.5">{t('institutional.statMine')}</Text>
          </Surface>
          <Surface className="flex-1 rounded-2xl px-4 py-3">
            <Text className="text-2xl font-extrabold text-foreground">{others.length}</Text>
            <Text className="text-[11px] text-muted mt-0.5">{t('institutional.statProgramme')}</Text>
          </Surface>
        </View>

        <Text className="text-xs text-muted leading-5 mt-3 px-1">{t('institutional.intro')}</Text>

        {upcoming.length > 0 ? (
          <>
            {sectionTitle('institutional.upcoming')}
            {upcoming.map(renderCard)}
          </>
        ) : null}

        {past.length > 0 ? (
          <>
            {sectionTitle('institutional.past')}
            {past.map(renderCard)}
          </>
        ) : null}

        {others.length > 0 ? (
          <>
            {sectionTitle('institutional.programme', 'institutional.programmeHint')}
            {others.map(renderOtherCard)}
          </>
        ) : null}

        {!loading && appointments.length === 0 ? (
          <View className="items-center justify-center py-16" style={{ gap: 10 }}>
            <View className="w-16 h-16 rounded-full bg-success-soft items-center justify-center">
              <Ionicons name="business-outline" size={30} color={GREEN} />
            </View>
            <Text className="text-sm text-muted text-center px-8 leading-5">
              {t('institutional.empty')}
            </Text>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}
