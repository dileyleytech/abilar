import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { IconFechar } from '@/components/icons';

// Visualizador de imagem em tela cheia. Passe a URL (assinada) e onClose.
export function Lightbox({ url, onClose }: { url: string | null; onClose: () => void }) {
  return (
    <Modal visible={!!url} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        {url ? <Image source={{ uri: url }} style={styles.img} contentFit="contain" transition={150} /> : null}
        <View style={styles.closeWrap}>
          <IconFechar size={18} color="#fff" strokeWidth={2} />
          <Text style={styles.close}>Fechar</Text>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', alignItems: 'center', justifyContent: 'center' },
  img: { width: '100%', height: '80%' },
  closeWrap: { position: 'absolute', top: 48, right: 20, flexDirection: 'row', alignItems: 'center', gap: 6 },
  close: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
