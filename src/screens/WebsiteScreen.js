import React from 'react';
import { View, Text, Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { Button, Surface } from 'heroui-native';
import { EVENT_WEBSITE_URL } from '../constants/api';
import MenuButton from '../components/MenuButton';

// The event site opens in the phone's browser (see FloatingTabBar / AppMenu),
// so this screen is only a fallback for anything still routing to `Expos`.
export default function WebsiteScreen() {
    const { t } = useTranslation();
    const insets = useSafeAreaInsets();

    const openSite = () => {
        Linking.openURL(EVENT_WEBSITE_URL).catch(() => { });
    };

    return (
        <View
            className="flex-1 bg-background items-center justify-center px-6"
            style={{ paddingTop: insets.top }}
        >
            {/* No header on this screen — the menu button floats in the corner. */}
            {/* Full width + flex so the corner mirrors without a measurement
                pass — see the note in ScannerScreen. */}
            <View
                style={{ position: 'absolute', top: insets.top + 20, left: 16, right: 16 }}
                className="flex-row"
                pointerEvents="box-none"
            >
                <MenuButton />
            </View>
            <Surface className="rounded-2xl px-6 py-8 items-center w-full">
                <View className="w-16 h-16 rounded-full bg-accent-soft items-center justify-center mb-5">
                    <Ionicons name="globe-outline" size={32} color="#286EAD" />
                </View>
                <Text className="text-xl font-extrabold text-foreground text-center mb-2">
                    {t('website.openTitle')}
                </Text>
                <Text className="text-sm text-muted text-center leading-5 mb-6">
                    {t('website.openBody')}
                </Text>
                <Button variant="primary" size="lg" className="rounded-2xl w-full" onPress={openSite}>
                    <Ionicons name="open-outline" size={18} color="#FFFFFF" />
                    <Button.Label>{t('website.openButton')}</Button.Label>
                </Button>
            </Surface>
        </View>
    );
}
