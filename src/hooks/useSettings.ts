import { useState, useEffect, useCallback } from 'react';

export type Theme = 'light' | 'dark';
export type ViewMode = 'grid' | 'list';
export type SortOrder = 'name' | 'date' | 'size';

interface Settings {
  theme: Theme;
  viewMode: ViewMode;
  sortOrder: SortOrder;
  uiVisible: boolean;
  columns: number;
  sortType: string;
  filterType: string;
}

const useSettings = () => {
  const [settings, setSettings] = useState<Settings>({
    theme: 'dark',
    viewMode: 'grid',
    sortOrder: 'name',
    uiVisible: true,
    columns: 4,
    sortType: 'default',
    filterType: 'all',
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setIsLoading(true);
      const data = localStorage.getItem('appSettings');
      if (data) {
        const parsed = JSON.parse(data);
        setSettings({
          theme: parsed.theme || 'dark',
          viewMode: parsed.viewMode || 'grid',
          sortOrder: parsed.sortOrder || 'name',
          uiVisible: parsed.uiVisible !== false,
          columns: parsed.columns || 4,
          sortType: parsed.sortType || 'default',
          filterType: parsed.filterType || 'all',
        });
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveSettings = useCallback(async (newSettings: Partial<Settings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    localStorage.setItem('appSettings', JSON.stringify(updated));
  }, [settings]);

  const setTheme = useCallback(async (theme: Theme) => {
    saveSettings({ theme });
  }, [saveSettings]);

  const setViewMode = useCallback(async (viewMode: ViewMode) => {
    saveSettings({ viewMode });
  }, [saveSettings]);

  const setSortOrder = useCallback(async (sortOrder: SortOrder) => {
    saveSettings({ sortOrder });
  }, [saveSettings]);

  const setUIVisible = useCallback(async (uiVisible: boolean) => {
    saveSettings({ uiVisible });
  }, [saveSettings]);

  const setColumns = useCallback(async (columns: number) => {
    saveSettings({ columns });
  }, [saveSettings]);

  const setSortType = useCallback(async (sortType: string) => {
    saveSettings({ sortType });
  }, [saveSettings]);

  const setFilterType = useCallback(async (filterType: string) => {
    saveSettings({ filterType });
  }, [saveSettings]);

  const resetSettings = useCallback(async () => {
    const defaultSettings: Settings = {
      theme: 'dark',
      viewMode: 'grid',
      sortOrder: 'name',
      uiVisible: true,
      columns: 4,
      sortType: 'default',
      filterType: 'all',
    };
    setSettings(defaultSettings);
    localStorage.removeItem('appSettings');
  }, []);

  return {
    settings,
    setTheme,
    setViewMode,
    setSortOrder,
    setUIVisible,
    setColumns,
    setSortType,
    setFilterType,
    resetSettings,
    isLoading,
  };
};

export default useSettings;
