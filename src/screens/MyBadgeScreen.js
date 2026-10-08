import { View, Text, Pressable, Alert, ScrollView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { withUniwind } from 'uniwind';
import QRCode from 'react-native-qrcode-svg';
import { Button, Chip, Spinner } from 'heroui-native';
import { useAuth } from '../context/AuthContext';
import MenuButton from '../components/MenuButton';
import useMyBadge from '../hooks/useMyBadge';
import { roleLabel } from '../constants/roles';
import { backIcon, latinTracking, ltrValue } from '../utils/rtl';

const StyledIonicons = withUniwind(Ionicons);

// Matches the backend badge QR exactly (simplesoftwareio/simple-qrcode output):
// a URL of the form https://plan.logiterre-expo.com/scan/badge/{badge_number}
const BADGE_BASE_URL = 'https://plan.logiterre-expo.com/scan/badge';

export default function MyBadgeScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { scanner, badgeNumber, isExhibitorStaff, isTeamMember, isExhibitorMember } = useAuth();

  const scannerName = scanner?.name || t('profile.defaultName');
  const scannerRole = scanner?.role || t('profile.defaultRole');
  const isExposant = scannerRole.toLowerCase() === 'exposant';
  // Stand staff print as Exposant, like the badge the server renders; only
  // sponsor / partner / speaker team members carry "Membre d'équipe".
  const badgeRole = isTeamMember && !isExhibitorMember ? t('team.memberBadgeRole') : roleLabel(scannerRole);
  const company = isExhibitorStaff || isTeamMember || isExposant ? scanner?.company : null;
  const hasBadge = !!badgeNumber;
  const qrValue = hasBadge
    ? `${BADGE_BASE_URL}/${encodeURIComponent(badgeNumber)}`
    : null;

  // Printable PDF — only once the organiser has released badges.
  const { badge, opening, open } = useMyBadge();
  const onDownload = async () => {
    const ok = await open();
    if (!ok) Alert.alert(t('myBadge.downloadErrorTitle'), t('myBadge.downloadErrorBody'));
  };

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
            <StyledIonicons name={backIcon()} size={22} className="text-foreground" />
          </Pressable>
          <View className="flex-1">
            <Text className="text-xl font-extrabold text-foreground">
              {t('myBadge.title')}
            </Text>
            <Text className="text-xs text-muted mt-0.5">
              {t('myBadge.subtitle')}
            </Text>
          </View>
          <MenuButton />
        </View>
      </View>

      {/* ── Content ────────────────────────────────── */}
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, paddingBottom: insets.bottom + 24, gap: 24 }}
      >
        {hasBadge ? (
          <>
            {/* QR card — always light for reliable scanning in any theme */}
            <View
              className="bg-white rounded-3xl items-center justify-center"
              style={{ padding: 28 }}
            >
              <QRCode
                value={qrValue}
                size={240}
                ecl="H"
                color="#0d1b2a"
                backgroundColor="#ffffff"
              />
            </View>

            {/* Identity */}
            <View className="items-center" style={{ gap: 8 }}>
              <Text className="text-2xl font-extrabold text-foreground">
                {scannerName}
              </Text>
              <Chip
                size="sm"
                variant="soft"
                color={isExposant ? 'success' : 'default'}
                style={{ alignSelf: 'center' }}
              >
                <Chip.Label>{badgeRole}</Chip.Label>
              </Chip>
              {/* The organisation the badge holder represents — staff carry
                  their exhibitor's name, so it must read on the badge too. */}
              {company ? (
                <View className="flex-row items-center" style={{ gap: 6 }}>
                  <StyledIonicons
                    name="business-outline"
                    size={14}
                    className="text-muted"
                  />
                  <Text className="text-sm font-semibold text-foreground">
                    {company}
                  </Text>
                </View>
              ) : null}
              <Text className={`text-sm text-muted ${latinTracking()} mt-1`} style={ltrValue()}>
                {badgeNumber}
              </Text>
            </View>

            {/* Printable badge (PDF) */}
            {badge?.available ? (
              <View className="w-full items-center" style={{ maxWidth: 340, gap: 8 }}>
                <Button
                  variant="primary"
                  size="lg"
                  className="rounded-2xl w-full"
                  onPress={onDownload}
                  isDisabled={opening}
                >
                  {opening ? (
                    <Spinner size="sm" color="#FFFFFF" />
                  ) : (
                    <Ionicons name="download-outline" size={20} color="#FFFFFF" />
                  )}
                  <Button.Label>{t('myBadge.download')}</Button.Label>
                </Button>
                <Text className="text-xs text-muted text-center leading-4">
                  {t(badge.format === 'a4' ? 'myBadge.formatA4' : 'myBadge.formatA6')}
                </Text>
              </View>
            ) : badge?.reason === 'not_released' ? (
              <View
                className="w-full flex-row items-center bg-surface rounded-2xl px-4 py-3"
                style={{ maxWidth: 340, gap: 10 }}
              >
                <StyledIonicons name="time-outline" size={18} className="text-muted" />
                <Text className="flex-1 text-xs text-muted leading-4">
                  {t('myBadge.notReleased')}
                </Text>
              </View>
            ) : null}
          </>
        ) : (
          <View className="items-center px-4" style={{ gap: 16 }}>
            <View className="w-20 h-20 rounded-full bg-surface items-center justify-center">
              <StyledIonicons
                name="qr-code-outline"
                size={38}
                className="text-muted"
              />
            </View>
            <Text className="text-lg font-extrabold text-foreground text-center">
              {t('myBadge.noBadgeTitle')}
            </Text>
            <Text className="text-sm text-muted text-center leading-5">
              {t('myBadge.noBadgeBody')}
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
