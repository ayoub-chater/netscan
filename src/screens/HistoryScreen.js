import React, { useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    ActivityIndicator, RefreshControl,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { networkingHistory } from '../services/api';
import { COLORS, SPACING, RADIUS, SHADOWS, BG_GRADIENT, getRoleColor } from '../constants/theme';
import NetworkingModal from '../components/NetworkingModal';

const HistoryItem = ({ item, onPress }) => {
    const role = item?.person?.role || 'Visiteur';
    const roleColor = getRoleColor(role);

    return (
        <TouchableOpacity style={styles.itemCard} onPress={() => onPress(item)}>
            <View style={[styles.avatar, { backgroundColor: roleColor + '15' }]}>
                <Text style={[styles.avatarText, { color: roleColor }]}>
                    {(item?.person?.name || '?')[0].toUpperCase()}
                </Text>
            </View>

            <View style={styles.content}>
                <Text style={styles.name}>{item?.person?.name || 'Inconnu'}</Text>
                <Text style={styles.company}>
                    {item?.person?.company ? `${item.person.company} • ` : ''}
                    <Text style={{ color: roleColor, fontWeight: '700' }}>{role}</Text>
                </Text>
            </View>

            <View style={styles.meta}>
                <Text style={styles.date}>
                    {new Date(item.scanned_at).toLocaleDateString('fr-FR', {
                        day: '2-digit', month: 'short'
                    })}
                </Text>
                <Text style={styles.time}>
                    {new Date(item.scanned_at).toLocaleTimeString('fr-FR', {
                        hour: '2-digit', minute: '2-digit'
                    })}
                </Text>
            </View>
        </TouchableOpacity>
    );
};

export default function HistoryScreen() {
    const { badgeNumber } = useAuth();
    const insets = useSafeAreaInsets();
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);

    const fetchHistory = async () => {
        if (!badgeNumber) {
            setLoading(false);
            return;
        }
        try {
            const res = await networkingHistory(badgeNumber);
            setHistory(res?.data?.history || []);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            setLoading(true);
            fetchHistory();
        }, [badgeNumber])
    );

    const onRefresh = () => {
        setRefreshing(true);
        fetchHistory();
    };

    return (
        <LinearGradient colors={BG_GRADIENT.colors} start={BG_GRADIENT.start} end={BG_GRADIENT.end} style={styles.root}>
            <View style={{ height: insets.top, backgroundColor: '#000000' }} />
            <StatusBar style="light" backgroundColor="#000000" />

            <View style={[styles.header]}>
                <Text style={styles.title}>Journal</Text>
                <View style={styles.badgeCount}>
                    <Text style={styles.badgeCountText}>{history.length} Rencontres</Text>
                </View>
            </View>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="small" color={COLORS.secondary} />
                </View>
            ) : (
                <FlatList
                    data={history}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={({ item }) => <HistoryItem item={item} onPress={setSelectedItem} />}
                    contentContainerStyle={styles.list}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.secondary} />
                    }
                    ListEmptyComponent={
                        <View style={styles.empty}>
                            <Text style={styles.emptyText}>Encore aucune racine</Text>
                            <Text style={styles.emptySub}>Votre réseau commencera à grandir ici dès votre premier scan.</Text>
                        </View>
                    }
                />
            )}

            <NetworkingModal
                visible={!!selectedItem}
                result={selectedItem}
                viewOnly={true}
                onClose={() => setSelectedItem(null)}
            />
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    header: {
        paddingTop: SPACING.md,
        paddingHorizontal: SPACING.lg,
        paddingBottom: SPACING.lg,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between'
    },
    title: {
        fontSize: 28,
        fontWeight: '800',
        color: COLORS.textPrimary,
    },
    badgeCount: {
        backgroundColor: COLORS.bgCard,
        paddingHorizontal: 12, paddingVertical: 6,
        borderRadius: RADIUS.full, ...SHADOWS.soft
    },
    badgeCountText: {
        fontSize: 12,
        color: COLORS.secondary,
        fontWeight: '800',
        textTransform: 'uppercase',
    },
    list: {
        padding: SPACING.lg,
        paddingBottom: 120,
    },
    itemCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: SPACING.md,
        backgroundColor: COLORS.bgCard,
        borderRadius: RADIUS.md,
        marginBottom: SPACING.sm,
        ...SHADOWS.soft,
    },
    avatar: {
        width: 44,
        height: 44,
        borderRadius: RADIUS.sm,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarText: {
        fontSize: 18,
        fontWeight: '800',
    },
    content: {
        flex: 1,
        marginLeft: SPACING.md,
    },
    name: {
        fontSize: 16,
        fontWeight: '700',
        color: COLORS.textPrimary,
    },
    company: {
        fontSize: 12,
        color: COLORS.textSecondary,
        marginTop: 2,
    },
    meta: {
        alignItems: 'flex-end',
    },
    date: {
        fontSize: 12,
        color: COLORS.textPrimary,
        fontWeight: '700',
    },
    time: {
        fontSize: 11,
        color: COLORS.textMuted,
        marginTop: 2,
    },
    empty: {
        alignItems: 'center',
        marginTop: 80,
    },
    emptyEmoji: { fontSize: 48, marginBottom: SPACING.md },
    emptyText: {
        fontSize: 18,
        fontWeight: '800',
        color: COLORS.textSecondary,
    },
    emptySub: {
        fontSize: 14,
        color: COLORS.textMuted,
        textAlign: 'center',
        marginTop: 8,
        paddingHorizontal: 40,
        lineHeight: 20
    },
});
