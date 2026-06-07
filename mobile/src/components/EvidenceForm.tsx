import { useState } from 'react';
import { Alert, Image, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { api, type Photo } from '@/lib/api';
import { chooseAndPick } from '@/lib/pickImages';
import { Button } from '@/components/ui';
import { color, radius, space } from '@/theme';

// Concluir etapa EXIGE foto(s) + comentário (§6.4).
export function EvidenceForm({
  visible,
  milestoneId,
  milestoneLabel,
  onClose,
  onDone,
}: {
  visible: boolean;
  milestoneId: string;
  milestoneLabel: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);

  const reset = () => {
    setPhotos([]);
    setComment('');
    setLoading(false);
  };

  const add = async () => {
    const picked = await chooseAndPick(8 - photos.length);
    if (picked.length) setPhotos((p) => [...p, ...picked].slice(0, 8));
  };

  const submit = async () => {
    if (photos.length === 0) return Alert.alert('Foto obrigatória', 'Adicione pelo menos uma foto da etapa.');
    if (!comment.trim()) return Alert.alert('Comentário obrigatório', 'Descreva o que foi feito nesta etapa.');
    setLoading(true);
    try {
      await api.concludeMilestone(milestoneId, comment.trim(), photos);
      reset();
      onDone();
    } catch (e) {
      Alert.alert('Ops', e instanceof Error ? e.message : 'Não foi possível concluir.');
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Concluir: {milestoneLabel}</Text>
          <Pressable onPress={onClose}>
            <Text style={styles.close}>✕</Text>
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.body}>
          <Text style={styles.help}>Envie fotos do que ficou pronto e descreva a etapa. O cliente revisa e aprova.</Text>

          <View style={styles.thumbs}>
            {photos.map((p, i) => (
              <View key={i} style={styles.thumbWrap}>
                <Image source={{ uri: p.uri }} style={styles.thumb} />
                <Pressable style={styles.remove} onPress={() => setPhotos((arr) => arr.filter((_, idx) => idx !== i))}>
                  <Text style={styles.removeText}>✕</Text>
                </Pressable>
              </View>
            ))}
            {photos.length < 8 && (
              <Pressable style={styles.addPhoto} onPress={add}>
                <Text style={styles.addPhotoText}>＋{'\n'}foto</Text>
              </Pressable>
            )}
          </View>

          <TextInput
            style={styles.input}
            placeholder="Descreva o que foi feito…"
            placeholderTextColor={color.text.subtle}
            value={comment}
            onChangeText={setComment}
            multiline
          />

          <Button title="Concluir etapa →" variant="secondary" onPress={submit} loading={loading} />
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: color.bg.base },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: space.lg, borderBottomWidth: 1, borderBottomColor: color.border.subtle },
  title: { fontSize: 18, fontWeight: '700', color: color.text.primary, flex: 1 },
  close: { fontSize: 22, color: color.text.muted, paddingHorizontal: space.sm },
  body: { padding: space.lg, gap: space.lg },
  help: { color: color.text.muted },
  thumbs: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  thumbWrap: { position: 'relative' },
  thumb: { width: 84, height: 84, borderRadius: radius.md },
  remove: { position: 'absolute', top: -6, right: -6, width: 22, height: 22, borderRadius: 11, backgroundColor: color.text.primary, alignItems: 'center', justifyContent: 'center' },
  removeText: { color: '#fff', fontSize: 12 },
  addPhoto: { width: 84, height: 84, borderRadius: radius.md, borderWidth: 1, borderColor: color.border.subtle, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
  addPhotoText: { color: color.brand.primary, textAlign: 'center', fontWeight: '600' },
  input: {
    minHeight: 90,
    backgroundColor: color.bg.surface,
    borderWidth: 1,
    borderColor: color.border.subtle,
    borderRadius: radius.md,
    padding: space.md,
    fontSize: 16,
    color: color.text.primary,
    textAlignVertical: 'top',
  },
});
