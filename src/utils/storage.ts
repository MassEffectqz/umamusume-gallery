import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEYS = {
  FAVORITES: '@gallery_favorites',
  THEME: '@gallery_theme',
  UI_VISIBLE: '@gallery_ui_visible',
  SORT_ORDER: '@gallery_sort_order',
  VIEW_MODE: '@gallery_view_mode',
};

export const storage = {
  async saveFavorites(favorites: Set<string>): Promise<void> {
    try {
      const favArray = Array.from(favorites);
      await AsyncStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(favArray));
    } catch (error) {
      console.error('Error saving favorites:', error);
    }
  },

  async loadFavorites(): Promise<Set<string>> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.FAVORITES);
      if (data) {
        const favArray = JSON.parse(data);
        return new Set(favArray);
      }
    } catch (error) {
      console.error('Error loading favorites:', error);
    }
    return new Set();
  },

  async saveTheme(theme: 'light' | 'dark'): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.THEME, theme);
    } catch (error) {
      console.error('Error saving theme:', error);
    }
  },

  async loadTheme(): Promise<'light' | 'dark'> {
    try {
      const theme = await AsyncStorage.getItem(STORAGE_KEYS.THEME);
      return (theme as 'light' | 'dark') || 'dark';
    } catch (error) {
      console.error('Error loading theme:', error);
      return 'dark';
    }
  },

  async saveUIVisible(visible: boolean): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.UI_VISIBLE, JSON.stringify(visible));
    } catch (error) {
      console.error('Error saving UI visible:', error);
    }
  },

  async loadUIVisible(): Promise<boolean> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.UI_VISIBLE);
      return data ? JSON.parse(data) : true;
    } catch (error) {
      console.error('Error loading UI visible:', error);
      return true;
    }
  },

  async saveSortOrder(order: string): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.SORT_ORDER, order);
    } catch (error) {
      console.error('Error saving sort order:', error);
    }
  },

  async loadSortOrder(): Promise<string> {
    try {
      const order = await AsyncStorage.getItem(STORAGE_KEYS.SORT_ORDER);
      return order || 'name';
    } catch (error) {
      console.error('Error loading sort order:', error);
      return 'name';
    }
  },

  async saveViewMode(mode: 'grid' | 'list'): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.VIEW_MODE, mode);
    } catch (error) {
      console.error('Error saving view mode:', error);
    }
  },

  async loadViewMode(): Promise<'grid' | 'list'> {
    try {
      const mode = await AsyncStorage.getItem(STORAGE_KEYS.VIEW_MODE);
      return (mode as 'grid' | 'list') || 'grid';
    } catch (error) {
      console.error('Error loading view mode:', error);
      return 'grid';
    }
  },

  async clearAll(): Promise<void> {
    try {
      await AsyncStorage.multiRemove(Object.values(STORAGE_KEYS));
    } catch (error) {
      console.error('Error clearing storage:', error);
    }
  },
};