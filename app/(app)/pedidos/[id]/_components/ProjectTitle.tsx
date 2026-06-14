'use client';

import { useState, useTransition } from 'react';
import { renameProject } from '@/lib/projects/actions';
import { Button } from '@/components/ui';
import { IconEditar } from '@/components/ui/icons';

/** Título do pedido com edição inline (só dono, enquanto editável). */
export function ProjectTitle({
  projectId,
  title,
  editable,
}: {
  projectId: string;
  title: string;
  editable: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(title);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const save = () =>
    start(async () => {
      setError(null);
      const r = await renameProject(projectId, value.trim());
      if (!r.ok) return setError(r.error);
      setEditing(false);
    });

  if (editing) {
    return (
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <input
            autoFocus
            className="min-w-0 flex-1 rounded-lg border border-subtle bg-surface px-3 py-1.5 text-2xl font-bold text-charcoal outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 sm:text-3xl"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') save();
              if (e.key === 'Escape') { setValue(title); setEditing(false); }
            }}
          />
          <Button variant="primary" size="sm" onClick={save} disabled={pending}>
            {pending ? '…' : 'Salvar'}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => { setValue(title); setEditing(false); }}>
            Cancelar
          </Button>
        </div>
        {error && <span className="text-sm text-danger">{error}</span>}
      </div>
    );
  }

  return (
    <h1 className="flex items-center gap-2 truncate text-2xl font-bold text-charcoal sm:text-3xl">
      <span className="truncate">{title}</span>
      {editable && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setEditing(true)}
          aria-label="Editar nome do pedido"
          className="shrink-0"
        >
          <IconEditar size={18} aria-hidden />
        </Button>
      )}
    </h1>
  );
}
