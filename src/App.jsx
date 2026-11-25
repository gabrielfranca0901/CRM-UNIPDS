import { useEffect, useState } from 'react'
import { api, auth, soDigitos } from './api'
import { DEMO } from './supabase'

const STATUS = { aberto: 'Aberto', andamento: 'Em andamento', outro_setor: 'Outro setor', aguardando_revisao: 'Aguardando revisão', resolvido: 'Resolvido' }
const EXIGE_COMPRA = ['Cancelamento', 'Reembolso']

function Login({ onOk }) {
  const [email, setEmail] = useState(''), [senha, setSenha] = useState(''), [msg, setMsg] = useState('')
  const entrar = async (e) => {
    e.preventDefault()
    const { error } = await auth.entrar(email, senha)
    if (error) return setMsg('E-mail ou senha inválidos.')
    if (!(await api.isStaff())) { await auth.sair(); return setMsg('Acesso restrito ao time de suporte.') }
    onOk()
  }
  const esqueci = async () => {
    if (!email) return setMsg('Digite seu e-mail acima.')
    await auth.recuperar(email); setMsg('Se o e-mail existir, enviamos o link.')
  }
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

const plural = (n, s, p) => `${n} ${n === 1 ? s : p}`
const duracao = (ms) => {
  const h = Math.floor(Math.abs(ms) / 36e5)
  return h < 24 ? plural(Math.max(h, 1), 'hora', 'horas') : plural(Math.floor(h / 24), 'dia', 'dias')
}
const sla = (t) => {
  if (t.status === 'resolvido' || !t.slaLimite) return { txt: '—' }
  const falta = new Date(t.slaLimite) - Date.now()
  if (t.slaEstourado || falta < 0) return { txt: `estourado há ${duracao(falta)}`, late: true }
  return { txt: `vence em ${duracao(falta)}` }
}
const protocolo = (p) => (p == null ? '' : /^\d+$/.test(String(p)) ? 'TK-' + String(p).padStart(6, '0') : String(p))
const dataHora = (d) => (d ? new Date(d).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '')
const prazoTxt = (horas) => (horas == null ? '' : horas % 24 === 0 ? plural(horas / 24, 'dia', 'dias') : plural(horas, 'hora', 'horas'))

function Fila({ abrir }) {
  const [f, setF] = useState({ status: '', categoria: '', responsavel: '', busca: '' })
  const [lista, setLista] = useState([]), [cats, setCats] = useState([]), [staff, setStaff] = useState([]), [erro, setErro] = useState('')
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const carregar = () => { setErro(''); return api.tickets(f).then(setLista).catch((e) => setErro(e.message)) }
  useEffect(() => { api.categorias().then(setCats).catch(() => {}); api.staff().then(setStaff).catch(() => {}) }, [])
  useEffect(() => { const t = setTimeout(carregar, 300); return () => clearTimeout(t) }, [f])
  return (
    <>
      <div className="top">
        <h1 className="t">Tickets</h1>
        <input placeholder="protocolo, CPF inteiro ou nome" value={f.busca} onChange={set('busca')} />
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
              <td><div className="nome">{t.alunoNome}</div><div className="sub">{t.doc}</div></td>
              <td><div className="sub">{t.bu}</div>{t.produto}</td>
              <td>{t.categoria}{t.tag && <div className="sub">{t.tag}</div>}</td>
              <td><span className={`badge b-${t.status}`}>{STATUS[t.status] || t.status}</span></td>
              <td>{t.responsavel || '—'}</td>
              <td>{s.txt}</td>
            </tr>
          )
        })}</tbody>
      </table>
      {!erro && lista.length === 0 && <p className="sub">Nenhum ticket encontrado.</p>}
    </>
  )
}

function Ticket({ id, voltar }) {
  const [t, setT] = useState(null), [staff, setStaff] = useState([]), [nota, setNota] = useState(''), [erro, setErro] = useState('')
  const carregar = () => api.ticket(id).then(setT).catch((e) => setErro(e.message))
  useEffect(() => { carregar(); api.staff().then(setStaff).catch(() => {}) }, [id])
  const agir = (fn) => { setErro(''); return fn().then(carregar).catch((e) => setErro(e.message)) }
  const mudarResponsavel = (v) => agir(() => api.atualizar(id, v ? { responsavel: v } : { limparResponsavel: true }))
  if (!t) return <p>{erro || 'Carregando…'}</p>
  const s = sla(t)
  return (
    <div className="card">
      <button className="link" onClick={voltar}>← Voltar</button>
      <h2>{protocolo(t.protocolo)} · {t.categoria}</h2>
      <p><b>{t.alunoNome}</b> {t.doc && <span className="sub">{t.doc}</span>}<br />{t.produto}</p>
      <p className={s.late ? 'msg' : 'sub'}>SLA: {s.txt}</p>
      {t.descricao && <p>{t.descricao}</p>}
      <div className="row">
        <label>Status <select value={t.status} onChange={(e) => agir(() => api.atualizar(id, { status: e.target.value }))}>
          {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
        <label>Responsável <select value={t.responsavelId || ''} onChange={(e) => mudarResponsavel(e.target.value)}>
          <option value="">—</option>{staff.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}</select></label>
      </div>
      {t.checklist.length > 0 && <h3>Checklist</h3>}
      {t.checklist.map((i) => (
        <label key={i.ordem} className="check"><input type="checkbox" checked={i.marcado} onChange={(e) => agir(() => api.marcar(id, i.ordem, e.target.checked))} /> {i.texto}</label>
      ))}
      <h3>Histórico</h3>
      {t.historico.length === 0 && <p className="sub">Sem eventos.</p>}
      {t.historico.map((e, k) => (
        <p key={k} className="nota"><span className="sub">{dataHora(e.quando)} · {e.quem} {e.tipo && `· ${e.tipo}`}</span>{e.texto && <><br />{e.texto}</>}</p>
      ))}
      <textarea value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Nova nota interna" />
      <button disabled={!nota.trim()} onClick={() => agir(async () => { await api.nota(id, nota.trim()); setNota('') })}>Adicionar nota</button>
      {erro && <p className="msg">{erro}</p>}
    </div>
  )
}

function Novo({ pronto }) {
  const [doc, setDoc] = useState(''), [compras, setCompras] = useState(null), [cats, setCats] = useState([]), [staff, setStaff] = useState([])
  const [d, setD] = useState({ compra: '', categoria: '', responsavel: '', tag: '', descricao: '' }), [erro, setErro] = useState(''), [salvando, setSalvando] = useState(false)
  useEffect(() => {
    api.categorias().then((c) => { setCats(c); setD((x) => ({ ...x, categoria: c[0]?.nome || '' })) }).catch((e) => setErro(e.message))
    api.staff().then(setStaff).catch(() => {})
  }, [])
  const set = (k) => (e) => setD({ ...d, [k]: e.target.value })
  const buscar = (v) => {
    setDoc(v); setCompras(null); setErro(''); setD((x) => ({ ...x, compra: '' }))
    const n = soDigitos(v).length
    if (n === 11 || n === 14) api.buscarAluno(v).then(setCompras).catch((e) => setErro(e.message))
  }
  const compra = compras?.find((c) => c.chave === d.compra)
  const alunosDistintos = [...new Set((compras || []).map((c) => c.studentId))]
  const studentId = compra?.studentId || (alunosDistintos.length === 1 ? alunosDistintos[0] : null)
  const exigeCompra = EXIGE_COMPRA.includes(d.categoria)
  const podeAbrir = studentId && (!exigeCompra || compra) && d.descricao.trim() && !salvando
  const prazo = cats.find((c) => c.nome === d.categoria)?.prazoHoras
  const salvar = () => {
    setSalvando(true); setErro('')
    api.abrir({ studentId, categoria: d.categoria, descricao: d.descricao.trim(), productId: compra?.productId, contractId: compra?.contractId, tag: d.tag, responsavel: d.responsavel })
      .then(pronto).catch((e) => setErro(e.message)).finally(() => setSalvando(false))
  }
  return (
    <>
      <h1 className="t">Novo ticket</h1>
      <div className="card form">
        <label>CPF ou CNPJ do aluno (completo)
          <input placeholder="000.000.000-00" value={doc} onChange={(e) => buscar(e.target.value)} />
        </label>
        {compras && compras.length === 0 && <p className="msg">Nenhuma compra encontrada para esse documento.</p>}
        {compras && compras.length > 0 && <label>{alunosDistintos.length === 1 ? compras[0].alunoNome : 'Aluno e compra'}
          <select value={d.compra} onChange={set('compra')}>
            <option value="">{exigeCompra ? 'Escolha a compra' : 'Sem compra específica'}</option>
            {compras.map((c) => <option key={c.chave} value={c.chave}>
              {alunosDistintos.length > 1 ? `${c.alunoNome} · ` : ''}{c.produto}{c.parcelas != null ? ` (${c.pagas ?? 0}/${c.parcelas} pagas)` : ''}
            </option>)}
          </select>
        </label>}
        <div className="row">
          <label>Categoria
            <select value={d.categoria} onChange={set('categoria')}>{cats.map((c) => <option key={c.nome}>{c.nome}</option>)}</select>
            <small>SLA: {prazoTxt(prazo)} a partir da abertura{exigeCompra ? ' · exige a compra' : ''}</small>
          </label>
          <label>Responsável (opcional)
            <select value={d.responsavel} onChange={set('responsavel')}>
              <option value="">—</option>{staff.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
            </select>
          </label>
        </div>
        <label>Tag (opcional)<input placeholder="ex.: 2ª via, urgente" value={d.tag} onChange={set('tag')} /></label>
        <label>Descrição<textarea placeholder="o que o aluno pediu, o que já foi feito" value={d.descricao} onChange={set('descricao')} /></label>
        <div><button className="btn" disabled={!podeAbrir} onClick={salvar}>{salvando ? 'Abrindo…' : 'Abrir ticket'}</button>
          {!studentId && <small> Busque o aluno pelo CPF/CNPJ{alunosDistintos.length > 1 ? ' e escolha a compra' : ''}.</small>}
          {studentId && exigeCompra && !compra && <small> Escolha a compra.</small>}</div>
        {erro && <p className="msg">{erro}</p>}
      </div>
    </>
  )
}

function Alunos() {
  const [f, setF] = useState({ bu: '', busca: '', pagina: 1 }), [r, setR] = useState({ total: 0, itens: [] }), [bus, setBus] = useState([]), [erro, setErro] = useState('')
  useEffect(() => { api.bus().then(setBus).catch(() => {}) }, [])
  useEffect(() => { const t = setTimeout(() => { setErro(''); api.alunos(f).then(setR).catch((e) => setErro(e.message)) }, 300); return () => clearTimeout(t) }, [f])
  const paginas = Math.max(1, Math.ceil(r.total / 50))
  return (
    <>
      <div className="top">
        <h1 className="t">Alunos</h1>
        <input placeholder="nome ou CPF" value={f.busca} onChange={(e) => setF({ ...f, busca: e.target.value, pagina: 1 })} />
        <select value={f.bu} onChange={(e) => setF({ ...f, bu: e.target.value, pagina: 1 })}>
          <option value="">todas as BUs</option>{bus.map((b) => <option key={b.id} value={b.id}>{b.nome}</option>)}
        </select>
      </div>
      {erro && <p className="msg">{erro}</p>}
      <table>
        <thead><tr><th>Aluno</th><th>BU</th><th>UF</th><th>Produtos</th><th>Parcelas</th><th>Vencidas</th><th>Tickets abertos</th></tr></thead>
        <tbody className="estatico">{r.itens.map((a) => (
          <tr key={a.id}>
            <td><div>{a.nome}</div><div className="sub">{a.cpf}</div></td>
            <td>{a.bu}</td><td>{a.uf}</td><td>{a.produtos}</td>
            <td>{a.pagas}/{a.parcelas}</td><td className={a.vencidas > 0 ? 'msg' : ''}>{a.vencidas}</td><td>{a.ticketsAbertos}</td>
          </tr>
        ))}</tbody>
      </table>
      <div className="top pag">
        <span className="sub">{r.total} alunos · página {f.pagina} de {paginas}</span>
        <button disabled={f.pagina <= 1} onClick={() => setF({ ...f, pagina: f.pagina - 1 })}>‹</button>
        <button disabled={f.pagina >= paginas} onClick={() => setF({ ...f, pagina: f.pagina + 1 })}>›</button>
      </div>
    </>
  )
}

function Dashboard() {
  const [m, setM] = useState(null), [erro, setErro] = useState('')
  useEffect(() => { api.metricas().then(setM).catch((e) => setErro(e.message)) }, [])
  if (!m) return <p className={erro ? 'msg' : ''}>{erro || 'Carregando…'}</p>
  return <div className="metricas">{[['Total', m.total], ['Abertos', m.abertos], ['Atrasados', m.atrasados], ['Resolvidos na semana', m.resolvidosSemana]].map(([k, v]) => <div className="card" key={k}><b>{v}</b><span>{k}</span></div>)}</div>
}

export default function App() {
  const [logado, setLogado] = useState(null), [aba, setAba] = useState('tickets'), [aberto, setAberto] = useState(null), [eu, setEu] = useState(null)
  useEffect(() => { auth.sessao().then((s) => setLogado(!!s)) }, [])
  useEffect(() => { if (logado) api.eu().then(setEu).catch(() => {}) }, [logado])
  if (logado === null) return null
  if (!logado) return <Login onOk={() => setLogado(true)} />
  return (
    <div className="app">
      <aside>
        <div className="brand"><small>UNIPDS</small><b>Central de Atendimento</b></div>
        {[['tickets', 'Tickets'], ['novo', 'Novo ticket'], ['alunos', 'Alunos'], ['dashboard', 'Dashboard']].map(([a, n]) =>
          <button key={a} className={aba === a ? 'on' : ''} onClick={() => { setAba(a); setAberto(null) }}>{n}</button>)}
        <button onClick={() => { auth.sair(); setLogado(false) }}>Sair</button>
        {eu && <span className="eu">{eu.nome}</span>}
        {DEMO && <span className="demo">modo demo</span>}
      </aside>
      <main>
        {aba === 'tickets' && (aberto ? <Ticket id={aberto} voltar={() => setAberto(null)} /> : <Fila abrir={setAberto} />)}
        {aba === 'novo' && <Novo pronto={() => setAba('tickets')} />}
        {aba === 'alunos' && <Alunos />}
        {aba === 'dashboard' && <Dashboard />}
      </main>
    </div>
  )
}
