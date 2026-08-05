import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Image,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { withUniwind } from 'uniwind';
import * as ImagePicker from 'expo-image-picker';
import {
  Alert as HeroAlert,
  Button,
  Input,
  Label,
  Surface,
  TextField,
} from 'heroui-native';
import { useAuth } from '../context/AuthContext';
import { getProfile, updateProfile } from '../services/api';
import {
  getCountries,
  fetchCities,
  countryLabel,
  sortCountries,
  findCountry,
} from '../services/geo';
import SearchableSelect from '../components/SearchableSelect';
import MenuButton from '../components/MenuButton';

const StyledIonicons = withUniwind(Ionicons);

export default function EditProfileScreen() {
  const { t, i18n } = useTranslation();
  const language = i18n.language;
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { scanner, updateScanner } = useAuth();

  const isExposant = (scanner?.role || '').toLowerCase() === 'exposant';

  const [name, setName] = useState(scanner?.name || '');
  const [phone, setPhone] = useState(scanner?.phone || '');
  const [website, setWebsite] = useState(scanner?.website || '');
  const [company, setCompany] = useState(scanner?.company || '');
  const [ville, setVille] = useState(scanner?.ville || '');
  // Country is a picked object, but a profile saved before the picker existed
  // (or holding a spelling we don't know) keeps its raw text so editing the
  // rest of the form never silently wipes it.
  const [country, setCountry] = useState(() => findCountry(scanner?.pays));
  const [paysText, setPaysText] = useState(scanner?.pays || '');
  const [secteur, setSecteur] = useState(scanner?.secteur || '');
  // Existing remote image (visitor photo or exhibitor logo) or a freshly picked local one
  const [image, setImage] = useState(
    isExposant ? scanner?.exhibitor_logo || null : scanner?.image || null
  );
  const [pickedAsset, setPickedAsset] = useState(null);
  const [email, setEmail] = useState(scanner?.email || '');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  const initial = (name || '?')[0]?.toUpperCase();

  // ── Country / city ──────────────────────────────────────────────────────
  // Same behaviour as signup: the country decides which cities are offered, and
  // the city field falls back to a plain input when the list can't be loaded.
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

  // Prefilled country: load its cities so the saved city shows as a real choice.
  useEffect(() => {
    if (country) loadCities(country);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [country?.code]);

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

  const cityItems = useMemo(
    () => cities.map((city) => ({ key: city, label: city })),
    [cities]
  );

  const onSelectCountry = (item) => {
    setCountry(item.country);
    setPaysText(item.label);
    // The previous city belongs to another country.
    setVille('');
  };

  // Pull the freshest profile so every visitor/exhibitor field is prefilled,
  // even ones not present in the cached session (phone, website, logo…).
  useEffect(() => {
    (async () => {
      try {
        const res = await getProfile();
        const u = res?.data?.user;
        if (!u) return;
        setName(u.name || '');
        setPhone(u.phone || '');
        setWebsite(u.website || '');
        setCompany(u.company || '');
        setVille(u.ville || '');
        setPaysText(u.pays || '');
        setCountry(findCountry(u.pays));
        setSecteur(u.secteur || '');
        setEmail(u.email || '');
        if (!pickedAsset) {
          setImage(isExposant ? u.exhibitor_logo || u.image || null : u.image || null);
        }
      } catch {
        // keep cached values
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pickImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(t('editProfile.permissionTitle'), t('editProfile.permissionBody'));
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: isExposant ? [1, 1] : [1, 1],
      quality: 0.7,
    });
    if (!res.canceled && res.assets?.length) {
      const asset = res.assets[0];
      setImage(asset.uri);
      setPickedAsset(asset);
    }
  };

  const buildFilePart = (asset) => {
    const uri = asset.uri;
    const nameFromUri = uri.split('/').pop() || `upload_${Date.now()}.jpg`;
    const ext = (asset.fileName?.split('.').pop() || nameFromUri.split('.').pop() || 'jpg').toLowerCase();
    const type = asset.mimeType || `image/${ext === 'jpg' ? 'jpeg' : ext}`;
    return { uri, name: asset.fileName || nameFromUri, type };
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setErrorMsg(t('editProfile.errorName'));
      return;
    }
    setLoading(true);
    setErrorMsg(null);
    try {
      const data = {
        name: name.trim(),
        phone: phone.trim(),
        website: website.trim(),
      };
      data.ville = ville.trim();
      // Stored in French whatever the app's language is — the back office reads
      // this field, and one spelling per country keeps it filterable.
      data.pays = country ? country.names.fr || country.names.en : paysText.trim();
      if (isExposant) {
        data.company = company.trim();
        data.secteur = secteur.trim();
      }
      if (pickedAsset) {
        const part = buildFilePart(pickedAsset);
        if (isExposant) data.logo = part;
        else data.image = part;
      }
      const res = await updateProfile(data);
      const user = res?.data?.user;
      if (user) await updateScanner(user);
      navigation.goBack();
    } catch (e) {
      const msg =
        e?.response?.data?.message ||
        (e?.response?.data?.errors
          ? Object.values(e.response.data.errors)[0][0]
          : null) ||
        t('editProfile.errorGeneric');
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
      >
        {/* ── Header ─────────────────────────────────── */}
        <View className="px-4 pt-2 pb-4 flex-row items-center" style={{ gap: 12 }}>
          <Pressable
            onPress={() => navigation.goBack()}
            className="w-10 h-10 rounded-xl bg-surface items-center justify-center"
            hitSlop={8}
          >
            <StyledIonicons name="chevron-back" size={22} className="text-foreground" />
          </Pressable>
          <Text className="flex-1 text-xl font-extrabold text-foreground">
            {t('editProfile.title')}
          </Text>
          <MenuButton />
        </View>

        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 48 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="always"
        >
          {/* Image picker */}
          <View className="items-center mb-6">
            <Pressable onPress={pickImage} hitSlop={8} style={{ width: 112, height: 112 }}>
              <View
                className="bg-surface-secondary items-center justify-center"
                style={{ width: 112, height: 112, borderRadius: 56, overflow: 'hidden' }}
              >
                {image ? (
                  <Image
                    source={{ uri: image }}
                    style={{ width: '100%', height: '100%' }}
                    resizeMode="cover"
                  />
                ) : (
                  <Text className="text-3xl font-extrabold text-muted">{initial}</Text>
                )}
              </View>
              {/* Camera badge — outside the clipped circle so it isn't cut off */}
              <View
                className="bg-accent items-center justify-center border-2 border-background"
                style={{
                  position: 'absolute',
                  bottom: 0,
                  right: 0,
                  width: 34,
                  height: 34,
                  borderRadius: 17,
                }}
              >
                <StyledIonicons name="camera" size={16} className="text-accent-foreground" />
              </View>
            </Pressable>
            <Text className="text-xs text-muted mt-3">
              {isExposant ? t('editProfile.changeLogo') : t('editProfile.changePhoto')}
            </Text>
          </View>

          {errorMsg ? (
            <HeroAlert status="danger" className="rounded-xl mb-5 items-center">
              <HeroAlert.Indicator className="pt-0" />
              <HeroAlert.Content>
                <HeroAlert.Title>{errorMsg}</HeroAlert.Title>
              </HeroAlert.Content>
            </HeroAlert>
          ) : null}

          <Surface className="rounded-2xl px-5 py-5 gap-4 mb-6">
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

            <TextField>
              <Label>{t('login.email')}</Label>
              <Input
                value={email}
                editable={false}
                className="opacity-60"
              />
              <Text className="text-xs text-muted mt-1">{t('editProfile.emailLocked')}</Text>
            </TextField>

            {isExposant ? (
              <>
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
              </>
            ) : null}

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

            {/* Country first — it decides which cities can be offered. */}
            <SearchableSelect
              label={t('register.country')}
              title={t('register.selectCountry')}
              placeholder={t('register.countryPlaceholder')}
              searchPlaceholder={t('register.searchCountry')}
              value={country ? countryLabel(country, language) : paysText}
              items={countryItems}
              onSelect={onSelectCountry}
              isDisabled={loading}
            />

            {/* City — list depends on the selected country. */}
            {citiesFailed || (!country && paysText) ? (
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
                value={ville}
                items={cityItems}
                onSelect={(item) => setVille(item.label)}
                isLoading={citiesLoading}
                isDisabled={loading || !country}
                disabledHint={!country ? t('register.cityNeedsCountry') : undefined}
              />
            )}
          </Surface>

          <Button
            variant="primary"
            size="lg"
            className="rounded-2xl"
            onPress={handleSave}
            isDisabled={loading}
          >
            <Button.Label>
              {loading ? t('editProfile.saving') : t('editProfile.save')}
            </Button.Label>
          </Button>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
