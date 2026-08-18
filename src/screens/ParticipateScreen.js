import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ActivityIndicator,
  Alert as RNAlert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { withUniwind } from 'uniwind';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Button,
  Checkbox,
  Chip,
  ControlField,
  Input,
  Label,
  Skeleton,
  Surface,
  TextField,
} from 'heroui-native';
import { useAuth } from '../context/AuthContext';
import { roleIcon, roleLabel, roleKey, sortRoles, addRoleTranslations } from '../constants/roles';
import {
  getParticipationRoles,
  getParticipation,
  submitParticipation,
  cancelParticipation,
} from '../services/api';
import { backIcon, forwardIcon } from '../utils/rtl';
import { apiErrorMessage } from '../utils/apiError';

const StyledIonicons = withUniwind(Ionicons);
const ACCENT = '#286EAD';

// Fields the profile already knows about (backend field name → profile
// key), so an exhibitor doesn't retype a company they entered once.
const PREFILL_FROM_PROFILE = {
  company: 'company',
  website: 'website',
  secteur_activite: 'secteur',
};

// ── One form-builder field ──────────────────────────────────────────────────
function DynamicField({ field, value, onChange, disabled, locale }) {
  const label = field.translations?.label?.[locale] || field.label;
  const placeholder = field.translations?.placeholder?.[locale] || field.placeholder || '';
  const help = field.translations?.help_text?.[locale] || field.help_text;
  const options = field.options || [];

  if (field.type === 'checkbox') {
    return (
      <ControlField
        isSelected={value === true}
        onSelectedChange={onChange}
        className="flex-row items-start"
      >
        <ControlField.Indicator>
          <Checkbox className="border-2 border-muted" />
        </ControlField.Indicator>
        <View className="flex-1">
          <Text className="text-sm text-foreground">
            {label}
            {field.is_required ? ' *' : ''}
          </Text>
          {help ? <Text className="text-xs text-muted mt-0.5">{help}</Text> : null}
        </View>
      </ControlField>
    );
  }

  if ((field.type === 'select' || field.type === 'radio') && options.length > 0) {
    return (
      <View>
        <Label>
          {label}
          {field.is_required ? ' *' : ''}
        </Label>
        <View className="flex-row flex-wrap mt-2" style={{ gap: 8 }}>
          {options.map((option) => {
            const active = value === option.value;
            return (
              <Pressable
                key={option.value}
                disabled={disabled}
                onPress={() => onChange(active ? null : option.value)}
                className={`px-4 py-2.5 rounded-xl border ${
                  active ? 'bg-accent border-accent' : 'bg-surface-secondary border-separator'
                }`}
              >
                <Text
                  className={`text-sm font-bold ${
                    active ? 'text-accent-foreground' : 'text-foreground'
                  }`}
                >
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
        {help ? <Text className="text-xs text-muted mt-2">{help}</Text> : null}
      </View>
    );
  }

  const multiline = field.type === 'textarea';

  return (
    <TextField isRequired={field.is_required}>
      <Label>{label}</Label>
      <Input
        placeholder={placeholder}
        value={value ?? ''}
        onChangeText={onChange}
        editable={!disabled}
        autoCapitalize={field.type === 'email' ? 'none' : 'sentences'}
        keyboardType={
          field.type === 'email'
            ? 'email-address'
            : field.type === 'tel'
            ? 'phone-pad'
            : field.type === 'number'
            ? 'number-pad'
            : 'default'
        }
        multiline={multiline}
        numberOfLines={multiline ? 3 : 1}
        style={multiline ? { minHeight: 72, textAlignVertical: 'top' } : undefined}
      />
      {help ? <Text className="text-xs text-muted mt-1">{help}</Text> : null}
    </TextField>
  );
}

// ── Screen ──────────────────────────────────────────────────────────────────
export default function ParticipateScreen({ navigation }) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language || 'fr';
  const insets = useSafeAreaInsets();
  const { refreshProfile, isExhibitorStaff, isVip, scanner } = useAuth();
  const scannerCompany = scanner?.company || null;

  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState([]);
  const [participation, setParticipation] = useState(null);

  const [step, setStep] = useState('role'); // 'role' | 'form'
  const [selectedRole, setSelectedRole] = useState(null);
  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  const load = async () => {
    const [rolesRes, mineRes] = await Promise.allSettled([
      getParticipationRoles(),
      getParticipation(),
    ]);
    if (rolesRes.status === 'fulfilled') {
      const list = rolesRes.value?.data?.roles || [];
      // The picker's own payload already carries each role's fr/en/ar name:
      // feed it to the shared registry so `roleLabel()` is right here even
      // before the app-wide label fetch has landed.
      addRoleTranslations(
        Object.fromEntries(
          list
            .filter((role) => role?.translations?.name)
            .map((role) => [roleKey(role.name), role.translations.name])
        )
      );
      setRoles(sortRoles(list));
    }
    if (mineRes.status === 'fulfilled') {
      setParticipation(mineRes.value?.data?.participation || null);
    }
    setLoading(false);
  };

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load();
    }, [])
  );

  const status = participation?.status ?? null;

  const fields = useMemo(
    () => (selectedRole?.categories || []).flatMap((category) => category.fields),
    [selectedRole]
  );

  const openForm = (role) => {
    const prefill = {};
    (role.categories || [])
      .flatMap((category) => category.fields)
      .forEach((field) => {
        const key = PREFILL_FROM_PROFILE[field.name];
        const value = key ? scanner?.[key] : null;
        if (value) prefill[field.name] = String(value);
      });

    setSelectedRole(role);
    setAnswers(prefill);
    setErrorMsg(null);
    setStep('form');
  };

  const setAnswer = (name, value) =>
    setAnswers((prev) => ({ ...prev, [name]: value }));

  const missingRequired = fields.filter((field) => {
    if (!field.is_required) return false;
    const value = answers[field.name];
    if (field.type === 'checkbox') return value !== true;
    return value === undefined || value === null || String(value).trim() === '';
  });

  const submit = async () => {
    if (!selectedRole) return;
    if (missingRequired.length > 0) {
      const missing = missingRequired[0];
      setErrorMsg(
        t('participate.errorRequired', {
          field: missing.translations?.label?.[locale] || missing.label,
        })
      );
      return;
    }
    setSubmitting(true);
    setErrorMsg(null);
    try {
      await submitParticipation(selectedRole.name, answers);
      await refreshProfile();
      await load();
      setStep('role');
      setSelectedRole(null);
    } catch (e) {
      setErrorMsg(apiErrorMessage(e, t('participate.errorGeneric')));
    } finally {
      setSubmitting(false);
    }
  };

  const withdraw = () => {
    RNAlert.alert(t('participate.withdrawTitle'), t('participate.withdrawBody'), [
      // Not `common.cancel`: next to "cancel the request" a bare "Cancel" reads
      // as the same action, and in Arabic both rendered the identical word.
      { text: t('participate.withdrawDismiss'), style: 'cancel' },
      {
        text: t('participate.withdrawConfirm'),
        style: 'destructive',
        onPress: async () => {
          try {
            await cancelParticipation();
            await refreshProfile();
            setLoading(true);
            await load();
          } catch {
            RNAlert.alert(t('common.error'), t('participate.errorGeneric'));
          }
        },
      },
    ]);
  };

  const recheck = async () => {
    setLoading(true);
    await refreshProfile();
    await load();
  };

  // ── Header ────────────────────────────────────────────────────────────────
  const header = (
    <View className="px-5 pt-5 pb-5 flex-row items-center" style={{ gap: 12 }}>
      <Pressable
        onPress={() => (step === 'form' ? setStep('role') : navigation.goBack())}
        className="w-10 h-10 items-center justify-center rounded-xl bg-surface"
        hitSlop={8}
      >
        <StyledIonicons name={backIcon()} size={22} className="text-foreground" />
      </Pressable>
      <View className="flex-1">
        <Text className="text-2xl font-extrabold text-foreground">
          {t('participate.title')}
        </Text>
        <Text className="text-sm text-muted mt-0.5">{t('participate.subtitle')}</Text>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
        {header}
        <View className="px-5" style={{ gap: 14 }}>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} isLoading variant="shimmer">
              <View className="h-20 rounded-2xl bg-surface-secondary" />
            </Skeleton>
          ))}
        </View>
      </View>
    );
  }

  // ── VIP ──────────────────────────────────────────────────────────────────
  // Registered straight into their role (private form / back office), so there
  // is nothing to apply for. The entry points are hidden; this covers deep
  // links and stale menus.
  const vip = isVip || participation?.is_vip;
  if (vip) {
    const vipRole = participation?.role || scanner?.role;
    return (
      <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
        {header}
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: 'center',
            paddingHorizontal: 20,
            paddingBottom: 120,
          }}
        >
          <Surface className="rounded-3xl px-6 py-10 items-center">
            <View className="w-20 h-20 rounded-full bg-success-soft items-center justify-center mb-5">
              <StyledIonicons name="star" size={38} className="text-success" />
            </View>
            <Text className="text-xl font-extrabold text-foreground text-center mb-2">
              {t('participate.vipTitle')}
            </Text>
            {vipRole ? (
              <Chip
                size="sm"
                variant="soft"
                color="success"
                className="mb-4"
                style={{ alignSelf: 'center' }}
              >
                <Chip.Label>{roleLabel(vipRole)}</Chip.Label>
              </Chip>
            ) : null}
            <Text className="text-sm text-muted text-center leading-6">
              {t('participate.vipBody')}
            </Text>
          </Surface>
        </ScrollView>
      </View>
    );
  }

  // ── Exhibitor staff ──────────────────────────────────────────────────────
  // They take part through the organisation that added them, so there is no
  // role to request. The entry points are hidden; this covers deep links.
  const staff = isExhibitorStaff || participation?.is_exhibitor_staff;
  if (staff) {
    const company = participation?.company || scannerCompany;
    return (
      <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
        {header}
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: 'center',
            paddingHorizontal: 20,
            paddingBottom: 120,
          }}
        >
          <Surface className="rounded-3xl px-6 py-10 items-center">
            <View className="w-20 h-20 rounded-full bg-success-soft items-center justify-center mb-5">
              <StyledIonicons name="business" size={38} className="text-success" />
            </View>
            <Text className="text-xl font-extrabold text-foreground text-center mb-2">
              {t('participate.staffTitle')}
            </Text>
            {company ? (
              <Chip
                size="sm"
                variant="soft"
                color="success"
                className="mb-4"
                style={{ alignSelf: 'center' }}
              >
                <Chip.Label>{company}</Chip.Label>
              </Chip>
            ) : null}
            <Text className="text-sm text-muted text-center leading-6">
              {t('participate.staffBody')}
            </Text>
          </Surface>
        </ScrollView>
      </View>
    );
  }

  // ── Already submitted / already approved ─────────────────────────────────
  if (status === 'pending' || status === 'approved') {
    const approved = status === 'approved';
    return (
      <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
        {header}
        {/* flexGrow + centred justify keeps the status card in the middle of
            the viewport instead of hugging the header on a tall screen. */}
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: 'center',
            paddingHorizontal: 20,
            paddingBottom: 120,
          }}
        >
          <Surface className="rounded-3xl px-6 py-10 items-center">
            <View
              className={`w-20 h-20 rounded-full items-center justify-center mb-5 ${
                approved ? 'bg-success-soft' : 'bg-warning-soft'
              }`}
            >
              <StyledIonicons
                name={approved ? 'checkmark-circle' : 'time-outline'}
                size={40}
                className={approved ? 'text-success' : 'text-warning'}
              />
            </View>
            <Text className="text-xl font-extrabold text-foreground text-center mb-2">
              {approved ? t('participate.approvedTitle') : t('participate.pendingTitle')}
            </Text>
            {/* Chip lays out at flex-start by default, which reads as
                misaligned inside this centred card. */}
            <Chip
              size="sm"
              variant="soft"
              color={approved ? 'success' : 'warning'}
              className="mb-4"
              style={{ alignSelf: 'center' }}
            >
              <Chip.Label>{roleLabel(participation?.role)}</Chip.Label>
            </Chip>
            <Text className="text-sm text-muted text-center leading-6">
              {approved ? t('participate.approvedBody') : t('participate.pendingBody')}
            </Text>
          </Surface>

          <View className="mt-6" style={{ gap: 12 }}>
            {approved ? (
              <Button
                variant="primary"
                size="lg"
                className="rounded-2xl"
                onPress={() => navigation.navigate('Main', { screen: 'RDV' })}
              >
                <Ionicons name="briefcase-outline" size={18} color="#FFFFFF" />
                <Button.Label>{t('participate.goToB2B')}</Button.Label>
              </Button>
            ) : (
              <>
                <Button variant="secondary" size="lg" className="rounded-2xl" onPress={recheck}>
                  <Ionicons name="refresh-outline" size={18} color={ACCENT} />
                  <Button.Label>{t('participate.recheck')}</Button.Label>
                </Button>
                <Button variant="tertiary" size="lg" className="rounded-2xl" onPress={withdraw}>
                  <Button.Label style={{ color: '#EF4444' }}>
                    {t('participate.withdraw')}
                  </Button.Label>
                </Button>
              </>
            )}
          </View>
        </ScrollView>
      </View>
    );
  }

  // ── Step 2: the selected role's own fields ───────────────────────────────
  if (step === 'form' && selectedRole) {
    return (
      <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
        {header}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          className="flex-1"
        >
          <ScrollView
            contentContainerStyle={{
              paddingHorizontal: 20,
              paddingTop: 8,
              paddingBottom: 140,
            }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="always"
          >
            <View className="flex-row items-center mb-7" style={{ gap: 12 }}>
              <View className="w-12 h-12 rounded-2xl bg-accent-soft items-center justify-center">
                <Ionicons name={roleIcon(selectedRole.name)} size={22} color={ACCENT} />
              </View>
              <View className="flex-1">
                <Text className="text-base font-extrabold text-foreground">
                  {roleLabel(selectedRole.name)}
                </Text>
                <Text className="text-xs text-muted mt-0.5">{t('participate.formHint')}</Text>
              </View>
            </View>

            {errorMsg ? (
              <Alert status="danger" className="rounded-xl mb-5 items-center">
                <Alert.Indicator className="pt-0" />
                <Alert.Content>
                  <Alert.Title>{errorMsg}</Alert.Title>
                </Alert.Content>
              </Alert>
            ) : null}

            {fields.length === 0 ? (
              <Surface className="rounded-2xl px-6 py-8 mb-5">
                <Text className="text-sm text-muted text-center leading-6">
                  {t('participate.noExtraFields')}
                </Text>
              </Surface>
            ) : (
              selectedRole.categories.map((category) => (
                <Surface key={category.id} className="rounded-2xl px-5 py-6 gap-5 mb-5">
                  {/* The role's own extra fields come back in a synthetic
                      category whose title is French-only server-side. */}
                  <Text className="text-sm font-semibold text-muted">
                    {category.id === 'role-extra' ? t('participate.formHint') : category.title}
                  </Text>
                  {category.fields.map((field) => (
                    <DynamicField
                      key={field.name}
                      field={field}
                      locale={locale}
                      value={answers[field.name]}
                      disabled={submitting}
                      onChange={(value) => setAnswer(field.name, value)}
                    />
                  ))}
                </Surface>
              ))
            )}

            <Surface className="rounded-2xl px-5 py-5 mb-7 flex-row items-start" style={{ gap: 14 }}>
              <View className="w-9 h-9 rounded-xl bg-warning-soft items-center justify-center">
                <StyledIonicons name="information-circle-outline" size={18} className="text-warning" />
              </View>
              <Text className="flex-1 text-xs text-muted leading-5">
                {t('participate.approvalNotice')}
              </Text>
            </Surface>

            <Button
              variant="primary"
              size="lg"
              className="rounded-2xl"
              onPress={submit}
              isDisabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Ionicons name="paper-plane-outline" size={18} color="#FFFFFF" />
              )}
              <Button.Label>
                {submitting ? t('participate.submitting') : t('participate.submit')}
              </Button.Label>
            </Button>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    );
  }

  // ── Step 1: pick a role ──────────────────────────────────────────────────
  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      {header}
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {status === 'rejected' ? (
          <Alert status="warning" className="rounded-xl mb-4">
            <Alert.Indicator className="pt-0" />
            <Alert.Content>
              <Alert.Title>{t('participate.rejectedTitle')}</Alert.Title>
              <Alert.Description>
                {participation?.note || t('participate.rejectedBody')}
              </Alert.Description>
            </Alert.Content>
          </Alert>
        ) : null}

        <Text className="text-sm text-muted leading-5 mb-4">
          {t('participate.pickRole')}
        </Text>

        {roles.length === 0 ? (
          <View className="items-center py-16">
            <Ionicons name="albums-outline" size={48} color={ACCENT} />
            <Text className="text-base font-bold text-foreground mt-4 mb-2">
              {t('participate.emptyTitle')}
            </Text>
            <Text className="text-sm text-muted text-center leading-5 px-6">
              {t('participate.emptyBody')}
            </Text>
          </View>
        ) : (
          <View style={{ gap: 12 }}>
            {roles.map((role) => (
              <Pressable
                key={role.id}
                onPress={() => openForm(role)}
                className="flex-row items-center px-5 py-4 rounded-2xl bg-surface border border-separator active:opacity-70"
              >
                <View className="w-14 h-14 rounded-full bg-accent-soft items-center justify-center me-4">
                  <Ionicons name={roleIcon(role.name)} size={26} color={ACCENT} />
                </View>
                <Text className="flex-1 text-base font-bold text-foreground">
                  {roleLabel(role.name)}
                </Text>
                <Ionicons name={forwardIcon()} size={18} color="#9CA3AF" />
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
