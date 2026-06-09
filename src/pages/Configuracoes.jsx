import { useState, useRef } from 'react';
import { RotateCcw, ChevronRight, Check, X as XIcon, Building2, User, Bell, Lock, Eye, EyeOff, Sun, Moon, Monitor, CreditCard, Download, Zap, AlertTriangle, Bot } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useAuth } from '../store/auth.js';
import { MODULES, DEFAULT_PERMISSIONS } from '../data/permissions.js';
import { MOCK_USERS, ROLES } from '../data/users.js';
import PermissionGate from '../components/Auth/PermissionGate.jsx';

const ACTIONS = ['view', 'edit', 'delete', 'export'];
const ACTION_LABELS = { view: 'Ver', edit: 'Editar', delete: 'Excluir', export: 'Exportar' };
const ROLE_KEYS = Object.keys(ROLES);

/* ─── Small toggle checkbox ─────────────────────────────────────────────────── */
function Toggle({ checked, onChange, disabled }) {
  return (
    <button
      type="button"
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      style={{
        width: 36, height: 20, borderRadius: 10, border: 'none',
        background: checked ? 'var(--accent)' : 'var(--bg4)',
        cursor: disabled ? 'default' : 'pointer',
        position: 'relative', flexShrink: 0,
        transition: 'background 0.15s',
        outline: 'none',
      }}
    >
      <span style={{
        position: 'absolute', top: 2,
        left: checked ? 18 : 2,
        width: 16, height: 16, borderRadius: '50%',
        background: checked ? '#fff' : 'var(--border2)',
        transition: 'left 0.15s',
      }} />
    </button>
  );
}

/* ─── Permission cell (check icon) ─────────────────────────────────────────── */
function PermCell({ value, onChange }) {
  return (
    <div
      onClick={() => onChange(!value)}
      style={{
        width: 28, height: 28, borderRadius: 6, cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: value ? 'rgba(45,212,160,0.1)' : 'var(--bg4)',
        border: `1px solid ${value ? 'rgba(45,212,160,0.3)' : 'var(--border)'}`,
        transition: 'background 0.13s, border-color 0.13s',
      }}
    >
      {value
        ? <Check size={13} style={{ color: 'var(--green)' }} />
        : <XIcon size={13} style={{ color: 'var(--text3)' }} />
      }
    </div>
  );
}

/* ─── Tab 1: Role permissions matrix ────────────────────────────────────────── */
function RoleTab() {
  const { getRolePermissions, updateRolePermission, resetRolePermissions } = useAuth();

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
        <thead>
          <tr>
            <th style={{ width: 160, padding: '8px 12px', textAlign: 'left', fontSize: 11, color: 'var(--text3)', fontWeight: 500, borderBottom: '1px solid var(--border)' }}>
              Módulo
            </th>
            <th style={{ width: 80, padding: '8px 8px', textAlign: 'center', fontSize: 11, color: 'var(--text3)', fontWeight: 500, borderBottom: '1px solid var(--border)' }}>
              Ação
            </th>
            {ROLE_KEYS.map((role) => (
              <th key={role} style={{ padding: '8px 12px', textAlign: 'center', fontSize: 11, color: 'var(--text3)', fontWeight: 500, borderBottom: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <span style={{ color: 'var(--text2)' }}>{ROLES[role]}</span>
                  <button
                    onClick={() => resetRolePermissions(role)}
                    title="Restaurar padrões"
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: 'var(--text3)', padding: 2, borderRadius: 4,
                      display: 'flex', alignItems: 'center', gap: 3,
                      fontSize: 10, fontFamily: 'var(--font-body)',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--amber)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text3)'; }}
                  >
                    <RotateCcw size={10} /> Restaurar
                  </button>
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {MODULES.map((mod, mIdx) =>
            ACTIONS.map((action, aIdx) => {
              const isFirstAction = aIdx === 0;
              return (
                <tr key={`${mod.id}-${action}`} style={{ background: mIdx % 2 === 0 ? 'transparent' : 'rgba(30,32,40,0.4)' }}>
                  <td style={{ padding: '6px 12px', fontSize: 12, color: 'var(--text2)', borderBottom: '1px solid var(--border)', verticalAlign: 'middle' }}>
                    {isFirstAction ? mod.label : ''}
                  </td>
                  <td style={{ padding: '6px 8px', fontSize: 11, color: 'var(--text3)', borderBottom: '1px solid var(--border)', textAlign: 'center' }}>
                    {ACTION_LABELS[action]}
                  </td>
                  {ROLE_KEYS.map((role) => {
                    const perms = getRolePermissions(role);
                    const value = perms[mod.id]?.[action] ?? false;
                    return (
                      <td key={role} style={{ padding: '6px 12px', borderBottom: '1px solid var(--border)', textAlign: 'center', verticalAlign: 'middle' }}>
                        <div style={{ display: 'flex', justifyContent: 'center' }}>
                          <PermCell
                            value={value}
                            onChange={(v) => updateRolePermission(role, mod.id, action, v)}
                          />
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

/* ─── Tab 2: User management ────────────────────────────────────────────────── */
function UsersTab() {
  const { getUserPermissions, updateUserPermission, resetUserPermissions } = useAuth();
  const [selectedUser, setSelectedUser] = useState(null);

  const targetUser = selectedUser ? MOCK_USERS.find((u) => u.id === selectedUser) : null;
  const userPerms  = targetUser ? getUserPermissions(targetUser) : null;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: 20, alignItems: 'start' }}>
      {/* User list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {MOCK_USERS.map((u) => (
          <button
            key={u.id}
            onClick={() => setSelectedUser(u.id)}
            style={{
              background: selectedUser === u.id ? 'var(--accent-bg)' : 'var(--bg3)',
              border: `1px solid ${selectedUser === u.id ? 'var(--accent)' : 'var(--border)'}`,
              borderRadius: 10, padding: '10px 12px',
              display: 'flex', alignItems: 'center', gap: 10,
              cursor: 'pointer', textAlign: 'left',
              fontFamily: 'var(--font-body)',
              transition: 'background 0.13s, border-color 0.13s',
            }}
            onMouseEnter={(e) => {
              if (selectedUser !== u.id) {
                e.currentTarget.style.borderColor = 'var(--border2)';
              }
            }}
            onMouseLeave={(e) => {
              if (selectedUser !== u.id) {
                e.currentTarget.style.borderColor = 'var(--border)';
              }
            }}
          >
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              background: selectedUser === u.id ? 'var(--accent-bg)' : 'var(--bg4)',
              color: selectedUser === u.id ? 'var(--accent2)' : 'var(--text3)',
              fontSize: 11, fontWeight: 500,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              {u.avatar}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 12, color: 'var(--text)', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {u.name}
              </p>
              <p style={{ fontSize: 11, color: 'var(--text3)' }}>{ROLES[u.role]}</p>
            </div>
            <ChevronRight size={13} style={{ color: 'var(--text3)', flexShrink: 0 }} />
          </button>
        ))}
      </div>

      {/* Permission panel */}
      {targetUser && userPerms ? (
        <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 14, padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div>
              <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>{targetUser.name}</p>
              <p style={{ fontSize: 12, color: 'var(--text3)' }}>{ROLES[targetUser.role]} · {targetUser.email}</p>
            </div>
            <button
              onClick={() => resetUserPermissions(targetUser.id)}
              style={{
                background: 'none', border: '1px solid var(--border)',
                borderRadius: 8, padding: '6px 10px',
                color: 'var(--text3)', fontSize: 12, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 6,
                fontFamily: 'var(--font-body)',
                transition: 'color 0.13s, border-color 0.13s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color        = 'var(--amber)';
                e.currentTarget.style.borderColor  = 'var(--amber)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color        = 'var(--text3)';
                e.currentTarget.style.borderColor  = 'var(--border)';
              }}
            >
              <RotateCcw size={12} /> Restaurar padrões
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {MODULES.map((mod) => (
              <div key={mod.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                <p style={{ fontSize: 12, color: 'var(--text2)', fontWeight: 500, marginBottom: 8 }}>
                  {mod.label}
                </p>
                <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                  {ACTIONS.map((action) => {
                    const value = userPerms[mod.id]?.[action] ?? false;
                    return (
                      <label
                        key={action}
                        style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}
                      >
                        <Toggle
                          checked={value}
                          onChange={(v) => updateUserPermission(targetUser.id, mod.id, action, v)}
                        />
                        <span style={{ fontSize: 11, color: 'var(--text3)' }}>
                          {ACTION_LABELS[action]}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div style={{
          background: 'var(--bg3)', border: '1px solid var(--border)',
          borderRadius: 14, padding: 40,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <p style={{ fontSize: 13, color: 'var(--text3)' }}>
            Selecione um usuário para editar as permissões
          </p>
        </div>
      )}
    </div>
  );
}

/* ─── Toast ─────────────────────────────────────────────────────────────────── */
function Toast({ msg }) {
  return (
    <div style={{ position: 'fixed', top: 24, right: 24, zIndex: 2000, background: 'var(--bg2)', border: '1px solid rgba(45,212,160,0.4)', borderRadius: 10, padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--green)', fontFamily: 'var(--font-body)', boxShadow: '0 4px 24px rgba(0,0,0,0.4)' }}>
      <Check size={14} /> {msg}
    </div>
  );
}

/* ─── Constants ──────────────────────────────────────────────────────────────── */
const SEGMENTOS   = ['Tecnologia','Consultoria','Serviços B2B','Indústria','Varejo','Saúde','Educação','Construção Civil','Financeiro','Agropecuária','Outro'];
const PORTES      = ['MEI','ME','EPP','Médio Porte'];
const FUSOS       = ['America/Sao_Paulo — GMT−3 (Brasília)','America/Manaus — GMT−4 (Amazonas)','America/Rio_Branco — GMT−5 (Acre)','America/Fortaleza — GMT−3 (Nordeste)','America/Noronha — GMT−2 (Noronha)'];
const NOTIF_ITEMS = [
  { key: 'followup',   label: 'Follow-up vencido'             },
  { key: 'semcontato', label: 'Lead sem contato há X dias'    },
  { key: 'meta',       label: 'Meta atingida'                 },
  { key: 'relatorio',  label: 'Relatório mensal disponível'   },
  { key: 'ticket',     label: 'Novo ticket'                   },
];

function pwStrength(pw) {
  if (!pw) return 0;
  return [pw.length >= 8, /[A-Z]/.test(pw), /[0-9]/.test(pw), /[^A-Za-z0-9]/.test(pw)].filter(Boolean).length;
}

/* ─── Senha Modal ────────────────────────────────────────────────────────────── */
function SenhaModal({ onClose }) {
  const [f, setF]       = useState({ atual: '', nova: '', confirma: '' });
  const [show, setShow] = useState({ atual: false, nova: false, confirma: false });
  const set       = (k, v) => setF(p => ({ ...p, [k]: v }));
  const toggleVis = (k) => setShow(p => ({ ...p, [k]: !p[k] }));

  const strength        = pwStrength(f.nova);
  const strengthColors  = ['', 'var(--red)', 'var(--amber)', 'var(--accent2)', 'var(--green)'];
  const strengthLabels  = ['', 'Fraca', 'Razoável', 'Forte', 'Muito forte'];
  const mismatch        = f.confirma && f.nova !== f.confirma;
  const canSave         = f.atual && f.nova.length >= 8 && f.nova === f.confirma;

  function renderField(label, key) {
    return (
      <div style={{ marginBottom: 14 }}>
        <label style={{ fontSize: 11, color: 'var(--text3)', display: 'block', marginBottom: 5 }}>{label}</label>
        <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg4)', border: `1px solid ${key === 'confirma' && mismatch ? 'var(--red)' : 'var(--border)'}`, borderRadius: 8, paddingRight: 10, transition: 'border-color .15s' }}>
          <input type={show[key] ? 'text' : 'password'}
            style={{ flex: 1, background: 'transparent', border: 'none', padding: '8px 12px', fontSize: 13, color: 'var(--text)', fontFamily: 'var(--font-body)', outline: 'none' }}
            value={f[key]} onChange={e => set(key, e.target.value)} />
          <button type="button" onClick={() => toggleVis(key)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', padding: 0, display: 'flex', flexShrink: 0 }}>
            {show[key] ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: 14, width: 400, maxWidth: '90vw', padding: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 15, fontWeight: 500, color: 'var(--text)' }}>
            <Lock size={15} style={{ color: 'var(--accent)' }} /> Alterar senha
          </div>
          <button onClick={() => onClose(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', padding: 4 }}><XIcon size={16} /></button>
        </div>

        {renderField('SENHA ATUAL', 'atual')}
        {renderField('NOVA SENHA', 'nova')}

        {f.nova && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', gap: 4, marginBottom: 5 }}>
              {[1,2,3,4].map(i => (
                <div key={i} style={{ flex: 1, height: 4, borderRadius: 4, transition: 'background .2s', background: i <= strength ? strengthColors[strength] : 'var(--bg4)' }} />
              ))}
            </div>
            <div style={{ fontSize: 11, color: strengthColors[strength] || 'var(--text3)' }}>{strengthLabels[strength]}</div>
          </div>
        )}

        {renderField('CONFIRMAR NOVA SENHA', 'confirma')}
        {mismatch && <div style={{ fontSize: 11, color: 'var(--red)', marginTop: -10, marginBottom: 12 }}>As senhas não coincidem</div>}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
          <button onClick={() => onClose(false)} style={{ padding: '8px 16px', borderRadius: 8, fontSize: 13, cursor: 'pointer', fontFamily: 'var(--font-body)', background: 'transparent', border: '1px solid var(--border2)', color: 'var(--text2)' }}>
            Cancelar
          </button>
          <button onClick={() => canSave && onClose(true)}
            style={{ padding: '8px 20px', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: canSave ? 'pointer' : 'default', fontFamily: 'var(--font-body)', background: canSave ? 'var(--accent)' : 'var(--bg4)', border: 'none', color: canSave ? '#fff' : 'var(--text3)', transition: 'background .15s' }}>
            Alterar senha
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Empresa Tab ────────────────────────────────────────────────────────────── */
function EmpresaTab() {
  const logoRef = useRef(null);
  const [toast, setToast] = useState(false);
  const defaultEmpresa = { nome: '', cnpj: '', segmento: 'Tecnologia', porte: 'ME', cep: '', endereco: '', cidade: '', estado: '', telefone: '', email: '', site: '', fuso: FUSOS[0], idioma: 'Português (PT-BR)', moeda: 'R$ (BRL)', logo: null };
  const [form, setForm] = useState(() => {
    try { return { ...defaultEmpresa, ...JSON.parse(localStorage.getItem('cfg_empresa') || '{}') }; }
    catch { return defaultEmpresa; }
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  function save() {
    localStorage.setItem('cfg_empresa', JSON.stringify(form));
    setToast(true);
    setTimeout(() => setToast(false), 3000);
  }

  function handleLogo(e) {
    const file = e.target.files[0];
    if (!file) return;
    const r = new FileReader();
    r.onload = ev => set('logo', ev.target.result);
    r.readAsDataURL(file);
  }

  const inp       = { background: 'var(--bg4)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: 'var(--text)', fontFamily: 'var(--font-body)', width: '100%', boxSizing: 'border-box', outline: 'none' };
  const secLabel  = { fontSize: 12, fontWeight: 500, color: 'var(--text2)', marginBottom: 14, paddingBottom: 6, borderBottom: '1px solid var(--border)', display: 'block' };
  const fldLabel  = { fontSize: 11, color: 'var(--text3)', display: 'block', marginBottom: 5 };
  const grid2     = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 };

  return (
    <div>
      {toast && <Toast msg="Configurações da empresa salvas!" />}

      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 28, paddingBottom: 24, borderBottom: '1px solid var(--border)' }}>
        <div style={{ width: 76, height: 76, borderRadius: 14, background: 'var(--bg3)', border: '2px dashed var(--border2)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
          {form.logo ? <img src={form.logo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Building2 size={30} style={{ color: 'var(--text3)' }} />}
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', marginBottom: 4 }}>Logo da empresa</div>
          <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 10 }}>PNG, JPG ou SVG · máx. 2 MB</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => logoRef.current?.click()} style={{ padding: '5px 13px', borderRadius: 7, fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font-body)', background: 'transparent', border: '1px solid var(--border2)', color: 'var(--text2)' }}>Alterar logo</button>
            {form.logo && <button onClick={() => set('logo', null)} style={{ padding: '5px 13px', borderRadius: 7, fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font-body)', background: 'transparent', border: '1px solid rgba(240,92,92,0.4)', color: 'var(--red)' }}>Remover</button>}
          </div>
        </div>
        <input ref={logoRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleLogo} />
      </div>

      {/* Dados da empresa */}
      <div style={{ marginBottom: 24 }}>
        <span style={secLabel}>Dados da empresa</span>
        <div style={grid2}>
          <div><label style={fldLabel}>NOME DA EMPRESA</label><input style={inp} value={form.nome} onChange={e => set('nome', e.target.value)} placeholder="Ex.: Acme Ltda." /></div>
          <div><label style={fldLabel}>CNPJ</label><input style={inp} value={form.cnpj} onChange={e => set('cnpj', e.target.value)} placeholder="00.000.000/0000-00" /></div>
          <div>
            <label style={fldLabel}>SEGMENTO</label>
            <select style={{ ...inp, cursor: 'pointer' }} value={form.segmento} onChange={e => set('segmento', e.target.value)}>
              {SEGMENTOS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label style={fldLabel}>PORTE</label>
            <select style={{ ...inp, cursor: 'pointer' }} value={form.porte} onChange={e => set('porte', e.target.value)}>
              {PORTES.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Endereço */}
      <div style={{ marginBottom: 24 }}>
        <span style={secLabel}>Endereço e Contato</span>
        <div style={grid2}>
          <div><label style={fldLabel}>CEP</label><input style={inp} value={form.cep} onChange={e => set('cep', e.target.value)} placeholder="00000-000" /></div>
          <div>
            <label style={fldLabel}>CIDADE / ESTADO</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input style={inp} value={form.cidade} onChange={e => set('cidade', e.target.value)} placeholder="Cidade" />
              <input style={{ ...inp, width: 64, flexShrink: 0 }} value={form.estado} onChange={e => set('estado', e.target.value)} placeholder="UF" maxLength={2} />
            </div>
          </div>
          <div style={{ gridColumn: 'span 2' }}><label style={fldLabel}>ENDEREÇO</label><input style={inp} value={form.endereco} onChange={e => set('endereco', e.target.value)} placeholder="Rua, número, complemento" /></div>
          <div><label style={fldLabel}>TELEFONE</label><input style={inp} value={form.telefone} onChange={e => set('telefone', e.target.value)} placeholder="(00) 00000-0000" /></div>
          <div><label style={fldLabel}>E-MAIL COMERCIAL</label><input type="email" style={inp} value={form.email} onChange={e => set('email', e.target.value)} placeholder="contato@empresa.com" /></div>
          <div style={{ gridColumn: 'span 2' }}><label style={fldLabel}>SITE</label><input style={inp} value={form.site} onChange={e => set('site', e.target.value)} placeholder="https://empresa.com.br" /></div>
        </div>
      </div>

      {/* Regionais */}
      <div style={{ marginBottom: 28 }}>
        <span style={secLabel}>Configurações regionais</span>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
          <div>
            <label style={fldLabel}>FUSO HORÁRIO</label>
            <select style={{ ...inp, cursor: 'pointer' }} value={form.fuso} onChange={e => set('fuso', e.target.value)}>
              {FUSOS.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
          <div>
            <label style={fldLabel}>IDIOMA</label>
            <select style={{ ...inp, cursor: 'pointer' }} value={form.idioma} onChange={e => set('idioma', e.target.value)}>
              <option value="Português (PT-BR)">Português (PT-BR)</option>
              <option value="English (EN-US)">English (EN-US)</option>
              <option value="Español (ES)">Español (ES)</option>
            </select>
          </div>
          <div>
            <label style={fldLabel}>MOEDA PADRÃO</label>
            <select style={{ ...inp, cursor: 'pointer' }} value={form.moeda} onChange={e => set('moeda', e.target.value)}>
              <option value="R$ (BRL)">R$ — Real Brasileiro (BRL)</option>
              <option value="US$ (USD)">US$ — Dólar Americano (USD)</option>
              <option value="€ (EUR)">€ — Euro (EUR)</option>
            </select>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <PermissionGate module="configuracoes" action="edit">
          <button onClick={save} style={{ background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 22px', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
            Salvar alterações
          </button>
        </PermissionGate>
      </div>
    </div>
  );
}

/* ─── Minha Conta Tab ────────────────────────────────────────────────────────── */
function MinhaContaTab() {
  const avatarRef = useRef(null);
  const [toast, setToast]       = useState(false);
  const [senhaModal, setSenha]  = useState(false);
  const defaultConta = { nome: '', cargo: '', email: '', telefone: '', avatar: null, tema: 'dark', notif: { followup: true, semcontato: true, meta: true, relatorio: false, ticket: false } };
  const [form, setForm] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('cfg_conta') || '{}');
      return { ...defaultConta, ...saved, notif: { ...defaultConta.notif, ...(saved.notif || {}) } };
    } catch { return defaultConta; }
  });
  const set      = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const setNotif = (k, v) => setForm(f => ({ ...f, notif: { ...f.notif, [k]: v } }));

  function save() {
    localStorage.setItem('cfg_conta', JSON.stringify(form));
    setToast(true);
    setTimeout(() => setToast(false), 3000);
  }

  function handleAvatar(e) {
    const file = e.target.files[0];
    if (!file) return;
    const r = new FileReader();
    r.onload = ev => set('avatar', ev.target.result);
    r.readAsDataURL(file);
  }

  function handleSenhaClose(success) {
    setSenha(false);
    if (success) { setToast(true); setTimeout(() => setToast(false), 3000); }
  }

  const inp      = { background: 'var(--bg4)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: 'var(--text)', fontFamily: 'var(--font-body)', width: '100%', boxSizing: 'border-box', outline: 'none' };
  const secLabel = { fontSize: 12, fontWeight: 500, color: 'var(--text2)', marginBottom: 14, paddingBottom: 6, borderBottom: '1px solid var(--border)', display: 'block' };
  const fldLabel = { fontSize: 11, color: 'var(--text3)', display: 'block', marginBottom: 5 };

  return (
    <div>
      {toast && <Toast msg="Alterações salvas com sucesso!" />}
      {senhaModal && <SenhaModal onClose={handleSenhaClose} />}

      {/* Avatar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 28, paddingBottom: 24, borderBottom: '1px solid var(--border)' }}>
        <div style={{ width: 76, height: 76, borderRadius: '50%', background: 'var(--bg3)', border: '2px solid var(--border2)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
          {form.avatar ? <img src={form.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <User size={30} style={{ color: 'var(--text3)' }} />}
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', marginBottom: 4 }}>Foto de perfil</div>
          <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 10 }}>PNG ou JPG · máx. 2 MB</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => avatarRef.current?.click()} style={{ padding: '5px 13px', borderRadius: 7, fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font-body)', background: 'transparent', border: '1px solid var(--border2)', color: 'var(--text2)' }}>Alterar foto</button>
            {form.avatar && <button onClick={() => set('avatar', null)} style={{ padding: '5px 13px', borderRadius: 7, fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font-body)', background: 'transparent', border: '1px solid rgba(240,92,92,0.4)', color: 'var(--red)' }}>Remover</button>}
          </div>
        </div>
        <input ref={avatarRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatar} />
      </div>

      {/* Dados pessoais */}
      <div style={{ marginBottom: 24 }}>
        <span style={secLabel}>Dados pessoais</span>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
          <div><label style={fldLabel}>NOME</label><input style={inp} value={form.nome} onChange={e => set('nome', e.target.value)} placeholder="Seu nome completo" /></div>
          <div><label style={fldLabel}>CARGO</label><input style={inp} value={form.cargo} onChange={e => set('cargo', e.target.value)} placeholder="Ex.: Gerente Comercial" /></div>
          <div><label style={fldLabel}>E-MAIL</label><input type="email" style={inp} value={form.email} onChange={e => set('email', e.target.value)} placeholder="seu@email.com" /></div>
          <div><label style={fldLabel}>TELEFONE</label><input style={inp} value={form.telefone} onChange={e => set('telefone', e.target.value)} placeholder="(00) 00000-0000" /></div>
        </div>
        <button onClick={() => setSenha(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-body)', background: 'transparent', border: '1px solid var(--border2)', color: 'var(--text2)' }}>
          <Lock size={13} /> Alterar senha
        </button>
      </div>

      {/* Notificações */}
      <div style={{ marginBottom: 24 }}>
        <span style={secLabel}>Preferências de notificação</span>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {NOTIF_ITEMS.map(n => (
            <label key={n.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', padding: '2px 0' }}>
              <span style={{ fontSize: 13, color: 'var(--text)' }}>{n.label}</span>
              <Toggle checked={!!form.notif[n.key]} onChange={v => setNotif(n.key, v)} />
            </label>
          ))}
        </div>
      </div>

      {/* Tema */}
      <div style={{ marginBottom: 28 }}>
        <span style={secLabel}>Aparência</span>
        <div style={{ display: 'flex', gap: 10 }}>
          {[['dark', 'Escuro', Moon], ['light', 'Claro', Sun], ['auto', 'Automático', Monitor]].map(([v, lbl, Icon]) => (
            <button key={v} onClick={() => set('tema', v)}
              style={{ flex: 1, padding: '14px 12px', borderRadius: 10, fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-body)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7, transition: 'all .12s', background: form.tema === v ? 'color-mix(in srgb, var(--accent) 12%, var(--bg3))' : 'var(--bg3)', border: `1px solid ${form.tema === v ? 'var(--accent)' : 'var(--border)'}`, color: form.tema === v ? 'var(--accent2)' : 'var(--text3)' }}>
              <Icon size={18} />
              {lbl}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button onClick={save} style={{ background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 22px', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
          Salvar alterações
        </button>
      </div>
    </div>
  );
}

/* ─── Plano & Financeiro — data ─────────────────────────────────────────────── */
const PLANOS = [
  { id: 'start',  nome: 'Start',  preco: 'R$ 0',   periodo: 'Grátis', cor: '--text2',
    recursos: ['1 usuário', '100 ações de IA/mês', 'CRM básico', 'Dashboard'] },
  { id: 'pro',    nome: 'Pro',    preco: 'R$ 97',  periodo: '/mês',   cor: '--accent', destaque: true,
    recursos: ['3 usuários', '500 ações de IA/mês', 'Todos os módulos', 'Prospecção ativa', 'Relatórios avançados'] },
  { id: 'equipe', nome: 'Equipe', preco: 'R$ 197', periodo: '/mês',   cor: '--purple',
    recursos: ['10 usuários', '2.000 ações de IA/mês', 'Todos os módulos', 'API access', 'Suporte prioritário', 'White-label'] },
];
const FATURAS = [
  { id: 'f1', data: '15/05/2026', desc: 'Plano Pro — Maio 2026',      valor: 'R$ 97,00', status: 'pago' },
  { id: 'f2', data: '15/04/2026', desc: 'Plano Pro — Abril 2026',     valor: 'R$ 97,00', status: 'pago' },
  { id: 'f3', data: '15/03/2026', desc: 'Plano Pro — Março 2026',     valor: 'R$ 97,00', status: 'pago' },
  { id: 'f4', data: '15/02/2026', desc: 'Plano Pro — Fevereiro 2026', valor: 'R$ 97,00', status: 'pago' },
];
const AI_USADO = 159;
const AI_TOTAL = 500;
const AI_MODULOS = [
  { modulo: 'Dashboard',   acoes: 12 }, { modulo: 'CRM',        acoes: 47 },
  { modulo: 'Prospecção',  acoes: 31 }, { modulo: 'Régua',      acoes: 18 },
  { modulo: 'KPIs',        acoes:  9 }, { modulo: 'Diagnóstico',acoes: 14 },
  { modulo: 'Diretório',   acoes:  6 }, { modulo: 'Redes',      acoes: 22 },
];
const CREDITOS_EXTRAS = [
  { acoes:  200, preco: 'R$ 19' },
  { acoes:  600, preco: 'R$ 49' },
  { acoes: 1500, preco: 'R$ 99' },
];

/* ─── Upgrade Modal ──────────────────────────────────────────────────────────── */
function UpgradeModal({ planoAtual, onClose }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
      <div style={{ background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: 14, width: 680, maxWidth: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px 16px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--text)' }}>Escolher plano</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', padding: 4 }}><XIcon size={16} /></button>
        </div>
        <div style={{ padding: 24, display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }}>
          {PLANOS.map(p => {
            const isAtual = p.id === planoAtual;
            return (
              <div key={p.id} style={{ background: p.destaque ? 'color-mix(in srgb, var(--accent) 8%, var(--bg3))' : 'var(--bg3)', border: `1px solid ${isAtual ? 'var(--green)' : p.destaque ? 'var(--accent)' : 'var(--border)'}`, borderRadius: 12, padding: 20, display: 'flex', flexDirection: 'column' }}>
                {p.destaque && <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--accent)', background: 'rgba(91,110,245,0.12)', padding: '2px 8px', borderRadius: 20, alignSelf: 'flex-start', marginBottom: 10 }}>MAIS POPULAR</span>}
                <div style={{ fontSize: 15, fontWeight: 600, color: `var(${p.cor})`, marginBottom: 3 }}>{p.nome}</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--font-display)', lineHeight: 1 }}>{p.preco}</div>
                <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 16 }}>{p.periodo}</div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 18 }}>
                  {p.recursos.map(r => (
                    <div key={r} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text2)' }}>
                      <Check size={11} style={{ color: 'var(--green)', flexShrink: 0 }} /> {r}
                    </div>
                  ))}
                </div>
                {isAtual
                  ? <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--green)', padding: 8, borderRadius: 8, background: 'rgba(45,212,160,0.1)', border: '1px solid rgba(45,212,160,0.2)' }}>Plano atual</div>
                  : <button style={{ background: p.destaque ? 'var(--accent)' : 'transparent', color: p.destaque ? '#fff' : `var(${p.cor})`, border: `1px solid var(${p.cor})`, borderRadius: 8, padding: 8, fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>Selecionar</button>
                }
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ─── Cancelar Modal ─────────────────────────────────────────────────────────── */
function CancelarModal({ onClose }) {
  const [step, setStep]     = useState(1);
  const [confirm, setConfirm] = useState('');
  const canConfirm = confirm === 'CANCELAR';
  const inp = { background: 'var(--bg4)', border: `1px solid ${canConfirm ? 'rgba(240,92,92,0.6)' : 'var(--border)'}`, borderRadius: 8, padding: '8px 12px', fontSize: 13, color: 'var(--text)', fontFamily: 'var(--font-body)', width: '100%', boxSizing: 'border-box', outline: 'none', marginBottom: 16 };
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
      <div style={{ background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: 14, width: 440, maxWidth: '100%', padding: 28 }}>
        {step === 1 ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <AlertTriangle size={17} style={{ color: 'var(--amber)' }} />
              <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--text)' }}>Cancelar plano</div>
            </div>
            <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 14, lineHeight: 1.6 }}>
              Antes de cancelar, recomendamos exportar seus dados. Ao cancelar você perderá acesso a:
            </div>
            <div style={{ background: 'var(--bg3)', borderRadius: 8, padding: '12px 14px', marginBottom: 20 }}>
              {['Todos os leads e pipeline do CRM', 'Histórico de prospecções e contatos', 'KPIs, metas e relatórios', 'Fluxos da régua de comunicação'].map(item => (
                <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text2)', marginBottom: 5 }}>
                  <XIcon size={11} style={{ color: 'var(--red)', flexShrink: 0 }} /> {item}
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={onClose} style={{ flex: 1, padding: 8, borderRadius: 8, fontSize: 13, cursor: 'pointer', fontFamily: 'var(--font-body)', background: 'transparent', border: '1px solid var(--border2)', color: 'var(--text2)' }}>Manter plano</button>
              <button style={{ padding: '8px 14px', borderRadius: 8, fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font-body)', background: 'transparent', border: '1px solid var(--accent)', color: 'var(--accent)' }}>Exportar dados</button>
              <button onClick={() => setStep(2)} style={{ padding: '8px 14px', borderRadius: 8, fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font-body)', background: 'rgba(240,92,92,0.1)', border: '1px solid rgba(240,92,92,0.4)', color: 'var(--red)' }}>Continuar</button>
            </div>
          </>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <AlertTriangle size={17} style={{ color: 'var(--red)' }} />
              <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--text)' }}>Confirmar cancelamento</div>
            </div>
            <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 14, lineHeight: 1.6 }}>
              Digite <strong style={{ color: 'var(--text)' }}>CANCELAR</strong> abaixo para confirmar o encerramento do seu plano.
            </div>
            <input style={inp} value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Digite CANCELAR aqui..." />
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setStep(1)} style={{ flex: 1, padding: 8, borderRadius: 8, fontSize: 13, cursor: 'pointer', fontFamily: 'var(--font-body)', background: 'transparent', border: '1px solid var(--border2)', color: 'var(--text2)' }}>Voltar</button>
              <button onClick={() => canConfirm && onClose(true)}
                style={{ padding: '8px 18px', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: canConfirm ? 'pointer' : 'default', fontFamily: 'var(--font-body)', background: canConfirm ? 'var(--red)' : 'var(--bg4)', border: 'none', color: canConfirm ? '#fff' : 'var(--text3)', transition: 'background .15s' }}>
                Cancelar plano
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ─── Plano Tab ──────────────────────────────────────────────────────────────── */
function PlanoTab() {
  const [toast,   setToast]   = useState(null);
  const [upgrade, setUpgrade] = useState(false);
  const [cancelar, setCancelar] = useState(false);
  const plano = PLANOS.find(p => p.id === 'pro');

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(null), 3000); }

  const secLabel = { fontSize: 12, fontWeight: 500, color: 'var(--text2)', marginBottom: 14, paddingBottom: 6, borderBottom: '1px solid var(--border)', display: 'block' };

  return (
    <div>
      {toast && <Toast msg={toast} />}
      {upgrade  && <UpgradeModal planoAtual="pro" onClose={() => setUpgrade(false)} />}
      {cancelar && <CancelarModal onClose={(done) => { setCancelar(false); if (done) showToast('Plano cancelado. Você receberá um e-mail de confirmação.'); }} />}

      {/* Plano atual */}
      <div style={{ marginBottom: 24 }}>
        <span style={secLabel}>Plano atual</span>
        <div style={{ background: 'var(--bg3)', border: '1px solid var(--accent)', borderRadius: 14, padding: '20px 24px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 20 }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span style={{ fontSize: 18, fontWeight: 600, color: 'var(--text)', fontFamily: 'var(--font-display)' }}>Plano {plano.nome}</span>
              <span style={{ padding: '2px 9px', borderRadius: 20, fontSize: 11, background: 'rgba(45,212,160,0.12)', color: 'var(--green)' }}>Ativo</span>
            </div>
            <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 14 }}>
              {plano.preco}{plano.periodo} · Próxima renovação: <strong style={{ color: 'var(--text)' }}>15/06/2026</strong>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {plano.recursos.map(r => (
                <span key={r} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 9px', borderRadius: 20, fontSize: 11, background: 'rgba(45,212,160,0.1)', color: 'var(--green)' }}>
                  <Check size={10} /> {r}
                </span>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }}>
            <button onClick={() => setUpgrade(true)} style={{ background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>Fazer upgrade</button>
            <button onClick={() => setCancelar(true)}
              style={{ background: 'transparent', color: 'var(--text3)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 16px', fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font-body)', transition: 'all .15s' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(240,92,92,0.4)'; e.currentTarget.style.color = 'var(--red)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text3)'; }}>
              Cancelar plano
            </button>
          </div>
        </div>
      </div>

      {/* Pagamento */}
      <div style={{ marginBottom: 24 }}>
        <span style={secLabel}>Forma de pagamento</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 20px' }}>
          <div style={{ width: 48, height: 32, borderRadius: 6, background: 'linear-gradient(135deg, var(--accent), var(--purple))', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <CreditCard size={16} style={{ color: '#fff' }} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>Mastercard •••• 4242</div>
            <div style={{ fontSize: 11, color: 'var(--text3)' }}>Expira em 09/2027</div>
          </div>
          <button style={{ padding: '7px 14px', borderRadius: 8, fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font-body)', background: 'transparent', border: '1px solid var(--border2)', color: 'var(--text2)' }}>Atualizar</button>
        </div>
      </div>

      {/* Faturas */}
      <div>
        <span style={secLabel}>Histórico de faturas</span>
        <div style={{ border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--bg3)' }}>
                {['Data', 'Descrição', 'Valor', 'Status', ''].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: h === '' ? 'center' : 'left', fontSize: 11, color: 'var(--text3)', fontWeight: 500, borderBottom: '1px solid var(--border)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {FATURAS.map((f, i) => (
                <tr key={f.id} style={{ background: i % 2 !== 0 ? 'rgba(30,32,40,0.3)' : 'transparent' }}>
                  <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--text2)', borderBottom: '1px solid var(--border)' }}>{f.data}</td>
                  <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--text)',  borderBottom: '1px solid var(--border)' }}>{f.desc}</td>
                  <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--text)', fontWeight: 500, borderBottom: '1px solid var(--border)' }}>{f.valor}</td>
                  <td style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)' }}>
                    <span style={{ padding: '2px 9px', borderRadius: 20, fontSize: 11, background: f.status === 'pago' ? 'rgba(45,212,160,0.12)' : 'rgba(240,168,50,0.12)', color: f.status === 'pago' ? 'var(--green)' : 'var(--amber)' }}>
                      {f.status === 'pago' ? 'Pago' : 'Pendente'}
                    </span>
                  </td>
                  <td style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', textAlign: 'center' }}>
                    <button
                      onClick={() => showToast(`Download: fatura_${f.id}.pdf simulado`)}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 6, fontSize: 11, cursor: 'pointer', fontFamily: 'var(--font-body)', background: 'transparent', border: '1px solid var(--border)', color: 'var(--text3)', transition: 'all .12s' }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)'; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text3)'; }}>
                      <Download size={11} /> PDF
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ─── Uso de IA Tab ──────────────────────────────────────────────────────────── */
function UsoIATab() {
  const [toast, setToast] = useState(null);
  const pct      = Math.round((AI_USADO / AI_TOTAL) * 100);
  const barColor = pct > 90 ? 'var(--red)' : pct > 70 ? 'var(--amber)' : 'var(--green)';

  const defaultIA = { tom: 'direto', contexto: '', idioma: 'Português BR' };
  const [cfg, setCfg] = useState(() => {
    try { return { ...defaultIA, ...JSON.parse(localStorage.getItem('cfg_ia') || '{}') }; }
    catch { return defaultIA; }
  });
  const setF = (k, v) => setCfg(c => ({ ...c, [k]: v }));

  function saveCfg() {
    localStorage.setItem('cfg_ia', JSON.stringify(cfg));
    setToast('Configurações do assistente salvas!');
    setTimeout(() => setToast(null), 3000);
  }
  function comprar(pkg) {
    setToast(`+${pkg.acoes.toLocaleString('pt-BR')} ações adicionadas! Pagamento de ${pkg.preco} processado.`);
    setTimeout(() => setToast(null), 3000);
  }

  const inp      = { background: 'var(--bg4)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: 'var(--text)', fontFamily: 'var(--font-body)', width: '100%', boxSizing: 'border-box', outline: 'none' };
  const secLabel = { fontSize: 12, fontWeight: 500, color: 'var(--text2)', marginBottom: 14, paddingBottom: 6, borderBottom: '1px solid var(--border)', display: 'block' };

  return (
    <div>
      {toast && <Toast msg={toast} />}

      {/* Créditos */}
      <div style={{ marginBottom: 24 }}>
        <span style={secLabel}>Créditos do mês</span>
        <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 12, padding: '20px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, marginBottom: 14 }}>
            <div style={{ fontSize: 44, fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--font-display)', lineHeight: 1 }}>{AI_USADO.toLocaleString('pt-BR')}</div>
            <div style={{ fontSize: 14, color: 'var(--text3)', marginBottom: 5 }}>de {AI_TOTAL.toLocaleString('pt-BR')} ações usadas</div>
          </div>
          <div style={{ height: 10, borderRadius: 10, background: 'var(--bg4)', overflow: 'hidden', marginBottom: 8 }}>
            <div style={{ width: `${pct}%`, height: '100%', background: barColor, borderRadius: 10, transition: 'width .5s' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
            <span style={{ color: barColor, fontWeight: 500 }}>{pct}% utilizado</span>
            <span style={{ color: 'var(--text3)' }}>Reset em 01/06/2026</span>
          </div>
          {pct > 80 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 12, padding: '9px 13px', borderRadius: 8, background: pct > 90 ? 'rgba(240,92,92,0.1)' : 'rgba(240,168,50,0.1)', border: `1px solid ${pct > 90 ? 'rgba(240,92,92,0.3)' : 'rgba(240,168,50,0.3)'}` }}>
              <AlertTriangle size={13} style={{ color: pct > 90 ? 'var(--red)' : 'var(--amber)', flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: pct > 90 ? 'var(--red)' : 'var(--amber)' }}>
                {pct > 90 ? 'Créditos quase esgotados! Compre extras ou faça upgrade do plano.' : 'Você já consumiu mais de 80% dos créditos do mês.'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Uso por módulo */}
      <div style={{ marginBottom: 24 }}>
        <span style={secLabel}>Uso por módulo</span>
        <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 20px' }}>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={AI_MODULOS} margin={{ top: 4, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="modulo" tick={{ fill: 'var(--text3)', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--text3)', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 12 }} cursor={{ fill: 'rgba(91,110,245,0.08)' }} />
              <Bar dataKey="acoes" name="Ações" fill="var(--accent)" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Comprar créditos */}
      <div style={{ marginBottom: 24 }}>
        <span style={secLabel}>Comprar créditos extras</span>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>
          {CREDITOS_EXTRAS.map(pkg => (
            <div key={pkg.acoes} style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 12, padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <Zap size={15} style={{ color: 'var(--amber)' }} />
                <span style={{ fontSize: 24, fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--font-display)' }}>+{pkg.acoes.toLocaleString('pt-BR')}</span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 12 }}>ações de IA</div>
              <div style={{ fontSize: 22, fontWeight: 600, color: 'var(--text)', fontFamily: 'var(--font-display)', marginBottom: 16 }}>{pkg.preco}</div>
              <button onClick={() => comprar(pkg)} style={{ width: '100%', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, padding: '9px', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
                Comprar
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Configurações do assistente */}
      <div>
        <span style={secLabel}>Configurações do assistente</span>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* Tom */}
          <div>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 10 }}>TOM DE RESPOSTA</div>
            <div style={{ display: 'flex', gap: 10 }}>
              {[['formal','Formal'],['direto','Direto'],['didatico','Didático']].map(([v, lbl]) => (
                <label key={v} style={{ display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer', background: cfg.tom === v ? 'color-mix(in srgb, var(--accent) 10%, var(--bg3))' : 'var(--bg3)', border: `1px solid ${cfg.tom === v ? 'var(--accent)' : 'var(--border)'}`, borderRadius: 8, padding: '8px 16px', transition: 'all .12s', flex: 1, justifyContent: 'center' }}>
                  <input type="radio" name="tom_ia" value={v} checked={cfg.tom === v} onChange={() => setF('tom', v)} style={{ accentColor: 'var(--accent)', width: 13, height: 13 }} />
                  <span style={{ fontSize: 12, color: cfg.tom === v ? 'var(--text)' : 'var(--text2)', fontWeight: cfg.tom === v ? 500 : 400 }}>{lbl}</span>
                </label>
              ))}
            </div>
          </div>
          {/* Contexto */}
          <div>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4 }}>CONTEXTO FIXO DA EMPRESA</div>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 8 }}>Injetado automaticamente em todo system prompt do assistente de IA.</div>
            <textarea style={{ ...inp, minHeight: 90, resize: 'vertical' }} value={cfg.contexto} onChange={e => setF('contexto', e.target.value)} placeholder="Ex.: Somos uma consultoria B2B especializada em estruturar departamentos comerciais para PMEs..." />
          </div>
          {/* Idioma */}
          <div>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 5 }}>IDIOMA DAS RESPOSTAS</div>
            <select style={{ ...inp, cursor: 'pointer', maxWidth: 220 }} value={cfg.idioma} onChange={e => setF('idioma', e.target.value)}>
              <option value="Português BR">Português BR</option>
              <option value="English">English</option>
              <option value="Español">Español</option>
            </select>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button onClick={saveCfg} style={{ background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 22px', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
              Salvar configurações
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Integrações ───────────────────────────────────────────────────────────── */
const INTEGRACOES = [
  {
    categoria: 'Email Marketing',
    items: [
      { id: 'resend',     nome: 'Resend',      desc: 'Gratuito até 3.000 emails/mês',   cor: '#000000', letra: 'R', docs: 'https://resend.com/docs' },
      { id: 'mailchimp',  nome: 'Mailchimp',   desc: 'Gratuito até 1.000 emails/mês',   cor: '#FFE01B', letra: 'M', docs: 'https://mailchimp.com/developer/' },
      { id: 'rdstation',  nome: 'RD Station',  desc: 'Automação de marketing para PMEs', cor: '#00A3FF', letra: 'RD', docs: 'https://developers.rdstation.com/' },
    ],
  },
  {
    categoria: 'Prospecção',
    items: [
      { id: 'hunter',  nome: 'Hunter.io',  desc: 'Busca e verificação de emails',        cor: '#F87C31', letra: 'H', docs: 'https://hunter.io/api-documentation/v2' },
      { id: 'apollo',  nome: 'Apollo.io',  desc: 'Enriquecimento completo de contatos',  cor: '#3B5EE5', letra: 'A', docs: 'https://apolloio.github.io/apollo-api-docs/' },
    ],
  },
  {
    categoria: 'Redes Sociais',
    items: [
      { id: 'instagram', nome: 'Instagram',  desc: 'Métricas e publicação de conteúdo',   cor: '#E1306C', letra: 'IG', docs: 'https://developers.facebook.com/docs/instagram-api' },
      { id: 'facebook',  nome: 'Facebook',   desc: 'Páginas e anúncios',                  cor: '#1877F2', letra: 'FB', docs: 'https://developers.facebook.com/docs' },
      { id: 'linkedin',  nome: 'LinkedIn',   desc: 'Company pages e lead gen',            cor: '#0A66C2', letra: 'LI', docs: 'https://learn.microsoft.com/en-us/linkedin/' },
      { id: 'youtube',   nome: 'YouTube',    desc: 'Analytics de canal e vídeos',         cor: '#FF0000', letra: 'YT', docs: 'https://developers.google.com/youtube/v3' },
      { id: 'tiktok',    nome: 'TikTok',     desc: 'Business API e métricas',             cor: '#010101', letra: 'TK', docs: 'https://developers.tiktok.com/' },
    ],
  },
  {
    categoria: 'Financeiro',
    items: [
      { id: 'stripe',    nome: 'Stripe',     desc: 'Pagamentos internacionais',           cor: '#635BFF', letra: 'S', docs: 'https://stripe.com/docs/api' },
      { id: 'pagseguro', nome: 'PagSeguro',  desc: 'Pagamentos no Brasil',                cor: '#00B140', letra: 'PS', docs: 'https://dev.pagbank.uol.com.br/' },
      { id: 'asaas',     nome: 'Asaas',      desc: 'Cobranças e gestão financeira',       cor: '#FF6B00', letra: 'AS', docs: 'https://docs.asaas.com/' },
    ],
  },
  {
    categoria: 'Comunicação',
    items: [
      { id: 'whatsapp', nome: 'WhatsApp Business API', desc: 'Mensagens em escala via Meta', cor: '#25D366', letra: 'WA', docs: 'https://developers.facebook.com/docs/whatsapp' },
    ],
  },
  {
    categoria: 'Calendário',
    items: [
      { id: 'gcal',    nome: 'Google Calendar',  desc: 'Sincronize eventos e reuniões',   cor: '#4285F4', letra: 'GC', docs: 'https://developers.google.com/calendar' },
      { id: 'outlook', nome: 'Outlook Calendar', desc: 'Integração com Microsoft 365',    cor: '#0078D4', letra: 'OL', docs: 'https://learn.microsoft.com/en-us/graph/outlook-calendar-concept-overview' },
    ],
  },
];

const LS_INTEGRACOES = 'cfg_integracoes';

function ApiKeyModal({ integracao, onSave, onClose }) {
  const [key, setKey] = useState('');
  const [show, setShow] = useState(false);

  function handleSave() {
    if (!key.trim()) return;
    onSave(integracao.id, key.trim());
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
    }}>
      <div style={{
        background: 'var(--bg2)', border: '1px solid var(--border2)',
        borderRadius: 14, padding: 28, width: 440, maxWidth: '90vw',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 8, background: integracao.cor,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 700, color: '#fff', letterSpacing: '-0.3px',
            }}>
              {integracao.letra}
            </div>
            <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>
              Conectar {integracao.nome}
            </span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)' }}>
            <XIcon size={18} />
          </button>
        </div>

        <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 20, lineHeight: 1.5 }}>
          Insira sua API Key para conectar o {integracao.nome} ao CRM.{' '}
          <a href={integracao.docs} target="_blank" rel="noopener noreferrer"
            style={{ color: 'var(--accent2)', textDecoration: 'none' }}>
            Ver documentação →
          </a>
        </p>

        <label style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 6, display: 'block' }}>
          API Key
        </label>
        <div style={{ position: 'relative', marginBottom: 24 }}>
          <input
            type={show ? 'text' : 'password'}
            value={key}
            onChange={e => setKey(e.target.value)}
            placeholder="Cole sua API Key aqui"
            onKeyDown={e => e.key === 'Enter' && handleSave()}
            style={{
              width: '100%', boxSizing: 'border-box',
              background: 'var(--bg4)', border: '1px solid var(--border)',
              borderRadius: 8, padding: '9px 40px 9px 12px',
              color: 'var(--text)', fontSize: 13,
              fontFamily: 'monospace', outline: 'none',
            }}
          />
          <button
            type="button"
            onClick={() => setShow(s => !s)}
            style={{
              position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)',
              padding: 0, display: 'flex',
            }}
          >
            {show ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{
            background: 'transparent', border: '1px solid var(--border2)',
            borderRadius: 8, padding: '8px 18px', fontSize: 13,
            color: 'var(--text2)', cursor: 'pointer',
          }}>
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={!key.trim()}
            style={{
              background: key.trim() ? 'var(--accent)' : 'var(--bg4)',
              border: 'none', borderRadius: 8, padding: '8px 18px',
              fontSize: 13, color: key.trim() ? '#fff' : 'var(--text3)',
              cursor: key.trim() ? 'pointer' : 'default',
              fontWeight: 500,
            }}
          >
            Salvar e conectar
          </button>
        </div>
      </div>
    </div>
  );
}

function IntegCard({ item, conn, onConnect, onDisconnect }) {
  const conectado = !!conn;

  function mascarar(key) {
    if (!key || key.length <= 8) return '••••••••••••••••';
    return key.slice(0, 4) + '••••••••••••' + key.slice(-4);
  }

  return (
    <div style={{
      background: 'var(--bg3)', border: `1px solid ${conectado ? 'rgba(45,212,160,0.25)' : 'var(--border)'}`,
      borderRadius: 10, padding: '16px 18px',
      display: 'flex', alignItems: 'center', gap: 14,
    }}>
      {/* Ícone */}
      <div style={{
        width: 42, height: 42, borderRadius: 10, background: item.cor,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 12, fontWeight: 700, color: '#fff', letterSpacing: '-0.3px',
        flexShrink: 0,
      }}>
        {item.letra}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{item.nome}</span>
          <span style={{
            fontSize: 11, padding: '1px 8px', borderRadius: 20, fontWeight: 500,
            background: conectado ? 'rgba(45,212,160,0.12)' : 'var(--bg4)',
            color: conectado ? 'var(--green)' : 'var(--text3)',
            border: `1px solid ${conectado ? 'rgba(45,212,160,0.25)' : 'var(--border)'}`,
          }}>
            {conectado ? 'Conectado' : 'Não conectado'}
          </span>
        </div>
        <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: conectado ? 4 : 0 }}>
          {item.desc}
        </div>
        {conectado && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4 }}>
            <span style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'monospace' }}>
              {mascarar(conn.key)}
            </span>
            <span style={{ fontSize: 11, color: 'var(--text3)' }}>
              Conectado em {conn.data}
            </span>
          </div>
        )}
      </div>

      {/* Ações */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <a
          href={item.docs}
          target="_blank"
          rel="noopener noreferrer"
          style={{ fontSize: 12, color: 'var(--accent2)', textDecoration: 'none', whiteSpace: 'nowrap' }}
        >
          Ver docs
        </a>
        {conectado ? (
          <button
            onClick={() => onDisconnect(item.id)}
            style={{
              background: 'transparent', border: '1px solid rgba(240,92,92,0.35)',
              borderRadius: 8, padding: '6px 14px', fontSize: 12,
              color: 'var(--red)', cursor: 'pointer', whiteSpace: 'nowrap',
            }}
          >
            Desconectar
          </button>
        ) : (
          <button
            onClick={() => onConnect(item)}
            style={{
              background: 'var(--accent)', border: 'none',
              borderRadius: 8, padding: '6px 14px', fontSize: 12,
              color: '#fff', cursor: 'pointer', whiteSpace: 'nowrap', fontWeight: 500,
            }}
          >
            Conectar
          </button>
        )}
      </div>
    </div>
  );
}

function IntegracoesTab() {
  const [conns, setConns] = useState(() => {
    try { return JSON.parse(localStorage.getItem(LS_INTEGRACOES) || '{}'); }
    catch { return {}; }
  });
  const [modal, setModal] = useState(null); // item object or null

  function saveConns(next) {
    setConns(next);
    localStorage.setItem(LS_INTEGRACOES, JSON.stringify(next));
  }

  function handleConnect(item) {
    setModal(item);
  }

  function handleSaveKey(id, key) {
    const now = new Date().toLocaleDateString('pt-BR');
    saveConns({ ...conns, [id]: { key, data: now } });
    setModal(null);
  }

  function handleDisconnect(id) {
    const next = { ...conns };
    delete next[id];
    saveConns(next);
  }

  const secLabel = { fontSize: 11, fontWeight: 600, color: 'var(--text3)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 10 };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      {/* Aviso */}
      <div style={{
        display: 'flex', alignItems: 'flex-start', gap: 10,
        background: 'rgba(91,110,245,0.08)', border: '1px solid rgba(91,110,245,0.2)',
        borderRadius: 10, padding: '12px 16px',
      }}>
        <Lock size={15} style={{ color: 'var(--accent2)', marginTop: 1, flexShrink: 0 }} />
        <p style={{ fontSize: 13, color: 'var(--text2)', margin: 0, lineHeight: 1.5 }}>
          Suas API Keys são salvas localmente e nunca compartilhadas com terceiros.
        </p>
      </div>

      {/* Categorias */}
      {INTEGRACOES.map(cat => (
        <div key={cat.categoria}>
          <div style={secLabel}>{cat.categoria}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {cat.items.map(item => (
              <IntegCard
                key={item.id}
                item={item}
                conn={conns[item.id] || null}
                onConnect={handleConnect}
                onDisconnect={handleDisconnect}
              />
            ))}
          </div>
        </div>
      ))}

      {modal && (
        <ApiKeyModal
          integracao={modal}
          onSave={handleSaveKey}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}

/* ─── Notificações ──────────────────────────────────────────────────────────── */
const LS_NOTIF_PREFS = 'cfg_notif_prefs';

const NOTIF_EVENTOS = [
  { id: 'followup',    label: 'Follow-up vencido',                    configuravel: false },
  { id: 'sem_contato', label: 'Lead sem contato há X dias',           configuravel: true  },
  { id: 'meta',        label: 'Meta atingida',                        configuravel: false },
  { id: 'relatorio',   label: 'Relatório mensal disponível',          configuravel: false },
  { id: 'ticket',      label: 'Ticket novo',                          configuravel: false },
  { id: 'nps',         label: 'NPS vencido',                          configuravel: false },
  { id: 'ia_limite',   label: 'Limite de IA próximo (80%)',           configuravel: false },
  { id: 'novo_user',   label: 'Novo usuário na conta',                configuravel: false },
];

function NotificacoesTab() {
  const [prefs, setPrefs] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(LS_NOTIF_PREFS) || 'null');
      if (saved) return saved;
    } catch {}
    const defaults = {};
    NOTIF_EVENTOS.forEach(e => {
      defaults[e.id] = { app: true, email: false };
    });
    return {
      eventos: defaults,
      diasSemContato: 7,
      silencioAtivo: false,
      silencioInicio: '22:00',
      silencioFim: '08:00',
    };
  });
  const [toast, setToast] = useState(false);

  function setEvento(id, canal, val) {
    setPrefs(p => ({ ...p, eventos: { ...p.eventos, [id]: { ...p.eventos[id], [canal]: val } } }));
  }

  function save() {
    localStorage.setItem(LS_NOTIF_PREFS, JSON.stringify(prefs));
    setToast(true);
    setTimeout(() => setToast(false), 3000);
  }

  const secLabel = { fontSize: 11, fontWeight: 600, color: 'var(--text3)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 12 };
  const inp = { background: 'var(--bg4)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 10px', color: 'var(--text)', fontSize: 13, outline: 'none', fontFamily: 'var(--font-body)' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      {toast && (
        <div style={{
          position: 'fixed', top: 20, right: 20, zIndex: 9999,
          background: 'var(--bg2)', border: '1px solid var(--green)',
          borderRadius: 10, padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 10,
          boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
        }}>
          <Check size={15} style={{ color: 'var(--green)' }} />
          <span style={{ fontSize: 13, color: 'var(--text)' }}>Preferências salvas!</span>
        </div>
      )}

      {/* Tabela de eventos */}
      <div>
        <div style={secLabel}>Eventos e canais</div>
        <div style={{ border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
          {/* Header */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 80px 80px',
            background: 'var(--bg3)', padding: '10px 16px',
            borderBottom: '1px solid var(--border)',
          }}>
            <span style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Evento</span>
            <span style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center' }}>App</span>
            <span style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center' }}>Email</span>
          </div>
          {NOTIF_EVENTOS.map((ev, i) => (
            <div
              key={ev.id}
              style={{
                display: 'grid', gridTemplateColumns: '1fr 80px 80px',
                padding: '11px 16px', alignItems: 'center',
                background: i % 2 === 0 ? 'var(--bg2)' : 'var(--bg3)',
                borderBottom: i < NOTIF_EVENTOS.length - 1 ? '1px solid var(--border)' : 'none',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 13, color: 'var(--text)' }}>{ev.label}</span>
                {ev.configuravel && (
                  <input
                    type="number"
                    min={1}
                    max={365}
                    value={prefs.diasSemContato}
                    onChange={e => setPrefs(p => ({ ...p, diasSemContato: Math.max(1, parseInt(e.target.value) || 1) }))}
                    style={{ ...inp, width: 52, padding: '4px 8px', fontSize: 12 }}
                  />
                )}
              </div>
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <Toggle
                  checked={prefs.eventos[ev.id]?.app ?? true}
                  onChange={v => setEvento(ev.id, 'app', v)}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <Toggle
                  checked={prefs.eventos[ev.id]?.email ?? false}
                  onChange={v => setEvento(ev.id, 'email', v)}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Horário de silêncio */}
      <div>
        <div style={secLabel}>Horário de silêncio</div>
        <div style={{
          background: 'var(--bg3)', border: '1px solid var(--border)',
          borderRadius: 10, padding: '16px 18px',
          display: 'flex', flexDirection: 'column', gap: 14,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 13, color: 'var(--text)', fontWeight: 500 }}>Ativar horário de silêncio</div>
              <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>
                Não receber notificações no período configurado
              </div>
            </div>
            <Toggle checked={prefs.silencioAtivo} onChange={v => setPrefs(p => ({ ...p, silencioAtivo: v }))} />
          </div>
          {prefs.silencioAtivo && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingTop: 4, borderTop: '1px solid var(--border)' }}>
              <span style={{ fontSize: 12, color: 'var(--text2)' }}>Das</span>
              <input
                type="time"
                value={prefs.silencioInicio}
                onChange={e => setPrefs(p => ({ ...p, silencioInicio: e.target.value }))}
                style={{ ...inp, width: 110 }}
              />
              <span style={{ fontSize: 12, color: 'var(--text2)' }}>até</span>
              <input
                type="time"
                value={prefs.silencioFim}
                onChange={e => setPrefs(p => ({ ...p, silencioFim: e.target.value }))}
                style={{ ...inp, width: 110 }}
              />
              <span style={{ fontSize: 12, color: 'var(--text3)' }}>
                (ex.: silêncio das {prefs.silencioInicio} às {prefs.silencioFim})
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Salvar */}
      <div>
        <button
          onClick={save}
          style={{
            background: 'var(--accent)', border: 'none', borderRadius: 8,
            padding: '9px 22px', fontSize: 13, fontWeight: 500,
            color: '#fff', cursor: 'pointer',
          }}
        >
          Salvar preferências
        </button>
      </div>
    </div>
  );
}

/* ─── Dados & Privacidade ────────────────────────────────────────────────────── */
const LOGS_MOCK = [
  { data: '24/05/2026', hora: '14:32', usuario: 'Douglas Bradfield', acao: 'Login',                    ip: '187.112.45.12'  },
  { data: '24/05/2026', hora: '11:05', usuario: 'Douglas Bradfield', acao: 'Editou lead #482',         ip: '187.112.45.12'  },
  { data: '23/05/2026', hora: '18:20', usuario: 'Ana Lima',          acao: 'Login',                    ip: '200.201.55.88'  },
  { data: '23/05/2026', hora: '17:44', usuario: 'Ana Lima',          acao: 'Exportou relatório KPIs',  ip: '200.201.55.88'  },
  { data: '22/05/2026', hora: '09:11', usuario: 'Carlos Melo',       acao: 'Adicionou contato',        ip: '189.32.10.201'  },
  { data: '21/05/2026', hora: '16:58', usuario: 'Douglas Bradfield', acao: 'Alterou permissões',       ip: '187.112.45.12'  },
  { data: '20/05/2026', hora: '10:30', usuario: 'Ana Lima',          acao: 'Criou fluxo de régua',     ip: '200.201.55.88'  },
  { data: '19/05/2026', hora: '14:01', usuario: 'Carlos Melo',       acao: 'Login',                    ip: '189.32.10.201'  },
  { data: '18/05/2026', hora: '08:47', usuario: 'Douglas Bradfield', acao: 'Atualizou plano',          ip: '187.112.45.12'  },
  { data: '17/05/2026', hora: '19:22', usuario: 'Ana Lima',          acao: 'Excluiu lead #310',        ip: '200.201.55.88'  },
];

const HISTORICO_MOCK = [
  { data: '21/05/2026', usuario: 'Douglas Bradfield', desc: 'Alterou permissão do perfil "Vendedor" — módulo KPIs de Ver para Editar' },
  { data: '18/05/2026', usuario: 'Douglas Bradfield', desc: 'Plano alterado de Pro para Business' },
  { data: '15/05/2026', usuario: 'Douglas Bradfield', desc: 'Novo usuário adicionado: Carlos Melo (perfil Suporte)' },
  { data: '10/05/2026', usuario: 'Ana Lima',          desc: 'Alterou permissão do perfil "Gestor" — módulo Diretório de Ver para Exportar' },
  { data: '02/05/2026', usuario: 'Douglas Bradfield', desc: 'Novo usuário adicionado: Ana Lima (perfil Gestor)' },
];

function ExcluirContaModal({ onClose }) {
  const [step, setStep] = useState(1);
  const [confirm, setConfirm] = useState('');

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
    }}>
      <div style={{
        background: 'var(--bg2)', border: '1px solid var(--border2)',
        borderRadius: 14, padding: 28, width: 460, maxWidth: '90vw',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--red)' }}>
            {step === 1 ? 'Excluir conta' : 'Confirmação final'}
          </span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)' }}>
            <XIcon size={18} />
          </button>
        </div>

        {step === 1 && (
          <>
            <div style={{
              background: 'rgba(240,92,92,0.08)', border: '1px solid rgba(240,92,92,0.2)',
              borderRadius: 10, padding: '14px 16px', marginBottom: 18,
            }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <AlertTriangle size={16} style={{ color: 'var(--red)', flexShrink: 0, marginTop: 1 }} />
                <p style={{ fontSize: 13, color: 'var(--text2)', margin: 0, lineHeight: 1.6 }}>
                  Esta ação é <strong style={{ color: 'var(--red)' }}>permanente e irreversível</strong>. Todos os dados da sua conta serão apagados:
                </p>
              </div>
            </div>
            <ul style={{ paddingLeft: 20, margin: '0 0 20px', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {['Leads e pipeline CRM', 'KPIs e metas', 'Régua de comunicação e templates', 'Integrações configuradas', 'Histórico de atividades', 'Usuários e permissões'].map(item => (
                <li key={item} style={{ fontSize: 13, color: 'var(--text2)' }}>{item}</li>
              ))}
            </ul>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={onClose} style={{
                background: 'transparent', border: '1px solid var(--border2)',
                borderRadius: 8, padding: '8px 18px', fontSize: 13, color: 'var(--text2)', cursor: 'pointer',
              }}>
                Cancelar
              </button>
              <button style={{
                background: 'rgba(91,110,245,0.12)', border: '1px solid rgba(91,110,245,0.3)',
                borderRadius: 8, padding: '8px 18px', fontSize: 13, color: 'var(--accent2)', cursor: 'pointer',
              }}>
                <Download size={13} style={{ marginRight: 6, verticalAlign: 'middle' }} />
                Exportar dados antes
              </button>
              <button
                onClick={() => setStep(2)}
                style={{
                  background: 'rgba(240,92,92,0.15)', border: '1px solid rgba(240,92,92,0.3)',
                  borderRadius: 8, padding: '8px 18px', fontSize: 13, color: 'var(--red)', cursor: 'pointer', fontWeight: 500,
                }}
              >
                Continuar
              </button>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 18, lineHeight: 1.6 }}>
              Para confirmar a exclusão definitiva, digite <strong style={{ color: 'var(--text)', fontFamily: 'monospace' }}>CONFIRMAR</strong> abaixo:
            </p>
            <input
              type="text"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              placeholder="Digite CONFIRMAR"
              style={{
                width: '100%', boxSizing: 'border-box',
                background: 'var(--bg4)', border: `1px solid ${confirm === 'CONFIRMAR' ? 'rgba(240,92,92,0.5)' : 'var(--border)'}`,
                borderRadius: 8, padding: '9px 12px', color: 'var(--text)',
                fontSize: 13, outline: 'none', marginBottom: 20, fontFamily: 'monospace',
              }}
            />
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setStep(1)} style={{
                background: 'transparent', border: '1px solid var(--border2)',
                borderRadius: 8, padding: '8px 18px', fontSize: 13, color: 'var(--text2)', cursor: 'pointer',
              }}>
                Voltar
              </button>
              <button
                disabled={confirm !== 'CONFIRMAR'}
                style={{
                  background: confirm === 'CONFIRMAR' ? 'var(--red)' : 'var(--bg4)',
                  border: 'none', borderRadius: 8, padding: '8px 18px',
                  fontSize: 13, fontWeight: 500,
                  color: confirm === 'CONFIRMAR' ? '#fff' : 'var(--text3)',
                  cursor: confirm === 'CONFIRMAR' ? 'pointer' : 'default',
                }}
              >
                Excluir definitivamente
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function DadosPrivacidadeTab() {
  const [excluirModal, setExcluirModal] = useState(false);
  const [toast, setToast] = useState('');

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  }

  const secLabel = { fontSize: 11, fontWeight: 600, color: 'var(--text3)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 12 };

  const thStyle = { fontSize: 11, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '10px 14px', textAlign: 'left', background: 'var(--bg3)', borderBottom: '1px solid var(--border)' };
  const tdStyle = { fontSize: 12, color: 'var(--text2)', padding: '9px 14px', borderBottom: '1px solid var(--border)', verticalAlign: 'middle' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      {toast && (
        <div style={{
          position: 'fixed', top: 20, right: 20, zIndex: 9999,
          background: 'var(--bg2)', border: '1px solid var(--green)',
          borderRadius: 10, padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 10,
          boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
        }}>
          <Check size={15} style={{ color: 'var(--green)' }} />
          <span style={{ fontSize: 13, color: 'var(--text)' }}>{toast}</span>
        </div>
      )}

      {/* Exportar dados */}
      <div>
        <div style={secLabel}>Exportar dados</div>
        <div style={{
          background: 'var(--bg3)', border: '1px solid var(--border)',
          borderRadius: 10, padding: '16px 18px',
          display: 'flex', flexDirection: 'column', gap: 12,
        }}>
          <p style={{ fontSize: 13, color: 'var(--text2)', margin: 0, lineHeight: 1.5 }}>
            Faça o download de todos os seus dados da plataforma em formato aberto.
          </p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button
              onClick={() => showToast('Exportação JSON iniciada — o download começará em instantes.')}
              style={{
                background: 'var(--accent)', border: 'none', borderRadius: 8,
                padding: '8px 18px', fontSize: 13, fontWeight: 500,
                color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7,
              }}
            >
              <Download size={14} />
              Exportar tudo em JSON
            </button>
            <button
              onClick={() => showToast('Exportação CSV iniciada — o download começará em instantes.')}
              style={{
                background: 'transparent', border: '1px solid var(--border2)',
                borderRadius: 8, padding: '8px 18px', fontSize: 13,
                color: 'var(--text2)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7,
              }}
            >
              <Download size={14} />
              Exportar tudo em CSV
            </button>
          </div>
        </div>
      </div>

      {/* Logs de acesso */}
      <div>
        <div style={secLabel}>Logs de acesso (últimos 10)</div>
        <div style={{ border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={thStyle}>Data</th>
                <th style={thStyle}>Hora</th>
                <th style={thStyle}>Usuário</th>
                <th style={thStyle}>Ação</th>
                <th style={thStyle}>IP</th>
              </tr>
            </thead>
            <tbody>
              {LOGS_MOCK.map((log, i) => (
                <tr key={i} style={{ background: i % 2 === 0 ? 'var(--bg2)' : 'var(--bg3)' }}>
                  <td style={tdStyle}>{log.data}</td>
                  <td style={tdStyle}>{log.hora}</td>
                  <td style={{ ...tdStyle, color: 'var(--text)' }}>{log.usuario}</td>
                  <td style={tdStyle}>{log.acao}</td>
                  <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: 11 }}>{log.ip}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Histórico de alterações */}
      <div>
        <div style={secLabel}>Histórico de alterações importantes</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0, border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
          {HISTORICO_MOCK.map((h, i) => (
            <div
              key={i}
              style={{
                display: 'flex', gap: 16, alignItems: 'flex-start',
                padding: '13px 16px',
                background: i % 2 === 0 ? 'var(--bg2)' : 'var(--bg3)',
                borderBottom: i < HISTORICO_MOCK.length - 1 ? '1px solid var(--border)' : 'none',
              }}
            >
              <div style={{ flexShrink: 0, marginTop: 1 }}>
                <div style={{
                  width: 7, height: 7, borderRadius: '50%',
                  background: 'var(--accent)', marginTop: 4,
                }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.4, marginBottom: 4 }}>{h.desc}</div>
                <div style={{ display: 'flex', gap: 14 }}>
                  <span style={{ fontSize: 11, color: 'var(--text3)' }}>{h.data}</span>
                  <span style={{ fontSize: 11, color: 'var(--text3)' }}>por {h.usuario}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Excluir conta */}
      <div>
        <div style={secLabel}>Zona de perigo</div>
        <div style={{
          background: 'rgba(240,92,92,0.05)', border: '1px solid rgba(240,92,92,0.2)',
          borderRadius: 10, padding: '16px 18px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
        }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--red)', marginBottom: 3 }}>Excluir conta</div>
            <div style={{ fontSize: 12, color: 'var(--text3)' }}>
              Remove permanentemente todos os dados da plataforma. Esta ação não pode ser desfeita.
            </div>
          </div>
          <button
            onClick={() => setExcluirModal(true)}
            style={{
              background: 'rgba(240,92,92,0.12)', border: '1px solid rgba(240,92,92,0.35)',
              borderRadius: 8, padding: '8px 18px', fontSize: 13, fontWeight: 500,
              color: 'var(--red)', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
            }}
          >
            Excluir conta
          </button>
        </div>
      </div>

      {excluirModal && <ExcluirContaModal onClose={() => setExcluirModal(false)} />}
    </div>
  );
}

/* ─── Aparência ─────────────────────────────────────────────────────────────── */
const LS_APARENCIA = 'cfg_aparencia';

const ACCENT_CORES = [
  { id: 'indigo',   nome: 'Índigo',   accent: '#5b6ef5', accent2: '#7c8ff7' },
  { id: 'azul',     nome: 'Azul',     accent: '#2563eb', accent2: '#3b82f6' },
  { id: 'verde',    nome: 'Verde',    accent: '#10b981', accent2: '#34d399' },
  { id: 'roxo',     nome: 'Roxo',     accent: '#8b5cf6', accent2: '#a78bfa' },
  { id: 'rosa',     nome: 'Rosa',     accent: '#ec4899', accent2: '#f472b6' },
  { id: 'laranja',  nome: 'Laranja',  accent: '#f97316', accent2: '#fb923c' },
  { id: 'vermelho', nome: 'Vermelho', accent: '#ef4444', accent2: '#f87171' },
  { id: 'teal',     nome: 'Teal',     accent: '#14b8a6', accent2: '#2dd4bf' },
];

function applyTheme(tema) {
  const el = document.documentElement;
  if (tema === 'auto') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    el.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
  } else {
    el.setAttribute('data-theme', tema);
  }
}

function applyAccent(cor) {
  document.documentElement.style.setProperty('--accent', cor.accent);
  document.documentElement.style.setProperty('--accent2', cor.accent2);
}

function applyDensity(density) {
  if (density === 'compact') {
    document.body.classList.add('density-compact');
  } else {
    document.body.classList.remove('density-compact');
  }
}

function ThemeCard({ id, label, selected, onSelect }) {
  const previews = {
    dark: { bg: '#0e0f12', bg2: '#16181e', bg3: '#1e2028', text: '#e8eaf0', text3: '#5c6080', accent: '#5b6ef5' },
    light: { bg: '#f4f5f7', bg2: '#ffffff', bg3: '#f0f1f4', text: '#111318', text3: '#8b90a8', accent: '#5b6ef5' },
    auto: null,
  };
  const p = previews[id];

  return (
    <div
      onClick={() => onSelect(id)}
      style={{
        cursor: 'pointer', borderRadius: 10,
        border: `2px solid ${selected ? 'var(--accent)' : 'var(--border)'}`,
        overflow: 'hidden', transition: 'border-color 0.15s',
        background: 'var(--bg3)',
      }}
    >
      {/* Mini preview */}
      <div style={{ height: 72, position: 'relative', overflow: 'hidden' }}>
        {id === 'auto' ? (
          <div style={{ display: 'flex', height: '100%' }}>
            <div style={{ flex: 1, background: '#0e0f12', display: 'flex', flexDirection: 'column', padding: 6, gap: 4 }}>
              <div style={{ height: 6, width: '60%', borderRadius: 3, background: '#2e3040' }} />
              <div style={{ height: 4, width: '80%', borderRadius: 2, background: '#1e2028' }} />
              <div style={{ height: 4, width: '50%', borderRadius: 2, background: '#1e2028' }} />
              <div style={{ marginTop: 4, height: 14, width: '70%', borderRadius: 4, background: '#5b6ef5' }} />
            </div>
            <div style={{ width: 1, background: 'rgba(255,255,255,0.1)' }} />
            <div style={{ flex: 1, background: '#f4f5f7', display: 'flex', flexDirection: 'column', padding: 6, gap: 4 }}>
              <div style={{ height: 6, width: '60%', borderRadius: 3, background: '#e2e4ec' }} />
              <div style={{ height: 4, width: '80%', borderRadius: 2, background: '#ffffff' }} />
              <div style={{ height: 4, width: '50%', borderRadius: 2, background: '#ffffff' }} />
              <div style={{ marginTop: 4, height: 14, width: '70%', borderRadius: 4, background: '#5b6ef5' }} />
            </div>
          </div>
        ) : (
          <div style={{ background: p.bg, height: '100%', padding: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ display: 'flex', gap: 4, marginBottom: 2 }}>
              <div style={{ height: 5, width: '30%', borderRadius: 3, background: p.bg2 }} />
              <div style={{ height: 5, width: '20%', borderRadius: 3, background: p.bg2 }} />
            </div>
            <div style={{ background: p.bg2, borderRadius: 5, padding: 6, flex: 1, display: 'flex', flexDirection: 'column', gap: 3 }}>
              <div style={{ height: 4, width: '70%', borderRadius: 2, background: p.bg3 }} />
              <div style={{ height: 4, width: '50%', borderRadius: 2, background: p.bg3 }} />
              <div style={{ marginTop: 2, height: 10, width: '40%', borderRadius: 4, background: p.accent }} />
            </div>
          </div>
        )}
      </div>
      {/* Label */}
      <div style={{
        padding: '7px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderTop: '1px solid var(--border)',
      }}>
        <span style={{ fontSize: 12, fontWeight: 500, color: selected ? 'var(--accent2)' : 'var(--text2)' }}>{label}</span>
        {selected && <Check size={13} style={{ color: 'var(--accent)' }} />}
      </div>
    </div>
  );
}

function AparenciaTab() {
  const [prefs, setPrefs] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(LS_APARENCIA) || 'null');
      return saved || { tema: 'dark', accentId: 'indigo', density: 'comfortable' };
    } catch { return { tema: 'dark', accentId: 'indigo', density: 'comfortable' }; }
  });
  const [toast, setToast] = useState(false);

  function save(next) {
    setPrefs(next);
    localStorage.setItem(LS_APARENCIA, JSON.stringify(next));
    setToast(true);
    setTimeout(() => setToast(false), 2000);
  }

  function handleTema(tema) {
    applyTheme(tema);
    save({ ...prefs, tema });
  }

  function handleAccent(cor) {
    applyAccent(cor);
    save({ ...prefs, accentId: cor.id });
  }

  function handleDensity(density) {
    applyDensity(density);
    save({ ...prefs, density });
  }

  const accentAtual = ACCENT_CORES.find(c => c.id === prefs.accentId) || ACCENT_CORES[0];
  const secLabel = { fontSize: 11, fontWeight: 600, color: 'var(--text3)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 14 };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      {toast && (
        <div style={{
          position: 'fixed', top: 20, right: 20, zIndex: 9999,
          background: 'var(--bg2)', border: '1px solid var(--green)',
          borderRadius: 10, padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 10,
          boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
        }}>
          <Check size={15} style={{ color: 'var(--green)' }} />
          <span style={{ fontSize: 13, color: 'var(--text)' }}>Aparência aplicada!</span>
        </div>
      )}

      {/* Tema */}
      <div>
        <div style={secLabel}>Tema</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          <ThemeCard id="dark"  label="Dark (padrão)"  selected={prefs.tema === 'dark'}  onSelect={handleTema} />
          <ThemeCard id="light" label="Light"          selected={prefs.tema === 'light'} onSelect={handleTema} />
          <ThemeCard id="auto"  label="Automático"     selected={prefs.tema === 'auto'}  onSelect={handleTema} />
        </div>
      </div>

      {/* Cor de destaque */}
      <div>
        <div style={secLabel}>Cor de destaque</div>
        <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {ACCENT_CORES.map(cor => (
              <button
                key={cor.id}
                onClick={() => handleAccent(cor)}
                title={cor.nome}
                style={{
                  width: 32, height: 32, borderRadius: '50%', border: 'none',
                  background: cor.accent, cursor: 'pointer',
                  outline: prefs.accentId === cor.id ? `3px solid ${cor.accent}` : '3px solid transparent',
                  outlineOffset: 2,
                  boxShadow: prefs.accentId === cor.id ? `0 0 0 1px var(--bg2)` : 'none',
                  transition: 'outline 0.12s, box-shadow 0.12s',
                }}
              />
            ))}
          </div>
          {/* Preview ao vivo */}
          <div style={{
            background: 'var(--bg3)', border: '1px solid var(--border)',
            borderRadius: 10, padding: '12px 16px',
            display: 'flex', flexDirection: 'column', gap: 10, minWidth: 200,
          }}>
            <span style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Preview — {accentAtual.nome}</span>
            <button style={{
              background: accentAtual.accent, border: 'none', borderRadius: 8,
              padding: '7px 16px', fontSize: 12, color: '#fff', cursor: 'default', fontWeight: 500,
            }}>
              Botão primário
            </button>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{
                fontSize: 11, padding: '2px 9px', borderRadius: 20, fontWeight: 500,
                background: `${accentAtual.accent}20`, color: accentAtual.accent2,
                border: `1px solid ${accentAtual.accent}40`,
              }}>
                Badge
              </span>
              <span style={{ fontSize: 12, color: accentAtual.accent2 }}>Link de exemplo →</span>
            </div>
          </div>
        </div>
      </div>

      {/* Densidade */}
      <div>
        <div style={secLabel}>Densidade de informação</div>
        <div style={{ display: 'flex', gap: 12 }}>
          {[
            { id: 'comfortable', label: 'Confortável', desc: 'Espaçamento padrão, fácil leitura' },
            { id: 'compact',     label: 'Compacto',    desc: 'Mais informação por tela' },
          ].map(opt => (
            <div
              key={opt.id}
              onClick={() => handleDensity(opt.id)}
              style={{
                flex: 1, cursor: 'pointer', borderRadius: 10, padding: '14px 16px',
                border: `2px solid ${prefs.density === opt.id ? 'var(--accent)' : 'var(--border)'}`,
                background: prefs.density === opt.id ? 'rgba(91,110,245,0.06)' : 'var(--bg3)',
                transition: 'border-color 0.15s, background 0.15s',
                display: 'flex', alignItems: 'flex-start', gap: 10,
              }}
            >
              <div style={{
                width: 16, height: 16, borderRadius: '50%', border: `2px solid ${prefs.density === opt.id ? 'var(--accent)' : 'var(--border2)'}`,
                flexShrink: 0, marginTop: 1, position: 'relative',
              }}>
                {prefs.density === opt.id && (
                  <div style={{
                    position: 'absolute', top: '50%', left: '50%',
                    transform: 'translate(-50%,-50%)',
                    width: 7, height: 7, borderRadius: '50%', background: 'var(--accent)',
                  }} />
                )}
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, color: prefs.density === opt.id ? 'var(--text)' : 'var(--text2)' }}>{opt.label}</div>
                <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>{opt.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── API ────────────────────────────────────────────────────────────────────── */
const LS_API_KEYS    = 'cfg_api_keys';
const LS_WEBHOOKS    = 'cfg_webhooks';
const LS_PLANO_TIER  = 'cfg_plano_tier';

const API_ENDPOINTS = [
  { recurso: 'Leads',     metodo: 'GET / POST / PUT / DELETE', endpoint: '/api/leads',    desc: 'Listar, criar, atualizar e remover leads' },
  { recurso: 'Clientes',  metodo: 'GET / POST / PUT',          endpoint: '/api/clientes', desc: 'Gerenciar clientes convertidos' },
  { recurso: 'Tarefas',   metodo: 'GET / POST / PUT',          endpoint: '/api/tarefas',  desc: 'Tarefas e follow-ups do time' },
  { recurso: 'KPIs',      metodo: 'GET / POST',                endpoint: '/api/kpis',     desc: 'Métricas e metas do período' },
  { recurso: 'Webhooks',  metodo: 'GET / POST',                endpoint: '/api/webhooks', desc: 'Gerenciar integrações via webhook' },
];

const WEBHOOK_EVENTOS = [
  { id: 'lead.criado',          label: 'lead.criado' },
  { id: 'lead.etapa_alterada',  label: 'lead.etapa_alterada' },
  { id: 'cliente.criado',       label: 'cliente.criado' },
  { id: 'meta.atingida',        label: 'meta.atingida' },
  { id: 'ticket.criado',        label: 'ticket.criado' },
];

function gerarApiKey() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const seg = (n) => Array.from({ length: n }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `cpme_${seg(8)}_${seg(16)}_${seg(8)}`;
}

function WebhookModal({ onSave, onClose }) {
  const [url, setUrl] = useState('');
  const [eventos, setEventos] = useState({});

  function toggleEvento(id) {
    setEventos(e => ({ ...e, [id]: !e[id] }));
  }

  const evSelecionados = Object.keys(eventos).filter(k => eventos[k]);
  const valido = url.trim().startsWith('http') && evSelecionados.length > 0;

  const inp = { background: 'var(--bg4)', border: '1px solid var(--border)', borderRadius: 8, padding: '9px 12px', color: 'var(--text)', fontSize: 13, outline: 'none', fontFamily: 'var(--font-body)', width: '100%', boxSizing: 'border-box' };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: 14, padding: 28, width: 460, maxWidth: '90vw' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>Novo webhook</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)' }}><XIcon size={18} /></button>
        </div>

        <label style={{ fontSize: 12, color: 'var(--text3)', display: 'block', marginBottom: 6 }}>URL de destino</label>
        <input
          type="url"
          value={url}
          onChange={e => setUrl(e.target.value)}
          placeholder="https://meuservico.com/webhook"
          style={{ ...inp, marginBottom: 20 }}
        />

        <label style={{ fontSize: 12, color: 'var(--text3)', display: 'block', marginBottom: 10 }}>Eventos para escutar</label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
          {WEBHOOK_EVENTOS.map(ev => (
            <label key={ev.id} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={!!eventos[ev.id]}
                onChange={() => toggleEvento(ev.id)}
                style={{ accentColor: 'var(--accent)', width: 15, height: 15, cursor: 'pointer' }}
              />
              <span style={{ fontSize: 13, color: 'var(--text2)', fontFamily: 'monospace' }}>{ev.label}</span>
            </label>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ background: 'transparent', border: '1px solid var(--border2)', borderRadius: 8, padding: '8px 18px', fontSize: 13, color: 'var(--text2)', cursor: 'pointer' }}>Cancelar</button>
          <button
            disabled={!valido}
            onClick={() => valido && onSave({ url: url.trim(), eventos: evSelecionados })}
            style={{ background: valido ? 'var(--accent)' : 'var(--bg4)', border: 'none', borderRadius: 8, padding: '8px 18px', fontSize: 13, fontWeight: 500, color: valido ? '#fff' : 'var(--text3)', cursor: valido ? 'pointer' : 'default' }}
          >
            Criar webhook
          </button>
        </div>
      </div>
    </div>
  );
}

function ApiTab() {
  const planoTier = (() => {
    try { return localStorage.getItem(LS_PLANO_TIER) || 'pro'; } catch { return 'pro'; }
  })();
  const temAcesso = planoTier === 'pro' || planoTier === 'equipe';

  const [keys, setKeys]             = useState(() => { try { return JSON.parse(localStorage.getItem(LS_API_KEYS) || '[]'); } catch { return []; } });
  const [webhooks, setWebhooks]     = useState(() => { try { return JSON.parse(localStorage.getItem(LS_WEBHOOKS) || '[]'); } catch { return []; } });
  const [novaKey, setNovaKey]       = useState(null);
  const [copiado, setCopiado]       = useState(false);
  const [webhookModal, setWebhookModal] = useState(false);
  const [revogarId, setRevogarId]   = useState(null);
  const [nomeKey, setNomeKey]       = useState('');
  const [nomeModal, setNomeModal]   = useState(false);

  function saveKeys(next) { setKeys(next); localStorage.setItem(LS_API_KEYS, JSON.stringify(next)); }
  function saveWebhooks(next) { setWebhooks(next); localStorage.setItem(LS_WEBHOOKS, JSON.stringify(next)); }

  function handleGerarKey() {
    if (!nomeKey.trim()) return;
    const key = gerarApiKey();
    const now = new Date().toLocaleDateString('pt-BR');
    const entry = { id: Date.now(), nome: nomeKey.trim(), key, criada: now, ultimoUso: '—' };
    saveKeys([...keys, entry]);
    setNovaKey(key);
    setNomeKey('');
    setNomeModal(false);
  }

  function handleCopiar() {
    navigator.clipboard.writeText(novaKey).catch(() => {});
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  function handleRevogar(id) {
    saveKeys(keys.filter(k => k.id !== id));
    setRevogarId(null);
  }

  function handleWebhookSave({ url, eventos }) {
    const entry = { id: Date.now(), url, eventos, criado: new Date().toLocaleDateString('pt-BR') };
    saveWebhooks([...webhooks, entry]);
    setWebhookModal(false);
  }

  const secLabel = { fontSize: 11, fontWeight: 600, color: 'var(--text3)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 12 };
  const thS = { fontSize: 11, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '9px 14px', background: 'var(--bg3)', borderBottom: '1px solid var(--border)', textAlign: 'left' };
  const tdS = { fontSize: 12, color: 'var(--text2)', padding: '9px 14px', borderBottom: '1px solid var(--border)', verticalAlign: 'middle' };

  if (!temAcesso) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: 16, padding: '48px 24px', textAlign: 'center',
      }}>
        <div style={{ width: 52, height: 52, borderRadius: 14, background: 'rgba(91,110,245,0.1)', border: '1px solid rgba(91,110,245,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Lock size={22} style={{ color: 'var(--accent2)' }} />
        </div>
        <div>
          <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>API disponível nos planos Pro e Equipe</div>
          <div style={{ fontSize: 13, color: 'var(--text2)', maxWidth: 380, lineHeight: 1.6 }}>
            Acesse a API REST, configure webhooks e integre o CRM com suas ferramentas favoritas.
          </div>
        </div>
        <button style={{ background: 'var(--accent)', border: 'none', borderRadius: 8, padding: '9px 22px', fontSize: 13, fontWeight: 500, color: '#fff', cursor: 'pointer' }}>
          Fazer upgrade
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      {webhookModal && <WebhookModal onSave={handleWebhookSave} onClose={() => setWebhookModal(false)} />}

      {/* Confirmação revogar */}
      {revogarId !== null && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: 14, padding: 28, width: 380, maxWidth: '90vw' }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', marginBottom: 10 }}>Revogar API Key?</div>
            <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 20, lineHeight: 1.5 }}>
              Qualquer integração usando essa key vai parar de funcionar imediatamente.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setRevogarId(null)} style={{ background: 'transparent', border: '1px solid var(--border2)', borderRadius: 8, padding: '8px 18px', fontSize: 13, color: 'var(--text2)', cursor: 'pointer' }}>Cancelar</button>
              <button onClick={() => handleRevogar(revogarId)} style={{ background: 'var(--red)', border: 'none', borderRadius: 8, padding: '8px 18px', fontSize: 13, fontWeight: 500, color: '#fff', cursor: 'pointer' }}>Revogar</button>
            </div>
          </div>
        </div>
      )}

      {/* Gerar API Key */}
      <div>
        <div style={secLabel}>API Keys</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Botão gerar + modal nome */}
          {!nomeModal ? (
            <button
              onClick={() => setNomeModal(true)}
              style={{ alignSelf: 'flex-start', background: 'var(--accent)', border: 'none', borderRadius: 8, padding: '8px 18px', fontSize: 13, fontWeight: 500, color: '#fff', cursor: 'pointer' }}
            >
              + Gerar nova API Key
            </button>
          ) : (
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <input
                autoFocus
                type="text"
                value={nomeKey}
                onChange={e => setNomeKey(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleGerarKey(); if (e.key === 'Escape') setNomeModal(false); }}
                placeholder="Nome da key (ex.: Integração Zapier)"
                style={{ background: 'var(--bg4)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', color: 'var(--text)', fontSize: 13, outline: 'none', width: 300 }}
              />
              <button onClick={handleGerarKey} disabled={!nomeKey.trim()} style={{ background: nomeKey.trim() ? 'var(--accent)' : 'var(--bg4)', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 500, color: nomeKey.trim() ? '#fff' : 'var(--text3)', cursor: nomeKey.trim() ? 'pointer' : 'default' }}>Gerar</button>
              <button onClick={() => setNomeModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)' }}><XIcon size={16} /></button>
            </div>
          )}

          {/* Key recém-gerada */}
          {novaKey && (
            <div style={{ background: 'rgba(45,212,160,0.06)', border: '1px solid rgba(45,212,160,0.25)', borderRadius: 10, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Check size={14} style={{ color: 'var(--green)' }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--green)' }}>Key gerada com sucesso!</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <code style={{ flex: 1, fontSize: 12, background: 'var(--bg4)', borderRadius: 6, padding: '7px 10px', color: 'var(--text)', fontFamily: 'monospace', wordBreak: 'break-all' }}>
                  {novaKey}
                </code>
                <button
                  onClick={handleCopiar}
                  style={{ background: copiado ? 'rgba(45,212,160,0.12)' : 'var(--bg4)', border: `1px solid ${copiado ? 'rgba(45,212,160,0.3)' : 'var(--border)'}`, borderRadius: 7, padding: '7px 12px', fontSize: 12, color: copiado ? 'var(--green)' : 'var(--text2)', cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.15s' }}
                >
                  {copiado ? 'Copiado!' : 'Copiar'}
                </button>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 7 }}>
                <AlertTriangle size={13} style={{ color: 'var(--amber)', flexShrink: 0, marginTop: 1 }} />
                <span style={{ fontSize: 12, color: 'var(--amber)' }}>Guarde sua key em local seguro. Não será exibida novamente.</span>
              </div>
              <button onClick={() => setNovaKey(null)} style={{ alignSelf: 'flex-end', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--text3)' }}>Fechar aviso</button>
            </div>
          )}

          {/* Lista de keys */}
          {keys.length > 0 && (
            <div style={{ border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={thS}>Nome</th>
                    <th style={thS}>Criada em</th>
                    <th style={thS}>Último uso</th>
                    <th style={{ ...thS, textAlign: 'right' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {keys.map((k, i) => (
                    <tr key={k.id} style={{ background: i % 2 === 0 ? 'var(--bg2)' : 'var(--bg3)' }}>
                      <td style={{ ...tdS, color: 'var(--text)', fontWeight: 500 }}>{k.nome}</td>
                      <td style={tdS}>{k.criada}</td>
                      <td style={tdS}>{k.ultimoUso}</td>
                      <td style={{ ...tdS, textAlign: 'right', borderBottom: i < keys.length - 1 ? '1px solid var(--border)' : 'none' }}>
                        <button
                          onClick={() => setRevogarId(k.id)}
                          style={{ background: 'transparent', border: '1px solid rgba(240,92,92,0.3)', borderRadius: 7, padding: '4px 12px', fontSize: 11, color: 'var(--red)', cursor: 'pointer' }}
                        >
                          Revogar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {keys.length === 0 && !novaKey && (
            <p style={{ fontSize: 13, color: 'var(--text3)', margin: 0 }}>Nenhuma API Key ativa. Gere uma para começar a integrar.</p>
          )}
        </div>
      </div>

      {/* Endpoints */}
      <div>
        <div style={{ ...secLabel, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>Endpoints disponíveis</span>
          <a href="https://docs.comercialpme.com.br" target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: 'var(--accent2)', textDecoration: 'none', textTransform: 'none', letterSpacing: 0, fontWeight: 400 }}>
            Ver documentação completa →
          </a>
        </div>
        <div style={{ border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={thS}>Recurso</th>
                <th style={thS}>Método</th>
                <th style={thS}>Endpoint</th>
                <th style={thS}>Descrição</th>
              </tr>
            </thead>
            <tbody>
              {API_ENDPOINTS.map((ep, i) => (
                <tr key={ep.recurso} style={{ background: i % 2 === 0 ? 'var(--bg2)' : 'var(--bg3)' }}>
                  <td style={{ ...tdS, color: 'var(--text)', fontWeight: 500, borderBottom: i < API_ENDPOINTS.length - 1 ? '1px solid var(--border)' : 'none' }}>{ep.recurso}</td>
                  <td style={{ ...tdS, borderBottom: i < API_ENDPOINTS.length - 1 ? '1px solid var(--border)' : 'none' }}>
                    <code style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--accent2)' }}>{ep.metodo}</code>
                  </td>
                  <td style={{ ...tdS, borderBottom: i < API_ENDPOINTS.length - 1 ? '1px solid var(--border)' : 'none' }}>
                    <code style={{ fontSize: 12, fontFamily: 'monospace', color: 'var(--green)' }}>{ep.endpoint}</code>
                  </td>
                  <td style={{ ...tdS, borderBottom: i < API_ENDPOINTS.length - 1 ? '1px solid var(--border)' : 'none' }}>{ep.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Webhooks */}
      <div>
        <div style={{ ...secLabel, display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <span>Webhooks configurados</span>
          <button
            onClick={() => setWebhookModal(true)}
            style={{ background: 'var(--bg3)', border: '1px solid var(--border2)', borderRadius: 8, padding: '5px 14px', fontSize: 12, color: 'var(--text2)', cursor: 'pointer', textTransform: 'none', letterSpacing: 0, fontWeight: 500 }}
          >
            + Novo webhook
          </button>
        </div>
        {webhooks.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--text3)', margin: 0 }}>Nenhum webhook configurado ainda.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {webhooks.map(wh => (
              <div key={wh.id} style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <code style={{ fontSize: 13, color: 'var(--text)', fontFamily: 'monospace', display: 'block', marginBottom: 6, wordBreak: 'break-all' }}>{wh.url}</code>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {wh.eventos.map(ev => (
                      <span key={ev} style={{ fontSize: 11, padding: '1px 8px', borderRadius: 20, background: 'rgba(91,110,245,0.1)', color: 'var(--accent2)', border: '1px solid rgba(91,110,245,0.2)', fontFamily: 'monospace' }}>
                        {ev}
                      </span>
                    ))}
                  </div>
                  <span style={{ fontSize: 11, color: 'var(--text3)', marginTop: 6, display: 'block' }}>Criado em {wh.criado}</span>
                </div>
                <button
                  onClick={() => saveWebhooks(webhooks.filter(w => w.id !== wh.id))}
                  style={{ background: 'transparent', border: '1px solid rgba(240,92,92,0.3)', borderRadius: 7, padding: '5px 12px', fontSize: 11, color: 'var(--red)', cursor: 'pointer', flexShrink: 0 }}
                >
                  Deletar
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Page ───────────────────────────────────────────────────────────────────── */
export default function Configuracoes() {
  const [tab, setTab] = useState('roles');

  const tabs = [
    { id: 'roles',   label: 'Permissões por Perfil' },
    { id: 'users',   label: 'Usuários'              },
    { id: 'empresa', label: 'Empresa'               },
    { id: 'conta',   label: 'Minha Conta'           },
    { id: 'plano',       label: 'Plano & Financeiro' },
    { id: 'ia',          label: 'Uso de IA'          },
    { id: 'integracoes',    label: 'Integrações'         },
    { id: 'notificacoes',   label: 'Notificações'        },
    { id: 'dados',          label: 'Dados & Privacidade' },
    { id: 'aparencia',      label: 'Aparência'           },
    { id: 'api',            label: 'API'                 },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--border)', paddingBottom: 0 }}>
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              padding: '8px 16px', fontSize: 13, fontWeight: 500,
              color: tab === t.id ? 'var(--accent2)' : 'var(--text3)',
              borderBottom: `2px solid ${tab === t.id ? 'var(--accent)' : 'transparent'}`,
              marginBottom: -1, fontFamily: 'var(--font-body)',
              transition: 'color 0.13s',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div style={{
        background: 'var(--bg2)', border: '1px solid var(--border)',
        borderRadius: 14, padding: 20,
      }}>
        {tab === 'roles'   && <RoleTab />}
        {tab === 'users'   && <UsersTab />}
        {tab === 'empresa' && <EmpresaTab />}
        {tab === 'conta'   && <MinhaContaTab />}
        {tab === 'plano'       && <PlanoTab />}
        {tab === 'ia'          && <UsoIATab />}
        {tab === 'integracoes'  && <IntegracoesTab />}
        {tab === 'notificacoes' && <NotificacoesTab />}
        {tab === 'dados'        && <DadosPrivacidadeTab />}
        {tab === 'aparencia'    && <AparenciaTab />}
        {tab === 'api'          && <ApiTab />}
      </div>
    </div>
  );
}
