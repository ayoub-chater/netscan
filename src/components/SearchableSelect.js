import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  TextInput,
  FlatList,
  ActivityIndicator,
  Keyboard,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { withUniwind } from 'uniwind';

const StyledIonicons = withUniwind(Ionicons);

// Accent-insensitive search ("Emirats" matches "Émirats"). `normalize` is not
// guaranteed on every JS engine build, hence the guard.
// Built from char codes so the source file stays plain ASCII (U+0300–U+036F).
const COMBINING_MARKS = new RegExp(
  '[' + String.fromCharCode(0x300) + '-' + String.fromCharCode(0x36f) + ']',
  'g'
);

const fold = (value) => {
  const lower = String(value ?? '').toLowerCase();
  try {
    return lower.normalize('NFD').replace(COMBINING_MARKS, '');
  } catch {
    return lower;
  }
};

/**
 * Field that looks like a heroui `Input` but opens a searchable list.
 *
 * items: [{ key, label, prefix? }]
 */
export default function SearchableSelect({
  label,
  isRequired = false,
  placeholder,
  value,
  items = [],
  onSelect,
  title,
  searchPlaceholder,
  emptyText,
  isLoading = false,
  isDisabled = false,
  disabledHint,
  errorText,
  onRetry,
}) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  // The sheet is bottom-anchored inside a Modal, so the keyboard draws over it
  // instead of resizing it. Tracking the keyboard height lets us lift the sheet
  // by exactly that much — otherwise a short result list (one match) ends up
  // entirely hidden behind the keyboard.
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, (e) =>
      setKeyboardHeight(e.endCoordinates?.height ?? 0)
    );
    const hideSub = Keyboard.addListener(hideEvent, () => setKeyboardHeight(0));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const filtered = useMemo(() => {
    const q = fold(query.trim());
    if (!q) return items;
    return items.filter((item) => fold(item.label).includes(q));
  }, [items, query]);

  const openPicker = () => {
    if (isDisabled || isLoading) return;
    setQuery('');
    setOpen(true);
  };

  return (
    <View className="w-full">
      {label ? (
        <View className="flex-row items-center mb-1.5" style={{ gap: 3 }}>
          <Text className="text-sm font-medium text-foreground">{label}</Text>
          {isRequired ? <Text className="text-sm text-danger">*</Text> : null}
        </View>
      ) : null}

      <Pressable
        onPress={openPicker}
        accessibilityRole="button"
        accessibilityState={{ disabled: isDisabled }}
        className={[
          'min-h-12 px-3 rounded-2xl border-[1.5px] bg-field border-field-border',
          'flex-row items-center active:opacity-70',
          isDisabled || isLoading ? 'opacity-50' : '',
        ].join(' ')}
        style={{ gap: 8 }}
      >
        <Text
          className={`flex-1 text-base ${value ? 'text-foreground' : 'text-muted'}`}
          numberOfLines={1}
        >
          {value || placeholder}
        </Text>
        {isLoading ? (
          <ActivityIndicator size="small" color="#286EAD" />
        ) : (
          <StyledIonicons name="chevron-down" size={18} className="text-muted" />
        )}
      </Pressable>

      {errorText ? (
        <View className="flex-row items-center mt-1.5" style={{ gap: 6 }}>
          <Text className="text-xs text-danger flex-1">{errorText}</Text>
          {onRetry ? (
            <Pressable onPress={onRetry} hitSlop={8}>
              <Text className="text-xs font-semibold text-accent">{t('common.retry')}</Text>
            </Pressable>
          ) : null}
        </View>
      ) : isDisabled && disabledHint ? (
        <Text className="text-xs text-muted mt-1.5">{disabledHint}</Text>
      ) : null}

      <Modal
        visible={open}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setOpen(false)}
      >
        <View
          className="flex-1 justify-end"
          style={{ backgroundColor: 'rgba(0,0,0,0.6)', paddingBottom: keyboardHeight }}
        >
          <Pressable style={{ flex: 1 }} onPress={() => setOpen(false)} />
          <View
            className="bg-background rounded-t-3xl overflow-hidden"
            style={{
              // minHeight keeps the sheet stable when the search narrows the
              // list down to one row; without it the sheet collapses to that row.
              minHeight: '55%',
              maxHeight: '85%',
              paddingBottom: keyboardHeight ? 0 : insets.bottom,
            }}
          >
            {/* Header */}
            <View className="flex-row items-center justify-between px-5 pt-5 pb-3">
              <Text className="text-lg font-extrabold text-foreground flex-1 pr-3">
                {title || label}
              </Text>
              <Pressable
                onPress={() => setOpen(false)}
                className="w-9 h-9 rounded-full bg-surface items-center justify-center"
                hitSlop={8}
              >
                <StyledIonicons name="close" size={20} className="text-foreground" />
              </Pressable>
            </View>

            {/* Search */}
            <View className="px-5 pb-3">
              <View
                className="flex-row items-center px-3 rounded-2xl border-[1.5px] bg-field border-field-border"
                style={{ gap: 8, minHeight: 48 }}
              >
                <StyledIonicons name="search" size={18} className="text-muted" />
                <TextInput
                  value={query}
                  onChangeText={setQuery}
                  placeholder={searchPlaceholder}
                  placeholderTextColor="#9CA3AF"
                  autoCorrect={false}
                  autoCapitalize="none"
                  className="flex-1 text-base text-foreground"
                  style={{ paddingVertical: 10 }}
                />
                {query ? (
                  <Pressable onPress={() => setQuery('')} hitSlop={8}>
                    <StyledIonicons name="close-circle" size={18} className="text-muted" />
                  </Pressable>
                ) : null}
              </View>
            </View>

            <FlatList
              data={filtered}
              keyExtractor={(item) => item.key}
              keyboardShouldPersistTaps="handled"
              initialNumToRender={20}
              contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 16 }}
              ItemSeparatorComponent={() => <View className="h-px bg-separator mx-3" />}
              ListEmptyComponent={
                <Text className="text-sm text-muted text-center py-10">
                  {emptyText || t('common.noResults')}
                </Text>
              }
              renderItem={({ item }) => {
                const selected = item.label === value;
                return (
                  <Pressable
                    onPress={() => {
                      onSelect(item);
                      setOpen(false);
                    }}
                    className="flex-row items-center px-3 py-3.5 rounded-2xl active:opacity-60"
                    style={{ gap: 10 }}
                  >
                    {item.prefix ? <Text className="text-lg">{item.prefix}</Text> : null}
                    <Text className="flex-1 text-base text-foreground">{item.label}</Text>
                    {selected ? (
                      <StyledIonicons name="checkmark" size={18} className="text-accent" />
                    ) : null}
                  </Pressable>
                );
              }}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}
