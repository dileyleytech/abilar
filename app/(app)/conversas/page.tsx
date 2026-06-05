import { requireUserId } from '@/lib/auth/session';
import { listConversations } from '@/lib/chat/queries';
import { ConversationList } from './_components/ConversationList';

export const metadata = { title: 'Conversas — Abilar' };

export default async function ConversasPage() {
  const userId = await requireUserId();
  const items = await listConversations(userId);

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="mb-6 text-2xl font-bold text-charcoal sm:text-3xl">Conversas</h1>
      <ConversationList meId={userId} initial={items} />
    </main>
  );
}
