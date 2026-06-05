import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireUserId } from '@/lib/auth/session';
import { getConversation, listMessages } from '@/lib/chat/queries';
import { ChatRoom } from './_components/ChatRoom';

export const metadata = { title: 'Conversa — Abilar' };

export default async function ConversaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = await requireUserId();
  const conv = await getConversation(id, userId);
  if (!conv) notFound();
  const msgs = await listMessages(id);

  const backHref = conv.meIsClient ? `/pedidos/${conv.projectId}` : `/marceneiro/pedidos/${conv.projectId}`;

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
      <Link href={backHref} className="text-sm text-muted hover:text-charcoal">
        ← {conv.projectTitle}
      </Link>
      <h1 className="mt-3 mb-4 text-xl font-bold text-charcoal">Conversa com {conv.otherName}</h1>
      <ChatRoom
        conversationId={conv.id}
        meId={userId}
        active={conv.status === 'ACTIVE'}
        initialMessages={msgs.map((m) => ({ id: m.id, senderId: m.senderId, text: m.text }))}
      />
    </main>
  );
}
