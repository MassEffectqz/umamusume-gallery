import React, { memo, useState, useCallback, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  Platform,
  StatusBar,
  ViewStyle,
  TextStyle,
  ImageStyle,
} from 'react-native';
import { Image } from 'expo-image';
import ImageViewer from 'react-native-image-zoom-viewer';
import { ImageItem } from '../types/index';
import {
  CloseIcon,
  DownloadIcon,
  ShareIcon,
  HeartIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  FullscreenIcon,
  InfoIcon,
} from './Icons';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface ModalViewerProps {
  visible: boolean;
  images: ImageItem[];
  currentIndex: number;
  favorites: Set<string>;
  onClose: () => void;
  onNext: () => void;
  onPrev: () => void;
  onToggleFavorite: (name: string) => void;
  onDownload: (uri: string, name: string) => void;
  onShare: (uri: string, name: string) => void;
  onLoadMore: () => void;
  theme: any;
}

export const ModalViewer = memo<ModalViewerProps>(({
  visible,
  images,
  currentIndex,
  favorites,
  onClose,
  onNext,
  onPrev,
  onToggleFavorite,
  onDownload,
  onShare,
  onLoadMore,
  theme,
}) => {
  const [loading, setLoading] = useState(true);
  const [uiVisible, setUiVisible] = useState(true);
  const [showInfo, setShowInfo] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(currentIndex);
  const currentImage = images[currentImageIndex];

  useEffect(() => {
    setCurrentImageIndex(currentIndex);
  }, [currentIndex]);

  useEffect(() => {
    if (visible) {
      setUiVisible(true);
      setShowInfo(false);
    }
  }, [currentImageIndex, visible]);

  useEffect(() => {
    if (images.length - currentImageIndex <= 50) {
      onLoadMore();
    }
  }, [currentImageIndex, images.length, onLoadMore]);

  const handleDownload = useCallback(() => {
    if (currentImage) {
      onDownload(currentImage.uri, currentImage.name);
    }
  }, [currentImage, onDownload]);

  const handleShare = useCallback(() => {
    if (currentImage) {
      onShare(currentImage.uri, currentImage.name);
    }
  }, [currentImage, onShare]);

  const handleToggleFavorite = useCallback(() => {
    if (currentImage) {
      onToggleFavorite(currentImage.name);
    }
  }, [currentImage, onToggleFavorite]);

  const handleThumbnailPress = useCallback((idx: number) => {
    setCurrentImageIndex(idx);
    if (idx > currentImageIndex) {
      onNext();
    } else if (idx < currentImageIndex) {
      onPrev();
    }
  }, [currentImageIndex, onNext, onPrev]);

  const handleToggleFullscreen = useCallback(() => {
    setIsFullscreen(prev => !prev);
    if (Platform.OS !== 'web') {
      StatusBar.setHidden(!isFullscreen, 'fade');
    }
  }, [isFullscreen]);

  const handleToggleInfo = useCallback(() => {
    setShowInfo(prev => !prev);
  }, []);

  const handleSwipeDown = useCallback(() => {
    onClose();
  }, [onClose]);

  const handleClick = useCallback(() => {
    setUiVisible(prev => !prev);
  }, []);

  const handleChangeIndex = useCallback((index?: number) => {
    if (index !== undefined) {
      setCurrentImageIndex(index);
      if (index > currentImageIndex) {
        onNext();
      } else if (index < currentImageIndex) {
        onPrev();
      }
    }
  }, [currentImageIndex, onNext, onPrev]);

  if (!visible || !currentImage) return null;

  const fileSize = currentImage.size 
    ? (currentImage.size / 1024 / 1024).toFixed(2) + ' MB'
    : 'Unknown';

  const imageUrls = images.map(img => ({
    url: img.uri,
    props: {
      name: img.name,
      size: img.size,
      thumb: img.thumb,
    }
  }));

  const renderHeader = () => (
    <View
      style={[
        styles.header,
        {
          backgroundColor: theme.surface + 'CC',
          borderBottomColor: theme.border,
          opacity: uiVisible ? 1 : 0,
        } as ViewStyle,
        Platform.OS === 'web' && webStyles.headerWeb,
      ]}
    >
      <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
        <CloseIcon color={theme.text} />
      </TouchableOpacity>
      <Text style={[styles.counter, { color: theme.text }]}>
        {currentImageIndex + 1} / {images.length}
      </Text>
      <View style={styles.headerRight}>
        <TouchableOpacity style={styles.actionBtn} onPress={handleToggleInfo}>
          <InfoIcon color={theme.text} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={handleToggleFullscreen}>
          <FullscreenIcon color={theme.text} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.favoriteBtn} onPress={handleToggleFavorite}>
          <HeartIcon
            filled={favorites.has(currentImage.name)}
            color={favorites.has(currentImage.name) ? '#ef4444' : theme.text}
          />
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={handleDownload}>
          <DownloadIcon color={theme.text} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={handleShare}>
          <ShareIcon color={theme.text} />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderIndicator = (currentIndex?: number, allSize?: number) => {
    return <View />;
  };

  const renderInfo = () => (
    <View
      style={[
        styles.infoPanel,
        {
          backgroundColor: theme.surface + 'CC',
          borderColor: theme.border,
          opacity: showInfo ? 1 : 0,
        } as ViewStyle,
        Platform.OS === 'web' && webStyles.infoPanelWeb,
      ]}
    >
      <Text style={[styles.infoText, { color: theme.text }]}>
        Name: {currentImage.name}
      </Text>
      <Text style={[styles.infoText, { color: theme.text }]}>
        Size: {fileSize}
      </Text>
      <TouchableOpacity
        style={[styles.closeInfoBtn, { backgroundColor: theme.accent }]}
        onPress={() => setShowInfo(false)}
      >
        <Text style={{ color: '#fff' }}>Close</Text>
      </TouchableOpacity>
    </View>
  );

  const renderThumbnails = () => (
    <View
      style={[
        styles.thumbnailContainer,
        {
          backgroundColor: theme.surface + 'CC',
          borderTopColor: theme.border,
          opacity: uiVisible ? 1 : 0,
        } as ViewStyle,
        Platform.OS === 'web' && webStyles.thumbnailContainerWeb,
      ]}
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.thumbnailScroll}
      >
        {images.slice(Math.max(0, currentImageIndex - 10), currentImageIndex + 10).map((img, idx) => {
          const actualIndex = Math.max(0, currentImageIndex - 10) + idx;
          return (
            <TouchableOpacity
              key={`${img.name}-${actualIndex}`}
              style={[
                styles.thumbnail,
                actualIndex === currentImageIndex && styles.thumbnailActive,
                { borderColor: actualIndex === currentImageIndex ? theme.accent : 'transparent' },
              ]}
              onPress={() => handleThumbnailPress(actualIndex)}
            >
              <Image
                source={{ uri: img.thumb || img.uri }}
                style={styles.thumbnailImage as any}
                contentFit="cover"
                cachePolicy="memory-disk"
              />
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={[styles.backdrop, { backgroundColor: theme.background }]}>
        <ImageViewer
          imageUrls={imageUrls}
          index={currentImageIndex}
          onChange={handleChangeIndex}
          onClick={handleClick}
          onSwipeDown={handleSwipeDown}
          enableSwipeDown={true}
          swipeDownThreshold={100}
          loadingRender={() => (
            <ActivityIndicator size="large" color={theme.accent} />
          )}
          renderHeader={renderHeader}
          renderIndicator={renderIndicator}
          backgroundColor={theme.background}
          saveToLocalByLongPress={false}
          enablePreload={true}
          enableImageZoom={true}
          useNativeDriver={true}
        />
        {renderInfo()}
        {renderThumbnails()}
      </View>
    </Modal>
  );
});

ModalViewer.displayName = 'ModalViewer';

const styles = StyleSheet.create({
  backdrop: { 
    flex: 1,
  } as ViewStyle,
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    zIndex: 10,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  } as ViewStyle,
  closeBtn: { 
    padding: 8,
  } as ViewStyle,
  counter: { 
    fontSize: 16, 
    fontWeight: '600',
  } as TextStyle,
  headerRight: { 
    flexDirection: 'row', 
    alignItems: 'center',
  } as ViewStyle,
  favoriteBtn: { 
    padding: 8, 
    marginRight: 8,
  } as ViewStyle,
  actionBtn: { 
    padding: 8, 
    marginLeft: 8,
  } as ViewStyle,
  thumbnailContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingVertical: 12,
    borderTopWidth: 1,
    zIndex: 10,
  } as ViewStyle,
  thumbnailScroll: { 
    paddingHorizontal: 16,
  } as ViewStyle,
  thumbnail: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 8,
    borderWidth: 2,
    overflow: 'hidden',
  } as ViewStyle,
  thumbnailActive: { 
    borderWidth: 2,
  } as ViewStyle,
  thumbnailImage: { 
    width: '100%', 
    height: '100%',
  } as ImageStyle,
  infoPanel: {
    position: 'absolute',
    top: 80,
    left: 16,
    right: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    zIndex: 20,
  } as ViewStyle,
  infoText: {
    fontSize: 14,
    marginBottom: 8,
  } as TextStyle,
  closeInfoBtn: {
    padding: 8,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  } as ViewStyle,
});

const webStyles = StyleSheet.create({
  headerWeb: {
    backdropFilter: 'blur(10px)',
  } as ViewStyle,
  thumbnailContainerWeb: {
    backdropFilter: 'blur(10px)',
  } as ViewStyle,
  infoPanelWeb: {
    backdropFilter: 'blur(10px)',
  } as ViewStyle,
});