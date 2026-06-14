import { requireUserId } from '@/lib/auth/session';
import { listConversations } from '@/lib/chat/queries';
import { Page, PageHeader } from '@/components/ui';
import { ConversationList } from './_components/ConversationList';

export const metadata = { title: 'Conversas — Abilar' };

export default async function ConversasPage() {
  const userId = await requireUserId();
  const items = await listConversations(userId);

  return (
    <Page width="lg">
      <PageHeader title="Conversas" />
      <ConversationList meId={userId} initial={items} />
    </Page>
  );
}
