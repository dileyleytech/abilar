import type { ProjectStatus } from '@abilar/shared';
import { PROJECT_STATUS_LABEL, PROJECT_STATUS_BADGE } from '@/lib/labels';

export function StatusBadge({ status }: { status: ProjectStatus }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-pill px-3 py-1 text-xs font-semibold ${PROJECT_STATUS_BADGE[status]}`}
    >
      {PROJECT_STATUS_LABEL[status]}
    </span>
  );
}
