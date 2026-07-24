import { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  Alert,
  Pressable,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { withUniwind } from 'uniwind';
import { useTranslation } from 'react-i18next';
import {
  Alert as HeroAlert,
  Avatar,
  BottomSheet,
  Button,
  Card,
  Chip,
  Input,
  Label,
  SearchField,
  Separator,
  Skeleton,
  Surface,
  TextField,
  useBottomSheetAwareHandlers,
} from 'heroui-native';
import { getTeam, addTeamMember, deleteTeamMember, updateTeamMember } from '../services/api';

const StyledIonicons = withUniwind(Ionicons);

// ── Form inside BottomSheet (must be inside BottomSheet context) ───────────────

function MemberForm({ defaultValues, onSubmit, loading, errorMsg, submitLabel }) {
  const { t } = useTranslation();
  const { onFocus, onBlur } = useBottomSheetAwareHandlers();
  const [name, setName] = useState(defaultValues?.name || '');
  const [email, setEmail] = useState(defaultValues?.email || '');
  const [phone, setPhone] = useState(defaultValues?.phone || '');

  const handleSubmit = () => onSubmit({ name, email, phone });

  return (
    <View style={{ gap: 16 }}>
      {errorMsg ? (
        <HeroAlert status="danger" className="rounded-xl items-center">
          <HeroAlert.Indicator className="pt-0" />
          <HeroAlert.Content>
            <HeroAlert.Title>{errorMsg}</HeroAlert.Title>
          </HeroAlert.Content>
        </HeroAlert>
      ) : null}

      <Surface className="rounded-2xl px-5 py-5" style={{ gap: 16 }}>
        <TextField isRequired>
          <Label>{t('team.fullName')}</Label>
          <Input
            placeholder={t('team.fullNamePlaceholder')}
            autoCapitalize="words"
            value={name}
            onChangeText={setName}
            onFocus={onFocus}
            onBlur={onBlur}
            editable={!loading}
          />
        </TextField>

        <TextField isRequired>
          <Label>{t('team.email')}</Label>
          <Input
            placeholder={t('team.emailPlaceholder')}
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
            onFocus={onFocus}
            onBlur={onBlur}
            editable={!loading}
          />
        </TextField>

        <TextField>
          <Label>{t('team.phone')}</Label>
          <Input
            placeholder="+212 6 00 00 00 00"
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
            onFocus={onFocus}
            onBlur={onBlur}
            editable={!loading}
          />
        </TextField>
      </Surface>

      <Button
        variant="primary"
        size="lg"
        className="rounded-2xl"
        onPress={handleSubmit}
        isDisabled={loading}
      >
        <Button.Label>{loading ? t('team.loading') : submitLabel}</Button.Label>
      </Button>
    </View>
  );
}

// ── Member card ───────────────────────────────────────────────────────────────

function MemberCard({ item, onEdit, onDelete }) {
  const initials = item.name ? item.name.slice(0, 2).toUpperCase() : '??';

  return (
    <Card className="mb-3">
      <Card.Header>
        <View className="flex-row items-center" style={{ gap: 12 }}>
          <Avatar size="md" color="default" variant="soft">
            <Avatar.Fallback>{initials}</Avatar.Fallback>
          </Avatar>
          <View className="flex-1" style={{ gap: 4 }}>
            <Text className="text-sm font-bold text-foreground">{item.name}</Text>
            {item.email ? (
              <Text className="text-xs text-muted">{item.email}</Text>
            ) : null}
            {item.badge_number ? (
              <Chip size="sm" variant="soft" color="default">
                <StyledIonicons
                  name="qr-code-outline"
                  size={10}
                  className="text-muted"
                />
                <Chip.Label>{item.badge_number}</Chip.Label>
              </Chip>
            ) : null}
          </View>
          <View className="flex-row items-center" style={{ gap: 8 }}>
            <Pressable
              className="w-9 h-9 rounded-xl bg-accent-soft items-center justify-center"
              onPress={() => onEdit(item)}
            >
              <Ionicons name="pencil-outline" size={16} color="#2db067" />
            </Pressable>
            <Pressable
              className="w-9 h-9 rounded-xl bg-surface items-center justify-center border border-separator"
              onPress={() => onDelete(item)}
            >
              <StyledIonicons name="trash-outline" size={16} className="text-muted" />
            </Pressable>
          </View>
        </View>
      </Card.Header>
    </Card>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function TeamScreen({ navigation }) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [members, setMembers] = useState([]);
  const [companyName, setCompanyName] = useState('');
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [editMember, setEditMember] = useState(null);
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState(null);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState(null);

  const searchTimer = useRef(null);

  const load = useCallback(async (q = '') => {
    try {
      const res = await getTeam(q);
      setMembers(res?.data?.data || []);
      if (res?.data?.exhibitor?.company_name) {
        setCompanyName(res.data.exhibitor.company_name);
      }
    } catch {
      setMembers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load();
    }, [])
  );

  const onSearchChange = (text) => {
    setSearch(text);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => load(text), 400);
  };

  const handleAdded = (member) => setMembers(prev => [member, ...prev]);
  const handleUpdated = (updated) =>
    setMembers(prev => prev.map(m => m.id === updated.id ? updated : m));

  const handleDelete = (item) => {
    Alert.alert(
      t('team.removeTitle'),
      t('team.removeBody', { name: item.name }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.remove'),
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteTeamMember(item.id);
              setMembers(prev => prev.filter(m => m.id !== item.id));
            } catch {
              Alert.alert(t('common.error'), t('team.removeError'));
            }
          },
        },
      ]
    );
  };

  const handleAddSubmit = async ({ name, email, phone }) => {
    if (!name.trim() || !email.trim()) {
      setAddError(t('team.errorRequired'));
      return;
    }
    setAddLoading(true);
    setAddError(null);
    try {
      const res = await addTeamMember({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
      });
      handleAdded(res.data.data);
      setShowAdd(false);
    } catch (e) {
      const msg =
        e?.response?.data?.message ||
        (e?.response?.data?.errors
          ? Object.values(e.response.data.errors)[0][0]
          : null) ||
        t('team.errorAdd');
      setAddError(msg);
    } finally {
      setAddLoading(false);
    }
  };

  const handleEditSubmit = async ({ name, email, phone }) => {
    if (!editMember) return;
    if (!name.trim() || !email.trim()) {
      setEditError(t('team.errorRequired'));
      return;
    }
    setEditLoading(true);
    setEditError(null);
    try {
      const res = await updateTeamMember(editMember.id, {
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim() || null,
      });
      handleUpdated(res.data.data);
      setEditMember(null);
    } catch (e) {
      const msg =
        e?.response?.data?.message ||
        (e?.response?.data?.errors
          ? Object.values(e.response.data.errors)[0][0]
          : null) ||
        t('team.errorEdit');
      setEditError(msg);
    } finally {
      setEditLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>

      {/* ── Header ─────────────────────────────────── */}
      <View className="px-4 pt-5 pb-4">
        <View className="flex-row items-center mb-4" style={{ gap: 12 }}>
          <Pressable
            onPress={() => navigation.goBack()}
            className="w-10 h-10 rounded-xl bg-surface items-center justify-center"
            hitSlop={8}
          >
            <StyledIonicons name="chevron-back" size={22} className="text-foreground" />
          </Pressable>
          <View className="flex-1">
            <Text className="text-xl font-extrabold text-foreground">{t('team.title')}</Text>
            {companyName ? (
              <Text className="text-xs text-muted mt-0.5">{companyName}</Text>
            ) : null}
          </View>
          <Pressable
            onPress={() => {
              setAddError(null);
              setShowAdd(true);
            }}
            className="w-10 h-10 rounded-xl bg-accent items-center justify-center"
          >
            <StyledIonicons name="person-add-outline" size={18} className="text-accent-foreground" />
          </Pressable>
        </View>

        {/* Search */}
        <SearchField value={search} onChange={onSearchChange}>
          <SearchField.Group>
            <SearchField.SearchIcon />
            <SearchField.Input placeholder={t('team.searchPlaceholder')} />
            <SearchField.ClearButton />
          </SearchField.Group>
        </SearchField>
      </View>

      {/* Count */}
      <View className="px-8 pb-2">
        <Text className="text-[10px] font-bold text-muted uppercase tracking-widest">
          {t('team.count', { count: members.length })}
        </Text>
      </View>

      {/* ── List ───────────────────────────────────── */}
      {loading ? (
        <View className="px-4" style={{ gap: 12 }}>
          {[0, 1, 2].map(i => (
            <Card key={i}>
              <Card.Body>
                <View className="flex-row items-center" style={{ gap: 12 }}>
                  <Skeleton isLoading variant="shimmer">
                    <View className="w-10 h-10 rounded-full bg-surface-secondary" />
                  </Skeleton>
                  <View className="flex-1" style={{ gap: 8 }}>
                    <Skeleton isLoading variant="shimmer">
                      <View className="h-3.5 rounded-full bg-surface-secondary" style={{ width: 140 }} />
                    </Skeleton>
                    <Skeleton isLoading variant="shimmer">
                      <View className="h-3 rounded-full bg-surface-secondary" style={{ width: 100 }} />
                    </Skeleton>
                  </View>
                </View>
              </Card.Body>
            </Card>
          ))}
        </View>
      ) : members.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <Ionicons name="people-outline" size={48} color="#2db067" />
          <Text className="text-base font-bold text-foreground mt-4 mb-2">
            {t('team.emptyTitle')}
          </Text>
          <Text className="text-sm text-muted text-center leading-5 mb-6">
            {t('team.emptyBody')}
          </Text>
          <Button
            variant="primary"
            size="md"
            className="rounded-2xl"
            onPress={() => {
              setAddError(null);
              setShowAdd(true);
            }}
          >
            <Button.Label>{t('team.addMember')}</Button.Label>
          </Button>
        </View>
      ) : (
        <FlatList
          data={members}
          keyExtractor={item => String(item.id)}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <MemberCard item={item} onEdit={m => { setEditError(null); setEditMember(m); }} onDelete={handleDelete} />
          )}
        />
      )}

      {/* ── Add Member BottomSheet ─────────────────── */}
      <BottomSheet
        isOpen={showAdd}
        onOpenChange={open => {
          if (!open) {
            setShowAdd(false);
            setAddError(null);
          }
        }}
      >
        <BottomSheet.Portal>
          <BottomSheet.Overlay />
          <BottomSheet.Content
            keyboardBehavior="interactive"
            keyboardBlurBehavior="restore"
            android_keyboardInputMode="adjustResize"
            keyboardShouldPersistTaps="handled"
          >
            <View className="px-4 pt-2 pb-8">
              <View className="flex-row items-center mb-6" style={{ gap: 12 }}>
                <View className="w-10 h-10 rounded-xl bg-accent-soft items-center justify-center">
                  <Ionicons name="person-add-outline" size={18} color="#2db067" />
                </View>
                <BottomSheet.Title>{t('team.newMember')}</BottomSheet.Title>
              </View>
              <MemberForm
                defaultValues={null}
                onSubmit={handleAddSubmit}
                loading={addLoading}
                errorMsg={addError}
                submitLabel={t('team.add')}
              />
              <Button
                variant="tertiary"
                size="lg"
                className="rounded-2xl mt-3"
                onPress={() => {
                  setShowAdd(false);
                  setAddError(null);
                }}
              >
                <Button.Label>{t('team.cancel')}</Button.Label>
              </Button>
            </View>
          </BottomSheet.Content>
        </BottomSheet.Portal>
      </BottomSheet>

      {/* ── Edit Member BottomSheet ────────────────── */}
      <BottomSheet
        isOpen={!!editMember}
        onOpenChange={open => {
          if (!open) {
            setEditMember(null);
            setEditError(null);
          }
        }}
      >
        <BottomSheet.Portal>
          <BottomSheet.Overlay />
          <BottomSheet.Content
            keyboardBehavior="interactive"
            keyboardBlurBehavior="restore"
            android_keyboardInputMode="adjustResize"
            keyboardShouldPersistTaps="handled"
          >
            <View className="px-4 pt-2 pb-8">
              <View className="flex-row items-center mb-6" style={{ gap: 12 }}>
                <View className="w-10 h-10 rounded-xl bg-surface items-center justify-center border border-separator">
                  <Ionicons name="pencil-outline" size={18} color="#2db067" />
                </View>
                <View>
                  <BottomSheet.Title>{t('team.editMember')}</BottomSheet.Title>
                  {editMember?.name ? (
                    <BottomSheet.Description>{editMember.name}</BottomSheet.Description>
                  ) : null}
                </View>
              </View>
              {editMember ? (
                <MemberForm
                  key={editMember.id}
                  defaultValues={editMember}
                  onSubmit={handleEditSubmit}
                  loading={editLoading}
                  errorMsg={editError}
                  submitLabel={t('team.save')}
                />
              ) : null}
              <Button
                variant="tertiary"
                size="lg"
                className="rounded-2xl mt-3"
                onPress={() => {
                  setEditMember(null);
                  setEditError(null);
                }}
              >
                <Button.Label>{t('team.cancel')}</Button.Label>
              </Button>
            </View>
          </BottomSheet.Content>
        </BottomSheet.Portal>
      </BottomSheet>
    </View>
  );
}
