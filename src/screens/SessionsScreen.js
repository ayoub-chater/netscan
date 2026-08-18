import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, Pressable, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { withUniwind } from 'uniwind';
import { useTranslation } from 'react-i18next';
import { Alert, Button, Surface } from 'heroui-native';
import { getSessions, revokeSession, revokeOtherSessions } from '../services/api';
import { apiErrorMessage } from '../utils/apiError';
import { backIcon } from '../utils/rtl';

const StyledIonicons = withUniwind(Ionicons);

/**
 * "Where am I signed in?"
 *
 * A stolen token is indistinguishable from a legitimate one on the server —
 * the only reliable detector is the account owner recognising a device that
 * isn't theirs. This screen is that, plus the button that kills it.
 */
export default function SessionsScreen({ navigation }) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  const load = useCallback(async () => {
    setErrorMsg(null);
    try {
      const res = await getSessions();
      setSessions(res?.data?.sessions ?? []);
    } catch (e) {
      setErrorMsg(apiErrorMessage(e, t('sessions.errorLoad')));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const handleRevoke = async (id) => {
    setBusyId(id);
    setErrorMsg(null);
    try {
      await revokeSession(id);
      setSessions((prev) => prev.filter((s) => s.id !== id));
    } catch (e) {
      setErrorMsg(apiErrorMessage(e, t('sessions.errorRevoke')));
    } finally {
      setBusyId(null);
    }
  };

  const handleRevokeOthers = async () => {
    setBusyId('others');
    setErrorMsg(null);
    try {
      await revokeOtherSessions();
      setSessions((prev) => prev.filter((s) => s.is_current));
    } catch (e) {
      setErrorMsg(apiErrorMessage(e, t('sessions.errorRevoke')));
    } finally {
      setBusyId(null);
    }
  };

  const formatDate = (iso) => {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  const others = sessions.filter((s) => !s.is_current).length;

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      <View className="flex-row items-center px-4 py-3" style={{ gap: 12 }}>
        <Pressable
          onPress={() => navigation.goBack()}
          className="w-10 h-10 rounded-xl bg-surface items-center justify-center"
          hitSlop={8}
        >
          <StyledIonicons name={backIcon()} size={22} className="text-foreground" />
        </Pressable>
        <Text className="text-lg font-bold text-foreground">{t('sessions.title')}</Text>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40, gap: 12 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
      >
        <Text className="text-sm text-muted leading-5 px-1">
          {t('sessions.intro')}
        </Text>

        {errorMsg ? (
          <Alert status="danger" className="rounded-xl items-center">
            <Alert.Indicator className="pt-0" />
            <Alert.Content>
              <Alert.Title>{errorMsg}</Alert.Title>
            </Alert.Content>
          </Alert>
        ) : null}

        {sessions.map((s) => (
          <Surface key={s.id} className="rounded-2xl px-4 py-4 gap-2">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center" style={{ gap: 8 }}>
                <StyledIonicons name="phone-portrait-outline" size={18} className="text-accent" />
                <Text className="text-base font-semibold text-foreground">
                  {s.device_name || t('sessions.unknownDevice')}
                </Text>
              </View>
              {s.is_current ? (
                <View className="px-2 py-0.5 rounded-lg bg-accent-soft">
                  <Text className="text-[11px] font-bold text-accent">{t('sessions.current')}</Text>
                </View>
              ) : null}
            </View>

            <Text className="text-xs text-muted">
              {[s.platform, s.app_version, s.ip].filter(Boolean).join(' · ')}
            </Text>
            <Text className="text-xs text-muted">
              {t('sessions.lastUsed')}: {formatDate(s.last_used_at || s.created_at)}
            </Text>
            <Text className="text-xs text-muted">
              {t('sessions.expires')}: {formatDate(s.expires_at)}
            </Text>

            {!s.is_current ? (
              <Button
                variant="danger-soft"
                size="sm"
                className="mt-2 rounded-xl"
                onPress={() => handleRevoke(s.id)}
                isDisabled={busyId === s.id}
              >
                <Button.Label>{t('sessions.revoke')}</Button.Label>
              </Button>
            ) : null}
          </Surface>
        ))}

        {others > 0 ? (
          <Button
            variant="danger"
            size="lg"
            className="rounded-2xl mt-2"
            onPress={handleRevokeOthers}
            isDisabled={busyId === 'others'}
          >
            <Button.Label>{t('sessions.revokeOthers', { count: others })}</Button.Label>
          </Button>
        ) : null}

        {!loading && sessions.length === 0 ? (
          <Text className="text-sm text-muted text-center mt-8">{t('sessions.empty')}</Text>
        ) : null}
      </ScrollView>
    </View>
  );
}
