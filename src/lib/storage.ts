const CLOUD_NAME = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

const RESOURCE_TYPE: Record<string, string> = {
  images: 'image',
  thumbnails: 'image',
  videos: 'video',
  audio: 'video', // Cloudinary uses "video" resource type for audio too
};

const MIME: Record<string, string> = {
  jpg: 'image/jpeg',
  mp4: 'video/mp4',
  m4a: 'audio/m4a',
};

export async function uploadMedia(
  conversationId: string,
  messageId: string,
  uri: string,
  type: 'images' | 'videos' | 'audio' | 'thumbnails',
  ext: string,
): Promise<string> {
  const resourceType = RESOURCE_TYPE[type];
  const publicId = `conversations/${conversationId}/${type}/${messageId}`;
  const endpoint = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${resourceType}/upload`;

  const formData = new FormData();
  formData.append('file', {
    uri,
    type: MIME[ext] ?? 'application/octet-stream',
    name: `${messageId}.${ext}`,
  } as unknown as Blob);
  formData.append('upload_preset', UPLOAD_PRESET!);
  formData.append('public_id', publicId);

  const response = await fetch(endpoint, { method: 'POST', body: formData });
  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Cloudinary upload failed: ${err}`);
  }
  const data = await response.json();
  return data.secure_url as string;
}
