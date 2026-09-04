import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { addDays, addMonths, addWeeks, startOfWeek, endOfWeek } from 'date-fns';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { useAuth } from '../store/auth.js';
import { supabase } from '../services/supabase.js';
import SkeletonLoader from '../components/UI/SkeletonLoader.jsx';
import {
  Camera, Briefcase, Play, AtSign, TrendingUp, TrendingDown,
  Users, Heart, MessageCircle, Eye, Share2, Plus, Bot,
  X, BarChart2, Zap, Calendar, Globe, Music, Link2, Trash2,
  ImageIcon, Film, ChevronLeft, ChevronRight, GripVertical, Upload, AlertTriangle,
  Award, Trophy,
} from 'lucide-react';
import { useUI } from '../store/index.js';
import { useMediaQuery } from '../hooks/useMediaQuery.js';
import PermissionGate from '../components/Auth/PermissionGate.jsx';

// Breakpoints do Tailwind reaproveitados aqui (md 768 / lg 1024).
const MOBILE_Q = '(max-width: 767px)';
const TABLET_Q = '(min-width: 768px) and (max-width: 1023px)';

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

/* ─── Mídia (Supabase Storage) ───────────────────────────────────────────────── */
// Bucket privado; política por empresa (1º segmento do path = empresa_id).
// A linha guarda só a lista ordenada de ponteiros em redes_posts.midias:
//   [{ path, tipo: 'imagem'|'video', mime }]
// imagem_url (base64) fica só para posts antigos ainda não migrados.
const REDES_BUCKET   = 'redes-midia';
const MAX_CARROSSEL  = 10;
const IMG_MIME       = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const VIDEO_MIME     = ['video/mp4', 'video/quicktime', 'video/webm'];
const MAX_IMG_BYTES  = 10 * 1024 * 1024;
const MAX_VIDEO_BYTES = 200 * 1024 * 1024;
const VIDEO_FORMATOS = ['Reels', 'Vídeo', 'Shorts'];

const formatoAceitaVideo = (f) => VIDEO_FORMATOS.includes(f);
const formatoMultiplo    = (f) => f === 'Carrossel';
const tipoMidiaDoFormato = (f) => (formatoAceitaVideo(f) ? 'video' : 'imagem');

function sanitizeName(name) {
  const dot  = name.lastIndexOf('.');
  const base = (dot > 0 ? name.slice(0, dot) : name).replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 40) || 'midia';
  const ext  = (dot > 0 ? name.slice(dot + 1) : '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase() || 'bin';
  return `${base}.${ext}`;
}

function midiaStoragePath(empresaId, file) {
  return `${empresaId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${sanitizeName(file.name)}`;
}

async function signMidiaPaths(paths, expiresIn = 86400) {
  const uniq = [...new Set((paths ?? []).filter(Boolean))];
  if (!uniq.length) return {};
  const { data, error } = await supabase.storage.from(REDES_BUCKET).createSignedUrls(uniq, expiresIn);
  if (error) return {};
  const map = {};
  (data ?? []).forEach((d) => { if (d && !d.error && d.signedUrl) map[d.path] = d.signedUrl; });
  return map;
}

// Constrói a lista de mídias do modal a partir da linha do post. Prioriza
// midias[]; cai para imagem_url (base64 legado) como item único não editável.
function midiasFromPost(post) {
  if (Array.isArray(post?.midias) && post.midias.length) {
    return post.midias.map((m, i) => ({
      key: `saved-${i}-${m.path}`, path: m.path, tipo: m.tipo || 'imagem',
      mime: m.mime || '', previewUrl: null, status: 'ready', legacy: false,
    }));
  }
  if (post?.imagemUrl) {
    return [{ key: 'legacy', path: null, tipo: 'imagem', mime: '', previewUrl: post.imagemUrl, status: 'ready', legacy: true }];
  }
  return [];
}

/* ─── Helpers & mappers ──────────────────────────────────────────────────────── */
const MONTH_NAMES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const MONTH_SHORT = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];

// Rótulo do intervalo da semana: "31 ago – 6 set 2026". Só repete mês/ano
// quando o intervalo atravessa a virada (de mês ou de ano).
function weekRangeLabel(start, end) {
  const sd = start.getDate();
  const ed = end.getDate();
  const sm = MONTH_SHORT[start.getMonth()];
  const em = MONTH_SHORT[end.getMonth()];
  const sy = start.getFullYear();
  const ey = end.getFullYear();
  if (sy !== ey) return `${sd} ${sm} ${sy} – ${ed} ${em} ${ey}`;
  if (start.getMonth() !== end.getMonth()) return `${sd} ${sm} – ${ed} ${em} ${ey}`;
  return `${sd} – ${ed} ${em} ${ey}`;
}

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

// "23/08/2026 14:32" — usado no histórico de comentários do post.
function fmtDataHora(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// Engajamento é derivado, não digitado: (interações / alcance) × 100.
// Retorna null quando não dá para calcular (alcance 0/vazio ou interações vazio),
// para exibir "—" em vez de erro de divisão.
function calcEngajamento(interacoes, alcance) {
  if (interacoes === '' || interacoes == null) return null;
  const i = Number(interacoes);
  const a = Number(alcance);
  if (!Number.isFinite(i) || !Number.isFinite(a) || a === 0) return null;
  return Math.round((i / a) * 10000) / 100;
}

// '' / null → null; resto → Number. Para colunas numéricas nuláveis do banco
// (nunca mandar '' para coluna integer/numeric).
const numOrNull = (v) => (v === '' || v == null ? null : Number(v));

// Tempo assistido: a entrada aceita segundos soltos ("125") ou "mm:ss"
// ("2:05"); guardamos sempre segundos (inteiro). '' quando vazio/ inválido.
function parseDuracao(v) {
  if (v === '' || v == null) return '';
  const s = String(v).trim();
  if (s === '') return '';
  if (s.includes(':')) {
    const [m, sec = '0'] = s.split(':');
    const mi = parseInt(m, 10);
    const se = parseInt(sec, 10);
    if (!Number.isFinite(mi) || !Number.isFinite(se)) return '';
    return mi * 60 + se;
  }
  const n = parseInt(s, 10);
  return Number.isFinite(n) ? n : '';
}

// Segundos → "m:ss". "—" quando não houver dado (nunca "0:00" para vazio).
function fmtDuracao(v) {
  if (v === '' || v == null) return '—';
  const total = Number(v);
  if (!Number.isFinite(total)) return '—';
  const m = Math.floor(Math.abs(total) / 60);
  const s = Math.abs(total) % 60;
  return `${total < 0 ? '-' : ''}${m}:${String(s).padStart(2, '0')}`;
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
    midias: Array.isArray(r.midias) ? r.midias : [],
    metricas: {
      alcance: met.alcance ?? '',
      curtidas: met.curtidas ?? '',
      comentarios: met.comentarios ?? '',
      // Métricas ampliadas: colunas próprias de redes_posts (nuláveis).
      visualizacoes: r.visualizacoes ?? '',
      visualizadores: r.visualizadores ?? '',
      visitasPerfil: r.visitas_perfil ?? '',
      seguidoresGanhos: r.seguidores_ganhos ?? '',
      pctNaoSeguidores: r.pct_nao_seguidores ?? '',
      tempoMedioAssistido: r.tempo_medio_assistido ?? '',
    },
    horario: r.hora ?? met.horario ?? '12:00',
  };
}

function postToRow(p) {
  const m = p.metricas ?? {};
  return {
    data: p.data,
    redes: p.redes ?? [],
    titulo: p.titulo ?? '',
    status: p.status ?? 'ideia',
    formato: p.formato ?? 'Feed',
    conteudo: p.conteudo ?? '',
    imagem_url: p.imagemUrl ?? null,
    midias: Array.isArray(p.midias) ? p.midias : [],
    hora: p.horario ?? '12:00',
    metricas: {
      alcance: m.alcance ?? '',
      curtidas: m.curtidas ?? '',
      comentarios: m.comentarios ?? '',
    },
    // Métricas ampliadas → colunas próprias, nuláveis.
    visualizacoes: numOrNull(m.visualizacoes),
    visualizadores: numOrNull(m.visualizadores),
    visitas_perfil: numOrNull(m.visitasPerfil),
    seguidores_ganhos: numOrNull(m.seguidoresGanhos),
    pct_nao_seguidores: numOrNull(m.pctNaoSeguidores),
    tempo_medio_assistido: numOrNull(m.tempoMedioAssistido),
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
    seguidoresLiquidos: r.seguidores_liquidos,
    alcance: r.alcance,
    interacoes: r.interacoes,
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
    seguidores_liquidos: n(m.seguidoresLiquidos),
    alcance: n(m.alcance),
    interacoes: n(m.interacoes),
    impressoes: n(m.impressoes),
    engajamento: calcEngajamento(m.interacoes, m.alcance),
    posts_publicados: n(m.postsPublicados),
  };
}

function comentarioFromRow(r) {
  return {
    id: r.id,
    postId: r.post_id,
    autorId: r.autor_id,
    autorNome: r.autor_nome ?? '',
    texto: r.texto ?? '',
    criadoEm: r.criado_em,
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

// Seguidores líquidos com destaque de sinal: verde (+), vermelho (-), neutro (0).
// Sem dado (lançamento antigo) exibe "—", nunca zero.
function SegLiqValue({ v }) {
  if (v == null) return <span>—</span>;
  const num = Number(v);
  const color = num > 0 ? 'var(--green)' : num < 0 ? 'var(--red)' : 'var(--text2)';
  return <span style={{ color }}>{num > 0 ? '+' : ''}{num.toLocaleString('pt-BR')}</span>;
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
  const isMobile = useMediaQuery(MOBILE_Q);
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
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18, flexWrap: 'wrap' }}>
        <div style={{ width: 36, height: 36, borderRadius: 9, background: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <cfg.Icon size={17} style={{ color: `var(${cfg.color})` }} />
        </div>
        <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--text)', minWidth: 0, flex: isMobile ? '1 0 60%' : '0 1 auto' }}>{conta.nome || cfg.label} — Detalhes</div>
        <div style={{ marginLeft: isMobile ? 0 : 'auto', width: isMobile ? '100%' : 'auto', display: 'flex', gap: 8 }}>
          <PermissionGate module="redes" action="edit">
            <button onClick={onLogMetrics}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: isMobile ? '10px 12px' : '6px 12px', minHeight: isMobile ? 44 : undefined, flex: isMobile ? 1 : undefined, borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-body)', background: 'var(--accent)', border: 'none', color: '#fff' }}>
              <Plus size={12} /> {isMobile ? 'Lançar métricas' : 'Lançar métricas do período'}
            </button>
          </PermissionGate>
          <PermissionGate module="redes" action="delete">
            <button onClick={onDelete} title="Remover rede"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: isMobile ? 44 : 30, height: isMobile ? 44 : 30, flexShrink: 0, borderRadius: 8, cursor: 'pointer', background: 'transparent', border: '1px solid var(--border2)', color: 'var(--text3)' }}>
              <Trash2 size={13} />
            </button>
          </PermissionGate>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2,1fr)' : 'repeat(4,1fr)', gap: 12, marginBottom: 18 }}>
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
        ) : isMobile ? (
          <div style={{ maxHeight: 360, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {history.map((h) => {
              const pares = [
                ['Seguidores', fmtNum(h.seguidores)],
                ['Seg. líq.', <SegLiqValue key="sl" v={h.seguidoresLiquidos} />],
                ['Alcance', fmtNum(h.alcance)],
                ['Interações', fmtNum(h.interacoes)],
                ['Impressões', fmtNum(h.impressoes)],
                ['Engaj.', h.engajamento == null ? '—' : `${h.engajamento}%`],
                ['Posts', fmtNum(h.postsPublicados)],
              ];
              return (
                <div key={h.id} style={{ background: 'var(--bg3)', borderRadius: 8, padding: '10px 12px' }}>
                  <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)', marginBottom: 8 }}>
                    {h.dataReferencia ? h.dataReferencia.split('-').reverse().join('/') : '—'}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 12px' }}>
                    {pares.map(([lbl, val]) => (
                      <div key={lbl}>
                        <div style={{ fontSize: 10, color: 'var(--text3)' }}>{lbl}</div>
                        <div style={{ fontSize: 12, color: 'var(--text2)' }}>{val}</div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ maxHeight: 220, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '80px repeat(7,1fr)', gap: 6, fontSize: 10, color: 'var(--text3)', padding: '0 10px' }}>
              <span>Data</span><span>Seguidores</span><span>Seg. líq.</span><span>Alcance</span><span>Interações</span><span>Impressões</span><span>Engaj.</span><span>Posts</span>
            </div>
            {history.map((h) => (
              <div key={h.id} style={{ display: 'grid', gridTemplateColumns: '80px repeat(7,1fr)', gap: 6, fontSize: 11, color: 'var(--text2)', background: 'var(--bg3)', borderRadius: 6, padding: '7px 10px' }}>
                <span>{h.dataReferencia ? h.dataReferencia.split('-').reverse().join('/') : '—'}</span>
                <span>{fmtNum(h.seguidores)}</span>
                <SegLiqValue v={h.seguidoresLiquidos} />
                <span>{fmtNum(h.alcance)}</span>
                <span>{fmtNum(h.interacoes)}</span>
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
// Badge compacto de contagem de comentários — só aparece quando há pelo menos 1,
// para a equipe perceber que há algo para ler sem abrir post por post.
function CommentCountBadge({ count, size = 9 }) {
  if (!count) return null;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, fontSize: size, color: 'var(--accent2)', flexShrink: 0 }}>
      <MessageCircle size={size} /> {count}
    </span>
  );
}

function CalendarCell({ day, posts, contas, onPostClick, isToday, curMonthLabel, isMobile, commentCounts }) {
  const { openAI } = useUI();
  return (
    <div style={{ minHeight: 90, minWidth: 0, background: isToday ? 'color-mix(in srgb, var(--accent) 8%, var(--bg2))' : 'var(--bg2)', border: `1px solid ${isToday ? 'var(--accent)' : 'var(--border)'}`, borderRadius: 10, padding: '6px 8px', display: 'flex', flexDirection: 'column', gap: 4, overflow: 'hidden' }}>
      <div style={{ fontSize: 11, fontWeight: isToday ? 600 : 400, color: isToday ? 'var(--accent)' : 'var(--text3)', marginBottom: 2 }}>{day}</div>
      {posts.map((p) => {
        const conta = contas.find((c) => c.id === (p.redes && p.redes[0]));
        const cfg = conta ? platformCfg(conta.plataforma) : null;
        const st  = POST_STATUS[p.status] || POST_STATUS.ideia;
        return (
          <div key={p.id} title={p.titulo} onClick={() => onPostClick(p)}
            style={{ padding: '3px 6px', borderRadius: 6, background: st.bg, fontSize: 10, color: st.color, lineHeight: 1.3, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3, minWidth: 0 }}>
            {cfg && <cfg.Icon size={9} style={{ flexShrink: 0 }} />}
            <span style={{ minWidth: 0, flex: 1, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{p.titulo}</span>
            <CommentCountBadge count={commentCounts?.[p.id]} />
          </div>
        );
      })}
      {posts.length === 0 && (
        <PermissionGate module="ia" action="view">
          <button onClick={() => openAI(`Sugira um conteúdo para postar nas redes sociais no dia ${day} de ${curMonthLabel}. Empresa B2B para PMEs brasileiras. Sugestões para: Instagram (carrossel ou reels) e LinkedIn (artigo ou post). Inclua: tema, formato, legenda de exemplo e hashtags relevantes.`)}
            style={{ marginTop: 'auto', opacity: isMobile ? 0.7 : 0, transition: 'opacity .15s', padding: '2px 4px', borderRadius: 4, background: 'transparent', border: '1px dashed var(--border)', color: 'var(--text3)', fontSize: 9, cursor: 'pointer', fontFamily: 'var(--font-body)' }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = 1}
            onMouseLeave={(e) => e.currentTarget.style.opacity = isMobile ? 0.7 : 0}>
            + IA
          </button>
        </PermissionGate>
      )}
    </div>
  );
}

function CalendarGrid({ posts, contas, filterRede, onPostClick, viewDate, isMobile, commentCounts }) {
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
    <div style={isMobile ? { overflowX: 'auto', WebkitOverflowScrolling: 'touch' } : undefined}>
      <div style={isMobile ? { minWidth: 640 } : undefined}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4, marginBottom: 4 }}>
          {DOW.map((d) => (
            <div key={d} style={{ textAlign: 'center', fontSize: 11, color: 'var(--text3)', padding: '4px 0' }}>{d}</div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4 }}>
          {cells.map((cell) =>
            cell.empty
              ? <div key={cell.key} style={{ minWidth: 0 }} />
              : <CalendarCell key={cell.day} day={cell.day} posts={cell.posts} contas={contas} isToday={cell.isToday} curMonthLabel={curMonthLabel} onPostClick={onPostClick} isMobile={isMobile} commentCounts={commentCounts} />
          )}
        </div>
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

/* ─── Lightbox (mídia em tela cheia) ─────────────────────────────────────────── */
// items: [{ tipo:'imagem'|'video', previewUrl }]. Fecha por X, Esc ou clique no
// fundo. Em carrossel, navega por setas (tela e teclado) com indicador "n/total".
function MediaLightbox({ items, startIndex = 0, onClose }) {
  const isMobile = useMediaQuery(MOBILE_Q);
  const [idx, setIdx] = useState(startIndex);
  const multi = items.length > 1;
  const safeIdx = Math.max(0, Math.min(idx, items.length - 1));
  const cur = items[safeIdx];
  const touchX = useRef(null);

  const go = useCallback((dir) => {
    setIdx((i) => (i + dir + items.length) % items.length);
  }, [items.length]);

  function onTouchStart(e) { touchX.current = e.touches[0]?.clientX ?? null; }
  function onTouchEnd(e) {
    if (touchX.current == null || !multi) return;
    const dx = (e.changedTouches[0]?.clientX ?? touchX.current) - touchX.current;
    if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
    touchX.current = null;
  }

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight' && multi) go(1);
      else if (e.key === 'ArrowLeft' && multi) go(-1);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go, multi, onClose]);

  if (!cur) return null;

  const navBtn = {
    background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.25)', color: '#fff',
    width: isMobile ? 44 : 42, height: isMobile ? 44 : 42, borderRadius: '50%', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    ...(isMobile ? { position: 'absolute', top: '50%', transform: 'translateY(-50%)', zIndex: 1 } : {}),
  };

  return createPortal(
    <div onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: isMobile ? 0 : 16, padding: isMobile ? 12 : 24 }}>
      <button onClick={onClose} title="Fechar (Esc)"
        style={{ position: 'absolute', top: 16, right: 16, background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.25)', color: '#fff', width: isMobile ? 44 : 38, height: isMobile ? 44 : 38, borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2 }}>
        <X size={18} />
      </button>
      {multi && <button onClick={(e) => { e.stopPropagation(); go(-1); }} style={{ ...navBtn, ...(isMobile ? { left: 8 } : {}) }}><ChevronLeft size={20} /></button>}
      <div
        onClick={(e) => e.stopPropagation()}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        {cur.tipo === 'video' ? (
          <video src={cur.previewUrl || undefined} controls autoPlay playsInline
            style={{ maxWidth: isMobile ? '94vw' : '86vw', maxHeight: '78vh', borderRadius: 8, background: '#000' }} />
        ) : (
          <img src={cur.previewUrl || undefined} alt=""
            style={{ maxWidth: isMobile ? '94vw' : '86vw', maxHeight: '78vh', objectFit: 'contain', borderRadius: 8 }} />
        )}
        {multi && (
          <div style={{ color: '#fff', fontSize: 12, background: 'rgba(0,0,0,0.5)', padding: '4px 12px', borderRadius: 20 }}>
            {safeIdx + 1}/{items.length}
          </div>
        )}
      </div>
      {multi && <button onClick={(e) => { e.stopPropagation(); go(1); }} style={{ ...navBtn, ...(isMobile ? { right: 8 } : {}) }}><ChevronRight size={20} /></button>}
    </div>,
    document.body,
  );
}

/* ─── Campo de mídia do post (upload, carrossel, vídeo, lightbox) ─────────────── */
function PostMediaField({ formato, midias, setMidias, canEdit, empresaId, registerUpload, isSessionUpload }) {
  const fileRef = useRef(null);
  const [lightboxAt, setLightboxAt] = useState(null);
  const [fieldErr, setFieldErr] = useState('');

  const kind     = tipoMidiaDoFormato(formato);
  const multiple = formatoMultiplo(formato);
  const accept   = (kind === 'video' ? VIDEO_MIME : IMG_MIME).join(',');
  const ready    = midias.filter((m) => m.status !== 'error');
  const atLimit  = multiple ? ready.length >= MAX_CARROSSEL : ready.length >= 1;
  const reorder  = canEdit && multiple && midias.length > 1;

  // itens navegáveis no lightbox (só os que já têm preview)
  const viewable = midias.filter((m) => m.previewUrl && m.status !== 'error');

  function revoke(m) {
    if (m?.previewUrl && m.previewUrl.startsWith('blob:')) URL.revokeObjectURL(m.previewUrl);
  }

  async function uploadOne(file) {
    const isVideo = VIDEO_MIME.includes(file.type);
    const isImg   = IMG_MIME.includes(file.type);
    if (kind === 'video' && !isVideo) { setFieldErr('Reels aceita vídeo: MP4, MOV ou WEBM.'); return; }
    if (kind === 'imagem' && !isImg)  { setFieldErr('Formato de imagem inválido. Use JPG, PNG, WEBP ou GIF.'); return; }
    if (isVideo && file.size > MAX_VIDEO_BYTES) { setFieldErr('Vídeo acima de 200 MB.'); return; }
    if (isImg && file.size > MAX_IMG_BYTES)     { setFieldErr('Imagem acima de 10 MB.'); return; }

    const key = `up-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const previewUrl = URL.createObjectURL(file);
    setMidias((prev) => [...prev, { key, path: null, tipo: isVideo ? 'video' : 'imagem', mime: file.type, previewUrl, status: 'uploading', legacy: false }]);

    const path = midiaStoragePath(empresaId, file);
    const { error } = await supabase.storage.from(REDES_BUCKET).upload(path, file, { contentType: file.type, upsert: false });
    if (error) {
      setMidias((prev) => prev.map((m) => (m.key === key ? { ...m, status: 'error', errorMsg: 'Falha no upload. Tente de novo.' } : m)));
      return;
    }
    registerUpload(path);
    setMidias((prev) => prev.map((m) => (m.key === key ? { ...m, path, status: 'ready' } : m)));
  }

  async function handleFiles(list) {
    setFieldErr('');
    const files = Array.from(list);
    if (!files.length) return;
    if (!multiple) {
      setMidias((prev) => { prev.forEach(revoke); return []; });
      await uploadOne(files[0]);
      return;
    }
    const room = MAX_CARROSSEL - ready.length;
    if (files.length > room) setFieldErr(`O carrossel do Instagram aceita até ${MAX_CARROSSEL} imagens.`);
    for (const f of files.slice(0, Math.max(0, room))) {
      await uploadOne(f);
    }
  }

  function removeAt(idx) {
    setMidias((prev) => {
      const m = prev[idx];
      revoke(m);
      // Só apaga do Storage já se o arquivo foi enviado agora nesta sessão.
      // Mídia que já estava salva no post só some do Storage quando o post é
      // salvo (senão um "Cancelar" deixaria a linha apontando p/ arquivo morto).
      if (m?.path && isSessionUpload(m.path)) {
        supabase.storage.from(REDES_BUCKET).remove([m.path]);
      }
      return prev.filter((_, i) => i !== idx);
    });
  }

  function onDragEnd(result) {
    if (!result.destination) return;
    setMidias((prev) => {
      const arr = [...prev];
      const [moved] = arr.splice(result.source.index, 1);
      arr.splice(result.destination.index, 0, moved);
      return arr;
    });
  }

  const openLightbox = (m) => {
    const at = viewable.findIndex((v) => v.key === m.key);
    if (at >= 0) setLightboxAt(at);
  };

  function Thumb({ item, index, dragHandle }) {
    return (
      <div
        onClick={() => item.status !== 'error' && item.previewUrl && openLightbox(item)}
        style={{ position: 'relative', width: 84, height: 84, borderRadius: 8, overflow: 'hidden', background: 'var(--bg4)', border: `1px solid ${item.status === 'error' ? 'var(--red)' : 'var(--border)'}`, flexShrink: 0, cursor: item.previewUrl && item.status !== 'error' ? 'zoom-in' : 'default' }}
        {...(dragHandle || {})}>
        {item.previewUrl ? (
          item.tipo === 'video'
            ? <video src={item.previewUrl} muted playsInline style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#000' }} />
            : <img src={item.previewUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text3)' }}>
            {item.tipo === 'video' ? <Film size={18} /> : <ImageIcon size={18} />}
          </div>
        )}
        {item.tipo === 'video' && item.status === 'ready' && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
            <Play size={20} style={{ color: '#fff', filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.7))' }} />
          </div>
        )}
        {item.status === 'uploading' && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#fff' }}>enviando…</div>
        )}
        {item.status === 'error' && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(240,92,92,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: 'var(--red)', textAlign: 'center', padding: 4 }}>{item.errorMsg || 'erro'}</div>
        )}
        {reorder && (
          <div style={{ position: 'absolute', left: 3, top: 3, width: 18, height: 18, borderRadius: 5, background: 'rgba(0,0,0,0.55)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <GripVertical size={11} />
          </div>
        )}
        {multiple && item.status === 'ready' && (
          <div style={{ position: 'absolute', left: 4, bottom: 4, fontSize: 10, background: 'rgba(0,0,0,0.6)', color: '#fff', borderRadius: 4, padding: '0 5px' }}>{index + 1}</div>
        )}
        {canEdit && (
          <button onClick={(e) => { e.stopPropagation(); removeAt(index); }} title="Remover"
            style={{ position: 'absolute', top: 3, right: 3, width: 20, height: 20, borderRadius: '50%', background: 'rgba(0,0,0,0.65)', border: 'none', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <X size={11} />
          </button>
        )}
      </div>
    );
  }

  const addLabel = multiple
    ? `Adicionar imagens (${ready.length}/${MAX_CARROSSEL})`
    : kind === 'video' ? 'Carregar vídeo (Reels)' : 'Carregar imagem';

  return (
    <div>
      <label style={{ fontSize: 11, color: 'var(--text3)', display: 'block', marginBottom: 8 }}>
        {kind === 'video' ? 'VÍDEO' : multiple ? 'IMAGENS DO CARROSSEL' : 'IMAGEM'}
      </label>

      {midias.length > 0 && (
        reorder ? (
          <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId="post-midias" direction="horizontal">
              {(prov) => (
                <div ref={prov.innerRef} {...prov.droppableProps} style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
                  {midias.map((m, i) => (
                    <Draggable key={m.key} draggableId={m.key} index={i}>
                      {(dp) => (
                        <div ref={dp.innerRef} {...dp.draggableProps}>
                          <Thumb item={m} index={i} dragHandle={dp.dragHandleProps} />
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {prov.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
            {midias.map((m, i) => <Thumb key={m.key} item={m} index={i} />)}
          </div>
        )
      )}

      {canEdit && !atLimit && (
        <button onClick={() => fileRef.current?.click()}
          style={{ width: '100%', padding: 12, borderRadius: 8, background: 'var(--bg3)', border: '1px dashed var(--border2)', color: 'var(--text3)', fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font-body)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <Upload size={12} /> {addLabel}
        </button>
      )}

      {!canEdit && midias.length === 0 && (
        <div style={{ fontSize: 12, color: 'var(--text3)' }}>Sem mídia.</div>
      )}

      {reorder && (
        <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 6 }}>Arraste as miniaturas para reordenar a publicação.</div>
      )}
      {fieldErr && <div style={{ fontSize: 11, color: 'var(--amber)', marginTop: 6 }}>{fieldErr}</div>}

      <input ref={fileRef} type="file" accept={accept} multiple={multiple} style={{ display: 'none' }}
        onChange={(e) => { handleFiles(e.target.files); e.target.value = ''; }} />

      {lightboxAt != null && viewable.length > 0 && (
        <MediaLightbox items={viewable} startIndex={lightboxAt} onClose={() => setLightboxAt(null)} />
      )}
    </div>
  );
}

/* ─── Métricas por post ──────────────────────────────────────────────────────── */
// São muitos campos — agrupados por leitura: alcance/visualizações,
// interações e conversão. Todos opcionais. O campo "tempo médio assistido"
// só entra quando o formato é de vídeo (Reels/Vídeo/Shorts).
const METRIC_GROUPS = [
  {
    titulo: 'Alcance e visualizações',
    campos: [
      { k: 'alcance',          lbl: 'Alcance',         Icon: Eye },
      { k: 'visualizacoes',    lbl: 'Visualizações',   Icon: BarChart2 },
      { k: 'visualizadores',   lbl: 'Visualizadores',  Icon: Users },
      { k: 'pctNaoSeguidores', lbl: '% não seguidores', Icon: Globe, tipo: 'pct' },
    ],
  },
  {
    titulo: 'Interações',
    campos: [
      { k: 'curtidas',    lbl: 'Curtidas',    Icon: Heart },
      { k: 'comentarios', lbl: 'Comentários', Icon: MessageCircle },
    ],
  },
  {
    titulo: 'Conversão',
    campos: [
      { k: 'visitasPerfil',    lbl: 'Visitas ao perfil', Icon: AtSign },
      { k: 'seguidoresGanhos', lbl: 'Seguidores',        Icon: TrendingUp },
    ],
  },
];

const metricValueStyle = { fontSize: 14, fontWeight: 500, color: 'var(--text)', fontFamily: 'var(--font-display)' };
const metricCardStyle  = { background: 'var(--bg3)', borderRadius: 8, padding: 10 };
const metricLabelStyle = { display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text3)', marginBottom: 6 };

// "Tempo médio assistido": aceita "mm:ss" ou segundos ao digitar, normaliza no
// blur, exibe sempre como m:ss. Só leitura quando o usuário não pode editar.
function DuracaoField({ value, onChange, canEdit, inp }) {
  const canonical = value === '' || value == null ? '' : fmtDuracao(value);
  // Espelho local só enquanto o usuário digita; ao mudar o valor de fora
  // (ex.: normalização no blur → segundos), reencaixa no formato m:ss.
  const [text, setText] = useState(canonical);
  const [seen, setSeen] = useState(canonical);
  if (seen !== canonical) { setSeen(canonical); setText(canonical); }
  if (!canEdit) return <div style={metricValueStyle}>{fmtDuracao(value)}</div>;
  return (
    <input
      type="text"
      style={{ ...inp, padding: '5px 8px' }}
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={() => onChange(parseDuracao(text))}
      placeholder="mm:ss"
    />
  );
}

function PostMetricas({ formato, metricas, setMet, canEdit, inp }) {
  const isVideo = formatoAceitaVideo(formato);

  const renderCampo = ({ k, lbl, Icon, tipo }) => {
    const raw = metricas[k] ?? '';
    const display = tipo === 'pct'
      ? (raw === '' ? '—' : `${raw}%`)
      : fmtNum(raw);
    return (
      <div key={k} style={metricCardStyle}>
        <div style={metricLabelStyle}><Icon size={11} /> {lbl}</div>
        {canEdit ? (
          <input
            type="number"
            min="0"
            {...(tipo === 'pct' ? { max: '100', step: '0.1' } : {})}
            style={{ ...inp, padding: '5px 8px' }}
            value={raw}
            onChange={(e) => setMet(k, e.target.value)}
            placeholder={tipo === 'pct' ? '%' : '0'}
          />
        ) : (
          <div style={metricValueStyle}>{display}</div>
        )}
      </div>
    );
  };

  return (
    <div>
      <label style={{ fontSize: 11, color: 'var(--text3)', display: 'block', marginBottom: 8 }}>MÉTRICAS</label>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {METRIC_GROUPS.map((g) => (
          <div key={g.titulo}>
            <div style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 6 }}>{g.titulo}</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8 }}>
              {g.campos.map(renderCampo)}
              {g.titulo === 'Alcance e visualizações' && isVideo && (
                <div style={metricCardStyle}>
                  <div style={metricLabelStyle}><Play size={11} /> Tempo médio assistido</div>
                  <DuracaoField
                    value={metricas.tempoMedioAssistido}
                    onChange={(v) => setMet('tempoMedioAssistido', v)}
                    canEdit={canEdit}
                    inp={inp}
                  />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Desempenho (ranking de posts por performance) ──────────────────────────── */
// Métricas pelas quais o ranking pode ordenar. `key` aponta direto para
// post.metricas; "engajamento" é derivado; "tempo médio assistido" só entra
// quando há post de vídeo no recorte.
const DESEMPENHO_METRICAS = [
  { id: 'engajamento',         label: 'Engajamento',           derivada: true },
  { id: 'alcance',             label: 'Alcance',               key: 'alcance' },
  { id: 'visualizacoes',       label: 'Visualizações',         key: 'visualizacoes' },
  { id: 'curtidas',            label: 'Curtidas',              key: 'curtidas' },
  { id: 'comentarios',         label: 'Comentários',           key: 'comentarios' },
  { id: 'visitasPerfil',       label: 'Visitas ao perfil',     key: 'visitasPerfil' },
  { id: 'seguidoresGanhos',    label: 'Seguidores ganhos',     key: 'seguidoresGanhos' },
  { id: 'tempoMedioAssistido', label: 'Tempo médio assistido', key: 'tempoMedioAssistido', video: true },
];

const DESEMPENHO_PERIODOS = [
  { id: 'mes',       label: 'Mês' },
  { id: 'trimestre', label: 'Trimestre' },
  { id: 'ano',       label: 'Ano' },
  { id: 'tudo',      label: 'Todo o período' },
  { id: 'custom',    label: 'Personalizado' },
];

// Mesma lógica de recorte temporal do Painel/KPIs, para ficar consistente.
// Retorna o intervalo em milissegundos; `fim` só é preenchido no período
// personalizado (nos demais, a data final é implicitamente "agora").
function desempenhoRangePeriodo(periodo, customRange) {
  const now = new Date();
  if (periodo === 'custom') {
    const from = customRange?.from ? new Date(customRange.from + 'T00:00:00').getTime() : null;
    const to   = customRange?.to   ? new Date(customRange.to   + 'T23:59:59.999').getTime() : null;
    return { inicio: from, fim: to };
  }
  let inicio;
  switch (periodo) {
    case 'mes':       inicio = new Date(now.getFullYear(), now.getMonth(), 1); break;
    case 'trimestre': inicio = new Date(now.getFullYear(), now.getMonth() - 3, 1); break;
    case 'ano':       inicio = new Date(now.getFullYear(), 0, 1); break;
    default:          inicio = new Date(0);
  }
  return { inicio: inicio.getTime(), fim: null };
}

// true quando o período personalizado tem as duas datas e a final não é
// anterior à inicial.
function desempenhoCustomValido(periodo, customRange) {
  if (periodo !== 'custom') return true;
  return !!(customRange.from && customRange.to && customRange.to >= customRange.from);
}

// Interações do post = curtidas + comentários (o que existe por post). null
// quando nenhum dos dois foi preenchido — não se fabrica engajamento do nada.
function interacoesDoPost(m) {
  const c = m?.curtidas, co = m?.comentarios;
  if ((c === '' || c == null) && (co === '' || co == null)) return null;
  return Number(c || 0) + Number(co || 0);
}

// Valor da métrica para um post. null = post não tem esse dado (vai para o fim
// da lista, sob "Sem dados", nunca tratado como zero).
function valorMetricaPost(post, metricaId) {
  const m = post.metricas ?? {};
  if (metricaId === 'engajamento') return calcEngajamento(interacoesDoPost(m), m.alcance);
  const raw = m[metricaId];
  return raw === '' || raw == null ? null : Number(raw);
}

function fmtValorMetrica(metricaId, v) {
  if (v == null || !Number.isFinite(Number(v))) return '—';
  if (metricaId === 'engajamento')         return `${Number(v).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%`;
  if (metricaId === 'tempoMedioAssistido') return fmtDuracao(Math.round(v));
  return fmtNum(v);
}

function DesempenhoResumoCard({ label, value, sub, Icon }) {
  return (
    <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: '16px 18px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text3)', marginBottom: 8 }}>
        {Icon && <Icon size={12} />} {label}
      </div>
      <div style={{ fontSize: 20, fontWeight: 600, color: 'var(--text)', fontFamily: 'var(--font-display)', lineHeight: 1.2, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 3, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{sub}</div>}
    </div>
  );
}

function DesempenhoRow({ post, metricaId, metricaLabel, valor, semDado, rank, contas, midiaUrls, onPostClick, isMobile }) {
  const redes = (post.redes || []).map((id) => contas.find((c) => c.id === id)).filter(Boolean);
  const primeira   = (post.midias && post.midias[0]) || null;
  const thumbUrl   = primeira ? midiaUrls[primeira.path] : post.imagemUrl;
  const thumbVideo = primeira?.tipo === 'video';
  const dataFmt    = post.data ? post.data.split('-').reverse().join('/') : '—';

  // Demais métricas com valor preenchido, em menor evidência.
  const outras = DESEMPENHO_METRICAS
    .filter((m) => m.id !== metricaId)
    .map((m) => ({ id: m.id, label: m.label, v: valorMetricaPost(post, m.id) }))
    .filter((x) => x.v != null)
    .slice(0, 4);

  const thumbEl = thumbUrl ? (
    thumbVideo
      ? <div style={{ width: 44, height: 44, borderRadius: 8, flexShrink: 0, background: 'var(--bg4)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text3)' }}><Film size={15} /></div>
      : <img src={thumbUrl} alt="" style={{ width: 44, height: 44, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
  ) : (
    <div style={{ width: 44, height: 44, borderRadius: 8, flexShrink: 0, background: 'var(--bg4)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text3)' }}><ImageIcon size={15} /></div>
  );

  const metaLinha = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
      {redes.map((c) => {
        const cfg = platformCfg(c.plataforma);
        return (
          <span key={c.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 11, color: `var(${cfg.color})` }}>
            <cfg.Icon size={10} /> {c.nome || cfg.label}
          </span>
        );
      })}
      {post.formato && <span style={{ fontSize: 11, color: 'var(--text3)' }}>· {post.formato}</span>}
      <span style={{ fontSize: 11, color: 'var(--text3)' }}>· {dataFmt}</span>
    </div>
  );

  const outrasEl = outras.length > 0 && (
    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 5 }}>
      {outras.map((o) => (
        <span key={o.id} style={{ fontSize: 10, color: 'var(--text3)' }}>
          {o.label} <strong style={{ color: 'var(--text2)', fontWeight: 500 }}>{fmtValorMetrica(o.id, o.v)}</strong>
        </span>
      ))}
    </div>
  );

  const valorEl = semDado ? '—' : fmtValorMetrica(metricaId, valor);

  if (isMobile) {
    return (
      <div onClick={() => onPostClick(post)}
        style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8, cursor: 'pointer' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          {rank != null && (
            <div style={{ width: 18, textAlign: 'center', flexShrink: 0, fontSize: 13, fontWeight: 600, color: rank <= 3 ? 'var(--accent2)' : 'var(--text3)', fontFamily: 'var(--font-display)' }}>{rank}</div>
          )}
          {thumbEl}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div title={post.titulo} style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', marginBottom: 3, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{post.titulo || '(sem título)'}</div>
            {metaLinha}
          </div>
        </div>
        {outrasEl}
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10, borderTop: '1px solid var(--border)', paddingTop: 8 }}>
          <span style={{ fontSize: 11, color: 'var(--text3)' }}>{metricaLabel}</span>
          <span style={{ fontSize: 18, fontWeight: 600, fontFamily: 'var(--font-display)', lineHeight: 1.1, color: semDado ? 'var(--text3)' : 'var(--text)' }}>{valorEl}</span>
        </div>
      </div>
    );
  }

  return (
    <div onClick={() => onPostClick(post)}
      style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer', transition: 'border-color .15s' }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--border2)')}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}>
      {rank != null && (
        <div style={{ width: 20, textAlign: 'center', flexShrink: 0, fontSize: 13, fontWeight: 600, color: rank <= 3 ? 'var(--accent2)' : 'var(--text3)', fontFamily: 'var(--font-display)' }}>{rank}</div>
      )}
      {thumbEl}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div title={post.titulo} style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', marginBottom: 3, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{post.titulo || '(sem título)'}</div>
        {metaLinha}
        {outrasEl}
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0, minWidth: 64 }}>
        <div style={{ fontSize: 18, fontWeight: 600, fontFamily: 'var(--font-display)', lineHeight: 1.1, color: semDado ? 'var(--text3)' : 'var(--text)' }}>
          {valorEl}
        </div>
        <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 2 }}>{metricaLabel}</div>
      </div>
    </div>
  );
}

function DesempenhoRanking({ posts, contas, midiaUrls, onPostClick }) {
  const isMobile = useMediaQuery(MOBILE_Q);
  const [metricaSel, setMetricaSel] = useState('engajamento');
  const [periodo,    setPeriodo]    = useState('trimestre');
  const [customRange, setCustomRange] = useState({ from: '', to: '' });
  const [filterRede, setFilterRede] = useState('todas');

  const inp = { background: 'var(--bg4)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 10px', fontSize: 12, color: 'var(--text)', fontFamily: 'var(--font-body)', outline: 'none', cursor: 'pointer' };

  // Troca de período: só o período personalizado preserva as datas; escolher
  // outro período limpa o recorte personalizado (trocar métrica/rede não).
  const escolherPeriodo = (id) => {
    setPeriodo(id);
    if (id !== 'custom') setCustomRange({ from: '', to: '' });
  };

  const customValido    = desempenhoCustomValido(periodo, customRange);
  const customInvertido = periodo === 'custom' && customRange.from && customRange.to && customRange.to < customRange.from;

  // Recorte: só posts publicados, dentro do período e da rede filtrada.
  const recorte = useMemo(() => {
    if (!customValido) return [];
    const { inicio, fim } = desempenhoRangePeriodo(periodo, customRange);
    return posts.filter((p) => {
      if (p.status !== 'publicado') return false;
      if (p.data) {
        const t = new Date(p.data + 'T00:00:00').getTime();
        if (Number.isFinite(t)) {
          if (inicio != null && t < inicio) return false;
          if (fim != null && t > fim) return false;
        }
      }
      if (filterRede !== 'todas' && !(p.redes || []).includes(filterRede)) return false;
      return true;
    });
  }, [posts, periodo, customRange, customValido, filterRede]);

  const temVideo     = recorte.some((p) => VIDEO_FORMATOS.includes(p.formato));
  const metricasDisp = DESEMPENHO_METRICAS.filter((m) => !m.video || temVideo);
  const metricaId    = metricasDisp.some((m) => m.id === metricaSel) ? metricaSel : 'engajamento';
  const metricaLabel = DESEMPENHO_METRICAS.find((m) => m.id === metricaId)?.label ?? '';

  // Com dado → ordenado do melhor para o pior. Sem dado → fim da lista.
  const { comDado, semDado } = useMemo(() => {
    const cd = [], sd = [];
    recorte.forEach((p) => {
      const v = valorMetricaPost(p, metricaId);
      if (v == null || !Number.isFinite(v)) sd.push(p);
      else cd.push({ post: p, valor: v });
    });
    cd.sort((a, b) => b.valor - a.valor);
    return { comDado: cd, semDado: sd };
  }, [recorte, metricaId]);

  const media  = comDado.length ? comDado.reduce((s, x) => s + x.valor, 0) / comDado.length : null;
  const melhor = comDado[0] || null;

  const redeOpts = [
    { id: 'todas', label: 'Todas', Icon: null, color: null },
    ...contas.map((c) => { const cfg = platformCfg(c.plataforma); return { id: c.id, label: c.nome || cfg.label, Icon: cfg.Icon, color: cfg.color }; }),
  ];

  return (
    <div>
      {/* Filtros */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'stretch' : 'center', marginBottom: 18 }}>
        <div style={isMobile ? { display: 'flex', flexDirection: 'column', gap: 4 } : undefined}>
          <span style={{ fontSize: 11, color: 'var(--text3)', marginRight: 6 }}>Ordenar por</span>
          <select value={metricaId} onChange={(e) => setMetricaSel(e.target.value)} style={{ ...inp, width: isMobile ? '100%' : undefined }}>
            {metricasDisp.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', background: 'var(--bg3)', borderRadius: 8, padding: 3, gap: 2, flexWrap: 'wrap' }}>
          {DESEMPENHO_PERIODOS.map((p) => (
            <button key={p.id} onClick={() => escolherPeriodo(p.id)}
              style={{ padding: '4px 12px', borderRadius: 6, fontSize: 12, border: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)', fontWeight: 500, transition: 'all .12s', background: periodo === p.id ? 'var(--bg2)' : 'transparent', color: periodo === p.id ? 'var(--text)' : 'var(--text3)', boxShadow: periodo === p.id ? '0 1px 3px rgba(0,0,0,0.2)' : 'none' }}>
              {p.label}
            </button>
          ))}
        </div>
        {periodo === 'custom' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', width: isMobile ? '100%' : undefined }}>
            <input type="date" value={customRange.from} max={customRange.to || undefined}
              onChange={(e) => setCustomRange((r) => ({ ...r, from: e.target.value }))}
              style={{ ...inp, colorScheme: 'dark', cursor: 'text', flex: isMobile ? 1 : undefined }} />
            <span style={{ fontSize: 12, color: 'var(--text3)' }}>até</span>
            <input type="date" value={customRange.to} min={customRange.from || undefined}
              onChange={(e) => setCustomRange((r) => ({ ...r, to: e.target.value }))}
              style={{ ...inp, colorScheme: 'dark', cursor: 'text', flex: isMobile ? 1 : undefined }} />
            {customInvertido && (
              <span style={{ fontSize: 11, color: 'var(--red)' }}>A data final não pode ser anterior à inicial.</span>
            )}
          </div>
        )}
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          {redeOpts.map((opt) => (
            <button key={opt.id} onClick={() => setFilterRede(opt.id)}
              style={{ display: 'flex', alignItems: 'center', gap: 4, padding: isMobile ? '8px 12px' : '4px 10px', minHeight: isMobile ? 40 : undefined, borderRadius: 20, fontSize: 11, border: '1px solid', cursor: 'pointer', fontFamily: 'var(--font-body)', transition: 'all .15s', background: filterRede === opt.id ? 'var(--accent)' : 'transparent', borderColor: filterRede === opt.id ? 'var(--accent)' : 'var(--border)', color: filterRede === opt.id ? '#fff' : 'var(--text3)' }}>
              {opt.Icon && <opt.Icon size={10} />}
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {periodo === 'custom' && customValido && (
        <div style={{ fontSize: 11, color: 'var(--text3)', margin: '-8px 2px 14px' }}>
          Período: {customRange.from.split('-').reverse().join('/')} até {customRange.to.split('-').reverse().join('/')}
        </div>
      )}

      {/* Resumo */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3,1fr)', gap: 14, marginBottom: 20 }}>
        <DesempenhoResumoCard
          Icon={Trophy}
          label="Melhor post do período"
          value={melhor ? fmtValorMetrica(metricaId, melhor.valor) : '—'}
          sub={melhor ? (melhor.post.titulo || '(sem título)') : 'Nenhum post com esta métrica'}
        />
        <DesempenhoResumoCard
          Icon={TrendingUp}
          label={`Média — ${metricaLabel}`}
          value={media == null ? '—' : fmtValorMetrica(metricaId, media)}
          sub={comDado.length ? `sobre ${comDado.length} post${comDado.length > 1 ? 's' : ''} com dado` : null}
        />
        <DesempenhoResumoCard
          Icon={BarChart2}
          label="Posts considerados"
          value={comDado.length}
          sub={`de ${recorte.length} publicado${recorte.length !== 1 ? 's' : ''} no período`}
        />
      </div>

      {/* Lista */}
      {periodo === 'custom' && !customValido ? (
        <div style={{ textAlign: 'center', padding: '50px 20px', background: 'var(--bg2)', border: '1px dashed var(--border2)', borderRadius: 14 }}>
          <Award size={24} style={{ color: 'var(--text3)', marginBottom: 10 }} />
          <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 4 }}>
            {customInvertido ? 'Intervalo de datas inválido' : 'Escolha o período personalizado'}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text3)' }}>
            {customInvertido
              ? 'A data final não pode ser anterior à inicial.'
              : 'Selecione a data inicial e a data final para ver o ranking.'}
          </div>
        </div>
      ) : recorte.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '50px 20px', background: 'var(--bg2)', border: '1px dashed var(--border2)', borderRadius: 14 }}>
          <Award size={24} style={{ color: 'var(--text3)', marginBottom: 10 }} />
          <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 4 }}>Nenhum post publicado neste recorte</div>
          <div style={{ fontSize: 12, color: 'var(--text3)' }}>Publique posts e registre as métricas no calendário para ver o ranking.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {comDado.map((x, i) => (
            <DesempenhoRow key={x.post.id} post={x.post} metricaId={metricaId} metricaLabel={metricaLabel}
              valor={x.valor} rank={i + 1} contas={contas} midiaUrls={midiaUrls} onPostClick={onPostClick} isMobile={isMobile} />
          ))}
          {semDado.length > 0 && (
            <>
              <div style={{ fontSize: 11, color: 'var(--text3)', margin: '10px 2px 2px', textTransform: 'uppercase', letterSpacing: '.04em' }}>
                Sem dados para esta métrica ({semDado.length})
              </div>
              {semDado.map((p) => (
                <DesempenhoRow key={p.id} post={p} metricaId={metricaId} metricaLabel={metricaLabel}
                  valor={null} semDado contas={contas} midiaUrls={midiaUrls} onPostClick={onPostClick} isMobile={isMobile} />
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Comentários do post ─────────────────────────────────────────────────────
   Disponível para qualquer papel com redes/view — inclusive 'cliente' (que só
   lê o resto do módulo): é a exceção deliberada para permitir sugestões e
   pedidos de alteração no post. Quem escreveu apaga o próprio comentário;
   quem tem redes/edit apaga qualquer um (mesma regra do banco, ver migration
   redes_posts_comentarios). ────────────────────────────────────────────────── */
function PostComentarios({ postId, userId, autorNome, canModerar, onCountChange }) {
  const [comentarios, setComentarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    let cancelled = false;
    supabase.from('redes_posts_comentarios').select('*').eq('post_id', postId).order('criado_em', { ascending: true })
      .then(({ data }) => {
        if (cancelled) return;
        setComentarios((data ?? []).map(comentarioFromRow));
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [postId]);

  async function enviar() {
    const t = texto.trim();
    if (!t || enviando) return;
    setEnviando(true);
    const { data, error } = await supabase
      .from('redes_posts_comentarios')
      .insert({ post_id: postId, texto: t, autor_nome: autorNome || 'Usuário' })
      .select().single();
    setEnviando(false);
    if (error || !data) return;
    setComentarios((prev) => [...prev, comentarioFromRow(data)]);
    setTexto('');
    onCountChange?.(postId, 1);
  }

  async function remover(id) {
    const anterior = comentarios;
    setComentarios((prev) => prev.filter((c) => c.id !== id));
    const { error } = await supabase.from('redes_posts_comentarios').delete().eq('id', id);
    if (error) { setComentarios(anterior); return; }
    onCountChange?.(postId, -1);
  }

  const inp = { background: 'var(--bg4)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: 'var(--text)', fontFamily: 'var(--font-body)', width: '100%', boxSizing: 'border-box', outline: 'none' };

  return (
    <div>
      <label style={{ fontSize: 11, color: 'var(--text3)', display: 'block', marginBottom: 8 }}>COMENTÁRIOS</label>

      {loading ? (
        <div style={{ fontSize: 12, color: 'var(--text3)' }}>Carregando comentários…</div>
      ) : comentarios.length === 0 ? (
        <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 10 }}>Nenhum comentário ainda.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 10, maxHeight: 220, overflowY: 'auto' }}>
          {comentarios.map((c) => (
            <div key={c.id} style={{ background: 'var(--bg3)', borderRadius: 8, padding: '8px 10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text2)' }}>{c.autorNome || 'Usuário'}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                  <span style={{ fontSize: 10, color: 'var(--text3)' }}>{fmtDataHora(c.criadoEm)}</span>
                  {(canModerar || c.autorId === userId) && (
                    <button onClick={() => remover(c.id)} title="Apagar comentário"
                      style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text3)', padding: 2, display: 'flex' }}>
                      <Trash2 size={11} />
                    </button>
                  )}
                </div>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{c.texto}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8 }}>
        <input style={inp} value={texto} onChange={(e) => setTexto(e.target.value)}
          placeholder="Escreva uma sugestão ou pedido de alteração..."
          onKeyDown={(e) => { if (e.key === 'Enter') enviar(); }} />
        <button onClick={enviar} disabled={!texto.trim() || enviando}
          style={{ flexShrink: 0, padding: '8px 14px', borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: !texto.trim() || enviando ? 'not-allowed' : 'pointer', opacity: !texto.trim() || enviando ? 0.5 : 1, fontFamily: 'var(--font-body)', background: 'var(--accent)', border: 'none', color: '#fff' }}>
          Enviar
        </button>
      </div>
    </div>
  );
}

/* ─── Post Modal ─────────────────────────────────────────────────────────────── */
function PostModal({ post, contas, empresaId, onSave, onDelete, onDuplicate, onClose, openAI, onCommentsCountChange }) {
  const { hasPermission, user } = useAuth();
  const isMobile = useMediaQuery(MOBILE_Q);
  const canEdit = hasPermission('redes', 'edit');
  const isEdit = !!post?.id;
  const [form, setForm] = useState(() => ({
    titulo: '', conteudo: '',
    data: todayISO(),
    horario: '12:00', formato: 'Feed', status: 'ideia',
    imagemUrl: null,
    metricas: {
      alcance: '', curtidas: '', comentarios: '',
      visualizacoes: '', visualizadores: '', visitasPerfil: '',
      seguidoresGanhos: '', pctNaoSeguidores: '', tempoMedioAssistido: '',
    },
    ...post,
    redes: post?.redes?.length ? post.redes : (contas[0] ? [contas[0].id] : []),
  }));

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const setMet = (k, v) => setForm(f => ({ ...f, metricas: { ...f.metricas, [k]: v } }));

  // ── Mídia ──────────────────────────────────────────────────────────────────
  const [midias, setMidias] = useState(() => midiasFromPost(post));
  const [pendingFormato, setPendingFormato] = useState(null);
  const uploadedRef      = useRef([]);                                              // paths enviados nesta sessão
  const originalPathsRef  = useRef(new Set((post?.midias ?? []).map((m) => m.path).filter(Boolean)));
  const legacyImagemRef   = useRef(post?.imagemUrl ?? null);
  const uploading = midias.some((m) => m.status === 'uploading');

  const registerUpload  = useCallback((p) => { uploadedRef.current.push(p); }, []);
  const isSessionUpload = useCallback((p) => uploadedRef.current.includes(p), []);

  // Assina as URLs das mídias já salvas ao abrir o post.
  useEffect(() => {
    let cancelled = false;
    const paths = midias.filter((m) => m.path && !m.previewUrl).map((m) => m.path);
    if (!paths.length) return;
    signMidiaPaths(paths).then((map) => {
      if (cancelled) return;
      setMidias((prev) => prev.map((m) => (m.path && map[m.path] ? { ...m, previewUrl: map[m.path] } : m)));
    });
    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const relevantes = midias.filter((m) => m.status !== 'error');

  function requestFormato(next) {
    if (next === form.formato) return;
    const curKind      = tipoMidiaDoFormato(form.formato);
    const nextKind     = tipoMidiaDoFormato(next);
    const nextMultiple = formatoMultiplo(next);
    const quebra = relevantes.length > 0 && (curKind !== nextKind || (!nextMultiple && relevantes.length > 1));
    if (quebra) { setPendingFormato(next); return; }
    set('formato', next);
  }

  function confirmFormatoChange() {
    const next     = pendingFormato;
    const mesmaKind = tipoMidiaDoFormato(form.formato) === tipoMidiaDoFormato(next);
    setMidias((prev) => {
      // Se só muda a quantidade (imagem → imagem única), mantém a 1ª mídia.
      const keep    = mesmaKind && !formatoMultiplo(next) ? prev.filter((m) => m.status !== 'error').slice(0, 1) : [];
      const dropped = prev.filter((m) => !keep.includes(m));
      const dead    = dropped.map((m) => m.path).filter((p) => p && uploadedRef.current.includes(p));
      if (dead.length) supabase.storage.from(REDES_BUCKET).remove(dead);
      dropped.forEach((m) => { if (m.previewUrl && m.previewUrl.startsWith('blob:')) URL.revokeObjectURL(m.previewUrl); });
      return keep;
    });
    set('formato', next);
    setPendingFormato(null);
  }

  function serializeMidias() {
    return midias.filter((m) => m.status === 'ready' && m.path).map((m) => ({ path: m.path, tipo: m.tipo, mime: m.mime || '' }));
  }
  function buildPayload() {
    const legacyKept = midias.some((m) => m.legacy && m.status === 'ready');
    return { ...form, midias: serializeMidias(), imagemUrl: legacyKept ? legacyImagemRef.current : null };
  }
  function cleanupDeadMedia(payload) {
    const keep = new Set(payload.midias.map((m) => m.path));
    const dead = [...new Set([
      ...[...originalPathsRef.current].filter((p) => p && !keep.has(p)),
      ...uploadedRef.current.filter((p) => !keep.has(p)),
    ])];
    if (dead.length) supabase.storage.from(REDES_BUCKET).remove(dead);
  }

  function handleSaveClick()      { const p = buildPayload(); cleanupDeadMedia(p); onSave(p); }
  function handleDuplicateClick() { onDuplicate(buildPayload()); }
  function handleCloseClick() {
    const orphans = uploadedRef.current.filter((p) => !originalPathsRef.current.has(p));
    if (orphans.length) supabase.storage.from(REDES_BUCKET).remove(orphans);
    onClose();
  }

  function handleAI() {
    const labels = form.redes.map(id => {
      const c = contas.find(c => c.id === id);
      return c ? (c.nome || platformCfg(c.plataforma).label) : id;
    }).join(', ');
    openAI(`Crie um post para ${labels}. Formato: ${form.formato}. Data: ${form.data}. ${form.titulo ? `Tema: ${form.titulo}.` : ''} Gere: título chamativo, legenda completa com CTA e 5 hashtags para empresa B2B de serviços para PMEs.`);
    handleCloseClick();
  }

  const inp = { background: 'var(--bg4)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: 'var(--text)', fontFamily: 'var(--font-body)', width: '100%', boxSizing: 'border-box', outline: 'none' };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: isMobile ? 'stretch' : 'center', justifyContent: 'center', zIndex: 1000, padding: isMobile ? 0 : 20 }}>
      <div style={{ background: 'var(--bg2)', border: isMobile ? 'none' : '1px solid var(--border2)', borderRadius: isMobile ? 0 : 14, width: isMobile ? '100%' : 520, maxWidth: '100%', height: isMobile ? '100dvh' : undefined, maxHeight: isMobile ? '100dvh' : '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px 14px', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, background: 'var(--bg2)', zIndex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--text)' }}>{isEdit ? 'Editar post' : 'Novo post'}</div>
          <button onClick={handleCloseClick} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text3)', padding: 4 }}><X size={16} /></button>
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
              <select style={{ ...inp, cursor: canEdit ? 'pointer' : 'not-allowed' }} value={form.formato} disabled={!canEdit} onChange={e => requestFormato(e.target.value)}>
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
          {pendingFormato && (
            <div style={{ background: 'rgba(240,168,50,0.12)', border: '1px solid var(--amber)', borderRadius: 8, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ fontSize: 12, color: 'var(--text)', display: 'flex', gap: 6, lineHeight: 1.5 }}>
                <AlertTriangle size={14} style={{ color: 'var(--amber)', flexShrink: 0, marginTop: 1 }} />
                Mudar para "{pendingFormato}" vai descartar {relevantes.length} {relevantes.length === 1 ? 'mídia' : 'mídias'} já adicionada{relevantes.length === 1 ? '' : 's'}.
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={confirmFormatoChange} style={{ padding: '5px 12px', borderRadius: 7, fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-body)', background: 'var(--amber)', border: 'none', color: '#1a1a1a' }}>Descartar e mudar</button>
                <button onClick={() => setPendingFormato(null)} style={{ padding: '5px 12px', borderRadius: 7, fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-body)', background: 'transparent', border: '1px solid var(--border2)', color: 'var(--text2)' }}>Manter "{form.formato}"</button>
              </div>
            </div>
          )}
          <PostMediaField
            formato={form.formato}
            midias={midias}
            setMidias={setMidias}
            canEdit={canEdit}
            empresaId={empresaId}
            registerUpload={registerUpload}
            isSessionUpload={isSessionUpload}
          />
          {form.status === 'publicado' && (
            <PostMetricas formato={form.formato} metricas={form.metricas} setMet={setMet} canEdit={canEdit} inp={inp} />
          )}
          {isEdit && (
            <PostComentarios
              postId={form.id}
              userId={user?.id}
              autorNome={user?.name}
              canModerar={canEdit}
              onCountChange={onCommentsCountChange}
            />
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
          <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', position: 'sticky', bottom: 0, background: 'var(--bg2)' }}>
            {isEdit && (
              <>
                <button onClick={handleDuplicateClick} disabled={uploading} style={{ padding: isMobile ? '10px 13px' : '7px 13px', minHeight: isMobile ? 44 : undefined, borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: uploading ? 'not-allowed' : 'pointer', opacity: uploading ? 0.5 : 1, fontFamily: 'var(--font-body)', background: 'transparent', border: '1px solid var(--border2)', color: 'var(--text2)' }}>
                  Duplicar
                </button>
                <button onClick={() => onDelete(form.id)} style={{ padding: isMobile ? '10px 13px' : '7px 13px', minHeight: isMobile ? 44 : undefined, borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-body)', background: 'transparent', border: '1px solid rgba(240,92,92,0.4)', color: 'var(--red)' }}>
                  Deletar
                </button>
              </>
            )}
            <div style={{ marginLeft: isMobile ? 0 : 'auto', width: isMobile ? '100%' : 'auto', display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'flex-end' }}>
              {uploading && <span style={{ fontSize: 11, color: 'var(--text3)' }}>enviando mídia…</span>}
              <button onClick={handleAI} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: isMobile ? '10px 13px' : '7px 13px', minHeight: isMobile ? 44 : undefined, borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-body)', background: 'transparent', border: '1px solid var(--accent)', color: 'var(--accent)' }}>
                <Bot size={13} /> Criar com IA
              </button>
              <button onClick={handleSaveClick} disabled={uploading} style={{ padding: isMobile ? '10px 16px' : '7px 16px', minHeight: isMobile ? 44 : undefined, borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: uploading ? 'not-allowed' : 'pointer', opacity: uploading ? 0.5 : 1, fontFamily: 'var(--font-body)', background: 'var(--accent)', border: 'none', color: '#fff' }}>
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

function WeekView({ posts, contas, filterRede, onPostClick, viewDate, commentCounts }) {
  const monday = startOfWeek(viewDate, { weekStartsOn: 1 });
  const todayStr = todayISO();

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(monday, i);
    const iso = dateToISO(d.getFullYear(), d.getMonth(), d.getDate());
    return { iso, label: `${DOW_SHORT[d.getDay()]} ${d.getDate()}`, isToday: iso === todayStr };
  });

  const filtered = posts.filter(p => filterRede === 'todas' || (p.redes || []).includes(filterRede));
  return (
    <div style={{ overflowX: 'auto' }}>
      <div style={{ minWidth: 700 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '44px repeat(7,1fr)', gap: 2, marginBottom: 2 }}>
          <div style={{ position: 'sticky', left: 0, zIndex: 2, background: 'var(--bg)' }} />
          {weekDays.map(({ iso, label, isToday }) => (
            <div key={iso} style={{ textAlign: 'center', fontSize: 11, fontWeight: isToday ? 600 : 400, color: isToday ? 'var(--accent)' : 'var(--text3)', padding: '5px 4px', background: isToday ? 'color-mix(in srgb, var(--accent) 8%, transparent)' : 'transparent', borderRadius: 6 }}>
              {label}
            </div>
          ))}
        </div>
        {HOURS.map(h => (
          <div key={h} style={{ display: 'grid', gridTemplateColumns: '44px repeat(7,1fr)', gap: 2, marginBottom: 2 }}>
            <div style={{ fontSize: 10, color: 'var(--text3)', paddingTop: 6, textAlign: 'right', paddingRight: 8, position: 'sticky', left: 0, zIndex: 2, background: 'var(--bg)' }}>{h}h</div>
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
                        style={{ padding: '2px 4px', borderRadius: 4, background: st.bg, fontSize: 9, color: st.color, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 2, minWidth: 0 }}>
                        {cfg && <cfg.Icon size={8} style={{ flexShrink: 0 }} />}
                        <span style={{ minWidth: 0, flex: 1, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{p.titulo}</span>
                        <CommentCountBadge count={commentCounts?.[p.id]} size={8} />
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
function ListView({ posts, contas, filterRede, onPostClick, midiaUrls = {}, commentCounts }) {
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
        const primeiraMidia = (p.midias && p.midias[0]) || null;
        const thumbUrl = primeiraMidia ? midiaUrls[primeiraMidia.path] : p.imagemUrl;
        const thumbVideo = primeiraMidia?.tipo === 'video';
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
                <CommentCountBadge count={commentCounts?.[p.id]} size={10} />
              </div>
            </div>
            {thumbUrl && (
              thumbVideo
                ? <div style={{ width: 40, height: 40, borderRadius: 6, flexShrink: 0, background: 'var(--bg4)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text3)' }}><Film size={14} /></div>
                : <img src={thumbUrl} alt="" style={{ width: 40, height: 40, borderRadius: 6, objectFit: 'cover', flexShrink: 0 }} />
            )}
            {(p.midias?.length > 1) && <span style={{ fontSize: 10, color: 'var(--text3)', flexShrink: 0 }}>{p.midias.length} imgs</span>}
            <span style={{ padding: '2px 10px', borderRadius: 20, fontSize: 11, background: st.bg, color: st.color, flexShrink: 0 }}>{st.label}</span>
          </div>
        );
      })}
    </div>
  );
}

/* ─── Conta Modal (Adicionar rede) ───────────────────────────────────────────── */
function ContaModal({ onSave, onClose }) {
  const isMobile = useMediaQuery(MOBILE_Q);
  const [form, setForm] = useState({ nome: '', handle: '', plataforma: PLATAFORMAS[0].id, metaSeguidores: '' });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const inp = { background: 'var(--bg4)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: 'var(--text)', fontFamily: 'var(--font-body)', width: '100%', boxSizing: 'border-box', outline: 'none' };
  const canSave = form.nome.trim().length > 0;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: isMobile ? 'stretch' : 'center', justifyContent: 'center', zIndex: 1000, padding: isMobile ? 0 : 20 }}>
      <div style={{ background: 'var(--bg2)', border: isMobile ? 'none' : '1px solid var(--border2)', borderRadius: isMobile ? 0 : 14, width: isMobile ? '100%' : 420, maxWidth: '100%', height: isMobile ? '100dvh' : undefined, maxHeight: isMobile ? '100dvh' : '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px 14px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--text)' }}>Adicionar rede</div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text3)', padding: 4 }}><X size={16} /></button>
        </div>
        <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 14, flex: isMobile ? 1 : 'none', minHeight: 0, overflowY: isMobile ? 'auto' : 'visible' }}>
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
        <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 8, flexShrink: 0 }}>
          <button onClick={onClose} style={{ padding: isMobile ? '10px 14px' : '7px 14px', minHeight: isMobile ? 44 : undefined, borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-body)', background: 'transparent', border: '1px solid var(--border2)', color: 'var(--text2)' }}>Cancelar</button>
          <button disabled={!canSave} onClick={() => onSave(form)}
            style={{ padding: isMobile ? '10px 16px' : '7px 16px', minHeight: isMobile ? 44 : undefined, borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: canSave ? 'pointer' : 'not-allowed', opacity: canSave ? 1 : 0.5, fontFamily: 'var(--font-body)', background: 'var(--accent)', border: 'none', color: '#fff' }}>
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Metrica Modal (Lançar métricas do período) ─────────────────────────────── */
function MetricaModal({ conta, onSave, onClose }) {
  const isMobile = useMediaQuery(MOBILE_Q);
  const cfg = platformCfg(conta.plataforma);
  const [form, setForm] = useState({ dataReferencia: todayISO(), seguidores: '', seguidoresLiquidos: '', alcance: '', interacoes: '', impressoes: '', postsPublicados: '' });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const inp = { background: 'var(--bg4)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: 'var(--text)', fontFamily: 'var(--font-body)', width: '100%', boxSizing: 'border-box', outline: 'none' };
  const roInp = { ...inp, background: 'var(--bg3)', color: 'var(--text2)', cursor: 'not-allowed' };
  const lbl = { fontSize: 11, color: 'var(--text3)', display: 'block', marginBottom: 5 };
  const engaj = calcEngajamento(form.interacoes, form.alcance);

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: isMobile ? 'stretch' : 'center', justifyContent: 'center', zIndex: 1000, padding: isMobile ? 0 : 20 }}>
      <div style={{ background: 'var(--bg2)', border: isMobile ? 'none' : '1px solid var(--border2)', borderRadius: isMobile ? 0 : 14, width: isMobile ? '100%' : 460, maxWidth: '100%', height: isMobile ? '100dvh' : undefined, maxHeight: isMobile ? '100dvh' : '90vh', overflowY: isMobile ? 'hidden' : 'auto', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px 14px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
            <cfg.Icon size={15} style={{ color: `var(${cfg.color})`, flexShrink: 0 }} />
            <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Lançar métricas — {conta.nome || cfg.label}</div>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text3)', padding: 4, flexShrink: 0 }}><X size={16} /></button>
        </div>
        <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 14, flex: isMobile ? 1 : 'none', minHeight: 0, overflowY: isMobile ? 'auto' : 'visible' }}>
          <div>
            <label style={lbl}>DATA DE REFERÊNCIA</label>
            <input type="date" style={inp} value={form.dataReferencia} onChange={e => set('dataReferencia', e.target.value)} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={lbl}>SEGUIDORES</label>
              <input type="number" style={inp} value={form.seguidores} onChange={e => set('seguidores', e.target.value)} placeholder="Total acumulado" />
            </div>
            <div>
              <label style={lbl}>SEGUIDORES LÍQUIDOS</label>
              <input type="number" style={inp} value={form.seguidoresLiquidos} onChange={e => set('seguidoresLiquidos', e.target.value)} placeholder="Ex.: 120 ou -30" />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={lbl}>ALCANCE</label>
              <input type="number" min="0" style={inp} value={form.alcance} onChange={e => set('alcance', e.target.value)} placeholder="0" />
            </div>
            <div>
              <label style={lbl}>INTERAÇÕES</label>
              <input type="number" min="0" step="1" style={inp} value={form.interacoes} onChange={e => set('interacoes', e.target.value)} placeholder="Curtidas + coment. + salvos + compart." />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={lbl}>IMPRESSÕES</label>
              <input type="number" min="0" style={inp} value={form.impressoes} onChange={e => set('impressoes', e.target.value)} placeholder="0" />
            </div>
            <div>
              <label style={lbl}>POSTS PUBLICADOS</label>
              <input type="number" min="0" style={inp} value={form.postsPublicados} onChange={e => set('postsPublicados', e.target.value)} placeholder="0" />
            </div>
          </div>
          <div>
            <label style={lbl}>ENGAJAMENTO (%)</label>
            <div style={roInp}>{engaj == null ? '—' : engaj.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}</div>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>Calculado: (interações ÷ alcance) × 100</div>
          </div>
        </div>
        <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 8, flexShrink: 0 }}>
          <button onClick={onClose} style={{ padding: isMobile ? '10px 14px' : '7px 14px', minHeight: isMobile ? 44 : undefined, borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-body)', background: 'transparent', border: '1px solid var(--border2)', color: 'var(--text2)' }}>Cancelar</button>
          <button onClick={() => onSave(form)}
            style={{ padding: isMobile ? '10px 16px' : '7px 16px', minHeight: isMobile ? 44 : undefined, borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-body)', background: 'var(--accent)', border: 'none', color: '#fff' }}>
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
  const isMobile = useMediaQuery(MOBILE_Q);
  const isTablet = useMediaQuery(TABLET_Q);
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
  const [midiaUrls,    setMidiaUrls]    = useState({});
  // Contagem de comentários por post (para o indicador no calendário).
  const [commentCounts, setCommentCounts] = useState({});
  // Data de referência do calendário. Guardada como um dia real (não o 1º do
  // mês) para que trocar Mensal → Semanal preserve a semana em foco.
  const [viewDate,     setViewDate]     = useState(() => new Date());
  // No celular a grade mensal fica ilegível — a Lista é a visão padrão (as
  // outras seguem acessíveis pelo seletor).
  const [calView,      setCalView]      = useState(() => (window.matchMedia(MOBILE_Q).matches ? 'lista' : 'mensal'));
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

  // URLs assinadas das mídias de todos os posts do calendário (para as
  // miniaturas da lista). Reassina quando a lista de posts muda.
  useEffect(() => {
    let cancelled = false;
    const paths = calPosts.flatMap((p) => (p.midias ?? []).map((m) => m.path)).filter(Boolean);
    // signMidiaPaths resolve async (inclusive p/ lista vazia) — sem setState síncrono.
    signMidiaPaths(paths).then((m) => { if (!cancelled) setMidiaUrls(m); });
    return () => { cancelled = true; };
  }, [calPosts]);

  // Contagem de comentários por post — carregada uma vez por empresa; depois é
  // ajustada localmente (+1/-1) quando um comentário é enviado/apagado no modal.
  useEffect(() => {
    if (!empresaId) return;
    let cancelled = false;
    supabase.from('redes_posts_comentarios').select('post_id').eq('empresa_id', empresaId)
      .then(({ data }) => {
        if (cancelled) return;
        const counts = {};
        (data ?? []).forEach((r) => { counts[r.post_id] = (counts[r.post_id] ?? 0) + 1; });
        setCommentCounts(counts);
      });
    return () => { cancelled = true; };
  }, [empresaId]);

  function handleCommentsCountChange(postId, delta) {
    setCommentCounts((prev) => ({ ...prev, [postId]: Math.max(0, (prev[postId] ?? 0) + delta) }));
  }

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
    const alvo = calPosts.find(p => p.id === id);
    await supabase.from('redes_posts').delete().eq('id', id);
    const paths = (alvo?.midias ?? []).map(m => m.path).filter(Boolean);
    if (paths.length) supabase.storage.from(REDES_BUCKET).remove(paths);
    setCalPosts(prev => prev.filter(p => p.id !== id));
    setPostModal(null);
  }

  async function handlePostDuplicate(form) {
    const d = new Date(form.data + 'T00:00:00');
    d.setDate(d.getDate() + 1);
    const novaData = dateToISO(d.getFullYear(), d.getMonth(), d.getDate());

    // O post duplicado não pode compartilhar objetos de Storage com o original
    // (deletar um apagaria a mídia do outro) — cada arquivo é copiado.
    const midias = [];
    for (const m of form.midias ?? []) {
      const ext = (m.path.split('.').pop() || 'bin').replace(/[^a-zA-Z0-9]/g, '');
      const novoPath = `${empresaId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-copia.${ext}`;
      const { error } = await supabase.storage.from(REDES_BUCKET).copy(m.path, novoPath);
      if (!error) midias.push({ ...m, path: novoPath });
    }
    const row = postToRow({
      ...form,
      data: novaData,
      midias,
      imagemUrl: midias.length ? null : (form.imagemUrl ?? null),
    });
    const { data } = await supabase.from('redes_posts').insert(row).select().single();
    if (data) setCalPosts(prev => [...prev, postFromRow(data)]);
    setPostModal(null);
  }

  function handlePostClick(post) { setPostModal({ mode: 'edit', post }); }

  // As setas respeitam a visão ativa: 1 mês no Mensal, 1 semana no Semanal.
  function shiftView(dir) {
    setViewDate(d => (calView === 'semanal' ? addWeeks(d, dir) : addMonths(d, dir)));
  }

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
    { id: 'desempenho', label: 'Desempenho',           icon: TrendingUp },
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
  const weekLabel        = weekRangeLabel(startOfWeek(viewDate, { weekStartsOn: 1 }), endOfWeek(viewDate, { weekStartsOn: 1 }));
  const navLabel         = calView === 'semanal' ? weekLabel : curMonthLabel;

  const activeConta = contas.find((c) => c.id === activeContaId) || null;

  return (
    <div style={{ padding: isMobile ? '4px 0 32px' : '24px', fontFamily: 'var(--font-body)', color: 'var(--text)' }}>
      {/* Summary row */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : isTablet ? 'repeat(2,1fr)' : 'repeat(4,1fr)', gap: isMobile ? 10 : 14, marginBottom: isMobile ? 18 : 28 }}>
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
      <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'stretch' : 'flex-end', gap: isMobile ? 12 : 16, marginBottom: isMobile ? 16 : 24, borderBottom: isMobile ? 'none' : '1px solid var(--border)' }}>
        <div style={{ display: 'flex', gap: 0, overflowX: isMobile ? 'auto' : 'visible', borderBottom: isMobile ? '1px solid var(--border)' : 'none', maxWidth: '100%' }}>
          {TABS.map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px 16px', minHeight: isMobile ? 44 : undefined, flexShrink: 0, whiteSpace: 'nowrap', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500, fontFamily: 'var(--font-body)', background: 'transparent', color: activeTab === tab.id ? 'var(--text)' : 'var(--text3)', borderBottom: `2px solid ${activeTab === tab.id ? 'var(--accent)' : 'transparent'}`, marginBottom: -1, transition: 'color .15s' }}>
              <tab.icon size={14} />
              {tab.label}
            </button>
          ))}
        </div>
        <div style={{ marginLeft: isMobile ? 0 : 'auto', marginBottom: isMobile ? 0 : 8 }}>
          <PermissionGate module="redes" action="edit">
            <button
              onClick={() => openAI(`Crie um plano de conteúdo para ${curMonthLabel} para empresa B2B de serviços para PMEs. Inclua: 1 tema por semana, sugestões de posts para Instagram e LinkedIn, formatos recomendados, horários de publicação e hashtags relevantes.`)}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, width: isMobile ? '100%' : 'auto', minHeight: isMobile ? 44 : undefined, background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, padding: '7px 13px', fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
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

              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : isTablet ? `repeat(${Math.min(contas.length, 2)},1fr)` : `repeat(${Math.min(contas.length, 4)},1fr)`, gap: 14, marginBottom: 24 }}>
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
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
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
          {/* Calendar header row 1: navegação (mês/semana) + new post + AI */}
          <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'stretch' : 'center', justifyContent: 'space-between', gap: isMobile ? 10 : 0, marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {calView === 'lista' ? (
                <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--text)' }}>Todos os posts</div>
              ) : (
                <>
                  <button onClick={() => shiftView(-1)} style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 6, padding: isMobile ? '8px 12px' : '4px 10px', minHeight: isMobile ? 40 : undefined, cursor: 'pointer', color: 'var(--text2)', fontSize: 16, lineHeight: 1, fontFamily: 'var(--font-body)' }}>‹</button>
                  <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--text)', flex: isMobile ? 1 : undefined, minWidth: isMobile ? 0 : 180, textAlign: 'center' }}>{navLabel}</div>
                  <button onClick={() => shiftView(1)} style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 6, padding: isMobile ? '8px 12px' : '4px 10px', minHeight: isMobile ? 40 : undefined, cursor: 'pointer', color: 'var(--text2)', fontSize: 16, lineHeight: 1, fontFamily: 'var(--font-body)' }}>›</button>
                </>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <PermissionGate module="redes" action="edit">
                <button onClick={() => setPostModal({ mode: 'create', post: null })}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, flex: isMobile ? 1 : undefined, minHeight: isMobile ? 44 : undefined, background: 'var(--bg3)', border: '1px solid var(--border2)', borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 500, color: 'var(--text)', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
                  <Plus size={12} /> Novo post
                </button>
              </PermissionGate>
              <PermissionGate module="redes" action="edit">
                <button onClick={() => openAI(`Crie conteúdo para completar o calendário editorial de ${navLabel}. Empresa B2B de serviços para PMEs. Sugira posts para os dias sem publicação agendada, misturando Instagram (carrossel, reels) e LinkedIn (artigo, post). Formato: dia, rede, tipo de conteúdo, título e 2 linhas de contexto.`)}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, flex: isMobile ? 1 : undefined, minHeight: isMobile ? 44 : undefined, background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, padding: '6px 12px', fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
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
                      style={{ padding: isMobile ? '8px 14px' : '4px 12px', minHeight: isMobile ? 40 : undefined, borderRadius: 6, fontSize: 12, border: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)', fontWeight: 500, transition: 'all .12s', background: calView === v ? 'var(--bg2)' : 'transparent', color: calView === v ? 'var(--text)' : 'var(--text3)', boxShadow: calView === v ? '0 1px 3px rgba(0,0,0,0.2)' : 'none' }}>
                      {lbl}
                    </button>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                  {[{ id: 'todas', label: 'Todas', Icon: null, color: null }, ...contas.map(c => { const cfg = platformCfg(c.plataforma); return { id: c.id, label: c.nome || cfg.label, Icon: cfg.Icon, color: cfg.color }; })].map(opt => (
                    <button key={opt.id} onClick={() => setFilterCalRede(opt.id)}
                      style={{ display: 'flex', alignItems: 'center', gap: 4, padding: isMobile ? '8px 12px' : '4px 10px', minHeight: isMobile ? 40 : undefined, borderRadius: 20, fontSize: 11, border: '1px solid', cursor: 'pointer', fontFamily: 'var(--font-body)', transition: 'all .15s', background: filterCalRede === opt.id ? 'var(--accent)' : 'transparent', borderColor: filterCalRede === opt.id ? 'var(--accent)' : 'var(--border)', color: filterCalRede === opt.id ? '#fff' : 'var(--text3)' }}>
                      {opt.Icon && <opt.Icon size={10} />}
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {calView === 'mensal' && (
                <>
                  <Legend />
                  <CalendarGrid posts={calPosts} contas={contas} filterRede={filterCalRede} onPostClick={handlePostClick} viewDate={viewDate} isMobile={isMobile} commentCounts={commentCounts} />
                </>
              )}
              {calView === 'semanal' && (
                <>
                  <Legend />
                  <WeekView posts={calPosts} contas={contas} filterRede={filterCalRede} onPostClick={handlePostClick} viewDate={viewDate} commentCounts={commentCounts} />
                </>
              )}
              {calView === 'lista' && (
                <ListView posts={calPosts} contas={contas} filterRede={filterCalRede} onPostClick={handlePostClick} midiaUrls={midiaUrls} commentCounts={commentCounts} />
              )}
            </>
          )}
        </div>
      )}

      {/* Desempenho tab */}
      {activeTab === 'desempenho' && (
        loadingPosts
          ? <SkeletonLoader rows={6} />
          : <DesempenhoRanking posts={calPosts} contas={contas} midiaUrls={midiaUrls} onPostClick={handlePostClick} />
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
          empresaId={empresaId}
          onSave={handlePostSave}
          onDelete={handlePostDelete}
          onDuplicate={handlePostDuplicate}
          onClose={() => setPostModal(null)}
          openAI={openAI}
          onCommentsCountChange={handleCommentsCountChange}
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
