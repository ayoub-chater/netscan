import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { withUniwind } from 'uniwind';
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
  const insets = useSafeAreaInsets();
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  const accentFgColor = useThemeColor('accent-foreground');

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      setErrorMsg('Veuillez saisir votre email et mot de passe.');
      return;
    }
    setLoading(true);
    setErrorMsg(null);
    try {
      await signIn(email.trim(), password);
    } catch (e) {
      const msg =
        e?.response?.data?.message ||
        'Identifiants incorrects. Veuillez réessayer.';
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      <StatusBar style="light" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 50}
      >
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            paddingHorizontal: 24,
            paddingTop: 40,
            paddingBottom: 40,
          }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="always"
        >
          {/* Wordmark */}
          <View className="items-center mb-12">
            <Image
              source={require('../../assets/logiterre-logo.png')}
              style={{ width: 180, height: 60 }}
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
                Bienvenue de retour
              </Text>
              <Text className="text-sm text-muted">
                Saisissez vos identifiants pour continuer
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
              <Label>Email</Label>
              <Input
                placeholder="votre@email.fr"
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
              <Label>Mot de passe</Label>
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
                <Checkbox className="mt-0.5" />
              </ControlField.Indicator>
              <Label className="text-sm font-medium text-muted">
                Se souvenir de moi
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
                {loading ? 'Connexion...' : 'Se connecter'}
              </Button.Label>
            </Button>
          </Surface>

          {/* Register link */}
          <View className="flex-row justify-center items-center mt-8 gap-1 flex-wrap">
            <Text className="text-sm text-muted">Pas encore de compte ?</Text>
            <LinkButton
              size="sm"
              onPress={() => navigation.navigate('Register')}
            >
              <LinkButton.Label className="text-accent font-semibold">
                S'inscrire
              </LinkButton.Label>
            </LinkButton>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
