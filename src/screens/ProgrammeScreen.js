import { View, Text, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { withUniwind } from 'uniwind';
import { useTranslation } from 'react-i18next';
import MenuButton from '../components/MenuButton';

const StyledIonicons = withUniwind(Ionicons);

export default function ProgrammeScreen({ navigation }) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  return (
    <View className="flex-1 bg-background">
      {/* ── Header ─────────────────────────────────── */}
      <View className="px-4 pb-4" style={{ paddingTop: insets.top + 20 }}>
        <View className="flex-row items-center" style={{ gap: 12 }}>
          <Pressable
            onPress={() => navigation.goBack()}
            className="w-10 h-10 rounded-xl bg-surface items-center justify-center"
            hitSlop={8}
          >
            <StyledIonicons name="chevron-back" size={22} className="text-foreground" />
          </Pressable>
          <Text className="flex-1 text-xl font-extrabold text-foreground">
            {t('programme.title')}
          </Text>
          <MenuButton />
        </View>
      </View>

      {/* ── Empty state ────────────────────────────── */}
      <View className="flex-1 items-center justify-center px-8" style={{ gap: 8 }}>
        <StyledIonicons name="document-text-outline" size={40} className="text-muted" />
        <Text className="text-sm font-bold text-foreground text-center">
          {t('programme.emptyTitle')}
        </Text>
        <Text className="text-xs text-muted text-center">
          {t('programme.emptySubtitle')}
        </Text>
      </View>
    </View>
  );
}
