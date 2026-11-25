// Dados falsos para o modo demo (sem .env), no mesmo formato que o banco devolve.
const h = (horas) => new Date(Date.now() + horas * 36e5).toISOString()

const tickets = [
  { ticket_id: 'demo-1', protocolo: 70, status: 'aberto', tipo: 'Reembolso', tag: null, tenant_nome: 'UNIPDS', aluno_nome: 'Aluno Exemplo', cpf_cnpj: '123.***.***-01', produto_nome: 'Java + IA', responsavel: 'demo', responsavel_nome: 'Analista Demo', criado_em: h(-30), sla_limite: h(-6), sla_estourado: true, resolvido_em: null },
  { ticket_id: 'demo-2', protocolo: 71, status: 'andamento', tipo: 'Nota fiscal', tag: '2ª via', tenant_nome: 'UNIPDS', aluno_nome: 'Outra Aluna', cpf_cnpj: '987.***.***-00', produto_nome: 'MBA Executivo', responsavel: null, responsavel_nome: null, criado_em: h(-10), sla_limite: h(62), sla_estourado: false, resolvido_em: null },
]

export const demo = {
  is_staff: () => true,
  eu: () => [{ user_id: 'demo', nome: 'Analista Demo', email: 'demo@unipds' }],
  listar_bus: () => [{ tenant_id: 't1', nome: 'UNIPDS' }],
  listar_categorias: () => [
    { tipo: 'Cancelamento', prazo_horas: 24, ordem: 1, ativo: true },
    { tipo: 'Reembolso', prazo_horas: 24, ordem: 2, ativo: true },
    { tipo: 'Nota fiscal', prazo_horas: 72, ordem: 3, ativo: true },
    { tipo: 'Documentos e declarações', prazo_horas: 72, ordem: 4, ativo: true },
    { tipo: 'Outros', prazo_horas: 168, ordem: 5, ativo: true },
  ],
  listar_staff: () => [{ user_id: 'demo', nome: 'Analista Demo', ativo: true }],
  listar_tickets: () => tickets,
  ver_ticket: ({ p_ticket_id }) => {
    const t = tickets.find((x) => x.ticket_id === p_ticket_id) || tickets[0]
    return {
      ticket: { ...t, descricao: 'Pedido de exemplo.' },
      aluno: { nome: t.aluno_nome, cpf_cnpj: t.cpf_cnpj },
      compra: { produto_nome: t.produto_nome },
      checklist: [{ ordem: 1, texto: 'Confirmar pagamento', marcado: false }, { ordem: 2, texto: 'Avisar o aluno', marcado: false }],
      historico: [{ criado_em: t.criado_em, autor_nome: 'Analista Demo', tipo: 'abertura', nota: null }],
    }
  },
  buscar_aluno: () => [
    { student_id: 's1', aluno_nome: 'Aluno Exemplo', product_id: 'p1', produto_nome: 'Java + IA', contract_id: 'c1', parcelas: 12, pagas: 2 },
    { student_id: 's1', aluno_nome: 'Aluno Exemplo', product_id: 'p2', produto_nome: 'Python', contract_id: 'c2', parcelas: 1, pagas: 1 },
  ],
  listar_alunos: () => [
    { total: 1, student_id: 's1', tenant_nome: 'UNIPDS', nome: 'Aluno Exemplo', cpf_mascarado: '123.***.***-01', uf: 'CE', ingresso: '2026-03-01', produtos: 'Java + IA, Python', parcelas: 13, pagas: 3, abertas: 10, vencidas: 0, valor_pago: 1500, tickets_abertos: 1 },
  ],
  abrir_ticket: () => [{ ticket_id: 'demo-3', protocolo: 72, sla_limite: h(24) }],
  atualizar_ticket: () => ({}),
  adicionar_nota: () => ({}),
  marcar_checklist: () => ({}),
  metricas: () => ({ total: 2, abertos: 2, atrasados: 1, resolvidos_semana: 0 }),
}
