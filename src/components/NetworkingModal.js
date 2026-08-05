import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Image } from 'react-native';
import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { Ionicons } from '@expo/vector-icons';
import { withUniwind } from 'uniwind';
import { useTranslation } from 'react-i18next';
import {
  Avatar,
  BottomSheet,
  Button,
  Chip,
  ListGroup,
  Separator,
  Surface,
} from 'heroui-native';
import { roleLabel } from '../constants/roles';
import useSheetGuard from './useSheetGuard';

const StyledIonicons = withUniwind(Ionicons);

export default function NetworkingModal({ visible, result, onClose, onScanAgain, viewOnly = false }) {
  const { t } = useTranslation();

  // The sheet lives in a global Portal, so anything mounted here floats above
  // every screen of the app — a sheet that opens without data (no scan) shows
  // up on top of Home, Programme… That happened in production because the
  // sheet tree stayed mounted at all times and only its `isOpen` flag was
  // false. Nothing is mounted now unless there is an actual payload to show.
  const hasPayload = !!visible && !!result;
  // `onOpenChange(false)` also fires for the programmatic close we trigger
  // ourselves; without this the parent's onClose would run twice (in Scanner
  // that means a second navigation.goBack()).
  const hasPayloadRef = useRef(hasPayload);
  hasPayloadRef.current = hasPayload;

  // The parent clears `result` as soon as it closes us; keeping the last one
  // around means the card doesn't blank out mid close-animation.
  const [payload, setPayload] = useState(result);
  useEffect(() => {
    if (hasPayload) setPayload(result);
  }, [hasPayload, result]);

  // Same lifecycle as every other sheet in the app. The hand-rolled version
  // this replaces flipped `isOpen` on the next frame and relied on the library
  // catching that transition — which it misses when the portal publishes its
  // children late, leaving the sheet parked at the bottom of the screen (or not
  // appearing at all, depending on how the frames land on a given device).
  const sheet = useSheetGuard(hasPayload, () => {
    if (hasPayloadRef.current) onClose();
  });

  const targetPerson = payload?.scanner_view?.person || payload?.person;
  const message = payload?.scanner_view?.message;
  const name = targetPerson?.name || t('common.unknown');
  const role = targetPerson?.role || t('profile.defaultRole');
  const isExposant = role === 'Exposant';
  const initial = name[0]?.toUpperCase() || '?';
  const photo = isExposant
    ? targetPerson?.exhibitor_logo || targetPerson?.image
    : targetPerson?.image;

  const infoItems = targetPerson
    ? [
        targetPerson.company && { label: t('networking.organization'), value: targetPerson.company },
        targetPerson.secteur && { label: t('networking.sector'), value: targetPerson.secteur },
        targetPerson.email && { label: t('networking.email'), value: targetPerson.email },
        targetPerson.phone && { label: t('networking.phone'), value: targetPerson.phone },
        targetPerson.ville && { label: t('networking.city'), value: targetPerson.ville },
      ].filter(Boolean)
    : [];

  if (!sheet.mounted) return null;

  return (
    <BottomSheet
      key={sheet.key}
      isOpen={sheet.isOpen}
      onOpenChange={open => {
        if (!open) sheet.close();
      }}
    >
      <BottomSheet.Portal>
        <BottomSheet.Overlay />
        <BottomSheet.Content
          ref={sheet.ref}
          {...sheet.contentProps}
          snapPoints={['85%']}
          enableOverDrag={false}
          enableDynamicSizing={false}
          contentContainerClassName="h-full"
        >
          <BottomSheetScrollView contentContainerStyle={{ paddingBottom: 48 }}>
            {/* ── Icon + Title ───────────────────────── */}
            <View className="items-center pt-3 pb-5 px-6">
              {photo ? (
                <Image
                  source={{ uri: photo }}
                  style={{ width: 64, height: 64, borderRadius: 32, marginBottom: 16 }}
                  resizeMode="cover"
                />
              ) : (
                <View className="w-16 h-16 rounded-full items-center justify-center mb-4 bg-surface">
                  <Ionicons
                    name={viewOnly ? 'person-outline' : 'checkmark-circle'}
                    size={32}
                    color={viewOnly ? '#6B7280' : '#2db067'}
                  />
                </View>
              )}
              <Text className="text-2xl font-extrabold text-foreground mb-2 text-center">
                {viewOnly ? name : t('networking.sharedMoment')}
              </Text>
              <Text className="text-sm text-muted text-center leading-5">
                {viewOnly
                  ? t('networking.viewConnectedBody', { name })
                  : t('networking.scanSharedBody', { name })}
              </Text>
            </View>

            {/* ── Person Card ────────────────────────── */}
            <View className="px-6 mb-4">
              <Surface className="rounded-2xl p-5">
                {/* Avatar + name */}
                <View className="flex-row items-center mb-4" style={{ gap: 12 }}>
                  {photo ? (
                    <Image
                      source={{ uri: photo }}
                      style={{ width: 40, height: 40, borderRadius: 20 }}
                      resizeMode="cover"
                    />
                  ) : (
                    <Avatar size="md" color={isExposant ? 'success' : 'default'} variant="soft">
                      <Avatar.Fallback>{initial}</Avatar.Fallback>
                    </Avatar>
                  )}
                  <View className="flex-1" style={{ gap: 4 }}>
                    <Text className="text-base font-bold text-foreground">{name}</Text>
                    <Chip size="sm" variant="soft" color={isExposant ? 'success' : 'default'}>
                      <Chip.Label>{roleLabel(role)}</Chip.Label>
                    </Chip>
                  </View>
                </View>

                {/* Optional message quote */}
                {message ? (
                  <Surface className="rounded-xl p-3 mb-4" variant="secondary">
                    <Text className="text-sm text-muted italic leading-5">
                      "{message}"
                    </Text>
                  </Surface>
                ) : null}

                {/* Info rows */}
                {infoItems.length > 0 ? (
                  <ListGroup variant="transparent">
                    {infoItems.map((info, i) => (
                      <React.Fragment key={info.label}>
                        {i > 0 && <Separator className="mx-0" />}
                        <ListGroup.Item disabled>
                          <ListGroup.ItemContent>
                            <ListGroup.ItemDescription>{info.label}</ListGroup.ItemDescription>
                            <ListGroup.ItemTitle numberOfLines={1}>{info.value}</ListGroup.ItemTitle>
                          </ListGroup.ItemContent>
                        </ListGroup.Item>
                      </React.Fragment>
                    ))}
                  </ListGroup>
                ) : null}
              </Surface>
            </View>

            {/* ── Privacy note (scan flow) ───────────── */}
            {!viewOnly ? (
              <View className="px-6 mb-6">
                <Surface className="rounded-xl p-4" variant="secondary">
                  <Text className="text-xs text-muted text-center leading-4">
                    {t('networking.privacyNote')}
                  </Text>
                </Surface>
              </View>
            ) : null}

            {/* ── Action buttons ─────────────────────── */}
            <View className="px-6" style={{ gap: 12 }}>
              {!viewOnly ? (
                <Button
                  variant="secondary"
                  size="lg"
                  className="rounded-2xl"
                  onPress={onScanAgain}
                >
                  <Ionicons name="qr-code-outline" size={18} color="#2db067" />
                  <Button.Label>{t('networking.scanAnother')}</Button.Label>
                </Button>
              ) : null}
              <Button
                variant="primary"
                size="lg"
                className="rounded-2xl"
                onPress={onClose}
              >
                <Ionicons name={viewOnly ? 'close-outline' : 'checkmark-outline'} size={18} color="#FFFFFF" />
                <Button.Label>{viewOnly ? t('networking.close') : t('networking.finish')}</Button.Label>
              </Button>
            </View>
          </BottomSheetScrollView>
        </BottomSheet.Content>
      </BottomSheet.Portal>
    </BottomSheet>
  );
}
