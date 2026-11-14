// ÚNICA porta para o banco: toda leitura/escrita é função do schema `suporte`.
// ATENÇÃO: os nomes dos parâmetros (p_*) e dos campos retornados são suposições.
// Confira em unipds-banco/docs/banco/schema-suporte.md e ajuste só aqui.
import { supabase, DEMO } from './supabase'

const cats = [
  { nome: 'Cancelamento', prazo: 1 }, { nome: 'Reembolso', prazo: 1 },
  { nome: 'Nota fiscal', prazo: 3 }, { nome: 'Documentos e declarações', prazo: 3 }, { nome: 'Outros', prazo: 7 },
]
const demoTickets = [
  { id: 1, protocolo: 70, status: 'aberto', categoria: 'Reembolso', aluno_nome: 'Aluno Exemplo', responsavel: 'Analista Demo', prazo: '2026-11-15' },
  { id: 2, protocolo: 71, status: 'andamento', categoria: 'Nota fiscal', aluno_nome: 'Outra Aluna', responsavel: 'Analista Demo', prazo: '2026-11-17' },
]
const demo = {
  is_staff: () => true,
  eu: () => ({ nome: 'Analista Demo' }),
  listar_categorias: () => cats,
  listar_staff: () => [{ id: 'demo', nome: 'Analista Demo' }],
  listar_tickets: () => demoTickets,
  ver_ticket: () => ({ ...demoTickets[0], descricao: 'Pedido de exemplo.', notas: [], checklist: [{ id: 1, texto: 'Confirmar pagamento', marcado: false }] }),
  buscar_aluno: () => ({ nome: 'Aluno Exemplo', compras: [{ id: 'c1', produto: 'Java + IA', parcelas: '2/12' }] }),
  metricas: () => ({ total: 2, abertos: 2, atrasados: 0, resolvidos_semana: 0 }),
}

async function rpc(fn, args = {}) {
  if (DEMO) return demo[fn] ? demo[fn](args) : null
  const { data, error } = await supabase.rpc(fn, args)
  if (error) throw new Error(error.message)
  return data
}

export const api = {
  isStaff: () => rpc('is_staff'),
  eu: () => rpc('eu'),
  staff: () => rpc('listar_staff'),
  categorias: () => rpc('listar_categorias'),
  tickets: (f) => rpc('listar_tickets', { p_status: f.status || null, p_categoria: f.categoria || null, p_busca: f.busca || null }),
  ticket: (id) => rpc('ver_ticket', { p_ticket: id }),
  atualizar: (id, campos) => rpc('atualizar_ticket', { p_ticket: id, ...campos }),
  nota: (id, texto) => rpc('adicionar_nota', { p_ticket: id, p_texto: texto }),
  marcar: (item, marcado) => rpc('marcar_checklist', { p_item: item, p_marcado: marcado }),
  buscarAluno: (cpf) => rpc('buscar_aluno', { p_cpf: cpf }),
  abrir: (d) => rpc('abrir_ticket', d),
  metricas: () => rpc('metricas'),
}

export const auth = {
  sessao: async () => (DEMO ? { user: { email: 'demo' } } : (await supabase.auth.getSession()).data.session),
  entrar: (email, password) => supabase.auth.signInWithPassword({ email, password }),
  sair: () => supabase?.auth.signOut(),
  recuperar: (email) => supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin }),
}
