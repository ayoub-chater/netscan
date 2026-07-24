import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import {
  Avatar,
  Button,
  Chip,
  Dialog,
  ListGroup,
  Separator,
} from 'heroui-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { useTabBarScroll } from '../context/TabBarContext';

const THEME_OPTIONS = [
  { mode: 'system', labelKey: 'profile.system', icon: 'phone-portrait-outline' },
  { mode: 'light', labelKey: 'profile.light', icon: 'sunny-outline' },
  { mode: 'dark', labelKey: 'profile.dark', icon: 'moon-outline' },
];

const LANGUAGE_OPTIONS = [
  { code: 'fr', label: 'Français' },
  { code: 'en', label: 'English' },
  { code: 'ar', label: 'العربية' },
];

const APP_VERSION = '1.2.0';

const SUPPORT_EMAIL = 'contact@logiterre-expo.com';
const SUPPORT_PHONE = '+212 5 22 00 00 00';
const SUPPORT_WEBSITE = 'https://logiterre-expo.com';

export default function ProfileScreen() {
  const { t } = useTranslation();
  const { scanner, badgeNumber, signOut, isApproved, refreshProfile } = useAuth();

  // Refresh profile whenever the screen regains focus (approval status, edits).
  useFocusEffect(
    useCallback(() => {
      refreshProfile();
    }, [])
  );
  const { themeMode, setThemeMode } = useTheme();
  const { language, setLanguage } = useLanguage();
  const tabScroll = useTabBarScroll();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);

  const scannerName = scanner?.name || t('profile.defaultName');
  const scannerEmail = scanner?.email || '';
  const scannerRole = scanner?.role || t('profile.defaultRole');
  const isExposant = scannerRole.toLowerCase() === 'exposant';
  const initial = scannerName[0]?.toUpperCase() || '?';
  const profileImage = isExposant
    ? scanner?.exhibitor_logo || scanner?.image
    : scanner?.image;
  const isPending = isExposant && !isApproved;

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      <ScrollView
        {...tabScroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 140 }}
      >
        {/* ── Header ───────────────────────────────── */}
        <View className="px-4 pt-5 pb-6">
          <Text className="text-2xl font-extrabold text-foreground">
            {t('profile.settings')}
          </Text>
        </View>

        {/* ── Profile Card ─────────────────────────── */}
        <View className="mx-4 mb-8 bg-surface rounded-2xl px-5 py-5 flex-row items-center" style={{ gap: 16 }}>
          {profileImage ? (
            <Image
              source={{ uri: profileImage }}
              style={{ width: 56, height: 56, borderRadius: 28 }}
              resizeMode="cover"
            />
          ) : (
            <Avatar size="lg" color={isExposant ? 'success' : 'default'} variant="soft">
              <Avatar.Fallback>{initial}</Avatar.Fallback>
            </Avatar>
          )}
          <View className="flex-1" style={{ gap: 4 }}>
            <Text className="text-lg font-extrabold text-foreground">{scannerName}</Text>
            {scannerEmail ? (
              <Text className="text-sm text-muted">{scannerEmail}</Text>
            ) : null}
            <View className="flex-row items-center" style={{ gap: 6 }}>
              <Chip size="sm" variant="soft" color={isExposant ? 'success' : 'default'}>
                <Chip.Label>{scannerRole}</Chip.Label>
              </Chip>
              {isPending ? (
                <Chip size="sm" variant="soft" color="warning">
                  <Chip.Label>{t('pending.badge')}</Chip.Label>
                </Chip>
              ) : null}
            </View>
          </View>
        </View>

        {/* ── Edit Profile ─────────────────────────── */}
        <ListGroup className="mx-4 mb-6">
          <ListGroup.Item onPress={() => navigation.navigate('EditProfile')}>
            <ListGroup.ItemPrefix>
              <Ionicons name="create-outline" size={18} color="#286EAD" />
            </ListGroup.ItemPrefix>
            <ListGroup.ItemContent>
              <ListGroup.ItemTitle>{t('editProfile.title')}</ListGroup.ItemTitle>
              <ListGroup.ItemDescription>
                {t('editProfile.subtitle')}
              </ListGroup.ItemDescription>
            </ListGroup.ItemContent>
            <ListGroup.ItemSuffix>
              <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
            </ListGroup.ItemSuffix>
          </ListGroup.Item>
        </ListGroup>

        {/* ── Identity Section ─────────────────────── */}
        <Text className="text-[10px] font-bold text-muted uppercase tracking-widest px-6 mb-2">
          {t('profile.identity')}
        </Text>
        <ListGroup className="mx-4 mb-6">
          <ListGroup.Item>
            <ListGroup.ItemPrefix>
              <Ionicons name="id-card-outline" size={18} color="#286EAD" />
            </ListGroup.ItemPrefix>
            <ListGroup.ItemContent>
              <ListGroup.ItemTitle>{t('profile.role')}</ListGroup.ItemTitle>
            </ListGroup.ItemContent>
            <ListGroup.ItemSuffix>
              <Chip size="sm" variant="soft" color={isExposant ? 'success' : 'default'}>
                <Chip.Label>{scannerRole}</Chip.Label>
              </Chip>
            </ListGroup.ItemSuffix>
          </ListGroup.Item>
          <Separator className="mx-4" />
          <ListGroup.Item>
            <ListGroup.ItemPrefix>
              <Ionicons name="qr-code-outline" size={18} color="#286EAD" />
            </ListGroup.ItemPrefix>
            <ListGroup.ItemContent>
              <ListGroup.ItemTitle>{t('profile.badgeLinked')}</ListGroup.ItemTitle>
              <ListGroup.ItemDescription>
                {badgeNumber || t('profile.noBadge')}
              </ListGroup.ItemDescription>
            </ListGroup.ItemContent>
          </ListGroup.Item>
          <Separator className="mx-4" />
          <ListGroup.Item onPress={() => navigation.navigate('MyBadge')}>
            <ListGroup.ItemPrefix>
              <Ionicons name="qr-code" size={18} color="#286EAD" />
            </ListGroup.ItemPrefix>
            <ListGroup.ItemContent>
              <ListGroup.ItemTitle>{t('profile.myBadgeQr')}</ListGroup.ItemTitle>
              <ListGroup.ItemDescription>
                {t('profile.myBadgeQrDesc')}
              </ListGroup.ItemDescription>
            </ListGroup.ItemContent>
            <ListGroup.ItemSuffix>
              <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
            </ListGroup.ItemSuffix>
          </ListGroup.Item>
        </ListGroup>

        {/* ── Apparence ────────────────────────────── */}
        <Text className="text-[10px] font-bold text-muted uppercase tracking-widest px-6 mb-2">
          {t('profile.appearance')}
        </Text>
        <ListGroup className="mx-4 mb-6">
          {THEME_OPTIONS.map((option, index) => (
            <React.Fragment key={option.mode}>
              {index > 0 ? <Separator className="mx-4" /> : null}
              <ListGroup.Item onPress={() => setThemeMode(option.mode)}>
                <ListGroup.ItemPrefix>
                  <Ionicons name={option.icon} size={18} color="#286EAD" />
                </ListGroup.ItemPrefix>
                <ListGroup.ItemContent>
                  <ListGroup.ItemTitle>{t(option.labelKey)}</ListGroup.ItemTitle>
                </ListGroup.ItemContent>
                <ListGroup.ItemSuffix>
                  <Ionicons
                    name="checkmark"
                    size={20}
                    color="#286EAD"
                    style={{ opacity: themeMode === option.mode ? 1 : 0 }}
                  />
                </ListGroup.ItemSuffix>
              </ListGroup.Item>
            </React.Fragment>
          ))}
        </ListGroup>

        {/* ── Langue ───────────────────────────────── */}
        <Text className="text-[10px] font-bold text-muted uppercase tracking-widest px-6 mb-2">
          {t('profile.language')}
        </Text>
        <ListGroup className="mx-4 mb-6">
          {LANGUAGE_OPTIONS.map((option, index) => (
            <React.Fragment key={option.code}>
              {index > 0 ? <Separator className="mx-4" /> : null}
              <ListGroup.Item onPress={() => setLanguage(option.code)}>
                <ListGroup.ItemPrefix>
                  <Ionicons name="language-outline" size={18} color="#286EAD" />
                </ListGroup.ItemPrefix>
                <ListGroup.ItemContent>
                  <ListGroup.ItemTitle>{option.label}</ListGroup.ItemTitle>
                </ListGroup.ItemContent>
                <ListGroup.ItemSuffix>
                  <Ionicons
                    name="checkmark"
                    size={20}
                    color="#286EAD"
                    style={{ opacity: language === option.code ? 1 : 0 }}
                  />
                </ListGroup.ItemSuffix>
              </ListGroup.Item>
            </React.Fragment>
          ))}
        </ListGroup>

        {/* ── Support Section ──────────────────────── */}
        <Text className="text-[10px] font-bold text-muted uppercase tracking-widest px-6 mb-2">
          {t('profile.about')}
        </Text>
        <ListGroup className="mx-4 mb-8">
          <ListGroup.Item onPress={() => setSupportOpen(true)}>
            <ListGroup.ItemPrefix>
              <Ionicons name="help-circle-outline" size={18} color="#286EAD" />
            </ListGroup.ItemPrefix>
            <ListGroup.ItemContent>
              <ListGroup.ItemTitle>{t('profile.helpSupport')}</ListGroup.ItemTitle>
            </ListGroup.ItemContent>
            <ListGroup.ItemSuffix>
              <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
            </ListGroup.ItemSuffix>
          </ListGroup.Item>
          <Separator className="mx-4" />
          <ListGroup.Item onPress={() => navigation.navigate('Terms')}>
            <ListGroup.ItemPrefix>
              <Ionicons name="document-text-outline" size={18} color="#286EAD" />
            </ListGroup.ItemPrefix>
            <ListGroup.ItemContent>
              <ListGroup.ItemTitle>{t('profile.legalMentions')}</ListGroup.ItemTitle>
            </ListGroup.ItemContent>
            <ListGroup.ItemSuffix>
              <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
            </ListGroup.ItemSuffix>
          </ListGroup.Item>
        </ListGroup>

        {/* ── Logout ───────────────────────────────── */}
        <View className="mx-4">
          <Button
            size="lg"
            className="rounded-2xl"
            variant="secondary"
            onPress={() => setLogoutOpen(true)}
          >
            <Button.Label style={{ color: '#EF4444' }}>
              {t('profile.logout')}
            </Button.Label>
          </Button>
        </View>

        <Text className="text-center text-[11px] text-muted mt-8 pb-4">
          {t('profile.version', { version: APP_VERSION })}
        </Text>
      </ScrollView>

      {/* ── Logout Dialog ────────────────────────── */}
      <Dialog isOpen={logoutOpen} onOpenChange={setLogoutOpen}>
        <Dialog.Portal>
          <Dialog.Overlay />
          <Dialog.Content>
            <View className="mb-5" style={{ gap: 6 }}>
              <Dialog.Title>{t('profile.logoutTitle')}</Dialog.Title>
              <Dialog.Description>
                {t('profile.logoutBody')}
              </Dialog.Description>
            </View>
            <View className="flex-row justify-end" style={{ gap: 12 }}>
              <Button
                variant="tertiary"
                size="sm"
                onPress={() => setLogoutOpen(false)}
              >
                <Button.Label>{t('profile.stay')}</Button.Label>
              </Button>
              <Button variant="primary" size="sm" onPress={signOut}>
                <Button.Label>{t('profile.logoutConfirm')}</Button.Label>
              </Button>
            </View>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog>

      {/* ── Support Dialog ───────────────────────── */}
      <Dialog isOpen={supportOpen} onOpenChange={setSupportOpen}>
        <Dialog.Portal>
          <Dialog.Overlay />
          <Dialog.Content>
            <View className="mb-5" style={{ gap: 6 }}>
              <Dialog.Title>{t('profile.supportTitle')}</Dialog.Title>
              <Dialog.Description>
                {t('profile.supportBody')}
              </Dialog.Description>
            </View>

            <ListGroup className="mb-5">
              <ListGroup.Item onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}`)}>
                <ListGroup.ItemPrefix>
                  <Ionicons name="mail-outline" size={18} color="#286EAD" />
                </ListGroup.ItemPrefix>
                <ListGroup.ItemContent>
                  <ListGroup.ItemTitle>{t('profile.supportEmail')}</ListGroup.ItemTitle>
                  <ListGroup.ItemDescription>{SUPPORT_EMAIL}</ListGroup.ItemDescription>
                </ListGroup.ItemContent>
                <ListGroup.ItemSuffix>
                  <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
                </ListGroup.ItemSuffix>
              </ListGroup.Item>
              <Separator className="mx-4" />
              <ListGroup.Item onPress={() => Linking.openURL(`tel:${SUPPORT_PHONE.replace(/\s/g, '')}`)}>
                <ListGroup.ItemPrefix>
                  <Ionicons name="call-outline" size={18} color="#286EAD" />
                </ListGroup.ItemPrefix>
                <ListGroup.ItemContent>
                  <ListGroup.ItemTitle>{t('profile.supportPhone')}</ListGroup.ItemTitle>
                  <ListGroup.ItemDescription>{SUPPORT_PHONE}</ListGroup.ItemDescription>
                </ListGroup.ItemContent>
                <ListGroup.ItemSuffix>
                  <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
                </ListGroup.ItemSuffix>
              </ListGroup.Item>
              <Separator className="mx-4" />
              <ListGroup.Item onPress={() => Linking.openURL(SUPPORT_WEBSITE)}>
                <ListGroup.ItemPrefix>
                  <Ionicons name="globe-outline" size={18} color="#286EAD" />
                </ListGroup.ItemPrefix>
                <ListGroup.ItemContent>
                  <ListGroup.ItemTitle>{t('profile.supportWebsite')}</ListGroup.ItemTitle>
                  <ListGroup.ItemDescription>{SUPPORT_WEBSITE.replace('https://', '')}</ListGroup.ItemDescription>
                </ListGroup.ItemContent>
                <ListGroup.ItemSuffix>
                  <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
                </ListGroup.ItemSuffix>
              </ListGroup.Item>
            </ListGroup>

            <View className="flex-row justify-end">
              <Button variant="tertiary" size="sm" onPress={() => setSupportOpen(false)}>
                <Button.Label>{t('common.close')}</Button.Label>
              </Button>
            </View>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog>
    </View>
  );
}
