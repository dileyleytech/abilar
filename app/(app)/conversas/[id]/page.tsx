import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { ConversationStatus } from '@abilar/shared';
import { getSessionProfile } from '@/lib/auth/session';
import { getConversation, listMessages, getConversationProposal } from '@/lib/chat/queries';
import { Page } from '@/components/ui';
import { IconVer, IconBloqueado } from '@/components/ui/icons';
import { ChatRoom } from './_components/ChatRoom';
import { ChatMenu } from './_components/ChatMenu';
import { ProposalPanel } from './_components/ProposalPanel';

export const metadata = { title: 'Conversa — Abilar' };

export default async function ConversaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await getSessionProfile();
  if (!profile) notFound();
  const userId = profile.id;
  // Conversa + mensagens + proposta em paralelo (notFound checado depois).
  const [conv, msgs, proposal] = await Promise.all([
    getConversation(id, userId, profile.role === 'ADMIN'),
    listMessages(id),
    getConversationProposal(id, userId),
  ]);
  if (!conv) notFound();
  const backHref = conv.isModerator ? '/admin/denuncias' : '/conversas';

  return (
    <Page width="md" className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <Link
            href={backHref}
            aria-label="Voltar"
            className="shrink-0 rounded-lg px-2 py-1.5 text-h3 text-muted transition hover:bg-deep hover:text-charcoal"
          >
            ←
          </Link>
          <div className="min-w-0">
            <h1 className="truncate text-h2 font-semibold text-charcoal">
              {conv.isModerator ? `Moderação: ${conv.otherName}` : `Conversa com ${conv.otherName}`}
            </h1>
            <p className="truncate text-small text-muted">{conv.projectTitle}</p>
          </div>
        </div>
        {!conv.isModerator && <ChatMenu conversationId={conv.id} status={conv.status as ConversationStatus} />}
      </div>

      {conv.isModerator && (
        <p className="flex items-center gap-1.5 rounded-md bg-ochre/20 px-4 py-3 text-small text-charcoal">
          <IconVer size={18} aria-hidden /> Visão de moderação (somente leitura). Você não participa desta conversa.
        </p>
      )}

      {proposal && <ProposalPanel meIsClient={conv.meIsClient} conversationId={conv.id} proposal={proposal} />}

      {conv.status === 'BLOCKED' && !conv.isModerator && (
        <p className="flex items-center gap-1.5 rounded-md bg-danger/10 px-4 py-3 text-small text-danger">
          <IconBloqueado size={18} aria-hidden /> Esta conversa está bloqueada. Fale com o suporte se precisar reabrir.
        </p>
      )}
      <ChatRoom
        conversationId={conv.id}
        meId={userId}
        active={conv.status === 'ACTIVE'}
        readOnly={conv.isModerator}
        initialMessages={msgs.map((m) => ({ id: m.id, senderId: m.senderId, text: m.text, attachments: m.attachments }))}
      />
    </Page>
  );
}
