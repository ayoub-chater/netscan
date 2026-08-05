import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import AppMenu from '../components/AppMenu';
import { useAuth } from './AuthContext';

// The slide-out menu is mounted once, above the navigator, so every screen can
// open it with `<MenuButton />` instead of owning its own copy of the panel.
const MenuContext = createContext({
  isMenuVisible: false,
  openMenu: () => {},
  closeMenu: () => {},
});

export const useMenu = () => useContext(MenuContext);

export function MenuProvider({ children }) {
  // Nothing in the menu makes sense signed out, and its rows all point at
  // authenticated screens.
  const { isAuthenticated } = useAuth();
  const [visible, setVisible] = useState(false);

  const openMenu = useCallback(() => setVisible(true), []);
  const closeMenu = useCallback(() => setVisible(false), []);

  // Logging out unmounts the panel; make sure it doesn't come back open on the
  // next session.
  useEffect(() => {
    if (!isAuthenticated) setVisible(false);
  }, [isAuthenticated]);

  const value = useMemo(
    () => ({ isMenuVisible: visible, openMenu, closeMenu }),
    [visible, openMenu, closeMenu]
  );

  return (
    <MenuContext.Provider value={value}>
      <View style={{ flex: 1 }}>
        {children}
        {isAuthenticated ? <AppMenu visible={visible} onClose={closeMenu} /> : null}
      </View>
    </MenuContext.Provider>
  );
}
