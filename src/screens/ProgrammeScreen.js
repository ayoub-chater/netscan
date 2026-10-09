import { useCallback, useState } from 'react';
import { View, Text, Pressable, ScrollView, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { withUniwind } from 'uniwind';
import { useTranslation } from 'react-i18next';
import { Button, Skeleton } from 'heroui-native';
import MenuButton from '../components/MenuButton';
import { getConference } from '../services/api';
import { backIcon, arrowForwardIcon } from '../utils/rtl';
import { tr } from '../utils/localized';

const StyledIonicons = withUniwind(Ionicons);

// The event's preamble (conference.preamble, paragraphs split by a blank line)
// with a way into the sessions. Same endpoint as the Conference screen, so it
// follows the same published / preview rules.
export default function ProgrammeScreen({ navigation }) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [conference, setConference] = useState(null);

  const load = useCallback(async () => {
    try {
      const res = await getConference();
      setConference(res.data?.conference || null);
    } catch {
      setConference(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const preamble = tr(conference, 'preamble');
  const paragraphs = preamble ? preamble.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean) : [];
  const hasContent = !!conference && (paragraphs.length > 0 || tr(conference, 'preamble_title'));

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
            <StyledIonicons name={backIcon()} size={22} className="text-foreground" />
          </Pressable>
          <Text className="flex-1 text-xl font-extrabold text-foreground">
            {t('programme.title')}
          </Text>
          <MenuButton />
        </View>
      </View>

      {loading ? (
        <View className="px-4" style={{ gap: 12 }}>
          <Skeleton className="h-8 w-3/4 rounded-xl" />
          <Skeleton className="h-24 w-full rounded-2xl" />
          <Skeleton className="h-24 w-full rounded-2xl" />
        </View>
      ) : !hasContent ? (
        /* ── Empty state ────────────────────────────── */
        <View className="flex-1 items-center justify-center px-8" style={{ gap: 8 }}>
          <StyledIonicons name="document-text-outline" size={40} className="text-muted" />
          <Text className="text-sm font-bold text-foreground text-center">
            {t('programme.emptyTitle')}
          </Text>
          <Text className="text-xs text-muted text-center">
            {t('programme.emptySubtitle')}
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120, gap: 16 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
        >
          <View className="rounded-2xl bg-surface p-4" style={{ gap: 10 }}>
            <Text className="text-lg font-extrabold text-foreground">{tr(conference, 'title')}</Text>
            {tr(conference, 'description') ? (
              <View className="flex-row items-center" style={{ gap: 6 }}>
                <StyledIonicons name="calendar-outline" size={14} className="text-muted" />
                <Text className="flex-1 text-xs text-muted">{tr(conference, 'description')}</Text>
              </View>
            ) : null}
            {tr(conference, 'venue') ? (
              <View className="flex-row items-center" style={{ gap: 6 }}>
                <StyledIonicons name="location-outline" size={14} className="text-muted" />
                <Text className="flex-1 text-xs text-muted">{tr(conference, 'venue')}</Text>
              </View>
            ) : null}
            <Button variant="primary" size="md" className="rounded-xl mt-1" onPress={() => navigation.navigate('Conference')}>
              <Button.Label>{t('programme.seeSessions')}</Button.Label>
              <StyledIonicons name={arrowForwardIcon()} size={16} className="text-accent-foreground" />
            </Button>
          </View>

          {tr(conference, 'preamble_title') ? (
            <Text className="text-base font-extrabold text-foreground leading-6">{tr(conference, 'preamble_title')}</Text>
          ) : null}
          {paragraphs.map((paragraph, idx) => (
            <Text key={idx} className="text-sm text-foreground leading-6">{paragraph}</Text>
          ))}
        </ScrollView>
      )}
    </View>
  );
}
