import { useEffect, useState } from 'react'
import { api, auth } from './api'
import { DEMO } from './supabase'

const STATUS = { aberto: 'Aberto', andamento: 'Em andamento', outro_setor: 'Outro setor', aguardando_revisao: 'Aguardando revisão', resolvido: 'Resolvido' }

function Login({ onOk }) {
  const [email, setEmail] = useState(''), [senha, setSenha] = useState(''), [msg, setMsg] = useState('')
  const entrar = async (e) => {
    e.preventDefault()
    const { error } = await auth.entrar(email, senha)
    if (error) return setMsg('E-mail ou senha inválidos.')
    if (!(await api.isStaff())) { await auth.sair(); return setMsg('Acesso restrito ao time de suporte.') }
    onOk()
  }
  const esqueci = async () => { await auth.recuperar(email); setMsg('Se o e-mail existir, enviamos o link.') }
  return (
    <form className="card login" onSubmit={entrar}>
      <h1>Central de Atendimento</h1>
      <input placeholder="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} />
      <input placeholder="Senha" type="password" value={senha} onChange={(e) => setSenha(e.target.value)} />
      <button>Entrar</button>
      <button type="button" className="link" onClick={esqueci}>Esqueci minha senha</button>
      {msg && <p className="msg">{msg}</p>}
    </form>
  )
}

const sla = (t) => {
  if (t.status === 'resolvido' || !t.prazo) return { txt: '—' }
  const d = Math.floor((Date.now() - new Date(t.prazo)) / 864e5)
  if (d > 0) return { txt: `estourado há ${d} dia${d > 1 ? 's' : ''}`, late: true }
  return { txt: d === 0 ? 'vence hoje' : `vence em ${-d} dia${d < -1 ? 's' : ''}` }
}
const protocolo = (n) => 'TK-' + String(n).padStart(6, '0')

function Fila({ abrir }) {
  const [f, setF] = useState({ status: '', categoria: '', responsavel: '', busca: '' })
  const [lista, setLista] = useState([]), [cats, setCats] = useState([]), [staff, setStaff] = useState([]), [erro, setErro] = useState('')
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const carregar = () => api.tickets(f).then(setLista).catch((e) => setErro(e.message))
  useEffect(() => { api.categorias().then(setCats); api.staff().then(setStaff) }, [])
  useEffect(() => { carregar() }, [f])
  return (
    <>
      <div className="top">
        <h1 className="t">Tickets</h1>
        <input placeholder="nome, CPF ou protocolo" value={f.busca} onChange={set('busca')} />
        <select value={f.status} onChange={set('status')}>
          <option value="">todos os status</option>
          {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select value={f.categoria} onChange={set('categoria')}>
          <option value="">todas as categorias</option>
          {cats.map((c) => <option key={c.nome}>{c.nome}</option>)}
        </select>
        <select value={f.responsavel} onChange={set('responsavel')}>
          <option value="">qualquer responsável</option>
          {staff.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
        </select>
        <button className="link" onClick={carregar}>atualizar</button>
      </div>
      {erro && <p className="msg">{erro}</p>}
      <table>
        <thead><tr><th>Protocolo</th><th>Aluno</th><th>BU · Produto</th><th>Categoria</th><th>Status</th><th>Responsável</th><th>SLA</th></tr></thead>
        <tbody>{lista.map((t) => {
          const s = sla(t)
          return (
            <tr key={t.id} className={s.late ? 'late' : ''} onClick={() => abrir(t.id)}>
              <td className="proto">{protocolo(t.protocolo)}</td>
              <td><div className="nome">{t.aluno_nome}</div><div className="sub">{t.aluno_cpf}</div></td>
              <td><div className="sub">{t.bu}</div>{t.produto}</td>
              <td>{t.categoria}</td>
              <td><span className={`badge b-${t.status}`}>{STATUS[t.status]}</span></td>
              <td>{t.responsavel || '—'}</td>
              <td>{s.txt}</td>
            </tr>
          )
        })}</tbody>
      </table>
    </>
  )
}

function Ticket({ id, voltar }) {
  const [t, setT] = useState(null), [nota, setNota] = useState(''), [erro, setErro] = useState('')
  const carregar = () => api.ticket(id).then(setT).catch((e) => setErro(e.message))
  useEffect(() => { carregar() }, [id])
  const agir = (fn) => fn().then(carregar).catch((e) => setErro(e.message))
  if (!t) return <p>{erro || 'Carregando…'}</p>
  return (
    <div className="card">
      <button className="link" onClick={voltar}>← Voltar</button>
      <h2>Ticket {t.protocolo} · {t.categoria}</h2>
      <p>{t.aluno_nome}</p><p>{t.descricao}</p>
      <label>Status <select value={t.status} onChange={(e) => agir(() => api.atualizar(id, { p_status: e.target.value }))}>
        {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
      <h3>Checklist</h3>
      {(t.checklist || []).map((i) => (
        <label key={i.id} className="check"><input type="checkbox" checked={!!i.marcado} onChange={(e) => agir(() => api.marcar(i.id, e.target.checked))} /> {i.texto}</label>
      ))}
      <h3>Notas</h3>
      {(t.notas || []).map((n, k) => <p key={k} className="nota">{n.texto}</p>)}
      <textarea value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Nova nota" />
      <button onClick={() => agir(async () => { await api.nota(id, nota); setNota('') })}>Adicionar nota</button>
      {erro && <p className="msg">{erro}</p>}
    </div>
  )
}

function Novo({ pronto }) {
  const [cpf, setCpf] = useState(''), [aluno, setAluno] = useState(null), [cats, setCats] = useState([]), [staff, setStaff] = useState([])
  const [d, setD] = useState({ compra: '', categoria: '', responsavel: '', tag: '', descricao: '' }), [erro, setErro] = useState('')
  useEffect(() => { api.categorias().then((c) => { setCats(c); setD((x) => ({ ...x, categoria: c[0]?.nome || '' })) }); api.staff().then(setStaff) }, [])
  const set = (k) => (e) => setD({ ...d, [k]: e.target.value })
  const buscar = (v) => { setCpf(v); setAluno(null); if (v.replace(/\D/g, '').length >= 11) api.buscarAluno(v).then(setAluno).catch((e) => setErro(e.message)) }
  const prazo = cats.find((c) => c.nome === d.categoria)?.prazo
  const salvar = () => api.abrir({ p_cpf: cpf, p_compra: d.compra, p_categoria: d.categoria, p_responsavel: d.responsavel || null, p_tag: d.tag || null, p_descricao: d.descricao }).then(pronto).catch((e) => setErro(e.message))
  return (
    <>
      <h1 className="t">Novo ticket</h1>
      <div className="card form">
        <label>CPF ou CNPJ do aluno
          <input placeholder="000.000.000-00" value={cpf} onChange={(e) => buscar(e.target.value)} />
        </label>
        {aluno && <label>{aluno.nome}
          <select value={d.compra} onChange={set('compra')}>
            <option value="">Escolha a compra</option>
            {aluno.compras.map((c) => <option key={c.id} value={c.id}>{c.produto} ({c.parcelas})</option>)}
          </select>
        </label>}
        <div className="row">
          <label>Categoria
            <select value={d.categoria} onChange={set('categoria')}>{cats.map((c) => <option key={c.nome}>{c.nome}</option>)}</select>
            <small>SLA: {prazo} dias a partir da abertura</small>
          </label>
          <label>Responsável (opcional)
            <select value={d.responsavel} onChange={set('responsavel')}>
              <option value="">—</option>{staff.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
            </select>
          </label>
        </div>
        <label>Tag (opcional)<input placeholder="ex.: 2ª via, urgente" value={d.tag} onChange={set('tag')} /></label>
        <label>Descrição<textarea placeholder="o que o aluno pediu, o que já foi feito" value={d.descricao} onChange={set('descricao')} /></label>
        <div><button className="btn" disabled={!d.compra} onClick={salvar}>Abrir ticket</button>
          {!d.compra && <small> Escolha o aluno/compra para abrir.</small>}</div>
        {erro && <p className="msg">{erro}</p>}
      </div>
    </>
  )
}

function Dashboard() {
  const [m, setM] = useState(null)
  useEffect(() => { api.metricas().then(setM) }, [])
  if (!m) return <p>Carregando…</p>
  return <div className="metricas">{[['Total', m.total], ['Abertos', m.abertos], ['Atrasados', m.atrasados], ['Resolvidos na semana', m.resolvidos_semana]].map(([k, v]) => <div className="card" key={k}><b>{v}</b><span>{k}</span></div>)}</div>
}

export default function App() {
  const [logado, setLogado] = useState(null), [aba, setAba] = useState('tickets'), [aberto, setAberto] = useState(null)
  useEffect(() => { auth.sessao().then((s) => setLogado(!!s)) }, [])
  if (logado === null) return null
  if (!logado) return <Login onOk={() => setLogado(true)} />
    return (
    <div className="app">
      <aside>
        <div className="brand"><small>UNIPDS</small><b>Central de Atendimento</b></div>
        {[['tickets', 'Tickets'], ['novo', 'Novo ticket'], ['alunos', 'Alunos'], ['dashboard', 'Dashboard']].map(([a, n]) =>
          <button key={a} className={aba === a ? 'on' : ''} onClick={() => { setAba(a); setAberto(null) }}>{n}</button>)}
        <button onClick={() => { auth.sair(); setLogado(false) }}>Sair</button>
        {DEMO && <span className="demo">modo demo</span>}
      </aside>
      <main>
        {aba === 'tickets' && (aberto ? <Ticket id={aberto} voltar={() => setAberto(null)} /> : <Fila abrir={setAberto} />)}
        {aba === 'novo' && <Novo pronto={() => setAba('tickets')} />}
        {aba === 'alunos' && <p>Em construção.</p>}
        {aba === 'dashboard' && <Dashboard />}
      </main>
    </div>
  )
}
