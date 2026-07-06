import { View, Text, ScrollView, Pressable } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { withUniwind } from 'uniwind';

const StyledIonicons = withUniwind(Ionicons);

export default function TermsScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const sections = t('terms.sections', { returnObjects: true });

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      <StatusBar style="light" />

      {/* ── Header ─────────────────────────────────── */}
      <View className="px-4 pt-5 pb-4">
        <View className="flex-row items-center" style={{ gap: 12 }}>
          <Pressable
            onPress={() => navigation.goBack()}
            className="w-10 h-10 rounded-xl bg-surface items-center justify-center"
            hitSlop={8}
          >
            <StyledIonicons name="chevron-back" size={22} className="text-foreground" />
          </Pressable>
          <View className="flex-1">
            <Text className="text-xl font-extrabold text-foreground">
              {t('terms.title')}
            </Text>
            <Text className="text-xs text-muted mt-0.5">{t('terms.subtitle')}</Text>
          </View>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 60 }}
      >
        <View className="px-4" style={{ gap: 20 }}>
          <Text className="text-xs text-muted">{t('terms.lastUpdate')}</Text>

          {(Array.isArray(sections) ? sections : []).map((section) => (
            <View key={section.title} style={{ gap: 6 }}>
              <Text className="text-base font-bold text-foreground">
                {section.title}
              </Text>
              <Text className="text-sm text-muted leading-5">{section.body}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
