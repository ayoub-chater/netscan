import React from 'react';
import { View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';

/**
 * Whether this contact can be booked, said out loud.
 *
 * A missing "Réserver" button is ambiguous — nothing on the card told you
 * whether the person is away, closed to requests, or simply has no B2B profile
 * yet. The backend now answers that in one field (`availability`, built by
 * App\Support\B2BAvailability), and this renders it the same way on the
 * exhibitor directory, the partner directory and the B2B contact list.
 *
 * `available` is deliberately quiet — green dot, no shouting — while every
 * other state carries the reason, because that is the one people ask about.
 */
const STATE = {
  available:     { dot: '#22C55E', tone: 'text-success' },
  on_break:      { dot: '#F59E0B', tone: 'text-warning' },
  unavailable:   { dot: '#9CA3AF', tone: 'text-muted' },
  institutional: { dot: '#16A34A', tone: 'text-muted' },
};

export default function AvailabilityBadge({ availability, size = 'md', className = '' }) {
  const { t } = useTranslation();
  const key = STATE[availability] ? availability : 'unavailable';
  const state = STATE[key];
  const dotSize = size === 'sm' ? 6 : 8;

  // Institutions are not a bookable contact that happens to be busy — they are
  // outside peer B2B entirely, so an availability badge only invites the wrong
  // question. Their card carries no badge; the detail sheet still explains, in
  // a sentence, who arranges their meetings.
  if (key === 'institutional') {
    return null;
  }

  return (
    <View className={`flex-row items-center ${className}`} style={{ gap: 5 }}>
      <View
        style={{
          width: dotSize,
          height: dotSize,
          borderRadius: dotSize / 2,
          backgroundColor: state.dot,
        }}
      />
      <Text
        className={`${size === 'sm' ? 'text-[10px]' : 'text-xs'} font-bold ${state.tone}`}
        numberOfLines={1}
      >
        {t(`availability.${key}`)}
      </Text>
    </View>
  );
}

/**
 * The longer sentence, for a detail sheet where there is room to explain what
 * the reader can do about it.
 */
export function AvailabilityNote({ availability }) {
  const { t } = useTranslation();
  const key = STATE[availability] ? availability : 'unavailable';

  if (key === 'available') {
    return null;
  }

  return (
    <Text className="text-sm text-muted leading-5 text-center">
      {t(`availability.${key}Message`)}
    </Text>
  );
}
