import * as ImagePicker from 'expo-image-picker';
import type { Photo } from './api';

// Usa o seletor de fotos do sistema (política do Google: acesso pontual).
export async function pickImages(limit = 4): Promise<Photo[]> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) throw new Error('Permita o acesso às fotos para anexar.');
  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: true,
    selectionLimit: limit,
    quality: 0.7,
  });
  if (res.canceled) return [];
  return res.assets.map((a, i) => ({
    uri: a.uri,
    name: a.fileName ?? `photo-${Date.now()}-${i}.jpg`,
    type: a.mimeType ?? 'image/jpeg',
  }));
}
