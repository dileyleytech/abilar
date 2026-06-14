import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import type { Photo } from './api';

function toPhotos(res: ImagePicker.ImagePickerResult): Photo[] {
  if (res.canceled) return [];
  return res.assets.map((a, i) => ({
    uri: a.uri,
    name: a.fileName ?? `photo-${Date.now()}-${i}.jpg`,
    type: a.mimeType ?? 'image/jpeg',
  }));
}

// Seletor da galeria (sistema — política do Google: acesso pontual).
export async function pickImages(limit = 4): Promise<Photo[]> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) throw new Error('Permita o acesso às fotos para anexar.');
  return toPhotos(
    await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: true, selectionLimit: limit, quality: 0.7 }),
  );
}

// Tirar foto na hora pela câmera.
export async function takePhoto(): Promise<Photo[]> {
  const perm = await ImagePicker.requestCameraPermissionsAsync();
  if (!perm.granted) throw new Error('Permita o acesso à câmera.');
  return toPhotos(await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.7 }));
}

// Pergunta a origem (câmera ou galeria) e retorna as fotos escolhidas.
export function chooseAndPick(limit = 4): Promise<Photo[]> {
  return new Promise((resolve) => {
    Alert.alert('Adicionar foto', 'De onde?', [
      { text: '📷 Câmera', onPress: () => takePhoto().then(resolve, (e) => { Alert.alert('Câmera', e.message); resolve([]); }) },
      { text: '🖼️ Galeria', onPress: () => pickImages(limit).then(resolve, (e) => { Alert.alert('Fotos', e.message); resolve([]); }) },
      { text: 'Cancelar', style: 'cancel', onPress: () => resolve([]) },
    ]);
  });
}
