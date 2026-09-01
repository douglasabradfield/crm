import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../store/auth.js';
import { supabase } from '../services/supabase.js';
import SkeletonLoader from '../components/UI/SkeletonLoader.jsx';
import {
  Camera, Briefcase, Play, AtSign, TrendingUp, TrendingDown,
  Users, Heart, MessageCircle, Eye, Share2, Plus, Bot,
  X, BarChart2, Zap, Calendar, Globe, Music, Link2, Trash2,
} from 'lucide-react';
import { useUI } from '../store/index.js';
import PermissionGate from '../components/Auth/PermissionGate.jsx';

/* ─── Data ───────────────────────────────────────────────────────────────────── */
// Catálogo de plataformas conhecidas — só ícone/cor/rótulo (sem métricas fixas).
// Métricas reais vêm das contas que o usuário cadastrar (redes_contas / redes_metricas).
const PLATAFORMAS = [
  { id: 'instagram', label: 'Instagram', Icon: Camera,    color: '--purple', bg: 'rgba(176,110,245,0.12)' },
  { id: 'facebook',  label: 'Facebook',  Icon: Globe,     color: '--accent', bg: 'rgba(91,110,245,0.12)'  },
  { id: 'linkedin',  label: 'LinkedIn',  Icon: Briefcase, color: '--teal',   bg: 'rgba(56,201,224,0.12)'  },
  { id: 'youtube',   label: 'YouTube',   Icon: Play,      color: '--red',    bg: 'rgba(240,92,92,0.12)'   },
  { id: 'tiktok',    label: 'TikTok',    Icon: Music,     color: '--green',  bg: 'rgba(45,212,160,0.12)'  },
  { id: 'twitter',   label: 'X / Twitter', Icon: AtSign,  color: '--text2',  bg: 'rgba(148,152,176,0.12)' },
];

function platformCfg(id) {
  return PLATAFORMAS.find((p) => p.id === id) || PLATAFORMAS[0];
}

const POST_STATUS = {
  publicado: { label: 'Publicado',  bg: 'rgba(45,212,160,0.15)',  color: 'var(--green)' },
  agendado:  { label: 'Agendado',   bg: 'rgba(91,110,245,0.15)',  color: 'var(--accent2)' },
  rascunho:  { label: 'Rascunho',   bg: 'rgba(148,152,176,0.12)', color: 'var(--text3)' },
  ideia:     { label: 'Ideia',      bg: 'rgba(240,168,50,0.15)',  color: 'var(--amber)' },
};

const FORMATOS = ['Feed', 'Stories', 'Reels', 'Carrossel', 'Vídeo', 'Artigo', 'Thread', 'Documento', 'Tweet', 'Shorts'];

/* ─── Helpers & mappers ──────────────────────────────────────────────────────── */
const MONTH_NAMES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function dateToISO(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function monthLabel(year, month) {
  return `${MONTH_NAMES[month]} ${year}`;
}

function pctChange(curr, prev) {
  if (curr == null || prev == null || prev === 0) return null;
  return ((curr - prev) / prev) * 100;
}

function fmtNum(v) {
  return v == null || v === '' ? '—' : Number(v).toLocaleString('pt-BR');
}

function postFromRow(r) {
  const met = r.metricas ?? {};
  return {
    id: r.id,
    data: r.data,
    redes: r.redes ?? [],
    titulo: r.titulo ?? '',
    status: r.status ?? 'ideia',
    formato: r.formato ?? 'Feed',
    conteudo: r.conteudo ?? '',
    imagemUrl: r.imagem_url ?? null,
    metricas: { alcance: met.alcance ?? '', curtidas: met.curtidas ?? '', comentarios: met.comentarios ?? '' },
    horario: r.hora ?? met.horario ?? '12:00',
  };
}

function postToRow(p) {
  return {
    data: p.data,
    redes: p.redes ?? [],
    titulo: p.titulo ?? '',
    status: p.status ?? 'ideia',
    formato: p.formato ?? 'Feed',
    conteudo: p.conteudo ?? '',
    imagem_url: p.imagemUrl ?? null,
    hora: p.horario ?? '12:00',
    metricas: {
      alcance: p.metricas?.alcance ?? '',
      curtidas: p.metricas?.curtidas ?? '',
      comentarios: p.metricas?.comentarios ?? '',
    },
  };
}

function contaFromRow(r) {
  return {
    id: r.id,
    plataforma: r.plataforma,
    nome: r.nome ?? '',
    handle: r.handle ?? '',
    metaSeguidores: r.meta_seguidores ?? null,
  };
}

function contaToRow(c) {
  return {
    plataforma: c.plataforma,
    nome: c.nome ?? '',
    handle: c.handle ?? '',
    meta_seguidores: c.metaSeguidores === '' || c.metaSeguidores == null ? null : Number(c.metaSeguidores),
  };
}

function metricaFromRow(r) {
  return {
    id: r.id,
    contaId: r.conta_id,
    dataReferencia: r.data_referencia,
    seguidores: r.seguidores,
    alcance: r.alcance,
    impressoes: r.impressoes,
    engajamento: r.engajamento,
    postsPublicados: r.posts_publicados,
    criadoEm: r.criado_em,
  };
}

function metricaToRow(m, contaId) {
  const n = (v) => (v === '' || v == null ? null : Number(v));
  return {
    conta_id: contaId,
    data_referencia: m.dataReferencia || todayISO(),
    seguidores: n(m.seguidores),
    alcance: n(m.alcance),
    impressoes: n(m.impressoes),
    engajamento: n(m.engajamento),
    posts_publicados: n(m.postsPublicados),
  };
}

/* ─── Components ─────────────────────────────────────────────────────────────── */
function MiniBar({ value, max, color }) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  return (
    <div style={{ height: 4, borderRadius: 4, background: 'var(--bg4)', overflow: 'hidden', flex: 1 }}>
      <div style={{ width: `${pct}%`, height: '100%', background: `var(${color})`, borderRadius: 4, transition: 'width .4s' }} />
    </div>
  );
}

function RedeCard({ conta, latest, previous, active, onClick }) {
  const cfg = platformCfg(conta.plataforma);
  const crescimento = pctChange(latest?.seguidores, previous?.seguidores);
  const isUp = crescimento == null ? null : crescimento >= 0;
  const seguidores = latest?.seguidores ?? null;
  const meta = conta.metaSeguidores;
  const segPct = seguidores != null && meta ? Math.round((seguidores / meta) * 100) : null;
  const engajamento = latest?.engajamento ?? null;

  return (
    <div onClick={onClick}
      style={{ background: active ? 'var(--bg3)' : 'var(--bg2)', border: `1px solid ${active ? `var(${cfg.color})` : 'var(--border)'}`, borderRadius: 14, padding: '18px 20px', cursor: 'pointer', transition: 'all .15s' }}
      onMouseEnter={(e) => { if (!active) e.currentTarget.style.borderColor = 'var(--border2)'; }}
      onMouseLeave={(e) => { if (!active) e.currentTarget.style.borderColor = 'var(--border)'; }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <div style={{ width: 38, height: 38, borderRadius: 10, background: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <cfg.Icon size={18} style={{ color: `var(${cfg.color})` }} />
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{conta.nome || cfg.label}</div>
          <div style={{ fontSize: 11, color: 'var(--text3)' }}>{conta.handle || cfg.label}</div>
        </div>
        {isUp !== null && (
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: isUp ? 'var(--green)' : 'var(--red)', flexShrink: 0 }}>
            {isUp ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
            {isUp ? '+' : ''}{crescimento.toFixed(1)}%
          </div>
        )}
      </div>

      {/* Seguidores */}
      <div style={{ marginBottom: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text3)', marginBottom: 4 }}>
          <span>Seguidores</span>
          <span style={{ color: 'var(--text2)' }}>{fmtNum(seguidores)}{meta ? ` / ${fmtNum(meta)}` : ''}</span>
        </div>
        {meta ? (
          <MiniBar value={seguidores ?? 0} max={meta} color={segPct >= 70 ? '--green' : '--amber'} />
        ) : (
          <div style={{ fontSize: 10, color: 'var(--text3)' }}>Sem meta definida</div>
        )}
      </div>

      {/* Engajamento */}
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
        <span style={{ color: 'var(--text3)' }}>Engajamento</span>
        <span style={{ color: 'var(--text2)', fontWeight: 500 }}>
          {engajamento == null ? '—' : `${engajamento}%`}
        </span>
      </div>
    </div>
  );
}

function RedeDetail({ conta, latest, history, onLogMetrics, onDelete }) {
  const cfg = platformCfg(conta.plataforma);
  const metrics = [
    { label: 'Alcance',      value: fmtNum(latest?.alcance),     icon: Eye,       color: '--accent2' },
    { label: 'Impressões',   value: fmtNum(latest?.impressoes),  icon: BarChart2, color: '--purple'  },
    { label: 'Engajamento',  value: latest?.engajamento == null ? '—' : `${latest.engajamento}%`, icon: Heart, color: '--red' },
    { label: 'Seguidores',   value: fmtNum(latest?.seguidores),  icon: Users,     color: '--teal'    },
  ];
  const meta = conta.metaSeguidores;
  const segPct = latest?.seguidores != null && meta ? Math.round((latest.seguidores / meta) * 100) : null;

  return (
    <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: 20, marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
        <div style={{ width: 36, height: 36, borderRadius: 9, background: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <cfg.Icon size={17} style={{ color: `var(${cfg.color})` }} />
        </div>
        <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--text)' }}>{conta.nome || cfg.label} — Detalhes</div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <PermissionGate module="redes" action="edit">
            <button onClick={onLogMetrics}
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-body)', background: 'var(--accent)', border: 'none', color: '#fff' }}>
              <Plus size={12} /> Lançar métricas do período
            </button>
          </PermissionGate>
          <PermissionGate module="redes" action="delete">
            <button onClick={onDelete} title="Remover rede"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 30, height: 30, borderRadius: 8, cursor: 'pointer', background: 'transparent', border: '1px solid var(--border2)', color: 'var(--text3)' }}>
              <Trash2 size={13} />
            </button>
          </PermissionGate>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 18 }}>
        {metrics.map(({ label, value, icon: Icon, color }) => (
          <div key={label} style={{ background: 'var(--bg3)', borderRadius: 10, padding: '12px 14px', textAlign: 'center' }}>
            <Icon size={14} style={{ color: `var(${color})`, marginBottom: 4 }} />
            <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)', fontFamily: 'var(--font-display)' }}>{value}</div>
            <div style={{ fontSize: 11, color: 'var(--text3)' }}>{label}</div>
          </div>
        ))}
      </div>

      <div style={{ background: 'var(--bg3)', borderRadius: 10, padding: '12px 14px', marginBottom: 18 }}>
        <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 6 }}>META DE SEGUIDORES</div>
        {meta ? (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text2)', marginBottom: 6 }}>
              <span>{fmtNum(latest?.seguidores)} / {fmtNum(meta)}</span>
              {segPct != null && <span>{segPct}%</span>}
            </div>
            <MiniBar value={latest?.seguidores ?? 0} max={meta} color={segPct >= 70 ? '--green' : '--amber'} />
          </div>
        ) : (
          <div style={{ fontSize: 12, color: 'var(--text3)' }}>Nenhuma meta definida ao cadastrar esta rede.</div>
        )}
      </div>

      <div>
        <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 8 }}>HISTÓRICO DE LANÇAMENTOS</div>
        {history.length === 0 ? (
          <div style={{ fontSize: 12, color: 'var(--text3)', padding: '10px 0' }}>Nenhum lançamento ainda. Use "Lançar métricas do período" para começar o histórico.</div>
        ) : (
          <div style={{ maxHeight: 220, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '90px repeat(5,1fr)', gap: 6, fontSize: 10, color: 'var(--text3)', padding: '0 10px' }}>
              <span>Data</span><span>Seguidores</span><span>Alcance</span><span>Impressões</span><span>Engaj.</span><span>Posts</span>
            </div>
            {history.map((h) => (
              <div key={h.id} style={{ display: 'grid', gridTemplateColumns: '90px repeat(5,1fr)', gap: 6, fontSize: 12, color: 'var(--text2)', background: 'var(--bg3)', borderRadius: 6, padding: '7px 10px' }}>
                <span>{h.dataReferencia ? h.dataReferencia.split('-').reverse().join('/') : '—'}</span>
                <span>{fmtNum(h.seguidores)}</span>
                <span>{fmtNum(h.alcance)}</span>
                <span>{fmtNum(h.impressoes)}</span>
                <span>{h.engajamento == null ? '—' : `${h.engajamento}%`}</span>
                <span>{fmtNum(h.postsPublicados)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyRedesState({ onAdd }) {
  return (
    <div style={{ textAlign: 'center', padding: '60px 20px', background: 'var(--bg2)', border: '1px dashed var(--border2)', borderRadius: 14, marginBottom: 24 }}>
      <Share2 size={26} style={{ color: 'var(--text3)', marginBottom: 12 }} />
      <div style={{ fontSize: 14, color: 'var(--text2)', marginBottom: 4 }}>Nenhuma rede cadastrada ainda</div>
      <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 16 }}>Adicione as redes sociais da empresa para acompanhar métricas e metas.</div>
      <PermissionGate module="redes" action="edit">
        <button onClick={onAdd}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
          <Plus size={13} /> Adicionar rede
        </button>
      </PermissionGate>
    </div>
  );
}

/* ─── Calendar ───────────────────────────────────────────────────────────────── */
function CalendarCell({ day, posts, contas, onPostClick, isToday, curMonthLabel }) {
  const { openAI } = useUI();
  return (
    <div style={{ minHeight: 90, background: isToday ? 'color-mix(in srgb, var(--accent) 8%, var(--bg2))' : 'var(--bg2)', border: `1px solid ${isToday ? 'var(--accent)' : 'var(--border)'}`, borderRadius: 10, padding: '6px 8px', display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ fontSize: 11, fontWeight: isToday ? 600 : 400, color: isToday ? 'var(--accent)' : 'var(--text3)', marginBottom: 2 }}>{day}</div>
      {posts.map((p) => {
        const conta = contas.find((c) => c.id === (p.redes && p.redes[0]));
        const cfg = conta ? platformCfg(conta.plataforma) : null;
        const st  = POST_STATUS[p.status] || POST_STATUS.ideia;
        return (
          <div key={p.id} title={p.titulo} onClick={() => onPostClick(p)}
            style={{ padding: '3px 6px', borderRadius: 6, background: st.bg, fontSize: 10, color: st.color, lineHeight: 1.3, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', cursor: 'pointer' }}>
            {cfg && <cfg.Icon size={9} style={{ verticalAlign: 'middle', marginRight: 3 }} />}
            {p.titulo}
          </div>
        );
      })}
      {posts.length === 0 && (
        <PermissionGate module="ia" action="view">
          <button onClick={() => openAI(`Sugira um conteúdo para postar nas redes sociais no dia ${day} de ${curMonthLabel}. Empresa B2B para PMEs brasileiras. Sugestões para: Instagram (carrossel ou reels) e LinkedIn (artigo ou post). Inclua: tema, formato, legenda de exemplo e hashtags relevantes.`)}
            style={{ marginTop: 'auto', opacity: 0, transition: 'opacity .15s', padding: '2px 4px', borderRadius: 4, background: 'transparent', border: '1px dashed var(--border)', color: 'var(--text3)', fontSize: 9, cursor: 'pointer', fontFamily: 'var(--font-body)' }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = 1}
            onMouseLeave={(e) => e.currentTarget.style.opacity = 0}>
            + IA
          </button>
        </PermissionGate>
      )}
    </div>
  );
}

function CalendarGrid({ posts, contas, filterRede, onPostClick, viewDate }) {
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDow = new Date(year, month, 1).getDay();
  const todayStr = todayISO();
  const curMonthLabel = monthLabel(year, month);

  const postsByDay = {};
  posts.forEach((p) => {
    if (!p.data) return;
    const parts = p.data.split('-');
    if (parseInt(parts[0]) !== year || parseInt(parts[1]) !== month + 1) return;
    const redeIds = p.redes || [];
    if (filterRede !== 'todas' && !redeIds.includes(filterRede)) return;
    const d = parseInt(parts[2]);
    if (!postsByDay[d]) postsByDay[d] = [];
    postsByDay[d].push(p);
  });

  const DOW = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const cells = [];
  for (let i = 0; i < firstDow; i++) cells.push({ empty: true, key: `e${i}` });
  for (let d = 1; d <= daysInMonth; d++) {
    const isoDate = dateToISO(year, month, d);
    cells.push({ day: d, isoDate, posts: postsByDay[d] ?? [], isToday: isoDate === todayStr });
  }

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4, marginBottom: 4 }}>
        {DOW.map((d) => (
          <div key={d} style={{ textAlign: 'center', fontSize: 11, color: 'var(--text3)', padding: '4px 0' }}>{d}</div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4 }}>
        {cells.map((cell) =>
          cell.empty
            ? <div key={cell.key} />
            : <CalendarCell key={cell.day} day={cell.day} posts={cell.posts} contas={contas} isToday={cell.isToday} curMonthLabel={curMonthLabel} onPostClick={onPostClick} />
        )}
      </div>
    </div>
  );
}

/* ─── Legend ─────────────────────────────────────────────────────────────────── */
function Legend() {
  return (
    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
      {Object.entries(POST_STATUS).map(([key, cfg]) => (
        <span key={key} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11 }}>
          <span style={{ width: 8, height: 8, borderRadius: 2, background: cfg.bg, border: `1px solid ${cfg.color}`, display: 'inline-block' }} />
          <span style={{ color: 'var(--text3)' }}>{cfg.label}</span>
        </span>
      ))}
    </div>
  );
}

/* ─── Post Modal ─────────────────────────────────────────────────────────────── */
function PostModal({ post, contas, onSave, onDelete, onDuplicate, onClose, openAI }) {
  const fileRef = useRef(null);
  const isEdit = !!post?.id;
  const [form, setForm] = useState(() => ({
    titulo: '', conteudo: '',
    data: todayISO(),
    horario: '12:00', formato: 'Feed', status: 'ideia',
    imagemUrl: null, metricas: { alcance: '', curtidas: '', comentarios: '' },
    ...post,
    redes: post?.redes?.length ? post.redes : (contas[0] ? [contas[0].id] : []),
  }));

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const setMet = (k, v) => setForm(f => ({ ...f, metricas: { ...f.metricas, [k]: v } }));

  function handleImage(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => set('imagemUrl', ev.target.result);
    reader.readAsDataURL(file);
  }

  function handleAI() {
    const labels = form.redes.map(id => {
      const c = contas.find(c => c.id === id);
      return c ? (c.nome || platformCfg(c.plataforma).label) : id;
    }).join(', ');
    openAI(`Crie um post para ${labels}. Formato: ${form.formato}. Data: ${form.data}. ${form.titulo ? `Tema: ${form.titulo}.` : ''} Gere: título chamativo, legenda completa com CTA e 5 hashtags para empresa B2B de serviços para PMEs.`);
    onClose();
  }

  const inp = { background: 'var(--bg4)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: 'var(--text)', fontFamily: 'var(--font-body)', width: '100%', boxSizing: 'border-box', outline: 'none' };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
      <div style={{ background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: 14, width: 520, maxWidth: '100%', maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px 14px', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, background: 'var(--bg2)', zIndex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--text)' }}>{isEdit ? 'Editar post' : 'Novo post'}</div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text3)', padding: 4 }}><X size={16} /></button>
        </div>

        <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ fontSize: 11, color: 'var(--text3)', display: 'block', marginBottom: 5 }}>TÍTULO</label>
            <input style={inp} value={form.titulo} onChange={e => set('titulo', e.target.value)} placeholder="Título do post..." />
          </div>
          <div>
            <label style={{ fontSize: 11, color: 'var(--text3)', display: 'block', marginBottom: 5 }}>LEGENDA</label>
            <textarea style={{ ...inp, minHeight: 72, resize: 'vertical' }} value={form.conteudo} onChange={e => set('conteudo', e.target.value)} placeholder="Legenda completa com hashtags..." />
          </div>
          <div>
            <label style={{ fontSize: 11, color: 'var(--text3)', display: 'block', marginBottom: 8 }}>REDES</label>
            {contas.length === 0 ? (
              <div style={{ fontSize: 12, color: 'var(--text3)' }}>Cadastre uma rede na aba Métricas para marcar aqui.</div>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {contas.map(c => {
                  const cfg = platformCfg(c.plataforma);
                  const sel = form.redes.includes(c.id);
                  return (
                    <button key={c.id} onClick={() => set('redes', sel ? form.redes.filter(x => x !== c.id) : [...form.redes, c.id])}
                      style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 11px', borderRadius: 20, fontSize: 12, border: '1px solid', cursor: 'pointer', fontFamily: 'var(--font-body)', transition: 'all .12s', background: sel ? `color-mix(in srgb, var(${cfg.color}) 18%, transparent)` : 'transparent', borderColor: sel ? `var(${cfg.color})` : 'var(--border)', color: sel ? `var(${cfg.color})` : 'var(--text3)' }}>
                      <cfg.Icon size={11} /> {c.nome || cfg.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: 11, color: 'var(--text3)', display: 'block', marginBottom: 5 }}>DATA</label>
              <input type="date" style={inp} value={form.data} onChange={e => set('data', e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: 'var(--text3)', display: 'block', marginBottom: 5 }}>HORÁRIO</label>
              <input type="time" style={inp} value={form.horario} onChange={e => set('horario', e.target.value)} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: 11, color: 'var(--text3)', display: 'block', marginBottom: 5 }}>FORMATO</label>
              <select style={{ ...inp, cursor: 'pointer' }} value={form.formato} onChange={e => set('formato', e.target.value)}>
                {FORMATOS.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, color: 'var(--text3)', display: 'block', marginBottom: 5 }}>STATUS</label>
              <select style={{ ...inp, cursor: 'pointer' }} value={form.status} onChange={e => set('status', e.target.value)}>
                {Object.entries(POST_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label style={{ fontSize: 11, color: 'var(--text3)', display: 'block', marginBottom: 8 }}>IMAGEM</label>
            {form.imagemUrl ? (
              <div style={{ position: 'relative' }}>
                <img src={form.imagemUrl} alt="" style={{ width: '100%', maxHeight: 140, objectFit: 'cover', borderRadius: 8 }} />
                <button onClick={() => set('imagemUrl', null)} style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: '50%', width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff' }}><X size={12} /></button>
              </div>
            ) : (
              <button onClick={() => fileRef.current?.click()} style={{ width: '100%', padding: 14, borderRadius: 8, background: 'var(--bg3)', border: '1px dashed var(--border2)', color: 'var(--text3)', fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
                + Carregar imagem
              </button>
            )}
            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImage} />
          </div>
          {form.status === 'publicado' && (
            <div>
              <label style={{ fontSize: 11, color: 'var(--text3)', display: 'block', marginBottom: 8 }}>MÉTRICAS</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
                {[['alcance', 'Alcance', Eye], ['curtidas', 'Curtidas', Heart], ['comentarios', 'Comentários', MessageCircle]].map(([k, lbl, Icon]) => (
                  <div key={k} style={{ background: 'var(--bg3)', borderRadius: 8, padding: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text3)', marginBottom: 6 }}><Icon size={11} /> {lbl}</div>
                    <input type="number" style={{ ...inp, padding: '5px 8px' }} value={form.metricas[k]} onChange={e => setMet(k, e.target.value)} placeholder="0" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <PermissionGate
          module="redes"
          action="edit"
          fallback={
            <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border)', fontSize: 12, color: 'var(--text3)', textAlign: 'center', position: 'sticky', bottom: 0, background: 'var(--bg2)' }}>
              Visualização somente leitura.
            </div>
          }
        >
          <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8, alignItems: 'center', position: 'sticky', bottom: 0, background: 'var(--bg2)' }}>
            {isEdit && (
              <>
                <button onClick={() => onDuplicate(form)} style={{ padding: '7px 13px', borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-body)', background: 'transparent', border: '1px solid var(--border2)', color: 'var(--text2)' }}>
                  Duplicar
                </button>
                <button onClick={() => onDelete(form.id)} style={{ padding: '7px 13px', borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-body)', background: 'transparent', border: '1px solid rgba(240,92,92,0.4)', color: 'var(--red)' }}>
                  Deletar
                </button>
              </>
            )}
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
              <button onClick={handleAI} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 13px', borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-body)', background: 'transparent', border: '1px solid var(--accent)', color: 'var(--accent)' }}>
                <Bot size={13} /> Criar com IA
              </button>
              <button onClick={() => onSave(form)} style={{ padding: '7px 16px', borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-body)', background: 'var(--accent)', border: 'none', color: '#fff' }}>
                {isEdit ? 'Salvar' : 'Criar manualmente'}
              </button>
            </div>
          </div>
        </PermissionGate>
      </div>
    </div>
  );
}

/* ─── Week View ──────────────────────────────────────────────────────────────── */
const HOURS = Array.from({ length: 15 }, (_, i) => i + 8);
const DOW_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

function WeekView({ posts, contas, filterRede, onPostClick }) {
  const today = new Date();
  const dow = today.getDay();
  const mondayOffset = dow === 0 ? -6 : 1 - dow;
  const monday = new Date(today);
  monday.setDate(today.getDate() + mondayOffset);
  const todayStr = todayISO();

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const iso = dateToISO(d.getFullYear(), d.getMonth(), d.getDate());
    return { iso, label: `${DOW_SHORT[d.getDay()]} ${d.getDate()}`, isToday: iso === todayStr };
  });

  const filtered = posts.filter(p => filterRede === 'todas' || (p.redes || []).includes(filterRede));
  return (
    <div style={{ overflowX: 'auto' }}>
      <div style={{ minWidth: 700 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '44px repeat(7,1fr)', gap: 2, marginBottom: 2 }}>
          <div />
          {weekDays.map(({ iso, label, isToday }) => (
            <div key={iso} style={{ textAlign: 'center', fontSize: 11, fontWeight: isToday ? 600 : 400, color: isToday ? 'var(--accent)' : 'var(--text3)', padding: '5px 4px', background: isToday ? 'color-mix(in srgb, var(--accent) 8%, transparent)' : 'transparent', borderRadius: 6 }}>
              {label}
            </div>
          ))}
        </div>
        {HOURS.map(h => (
          <div key={h} style={{ display: 'grid', gridTemplateColumns: '44px repeat(7,1fr)', gap: 2, marginBottom: 2 }}>
            <div style={{ fontSize: 10, color: 'var(--text3)', paddingTop: 6, textAlign: 'right', paddingRight: 8 }}>{h}h</div>
            {weekDays.map(({ iso, isToday }) => {
              const cell = filtered.filter(p => p.data === iso && p.horario && parseInt(p.horario) === h);
              return (
                <div key={iso} style={{ minHeight: 34, background: isToday ? 'color-mix(in srgb, var(--accent) 4%, var(--bg2))' : 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 5, padding: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {cell.map(p => {
                    const conta = contas.find(c => c.id === (p.redes && p.redes[0]));
                    const cfg = conta ? platformCfg(conta.plataforma) : null;
                    const st = POST_STATUS[p.status] || POST_STATUS.ideia;
                    return (
                      <div key={p.id} onClick={() => onPostClick(p)} title={p.titulo}
                        style={{ padding: '2px 4px', borderRadius: 4, background: st.bg, fontSize: 9, color: st.color, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', cursor: 'pointer' }}>
                        {cfg && <cfg.Icon size={8} style={{ verticalAlign: 'middle', marginRight: 2 }} />}
                        {p.titulo}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── List View ──────────────────────────────────────────────────────────────── */
function ListView({ posts, contas, filterRede, onPostClick }) {
  const filtered = [...posts]
    .filter(p => filterRede === 'todas' || (p.redes || []).includes(filterRede))
    .sort((a, b) => {
      const da = (a.data || '') + (a.horario || '00:00');
      const db = (b.data || '') + (b.horario || '00:00');
      return da.localeCompare(db);
    });

  if (filtered.length === 0) return (
    <div style={{ textAlign: 'center', padding: 40, color: 'var(--text3)', fontSize: 13 }}>Nenhum post encontrado.</div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {filtered.map(p => {
        const redes = (p.redes || []).map(id => contas.find(c => c.id === id)).filter(Boolean);
        const st = POST_STATUS[p.status] || POST_STATUS.ideia;
        const dayNum = p.data ? parseInt(p.data.split('-')[2]) : '--';
        return (
          <div key={p.id} onClick={() => onPostClick(p)}
            style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', transition: 'border-color .15s' }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border2)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}>
            <div style={{ width: 38, textAlign: 'center', flexShrink: 0 }}>
              <div style={{ fontSize: 20, fontWeight: 600, color: 'var(--text)', fontFamily: 'var(--font-display)', lineHeight: 1 }}>{dayNum}</div>
              <div style={{ fontSize: 10, color: 'var(--text3)' }}>{p.horario || '--:--'}</div>
            </div>
            <div style={{ width: 1, height: 32, background: 'var(--border)', flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', marginBottom: 3, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{p.titulo || '(sem título)'}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {redes.map(c => {
                  const cfg = platformCfg(c.plataforma);
                  return (
                    <span key={c.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 11, color: `var(${cfg.color})` }}>
                      <cfg.Icon size={10} /> {c.nome || cfg.label}
                    </span>
                  );
                })}
                {p.formato && <span style={{ fontSize: 11, color: 'var(--text3)' }}>· {p.formato}</span>}
              </div>
            </div>
            {p.imagemUrl && <img src={p.imagemUrl} alt="" style={{ width: 40, height: 40, borderRadius: 6, objectFit: 'cover', flexShrink: 0 }} />}
            <span style={{ padding: '2px 10px', borderRadius: 20, fontSize: 11, background: st.bg, color: st.color, flexShrink: 0 }}>{st.label}</span>
          </div>
        );
      })}
    </div>
  );
}

/* ─── Conta Modal (Adicionar rede) ───────────────────────────────────────────── */
function ContaModal({ onSave, onClose }) {
  const [form, setForm] = useState({ nome: '', handle: '', plataforma: PLATAFORMAS[0].id, metaSeguidores: '' });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const inp = { background: 'var(--bg4)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: 'var(--text)', fontFamily: 'var(--font-body)', width: '100%', boxSizing: 'border-box', outline: 'none' };
  const canSave = form.nome.trim().length > 0;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
      <div style={{ background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: 14, width: 420, maxWidth: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px 14px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--text)' }}>Adicionar rede</div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text3)', padding: 4 }}><X size={16} /></button>
        </div>
        <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ fontSize: 11, color: 'var(--text3)', display: 'block', marginBottom: 5 }}>PLATAFORMA</label>
            <select style={{ ...inp, cursor: 'pointer' }} value={form.plataforma} onChange={e => set('plataforma', e.target.value)}>
              {PLATAFORMAS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 11, color: 'var(--text3)', display: 'block', marginBottom: 5 }}>NOME</label>
            <input style={inp} value={form.nome} onChange={e => set('nome', e.target.value)} placeholder="Ex.: Comercial PME Oficial" />
          </div>
          <div>
            <label style={{ fontSize: 11, color: 'var(--text3)', display: 'block', marginBottom: 5 }}>@HANDLE</label>
            <input style={inp} value={form.handle} onChange={e => set('handle', e.target.value)} placeholder="@usuario" />
          </div>
          <div>
            <label style={{ fontSize: 11, color: 'var(--text3)', display: 'block', marginBottom: 5 }}>META DE SEGUIDORES (opcional)</label>
            <input type="number" style={inp} value={form.metaSeguidores} onChange={e => set('metaSeguidores', e.target.value)} placeholder="Ex.: 2000" />
          </div>
        </div>
        <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={onClose} style={{ padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-body)', background: 'transparent', border: '1px solid var(--border2)', color: 'var(--text2)' }}>Cancelar</button>
          <button disabled={!canSave} onClick={() => onSave(form)}
            style={{ padding: '7px 16px', borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: canSave ? 'pointer' : 'not-allowed', opacity: canSave ? 1 : 0.5, fontFamily: 'var(--font-body)', background: 'var(--accent)', border: 'none', color: '#fff' }}>
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Metrica Modal (Lançar métricas do período) ─────────────────────────────── */
function MetricaModal({ conta, onSave, onClose }) {
  const cfg = platformCfg(conta.plataforma);
  const [form, setForm] = useState({ dataReferencia: todayISO(), seguidores: '', alcance: '', impressoes: '', engajamento: '', postsPublicados: '' });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const inp = { background: 'var(--bg4)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: 'var(--text)', fontFamily: 'var(--font-body)', width: '100%', boxSizing: 'border-box', outline: 'none' };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
      <div style={{ background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: 14, width: 460, maxWidth: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px 14px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <cfg.Icon size={15} style={{ color: `var(${cfg.color})` }} />
            <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--text)' }}>Lançar métricas — {conta.nome || cfg.label}</div>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text3)', padding: 4 }}><X size={16} /></button>
        </div>
        <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ fontSize: 11, color: 'var(--text3)', display: 'block', marginBottom: 5 }}>DATA DE REFERÊNCIA</label>
            <input type="date" style={inp} value={form.dataReferencia} onChange={e => set('dataReferencia', e.target.value)} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: 11, color: 'var(--text3)', display: 'block', marginBottom: 5 }}>SEGUIDORES</label>
              <input type="number" style={inp} value={form.seguidores} onChange={e => set('seguidores', e.target.value)} placeholder="0" />
            </div>
            <div>
              <label style={{ fontSize: 11, color: 'var(--text3)', display: 'block', marginBottom: 5 }}>POSTS PUBLICADOS</label>
              <input type="number" style={inp} value={form.postsPublicados} onChange={e => set('postsPublicados', e.target.value)} placeholder="0" />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: 11, color: 'var(--text3)', display: 'block', marginBottom: 5 }}>ALCANCE</label>
              <input type="number" style={inp} value={form.alcance} onChange={e => set('alcance', e.target.value)} placeholder="0" />
            </div>
            <div>
              <label style={{ fontSize: 11, color: 'var(--text3)', display: 'block', marginBottom: 5 }}>IMPRESSÕES</label>
              <input type="number" style={inp} value={form.impressoes} onChange={e => set('impressoes', e.target.value)} placeholder="0" />
            </div>
          </div>
          <div>
            <label style={{ fontSize: 11, color: 'var(--text3)', display: 'block', marginBottom: 5 }}>ENGAJAMENTO (%)</label>
            <input type="number" step="0.1" style={inp} value={form.engajamento} onChange={e => set('engajamento', e.target.value)} placeholder="Ex.: 4.2" />
          </div>
        </div>
        <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={onClose} style={{ padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-body)', background: 'transparent', border: '1px solid var(--border2)', color: 'var(--text2)' }}>Cancelar</button>
          <button onClick={() => onSave(form)}
            style={{ padding: '7px 16px', borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-body)', background: 'var(--accent)', border: 'none', color: '#fff' }}>
            Salvar lançamento
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Page ───────────────────────────────────────────────────────────────────── */
export default function RedesSociais() {
  const { openAI } = useUI();
  const { empresaId } = useAuth();
  const [activeContaId, setActiveContaId] = useState(null);
  const [activeTab,     setActiveTab]     = useState('metricas');
  const [filterCalRede, setFilterCalRede] = useState('todas');

  const [contas,        setContas]        = useState([]);
  const [metricas,      setMetricas]      = useState([]);
  const [loadingContas, setLoadingContas] = useState(true);
  const [contaModal,    setContaModal]    = useState(false);
  const [metricaModalFor, setMetricaModalFor] = useState(null);

  const [calPosts,     setCalPosts]     = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [viewDate,     setViewDate]     = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const [calView,      setCalView]      = useState('mensal');
  const [postModal,    setPostModal]    = useState(null);

  useEffect(() => {
    if (!empresaId) return;
    let cancelled = false;
    async function load() {
      const { data } = await supabase
        .from('redes_posts')
        .select('*')
        .eq('empresa_id', empresaId)
        .order('data', { ascending: true });
      if (cancelled) return;
      setCalPosts((data ?? []).map(postFromRow));
      setLoadingPosts(false);
    }
    load();
    return () => { cancelled = true; };
  }, [empresaId]);

  useEffect(() => {
    if (!empresaId) return;
    let cancelled = false;
    async function load() {
      const [{ data: contasData }, { data: metricasData }] = await Promise.all([
        supabase.from('redes_contas').select('*').eq('empresa_id', empresaId).order('criado_em', { ascending: true }),
        supabase.from('redes_metricas').select('*').eq('empresa_id', empresaId).order('data_referencia', { ascending: false }),
      ]);
      if (cancelled) return;
      const cs = (contasData ?? []).map(contaFromRow);
      setContas(cs);
      setMetricas((metricasData ?? []).map(metricaFromRow));
      setActiveContaId((prev) => prev ?? (cs[0]?.id ?? null));
      setLoadingContas(false);
    }
    load();
    return () => { cancelled = true; };
  }, [empresaId]);

  async function handlePostSave(form) {
    const row = postToRow(form);
    if (form.id) {
      const { data } = await supabase.from('redes_posts').update({ ...row, atualizado_em: new Date().toISOString() }).eq('id', form.id).select().single();
      if (data) setCalPosts(prev => prev.map(p => p.id === form.id ? postFromRow(data) : p));
    } else {
      const { data } = await supabase.from('redes_posts').insert(row).select().single();
      if (data) setCalPosts(prev => [...prev, postFromRow(data)]);
    }
    setPostModal(null);
  }

  async function handlePostDelete(id) {
    await supabase.from('redes_posts').delete().eq('id', id);
    setCalPosts(prev => prev.filter(p => p.id !== id));
    setPostModal(null);
  }

  async function handlePostDuplicate(form) {
    const d = new Date(form.data + 'T00:00:00');
    d.setDate(d.getDate() + 1);
    const row = postToRow({ ...form, data: dateToISO(d.getFullYear(), d.getMonth(), d.getDate()) });
    const { data } = await supabase.from('redes_posts').insert(row).select().single();
    if (data) setCalPosts(prev => [...prev, postFromRow(data)]);
    setPostModal(null);
  }

  function handlePostClick(post) { setPostModal({ mode: 'edit', post }); }

  function prevMonth() { setViewDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1)); }
  function nextMonth() { setViewDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1)); }

  async function handleContaSave(form) {
    const row = contaToRow(form);
    const { data } = await supabase.from('redes_contas').insert(row).select().single();
    if (data) {
      const nova = contaFromRow(data);
      setContas(prev => [...prev, nova]);
      setActiveContaId(nova.id);
    }
    setContaModal(false);
  }

  async function handleContaDelete(contaId) {
    await supabase.from('redes_contas').delete().eq('id', contaId);
    setContas(prev => {
      const next = prev.filter(c => c.id !== contaId);
      setActiveContaId((cur) => (cur === contaId ? (next[0]?.id ?? null) : cur));
      return next;
    });
    setMetricas(prev => prev.filter(m => m.contaId !== contaId));
  }

  async function handleMetricaSave(form) {
    const contaId = metricaModalFor.id;
    const row = metricaToRow(form, contaId);
    const { data } = await supabase.from('redes_metricas').insert(row).select().single();
    if (data) setMetricas(prev => [metricaFromRow(data), ...prev]);
    setMetricaModalFor(null);
  }

  const TABS = [
    { id: 'metricas',   label: 'Métricas',            icon: BarChart2  },
    { id: 'calendario', label: 'Calendário Editorial', icon: Calendar   },
    { id: 'conexoes',   label: 'Conexões',             icon: Link2      },
  ];

  const metricasByConta = {};
  contas.forEach((c) => {
    metricasByConta[c.id] = metricas
      .filter((m) => m.contaId === c.id)
      .sort((a, b) => (b.dataReferencia || '').localeCompare(a.dataReferencia || '') || (b.criadoEm || '').localeCompare(a.criadoEm || ''));
  });
  const latestByConta = {};
  const previousByConta = {};
  contas.forEach((c) => {
    latestByConta[c.id]   = metricasByConta[c.id]?.[0] ?? null;
    previousByConta[c.id] = metricasByConta[c.id]?.[1] ?? null;
  });

  const seguidoresVals   = contas.map((c) => latestByConta[c.id]?.seguidores).filter((v) => v != null);
  const totalSeguidores  = seguidoresVals.reduce((s, v) => s + v, 0);
  const engajamentoVals  = contas.map((c) => latestByConta[c.id]?.engajamento).filter((v) => v != null);
  const avgEngajamento   = engajamentoVals.length ? (engajamentoVals.reduce((s, v) => s + v, 0) / engajamentoVals.length).toFixed(1) : null;
  const postsThisMonth   = calPosts.filter(p => p.status === 'publicado').length;
  const curMonthLabel    = monthLabel(viewDate.getFullYear(), viewDate.getMonth());

  const activeConta = contas.find((c) => c.id === activeContaId) || null;

  return (
    <div style={{ padding: '24px', fontFamily: 'var(--font-body)', color: 'var(--text)' }}>
      {/* Summary row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 28 }}>
        {[
          { label: 'Seguidores totais',  value: totalSeguidores.toLocaleString('pt-BR'),          icon: Users,      color: '--accent'  },
          { label: 'Engajamento médio',  value: avgEngajamento == null ? '—' : `${avgEngajamento}%`, icon: Heart,    color: '--purple'  },
          { label: 'Posts publicados',   value: postsThisMonth,                                    icon: BarChart2,  color: '--green'   },
          { label: 'Redes ativas',       value: contas.length,                                     icon: Share2,     color: '--teal'    },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: `color-mix(in srgb, var(${color}) 15%, transparent)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon size={18} style={{ color: `var(${color})` }} />
            </div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 600, color: 'var(--text)', fontFamily: 'var(--font-display)', lineHeight: 1.1 }}>{value}</div>
              <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16, marginBottom: 24, borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', gap: 0 }}>
          {TABS.map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500, fontFamily: 'var(--font-body)', background: 'transparent', color: activeTab === tab.id ? 'var(--text)' : 'var(--text3)', borderBottom: `2px solid ${activeTab === tab.id ? 'var(--accent)' : 'transparent'}`, marginBottom: -1, transition: 'color .15s' }}>
              <tab.icon size={14} />
              {tab.label}
            </button>
          ))}
        </div>
        <div style={{ marginLeft: 'auto', marginBottom: 8 }}>
          <PermissionGate module="redes" action="edit">
            <button
              onClick={() => openAI(`Crie um plano de conteúdo para ${curMonthLabel} para empresa B2B de serviços para PMEs. Inclua: 1 tema por semana, sugestões de posts para Instagram e LinkedIn, formatos recomendados, horários de publicação e hashtags relevantes.`)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, padding: '7px 13px', fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
              <Bot size={13} /> Plano com IA
            </button>
          </PermissionGate>
        </div>
      </div>

      {/* Métricas tab */}
      {activeTab === 'metricas' && (
        <div>
          {loadingContas ? <SkeletonLoader rows={4} /> : contas.length === 0 ? (
            <EmptyRedesState onAdd={() => setContaModal(true)} />
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 14 }}>
                <PermissionGate module="redes" action="edit">
                  <button onClick={() => setContaModal(true)}
                    style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'var(--bg3)', border: '1px solid var(--border2)', borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 500, color: 'var(--text)', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
                    <Plus size={12} /> Adicionar rede
                  </button>
                </PermissionGate>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(contas.length, 4)},1fr)`, gap: 14, marginBottom: 24 }}>
                {contas.map((c) => (
                  <RedeCard key={c.id} conta={c} latest={latestByConta[c.id]} previous={previousByConta[c.id]} active={activeContaId === c.id} onClick={() => setActiveContaId(c.id)} />
                ))}
              </div>

              {activeConta && (
                <>
                  <RedeDetail
                    conta={activeConta}
                    latest={latestByConta[activeConta.id]}
                    previous={previousByConta[activeConta.id]}
                    history={metricasByConta[activeConta.id] ?? []}
                    onLogMetrics={() => setMetricaModalFor(activeConta)}
                    onDelete={() => handleContaDelete(activeConta.id)}
                  />

                  {/* AI insight — só para quem tem acesso ao Assistente IA (cliente não tem) */}
                  <PermissionGate module="ia" action="view">
                  {latestByConta[activeConta.id] ? (
                    <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: 20 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>Análise e Recomendações de IA</div>
                        <button
                          onClick={() => {
                            const l = latestByConta[activeConta.id];
                            const cfg = platformCfg(activeConta.plataforma);
                            openAI(
                              `Analise as métricas de ${activeConta.nome || cfg.label} (${cfg.label}): ${fmtNum(l.seguidores)} seguidores${activeConta.metaSeguidores ? ` (meta: ${fmtNum(activeConta.metaSeguidores)})` : ''}, engajamento ${l.engajamento == null ? 'não informado' : `${l.engajamento}%`}, alcance ${fmtNum(l.alcance)}. Dê 3 recomendações práticas e acionáveis para melhorar os resultados nessa rede.`
                            );
                          }}
                          style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, padding: '6px 12px', fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
                          <Bot size={12} /> Analisar com IA
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ background: 'var(--bg2)', border: '1px dashed var(--border2)', borderRadius: 14, padding: 20, textAlign: 'center', fontSize: 12, color: 'var(--text3)' }}>
                      Lance as primeiras métricas desta rede para receber análise da IA.
                    </div>
                  )}
                  </PermissionGate>
                </>
              )}
            </>
          )}
        </div>
      )}

      {/* Calendário tab */}
      {activeTab === 'calendario' && (
        <div>
          {/* Calendar header row 1: month nav + new post + AI */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button onClick={prevMonth} style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', color: 'var(--text2)', fontSize: 16, lineHeight: 1, fontFamily: 'var(--font-body)' }}>‹</button>
              <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--text)', minWidth: 140, textAlign: 'center' }}>{curMonthLabel}</div>
              <button onClick={nextMonth} style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', color: 'var(--text2)', fontSize: 16, lineHeight: 1, fontFamily: 'var(--font-body)' }}>›</button>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <PermissionGate module="redes" action="edit">
                <button onClick={() => setPostModal({ mode: 'create', post: null })}
                  style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'var(--bg3)', border: '1px solid var(--border2)', borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 500, color: 'var(--text)', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
                  <Plus size={12} /> Novo post
                </button>
              </PermissionGate>
              <PermissionGate module="redes" action="edit">
                <button onClick={() => openAI(`Crie conteúdo para completar o calendário editorial de ${curMonthLabel}. Empresa B2B de serviços para PMEs. Sugira posts para os dias sem publicação agendada, misturando Instagram (carrossel, reels) e LinkedIn (artigo, post). Formato: dia, rede, tipo de conteúdo, título e 2 linhas de contexto.`)}
                  style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, padding: '6px 12px', fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
                  <Bot size={12} /> Completar com IA
                </button>
              </PermissionGate>
            </div>
          </div>

          {loadingPosts ? <SkeletonLoader rows={6} /> : calPosts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', background: 'var(--bg2)', border: '1px dashed var(--border2)', borderRadius: 14 }}>
              <Calendar size={26} style={{ color: 'var(--text3)', marginBottom: 12 }} />
              <div style={{ fontSize: 14, color: 'var(--text2)', marginBottom: 4 }}>Nenhum post agendado</div>
              <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 16 }}>Comece o calendário editorial criando o primeiro post.</div>
              <PermissionGate module="redes" action="edit">
                <button onClick={() => setPostModal({ mode: 'create', post: null })}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
                  <Plus size={13} /> Novo post
                </button>
              </PermissionGate>
            </div>
          ) : (
            <>
              {/* Calendar header row 2: view switcher + rede filter */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', background: 'var(--bg3)', borderRadius: 8, padding: 3, gap: 2, flexShrink: 0 }}>
                  {[['mensal', 'Mensal'], ['semanal', 'Semanal'], ['lista', 'Lista']].map(([v, lbl]) => (
                    <button key={v} onClick={() => setCalView(v)}
                      style={{ padding: '4px 12px', borderRadius: 6, fontSize: 12, border: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)', fontWeight: 500, transition: 'all .12s', background: calView === v ? 'var(--bg2)' : 'transparent', color: calView === v ? 'var(--text)' : 'var(--text3)', boxShadow: calView === v ? '0 1px 3px rgba(0,0,0,0.2)' : 'none' }}>
                      {lbl}
                    </button>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                  {[{ id: 'todas', label: 'Todas', Icon: null, color: null }, ...contas.map(c => { const cfg = platformCfg(c.plataforma); return { id: c.id, label: c.nome || cfg.label, Icon: cfg.Icon, color: cfg.color }; })].map(opt => (
                    <button key={opt.id} onClick={() => setFilterCalRede(opt.id)}
                      style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 20, fontSize: 11, border: '1px solid', cursor: 'pointer', fontFamily: 'var(--font-body)', transition: 'all .15s', background: filterCalRede === opt.id ? 'var(--accent)' : 'transparent', borderColor: filterCalRede === opt.id ? 'var(--accent)' : 'var(--border)', color: filterCalRede === opt.id ? '#fff' : 'var(--text3)' }}>
                      {opt.Icon && <opt.Icon size={10} />}
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {calView === 'mensal' && (
                <>
                  <Legend />
                  <CalendarGrid posts={calPosts} contas={contas} filterRede={filterCalRede} onPostClick={handlePostClick} viewDate={viewDate} />
                </>
              )}
              {calView === 'semanal' && (
                <>
                  <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 10 }}>Semana atual</div>
                  <WeekView posts={calPosts} contas={contas} filterRede={filterCalRede} onPostClick={handlePostClick} />
                </>
              )}
              {calView === 'lista' && (
                <ListView posts={calPosts} contas={contas} filterRede={filterCalRede} onPostClick={handlePostClick} />
              )}
            </>
          )}
        </div>
      )}

      {/* Conexões tab */}
      {activeTab === 'conexoes' && (
        <div>
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--text)', marginBottom: 6 }}>Conexões</div>
            <div style={{ fontSize: 13, color: 'var(--text2)' }}>
              Situação da integração automática com as redes sociais.
            </div>
          </div>

          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: 20, display: 'flex', gap: 14, alignItems: 'flex-start', marginBottom: 20 }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(240,168,50,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Zap size={18} style={{ color: 'var(--amber)' }} />
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', marginBottom: 6 }}>
                A integração automática com as APIs das redes sociais ainda não está disponível.
              </div>
              <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.6 }}>
                Por enquanto, cadastre suas redes e lance as métricas manualmente na aba <strong>Métricas</strong>.
                Assim que a conexão automática (Instagram, Facebook, LinkedIn, YouTube e TikTok) estiver disponível, ela aparecerá aqui.
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {PLATAFORMAS.map((p) => (
              <span key={p.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 20, fontSize: 12, background: p.bg, color: `var(${p.color})` }}>
                <p.Icon size={12} /> {p.label}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Post Modal */}
      {postModal && (
        <PostModal
          post={postModal.post}
          contas={contas}
          onSave={handlePostSave}
          onDelete={handlePostDelete}
          onDuplicate={handlePostDuplicate}
          onClose={() => setPostModal(null)}
          openAI={openAI}
        />
      )}

      {/* Conta Modal */}
      {contaModal && (
        <ContaModal onSave={handleContaSave} onClose={() => setContaModal(false)} />
      )}

      {/* Metrica Modal */}
      {metricaModalFor && (
        <MetricaModal conta={metricaModalFor} onSave={handleMetricaSave} onClose={() => setMetricaModalFor(null)} />
      )}
    </div>
  );
}
