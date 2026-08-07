import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

export default function ConnectionToast({ toast, onPress, onHide }) {
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(-140)).current;

  useEffect(() => {
    if (!toast) return;
    Animated.spring(translateY, {
      toValue: 0,
      useNativeDriver: true,
      bounciness: 6,
    }).start();

    const timer = setTimeout(() => {
      Animated.timing(translateY, {
        toValue: -140,
        duration: 200,
        useNativeDriver: true,
      }).start(() => onHide?.());
    }, 4000);

    return () => clearTimeout(timer);
  }, [toast]);

  if (!toast) return null;

  return (
    <Animated.View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        paddingTop: insets.top + 8,
        paddingHorizontal: 12,
        zIndex: 999,
        transform: [{ translateY }],
      }}
    >
      <Pressable
        onPress={onPress}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: '#2e368e',
          borderRadius: 18,
          paddingVertical: 14,
          paddingHorizontal: 16,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.25,
          shadowRadius: 12,
          elevation: 8,
        }}
      >
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: 'rgba(255,255,255,0.18)',
            alignItems: 'center',
            justifyContent: 'center',
            marginEnd: 12,
          }}
        >
          <Ionicons name="people" size={20} color="#fff" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>{toast.title}</Text>
          {!!toast.body && (
            <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13, marginTop: 2 }}>
              {toast.body}
            </Text>
          )}
        </View>
      </Pressable>
    </Animated.View>
  );
}
