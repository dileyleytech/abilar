import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { ConversationStatus } from '@abilar/shared';
import { requireUserId } from '@/lib/auth/session';
import { getConversation, listMessages } from '@/lib/chat/queries';
import { ChatRoom } from './_components/ChatRoom';
import { ChatMenu } from './_components/ChatMenu';

export const metadata = { title: 'Conversa — Abilar' };

export default async function ConversaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = await requireUserId();
  const conv = await getConversation(id, userId);
  if (!conv) notFound();
  const msgs = await listMessages(id);

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
      <Link href="/conversas" className="text-sm text-muted hover:text-charcoal">
        ← Conversas
      </Link>
      <div className="mt-3 mb-4 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-charcoal">Conversa com {conv.otherName}</h1>
          <p className="truncate text-sm text-muted">{conv.projectTitle}</p>
        </div>
        <ChatMenu conversationId={conv.id} status={conv.status as ConversationStatus} />
      </div>
      {conv.status === 'BLOCKED' && (
        <p className="mb-3 rounded-xl bg-ochre/20 px-4 py-3 text-sm text-charcoal">
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
