import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Image, Alert } from 'react-native';
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
  TextArea,
  TextField,
  useBottomSheetAwareHandlers,
} from 'heroui-native';
import { roleLabel } from '../constants/roles';
import { useAuth } from '../context/AuthContext';
import { saveNetworkingNote } from '../services/api';
import { apiErrorMessage } from '../utils/apiError';
import useSheetGuard from './useSheetGuard';

const NOTE_MAX = 1000;

// Lives inside the BottomSheet so it can use the sheet-aware focus handlers
// (keeps the field above the keyboard).
function NoteField({ value, onChangeText, placeholder }) {
  const { onFocus, onBlur } = useBottomSheetAwareHandlers();
  return (
    <TextField>
      <TextArea
        placeholder={placeholder}
        value={value}
        onChangeText={onChangeText}
        onFocus={onFocus}
        onBlur={onBlur}
        maxLength={NOTE_MAX}
        numberOfLines={4}
        style={{ minHeight: 88 }}
      />
    </TextField>
  );
}

const StyledIonicons = withUniwind(Ionicons);

export default function NetworkingModal({
  visible,
  result,
  onClose,
  onScanAgain,
  onNoteSaved,
  viewOnly = false,
}) {
  const { t } = useTranslation();
  const { badgeNumber } = useAuth();

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

  const targetPerson = payload?.scanner_view?.person || payload?.person;

  // ── Private note ───────────────────────────────────────────────────────
  // One note per connection, readable only by its two people (the scan
  // result carries none yet; a history entry carries the saved one).
  const [savedNote, setSavedNote] = useState(payload?.note || null);
  const [noteDraft, setNoteDraft] = useState(payload?.note?.text || '');
  const [savingNote, setSavingNote] = useState(false);
  useEffect(() => {
    setSavedNote(payload?.note || null);
    setNoteDraft(payload?.note?.text || '');
  }, [payload]);

  const noteDirty = noteDraft.trim() !== (savedNote?.text || '');
  // Read from the dismiss callback, which the sheet guard keeps from its
  // first render.
  const noteRef = useRef({});
  noteRef.current = { dirty: noteDirty, draft: noteDraft, personId: targetPerson?.id };

  const saveNote = async ({ silent = false } = {}) => {
    const { dirty, draft, personId } = noteRef.current;
    if (!dirty || !personId || !badgeNumber) return true;
    setSavingNote(true);
    try {
      const res = await saveNetworkingNote(badgeNumber, personId, draft.trim());
      const note = res?.data?.note || null;
      setSavedNote(note);
      setNoteDraft(note?.text || '');
      onNoteSaved?.(personId, note);
      return true;
    } catch (e) {
      if (!silent) Alert.alert(t('common.error'), apiErrorMessage(e, t('networking.noteError')));
      return false;
    } finally {
      setSavingNote(false);
    }
  };

  // Same lifecycle as every other sheet in the app. The hand-rolled version
  // this replaces flipped `isOpen` on the next frame and relied on the library
  // catching that transition — which it misses when the portal publishes its
  // children late, leaving the sheet parked at the bottom of the screen (or not
  // appearing at all, depending on how the frames land on a given device).
  // Closing with an unsaved note saves it rather than losing what was typed.
  const sheet = useSheetGuard(hasPayload, () => {
    if (noteRef.current.dirty) saveNote({ silent: true });
    if (hasPayloadRef.current) onClose();
  });

  const finish = async () => {
    if (!(await saveNote())) return;
    onClose();
  };

  const scanAgain = async () => {
    if (!(await saveNote())) return;
    onScanAgain();
  };

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
          keyboardBehavior="interactive"
          keyboardBlurBehavior="restore"
          android_keyboardInputMode="adjustResize"
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

            {/* ── Private note (only these two people) ─ */}
            {targetPerson?.id ? (
              <View className="px-6 mb-4">
                <Surface className="rounded-2xl p-5" style={{ gap: 10 }}>
                  <View className="flex-row items-center" style={{ gap: 8 }}>
                    <Ionicons name="lock-closed-outline" size={16} color="#286EAD" />
                    <Text className="text-sm font-bold text-foreground flex-1">
                      {t('networking.noteTitle')}
                    </Text>
                  </View>
                  <Text className="text-xs text-muted leading-4">
                    {t('networking.noteHint', { name })}
                  </Text>
                  <NoteField
                    value={noteDraft}
                    onChangeText={setNoteDraft}
                    placeholder={t('networking.notePlaceholder', { name })}
                  />
                  {savedNote && !noteDirty ? (
                    <Text className="text-xs text-muted">
                      {savedNote.by_me
                        ? t('networking.noteByMe')
                        : t('networking.noteByOther', { name })}
                    </Text>
                  ) : null}
                  {noteDirty ? (
                    <Button
                      variant="secondary"
                      size="sm"
                      className="rounded-xl"
                      onPress={() => saveNote()}
                      isDisabled={savingNote}
                    >
                      <Ionicons name="save-outline" size={16} color="#286EAD" />
                      <Button.Label>
                        {savingNote ? t('networking.noteSaving') : t('networking.noteSave')}
                      </Button.Label>
                    </Button>
                  ) : null}
                </Surface>
              </View>
            ) : null}

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
                  onPress={scanAgain}
                  isDisabled={savingNote}
                >
                  <Ionicons name="qr-code-outline" size={18} color="#2db067" />
                  <Button.Label>{t('networking.scanAnother')}</Button.Label>
                </Button>
              ) : null}
              <Button
                variant="primary"
                size="lg"
                className="rounded-2xl"
                onPress={finish}
                isDisabled={savingNote}
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
