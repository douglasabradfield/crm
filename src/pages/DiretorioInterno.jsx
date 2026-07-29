import { useState, useEffect, useRef, useCallback } from 'react';
import {
  FolderOpen, Folder, Search, Plus, Shield, Eye, EyeOff,
  FileText, Lock, LayoutTemplate, GitBranch, FileSignature,
  CheckCircle2, AlertCircle, Clock, Bot, Copy, ExternalLink,
  ChevronRight, ChevronDown, GripVertical, User, Hash, Zap, X, Sparkles, Send,
  Pencil, Check, Download, History, Tag, Upload, Trash2,
} from 'lucide-react';
import { useAuth }       from '../store/auth.js';
import { useUI }         from '../store/index.js';
import { useAI }         from '../hooks/useAI.js';
import PermissionGate    from '../components/Auth/PermissionGate.jsx';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase.js';
import { docFromRow, docToRow, parseBRDate } from '../services/diretorio.js';
import SkeletonLoader from '../components/UI/SkeletonLoader.jsx';

/* ─── Folder definitions ─────────────────────────────────────────────────────── */
const FOLDERS = [
  { id: 'processos',   label: 'Processos',        Icon: FileText,       color: '--accent2' },
  { id: 'senhas',      label: 'Senhas & Acessos',  Icon: Lock,           color: '--amber'   },
  { id: 'templates',   label: 'Templates',         Icon: LayoutTemplate, color: '--purple'  },
  { id: 'fluxogramas', label: 'Fluxogramas',       Icon: GitBranch,      color: '--teal'    },
  { id: 'contratos',   label: 'Contratos',         Icon: FileSignature,  color: '--green'   },
];

const MASKED = '••••••••';

/* ─── Custom folder constants ────────────────────────────────────────────── */
const EMOJI_OPTIONS = [
  '📁','📂','📄','📝','🗂','📑','📋','🗃','📊','📈',
  '💡','🔑','🔒','🎯','⭐','🚀','💼','🏆','📌','🔖',
  '💰','🤝','📞','✉️','🔔','⚙️','🛠','📡','🌐','🎨',
  '📚','💎','🌟','🔧','🎓',
];

let _cfId = 1000;
function newCfId() { return `cf${_cfId++}`; }

const INITIAL_CUSTOM_FOLDERS = [
  {
    id: 'cf_recursos_guia',
    emoji: '📚',
    nome: 'Recursos do Guia',
    children: [],
    shortcuts: [
      { id: 'sh1', label: 'SWOT',         route: '/diagnostico', emoji: '📊' },
      { id: 'sh2', label: 'Personas',     route: '/diagnostico', emoji: '👤' },
      { id: 'sh3', label: 'Funil',        route: '/crm',         emoji: '📈' },
      { id: 'sh4', label: 'Metas',        route: '/kpis',        emoji: '🎯' },
      { id: 'sh5', label: 'Concorrentes', route: '/diagnostico', emoji: '⚔️' },
    ],
  },
];

/* ─── Custom folder tree helpers ─────────────────────────────────────────── */
function findInTree(folders, id) {
  for (const f of folders) {
    if (f.id === id) return f;
    const found = findInTree(f.children || [], id);
    if (found) return found;
  }
  return null;
}

function updateInTree(folders, id, updater) {
  return folders.map(f => {
    if (f.id === id) return updater(f);
    if (f.children?.length) return { ...f, children: updateInTree(f.children, id, updater) };
    return f;
  });
}

function deleteFromTree(folders, id) {
  return folders
    .filter(f => f.id !== id)
    .map(f => ({ ...f, children: deleteFromTree(f.children || [], id) }));
}

function addChildToTree(folders, parentId, child) {
  return folders.map(f => {
    if (f.id === parentId) return { ...f, children: [...(f.children || []), child] };
    if (f.children?.length) return { ...f, children: addChildToTree(f.children, parentId, child) };
    return f;
  });
}

function buildFolderTree(rows) {
  const map = {};
  rows.forEach(r => { map[r.id] = { ...r, children: [] }; });
  const roots = [];
  rows.forEach(r => {
    if (r.pastaPaiId && map[r.pastaPaiId]) map[r.pastaPaiId].children.push(map[r.id]);
    else roots.push(map[r.id]);
  });
  return roots;
}

function pastaFromRow(r) { return { id: r.id, pastaPaiId: r.pasta_pai_id, emoji: r.emoji, nome: r.nome, ordem: r.ordem, shortcuts: r.shortcuts ?? [] }; }
function pastaToRow(p) { return { pasta_pai_id: p.pastaPaiId ?? null, emoji: p.emoji, nome: p.nome, ordem: p.ordem ?? 0, shortcuts: p.shortcuts ?? [] }; }
function senhaFromRow(r) { return { id: r.id, plataforma: r.plataforma, icone: r.icone, usuario: r.usuario, senha: r.senha, categoria: r.categoria }; }
function senhaToRow(s) { return { plataforma: s.plataforma, icone: s.icone ?? '', usuario: s.usuario ?? '', senha: s.senha ?? '', categoria: s.categoria ?? '' }; }

/* ─── File upload constants & helpers ──────────────────────────────────── */
const ACCEPTED_MIME = [
  'image/jpeg', 'image/png', 'image/gif', 'image/svg+xml', 'image/webp',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
];

const FILE_TYPE_CFG = {
  'image/jpeg':  { label: 'JPG',  color: 'var(--green)', isImage: true  },
  'image/png':   { label: 'PNG',  color: 'var(--green)', isImage: true  },
  'image/gif':   { label: 'GIF',  color: 'var(--green)', isImage: true  },
  'image/svg+xml':{ label: 'SVG', color: 'var(--green)', isImage: true  },
  'image/webp':  { label: 'WEBP', color: 'var(--green)', isImage: true  },
  'application/pdf': { label: 'PDF',  color: 'var(--red)',    isImage: false },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { label: 'DOCX', color: 'var(--accent)', isImage: false },
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':       { label: 'XLSX', color: 'var(--green)',  isImage: false },
  'application/vnd.openxmlformats-officedocument.presentationml.presentation':{ label: 'PPTX', color: 'var(--amber)', isImage: false },
};

function fmtSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fmtUploadDate(iso) {
  const d = new Date(iso);
  return `${d.getDate().toString().padStart(2,'0')}/${(d.getMonth()+1).toString().padStart(2,'0')}/${d.getFullYear()} ${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;
}

function fileFromRow(r) {
  return {
    id: r.id,
    name: r.nome,
    mimeType: r.mime_type,
    ext: r.nome.split('.').pop().toLowerCase(),
    size: r.tamanho_bytes,
    uploadedAt: r.criado_em,
    tags: r.tags ?? [],
    storagePath: r.storage_path,
  };
}

function useFilesForFolder(folderId) {
  const { empresaId, user } = useAuth();
  const [files,       setFiles]       = useState([]);
  const [uploading,   setUploading]   = useState(false);
  const [uploadError, setUploadError] = useState('');

  useEffect(() => {
    if (!empresaId || !folderId) return;
    let cancelled = false;
    supabase
      .from('diretorio_arquivos')
      .select('*')
      .eq('empresa_id', empresaId)
      .eq('pasta_id', folderId)
      .order('criado_em', { ascending: false })
      .then(({ data }) => {
        if (!cancelled && data) setFiles(data.map(fileFromRow));
      });
    return () => { cancelled = true; };
  }, [folderId, empresaId]);

  async function addFiles(fileList) {
    const MAX = 10 * 1024 * 1024;
    const valid     = Array.from(fileList).filter(f => ACCEPTED_MIME.includes(f.type));
    const oversized = valid.filter(f => f.size > MAX);
    const toUpload  = valid.filter(f => f.size <= MAX);

    if (!toUpload.length && !oversized.length) return;
    setUploading(true);
    setUploadError('');
    const failures = [];

    for (const file of toUpload) {
      try {
        const path = `${empresaId}/${folderId}/${Date.now()}-${file.name}`;
        const { error: storageErr } = await supabase.storage.from('diretorio-arquivos').upload(path, file);
        if (storageErr) throw storageErr;
        const { data: row, error: dbErr } = await supabase
          .from('diretorio_arquivos')
          .insert({ pasta_id: folderId, nome: file.name, mime_type: file.type, tamanho_bytes: file.size, storage_path: path, enviado_por: user.id })
          .select()
          .single();
        if (dbErr) throw dbErr;
        setFiles(prev => [fileFromRow(row), ...prev]);
      } catch (err) {
        console.error('Upload falhou:', file.name, err);
        failures.push(file.name);
      }
    }

    const parts = [];
    if (oversized.length) parts.push(`Excedem 10 MB: ${oversized.map(f => f.name).join(', ')}`);
    if (failures.length)  parts.push(`Falhou: ${failures.join(', ')}`);
    if (parts.length) {
      const success = toUpload.length - failures.length;
      const prefix  = toUpload.length > 1 ? `${success} de ${toUpload.length} enviados. ` : '';
      setUploadError(prefix + parts.join(' · '));
    }

    setUploading(false);
  }

  async function removeFile(id) {
    const file = files.find(f => f.id === id);
    if (!file) return;
    const { error: storageErr } = await supabase.storage.from('diretorio-arquivos').remove([file.storagePath]);
    if (storageErr) { console.error('Storage delete falhou:', storageErr); return; }
    const { error: dbErr } = await supabase.from('diretorio_arquivos').delete().eq('id', id);
    if (dbErr) { console.error('DB delete falhou:', dbErr); return; }
    setFiles(prev => prev.filter(f => f.id !== id));
  }

  async function updateFileTags(id, tags) {
    const { error } = await supabase.from('diretorio_arquivos').update({ tags }).eq('id', id);
    if (!error) setFiles(prev => prev.map(f => f.id === id ? { ...f, tags } : f));
  }

  return { files, uploading, uploadError, addFiles, removeFile, updateFileTags };
}

async function getFileUrl(storagePath) {
  const { data } = await supabase.storage.from('diretorio-arquivos').createSignedUrl(storagePath, 3600);
  return data?.signedUrl ?? null;
}

/* ─── Permissions & global search ──────────────────────────────────────── */
const ALL_ROLES = [
  { id: 'admin',        label: 'Administrador'    },
  { id: 'gestor',       label: 'Gestor Comercial' },
  { id: 'vendedor',     label: 'Vendedor'         },
  { id: 'marketing',    label: 'Marketing'        },
  { id: 'visualizador', label: 'Visualizador'     },
];

const MOCK_USERS_LIST = [
  { id: 'u1', name: 'Douglas Admin',    role: 'admin'        },
  { id: 'u2', name: 'Gestor Comercial', role: 'gestor'       },
  { id: 'u3', name: 'João Vendedor',    role: 'vendedor'     },
  { id: 'u4', name: 'Maria Marketing',  role: 'marketing'    },
  { id: 'u5', name: 'Carlos Diretor',   role: 'visualizador' },
];

const DIR_PERM_DEFAULTS = {
  senhas: { type: 'roles', roles: ['admin'] },
};

function useFolderPermissions() {
  const [perms, setPerms] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('dir_folder_permissions'));
      return saved ? { ...DIR_PERM_DEFAULTS, ...saved } : { ...DIR_PERM_DEFAULTS };
    } catch { return { ...DIR_PERM_DEFAULTS }; }
  });
  useEffect(() => {
    try { localStorage.setItem('dir_folder_permissions', JSON.stringify(perms)); } catch {}
  }, [perms]);

  function setPermission(folderId, perm) {
    setPerms(prev => ({ ...prev, [folderId]: perm }));
  }

  function canAccess(folderId, user) {
    const perm = perms[folderId];
    if (!perm || perm.type === 'all') return true;
    if (!user) return false;
    if (perm.type === 'roles') return perm.roles.includes(user.role);
    if (perm.type === 'users') return perm.users.includes(user.id);
    return true;
  }

  function isRestricted(folderId) {
    const p = perms[folderId];
    return !!(p && p.type !== 'all');
  }

  return { perms, setPermission, canAccess, isRestricted };
}

function getAllFolderIds(folders) {
  const ids = [];
  for (const f of folders) {
    ids.push(f.id);
    if (f.children?.length) ids.push(...getAllFolderIds(f.children));
  }
  return ids;
}

function highlightText(text, term) {
  if (!term) return text;
  const idx = text.toLowerCase().indexOf(term.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark style={{ background: 'rgba(91,110,245,0.28)', color: 'var(--accent2)', borderRadius: 2, padding: '0 1px' }}>
        {text.slice(idx, idx + term.length)}
      </mark>
      {text.slice(idx + term.length)}
    </>
  );
}

const AI_CHIPS = {
  sop:        ['Melhorar este processo', 'Identificar gaps', 'Simplificar os passos', 'Criar checklist'],
  template:   ['Tornar mais persuasivo', 'Revisar tom de voz', 'Adicionar seção', 'Versão mais curta'],
  fluxograma: ['Identificar gargalos',   'Otimizar este fluxo', 'Sugerir melhorias'],
  contrato:   ['Revisar cláusulas',      'Simplificar linguagem', 'Identificar riscos'],
};

/* ─── Helpers ────────────────────────────────────────────────────────────────── */
const STATUS_CFG = {
  ativo:   { color: 'var(--green)',  bg: 'rgba(45,212,160,0.1)',  border: 'rgba(45,212,160,0.25)',  label: 'Ativo'   },
  atual:   { color: 'var(--green)',  bg: 'rgba(45,212,160,0.1)',  border: 'rgba(45,212,160,0.25)',  label: 'Atual'   },
  revisar: { color: 'var(--amber)',  bg: 'rgba(240,168,50,0.1)',  border: 'rgba(240,168,50,0.25)',  label: 'Revisar' },
};

function StatusBadge({ status }) {
  const cfg  = STATUS_CFG[status] ?? STATUS_CFG.ativo;
  const Icon = status === 'revisar' ? AlertCircle : CheckCircle2;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 500, padding: '2px 8px', borderRadius: 20, background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>
      <Icon size={9} />{cfg.label}
    </span>
  );
}

function TagChip({ label }) {
  return (
    <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 20, background: 'var(--bg4)', color: 'var(--text3)', border: '1px solid var(--border)' }}>
      {label}
    </span>
  );
}

function MetaItem({ icon: Icon, label, color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <Icon size={10} style={{ color: color ? `var(${color})` : 'var(--text3)', flexShrink: 0 }} />
      <span style={{ fontSize: 11, color: color ? `var(${color})` : 'var(--text3)' }}>{label}</span>
    </div>
  );
}

/* ─── Empty folder state ─────────────────────────────────────────────────────── */
function EmptyFolderState({ icon: Icon, message, actionLabel, onAction }) {
  return (
    <div style={{ padding: '40px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, textAlign: 'center' }}>
      {Icon && <Icon size={26} style={{ color: 'var(--text3)' }} />}
      <p style={{ fontSize: 13, color: 'var(--text3)' }}>{message}</p>
      {actionLabel && onAction && (
        <PermissionGate module="diretorio" action="edit">
          <button onClick={onAction} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, padding: '7px 14px', fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
            <Plus size={13} /> {actionLabel}
          </button>
        </PermissionGate>
      )}
    </div>
  );
}

/* ─── Password reveal cell ───────────────────────────────────────────────────── */
function PasswordCell({ senha }) {
  const [revealed, setRevealed] = useState(false);
  const [copied,   setCopied]   = useState(false);
  const timerRef = useRef(null);

  function reveal() {
    if (revealed) return;
    setRevealed(true);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setRevealed(false), 3000);
  }

  async function copy(e) {
    e.stopPropagation();
    await navigator.clipboard.writeText(senha).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  useEffect(() => () => clearTimeout(timerRef.current), []);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span onClick={reveal} title={revealed ? '' : 'Clique para revelar por 3s'} style={{ fontFamily: revealed ? 'var(--font-body)' : 'monospace', fontSize: 12, color: revealed ? 'var(--text)' : 'var(--text3)', cursor: revealed ? 'default' : 'pointer', letterSpacing: revealed ? 'normal' : '0.1em', userSelect: revealed ? 'text' : 'none', transition: 'color 0.2s' }}>
        {revealed ? senha : MASKED}
      </span>
      <button onClick={reveal} title={revealed ? 'Ocultando em breve…' : 'Revelar'} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', padding: 2, display: 'flex' }}>
        {revealed ? <EyeOff size={12} /> : <Eye size={12} />}
      </button>
      {revealed && (
        <button onClick={copy} title="Copiar" style={{ background: 'none', border: 'none', cursor: 'pointer', color: copied ? 'var(--green)' : 'var(--text3)', padding: 2, display: 'flex' }}>
          <Copy size={12} />
        </button>
      )}
    </div>
  );
}

/* ─── Inline AI Chat Panel ───────────────────────────────────────────────────── */
function InlineAIPanel({ doc, docType }) {
  const chips    = AI_CHIPS[docType] ?? AI_CHIPS.sop;
  const context  = `Documento aberto: "${doc.nome}". Descrição: ${doc.descricao}. ${doc.responsavel ? `Responsável: ${doc.responsavel}.` : ''} ${doc.passos ? `${doc.passos} passos.` : ''} ${doc.versao ? `Versão: ${doc.versao}.` : ''} Auxilie com sugestões práticas para melhorar ou usar este documento.`;

  const [messages, setMessages] = useState([]);
  const [input,    setInput]    = useState('');
  const { send, loading, error } = useAI();
  const bottomRef   = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  function resizeTA(el) { el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, 100) + 'px'; }

  const handleSend = useCallback(async (override) => {
    const text = (override ?? input).trim();
    if (!text || loading) return;
    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    const history = messages;
    setMessages((p) => [...p, { role: 'user', content: text }]);
    const reply = await send(text, context, history);
    if (reply) setMessages((p) => [...p, { role: 'assistant', content: reply }]);
  }, [input, loading, messages, context, send]);

  const canSend = input.trim().length > 0 && !loading;

  const btnStyle = (active) => ({
    background: active ? 'var(--accent)' : 'var(--bg4)',
    border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
    borderRadius: 6, padding: '5px 10px',
    color: active ? '#fff' : 'var(--text3)',
    fontSize: 11, cursor: active ? 'pointer' : 'default',
    fontFamily: 'var(--font-body)',
    transition: 'background 0.13s',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', borderLeft: '1px solid var(--border)', background: 'var(--bg3)' }}>
      {/* Header */}
      <div style={{ padding: '11px 14px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 7, flexShrink: 0 }}>
        <span className="pulse-dot" style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--green)', flexShrink: 0 }} />
        <Sparkles size={13} style={{ color: 'var(--accent2)', flexShrink: 0 }} />
        <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>Assistente IA</span>
        <span style={{ fontSize: 10, color: 'var(--text3)', marginLeft: 'auto', background: 'var(--bg4)', border: '1px solid var(--border)', padding: '1px 7px', borderRadius: 20 }}>
          contexto carregado
        </span>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {messages.length === 0 && !loading && (
          <div>
            <p style={{ fontSize: 11, color: 'var(--text3)', textAlign: 'center', marginBottom: 10 }}>
              O assistente conhece o conteúdo deste documento.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {chips.map((chip) => (
                <button key={chip} onClick={() => handleSend(chip)} style={{ background: 'var(--bg4)', border: '1px solid var(--border)', borderRadius: 7, color: 'var(--text2)', fontSize: 12, padding: '8px 11px', cursor: 'pointer', textAlign: 'left', fontFamily: 'var(--font-body)', transition: 'background 0.13s, color 0.13s, border-color 0.13s' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--accent-bg)'; e.currentTarget.style.color = 'var(--accent2)'; e.currentTarget.style.borderColor = 'var(--accent)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--bg4)'; e.currentTarget.style.color = 'var(--text2)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => {
          const isUser = msg.role === 'user';
          return (
            <div key={i} style={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start' }}>
              <div style={{ maxWidth: '88%', padding: '8px 11px', borderRadius: isUser ? '12px 12px 3px 12px' : '12px 12px 12px 3px', background: isUser ? 'var(--accent-bg)' : 'var(--bg2)', color: isUser ? 'var(--accent2)' : 'var(--text)', fontSize: 12, lineHeight: 1.55, whiteSpace: 'pre-wrap', wordBreak: 'break-word', border: `1px solid ${isUser ? 'rgba(91,110,245,0.2)' : 'var(--border)'}` }}>
                {msg.content}
              </div>
            </div>
          );
        })}

        {loading && (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div style={{ padding: '9px 12px', borderRadius: '12px 12px 12px 3px', background: 'var(--bg2)', border: '1px solid var(--border)', display: 'flex', gap: 4, alignItems: 'center' }}>
              {[0, 0.2, 0.4].map((d) => (
                <span key={d} style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--text3)', display: 'inline-block', animation: `bounce-dot 1.2s ease-in-out ${d}s infinite` }} />
              ))}
            </div>
          </div>
        )}

        {error && !loading && (
          <div style={{ padding: '8px 11px', borderRadius: 7, background: 'rgba(240,92,92,0.08)', border: '1px solid rgba(240,92,92,0.2)', color: 'var(--red)', fontSize: 11 }}>
            {error}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ padding: '8px 10px', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: 6, background: 'var(--bg4)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 8px', alignItems: 'flex-end' }}>
          <textarea
            ref={textareaRef}
            value={input}
            rows={1}
            placeholder="Pergunte sobre este documento…"
            onChange={(e) => { setInput(e.target.value); resizeTA(e.target); }}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: 'var(--text)', fontSize: 12, fontFamily: 'var(--font-body)', resize: 'none', lineHeight: 1.5, maxHeight: 100, overflow: 'auto' }}
          />
          <button onClick={() => handleSend()} disabled={!canSend} style={btnStyle(canSend)}>
            <Send size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Document body renderers ────────────────────────────────────────────────── */
function DocBody({ doc }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.7 }}>{doc.descricao}</p>
      <div style={{ padding: '14px 16px', borderRadius: 8, background: 'var(--bg3)', border: '1px solid var(--border)' }}>
        <p style={{ fontSize: 12, color: 'var(--text3)', lineHeight: 1.6 }}>
          Conteúdo detalhado não disponível. Use o <strong style={{ color: 'var(--accent2)' }}>Assistente IA</strong> ao lado para gerar ou completar este documento com base na descrição acima.
        </p>
      </div>
    </div>
  );
}

/* ─── Document Modal ─────────────────────────────────────────────────────────── */
function DocModal({ doc, docType, folderColor, onClose, onSave, onDelete }) {
  const color = doc.color ?? folderColor ?? '--accent2';

  const [editing,     setEditing]     = useState(false);
  const [editText,    setEditText]    = useState(doc.descricao ?? '');
  const [saving,      setSaving]      = useState(false);
  const [saveErr,     setSaveErr]     = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  // Lock body scroll
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  // Escape to close
  useEffect(() => {
    const fn = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [onClose]);

  async function handleEditToggle() {
    if (!editing) { setEditing(true); return; }
    setSaving(true); setSaveErr(null);
    // updatedAt: undefined força atualizado_em para "agora" em docToRow (parseBRDate sem valor).
    const result = await onSave({ ...doc, updatedAt: undefined, descricao: editText });
    setSaving(false);
    if (result?.error) { setSaveErr(result.error); return; }
    setEditing(false);
  }

  function handleDeleteClick() {
    if (deleteConfirm) {
      onDelete();
      return;
    }
    setDeleteConfirm(true);
    setTimeout(() => setDeleteConfirm((c) => c === true ? false : c), 3000);
  }

  const iconMap = { sop: FileText, template: LayoutTemplate, fluxograma: GitBranch, contrato: FileSignature };
  const DocIcon = iconMap[docType] ?? FileText;

  const actionBtn = (onClick, children, active) => (
    <button onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 5, background: active ? 'var(--accent-bg)' : 'var(--bg4)', border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`, borderRadius: 7, padding: '6px 11px', color: active ? 'var(--accent2)' : 'var(--text2)', fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font-body)', transition: 'background 0.13s, border-color 0.13s' }}
      onMouseEnter={(e) => { if (!active) { e.currentTarget.style.background = 'var(--bg3)'; e.currentTarget.style.borderColor = 'var(--border2)'; } }}
      onMouseLeave={(e) => { if (!active) { e.currentTarget.style.background = 'var(--bg4)'; e.currentTarget.style.borderColor = 'var(--border)'; } }}
    >
      {children}
    </button>
  );

  return (
    <>
      {/* Overlay */}
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.72)', zIndex: 400 }} />

      {/* Modal box */}
      <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '85vw', height: '85vh', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 16, zIndex: 401, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* ── Modal header ── */}
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
          {/* Icon */}
          <div style={{ width: 38, height: 38, borderRadius: 9, flexShrink: 0, background: `color-mix(in srgb, var(${color}) 12%, transparent)`, border: `1px solid color-mix(in srgb, var(${color}) 25%, transparent)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <DocIcon size={17} style={{ color: `var(${color})` }} />
          </div>

          {/* Name + meta */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <p style={{ fontSize: 15, fontWeight: 500, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{doc.nome}</p>
              {doc.status && <StatusBadge status={doc.status} />}
            </div>
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
              {doc.responsavel && <MetaItem icon={User}  label={doc.responsavel} />}
              {doc.updatedAt   && <MetaItem icon={Clock} label={`Atualizado ${doc.updatedAt}`} />}
              {doc.passos      && <MetaItem icon={Hash}  label={`${doc.passos} passos`} />}
              {doc.versao      && <MetaItem icon={Tag}   label={doc.versao} color={color} />}
              {doc.formato     && <MetaItem icon={FileText} label={doc.formato} />}
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 7, flexShrink: 0, alignItems: 'center' }}>
            {saveErr && <span style={{ fontSize: 11, color: 'var(--red)' }}>Erro ao salvar: {saveErr}</span>}
            <PermissionGate module="diretorio" action="edit">
              {actionBtn(
                handleEditToggle,
                editing ? <><Check size={12} /> {saving ? 'Salvando…' : 'Salvar'}</> : <><Pencil size={12} /> Editar</>,
                editing,
              )}
            </PermissionGate>

            <PermissionGate module="diretorio" action="delete">
              {actionBtn(
                handleDeleteClick,
                deleteConfirm ? <><Trash2 size={12} /> Confirmar exclusão</> : <><Trash2 size={12} /> Excluir</>,
                deleteConfirm,
              )}
            </PermissionGate>

            {actionBtn(() => {}, <><Download size={12} /> Exportar</>)}

            {/* History popover */}
            <div style={{ position: 'relative' }}>
              {actionBtn(() => setShowHistory((v) => !v), <><History size={12} /> Histórico</>, showHistory)}
              {showHistory && (
                <div onClick={(e) => e.stopPropagation()} style={{ position: 'absolute', top: '100%', right: 0, marginTop: 6, width: 320, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, boxShadow: '0 8px 32px rgba(0,0,0,0.4)', zIndex: 10, overflow: 'hidden' }}>
                  <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)' }}>Histórico de versões</span>
                    <button onClick={() => setShowHistory(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', display: 'flex' }}><X size={13} /></button>
                  </div>
                  <div style={{ padding: '14px', textAlign: 'center' }}>
                    <p style={{ fontSize: 11, color: 'var(--text3)', fontStyle: 'italic', margin: 0 }}>
                      Histórico de versões ainda não disponível para este documento.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Close */}
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', padding: 4, display: 'flex', borderRadius: 6, flexShrink: 0 }}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text3)'; }}
          >
            <X size={18} />
          </button>
        </div>

        {/* ── Body: 60% content + 40% AI ── */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

          {/* Left: document content (60%) */}
          <div style={{ flex: 3, overflowY: 'auto', padding: '24px 28px' }}>
            {editing ? (
              <textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                style={{ width: '100%', minHeight: '100%', background: 'var(--bg3)', border: '1px solid var(--accent)', borderRadius: 8, padding: '14px 16px', color: 'var(--text)', fontSize: 13, fontFamily: 'var(--font-body)', resize: 'vertical', lineHeight: 1.7, outline: 'none', boxSizing: 'border-box' }}
              />
            ) : (
              <DocBody doc={doc} />
            )}
          </div>

          {/* Right: inline AI panel (40%) */}
          <div style={{ flex: 2, overflow: 'hidden', display: 'flex', flexDirection: 'column', minWidth: 280 }}>
            <InlineAIPanel doc={doc} docType={docType} />
          </div>
        </div>
      </div>
    </>
  );
}

/* ─── Guide doc badge ────────────────────────────────────────────────────────── */
function GuiaBadge() {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 10, padding: '2px 8px', borderRadius: 20, background: 'rgba(91,110,245,0.12)', color: 'var(--accent2)', border: '1px solid rgba(91,110,245,0.25)', flexShrink: 0, whiteSpace: 'nowrap' }}>
      📖 Criado pelo Guia
    </span>
  );
}

/* ─── Folder content components ──────────────────────────────────────────────── */
function ProcessosContent({ sops, query, onOpen, onCreateNew }) {
  const items = sops.filter((s) => !query || s.nome.toLowerCase().includes(query) || s.tags.some((t) => t.toLowerCase().includes(query)));

  if (items.length === 0) {
    return query
      ? <EmptyFolderState message="Nenhum processo encontrado para essa busca" />
      : <EmptyFolderState icon={FileText} message="Nenhum processo documentado ainda" actionLabel="Novo processo" onAction={onCreateNew} />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {items.map((sop) => (
        <div key={sop.id}
          style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderLeft: `3px solid var(${sop.color})`, borderRadius: 10, padding: '14px 16px', cursor: 'pointer', transition: 'border-color 0.13s, background 0.13s' }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = `var(${sop.color})`; e.currentTarget.style.background = 'var(--bg4)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--bg3)'; }}
          onClick={() => onOpen(sop, 'sop')}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, flexShrink: 0, background: `color-mix(in srgb, var(${sop.color}) 12%, transparent)`, border: `1px solid color-mix(in srgb, var(${sop.color}) 25%, transparent)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FileText size={14} style={{ color: `var(${sop.color})` }} />
              </div>
              <div>
                <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', lineHeight: 1.3 }}>{sop.nome}</p>
                <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{sop.descricao}</p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
              {sop.origem === 'guia' && <GuiaBadge />}
              <StatusBadge status={sop.status} />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            {sop.responsavel && <MetaItem icon={User}  label={sop.responsavel} />}
            {sop.passos != null && <MetaItem icon={Hash}  label={`${sop.passos} passos`} />}
            <MetaItem icon={Clock} label={`Atualizado ${sop.updatedAt}`} />
            <div style={{ display: 'flex', gap: 4, marginLeft: 'auto' }}>
              {sop.tags.map((t) => <TagChip key={t} label={t} />)}
            </div>
            <ChevronRight size={13} style={{ color: 'var(--text3)' }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function SenhasContent({ senhas, loadingSenhas, query, isAdmin, showAdd, setShowAdd, onSave, onDelete }) {
  const items = senhas.filter((s) => !query || s.plataforma.toLowerCase().includes(query) || s.categoria.toLowerCase().includes(query));
  const [newEntry,      setNewEntry]      = useState({ plataforma: '', icone: '🔑', usuario: '', senha: '', categoria: '' });
  const [editEntry,     setEditEntry]     = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  function handleAdd() {
    if (!newEntry.plataforma || !newEntry.senha) return;
    onSave(newEntry);
    setNewEntry({ plataforma: '', icone: '🔑', usuario: '', senha: '', categoria: '' });
    setShowAdd(false);
  }

  function handleEditSave() {
    if (!editEntry?.plataforma || !editEntry?.senha) return;
    onSave(editEntry);
    setEditEntry(null);
  }

  function handleDelete(id) {
    if (deleteConfirm === id) {
      onDelete(id);
      setDeleteConfirm(null);
    } else {
      setDeleteConfirm(id);
      setTimeout(() => setDeleteConfirm(c => c === id ? null : c), 3000);
    }
  }

  if (loadingSenhas) return <SkeletonLoader rows={4} />;

  const FIELDS = [
    { key: 'plataforma', label: 'Plataforma', ph: 'Ex: Salesforce' },
    { key: 'categoria',  label: 'Categoria',  ph: 'Ex: CRM' },
    { key: 'usuario',    label: 'Usuário',     ph: 'email@empresa.com' },
    { key: 'senha',      label: 'Senha',       ph: '••••••••', type: 'password' },
  ];

  function EntryForm({ entry, setEntry, onConfirm, onCancel, title }) {
    return (
      <div style={{ background: 'var(--bg3)', border: '1px solid var(--accent)', borderRadius: 10, padding: 16 }}>
        <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)', marginBottom: 12 }}>{title}</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {FIELDS.map(({ key, label, ph, type }) => (
            <div key={key}>
              <label style={{ fontSize: 10, color: 'var(--text3)', display: 'block', marginBottom: 4 }}>{label}</label>
              <input type={type || 'text'} value={entry[key] ?? ''} onChange={(e) => setEntry(p => ({ ...p, [key]: e.target.value }))} placeholder={ph}
                style={{ width: '100%', background: 'var(--bg4)', border: '1px solid var(--border)', borderRadius: 6, padding: '7px 10px', color: 'var(--text)', fontSize: 12, fontFamily: 'var(--font-body)', outline: 'none', boxSizing: 'border-box' }}
                onFocus={(e) => { e.target.style.borderColor = 'var(--accent)'; }}
                onBlur={(e)  => { e.target.style.borderColor = 'var(--border)'; }}
              />
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <button onClick={onConfirm} style={{ background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 6, padding: '7px 14px', fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>Salvar</button>
          <button onClick={onCancel}  style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 6, padding: '7px 12px', fontSize: 12, color: 'var(--text2)', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>Cancelar</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Security warning */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 14px', borderRadius: 8, background: 'rgba(240,168,50,0.06)', border: '1px solid rgba(240,168,50,0.22)' }}>
        <AlertCircle size={14} style={{ color: 'var(--amber)', flexShrink: 0, marginTop: 2 }} />
        <p style={{ fontSize: 11, color: 'var(--text2)', lineHeight: 1.6, margin: 0 }}>
          <strong style={{ color: 'var(--amber)' }}>Atenção:</strong> as senhas aqui ainda não são criptografadas. Evite cadastrar credenciais muito sensíveis (bancos, sistemas financeiros) até essa proteção ser implementada. Use para acessos operacionais do dia a dia (ferramentas de marketing, plataformas de uso da equipe).
        </p>
      </div>
      {isAdmin && (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 14px', borderRadius: 8, background: 'rgba(240,168,50,0.08)', border: '1px solid rgba(240,168,50,0.25)' }}>
          <Shield size={14} style={{ color: 'var(--amber)', flexShrink: 0, marginTop: 1 }} />
          <div>
            <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--amber)', marginBottom: 2 }}>Visível apenas para administradores</p>
            <p style={{ fontSize: 11, color: 'var(--text3)', lineHeight: 1.5 }}>Credenciais exibidas somente ao perfil Admin. Nunca compartilhe por mensagem ou e-mail. Considere migrar para 1Password ou Bitwarden.</p>
          </div>
        </div>
      )}
      <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
        {items.length === 0 ? (
          query
            ? <EmptyFolderState message="Nenhum acesso encontrado para essa busca" />
            : <EmptyFolderState icon={Lock} message="Nenhum acesso cadastrado" actionLabel={isAdmin ? 'Adicionar' : null} onAction={() => setShowAdd(true)} />
        ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--bg4)', borderBottom: '1px solid var(--border)' }}>
              {['Plataforma', 'Usuário', 'Senha', 'Categoria', ''].map((h) => (
                <th key={h} style={{ padding: '9px 14px', textAlign: 'left', fontSize: 10, fontWeight: 500, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((pw, i) => (
              <tr key={pw.id} style={{ borderBottom: i < items.length - 1 ? '1px solid var(--border)' : 'none', transition: 'background 0.1s' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg4)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
              >
                <td style={{ padding: '11px 14px' }}><div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ fontSize: 16 }}>{pw.icone}</span><span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)' }}>{pw.plataforma}</span></div></td>
                <td style={{ padding: '11px 14px', fontSize: 12, color: 'var(--text2)' }}>{pw.usuario}</td>
                <td style={{ padding: '11px 14px' }}>
                  {isAdmin ? <PasswordCell senha={pw.senha} /> : <span style={{ fontSize: 12, color: 'var(--text3)', letterSpacing: '0.1em', fontFamily: 'monospace' }}>{MASKED}</span>}
                </td>
                <td style={{ padding: '11px 14px' }}><TagChip label={pw.categoria} /></td>
                <td style={{ padding: '11px 14px', textAlign: 'right' }}>
                  {isAdmin && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end' }}>
                      <button onClick={() => setEditEntry(editEntry?.id === pw.id ? null : { ...pw })} title="Editar"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: editEntry?.id === pw.id ? 'var(--accent2)' : 'var(--text3)', padding: 4, display: 'flex', borderRadius: 6 }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--accent2)'; }}
                        onMouseLeave={(e) => { if (editEntry?.id !== pw.id) e.currentTarget.style.color = 'var(--text3)'; }}
                      ><Pencil size={12} /></button>
                      <button onClick={() => handleDelete(pw.id)} title={deleteConfirm === pw.id ? 'Clique novamente para confirmar' : 'Excluir'}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: deleteConfirm === pw.id ? 'var(--red)' : 'var(--text3)', padding: 4, display: 'flex', borderRadius: 6 }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--red)'; }}
                        onMouseLeave={(e) => { if (deleteConfirm !== pw.id) e.currentTarget.style.color = 'var(--text3)'; }}
                      ><X size={12} /></button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        )}
      </div>
      {editEntry && isAdmin && (
        <EntryForm
          entry={editEntry} setEntry={setEditEntry}
          onConfirm={handleEditSave} onCancel={() => setEditEntry(null)}
          title={`Editar — ${editEntry.plataforma}`}
        />
      )}
      {showAdd && isAdmin && (
        <EntryForm
          entry={newEntry} setEntry={setNewEntry}
          onConfirm={handleAdd} onCancel={() => setShowAdd(false)}
          title="Nova entrada"
        />
      )}
    </div>
  );
}

function TemplatesContent({ templates, query, onOpen, onCreateNew }) {
  const items = templates.filter((t) => !query || t.nome.toLowerCase().includes(query) || t.tags.some((tag) => tag.toLowerCase().includes(query)));

  if (items.length === 0) {
    return query
      ? <EmptyFolderState message="Nenhum template encontrado para essa busca" />
      : <EmptyFolderState icon={LayoutTemplate} message="Nenhum template criado ainda" actionLabel="Novo template" onAction={onCreateNew} />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
      {items.map((tpl) => (
        <div key={tpl.id}
          style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px', cursor: 'pointer', transition: 'border-color 0.13s, background 0.13s' }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = `var(${tpl.color})`; e.currentTarget.style.background = 'var(--bg4)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--bg3)'; }}
          onClick={() => onOpen(tpl, 'template')}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: `color-mix(in srgb, var(${tpl.color}) 12%, transparent)`, border: `1px solid color-mix(in srgb, var(${tpl.color}) 25%, transparent)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <LayoutTemplate size={15} style={{ color: `var(${tpl.color})` }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {tpl.origem === 'guia' && <GuiaBadge />}
              <StatusBadge status={tpl.status} />
            </div>
          </div>
          <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', marginBottom: 4, lineHeight: 1.3 }}>{tpl.nome}</p>
          <p style={{ fontSize: 11, color: 'var(--text3)', lineHeight: 1.45, marginBottom: 10 }}>{tpl.descricao}</p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>{tpl.tags.map((t) => <TagChip key={t} label={t} />)}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 10, color: 'var(--text3)' }}>
              {tpl.versao && <span style={{ color: `var(${tpl.color})`, fontWeight: 500 }}>{tpl.versao}</span>}
              {tpl.formato && <span>· {tpl.formato}</span>}
              {tpl.uso != null && <span>· {tpl.uso} usos</span>}
            </div>
          </div>
        </div>
      ))}
      </div>
    </div>
  );
}

const GENERIC_TYPE_CFG = {
  fluxograma: { Icon: GitBranch,     empty: 'Nenhum fluxograma criado ainda',  action: 'Novo fluxograma' },
  contrato:   { Icon: FileSignature, empty: 'Nenhum contrato cadastrado ainda', action: 'Novo contrato'   },
};

function GenericContent({ items, query, docType, onOpen, onCreateNew }) {
  const filtered = items.filter((i) => !query || i.nome.toLowerCase().includes(query));
  const cfg = GENERIC_TYPE_CFG[docType] ?? { Icon: FileText, empty: 'Nada por aqui ainda', action: 'Novo item' };

  if (filtered.length === 0) {
    return query
      ? <EmptyFolderState message="Nada encontrado para essa busca" />
      : <EmptyFolderState icon={cfg.Icon} message={cfg.empty} actionLabel={cfg.action} onAction={onCreateNew} />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {filtered.map((item) => (
        <div key={item.id}
          style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderLeft: `3px solid var(${item.color})`, borderRadius: 10, padding: '13px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, cursor: 'pointer', transition: 'background 0.13s, border-color 0.13s' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg4)'; e.currentTarget.style.borderColor = `var(${item.color})`; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--bg3)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
          onClick={() => onOpen(item, docType)}
        >
          <div>
            <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', marginBottom: 3 }}>{item.nome}</p>
            <p style={{ fontSize: 11, color: 'var(--text3)' }}>{item.descricao || item.partes}</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            {item.versao && <span style={{ fontSize: 11, color: `var(${item.color})`, fontWeight: 500 }}>{item.versao}</span>}
            <span style={{ fontSize: 10, color: 'var(--text3)' }}>{item.updatedAt}</span>
            <StatusBadge status={item.status} />
            <ChevronRight size={13} style={{ color: 'var(--text3)' }} />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── FileCard ──────────────────────────────────────────────────────────── */
function FileCard({ file, onDelete, onUpdateTags }) {
  const cfg = FILE_TYPE_CFG[file.mimeType] ?? { label: (file.ext || 'FILE').toUpperCase(), color: 'var(--text3)', isImage: false };
  const [confirmDel, setConfirmDel] = useState(false);
  const [editingTag, setEditingTag] = useState(false);
  const [tagInput,   setTagInput]   = useState('');
  const tagInputRef = useRef(null);

  function addTag() {
    const t = tagInput.trim();
    setTagInput('');
    setEditingTag(false);
    if (!t || file.tags.includes(t)) return;
    onUpdateTags(file.id, [...file.tags, t]);
  }

  function removeTag(tag) {
    onUpdateTags(file.id, file.tags.filter(t => t !== tag));
  }

  useEffect(() => { if (editingTag) tagInputRef.current?.focus(); }, [editingTag]);

  return (
    <div
      style={{ position: 'relative', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden', transition: 'border-color 0.13s' }}
      onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border2)'}
      onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
    >
      {/* Preview area */}
      <div style={{ height: 110, background: 'var(--bg4)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
          <div style={{ width: 44, height: 52, borderRadius: 6, background: `color-mix(in srgb, ${cfg.color} 12%, transparent)`, border: `1px solid color-mix(in srgb, ${cfg.color} 25%, transparent)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: cfg.color }}>{cfg.label}</span>
          </div>
        {/* Type badge */}
        <span style={{ position: 'absolute', top: 6, left: 6, fontSize: 9, fontWeight: 600, padding: '2px 6px', borderRadius: 20, background: `color-mix(in srgb, ${cfg.color} 15%, var(--bg4))`, color: cfg.color, border: `1px solid color-mix(in srgb, ${cfg.color} 30%, transparent)` }}>
          {cfg.label}
        </span>
        {/* Delete button */}
        {!confirmDel && (
          <button onClick={() => setConfirmDel(true)} title="Excluir"
            style={{ position: 'absolute', top: 5, right: 5, background: 'rgba(0,0,0,0.55)', border: 'none', borderRadius: 5, padding: '3px 5px', cursor: 'pointer', color: 'var(--text3)', display: 'flex', lineHeight: 1 }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--red)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text3)'}
          >
            <X size={11} />
          </button>
        )}
        {/* Delete confirmation overlay */}
        {confirmDel && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <p style={{ fontSize: 11, color: '#fff', textAlign: 'center', margin: 0 }}>Excluir arquivo?</p>
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={() => onDelete(file.id)} style={{ fontSize: 11, background: 'var(--red)', color: '#fff', border: 'none', borderRadius: 5, padding: '4px 12px', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>Sim</button>
              <button onClick={() => setConfirmDel(false)} style={{ fontSize: 11, background: 'none', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 5, padding: '4px 10px', cursor: 'pointer', color: '#ccc', fontFamily: 'var(--font-body)' }}>Não</button>
            </div>
          </div>
        )}
      </div>

      {/* Meta area */}
      <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', margin: 0 }} title={file.name}>{file.name}</p>
        <div style={{ display: 'flex', gap: 8, fontSize: 10, color: 'var(--text3)', alignItems: 'center' }}>
          <span>{fmtSize(file.size)}</span>
          <span>·</span>
          <span>{fmtUploadDate(file.uploadedAt)}</span>
          <button
            onClick={async () => { const url = await getFileUrl(file.storagePath); if (url) window.open(url, '_blank'); }}
            title="Abrir arquivo"
            style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 3, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', padding: 0, fontFamily: 'var(--font-body)', fontSize: 10 }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--accent2)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text3)'}
          >
            <ExternalLink size={10} /> Abrir
          </button>
        </div>
        {/* Tags */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center', minHeight: 22 }}>
          {file.tags.map(tag => (
            <span key={tag} style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 10, padding: '1px 6px', borderRadius: 20, background: 'var(--bg4)', color: 'var(--text3)', border: '1px solid var(--border)', cursor: 'default' }}>
              {tag}
              <button onClick={() => removeTag(tag)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--text3)', display: 'flex', lineHeight: 1 }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--red)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--text3)'}
              ><X size={8} /></button>
            </span>
          ))}
          {editingTag ? (
            <input
              ref={tagInputRef}
              value={tagInput}
              onChange={e => setTagInput(e.target.value)}
              onBlur={addTag}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } if (e.key === 'Escape') { setEditingTag(false); setTagInput(''); } }}
              placeholder="tag…"
              style={{ fontSize: 10, width: 60, background: 'var(--bg4)', border: '1px solid var(--accent)', borderRadius: 20, padding: '1px 6px', color: 'var(--text)', outline: 'none', fontFamily: 'var(--font-body)' }}
            />
          ) : (
            <button onClick={() => setEditingTag(true)} title="Adicionar tag"
              style={{ fontSize: 10, background: 'none', border: '1px dashed var(--border)', borderRadius: 20, padding: '1px 6px', color: 'var(--text3)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 2, fontFamily: 'var(--font-body)' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent2)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text3)'; }}
            >
              <Tag size={8} /> tag
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── FolderFilesSection ────────────────────────────────────────────────── */
function FolderFilesSection({ folderId }) {
  const { files, uploading, uploadError, addFiles, removeFile, updateFileTags } = useFilesForFolder(folderId);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  async function handleDrop(e) {
    e.preventDefault();
    setDragOver(false);
    await addFiles(e.dataTransfer.files);
  }

  async function handleInput(e) {
    await addFiles(e.target.files);
    e.target.value = '';
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 20, paddingTop: 20, borderTop: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <p style={{ fontSize: 11, fontWeight: 500, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>
          Arquivos{files.length > 0 && (
            <span style={{ background: 'var(--bg4)', borderRadius: 20, padding: '1px 6px', border: '1px solid var(--border)', marginLeft: 6, fontSize: 10 }}>{files.length}</span>
          )}
        </p>
        <button
          onClick={() => !uploading && fileInputRef.current?.click()}
          disabled={uploading}
          style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: '1px solid var(--border)', borderRadius: 7, padding: '5px 11px', color: uploading ? 'var(--text3)' : 'var(--text2)', fontSize: 11, cursor: uploading ? 'not-allowed' : 'pointer', fontFamily: 'var(--font-body)', transition: 'border-color 0.13s, color 0.13s', opacity: uploading ? 0.7 : 1 }}
          onMouseEnter={e => { if (!uploading) { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent2)'; } }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = uploading ? 'var(--text3)' : 'var(--text2)'; }}
        >
          <Upload size={11} /> {uploading ? 'Enviando…' : 'Adicionar arquivo'}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".jpg,.jpeg,.png,.gif,.svg,.webp,.pdf,.docx,.xlsx,.pptx"
          onChange={handleInput}
          style={{ display: 'none' }}
        />
      </div>
      {uploadError && (
        <p style={{ fontSize: 11, color: 'var(--amber)', margin: 0, padding: '4px 0' }}>{uploadError}</p>
      )}

      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        style={{
          border: `2px dashed ${dragOver ? 'var(--accent)' : 'var(--border)'}`,
          borderRadius: 10,
          padding: files.length === 0 ? '32px 20px' : '10px 16px',
          background: dragOver ? 'rgba(91,110,245,0.06)' : 'transparent',
          transition: 'border-color 0.15s, background 0.15s, padding 0.15s',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: 6,
        }}
      >
        {files.length === 0 ? (
          <>
            <Upload size={22} style={{ color: dragOver ? 'var(--accent2)' : 'var(--text3)' }} />
            <p style={{ fontSize: 12, color: dragOver ? 'var(--accent2)' : 'var(--text3)', margin: 0, textAlign: 'center' }}>
              Arraste arquivos aqui ou clique em{' '}
              <strong style={{ color: 'var(--accent2)', fontWeight: 500 }}>Adicionar arquivo</strong>
            </p>
            <p style={{ fontSize: 10, color: 'var(--text3)', margin: 0 }}>
              JPG, PNG, GIF, SVG, WEBP, PDF, DOCX, XLSX, PPTX
            </p>
          </>
        ) : (
          <p style={{ fontSize: 11, color: dragOver ? 'var(--accent2)' : 'var(--text3)', margin: 0 }}>
            {dragOver ? 'Solte para adicionar' : 'Arraste mais arquivos aqui'}
          </p>
        )}
      </div>

      {/* File grid */}
      {files.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
          {files.map(file => (
            <FileCard
              key={file.id}
              file={file}
              onDelete={removeFile}
              onUpdateTags={updateFileTags}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── FolderAccessDenied ────────────────────────────────────────────────── */
function FolderAccessDenied({ folderLabel }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', textAlign: 'center', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14 }}>
      <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(240,168,50,0.1)', border: '1px solid rgba(240,168,50,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
        <Lock size={22} style={{ color: 'var(--amber)' }} />
      </div>
      <p style={{ fontSize: 15, fontWeight: 500, color: 'var(--text)', marginBottom: 8 }}>Acesso restrito</p>
      <p style={{ fontSize: 12, color: 'var(--text3)', lineHeight: 1.6 }}>
        Você não tem permissão para acessar a pasta{' '}
        <strong style={{ color: 'var(--text2)' }}>{folderLabel}</strong>.<br />
        Entre em contato com o administrador para solicitar acesso.
      </p>
    </div>
  );
}

/* ─── GlobalSearchResults ────────────────────────────────────────────────── */
function GlobalSearchResults({ query, folderInfos }) {
  const term = query.trim().toLowerCase();
  if (!term) return null;

  const groups = [];
  for (const { folderId, folderLabel, folderEmoji } of folderInfos) {
    const files = [];
    const matched = files.filter(f =>
      f.name.toLowerCase().includes(term) ||
      (f.tags || []).some(t => t.toLowerCase().includes(term))
    );
    if (matched.length) groups.push({ folderId, folderLabel, folderEmoji, files: matched });
  }

  if (groups.length === 0) {
    return (
      <div style={{ padding: '24px 20px', textAlign: 'center', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14 }}>
        <p style={{ fontSize: 13, color: 'var(--text3)', margin: 0 }}>
          Nenhum arquivo encontrado para <strong style={{ color: 'var(--text2)' }}>"{query}"</strong>
        </p>
      </div>
    );
  }

  const total = groups.reduce((n, g) => n + g.files.length, 0);

  return (
    <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <p style={{ fontSize: 11, fontWeight: 500, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>
        Resultados — <span style={{ color: 'var(--accent2)' }}>{total}</span> arquivo{total !== 1 ? 's' : ''}
      </p>
      {groups.map(group => (
        <div key={group.folderId}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 8 }}>
            {group.folderEmoji && <span style={{ fontSize: 13 }}>{group.folderEmoji}</span>}
            <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text2)' }}>{group.folderLabel}</span>
            <span style={{ fontSize: 10, background: 'var(--bg4)', border: '1px solid var(--border)', borderRadius: 20, padding: '0 5px', color: 'var(--text3)' }}>
              {group.files.length}
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {group.files.map(file => {
              const cfg = FILE_TYPE_CFG[file.mimeType] ?? { label: (file.ext || 'FILE').toUpperCase(), color: 'var(--text3)', isImage: false };
              return (
                <div key={file.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, transition: 'border-color 0.13s' }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border2)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
                >
                  {cfg.isImage ? (
                    <img src={file.data} alt={file.name} style={{ width: 34, height: 34, borderRadius: 5, objectFit: 'cover', flexShrink: 0 }} />
                  ) : (
                    <div style={{ width: 34, height: 34, borderRadius: 6, background: `color-mix(in srgb, ${cfg.color} 12%, transparent)`, border: `1px solid color-mix(in srgb, ${cfg.color} 25%, transparent)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: cfg.color }}>{cfg.label}</span>
                    </div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {highlightText(file.name, query)}
                    </p>
                    {(file.tags || []).length > 0 && (
                      <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap', marginTop: 3 }}>
                        {file.tags.map(t => {
                          const isMatch = term && t.toLowerCase().includes(term);
                          return (
                            <span key={t} style={{ fontSize: 9, padding: '1px 5px', borderRadius: 20, background: isMatch ? 'rgba(91,110,245,0.12)' : 'var(--bg4)', color: isMatch ? 'var(--accent2)' : 'var(--text3)', border: `1px solid ${isMatch ? 'rgba(91,110,245,0.35)' : 'var(--border)'}` }}>
                              {highlightText(t, query)}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  <span style={{ fontSize: 10, color: 'var(--text3)', flexShrink: 0 }}>{fmtSize(file.size)}</span>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── PermissionModal ────────────────────────────────────────────────────── */
function PermissionModal({ folderId, folderLabel, folderEmoji, currentPerm, onSave, onClose }) {
  const [type,  setType]  = useState(currentPerm?.type  ?? 'all');
  const [roles, setRoles] = useState(currentPerm?.roles ?? []);
  const [users, setUsers] = useState(currentPerm?.users ?? []);

  function toggleRole(id) {
    setRoles(prev => prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]);
  }

  function toggleUser(id) {
    setUsers(prev => prev.includes(id) ? prev.filter(u => u !== id) : [...prev, id]);
  }

  function handleSave() {
    if (type === 'all')   onSave(folderId, { type: 'all' });
    else if (type === 'roles') onSave(folderId, { type: 'roles', roles });
    else                  onSave(folderId, { type: 'users', users });
    onClose();
  }

  useEffect(() => {
    const fn = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [onClose]);

  const radioStyle = (active) => ({
    display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px',
    borderRadius: 8, cursor: 'pointer',
    background: active ? 'rgba(91,110,245,0.07)' : 'var(--bg4)',
    border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
    transition: 'all 0.13s',
  });

  const radioDot = (active) => ({
    width: 14, height: 14, borderRadius: '50%', flexShrink: 0, marginTop: 1,
    border: `2px solid ${active ? 'var(--accent)' : 'var(--border2)'}`,
    background: active ? 'var(--accent)' : 'transparent',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'all 0.13s',
  });

  const checkBox = (active) => ({
    width: 14, height: 14, borderRadius: 4, flexShrink: 0,
    border: `2px solid ${active ? 'var(--accent)' : 'var(--border2)'}`,
    background: active ? 'var(--accent)' : 'transparent',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'all 0.13s',
  });

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 600 }} />
      <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 410, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, zIndex: 601, padding: 24, maxHeight: '85vh', overflowY: 'auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: 'rgba(240,168,50,0.1)', border: '1px solid rgba(240,168,50,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Lock size={15} style={{ color: 'var(--amber)' }} />
            </div>
            <div>
              <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)', margin: 0 }}>Permissões de acesso</p>
              <p style={{ fontSize: 11, color: 'var(--text3)', margin: 0 }}>
                {folderEmoji && <span style={{ marginRight: 4 }}>{folderEmoji}</span>}
                {folderLabel}
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', padding: 4, display: 'flex', borderRadius: 6 }}>
            <X size={15} />
          </button>
        </div>

        {/* Visibility options */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
          {/* All */}
          <div onClick={() => setType('all')} style={radioStyle(type === 'all')}>
            <div style={radioDot(type === 'all')}>
              {type === 'all' && <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#fff' }} />}
            </div>
            <div>
              <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)', margin: 0 }}>Visível para todos</p>
              <p style={{ fontSize: 10, color: 'var(--text3)', margin: 0 }}>Qualquer usuário autenticado pode acessar</p>
            </div>
          </div>

          {/* Roles */}
          <div onClick={() => setType('roles')} style={radioStyle(type === 'roles')}>
            <div style={radioDot(type === 'roles')}>
              {type === 'roles' && <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#fff' }} />}
            </div>
            <div>
              <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)', margin: 0 }}>Apenas roles específicas</p>
              <p style={{ fontSize: 10, color: 'var(--text3)', margin: 0 }}>Selecione quais perfis têm acesso</p>
            </div>
          </div>
          {type === 'roles' && (
            <div style={{ marginLeft: 24, display: 'flex', flexDirection: 'column', gap: 7, padding: '2px 0 4px' }}>
              {ALL_ROLES.map(r => (
                <div key={r.id} onClick={e => { e.stopPropagation(); toggleRole(r.id); }} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <div style={checkBox(roles.includes(r.id))}>
                    {roles.includes(r.id) && <Check size={9} style={{ color: '#fff' }} />}
                  </div>
                  <span style={{ fontSize: 12, color: 'var(--text2)' }}>{r.label}</span>
                </div>
              ))}
            </div>
          )}

          {/* Users */}
          <div onClick={() => setType('users')} style={radioStyle(type === 'users')}>
            <div style={radioDot(type === 'users')}>
              {type === 'users' && <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#fff' }} />}
            </div>
            <div>
              <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)', margin: 0 }}>Apenas usuários específicos</p>
              <p style={{ fontSize: 10, color: 'var(--text3)', margin: 0 }}>Selecione quais pessoas têm acesso</p>
            </div>
          </div>
          {type === 'users' && (
            <div style={{ marginLeft: 24, display: 'flex', flexDirection: 'column', gap: 7, padding: '2px 0 4px' }}>
              {MOCK_USERS_LIST.map(u => (
                <div key={u.id} onClick={e => { e.stopPropagation(); toggleUser(u.id); }} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <div style={checkBox(users.includes(u.id))}>
                    {users.includes(u.id) && <Check size={9} style={{ color: '#fff' }} />}
                  </div>
                  <span style={{ fontSize: 12, color: 'var(--text2)' }}>{u.name}</span>
                  <span style={{ fontSize: 10, color: 'var(--text3)' }}>
                    ({ALL_ROLES.find(r => r.id === u.role)?.label})
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', paddingTop: 16, borderTop: '1px solid var(--border)' }}>
          <button onClick={onClose} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 14px', fontSize: 12, color: 'var(--text2)', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
            Cancelar
          </button>
          <button onClick={handleSave} style={{ background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, padding: '7px 16px', fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
            Salvar permissões
          </button>
        </div>
      </div>
    </>
  );
}

/* ─── FolderModal ────────────────────────────────────────────────────────── */
function FolderModal({ parentId, onSave, onClose }) {
  const [nome, setNome] = useState('');
  const [emoji, setEmoji] = useState('📁');
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);
  useEffect(() => {
    const fn = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [onClose]);

  function handleSubmit() {
    const n = nome.trim();
    if (!n) return;
    onSave(n, emoji);
  }

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 500 }} />
      <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 380, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, zIndex: 501, padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>{parentId ? 'Nova subpasta' : 'Nova pasta'}</p>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', display: 'flex', padding: 4, borderRadius: 6 }}>
            <X size={15} />
          </button>
        </div>

        <p style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 8 }}>Ícone</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 18, padding: '10px 8px', background: 'var(--bg3)', borderRadius: 8, border: '1px solid var(--border)' }}>
          {EMOJI_OPTIONS.map(e => (
            <button key={e} onClick={() => setEmoji(e)} style={{
              fontSize: 17, lineHeight: 1, padding: '4px 5px', borderRadius: 6,
              background: emoji === e ? 'rgba(91,110,245,0.15)' : 'transparent',
              border: `1px solid ${emoji === e ? 'var(--accent)' : 'transparent'}`,
              cursor: 'pointer', transition: 'background 0.1s, border-color 0.1s',
            }}>
              {e}
            </button>
          ))}
        </div>

        <p style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 6 }}>Nome da pasta</p>
        <input
          ref={inputRef}
          value={nome}
          onChange={e => setNome(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleSubmit(); }}
          placeholder={parentId ? 'Nome da subpasta…' : 'Ex: Comercial, Marketing…'}
          style={{ width: '100%', background: 'var(--bg4)', border: '1px solid var(--border)', borderRadius: 8, padding: '9px 12px', color: 'var(--text)', fontSize: 13, fontFamily: 'var(--font-body)', outline: 'none', boxSizing: 'border-box', marginBottom: 18, display: 'block' }}
          onFocus={e => e.target.style.borderColor = 'var(--accent)'}
          onBlur={e => e.target.style.borderColor = 'var(--border)'}
        />

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 14px', fontSize: 12, color: 'var(--text2)', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={!nome.trim()}
            style={{ background: nome.trim() ? 'var(--accent)' : 'var(--bg4)', color: nome.trim() ? '#fff' : 'var(--text3)', border: 'none', borderRadius: 8, padding: '7px 16px', fontSize: 12, fontWeight: 500, cursor: nome.trim() ? 'pointer' : 'default', fontFamily: 'var(--font-body)', transition: 'background 0.13s' }}
          >
            Criar pasta
          </button>
        </div>
      </div>
    </>
  );
}

/* ─── NovoDocumentoModal ─────────────────────────────────────────────────── */
const DOC_TYPE_LABEL = { sop: 'processo', template: 'template', fluxograma: 'fluxograma', contrato: 'contrato' };
const DOC_TYPE_COLOR = { sop: '--accent2', template: '--purple', fluxograma: '--teal', contrato: '--green' };

const modalFieldStyle = { width: '100%', background: 'var(--bg4)', border: '1px solid var(--border)', borderRadius: 8, padding: '9px 12px', color: 'var(--text)', fontSize: 13, fontFamily: 'var(--font-body)', outline: 'none', boxSizing: 'border-box' };

function NovoDocumentoModal({ tipo, onSave, onClose }) {
  const [nome,        setNome]        = useState('');
  const [descricao,   setDescricao]   = useState('');
  const [responsavel, setResponsavel] = useState('');
  const [versao,      setVersao]      = useState('');
  const [formato,     setFormato]     = useState('');
  const [partes,      setPartes]      = useState('');
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);
  useEffect(() => {
    const fn = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [onClose]);

  function handleSubmit() {
    const n = nome.trim();
    if (!n) return;
    onSave({
      nome: n,
      descricao: descricao.trim(),
      color: DOC_TYPE_COLOR[tipo] ?? '--accent2',
      responsavel: tipo === 'sop'      ? (responsavel.trim() || null) : null,
      versao:      tipo === 'template' ? (versao.trim() || null)      : null,
      formato:     tipo === 'template' ? (formato.trim() || null)     : null,
      partes:      tipo === 'contrato' ? (partes.trim() || null)      : null,
      status: tipo === 'template' ? 'atual' : 'ativo',
    });
  }

  const label = DOC_TYPE_LABEL[tipo] ?? 'documento';

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 500 }} />
      <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 420, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, zIndex: 501, padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>Novo {label}</p>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', display: 'flex', padding: 4, borderRadius: 6 }}>
            <X size={15} />
          </button>
        </div>

        <p style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 6 }}>Nome</p>
        <input
          ref={inputRef}
          value={nome}
          onChange={e => setNome(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleSubmit(); }}
          placeholder={`Nome do ${label}…`}
          style={{ ...modalFieldStyle, marginBottom: 12 }}
          onFocus={e => e.target.style.borderColor = 'var(--accent)'}
          onBlur={e => e.target.style.borderColor = 'var(--border)'}
        />

        <p style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 6 }}>Descrição</p>
        <textarea
          value={descricao}
          onChange={e => setDescricao(e.target.value)}
          rows={3}
          placeholder="Do que se trata…"
          style={{ ...modalFieldStyle, marginBottom: 12, resize: 'vertical' }}
        />

        {tipo === 'sop' && (
          <>
            <p style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 6 }}>Responsável</p>
            <input value={responsavel} onChange={e => setResponsavel(e.target.value)} placeholder="Ex: Gestor Comercial"
              style={{ ...modalFieldStyle, marginBottom: 12 }} />
          </>
        )}

        {tipo === 'template' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
            <div>
              <p style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 6 }}>Versão</p>
              <input value={versao} onChange={e => setVersao(e.target.value)} placeholder="v1.0" style={modalFieldStyle} />
            </div>
            <div>
              <p style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 6 }}>Formato</p>
              <input value={formato} onChange={e => setFormato(e.target.value)} placeholder="Google Docs" style={modalFieldStyle} />
            </div>
          </div>
        )}

        {tipo === 'contrato' && (
          <>
            <p style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 6 }}>Partes envolvidas</p>
            <input value={partes} onChange={e => setPartes(e.target.value)} placeholder="Ex: Empresa ↔ Clientes PJ"
              style={{ ...modalFieldStyle, marginBottom: 12 }} />
          </>
        )}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 14px', fontSize: 12, color: 'var(--text2)', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={!nome.trim()}
            style={{ background: nome.trim() ? 'var(--accent)' : 'var(--bg4)', color: nome.trim() ? '#fff' : 'var(--text3)', border: 'none', borderRadius: 8, padding: '7px 16px', fontSize: 12, fontWeight: 500, cursor: nome.trim() ? 'pointer' : 'default', fontFamily: 'var(--font-body)', transition: 'background 0.13s' }}
          >
            Criar {label}
          </button>
        </div>
      </div>
    </>
  );
}

/* ─── CustomFolderItem ───────────────────────────────────────────────────── */
function CustomFolderItem({ folder, depth, activeFolder, onSelect, onAddSubfolder, onRename, onDelete, dragHandleProps, isDragging }) {
  const isActive    = activeFolder === folder.id;
  const hasChildren = (folder.children?.length ?? 0) > 0;
  const [expanded,      setExpanded]      = useState(true);
  const [hovered,       setHovered]       = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [renaming,      setRenaming]      = useState(false);
  const [draft,         setDraft]         = useState(folder.nome);

  function commitRename() {
    const t = draft.trim();
    if (t && t !== folder.nome) onRename(folder.id, t);
    setRenaming(false);
  }

  return (
    <div>
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => { setHovered(false); setConfirmDelete(false); }}
        style={{
          display: 'flex', alignItems: 'center', gap: 4,
          paddingLeft: 8 + depth * 14, paddingRight: 8,
          paddingTop: 6, paddingBottom: 6,
          background: isActive ? 'rgba(91,110,245,0.08)' : isDragging ? 'var(--bg4)' : 'transparent',
          transition: 'background 0.1s',
        }}
      >
        {/* Drag handle — root only */}
        {depth === 0 && (
          <span {...dragHandleProps} style={{ cursor: 'grab', color: 'var(--text3)', opacity: hovered ? 0.5 : 0, flexShrink: 0, display: 'flex', transition: 'opacity 0.1s' }}>
            <GripVertical size={11} />
          </span>
        )}

        {/* Expand toggle */}
        <button
          onClick={() => setExpanded(v => !v)}
          style={{ background: 'none', border: 'none', padding: 0, cursor: hasChildren ? 'pointer' : 'default', color: 'var(--text3)', display: 'flex', flexShrink: 0, width: 14, justifyContent: 'center', opacity: hasChildren ? 1 : 0 }}
        >
          {hasChildren && (expanded ? <ChevronDown size={11} /> : <ChevronRight size={11} />)}
        </button>

        {/* Emoji */}
        <span onClick={() => onSelect(folder.id)} style={{ fontSize: 13, flexShrink: 0, cursor: 'pointer', lineHeight: 1 }}>
          {folder.emoji}
        </span>

        {/* Name / inline rename */}
        {renaming ? (
          <input
            autoFocus
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onBlur={commitRename}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); commitRename(); } if (e.key === 'Escape') setRenaming(false); }}
            style={{ flex: 1, background: 'var(--bg4)', border: '1px solid var(--accent)', borderRadius: 4, padding: '2px 6px', color: 'var(--text)', fontSize: 12, fontFamily: 'var(--font-body)', outline: 'none', minWidth: 0 }}
          />
        ) : (
          <span
            onClick={() => onSelect(folder.id)}
            onDoubleClick={e => { e.preventDefault(); setDraft(folder.nome); setRenaming(true); }}
            style={{ flex: 1, fontSize: 12, fontWeight: isActive ? 500 : 400, color: isActive ? 'var(--accent2)' : 'var(--text2)', cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0, lineHeight: 1.4 }}
          >
            {folder.nome}
          </span>
        )}

        {/* Hover actions */}
        {hovered && !renaming && !confirmDelete && (
          <div style={{ display: 'flex', gap: 1, flexShrink: 0 }}>
            {depth < 2 && (
              <button title="Adicionar subpasta" onClick={e => { e.stopPropagation(); onAddSubfolder(folder.id); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', padding: 3, display: 'flex', borderRadius: 4 }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--text2)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--text3)'}
              >
                <Plus size={10} />
              </button>
            )}
            <button title="Renomear (duplo clique)" onClick={e => { e.stopPropagation(); setDraft(folder.nome); setRenaming(true); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', padding: 3, display: 'flex', borderRadius: 4 }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--text2)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--text3)'}
            >
              <Pencil size={10} />
            </button>
            <button title="Excluir pasta" onClick={e => { e.stopPropagation(); setConfirmDelete(true); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', padding: 3, display: 'flex', borderRadius: 4 }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--red)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--text3)'}
            >
              <X size={10} />
            </button>
          </div>
        )}

        {/* Delete confirmation */}
        {confirmDelete && (
          <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexShrink: 0 }}>
            <span style={{ fontSize: 10, color: 'var(--text3)' }}>Excluir?</span>
            <button onClick={e => { e.stopPropagation(); onDelete(folder.id); }}
              style={{ fontSize: 10, background: 'var(--red)', color: '#fff', border: 'none', borderRadius: 3, padding: '2px 6px', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
              Sim
            </button>
            <button onClick={e => { e.stopPropagation(); setConfirmDelete(false); }}
              style={{ fontSize: 10, background: 'none', border: '1px solid var(--border)', borderRadius: 3, padding: '2px 6px', cursor: 'pointer', color: 'var(--text3)', fontFamily: 'var(--font-body)' }}>
              Não
            </button>
          </div>
        )}
      </div>

      {/* Children (recursive, no DnD) */}
      {expanded && hasChildren && (
        <div>
          {folder.children.map(child => (
            <CustomFolderItem
              key={child.id}
              folder={child}
              depth={depth + 1}
              activeFolder={activeFolder}
              onSelect={onSelect}
              onAddSubfolder={onAddSubfolder}
              onRename={onRename}
              onDelete={onDelete}
              dragHandleProps={{}}
              isDragging={false}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── CustomFolderContent ────────────────────────────────────────────────── */
function CustomFolderContent({ folder }) {
  const navigate   = useNavigate();
  const totalItems = (folder.shortcuts?.length ?? 0) + (folder.children?.length ?? 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {folder.shortcuts?.length > 0 && (
        <>
          <p style={{ fontSize: 11, fontWeight: 500, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Atalhos rápidos
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10 }}>
            {folder.shortcuts.map(sh => (
              <button
                key={sh.id}
                onClick={() => navigate(sh.route)}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '20px 14px', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 12, cursor: 'pointer', fontFamily: 'var(--font-body)', transition: 'border-color 0.13s, background 0.13s' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg4)'; e.currentTarget.style.borderColor = 'var(--accent)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg3)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
              >
                <span style={{ fontSize: 28, lineHeight: 1 }}>{sh.emoji}</span>
                <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)' }}>{sh.label}</span>
                <span style={{ fontSize: 10, color: 'var(--text3)', display: 'flex', alignItems: 'center', gap: 3 }}>
                  <ExternalLink size={9} /> {sh.route}
                </span>
              </button>
            ))}
          </div>
        </>
      )}

      {folder.children?.length > 0 && (
        <>
          <p style={{ fontSize: 11, fontWeight: 500, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Subpastas
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {folder.children.map(child => (
              <div key={child.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 10 }}>
                <span style={{ fontSize: 16, lineHeight: 1 }}>{child.emoji}</span>
                <span style={{ fontSize: 13, color: 'var(--text)' }}>{child.nome}</span>
                {(child.children?.length ?? 0) > 0 && (
                  <span style={{ fontSize: 11, color: 'var(--text3)', marginLeft: 'auto' }}>
                    {child.children.length} subpasta{child.children.length > 1 ? 's' : ''}
                  </span>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {totalItems === 0 && (
        <div style={{ padding: '40px 20px', textAlign: 'center', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14 }}>
          <span style={{ fontSize: 32 }}>📂</span>
          <p style={{ fontSize: 13, color: 'var(--text3)', marginTop: 10 }}>Pasta vazia</p>
          <p style={{ fontSize: 12, color: 'var(--text3)', fontStyle: 'italic', marginTop: 4 }}>
            Adicione subpastas usando o botão + na barra lateral
          </p>
        </div>
      )}
    </div>
  );
}

/* ─── Page ───────────────────────────────────────────────────────────────────── */
export default function DiretorioInterno() {
  const { user, empresaId } = useAuth();
  const { openAI } = useUI();
  const isAdmin    = user?.role === 'admin';

  const navigate = useNavigate();

  const [activeFolder, setActiveFolder] = useState('processos');
  const [query,        setQuery]        = useState('');
  const [showSenhaAdd, setShowSenhaAdd] = useState(false);
  const [docModal,     setDocModal]     = useState(null); // { doc, docType }
  const [novoDocModal, setNovoDocModal] = useState(null); // null | 'sop' | 'template' | 'fluxograma' | 'contrato'

  // Supabase-backed state
  const [customFolders,    setCustomFolders]    = useState([]);
  const [sops,             setSops]             = useState([]);
  const [templates,        setTemplates]        = useState([]);
  const [fluxogramas,      setFluxogramas]      = useState([]);
  const [contratos,        setContratos]        = useState([]);
  const [loadingDiretorio, setLoadingDiretorio] = useState(true);
  const [senhas,           setSenhas]           = useState([]);
  const [loadingSenhas,    setLoadingSenhas]    = useState(true);

  useEffect(() => {
    if (!empresaId) return;
    let cancelled = false;

    async function load() {
      const [pastasRes, docsRes] = await Promise.all([
        supabase.from('diretorio_pastas').select('*').order('ordem'),
        supabase.from('diretorio_documentos').select('*').order('atualizado_em', { ascending: false }),
      ]);

      if (cancelled) return;

      // Seed folders if empty
      let pastaRows = pastasRes.data ?? [];
      if (pastaRows.length === 0) {
        const seedFolders = INITIAL_CUSTOM_FOLDERS.map((f, i) => ({
          pasta_pai_id: null,
          emoji: f.emoji,
          nome: f.nome,
          ordem: i,
          shortcuts: f.shortcuts ?? [],
        }));
        const { data: inserted } = await supabase.from('diretorio_pastas').insert(seedFolders).select();
        if (cancelled) return;
        pastaRows = inserted ?? [];
      }
      setCustomFolders(buildFolderTree(pastaRows.map(pastaFromRow)));

      const docRows = docsRes.data ?? [];
      const mapped = docRows.map(docFromRow);
      setSops(mapped.filter(d => d.tipo === 'sop'));
      setTemplates(mapped.filter(d => d.tipo === 'template'));
      setFluxogramas(mapped.filter(d => d.tipo === 'fluxograma'));
      setContratos(mapped.filter(d => d.tipo === 'contrato'));

      if (!cancelled) setLoadingDiretorio(false);
    }

    load();
    return () => { cancelled = true; };
  }, [empresaId]);

  useEffect(() => {
    if (!empresaId) return;
    let cancelled = false;
    async function loadSenhas() {
      const { data } = await supabase.from('diretorio_senhas').select('*').eq('empresa_id', empresaId).order('criado_em', { ascending: true });
      if (cancelled) return;
      const rows = data ?? [];
      if (!cancelled) {
        setSenhas(rows.map(senhaFromRow));
        setLoadingSenhas(false);
      }
    }
    loadSenhas();
    return () => { cancelled = true; };
  }, [empresaId]);

  async function saveSenha(entry) {
    if (entry.id) {
      const { data } = await supabase.from('diretorio_senhas').update(senhaToRow(entry)).eq('id', entry.id).select().single();
      if (data) setSenhas(prev => prev.map(s => s.id === entry.id ? senhaFromRow(data) : s));
    } else {
      const { data } = await supabase.from('diretorio_senhas').insert(senhaToRow(entry)).select().single();
      if (data) setSenhas(prev => [...prev, senhaFromRow(data)]);
    }
  }

  async function deleteSenha(id) {
    const { error } = await supabase.from('diretorio_senhas').delete().eq('id', id);
    if (!error) setSenhas(prev => prev.filter(s => s.id !== id));
  }

  const counts = {
    processos: sops.length,
    senhas: senhas.length,
    templates: templates.length,
    fluxogramas: fluxogramas.length,
    contratos: contratos.length,
  };

  const [folderModal,    setFolderModal]    = useState(null); // null | { parentId?: string }
  const [hoveredBuiltin, setHoveredBuiltin] = useState(null);
  const [permModal,      setPermModal]      = useState(null); // null | { folderId, folderLabel, folderEmoji? }

  const { perms, setPermission, canAccess, isRestricted } = useFolderPermissions();

  if (loadingDiretorio) return <SkeletonLoader rows={6} />;

  const activeCustomFolder = findInTree(customFolders, activeFolder);
  const activeConfig = FOLDERS.find((f) => f.id === activeFolder);

  // All folder descriptors for global file search
  const allFolderInfos = [
    ...FOLDERS.map(f => ({ folderId: f.id, folderLabel: f.label, folderEmoji: null })),
    ...getAllFolderIds(customFolders).map(id => {
      const f = findInTree(customFolders, id);
      return { folderId: id, folderLabel: f?.nome ?? id, folderEmoji: f?.emoji ?? '📁' };
    }),
  ];

  const recentFiles = [];

  // 3 documentos com atualização mais recente, entre todos os tipos (real, não índices fixos)
  const recentDocs = [
    ...sops.map(d => ({ ...d, _docType: 'sop' })),
    ...templates.map(d => ({ ...d, _docType: 'template' })),
    ...fluxogramas.map(d => ({ ...d, _docType: 'fluxograma' })),
    ...contratos.map(d => ({ ...d, _docType: 'contrato' })),
  ]
    .sort((a, b) => new Date(parseBRDate(b.updatedAt)) - new Date(parseBRDate(a.updatedAt)))
    .slice(0, 3);

  function openDoc(doc, docType) { setDocModal({ doc, docType }); }
  function closeDoc()            { setDocModal(null); }

  async function handleCreateDoc(formData) {
    const tipo = novoDocModal;
    const row = docToRow(formData, tipo, null);
    const { data, error } = await supabase.from('diretorio_documentos').insert(row).select().single();
    if (error || !data) { setNovoDocModal(null); return; }
    const doc = docFromRow(data);
    if (tipo === 'sop')        setSops(prev => [doc, ...prev]);
    if (tipo === 'template')   setTemplates(prev => [doc, ...prev]);
    if (tipo === 'fluxograma') setFluxogramas(prev => [doc, ...prev]);
    if (tipo === 'contrato')   setContratos(prev => [doc, ...prev]);
    setNovoDocModal(null);
  }

  async function handleUpdateDoc(tipo, docId, updates) {
    const row = docToRow(updates, tipo, updates.pasta_id ?? null);
    const { data, error } = await supabase.from('diretorio_documentos').update(row).eq('id', docId).select().single();
    if (error) return { error: error.message };
    const updatedDoc = docFromRow(data);
    if (tipo === 'sop')        setSops(prev => prev.map(d => d.id === docId ? updatedDoc : d));
    if (tipo === 'template')   setTemplates(prev => prev.map(d => d.id === docId ? updatedDoc : d));
    if (tipo === 'fluxograma') setFluxogramas(prev => prev.map(d => d.id === docId ? updatedDoc : d));
    if (tipo === 'contrato')   setContratos(prev => prev.map(d => d.id === docId ? updatedDoc : d));
    setDocModal(prev => prev ? { ...prev, doc: updatedDoc } : prev);
    return { doc: updatedDoc };
  }

  async function handleDeleteDoc(tipo, docId) {
    const { error } = await supabase.from('diretorio_documentos').delete().eq('id', docId);
    if (error) return;
    if (tipo === 'sop')        setSops(prev => prev.filter(d => d.id !== docId));
    if (tipo === 'template')   setTemplates(prev => prev.filter(d => d.id !== docId));
    if (tipo === 'fluxograma') setFluxogramas(prev => prev.filter(d => d.id !== docId));
    if (tipo === 'contrato')   setContratos(prev => prev.filter(d => d.id !== docId));
    closeDoc();
  }

  function handleCriarIA() {
    openAI(
      `Crie um novo documento para a pasta "${activeConfig?.label ?? activeFolder}" do nosso diretório interno. ` +
      `Empresa de serviços B2B para PMEs brasileiras. ` +
      `Gere um template profissional e completo com estrutura, instruções de preenchimento e exemplos práticos.`
    );
  }

  async function handleSaveFolder(nome, emoji) {
    const parentId = folderModal?.parentId ?? null;
    const newRow = { pasta_pai_id: parentId, emoji, nome, ordem: 0, shortcuts: [] };
    const { data } = await supabase.from('diretorio_pastas').insert(newRow).select().single();
    if (!data) { setFolderModal(null); return; }
    const folder = pastaFromRow(data);
    if (parentId) {
      setCustomFolders(prev => addChildToTree(prev, parentId, { ...folder, children: [] }));
    } else {
      setCustomFolders(prev => [...prev, { ...folder, children: [] }]);
    }
    setFolderModal(null);
  }

  async function handleRenameFolder(id, nome) {
    await supabase.from('diretorio_pastas').update({ nome }).eq('id', id);
    setCustomFolders(prev => updateInTree(prev, id, f => ({ ...f, nome })));
  }

  async function handleDeleteFolder(id) {
    await supabase.from('diretorio_pastas').delete().eq('id', id);
    setCustomFolders(prev => deleteFromTree(prev, id));
    if (activeFolder === id) setActiveFolder('processos');
  }

  async function handleFolderDragEnd(result) {
    if (!result.destination || result.source.index === result.destination.index) return;
    const items = [...customFolders];
    const [moved] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, moved);
    setCustomFolders(items);
    await Promise.all(items.map((f, i) => supabase.from('diretorio_pastas').update({ ordem: i }).eq('id', f.id)));
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 16, alignItems: 'start', minHeight: 600 }}>

      {/* ── Sidebar ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {/* Search */}
        <div style={{ position: 'relative', marginBottom: 4 }}>
          <Search size={13} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)', pointerEvents: 'none' }} />
          <input value={query} onChange={(e) => setQuery(e.target.value.toLowerCase())} placeholder="Buscar…"
            style={{ width: '100%', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 28px 7px 28px', color: 'var(--text)', fontSize: 12, fontFamily: 'var(--font-body)', outline: 'none', boxSizing: 'border-box' }}
            onFocus={(e) => { e.target.style.borderColor = 'var(--accent)'; }}
            onBlur={(e)  => { e.target.style.borderColor = 'var(--border)'; }}
          />
          {query && <button onClick={() => setQuery('')} style={{ position: 'absolute', right: 7, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', padding: 2, display: 'flex' }}><X size={11} /></button>}
        </div>

        {/* Recent files — shown below search when query is empty */}
        {!query && recentFiles.length > 0 && (
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px' }}>
            <p style={{ fontSize: 10, fontWeight: 500, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Arquivos recentes</p>
            {recentFiles.map((f, i) => {
              const cfg = FILE_TYPE_CFG[f.mimeType] ?? { label: (f.ext || 'FILE').toUpperCase(), color: 'var(--text3)', isImage: false };
              return (
                <div
                  key={f.id}
                  onClick={() => { setActiveFolder(f.folderId); setQuery(''); setShowSenhaAdd(false); }}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 0', borderBottom: i < recentFiles.length - 1 ? '1px solid var(--border)' : 'none', cursor: 'pointer', transition: 'opacity 0.13s' }}
                  onMouseEnter={e => e.currentTarget.style.opacity = '0.7'}
                  onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                >
                  <span style={{ fontSize: 9, fontWeight: 600, color: cfg.color, background: `color-mix(in srgb, ${cfg.color} 10%, transparent)`, border: `1px solid color-mix(in srgb, ${cfg.color} 20%, transparent)`, borderRadius: 3, padding: '1px 4px', flexShrink: 0 }}>
                    {cfg.label}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--text3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>
                    {f.name}
                  </span>
                  {f.folderEmoji && (
                    <span style={{ fontSize: 11, flexShrink: 0 }} title={f.folderLabel}>{f.folderEmoji}</span>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Folder list */}
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
          {FOLDERS.map((f, i) => {
            const Icon   = f.Icon;
            const active = activeFolder === f.id;
            return (
              <button key={f.id} onClick={() => { setActiveFolder(f.id); setQuery(''); setShowSenhaAdd(false); }}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 9, padding: '10px 12px', background: active ? 'var(--accent-bg)' : 'transparent', border: 'none', borderBottom: i < FOLDERS.length - 1 ? '1px solid var(--border)' : 'none', cursor: 'pointer', textAlign: 'left', fontFamily: 'var(--font-body)', transition: 'background 0.13s' }}
                onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = 'var(--bg3)'; setHoveredBuiltin(f.id); }}
                onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'transparent'; setHoveredBuiltin(null); }}
              >
                {active ? <FolderOpen size={14} style={{ color: `var(${f.color})`, flexShrink: 0 }} /> : <Folder size={14} style={{ color: 'var(--text3)', flexShrink: 0 }} />}
                <span style={{ flex: 1, fontSize: 12, fontWeight: active ? 500 : 400, color: active ? `var(${f.color})` : 'var(--text2)' }}>{f.label}</span>
                <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 20, background: active ? `color-mix(in srgb, var(${f.color}) 12%, transparent)` : 'var(--bg4)', color: active ? `var(${f.color})` : 'var(--text3)', border: `1px solid ${active ? `color-mix(in srgb, var(${f.color}) 25%, transparent)` : 'var(--border)'}` }}>
                  {counts[f.id]}
                </span>
                {(isRestricted(f.id) || hoveredBuiltin === f.id) && (
                  <span
                    onClick={e => { e.stopPropagation(); setPermModal({ folderId: f.id, folderLabel: f.label }); }}
                    title="Permissões de acesso"
                    style={{ display: 'flex', padding: 3, borderRadius: 4, cursor: 'pointer', color: isRestricted(f.id) ? 'var(--amber)' : 'var(--text3)', flexShrink: 0, transition: 'color 0.13s' }}
                    onMouseEnter={e => { e.stopPropagation(); e.currentTarget.style.color = 'var(--amber)'; }}
                    onMouseLeave={e => { e.stopPropagation(); e.currentTarget.style.color = isRestricted(f.id) ? 'var(--amber)' : 'var(--text3)'; }}
                  >
                    <Lock size={11} />
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Custom folders */}
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ padding: '8px 10px 8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: customFolders.length > 0 ? '1px solid var(--border)' : 'none' }}>
            <span style={{ fontSize: 10, fontWeight: 500, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Minhas Pastas
            </span>
            <button
              onClick={() => setFolderModal({})}
              title="Nova pasta"
              style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', padding: '3px 5px', borderRadius: 5, fontFamily: 'var(--font-body)', fontSize: 11 }}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--text2)'; e.currentTarget.style.background = 'var(--bg3)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--text3)'; e.currentTarget.style.background = 'none'; }}
            >
              <Plus size={11} /> Nova pasta
            </button>
          </div>

          <DragDropContext onDragEnd={handleFolderDragEnd}>
            <Droppable droppableId="custom-folders">
              {(provided) => (
                <div ref={provided.innerRef} {...provided.droppableProps} style={{ paddingTop: customFolders.length > 0 ? 4 : 0, paddingBottom: customFolders.length > 0 ? 4 : 0 }}>
                  {customFolders.map((folder, index) => (
                    <Draggable key={folder.id} draggableId={folder.id} index={index}>
                      {(provided, snapshot) => (
                        <div ref={provided.innerRef} {...provided.draggableProps}>
                          <CustomFolderItem
                            folder={folder}
                            depth={0}
                            activeFolder={activeFolder}
                            onSelect={id => { setActiveFolder(id); setQuery(''); setShowSenhaAdd(false); }}
                            onAddSubfolder={parentId => setFolderModal({ parentId })}
                            onRename={handleRenameFolder}
                            onDelete={handleDeleteFolder}
                            dragHandleProps={provided.dragHandleProps}
                            isDragging={snapshot.isDragging}
                          />
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                  {customFolders.length === 0 && (
                    <div style={{ padding: '10px 12px' }}>
                      <p style={{ fontSize: 11, color: 'var(--text3)', fontStyle: 'italic', textAlign: 'center' }}>Nenhuma pasta ainda</p>
                    </div>
                  )}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        </div>

        {/* Recents */}
        <div style={{ padding: '10px 12px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12 }}>
          <p style={{ fontSize: 10, fontWeight: 500, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Recentes</p>
          {recentDocs.length === 0 && (
            <p style={{ fontSize: 11, color: 'var(--text3)', fontStyle: 'italic' }}>Nenhum documento ainda</p>
          )}
          {recentDocs.map((item) => (
            <div key={item.id} onClick={() => openDoc(item, item._docType)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 0', borderBottom: '1px solid var(--border)', cursor: 'pointer' }}
              onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.7'; }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
            >
              <Clock size={10} style={{ color: 'var(--text3)', flexShrink: 0 }} />
              <span style={{ fontSize: 11, color: 'var(--text3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.nome}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Main content area ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {activeCustomFolder ? (
              <>
                <span style={{ fontSize: 18, lineHeight: 1 }}>{activeCustomFolder.emoji}</span>
                <h2 style={{ fontSize: 15, fontWeight: 500, color: 'var(--text)' }}>{activeCustomFolder.nome}</h2>
                {((activeCustomFolder.shortcuts?.length ?? 0) + (activeCustomFolder.children?.length ?? 0)) > 0 && (
                  <span style={{ fontSize: 11, color: 'var(--text3)', background: 'var(--bg3)', border: '1px solid var(--border)', padding: '1px 7px', borderRadius: 20 }}>
                    {(activeCustomFolder.shortcuts?.length ?? 0) + (activeCustomFolder.children?.length ?? 0)}
                  </span>
                )}
              </>
            ) : (
              <>
                {activeConfig && <activeConfig.Icon size={16} style={{ color: `var(${activeConfig.color})` }} />}
                <h2 style={{ fontSize: 15, fontWeight: 500, color: 'var(--text)' }}>{activeConfig?.label}</h2>
                <span style={{ fontSize: 11, color: 'var(--text3)', background: 'var(--bg3)', border: '1px solid var(--border)', padding: '1px 7px', borderRadius: 20 }}>
                  {counts[activeFolder]}
                </span>
              </>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {activeFolder === 'senhas' && isAdmin && (
              <button onClick={() => setShowSenhaAdd((v) => !v)} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 12px', color: 'var(--text2)', fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
                <Plus size={13} /> Adicionar
              </button>
            )}
            {!activeCustomFolder && (
              <button onClick={handleCriarIA} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, padding: '7px 13px', fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
                <Bot size={13} /> Criar com IA
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        {!canAccess(activeFolder, user) ? (
          <FolderAccessDenied folderLabel={activeCustomFolder?.nome ?? activeConfig?.label ?? activeFolder} />
        ) : (
          <>
            {/* Global file search results — shown above folder content when query is active */}
            {query && <GlobalSearchResults query={query} folderInfos={allFolderInfos} />}

            {activeCustomFolder ? (
              <CustomFolderContent folder={activeCustomFolder} />
            ) : (
              <>
                {activeFolder === 'processos'   && <ProcessosContent sops={sops} query={query} onOpen={openDoc} onCreateNew={() => setNovoDocModal('sop')} />}
                {activeFolder === 'senhas'      && <SenhasContent senhas={senhas} loadingSenhas={loadingSenhas} query={query} isAdmin={isAdmin} showAdd={showSenhaAdd} setShowAdd={setShowSenhaAdd} onSave={saveSenha} onDelete={deleteSenha} />}
                {activeFolder === 'templates'   && <TemplatesContent templates={templates} query={query} onOpen={openDoc} onCreateNew={() => setNovoDocModal('template')} />}
                {activeFolder === 'fluxogramas' && <GenericContent items={fluxogramas} query={query} docType="fluxograma" onOpen={openDoc} onCreateNew={() => setNovoDocModal('fluxograma')} />}
                {activeFolder === 'contratos'   && <GenericContent items={contratos}   query={query} docType="contrato"   onOpen={openDoc} onCreateNew={() => setNovoDocModal('contrato')} />}
              </>
            )}

            {/* File uploads — available in every folder */}
            <FolderFilesSection key={activeFolder} folderId={activeFolder} />
          </>
        )}
      </div>

      {/* Floating AI create button */}
      <button onClick={handleCriarIA} title="Criar documento com IA"
        style={{ position: 'fixed', bottom: 28, right: 28, width: 48, height: 48, borderRadius: '50%', background: 'var(--accent)', color: '#fff', border: 'none', cursor: 'pointer', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 20px rgba(91,110,245,0.4)', transition: 'transform 0.15s, box-shadow 0.15s' }}
        onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.08)'; e.currentTarget.style.boxShadow = '0 6px 28px rgba(91,110,245,0.55)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)';    e.currentTarget.style.boxShadow = '0 4px 20px rgba(91,110,245,0.4)'; }}
      >
        <Zap size={18} />
      </button>

      {/* Document modal */}
      {docModal && (
        <DocModal
          doc={docModal.doc}
          docType={docModal.docType}
          folderColor={FOLDERS.find((f) => f.id === activeFolder)?.color ?? '--accent2'}
          onClose={closeDoc}
          onSave={(updates) => handleUpdateDoc(docModal.docType, docModal.doc.id, updates)}
          onDelete={() => handleDeleteDoc(docModal.docType, docModal.doc.id)}
        />
      )}

      {/* New document modal */}
      {novoDocModal && (
        <NovoDocumentoModal
          tipo={novoDocModal}
          onSave={handleCreateDoc}
          onClose={() => setNovoDocModal(null)}
        />
      )}

      {/* Folder create/subfolder modal */}
      {folderModal && (
        <FolderModal
          parentId={folderModal.parentId}
          onSave={handleSaveFolder}
          onClose={() => setFolderModal(null)}
        />
      )}

      {/* Folder permission modal */}
      {permModal && (
        <PermissionModal
          folderId={permModal.folderId}
          folderLabel={permModal.folderLabel}
          folderEmoji={permModal.folderEmoji}
          currentPerm={perms[permModal.folderId]}
          onSave={setPermission}
          onClose={() => setPermModal(null)}
        />
      )}
    </div>
  );
}
