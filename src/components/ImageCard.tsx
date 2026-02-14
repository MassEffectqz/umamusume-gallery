import React, { memo, useCallback, useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  Platform,
  GestureResponderEvent,
} from 'react-native';
import { Image } from 'expo-image';
import { ImageCardProps } from '../types/index';
import {
  PlayIcon,
  HeartIcon,
  DownloadIcon,
  ShareIcon,
  SearchIcon,
} from './Icons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const ImageCard = memo<ImageCardProps & { theme: any }>(
  ({
    image,
    index,
    viewMode,
    isFavorite,
    videoThumbnail,
    columns = 4,
    onOpen,
    onToggleFavorite,
    onDownload,
    onShare,
    theme,
  }) => {
    const [imageLoading, setImageLoading] = useState(true);
    const [imageError, setImageError] = useState(false);

    const handlePress = useCallback(() => onOpen(index), [index, onOpen]);

    const handleFavoritePress = useCallback(
      (e: GestureResponderEvent) => {
        e.stopPropagation();
        onToggleFavorite(image.name);
      },
      [image.name, onToggleFavorite],
    );

    const handleDownloadPress = useCallback(
      (e: GestureResponderEvent) => {
        e.stopPropagation();
        onDownload(image.uri, image.name);
      },
      [image.uri, image.name, onDownload],
    );

    const handleSharePress = useCallback(
      (e: GestureResponderEvent) => {
        e.stopPropagation();
        onShare(image.uri, image.name);
      },
      [image.uri, image.name, onShare],
    );

    const cardWidth = useMemo(() => {
      if (viewMode !== 'grid') return SCREEN_WIDTH - 32;
      const padding = 32;
      const gap = 8 * (columns - 1);
      return (SCREEN_WIDTH - padding - gap) / columns;
    }, [viewMode, columns]);

    const cardHeight = viewMode === 'grid' ? cardWidth * 1.33 : 100;

    return (
      <TouchableOpacity
        style={[
          styles.card,
          viewMode === 'list' && styles.cardList,
          { width: cardWidth, backgroundColor: theme.cardBackground },
        ]}
        activeOpacity={0.88}
        onPress={handlePress}
      >
        <View style={[styles.imageContainer, { height: cardHeight }]}>
          {imageLoading && (
            <View style={[styles.loadingOverlay, { backgroundColor: theme.overlay }]}>
              <ActivityIndicator size="small" color={theme.accent} />
            </View>
          )}

          {imageError ? (
            <View style={[styles.placeholder, { backgroundColor: theme.surface }]}>
              <SearchIcon color={theme.textSecondary} size={32} />
              <Text style={[styles.errorText, { color: theme.textSecondary }]}>
                Не удалось загрузить
              </Text>
            </View>
          ) : (
            <Image
              source={{ uri: image.thumb || videoThumbnail || image.uri }}
              style={styles.image}
              contentFit="cover"
              transition={250}
              cachePolicy="memory-disk"
              priority="low"
              recyclingKey={image.name}
              onLoadStart={() => setImageLoading(true)}
              onLoad={() => setImageLoading(false)}
              onError={() => {
                setImageLoading(false);
                setImageError(true);
              }}
            />
          )}

          {image.isVideo && (
            <View style={[styles.videoBadge, { backgroundColor: 'rgba(0,0,0,0.65)' }]}>
              <PlayIcon color="white" size={20} />
            </View>
          )}

          <TouchableOpacity
            style={[
              styles.favoriteBtn,
              {
                backgroundColor: isFavorite ? theme.accent : 'rgba(255,255,255,0.92)',
              },
            ]}
            onPress={handleFavoritePress}
          >
            <HeartIcon filled={isFavorite} color={isFavorite ? 'white' : theme.text} size={22} />
          </TouchableOpacity>

          {viewMode === 'list' && (
            <View style={styles.cardInfo}>
              <Text style={[styles.cardName, { color: theme.text }]} numberOfLines={1}>
                {image.name}
              </Text>
              {image.size && (
                <Text style={[styles.cardSize, { color: theme.textSecondary }]}>
                  {(image.size / 1024 / 1024).toFixed(1)} MB
                </Text>
              )}
            </View>
          )}

          <View style={styles.overlay}>
            <TouchableOpacity style={styles.overlayBtn} onPress={handleDownloadPress}>
              <DownloadIcon color="white" size={22} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.overlayBtn} onPress={handleSharePress}>
              <ShareIcon color="white" size={22} />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  },
  (prev, next) => {
    return (
      prev.image.name === next.image.name &&
      prev.image.thumb === next.image.thumb &&
      prev.image.uri === next.image.uri &&
      prev.videoThumbnail === next.videoThumbnail &&
      prev.isFavorite === next.isFavorite &&
      prev.viewMode === next.viewMode &&
      prev.columns === next.columns &&
      prev.theme === next.theme &&
      prev.onOpen === next.onOpen &&
      prev.onToggleFavorite === next.onToggleFavorite &&
      prev.onDownload === next.onDownload &&
      prev.onShare === next.onShare
    );
  },
);

ImageCard.displayName = 'ImageCard';

const styles = StyleSheet.create({
  card: {
    margin: 4,
    borderRadius: 12,
    overflow: 'hidden',
    ...Platform.select({
      web: {
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
      },
    }),
  },
  cardList: {
    height: 100,
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  placeholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 12,
    marginTop: 8,
  },
  videoBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  favoriteBtn: {
    position: 'absolute',
    top: 12,
    left: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  overlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 12,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  overlayBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  cardInfo: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: 12,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  cardName: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },
  cardSize: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
  },
});