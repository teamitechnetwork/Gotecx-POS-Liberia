import { useEffect, useMemo, useState, type FormEvent, type KeyboardEvent, type ReactNode } from 'react';
import {
  Activity, ArrowDownLeft, ArrowLeftRight, ArrowUpRight, Barcode, Boxes, CalendarDays,
  Check, ClipboardCheck, CreditCard, Factory, FileClock, MapPin, Package, PackageCheck, Plus,
  Printer, Search, SlidersHorizontal, Sparkles, Tags, Trash2, Truck, WalletCards,
} from 'lucide-react';
import JsBarcode from 'jsbarcode';
import type { Product, StockMovement } from '@/lib/purchasing-types';
import './advanced-inventory.css';

type Route = '/inventory' | '/inventory/transfers' | '/inventory/adjustments' | '/inventory/counts' | '/inventory/production' | '/inventory/history' | '/inventory/valuation' | '/inventory/labels' | '/inventory/low-stock' | '/inventory/batches';
type Props = {
  path: string;
  setPath: (path: string) => void;
  products: Product[];
  stockMovements: StockMovement[];
  currency: 'LRD' | 'USD';
  onProductsChange: (products: Product[]) => void;
  onStockMovementsChange: (movements: StockMovement[]) => void;
  hasProPaymentMethod: boolean;
  onManagePayment: () => void;
  notify: (message: string) => void;
};
type Transfer = { id: string; productId: string; quantity: number; from: string; to: string; status: 'Draft' | 'In transit' | 'Received'; createdAt: string };
type CountLine = { productId: string; counted: number | null; system?: number };
type Count = { id: string; name: string; type: 'Full' | 'Partial'; status: 'In progress' | 'Completed'; createdAt: string; lines: CountLine[] };
type Recipe = { id: string; outputId: string; outputQty: number; ingredients: { productId: string; quantity: number }[] };
type Batch = { id: string; productId: string; lot: string; quantity: number; location: string; expiry: string };
type CostMap = Record<string, number>;

const routes: { path: Route; title: string; description: string; icon: typeof Package }[] = [
  { path: '/inventory/transfers', title: 'Transfer orders', description: 'Move stock between store locations with a clear dispatch and receiving trail.', icon: ArrowLeftRight },
  { path: '/inventory/adjustments', title: 'Stock adjustments', description: 'Record received, damaged, lost, or corrected quantities with a reason.', icon: SlidersHorizontal },
  { path: '/inventory/counts', title: 'Inventory counts', description: 'Run full or partial stocktakes by scanner keyboard input or manual entry.', icon: ClipboardCheck },
  { path: '/inventory/production', title: 'Production', description: 'Build recipes from ingredients and record finished production runs.', icon: Factory },
  { path: '/inventory/history', title: 'Inventory history', description: 'Search and filter every stock movement in one reliable timeline.', icon: FileClock },
  { path: '/inventory/valuation', title: 'Inventory valuation', description: 'Review estimated cost value and potential profit by product.', icon: WalletCards },
  { path: '/inventory/labels', title: 'Label printing', description: 'Select products and quantities, then print clean SKU labels.', icon: Tags },
  { path: '/inventory/low-stock', title: 'Low stock', description: 'See active products at or below their own alert thresholds.', icon: PackageCheck },
  { path: '/inventory/batches', title: 'Batches & expiry', description: 'Track lots, locations, and expiry dates before stock goes to waste.', icon: CalendarDays },
];
const locations = ['Main store', 'Back room', 'Paynesville branch', 'Sinkor branch'];
const uid = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
const safeLoad = <T,>(key: string, seed: T): T => {
  try {
    const raw = localStorage.getItem(`gotecx-inventory-${key}`);
    if (!raw) return seed;
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(seed)) return (Array.isArray(parsed) ? parsed : seed) as T;
    if (typeof seed === 'object' && seed !== null) return (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed) ? parsed : seed) as T;
    return typeof parsed === typeof seed ? parsed as T : seed;
  } catch { return seed; }
};
const money = (value: number, currency: 'LRD' | 'USD') => new Intl.NumberFormat('en-LR', { style: 'currency', currency, maximumFractionDigits: currency === 'LRD' ? 0 : 2 }).format(value);
const date = (value: string) => new Intl.DateTimeFormat('en-LR', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value));
const deltaText = (n: number) => `${n > 0 ? '+' : ''}${n}`;

function Field({ label, children, className = '' }: { label: string; children: ReactNode; className?: string }) {
  return <label className={`ai-field ${className}`}><span>{label}</span>{children}</label>;
}
function Heading({ title, subtitle, action }: { title: string; subtitle: string; action?: ReactNode }) {
  return <div className="ai-heading"><div><div className="ai-eyebrow">GOTECX · INVENTORY</div><h1>{title}</h1><p>{subtitle}</p></div>{action && <div className="ai-heading-action">{action}</div>}</div>;
}
function Empty({ title, text }: { title: string; text: string }) {
  return <div className="ai-empty"><div className="ai-empty-icon"><Boxes size={21} /></div><strong>{title}</strong><p>{text}</p></div>;
}
function ProductSelect({ products, value, onChange, label = 'Product' }: { products: Product[]; value: string; onChange: (value: string) => void; label?: string }) {
  return <Field label={label}><select required value={value} onChange={e => onChange(e.target.value)}><option value="">Choose a product</option>{products.map(p => <option value={p.id} key={p.id}>{p.name} · {p.sku} · {p.stock} on hand</option>)}</select></Field>;
}

export default function AdvancedInventory({ path, setPath, products, stockMovements, currency, onProductsChange, onStockMovementsChange, hasProPaymentMethod, onManagePayment, notify }: Props) {
  const [transfers, setTransfers] = useState<Transfer[]>(() => safeLoad('transfers', products[0] ? [{ id: 'TR-DEMO-01', productId: products[0].id, quantity: 3, from: locations[0], to: locations[1], status: 'In transit', createdAt: new Date(Date.now() - 86400000).toISOString() }] : []));
  const [counts, setCounts] = useState<Count[]>(() => safeLoad('counts', []));
  const [recipes, setRecipes] = useState<Recipe[]>(() => safeLoad('recipes', products.length > 1 ? [{ id: 'REC-DEMO-01', outputId: products[0].id, outputQty: 1, ingredients: [{ productId: products[1].id, quantity: 1 }] }] : []));
  const [batches, setBatches] = useState<Batch[]>(() => safeLoad('batches', products[0] ? [{ id: 'LOT-DEMO-01', productId: products[0].id, lot: 'DEMO-LOT-01', quantity: Math.min(6, products[0].stock), location: locations[0], expiry: new Date(Date.now() + 45 * 86400000).toISOString().slice(0, 10) }] : []));
  const [costs, setCosts] = useState<CostMap>(() => safeLoad('costs', Object.fromEntries(products.map(product => [product.id, Math.round(product.price * 0.55 * 100) / 100]))));
  const [trial, setTrial] = useState<boolean>(() => safeLoad('trial', false));
  const [query, setQuery] = useState('');
  const [kindFilter, setKindFilter] = useState('All movements');
  const [adjustProduct, setAdjustProduct] = useState('');
  const [adjustQty, setAdjustQty] = useState('');
  const [adjustKind, setAdjustKind] = useState('Received');
  const [correctionDirection, setCorrectionDirection] = useState<'Add' | 'Remove'>('Add');
  const [adjustNote, setAdjustNote] = useState('');
  const [transferProduct, setTransferProduct] = useState('');
  const [transferQty, setTransferQty] = useState('');
  const [transferFrom, setTransferFrom] = useState(locations[0]);
  const [transferTo, setTransferTo] = useState(locations[1]);
  const [countType, setCountType] = useState<'Full' | 'Partial'>('Full');
  const [countName, setCountName] = useState('');
  const [scannerValue, setScannerValue] = useState('');
  const [activeCount, setActiveCount] = useState('');
  const [recipeOutput, setRecipeOutput] = useState('');
  const [recipeIngredient, setRecipeIngredient] = useState('');
  const [recipeQty, setRecipeQty] = useState('1');
  const [recipeOutputQty, setRecipeOutputQty] = useState('1');
  const [batchProduct, setBatchProduct] = useState('');
  const [batchLot, setBatchLot] = useState('');
  const [batchQty, setBatchQty] = useState('');
  const [batchLocation, setBatchLocation] = useState(locations[0]);
  const [batchExpiry, setBatchExpiry] = useState('');
  const [editBatch, setEditBatch] = useState('');
  const [labelIds, setLabelIds] = useState<string[]>([]);
  const [labelQty, setLabelQty] = useState<Record<string, number>>({});
  const [deletePrompt, setDeletePrompt] = useState<{ kind: 'batch' | 'recipe'; id: string; label: string } | null>(null);

  useEffect(() => { localStorage.setItem('gotecx-inventory-transfers', JSON.stringify(transfers)); }, [transfers]);
  useEffect(() => { localStorage.setItem('gotecx-inventory-counts', JSON.stringify(counts)); }, [counts]);
  useEffect(() => { localStorage.setItem('gotecx-inventory-recipes', JSON.stringify(recipes)); }, [recipes]);
  useEffect(() => { localStorage.setItem('gotecx-inventory-batches', JSON.stringify(batches)); }, [batches]);
  useEffect(() => { localStorage.setItem('gotecx-inventory-costs', JSON.stringify(costs)); }, [costs]);
  useEffect(() => { localStorage.setItem('gotecx-inventory-trial', JSON.stringify(trial)); }, [trial]);

  const productFor = (id: string) => products.find(p => p.id === id);
  const addMovement = (product: Product, delta: number, reason: string) => onStockMovementsChange([...stockMovements, { id: uid('MOV'), productId: product.id, productName: product.name, delta, reason, createdAt: new Date().toISOString() }]);
  const updateStock = (productId: string, delta: number, reason: string) => {
    const product = productFor(productId);
    if (!product) { notify('That product is no longer in the catalog.'); return false; }
    if (product.stock + delta < 0) { notify(`Not enough ${product.name} on hand. Stock cannot go below zero.`); return false; }
    onProductsChange(products.map(p => p.id === productId ? { ...p, stock: p.stock + delta } : p));
    addMovement(product, delta, reason);
    return true;
  };
  const currentPath = (routes.some(r => r.path === path) || path === '/inventory') ? path as Route : '/inventory';
  const currentModule = routes.find(r => r.path === currentPath);
  const inventoryValue = products.reduce((sum, p) => sum + p.stock * (Number(costs[p.id]) || 0), 0);
  const lowProducts = products.filter(p => p.active && p.stock <= p.lowStockThreshold);

  const submitAdjustment = (e: FormEvent) => {
    e.preventDefault();
    const qty = Math.floor(Number(adjustQty));
    if (!adjustProduct || !Number.isFinite(qty) || qty < 1) { notify('Enter a product and a quantity greater than zero.'); return; }
    const delta = adjustKind === 'Received' || (adjustKind === 'Corrected' && correctionDirection === 'Add') ? qty : -qty;
    if (updateStock(adjustProduct, delta, `${adjustKind}${adjustNote.trim() ? ` · ${adjustNote.trim()}` : ''}`)) {
      setAdjustQty(''); setAdjustNote(''); notify(`${adjustKind} adjustment saved.`);
    }
  };
  const createTransfer = (e: FormEvent) => {
    e.preventDefault();
    const qty = Math.floor(Number(transferQty));
    if (!transferProduct || !qty || qty < 1 || transferFrom === transferTo) { notify('Choose a product, quantity, and two different locations.'); return; }
    const product = productFor(transferProduct);
    if (!product || product.stock < qty) { notify('Transfer quantity exceeds available stock.'); return; }
    setTransfers([{ id: uid('TR'), productId: transferProduct, quantity: qty, from: transferFrom, to: transferTo, status: 'Draft', createdAt: new Date().toISOString() }, ...transfers]);
    setTransferQty(''); notify('Transfer order created.');
  };
  const dispatchTransfer = (item: Transfer) => {
    setTransfers(transfers.map(t => t.id === item.id ? { ...t, status: 'In transit' } : t));
    notify(`${item.id} dispatched. Total product quantity is unchanged.`);
  };
  const receiveTransfer = (item: Transfer) => {
    setTransfers(transfers.map(t => t.id === item.id ? { ...t, status: 'Received' } : t));
    const product = productFor(item.productId);
    if (product) addMovement(product, 0, `Transfer ${item.id} received · ${item.from} → ${item.to} · ${item.quantity} units`);
    notify(`${item.id} received at ${item.to}. Total product quantity is unchanged.`);
  };
  const startCount = (e: FormEvent) => {
    e.preventDefault();
    const selected: CountLine[] = (countType === 'Full' ? products.filter(p => p.active) : products.filter(p => p.id === adjustProduct)).map(p => ({ productId: p.id, counted: null, system: p.stock }));
    if (!selected.length) { notify('Choose a product for this partial count.'); return; }
    const item: Count = { id: uid('CNT'), name: countName.trim() || `${countType} stocktake`, type: countType, status: 'In progress', createdAt: new Date().toISOString(), lines: selected };
    setCounts([item, ...counts]); setActiveCount(item.id); setCountName(''); notify(`${item.type} count started with ${selected.length} products.`);
  };
  const recordCount = (countId: string, productId: string, qty: number) => {
    if (!Number.isFinite(qty) || qty < 0) { notify('Counted quantity must be zero or more.'); return; }
    setCounts(counts.map(c => c.id === countId ? { ...c, lines: c.lines.map(l => l.productId === productId ? { ...l, counted: qty } : l) } : c));
  };
  const completeCount = (count: Count) => {
    const missing = count.lines.filter(l => l.counted === null || !Number.isFinite(l.counted));
    if (missing.length) { notify(`Enter quantities for all products before completing. ${missing.length} remain.`); return; }
    if (count.lines.some(l => (l.counted ?? 0) < 0)) { notify('Counted quantity cannot be negative.'); return; }
    const changes = count.lines.map(line => ({ line, product: productFor(line.productId) })).filter(x => x.product && x.line.counted !== null);
    const nextProducts = products.map(p => {
      const item = changes.find(x => x.product?.id === p.id);
      return item ? { ...p, stock: item.line.counted as number } : p;
    });
    const countMovements: StockMovement[] = changes.flatMap(({ line, product }) => {
      if (!product) return [];
      const variance = (line.counted as number) - product.stock;
      return variance !== 0 ? [{ id: uid('MOV'), productId: product.id, productName: product.name, delta: variance, reason: `Stock count ${count.id} · variance`, createdAt: new Date().toISOString() }] : [];
    });
    onProductsChange(nextProducts);
    if (countMovements.length) onStockMovementsChange([...stockMovements, ...countMovements]);
    setCounts(counts.map(c => c.id === count.id ? { ...c, status: 'Completed' } : c));
    setActiveCount(''); notify(`${count.name} completed. Variances are reflected in on-hand stock.`);
  };
  const scanSku = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const sku = scannerValue.trim().toLowerCase();
    const product = products.find(p => p.sku.toLowerCase() === sku);
    const count = counts.find(c => c.id === activeCount);
    if (!product || !count || !count.lines.some(l => l.productId === product.id)) { notify(product ? 'This product is not included in the active count.' : 'No product matches that SKU.'); return; }
    const line = count.lines.find(l => l.productId === product.id);
    recordCount(count.id, product.id, (line?.counted ?? 0) + 1);
    setScannerValue('');
    notify(`${product.name} counted.`);
  };
  const addRecipe = (e: FormEvent) => {
    e.preventDefault();
    const qty = Number(recipeQty), outQty = Number(recipeOutputQty);
    if (!recipeOutput || !recipeIngredient || recipeOutput === recipeIngredient || qty <= 0 || outQty <= 0) { notify('Choose a valid output and ingredient with quantities above zero.'); return; }
    const existing = recipes.find(r => r.outputId === recipeOutput);
    const ingredient = { productId: recipeIngredient, quantity: qty };
    if (existing) setRecipes(recipes.map(r => r.id === existing.id ? { ...r, outputQty: outQty, ingredients: [...r.ingredients.filter(i => i.productId !== recipeIngredient), ingredient] } : r));
    else setRecipes([{ id: uid('REC'), outputId: recipeOutput, outputQty: outQty, ingredients: [ingredient] }, ...recipes]);
    setRecipeQty('1'); notify('Recipe saved.');
  };
  const runProduction = (recipe: Recipe) => {
    const shortages = recipe.ingredients.find(i => (productFor(i.productId)?.stock ?? -1) < i.quantity);
    if (shortages) { notify(`Not enough ${productFor(shortages.productId)?.name ?? 'ingredient'} for this run.`); return; }
    const output = productFor(recipe.outputId);
    if (!output) { notify('Output product is no longer in the catalog.'); return; }
    const updated = products.map(p => {
      if (p.id === recipe.outputId) return { ...p, stock: p.stock + recipe.outputQty };
      const ingredient = recipe.ingredients.find(i => i.productId === p.id);
      return ingredient ? { ...p, stock: p.stock - ingredient.quantity } : p;
    });
    const now = new Date().toISOString();
    onProductsChange(updated);
    onStockMovementsChange([...stockMovements, ...recipe.ingredients.map(i => {
      const p = productFor(i.productId)!;
      return { id: uid('MOV'), productId: p.id, productName: p.name, delta: -i.quantity, reason: `Production run · ${output.name}`, createdAt: now };
    }), { id: uid('MOV'), productId: output.id, productName: output.name, delta: recipe.outputQty, reason: 'Production run · finished goods', createdAt: now }]);
    notify(`Production run recorded: ${recipe.outputQty} ${output.name} added.`);
  };
  const saveBatch = (e: FormEvent) => {
    e.preventDefault();
    const qty = Math.floor(Number(batchQty));
    if (!batchProduct || !batchLot.trim() || qty < 0 || !batchExpiry) { notify('Complete the product, lot, quantity, and expiry date.'); return; }
    const item: Batch = { id: editBatch || uid('LOT'), productId: batchProduct, lot: batchLot.trim(), quantity: qty, location: batchLocation, expiry: batchExpiry };
    setBatches(editBatch ? batches.map(b => b.id === editBatch ? item : b) : [item, ...batches]);
    setEditBatch(''); setBatchProduct(''); setBatchLot(''); setBatchQty(''); setBatchExpiry('');
    notify(editBatch ? 'Lot updated.' : 'Lot added.');
  };

  const movementRows = useMemo(() => stockMovements.filter(m => {
    const text = `${m.productName} ${m.reason} ${m.id}`.toLowerCase();
    const matchQuery = text.includes(query.toLowerCase());
    const matchKind = kindFilter === 'All movements' || (kindFilter === 'Added stock' ? m.delta > 0 : kindFilter === 'Removed stock' ? m.delta < 0 : m.delta === 0);
    return matchQuery && matchKind;
  }).slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt)), [stockMovements, query, kindFilter]);
  const expiryBatches = batches.map(b => ({ ...b, product: productFor(b.productId), days: Math.ceil((new Date(`${b.expiry}T23:59:59`).getTime() - Date.now()) / 86400000) })).filter(b => b.product);
  const filteredBatches = expiryBatches.filter(b => `${b.product?.name} ${b.lot} ${b.location}`.toLowerCase().includes(query.toLowerCase()));
  const toggleLabel = (id: string) => setLabelIds(labelIds.includes(id) ? labelIds.filter(x => x !== id) : [...labelIds, id]);
  const printLabels = () => {
    const selected = products.filter(p => labelIds.includes(p.id));
    if (!selected.length) { notify('Select at least one product to print labels.'); return; }
    const win = window.open('', '_blank', 'width=780,height=640');
    if (!win) { notify('Allow pop-ups to open the print sheet.'); return; }
    const doc = win.document;
    doc.open();
    doc.write(`<!doctype html><html><head><title>Gotecx product labels</title><style>body{font:12px Inter,Arial,sans-serif;color:#172019;padding:18px}.sheet{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-top:14px}article{border:1px dashed #8b968d;border-radius:6px;padding:10px;min-height:96px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;break-inside:avoid}strong{max-width:100%;overflow:hidden;font-size:11px;text-overflow:ellipsis;white-space:nowrap}svg{display:block;max-width:100%;height:35px}span{font:10px monospace;color:#506157}.price{font:10px Inter,Arial,sans-serif}@media print{button{display:none}body{padding:0}}</style></head><body><button id="print-labels">Print labels</button><section id="labels" class="sheet"></section></body></html>`);
    doc.close();
    const sheet = doc.getElementById('labels');
    if (!sheet) { win.close(); notify('Could not prepare the label sheet.'); return; }
    try {
      for (const product of selected) {
        const copies = Math.max(1, Math.min(100, Math.floor(Number(labelQty[product.id]) || 1)));
        for (let index = 0; index < copies; index += 1) {
          const label = doc.createElement('article');
          const name = doc.createElement('strong');
          name.textContent = product.name;
          const barcode = doc.createElementNS('http://www.w3.org/2000/svg', 'svg') as unknown as SVGSVGElement;
          JsBarcode(barcode, product.sku, { format: 'CODE128', displayValue: false, height: 34, width: 1.5, margin: 0, lineColor: '#202721' });
          const sku = doc.createElement('span');
          sku.textContent = product.sku;
          const price = doc.createElement('span');
          price.className = 'price';
          price.textContent = money(product.price, product.currency);
          label.append(name, barcode, sku, price);
          sheet.append(label);
        }
      }
    } catch {
      win.close();
      notify('A product SKU could not be encoded as a Code 128 barcode. Check the SKU and try again.');
      return;
    }
    doc.getElementById('print-labels')?.addEventListener('click', () => win.print());
    win.focus();
    win.setTimeout(() => win.print(), 200);
  };
  const confirmRemove = () => {
    if (!deletePrompt) return;
    if (deletePrompt.kind === 'batch') setBatches(batches.filter(batch => batch.id !== deletePrompt.id));
    else setRecipes(recipes.filter(recipe => recipe.id !== deletePrompt.id));
    notify(`${deletePrompt.label} removed. Catalog stock was not changed.`);
    setDeletePrompt(null);
  };

  const purchaseCard = { title: 'Purchase orders', description: 'Plan purchases, export records to suppliers, track stock receipts and manage vendor relationships.', icon: Truck, path: '/purchases' };
  if (currentPath === '/inventory') return <div className="advanced-inventory">
    <section className="ai-hero">
      <div className="ai-hero-orbit ai-orbit-one" /><div className="ai-hero-orbit ai-orbit-two" />
      <div className="ai-hero-copy"><span className="ai-plan-tag"><Sparkles size={13} /> ADVANCED INVENTORY PRO</span><h1>Inventory, in full view.</h1><p>Know what’s on hand, what’s moving, and what needs attention — before it slows checkout.</p>
        <div className="ai-hero-actions">{trial ? <span className="ai-trial-active"><Check size={16} /> 14-day demo trial active</span> : <button className="ai-button ai-button-green" onClick={() => { setTrial(true); notify('14-day demo trial activated locally. No payment or subscription was created.'); }}>Start 14-day free trial <ArrowUpRight size={15} /></button>}<button type="button" className="ai-button ai-payment-button" data-testid="button-manage-pro-payment" onClick={onManagePayment}><CreditCard size={15} />{hasProPaymentMethod ? 'Manage payment method' : 'Add payment method'}</button><span className="ai-price">$99 <small>/ year</small></span></div>
        <small className="ai-demo-note">Local demo only. Activating this trial does not create a payment or subscription.</small>
      </div>
      <div className="ai-hero-art" aria-hidden="true"><div className="ai-art-window"><div className="ai-art-top"><span /><span /><span /></div><div className="ai-art-line"><b /><i /><strong /></div><div className="ai-art-line short"><b /><i /><strong /></div><div className="ai-art-line"><b /><i /><strong /></div><div className="ai-art-foot"><Activity size={16} /><span>STOCK FLOW</span><em>+12.8%</em></div></div><div className="ai-art-stamp"><Boxes size={27} /><span>LIVE<br />STOCK</span></div></div>
    </section>
    <div className="ai-section-intro"><div><span>YOUR INVENTORY TOOLKIT</span><h2>One workspace. Every stock decision.</h2></div><p>Choose a module to get started. Changes stay in this browser demo and sync with the product stock list.</p></div>
    <div className="ai-module-grid">
      {[purchaseCard, ...routes.map(r => ({ ...r, icon: r.icon }))].map((item, i) => { const Icon = item.icon; return <button type="button" className={`ai-module-card ${i === 0 ? 'ai-module-purchase' : ''}`} key={item.title} onClick={() => setPath(item.path)}><span className="ai-module-icon"><Icon size={20} strokeWidth={1.8} /></span><span className="ai-module-copy"><strong>{item.title}</strong><span>{item.description}</span></span><span className="ai-module-arrow"><ArrowUpRight size={15} /></span></button>; })}
    </div>
    <div className="ai-bottom-note"><span className="ai-note-mark"><Package size={17} /></span><div><strong>Checkout stays in step.</strong><p>Adjustments, count variances, and production runs update your existing product quantities. Transfers change location records — not total stock.</p></div><div className="ai-bottom-metrics"><span><b>{products.length}</b> products</span><span><b>{lowProducts.length}</b> low stock</span></div></div>
  </div>;

  const backButton = <button className="ai-button ai-button-quiet" onClick={() => setPath('/inventory')}><ArrowDownLeft size={15} /> Inventory overview</button>;
  return <div className="advanced-inventory">
    <div className="ai-breadcrumb"><button onClick={() => setPath('/inventory')}>Advanced inventory</button><span>/</span><b>{currentModule?.title}</b></div>
    {currentPath === '/inventory/adjustments' && <>
      <Heading title="Stock adjustments" subtitle="Record an accurate reason whenever stock changes." action={backButton} />
      <div className="ai-split-layout"><section className="ai-panel ai-form-panel"><div className="ai-panel-heading"><div className="ai-panel-icon"><SlidersHorizontal size={18} /></div><div><h2>New adjustment</h2><p>Adjustments update the catalog quantity and add a movement entry.</p></div></div><form onSubmit={submitAdjustment}><ProductSelect products={products} value={adjustProduct} onChange={setAdjustProduct} /><div className="ai-form-row"><Field label="Adjustment type"><select value={adjustKind} onChange={e => setAdjustKind(e.target.value)}>{['Received', 'Damaged', 'Lost', 'Corrected'].map(k => <option key={k}>{k}</option>)}</select></Field><Field label="Quantity"><input min="1" step="1" type="number" required value={adjustQty} onChange={e => setAdjustQty(e.target.value)} /></Field></div>{adjustKind === 'Corrected' && <Field label="Correction direction"><select value={correctionDirection} onChange={e => setCorrectionDirection(e.target.value as 'Add' | 'Remove')}><option value="Add">Add stock</option><option value="Remove">Remove stock</option></select></Field>}<Field label="Note (optional)"><input value={adjustNote} onChange={e => setAdjustNote(e.target.value)} placeholder="e.g. delivery from local supplier" /></Field><button className="ai-button ai-button-green" type="submit"><Check size={15} /> Save adjustment</button></form></section><aside className="ai-panel ai-aside"><span className="ai-eyebrow">QUANTITY RULE</span><h3>Protect your on-hand count.</h3><p>Damaged and lost quantities are deducted from stock. Received quantities are added. Corrected quantities can be added or removed. All adjustments reject negative on-hand totals.</p><div className="ai-mini-stat"><span>Active products</span><b>{products.filter(p => p.active).length}</b></div></aside></div>
    </>}
    {currentPath === '/inventory/transfers' && <>
      <Heading title="Transfer orders" subtitle="Track stock moving between your store locations. Overall product quantities stay unchanged." action={backButton} />
      <section className="ai-panel ai-form-panel ai-transfer-form"><div className="ai-panel-heading"><div className="ai-panel-icon"><ArrowLeftRight size={18} /></div><div><h2>Create transfer</h2><p>A dispatch and receipt trail for each move.</p></div></div><form onSubmit={createTransfer}><div className="ai-form-row"><ProductSelect products={products} value={transferProduct} onChange={setTransferProduct} /><Field label="Quantity"><input type="number" min="1" step="1" required value={transferQty} onChange={e => setTransferQty(e.target.value)} /></Field></div><div className="ai-form-row"><Field label="From location"><select value={transferFrom} onChange={e => setTransferFrom(e.target.value)}>{locations.map(l => <option key={l}>{l}</option>)}</select></Field><Field label="To location"><select value={transferTo} onChange={e => setTransferTo(e.target.value)}>{locations.map(l => <option key={l}>{l}</option>)}</select></Field><button className="ai-button ai-button-green" type="submit"><Plus size={15} /> Create transfer</button></div></form></section>
      <section className="ai-panel ai-table-panel"><div className="ai-panel-title-row"><div><h2>Transfer activity</h2><p>{transfers.length} orders recorded in this browser</p></div></div>{transfers.length ? <div className="ai-table-scroll"><table className="ai-table"><thead><tr><th>Transfer</th><th>Product</th><th>Route</th><th>Qty</th><th>Status</th><th>Created</th><th>Action</th></tr></thead><tbody>{transfers.map(t => <tr key={t.id}><td className="ai-strong">{t.id}</td><td>{productFor(t.productId)?.name ?? 'Product removed'}</td><td><span className="ai-route"><MapPin size={13} /> {t.from} <ArrowRightIcon /> {t.to}</span></td><td>{t.quantity}</td><td><span className={`ai-status ${t.status === 'Received' ? 'good' : t.status === 'In transit' ? 'warn' : ''}`}>{t.status}</span></td><td>{date(t.createdAt)}</td><td>{t.status === 'Draft' ? <button className="ai-button ai-button-small" onClick={() => dispatchTransfer(t)}>Dispatch</button> : t.status === 'In transit' ? <button className="ai-button ai-button-small ai-button-green" onClick={() => receiveTransfer(t)}>Receive</button> : <span className="ai-muted">Complete</span>}</td></tr>)}</tbody></table></div> : <Empty title="No transfers yet" text="Create your first transfer above, then dispatch and receive it as stock moves." />}</section>
    </>}
    {currentPath === '/inventory/counts' && <>
      <Heading title="Inventory counts" subtitle="Reconcile your shelf quantity to the product catalog with a full or partial stocktake." action={backButton} />
      <section className="ai-panel ai-form-panel"><div className="ai-panel-heading"><div className="ai-panel-icon"><ClipboardCheck size={18} /></div><div><h2>Start a stocktake</h2><p>Scan a product SKU and press Enter, or enter quantities manually.</p></div></div><form onSubmit={startCount}><div className="ai-form-row"><Field label="Count type"><select value={countType} onChange={e => setCountType(e.target.value as 'Full' | 'Partial')}><option>Full</option><option>Partial</option></select></Field>{countType === 'Partial' && <ProductSelect products={products} value={adjustProduct} onChange={setAdjustProduct} label="Product to count" />}<Field label="Stocktake name"><input value={countName} onChange={e => setCountName(e.target.value)} placeholder="e.g. Front shelf count" /></Field><button className="ai-button ai-button-green" type="submit"><Plus size={15} /> Start count</button></div></form></section>
      {counts.map(c => <section className="ai-panel ai-count-panel" key={c.id}><div className="ai-panel-title-row"><div><h2>{c.name}</h2><p>{c.type} count · Started {date(c.createdAt)} · {c.lines.length} products</p></div><span className={`ai-status ${c.status === 'Completed' ? 'good' : 'warn'}`}>{c.status}</span></div>{c.id === activeCount && c.status === 'In progress' && <div className="ai-scan-row"><Barcode size={17} /><input value={scannerValue} onChange={e => setScannerValue(e.target.value)} onKeyDown={scanSku} placeholder="Scan barcode or type SKU, then press Enter" /><span>SKU SCANNER READY</span></div>}<div className="ai-table-scroll"><table className="ai-table"><thead><tr><th>Product</th><th>SKU</th><th>System quantity</th><th>Counted quantity</th><th>Variance</th></tr></thead><tbody>{c.lines.map(l => { const p = productFor(l.productId); const variance = l.counted === null ? null : l.counted - (l.system ?? p?.stock ?? 0); return <tr key={l.productId}><td className="ai-strong">{p?.name ?? 'Product removed'}</td><td className="ai-mono">{p?.sku ?? '—'}</td><td>{l.system ?? p?.stock ?? '—'}</td><td>{c.status === 'In progress' ? <input aria-label={`Count quantity for ${p?.name ?? 'product'}`} className="ai-qty-input" type="number" min="0" value={l.counted ?? ''} onChange={e => recordCount(c.id, l.productId, e.target.value === '' ? Number.NaN : Number(e.target.value))} /> : l.counted}</td><td>{variance === null || Number.isNaN(variance) ? '—' : <span className={variance === 0 ? 'ai-muted' : variance > 0 ? 'ai-positive' : 'ai-negative'}>{deltaText(variance)}</span>}</td></tr>; })}</tbody></table></div>{c.status === 'In progress' && <div className="ai-panel-footer"><span>Counted {c.lines.filter(l => l.counted !== null).length} of {c.lines.length}</span><button className="ai-button ai-button-green" onClick={() => completeCount(c)}><Check size={15} /> Complete stocktake</button></div>}</section>)}
      {!counts.length && <Empty title="No stocktakes yet" text="Start a full or partial count to reconcile quantities." />}
    </>}
    {currentPath === '/inventory/production' && <>
      <Heading title="Production" subtitle="Define recipes and record finished goods made from your existing catalog ingredients." action={backButton} />
      <section className="ai-panel ai-form-panel"><div className="ai-panel-heading"><div className="ai-panel-icon"><Factory size={18} /></div><div><h2>Recipe builder</h2><p>Each recipe currently uses one ingredient; save again to add another ingredient.</p></div></div><form onSubmit={addRecipe}><div className="ai-form-row"><ProductSelect products={products} value={recipeOutput} onChange={setRecipeOutput} label="Output product" /><Field label="Output quantity"><input type="number" min="1" value={recipeOutputQty} onChange={e => setRecipeOutputQty(e.target.value)} /></Field><ProductSelect products={products} value={recipeIngredient} onChange={setRecipeIngredient} label="Ingredient" /><Field label="Ingredient quantity"><input type="number" min="1" value={recipeQty} onChange={e => setRecipeQty(e.target.value)} /></Field><button className="ai-button ai-button-green" type="submit"><Plus size={15} /> Save recipe</button></div></form></section>
      <section className="ai-panel ai-table-panel"><div className="ai-panel-title-row"><div><h2>Production recipes</h2><p>Every run deducts ingredients and adds the output quantity.</p></div></div>{recipes.length ? <div className="ai-recipe-list">{recipes.map(recipe => <article className="ai-recipe" key={recipe.id}><div className="ai-recipe-mark"><Factory size={18} /></div><div className="ai-recipe-body"><strong>{productFor(recipe.outputId)?.name ?? 'Product removed'} <span>+{recipe.outputQty}</span></strong><p>{recipe.ingredients.map(i => `${productFor(i.productId)?.name ?? 'Removed product'} × ${i.quantity}`).join(' · ')}</p></div><button className="ai-button ai-button-green" onClick={() => runProduction(recipe)}>Run production</button><button className="ai-icon-button" aria-label="Delete recipe" onClick={() => setDeletePrompt({ kind: 'recipe', id: recipe.id, label: productFor(recipe.outputId)?.name ?? 'Recipe' })}><Trash2 size={15} /></button></article>)}</div> : <Empty title="No recipes saved" text="Build a recipe above to begin recording production runs." />}</section>
    </>}
    {currentPath === '/inventory/history' && <>
      <Heading title="Inventory history" subtitle="A searchable timeline of adjustments, receipts, production, counts, and transfer records." action={backButton} />
      <section className="ai-panel ai-table-panel"><div className="ai-toolbar"><label className="ai-search"><Search size={15} /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search product, reason, or ID" /></label><select aria-label="Filter movement type" value={kindFilter} onChange={e => setKindFilter(e.target.value)}>{['All movements', 'Added stock', 'Removed stock', 'Location transfers'].map(x => <option key={x}>{x}</option>)}</select></div>{movementRows.length ? <div className="ai-table-scroll"><table className="ai-table"><thead><tr><th>Product</th><th>Change</th><th>Reason</th><th>Date</th><th>Reference</th></tr></thead><tbody>{movementRows.map(m => <tr key={m.id}><td className="ai-strong">{m.productName}</td><td><span className={m.delta > 0 ? 'ai-positive' : m.delta < 0 ? 'ai-negative' : 'ai-muted'}>{m.delta === 0 ? 'Location only' : `${deltaText(m.delta)} units`}</span></td><td>{m.reason}</td><td>{date(m.createdAt)}</td><td className="ai-mono">{m.id.slice(0, 14)}</td></tr>)}</tbody></table></div> : <Empty title="No movement matches" text={stockMovements.length ? 'Try a different search or filter.' : 'Stock movements will appear here as inventory changes.'} />}</section>
    </>}
    {currentPath === '/inventory/valuation' && <>
      <Heading title="Inventory valuation" subtitle="Set estimated unit costs to understand today’s stock value and potential gross profit." action={backButton} />
      <div className="ai-stat-row"><div className="ai-stat-card"><span>Estimated cost value</span><strong>{money(inventoryValue, currency)}</strong><small>Demo estimate · based on on-hand quantity × unit cost</small></div><div className="ai-stat-card"><span>Potential sales value</span><strong>{money(products.reduce((sum, p) => sum + p.stock * p.price, 0), currency)}</strong><small>Demo estimate · based on current selling prices</small></div><div className="ai-stat-card ai-stat-green"><span>Potential gross profit</span><strong>{money(products.reduce((sum, p) => sum + p.stock * (p.price - (Number(costs[p.id]) || 0)), 0), currency)}</strong><small>Demo estimate · excludes fees, tax, and losses</small></div></div>
      <section className="ai-panel ai-table-panel"><div className="ai-panel-title-row"><div><h2>Unit cost assumptions</h2><p>Editable browser-local estimates. These are not supplier invoices or accounting records.</p></div></div><div className="ai-table-scroll"><table className="ai-table"><thead><tr><th>Product</th><th>SKU</th><th>On hand</th><th>Unit cost estimate ({currency})</th><th>Current cost value</th><th>Potential profit</th></tr></thead><tbody>{products.map(p => <tr key={p.id}><td className="ai-strong">{p.name}</td><td className="ai-mono">{p.sku}</td><td>{p.stock}</td><td><label className="ai-money-input"><span>{currency}</span><input aria-label={`Unit cost for ${p.name}`} type="number" min="0" step={currency === 'LRD' ? '1' : '0.01'} value={costs[p.id] ?? ''} placeholder="Set estimate" onChange={e => setCosts({ ...costs, [p.id]: Math.max(0, Number(e.target.value) || 0) })} /></label></td><td>{money(p.stock * (Number(costs[p.id]) || 0), currency)}</td><td>{money(p.stock * (p.price - (Number(costs[p.id]) || 0)), currency)}</td></tr>)}</tbody></table></div><div className="ai-disclaimer"><WalletCards size={16} /> All valuation figures are demo estimates for planning only, not audited financial values.</div></section>
    </>}
    {currentPath === '/inventory/labels' && <>
      <Heading title="Label printing" subtitle="Select products and quantities to create print-ready Code 128 barcode labels." action={backButton} />
      <section className="ai-panel ai-table-panel"><div className="ai-toolbar"><div><strong>Select labels</strong><span>{labelIds.length} products selected</span></div><button className="ai-button ai-button-green" onClick={printLabels}><Printer size={15} /> Print labels</button></div>{products.length ? <div className="ai-table-scroll"><table className="ai-table"><thead><tr><th>Select</th><th>Product</th><th>SKU</th><th>Price</th><th>Copies</th></tr></thead><tbody>{products.map(p => <tr key={p.id}><td><input aria-label={`Select ${p.name}`} type="checkbox" checked={labelIds.includes(p.id)} onChange={() => toggleLabel(p.id)} /></td><td className="ai-strong">{p.name}</td><td className="ai-mono">{p.sku}</td><td>{money(p.price, p.currency)}</td><td><input aria-label={`Label copies for ${p.name}`} className="ai-qty-input" type="number" min="1" max="100" value={labelQty[p.id] ?? 1} onChange={e => setLabelQty({ ...labelQty, [p.id]: Math.max(1, Number(e.target.value) || 1) })} /></td></tr>)}</tbody></table></div> : <Empty title="No products to label" text="Add products to the catalog before printing labels." />}<div className="ai-disclaimer"><Barcode size={16} /> Code 128 labels encode the SKU and include a human-readable value.</div></section>
    </>}
    {currentPath === '/inventory/low-stock' && <>
      <Heading title="Low stock" subtitle="Products at or below the alert threshold configured on each product." action={<>{backButton}<button className="ai-button ai-button-green" onClick={() => setPath('/purchases')}><Truck size={15} /> Open purchasing</button></>} />
      <section className="ai-panel ai-table-panel"><div className="ai-toolbar"><div><strong>{lowProducts.length} products need attention</strong><span>Each alert uses that product’s low-stock threshold</span></div><label className="ai-search"><Search size={15} /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search products" /></label></div>{lowProducts.filter(p => `${p.name} ${p.sku} ${p.category}`.toLowerCase().includes(query.toLowerCase())).length ? <div className="ai-table-scroll"><table className="ai-table"><thead><tr><th>Product</th><th>SKU</th><th>Category</th><th>On hand</th><th>Alert threshold</th><th>Suggested to threshold + 1</th><th></th></tr></thead><tbody>{lowProducts.filter(p => `${p.name} ${p.sku} ${p.category}`.toLowerCase().includes(query.toLowerCase())).map(p => <tr key={p.id}><td className="ai-strong">{p.name}</td><td className="ai-mono">{p.sku}</td><td>{p.category}</td><td><span className="ai-status danger">{p.stock} left</span></td><td>{p.lowStockThreshold}</td><td>{Math.max(1, p.lowStockThreshold - p.stock + 1)}</td><td><button className="ai-button ai-button-small" onClick={() => setPath('/purchases')}>Create purchase order</button></td></tr>)}</tbody></table></div> : <Empty title={lowProducts.length ? 'No products match' : 'Stock is above alert levels'} text={lowProducts.length ? 'Try a different search.' : 'Active catalog products are currently above their configured low-stock thresholds.'} />}</section>
    </>}
    {currentPath === '/inventory/batches' && <>
      <Heading title="Batches & expiry" subtitle="Keep lot quantity, storage location, and expiry dates visible to the stock team." action={backButton} />
      <section className="ai-panel ai-form-panel"><div className="ai-panel-heading"><div className="ai-panel-icon"><CalendarDays size={18} /></div><div><h2>{editBatch ? 'Edit lot' : 'Add a lot'}</h2><p>Lot quantities are tracking details; product on-hand remains the source of truth.</p></div></div><form onSubmit={saveBatch}><div className="ai-form-row ai-batch-row"><ProductSelect products={products} value={batchProduct} onChange={setBatchProduct} /><Field label="Lot / batch code"><input required value={batchLot} onChange={e => setBatchLot(e.target.value)} placeholder="e.g. LOT-0426-A" /></Field><Field label="Lot quantity"><input required type="number" min="0" value={batchQty} onChange={e => setBatchQty(e.target.value)} /></Field><Field label="Location"><select value={batchLocation} onChange={e => setBatchLocation(e.target.value)}>{locations.map(l => <option key={l}>{l}</option>)}</select></Field><Field label="Expiry date"><input required type="date" value={batchExpiry} onChange={e => setBatchExpiry(e.target.value)} /></Field><button className="ai-button ai-button-green" type="submit"><Plus size={15} /> {editBatch ? 'Save lot' : 'Add lot'}</button>{editBatch && <button className="ai-button" type="button" onClick={() => { setEditBatch(''); setBatchProduct(''); setBatchLot(''); setBatchQty(''); setBatchExpiry(''); }}>Cancel</button>}</div></form></section>
      <section className="ai-panel ai-table-panel"><div className="ai-toolbar"><div><strong>Expiry overview</strong><span>{filteredBatches.length} lots tracked</span></div><label className="ai-search"><Search size={15} /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search product, lot, or location" /></label><select aria-label="Expiry filter" onChange={e => setKindFilter(e.target.value)} value={['All movements', 'Expired lots', 'Expiring in 30 days', 'Expiring in 90 days'].includes(kindFilter) ? kindFilter : 'All movements'}>{['All movements', 'Expired lots', 'Expiring in 30 days', 'Expiring in 90 days'].map(x => <option key={x}>{x}</option>)}</select></div>{(() => { const data = filteredBatches.filter(b => kindFilter === 'Expired lots' ? b.days < 0 : kindFilter === 'Expiring in 30 days' ? b.days >= 0 && b.days <= 30 : kindFilter === 'Expiring in 90 days' ? b.days >= 0 && b.days <= 90 : true); return data.length ? <div className="ai-table-scroll"><table className="ai-table"><thead><tr><th>Product</th><th>Lot</th><th>Quantity</th><th>Location</th><th>Expiry</th><th>Condition</th><th>Actions</th></tr></thead><tbody>{data.map(b => <tr key={b.id}><td className="ai-strong">{b.product?.name}</td><td className="ai-mono">{b.lot}</td><td>{b.quantity}</td><td><span className="ai-route"><MapPin size={13} />{b.location}</span></td><td>{date(b.expiry)}</td><td><span className={`ai-status ${b.days < 0 ? 'danger' : b.days <= 30 ? 'warn' : 'good'}`}>{b.days < 0 ? `Expired ${Math.abs(b.days)}d` : b.days <= 30 ? `${b.days} days` : 'In date'}</span></td><td className="ai-actions"><button className="ai-button ai-button-small" onClick={() => { setEditBatch(b.id); setBatchProduct(b.productId); setBatchLot(b.lot); setBatchQty(String(b.quantity)); setBatchLocation(b.location); setBatchExpiry(b.expiry); }}>Edit</button><button className="ai-icon-button" aria-label={`Delete ${b.lot}`} onClick={() => setDeletePrompt({ kind: 'batch', id: b.id, label: b.lot })}><Trash2 size={14} /></button></td></tr>)}</tbody></table></div> : <Empty title="No lots in this view" text={batches.length ? 'Change the filter or search to see other lots.' : 'Add a tracked lot above to start monitoring expiry dates.'} />; })()}</section>
    </>}
    {deletePrompt && <div className="ai-modal-backdrop" role="presentation" onClick={() => setDeletePrompt(null)}><section className="ai-modal" role="dialog" aria-modal="true" aria-labelledby="ai-delete-title" tabIndex={-1} onKeyDown={e => { if (e.key === 'Escape') setDeletePrompt(null); }} onClick={e => e.stopPropagation()}><div className="ai-modal-icon"><Trash2 size={18} /></div><h2 id="ai-delete-title">Remove {deletePrompt.kind === 'batch' ? 'lot' : 'recipe'}?</h2><p><strong>{deletePrompt.label}</strong> will be removed from this browser demo. Product on-hand stock will not change.</p><div className="ai-modal-actions"><button className="ai-button" autoFocus onClick={() => setDeletePrompt(null)}>Keep record</button><button className="ai-button ai-button-danger" onClick={confirmRemove}>Remove record</button></div></section></div>}
   </div>;
}

function ArrowRightIcon() {
  return <ArrowLeftRight size={13} className="ai-arrow-inline" />;
}
