import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
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
  ControlField,
  Input,
  Label,
  LinkButton,
  Surface,
  TextField,
} from 'heroui-native';
import { useAuth } from '../context/AuthContext';
import { register } from '../services/api';
import {
  getCountries,
  fetchCities,
  countryLabel,
  sortCountries,
  cityLabel,
  cityOptions,
} from '../services/geo';
import SearchableSelect from '../components/SearchableSelect';
import { PARTICIPATE_ICON } from '../constants/roles';
import { backIcon } from '../utils/rtl';
import { apiErrorMessage } from '../utils/apiError';

const StyledIonicons = withUniwind(Ionicons);

// Signup only asks for what every role shares. Becoming an exposant,
// intervenant, sponsor… happens afterwards from the "Participer" flow
// (ParticipateScreen), which collects the role's own fields and waits for an
// organiser to approve it.
export default function RegisterScreen({ navigation }) {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const scrollRef = useRef(null);
  const { applySession } = useAuth();
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
  const [ville, setVille] = useState('');

  // ── Country / city ──────────────────────────────────────────────────────
  // Country is asked first: it decides which cities can be offered. The country
  // list ships with the app (localised), the city list is fetched per country
  // and degrades into a plain text input when it can't be loaded, so a flaky
  // network never blocks a signup.
  const language = i18n.language;
  const [country, setCountry] = useState(null);

  const [cities, setCities] = useState([]);
  const [citiesLoading, setCitiesLoading] = useState(false);
  const [citiesFailed, setCitiesFailed] = useState(false);

  // Switching country twice quickly must not let the first (slower) response
  // land after the second one.
  const cityRequestRef = useRef(0);

  const loadCities = useCallback((selected) => {
    const requestId = ++cityRequestRef.current;
    if (!selected) {
      setCities([]);
      setCitiesFailed(false);
      return;
    }
    setCitiesLoading(true);
    setCitiesFailed(false);
    fetchCities(selected)
      .then((list) => {
        if (cityRequestRef.current !== requestId) return;
        setCities(list);
        // An empty list is a dead end for a picker — let the user type instead.
        setCitiesFailed(list.length === 0);
      })
      .catch(() => {
        if (cityRequestRef.current !== requestId) return;
        setCities([]);
        setCitiesFailed(true);
      })
      .finally(() => {
        if (cityRequestRef.current === requestId) setCitiesLoading(false);
      });
  }, []);

  const countryItems = useMemo(
    () =>
      sortCountries(getCountries(), language).map((c) => ({
        key: c.code,
        label: countryLabel(c, language),
        prefix: c.flag,
        country: c,
      })),
    [language]
  );

  // `ville` holds the API's English spelling, not what is on screen: it is the
  // canonical value the back office stores, so switching language re-labels the
  // field without changing what gets submitted.
  const cityItems = useMemo(
    () =>
      cityOptions(cities, country?.code, language).map((c) => ({
        key: c.value,
        label: c.label,
        value: c.value,
      })),
    [cities, country, language]
  );

  const onSelectCountry = (item) => {
    setCountry(item.country);
    // The previous city belongs to another country.
    setVille('');
    loadCities(item.country);
  };

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
      // Stored in French whatever the app's language is — the back office reads
      // these fields, and one spelling per country keeps them filterable.
      const paysValue = country ? country.names.fr || country.names.en : '';
      const res = await register({
        name: name.trim(),
        email: email.trim(),
        password,
        phone: phone.trim() || undefined,
        ville: ville.trim() || undefined,
        pays: paysValue || undefined,
      });
      await applySession(res.data);
    } catch (e) {
      const code = e?.response?.data?.code;

      // Already registered from the event website / by the organiser: they
      // have a badge and a profile but no password. Send them to the claim
      // flow instead of failing — creating a second record here would split
      // their badge and their history in two.
      if (code === 'ACCOUNT_CLAIMABLE') {
        navigation.navigate('ClaimAccount', { email: email.trim() });
        return;
      }

      // Already has a real account with a password. Rather than dead-ending on
      // "this email is taken", send them to the code-verification screen with
      // the address prefilled: they prove the mailbox, set a password, and sign
      // in. Same destination as a forgotten password, reached from signup.
      if (code === 'ACCOUNT_EXISTS') {
        navigation.navigate('ForgotPassword', {
          email: email.trim(),
          notice: t('register.accountExistsNotice'),
        });
        return;
      }

      setErrorMsg(apiErrorMessage(e, t('register.errorGeneric')));
    } finally {
      setLoading(false);
    }
  };

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
          <View className="flex-row items-center mb-8">
            <Pressable
              onPress={() => navigation.goBack()}
              className="w-10 h-10 items-center justify-center rounded-xl bg-surface"
              hitSlop={8}
            >
              <StyledIonicons
                name={backIcon()}
                size={22}
                className="text-foreground"
              />
            </Pressable>
          </View>

          {/* Logo */}
          <View className="items-center mb-8">
            <Image
              source={require('../../assets/Logo_Logiterre-colored.webp')}
              style={{ width: 180, height: 73 }}
              resizeMode="contain"
            />
          </View>

          {/* Title */}
          <Text className="text-2xl font-extrabold text-foreground mb-1">
            {t('register.createAccount')}
          </Text>
          <Text className="text-sm text-muted mb-6">
            {t('register.subtitle')}
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
                  className="flex-1 pe-11"
                  secureTextEntry={!passwordVisible}
                  autoCapitalize="none"
                  value={password}
                  onChangeText={setPassword}
                  editable={!loading}
                />
                <Pressable
                  className="absolute end-3.5 p-1"
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
                  className="flex-1 pe-11"
                  secureTextEntry={!confirmVisible}
                  autoCapitalize="none"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  editable={!loading}
                />
                <Pressable
                  className="absolute end-3.5 p-1"
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

          {/* Location */}
          <Surface className="rounded-2xl px-5 py-5 gap-4 mb-4">
            <Text className="text-sm font-semibold text-muted mb-1">
              {t('register.location')}
            </Text>
            {/* Country first — it decides which cities can be offered. */}
            <SearchableSelect
              label={t('register.country')}
              title={t('register.selectCountry')}
              placeholder={t('register.countryPlaceholder')}
              searchPlaceholder={t('register.searchCountry')}
              value={country ? countryLabel(country, language) : ''}
              items={countryItems}
              onSelect={onSelectCountry}
              isDisabled={loading}
            />

            {/* City — list depends on the selected country. */}
            {citiesFailed ? (
              <TextField>
                <Label>{t('register.city')}</Label>
                <Input
                  placeholder={t('register.cityPlaceholder')}
                  value={ville}
                  onChangeText={setVille}
                  editable={!loading}
                />
              </TextField>
            ) : (
              <SearchableSelect
                label={t('register.city')}
                title={t('register.selectCity')}
                placeholder={t('register.cityPlaceholder')}
                searchPlaceholder={t('register.searchCity')}
                value={cityLabel(ville, country?.code, language)}
                items={cityItems}
                onSelect={(item) => setVille(item.value)}
                isLoading={citiesLoading}
                isDisabled={loading || !country}
                disabledHint={!country ? t('register.cityNeedsCountry') : undefined}
              />
            )}
          </Surface>

          {/* Where the participation choice went */}
          <Surface className="rounded-2xl px-5 py-4 mb-4 flex-row items-start" style={{ gap: 12 }}>
            <View className="w-9 h-9 rounded-xl bg-accent-soft items-center justify-center">
              <StyledIonicons name={PARTICIPATE_ICON} size={18} className="text-accent" />
            </View>
            <View className="flex-1">
              <Text className="text-sm font-bold text-foreground mb-0.5">
                {t('register.participateHintTitle')}
              </Text>
              <Text className="text-xs text-muted leading-5">
                {t('register.participateHintBody')}
              </Text>
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
              <View className="flex-1 pe-3">
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
