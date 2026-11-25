// Converte o que as funções do schema `suporte` devolvem no formato que as telas usam.
// Os nomes dos campos seguem a passagem do banco de 24/11/2026 (suporte-passagem-crm).
// Onde a passagem não detalhou o campo (retornos em jsonb e as colunas de buscar_aluno),
// aceitamos mais de um nome possível. Se algo vier vazio na tela, ajuste só aqui.

const pick = (o, ...keys) => {
  if (!o) return undefined
  for (const k of keys) if (o[k] !== undefined && o[k] !== null) return o[k]
  return undefined
}
const lista = (x) => (Array.isArray(x) ? x : x ? [x] : [])
const umaLinha = (x) => (Array.isArray(x) ? x[0] : x) || null

export const categorias = (rows) =>
  lista(rows)
    .filter((c) => c.ativo !== false)
    .sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0))
    .map((c) => ({ nome: c.tipo, prazoHoras: c.prazo_horas }))

export const staff = (rows) =>
  lista(rows).filter((s) => s.ativo !== false).map((s) => ({ id: s.user_id, nome: s.nome }))

export const eu = (x) => {
  const r = umaLinha(x)
  return r && { id: r.user_id, nome: r.nome, email: r.email }
}

export const bus = (rows) => lista(rows).map((b) => ({ id: b.tenant_id, nome: b.nome }))

export const ticketDaFila = (t) => ({
  id: t.ticket_id,
  protocolo: t.protocolo,
  status: t.status,
  categoria: t.tipo,
  tag: t.tag,
  bu: t.tenant_nome,
  produto: t.produto_nome,
  alunoNome: t.aluno_nome,
  doc: t.cpf_cnpj,
  responsavelId: t.responsavel,
  responsavel: t.responsavel_nome,
  criadoEm: t.criado_em,
  slaLimite: t.sla_limite,
  slaEstourado: t.sla_estourado,
  resolvidoEm: t.resolvido_em,
})
export const fila = (rows) => lista(rows).map(ticketDaFila)

// ver_ticket devolve jsonb com ticket, aluno, compra, card, checklist e histórico.
export const ticket = (j) => {
  if (!j) return null
  const t = pick(j, 'ticket') || j
  const aluno = pick(j, 'aluno') || {}
  const compra = pick(j, 'compra') || {}
  const historico = lista(pick(j, 'historico', 'eventos', 'historia'))
  return {
    id: pick(t, 'ticket_id', 'id'),
    protocolo: pick(t, 'protocolo'),
    status: pick(t, 'status'),
    categoria: pick(t, 'tipo', 'categoria'),
    tag: pick(t, 'tag'),
    descricao: pick(t, 'descricao'),
    responsavelId: pick(t, 'responsavel', 'responsavel_id'),
    responsavel: pick(t, 'responsavel_nome'),
    slaLimite: pick(t, 'sla_limite'),
    resolvidoEm: pick(t, 'resolvido_em'),
    alunoNome: pick(aluno, 'nome', 'aluno_nome') ?? pick(t, 'aluno_nome'),
    doc: pick(aluno, 'cpf_cnpj', 'cpf', 'documento') ?? pick(t, 'cpf_cnpj'),
    produto: pick(compra, 'produto_nome', 'produto', 'nome') ?? pick(t, 'produto_nome'),
    card: pick(j, 'card') || null,
    checklist: lista(pick(j, 'checklist')).map((i, k) => ({
      ordem: pick(i, 'ordem') ?? k + 1,
      texto: pick(i, 'texto', 'item', 'descricao', 'titulo'),
      marcado: !!pick(i, 'marcado', 'feito', 'concluido'),
    })),
    historico: historico.map((e) => ({
      quando: pick(e, 'criado_em', 'quando', 'em', 'data'),
      quem: pick(e, 'autor_nome', 'quem', 'por', 'usuario_nome', 'criado_por_nome'),
      tipo: pick(e, 'tipo', 'evento', 'acao'),
      texto: pick(e, 'nota', 'texto', 'descricao', 'detalhe'),
    })),
  }
}

// buscar_aluno devolve uma linha por compra.
export const compras = (rows) =>
  lista(rows).map((r, k) => ({
    chave: String(k),
    studentId: pick(r, 'student_id', 'aluno_id'),
    alunoNome: pick(r, 'aluno_nome', 'aluno', 'nome'),
    comprador: pick(r, 'comprador_nome', 'comprador'),
    productId: pick(r, 'product_id', 'produto_id'),
    produto: pick(r, 'produto_nome', 'produto'),
    contractId: pick(r, 'contract_id', 'contrato_id'),
    parcelas: pick(r, 'parcelas'),
    pagas: pick(r, 'pagas'),
    meio: pick(r, 'meio_pagamento', 'meio_de_pagamento'),
    naCarteira: pick(r, 'na_carteira', 'carteira'),
  }))

export const alunos = (rows) => {
  const l = lista(rows)
  return {
    total: l[0]?.total ?? 0,
    itens: l.map((a) => ({
      id: a.student_id, bu: a.tenant_nome, nome: a.nome, cpf: a.cpf_mascarado, uf: a.uf,
      ingresso: a.ingresso, produtos: a.produtos, parcelas: a.parcelas, pagas: a.pagas,
      abertas: a.abertas, vencidas: a.vencidas, valorPago: a.valor_pago, ticketsAbertos: a.tickets_abertos,
    })),
  }
}

export const metricas = (j) => ({
  total: pick(j, 'total') ?? 0,
  abertos: pick(j, 'abertos') ?? 0,
  atrasados: pick(j, 'atrasados') ?? 0,
  resolvidosSemana: pick(j, 'resolvidos_semana', 'resolvidos_na_semana') ?? 0,
})
