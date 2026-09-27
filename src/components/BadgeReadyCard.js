import { useEffect, useState } from 'react';
import { View, Text, Pressable, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Button, Spinner } from 'heroui-native';
import useMyBadge from '../hooks/useMyBadge';

// Dismissal is remembered per release: if the organiser withdraws and
// publishes badges again, the card comes back.
const dismissKey = (releasedAt) => `badge_ready_dismissed:${releasedAt ?? ''}`;

/**
 * Home banner shown once the user's badge can be downloaded.
 */
export default function BadgeReadyCard({ style }) {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const { badge, opening, open } = useMyBadge();
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    if (!badge?.available) return;
    AsyncStorage.getItem(dismissKey(badge.released_at))
      .then((v) => setDismissed(v === '1'))
      .catch(() => setDismissed(false));
  }, [badge?.available, badge?.released_at]);

  if (!badge?.available || dismissed) return null;

  const dismiss = () => {
    setDismissed(true);
    AsyncStorage.setItem(dismissKey(badge.released_at), '1').catch(() => {});
  };

  const download = async () => {
    const ok = await open();
    if (!ok) Alert.alert(t('myBadge.downloadErrorTitle'), t('myBadge.downloadErrorBody'));
  };

  return (
    <View
      className="mx-4 rounded-2xl bg-accent px-4 py-4"
      style={[{ gap: 12 }, style]}
    >
      <View className="flex-row items-start" style={{ gap: 12 }}>
        <View className="w-10 h-10 rounded-xl bg-white/20 items-center justify-center">
          <Ionicons name="id-card" size={20} color="#FFFFFF" />
        </View>
        <Pressable className="flex-1" onPress={() => navigation.navigate('MyBadge')}>
          <Text className="text-base font-extrabold text-white">{t('myBadge.readyTitle')}</Text>
          <Text className="text-xs text-white/80 mt-0.5 leading-4">{t('myBadge.readyBody')}</Text>
        </Pressable>
        <Pressable
          onPress={dismiss}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={t('common.close')}
        >
          <Ionicons name="close" size={18} color="rgba(255,255,255,0.8)" />
        </Pressable>
      </View>
      <Button variant="secondary" size="md" className="rounded-xl" onPress={download} isDisabled={opening}>
        {opening ? <Spinner size="sm" /> : <Ionicons name="download-outline" size={18} color="#286EAD" />}
        <Button.Label>{t('myBadge.download')}</Button.Label>
      </Button>
    </View>
  );
}
