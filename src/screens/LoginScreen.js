import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image,
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
  Checkbox,
  ControlField,
  Input,
  Label,
  LinkButton,
  Surface,
  TextField,
  useThemeColor,
} from 'heroui-native';
import { useAuth } from '../context/AuthContext';

const StyledIonicons = withUniwind(Ionicons);

export default function LoginScreen({ navigation }) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const scrollRef = useRef(null);
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  const accentFgColor = useThemeColor('accent-foreground');

  // Scroll the error into view when it appears (error alert sits at the top of the form)
  useEffect(() => {
    if (errorMsg) {
      scrollRef.current?.scrollTo({ y: 0, animated: true });
    }
  }, [errorMsg]);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      setErrorMsg(t('login.errorEmptyFields'));
      return;
    }
    setLoading(true);
    setErrorMsg(null);
    try {
      await signIn(email.trim(), password);
    } catch (e) {
      const msg =
        e?.response?.data?.message ||
        t('login.errorInvalidCredentials');
      setErrorMsg(msg);
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
            paddingTop: 40,
            paddingBottom: 40,
          }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="always"
        >
          {/* Wordmark */}
          <View className="items-center mb-12">
            <Image
              source={require('../../assets/Logo_Logiterre-colored.webp')}
              style={{ width: 200, height: 82 }}
              resizeMode="contain"
            />
            {/* Amber divider */}
            <View className="h-px w-16 bg-accent mt-4 opacity-60" />
          </View>

          {/* Form card */}
          <Surface className="rounded-2xl px-5 py-6 gap-5">

            {/* Heading */}
            <View className="gap-1">
              <Text className="text-lg font-bold text-foreground">
                {t('login.welcome')}
              </Text>
              <Text className="text-sm text-muted">
                {t('login.subtitle')}
              </Text>
            </View>

            {/* Error alert */}
            {errorMsg ? (
              <Alert status="danger" className="rounded-xl items-center">
                <Alert.Indicator className="pt-0" />
                <Alert.Content>
                  <Alert.Title>{errorMsg}</Alert.Title>
                </Alert.Content>
              </Alert>
            ) : null}

            {/* Email field */}
            <TextField isRequired isInvalid={!!errorMsg}>
              <Label>{t('login.email')}</Label>
              <Input
                placeholder={t('login.emailPlaceholder')}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                value={email}
                onChangeText={v => {
                  setEmail(v);
                  setErrorMsg(null);
                }}
                editable={!loading}
              />
            </TextField>

            {/* Password field */}
            <TextField isRequired isInvalid={!!errorMsg}>
              <Label>{t('login.password')}</Label>
              <View className="w-full flex-row items-center">
                <Input
                  value={password}
                  onChangeText={v => {
                    setPassword(v);
                    setErrorMsg(null);
                  }}
                  className="flex-1 pr-11"
                  placeholder="••••••••"
                  secureTextEntry={!passwordVisible}
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

            {/* Remember me */}
            <ControlField
              isSelected={rememberMe}
              onSelectedChange={setRememberMe}
              className="items-center"
            >
              <ControlField.Indicator>
                <Checkbox className="mt-0.5 border-2 border-muted" />
              </ControlField.Indicator>
              <Label className="text-sm font-medium text-muted">
                {t('login.rememberMe')}
              </Label>
            </ControlField>

            {/* Login button */}
            <Button
              variant="primary"
              size="lg"
              className="mt-2 rounded-2xl"
              onPress={handleLogin}
              isDisabled={loading}
            >
              <Button.Label>
                {loading ? t('login.signingIn') : t('login.signIn')}
              </Button.Label>
            </Button>
          </Surface>

          {/* Register link */}
          <View className="flex-row justify-center items-center mt-8 gap-1 flex-wrap">
            <Text className="text-sm text-muted">{t('login.noAccount')}</Text>
            <LinkButton
              size="sm"
              onPress={() => navigation.navigate('Register')}
            >
              <LinkButton.Label className="text-accent font-semibold">
                {t('login.signUp')}
              </LinkButton.Label>
            </LinkButton>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
