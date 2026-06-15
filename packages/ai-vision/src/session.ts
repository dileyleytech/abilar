// session.ts — sessão do chat de design: estado estruturado + histórico (UNDO) +
// mensagens ("o que entendi"). Puro/imutável. A camada de app persiste a sessão.
import type { Category } from '@abilar/shared';
import type { DesignCommand, Hardware } from './dsl';
import { applyCommand, type DesignItem, type DesignModule, type DesignState } from './state';

export type DesignMessageRole = 'USER' | 'ABI';
export type DesignMessage = {
  role: DesignMessageRole;
  text: string;
  /** Comando estruturado entendido (só nas mensagens da ABI), para auditoria/UI. */
  command?: DesignCommand;
};

export type DesignSession = {
  state: DesignState;
  /** Pilha de estados anteriores para UNDO (último no fim). */
  history: DesignState[];
  messages: DesignMessage[];
};

/** Módulo mínimo vindo do projeto (DB) para semear o estado de design. */
export type SeedModule = {
  id: string;
  type: Category;
  widthMm: number;
  heightMm: number;
  depthMm: number;
  material?: string | null;
  finish?: string | null;
  hardware?: Hardware | null;
  lighting?: string | null;
  items?: DesignItem[] | null;
};

/** Cria a sessão a partir dos módulos do projeto (a fonte de verdade inicial). */
export function seedFromModules(modules: SeedModule[]): DesignSession {
  return {
    state: {
      modules: modules.map((m) => ({
        id: m.id,
        type: m.type,
        widthMm: m.widthMm,
        heightMm: m.heightMm,
        depthMm: m.depthMm,
        material: m.material ?? undefined,
        finish: m.finish ?? undefined,
        hardware: m.hardware ?? undefined,
        lighting: m.lighting ?? undefined,
        items: m.items ?? [],
      } satisfies DesignModule)),
    },
    history: [],
    messages: [],
  };
}

/**
 * Processa um turno do chat: registra a fala do usuário, aplica o comando
 * (ou desfaz), registra a resposta da ABI. Puro e imutável.
 */
export function applyTurn(session: DesignSession, utterance: string, cmd: DesignCommand): DesignSession {
  const userMsg: DesignMessage = { role: 'USER', text: utterance };

  // UNDO: restaura o último estado do histórico (se houver).
  if (cmd.intent === 'UNDO') {
    if (session.history.length === 0) {
      return {
        ...session,
        messages: [...session.messages, userMsg, { role: 'ABI', text: 'Não há nada para desfazer.', command: cmd }],
      };
    }
    const history = session.history.slice(0, -1);
    const state = session.history[session.history.length - 1]!;
    return {
      state,
      history,
      messages: [...session.messages, userMsg, { role: 'ABI', text: cmd.echo || 'Desfiz a última alteração.', command: cmd }],
    };
  }

  const result = applyCommand(session.state, cmd);
  const abiMsg: DesignMessage = { role: 'ABI', text: result.message || cmd.echo, command: cmd };

  // Só empilha no histórico quando o comando realmente alterou o estado.
  if (!result.ok) {
    return { ...session, messages: [...session.messages, userMsg, abiMsg] };
  }
  return {
    state: result.state,
    history: [...session.history, session.state],
    messages: [...session.messages, userMsg, abiMsg],
  };
}
