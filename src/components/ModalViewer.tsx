import React, { memo, useState, useCallback, useEffect } from 'react';
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
} from 'react-native';
import { Image } from 'expo-image';
import {
  Gesture,
  GestureDetector,
} from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  clamp,
  cancelAnimation,
} from 'react-native-reanimated';
import { ImageItem } from '../types/index';
import {
  CloseIcon,
  DownloadIcon,
  ShareIcon,
  HeartIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from './Icons';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const MIN_SCALE = 1;
const MAX_SCALE = 4;
const DOUBLE_TAP_SCALE = 2.5;
const IMAGE_HEIGHT = SCREEN_HEIGHT * 0.7;
const ANIMATION_CONFIG = { duration: 150 };

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
  const currentImage = images[currentIndex];
  
  const scale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const startScale = useSharedValue(1);
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);

  const toggleUI = useCallback(() => {
    setUiVisible(prev => !prev);
  }, []);

  const getBounds = useCallback(() => {
    'worklet';
    const scaledWidth = SCREEN_WIDTH * scale.value;
    const scaledHeight = IMAGE_HEIGHT * scale.value;
    const maxX = Math.max(0, (scaledWidth - SCREEN_WIDTH) / 2);
    const maxY = Math.max(0, (scaledHeight - IMAGE_HEIGHT) / 2);
    return { maxX, maxY };
  }, []);

  const applyBounds = useCallback(() => {
    'worklet';
    const { maxX, maxY } = getBounds();
    translateX.value = clamp(translateX.value, -maxX, maxX);
    translateY.value = clamp(translateY.value, -maxY, maxY);
  }, []);

  useEffect(() => {
    if (visible) {
      setLoading(true);
      setUiVisible(true);
      cancelAnimation(scale);
      cancelAnimation(translateX);
      cancelAnimation(translateY);
      scale.value = MIN_SCALE;
      translateX.value = 0;
      translateY.value = 0;
      startScale.value = MIN_SCALE;
      startX.value = 0;
      startY.value = 0;
    }
  }, [currentIndex, visible]);

  useEffect(() => {
    if (images.length - currentIndex <= 50) {
      onLoadMore();
    }
  }, [currentIndex, images.length, onLoadMore]);

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

  const pinchGesture = Gesture.Pinch()
    .onBegin(() => {
      cancelAnimation(scale);
      cancelAnimation(translateX);
      cancelAnimation(translateY);
      startScale.value = scale.value;
      startX.value = translateX.value;
      startY.value = translateY.value;
    })
    .onUpdate((event) => {
      scale.value = clamp(startScale.value * event.scale, MIN_SCALE, MAX_SCALE);
      
      const focusX = event.focalX - SCREEN_WIDTH / 2;
      const focusY = event.focalY - IMAGE_HEIGHT / 2;
      
      translateX.value = startX.value + focusX * (scale.value - startScale.value);
      translateY.value = startY.value + focusY * (scale.value - startScale.value);
      
      applyBounds();
    })
    .onEnd(() => {
      if (scale.value <= MIN_SCALE) {
        scale.value = withTiming(MIN_SCALE, ANIMATION_CONFIG);
        translateX.value = withTiming(0, ANIMATION_CONFIG);
        translateY.value = withTiming(0, ANIMATION_CONFIG);
      } else {
        const { maxX, maxY } = getBounds();
        translateX.value = withTiming(clamp(translateX.value, -maxX, maxX), ANIMATION_CONFIG);
        translateY.value = withTiming(clamp(translateY.value, -maxY, maxY), ANIMATION_CONFIG);
      }
    });

  const panGesture = Gesture.Pan()
    .maxPointers(1)
    .minDistance(0)
    .onBegin(() => {
      cancelAnimation(translateX);
      cancelAnimation(translateY);
      startX.value = translateX.value;
      startY.value = translateY.value;
    })
    .onUpdate((event) => {
      if (scale.value > MIN_SCALE) {
        const { maxX, maxY } = getBounds();
        translateX.value = clamp(startX.value + event.translationX, -maxX, maxX);
        translateY.value = clamp(startY.value + event.translationY, -maxY, maxY);
      } else {
        if (Math.abs(event.translationY) < Math.abs(event.translationX)) {
          translateX.value = startX.value + event.translationX * 0.3;
        }
      }
    })
    .onEnd((event) => {
      if (scale.value > MIN_SCALE) {
        const { maxX, maxY } = getBounds();
        translateX.value = withTiming(clamp(translateX.value, -maxX, maxY), ANIMATION_CONFIG);
        translateY.value = withTiming(clamp(translateY.value, -maxY, maxY), ANIMATION_CONFIG);
      } else {
        if (Math.abs(event.translationX) > 100 || Math.abs(event.velocityX) > 500) {
          if (event.translationX > 0 && currentIndex > 0) {
            runOnJS(onPrev)();
          } else if (event.translationX < 0 && currentIndex < images.length - 1) {
            runOnJS(onNext)();
          }
        }
        translateX.value = withTiming(0, ANIMATION_CONFIG);
      }
    });

  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .maxDuration(250)
    .onEnd((event) => {
      cancelAnimation(scale);
      cancelAnimation(translateX);
      cancelAnimation(translateY);
      
      if (scale.value > MIN_SCALE) {
        scale.value = withTiming(MIN_SCALE, ANIMATION_CONFIG);
        translateX.value = withTiming(0, ANIMATION_CONFIG);
        translateY.value = withTiming(0, ANIMATION_CONFIG);
      } else {
        const tapX = event.x - SCREEN_WIDTH / 2;
        const tapY = event.y - IMAGE_HEIGHT / 2;
        
        scale.value = withTiming(DOUBLE_TAP_SCALE, ANIMATION_CONFIG);
        translateX.value = withTiming(-tapX * (DOUBLE_TAP_SCALE - 1), ANIMATION_CONFIG);
        translateY.value = withTiming(-tapY * (DOUBLE_TAP_SCALE - 1), ANIMATION_CONFIG);
      }
    });

  const singleTapGesture = Gesture.Tap()
    .numberOfTaps(1)
    .maxDuration(250)
    .onEnd((event) => {
      if (scale.value <= MIN_SCALE) {
        const tapX = event.x;
        const leftZone = SCREEN_WIDTH * 0.3;
        const rightZone = SCREEN_WIDTH * 0.7;
        
        if (tapX < leftZone && currentIndex > 0) {
          runOnJS(onPrev)();
        } else if (tapX > rightZone && currentIndex < images.length - 1) {
          runOnJS(onNext)();
        } else {
          runOnJS(toggleUI)();
        }
      } else {
        runOnJS(toggleUI)();
      }
    });

  const composedGesture = Gesture.Race(
    doubleTapGesture,
    Gesture.Simultaneous(pinchGesture, panGesture),
    singleTapGesture
  );

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  const handleThumbnailPress = useCallback((idx: number) => {
    const diff = idx - currentIndex;
    if (diff > 0) {
      for (let i = 0; i < diff; i++) {
        onNext();
      }
    } else if (diff < 0) {
      for (let i = 0; i < Math.abs(diff); i++) {
        onPrev();
      }
    }
  }, [currentIndex, onNext, onPrev]);

  const resetZoom = useCallback(() => {
    cancelAnimation(scale);
    cancelAnimation(translateX);
    cancelAnimation(translateY);
    scale.value = withTiming(MIN_SCALE, ANIMATION_CONFIG);
    translateX.value = withTiming(0, ANIMATION_CONFIG);
    translateY.value = withTiming(0, ANIMATION_CONFIG);
  }, []);

  if (!visible || !currentImage) return null;

  const isZoomed = scale.value > MIN_SCALE;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={[styles.backdrop, { backgroundColor: theme.background }]}>
        <SafeAreaView style={styles.container}>
          {uiVisible && (
            <View
              style={[
                styles.header,
                {
                  backgroundColor: theme.surface,
                  borderBottomColor: theme.border,
                },
              ]}
            >
              <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
                <CloseIcon color={theme.text} />
              </TouchableOpacity>
              <Text style={[styles.counter, { color: theme.text }]}>
                {currentIndex + 1} / {images.length}
              </Text>
              <View style={styles.headerRight}>
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
                {isZoomed && (
                  <TouchableOpacity style={styles.actionBtn} onPress={resetZoom}>
                    <Text style={{ color: theme.text, fontSize: 16, fontWeight: '600' }}>1:1</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}

          <View style={styles.imageContainer}>
            {loading && (
              <ActivityIndicator 
                size="large" 
                color={theme.accent} 
                style={styles.loader}
              />
            )}
            <GestureDetector gesture={composedGesture}>
              <Animated.View style={[styles.imageWrapper, animatedStyle]}>
                <Image
                  source={{ uri: currentImage.uri }}
                  style={styles.image}
                  contentFit="contain"
                  onLoadStart={() => setLoading(true)}
                  onLoad={() => setLoading(false)}
                  transition={200}
                  cachePolicy="memory-disk"
                />
              </Animated.View>
            </GestureDetector>
          </View>

          {uiVisible && !isZoomed && (
            <>
              {currentIndex > 0 && (
                <TouchableOpacity
                  style={[styles.navBtn, styles.navPrev, { backgroundColor: theme.surface }]}
                  onPress={onPrev}
                >
                  <ChevronLeftIcon color={theme.text} />
                </TouchableOpacity>
              )}
              {currentIndex < images.length - 1 && (
                <TouchableOpacity
                  style={[styles.navBtn, styles.navNext, { backgroundColor: theme.surface }]}
                  onPress={onNext}
                >
                  <ChevronRightIcon color={theme.text} />
                </TouchableOpacity>
              )}
            </>
          )}

          {uiVisible && !isZoomed && (
            <View
              style={[
                styles.thumbnailContainer,
                {
                  backgroundColor: theme.surface,
                  borderTopColor: theme.border,
                },
              ]}
            >
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.thumbnailScroll}
              >
                {images.slice(Math.max(0, currentIndex - 10), currentIndex + 10).map((img, idx) => {
                  const actualIndex = Math.max(0, currentIndex - 10) + idx;
                  return (
                    <TouchableOpacity
                      key={`${img.name}-${actualIndex}`}
                      style={[
                        styles.thumbnail,
                        actualIndex === currentIndex && styles.thumbnailActive,
                        { borderColor: actualIndex === currentIndex ? theme.accent : 'transparent' },
                      ]}
                      onPress={() => handleThumbnailPress(actualIndex)}
                    >
                      <Image
                        source={{ uri: img.thumb || img.uri }}
                        style={styles.thumbnailImage}
                        contentFit="cover"
                        cachePolicy="memory-disk"
                      />
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}
        </SafeAreaView>
      </View>
    </Modal>
  );
});

ModalViewer.displayName = 'ModalViewer';

const styles = StyleSheet.create({
  backdrop: { 
    flex: 1,
  },
  container: { 
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    zIndex: 10,
  },
  closeBtn: { 
    padding: 8,
  },
  counter: { 
    fontSize: 16, 
    fontWeight: '600',
  },
  headerRight: { 
    flexDirection: 'row', 
    alignItems: 'center',
  },
  favoriteBtn: { 
    padding: 8, 
    marginRight: 8,
  },
  actionBtn: { 
    padding: 8, 
    marginLeft: 8,
  },
  imageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageWrapper: {
    width: SCREEN_WIDTH,
    height: IMAGE_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  loader: {
    position: 'absolute',
    zIndex: 1,
  },
  navBtn: {
    position: 'absolute',
    top: '50%',
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: -24,
    zIndex: 5,
    ...Platform.select({
      web: { 
        boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
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
  navPrev: { 
    left: 16,
  },
  navNext: { 
    right: 16,
  },
  thumbnailContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingVertical: 12,
    borderTopWidth: 1,
    zIndex: 10,
  },
  thumbnailScroll: { 
    paddingHorizontal: 16,
  },
  thumbnail: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 8,
    borderWidth: 2,
    overflow: 'hidden',
  },
  thumbnailActive: { 
    borderWidth: 2,
  },
  thumbnailImage: { 
    width: '100%', 
    height: '100%',
  },
});