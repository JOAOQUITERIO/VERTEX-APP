import { useState, useMemo, useEffect, useRef } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// 🔥 FIREBASE CONFIG — substitui estes valores pelos do teu projeto Firebase
// Tutorial: https://console.firebase.google.com → New Project → Realtime Database
// ─────────────────────────────────────────────────────────────────────────────
const FIREBASE_CONFIG = {
  databaseURL: "https://SEU-PROJETO-default-rtdb.europe-west1.firebasedatabase.app",
  // Substitui "SEU-PROJETO" pelo nome do teu projeto Firebase
};

// ─── Firebase REST API helpers ────────────────────────────────────────────────
const DB = FIREBASE_CONFIG.databaseURL;

async function fbGet(path) {
  try {
    const r = await fetch(`${DB}/${path}.json`);
    return r.ok ? await r.json() : null;
  } catch { return null; }
}

async function fbSet(path, data) {
  try {
    await fetch(`${DB}/${path}.json`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  } catch {}
}

// Long-poll for real-time updates (Server-Sent Events)
function fbListen(path, callback) {
  let active = true;
  let lastValue = null;

  const poll = async () => {
    if (!active) return;
    const data = await fbGet(path);
    const str = JSON.stringify(data);
    if (str !== lastValue) {
      lastValue = str;
      callback(data);
    }
    if (active) setTimeout(poll, 3000); // poll every 3 seconds
  };

  poll();
  return () => { active = false; };
}

// ─── Default data ─────────────────────────────────────────────────────────────
const defaultProjects = [
  {
    id: 1,
    nome: "IMO-1 — Rua Açores nº91A",
    descricao: "Moradia zona centro, 75m² implantação, 220m² área total",
    valorCompra: 77500, valorVenda: 180000, valorRemodelar: 18492.5,
    despesasExtra: 12750.46, comissaoImob: 9000, escritura: 981.77,
    imt: 775, emprestimoBanco: 3081.89, imposto: 11822.66, seguroVida: 58.19, meses: 7,
    faturas: [
      { id: 1, numero: "quit nº10158", tipo: "tijolo, cimento, estribos, areia", preco1: 201.11, precoVertex: 201.11, valorPoupado: 0, obs: "" },
      { id: 2, numero: "quit nº10414", tipo: "estrutura e calhas omega", preco1: 676.6, precoVertex: 598.21, valorPoupado: 78.39, obs: "" },
      { id: 3, numero: "quit nº10480", tipo: "Chapas coppo e acessórios", preco1: 2126.67, precoVertex: 1920.03, valorPoupado: 206.64, obs: "" },
      { id: 4, numero: "quit nº10540", tipo: "chapa galv, disco", preco1: 70.41, precoVertex: 59.81, valorPoupado: 10.6, obs: "" },
      { id: 5, numero: "quit nº10573", tipo: "cimento e tapa topo", preco1: 141.45, precoVertex: 120.93, valorPoupado: 20.52, obs: "" },
      { id: 6, numero: "quit nº10637", tipo: "topos e fibraflex", preco1: 198.2, precoVertex: 170.82, valorPoupado: 27.38, obs: "" },
    ],
    despesas: [
      { id: 1, fornecedor: "Quitério & Quitério", categoria: "Material", valor: 14099.58 },
      { id: 2, fornecedor: "Galp", categoria: "Combustível", valor: 128.26 },
      { id: 3, fornecedor: "Celeste", categoria: "Alimentação", valor: 390.3 },
      { id: 4, fornecedor: "Staples/Worten", categoria: "Outros", valor: 39.57 },
      { id: 5, fornecedor: "Cecometal", categoria: "Material", valor: 98.85 },
      { id: 6, fornecedor: "Cepsa", categoria: "Combustível", valor: 19.01 },
      { id: 7, fornecedor: "Capeto", categoria: "Alimentação", valor: 78.8 },
      { id: 8, fornecedor: "Trindade", categoria: "Material", valor: 1018.29 },
      { id: 9, fornecedor: "Ouro Negro", categoria: "Combustível", valor: 68.64 },
      { id: 10, fornecedor: "RibaTubos", categoria: "Material", valor: 867.59 },
      { id: 11, fornecedor: "Silva e Bernardo", categoria: "Material", valor: 67.65 },
      { id: 12, fornecedor: "Cecnol", categoria: "Material", valor: 27.68 },
      { id: 13, fornecedor: "Vasco Oliveira", categoria: "Material", valor: 792.83 },
    ],
  },
];

const CATEGORIAS = ["Material", "Combustível", "Alimentação", "Outros", "Gastos (não pagos)"];
const CAT_COLORS = { Material: "#3b82f6", Combustível: "#f59e0b", Alimentação: "#10b981", Outros: "#8b5cf6", "Gastos (não pagos)": "#ef4444" };
const fmt = (v) => new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(v || 0);
const uid = () => Date.now() + Math.floor(Math.random() * 99999);

// ─── UI Components ────────────────────────────────────────────────────────────
function Modal({ title, onClose, children, wide }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.78)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "1rem" }}>
      <div style={{ background: "#0f1117", border: "1px solid #2a2d3a", borderRadius: "16px", width: "100%", maxWidth: wide ? "700px" : "540px", maxHeight: "90vh", overflow: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1.4rem 1.6rem", borderBottom: "1px solid #1e2130" }}>
          <h3 style={{ color: "#e2e8f0", fontFamily: "'Sora',sans-serif", fontSize: "1.05rem", fontWeight: 700, margin: 0 }}>{title}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: "1.5rem", lineHeight: 1, padding: 0 }}>×</button>
        </div>
        <div style={{ padding: "1.6rem" }}>{children}</div>
      </div>
    </div>
  );
}

function Input({ label, value, onChange, type = "text", placeholder, half }) {
  return (
    <div style={{ marginBottom: "1rem", width: half ? "calc(50% - 0.4rem)" : "100%" }}>
      {label && <label style={{ display: "block", color: "#94a3b8", fontSize: "0.73rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "0.35rem" }}>{label}</label>}
      <input type={type} value={value} onChange={onChange} placeholder={placeholder}
        style={{ width: "100%", background: "#1a1d2e", border: "1px solid #2a2d3a", borderRadius: "8px", padding: "0.6rem 0.85rem", color: "#e2e8f0", fontSize: "0.92rem", outline: "none", boxSizing: "border-box", fontFamily: "'Sora',sans-serif" }} />
    </div>
  );
}

function Select({ label, value, onChange, options }) {
  return (
    <div style={{ marginBottom: "1rem" }}>
      {label && <label style={{ display: "block", color: "#94a3b8", fontSize: "0.73rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "0.35rem" }}>{label}</label>}
      <select value={value} onChange={onChange} style={{ width: "100%", background: "#1a1d2e", border: "1px solid #2a2d3a", borderRadius: "8px", padding: "0.6rem 0.85rem", color: "#e2e8f0", fontSize: "0.92rem", outline: "none", fontFamily: "'Sora',sans-serif" }}>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

function Btn({ children, onClick, variant = "primary", small, disabled }) {
  const styles = {
    primary: { background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#fff", border: "none" },
    secondary: { background: "#1a1d2e", color: "#94a3b8", border: "1px solid #2a2d3a" },
    danger: { background: "#ef444418", color: "#ef4444", border: "1px solid #ef444435" },
    ghost: { background: "transparent", color: "#6366f1", border: "1px solid #6366f140" },
  };
  return (
    <button onClick={onClick} disabled={disabled}
      style={{ ...styles[variant], borderRadius: "8px", padding: small ? "0.32rem 0.7rem" : "0.6rem 1.15rem", fontSize: small ? "0.78rem" : "0.88rem", fontWeight: 600, cursor: disabled ? "not-allowed" : "pointer", fontFamily: "'Sora',sans-serif", opacity: disabled ? 0.5 : 1, whiteSpace: "nowrap" }}>
      {children}
    </button>
  );
}

function StatCard({ label, value, sub, accent = "#6366f1" }) {
  return (
    <div style={{ background: "#0f1117", border: `1px solid ${accent}28`, borderRadius: "12px", padding: "1.1rem 1.2rem", borderLeft: `3px solid ${accent}` }}>
      <div style={{ color: "#64748b", fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.4rem" }}>{label}</div>
      <div style={{ color: "#e2e8f0", fontSize: "1.3rem", fontWeight: 700, fontFamily: "'Sora',sans-serif" }}>{value}</div>
      {sub && <div style={{ color: "#64748b", fontSize: "0.75rem", marginTop: "0.25rem" }}>{sub}</div>}
    </div>
  );
}

function Toast({ msg, type = "success", onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 3000); return () => clearTimeout(t); }, []);
  const colors = { success: "#10b981", error: "#ef4444", sync: "#6366f1" };
  const icons = { success: "✓", error: "✗", sync: "↻" };
  return (
    <div style={{ position: "fixed", bottom: "1.5rem", right: "1.5rem", background: colors[type], color: "#fff", borderRadius: "10px", padding: "0.7rem 1.2rem", fontSize: "0.88rem", fontWeight: 600, zIndex: 2000, boxShadow: `0 4px 20px ${colors[type]}50`, fontFamily: "'Sora',sans-serif", display: "flex", alignItems: "center", gap: "0.5rem" }}>
      <span style={{ fontSize: "1rem" }}>{icons[type]}</span> {msg}
    </div>
  );
}

function SyncDot({ status }) {
  // status: "connected" | "syncing" | "offline" | "unconfigured"
  const map = {
    connected:    { color: "#10b981", label: "Sincronizado", pulse: false },
    syncing:      { color: "#f59e0b", label: "A sincronizar...", pulse: true },
    offline:      { color: "#ef4444", label: "Sem ligação", pulse: false },
    unconfigured: { color: "#64748b", label: "Firebase não configurado", pulse: false },
  };
  const { color, label, pulse } = map[status] || map.offline;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
      <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: color, boxShadow: pulse ? `0 0 0 3px ${color}40` : "none", animation: pulse ? "pulse 1s infinite" : "none" }} />
      <span style={{ color: "#475569", fontSize: "0.75rem", fontWeight: 500 }}>{label}</span>
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }`}</style>
    </div>
  );
}

function ProjectNameEditor({ name, onSave }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(name);
  const inp = useRef();
  useEffect(() => { if (editing) inp.current?.focus(); }, [editing]);
  const commit = () => { if (val.trim()) onSave(val.trim()); setEditing(false); };
  if (editing) return (
    <input ref={inp} value={val} onChange={e => setVal(e.target.value)}
      onBlur={commit} onKeyDown={e => { if (e.key === "Enter") commit(); if (e.key === "Escape") setEditing(false); }}
      style={{ background: "#1a1d2e", border: "1px solid #6366f1", borderRadius: "6px", color: "#e2e8f0", fontSize: "0.85rem", fontWeight: 600, padding: "0.2rem 0.5rem", outline: "none", fontFamily: "'Sora',sans-serif", minWidth: "160px" }} />
  );
  return (
    <span onClick={() => { setVal(name); setEditing(true); }} title="Clica para renomear"
      style={{ cursor: "text", color: "#a78bfa", fontSize: "0.85rem", fontWeight: 600, borderBottom: "1px dashed #6366f150" }}>
      {name} ✎
    </span>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
function Dashboard({ projects }) {
  const tots = useMemo(() => {
    let inv = 0, venda = 0, poupado = 0;
    projects.forEach(p => {
      inv += (p.valorCompra||0)+(p.valorRemodelar||0)+(p.despesasExtra||0)+(p.comissaoImob||0)+(p.escritura||0)+(p.imt||0)+(p.emprestimoBanco||0)+(p.imposto||0);
      venda += p.valorVenda || 0;
      poupado += p.faturas.reduce((s, f) => s + (f.valorPoupado || 0), 0);
    });
    return { inv, venda, lucro: venda - inv, poupado };
  }, [projects]);

  const catTots = useMemo(() => {
    const a = {}; projects.forEach(p => p.despesas.forEach(d => { a[d.categoria] = (a[d.categoria] || 0) + d.valor; })); return a;
  }, [projects]);
  const maxCat = Math.max(...Object.values(catTots), 1);

  return (
    <div>
      <h2 style={{ color: "#e2e8f0", fontFamily: "'Sora',sans-serif", fontSize: "1.3rem", fontWeight: 700, marginBottom: "1.4rem" }}>Dashboard Global</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: "0.9rem", marginBottom: "2rem" }}>
        <StatCard label="Projetos" value={projects.length} accent="#6366f1" />
        <StatCard label="Total Investido" value={fmt(tots.inv)} accent="#f59e0b" />
        <StatCard label="Total Vendas" value={fmt(tots.venda)} accent="#10b981" />
        <StatCard label="Lucro Bruto" value={fmt(tots.lucro)} sub={tots.lucro > 0 ? "✅ Positivo" : "⚠️ Negativo"} accent={tots.lucro > 0 ? "#10b981" : "#ef4444"} />
        <StatCard label="Poupado (Faturas)" value={fmt(tots.poupado)} accent="#8b5cf6" />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.4rem" }}>
        <div style={{ background: "#0f1117", border: "1px solid #1e2130", borderRadius: "12px", padding: "1.3rem" }}>
          <div style={{ color: "#64748b", fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "1.1rem" }}>Despesas por Categoria</div>
          {Object.entries(catTots).map(([cat, val]) => (
            <div key={cat} style={{ marginBottom: "0.85rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.28rem" }}>
                <span style={{ color: "#cbd5e1", fontSize: "0.85rem" }}>{cat}</span>
                <span style={{ color: CAT_COLORS[cat] || "#6366f1", fontSize: "0.85rem", fontWeight: 700 }}>{fmt(val)}</span>
              </div>
              <div style={{ background: "#1a1d2e", borderRadius: "4px", height: "5px", overflow: "hidden" }}>
                <div style={{ background: CAT_COLORS[cat] || "#6366f1", height: "100%", width: `${(val / maxCat) * 100}%`, borderRadius: "4px" }} />
              </div>
            </div>
          ))}
        </div>
        <div style={{ background: "#0f1117", border: "1px solid #1e2130", borderRadius: "12px", padding: "1.3rem" }}>
          <div style={{ color: "#64748b", fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "1.1rem" }}>Por Projeto</div>
          {projects.map(p => {
            const custo = (p.valorCompra||0)+(p.valorRemodelar||0)+(p.despesasExtra||0)+(p.comissaoImob||0)+(p.escritura||0)+(p.imt||0)+(p.emprestimoBanco||0)+(p.imposto||0);
            const lucro = (p.valorVenda || 0) - custo;
            return (
              <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.75rem", background: "#1a1d2e", borderRadius: "8px", marginBottom: "0.6rem" }}>
                <div>
                  <div style={{ color: "#e2e8f0", fontSize: "0.87rem", fontWeight: 600 }}>{p.nome.split("—")[0].trim()}</div>
                  <div style={{ color: "#64748b", fontSize: "0.75rem" }}>{p.faturas.length} faturas · {p.despesas.length} despesas</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ color: lucro > 0 ? "#10b981" : "#ef4444", fontWeight: 700, fontSize: "0.92rem" }}>{fmt(lucro)}</div>
                  <div style={{ color: "#64748b", fontSize: "0.72rem" }}>lucro bruto</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Faturas ──────────────────────────────────────────────────────────────────
function Faturas({ project, onUpdate }) {
  const empty = { numero: "", tipo: "", preco1: "", precoVertex: "", valorPoupado: "", obs: "" };
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);

  const totalPoupado = project.faturas.reduce((s, f) => s + (f.valorPoupado || 0), 0);
  const totalGasto = project.faturas.reduce((s, f) => s + (f.precoVertex || 0), 0);
  const s = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  const openNew = () => { setForm(empty); setEditId(null); setModal(true); };
  const openEdit = f => { setForm({ numero: f.numero, tipo: f.tipo, preco1: f.preco1, precoVertex: f.precoVertex, valorPoupado: f.valorPoupado, obs: f.obs || "" }); setEditId(f.id); setModal(true); };

  const save = () => {
    const entry = { ...form, preco1: parseFloat(form.preco1)||0, precoVertex: parseFloat(form.precoVertex)||0, valorPoupado: parseFloat(form.valorPoupado)||0 };
    if (editId) onUpdate({ ...project, faturas: project.faturas.map(f => f.id === editId ? { ...f, ...entry } : f) });
    else onUpdate({ ...project, faturas: [...project.faturas, { id: uid(), ...entry }] });
    setModal(false);
  };

  const del = id => { onUpdate({ ...project, faturas: project.faturas.filter(f => f.id !== id) }); setConfirmDel(null); };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.4rem" }}>
        <h2 style={{ color: "#e2e8f0", fontFamily: "'Sora',sans-serif", fontSize: "1.3rem", fontWeight: 700, margin: 0 }}>
          Faturas — <span style={{ color: "#a78bfa" }}>{project.nome.split("—")[0].trim()}</span>
        </h2>
        <Btn onClick={openNew}>+ Nova Fatura</Btn>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "0.9rem", marginBottom: "1.4rem" }}>
        <StatCard label="Total Faturas" value={project.faturas.length} accent="#6366f1" />
        <StatCard label="Total Gasto" value={fmt(totalGasto)} accent="#f59e0b" />
        <StatCard label="Total Poupado" value={fmt(totalPoupado)} accent="#10b981" />
      </div>
      <div style={{ background: "#0f1117", border: "1px solid #1e2130", borderRadius: "12px", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#13151f" }}>
              {["Nº Fatura","Tipo de Material","Preço 1","Preço Vertex","Poupado","Ações"].map(h => (
                <th key={h} style={{ padding: "0.85rem 1rem", textAlign: "left", color: "#475569", fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", whiteSpace: "nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {project.faturas.map((f, i) => (
              <tr key={f.id} style={{ borderTop: "1px solid #1a1d2e", background: i % 2 === 0 ? "transparent" : "#0a0c14" }}>
                <td style={{ padding: "0.8rem 1rem", color: "#818cf8", fontSize: "0.85rem", fontWeight: 600, whiteSpace: "nowrap" }}>{f.numero}</td>
                <td style={{ padding: "0.8rem 1rem", color: "#cbd5e1", fontSize: "0.85rem" }}>{f.tipo}</td>
                <td style={{ padding: "0.8rem 1rem", color: "#94a3b8", fontSize: "0.85rem", whiteSpace: "nowrap" }}>{fmt(f.preco1)}</td>
                <td style={{ padding: "0.8rem 1rem", color: "#e2e8f0", fontSize: "0.85rem", fontWeight: 600, whiteSpace: "nowrap" }}>{fmt(f.precoVertex)}</td>
                <td style={{ padding: "0.8rem 1rem", whiteSpace: "nowrap" }}>
                  <span style={{ background: f.valorPoupado > 0 ? "#10b98118" : "#1a1d2e", color: f.valorPoupado > 0 ? "#10b981" : "#475569", padding: "0.18rem 0.55rem", borderRadius: "5px", fontSize: "0.82rem", fontWeight: 700 }}>
                    {fmt(f.valorPoupado)}
                  </span>
                </td>
                <td style={{ padding: "0.8rem 1rem" }}>
                  <div style={{ display: "flex", gap: "0.35rem" }}>
                    <Btn small variant="secondary" onClick={() => openEdit(f)}>✏️ Editar</Btn>
                    <Btn small variant="danger" onClick={() => setConfirmDel(f.id)}>🗑 Remover</Btn>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {project.faturas.length === 0 && <div style={{ padding: "3rem", textAlign: "center", color: "#334155" }}>Nenhuma fatura. Clica "+ Nova Fatura" para adicionar.</div>}
      </div>
      {modal && (
        <Modal title={editId ? "Editar Fatura" : "Nova Fatura"} onClose={() => setModal(false)}>
          <Input label="Nº Fatura" value={form.numero} onChange={s("numero")} placeholder="quit nº10158" />
          <Input label="Tipo de Material / Descrição" value={form.tipo} onChange={s("tipo")} placeholder="tijolo, cimento, areia..." />
          <div style={{ display: "flex", gap: "0.8rem" }}>
            <Input half label="Preço 1 (€)" type="number" value={form.preco1} onChange={s("preco1")} />
            <Input half label="Preço Vertex (€)" type="number" value={form.precoVertex} onChange={s("precoVertex")} />
          </div>
          <Input label="Valor Poupado (€)" type="number" value={form.valorPoupado} onChange={s("valorPoupado")} />
          <Input label="Observações" value={form.obs} onChange={s("obs")} placeholder="Notas opcionais..." />
          <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
            <Btn variant="secondary" onClick={() => setModal(false)}>Cancelar</Btn>
            <Btn onClick={save} disabled={!form.numero.trim()}>Guardar</Btn>
          </div>
        </Modal>
      )}
      {confirmDel && (
        <Modal title="Confirmar Eliminação" onClose={() => setConfirmDel(null)}>
          <p style={{ color: "#94a3b8", marginBottom: "1.4rem" }}>Tens a certeza que queres remover esta fatura?</p>
          <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
            <Btn variant="secondary" onClick={() => setConfirmDel(null)}>Cancelar</Btn>
            <Btn variant="danger" onClick={() => del(confirmDel)}>Remover</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── Despesas ─────────────────────────────────────────────────────────────────
function Despesas({ project, onUpdate }) {
  const empty = { fornecedor: "", categoria: CATEGORIAS[0], valor: "" };
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState(null);
  const [filtro, setFiltro] = useState("Todos");
  const [confirmDel, setConfirmDel] = useState(null);

  const catTots = useMemo(() => { const a = {}; project.despesas.forEach(d => { a[d.categoria] = (a[d.categoria]||0) + d.valor; }); return a; }, [project.despesas]);
  const filtered = filtro === "Todos" ? project.despesas : project.despesas.filter(d => d.categoria === filtro);
  const s = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  const openNew = () => { setForm(empty); setEditId(null); setModal(true); };
  const openEdit = d => { setForm({ fornecedor: d.fornecedor, categoria: d.categoria, valor: d.valor }); setEditId(d.id); setModal(true); };

  const save = () => {
    const entry = { ...form, valor: parseFloat(form.valor)||0 };
    if (editId) onUpdate({ ...project, despesas: project.despesas.map(d => d.id === editId ? { ...d, ...entry } : d) });
    else onUpdate({ ...project, despesas: [...project.despesas, { id: uid(), ...entry }] });
    setModal(false);
  };
  const del = id => { onUpdate({ ...project, despesas: project.despesas.filter(d => d.id !== id) }); setConfirmDel(null); };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.4rem" }}>
        <h2 style={{ color: "#e2e8f0", fontFamily: "'Sora',sans-serif", fontSize: "1.3rem", fontWeight: 700, margin: 0 }}>
          Despesas — <span style={{ color: "#a78bfa" }}>{project.nome.split("—")[0].trim()}</span>
        </h2>
        <Btn onClick={openNew}>+ Nova Despesa</Btn>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: "0.8rem", marginBottom: "1.4rem" }}>
        {CATEGORIAS.map(cat => (
          <div key={cat} onClick={() => setFiltro(filtro === cat ? "Todos" : cat)}
            style={{ background: "#0f1117", border: `1px solid ${filtro === cat ? CAT_COLORS[cat] : "#1e2130"}`, borderRadius: "10px", padding: "0.9rem 1rem", cursor: "pointer", borderLeft: `3px solid ${CAT_COLORS[cat]}` }}>
            <div style={{ color: "#64748b", fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "0.25rem" }}>{cat}</div>
            <div style={{ color: CAT_COLORS[cat], fontSize: "1rem", fontWeight: 700 }}>{fmt(catTots[cat]||0)}</div>
          </div>
        ))}
      </div>
      <div style={{ background: "#0f1117", border: "1px solid #1e2130", borderRadius: "12px", overflow: "hidden" }}>
        <div style={{ padding: "0.7rem 1rem", borderBottom: "1px solid #1e2130", display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
          {["Todos", ...CATEGORIAS].map(c => (
            <button key={c} onClick={() => setFiltro(c)} style={{ background: filtro === c ? "#6366f1" : "#1a1d2e", color: filtro === c ? "#fff" : "#94a3b8", border: "none", borderRadius: "6px", padding: "0.3rem 0.75rem", fontSize: "0.77rem", cursor: "pointer", fontWeight: 600, fontFamily: "'Sora',sans-serif" }}>{c}</button>
          ))}
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr style={{ background: "#13151f" }}>
            {["Fornecedor","Categoria","Valor","Ações"].map(h => (
              <th key={h} style={{ padding: "0.85rem 1rem", textAlign: "left", color: "#475569", fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em" }}>{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {filtered.map((d, i) => (
              <tr key={d.id} style={{ borderTop: "1px solid #1a1d2e", background: i % 2 === 0 ? "transparent" : "#0a0c14" }}>
                <td style={{ padding: "0.8rem 1rem", color: "#e2e8f0", fontSize: "0.87rem", fontWeight: 500 }}>{d.fornecedor}</td>
                <td style={{ padding: "0.8rem 1rem" }}>
                  <span style={{ background: `${CAT_COLORS[d.categoria]}18`, color: CAT_COLORS[d.categoria], padding: "0.18rem 0.6rem", borderRadius: "5px", fontSize: "0.78rem", fontWeight: 700 }}>{d.categoria}</span>
                </td>
                <td style={{ padding: "0.8rem 1rem", color: "#fbbf24", fontSize: "0.87rem", fontWeight: 700 }}>{fmt(d.valor)}</td>
                <td style={{ padding: "0.8rem 1rem" }}>
                  <div style={{ display: "flex", gap: "0.35rem" }}>
                    <Btn small variant="secondary" onClick={() => openEdit(d)}>✏️ Editar</Btn>
                    <Btn small variant="danger" onClick={() => setConfirmDel(d.id)}>🗑 Remover</Btn>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <div style={{ padding: "3rem", textAlign: "center", color: "#334155" }}>Nenhuma despesa nesta categoria.</div>}
      </div>
      {modal && (
        <Modal title={editId ? "Editar Despesa" : "Nova Despesa"} onClose={() => setModal(false)}>
          <Input label="Fornecedor" value={form.fornecedor} onChange={s("fornecedor")} placeholder="Nome do fornecedor" />
          <Select label="Categoria" value={form.categoria} onChange={s("categoria")} options={CATEGORIAS} />
          <Input label="Valor (€)" type="number" value={form.valor} onChange={s("valor")} />
          <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
            <Btn variant="secondary" onClick={() => setModal(false)}>Cancelar</Btn>
            <Btn onClick={save} disabled={!form.fornecedor.trim()}>Guardar</Btn>
          </div>
        </Modal>
      )}
      {confirmDel && (
        <Modal title="Confirmar Eliminação" onClose={() => setConfirmDel(null)}>
          <p style={{ color: "#94a3b8", marginBottom: "1.4rem" }}>Remover esta despesa?</p>
          <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
            <Btn variant="secondary" onClick={() => setConfirmDel(null)}>Cancelar</Btn>
            <Btn variant="danger" onClick={() => del(confirmDel)}>Remover</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── Cálculos ─────────────────────────────────────────────────────────────────
function Calculos({ project, onUpdate }) {
  const [edit, setEdit] = useState(false);
  const [form, setForm] = useState({});
  const custo = p => (p.valorCompra||0)+(p.valorRemodelar||0)+(p.despesasExtra||0)+(p.comissaoImob||0)+(p.escritura||0)+(p.imt||0)+(p.emprestimoBanco||0)+(p.imposto||0);
  const lucro = p => (p.valorVenda||0) - custo(p);
  const lucroLiq = p => lucro(p) - (p.imposto||0);
  const save = () => {
    const fields = ["valorCompra","valorVenda","valorRemodelar","despesasExtra","comissaoImob","escritura","imt","emprestimoBanco","imposto","seguroVida","meses"];
    const parsed = {}; fields.forEach(k => { parsed[k] = parseFloat(form[k])||0; });
    onUpdate({ ...project, ...parsed }); setEdit(false);
  };
  const s = k => e => setForm(p => ({ ...p, [k]: e.target.value }));
  const p = project;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.4rem" }}>
        <h2 style={{ color: "#e2e8f0", fontFamily: "'Sora',sans-serif", fontSize: "1.3rem", fontWeight: 700, margin: 0 }}>
          Cálculos — <span style={{ color: "#a78bfa" }}>{p.nome.split("—")[0].trim()}</span>
        </h2>
        <Btn onClick={() => { setForm({ ...p }); setEdit(true); }}>✏️ Editar Valores</Btn>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(165px,1fr))", gap: "0.9rem", marginBottom: "1.8rem" }}>
        <StatCard label="Custo Total" value={fmt(custo(p))} accent="#f59e0b" />
        <StatCard label="Valor de Venda" value={fmt(p.valorVenda)} accent="#10b981" />
        <StatCard label="Lucro Bruto" value={fmt(lucro(p))} accent={lucro(p) > 0 ? "#10b981" : "#ef4444"} />
        <StatCard label="Lucro Líquido" value={fmt(lucroLiq(p))} accent={lucroLiq(p) > 0 ? "#10b981" : "#ef4444"} />
        <StatCard label="Por Sócio (÷3)" value={fmt(lucroLiq(p) / 3)} accent="#8b5cf6" />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.4rem" }}>
        <div style={{ background: "#0f1117", border: "1px solid #1e2130", borderRadius: "12px", padding: "1.3rem" }}>
          <div style={{ color: "#64748b", fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "1rem" }}>Decomposição de Custos</div>
          {[["Valor de Compra",p.valorCompra,"#f59e0b"],["Remodelação",p.valorRemodelar,"#f59e0b"],["Despesas Extra",p.despesasExtra,"#f59e0b"],["Comissão Imob.",p.comissaoImob,"#f59e0b"],["Escritura",p.escritura,"#f59e0b"],["IMT",p.imt,"#f59e0b"],["Empréstimo Banco",p.emprestimoBanco,"#f59e0b"],["IRC / Impostos",p.imposto,"#ef4444"]].map(([l,v,c]) => (
            <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "0.55rem 0", borderBottom: "1px solid #1a1d2e" }}>
              <span style={{ color: "#94a3b8", fontSize: "0.85rem" }}>{l}</span>
              <span style={{ color: c, fontSize: "0.85rem", fontWeight: 600 }}>{fmt(v)}</span>
            </div>
          ))}
          <div style={{ display: "flex", justifyContent: "space-between", paddingTop: "0.7rem" }}>
            <span style={{ color: "#e2e8f0", fontSize: "0.92rem", fontWeight: 700 }}>TOTAL</span>
            <span style={{ color: "#f59e0b", fontSize: "0.92rem", fontWeight: 700 }}>{fmt(custo(p))}</span>
          </div>
        </div>
        <div style={{ background: "#0f1117", border: "1px solid #1e2130", borderRadius: "12px", padding: "1.3rem" }}>
          <div style={{ color: "#64748b", fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "1rem" }}>Resultado Final</div>
          {[["Valor de Venda",fmt(p.valorVenda),"#10b981"],["(-) Custo Total",fmt(custo(p)),"#ef4444"],["Lucro Bruto",fmt(lucro(p)),lucro(p)>0?"#10b981":"#ef4444"],["(-) IRC",fmt(p.imposto),"#ef4444"],["Lucro Líquido",fmt(lucroLiq(p)),lucroLiq(p)>0?"#10b981":"#ef4444"]].map(([l,v,c]) => (
            <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "0.65rem 0.9rem", background: "#1a1d2e", borderRadius: "7px", marginBottom: "0.45rem" }}>
              <span style={{ color: "#94a3b8", fontSize: "0.87rem" }}>{l}</span>
              <span style={{ color: c, fontWeight: 700, fontSize: "0.9rem" }}>{v}</span>
            </div>
          ))}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.7rem 0.9rem", background: "linear-gradient(135deg,#6366f115,#8b5cf615)", borderRadius: "8px", border: "1px solid #6366f135", marginTop: "0.5rem" }}>
            <span style={{ color: "#e2e8f0", fontSize: "0.9rem", fontWeight: 600 }}>Por Sócio (÷3)</span>
            <span style={{ color: "#a78bfa", fontWeight: 700, fontSize: "1.05rem" }}>{fmt(lucroLiq(p) / 3)}</span>
          </div>
        </div>
      </div>
      {edit && (
        <Modal title="Editar Valores do Projeto" onClose={() => setEdit(false)} wide>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 1rem" }}>
            {[["Valor de Compra (€)","valorCompra"],["Valor de Venda (€)","valorVenda"],["Remodelação (€)","valorRemodelar"],["Despesas Extra (€)","despesasExtra"],["Comissão Imob. (€)","comissaoImob"],["Escritura (€)","escritura"],["IMT (€)","imt"],["Empréstimo Banco (€)","emprestimoBanco"],["IRC / Impostos (€)","imposto"],["Seguro de Vida (€/mês)","seguroVida"],["Nº de Meses","meses"]].map(([l,k]) => (
              <Input key={k} label={l} type="number" value={form[k]||""} onChange={s(k)} />
            ))}
          </div>
          <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
            <Btn variant="secondary" onClick={() => setEdit(false)}>Cancelar</Btn>
            <Btn onClick={save}>Guardar</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── Setup Modal ──────────────────────────────────────────────────────────────
function FirebaseSetup({ onSave }) {
  const [url, setUrl] = useState("");
  return (
    <Modal title="🔥 Configurar Firebase (Sincronização em Tempo Real)" onClose={() => {}} wide>
      <div style={{ background: "#1a1d2e", borderRadius: "10px", padding: "1.2rem", marginBottom: "1.4rem", borderLeft: "3px solid #f59e0b" }}>
        <div style={{ color: "#f59e0b", fontSize: "0.8rem", fontWeight: 700, marginBottom: "0.8rem" }}>📋 COMO CONFIGURAR (5 minutos, gratuito)</div>
        {[
          ["1", "Vai a", "console.firebase.google.com", "https://console.firebase.google.com"],
          ["2", "Clica \"Add project\" → dá um nome (ex: vertex-app) → Continue"],
          ["3", "No menu lateral: Build → Realtime Database → Create database"],
          ["4", "Escolhe \"Start in test mode\" → Enable"],
          ["5", "Copia o URL da base de dados (ex: https://vertex-app-default-rtdb.europe-west1.firebasedatabase.app)"],
        ].map(([n, text, link, href]) => (
          <div key={n} style={{ display: "flex", gap: "0.6rem", marginBottom: "0.5rem", alignItems: "flex-start" }}>
            <span style={{ background: "#f59e0b", color: "#000", borderRadius: "50%", width: "18px", height: "18px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.7rem", fontWeight: 800, flexShrink: 0, marginTop: "1px" }}>{n}</span>
            <span style={{ color: "#94a3b8", fontSize: "0.85rem" }}>
              {text} {link && <a href={href} target="_blank" rel="noreferrer" style={{ color: "#6366f1" }}>{link}</a>}
            </span>
          </div>
        ))}
      </div>
      <Input label="URL da Realtime Database" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://SEU-PROJETO-default-rtdb.europe-west1.firebasedatabase.app" />
      <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
        <Btn variant="secondary" onClick={() => onSave(null)}>Usar sem sincronização</Btn>
        <Btn onClick={() => url.trim() && onSave(url.trim())} disabled={!url.includes("firebasedatabase.app")}>Ligar Firebase</Btn>
      </div>
    </Modal>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [projects, setProjects] = useState(defaultProjects);
  const [activeProject, setActiveProject] = useState(1);
  const [tab, setTab] = useState("dashboard");
  const [newProjModal, setNewProjModal] = useState(false);
  const [newProjForm, setNewProjForm] = useState({ nome: "", descricao: "" });
  const [toast, setToast] = useState(null);
  const [confirmDelProj, setConfirmDelProj] = useState(null);
  const [firebaseUrl, setFirebaseUrl] = useState(null);
  const [showSetup, setShowSetup] = useState(false);
  const [syncStatus, setSyncStatus] = useState("unconfigured");
  const isSyncing = useRef(false);
  const localChange = useRef(false);

  // On mount: check if firebase was already configured
  useEffect(() => {
    try {
      window.storage?.get("vertex_firebase_url").then(r => {
        if (r?.value && r.value !== "null") setFirebaseUrl(r.value);
        else setShowSetup(true);
      }).catch(() => setShowSetup(true));
    } catch { setShowSetup(true); }
  }, []);

  // When Firebase URL changes, start listening
  useEffect(() => {
    if (!firebaseUrl) return;
    setSyncStatus("syncing");

    // Initial load
    fbGet("projects").then(data => {
      if (data && Array.isArray(data) && data.length > 0) {
        setProjects(data);
        setActiveProject(data[0].id);
      } else {
        // First time: push default data
        fbSet("projects", defaultProjects);
      }
      setSyncStatus("connected");
    });

    // Start polling
    const stop = fbListen("projects", (data) => {
      if (localChange.current) { localChange.current = false; return; }
      if (data && Array.isArray(data) && data.length > 0) {
        setProjects(data);
        setSyncStatus("connected");
      }
    });

    return stop;
  }, [firebaseUrl]);

  const saveToFirebase = async (newProjects) => {
    if (!firebaseUrl) return;
    localChange.current = true;
    setSyncStatus("syncing");
    await fbSet("projects", newProjects);
    setSyncStatus("connected");
  };

  const project = projects.find(p => p.id === activeProject);
  const showToast = (msg, type = "success") => setToast({ msg, type });

  const updateProject = updated => {
    const next = projects.map(p => p.id === updated.id ? updated : p);
    setProjects(next);
    saveToFirebase(next);
    showToast("Guardado e sincronizado");
  };

  const renameProject = (id, nome) => {
    const next = projects.map(p => p.id === id ? { ...p, nome } : p);
    setProjects(next);
    saveToFirebase(next);
    showToast("Nome atualizado");
  };

  const addProject = () => {
    const np = { id: uid(), nome: newProjForm.nome, descricao: newProjForm.descricao, valorCompra: 0, valorVenda: 0, valorRemodelar: 0, despesasExtra: 0, comissaoImob: 0, escritura: 0, imt: 0, emprestimoBanco: 0, imposto: 0, seguroVida: 0, meses: 0, faturas: [], despesas: [] };
    const next = [...projects, np];
    setProjects(next); setActiveProject(np.id); setTab("calculos");
    setNewProjModal(false); setNewProjForm({ nome: "", descricao: "" });
    saveToFirebase(next);
    showToast("Projeto criado");
  };

  const deleteProject = id => {
    const rem = projects.filter(p => p.id !== id);
    setProjects(rem);
    if (activeProject === id && rem.length) setActiveProject(rem[0].id);
    setConfirmDelProj(null);
    saveToFirebase(rem);
    showToast("Projeto eliminado");
  };

  const handleFirebaseSetup = async (url) => {
    setShowSetup(false);
    if (!url) { setSyncStatus("unconfigured"); return; }
    try { await window.storage?.set("vertex_firebase_url", url); } catch {}
    setFirebaseUrl(url);
  };

  const TABS = [
    { id: "dashboard", label: "Dashboard", icon: "◈" },
    { id: "faturas",   label: "Faturas",   icon: "🧾" },
    { id: "despesas",  label: "Despesas",  icon: "💸" },
    { id: "calculos",  label: "Cálculos",  icon: "📐" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#080a10", fontFamily: "'Sora','Segoe UI',sans-serif", color: "#e2e8f0" }}>
      <link href="https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />

      {showSetup && <FirebaseSetup onSave={handleFirebaseSetup} />}

      {/* Header */}
      <div style={{ background: "#0a0c14", borderBottom: "1px solid #1e2130", padding: "0 1.2rem", display: "flex", alignItems: "center", justifyContent: "space-between", height: "56px", gap: "0.8rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.65rem", flexShrink: 0 }}>
          <div style={{ width: "30px", height: "30px", background: "linear-gradient(135deg,#6366f1,#8b5cf6)", borderRadius: "7px", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: "0.95rem", color: "#fff" }}>V</div>
          <span style={{ fontWeight: 700, fontSize: "1rem" }}>Vertex</span>
          <span style={{ color: "#334155", fontSize: "0.82rem" }}>Contabilidade</span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", overflowX: "auto", flex: 1, justifyContent: "center" }}>
          {projects.map(p => (
            <div key={p.id} style={{ display: "flex", alignItems: "center", gap: "0.25rem", background: activeProject === p.id ? "#6366f118" : "transparent", border: `1px solid ${activeProject === p.id ? "#6366f140" : "transparent"}`, borderRadius: "8px", padding: "0.28rem 0.5rem" }}>
              <button onClick={() => setActiveProject(p.id)} style={{ background: "none", border: "none", color: activeProject === p.id ? "#a78bfa" : "#64748b", fontSize: "0.82rem", fontWeight: 600, cursor: "pointer", fontFamily: "'Sora',sans-serif", padding: 0 }}>
                {p.nome.split("—")[0].trim()}
              </button>
              {activeProject === p.id && projects.length > 1 && (
                <button onClick={() => setConfirmDelProj(p.id)} style={{ background: "none", border: "none", color: "#475569", cursor: "pointer", fontSize: "0.9rem", padding: "0 1px", lineHeight: 1 }} title="Eliminar projeto">×</button>
              )}
            </div>
          ))}
          <Btn small onClick={() => setNewProjModal(true)}>+ Projeto</Btn>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexShrink: 0 }}>
          <SyncDot status={syncStatus} />
          {syncStatus === "unconfigured" && (
            <Btn small variant="ghost" onClick={() => setShowSetup(true)}>⚡ Ligar Firebase</Btn>
          )}
        </div>
      </div>

      <div style={{ display: "flex", minHeight: "calc(100vh - 56px)" }}>
        {/* Sidebar */}
        <div style={{ width: "190px", background: "#0a0c14", borderRight: "1px solid #1e2130", padding: "1.1rem 0.7rem", flexShrink: 0, position: "relative" }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{ width: "100%", display: "flex", alignItems: "center", gap: "0.55rem", background: tab === t.id ? "#6366f113" : "transparent", color: tab === t.id ? "#a78bfa" : "#64748b", border: tab === t.id ? "1px solid #6366f128" : "1px solid transparent", borderRadius: "8px", padding: "0.65rem 0.85rem", fontSize: "0.85rem", fontWeight: tab === t.id ? 700 : 500, cursor: "pointer", marginBottom: "0.25rem", textAlign: "left", fontFamily: "'Sora',sans-serif" }}>
              <span style={{ fontSize: "1rem" }}>{t.icon}</span> {t.label}
            </button>
          ))}

          {project && tab !== "dashboard" && (
            <div style={{ marginTop: "1.5rem", padding: "0.9rem 0.75rem", background: "#1a1d2e", borderRadius: "8px" }}>
              <div style={{ color: "#475569", fontSize: "0.67rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "0.5rem" }}>Projeto atual</div>
              <ProjectNameEditor name={project.nome} onSave={nome => renameProject(project.id, nome)} />
              {project.descricao && <div style={{ color: "#475569", fontSize: "0.73rem", marginTop: "0.5rem", lineHeight: 1.4 }}>{project.descricao}</div>}
            </div>
          )}

          {/* Sync status in sidebar */}
          <div style={{ position: "absolute", bottom: "1.2rem", left: "0.7rem", right: "0.7rem" }}>
            <div style={{ padding: "0.7rem 0.8rem", background: "#0f1117", borderRadius: "8px", border: "1px solid #1e2130" }}>
              <div style={{ color: "#475569", fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "0.4rem" }}>Sincronização</div>
              <SyncDot status={syncStatus} />
              {syncStatus === "connected" && <div style={{ color: "#334155", fontSize: "0.68rem", marginTop: "0.4rem" }}>Atualiza a cada 3 segundos</div>}
              {syncStatus === "unconfigured" && (
                <button onClick={() => setShowSetup(true)} style={{ background: "none", border: "none", color: "#6366f1", fontSize: "0.72rem", cursor: "pointer", padding: 0, marginTop: "0.4rem", fontFamily: "'Sora',sans-serif", fontWeight: 600 }}>
                  Configurar →
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Main content */}
        <div style={{ flex: 1, padding: "1.8rem 2rem", overflowY: "auto" }}>
          {tab === "dashboard" && <Dashboard projects={projects} />}
          {tab === "faturas"   && project && <Faturas   project={project} onUpdate={updateProject} />}
          {tab === "despesas"  && project && <Despesas  project={project} onUpdate={updateProject} />}
          {tab === "calculos"  && project && <Calculos  project={project} onUpdate={updateProject} />}
          {tab !== "dashboard" && !project && <div style={{ color: "#334155", textAlign: "center", marginTop: "5rem" }}>Seleciona um projeto no topo.</div>}
        </div>
      </div>

      {newProjModal && (
        <Modal title="Novo Projeto Imobiliário" onClose={() => setNewProjModal(false)}>
          <Input label="Nome do Projeto" value={newProjForm.nome} onChange={e => setNewProjForm(p => ({ ...p, nome: e.target.value }))} placeholder="IMO-2 — Rua das Flores nº5" />
          <Input label="Descrição (opcional)" value={newProjForm.descricao} onChange={e => setNewProjForm(p => ({ ...p, descricao: e.target.value }))} placeholder="Moradia T3, 120m²..." />
          <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
            <Btn variant="secondary" onClick={() => setNewProjModal(false)}>Cancelar</Btn>
            <Btn onClick={addProject} disabled={!newProjForm.nome.trim()}>Criar Projeto</Btn>
          </div>
        </Modal>
      )}

      {confirmDelProj && (
        <Modal title="Eliminar Projeto" onClose={() => setConfirmDelProj(null)}>
          <p style={{ color: "#94a3b8", marginBottom: "1.4rem" }}>
            Tens a certeza que queres eliminar <strong style={{ color: "#e2e8f0" }}>{projects.find(p => p.id === confirmDelProj)?.nome}</strong>?<br />
            Todas as faturas e despesas serão apagadas.
          </p>
          <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
            <Btn variant="secondary" onClick={() => setConfirmDelProj(null)}>Cancelar</Btn>
            <Btn variant="danger" onClick={() => deleteProject(confirmDelProj)}>Eliminar</Btn>
          </div>
        </Modal>
      )}

      {toast && <Toast msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />}
    </div>
  );
}
