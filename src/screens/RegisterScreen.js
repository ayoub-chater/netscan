import { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image,
  Pressable,
  Modal,
  useWindowDimensions,
} from 'react-native';
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
  LinkButton,
  Separator,
  Surface,
  TextField,
} from 'heroui-native';
import { useAuth } from '../context/AuthContext';
import { register } from '../services/api';

const StyledIonicons = withUniwind(Ionicons);

const ROLES = [
  {
    key: 'Visiteur',
    icon: 'person-outline',
    labelKey: 'register.visitorLabel',
    descKey: 'register.visitorDesc',
    chipColor: 'default',
  },
  {
    key: 'Exposant',
    icon: 'storefront-outline',
    labelKey: 'register.exhibitorLabel',
    descKey: 'register.exhibitorDesc',
    chipColor: 'accent',
  },
  {
    key: 'Intervenant',
    icon: 'mic-outline',
    labelKey: 'register.speakerLabel',
    descKey: 'register.speakerDesc',
    chipColor: 'accent',
  },
];

export default function RegisterScreen({ navigation }) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const scrollRef = useRef(null);
  const { applySession } = useAuth();
  const [step, setStep] = useState('role');
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [acceptCgu, setAcceptCgu] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');
  const [ville, setVille] = useState('');
  const [pays, setPays] = useState('');
  const [secteur, setSecteur] = useState('');
  const [website, setWebsite] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [topic, setTopic] = useState('');
  const [bio, setBio] = useState('');

  // Scroll the error into view when it appears (error alert sits at the top of the form)
  useEffect(() => {
    if (errorMsg) {
      scrollRef.current?.scrollTo({ y: 0, animated: true });
    }
  }, [errorMsg]);

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !password) {
      setErrorMsg(t('register.errorRequiredFields'));
      return;
    }
    if (password.length < 8) {
      setErrorMsg(t('register.errorPasswordTooShort'));
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg(t('register.errorPasswordMismatch'));
      return;
    }
    if (!acceptCgu) {
      setErrorMsg(t('register.errorAcceptCgu'));
      return;
    }
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await register({
        name: name.trim(),
        email: email.trim(),
        password,
        role,
        phone: phone.trim() || undefined,
        company: company.trim() || undefined,
        website: website.trim() || undefined,
        ville: ville.trim() || undefined,
        pays: pays.trim() || undefined,
        secteur_activite: secteur.trim() || undefined,
        job_title: role === 'Intervenant' ? jobTitle.trim() || undefined : undefined,
        topic: role === 'Intervenant' ? topic.trim() || undefined : undefined,
        bio: role === 'Intervenant' ? bio.trim() || undefined : undefined,
      });
      await applySession(res.data);
    } catch (e) {
      const msg =
        e?.response?.data?.message ||
        (e?.response?.data?.errors
          ? Object.values(e.response.data.errors)[0][0]
          : null) ||
        t('register.errorGeneric');
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  // ─── Step 1: Role Selection ────────────────────────────────────────────────
  if (step === 'role') {
    return (
      <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            paddingHorizontal: 24,
            paddingTop: 24,
            paddingBottom: 40,
          }}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View className="flex-row items-center mb-10">
            <Pressable
              onPress={() => navigation.goBack()}
              className="w-10 h-10 items-center justify-center rounded-xl bg-surface"
              hitSlop={8}
            >
              <StyledIonicons
                name="chevron-back"
                size={22}
                className="text-foreground"
              />
            </Pressable>
          </View>

          {/* Logo */}
          <View className="items-center mb-10">
            <Image
              source={require('../../assets/Logo_Logiterre-colored.webp')}
              style={{ width: 180, height: 73 }}
              resizeMode="contain"
            />
          </View>

          {/* Title */}
          <Text className="text-2xl font-extrabold text-foreground text-center mb-1">
            {t('register.iAm')}
          </Text>
          <Text className="text-sm text-muted text-center mb-8">
            {t('register.chooseProfile')}
          </Text>

          {/* Step dots */}
          <View className="flex-row justify-center gap-2 mb-8">
            <View className="w-6 h-1.5 rounded-full bg-accent" />
            <View className="w-2 h-1.5 rounded-full bg-surface-secondary" />
          </View>

          {/* Role cards */}
          <View className="gap-3">
            {ROLES.map(r => {
              const isSelected = role === r.key;
              return (
                <Pressable
                  key={r.key}
                  onPress={() => setRole(r.key)}
                  className={[
                    'flex-row items-center p-5 rounded-2xl',
                    isSelected
                      ? 'bg-surface border-2 border-accent'
                      : 'bg-surface border-2 border-transparent',
                  ].join(' ')}
                  style={{ opacity: 1 }}
                >
                  {/* Icon circle */}
                  <View
                    className={[
                      'w-14 h-14 rounded-full items-center justify-center mr-4',
                      isSelected ? 'bg-accent-soft' : 'bg-surface-secondary',
                    ].join(' ')}
                  >
                    <StyledIonicons
                      name={r.icon}
                      size={26}
                      className={isSelected ? 'text-accent' : 'text-muted'}
                    />
                  </View>

                  {/* Info */}
                  <View className="flex-1">
                    <Text
                      className={[
                        'text-base font-bold mb-0.5',
                        isSelected ? 'text-accent' : 'text-foreground',
                      ].join(' ')}
                    >
                      {t(r.labelKey)}
                    </Text>
                    <Text className="text-xs text-muted">{t(r.descKey)}</Text>
                  </View>

                  {/* Selected checkmark */}
                  {isSelected ? (
                    <View className="w-6 h-6 rounded-full bg-accent items-center justify-center">
                      <StyledIonicons
                        name="checkmark"
                        size={14}
                        className="text-accent-foreground"
                      />
                    </View>
                  ) : (
                    <View className="w-6 h-6 rounded-full border-2 border-separator" />
                  )}
                </Pressable>
              );
            })}
          </View>

          {/* Continue button */}
          <Button
            variant="primary"
            size="lg"
            className="mt-8 rounded-2xl"
            onPress={() => role && setStep('form')}
            isDisabled={!role}
          >
            <Button.Label>{t('register.continue')}</Button.Label>
          </Button>

          {/* Login link */}
          <View className="flex-row justify-center items-center mt-6 gap-1">
            <Text className="text-sm text-muted">{t('register.haveAccount')}</Text>
            <LinkButton size="sm" onPress={() => navigation.goBack()}>
              <LinkButton.Label className="text-accent font-semibold">
                {t('register.signIn')}
              </LinkButton.Label>
            </LinkButton>
          </View>
        </ScrollView>
      </View>
    );
  }

  // ─── Step 2: Registration Form ─────────────────────────────────────────────
  const roleData = ROLES.find(r => r.key === role);

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: isTablet ? 'center' : 'flex-start',
            paddingHorizontal: isTablet ? '15%' : 24,
            paddingTop: 24,
            paddingBottom: 48,
          }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="always"
        >
          {/* Header row */}
          <View className="flex-row items-center justify-between mb-8">
            <Pressable
              onPress={() => setStep('role')}
              className="w-10 h-10 items-center justify-center rounded-xl bg-surface"
              hitSlop={8}
            >
              <StyledIonicons
                name="chevron-back"
                size={22}
                className="text-foreground"
              />
            </Pressable>
            {/* Role chip */}
            <Chip
              size="sm"
              variant="soft"
              color={role === 'Exposant' ? 'warning' : 'default'}
            >
              <StyledIonicons
                name={roleData?.icon}
                size={12}
                className={
                  role === 'Exposant' ? 'text-warning-soft-foreground' : 'text-muted'
                }
              />
              <Chip.Label>{role}</Chip.Label>
            </Chip>
            {/* Step dots */}
            <View className="flex-row gap-1.5 items-center">
              <View className="w-2 h-1.5 rounded-full bg-surface-secondary" />
              <View className="w-6 h-1.5 rounded-full bg-accent" />
            </View>
          </View>

          {/* Title */}
          <Text className="text-2xl font-extrabold text-foreground mb-6">
            {t('register.createAccount')}
          </Text>

          {/* Error */}
          {errorMsg ? (
            <Alert status="danger" className="rounded-xl mb-5 items-center">
              <Alert.Indicator className="pt-0" />
              <Alert.Content>
                <Alert.Title>{errorMsg}</Alert.Title>
              </Alert.Content>
            </Alert>
          ) : null}

          {/* Personal Info */}
          <Surface className="rounded-2xl px-5 py-5 gap-4 mb-4">
            <Text className="text-sm font-semibold text-muted mb-1">
              {t('register.personalInfo')}
            </Text>
            <TextField isRequired>
              <Label>{t('register.fullName')}</Label>
              <Input
                placeholder={t('register.fullNamePlaceholder')}
                autoCapitalize="words"
                value={name}
                onChangeText={setName}
                editable={!loading}
              />
            </TextField>
            <TextField isRequired>
              <Label>{t('login.email')}</Label>
              <Input
                placeholder={t('login.emailPlaceholder')}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                value={email}
                onChangeText={setEmail}
                editable={!loading}
              />
            </TextField>
            <TextField isRequired>
              <Label>{t('login.password')}</Label>
              <View className="w-full flex-row items-center">
                <Input
                  placeholder={t('register.passwordPlaceholder')}
                  className="flex-1 pr-11"
                  secureTextEntry={!passwordVisible}
                  autoCapitalize="none"
                  value={password}
                  onChangeText={setPassword}
                  editable={!loading}
                />
                <Pressable
                  className="absolute right-3.5 p-1"
                  onPress={() => setPasswordVisible(v => !v)}
                  hitSlop={8}
                >
                  <StyledIonicons
                    name={passwordVisible ? 'eye-outline' : 'eye-off-outline'}
                    size={18}
                    className="text-muted"
                  />
                </Pressable>
              </View>
            </TextField>
            <TextField isRequired>
              <Label>{t('register.confirmPassword')}</Label>
              <View className="w-full flex-row items-center">
                <Input
                  placeholder={t('register.confirmPasswordPlaceholder')}
                  className="flex-1 pr-11"
                  secureTextEntry={!confirmVisible}
                  autoCapitalize="none"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  editable={!loading}
                />
                <Pressable
                  className="absolute right-3.5 p-1"
                  onPress={() => setConfirmVisible(v => !v)}
                  hitSlop={8}
                >
                  <StyledIonicons
                    name={confirmVisible ? 'eye-outline' : 'eye-off-outline'}
                    size={18}
                    className="text-muted"
                  />
                </Pressable>
              </View>
            </TextField>
            <TextField>
              <Label>{t('register.phone')}</Label>
              <Input
                placeholder="+212 6 00 00 00 00"
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
                editable={!loading}
              />
            </TextField>
          </Surface>

          {/* Exposant-only fields */}
          {role === 'Exposant' && (
            <Surface className="rounded-2xl px-5 py-5 gap-4 mb-4">
              <Text className="text-sm font-semibold text-muted mb-1">
                {t('register.companyInfo')}
              </Text>
              <TextField>
                <Label>{t('register.company')}</Label>
                <Input
                  placeholder={t('register.companyPlaceholder')}
                  value={company}
                  onChangeText={setCompany}
                  editable={!loading}
                />
              </TextField>
              <TextField>
                <Label>{t('register.sector')}</Label>
                <Input
                  placeholder={t('register.sectorPlaceholder')}
                  value={secteur}
                  onChangeText={setSecteur}
                  editable={!loading}
                />
              </TextField>
              <TextField>
                <Label>{t('register.website')}</Label>
                <Input
                  placeholder={t('register.websitePlaceholder')}
                  autoCapitalize="none"
                  keyboardType="url"
                  value={website}
                  onChangeText={setWebsite}
                  editable={!loading}
                />
              </TextField>
            </Surface>
          )}

          {/* Speaker-only fields */}
          {role === 'Intervenant' && (
            <Surface className="rounded-2xl px-5 py-5 gap-4 mb-4">
              <Text className="text-sm font-semibold text-muted mb-1">
                {t('register.speakerInfo')}
              </Text>
              <TextField>
                <Label>{t('register.company')}</Label>
                <Input
                  placeholder={t('register.companyPlaceholder')}
                  value={company}
                  onChangeText={setCompany}
                  editable={!loading}
                />
              </TextField>
              <TextField>
                <Label>{t('register.jobTitle')}</Label>
                <Input
                  placeholder={t('register.jobTitlePlaceholder')}
                  value={jobTitle}
                  onChangeText={setJobTitle}
                  editable={!loading}
                />
              </TextField>
              <TextField>
                <Label>{t('register.topic')}</Label>
                <Input
                  placeholder={t('register.topicPlaceholder')}
                  value={topic}
                  onChangeText={setTopic}
                  editable={!loading}
                />
              </TextField>
              <TextField>
                <Label>{t('register.bio')}</Label>
                <Input
                  placeholder={t('register.bioPlaceholder')}
                  value={bio}
                  onChangeText={setBio}
                  editable={!loading}
                  multiline
                  numberOfLines={3}
                  style={{ minHeight: 72, textAlignVertical: 'top' }}
                />
              </TextField>
            </Surface>
          )}

          {/* Location */}
          <Surface className="rounded-2xl px-5 py-5 gap-4 mb-4">
            <Text className="text-sm font-semibold text-muted mb-1">
              {t('register.location')}
            </Text>
            <View className="flex-row gap-3">
              <View className="flex-1">
                <TextField>
                  <Label>{t('register.city')}</Label>
                  <Input
                    placeholder={t('register.cityPlaceholder')}
                    value={ville}
                    onChangeText={setVille}
                    editable={!loading}
                  />
                </TextField>
              </View>
              <View className="flex-1">
                <TextField>
                  <Label>{t('register.country')}</Label>
                  <Input
                    placeholder={t('register.countryPlaceholder')}
                    value={pays}
                    onChangeText={setPays}
                    editable={!loading}
                  />
                </TextField>
              </View>
            </View>
          </Surface>

          {/* CGU */}
          <ControlField
            isSelected={acceptCgu}
            onSelectedChange={setAcceptCgu}
            className="flex-row items-start mt-2 mb-6"
          >
            <ControlField.Indicator>
              <Checkbox className="border-2 border-muted" />
            </ControlField.Indicator>
            <View className="flex-1 flex-row flex-wrap items-center">
              <Text className="text-sm text-muted">{t('register.acceptPrefix')}</Text>
              <Pressable onPress={() => setTermsOpen(true)} hitSlop={4}>
                <Text className="text-sm font-semibold text-accent underline">
                  {t('register.cgu')}
                </Text>
              </Pressable>
              <Text className="text-sm text-muted">
                {t('register.acceptSuffix')}
              </Text>
            </View>
          </ControlField>

          {/* Submit */}
          <Button
            variant="primary"
            size="lg"
            className="rounded-2xl"
            onPress={handleRegister}
            isDisabled={loading}
          >
            <Button.Label>
              {loading ? t('register.submitting') : t('register.submit')}
            </Button.Label>
          </Button>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Terms & Conditions modal */}
      <Modal
        visible={termsOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setTermsOpen(false)}
        statusBarTranslucent
      >
        <View
          className="flex-1 justify-center px-5"
          style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
        >
          <View
            className="bg-background rounded-3xl overflow-hidden"
            style={{ maxHeight: '80%' }}
          >
            {/* Modal header */}
            <View className="flex-row items-center justify-between px-5 pt-5 pb-3 border-b border-separator">
              <View className="flex-1 pr-3">
                <Text className="text-lg font-extrabold text-foreground">
                  {t('terms.title')}
                </Text>
                <Text className="text-xs text-muted mt-0.5">
                  {t('terms.subtitle')}
                </Text>
              </View>
              <Pressable
                onPress={() => setTermsOpen(false)}
                className="w-9 h-9 rounded-full bg-surface items-center justify-center"
                hitSlop={8}
              >
                <StyledIonicons name="close" size={20} className="text-foreground" />
              </Pressable>
            </View>

            <ScrollView
              contentContainerStyle={{ padding: 20, gap: 18 }}
              showsVerticalScrollIndicator={false}
            >
              <Text className="text-xs text-muted">{t('terms.lastUpdate')}</Text>
              {(() => {
                const sections = t('terms.sections', { returnObjects: true });
                return (Array.isArray(sections) ? sections : []).map(section => (
                  <View key={section.title} style={{ gap: 6 }}>
                    <Text className="text-base font-bold text-foreground">
                      {section.title}
                    </Text>
                    <Text className="text-sm text-muted leading-5">
                      {section.body}
                    </Text>
                  </View>
                ));
              })()}
            </ScrollView>

            {/* Modal footer */}
            <View className="px-5 py-4 border-t border-separator">
              <Button
                variant="primary"
                size="md"
                className="rounded-2xl"
                onPress={() => setTermsOpen(false)}
              >
                <Button.Label>{t('register.close')}</Button.Label>
              </Button>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
