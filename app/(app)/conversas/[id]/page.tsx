import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { ConversationStatus } from '@abilar/shared';
import { requireUserId } from '@/lib/auth/session';
import { getConversation, listMessages, getConversationProposal } from '@/lib/chat/queries';
import { ChatRoom } from './_components/ChatRoom';
import { ChatMenu } from './_components/ChatMenu';
import { ProposalPanel } from './_components/ProposalPanel';

export const metadata = { title: 'Conversa — Abilar' };

export default async function ConversaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = await requireUserId();
  const conv = await getConversation(id, userId);
  if (!conv) notFound();
  const [msgs, proposal] = await Promise.all([listMessages(id), getConversationProposal(id, userId)]);

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-3 px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <Link
            href="/conversas"
            aria-label="Voltar para conversas"
            className="shrink-0 rounded-lg px-2 py-1.5 text-lg text-muted transition hover:bg-deep hover:text-charcoal"
          >
            ←
          </Link>
          <div className="min-w-0">
            <h1 className="truncate text-xl font-bold text-charcoal">Conversa com {conv.otherName}</h1>
            <p className="truncate text-sm text-muted">{conv.projectTitle}</p>
          </div>
        </div>
        <ChatMenu conversationId={conv.id} status={conv.status as ConversationStatus} />
      </div>

      {proposal && <ProposalPanel meIsClient={conv.meIsClient} conversationId={conv.id} proposal={proposal} />}

      {conv.status === 'BLOCKED' && (
        <p className="rounded-xl bg-ochre/20 px-4 py-3 text-sm text-charcoal">
          ⛔ Esta conversa está bloqueada. Fale com o suporte se precisar reabrir.
        </p>
      )}
      <ChatRoom
        conversationId={conv.id}
        meId={userId}
        active={conv.status === 'ACTIVE'}
        initialMessages={msgs.map((m) => ({ id: m.id, senderId: m.senderId, text: m.text }))}
      />
    </main>
  );
}
