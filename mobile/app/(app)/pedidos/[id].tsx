import { useCallback, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Image } from 'expo-image';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '@/lib/auth';
import {
  getProject,
  listEvidences,
  listMilestones,
  listProjectPhotos,
  type MilestoneRow,
  type ProjectRow,
} from '@/lib/data';
import { api, type QuoteView } from '@/lib/api';
import { QuoteForm } from '@/components/QuoteForm';
import { ModulesSection } from '@/components/ModulesSection';
import { Lightbox } from '@/components/Lightbox';
import { milestoneStatusLabel, PROJECT_STATUS_LABEL } from '@/lib/types';
import { formatCents, formatDateTime } from '@/lib/format';
import { Badge, Button, Card, Loading } from '@/components/ui';
import { EvidenceForm } from '@/components/EvidenceForm';
import { color, radius, space } from '@/theme';

type EvidenceView = { id: string; comment: string | null; urls: string[]; date: string };

function badgeTone(status: MilestoneRow['status']) {
  if (status === 'APPROVED') return 'success' as const;
  if (status === 'DONE') return 'primary' as const;
  if (status === 'IN_PROGRESS') return 'warn' as const;
  return 'neutral' as const;
}

export default function PedidoDetail() {
  const { id, novo } = useLocalSearchParams<{ id: string; novo?: string }>();
  const { profile } = useAuth();
  const router = useRouter();
  const [project, setProject] = useState<ProjectRow | null>(null);
  const [milestones, setMilestones] = useState<MilestoneRow[] | null>(null);
  const [evidences, setEvidences] = useState<Record<string, EvidenceView[]>>({});
  const [quotes, setQuotes] = useState<QuoteView[]>([]);
  const [dealLoading, setDealLoading] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);
  const [photosLoading, setPhotosLoading] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [concluding, setConcluding] = useState<MilestoneRow | null>(null);
  const [quoteForm, setQuoteForm] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const [savingTitle, setSavingTitle] = useState(false);

  const isClient = profile?.role === 'CLIENT';
  const isCarpenter = profile?.role === 'CARPENTER';

  // Evidências de todas as etapas EM PARALELO; 1 assinatura por etapa (lote).
  const loadEvidences = useCallback(async (ms: MilestoneRow[]) => {
    const entries = await Promise.all(
      ms.map(async (m) => {
        const rows = await listEvidences(m.id);
        const paths = rows.flatMap((ev) => ev.photos ?? []);
        let urls: string[] = [];
        if (paths.length > 0) {
          try {
            urls = (await api.signedUrls(paths, { milestoneId: m.id })).urls;
          } catch {
            urls = [];
          }
        }
        // redistribui as URLs assinadas por evidência (na ordem dos paths)
        let cursor = 0;
        const views: EvidenceView[] = rows.map((ev) => {
          const n = (ev.photos ?? []).length;
          const slice = urls.slice(cursor, cursor + n);
          cursor += n;
          return { id: ev.id, comment: ev.comment, urls: slice, date: ev.created_at };
        });
        return [m.id, views] as const;
      }),
    );
    const map: Record<string, EvidenceView[]> = {};
    for (const [mid, views] of entries) if (views.length > 0) map[mid] = views;
    setEvidences(map);
  }, []);

  const load = useCallback(async () => {
    if (!id) return;
    // Projeto + marcos primeiro (porta da tela). O resto carrega EM PARALELO e
    // cada seção aparece assim que fica pronta (não bloqueia as outras).
    const [p, ms] = await Promise.all([getProject(id), listMilestones(id)]);
    setProject(p);
    setMilestones(ms);

    void loadEvidences(ms);

    setPhotosLoading(true);
    void (async () => {
      try {
        const paths = await listProjectPhotos(id);
        setPhotos(paths.length ? (await api.signedUrls(paths, { projectId: id })).urls : []);
      } catch {
        setPhotos([]);
      } finally {
        setPhotosLoading(false);
      }
    })();

    if (ms.length === 0) {
      setDealLoading(true);
      void api
        .quotesForProject(id)
        .then((deal) => setQuotes(deal.quotes))
        .catch(() => setQuotes([]))
        .finally(() => setDealLoading(false));
    } else {
      setQuotes([]);
    }
  }, [id, loadEvidences]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const act = async (fn: () => Promise<unknown>, mid: string) => {
    setBusyId(mid);
    try {
      await fn();
      await load();
    } catch (e) {
      Alert.alert('Ops', e instanceof Error ? e.message : 'Não foi possível concluir.');
    } finally {
      setBusyId(null);
    }
  };

  const doPreapprove = async (q: QuoteView) => {
    setBusyId(q.quoteId);
    try {
      const r = await api.preapproveQuote(q.quoteId);
      router.push(`/(app)/conversas/${r.conversationId}`);
    } catch (e) {
      Alert.alert('Ops', e instanceof Error ? e.message : 'Falha ao abrir a conversa.');
    } finally {
      setBusyId(null);
    }
  };

  const doAccept = (q: QuoteView) =>
    Alert.alert('Aceitar orçamento', `Aceitar a proposta de ${q.carpenterName}? Isso gera o contrato para assinatura.`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Aceitar', onPress: () => act(() => api.acceptQuote(q.quoteId), q.quoteId) },
    ]);

  const saveTitle = async () => {
    if (!id || titleDraft.trim().length < 2) return Alert.alert('Nome', 'Dê um nome ao pedido (mín. 2 letras).');
    setSavingTitle(true);
    try {
      await api.renameProject(id, titleDraft.trim());
      setRenaming(false);
      await load();
    } catch (e) {
      Alert.alert('Ops', e instanceof Error ? e.message : 'Não foi possível renomear.');
    } finally {
      setSavingTitle(false);
    }
  };

  if (!project || milestones === null) return <Loading label="Carregando pedido…" />;

  const approvedPct = milestones.filter((m) => m.status === 'APPROVED').reduce((a, m) => a + m.pct, 0);
  const canRename = isClient && ['DRAFT', 'OPEN_FOR_QUOTES', 'IN_NEGOTIATION'].includes(project.status);

  return (
    <>
      <Stack.Screen options={{ title: project.title }} />
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
        <Card>
          {renaming ? (
            <View style={{ gap: space.sm }}>
              <TextInput style={styles.titleInput} value={titleDraft} onChangeText={setTitleDraft} autoFocus />
              <View style={{ flexDirection: 'row', gap: space.sm }}>
                <View style={{ flex: 1 }}>
                  <Button title="Salvar" onPress={saveTitle} loading={savingTitle} />
                </View>
                <View style={{ flex: 1 }}>
                  <Button title="Cancelar" variant="outline" onPress={() => setRenaming(false)} />
                </View>
              </View>
            </View>
          ) : (
            <View style={styles.titleRow}>
              <Text style={styles.title}>{project.title}</Text>
              {canRename && (
                <Pressable onPress={() => { setTitleDraft(project.title); setRenaming(true); }} hitSlop={8}>
                  <Text style={styles.pencil}>✏️</Text>
                </Pressable>
              )}
            </View>
          )}
          <View style={styles.metaRow}>
            <Badge label={PROJECT_STATUS_LABEL[project.status] ?? project.status} tone="primary" />
            {project.city ? <Text style={styles.meta}>{project.city}</Text> : null}
          </View>
        </Card>

        {milestones.length === 0 && project.status !== 'DRAFT' && (
          <View style={{ gap: space.md }}>
            <Text style={styles.section}>Orçamentos {quotes.length > 0 ? `(${quotes.length})` : ''}</Text>

            {isCarpenter && quotes.length === 0 && (
              project.status === 'OPEN_FOR_QUOTES' ? (
                <Button title="Enviar orçamento" onPress={() => setQuoteForm(true)} />
              ) : (
                <Card><Text style={styles.meta}>Este pedido não está aberto para orçamento.</Text></Card>
              )
            )}
            {!isCarpenter && quotes.length === 0 && (
              <Card><Text style={styles.meta}>{dealLoading ? 'Carregando orçamentos…' : 'Aguardando orçamentos dos marceneiros…'}</Text></Card>
            )}

            {quotes.map((q) => {
              const busy = busyId === q.quoteId;
              const signed = q.contractStatus === 'SIGNED';
              const awaitingCarpenter = !!q.contractId && q.clientSigned && !q.carpenterSigned;
              const economia = q.parceladoCents != null ? q.parceladoCents - q.avistaCents : 0;
              return (
                <Card key={q.quoteId} style={{ gap: space.sm }}>
                  <View style={styles.cardTop}>
                    <Text style={styles.qCarpenter}>{q.carpenterName}</Text>
                    <Badge
                      label={signed ? 'Contratado ✓' : awaitingCarpenter ? 'Em negociação' : q.status === 'PRE_APPROVED' ? 'Em negociação' : 'Recebido'}
                      tone={signed ? 'success' : 'primary'}
                    />
                  </View>

                  <View style={styles.priceBox}>
                    <Text style={styles.priceLabel}>À VISTA NO PIX</Text>
                    <Text style={styles.priceBig}>{formatCents(q.avistaCents)}</Text>
                    {q.parceladoCents != null && q.installmentValueCents != null && (
                      <Text style={styles.meta}>
                        ou {q.clientInstallments}x de {formatCents(q.installmentValueCents)} no cartão (total {formatCents(q.parceladoCents)})
                      </Text>
                    )}
                    {economia > 0 && <Text style={styles.economia}>💰 Economize {formatCents(economia)} à vista</Text>}
                  </View>

                  {q.items.length > 0 && (
                    <View>
                      <Text style={styles.incluiTitle}>O que está incluído</Text>
                      {q.items.map((it, i) => (
                        <Text key={i} style={styles.meta}>• {it.qty} {it.unit} · {it.name}</Text>
                      ))}
                    </View>
                  )}

                  {q.note ? (
                    <View style={styles.noteBox}>
                      <Text style={styles.incluiTitle}>Mensagem do marceneiro</Text>
                      <Text style={styles.note}>“{q.note}”</Text>
                    </View>
                  ) : null}

                  {signed ? null : awaitingCarpenter ? (
                    isClient ? (
                      <View style={{ gap: space.sm }}>
                        <Text style={styles.waiting}>✓ Você aceitou — aguardando o marceneiro assinar.</Text>
                        {q.contractId && <Button title="Ver contrato" variant="outline" onPress={() => router.push(`/(app)/contratos/${q.contractId}`)} />}
                      </View>
                    ) : (
                      <Button title="Ver e assinar contrato →" variant="secondary" onPress={() => router.push(`/(app)/contratos/${q.contractId}`)} />
                    )
                  ) : isClient ? (
                    <View style={{ gap: space.sm }}>
                      <Button title="Conversar" variant="outline" onPress={() => doPreapprove(q)} loading={busy} />
                      <Button title="Aceitar orçamento" onPress={() => doAccept(q)} loading={busy} />
                    </View>
                  ) : (
                    <View style={{ gap: space.sm }}>
                      <Text style={styles.waiting}>Aguardando o cliente.</Text>
                      <Button title="Editar orçamento" variant="outline" onPress={() => setQuoteForm(true)} />
                    </View>
                  )}
                </Card>
              );
            })}
          </View>
        )}

        {photos.length > 0 && (
          <View style={{ gap: space.sm }}>
            <Text style={styles.section}>Fotos do pedido</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }}>
              {photos.map((u, i) => (
                <Pressable key={i} onPress={() => setLightbox(u)}>
                  <Image source={{ uri: u }} style={styles.galleryImg} contentFit="cover" transition={150} />
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}

        {milestones.length === 0 && id && (
          <ModulesSection projectId={id} status={project.status} isOwner={isClient} onPublished={() => void load()} autoOpen={novo === '1'} />
        )}

        {milestones.length > 0 ? (
          <>
            <View style={styles.progressRow}>
              <Text style={styles.section}>Andamento da obra</Text>
              <Text style={styles.pct}>{approvedPct}%</Text>
            </View>
            <View style={styles.track}>
              <View style={[styles.fill, { width: `${approvedPct}%` }]} />
            </View>

            {milestones.map((m) => {
              const busy = busyId === m.id;
              const evs = evidences[m.id] ?? [];
              return (
                <Card key={m.id} style={{ gap: 8 }}>
                  <View style={styles.cardTop}>
                    <Text style={styles.mLabel}>
                      {m.ord + 1}. {m.label}
                    </Text>
                    <Badge label={milestoneStatusLabel(m.status, isClient)} tone={badgeTone(m.status)} />
                  </View>
                  <Text style={styles.meta}>{m.event}</Text>
                  <Text style={styles.amount}>
                    {m.pct}% · {formatCents(m.amount_cents)}
                  </Text>

                  {evs.map((ev) => (
                    <View key={ev.id} style={styles.evidence}>
                      {ev.urls.length > 0 && (
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }}>
                          {ev.urls.map((u, i) => (
                            <Pressable key={i} onPress={() => setLightbox(u)}>
                              <Image source={{ uri: u }} style={styles.evImg} contentFit="cover" transition={150} />
                            </Pressable>
                          ))}
                        </ScrollView>
                      )}
                      {ev.comment ? <Text style={styles.evComment}>{ev.comment}</Text> : null}
                      <Text style={styles.evDate}>{formatDateTime(ev.date)}</Text>
                    </View>
                  ))}

                  {isCarpenter && m.status === 'PENDING' && (
                    <Button title="Iniciar etapa" onPress={() => act(() => api.advanceMilestone(m.id), m.id)} loading={busy} />
                  )}
                  {isCarpenter && m.status === 'IN_PROGRESS' && (
                    <Button title="Concluir com foto + comentário" onPress={() => setConcluding(m)} />
                  )}
                  {isClient && m.status === 'DONE' && (
                    <Button title="Aprovar etapa ✓" variant="secondary" onPress={() => act(() => api.approveMilestone(m.id), m.id)} loading={busy} />
                  )}
                </Card>
              );
            })}
          </>
        ) : (
          <Card>
            <Text style={styles.meta}>A obra aparece aqui quando o orçamento for aprovado e o contrato assinado.</Text>
          </Card>
        )}

        <Text style={styles.legal} onPress={() => Linking.openURL('https://abilar.com.br/privacidade')}>
          Política de privacidade
        </Text>
      </ScrollView>

      {concluding && (
        <EvidenceForm
          visible={!!concluding}
          milestoneId={concluding.id}
          milestoneLabel={concluding.label}
          onClose={() => setConcluding(null)}
          onDone={() => {
            setConcluding(null);
            void load();
          }}
        />
      )}

      {quoteForm && id && (
        <QuoteForm
          visible={quoteForm}
          projectId={id}
          onClose={() => setQuoteForm(false)}
          onDone={() => {
            setQuoteForm(false);
            void load();
          }}
        />
      )}

      <Lightbox url={lightbox} onClose={() => setLightbox(null)} />
    </>
  );
}

const styles = StyleSheet.create({
  container: { padding: space.lg, gap: space.md },
  title: { flex: 1, fontSize: 20, fontWeight: '700', color: color.text.primary },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  pencil: { fontSize: 18 },
  titleInput: { borderWidth: 1, borderColor: color.border.subtle, borderRadius: radius.md, paddingHorizontal: space.md, paddingVertical: 10, fontSize: 18, fontWeight: '700', color: color.text.primary, backgroundColor: color.bg.base },
  metaRow: { marginTop: 6, flexDirection: 'row', gap: space.sm, alignItems: 'center', flexWrap: 'wrap' },
  section: { fontSize: 18, fontWeight: '700', color: color.text.primary },
  meta: { fontSize: 14, color: color.text.muted },
  amount: { fontSize: 14, fontWeight: '600', color: color.text.primary },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: space.sm },
  pct: { fontSize: 18, fontWeight: '700', color: color.brand.secondary },
  track: { height: 10, borderRadius: radius.pill, backgroundColor: color.bg.deep, overflow: 'hidden' },
  fill: { height: 10, borderRadius: radius.pill, backgroundColor: color.brand.secondary },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm },
  mLabel: { flex: 1, fontSize: 16, fontWeight: '600', color: color.text.primary },
  note: { color: color.text.muted, fontStyle: 'italic' },
  waiting: { color: color.text.muted },
  qCarpenter: { flex: 1, fontSize: 17, fontWeight: '700', color: color.text.primary },
  priceBox: { backgroundColor: 'rgba(197,106,51,0.06)', borderWidth: 1, borderColor: 'rgba(197,106,51,0.2)', borderRadius: radius.md, padding: space.md, gap: 2 },
  priceLabel: { fontSize: 11, fontWeight: '700', color: color.text.muted, letterSpacing: 0.5 },
  priceBig: { fontSize: 26, fontWeight: '800', color: color.text.primary },
  economia: { color: color.brand.secondary, fontWeight: '700', fontSize: 13, marginTop: 2 },
  incluiTitle: { fontSize: 13, fontWeight: '700', color: color.text.primary, marginBottom: 2 },
  noteBox: { backgroundColor: color.bg.base, borderRadius: radius.md, padding: space.sm },
  evidence: { backgroundColor: color.bg.base, borderRadius: radius.md, padding: space.sm, gap: 6 },
  evImg: { width: 110, height: 110, borderRadius: radius.sm, backgroundColor: color.bg.deep },
  galleryImg: { width: 130, height: 130, borderRadius: radius.md, backgroundColor: color.bg.deep },
  evComment: { color: color.text.primary },
  evDate: { color: color.text.subtle, fontSize: 12 },
  legal: { color: color.text.subtle, textAlign: 'center', textDecorationLine: 'underline', marginTop: space.lg },
});
