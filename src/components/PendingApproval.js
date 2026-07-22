import { View, Text } from 'react-native';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { withUniwind } from 'uniwind';
import { useTranslation } from 'react-i18next';
import { Button } from 'heroui-native';
import { useAuth } from '../context/AuthContext';

const StyledIonicons = withUniwind(Ionicons);

// Shown to exhibitors whose account is still awaiting admin approval.
// A refresh button re-checks status so an approved account unlocks in place.
export default function PendingApproval({ compact = false }) {
  const { t } = useTranslation();
  const { refreshProfile } = useAuth();
  const [checking, setChecking] = useState(false);

  const onCheck = async () => {
    setChecking(true);
    try {
      await refreshProfile();
    } finally {
      setChecking(false);
    }
  };

  return (
    <View
      className="items-center justify-center px-8"
      style={compact ? undefined : { flex: 1 }}
    >
      <View className="w-20 h-20 rounded-full bg-warning-soft items-center justify-center mb-6">
        <StyledIonicons name="time-outline" size={40} className="text-warning" />
      </View>
      <Text className="text-xl font-extrabold text-foreground text-center mb-3">
        {t('pending.title')}
      </Text>
      <Text className="text-sm text-muted text-center leading-6 mb-8">
        {t('pending.body')}
      </Text>
      <Button
        variant="secondary"
        size="md"
        className="rounded-2xl"
        onPress={onCheck}
        isDisabled={checking}
      >
        <Button.Label>
          {checking ? t('pending.checking') : t('pending.refresh')}
        </Button.Label>
      </Button>
    </View>
  );
}
