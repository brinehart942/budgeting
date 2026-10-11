import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRightLeft,
  BadgeCheck,
  Banknote,
  Briefcase,
  Building2,
  Car,
  CheckCircle2,
  Coffee,
  Gauge,
  Gift,
  Heart,
  Home,
  Info,
  LayoutDashboard,
  Link2,
  Palette,
  PiggyBank,
  Plus,
  RotateCcw,
  Scale,
  ShieldCheck,
  Sparkles,
  Trash2,
  TrendingUp,
  User,
  Users,
  Wallet,
  Check,
  Download,
  FileJson,
  FileSpreadsheet,
  FolderOpen,
  Printer,
  Save,
  Share2,
  Upload,
  X,
} from 'lucide-react';

/* ============================================================================
 * Couple Budget — "Yours, Mine & Ours" rent affordability + budgeting engine
 * Single-file React component. Requires Tailwind CSS + lucide-react.
 * ==========================================================================*/

// ---------------------------------------------------------------------------
// Constants & defaults
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'couple-budget-v1';
const SCENARIOS_KEY = 'couple-budget-scenarios-v1';
const RENT_MIN = 1800;
const RENT_MAX = 4500;
const LANDLORD_MULTIPLE = 40;
const CATEGORIES = ['needs', 'wants', 'savings'];

const CAT_META = {
  needs: {
    label: 'Needs',
    text: 'text-indigo-300',
    bar: 'bg-indigo-500',
    soft: 'bg-indigo-500/10 text-indigo-300 ring-indigo-500/30',
    dot: 'bg-indigo-400',
  },
  wants: {
    label: 'Wants',
    text: 'text-violet-300',
    bar: 'bg-violet-500',
    soft: 'bg-violet-500/10 text-violet-300 ring-violet-500/30',
    dot: 'bg-violet-400',
  },
  savings: {
    label: 'Savings',
    text: 'text-emerald-300',
    bar: 'bg-emerald-500',
    soft: 'bg-emerald-500/10 text-emerald-300 ring-emerald-500/30',
    dot: 'bg-emerald-400',
  },
};

let idCounter = 0;
const uid = (prefix = 'id') => `${prefix}-${Date.now().toString(36)}-${(idCounter++).toString(36)}`;

const makeSharedDefaults = () => [
  { id: 'rent', name: 'Base Rent', category: 'needs', amount: 2900, linked: 'rent' },
  { id: 'electric', name: 'Electric / Gas', category: 'needs', amount: 150 },
  { id: 'water', name: 'Water / Trash', category: 'needs', amount: 75 },
  { id: 'internet', name: 'Internet', category: 'needs', amount: 70 },
  { id: 'renters', name: "Renter's Insurance", category: 'needs', amount: 25 },
  { id: 'consumables', name: 'Household Consumables', category: 'needs', amount: 50 },
  { id: 'maintenance', name: 'Maintenance Fund', category: 'needs', amount: 50 },
  { id: 'groceries', name: 'Groceries', category: 'needs', amount: 600 },
  { id: 'dates', name: 'Date Nights', category: 'wants', amount: 400 },
  { id: 'streaming', name: 'Streaming', category: 'wants', amount: 45 },
  { id: 'outings', name: 'Weekend Outings', category: 'wants', amount: 150 },
  { id: 'travel', name: 'Joint Travel Fund', category: 'wants', amount: 350 },
  { id: 'jointEF', name: 'Joint Apartment Emergency Fund', category: 'savings', amount: 300 },
];

const makePersonalDefaults = (amounts) => [
  { id: uid('p'), name: 'Commute / Gas & Auto Insurance', category: 'needs', amount: amounts[0], icon: 'car' },
  { id: uid('p'), name: 'Solo Work Lunches / Coffee', category: 'wants', amount: amounts[1], icon: 'coffee' },
  { id: uid('p'), name: '"No-Questions-Asked" Fun Money', category: 'wants', amount: amounts[2], icon: 'sparkles' },
  { id: uid('p'), name: 'Personal Hobbies / Shopping', category: 'wants', amount: amounts[3], icon: 'palette' },
  { id: uid('p'), name: 'Roth IRA / Brokerage Investing', category: 'savings', amount: amounts[4], icon: 'trending' },
];

const makeDefaults = () => ({
  names: { p1: 'Partner 1', p2: 'Partner 2' },
  income: {
    p1Base: { gross: 83000, ded: 24 },
    p1Comm: { gross: 10000, ded: 28 },
    p1Bonus: { gross: 10000, ded: 28 },
    p2Base: { gross: 70000, ded: 23 },
    p2Comm: { gross: 0, ded: 28 },
  },
  includeCommission: true,
  includeBonus: false,
  splitMode: 'proportional', // 'proportional' | 'equal'
  rent: 2900,
  utilities: 320,
  targets: { needs: 50, wants: 30, savings: 20 },
  shared: makeSharedDefaults(),
  personal: {
    p1: makePersonalDefaults([250, 200, 300, 250, 600]),
    p2: makePersonalDefaults([220, 150, 250, 200, 500]),
  },
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const clamp = (n, lo = -Infinity, hi = Infinity) => Math.min(hi, Math.max(lo, n));
const safeDiv = (a, b) => (b ? a / b : 0);
const netMonthly = (src) => (src.gross * (1 - src.ded / 100)) / 12;

const usd0 = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const fmt = (n) => usd0.format(Math.round(n || 0));
const fmtSigned = (n) => `${n >= 0 ? '+' : '−'}${usd0.format(Math.abs(Math.round(n || 0)))}`;
const pct = (n, digits = 1) => `${((n || 0) * 100).toFixed(digits)}%`;
const pctSigned = (n, digits = 1) => `${n >= 0 ? '+' : '−'}${Math.abs((n || 0) * 100).toFixed(digits)} pts`;

/** Merge a saved/imported state over the defaults so older or partial files still load. */
function normalizeState(saved) {
  const defaults = makeDefaults();
  if (!saved || typeof saved !== 'object') return defaults;
  return {
    ...defaults,
    ...saved,
    names: { ...defaults.names, ...saved.names },
    income: { ...defaults.income, ...saved.income },
    targets: { ...defaults.targets, ...saved.targets },
    personal: { ...defaults.personal, ...saved.personal },
    shared: Array.isArray(saved.shared) ? saved.shared : defaults.shared,
  };
}

function loadState() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? normalizeState(JSON.parse(raw)) : makeDefaults();
  } catch {
    return makeDefaults();
  }
}

function loadScenarios() {
  try {
    const list = JSON.parse(window.localStorage.getItem(SCENARIOS_KEY) || '[]');
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Save / export helpers
// ---------------------------------------------------------------------------

const EXPORT_APP = 'couple-budget';
const EXPORT_VERSION = 1;

/** Accepts either a full export envelope or a bare state object. Throws if it doesn't look like ours. */
function parseImport(text) {
  const parsed = JSON.parse(text);
  const data = parsed && parsed.app === EXPORT_APP ? parsed.state : parsed;
  if (!data || typeof data !== 'object' || !data.income || !Array.isArray(data.shared)) {
    throw new Error('This file is not a Couple Budget backup.');
  }
  return {
    state: normalizeState(data),
    scenarios: parsed && Array.isArray(parsed.scenarios) ? parsed.scenarios : null,
  };
}

function downloadFile(filename, content, type) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const dateStamp = () => new Date().toISOString().slice(0, 10);

function clearHash() {
  try {
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
  } catch {
    /* ignore */
  }
}

// Share links carry the whole state in the URL hash (never sent to a server).
const encodeShare = (state) => {
  const bytes = new TextEncoder().encode(JSON.stringify(state));
  let bin = '';
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};
const decodeShare = (str) => {
  const bin = atob(str.replace(/-/g, '+').replace(/_/g, '/'));
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(bytes));
};

function buildCsv(state, m) {
  const n1 = state.names.p1 || 'Partner 1';
  const n2 = state.names.p2 || 'Partner 2';
  const cell = (v) => {
    const s = typeof v === 'number' ? v.toFixed(2) : String(v ?? '');
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const rows = [['Section', 'Line item', 'Category', 'Monthly', n1, n2]];
  m.shared.forEach((i) =>
    rows.push(['Shared', i.name, CAT_META[i.category].label, i.amount, i.amount * m.p1Share, i.amount * m.p2Share])
  );
  rows.push(['Shared', 'TOTAL JOINT TRANSFER', '', m.sharedTotal, m.p1.transfer, m.p2.transfer]);
  rows.push([]);
  [
    ['p1', n1],
    ['p2', n2],
  ].forEach(([k, name]) => {
    state.personal[k].forEach((i) => rows.push([`${name} personal`, i.name, CAT_META[i.category].label, i.amount]));
    rows.push([`${name} personal`, 'TOTAL', '', m[k].personalTotal]);
  });
  rows.push([]);
  rows.push(['Summary', 'Metric', '', 'Household', n1, n2]);
  [
    ['Net take-home / mo', m.combinedNet, m.p1.net, m.p2.net],
    ['Split share', '', `${(m.p1Share * 100).toFixed(1)}%`, `${(m.p2Share * 100).toFixed(1)}%`],
    ['Joint transfer / mo', m.sharedTotal, m.p1.transfer, m.p2.transfer],
    ['Personal budget / mo', m.p1.personalTotal + m.p2.personalTotal, m.p1.personalTotal, m.p2.personalTotal],
    ['Unallocated buffer / mo', m.surplus, m.p1.buffer, m.p2.buffer],
    ['Rent', state.rent],
    ['Utilities (burden calc)', state.utilities],
    ['Housing net burden', `${(m.burden * 100).toFixed(1)}%`],
    ['40x rent ceiling', m.ceiling40],
    ['Split mode', state.splitMode === 'equal' ? '50/50' : 'Proportional'],
    ['Commission included', state.includeCommission ? 'Yes' : 'No'],
    ['Bonus included', state.includeBonus ? 'Yes' : 'No'],
  ].forEach(([label, ...vals]) => rows.push(['Summary', label, '', ...vals]));
  rows.push([]);
  rows.push(['50/30/20', 'Category', 'Target %', 'Target $', 'Allocated $', 'Actual %']);
  m.rule.forEach((r) =>
    rows.push(['50/30/20', CAT_META[r.key].label, `${r.pctTarget}%`, r.target, r.allocated, `${(r.pctActual * 100).toFixed(1)}%`])
  );
  return rows.map((r) => r.map(cell).join(',')).join('\n');
}

/** A light, print-friendly HTML report (the app itself is dark-themed, which prints poorly). */
function buildReportHtml(state, m) {
  const n1 = state.names.p1 || 'Partner 1';
  const n2 = state.names.p2 || 'Partner 2';
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const tr = (cells, tag = 'td') => `<tr>${cells.map((c) => `<${tag}>${esc(c)}</${tag}>`).join('')}</tr>`;
  const sharedRows = m.shared
    .map((i) => tr([i.name, CAT_META[i.category].label, fmt(i.amount), fmt(i.amount * m.p1Share), fmt(i.amount * m.p2Share)]))
    .join('');
  const personal = (k, name) =>
    `<h3>${esc(name)} — personal</h3><table>${tr(['Line item', 'Category', 'Monthly'], 'th')}${state.personal[k]
      .map((i) => tr([i.name, CAT_META[i.category].label, fmt(i.amount)]))
      .join('')}${tr(['Total', '', fmt(m[k].personalTotal)], 'th')}</table>`;
  return `<!doctype html><html><head><meta charset="utf-8"><title>Couple Budget — ${dateStamp()}</title>
<style>
body{font:13px/1.45 system-ui,-apple-system,Segoe UI,sans-serif;color:#0f172a;margin:32px;max-width:820px}
h1{font-size:22px;margin:0}h2{font-size:15px;margin:28px 0 8px;border-bottom:2px solid #e2e8f0;padding-bottom:4px}
h3{font-size:13px;margin:16px 0 6px}.muted{color:#64748b}
.kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:16px}
.kpi{border:1px solid #e2e8f0;border-radius:8px;padding:8px 10px}.kpi b{display:block;font-size:17px}
table{width:100%;border-collapse:collapse}td,th{padding:4px 6px;border-bottom:1px solid #f1f5f9;text-align:left}
td:nth-child(n+3),th:nth-child(n+3){text-align:right}th{background:#f8fafc}
.cols{display:grid;grid-template-columns:1fr 1fr;gap:16px}@media print{body{margin:12mm}}
</style></head><body>
<h1>Couple Budget &amp; Rent Affordability</h1>
<div class="muted">${esc(n1)} &amp; ${esc(n2)} · generated ${new Date().toLocaleDateString()}</div>
<div class="kpis">
<div class="kpi">Rent<b>${fmt(state.rent)}</b></div>
<div class="kpi">Housing burden<b>${pct(m.burden)}</b>${BURDEN_META[m.burdenTier].label}</div>
<div class="kpi">40x ceiling<b>${fmt(m.ceiling40)}</b>${m.passes40 ? 'Approval verified' : 'Below 40x'}</div>
<div class="kpi">Household surplus<b>${fmtSigned(m.surplus)}</b>per month</div>
</div>
<h2>Cash flow</h2><table>
${tr(['', '', n1, n2], 'th')}
${tr(['Net take-home', '', fmt(m.p1.net), fmt(m.p2.net)])}
${tr(['Split share', '', pct(m.p1Share), pct(m.p2Share)])}
${tr(['Joint transfer', '', fmt(m.p1.transfer), fmt(m.p2.transfer)])}
${tr(['Personal budget', '', fmt(m.p1.personalTotal), fmt(m.p2.personalTotal)])}
${tr(['Unallocated buffer', '', fmtSigned(m.p1.buffer), fmtSigned(m.p2.buffer)], 'th')}
</table>
<p class="muted">Split mode: ${state.splitMode === 'equal' ? '50 / 50' : 'proportional to net income'} · commission ${
    state.includeCommission ? 'included' : 'held out'
  } · bonus ${state.includeBonus ? 'included' : 'not budgeted'}</p>
<h2>Shared joint account</h2><table>
${tr(['Line item', 'Category', 'Monthly', n1, n2], 'th')}${sharedRows}
${tr(['Total', '', fmt(m.sharedTotal), fmt(m.p1.transfer), fmt(m.p2.transfer)], 'th')}</table>
<h2>Personal budgets</h2><div class="cols"><div>${personal('p1', n1)}</div><div>${personal('p2', n2)}</div></div>
<h2>50 / 30 / 20 check</h2><table>
${tr(['Category', 'Target %', 'Target', 'Allocated', 'Actual %'], 'th')}
${m.rule.map((r) => tr([CAT_META[r.key].label, `${r.pctTarget}%`, fmt(r.target), fmt(r.allocated), pct(r.pctActual)])).join('')}
</table>
<p class="muted" style="margin-top:24px">Estimates only. Net figures use the entered deduction percentages, not a full tax calculation.</p>
<script>window.onload=()=>setTimeout(()=>window.print(),250)</script>
</body></html>`;
}

/** Linked 3-way sliders: set one key, redistribute the remainder proportionally across the other two. */
function rebalanceTargets(targets, key, raw) {
  const value = clamp(Math.round(raw), 0, 100);
  const [a, b] = CATEGORIES.filter((k) => k !== key);
  const remaining = 100 - value;
  const otherSum = targets[a] + targets[b];
  const aVal = Math.round(otherSum === 0 ? remaining / 2 : (remaining * targets[a]) / otherSum);
  return { ...targets, [key]: value, [a]: aVal, [b]: remaining - aVal };
}

const sumBy = (items, cat) =>
  items.filter((i) => !cat || i.category === cat).reduce((s, i) => s + (Number(i.amount) || 0), 0);

// ---------------------------------------------------------------------------
// Core financial engine — pure function so we can run "what-if" scenarios
// ---------------------------------------------------------------------------

function computeModel(s) {
  const { income, includeCommission, includeBonus, splitMode, rent, utilities } = s;

  // A. Income & tax model
  const nets = {
    p1Base: netMonthly(income.p1Base),
    p1Comm: netMonthly(income.p1Comm),
    p1Bonus: netMonthly(income.p1Bonus),
    p2Base: netMonthly(income.p2Base),
    p2Comm: netMonthly(income.p2Comm),
  };
  const p1Net = nets.p1Base + (includeCommission ? nets.p1Comm : 0) + (includeBonus ? nets.p1Bonus : 0);
  const p2Net = nets.p2Base + nets.p2Comm;
  const combinedNet = p1Net + p2Net;
  const heldOut = (includeCommission ? 0 : nets.p1Comm) + (includeBonus ? 0 : nets.p1Bonus);

  const p1Gross =
    income.p1Base.gross + (includeCommission ? income.p1Comm.gross : 0) + (includeBonus ? income.p1Bonus.gross : 0);
  const p2Gross = income.p2Base.gross + income.p2Comm.gross;
  const combinedGross = p1Gross + p2Gross;

  // Split ratios
  const proportionalShare = safeDiv(p1Net, combinedNet);
  const p1Share = splitMode === 'equal' ? 0.5 : proportionalShare;
  const p2Share = 1 - p1Share;
  const ratios = {
    active: p1Share,
    baseOnly: safeDiv(nets.p1Base, nets.p1Base + nets.p2Base),
    baseComm: safeDiv(nets.p1Base + nets.p1Comm, nets.p1Base + nets.p1Comm + nets.p2Base + nets.p2Comm),
    equal: 0.5,
  };

  // B. Rent affordability engine
  const ceiling40 = combinedGross / LANDLORD_MULTIPLE;
  const passes40 = rent <= ceiling40;
  const housingCost = rent + utilities;
  const burden = safeDiv(housingCost, combinedNet);
  const burdenTier = burden < 0.3 ? 'safe' : burden <= 0.35 ? 'moderate' : 'high';

  // D. Shared expenses (rent line is linked to the slider)
  const shared = s.shared.map((i) => (i.linked === 'rent' ? { ...i, amount: rent } : i));
  const sharedByCat = Object.fromEntries(CATEGORIES.map((c) => [c, sumBy(shared, c)]));
  const sharedTotal = sumBy(shared);
  const p1Transfer = sharedTotal * p1Share;
  const p2Transfer = sharedTotal * p2Share;

  const person = (key, net, transfer) => {
    const items = s.personal[key];
    const byCat = Object.fromEntries(CATEGORIES.map((c) => [c, sumBy(items, c)]));
    const personalTotal = sumBy(items);
    const discretionary = net - transfer;
    return {
      net,
      transfer,
      discretionary,
      byCat,
      personalTotal,
      buffer: discretionary - personalTotal,
      sharedByCat: Object.fromEntries(
        CATEGORIES.map((c) => [c, sharedByCat[c] * (key === 'p1' ? p1Share : p2Share)])
      ),
    };
  };
  const p1 = person('p1', p1Net, p1Transfer);
  const p2 = person('p2', p2Net, p2Transfer);

  // C. 50/30/20 engine (household-wide: shared + both personal budgets)
  const rule = CATEGORIES.map((c) => {
    const target = (combinedNet * s.targets[c]) / 100;
    const allocated = sharedByCat[c] + p1.byCat[c] + p2.byCat[c];
    return { key: c, pctTarget: s.targets[c], target, allocated, pctActual: safeDiv(allocated, combinedNet) };
  });
  const totalAllocated = rule.reduce((acc, r) => acc + r.allocated, 0);
  const unallocated = combinedNet - totalAllocated;

  return {
    nets,
    p1Net,
    p2Net,
    combinedNet,
    combinedGross,
    heldOut,
    p1Share,
    p2Share,
    ratios,
    ceiling40,
    passes40,
    housingCost,
    burden,
    burdenTier,
    shared,
    sharedByCat,
    sharedTotal,
    p1,
    p2,
    rule,
    totalAllocated,
    unallocated,
    surplus: p1.buffer + p2.buffer,
  };
}

// ---------------------------------------------------------------------------
// UI primitives
// ---------------------------------------------------------------------------

function Card({ title, subtitle, icon: Icon, action, className = '', children }) {
  return (
    <section
      className={`rounded-2xl border border-slate-800 bg-slate-900/60 shadow-xl shadow-black/20 backdrop-blur ${className}`}
    >
      {(title || action) && (
        <header className="flex items-start justify-between gap-3 border-b border-slate-800/80 px-5 py-4">
          <div className="flex min-w-0 items-start gap-3">
            {Icon && (
              <div className="mt-0.5 rounded-lg bg-slate-800/80 p-2 text-indigo-300 ring-1 ring-slate-700/60">
                <Icon size={16} />
              </div>
            )}
            <div className="min-w-0">
              <h3 className="text-sm font-semibold tracking-tight text-slate-100">{title}</h3>
              {subtitle && <p className="mt-0.5 text-xs text-slate-400">{subtitle}</p>}
            </div>
          </div>
          {action}
        </header>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}

function Badge({ tone = 'slate', icon: Icon, children, className = '' }) {
  const tones = {
    slate: 'bg-slate-800 text-slate-300 ring-slate-700',
    emerald: 'bg-emerald-500/10 text-emerald-300 ring-emerald-500/30',
    sky: 'bg-sky-500/10 text-sky-300 ring-sky-500/30',
    amber: 'bg-amber-500/10 text-amber-300 ring-amber-500/30',
    rose: 'bg-rose-500/10 text-rose-300 ring-rose-500/30',
    indigo: 'bg-indigo-500/10 text-indigo-300 ring-indigo-500/30',
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ring-1 ${tones[tone]} ${className}`}
    >
      {Icon && <Icon size={12} />}
      {children}
    </span>
  );
}

function Stat({ label, value, hint, tone = 'slate', icon: Icon }) {
  const valueTone = {
    slate: 'text-slate-50',
    emerald: 'text-emerald-300',
    sky: 'text-sky-300',
    amber: 'text-amber-300',
    rose: 'text-rose-300',
    indigo: 'text-indigo-300',
  }[tone];
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
      <div className="flex items-center justify-between text-xs font-medium text-slate-400">
        <span>{label}</span>
        {Icon && <Icon size={14} className="text-slate-500" />}
      </div>
      <div className={`mt-2 text-2xl font-semibold tabular-nums tracking-tight ${valueTone}`}>{value}</div>
      {hint && <div className="mt-1 text-xs text-slate-500">{hint}</div>}
    </div>
  );
}

function Toggle({ checked, onChange, label, description }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="group flex w-full items-center justify-between gap-4 rounded-xl border border-slate-800 bg-slate-950/40 px-4 py-3 text-left transition hover:border-slate-700"
    >
      <span className="min-w-0">
        <span className="block text-sm font-medium text-slate-100">{label}</span>
        {description && <span className="mt-0.5 block text-xs text-slate-400">{description}</span>}
      </span>
      <span className="flex shrink-0 items-center gap-2">
        <span className={`text-[11px] font-bold tracking-wider ${checked ? 'text-emerald-300' : 'text-slate-500'}`}>
          {checked ? 'YES' : 'NO'}
        </span>
        <span
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
            checked ? 'bg-indigo-500' : 'bg-slate-700'
          }`}
        >
          <span
            className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
              checked ? 'translate-x-5' : 'translate-x-0.5'
            }`}
          />
        </span>
      </span>
    </button>
  );
}

function Segmented({ value, onChange, options, size = 'md' }) {
  return (
    <div className="inline-flex w-full rounded-xl border border-slate-800 bg-slate-950/60 p-1 sm:w-auto">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={`flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-lg font-medium transition sm:flex-none ${
              size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-sm'
            } ${active ? 'bg-indigo-500 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
          >
            {o.icon && <o.icon size={14} />}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/** Numeric input that allows free typing (keeps a draft string while focused). */
function NumberField({ value, onChange, prefix, suffix, min = 0, max = 10_000_000, className = '', ariaLabel }) {
  const [draft, setDraft] = useState(null);
  const display = draft ?? (Number.isFinite(value) ? Number(value.toFixed(2)).toLocaleString('en-US') : '');
  return (
    <div
      className={`flex items-center rounded-lg border border-slate-700/80 bg-slate-950/70 px-2.5 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20 ${className}`}
    >
      {prefix && <span className="mr-1 text-sm text-slate-500">{prefix}</span>}
      <input
        aria-label={ariaLabel}
        inputMode="decimal"
        className="w-full min-w-0 bg-transparent py-1.5 text-right text-sm tabular-nums text-slate-100 outline-none"
        value={display}
        onFocus={(e) => {
          setDraft(String(Number(value.toFixed(2))));
          requestAnimationFrame(() => e.target.select());
        }}
        onChange={(e) => {
          const str = e.target.value;
          setDraft(str);
          const n = parseFloat(str.replace(/[^0-9.-]/g, ''));
          if (!Number.isNaN(n)) onChange(clamp(n, min, max));
          else if (str.trim() === '') onChange(clamp(0, min, max));
        }}
        onBlur={() => setDraft(null)}
      />
      {suffix && <span className="ml-1 text-sm text-slate-500">{suffix}</span>}
    </div>
  );
}

function Slider({ value, onChange, min, max, step = 1, accent = 'accent-indigo-500', ariaLabel }) {
  return (
    <input
      type="range"
      aria-label={ariaLabel}
      min={min}
      max={max}
      step={step}
      value={clamp(value, min, max)}
      onChange={(e) => onChange(Number(e.target.value))}
      className={`h-2 w-full cursor-pointer appearance-auto rounded-full ${accent}`}
    />
  );
}

function Progress({ value, max, barClass = 'bg-indigo-500', overClass = 'bg-amber-500', height = 'h-2' }) {
  const ratio = safeDiv(value, max);
  const over = ratio > 1;
  return (
    <div className={`relative w-full overflow-hidden rounded-full bg-slate-800 ${height}`}>
      <div
        className={`h-full rounded-full transition-all duration-500 ${over ? overClass : barClass}`}
        style={{ width: `${clamp(ratio, 0, 1) * 100}%` }}
      />
    </div>
  );
}

function TextField({ value, onChange, placeholder, className = '' }) {
  return (
    <input
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className={`w-full min-w-0 rounded-lg border border-transparent bg-transparent px-2 py-1.5 text-sm text-slate-100 outline-none transition hover:border-slate-700 focus:border-indigo-500 focus:bg-slate-950/70 ${className}`}
    />
  );
}

function CategorySelect({ value, onChange }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ring-1 outline-none ${CAT_META[value].soft} bg-slate-950`}
    >
      {CATEGORIES.map((c) => (
        <option key={c} value={c} className="bg-slate-900 text-slate-100">
          {CAT_META[c].label}
        </option>
      ))}
    </select>
  );
}

/** Semicircle gauge for the housing net-burden ratio (scale 0–50%). */
function BurdenGauge({ value }) {
  const SCALE = 0.5;
  const cx = 110;
  const cy = 110;
  const r = 86;
  const pt = (p) => {
    const a = Math.PI * (1 - p);
    return [cx + r * Math.cos(a), cy - r * Math.sin(a)];
  };
  const arc = (p0, p1) => {
    const [x0, y0] = pt(p0);
    const [x1, y1] = pt(p1);
    return `M ${x0} ${y0} A ${r} ${r} 0 0 1 ${x1} ${y1}`;
  };
  const p = clamp(value / SCALE, 0, 1);
  const [nx, ny] = (() => {
    const a = Math.PI * (1 - p);
    return [cx + (r - 18) * Math.cos(a), cy - (r - 18) * Math.sin(a)];
  })();
  const tier = value < 0.3 ? 'safe' : value <= 0.35 ? 'moderate' : 'high';
  const color = { safe: 'text-emerald-300', moderate: 'text-sky-300', high: 'text-amber-300' }[tier];

  return (
    <svg viewBox="0 0 220 158" className="w-full max-w-[280px]" role="img" aria-label={`Housing burden ${pct(value)}`}>
      <path d={arc(0, 1)} stroke="rgb(30 41 59)" strokeWidth="16" fill="none" strokeLinecap="round" />
      <path d={arc(0, 0.6)} stroke="rgb(16 185 129)" strokeWidth="16" fill="none" opacity="0.85" />
      <path d={arc(0.6, 0.7)} stroke="rgb(56 189 248)" strokeWidth="16" fill="none" opacity="0.85" />
      <path d={arc(0.7, 1)} stroke="rgb(245 158 11)" strokeWidth="16" fill="none" opacity="0.85" />
      <line
        x1={cx}
        y1={cy}
        x2={nx}
        y2={ny}
        stroke="white"
        strokeWidth="3"
        strokeLinecap="round"
        style={{ transition: 'all 400ms ease' }}
      />
      <circle cx={cx} cy={cy} r="6" fill="white" />
      <text x={cx} y={cy + 42} textAnchor="middle" className={`fill-current ${color}`} fontSize="26" fontWeight="700">
        {pct(value)}
      </text>
      <text x={pt(0)[0]} y={cy + 18} textAnchor="middle" fontSize="10" className="fill-slate-500">
        0%
      </text>
      <text x={pt(0.6)[0] - 6} y={pt(0.6)[1] - 12} textAnchor="middle" fontSize="10" className="fill-slate-500">
        30%
      </text>
      <text x={pt(0.7)[0] + 6} y={pt(0.7)[1] - 12} textAnchor="middle" fontSize="10" className="fill-slate-500">
        35%
      </text>
      <text x={pt(1)[0]} y={cy + 18} textAnchor="middle" fontSize="10" className="fill-slate-500">
        50%+
      </text>
    </svg>
  );
}

const BURDEN_META = {
  safe: { label: 'Very Safe', tone: 'emerald', icon: ShieldCheck, note: 'Within 30% Net Guideline' },
  moderate: { label: 'Moderate / Healthy', tone: 'sky', icon: CheckCircle2, note: '30–35% of combined net' },
  high: { label: 'High Housing Burden', tone: 'amber', icon: AlertTriangle, note: 'Above 35% of combined net' },
};

const PERSONAL_ICONS = { car: Car, coffee: Coffee, sparkles: Sparkles, palette: Palette, trending: TrendingUp };

/** Modal for saved scenarios, backup files, CSV, print report and share links. */
function DataPanel({
  state,
  scenarios,
  onClose,
  onSave,
  onLoad,
  onOverwrite,
  onDelete,
  onRename,
  onExportJson,
  onImportJson,
  onExportCsv,
  onPrint,
  onCopyLink,
}) {
  const [name, setName] = useState('');
  const fileRef = React.useRef(null);
  const current = useMemo(() => computeModel(state), [state]);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const ActionButton = ({ icon: Icon, title, desc, onClick }) => (
    <button
      type="button"
      onClick={onClick}
      className="flex items-start gap-3 rounded-xl border border-slate-800 bg-slate-950/40 p-3 text-left transition hover:border-indigo-500/50 hover:bg-indigo-500/[0.06]"
    >
      <div className="rounded-lg bg-slate-800 p-2 text-indigo-300">
        <Icon size={16} />
      </div>
      <div className="min-w-0">
        <div className="text-sm font-medium text-slate-100">{title}</div>
        <div className="text-xs text-slate-400">{desc}</div>
      </div>
    </button>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/80 p-4 backdrop-blur-sm sm:items-center">
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Save and export"
        className="relative w-full max-w-3xl rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl"
      >
        <header className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-slate-50">Save & Export</h2>
            <p className="text-xs text-slate-400">
              Your inputs already auto-save in this browser. Use these to keep versions or move data elsewhere.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </header>

        <div className="space-y-6 p-5">
          <section>
            <h3 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
              <Save size={13} /> Saved scenarios
            </h3>
            <form
              className="flex flex-col gap-2 sm:flex-row"
              onSubmit={(e) => {
                e.preventDefault();
                onSave(name);
                setName('');
              }}
            >
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={`e.g. "Maple St · ${fmt(state.rent)}"`}
                className="flex-1 rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:border-indigo-500"
              />
              <button
                type="submit"
                className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white shadow hover:bg-indigo-400"
              >
                <Save size={14} /> Save current
              </button>
            </form>

            {scenarios.length === 0 ? (
              <div className="mt-3 rounded-xl border border-dashed border-slate-700 p-5 text-center text-sm text-slate-500">
                No saved scenarios yet. Save one per apartment you're considering to compare them side by side.
              </div>
            ) : (
              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[620px] text-sm">
                  <thead>
                    <tr className="text-left text-[11px] uppercase tracking-wide text-slate-500">
                      <th className="pb-2 font-medium">Scenario</th>
                      <th className="pb-2 text-right font-medium">Rent</th>
                      <th className="pb-2 text-right font-medium">Burden</th>
                      <th className="pb-2 text-right font-medium">Surplus</th>
                      <th className="pb-2" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    <tr className="bg-indigo-500/[0.06]">
                      <td className="py-2 pl-2 text-slate-300">
                        <span className="font-medium text-indigo-200">Current inputs</span>
                      </td>
                      <td className="py-2 text-right tabular-nums text-slate-200">{fmt(state.rent)}</td>
                      <td className="py-2 text-right">
                        <Badge tone={BURDEN_META[current.burdenTier].tone}>{pct(current.burden)}</Badge>
                      </td>
                      <td
                        className={`py-2 text-right tabular-nums ${current.surplus >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}
                      >
                        {fmtSigned(current.surplus)}
                      </td>
                      <td />
                    </tr>
                    {scenarios.map((sc) => {
                      const sm = computeModel(normalizeState(sc.state));
                      return (
                        <tr key={sc.id}>
                          <td className="py-1.5 pr-2">
                            <TextField value={sc.name} onChange={(v) => onRename(sc.id, v)} />
                            <div className="px-2 text-[11px] text-slate-500">
                              Saved {new Date(sc.savedAt).toLocaleString()}
                            </div>
                          </td>
                          <td className="py-1.5 text-right tabular-nums text-slate-200">{fmt(sc.state.rent)}</td>
                          <td className="py-1.5 text-right">
                            <Badge tone={BURDEN_META[sm.burdenTier].tone}>{pct(sm.burden)}</Badge>
                          </td>
                          <td
                            className={`py-1.5 text-right tabular-nums ${sm.surplus >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}
                          >
                            {fmtSigned(sm.surplus)}
                          </td>
                          <td className="py-1.5 pl-2">
                            <div className="flex justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => onLoad(sc.id)}
                                className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-indigo-300 hover:bg-indigo-500/10"
                              >
                                <FolderOpen size={13} /> Load
                              </button>
                              <button
                                type="button"
                                onClick={() => onOverwrite(sc.id)}
                                title="Overwrite with current inputs"
                                className="rounded-md p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                                aria-label={`Update ${sc.name}`}
                              >
                                <Check size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={() => onDelete(sc.id)}
                                className="rounded-md p-1.5 text-slate-500 hover:bg-rose-500/10 hover:text-rose-300"
                                aria-label={`Delete ${sc.name}`}
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section>
            <h3 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
              <Download size={13} /> Export & share
            </h3>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <ActionButton
                icon={FileJson}
                title="Download backup (.json)"
                desc="Everything, including saved scenarios. Re-import on any device."
                onClick={onExportJson}
              />
              <ActionButton
                icon={Upload}
                title="Import backup"
                desc="Load a .json backup file you or your partner exported."
                onClick={() => fileRef.current?.click()}
              />
              <ActionButton
                icon={FileSpreadsheet}
                title="Export spreadsheet (.csv)"
                desc="Line items, transfers and summary for Excel or Google Sheets."
                onClick={onExportCsv}
              />
              <ActionButton
                icon={Printer}
                title="Print / save as PDF"
                desc="A clean, light-themed report for printing or PDF."
                onClick={onPrint}
              />
              <ActionButton
                icon={Share2}
                title="Copy share link"
                desc="The numbers live in the link itself — nothing is uploaded."
                onClick={onCopyLink}
              />
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onImportJson(f);
                e.target.value = '';
              }}
            />
          </section>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function CoupleBudget() {
  const [state, setState] = useState(loadState);
  const [tab, setTab] = useState('dashboard');
  const [partnerTab, setPartnerTab] = useState('p1');

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* storage unavailable — app still works in-memory */
    }
  }, [state]);

  const m = useMemo(() => computeModel(state), [state]);
  const withComm = useMemo(() => computeModel({ ...state, includeCommission: true }), [state]);
  const withoutComm = useMemo(() => computeModel({ ...state, includeCommission: false }), [state]);
  const stress = useMemo(
    () => [2800, 2850, 2900, 2950, 3000].map((r) => ({ rent: r, m: computeModel({ ...state, rent: r }) })),
    [state]
  );

  // ---- state updaters ----
  const patch = (p) => setState((s) => ({ ...s, ...p }));
  const setIncome = (key, field, val) =>
    setState((s) => ({ ...s, income: { ...s.income, [key]: { ...s.income[key], [field]: val } } }));
  const setRent = (v) => patch({ rent: clamp(Math.round(v), 0, 20000) });
  const setTarget = (key, val) => setState((s) => ({ ...s, targets: rebalanceTargets(s.targets, key, val) }));

  const updateShared = (id, field, val) => {
    if (field === 'amount' && id === 'rent') return setRent(val);
    setState((s) => ({ ...s, shared: s.shared.map((i) => (i.id === id ? { ...i, [field]: val } : i)) }));
  };
  const addShared = (category) =>
    setState((s) => ({
      ...s,
      shared: [...s.shared, { id: uid('s'), name: `New ${CAT_META[category].label.replace(/s$/, '')}`, category, amount: 0 }],
    }));
  const removeShared = (id) => setState((s) => ({ ...s, shared: s.shared.filter((i) => i.id !== id) }));

  const updatePersonal = (who, id, field, val) =>
    setState((s) => ({
      ...s,
      personal: { ...s.personal, [who]: s.personal[who].map((i) => (i.id === id ? { ...i, [field]: val } : i)) },
    }));
  const addPersonal = (who) =>
    setState((s) => ({
      ...s,
      personal: {
        ...s.personal,
        [who]: [...s.personal[who], { id: uid('p'), name: 'New line item', category: 'wants', amount: 0, icon: 'sparkles' }],
      },
    }));
  const removePersonal = (who, id) =>
    setState((s) => ({ ...s, personal: { ...s.personal, [who]: s.personal[who].filter((i) => i.id !== id) } }));

  const resetAll = () => {
    if (window.confirm('Reset every input back to the default scenario?')) setState(makeDefaults());
  };

  // ---- saving & exporting ----
  const [scenarios, setScenarios] = useState(loadScenarios);
  const [dataOpen, setDataOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const [pendingShare, setPendingShare] = useState(null);
  const closeData = React.useCallback(() => setDataOpen(false), []);

  useEffect(() => {
    try {
      window.localStorage.setItem(SCENARIOS_KEY, JSON.stringify(scenarios));
    } catch {
      /* ignore */
    }
  }, [scenarios]);

  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  // A share link puts the budget in the URL hash; ask before replacing local data with it.
  useEffect(() => {
    const hash = window.location.hash;
    if (!hash.startsWith('#s=')) return;
    try {
      setPendingShare(normalizeState(decodeShare(hash.slice(3))));
    } catch {
      setToast({ tone: 'rose', text: 'That share link is invalid or incomplete.' });
      clearHash();
    }
  }, []);

  const saveScenario = (name) => {
    const label = name.trim() || `${fmt(state.rent)} rent · ${new Date().toLocaleDateString()}`;
    setScenarios((list) => [{ id: uid('sc'), name: label, savedAt: Date.now(), state }, ...list]);
    setToast({ tone: 'emerald', text: `Saved "${label}"` });
  };
  const overwriteScenario = (id) => {
    setScenarios((list) => list.map((sc) => (sc.id === id ? { ...sc, state, savedAt: Date.now() } : sc)));
    setToast({ tone: 'emerald', text: 'Scenario updated with current inputs' });
  };
  const loadScenario = (id) => {
    const sc = scenarios.find((s) => s.id === id);
    if (!sc) return;
    setState(normalizeState(sc.state));
    setToast({ tone: 'indigo', text: `Loaded "${sc.name}"` });
  };
  const deleteScenario = (id) => {
    const sc = scenarios.find((s) => s.id === id);
    if (sc && window.confirm(`Delete saved scenario "${sc.name}"?`)) {
      setScenarios((list) => list.filter((s) => s.id !== id));
    }
  };
  const renameScenario = (id, name) => setScenarios((list) => list.map((sc) => (sc.id === id ? { ...sc, name } : sc)));

  const exportJson = () => {
    const payload = { app: EXPORT_APP, version: EXPORT_VERSION, exportedAt: new Date().toISOString(), state, scenarios };
    downloadFile(`couple-budget-${dateStamp()}.json`, JSON.stringify(payload, null, 2), 'application/json');
    setToast({ tone: 'emerald', text: 'Backup file downloaded' });
  };
  const importJson = async (file) => {
    try {
      const { state: imported, scenarios: importedScenarios } = parseImport(await file.text());
      if (!window.confirm('Replace your current inputs with this backup? Saved scenarios in the file will be added.')) return;
      setState(imported);
      if (importedScenarios) {
        setScenarios((list) => {
          const ids = new Set(list.map((s) => s.id));
          return [...importedScenarios.filter((s) => s && s.state && !ids.has(s.id)), ...list];
        });
      }
      setToast({ tone: 'emerald', text: `Imported ${file.name}` });
    } catch (e) {
      setToast({ tone: 'rose', text: e instanceof SyntaxError ? 'That file is not valid JSON.' : e.message });
    }
  };
  const exportCsv = () => {
    downloadFile(`couple-budget-${dateStamp()}.csv`, buildCsv(state, m), 'text/csv;charset=utf-8');
    setToast({ tone: 'emerald', text: 'CSV downloaded — opens in Excel or Google Sheets' });
  };
  const printReport = () => {
    const w = window.open('', '_blank');
    if (!w) return setToast({ tone: 'rose', text: 'Pop-up blocked — allow pop-ups to print the report.' });
    w.document.write(buildReportHtml(state, m));
    w.document.close();
  };
  const copyShareLink = async () => {
    const url = `${window.location.origin}${window.location.pathname}#s=${encodeShare(state)}`;
    try {
      await navigator.clipboard.writeText(url);
      setToast({ tone: 'emerald', text: 'Share link copied — anyone with it sees these numbers' });
    } catch {
      window.prompt('Copy this link:', url);
    }
  };

  const n1 = state.names.p1 || 'Partner 1';
  const n2 = state.names.p2 || 'Partner 2';
  const burdenMeta = BURDEN_META[m.burdenTier];
  const sharedUtilities = ['electric', 'water', 'internet', 'renters']
    .map((id) => m.shared.find((i) => i.id === id)?.amount || 0)
    .reduce((a, b) => a + b, 0);

  const TABS = [
    { value: 'dashboard', label: 'Affordability & Dashboard', short: 'Dashboard', icon: LayoutDashboard },
    { value: 'income', label: 'Income & Split Config', short: 'Income', icon: Briefcase },
    { value: 'shared', label: 'Shared Budget', short: 'Shared', icon: Users },
    { value: 'personal', label: `${n1} & ${n2} Personal`, short: 'Personal', icon: User },
  ];

  // -------------------------------------------------------------------------
  // Shared sub-views
  // -------------------------------------------------------------------------

  const RentControls = (
    <Card
      title="Target Rent"
      subtitle={`Testing apartments between ${fmt(RENT_MIN)} and ${fmt(RENT_MAX)}`}
      icon={Building2}
      action={<Badge tone="indigo">{fmt(m.housingCost)} / mo housing</Badge>}
    >
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="text-4xl font-semibold tabular-nums tracking-tight text-slate-50">{fmt(state.rent)}</div>
          <div className="mt-1 text-xs text-slate-400">base rent / month</div>
        </div>
        <NumberField
          ariaLabel="Rent amount"
          className="w-32"
          prefix="$"
          value={state.rent}
          onChange={setRent}
          max={20000}
        />
      </div>
      <div className="mt-5">
        <Slider ariaLabel="Rent slider" value={state.rent} onChange={setRent} min={RENT_MIN} max={RENT_MAX} step={25} />
        <div className="mt-1.5 flex justify-between text-[11px] text-slate-500">
          <span>{fmt(RENT_MIN)}</span>
          <span>{fmt(RENT_MAX)}</span>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {[2800, 2900, 3000].map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setRent(r)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium ring-1 transition ${
              state.rent === r
                ? 'bg-indigo-500/20 text-indigo-200 ring-indigo-500/50'
                : 'bg-slate-950/60 text-slate-400 ring-slate-800 hover:text-slate-200'
            }`}
          >
            {fmt(r)}
          </button>
        ))}
      </div>
      <div className="mt-5 grid grid-cols-1 gap-3 border-t border-slate-800 pt-4 sm:grid-cols-[1fr_auto] sm:items-center">
        <div>
          <div className="text-sm font-medium text-slate-200">Utilities (for burden calc)</div>
          <div className="text-xs text-slate-500">
            Shared budget utilities + insurance = {fmt(sharedUtilities)}
            {Math.round(sharedUtilities) !== Math.round(state.utilities) && (
              <button
                type="button"
                onClick={() => patch({ utilities: sharedUtilities })}
                className="ml-2 font-medium text-indigo-300 hover:text-indigo-200"
              >
                Sync
              </button>
            )}
          </div>
        </div>
        <NumberField
          ariaLabel="Utilities"
          className="w-full sm:w-32"
          prefix="$"
          value={state.utilities}
          onChange={(v) => patch({ utilities: v })}
        />
      </div>
    </Card>
  );

  const SplitCompare = (
    <Card
      title="Side-by-Side Rent Split"
      subtitle="What each partner pays toward base rent (and the full joint transfer) under each method"
      icon={Scale}
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            key: 'active',
            title: 'Active Mode',
            sub: state.splitMode === 'equal' ? '50 / 50 equal' : 'Proportional to included net',
          },
          { key: 'baseOnly', title: 'Proportional', sub: 'Base salary only' },
          { key: 'baseComm', title: 'Proportional', sub: 'Base + commission' },
          { key: 'equal', title: '50 / 50 Split', sub: 'Equal halves' },
        ].map((v) => {
          const r = m.ratios[v.key];
          const isActive = v.key === 'active';
          return (
            <div
              key={v.key}
              className={`rounded-xl border p-4 ${
                isActive
                  ? 'border-indigo-500/50 bg-indigo-500/[0.07] ring-1 ring-indigo-500/20'
                  : 'border-slate-800 bg-slate-950/40'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-slate-100">{v.title}</div>
                  <div className="text-[11px] text-slate-400">{v.sub}</div>
                </div>
                {isActive && <Badge tone="indigo">Live</Badge>}
              </div>
              <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-slate-800">
                <div className="bg-indigo-500 transition-all duration-500" style={{ width: `${r * 100}%` }} />
                <div className="bg-emerald-500 transition-all duration-500" style={{ width: `${(1 - r) * 100}%` }} />
              </div>
              <div className="mt-3 space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-slate-300">
                    <span className="h-2 w-2 rounded-full bg-indigo-400" />
                    {n1} <span className="text-xs text-slate-500">{pct(r)}</span>
                  </span>
                  <span className="font-semibold tabular-nums text-slate-50">{fmt(state.rent * r)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-slate-300">
                    <span className="h-2 w-2 rounded-full bg-emerald-400" />
                    {n2} <span className="text-xs text-slate-500">{pct(1 - r)}</span>
                  </span>
                  <span className="font-semibold tabular-nums text-slate-50">{fmt(state.rent * (1 - r))}</span>
                </div>
              </div>
              <div className="mt-3 border-t border-slate-800 pt-2 text-[11px] text-slate-500">
                Full joint transfer: <span className="tabular-nums text-slate-300">{fmt(m.sharedTotal * r)}</span> /{' '}
                <span className="tabular-nums text-slate-300">{fmt(m.sharedTotal * (1 - r))}</span>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );

  const CommissionImpact = (
    <Card
      title="Commission Toggle Impact"
      subtitle={`What changes when ${n1}'s commission is counted in the core split`}
      icon={ArrowRightLeft}
      action={
        <button
          type="button"
          onClick={() => patch({ includeCommission: !state.includeCommission })}
          className="whitespace-nowrap rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-200 ring-1 ring-slate-700 transition hover:bg-slate-700"
        >
          Commission: {state.includeCommission ? 'ON' : 'OFF'}
        </button>
      }
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[440px] text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wide text-slate-500">
              <th className="pb-2 font-medium">Metric</th>
              <th className={`pb-2 text-right font-medium ${!state.includeCommission ? 'text-indigo-300' : ''}`}>
                Without
              </th>
              <th className={`pb-2 text-right font-medium ${state.includeCommission ? 'text-indigo-300' : ''}`}>With</th>
              <th className="pb-2 text-right font-medium">Δ Impact</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/80">
            {[
              { label: 'Combined net / mo', a: withoutComm.combinedNet, b: withComm.combinedNet, f: fmt, d: fmtSigned },
              { label: `${n1} split share`, a: withoutComm.p1Share, b: withComm.p1Share, f: pct, d: pctSigned },
              { label: `${n1} joint transfer`, a: withoutComm.p1.transfer, b: withComm.p1.transfer, f: fmt, d: fmtSigned },
              { label: `${n2} joint transfer`, a: withoutComm.p2.transfer, b: withComm.p2.transfer, f: fmt, d: fmtSigned },
              { label: `${n1} cash buffer`, a: withoutComm.p1.buffer, b: withComm.p1.buffer, f: fmt, d: fmtSigned },
              { label: `${n2} cash buffer`, a: withoutComm.p2.buffer, b: withComm.p2.buffer, f: fmt, d: fmtSigned },
              { label: 'Housing net burden', a: withoutComm.burden, b: withComm.burden, f: pct, d: pctSigned },
              { label: '40x rent ceiling', a: withoutComm.ceiling40, b: withComm.ceiling40, f: fmt, d: fmtSigned },
            ].map((row) => {
              const delta = row.b - row.a;
              return (
                <tr key={row.label}>
                  <td className="py-2 text-slate-300">{row.label}</td>
                  <td className="py-2 text-right tabular-nums text-slate-400">{row.f(row.a)}</td>
                  <td className="py-2 text-right tabular-nums text-slate-100">{row.f(row.b)}</td>
                  <td
                    className={`py-2 text-right tabular-nums text-xs font-semibold ${
                      Math.abs(delta) < 0.0005 ? 'text-slate-500' : 'text-indigo-300'
                    }`}
                  >
                    {Math.abs(delta) < 0.0005 ? '—' : row.d(delta)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-3 flex items-start gap-2 text-xs text-slate-500">
        <Info size={14} className="mt-0.5 shrink-0" />
        When commission is excluded, it isn't budgeted anywhere — it becomes pure upside ({fmt(m.nets.p1Comm)}/mo net)
        that {n1} can route to savings when it lands.
      </p>
    </Card>
  );

  const RuleSummary = ({ compact = false }) => (
    <div className="space-y-4">
      {m.rule.map((r) => {
        const meta = CAT_META[r.key];
        const diff = r.target - r.allocated;
        const overIsBad = r.key !== 'savings';
        const over = r.allocated > r.target;
        return (
          <div key={r.key}>
            <div className="mb-1.5 flex items-baseline justify-between gap-2 text-sm">
              <span className="flex items-center gap-2 font-medium text-slate-200">
                <span className={`h-2 w-2 rounded-full ${meta.dot}`} />
                {meta.label}
                <span className="text-xs font-normal text-slate-500">
                  target {r.pctTarget}% · actual {pct(r.pctActual)}
                </span>
              </span>
              <span className="tabular-nums text-slate-300">
                {fmt(r.allocated)} <span className="text-slate-500">/ {fmt(r.target)}</span>
              </span>
            </div>
            <Progress
              value={r.allocated}
              max={r.target}
              barClass={meta.bar}
              overClass={overIsBad ? 'bg-amber-500' : 'bg-emerald-400'}
            />
            {!compact && (
              <div
                className={`mt-1 text-xs ${
                  over ? (overIsBad ? 'text-amber-300' : 'text-emerald-300') : 'text-slate-500'
                }`}
              >
                {over
                  ? overIsBad
                    ? `${fmt(-diff)} over target`
                    : `${fmt(-diff)} ahead of savings target`
                  : `${fmt(diff)} of room remaining`}
              </div>
            )}
          </div>
        );
      })}
      <div className="flex items-center justify-between rounded-xl bg-slate-950/50 px-4 py-3 text-sm ring-1 ring-slate-800">
        <span className="text-slate-400">Unallocated (sum of both buffers)</span>
        <span className={`font-semibold tabular-nums ${m.unallocated >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
          {fmtSigned(m.unallocated)}
        </span>
      </div>
    </div>
  );

  // -------------------------------------------------------------------------
  // Tab: Dashboard
  // -------------------------------------------------------------------------

  const Dashboard = (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          label="Combined Net / mo"
          value={fmt(m.combinedNet)}
          hint={m.heldOut > 0 ? `+${fmt(m.heldOut)} held out as upside` : 'All income sources included'}
          icon={Wallet}
        />
        <Stat
          label="Housing Net Burden"
          value={pct(m.burden)}
          hint={burdenMeta.label}
          tone={burdenMeta.tone}
          icon={Gauge}
        />
        <Stat
          label="40x Rent Ceiling"
          value={fmt(m.ceiling40)}
          hint={`${fmtSigned(m.ceiling40 - state.rent)} headroom`}
          tone={m.passes40 ? 'emerald' : 'amber'}
          icon={Building2}
        />
        <Stat
          label="Household Surplus"
          value={`${fmtSigned(m.surplus)}/mo`}
          hint="Unallocated across both partners"
          tone={m.surplus >= 0 ? 'emerald' : 'rose'}
          icon={PiggyBank}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">{RentControls}</div>

        <Card title="Housing Net Burden" subtitle="(Rent + Utilities) ÷ Combined Monthly Net" icon={Gauge}>
          <div className="flex flex-col items-center">
            <BurdenGauge value={m.burden} />
            <Badge tone={burdenMeta.tone} icon={burdenMeta.icon} className="mt-2">
              {burdenMeta.label}
            </Badge>
            <div className="mt-4 grid w-full grid-cols-3 gap-2 text-center text-[11px]">
              {[
                { k: 'safe', label: '< 30%', c: 'text-emerald-300' },
                { k: 'moderate', label: '30–35%', c: 'text-sky-300' },
                { k: 'high', label: '> 35%', c: 'text-amber-300' },
              ].map((z) => (
                <div
                  key={z.k}
                  className={`rounded-lg px-2 py-1.5 ring-1 ${
                    m.burdenTier === z.k ? 'bg-slate-800 ring-slate-600' : 'ring-slate-800'
                  }`}
                >
                  <div className={`font-semibold ${z.c}`}>{z.label}</div>
                  <div className="text-slate-500">{BURDEN_META[z.k].label}</div>
                </div>
              ))}
            </div>
            <div className="mt-4 w-full text-xs text-slate-400">
              Max rent at 30%:{' '}
              <span className="font-semibold tabular-nums text-slate-200">
                {fmt(m.combinedNet * 0.3 - state.utilities)}
              </span>{' '}
              · at 35%:{' '}
              <span className="font-semibold tabular-nums text-slate-200">
                {fmt(m.combinedNet * 0.35 - state.utilities)}
              </span>
            </div>
          </div>
        </Card>

        <Card title="Landlord 40x Test" subtitle="Combined annual gross ÷ 40" icon={BadgeCheck}>
          <div className="flex flex-col gap-4">
            {m.passes40 ? (
              <div className="flex items-center gap-3 rounded-xl bg-emerald-500/10 px-4 py-3 ring-1 ring-emerald-500/30">
                <ShieldCheck className="text-emerald-300" size={22} />
                <div>
                  <div className="text-xs font-bold tracking-widest text-emerald-300">LEASING APPROVAL: VERIFIED</div>
                  <div className="text-xs text-emerald-200/70">Rent is within the 40x income requirement</div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 rounded-xl bg-amber-500/10 px-4 py-3 ring-1 ring-amber-500/30">
                <AlertTriangle className="text-amber-300" size={22} />
                <div>
                  <div className="text-xs font-bold tracking-widest text-amber-300">CAUTION: BELOW 40x</div>
                  <div className="text-xs text-amber-200/70">
                    Needs {fmt(state.rent * LANDLORD_MULTIPLE)} gross — consider a guarantor or more income
                  </div>
                </div>
              </div>
            )}
            <div>
              <div className="mb-1.5 flex justify-between text-xs text-slate-400">
                <span>Rent vs ceiling</span>
                <span className="tabular-nums">{pct(safeDiv(state.rent, m.ceiling40), 0)} used</span>
              </div>
              <Progress value={state.rent} max={m.ceiling40} barClass="bg-emerald-500" overClass="bg-amber-500" />
            </div>
            <dl className="space-y-2 text-sm">
              {[
                ['Combined gross / yr', fmt(m.combinedGross)],
                ['Max approved rent', fmt(m.ceiling40)],
                ['Your target rent', fmt(state.rent)],
                ['Gross required for target', fmt(state.rent * LANDLORD_MULTIPLE)],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between">
                  <dt className="text-slate-400">{k}</dt>
                  <dd className="tabular-nums font-medium text-slate-100">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </Card>
      </div>

      {SplitCompare}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {CommissionImpact}
        <Card
          title="Monthly Cash Flow Snapshot"
          subtitle="Net take-home − joint transfer − personal budget = buffer"
          icon={Banknote}
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {[
              { key: 'p1', name: n1, d: m.p1, dot: 'bg-indigo-400' },
              { key: 'p2', name: n2, d: m.p2, dot: 'bg-emerald-400' },
            ].map(({ key, name, d, dot }) => (
              <div key={key} className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-100">
                  <span className={`h-2 w-2 rounded-full ${dot}`} />
                  {name}
                </div>
                <dl className="mt-3 space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-slate-400">Net take-home</dt>
                    <dd className="tabular-nums text-slate-100">{fmt(d.net)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-slate-400">Joint transfer</dt>
                    <dd className="tabular-nums text-slate-300">−{fmt(d.transfer)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-slate-400">Personal budget</dt>
                    <dd className="tabular-nums text-slate-300">−{fmt(d.personalTotal)}</dd>
                  </div>
                  <div className="flex justify-between border-t border-slate-800 pt-1.5">
                    <dt className="font-medium text-slate-200">Buffer</dt>
                    <dd className={`font-semibold tabular-nums ${d.buffer >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                      {fmtSigned(d.buffer)}
                    </dd>
                  </div>
                </dl>
              </div>
            ))}
          </div>
          <div className="mt-5">
            <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
              Household 50 / 30 / 20 check
            </div>
            <RuleSummary compact />
          </div>
        </Card>
      </div>

      <Card
        title="Apartment Stress Test"
        subtitle="Every metric recomputed at each rent level in your $2,800–$3,000 search range"
        icon={Home}
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-slate-500">
                <th className="pb-2 font-medium">Rent</th>
                <th className="pb-2 font-medium">Burden</th>
                <th className="pb-2 font-medium">40x</th>
                <th className="pb-2 text-right font-medium">{n1} transfer</th>
                <th className="pb-2 text-right font-medium">{n2} transfer</th>
                <th className="pb-2 text-right font-medium">{n1} buffer</th>
                <th className="pb-2 text-right font-medium">{n2} buffer</th>
                <th className="pb-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {stress.map(({ rent, m: s }) => {
                const bm = BURDEN_META[s.burdenTier];
                const current = rent === state.rent;
                return (
                  <tr key={rent} className={current ? 'bg-indigo-500/[0.06]' : ''}>
                    <td className="py-2.5 font-semibold tabular-nums text-slate-100">{fmt(rent)}</td>
                    <td className="py-2.5">
                      <Badge tone={bm.tone}>{pct(s.burden)}</Badge>
                    </td>
                    <td className="py-2.5">
                      {s.passes40 ? (
                        <CheckCircle2 size={16} className="text-emerald-400" />
                      ) : (
                        <AlertTriangle size={16} className="text-amber-400" />
                      )}
                    </td>
                    <td className="py-2.5 text-right tabular-nums text-slate-300">{fmt(s.p1.transfer)}</td>
                    <td className="py-2.5 text-right tabular-nums text-slate-300">{fmt(s.p2.transfer)}</td>
                    <td
                      className={`py-2.5 text-right tabular-nums ${s.p1.buffer >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}
                    >
                      {fmtSigned(s.p1.buffer)}
                    </td>
                    <td
                      className={`py-2.5 text-right tabular-nums ${s.p2.buffer >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}
                    >
                      {fmtSigned(s.p2.buffer)}
                    </td>
                    <td className="py-2.5 text-right">
                      {current ? (
                        <Badge tone="indigo">Current</Badge>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setRent(rent)}
                          className="text-xs font-medium text-indigo-300 hover:text-indigo-200"
                        >
                          Apply
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );

  // -------------------------------------------------------------------------
  // Tab: Income & Split Config
  // -------------------------------------------------------------------------

  const IncomeRow = ({ srcKey, label, icon: Icon, disabled, toggle }) => {
    const src = state.income[srcKey];
    const net = netMonthly(src);
    return (
      <div
        className={`grid grid-cols-2 items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/40 p-4 transition md:grid-cols-[1.4fr_1fr_0.8fr_1fr] ${
          disabled ? 'opacity-50' : ''
        }`}
      >
        <div className="col-span-2 flex items-center gap-3 md:col-span-1">
          <div className="rounded-lg bg-slate-800 p-2 text-slate-300">
            <Icon size={16} />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-medium text-slate-100">{label}</div>
            {toggle}
          </div>
        </div>
        <label className="block">
          <span className="mb-1 block text-[11px] uppercase tracking-wide text-slate-500">Gross / yr</span>
          <NumberField ariaLabel={`${label} gross`} prefix="$" value={src.gross} onChange={(v) => setIncome(srcKey, 'gross', v)} />
        </label>
        <label className="block">
          <span className="mb-1 block text-[11px] uppercase tracking-wide text-slate-500">Deductions</span>
          <NumberField
            ariaLabel={`${label} deductions`}
            suffix="%"
            max={100}
            value={src.ded}
            onChange={(v) => setIncome(srcKey, 'ded', v)}
          />
        </label>
        <div className="col-span-2 text-right md:col-span-1">
          <div className="text-[11px] uppercase tracking-wide text-slate-500">Net / mo</div>
          <div className="text-lg font-semibold tabular-nums text-slate-50">{fmt(net)}</div>
          <div className="text-[11px] tabular-nums text-slate-500">{fmt(net * 12)} / yr</div>
        </div>
      </div>
    );
  };

  const Income = (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card
            title={n1}
            subtitle="Base salary, commission, and optional bonus"
            icon={User}
            action={<Badge tone="indigo">{fmt(m.p1Net)} / mo counted</Badge>}
          >
            <div className="space-y-3">
              {IncomeRow({ srcKey: 'p1Base', label: 'Base Salary', icon: Briefcase })}
              {IncomeRow({
                srcKey: 'p1Comm',
                label: 'Commission',
                icon: TrendingUp,
                disabled: !state.includeCommission,
                toggle: (
                  <span className="text-[11px] text-slate-500">
                    {state.includeCommission ? 'Included in core split' : 'Held out as upside'}
                  </span>
                ),
              })}
              {IncomeRow({
                srcKey: 'p1Bonus',
                label: 'Potential Bonus',
                icon: Gift,
                disabled: !state.includeBonus,
                toggle: (
                  <span className="text-[11px] text-slate-500">
                    {state.includeBonus ? 'Amortized monthly' : 'Not budgeted'}
                  </span>
                ),
              })}
            </div>
          </Card>
          <Card
            title={n2}
            subtitle="Base salary (commission currently none)"
            icon={User}
            action={<Badge tone="emerald">{fmt(m.p2Net)} / mo counted</Badge>}
          >
            <div className="space-y-3">
              {IncomeRow({ srcKey: 'p2Base', label: 'Base Salary', icon: Briefcase })}
              {IncomeRow({
                srcKey: 'p2Comm',
                label: 'Commission',
                icon: TrendingUp,
                toggle: <span className="text-[11px] text-slate-500">Enter an amount if this changes</span>,
              })}
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="Core Switches" subtitle="Decide what income the household plans around" icon={Sparkles}>
            <div className="space-y-3">
              <Toggle
                label={`Include ${n1} Commission in Core Split?`}
                description={`${fmt(m.nets.p1Comm)}/mo net · shifts split by ${pctSigned(
                  withComm.p1Share - withoutComm.p1Share
                )}`}
                checked={state.includeCommission}
                onChange={(v) => patch({ includeCommission: v })}
              />
              <Toggle
                label={`Include ${n1} Bonus?`}
                description={`${fmt(m.nets.p1Bonus)}/mo net when amortized`}
                checked={state.includeBonus}
                onChange={(v) => patch({ includeBonus: v })}
              />
            </div>
            {state.includeBonus && (
              <p className="mt-3 flex items-start gap-2 rounded-lg bg-amber-500/10 p-3 text-xs text-amber-200/80 ring-1 ring-amber-500/20">
                <AlertTriangle size={14} className="mt-0.5 shrink-0 text-amber-300" />
                Bonuses usually arrive once a year. Budgeting it monthly assumes {n1} sets it aside when paid.
              </p>
            )}
          </Card>

          <Card title="Household Split Mode" subtitle="How shared expenses are divided" icon={Scale}>
            <Segmented
              value={state.splitMode}
              onChange={(v) => patch({ splitMode: v })}
              options={[
                { value: 'proportional', label: 'Proportional', icon: Scale },
                { value: 'equal', label: '50 / 50', icon: Users },
              ]}
            />
            <p className="mt-3 text-xs text-slate-400">
              {state.splitMode === 'proportional'
                ? 'Each partner contributes the same percentage of their net income — the higher earner covers a larger share.'
                : 'Each partner pays exactly half, regardless of income.'}
            </p>
            <div className="mt-4 space-y-2">
              {[
                { name: n1, share: m.p1Share, transfer: m.p1.transfer, net: m.p1Net, bar: 'bg-indigo-500' },
                { name: n2, share: m.p2Share, transfer: m.p2.transfer, net: m.p2Net, bar: 'bg-emerald-500' },
              ].map((p) => (
                <div key={p.name} className="rounded-lg bg-slate-950/50 p-3 ring-1 ring-slate-800">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-200">{p.name}</span>
                    <span className="font-semibold tabular-nums text-slate-50">
                      {fmt(p.transfer)} <span className="text-xs font-normal text-slate-500">({pct(p.share)})</span>
                    </span>
                  </div>
                  <div className="mt-2">
                    <Progress value={p.share} max={1} barClass={p.bar} height="h-1.5" />
                  </div>
                  <div className="mt-1.5 text-[11px] text-slate-500">
                    {pct(safeDiv(p.transfer, p.net))} of their net goes to the joint account
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card title="Partner Names" icon={Heart}>
            <div className="space-y-2">
              {['p1', 'p2'].map((k, i) => (
                <label key={k} className="flex items-center gap-3">
                  <span className="w-20 text-xs text-slate-500">Partner {i + 1}</span>
                  <input
                    value={state.names[k]}
                    onChange={(e) => setState((s) => ({ ...s, names: { ...s.names, [k]: e.target.value } }))}
                    className="flex-1 rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-1.5 text-sm text-slate-100 outline-none focus:border-indigo-500"
                  />
                </label>
              ))}
            </div>
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Combined Gross / yr" value={fmt(m.combinedGross)} icon={Briefcase} />
        <Stat label="Combined Net / mo" value={fmt(m.combinedNet)} icon={Wallet} />
        <Stat label="Upside Held Out" value={`${fmt(m.heldOut)}/mo`} hint="Excluded commission / bonus" icon={Gift} />
        <Stat
          label="Effective Deduction Rate"
          value={pct(1 - safeDiv(m.combinedNet * 12, m.combinedGross))}
          icon={Info}
        />
      </div>
    </div>
  );

  // -------------------------------------------------------------------------
  // Tab: Shared Budget
  // -------------------------------------------------------------------------

  const Shared = (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card
          title="Adjustable 50 / 30 / 20 Engine"
          subtitle="Linked targets always sum to 100% of combined net"
          icon={Scale}
          className="lg:col-span-1"
          action={
            <button
              type="button"
              onClick={() => patch({ targets: { needs: 50, wants: 30, savings: 20 } })}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
              title="Reset to 50/30/20"
            >
              <RotateCcw size={14} />
            </button>
          }
        >
          <div className="space-y-5">
            {CATEGORIES.map((c) => (
              <div key={c}>
                <div className="mb-1.5 flex items-center justify-between text-sm">
                  <span className={`font-medium ${CAT_META[c].text}`}>{CAT_META[c].label}</span>
                  <span className="tabular-nums text-slate-300">
                    <span className="font-semibold text-slate-50">{state.targets[c]}%</span> ·{' '}
                    {fmt((m.combinedNet * state.targets[c]) / 100)}
                  </span>
                </div>
                <Slider
                  ariaLabel={`${CAT_META[c].label} target`}
                  value={state.targets[c]}
                  onChange={(v) => setTarget(c, v)}
                  min={0}
                  max={100}
                  accent={{ needs: 'accent-indigo-500', wants: 'accent-violet-500', savings: 'accent-emerald-500' }[c]}
                />
              </div>
            ))}
            <div className="flex h-3 overflow-hidden rounded-full">
              {CATEGORIES.map((c) => (
                <div
                  key={c}
                  className={`${CAT_META[c].bar} transition-all duration-300`}
                  style={{ width: `${state.targets[c]}%` }}
                />
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                [50, 30, 20],
                [60, 20, 20],
                [50, 20, 30],
                [40, 30, 30],
              ].map(([a, b, c]) => (
                <button
                  key={`${a}${b}${c}`}
                  type="button"
                  onClick={() => patch({ targets: { needs: a, wants: b, savings: c } })}
                  className="rounded-lg bg-slate-950/60 px-2.5 py-1 text-xs text-slate-400 ring-1 ring-slate-800 hover:text-slate-200"
                >
                  {a}/{b}/{c}
                </button>
              ))}
            </div>
          </div>
        </Card>

        <Card
          title="Target Budget vs Allocated Line Items"
          subtitle="Household-wide: shared joint account + both personal budgets"
          icon={TrendingUp}
          className="lg:col-span-2"
        >
          <RuleSummary />
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-800 bg-gradient-to-br from-indigo-500/10 to-slate-900/60 p-4">
          <div className="text-xs font-medium text-slate-400">Joint account total / mo</div>
          <div className="mt-1 text-2xl font-semibold tabular-nums text-slate-50">{fmt(m.sharedTotal)}</div>
          <div className="mt-1 text-xs text-slate-500">
            {CATEGORIES.map((c) => `${CAT_META[c].label} ${fmt(m.sharedByCat[c])}`).join(' · ')}
          </div>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
            <span className="h-2 w-2 rounded-full bg-indigo-400" /> {n1} monthly transfer
          </div>
          <div className="mt-1 text-2xl font-semibold tabular-nums text-indigo-300">{fmt(m.p1.transfer)}</div>
          <div className="mt-1 text-xs text-slate-500">{pct(m.p1Share)} of shared costs</div>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
            <span className="h-2 w-2 rounded-full bg-emerald-400" /> {n2} monthly transfer
          </div>
          <div className="mt-1 text-2xl font-semibold tabular-nums text-emerald-300">{fmt(m.p2.transfer)}</div>
          <div className="mt-1 text-xs text-slate-500">{pct(m.p2Share)} of shared costs</div>
        </div>
      </div>

      <Card
        title="Shared Living Expenses — Joint Account"
        subtitle={`Split mode: ${state.splitMode === 'equal' ? '50 / 50' : 'Proportional to net income'}`}
        icon={Home}
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-slate-500">
                <th className="pb-2 pl-2 font-medium">Line item</th>
                <th className="pb-2 font-medium">Category</th>
                <th className="pb-2 text-right font-medium">Monthly</th>
                <th className="pb-2 text-right font-medium">% of joint</th>
                <th className="pb-2 text-right font-medium">{n1}</th>
                <th className="pb-2 text-right font-medium">{n2}</th>
                <th className="pb-2" />
              </tr>
            </thead>
            {CATEGORIES.map((c) => {
              const items = m.shared.filter((i) => i.category === c);
              return (
                <tbody key={c} className="border-t border-slate-800">
                  <tr>
                    <td colSpan={7} className="pt-4 pb-1">
                      <div className="flex items-center justify-between">
                        <span className={`flex items-center gap-2 text-xs font-semibold uppercase tracking-wide ${CAT_META[c].text}`}>
                          <span className={`h-2 w-2 rounded-full ${CAT_META[c].dot}`} />
                          {CAT_META[c].label}
                        </span>
                        <span className="text-xs tabular-nums text-slate-400">
                          Subtotal <span className="font-semibold text-slate-200">{fmt(m.sharedByCat[c])}</span>
                        </span>
                      </div>
                    </td>
                  </tr>
                  {items.map((item) => (
                    <tr key={item.id} className="group">
                      <td className="py-1 pr-2">
                        <div className="flex items-center gap-1">
                          <TextField value={item.name} onChange={(v) => updateShared(item.id, 'name', v)} />
                          {item.linked === 'rent' && (
                            <span title="Linked to the rent slider" className="shrink-0 text-indigo-400">
                              <Link2 size={14} />
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-1">
                        <CategorySelect value={item.category} onChange={(v) => updateShared(item.id, 'category', v)} />
                      </td>
                      <td className="py-1">
                        <NumberField
                          ariaLabel={`${item.name} amount`}
                          className="ml-auto w-28"
                          prefix="$"
                          value={item.amount}
                          onChange={(v) => updateShared(item.id, 'amount', v)}
                        />
                      </td>
                      <td className="py-1 text-right tabular-nums text-slate-500">
                        {pct(safeDiv(item.amount, m.sharedTotal))}
                      </td>
                      <td className="py-1 text-right tabular-nums text-slate-300">{fmt(item.amount * m.p1Share)}</td>
                      <td className="py-1 text-right tabular-nums text-slate-300">{fmt(item.amount * m.p2Share)}</td>
                      <td className="py-1 pl-2 text-right">
                        {item.linked ? (
                          <span className="inline-block w-7" />
                        ) : (
                          <button
                            type="button"
                            onClick={() => removeShared(item.id)}
                            className="rounded-md p-1.5 text-slate-600 opacity-60 transition hover:bg-rose-500/10 hover:text-rose-300 group-hover:opacity-100"
                            aria-label={`Delete ${item.name}`}
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  <tr>
                    <td colSpan={7} className="pb-2">
                      <button
                        type="button"
                        onClick={() => addShared(c)}
                        className="mt-1 inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                      >
                        <Plus size={13} /> Add {CAT_META[c].label.toLowerCase().replace(/s$/, '')}
                      </button>
                    </td>
                  </tr>
                </tbody>
              );
            })}
            <tfoot>
              <tr className="border-t-2 border-slate-700 text-slate-100">
                <td className="pt-3 pl-2 font-semibold">Total joint transfer</td>
                <td />
                <td className="pt-3 text-right font-semibold tabular-nums">{fmt(m.sharedTotal)}</td>
                <td className="pt-3 text-right tabular-nums text-slate-500">100%</td>
                <td className="pt-3 text-right font-semibold tabular-nums text-indigo-300">{fmt(m.p1.transfer)}</td>
                <td className="pt-3 text-right font-semibold tabular-nums text-emerald-300">{fmt(m.p2.transfer)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>
    </div>
  );

  // -------------------------------------------------------------------------
  // Tab: Personal (autonomy)
  // -------------------------------------------------------------------------

  const PersonalPanel = (who) => {
    const d = m[who];
    const name = who === 'p1' ? n1 : n2;
    const items = state.personal[who];
    const accent = who === 'p1' ? 'indigo' : 'emerald';
    const deficit = d.buffer < 0;
    const bufferPct = safeDiv(d.buffer, d.net);
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <Stat label="Net take-home" value={fmt(d.net)} hint="Counted monthly income" icon={Wallet} />
          <Stat label="Joint transfer" value={`−${fmt(d.transfer)}`} hint={`${pct(safeDiv(d.transfer, d.net))} of net`} icon={ArrowRightLeft} />
          <Stat label="Net discretionary" value={fmt(d.discretionary)} hint="Take-home − joint transfer" tone={accent} icon={Banknote} />
          <div
            className={`rounded-2xl border p-4 ${
              deficit ? 'border-rose-500/40 bg-rose-500/10' : 'border-emerald-500/30 bg-emerald-500/[0.07]'
            }`}
          >
            <div className="flex items-center justify-between text-xs font-medium text-slate-300">
              <span>Unallocated Cash Buffer</span>
              {deficit ? <AlertTriangle size={14} className="text-rose-300" /> : <ShieldCheck size={14} className="text-emerald-300" />}
            </div>
            <div className={`mt-2 text-2xl font-semibold tabular-nums ${deficit ? 'text-rose-300' : 'text-emerald-300'}`}>
              {fmtSigned(d.buffer)}
            </div>
            <div className={`mt-1 text-xs ${deficit ? 'text-rose-200/80' : 'text-emerald-200/70'}`}>
              {deficit ? 'Deficit — trim personal items or revisit the split' : `${pct(bufferPct)} of net left unassigned`}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card
            title={`${name}'s Personal Budget`}
            subtitle="Autonomous spending — no joint approval needed"
            icon={User}
            className="lg:col-span-2"
            action={
              <button
                type="button"
                onClick={() => addPersonal(who)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-500 px-3 py-1.5 text-xs font-medium text-white shadow hover:bg-indigo-400"
              >
                <Plus size={13} /> Add item
              </button>
            }
          >
            <div className="space-y-2">
              {items.map((item) => {
                const Icon = PERSONAL_ICONS[item.icon] || Sparkles;
                return (
                  <div
                    key={item.id}
                    className="group grid grid-cols-[auto_1fr_auto] items-center gap-2 rounded-xl border border-slate-800 bg-slate-950/40 p-2 sm:grid-cols-[auto_1fr_auto_auto_auto]"
                  >
                    <div className="rounded-lg bg-slate-800 p-2 text-slate-300">
                      <Icon size={15} />
                    </div>
                    <TextField value={item.name} onChange={(v) => updatePersonal(who, item.id, 'name', v)} />
                    <div className="hidden sm:block">
                      <CategorySelect value={item.category} onChange={(v) => updatePersonal(who, item.id, 'category', v)} />
                    </div>
                    <NumberField
                      ariaLabel={`${item.name} amount`}
                      className="w-28"
                      prefix="$"
                      value={item.amount}
                      onChange={(v) => updatePersonal(who, item.id, 'amount', v)}
                    />
                    <button
                      type="button"
                      onClick={() => removePersonal(who, item.id)}
                      className="hidden rounded-md p-1.5 text-slate-600 opacity-60 transition hover:bg-rose-500/10 hover:text-rose-300 group-hover:opacity-100 sm:block"
                      aria-label={`Delete ${item.name}`}
                    >
                      <Trash2 size={14} />
                    </button>
                    <div className="col-span-3 flex items-center justify-between sm:hidden">
                      <CategorySelect value={item.category} onChange={(v) => updatePersonal(who, item.id, 'category', v)} />
                      <button
                        type="button"
                        onClick={() => removePersonal(who, item.id)}
                        className="rounded-md p-1.5 text-slate-500 hover:text-rose-300"
                        aria-label={`Delete ${item.name}`}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
              {items.length === 0 && (
                <div className="rounded-xl border border-dashed border-slate-700 p-6 text-center text-sm text-slate-500">
                  No personal line items yet.
                </div>
              )}
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-slate-800 pt-3 text-sm">
              <span className="text-slate-400">Personal total</span>
              <span className="font-semibold tabular-nums text-slate-100">{fmt(d.personalTotal)}</span>
            </div>
          </Card>

          <Card title="Cash Flow Waterfall" subtitle="Where every dollar of take-home goes" icon={Banknote}>
            <div className="space-y-3">
              {[
                { label: 'Joint: needs', v: d.sharedByCat.needs, bar: 'bg-indigo-500' },
                { label: 'Joint: wants', v: d.sharedByCat.wants, bar: 'bg-violet-500' },
                { label: 'Joint: savings', v: d.sharedByCat.savings, bar: 'bg-emerald-500' },
                { label: 'Personal: needs', v: d.byCat.needs, bar: 'bg-indigo-400/70' },
                { label: 'Personal: wants', v: d.byCat.wants, bar: 'bg-violet-400/70' },
                { label: 'Personal: savings', v: d.byCat.savings, bar: 'bg-emerald-400/70' },
                { label: 'Unallocated buffer', v: Math.max(0, d.buffer), bar: 'bg-slate-400' },
              ].map((row) => (
                <div key={row.label}>
                  <div className="mb-1 flex justify-between text-xs">
                    <span className="text-slate-400">{row.label}</span>
                    <span className="tabular-nums text-slate-200">
                      {fmt(row.v)} <span className="text-slate-500">· {pct(safeDiv(row.v, d.net), 0)}</span>
                    </span>
                  </div>
                  <Progress value={row.v} max={d.net} barClass={row.bar} height="h-1.5" />
                </div>
              ))}
            </div>
            <div className="mt-5 rounded-xl bg-slate-950/50 p-3 text-xs ring-1 ring-slate-800">
              <div className="font-medium text-slate-300">Total savings rate</div>
              <div className="mt-1 text-xl font-semibold tabular-nums text-emerald-300">
                {pct(safeDiv(d.sharedByCat.savings + d.byCat.savings, d.net))}
              </div>
              <div className="mt-0.5 text-slate-500">
                {fmt(d.sharedByCat.savings + d.byCat.savings)}/mo incl. share of joint emergency fund
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  };

  const Personal = (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Segmented
          value={partnerTab}
          onChange={setPartnerTab}
          options={[
            { value: 'p1', label: n1, icon: User },
            { value: 'p2', label: n2, icon: User },
          ]}
        />
        <div className="flex flex-wrap gap-2">
          {[
            { name: n1, b: m.p1.buffer },
            { name: n2, b: m.p2.buffer },
          ].map((p) => (
            <Badge key={p.name} tone={p.b >= 0 ? 'emerald' : 'rose'} icon={p.b >= 0 ? CheckCircle2 : AlertTriangle}>
              {p.name}: {fmtSigned(p.b)}
            </Badge>
          ))}
        </div>
      </div>
      {PersonalPanel(partnerTab)}
    </div>
  );

  // -------------------------------------------------------------------------
  // Layout
  // -------------------------------------------------------------------------

  const deficits = [
    m.p1.buffer < 0 && `${n1} is running a ${fmt(-m.p1.buffer)}/mo deficit`,
    m.p2.buffer < 0 && `${n2} is running a ${fmt(-m.p2.buffer)}/mo deficit`,
  ].filter(Boolean);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 antialiased [font-feature-settings:'cv11','ss01']">
      <div className="pointer-events-none fixed inset-x-0 top-0 h-80 bg-gradient-to-b from-indigo-600/10 via-indigo-600/[0.03] to-transparent" />
      <div className="relative mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 pt-8 pb-6 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-indigo-300">
              <Heart size={14} /> Yours · Mine · Ours
            </div>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-50 sm:text-3xl">
              Couple Budget & Rent Affordability
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              {n1} & {n2} · zero debt · {fmt(m.combinedNet)}/mo combined net
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={burdenMeta.tone} icon={burdenMeta.icon}>
              {burdenMeta.note}
            </Badge>
            <Badge tone={m.passes40 ? 'emerald' : 'amber'} icon={m.passes40 ? ShieldCheck : AlertTriangle}>
              {m.passes40 ? '40x Verified' : '40x Caution'}
            </Badge>
            <Badge tone={m.surplus >= 0 ? 'emerald' : 'rose'} icon={PiggyBank}>
              {m.surplus >= 0 ? 'Surplus' : 'Deficit'}: {fmtSigned(m.surplus)}/mo
            </Badge>
            <button
              type="button"
              onClick={() => setDataOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-white shadow hover:bg-indigo-400"
            >
              <Save size={12} /> Save & Export
            </button>
            <button
              type="button"
              onClick={resetAll}
              className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400 ring-1 ring-slate-800 hover:text-slate-200"
            >
              <RotateCcw size={12} /> Reset
            </button>
          </div>
        </header>

        <nav className="sticky top-0 z-20 -mx-4 mb-6 border-b border-slate-800/80 bg-slate-950/85 px-4 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
          <div className="flex gap-1 overflow-x-auto py-2">
            {TABS.map((t) => {
              const active = tab === t.value;
              return (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setTab(t.value)}
                  className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
                    active ? 'bg-slate-800 text-slate-50 ring-1 ring-slate-700' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <t.icon size={15} className={active ? 'text-indigo-300' : ''} />
                  <span className="hidden md:inline">{t.label}</span>
                  <span className="md:hidden">{t.short}</span>
                </button>
              );
            })}
          </div>
        </nav>

        {pendingShare && (
          <div className="mb-6 flex flex-col gap-3 rounded-xl bg-indigo-500/10 px-4 py-3 text-sm text-indigo-100 ring-1 ring-indigo-500/30 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <Share2 size={18} className="mt-0.5 shrink-0 text-indigo-300" />
              <div>
                This link contains a shared budget ({fmt(pendingShare.rent)} rent). Load it? Your current inputs will be
                replaced — save them as a scenario first if you want to keep them.
              </div>
            </div>
            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                onClick={() => {
                  setState(pendingShare);
                  setPendingShare(null);
                  clearHash();
                  setToast({ tone: 'indigo', text: 'Shared budget loaded' });
                }}
                className="rounded-lg bg-indigo-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-400"
              >
                Load shared budget
              </button>
              <button
                type="button"
                onClick={() => {
                  setPendingShare(null);
                  clearHash();
                }}
                className="rounded-lg px-3 py-1.5 text-xs font-medium text-slate-300 ring-1 ring-slate-700 hover:text-white"
              >
                Ignore
              </button>
            </div>
          </div>
        )}

        {deficits.length > 0 && (
          <div className="mb-6 flex items-start gap-3 rounded-xl bg-rose-500/10 px-4 py-3 text-sm text-rose-200 ring-1 ring-rose-500/30">
            <AlertTriangle size={18} className="mt-0.5 shrink-0 text-rose-300" />
            <div>{deficits.join(' · ')}. Adjust personal line items, the rent target, or the split mode.</div>
          </div>
        )}

        {tab === 'dashboard' && Dashboard}
        {tab === 'income' && Income}
        {tab === 'shared' && Shared}
        {tab === 'personal' && Personal}

        <footer className="mt-10 text-center text-xs text-slate-600">
          Estimates only. Net figures use your deduction percentages, not a full tax calculation. Inputs are saved in
          this browser.
        </footer>
      </div>

      {dataOpen && (
        <DataPanel
          state={state}
          scenarios={scenarios}
          onClose={closeData}
          onSave={saveScenario}
          onLoad={loadScenario}
          onOverwrite={overwriteScenario}
          onDelete={deleteScenario}
          onRename={renameScenario}
          onExportJson={exportJson}
          onImportJson={importJson}
          onExportCsv={exportCsv}
          onPrint={printReport}
          onCopyLink={copyShareLink}
        />
      )}

      {toast && (
        <div className="fixed inset-x-0 bottom-6 z-[60] flex justify-center px-4">
          <div
            role="status"
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium shadow-2xl ring-1 backdrop-blur ${
              {
                emerald: 'bg-emerald-950/90 text-emerald-200 ring-emerald-500/40',
                indigo: 'bg-indigo-950/90 text-indigo-200 ring-indigo-500/40',
                rose: 'bg-rose-950/90 text-rose-200 ring-rose-500/40',
              }[toast.tone]
            }`}
          >
            {toast.tone === 'rose' ? <AlertTriangle size={15} /> : <CheckCircle2 size={15} />}
            {toast.text}
          </div>
        </div>
      )}
    </div>
  );
}
