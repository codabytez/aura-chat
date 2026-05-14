import * as ImageManipulator from 'expo-image-manipulator';
import { getThumbnailAsync } from 'expo-video-thumbnails';

const MAX_IMAGE_DIMENSION = 1280;
const IMAGE_QUALITY = 0.75;

export async function compressImage(
  uri: string,
): Promise<{ uri: string; width: number; height: number }> {
  const result = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: MAX_IMAGE_DIMENSION } }],
    { compress: IMAGE_QUALITY, format: ImageManipulator.SaveFormat.JPEG },
  );
  return result;
}

export async function generateVideoThumbnail(uri: string): Promise<string> {
  const { uri: thumbUri } = await getThumbnailAsync(uri, { time: 1000 });
  return thumbUri;
}
