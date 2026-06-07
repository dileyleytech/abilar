import { useCallback, useEffect, useState } from 'react';
import { Alert, Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { api, type Photo } from '@/lib/api';
import { listModules, listModulePhotos, type ModuleRow } from '@/lib/data';
import { chooseAndPick } from '@/lib/pickImages';
import { CATEGORIES, CATEGORY_LABEL } from '@/lib/types';
import { formatCm } from '@/lib/format';
import { Button, Card } from '@/components/ui';
import { color, radius, space } from '@/theme';

const WORK_TYPES = [
  { v: 'NEW_INSTALL', t: '🆕 Móvel novo' },
  { v: 'REPLACE_EXISTING', t: '🔁 Substituição' },
] as const;

// Móveis do pedido (mesmo fluxo da web): lista + (dono em rascunho) adiciona e publica.
export function ModulesSection({
  projectId,
  status,
  isOwner,
  onPublished,
}: {
  projectId: string;
  status: string;
  isOwner: boolean;
  onPublished: () => void;
}) {
  const [modules, setModules] = useState<ModuleRow[] | null>(null);
  const [photos, setPhotos] = useState<Record<string, string>>({});
  const [open, setOpen] = useState(false);
  const [ambiente, setAmbiente] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [label, setLabel] = useState('');
  const [workType, setWorkType] = useState<string>('NEW_INSTALL');
  const [w, setW] = useState('');
  const [h, setH] = useState('');
  const [d, setD] = useState('');
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const editable = isOwner && status === 'DRAFT';

  const load = useCallback(async () => {
    try {
      const ms = await listModules(projectId);
      setModules(ms);
      const phs = await listModulePhotos(projectId);
      if (phs.length > 0) {
        const r = await api.signedUrls(phs.map((p) => p.path), { projectId });
        const map: Record<string, string> = {};
        phs.forEach((p, i) => { if (r.urls[i]) map[p.module_id] = r.urls[i]; });
        setPhotos(map);
      } else {
        setPhotos({});
      }
    } catch {
      setModules([]);
    }
  }, [projectId]);

  useEffect(() => {
    void load();
  }, [load]);

  const resetForm = () => {
    setAmbiente('');
    setCategory(null);
    setLabel('');
    setWorkType('NEW_INSTALL');
    setW('');
    setH('');
    setD('');
    setPhoto(null);
    setOpen(false);
  };

  const addPhoto = async () => {
    const picked = await chooseAndPick(1);
    if (picked[0]) setPhoto(picked[0]);
  };

  const add = async () => {
    if (!category) return Alert.alert('Móvel', 'Escolha o tipo do móvel.');
    if (category === 'OUTRO' && !label.trim()) return Alert.alert('Móvel', 'Diga qual é o móvel.');
    const widthCm = Number(w.replace(',', '.'));
    const heightCm = Number(h.replace(',', '.'));
    const depthCm = Number(d.replace(',', '.'));
    if (!(widthCm > 0 && heightCm > 0 && depthCm > 0)) return Alert.alert('Medidas', 'Informe largura, altura e profundidade (cm).');

    setSaving(true);
    try {
      await api.addModule(
        {
          projectId,
          ambiente: ambiente.trim() || undefined,
          category,
          label: category === 'OUTRO' ? label.trim() : undefined,
          workType,
          widthCm,
          heightCm,
          depthCm,
        },
        photo,
      );
      resetForm();
      await load();
    } catch (e) {
      Alert.alert('Ops', e instanceof Error ? e.message : 'Não foi possível salvar o móvel.');
    } finally {
      setSaving(false);
    }
  };

  const publish = async () => {
    setPublishing(true);
    try {
      await api.publishProject(projectId);
      onPublished();
    } catch (e) {
      Alert.alert('Ops', e instanceof Error ? e.message : 'Não foi possível publicar.');
      setPublishing(false);
    }
  };

  if (modules === null) return null;

  return (
    <View style={{ gap: space.md }}>
      <Text style={styles.section}>Móveis do pedido</Text>

      {modules.length === 0 && !editable && (
        <Card>
          <Text style={styles.muted}>Nenhum móvel cadastrado.</Text>
        </Card>
      )}

      {modules.map((m) => (
        <Card key={m.id}>
          <View style={styles.mRow}>
            {photos[m.id] ? (
              <Image source={{ uri: photos[m.id] }} style={styles.mThumb} />
            ) : (
              <View style={[styles.mThumb, styles.mThumbEmpty]}>
                <Text style={{ fontSize: 24 }}>🪵</Text>
              </View>
            )}
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={styles.mTitle}>{m.label ?? CATEGORY_LABEL[m.type] ?? m.type}</Text>
              <Text style={styles.mDim}>
                {formatCm(m.width_mm)} × {formatCm(m.height_mm)} × {formatCm(m.depth_mm)} (L×A×P)
              </Text>
              <Text style={styles.muted}>
                {m.ambiente ? `${m.ambiente} · ` : ''}
                {m.work_type === 'REPLACE_EXISTING' ? 'Substituição' : 'Móvel novo'}
              </Text>
            </View>
          </View>
        </Card>
      ))}

      {editable && !open && <Button title="+ Adicionar móvel" variant="outline" onPress={() => setOpen(true)} />}

      {editable && open && (
        <Card style={{ gap: space.sm }}>
          <Text style={styles.fLabel}>Cômodo (opcional)</Text>
          <TextInput style={styles.input} placeholder="Ex.: Cozinha" placeholderTextColor={color.text.subtle} value={ambiente} onChangeText={setAmbiente} />

          <Text style={styles.fLabel}>Tipo do móvel</Text>
          <View style={styles.chips}>
            {CATEGORIES.map((c) => (
              <Pressable key={c} onPress={() => setCategory(c)} style={[styles.chip, category === c && styles.chipOn]}>
                <Text style={[styles.chipText, category === c && styles.chipTextOn]}>{CATEGORY_LABEL[c]}</Text>
              </Pressable>
            ))}
          </View>

          {category === 'OUTRO' && (
            <>
              <Text style={styles.fLabel}>Qual é o móvel?</Text>
              <TextInput style={styles.input} placeholder="Ex.: Adega, sapateira…" placeholderTextColor={color.text.subtle} value={label} onChangeText={setLabel} />
            </>
          )}

          <View style={styles.row}>
            {WORK_TYPES.map((o) => (
              <Pressable key={o.v} onPress={() => setWorkType(o.v)} style={[styles.wt, workType === o.v && styles.wtOn]}>
                <Text style={[styles.wtText, workType === o.v && styles.wtTextOn]}>{o.t}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.fLabel}>Medidas (cm)</Text>
          <View style={styles.row}>
            <TextInput style={[styles.input, styles.flex1]} keyboardType="numeric" placeholder="Larg." placeholderTextColor={color.text.subtle} value={w} onChangeText={setW} />
            <TextInput style={[styles.input, styles.flex1]} keyboardType="numeric" placeholder="Alt." placeholderTextColor={color.text.subtle} value={h} onChangeText={setH} />
            <TextInput style={[styles.input, styles.flex1]} keyboardType="numeric" placeholder="Prof." placeholderTextColor={color.text.subtle} value={d} onChangeText={setD} />
          </View>

          <Text style={styles.fLabel}>Foto do móvel (opcional)</Text>
          {photo ? (
            <View style={styles.row}>
              <Image source={{ uri: photo.uri }} style={styles.formThumb} />
              <Pressable onPress={() => setPhoto(null)} style={styles.removePhoto}>
                <Text style={styles.removePhotoText}>Remover</Text>
              </Pressable>
            </View>
          ) : (
            <Button title="📷 Adicionar foto" variant="outline" onPress={addPhoto} />
          )}

          <View style={styles.row}>
            <View style={styles.flex1}>
              <Button title="Adicionar" onPress={add} loading={saving} />
            </View>
            <View style={styles.flex1}>
              <Button title="Cancelar" variant="outline" onPress={resetForm} />
            </View>
          </View>
        </Card>
      )}

      {editable && modules.length > 0 && !open && (
        <Button title="Publicar pedido →" variant="secondary" onPress={publish} loading={publishing} />
      )}
      {editable && <Text style={styles.muted}>Publique para os marceneiros da região enviarem orçamento.</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { fontSize: 18, fontWeight: '700', color: color.text.primary },
  muted: { color: color.text.muted, fontSize: 13 },
  mRow: { flexDirection: 'row', gap: space.md, alignItems: 'center' },
  mThumb: { width: 64, height: 64, borderRadius: radius.md },
  mThumbEmpty: { backgroundColor: color.bg.deep, alignItems: 'center', justifyContent: 'center' },
  formThumb: { width: 84, height: 84, borderRadius: radius.md },
  removePhoto: { justifyContent: 'center', paddingHorizontal: space.md },
  removePhotoText: { color: color.state.danger, fontWeight: '600' },
  mTitle: { fontSize: 16, fontWeight: '600', color: color.text.primary },
  mDim: { fontSize: 14, color: color.text.primary },
  fLabel: { fontSize: 14, fontWeight: '600', color: color.text.primary, marginTop: 2 },
  input: { backgroundColor: color.bg.base, borderWidth: 1, borderColor: color.border.subtle, borderRadius: radius.md, paddingHorizontal: space.md, paddingVertical: 10, fontSize: 16, color: color.text.primary },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  chip: { borderWidth: 1, borderColor: color.border.subtle, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: color.bg.surface },
  chipOn: { backgroundColor: color.brand.primary, borderColor: color.brand.primary },
  chipText: { color: color.text.primary, fontSize: 13 },
  chipTextOn: { color: color.text.onDark, fontWeight: '600' },
  row: { flexDirection: 'row', gap: space.sm },
  flex1: { flex: 1 },
  wt: { flex: 1, borderWidth: 1, borderColor: color.border.subtle, borderRadius: radius.md, paddingVertical: 10, alignItems: 'center' },
  wtOn: { borderColor: color.brand.primary, backgroundColor: 'rgba(197,106,51,0.1)' },
  wtText: { color: color.text.muted, fontSize: 13 },
  wtTextOn: { color: color.text.primary, fontWeight: '600' },
});
