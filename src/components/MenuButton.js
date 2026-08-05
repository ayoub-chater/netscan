import React from 'react';
import { Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useMenu } from '../context/MenuContext';

const ACCENT = '#286EAD';

// The one way into the app-wide menu. Every screen puts this in its header so
// the navigation is reachable from anywhere, not just the dashboard.
export default function MenuButton({
  color = ACCENT,
  size = 20,
  className = 'w-10 h-10 rounded-2xl bg-surface border border-separator items-center justify-center active:opacity-70',
  style,
}) {
  const { t } = useTranslation();
  const { openMenu } = useMenu();

  return (
    <Pressable
      onPress={openMenu}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel={t('menu.open')}
      className={className}
      style={style}
    >
      <Ionicons name="menu" size={size} color={color} />
    </Pressable>
  );
}
