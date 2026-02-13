import { useState, useEffect, useCallback } from 'react';
import { storage } from '../utils/storage';

export type Theme = 'light' | 'dark';
export type ViewMode = 'grid' | 'list';
export type SortOrder = 'name' | 'date' | 'size';

interface Settings {
  theme: Theme;
  viewMode: ViewMode;
  sortOrder: SortOrder;
  uiVisible: boolean;
}

export const useSettings = () => {
  const [settings, setSettings] = useState<Settings>({
    theme: 'dark',
    viewMode: 'grid',
    sortOrder: 'name',
    uiVisible: true,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setIsLoading(true);
      const [theme, viewMode, sortOrder, uiVisible] = await Promise.all([
        storage.loadTheme(),
        storage.loadViewMode(),
        storage.loadSortOrder(),
        storage.loadUIVisible(),
      ]);
      setSettings({
        theme,
        viewMode: viewMode as ViewMode,
        sortOrder: sortOrder as SortOrder,
        uiVisible,
      });
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const setTheme = useCallback(async (theme: Theme) => {
    setSettings(prev => ({ ...prev, theme }));
    await storage.saveTheme(theme);
  }, []);

  const setViewMode = useCallback(async (viewMode: ViewMode) => {
    setSettings(prev => ({ ...prev, viewMode }));
    await storage.saveViewMode(viewMode);
  }, []);

  const setSortOrder = useCallback(async (sortOrder: SortOrder) => {
    setSettings(prev => ({ ...prev, sortOrder }));
    await storage.saveSortOrder(sortOrder);
  }, []);

  const setUIVisible = useCallback(async (uiVisible: boolean) => {
    setSettings(prev => ({ ...prev, uiVisible }));
    await storage.saveUIVisible(uiVisible);
  }, []);

  const resetSettings = useCallback(async () => {
    const defaultSettings: Settings = {
      theme: 'dark',
      viewMode: 'grid',
      sortOrder: 'name',
      uiVisible: true,
    };
    setSettings(defaultSettings);
    await storage.clearAll();
  }, []);

  return {
    settings,
    setTheme,
    setViewMode,
    setSortOrder,
    setUIVisible,
    resetSettings,
    isLoading,
  };
};