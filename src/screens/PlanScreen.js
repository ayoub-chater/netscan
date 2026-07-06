import { useRef, useState, useEffect } from 'react';
import { View, Text, ActivityIndicator, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { getEventInfo } from '../services/api';
import { useTabBarScroll } from '../context/TabBarContext';

export default function PlanScreen() {
  const { t } = useTranslation();
  const tabScroll = useTabBarScroll();
  const insets = useSafeAreaInsets();
  const webRef = useRef(null);
  const [planUrl, setPlanUrl] = useState(null);
  const [fetching, setFetching] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchPlanUrl = async () => {
    setFetching(true);
    setError(false);
    try {
      const res = await getEventInfo();
      const url = res?.data?.event?.space_plan_url;
      if (url) {
        setPlanUrl(url);
        setLoading(true);
      } else {
        setError(true);
      }
    } catch {
      setError(true);
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    fetchPlanUrl();
  }, []);

  const reload = () => {
    if (planUrl && !error) {
      setError(false);
      setLoading(true);
      webRef.current?.reload();
    } else {
      fetchPlanUrl();
    }
  };

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View className="px-4 pt-5 pb-4 flex-row items-center justify-between">
        <Text className="text-2xl font-extrabold text-foreground">{t('plan.title')}</Text>
        <Pressable onPress={reload} hitSlop={8} className="w-9 h-9 rounded-xl bg-surface items-center justify-center">
          <Ionicons name="refresh-outline" size={18} color="#2db067" />
        </Pressable>
      </View>

      {/* Content */}
      <View className="flex-1 mx-4 mb-4 rounded-2xl overflow-hidden bg-surface">
        {fetching ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator color="#286EAD" size="large" />
            <Text className="mt-3 text-sm text-muted font-semibold">
              {t('plan.loading')}
            </Text>
          </View>
        ) : error || !planUrl ? (
          <View className="flex-1 items-center justify-center px-8">
            <Ionicons name="wifi-outline" size={48} color="#2db067" />
            <Text className="text-base font-bold text-foreground mt-4 mb-2 text-center">
              {t('plan.errorTitle')}
            </Text>
            <Text className="text-sm text-muted text-center leading-5 mb-6">
              {t('plan.errorBody')}
            </Text>
            <Pressable onPress={reload} className="px-6 py-3 bg-accent rounded-2xl">
              <Text className="text-white font-bold text-sm">{t('plan.retry')}</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <WebView
              ref={webRef}
              source={{ uri: planUrl }}
              style={{ flex: 1, backgroundColor: 'transparent' }}
              onLoadStart={() => { setLoading(true); setError(false); }}
              onLoadEnd={() => setLoading(false)}
              onError={() => { setLoading(false); setError(true); }}
              javaScriptEnabled
              domStorageEnabled
              startInLoadingState={false}
              allowsInlineMediaPlayback
              contentInsetAdjustmentBehavior="never"
              mixedContentMode="always"
              thirdPartyCookiesEnabled
              originWhitelist={['*']}
              scrollEnabled
              onScroll={tabScroll.onScroll}
              showsVerticalScrollIndicator={false}
              showsHorizontalScrollIndicator={false}
            />
            {loading && (
              <View
                style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}
                className="bg-background"
              >
                <ActivityIndicator color="#286EAD" size="large" />
                <Text className="mt-3 text-sm text-muted font-semibold">
                  Chargement du plan…
                </Text>
              </View>
            )}
          </>
        )}
      </View>

      {/* Bottom padding for floating tab bar */}
      <View style={{ height: 90 }} />
    </View>
  );
}
