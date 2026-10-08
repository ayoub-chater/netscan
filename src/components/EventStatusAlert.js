import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { EVENT_DAYS } from '../constants/contact';

const GREEN = '#16A34A';
const RED = '#DC2626';

// "09H00 – 19H00" → { open: '09:00', close: '19:00' }
function parseHours(hours) {
  const [open, close] = String(hours || '')
    .split(/[–-]/)
    .map((part) => part.trim().replace(/h/i, ':'));
  return { open: open || '09:00', close: close || '19:00' };
}

const at = (date, time) => new Date(`${date}T${time}:00`);

/**
 * Where the event stands at `now` (device local time), from EVENT_DAYS:
 *   { phase: 'before' }                       before the first day
 *   { phase: 'day', day, total, moment, … }   on an event day; moment is
 *                                             'before_open' | 'open' | 'closed'
 *   { phase: 'ended' }                        after the last day closes
 */
export function eventStatusAt(now) {
  const days = EVENT_DAYS.map((d) => ({ ...d, ...parseHours(d.hours) }));
  const total = days.length;
  if (!total) return { phase: 'before' };

  const last = days[total - 1];
  if (now >= at(last.date, last.close)) return { phase: 'ended' };
  if (now < at(days[0].date, '00:00')) return { phase: 'before' };

  // Between two event days (never the case for consecutive days) the next
  // day is what matters.
  const index = days.findIndex((d) => now < at(d.date, '23:59'));
  const today = days[index];
  const moment =
    now < at(today.date, today.open)
      ? 'before_open'
      : now < at(today.date, today.close)
      ? 'open'
      : 'closed';

  return {
    phase: 'day',
    day: index + 1,
    total,
    moment,
    open: today.open.replace(':', 'H'),
    close: today.close.replace(':', 'H'),
    nextOpen: days[index + 1]?.open.replace(':', 'H') ?? null,
  };
}

/**
 * Live event status, re-evaluated every minute so opening and closing times
 * flip it without a reload. `simulatedNow` (dev only) freezes it at a chosen
 * moment instead.
 */
export function useEventStatus(simulatedNow = null) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    if (simulatedNow) return undefined;
    setNow(new Date());
    const timer = setInterval(() => setNow(new Date()), 60 * 1000);
    return () => clearInterval(timer);
  }, [simulatedNow]);

  return eventStatusAt(simulatedNow || now);
}

// Soft heartbeat on the dot, only while the doors are open.
function PulseDot({ color, live }) {
  const scale = useSharedValue(1);

  useEffect(() => {
    scale.value = live
      ? withRepeat(withTiming(1.8, { duration: 1100, easing: Easing.out(Easing.quad) }), -1, false)
      : 1;
  }, [live]);

  const halo = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: live ? 2 - scale.value : 0,
  }), [live]);

  return (
    <View style={{ width: 10, height: 10, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View
        style={[
          { position: 'absolute', width: 10, height: 10, borderRadius: 5, backgroundColor: color, opacity: 0.4 },
          halo,
        ]}
      />
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
    </View>
  );
}

/**
 * Small pill on Home: green on each event day, red once the event is over,
 * nothing before it starts (the countdown covers that).
 */
export default function EventStatusAlert({ status, style }) {
  const { t } = useTranslation();
  if (!status || status.phase === 'before') return null;

  const ended = status.phase === 'ended';
  const color = ended ? RED : GREEN;

  let title;
  let body;
  if (ended) {
    title = t('eventStatus.endedTitle');
    body = t('eventStatus.endedBody');
  } else {
    const headline =
      status.day === status.total
        ? t('eventStatus.lastDay')
        : status.day === 1
        ? t('eventStatus.firstDay')
        : t('eventStatus.nextDay');
    title = `${t('eventStatus.dayLabel', { day: status.day, total: status.total })} · ${headline}`;
    body =
      status.moment === 'before_open'
        ? t('eventStatus.opensAt', { time: status.open })
        : status.moment === 'open'
        ? t('eventStatus.openUntil', { time: status.close })
        : t('eventStatus.closedToday', { time: status.nextOpen || status.open });
  }

  return (
    <View
      accessibilityRole="alert"
      className={`mx-4 rounded-2xl px-3.5 py-2.5 flex-row items-center border ${
        ended ? 'bg-danger-soft border-danger/30' : 'bg-success-soft border-success/30'
      }`}
      style={[{ gap: 10 }, style]}
    >
      <PulseDot color={color} live={!ended && status.moment === 'open'} />
      <View className="flex-1">
        <Text className={`text-sm font-extrabold ${ended ? 'text-danger' : 'text-success'}`} numberOfLines={1}>
          {title}
        </Text>
        <Text className="text-xs text-muted mt-0.5" numberOfLines={2}>
          {body}
        </Text>
      </View>
      <Ionicons
        name={ended ? 'flag-outline' : status.moment === 'open' ? 'sparkles-outline' : 'time-outline'}
        size={18}
        color={color}
      />
    </View>
  );
}

// ── Dev only: jump to any moment of the event ───────────────────────────────
const first = EVENT_DAYS[0];
const lastDay = EVENT_DAYS[EVENT_DAYS.length - 1];
const DEV_MOMENTS = [
  { label: 'Auto', value: null },
  { label: 'Avant', value: () => at(first.date, '08:00').getTime() - 24 * 3600 * 1000 },
  ...EVENT_DAYS.flatMap((d, i) => [
    { label: `J${i + 1} 08h`, value: () => at(d.date, '08:00') },
    { label: `J${i + 1} 12h`, value: () => at(d.date, '12:00') },
    { label: `J${i + 1} 20h`, value: () => at(d.date, '20:00') },
  ]).filter((m) => !(m.label === `J${EVENT_DAYS.length} 20h`)),
  { label: 'Fin', value: () => at(lastDay.date, '20:00') },
];

/**
 * Chips that freeze the alert at a chosen moment, so every state can be seen
 * without waiting for the event. Rendered only in development builds.
 */
export function EventStatusDevPanel({ value, onChange, style }) {
  if (!__DEV__) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 16, gap: 6 }}
      style={style}
    >
      <View className="justify-center pe-1">
        <Text className="text-[10px] font-bold text-warning">DEV</Text>
      </View>
      {DEV_MOMENTS.map((m) => {
        const active = m.label === (value?.label ?? 'Auto');
        return (
          <Pressable
            key={m.label}
            onPress={() => onChange(m.value ? { label: m.label, now: new Date(m.value()) } : null)}
            className={`px-2.5 py-1 rounded-full border ${
              active ? 'bg-warning border-warning' : 'border-separator'
            }`}
          >
            <Text className={`text-[11px] font-bold ${active ? 'text-warning-foreground' : 'text-muted'}`}>
              {m.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
