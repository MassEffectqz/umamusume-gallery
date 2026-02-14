import React, { useState, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Dimensions,
  SafeAreaView,
  Alert,
  Platform,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { FlashList } from '@shopify/flash-list';
import { FlashListRef } from '@shopify/flash-list';
import { ImageItem, SortType, FilterType, ViewMode } from './types/index';
import { useFavorites } from './hooks/useFavorites';
import { useImages } from './hooks/useImages';
import { ImageCard } from './components/ImageCard';
import { ModalViewer } from './components/ModalViewer';
import {
  SearchIcon,
  SettingsIcon,
  HelpIcon,
  CloseIcon,
  GridIcon,
  ListIcon,
  ArrowUpIcon,
  MoonIcon,
  SunIcon,
} from './components/Icons';
import useSettings from './hooks/useSettings';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const IS_WEB = Platform.OS === 'web';

const lightTheme = {
  background: '#ffffff',
  surface: '#f5f5f5',
  text: '#000000',
  textSecondary: 'rgba(0,0,0,0.5)',
  border: 'rgba(0,0,0,0.1)',
  accent: '#3b82f6',
  accentHover: '#2563eb',
  cardBackground: '#ffffff',
  overlay: 'rgba(0,0,0,0.05)',
};

const darkTheme = {
  background: '#121212',
  surface: '#1e1e1e',
  text: '#ffffff',
  textSecondary: 'rgba(255,255,255,0.6)',
  border: 'rgba(255,255,255,0.1)',
  accent: '#60a5fa',
  accentHover: '#3b82f6',
  cardBackground: '#2d2d2d',
  overlay: 'rgba(255,255,255,0.05)',
};

export default function App() {
  const {
    images,
    loading: imagesLoading,
    loadingMore,
    serverStatus,
    checkConnection,
    refresh,
    loadMore,
    hasMore,
  } = useImages();
  const { favorites, toggleFavorite } = useFavorites();
  const { settings, setTheme, setViewMode, setColumns, setSortType, setFilterType } = useSettings();

  const [searchTerm, setSearchTerm] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalIndex, setModalIndex] = useState(0);

  const flatListRef = useRef<FlashListRef<ImageItem>>(null);
  const isDarkMode = settings.theme === 'dark';
  const theme = isDarkMode ? darkTheme : lightTheme;

  const filteredImages = useMemo(() => {
    let filtered = [...images];

    if (searchTerm) {
      filtered = filtered.filter((img) =>
        img.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (settings.filterType !== 'all') {
      filtered = filtered.filter((img) =>
        settings.filterType === 'videos' ? img.isVideo : !img.isVideo
      );
    }

    switch (settings.sortType) {
      case 'name-asc':
        filtered.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'name-desc':
        filtered.sort((a, b) => b.name.localeCompare(a.name));
        break;
      case 'size-asc':
        filtered.sort((a, b) => (a.size || 0) - (b.size || 0));
        break;
      case 'size-desc':
        filtered.sort((a, b) => (b.size || 0) - (a.size || 0));
        break;
    }

    return filtered;
  }, [images, searchTerm, settings.sortType, settings.filterType]);

  const openModal = useCallback((index: number) => {
    setModalIndex(index);
    setModalVisible(true);
  }, []);

  const closeModal = useCallback(() => {
    setModalVisible(false);
  }, []);

  const goNext = useCallback(() => {
    if (modalIndex < images.length - 1) {
      setModalIndex((prev) => prev + 1);
    }
  }, [modalIndex, images.length]);

  const goPrev = useCallback(() => {
    if (modalIndex > 0) {
      setModalIndex((prev) => prev - 1);
    }
  }, [modalIndex]);

  const downloadImage = useCallback(async (uri: string, name: string) => {
    try {
      if (IS_WEB) {
        const link = document.createElement('a');
        link.href = uri;
        link.download = name;
        link.click();
        Alert.alert('Успешно', 'Файл загружен');
      }
    } catch (error) {
      console.error('Download error:', error);
      Alert.alert('Ошибка', 'Не удалось загрузить файл');
    }
  }, []);

  const shareImage = useCallback(async (uri: string, name: string) => {
    try {
      if (IS_WEB && navigator.share) {
        await navigator.share({ title: name, url: uri });
      } else if (IS_WEB) {
        await navigator.clipboard.writeText(uri);
        Alert.alert('Успешно', 'Ссылка скопирована');
      }
    } catch (error) {
      console.error('Share error:', error);
    }
  }, []);

  const resetFilters = useCallback(() => {
    setSearchTerm('');
    setSortType('default');
    setFilterType('all');
  }, []);

  const handleScroll = useCallback((event: { nativeEvent: { contentOffset: { y: number } } }) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    setShowScrollTop(offsetY > 300);
  }, []);

  const scrollToTop = useCallback(() => {
    flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(isDarkMode ? 'light' : 'dark');
  }, [isDarkMode, setTheme]);

  const renderItem = useCallback(
    ({ item, index }: { item: ImageItem; index: number }) => (
      <ImageCard
        image={item}
        index={index}
        viewMode={settings.viewMode}
        isFavorite={favorites.has(item.name)}
        columns={settings.columns}
        onOpen={openModal}
        onToggleFavorite={toggleFavorite}
        onDownload={downloadImage}
        onShare={shareImage}
        theme={theme}
      />
    ),
    [
      settings.viewMode,
      settings.columns,
      favorites,
      openModal,
      toggleFavorite,
      downloadImage,
      shareImage,
      theme,
    ]
  );

  const keyExtractor = useCallback((item: ImageItem, index: number) => `${item.name}-${index}`, []);

  const renderListHeader = useCallback(() => (
    <>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>Umamusume Gallery</Text>
        <View style={styles.headerRight}>
          <View style={[styles.serverBadge, { backgroundColor: theme.surface }]}>
            <View
              style={[
                styles.serverDot,
                { backgroundColor: serverStatus === 'online' ? '#10b981' : '#ef4444' },
              ]}
            />
            <Text style={[styles.serverText, { color: theme.textSecondary }]}>
              {serverStatus === 'online' ? 'Online' : 'Offline'}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.themeBtn, { backgroundColor: theme.surface }]}
            onPress={toggleTheme}
          >
            {isDarkMode ? <SunIcon color={theme.text} size={24} /> : <MoonIcon color={theme.text} size={24} />}
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.controls}>
        <View style={styles.searchContainer}>
          <View style={[styles.searchInputContainer, { backgroundColor: theme.surface }]}>
            <SearchIcon color={theme.textSecondary} size={20} />
            <TextInput
              style={[styles.searchInput, { color: theme.text }]}
              placeholder="Поиск..."
              placeholderTextColor={theme.textSecondary}
              value={searchTerm}
              onChangeText={setSearchTerm}
            />
            {searchTerm.length > 0 && (
              <TouchableOpacity onPress={() => setSearchTerm('')}>
                <CloseIcon color={theme.textSecondary} size={20} />
              </TouchableOpacity>
            )}
          </View>
        </View>
        <TouchableOpacity
          style={[styles.settingsBtn, { backgroundColor: theme.surface }]}
          onPress={() => setShowSettings(!showSettings)}
        >
          <SettingsIcon color={theme.text} size={24} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.helpBtn, { backgroundColor: theme.surface }]}
          onPress={() => setShowHelp(!showHelp)}
        >
          <HelpIcon color={theme.text} size={24} />
        </TouchableOpacity>
      </View>

      {showSettings && (
        <View style={[styles.settingsPanel, { backgroundColor: theme.surface }]}>
          <View style={styles.settingGroup}>
            <Text style={[styles.settingLabel, { color: theme.textSecondary }]}>Сортировка</Text>
            <View style={styles.filterButtons}>
              {[
                { key: 'default', label: 'По умолчанию' },
                { key: 'name-asc', label: 'Имя ↑' },
                { key: 'name-desc', label: 'Имя ↓' },
                { key: 'size-asc', label: 'Размер ↑' },
                { key: 'size-desc', label: 'Размер ↓' },
              ].map((sort) => (
                <TouchableOpacity
                  key={sort.key}
                  style={[
                    styles.filterBtn,
                    { borderColor: theme.border },
                    settings.sortType === sort.key && { backgroundColor: theme.accent, borderColor: theme.accent },
                  ]}
                  onPress={() => setSortType(sort.key as SortType)}
                >
                  <Text
                    style={[
                      styles.filterBtnText,
                      { color: settings.sortType === sort.key ? 'white' : theme.text },
                    ]}
                  >
                    {sort.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.settingGroup}>
            <Text style={[styles.settingLabel, { color: theme.textSecondary }]}>Фильтр</Text>
            <View style={styles.filterButtons}>
              {[
                { key: 'all', label: 'Все' },
                { key: 'images', label: 'Изображения' },
                { key: 'videos', label: 'Видео' },
              ].map((filter) => (
                <TouchableOpacity
                  key={filter.key}
                  style={[
                    styles.filterBtn,
                    { borderColor: theme.border },
                    settings.filterType === filter.key && { backgroundColor: theme.accent, borderColor: theme.accent },
                  ]}
                  onPress={() => setFilterType(filter.key as FilterType)}
                >
                  <Text
                    style={[
                      styles.filterBtnText,
                      { color: settings.filterType === filter.key ? 'white' : theme.text },
                    ]}
                  >
                    {filter.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.settingGroup}>
            <Text style={[styles.settingLabel, { color: theme.textSecondary }]}>Вид</Text>
            <View style={styles.filterButtons}>
              <TouchableOpacity
                style={[
                  styles.filterBtn,
                  { borderColor: theme.border },
                  settings.viewMode === 'grid' && { backgroundColor: theme.accent, borderColor: theme.accent },
                ]}
                onPress={() => setViewMode('grid')}
              >
                <GridIcon color={settings.viewMode === 'grid' ? 'white' : theme.text} size={18} />
                <Text
                  style={[
                    styles.filterBtnText,
                    { color: settings.viewMode === 'grid' ? 'white' : theme.text, marginLeft: 8 },
                  ]}
                >
                  Сетка
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.filterBtn,
                  { borderColor: theme.border },
                  settings.viewMode === 'list' && { backgroundColor: theme.accent, borderColor: theme.accent },
                ]}
                onPress={() => setViewMode('list')}
              >
                <ListIcon color={settings.viewMode === 'list' ? 'white' : theme.text} size={18} />
                <Text
                  style={[
                    styles.filterBtnText,
                    { color: settings.viewMode === 'list' ? 'white' : theme.text, marginLeft: 8 },
                  ]}
                >
                  Список
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {settings.viewMode === 'grid' && (
            <View style={styles.settingGroup}>
              <Text style={[styles.settingLabel, { color: theme.textSecondary }]}>Колонок</Text>
              <View style={styles.sliderContainer}>
                <View style={styles.sliderTrack}>
                  {[2, 3, 4, 5, 6].map((num) => (
                    <TouchableOpacity
                      key={num}
                      style={[
                        styles.sliderDot,
                        { borderColor: theme.border },
                        settings.columns === num && { backgroundColor: theme.accent, borderColor: theme.accent },
                      ]}
                      onPress={() => setColumns(num)}
                    >
                      <Text
                        style={[
                          styles.sliderDotText,
                          { color: settings.columns === num ? 'white' : theme.text },
                        ]}
                      >
                        {num}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
          )}
        </View>
      )}

      {showHelp && (
        <View style={[styles.helpPanel, { backgroundColor: theme.surface }]}>
          <View style={[styles.helpHeader, { borderBottomColor: theme.border }]}>
            <Text style={[styles.helpTitle, { color: theme.text }]}>Справка</Text>
            <TouchableOpacity onPress={() => setShowHelp(false)}>
              <CloseIcon color={theme.text} size={24} />
            </TouchableOpacity>
          </View>
          <View style={styles.helpSection}>
            <Text style={[styles.helpSectionTitle, { color: theme.textSecondary }]}>Управление</Text>
            <View style={styles.helpItem}>
              <Text style={[styles.helpDesc, { color: theme.text }]}>
                • Нажмите на изображение для полного просмотра{'\n'}
                • Свайп влево/вправо для навигации{'\n'}
                • Нажмите на сердечко чтобы добавить в избранное{'\n'}
                • Используйте поиск для фильтрации по имени
              </Text>
            </View>
          </View>
          <View style={styles.helpSection}>
            <Text style={[styles.helpSectionTitle, { color: theme.textSecondary }]}>Оптимизация</Text>
            <View style={styles.helpItem}>
              <Text style={[styles.helpDesc, { color: theme.text }]}>
                • Изображения загружаются постепенно{'\n'}
                • Используются thumbnails для быстрой загрузки{'\n'}
                • Плавный скролл с FlashList
              </Text>
            </View>
          </View>
        </View>
      )}

      <View style={styles.stats}>
        <Text style={[styles.statsText, { color: theme.textSecondary }]}>
          Показано {filteredImages.length} из {images.length} • {favorites.size} в избранном
        </Text>
      </View>
    </>
  ), [
    theme,
    serverStatus,
    isDarkMode,
    searchTerm,
    showSettings,
    showHelp,
    settings,
    filteredImages.length,
    images.length,
    favorites.size,
    toggleTheme,
  ]);

  const renderListFooter = useCallback(() => {
    if (loadingMore) {
      return (
        <View style={styles.footerLoader}>
          <ActivityIndicator size="large" color={theme.accent} />
        </View>
      );
    }
    return null;
  }, [loadingMore, theme]);

  const renderEmptyComponent = useCallback(() => (
    <View style={styles.emptyState}>
      <SearchIcon color={theme.textSecondary} size={64} />
      <Text style={[styles.emptyTitle, { color: theme.text }]}>Ничего не найдено</Text>
      <Text style={[styles.emptyDesc, { color: theme.textSecondary }]}>
        Попробуйте изменить фильтры
      </Text>
      <TouchableOpacity
        style={[styles.resetBtn, { backgroundColor: theme.accent }]}
        onPress={resetFilters}
      >
        <Text style={styles.resetBtnText}>Сбросить фильтры</Text>
      </TouchableOpacity>
    </View>
  ), [theme, resetFilters]);

  if (serverStatus === 'checking') {
    return (
      <SafeAreaView style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.accent} />
        <Text style={[styles.statusText, { color: theme.text, marginTop: 20 }]}>
          Подключение к серверу...
        </Text>
      </SafeAreaView>
    );
  }

  if (serverStatus === 'offline') {
    return (
      <SafeAreaView style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <SearchIcon color={theme.text} size={64} />
        <Text style={[styles.statusText, { color: theme.text, marginTop: 20 }]}>
          Сервер недоступен
        </Text>
        <Text style={[styles.statusSubtext, { color: theme.textSecondary, marginTop: 10 }]}>
          Запустите сервер командой:
        </Text>
        <Text style={[styles.statusCode, { color: theme.accent, marginTop: 10 }]}>
          python server.py
        </Text>
        <TouchableOpacity
          style={[styles.retryBtn, { backgroundColor: theme.accent, marginTop: 30 }]}
          onPress={checkConnection}
        >
          <Text style={styles.retryBtnText}>Повторить</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  if (imagesLoading && images.length === 0) {
    return (
      <SafeAreaView style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.accent} />
        <Text style={[styles.statusText, { color: theme.text, marginTop: 20 }]}>
          Загрузка изображений...
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <StatusBar style={isDarkMode ? 'light' : 'dark'} />

        <FlashList
          ref={flatListRef}
          data={filteredImages}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          ListHeaderComponent={renderListHeader}
          ListFooterComponent={renderListFooter}
          ListEmptyComponent={renderEmptyComponent}
          numColumns={settings.viewMode === 'grid' ? settings.columns : 1}
          contentContainerStyle={styles.flatListContent}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          refreshing={imagesLoading}
          onRefresh={refresh}
        />

        {showScrollTop && filteredImages.length > 0 && (
          <TouchableOpacity
            style={[styles.scrollTop, { backgroundColor: theme.accent }]}
            onPress={scrollToTop}
          >
            <ArrowUpIcon color="white" size={24} />
          </TouchableOpacity>
        )}

        <ModalViewer
          visible={modalVisible}
          images={images}
          currentIndex={modalIndex}
          favorites={favorites}
          onClose={closeModal}
          onNext={goNext}
          onPrev={goPrev}
          onToggleFavorite={toggleFavorite}
          onDownload={downloadImage}
          onShare={shareImage}
          onLoadMore={loadMore}
          theme={theme}
        />
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  statusText: { fontSize: 18, fontWeight: '600' },
  statusSubtext: { fontSize: 14 },
  statusCode: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'monospace',
    padding: 12,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 8,
  },
  retryBtn: { paddingHorizontal: 28, paddingVertical: 14, borderRadius: 10 },
  retryBtnText: { color: 'white', fontSize: 16, fontWeight: '600' },
  flatListContent: { paddingBottom: 20 },
  header: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerRight: { flexDirection: 'row', alignItems: 'center' },
  serverBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginRight: 8,
  },
  serverDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  serverText: { fontSize: 12, fontWeight: '500' },
  title: { fontSize: 24, fontWeight: '700', letterSpacing: -0.5 },
  themeBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  searchContainer: { flex: 1 },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
  },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 15 },
  settingsBtn: {
    width: 44,
    height: 44,
    marginLeft: 8,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  helpBtn: {
    width: 44,
    height: 44,
    marginLeft: 8,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingsPanel: {
    marginHorizontal: 16,
    marginBottom: 20,
    padding: 20,
    borderRadius: 16,
  },
  settingGroup: { marginBottom: 20 },
  settingLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  filterButtons: { flexDirection: 'row', flexWrap: 'wrap' },
  filterBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderRadius: 8,
    marginRight: 8,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterBtnText: { fontSize: 14, fontWeight: '500' },
  sliderContainer: { paddingVertical: 10 },
  sliderTrack: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  sliderDot: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sliderDotText: { fontSize: 14, fontWeight: '600' },
  helpPanel: {
    marginHorizontal: 16,
    marginBottom: 20,
    padding: 20,
    borderRadius: 16,
  },
  helpHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  helpTitle: { fontSize: 18, fontWeight: '700' },
  helpSection: { marginBottom: 16 },
  helpSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  helpItem: { paddingVertical: 4 },
  helpDesc: { fontSize: 14 },
  stats: { paddingHorizontal: 16, marginBottom: 16 },
  statsText: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  footerLoader: { padding: 20, alignItems: 'center' },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyTitle: { fontSize: 20, fontWeight: '600', marginBottom: 8 },
  emptyDesc: { fontSize: 15, marginBottom: 24 },
  resetBtn: { paddingHorizontal: 28, paddingVertical: 14, borderRadius: 10 },
  resetBtnText: { color: 'white', fontSize: 15, fontWeight: '600' },
  scrollTop: {
    position: 'absolute',
    bottom: 30,
    right: 30,
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
});