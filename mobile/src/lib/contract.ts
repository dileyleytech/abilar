// Cópia das cláusulas do contrato padrão (espelha packages/shared/contract.ts).
// TEMPLATE — revisar com advogado. Sincronize ao mudar o texto na web.
export const CONTRACT_CLAUSES: { title: string; body: string }[] = [
  {
    title: 'Pagamento por evolução da obra (escrow)',
    body: 'O pagamento fica retido na Abilar e é liberado ao marceneiro por marco concluído. Cada marco, exceto o sinal, exige evidência (foto) do marceneiro e aprovação do cliente.',
  },
  { title: 'Garantias', body: 'O marceneiro garante a peça contra defeitos de fabricação e instalação pelo prazo legal.' },
  { title: 'Prazos', body: 'Início e término estimado são combinados no chat e podem ser ajustados por acordo registrado na plataforma.' },
  { title: 'Cancelamento e reembolso', body: 'Cancelamentos seguem as regras da plataforma; marcos não liberados podem ser reembolsados conforme a etapa.' },
  { title: 'Disputa', body: 'Havendo divergência sobre um marco, a liberação fica suspensa e o caso vai à mediação da Abilar.' },
  { title: 'Proteção de dados (LGPD)', body: 'Dados pessoais tratados conforme a LGPD, apenas para a execução deste contrato.' },
  { title: 'Foro', body: 'Fica eleito o foro do domicílio do cliente.' },
];

export const CONTRACT_LEGAL_NOTE =
  'Modelo padrão Abilar. Documento gerado eletronicamente; o aceite das duas partes é registrado com data/hora. Texto sujeito a revisão jurídica.';
