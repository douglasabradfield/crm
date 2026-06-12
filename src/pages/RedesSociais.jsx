import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../store/auth.js';
import { supabase } from '../services/supabase.js';
import SkeletonLoader from '../components/UI/SkeletonLoader.jsx';
import {
  Camera, Briefcase, Play, AtSign, TrendingUp, TrendingDown,
  Users, Heart, MessageCircle, Eye, Share2, Plus, Bot,
  X, BarChart2, Zap, Calendar, Globe, Music, Link2,
} from 'lucide-react';
import { useUI } from '../store/index.js';
import PermissionGate from '../components/Auth/PermissionGate.jsx';

/* ─── Data ───────────────────────────────────────────────────────────────────── */
const REDES = [
  {
    id: 'instagram', label: 'Instagram', Icon: Camera, color: '--purple', bg: 'rgba(176,110,245,0.12)',
    seguidores: 1240, crescimento: +4.2, engajamento: 4.2, alcance: 8400,
    postsPerWeek: 3, stories: 5, impressoes: 21000,
    meta: { seguidores: 2000, engajamento: 5.0 },
    topFormats: ['Carrossel', 'Reels', 'Stories'],
    bestTime: 'Ter/Qui 18h–20h',
  },
  {
    id: 'linkedin', label: 'LinkedIn', Icon: Briefcase, color: '--teal', bg: 'rgba(56,201,224,0.12)',
    seguidores: 890, crescimento: +2.1, engajamento: 2.8, alcance: 3200,
    postsPerWeek: 2, stories: 0, impressoes: 9400,
    meta: { seguidores: 1500, engajamento: 3.5 },
    topFormats: ['Artigo', 'Post texto', 'Documento PDF'],
    bestTime: 'Seg/Qua 8h–10h',
  },
  {
    id: 'youtube', label: 'YouTube', Icon: Play, color: '--red', bg: 'rgba(240,92,92,0.12)',
    seguidores: 340, crescimento: +1.1, engajamento: 6.8, alcance: 1900,
    postsPerWeek: 0.5, stories: 0, impressoes: 4200,
    meta: { seguidores: 1000, engajamento: 7.0 },
    topFormats: ['Tutorial', 'Case de sucesso', 'Shorts'],
    bestTime: 'Sex 15h–17h',
  },
  {
    id: 'twitter', label: 'X / Twitter', Icon: AtSign, color: '--text2', bg: 'rgba(148,152,176,0.12)',
    seguidores: 520, crescimento: -0.3, engajamento: 1.4, alcance: 2800,
    postsPerWeek: 5, stories: 0, impressoes: 12000,
    meta: { seguidores: 800, engajamento: 2.0 },
    topFormats: ['Thread', 'Tweet curto', 'Enquete'],
    bestTime: 'Qua/Sex 12h–14h',
  },
];

const POST_STATUS = {
  publicado: { label: 'Publicado',  bg: 'rgba(45,212,160,0.15)',  color: 'var(--green)' },
  agendado:  { label: 'Agendado',   bg: 'rgba(91,110,245,0.15)',  color: 'var(--accent2)' },
  rascunho:  { label: 'Rascunho',   bg: 'rgba(148,152,176,0.12)', color: 'var(--text3)' },
  ideia:     { label: 'Ideia',      bg: 'rgba(240,168,50,0.15)',  color: 'var(--amber)' },
};

const CALENDAR_POSTS = [
  { id: 'p1',  day: 1,  rede: 'instagram', titulo: 'Dica: Como montar um funil de vendas',        status: 'publicado', formato: 'Carrossel'   },
  { id: 'p2',  day: 2,  rede: 'linkedin',  titulo: 'Case: Como a empresa X triplicou leads',      status: 'publicado', formato: 'Artigo'      },
  { id: 'p3',  day: 5,  rede: 'instagram', titulo: '3 erros comuns no comercial B2B',              status: 'publicado', formato: 'Reels'       },
  { id: 'p4',  day: 7,  rede: 'twitter',   titulo: 'Thread: Prospecção ativa em 10 passos',       status: 'publicado', formato: 'Thread'      },
  { id: 'p5',  day: 8,  rede: 'instagram', titulo: 'Por dentro do nosso processo de onboarding',  status: 'publicado', formato: 'Stories'     },
  { id: 'p6',  day: 9,  rede: 'linkedin',  titulo: 'Os indicadores que toda PME deve monitorar',  status: 'publicado', formato: 'Documento'   },
  { id: 'p7',  day: 12, rede: 'instagram', titulo: 'Mini-guia: CRM para pequenas empresas',       status: 'publicado', formato: 'Carrossel'   },
  { id: 'p8',  day: 14, rede: 'youtube',   titulo: 'Tutorial: Como usar dados para vender mais',  status: 'publicado', formato: 'Vídeo'       },
  { id: 'p9',  day: 15, rede: 'twitter',   titulo: 'Benchmark: taxas de conversão B2B por setor', status: 'publicado', formato: 'Tweet'       },
  { id: 'p10', day: 16, rede: 'instagram', titulo: 'Reels: O que diferencia top vendedores',      status: 'publicado', formato: 'Reels'       },
  { id: 'p11', day: 19, rede: 'linkedin',  titulo: 'Como estruturar seu pitch em 5 slides',       status: 'publicado', formato: 'Artigo'      },
  { id: 'p12', day: 21, rede: 'instagram', titulo: 'Dica rápida: Responda leads em até 5 min',    status: 'publicado', formato: 'Stories'     },
  { id: 'p13', day: 22, rede: 'twitter',   titulo: 'Fato: 80% das vendas acontecem no follow-up', status: 'publicado', formato: 'Tweet'       },
  { id: 'p14', day: 23, rede: 'instagram', titulo: 'Carrossel: Checklist de prospecção semanal',  status: 'agendado',  formato: 'Carrossel'   },
  { id: 'p15', day: 26, rede: 'linkedin',  titulo: 'Como construir autoridade no seu nicho',      status: 'agendado',  formato: 'Artigo'      },
  { id: 'p16', day: 27, rede: 'instagram', titulo: 'Reels: Ferramentas que usamos no dia a dia',  status: 'rascunho',  formato: 'Reels'       },
  { id: 'p17', day: 28, rede: 'youtube',   titulo: 'Case: Da prospecção ao fechamento em 30 dias', status: 'rascunho',  formato: 'Vídeo'      },
  { id: 'p18', day: 29, rede: 'twitter',   titulo: 'Thread sobre métricas de vaidade vs. reais',  status: 'ideia',     formato: 'Thread'      },
  { id: 'p19', day: 30, rede: 'instagram', titulo: 'Post de fechamento de mês: resultados',       status: 'ideia',     formato: 'Carrossel'   },
];

const FORMATOS = ['Feed', 'Stories', 'Reels', 'Carrossel', 'Vídeo', 'Artigo', 'Thread', 'Documento', 'Tweet', 'Shorts'];

const REDES_OAUTH = [
  { id: 'instagram', label: 'Instagram', api: 'Meta Business API',      Icon: Camera,    color: '--purple', bg: 'rgba(176,110,245,0.12)' },
  { id: 'facebook',  label: 'Facebook',  api: 'Meta Business API',      Icon: Globe,     color: '--accent', bg: 'rgba(91,110,245,0.12)'  },
  { id: 'linkedin',  label: 'LinkedIn',  api: 'LinkedIn Marketing API', Icon: Briefcase, color: '--teal',   bg: 'rgba(56,201,224,0.12)'  },
  { id: 'youtube',   label: 'YouTube',   api: 'YouTube Data API',       Icon: Play,      color: '--red',    bg: 'rgba(240,92,92,0.12)'   },
  { id: 'tiktok',    label: 'TikTok',    api: 'TikTok Business API',    Icon: Music,     color: '--green',  bg: 'rgba(45,212,160,0.12)'  },
];

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

/* ─── Components ─────────────────────────────────────────────────────────────── */
function MiniBar({ value, max, color }) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  return (
    <div style={{ height: 4, borderRadius: 4, background: 'var(--bg4)', overflow: 'hidden', flex: 1 }}>
      <div style={{ width: `${pct}%`, height: '100%', background: `var(${color})`, borderRadius: 4, transition: 'width .4s' }} />
    </div>
  );
}

function RedeCard({ rede, active, onClick }) {
  const isUp = rede.crescimento >= 0;
  const segPct = Math.round((rede.seguidores / rede.meta.seguidores) * 100);
  const engOk  = rede.engajamento >= rede.meta.engajamento;
  return (
    <div onClick={onClick}
      style={{ background: active ? 'var(--bg3)' : 'var(--bg2)', border: `1px solid ${active ? `var(${rede.color})` : 'var(--border)'}`, borderRadius: 14, padding: '18px 20px', cursor: 'pointer', transition: 'all .15s' }}
      onMouseEnter={(e) => { if (!active) e.currentTarget.style.borderColor = 'var(--border2)'; }}
      onMouseLeave={(e) => { if (!active) e.currentTarget.style.borderColor = 'var(--border)'; }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <div style={{ width: 38, height: 38, borderRadius: 10, background: rede.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <rede.Icon size={18} style={{ color: `var(${rede.color})` }} />
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{rede.label}</div>
          <div style={{ fontSize: 11, color: 'var(--text3)' }}>{rede.postsPerWeek}× por semana</div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: isUp ? 'var(--green)' : 'var(--red)' }}>
          {isUp ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
          {isUp ? '+' : ''}{rede.crescimento}%
        </div>
      </div>

      {/* Seguidores */}
      <div style={{ marginBottom: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text3)', marginBottom: 4 }}>
          <span>Seguidores</span>
          <span style={{ color: 'var(--text2)' }}>{rede.seguidores.toLocaleString('pt-BR')} / {rede.meta.seguidores.toLocaleString('pt-BR')}</span>
        </div>
        <MiniBar value={rede.seguidores} max={rede.meta.seguidores} color={segPct >= 70 ? '--green' : '--amber'} />
      </div>

      {/* Engajamento */}
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
        <span style={{ color: 'var(--text3)' }}>Engajamento</span>
        <span style={{ color: engOk ? 'var(--green)' : 'var(--amber)', fontWeight: 500 }}>
          {rede.engajamento}% {engOk ? '✓' : `(meta ${rede.meta.engajamento}%)`}
        </span>
      </div>
    </div>
  );
}

function RedeDetail({ rede }) {
  const redeCfg = REDES.find((r) => r.id === rede.id);
  const metrics = [
    { label: 'Alcance',      value: rede.alcance.toLocaleString('pt-BR'),    icon: Eye,            color: '--accent2' },
    { label: 'Impressões',   value: rede.impressoes.toLocaleString('pt-BR'),  icon: BarChart2,      color: '--purple'  },
    { label: 'Engajamento',  value: `${rede.engajamento}%`,                   icon: Heart,          color: '--red'     },
    { label: 'Seguidores',   value: rede.seguidores.toLocaleString('pt-BR'),  icon: Users,          color: '--teal'    },
  ];
  return (
    <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: 20, marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
        <div style={{ width: 36, height: 36, borderRadius: 9, background: rede.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <rede.Icon size={17} style={{ color: `var(${rede.color})` }} />
        </div>
        <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--text)' }}>{rede.label} — Detalhes</div>
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

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
        <div style={{ background: 'var(--bg3)', borderRadius: 10, padding: '12px 14px' }}>
          <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 6 }}>FORMATOS QUE MAIS ENGAJAM</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {rede.topFormats.map((f, i) => (
              <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text2)' }}>
                <span style={{ width: 16, height: 16, borderRadius: '50%', background: `color-mix(in srgb, var(${rede.color}) 20%, transparent)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: `var(${rede.color})`, flexShrink: 0 }}>{i + 1}</span>
                {f}
              </div>
            ))}
          </div>
        </div>
        <div style={{ background: 'var(--bg3)', borderRadius: 10, padding: '12px 14px' }}>
          <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 6 }}>MELHOR HORÁRIO</div>
          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', lineHeight: 1.5 }}>{rede.bestTime}</div>
        </div>
        <div style={{ background: 'var(--bg3)', borderRadius: 10, padding: '12px 14px' }}>
          <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 6 }}>META DO MÊS</div>
          <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.6 }}>
            <div>{rede.meta.seguidores.toLocaleString('pt-BR')} seguidores</div>
            <div>{rede.meta.engajamento}% engajamento</div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Calendar ───────────────────────────────────────────────────────────────── */
function CalendarCell({ day, isoDate, posts, onPostClick, isToday, curMonthLabel }) {
  const { openAI } = useUI();
  return (
    <div style={{ minHeight: 90, background: isToday ? 'color-mix(in srgb, var(--accent) 8%, var(--bg2))' : 'var(--bg2)', border: `1px solid ${isToday ? 'var(--accent)' : 'var(--border)'}`, borderRadius: 10, padding: '6px 8px', display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ fontSize: 11, fontWeight: isToday ? 600 : 400, color: isToday ? 'var(--accent)' : 'var(--text3)', marginBottom: 2 }}>{day}</div>
      {posts.map((p) => {
        const redeId = p.redes && p.redes[0];
        const rede = REDES.find((r) => r.id === redeId);
        const st   = POST_STATUS[p.status] || POST_STATUS.ideia;
        return (
          <div key={p.id} title={p.titulo} onClick={() => onPostClick(p)}
            style={{ padding: '3px 6px', borderRadius: 6, background: st.bg, fontSize: 10, color: st.color, lineHeight: 1.3, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', cursor: 'pointer' }}>
            {rede && <rede.Icon size={9} style={{ verticalAlign: 'middle', marginRight: 3 }} />}
            {p.titulo}
          </div>
        );
      })}
      {posts.length === 0 && (
        <button onClick={() => openAI(`Sugira um conteúdo para postar nas redes sociais no dia ${day} de ${curMonthLabel}. Empresa B2B para PMEs brasileiras. Sugestões para: Instagram (carrossel ou reels) e LinkedIn (artigo ou post). Inclua: tema, formato, legenda de exemplo e hashtags relevantes.`)}
          style={{ marginTop: 'auto', opacity: 0, transition: 'opacity .15s', padding: '2px 4px', borderRadius: 4, background: 'transparent', border: '1px dashed var(--border)', color: 'var(--text3)', fontSize: 9, cursor: 'pointer', fontFamily: 'var(--font-body)' }}
          onMouseEnter={(e) => e.currentTarget.style.opacity = 1}
          onMouseLeave={(e) => e.currentTarget.style.opacity = 0}>
          + IA
        </button>
      )}
    </div>
  );
}

function CalendarGrid({ posts, filterRede, onPostClick, viewDate }) {
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
            : <CalendarCell key={cell.day} day={cell.day} isoDate={cell.isoDate} posts={cell.posts} isToday={cell.isToday} curMonthLabel={curMonthLabel} onPostClick={onPostClick} />
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
function PostModal({ post, onSave, onDelete, onDuplicate, onClose, openAI }) {
  const fileRef = useRef(null);
  const isEdit = !!post?.id;
  const [form, setForm] = useState(() => ({
    titulo: '', conteudo: '', redes: ['instagram'],
    data: todayISO(),
    horario: '12:00', formato: 'Feed', status: 'ideia',
    imagemUrl: null, metricas: { alcance: '', curtidas: '', comentarios: '' },
    ...post,
    redes: post?.redes?.length ? post.redes : ['instagram'],
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
    const labels = form.redes.map(id => REDES.find(r => r.id === id)?.label || id).join(', ');
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
            <textarea style={{ ...inp, minHeight: 72, resize: 'vertical' }} value={form.legenda} onChange={e => set('legenda', e.target.value)} placeholder="Legenda completa com hashtags..." />
          </div>
          <div>
            <label style={{ fontSize: 11, color: 'var(--text3)', display: 'block', marginBottom: 8 }}>REDES</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {REDES.map(r => {
                const sel = form.redes.includes(r.id);
                return (
                  <button key={r.id} onClick={() => set('redes', sel ? form.redes.filter(x => x !== r.id) : [...form.redes, r.id])}
                    style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 11px', borderRadius: 20, fontSize: 12, border: '1px solid', cursor: 'pointer', fontFamily: 'var(--font-body)', transition: 'all .12s', background: sel ? `color-mix(in srgb, var(${r.color}) 18%, transparent)` : 'transparent', borderColor: sel ? `var(${r.color})` : 'var(--border)', color: sel ? `var(${r.color})` : 'var(--text3)' }}>
                    <r.Icon size={11} /> {r.label}
                  </button>
                );
              })}
            </div>
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
      </div>
    </div>
  );
}

/* ─── Week View ──────────────────────────────────────────────────────────────── */
const HOURS = Array.from({ length: 15 }, (_, i) => i + 8);
const DOW_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

function WeekView({ posts, filterRede, onPostClick }) {
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
                    const redeId = p.redes && p.redes[0];
                    const rede = REDES.find(r => r.id === redeId);
                    const st = POST_STATUS[p.status] || POST_STATUS.ideia;
                    return (
                      <div key={p.id} onClick={() => onPostClick(p)} title={p.titulo}
                        style={{ padding: '2px 4px', borderRadius: 4, background: st.bg, fontSize: 9, color: st.color, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', cursor: 'pointer' }}>
                        {rede && <rede.Icon size={8} style={{ verticalAlign: 'middle', marginRight: 2 }} />}
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
function ListView({ posts, filterRede, onPostClick }) {
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
        const redes = (p.redes || []).map(id => REDES.find(r => r.id === id)).filter(Boolean);
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
                {redes.map(r => (
                  <span key={r.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 11, color: `var(${r.color})` }}>
                    <r.Icon size={10} /> {r.label}
                  </span>
                ))}
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

/* ─── OAuth Modal ────────────────────────────────────────────────────────────── */
function OAuthModal({ rede, step, onClose }) {
  if (!rede) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <style>{`@keyframes spin-oauth { to { transform: rotate(360deg); } }`}</style>
      <div style={{ background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: 14, padding: '32px', width: 380, maxWidth: '90vw', textAlign: 'center', position: 'relative' }}>
        <div style={{ width: 56, height: 56, borderRadius: 14, background: rede.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px' }}>
          <rede.Icon size={26} style={{ color: `var(${rede.color})` }} />
        </div>

        {step === 'loading' && (
          <>
            <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--text)', marginBottom: 8 }}>Autenticando {rede.label}</div>
            <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 24 }}>Redirecionando para autenticação...</div>
            <div style={{ width: 32, height: 32, border: '3px solid var(--bg4)', borderTop: `3px solid var(${rede.color})`, borderRadius: '50%', margin: '0 auto 20px', animation: 'spin-oauth 0.8s linear infinite' }} />
            <div style={{ fontSize: 11, color: 'var(--text3)' }}>Conectando via {rede.api}</div>
          </>
        )}

        {step === 'success' && (
          <>
            <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--text)', marginBottom: 8 }}>Conectado com sucesso!</div>
            <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 18 }}>
              {rede.label} foi conectado via {rede.api}.
            </div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 14px', borderRadius: 20, background: 'rgba(45,212,160,0.12)', marginBottom: 24 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--green)', display: 'inline-block' }} />
              <span style={{ fontSize: 12, color: 'var(--green)' }}>Conexão estabelecida</span>
            </div>
            <br />
            <button onClick={onClose}
              style={{ background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 28px', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
              Concluir
            </button>
          </>
        )}
      </div>
    </div>
  );
}

/* ─── Conexão Card ───────────────────────────────────────────────────────────── */
function ConexaoCard({ rede, connection, onConnect, onDisconnect }) {
  const isConnected = !!connection;
  return (
    <div style={{ background: 'var(--bg2)', border: `1px solid ${isConnected ? 'rgba(45,212,160,0.3)' : 'var(--border)'}`, borderRadius: 14, padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 16, transition: 'border-color .15s' }}>
      <div style={{ width: 44, height: 44, borderRadius: 12, background: rede.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, position: 'relative' }}>
        <rede.Icon size={20} style={{ color: `var(${rede.color})` }} />
        {isConnected && (
          <span style={{ position: 'absolute', bottom: -3, right: -3, width: 12, height: 12, borderRadius: '50%', background: 'var(--green)', border: '2px solid var(--bg2)' }} />
        )}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
          <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>{rede.label}</span>
          {isConnected && (
            <span style={{ padding: '2px 9px', borderRadius: 20, fontSize: 11, background: 'rgba(45,212,160,0.15)', color: 'var(--green)' }}>Conectado</span>
          )}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text3)' }}>{rede.api}</div>
        {isConnected && (
          <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>
            Conectado em {connection.connectedAt} · Última atualização: {connection.lastSync}
          </div>
        )}
      </div>

      {isConnected ? (
        <button onClick={() => onDisconnect(rede.id)}
          style={{ padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-body)', background: 'transparent', border: '1px solid rgba(240,92,92,0.4)', color: 'var(--red)', transition: 'background .15s', flexShrink: 0 }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(240,92,92,0.1)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}>
          Desconectar
        </button>
      ) : (
        <button onClick={() => onConnect(rede.id)}
          style={{ padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-body)', background: 'var(--accent)', border: 'none', color: '#fff', flexShrink: 0 }}>
          Conectar
        </button>
      )}
    </div>
  );
}

/* ─── Page ───────────────────────────────────────────────────────────────────── */
export default function RedesSociais() {
  const { openAI } = useUI();
  const { empresaId } = useAuth();
  const [activeRede,    setActiveRede]    = useState('instagram');
  const [activeTab,     setActiveTab]     = useState('metricas');
  const [filterCalRede, setFilterCalRede] = useState('todas');

  const [connections, setConnections] = useState(() => {
    try { return JSON.parse(localStorage.getItem('redes_oauth_connections') || '{}'); }
    catch { return {}; }
  });
  const [oauthModal, setOauthModal] = useState(null);
  const [oauthStep,  setOauthStep]  = useState('idle');

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
      let rows = data ?? [];
      if (rows.length === 0) {
        const now = new Date();
        const y = now.getFullYear();
        const m = now.getMonth();
        const seedRows = CALENDAR_POSTS.map(p => ({
          data: dateToISO(y, m, p.day),
          redes: [p.rede],
          titulo: p.titulo,
          status: p.status,
          formato: p.formato,
          conteudo: '',
          imagem_url: null,
          hora: '12:00',
          metricas: { alcance: '', curtidas: '', comentarios: '' },
        }));
        const { data: ins } = await supabase.from('redes_posts').insert(seedRows).select();
        if (cancelled) return;
        rows = ins ?? [];
      }
      if (!cancelled) {
        setCalPosts(rows.map(postFromRow));
        setLoadingPosts(false);
      }
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

  function handleConnect(redeId) {
    setOauthModal(redeId);
    setOauthStep('loading');
    setTimeout(() => setOauthStep('success'), 2000);
  }

  function handleOAuthClose() {
    if (oauthStep === 'success') {
      const now = new Date();
      const dateStr = now.toLocaleDateString('pt-BR');
      const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      const updated = { ...connections, [oauthModal]: { connectedAt: `${dateStr} ${timeStr}`, lastSync: `${dateStr} ${timeStr}` } };
      setConnections(updated);
      localStorage.setItem('redes_oauth_connections', JSON.stringify(updated));
    }
    setOauthModal(null);
    setOauthStep('idle');
  }

  function handleDisconnect(redeId) {
    const updated = { ...connections };
    delete updated[redeId];
    setConnections(updated);
    localStorage.setItem('redes_oauth_connections', JSON.stringify(updated));
  }

  const rede = REDES.find((r) => r.id === activeRede);

  const TABS = [
    { id: 'metricas',   label: 'Métricas',            icon: BarChart2  },
    { id: 'calendario', label: 'Calendário Editorial', icon: Calendar   },
    { id: 'conexoes',   label: 'Conexões',             icon: Link2      },
  ];

  const totalSeguidores = REDES.reduce((s, r) => s + r.seguidores, 0);
  const avgEngajamento  = (REDES.reduce((s, r) => s + r.engajamento, 0) / REDES.length).toFixed(1);
  const postsThisMonth  = calPosts.filter(p => p.status === 'publicado').length;
  const curMonthLabel   = monthLabel(viewDate.getFullYear(), viewDate.getMonth());

  return (
    <div style={{ padding: '24px', fontFamily: 'var(--font-body)', color: 'var(--text)' }}>
      {/* Summary row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 28 }}>
        {[
          { label: 'Seguidores totais',  value: totalSeguidores.toLocaleString('pt-BR'), icon: Users,      color: '--accent'  },
          { label: 'Engajamento médio',  value: `${avgEngajamento}%`,                    icon: Heart,      color: '--purple'  },
          { label: 'Posts publicados',   value: postsThisMonth,                           icon: BarChart2,  color: '--green'   },
          { label: 'Redes ativas',       value: REDES.length,                             icon: Share2,     color: '--teal'    },
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
          {/* Rede selector cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 24 }}>
            {REDES.map((r) => (
              <RedeCard key={r.id} rede={r} active={activeRede === r.id} onClick={() => setActiveRede(r.id)} />
            ))}
          </div>
          {/* Detail */}
          <RedeDetail rede={rede} />

          {/* AI insight */}
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>Análise e Recomendações de IA</div>
              <button
                onClick={() => openAI(
                  `Analise as métricas de ${rede.label}: ${rede.seguidores} seguidores (meta: ${rede.meta.seguidores}), engajamento ${rede.engajamento}% (meta: ${rede.meta.engajamento}%), alcance ${rede.alcance}, crescimento ${rede.crescimento}%. ` +
                  `Formatos que mais engajam: ${rede.topFormats.join(', ')}. ` +
                  `Dê 3 recomendações práticas e acionáveis para melhorar os resultados nessa rede.`
                )}
                style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, padding: '6px 12px', fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
                <Bot size={12} /> Analisar com IA
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
              {[
                { tip: `Priorize ${rede.topFormats[0]} — é o formato com maior engajamento no ${rede.label}.`, color: '--green'   },
                { tip: `Melhore horário de publicação para ${rede.bestTime} para maximizar alcance orgânico.`, color: '--accent2' },
                { tip: `Engajamento ${rede.engajamento}% ${rede.engajamento >= rede.meta.engajamento ? 'acima da meta — mantenha a consistência.' : `abaixo da meta de ${rede.meta.engajamento}% — responda comentários nas primeiras horas.`}`, color: rede.engajamento >= rede.meta.engajamento ? '--green' : '--amber' },
              ].map((item, i) => (
                <div key={i} style={{ background: 'var(--bg3)', borderRadius: 10, padding: 14, borderLeft: `3px solid var(${item.color})` }}>
                  <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.5 }}>{item.tip}</div>
                </div>
              ))}
            </div>
          </div>
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

          {/* Calendar header row 2: view switcher + rede filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
            {/* View switcher */}
            <div style={{ display: 'flex', background: 'var(--bg3)', borderRadius: 8, padding: 3, gap: 2, flexShrink: 0 }}>
              {[['mensal', 'Mensal'], ['semanal', 'Semanal'], ['lista', 'Lista']].map(([v, lbl]) => (
                <button key={v} onClick={() => setCalView(v)}
                  style={{ padding: '4px 12px', borderRadius: 6, fontSize: 12, border: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)', fontWeight: 500, transition: 'all .12s', background: calView === v ? 'var(--bg2)' : 'transparent', color: calView === v ? 'var(--text)' : 'var(--text3)', boxShadow: calView === v ? '0 1px 3px rgba(0,0,0,0.2)' : 'none' }}>
                  {lbl}
                </button>
              ))}
            </div>
            {/* Rede filter */}
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
              {[{ id: 'todas', label: 'Todas' }, ...REDES.map(r => ({ id: r.id, label: r.label, Icon: r.Icon, color: r.color }))].map(opt => (
                <button key={opt.id} onClick={() => setFilterCalRede(opt.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 20, fontSize: 11, border: '1px solid', cursor: 'pointer', fontFamily: 'var(--font-body)', transition: 'all .15s', background: filterCalRede === opt.id ? 'var(--accent)' : 'transparent', borderColor: filterCalRede === opt.id ? 'var(--accent)' : 'var(--border)', color: filterCalRede === opt.id ? '#fff' : 'var(--text3)' }}>
                  {opt.Icon && <opt.Icon size={10} />}
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {loadingPosts ? <SkeletonLoader rows={6} /> : (
            <>
              {calView === 'mensal' && (
                <>
                  <Legend />
                  <CalendarGrid posts={calPosts} filterRede={filterCalRede} onPostClick={handlePostClick} viewDate={viewDate} />
                </>
              )}
              {calView === 'semanal' && (
                <>
                  <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 10 }}>Semana atual</div>
                  <WeekView posts={calPosts} filterRede={filterCalRede} onPostClick={handlePostClick} />
                </>
              )}
              {calView === 'lista' && (
                <ListView posts={calPosts} filterRede={filterCalRede} onPostClick={handlePostClick} />
              )}
            </>
          )}
        </div>
      )}

      {/* Conexões tab */}
      {activeTab === 'conexoes' && (
        <div>
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--text)', marginBottom: 6 }}>Conexões OAuth</div>
            <div style={{ fontSize: 13, color: 'var(--text2)' }}>
              Conecte suas redes sociais para sincronizar métricas automaticamente.
            </div>
          </div>

          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 16px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, marginBottom: 20 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: Object.keys(connections).length > 0 ? 'var(--green)' : 'var(--amber)', display: 'inline-block' }} />
            <span style={{ fontSize: 13, color: 'var(--text2)' }}>
              {Object.keys(connections).length} de {REDES_OAUTH.length} redes conectadas
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {REDES_OAUTH.map((r) => (
              <ConexaoCard
                key={r.id}
                rede={r}
                connection={connections[r.id] || null}
                onConnect={handleConnect}
                onDisconnect={handleDisconnect}
              />
            ))}
          </div>
        </div>
      )}

      {/* Post Modal */}
      {postModal && (
        <PostModal
          post={postModal.post}
          onSave={handlePostSave}
          onDelete={handlePostDelete}
          onDuplicate={handlePostDuplicate}
          onClose={() => setPostModal(null)}
          openAI={openAI}
        />
      )}

      {/* OAuth Modal */}
      {oauthModal && (
        <OAuthModal
          rede={REDES_OAUTH.find((r) => r.id === oauthModal)}
          step={oauthStep}
          onClose={handleOAuthClose}
        />
      )}
    </div>
  );
}
