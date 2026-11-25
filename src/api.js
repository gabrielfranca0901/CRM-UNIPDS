// ÚNICA porta para o banco: toda leitura/escrita é função (RPC) do schema `suporte`.
// Parâmetros conforme a passagem do banco de 24/11/2026.
import { supabase, DEMO } from './supabase'
import * as N from './normalizar'
import { demo } from './demo'

async function rpc(fn, args = {}) {
  if (DEMO) return demo[fn] ? demo[fn](args) : null
  const { data, error } = await supabase.rpc(fn, args)
  if (error) throw new Error(error.code === '42501' ? 'Sem acesso: seu usuário não está ativo no time de suporte.' : error.message)
  return data
}

export const soDigitos = (v) => String(v || '').replace(/\D/g, '')

export const api = {
  isStaff: () => rpc('is_staff'),
  eu: () => rpc('eu').then(N.eu),
  staff: () => rpc('listar_staff').then(N.staff),
  categorias: () => rpc('listar_categorias').then(N.categorias),
  bus: () => rpc('listar_bus').then(N.bus),

  tickets: (f) => rpc('listar_tickets', {
    p_status: f.status || null,
    p_tipo: f.categoria || null,
    p_responsavel: f.responsavel || null,
    p_busca: f.busca?.trim() || null,
  }).then(N.fila),
  ticket: (id) => rpc('ver_ticket', { p_ticket_id: id }).then(N.ticket),

  // null = não mexe naquele campo
  atualizar: (id, { status = null, tag = null, responsavel = null, limparResponsavel = false }) =>
    rpc('atualizar_ticket', { p_ticket_id: id, p_status: status, p_tag: tag, p_responsavel: responsavel, p_limpar_responsavel: limparResponsavel }),
  nota: (id, texto) => rpc('adicionar_nota', { p_ticket_id: id, p_nota: texto }),
  marcar: (id, ordem, marcado) => rpc('marcar_checklist', { p_ticket_id: id, p_ordem: ordem, p_marcado: marcado }),

  // CPF (11) ou CNPJ (14) inteiro, só dígitos
  buscarAluno: (doc) => rpc('buscar_aluno', { p_doc: soDigitos(doc) }).then(N.compras),
  alunos: (f) => rpc('listar_alunos', {
    p_tenant: f.bu || null, p_situacao: null, p_busca: f.busca?.trim() || null, p_pagina: f.pagina || 1, p_tamanho: 50,
  }).then(N.alunos),

  abrir: (d) => rpc('abrir_ticket', {
    p_student_id: d.studentId,
    p_tipo: d.categoria,
    p_descricao: d.descricao,
    p_product_id: d.productId || null,
    p_contract_id: d.contractId || null,
    p_charge_id: null,
    p_tag: d.tag || null,
    p_responsavel: d.responsavel || null,
    p_card: null,
  }),
  metricas: () => rpc('metricas').then(N.metricas),
}

export const auth = {
  sessao: async () => (DEMO ? { user: { email: 'demo' } } : (await supabase.auth.getSession()).data.session),
  entrar: (email, password) => (DEMO ? { error: null } : supabase.auth.signInWithPassword({ email, password })),
  sair: () => supabase?.auth.signOut(),
  recuperar: (email) => supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin }),
}
