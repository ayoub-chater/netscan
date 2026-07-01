import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Switch,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  Avatar,
  Button,
  Chip,
  Dialog,
  ListGroup,
  Separator,
} from 'heroui-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export default function ProfileScreen() {
  const { scanner, badgeNumber, signOut } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const insets = useSafeAreaInsets();
  const [logoutOpen, setLogoutOpen] = useState(false);

  const scannerName = scanner?.name || 'Utilisateur';
  const scannerEmail = scanner?.email || '';
  const scannerRole = scanner?.role || 'Visiteur';
  const isExposant = scannerRole.toLowerCase() === 'exposant';
  const initial = scannerName[0]?.toUpperCase() || '?';

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 140 }}
      >
        {/* ── Header ───────────────────────────────── */}
        <View className="px-6 pt-5 pb-6">
          <Text className="text-2xl font-extrabold text-foreground">Paramètres</Text>
        </View>

        {/* ── Profile Card ─────────────────────────── */}
        <View className="mx-6 mb-8 bg-surface rounded-2xl px-5 py-5 flex-row items-center" style={{ gap: 16 }}>
          <Avatar size="lg" color={isExposant ? 'success' : 'default'} variant="soft">
            <Avatar.Fallback>{initial}</Avatar.Fallback>
          </Avatar>
          <View className="flex-1" style={{ gap: 4 }}>
            <Text className="text-lg font-extrabold text-foreground">{scannerName}</Text>
            {scannerEmail ? (
              <Text className="text-sm text-muted">{scannerEmail}</Text>
            ) : null}
            <Chip size="sm" variant="soft" color={isExposant ? 'success' : 'default'}>
              <Chip.Label>{scannerRole}</Chip.Label>
            </Chip>
          </View>
        </View>

        {/* ── Identity Section ─────────────────────── */}
        <Text className="text-[10px] font-bold text-muted uppercase tracking-widest px-8 mb-2">
          Mon Identité
        </Text>
        <ListGroup className="mx-6 mb-6">
          <ListGroup.Item>
            <ListGroup.ItemPrefix>
              <Ionicons name="id-card-outline" size={18} color="#2db067" />
            </ListGroup.ItemPrefix>
            <ListGroup.ItemContent>
              <ListGroup.ItemTitle>Rôle</ListGroup.ItemTitle>
            </ListGroup.ItemContent>
            <ListGroup.ItemSuffix>
              <Chip size="sm" variant="soft" color={isExposant ? 'success' : 'default'}>
                <Chip.Label>{scannerRole}</Chip.Label>
              </Chip>
            </ListGroup.ItemSuffix>
          </ListGroup.Item>
          <Separator className="mx-4" />
          <ListGroup.Item>
            <ListGroup.ItemPrefix>
              <Ionicons name="qr-code-outline" size={18} color="#2db067" />
            </ListGroup.ItemPrefix>
            <ListGroup.ItemContent>
              <ListGroup.ItemTitle>Badge Relié</ListGroup.ItemTitle>
              <ListGroup.ItemDescription>
                {badgeNumber || 'Aucun badge relié'}
              </ListGroup.ItemDescription>
            </ListGroup.ItemContent>
          </ListGroup.Item>
        </ListGroup>

        {/* ── Apparence ────────────────────────────── */}
        <Text className="text-[10px] font-bold text-muted uppercase tracking-widest px-8 mb-2">
          Apparence
        </Text>
        <ListGroup className="mx-6 mb-6">
          <ListGroup.Item>
            <ListGroup.ItemPrefix>
              <Ionicons
                name={isDark ? 'moon-outline' : 'sunny-outline'}
                size={18}
                color="#2db067"
              />
            </ListGroup.ItemPrefix>
            <ListGroup.ItemContent>
              <ListGroup.ItemTitle>Mode sombre</ListGroup.ItemTitle>
              <ListGroup.ItemDescription>
                {isDark ? 'Activé' : 'Désactivé'}
              </ListGroup.ItemDescription>
            </ListGroup.ItemContent>
            <ListGroup.ItemSuffix>
              <Switch
                value={isDark}
                onValueChange={toggleTheme}
                trackColor={{ false: '#D1D5DB', true: '#286EAD' }}
                thumbColor="#FFFFFF"
                ios_backgroundColor="#D1D5DB"
              />
            </ListGroup.ItemSuffix>
          </ListGroup.Item>
        </ListGroup>

        {/* ── Support Section ──────────────────────── */}
        <Text className="text-[10px] font-bold text-muted uppercase tracking-widest px-8 mb-2">
          À Propos
        </Text>
        <ListGroup className="mx-6 mb-8">
          <ListGroup.Item onPress={() => {}}>
            <ListGroup.ItemPrefix>
              <Ionicons name="help-circle-outline" size={18} color="#2db067" />
            </ListGroup.ItemPrefix>
            <ListGroup.ItemContent>
              <ListGroup.ItemTitle>Aide et Support</ListGroup.ItemTitle>
            </ListGroup.ItemContent>
            <ListGroup.ItemSuffix />
          </ListGroup.Item>
          <Separator className="mx-4" />
          <ListGroup.Item onPress={() => {}}>
            <ListGroup.ItemPrefix>
              <Ionicons name="document-text-outline" size={18} color="#2db067" />
            </ListGroup.ItemPrefix>
            <ListGroup.ItemContent>
              <ListGroup.ItemTitle>Mentions Légales</ListGroup.ItemTitle>
            </ListGroup.ItemContent>
            <ListGroup.ItemSuffix />
          </ListGroup.Item>
        </ListGroup>

        {/* ── Logout ───────────────────────────────── */}
        <View className="mx-6">
          <Button
            size="lg"
            className="rounded-2xl"
            variant="secondary"
            onPress={() => setLogoutOpen(true)}
          >
            <Button.Label style={{ color: '#EF4444' }}>
              Se déconnecter de NetScan
            </Button.Label>
          </Button>
        </View>

        <Text className="text-center text-[11px] text-muted mt-8 pb-4">
          Version 1.2.0
        </Text>
      </ScrollView>

      {/* ── Logout Dialog ────────────────────────── */}
      <Dialog isOpen={logoutOpen} onOpenChange={setLogoutOpen}>
        <Dialog.Portal>
          <Dialog.Overlay />
          <Dialog.Content>
            <View className="mb-5" style={{ gap: 6 }}>
              <Dialog.Title>Déconnexion</Dialog.Title>
              <Dialog.Description>
                Souhaitez-vous fermer votre session NetScan ?
              </Dialog.Description>
            </View>
            <View className="flex-row justify-end" style={{ gap: 12 }}>
              <Button
                variant="tertiary"
                size="sm"
                onPress={() => setLogoutOpen(false)}
              >
                <Button.Label>Rester</Button.Label>
              </Button>
              <Button variant="primary" size="sm" onPress={signOut}>
                <Button.Label>Déconnexion</Button.Label>
              </Button>
            </View>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog>
    </View>
  );
}
