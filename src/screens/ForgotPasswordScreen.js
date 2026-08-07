import React, { useRef, useState } from 'react';
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
import { sendPasswordResetCode, resetPasswordWithCode } from '../services/api';
import { backIcon } from '../utils/rtl';

const StyledIonicons = withUniwind(Ionicons);

export default function ForgotPasswordScreen({ navigation }) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const scrollRef = useRef(null);

  const [step, setStep] = useState('email'); // 'email' | 'reset'
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  const handleSendCode = async () => {
    if (!email.trim()) {
      setErrorMsg(t('forgotPassword.errorEmailRequired'));
      return;
    }
    setLoading(true);
    setErrorMsg(null);
    try {
      await sendPasswordResetCode(email.trim());
      setStep('reset');
    } catch (e) {
      setErrorMsg(e?.response?.data?.message || t('forgotPassword.errorGeneric'));
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
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
      await resetPasswordWithCode(email.trim(), code.trim(), password, confirmPassword);
      setStep('done');
    } catch (e) {
      setErrorMsg(e?.response?.data?.message || t('forgotPassword.errorGeneric'));
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
            {step === 'done' ? (
              <>
                <View className="items-center gap-3 py-4">
                  <View className="w-16 h-16 rounded-full bg-success/10 items-center justify-center">
                    <StyledIonicons name="checkmark-circle" size={36} className="text-success" />
                  </View>
                  <Text className="text-lg font-bold text-foreground text-center">
                    {t('forgotPassword.successTitle')}
                  </Text>
                  <Text className="text-sm text-muted text-center">
                    {t('forgotPassword.successBody')}
                  </Text>
                </View>
                <Button
                  variant="primary"
                  size="lg"
                  className="rounded-2xl"
                  onPress={() => navigation.navigate('Login')}
                >
                  <Button.Label>{t('forgotPassword.backToLogin')}</Button.Label>
                </Button>
              </>
            ) : (
              <>
                <View className="gap-1">
                  <Text className="text-lg font-bold text-foreground">
                    {t('forgotPassword.title')}
                  </Text>
                  <Text className="text-sm text-muted">
                    {step === 'email' ? t('forgotPassword.subtitle') : t('forgotPassword.codeSentBody')}
                  </Text>
                </View>

                {errorMsg ? (
                  <Alert status="danger" className="rounded-xl items-center">
                    <Alert.Indicator className="pt-0" />
                    <Alert.Content>
                      <Alert.Title>{errorMsg}</Alert.Title>
                    </Alert.Content>
                  </Alert>
                ) : null}

                {step === 'email' ? (
                  <>
                    <TextField isRequired isInvalid={!!errorMsg}>
                      <Label>{t('login.email')}</Label>
                      <Input
                        placeholder={t('login.emailPlaceholder')}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoComplete="email"
                        value={email}
                        onChangeText={(v) => { setEmail(v); setErrorMsg(null); }}
                        editable={!loading}
                      />
                    </TextField>

                    <Button
                      variant="primary"
                      size="lg"
                      className="mt-2 rounded-2xl"
                      onPress={handleSendCode}
                      isDisabled={loading}
                    >
                      <Button.Label>
                        {loading ? t('forgotPassword.sending') : t('forgotPassword.sendCode')}
                      </Button.Label>
                    </Button>
                  </>
                ) : (
                  <>
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
                      <Label>{t('forgotPassword.newPassword')}</Label>
                      <View className="w-full flex-row items-center">
                        <Input
                          value={password}
                          onChangeText={(v) => { setPassword(v); setErrorMsg(null); }}
                          className="flex-1 pe-11"
                          placeholder={t('register.passwordPlaceholder')}
                          secureTextEntry={!passwordVisible}
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
                        editable={!loading}
                      />
                    </TextField>

                    <Button
                      variant="primary"
                      size="lg"
                      className="mt-2 rounded-2xl"
                      onPress={handleReset}
                      isDisabled={loading}
                    >
                      <Button.Label>
                        {loading ? t('forgotPassword.resetting') : t('forgotPassword.resetButton')}
                      </Button.Label>
                    </Button>

                    <View className="items-center mt-1">
                      <LinkButton size="sm" onPress={handleSendCode} isDisabled={loading}>
                        <LinkButton.Label className="text-accent font-semibold">
                          {t('forgotPassword.resendCode')}
                        </LinkButton.Label>
                      </LinkButton>
                    </View>
                  </>
                )}
              </>
            )}
          </Surface>

          {step !== 'done' ? (
            <View className="flex-row justify-center items-center mt-8 gap-1 flex-wrap">
              <LinkButton size="sm" onPress={() => navigation.navigate('Login')}>
                <LinkButton.Label className="text-accent font-semibold">
                  {t('forgotPassword.backToLogin')}
                </LinkButton.Label>
              </LinkButton>
            </View>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
