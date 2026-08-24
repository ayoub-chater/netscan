import { View, Text, Pressable } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { withUniwind } from 'uniwind';
import QRCode from 'react-native-qrcode-svg';
import { Chip } from 'heroui-native';
import { useAuth } from '../context/AuthContext';
import MenuButton from '../components/MenuButton';
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
  const { scanner, badgeNumber, isExhibitorStaff, isExhibitorMember } = useAuth();

  const scannerName = scanner?.name || t('profile.defaultName');
  const scannerRole = scanner?.role || t('profile.defaultRole');
  const isExposant = scannerRole.toLowerCase() === 'exposant';
  // Members carry the stand's role for access and counting, but the badge
  // says "Membre d'équipe" so the person at the door can tell them apart
  // from whoever runs the organisation.
  const badgeRole = isExhibitorMember ? t('team.memberBadgeRole') : roleLabel(scannerRole);
  const company = isExhibitorStaff || isExhibitorMember || isExposant ? scanner?.company : null;
  const hasBadge = !!badgeNumber;
  const qrValue = hasBadge
    ? `${BADGE_BASE_URL}/${encodeURIComponent(badgeNumber)}`
    : null;

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
      <View className="flex-1 items-center justify-center px-4" style={{ gap: 24 }}>
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
      </View>
    </View>
  );
}
