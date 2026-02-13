import * as VideoThumbnails from 'expo-video-thumbnails';

export const generateVideoThumbnail = async (uri: string): Promise<string | null> => {
  try {
    const { uri: thumbnailUri } = await VideoThumbnails.getThumbnailAsync(uri, {
      time: 1000,
      quality: 0.6,
    });
    return thumbnailUri;
  } catch (e) {
    console.log('Error generating thumbnail:', e);
    return null;
  }
};