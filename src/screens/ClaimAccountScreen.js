import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { withUniwind } from 'uniwind';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Button,
  Input,
  Label,
  LinkButton,
  Surface,
  TextField,
} from 'heroui-native';
import { useAuth } from '../context/AuthContext';
import { requestAccountClaimCode, confirmAccountClaim } from '../services/api';
import { backIcon } from '../utils/rtl';
import { apiErrorMessage } from '../utils/apiError';
import useResendCooldown from '../hooks/useResendCooldown';

const StyledIonicons = withUniwind(Ionicons);

/**
 * Activating app access for someone who is already registered — from the event
 * website, an embedded form, or entered by the organiser. They have a badge and
 * a profile but never had a password, so signup sent them here (409
 * ACCOUNT_CLAIMABLE) instead of creating a second, competing record.
 *
 * Two steps: prove the mailbox with a 6-digit code, then choose a password.
 * Confirming logs them straight in — the backend answers with a session.
 */
export default function ClaimAccountScreen({ navigation, route }) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const scrollRef = useRef(null);
  const { applySession } = useAuth();

  const [email] = useState(route?.params?.email?.trim() ?? '');
  const [step, setStep] = useState('intro'); // 'intro' | 'verify'
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [resent, setResent] = useState(false);
  // Mirrors the server-side delay between two codes for the same address.
  const { remaining, isCoolingDown, start: startCooldown } = useResendCooldown();

  useEffect(() => {
    if (errorMsg) scrollRef.current?.scrollTo({ y: 0, animated: true });
  }, [errorMsg]);

  const apiError = (e, fallbackKey) => apiErrorMessage(e, t(fallbackKey));

  const handleSendCode = async (isResend = false) => {
    if (!email) {
      setErrorMsg(t('forgotPassword.errorEmailRequired'));
      return;
    }
    setLoading(true);
    setErrorMsg(null);
    setResent(false);
    try {
      await requestAccountClaimCode(email);
      startCooldown();
      setStep('verify');
      if (isResend) setResent(true);
    } catch (e) {
      // The server holds the same delay and says how much of it is left.
      if (e?.response?.data?.code === 'RESEND_COOLDOWN') {
        startCooldown(e.response.data.retry_after);
        setStep('verify');
      } else {
        setErrorMsg(apiError(e, 'claimAccount.errorGeneric'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!code.trim()) {
      setErrorMsg(t('forgotPassword.errorCodeRequired'));
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
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await confirmAccountClaim(email, code.trim(), password, confirmPassword);
      // Backend returns a full session — same shape as login.
      await applySession(res.data);
    } catch (e) {
      // The account got created in the meantime (another device, or they
      // finished the flow twice): logging in is the only way forward.
      if (e?.response?.data?.code === 'ACCOUNT_EXISTS') {
        setErrorMsg(t('claimAccount.errorAlreadyActivated'));
      } else if (e?.response?.data?.code === 'CODE_LOCKED') {
        // Too many wrong guesses: the code is gone, a new one is the only way on.
        setCode('');
        setErrorMsg(t('forgotPassword.errorCodeLocked'));
      } else {
        setErrorMsg(apiError(e, 'claimAccount.errorGeneric'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 50}
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: isTablet ? 'center' : 'flex-start',
            paddingHorizontal: isTablet ? '15%' : 24,
            paddingTop: 24,
            paddingBottom: 40,
          }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="always"
        >
          {/* Header */}
          <View className="flex-row items-center mb-8" style={{ gap: 12 }}>
            <Pressable
              onPress={() => navigation.goBack()}
              className="w-10 h-10 rounded-xl bg-surface items-center justify-center"
              hitSlop={8}
            >
              <StyledIonicons name={backIcon()} size={22} className="text-foreground" />
            </Pressable>
          </View>

          <Surface className="rounded-2xl px-5 py-6 gap-5">
            <View className="items-center gap-3">
              <View className="w-16 h-16 rounded-full bg-accent-soft items-center justify-center">
                <StyledIonicons name="shield-checkmark-outline" size={32} className="text-accent" />
              </View>
              <Text className="text-lg font-bold text-foreground text-center">
                {t('claimAccount.title')}
              </Text>
              <Text className="text-sm text-muted text-center leading-5">
                {step === 'intro'
                  ? t('claimAccount.introBody')
                  : t('claimAccount.codeSentBody')}
              </Text>
              <View className="px-3 py-1.5 rounded-xl bg-surface">
                <Text className="text-sm font-semibold text-foreground">{email}</Text>
              </View>
            </View>

            {errorMsg ? (
              <Alert status="danger" className="rounded-xl items-center">
                <Alert.Indicator className="pt-0" />
                <Alert.Content>
                  <Alert.Title>{errorMsg}</Alert.Title>
                </Alert.Content>
              </Alert>
            ) : null}

            {step === 'intro' ? (
              <>
                <Button
                  variant="primary"
                  size="lg"
                  className="mt-1 rounded-2xl"
                  onPress={() => handleSendCode(false)}
                  isDisabled={loading}
                >
                  <Button.Label>
                    {loading ? t('forgotPassword.sending') : t('claimAccount.sendCode')}
                  </Button.Label>
                </Button>
                <Text className="text-xs text-muted text-center">
                  {t('claimAccount.keepsDataHint')}
                </Text>
              </>
            ) : (
              <>
                {resent ? (
                  <Alert status="success" className="rounded-xl items-center">
                    <Alert.Indicator className="pt-0" />
                    <Alert.Content>
                      <Alert.Title>{t('claimAccount.codeResent')}</Alert.Title>
                    </Alert.Content>
                  </Alert>
                ) : null}

                <TextField isRequired isInvalid={!!errorMsg}>
                  <Label>{t('forgotPassword.code')}</Label>
                  <Input
                    placeholder={t('forgotPassword.codePlaceholder')}
                    keyboardType="number-pad"
                    maxLength={6}
                    value={code}
                    onChangeText={(v) => { setCode(v); setErrorMsg(null); }}
                    editable={!loading}
                  />
                </TextField>

                <TextField isRequired isInvalid={!!errorMsg}>
                  <Label>{t('claimAccount.password')}</Label>
                  <View className="w-full flex-row items-center">
                    <Input
                      value={password}
                      onChangeText={(v) => { setPassword(v); setErrorMsg(null); }}
                      className="flex-1 pe-11"
                      placeholder={t('register.passwordPlaceholder')}
                      secureTextEntry={!passwordVisible}
                      autoCapitalize="none"
                      editable={!loading}
                    />
                    <Pressable
                      className="absolute end-3.5 p-1"
                      onPress={() => setPasswordVisible((v) => !v)}
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

                <TextField isRequired isInvalid={!!errorMsg}>
                  <Label>{t('register.confirmPassword')}</Label>
                  <Input
                    value={confirmPassword}
                    onChangeText={(v) => { setConfirmPassword(v); setErrorMsg(null); }}
                    placeholder={t('register.confirmPasswordPlaceholder')}
                    secureTextEntry={!passwordVisible}
                    autoCapitalize="none"
                    editable={!loading}
                  />
                </TextField>

                <Button
                  variant="primary"
                  size="lg"
                  className="mt-2 rounded-2xl"
                  onPress={handleConfirm}
                  isDisabled={loading}
                >
                  <Button.Label>
                    {loading ? t('claimAccount.activating') : t('claimAccount.activate')}
                  </Button.Label>
                </Button>

                <View className="items-center mt-1">
                  <LinkButton
                    size="sm"
                    onPress={() => handleSendCode(true)}
                    isDisabled={loading || isCoolingDown}
                  >
                    <LinkButton.Label
                      className={isCoolingDown ? 'text-muted font-semibold' : 'text-accent font-semibold'}
                    >
                      {isCoolingDown
                        ? t('forgotPassword.resendIn', { seconds: remaining })
                        : t('forgotPassword.resendCode')}
                    </LinkButton.Label>
                  </LinkButton>
                </View>
              </>
            )}
          </Surface>

          <View className="flex-row justify-center items-center mt-8 gap-1 flex-wrap">
            <LinkButton size="sm" onPress={() => navigation.navigate('Login')}>
              <LinkButton.Label className="text-accent font-semibold">
                {t('forgotPassword.backToLogin')}
              </LinkButton.Label>
            </LinkButton>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
