import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Link, useLocation } from 'wouter';
import {
  Activity, ArrowDownRight, ArrowUpRight, BarChart3, Bell, Box, Boxes, Check, ChevronDown,
  CircleDollarSign, ClipboardList, CreditCard, Download, FileText, Gauge, Globe2, Home, Menu,
  LifeBuoy, Package, Plus, Printer, RotateCcw, Search, Settings, ShoppingBag, ShoppingCart, Tag, Truck, Upload,
  Users, Wallet, X, LockKeyhole, CircleHelp, Send, ShieldCheck, Store as StoreIcon, ReceiptText,
} from 'lucide-react';
import PurchasingPage from '@/pages/purchasing';
import AdvancedInventory from '@/pages/advanced-inventory';
import type {
  OpenForm,
  Product,
  PurchaseOrder,
  StockMovement,
  Supplier,
} from '@/lib/purchasing-types';

type Customer = { id:string; name:string; phone:string; email:string; county:string; notes:string; createdAt?:string };
type SaleItem = { productId:string; name:string; quantity:number; unitPrice:number };
type Order = { id:string; createdAt:string; customerId:string|null; items:SaleItem[]; subtotal:number; discount:number; total:number; currency:'LRD'|'USD'; paymentMethod:string; status:'completed'|'refunded'; discountCode?:string; taxAmount?:number; deliveryFee?:number; fulfillment?:'pickup'|'delivery'; refundedAt?:string; refundReason?:string };
type Discount = { id:string; name:string; code:string; type:'percent'|'fixed'; value:number; active:boolean; startsAt:string; endsAt:string };
type TeamMember = { id:string; name:string; email:string; role:'owner'|'manager'|'cashier'; pin?:string; permissions?:string[] };
type Business = { id:string; name:string; category:string; country:'Liberia'; county:string; city:string; currency:'LRD'|'USD'; timezone:'Africa/Monrovia' };
type CashShift = { id:string; openedAt:string; closedAt?:string; openingCash:number; expectedCash?:number; closingCash?:number; difference?:number };
type Store = { business:Business; user:TeamMember; products:Product[]; customers:Customer[]; orders:Order[]; discounts:Discount[]; team:TeamMember[]; settings:Record<string,string>; stockMovements:StockMovement[]; shifts:CashShift[]; suppliers:Supplier[]; purchaseOrders:PurchaseOrder[] };

const counties = ['Bomi','Bong','Gbarpolu','Grand Bassa','Grand Cape Mount','Grand Gedeh','Grand Kru','Lofa','Margibi','Maryland','Montserrado','Nimba','River Cess','River Gee','Sinoe'];
const authHeadlinePhrases = [
  'run the everyday.',
  'sell with ease.',
  'track every sale.',
  'grow every day.',
];
const navMain = [
  ['Home', '/home', Home], ['Orders','/orders',ClipboardList], ['Cash register','/cash-register',Gauge], ['Products','/products',Package], ['Purchasing','/purchases',Truck], ['Advanced Inventory','/inventory',Boxes], ['Customers','/customers',Users],
  ['Growth','/growth',Activity], ['Discounts','/discounts',Tag], ['Content','/content',FileText], ['Markets','/markets',Globe2],
  ['Finance','/finance',Wallet], ['Analytics','/analytics',BarChart3], ['Team','/team',Users],
];
const settingsItems = ['General','Plan','Billing','Users','Payments','Checkout','Receipts','Customer accounts','Shipping and delivery','Taxes and duties','Locations','Markets','Apps','Sales channels','Domains','Notifications'];
const permissionPages = [
  ['/home','Home'],['/orders','Orders'],['/cash-register','Cash register'],['/products','Products'],['/purchases','Purchasing'],['/inventory','Advanced Inventory'],['/customers','Customers'],
  ['/growth','Growth'],['/discounts','Discounts'],['/content','Content'],['/markets','Markets'],['/finance','Finance'],['/analytics','Analytics'],['/team','Team'],['/settings','Settings'],['/support','Support'],
] as const;
const roleDefaults:Record<'manager'|'cashier',string[]> = {
  manager:['/home','/orders','/cash-register','/products','/purchases','/inventory','/customers','/growth','/discounts','/content','/markets','/finance','/analytics','/support'],
  cashier:['/home','/orders','/cash-register','/customers','/support'],
};
const demoProducts:Product[] = [
  {id:'p1',name:'Liberian Coffee · 250g',sku:'COF-025',category:'Pantry',price:1150,currency:'LRD',stock:23,lowStockThreshold:6,active:true},
  {id:'p2',name:'Palm Butter · 500ml',sku:'PAN-014',category:'Pantry',price:780,currency:'LRD',stock:16,lowStockThreshold:5,active:true},
  {id:'p3',name:'Handwoven Market Tote',sku:'CRA-008',category:'Handmade',price:2400,currency:'LRD',stock:8,lowStockThreshold:3,active:true},
  {id:'p4',name:'Cassava Flour · 1kg',sku:'PAN-031',category:'Pantry',price:520,currency:'LRD',stock:31,lowStockThreshold:8,active:true},
  {id:'p5',name:'Kola Nut Soap',sku:'BEA-011',category:'Personal care',price:450,currency:'LRD',stock:4,lowStockThreshold:5,active:true},
  {id:'p6',name:'Coconut Oil · 250ml',sku:'BEA-016',category:'Personal care',price:960,currency:'LRD',stock:12,lowStockThreshold:4,active:true},
];
const seedOrders:Order[] = [
  {id:'GC-1042',createdAt:new Date(Date.now()-3600000*2).toISOString(),customerId:'c1',items:[{productId:'p1',name:'Liberian Coffee · 250g',quantity:2,unitPrice:1150}],subtotal:2300,discount:0,total:2300,currency:'LRD',paymentMethod:'mobile-money',status:'completed'},
  {id:'GC-1041',createdAt:new Date(Date.now()-3600000*7).toISOString(),customerId:'c2',items:[{productId:'p3',name:'Handwoven Market Tote',quantity:1,unitPrice:2400},{productId:'p4',name:'Cassava Flour · 1kg',quantity:2,unitPrice:520}],subtotal:3440,discount:0,total:3440,currency:'LRD',paymentMethod:'cash',status:'completed'},
  {id:'GC-1040',createdAt:new Date(Date.now()-86400000).toISOString(),customerId:null,items:[{productId:'p2',name:'Palm Butter · 500ml',quantity:1,unitPrice:780}],subtotal:780,discount:0,total:780,currency:'LRD',paymentMethod:'cash',status:'completed'},
];
const normalizeStore = (raw:unknown):Store|null => {
  if(!raw||typeof raw!=='object')return null;
  const value=raw as Partial<Store>;
  if(!value.business||!value.user)return null;
  return {
    business:value.business,
    user:value.user,
    products:Array.isArray(value.products)?value.products:[],
    customers:Array.isArray(value.customers)?value.customers:[],
    orders:Array.isArray(value.orders)?value.orders:[],
    discounts:Array.isArray(value.discounts)?value.discounts:[],
    team:Array.isArray(value.team)?value.team:[value.user],
    settings:value.settings&&typeof value.settings==='object'?value.settings:{},
    stockMovements:Array.isArray(value.stockMovements)?value.stockMovements:[],
    shifts:Array.isArray(value.shifts)?value.shifts:[],
    suppliers:Array.isArray(value.suppliers)?value.suppliers:[],
    purchaseOrders:Array.isArray(value.purchaseOrders)?value.purchaseOrders:[],
  };
};
const readStore = ():Store|null => { try { const saved=localStorage.getItem('gotecx-demo-store');return saved?normalizeStore(JSON.parse(saved)):null; } catch { return null; } };
const money = (n:number,currency:string) => new Intl.NumberFormat('en-LR',{style:'currency',currency,maximumFractionDigits:currency==='LRD'?0:2}).format(n);
const initials = (name:string) => name.split(/\s+/).slice(0,2).map(x=>x[0]).join('').toUpperCase() || 'G';
const id = () => Math.random().toString(36).slice(2,9);
const dateText = (d:string) => new Intl.DateTimeFormat('en-LR',{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}).format(new Date(d));
const downloadText = (filename:string,text:string,mime='text/plain') => {
  const url=URL.createObjectURL(new Blob([text],{type:mime}));
  const link=document.createElement('a');link.href=url;link.download=filename;link.click();
  window.setTimeout(()=>URL.revokeObjectURL(url),1000);
};
const downloadCsv = (filename:string,rows:(string|number)[][]) => {
  const csv=rows.map(row=>row.map(value=>`"${String(value??'').replaceAll('"','""')}"`).join(',')).join('\r\n');
  downloadText(filename,`\uFEFF${csv}`,'text/csv;charset=utf-8');
};
const shiftCashSummary = (store:Store,shift:CashShift) => {
  const openedAt=new Date(shift.openedAt).getTime();
  const cashSales=store.orders.filter(o=>o.currency===store.business.currency&&o.paymentMethod==='cash'&&o.status==='completed'&&new Date(o.createdAt).getTime()>=openedAt).reduce((sum,o)=>sum+o.total,0);
  const cashRefunds=store.orders.filter(o=>o.currency===store.business.currency&&o.paymentMethod==='cash'&&o.status==='refunded'&&new Date(o.refundedAt||o.createdAt).getTime()>=openedAt).reduce((sum,o)=>sum+o.total,0);
  return {cashSales,cashRefunds,expectedCash:shift.openingCash+cashSales-cashRefunds};
};
const memberCanOpen=(store:Store,memberId:string,route:string)=>{
  if(route==='/home')return true;
  const member=store.team.find(person=>person.id===memberId)||store.user;
  const permissionRoute=route.startsWith('/inventory/')?'/inventory':route;
  return member.role==='owner'||(member.permissions??roleDefaults[member.role]).includes(permissionRoute);
};

function App() {
  const [path, setPath] = useLocation();
  const [store,setStore] = useState<Store|null>(()=>readStore());
  const [activeMemberId,setActiveMemberId] = useState<string|null>(()=>{try{return localStorage.getItem('gotecx-demo-session');}catch{return null;}});
  const [search,setSearch] = useState('');
  const [toast,setToast] = useState('');
  const [modal,setModal] = useState<{title:string;subtitle?:string;content:ReactNode}|null>(null);
  const [settingsTab,setSettingsTab] = useState('General');
  const [period,setPeriod] = useState('7 days');
  const [mobileNav,setMobileNav] = useState(false);
  const [receiptOrder,setReceiptOrder] = useState<Order|null>(null);
  useEffect(()=>{ if(store) localStorage.setItem('gotecx-demo-store',JSON.stringify(store)); else localStorage.removeItem('gotecx-demo-store'); },[store]);
  useEffect(()=>{ if(toast){const t=setTimeout(()=>setToast(''),2800);return()=>clearTimeout(t);} return undefined; },[toast]);
  useEffect(()=>{if(store&&activeMemberId&&path!=='/login'&&!memberCanOpen(store,activeMemberId,path)){setPath('/home');return;}if(store&&(path==='/'||path==='/register'||(path==='/login'&&!!activeMemberId)))setPath('/home');if(store&&!activeMemberId&&path!=='/login')setPath('/login');if(!store&&!['/login','/register'].includes(path))setPath('/login');},[store,path,setPath,activeMemberId]);
  const update = (key:keyof Store, value:unknown) => setStore(s=>s?({...s,[key]:value} as Store):s);
  const notify = (message:string)=>setToast(message);
  const logout = ()=>{setActiveMemberId(null);localStorage.removeItem('gotecx-demo-session');setPath('/login');setToast('Signed out of this browser.');};
  const exportBackup=()=>{
    if(!store)return;
    downloadText(`gotecxpos-${store.business.name.toLowerCase().replace(/[^a-z0-9]+/g,'-')}-backup.json`,JSON.stringify({format:'gotecxpos-backup',version:1,exportedAt:new Date().toISOString(),store},null,2),'application/json');
    notify('Workspace backup downloaded.');
  };
  const importBackup=async(file:File)=>{
    try{
      const payload=JSON.parse(await file.text());
      if(payload?.format&&payload.format!=='gotecxpos-backup')throw new Error('This file is not a GotecxPOS backup.');
      const restored=normalizeStore(payload?.store||payload);
      if(!restored)throw new Error('The backup file is missing required workspace data.');
      if(!window.confirm('Restore this backup? It will replace the workspace currently saved in this browser.'))return;
      setStore(restored);setSearch('');setPath('/home');notify('Workspace backup restored.');
    }catch(error){notify(error instanceof Error?error.message:'Could not read this backup file.');}
  };
  const openForm = (title:string, fields:{key:string;label:string;type?:string;options?:string[];required?:boolean;defaultValue?:string|number}[], initial:Record<string,any>, onSave:(values:Record<string,any>)=>void, subtitle?:string) => {
    const Form=()=>{const [values,setValues]=useState<Record<string,any>>({...initial}); const submit=(e:FormEvent)=>{e.preventDefault();onSave(values);setModal(null);};
      return <form onSubmit={submit}><div className="form-grid">{fields.map(f=><div className={`field ${f.type==='textarea'?'wide':''}`} key={f.key}><label>{f.label}</label>{f.type==='select'?<select value={values[f.key]??''} onChange={e=>setValues({...values,[f.key]:e.target.value})}>{(f.options||[]).map(x=><option key={x}>{x}</option>)}</select>:f.type==='textarea'?<textarea required={f.required} value={values[f.key]??''} onChange={e=>setValues({...values,[f.key]:e.target.value})}/>:<input required={f.required} type={f.type||'text'} value={values[f.key]??''} onChange={e=>setValues({...values,[f.key]:e.target.value})}/>}</div>)}</div><div className="dialog-actions"><button type="button" className="button" onClick={()=>setModal(null)}>Cancel</button><button className="button primary" type="submit">Save changes</button></div></form>; };
    setModal({title,subtitle,content:<Form/>});
  };
  const confirmDelete=(label:string,onDelete:()=>void)=>setModal({title:`Delete ${label}?`,subtitle:'This action cannot be undone.',content:<div><p style={{fontSize:13,color:'#68716c'}}>This item will be removed from your local demo workspace.</p><div className="dialog-actions"><button className="button" onClick={()=>setModal(null)}>Keep it</button><button className="button danger" onClick={()=>{onDelete();setModal(null);notify(`${label} deleted.`)}}>Delete</button></div></div>});

  if(!store || !activeMemberId) return <AuthPage path={path} setPath={setPath} setStore={setStore} currentStore={store} setActiveMemberId={memberId=>{setActiveMemberId(memberId);localStorage.setItem('gotecx-demo-session',memberId);}} notify={notify}/>;
  const activeMember=store.team.find(member=>member.id===activeMemberId)||store.user;
  const canAccess=(route:string)=>activeMember.role==='owner'||(activeMember.permissions??roleDefaults[activeMember.role]).includes(route.startsWith('/inventory/')?'/inventory':route);
  const navItems=[...navMain,['Support','/support',LifeBuoy] as const];
  const navCounts:Record<string,{value:number;label:string}>={
    '/orders':{value:store.orders.length,label:'orders'},
    '/products':{value:store.products.length,label:'products'},
    '/purchases':{value:store.purchaseOrders.filter(order=>order.status==='open').length,label:'open purchase orders'},
  };
  return <div className="app-frame">
    <aside className={`sidebar ${mobileNav?'mobile-show':''}`}>
      <div className="brand"><div className="brand-mark">G</div> gotecx<span style={{fontWeight:400,color:'#8e9994'}}>POS</span></div>
       <div className="nav-group">{navItems.filter(([,href])=>canAccess(href as string)).map(([label,href,Icon])=>{const count=navCounts[href as string];return <Link href={href as string} className={`nav-link ${path===href||(href==='/inventory'&&path.startsWith('/inventory/'))?'active':''}`} key={href as string} onClick={()=>setMobileNav(false)} data-testid={`link-nav-${String(label).toLowerCase().replaceAll(' ','-')}`}><Icon size={16}/><span>{label as string}</span>{href==='/inventory'&&<span className="advanced-nav-pro">PRO</span>}{count&&count.value>0&&<span className="nav-count" aria-label={`${count.value} ${count.label}`}>{count.value>99?'99+':count.value}</span>}</Link>})}</div>
      {canAccess('/content')&&<><div className="nav-caption">Sales channels</div><Link href="/content" className={`nav-link ${path==='/content'?'active':''}`} onClick={()=>setMobileNav(false)}><ShoppingBag size={16}/>Online storefront</Link></>}
      <div className="side-bottom">{canAccess('/settings')&&<Link href="/settings" className={`nav-link ${path==='/settings'?'active':''}`} onClick={()=>setMobileNav(false)}><Settings size={16}/>Settings</Link>}
        <button className="nav-link" data-testid="button-switch-staff" style={{width:'100%',border:0,background:'transparent',textAlign:'left'}} onClick={()=>{setMobileNav(false);logout();}}><div className="avatar">{initials(activeMember.name)}</div><span style={{minWidth:0,overflow:'hidden',textOverflow:'ellipsis'}}>{activeMember.name} · {activeMember.role}</span><ChevronDown size={14}/></button>
      </div>
    </aside>
    {mobileNav&&<button className="mobile-nav-scrim" aria-label="Close navigation menu" onClick={()=>setMobileNav(false)}/>}
    <main className="workspace">
       <header className="topbar"><div className="topbar-left"><button className="mobile-menu" onClick={()=>setMobileNav(!mobileNav)} aria-label="Toggle navigation">{mobileNav?<X size={19}/>:<Menu size={19}/>}</button><div className="searchbar"><Search size={14}/><input aria-label="Search your store" placeholder="Search your store" value={search} onChange={e=>setSearch(e.target.value)}/><span style={{fontSize:10,color:'#939995'}}>⌘ K</span></div></div><div style={{display:'flex',alignItems:'center',gap:16}}><span className="topbar-location muted" style={{fontSize:11}}><Globe2 size={14} style={{verticalAlign:'middle',marginRight:5}}/>Monrovia · {store.business.currency}</span><button className="button small" onClick={()=>{const messages:string[]=[];const low=store.products.filter(p=>p.active&&p.stock<=p.lowStockThreshold);if(store.settings['notify-0']!=='false'&&low.length)messages.push(`${low.length} low-stock item${low.length===1?'':'s'}`);const today=new Date().toDateString();const sales=store.orders.filter(o=>o.status==='completed'&&new Date(o.createdAt).toDateString()===today);if(store.settings['notify-1']!=='false')messages.push(`${sales.length} sale${sales.length===1?'':'s'} today · ${money(sales.reduce((sum,o)=>sum+o.total,0),store.business.currency)}`);const newCustomers=store.customers.filter(c=>c.createdAt&&new Date(c.createdAt).toDateString()===today);if(store.settings['notify-2']!=='false'&&newCustomers.length)messages.push(`${newCustomers.length} new customer profile${newCustomers.length===1?'':'s'}`);notify(messages.join(' · ')||'No new reminders.') }} aria-label="Notifications"><Bell size={14}/></button><div className="avatar">{initials(activeMember.name)}</div></div></header>
      <section className="content">
        {path==='/home'&&<Dashboard store={store} setPath={setPath} notify={notify}/>}
        {path==='/products'&&<Products store={store} update={update} search={search} setSearch={setSearch} openForm={openForm} confirmDelete={confirmDelete} notify={notify}/>}
        {path==='/customers'&&<Customers store={store} update={update} search={search} setSearch={setSearch} openForm={openForm} confirmDelete={confirmDelete}/>}
        {path==='/orders'&&<Orders store={store} update={update} search={search} setSearch={setSearch} openForm={openForm} setReceiptOrder={setReceiptOrder} notify={notify}/>}
         {path==='/purchases'&&<PurchasingPage suppliers={store.suppliers} purchaseOrders={store.purchaseOrders} products={store.products} stockMovements={store.stockMovements} currency={store.business.currency} search={search} setSearch={setSearch} setPath={setPath} updateSuppliers={value=>update('suppliers',value)} updatePurchaseOrders={value=>update('purchaseOrders',value)} updateProducts={value=>update('products',value)} updateStockMovements={value=>update('stockMovements',value)} openForm={openForm} confirmDelete={confirmDelete} notify={notify}/>}
        {(path==='/inventory'||path.startsWith('/inventory/'))&&<AdvancedInventory path={path} setPath={setPath} products={store.products} stockMovements={store.stockMovements} currency={store.business.currency} onProductsChange={products=>update('products',products)} onStockMovementsChange={movements=>update('stockMovements',movements)} notify={notify}/>}
        {path==='/cash-register'&&<CashRegister store={store} update={update} openForm={openForm}/>}
        {path==='/discounts'&&<Discounts store={store} update={update} search={search} setSearch={setSearch} openForm={openForm} confirmDelete={confirmDelete}/>}
        {path==='/analytics'&&<Analytics store={store} period={period} setPeriod={setPeriod}/>}
        {path==='/finance'&&<Finance store={store} setPath={setPath}/>}
        {path==='/team'&&<Team store={store} update={update} confirmDelete={confirmDelete}/>}
        {path==='/markets'&&<Markets store={store} update={update} openForm={openForm} notify={notify}/>}
        {path==='/growth'&&<Growth setPath={setPath} store={store}/>}
        {path==='/content'&&<Content setPath={setPath} store={store} update={update} openForm={openForm} notify={notify}/>}
         {path==='/settings'&&<SettingsPage store={store} update={update} tab={settingsTab} setTab={setSettingsTab} setPath={setPath} exportBackup={exportBackup} importBackup={importBackup} notify={notify}/>}
         {path==='/support'&&<SupportPage store={store} notify={notify}/>}
      </section>
     <div className="demo-footer">Browser-local demo only · Authentication, PIN checks, permissions, and support requests are not server-backed or production security. Data is not shared across devices.</div>
    </main>
    {modal&&<div className="overlay" onMouseDown={e=>{if(e.target===e.currentTarget)setModal(null)}}><div className="dialog"><div className="dialog-head"><div><h2>{modal.title}</h2>{modal.subtitle&&<p>{modal.subtitle}</p>}</div><button className="button small" onClick={()=>setModal(null)} aria-label="Close"><X size={15}/></button></div>{modal.content}</div></div>}
    {receiptOrder&&<ReceiptPreview store={store} order={receiptOrder} onClose={()=>setReceiptOrder(null)}/>}
    {toast&&<div className="toast">{toast}</div>}
  </div>;
}

function AuthPage({path,setPath,setStore,currentStore,setActiveMemberId,notify}:{path:string;setPath:(p:string)=>void;setStore:(s:Store)=>void;currentStore:Store|null;setActiveMemberId:(id:string)=>void;notify:(s:string)=>void}) {
  const register=path==='/register';
  const [heroPhraseIndex,setHeroPhraseIndex]=useState(0);
  const [signInMode,setSignInMode]=useState<'owner'|'staff'>('owner');
  const [error,setError]=useState('');
  const staffProfiles=currentStore?.team.filter(person=>person.role!=='owner')??[];
  useEffect(()=>{
    if(window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
    const timer=window.setInterval(()=>setHeroPhraseIndex(index=>(index+1)%authHeadlinePhrases.length),6500);
    return()=>window.clearInterval(timer);
  },[]);
  const signInStaff=(event:FormEvent<HTMLFormElement>)=>{
    event.preventDefault();setError('');
    if(!currentStore)return;
    const form=new FormData(event.currentTarget);const memberId=String(form.get('member')||'');const pin=String(form.get('pin')||'');
    if(!/^\d{4,6}$/.test(pin)){setError('Enter your 4–6 digit staff PIN.');return;}
    const member=currentStore.team.find(person=>person.id===memberId);
    if(!member||member.role==='owner'||!member.pin||member.pin!==pin){setError('That store profile and PIN do not match. Ask your store admin to check the local profile.');return;}
    setActiveMemberId(member.id);setPath('/home');notify(`Signed in as ${member.name}.`);
  };
  const submit=(e:FormEvent<HTMLFormElement>)=>{
    e.preventDefault();setError('');
    const fd=new FormData(e.currentTarget);
    const email=String(fd.get('email')||'').trim();
    const name=String(fd.get('name')||email.split('@')[0]||'Shop owner');
    const businessName=register?String(fd.get('business')||''):'My demo shop';
    if(!register&&currentStore){
      const owner=currentStore.team.find(person=>person.role==='owner')||currentStore.user;
      if(email.toLowerCase()!==owner.email.toLowerCase()){setError('Use the owner email saved in this browser.');return;}
      setActiveMemberId(owner.id);setPath('/home');notify('Welcome back to your local workspace.');return;
    }
    if(register&&String(fd.get('password')||'').length<8){setError('Use at least 8 characters for the local demo password.');return;}
    const business:Business={id:id(),name:businessName,category:String(fd.get('category')||'Retail'),country:'Liberia',county:String(fd.get('county')||'Montserrado'),city:String(fd.get('city')||'Monrovia'),currency:'LRD',timezone:'Africa/Monrovia'};
    const user:TeamMember={id:id(),name,email,role:'owner'};
     const store:Store={business,user,products:register?demoProducts:[],customers:register?[{id:'c1',name:'Massa K. Johnson',phone:'+231 77 234 9182',email:'massa@example.com',county:'Montserrado',notes:'Regular customer'},{id:'c2',name:'Samuel Toe',phone:'+231 88 510 2731',email:'',county:'Margibi',notes:''}]:[],orders:register?seedOrders:[],discounts:[],team:[user],settings:{},stockMovements:[],shifts:[],suppliers:[],purchaseOrders:[]};
    setStore(store);setActiveMemberId(user.id);setPath('/home');notify(register?'Your Liberia store is ready.':'Welcome to your demo workspace.');
  };
  return (
    <main className={`auth-page ${register ? 'auth-page-register' : 'auth-page-login'}`}>
      <div className="auth-story"><div className="auth-story-brand"><div className="brand-mark">G</div><span>gotecx<span className="brand-product">POS</span></span></div><div className="auth-illustration"><div className="auth-orbit orbit-one"/><div className="auth-orbit orbit-two"/><div className="auth-receipt"><div className="receipt-mark">G</div><span className="auth-lines short"/><span className="auth-lines"/><span className="auth-lines"/><span className="auth-total"/></div><div className="auth-float"><span>Today’s sales</span><strong>LRD 48,750</strong><small>Monrovia · Liberia</small></div></div><p className="auth-story-copy">A steadier way to<br/><span key={heroPhraseIndex} className="auth-story-highlight" aria-live="polite" aria-atomic="true">{authHeadlinePhrases[heroPhraseIndex]}</span></p><span className="auth-story-note">Sales, stock and your people — together in one place.</span></div>
      <section className="auth-card">
        <div className="auth-brand">
          <div className="brand-mark">G</div>
          <span>Gotecx<span className="brand-product">POS</span></span>
        </div>
        <div className="auth-form">
          <h2>{register ? 'Set up your store' : currentStore?'Sign in to this store':'Welcome back'}</h2>
          <p>{register ? 'Your daily workspace starts here.' : currentStore ? signInMode==='staff' ? `Choose your profile and enter its PIN for ${currentStore.business.name}.` : `Sign in as the owner of ${currentStore.business.name}.` : signInMode==='staff' ? 'Staff sign-in becomes available after an owner sets up a store in this browser.' : 'Sign in to your local GotecxPOS workspace.'}</p>
          {!register&&<div className="auth-role-switch" role="group" aria-label="Choose sign-in type">
            <button type="button" data-testid="button-owner-mode" aria-pressed={signInMode==='owner'} onClick={()=>{setSignInMode('owner');setError('');}}>Owner sign-in</button>
            <button type="button" data-testid="button-staff-mode" aria-pressed={signInMode==='staff'} onClick={()=>{setSignInMode('staff');setError('');}}>Staff sign-in</button>
          </div>}
          {!register&&signInMode==='staff'&&currentStore&&staffProfiles.length>0&&<form onSubmit={signInStaff} className="staff-signin-form">
            <div className="field"><label htmlFor="staff-member">Staff profile</label><select id="staff-member" name="member" required defaultValue=""><option value="" disabled>Select your profile</option>{staffProfiles.map(person=><option key={person.id} value={person.id}>{person.name} · {person.role}</option>)}</select></div>
            <div className="field"><label htmlFor="staff-pin">Staff PIN</label><input data-testid="input-staff-pin" id="staff-pin" name="pin" type="password" inputMode="numeric" autoComplete="off" pattern="[0-9]{4,6}" minLength={4} maxLength={6} required placeholder="Enter your 4–6 digit PIN"/></div>
            {error&&<p className="form-error" role="alert">{error}</p>}
            <button className="button primary auth-submit" data-testid="button-pin-signin" type="submit"><LockKeyhole size={15}/> Sign in as staff</button>
          </form>}
          {!register&&signInMode==='staff'&&(!currentStore||staffProfiles.length===0)&&<div className="auth-staff-empty" role="status">
            <strong>{currentStore?'No staff profiles yet':'Staff sign-in is not set up yet'}</strong>
            <p>{currentStore?'An owner can add staff profiles from the Team page.':'An owner must set up a store in this browser before staff can sign in.'}</p>
          </div>}
          {(register||signInMode==='owner')&&<form onSubmit={submit}>
            {register && (
              <>
                <div className="field">
                  <label htmlFor="auth-name">Your name</label>
                  <input id="auth-name" data-testid="input-owner-name" name="name" required placeholder="e.g. Josephine Doe" />
                </div>
                <div className="field">
                  <label htmlFor="auth-business">Business name</label>
                  <input id="auth-business" data-testid="input-business-name" name="business" required placeholder="e.g. Waterside Market Shop" />
                </div>
                <div className="field">
                  <label htmlFor="auth-category">Business type</label>
                  <select id="auth-category" name="category">
                    <option>Retail</option>
                    <option>Food & beverage</option>
                    <option>Beauty & personal care</option>
                    <option>Professional services</option>
                    <option>Handmade goods</option>
                    <option>Other</option>
                  </select>
                </div>
                <div className="form-grid">
                  <div className="field">
                    <label htmlFor="auth-county">County</label>
                    <select id="auth-county" name="county">
                      {counties.map((county) => <option key={county}>{county}</option>)}
                    </select>
                  </div>
                  <div className="field">
                    <label htmlFor="auth-city">City / town</label>
                    <input id="auth-city" name="city" defaultValue="Monrovia" />
                  </div>
                </div>
              </>
            )}
            <div className="field">
                <label htmlFor="auth-email">Owner email</label>
                <input
                  id="auth-email"
                  data-testid="input-owner-email"
                  type="email"
                  name="email"
                  required
                  placeholder="you@example.com"
                  autoComplete="email"
                />
            </div>
            {register&&(
              <div className="field">
                <label htmlFor="auth-password">Demo password</label>
                <input
                  id="auth-password"
                  data-testid="input-demo-password"
                  type="password"
                  name="password"
                  required
                  minLength={8}
                  placeholder="At least 8 characters"
                  autoComplete="new-password"
                />
              </div>
            )}
            {error&&<p className="form-error" role="alert">{error}</p>}
            <button className={`button ${register ? 'primary' : 'auth-submit'}`} type="submit" data-testid={register?'button-create-workspace':'button-owner-signin'}>
              {register ? 'Create local workspace' : 'Continue as owner'}
            </button>
          </form>}
          {!currentStore&&<><div className="auth-divider"><span>or</span></div><div className="auth-switch">{register ? 'Already have a workspace?' : 'New to Gotecx?'}{' '}<button type="button" onClick={()=>setPath(register?'/login':'/register')}>{register ? 'Log in' : 'Create your store'}</button></div></>}
          <div className="local-demo-note"><ShieldCheck size={15}/><span>Demo only. Sign-in is browser-local and not secure. Data stays in this browser.</span></div>
        </div>
      </section>
      <p className="auth-footer">Built for the pace of independent retail in Liberia · LRD and USD supported</p>
    </main>
  );
}

function PageHead({title,subtitle,action}:{title:string;subtitle:string;action?:ReactNode}) {return <div className="page-head"><div><h1 className="page-title">{title}</h1><p className="page-subtitle">{subtitle}</p></div>{action}</div>}
function Stat({label,value,note,icon:Icon}:{label:string;value:string;note:string;icon:any}) {return <div className="panel stat-card"><div className="stat-label">{label}</div><div className="stat-accent"><Icon size={16}/></div><div className="stat-value">{value}</div><div className="stat-note">{note}</div></div>}
function Dashboard({store,setPath,notify}:{store:Store;setPath:(p:string)=>void;notify:(s:string)=>void}) {
  const revenue=store.orders.filter(o=>o.status==='completed'&&o.currency===store.business.currency).reduce((s,o)=>s+o.total,0), low=store.products.filter(p=>p.active&&p.stock<=p.lowStockThreshold).length;
  const last=store.orders.slice(0,5);
  const posEnabled=store.settings.posChannel!=='false';
  return <><PageHead title="Home" subtitle={`Good day, ${store.user.name.split(' ')[0]}. Here is your business at a glance.`} action={<button className="button primary" disabled={!posEnabled} title={!posEnabled?'Enable point of sale in Settings → Sales channels':''} onClick={()=>setPath('/orders')}><Plus size={15}/> {posEnabled?'Create sale':'POS paused'}</button>}/>
    <div className="stat-grid"><Stat label="Total sales" value={money(revenue,store.business.currency)} note="Across completed demo orders" icon={CircleDollarSign}/><Stat label="Orders" value={String(store.orders.length)} note="All recorded transactions" icon={ShoppingCart}/><Stat label="Products" value={String(store.products.length)} note={`${low} need a stock check`} icon={Box}/><Stat label="Customers" value={String(store.customers.length)} note="In your customer list" icon={Users}/></div>
    <div className="dashboard-grid">
      <div className="panel recent-orders-panel">
        <div className="panel-head">
          <div><h3 className="panel-title">Recent orders</h3><span className="panel-kicker">Latest transactions</span></div>
          <button className="button small" onClick={()=>setPath('/orders')}>View all</button>
        </div>
        {last.length?
          <>
            <div className="table-wrap recent-orders-desktop"><table><thead><tr><th>Order</th><th>Customer</th><th>Date</th><th>Total</th><th>Status</th></tr></thead><tbody>{last.map(o=><tr key={o.id}><td className="table-primary">#{o.id}</td><td>{store.customers.find(c=>c.id===o.customerId)?.name||'Walk-in'}</td><td>{dateText(o.createdAt)}</td><td className="recent-order-desktop-total">{money(o.total,o.currency)}</td><td><span className={`badge ${o.status==='refunded'?'red':''}`}>{o.status}</span></td></tr>)}</tbody></table></div>
            <div className="recent-order-list">{last.map(o=><article className="recent-order-card" key={o.id}>
              <div className="recent-order-card-heading"><strong>#{o.id}</strong><span className={`badge ${o.status==='refunded'?'red':''}`}>{o.status}</span></div>
              <div className="recent-order-card-details"><div><small>Customer</small><strong className="recent-order-customer">{store.customers.find(c=>c.id===o.customerId)?.name||'Walk-in'}</strong></div><div className="recent-order-date"><small>Date</small><span>{dateText(o.createdAt)}</span></div></div>
              <div className="recent-order-card-total"><small>Total</small><strong>{money(o.total,o.currency)}</strong></div>
            </article>)}</div>
          </>
          :<Empty title="No orders yet" text="Create your first sale to see activity here." action="Start a sale" onClick={()=>setPath('/orders')}/>}
      </div>
      <div className="panel"><div className="panel-head"><div><h3 className="panel-title">Stock to watch</h3><span className="panel-kicker">{low} low-stock products</span></div><button className="button small" onClick={()=>setPath('/products')}>Manage</button></div><div className="panel-body">{store.products.filter(p=>p.active&&p.stock<=p.lowStockThreshold).slice(0,4).map(p=><div className="cart-row" key={p.id}><div><strong style={{display:'block',fontSize:12}}>{p.name}</strong><span className="muted">{p.sku}</span></div><span className="badge amber">{p.stock} left</span></div>)}{!low&&<div className="callout">Everything is above its low-stock threshold. Nice work.</div>}</div></div>
    </div>
     <div className="panel"><div className="panel-head"><h3 className="panel-title">Shortcuts</h3><span className="muted" style={{fontSize:11}}>Keep the day moving</span></div><div className="panel-body" style={{display:'flex',flexWrap:'wrap',gap:10}}>{[['New sale','/orders',ShoppingCart],['Open register','/cash-register',Gauge],['Add product','/products',Package],['Add customer','/customers',Users],['View analytics','/analytics',BarChart3]].map(([x,p,I]:any)=><button className="button" disabled={x==='New sale'&&!posEnabled} title={x==='New sale'&&!posEnabled?'Enable point of sale in Settings → Sales channels':''} key={x} onClick={()=>setPath(p)}><I size={14}/>{x}</button>)}</div></div>
  </>;
}
function Empty({title,text,action,onClick}:{title:string;text:string;action?:string;onClick?:()=>void}) {return <div className="empty-state"><div className="empty-state-mark"><ShoppingBag size={21}/></div><h3>{title}</h3><p>{text}</p>{action&&<button className="button primary" onClick={onClick}><Plus size={14}/>{action}</button>}</div>}

const productFields=[{key:'name',label:'Product name',required:true},{key:'sku',label:'SKU'},{key:'category',label:'Category',required:true},{key:'price',label:'Price',type:'number',required:true},{key:'currency',label:'Currency',type:'select',options:['LRD','USD']},{key:'stock',label:'Quantity in stock',type:'number'},{key:'lowStockThreshold',label:'Low stock alert at',type:'number'}];
function Products({store,update,search,setSearch,openForm,confirmDelete,notify}:{store:Store;update:(k:keyof Store,v:unknown)=>void;search:string;setSearch:(s:string)=>void;openForm:OpenForm;confirmDelete:any;notify:(s:string)=>void}) {
  const [filter,setFilter]=useState('All');
  const [categoryFilter,setCategoryFilter]=useState('All categories');
  const categories=Array.from(new Set(store.products.map(p=>p.category).filter(Boolean))).sort();
  const items=store.products.filter(p=>(`${p.name} ${p.sku} ${p.category}`.toLowerCase().includes(search.toLowerCase()))&&(filter==='All'||(filter==='Low stock'?p.stock<=p.lowStockThreshold:filter==='Active'?p.active:!p.active))&&(categoryFilter==='All categories'||p.category===categoryFilter));
  const save=(v:any,old?:Product)=>{
    const p:Product={...v,id:old?.id||id(),price:Number(v.price),stock:Number(v.stock),lowStockThreshold:Number(v.lowStockThreshold),active:old?.active??true,currency:v.currency||store.business.currency};
    update('products',old?store.products.map(x=>x.id===old.id?p:x):[p,...store.products]);notify(old?'Product updated.':'Product added.');
  };
  const adjust=(product:Product)=>{
    openForm('Adjust stock',[{key:'stock',label:'New available quantity',type:'number',required:true},{key:'reason',label:'Reason for adjustment',type:'textarea',required:true}],{stock:product.stock,reason:''},values=>{
      const next=Math.max(0,Number(values.stock)||0),delta=next-product.stock;
      if(!delta){notify('Stock count is unchanged.');return;}
      update('products',store.products.map(x=>x.id===product.id?{...x,stock:next}:x));
      update('stockMovements',[...store.stockMovements,{id:id(),productId:product.id,productName:product.name,delta,reason:String(values.reason),createdAt:new Date().toISOString()}]);
      notify(`Stock updated · ${delta>0?'+':''}${delta} units.`);
    },'The change is saved to this browser as an inventory activity record.');
  };
  const exportProducts=()=>downloadCsv('gotecx-products.csv',[
    ['Product','SKU','Category','Price','Currency','Stock','Low stock alert','Status'],
    ...store.products.map(p=>[p.name,p.sku,p.category,p.price,p.currency,p.stock,p.lowStockThreshold,p.active?'Active':'Archived']),
  ]);
  return <><PageHead title="Products" subtitle="Manage your catalog, stock levels, and inventory activity." action={<div className="page-actions"><button className="button" onClick={exportProducts}><Download size={14}/> Export CSV</button><button className="button primary" onClick={()=>openForm('Add product',productFields,{category:'Pantry',currency:store.business.currency,stock:0,lowStockThreshold:5},v=>save(v))}><Plus size={15}/> Add product</button></div>}/>
    <div className="stat-grid stat-grid-three"><Stat label="All products" value={String(store.products.length)} note="In your local catalog" icon={Package}/><Stat label="Active" value={String(store.products.filter(p=>p.active).length)} note="Available for sales" icon={Check}/><Stat label="Low stock" value={String(store.products.filter(p=>p.active&&p.stock<=p.lowStockThreshold).length)} note="At or below threshold" icon={ArrowDownRight}/></div>
     <div className="panel"><div className="toolbar"><div className="searchbar" style={{minWidth:230}}><Search size={14}/><input placeholder="Search name, SKU or category" value={search} onChange={e=>setSearch(e.target.value)}/></div>{['All','Active','Low stock','Archived'].map(f=><button key={f} className={`button small ${filter===f?'primary':''}`} onClick={()=>setFilter(f)}>{f}</button>)}<select className="button small" aria-label="Filter by category" value={categoryFilter} onChange={e=>setCategoryFilter(e.target.value)}><option>All categories</option>{categories.map(category=><option key={category}>{category}</option>)}</select></div>
       {items.length?<div className="table-wrap"><table><thead><tr><th>Product</th><th>SKU</th><th>Category</th><th>Price</th><th>Available</th><th>Status</th><th></th></tr></thead><tbody>{items.map(p=><tr key={p.id}><td className="table-primary">{p.name}</td><td>{p.sku||'—'}</td><td>{p.category}</td><td>{money(p.price,p.currency)}</td><td><span className={p.stock<=p.lowStockThreshold?'badge amber':''}>{p.stock} units</span></td><td><span className={`badge ${p.active?'':'red'}`}>{p.active?'Active':'Archived'}</span></td><td className="action-cell"><button className="button small" onClick={()=>openForm('Edit product',productFields,p,v=>save(v,p))}>Edit</button> <button className="button small" onClick={()=>adjust(p)}>Adjust</button> <button className="button small" onClick={()=>{update('products',store.products.map(x=>x.id===p.id?{...x,active:!x.active}:x));notify(p.active?`${p.name} archived.`:`${p.name} restored.`);}}>{p.active?'Archive':'Restore'}</button> <button className="button small danger" onClick={()=>{if(store.purchaseOrders.some(order=>order.status==='open'&&order.items.some(item=>item.productId===p.id))){notify('Receive or cancel open purchase orders containing this product before deleting it.');return;}confirmDelete('product',()=>update('products',store.products.filter(x=>x.id!==p.id)));}}>Delete</button></td></tr>)}</tbody></table></div>:<Empty title="No matching products" text="Add a product to build your catalog." action="Add product" onClick={()=>openForm('Add product',productFields,{category:'Pantry',currency:store.business.currency,stock:0,lowStockThreshold:5},v=>save(v))}/>}</div>
    <div className="panel" style={{marginTop:16}}><div className="panel-head"><h3 className="panel-title">Recent stock activity</h3><span className="muted">{store.stockMovements.length} adjustments</span></div>{store.stockMovements.length?<div className="table-wrap"><table><thead><tr><th>Product</th><th>Change</th><th>Reason</th><th>Date</th></tr></thead><tbody>{[...store.stockMovements].reverse().slice(0,8).map(m=><tr key={m.id}><td className="table-primary">{m.productName}</td><td><span className={`badge ${m.delta<0?'amber':''}`}>{m.delta>0?'+':''}{m.delta}</span></td><td>{m.reason}</td><td>{dateText(m.createdAt)}</td></tr>)}</tbody></table></div>:<div className="panel-body"><p className="muted">Stock changes from adjustments, sales, and refunds will appear here.</p></div>}</div>
  </>;
}
const customerFields=[{key:'name',label:'Customer name',required:true},{key:'phone',label:'Liberian phone number',required:true},{key:'email',label:'Email address',type:'email'},{key:'county',label:'County',type:'select',options:counties},{key:'notes',label:'Notes',type:'textarea'}];
function Customers({store,update,search,setSearch,openForm,confirmDelete}:{store:Store;update:(k:keyof Store,v:unknown)=>void;search:string;setSearch:(s:string)=>void;openForm:OpenForm;confirmDelete:any}) {
  const [filter,setFilter]=useState('All');
  const stats=(customer:Customer)=>store.orders.filter(o=>o.customerId===customer.id&&o.status==='completed').reduce((sum,o)=>({count:sum.count+1,spent:sum.spent+o.total}),{count:0,spent:0});
  const items=store.customers.filter(c=>`${c.name} ${c.phone} ${c.email} ${c.county}`.toLowerCase().includes(search.toLowerCase())).filter(c=>filter==='All'||(filter==='Returning'?stats(c).count>1:stats(c).count===0));
  const save=(v:any,old?:Customer)=>{const c:Customer={...v,id:old?.id||id(),createdAt:old?.createdAt||new Date().toISOString()};update('customers',old?store.customers.map(x=>x.id===old.id?c:x):[c,...store.customers]);};
  const exportCustomers=()=>downloadCsv('gotecx-customers.csv',[
    ['Customer','Phone','Email','County','Orders','Lifetime spend','Currency','Notes'],
    ...store.customers.map(c=>{const s=stats(c);return[c.name,c.phone,c.email,c.county,s.count,s.spent,store.business.currency,c.notes];}),
  ]);
  const addCustomer=()=>openForm('Add customer',customerFields,{county:store.settings.defaultCounty||'Montserrado'},v=>save(v));
  return <><PageHead title="Customers" subtitle="Review customer details and purchase history." action={<div className="page-actions"><button className="button" onClick={exportCustomers}><Download size={14}/> Export CSV</button><button className="button primary" onClick={addCustomer}><Plus size={15}/> Add customer</button></div>}/><div className="panel"><div className="toolbar"><div className="searchbar"><Search size={14}/><input placeholder="Search customers" value={search} onChange={e=>setSearch(e.target.value)}/></div>{['All','Returning','No sales'].map(f=><button key={f} className={`button small ${filter===f?'primary':''}`} onClick={()=>setFilter(f)}>{f}</button>)}<span className="muted" style={{fontSize:11}}>{items.length} customers</span></div>{items.length?<div className="table-wrap"><table><thead><tr><th>Customer</th><th>Phone</th><th>Email</th><th>County</th><th>Orders</th><th>Total spent</th><th>Notes</th><th></th></tr></thead><tbody>{items.map(c=>{const s=stats(c);return <tr key={c.id}><td><div style={{display:'flex',alignItems:'center',gap:9}}><div className="avatar">{initials(c.name)}</div><span className="table-primary">{c.name}</span></div></td><td>{c.phone}</td><td>{c.email||'—'}</td><td>{c.county}</td><td>{s.count}</td><td>{money(s.spent,store.business.currency)}</td><td>{c.notes||'—'}</td><td><button className="button small" onClick={()=>openForm('Edit customer',customerFields,c,v=>save(v,c))}>Edit</button> <button className="button small danger" onClick={()=>confirmDelete('customer',()=>update('customers',store.customers.filter(x=>x.id!==c.id)))}>Delete</button></td></tr>})}</tbody></table></div>:<Empty title={store.customers.length?'No matching customers':'Your customer list starts here'} text="Save customer details to make repeat visits easier." action="Add customer" onClick={addCustomer}/>}</div></>;
}
function Orders({store,update,search,setSearch,openForm,setReceiptOrder,notify}:{store:Store;update:(k:keyof Store,v:unknown)=>void;search:string;setSearch:(s:string)=>void;openForm:OpenForm;setReceiptOrder:(o:Order)=>void;notify:(s:string)=>void}) {
  const [filter,setFilter]=useState('All');
  const [cart,setCart]=useState<Record<string,number>>({});
  const [customerId,setCustomerId]=useState('');
  const [payment,setPayment]=useState(store.settings.defaultPayment||'cash');
  const [currency,setCurrency]=useState<'LRD'|'USD'>(store.business.currency);
  const [manualDiscount,setManualDiscount]=useState(0);
  const [discountCode,setDiscountCode]=useState('');
  const [appliedDiscount,setAppliedDiscount]=useState<Discount|null>(null);
  const [fulfillment,setFulfillment]=useState<'pickup'|'delivery'>('pickup');
  const [saleMode,setSaleMode]=useState(false);
  const posEnabled=store.settings.posChannel!=='false';
  const paymentChoices=[{setting:'payment-0',value:'cash',label:'Cash'},{setting:'payment-1',value:'mobile-money',label:'Mobile money'},{setting:'payment-2',value:'card',label:'Card'},{setting:'payment-3',value:'bank-transfer',label:'Bank transfer'}];
  const enabledPayments=paymentChoices.filter(x=>store.settings[x.setting]!=='false');
  const selectedPayment=enabledPayments.some(x=>x.value===payment)?payment:enabledPayments[0]?.value||'';
  const products=store.products.filter(p=>p.active&&p.stock>0&&p.currency===currency);
  const cartItems=Object.entries(cart).map(([pid,q])=>({product:store.products.find(p=>p.id===pid)!,qty:q})).filter(x=>x.product&&x.product.currency===currency);
  const subtotal=cartItems.reduce((sum,x)=>sum+x.product.price*x.qty,0);
  const round=(value:number)=>currency==='LRD'?Math.round(value):Math.round(value*100)/100;
  const rawDiscount=appliedDiscount?(appliedDiscount.type==='percent'?subtotal*appliedDiscount.value/100:appliedDiscount.value):manualDiscount;
  const discountAmount=round(Math.min(subtotal,Math.max(0,rawDiscount)));
  const discountedSubtotal=Math.max(0,subtotal-discountAmount);
  const taxRate=Math.min(100,Math.max(0,Number(store.settings.taxRate)||0));
  const taxMode=store.settings.taxDisplay||'Do not show tax';
  const taxAmount=taxMode==='Add tax at checkout'?round(discountedSubtotal*taxRate/100):taxMode==='Prices include tax'&&taxRate?round(discountedSubtotal*taxRate/(100+taxRate)):0;
  const feeCurrency=store.settings.deliveryCurrency||store.business.currency;
  const deliveryFee=fulfillment==='delivery'&&feeCurrency===currency?Math.max(0,Number(store.settings.deliveryFee)||0):0;
  const total=round(discountedSubtotal+(taxMode==='Add tax at checkout'?taxAmount:0)+deliveryFee);
  const askCustomer=store.settings.askCustomer||'Optional';
  const customerRequired=askCustomer==='Required'||store.settings.customerMode==='Required';
  const customerDisabled=askCustomer==='Never'||store.settings.customerMode==='Disabled';
  const applyCode=()=>{
    const code=discountCode.trim().toUpperCase();
    if(!code){notify('Enter a discount code.');return;}
    if(!cartItems.length){notify('Add products before applying a discount.');return;}
    const today=new Intl.DateTimeFormat('en-CA').format(new Date());
    const match=store.discounts.find(d=>d.active&&d.code.trim().toUpperCase()===code&&(!d.startsAt||d.startsAt<=today)&&(!d.endsAt||d.endsAt>=today));
    if(!match){notify('This discount code is inactive, unavailable, or outside its dates.');return;}
    if(match.type==='fixed'&&currency!==store.business.currency){notify(`Fixed discounts use ${store.business.currency}. Try a percentage discount for this sale.`);return;}
    setAppliedDiscount(match);setManualDiscount(0);notify(`Discount applied · ${match.name}`);
  };
  const saveSale=()=>{
    if(!cartItems.length){notify('Add at least one product to the sale.');return;}
    if(!enabledPayments.length){notify('Enable a payment method in Settings before completing a sale.');return;}
    if(!customerDisabled&&customerRequired&&!customerId){notify('Choose a customer to continue with this sale.');return;}
    const orderId=`GC-${1000+store.orders.length+1}`;
    const items=cartItems.map(({product,qty})=>({productId:product.id,name:product.name,quantity:qty,unitPrice:product.price}));
    const order:Order={id:orderId,createdAt:new Date().toISOString(),customerId:customerDisabled?null:customerId||null,items,subtotal:round(subtotal),discount:discountAmount,total,currency,paymentMethod:selectedPayment,status:'completed',discountCode:appliedDiscount?.code,taxAmount,deliveryFee,fulfillment};
    update('orders',[order,...store.orders]);
    update('products',store.products.map(p=>({...p,stock:Math.max(0,p.stock-(cart[p.id]||0))})));
    update('stockMovements',[...store.stockMovements,...cartItems.map(({product,qty})=>({id:id(),productId:product.id,productName:product.name,delta:-qty,reason:`Sale ${orderId}`,createdAt:order.createdAt}))]);
    setCart({});setManualDiscount(0);setAppliedDiscount(null);setDiscountCode('');setSaleMode(false);notify(`Sale completed · ${order.id}`);
  };
  const refund=(order:Order)=>{
    openForm('Refund order',[{key:'reason',label:'Reason for refund',type:'textarea',required:true}],{reason:''},values=>{
      const refundedAt=new Date().toISOString();
      update('orders',store.orders.map(x=>x.id===order.id?{...x,status:'refunded',refundedAt,refundReason:String(values.reason)}:x));
      update('products',store.products.map(product=>{const returned=order.items.filter(item=>item.productId===product.id).reduce((sum,item)=>sum+item.quantity,0);return returned?{...product,stock:product.stock+returned}:product;}));
      update('stockMovements',[...store.stockMovements,...order.items.map(item=>({id:id(),productId:item.productId,productName:item.name,delta:item.quantity,reason:`Refund ${order.id}`,createdAt:refundedAt}))]);
      notify(`Order ${order.id} refunded. Stock was returned; no payment was reversed.`);
    },'This records a full refund and restores item quantities. It does not reverse a real payment.');
  };
  const filtered=store.orders.filter(o=>(filter==='All'||o.status===filter.toLowerCase())&&(`${o.id} ${store.customers.find(c=>c.id===o.customerId)?.name||'Walk-in'} ${o.items.map(i=>i.name).join(' ')}`.toLowerCase().includes(search.toLowerCase())));
  const exportOrders=()=>downloadCsv('gotecx-orders.csv',[
    ['Order','Date','Customer','Items','Subtotal','Discount','Tax','Delivery fee','Total','Currency','Payment','Status','Discount code','Refund reason'],
    ...store.orders.map(o=>[o.id,o.createdAt,store.customers.find(c=>c.id===o.customerId)?.name||'Walk-in',o.items.map(i=>`${i.name} x${i.quantity}`).join('; '),o.subtotal,o.discount,o.taxAmount||0,o.deliveryFee||0,o.total,o.currency,o.paymentMethod,o.status,o.discountCode||'',o.refundReason||'']),
  ]);
  if(saleMode)return <>
    <PageHead title="New sale" subtitle="Build a cart, apply a discount, and record payment." action={<button className="button" onClick={()=>setSaleMode(false)}>Cancel sale</button>}/>
    <div className="sale-layout">
      <div className="panel"><div className="panel-head"><h3 className="panel-title">Choose products</h3><span className="muted">{products.length} available in {currency}</span></div><div className="panel-body"><div className="product-picker">{products.map(p=><button className="product-tile" key={p.id} onClick={()=>setCart({...cart,[p.id]:Math.min(p.stock,(cart[p.id]||0)+1)})}><strong>{p.name}</strong><span>{money(p.price,currency)} · {p.stock} available</span></button>)}</div>{!products.length&&<Empty title={`No ${currency} products ready to sell`} text="Add active products with stock in this currency."/>}</div></div>
      <div className="panel"><div className="panel-head"><h3 className="panel-title">Sale details</h3><span className="badge">{cartItems.reduce((n,x)=>n+x.qty,0)} items</span></div><div className="panel-body">
        {cartItems.length?cartItems.map(({product,qty})=><div className="cart-row" key={product.id}><div><strong>{product.name}</strong><div className="muted">{money(product.price,currency)} each</div></div><div className="quantity-controls"><button className="button small" aria-label={`Remove one ${product.name}`} onClick={()=>setCart({...cart,[product.id]:Math.max(0,qty-1)})}>−</button><span>{qty}</span><button className="button small" aria-label={`Add one ${product.name}`} onClick={()=>setCart({...cart,[product.id]:Math.min(product.stock,qty+1)})}>+</button></div></div>):<div className="empty-state" style={{padding:'24px 4px'}}><h3>Your cart is empty</h3><p>Select products to add them to this sale.</p></div>}
        <div className="field" style={{marginTop:18}}><label>Customer {customerRequired?'(required)':customerDisabled?'(not collected)':'(optional)'}</label><select value={customerDisabled?'':customerId} disabled={customerDisabled} onChange={e=>setCustomerId(e.target.value)}><option value="">Walk-in customer</option>{store.customers.map(c=><option key={c.id} value={c.id}>{c.name} · {c.phone}</option>)}</select></div>
        <div className="form-grid">
          <div className="field"><label>Currency</label><select value={currency} onChange={e=>{if(Object.keys(cart).length&&!window.confirm('Changing currency clears the current cart. Continue?'))return;setCurrency(e.target.value as 'LRD'|'USD');setCart({});setAppliedDiscount(null);setManualDiscount(0);}}><option>LRD</option><option>USD</option></select></div>
          <div className="field"><label>Payment method</label><select value={selectedPayment} disabled={!enabledPayments.length} onChange={e=>setPayment(e.target.value)}>{enabledPayments.map(p=><option key={p.value} value={p.value}>{p.label}</option>)}</select></div>
        </div>
        <div className="field"><label>Discount code</label><div className="discount-control"><input value={discountCode} onChange={e=>setDiscountCode(e.target.value)} placeholder="Enter an active code"/><button className="button" onClick={applyCode}>Apply</button></div>{appliedDiscount&&<small className="field-hint">{appliedDiscount.name} applied · <button type="button" onClick={()=>{setAppliedDiscount(null);setDiscountCode('');}}>Remove</button></small>}</div>
        <div className="field"><label>Manual discount ({currency})</label><input type="number" min="0" max={subtotal} value={manualDiscount} onChange={e=>{setManualDiscount(Math.max(0,Number(e.target.value)||0));setAppliedDiscount(null);}}/></div>
        <div className="form-grid">
          <div className="field"><label>Fulfillment</label><select value={fulfillment} onChange={e=>setFulfillment(e.target.value as 'pickup'|'delivery')}><option value="pickup">Pickup</option><option value="delivery">Local delivery</option></select></div>
          <div className="field"><label>Delivery fee</label><input readOnly value={fulfillment==='delivery'?money(deliveryFee,feeCurrency):'No delivery fee'}/></div>
        </div>
        {fulfillment==='delivery'&&feeCurrency!==currency&&<div className="callout">Your delivery fee is set in {feeCurrency}; it is not added to this {currency} sale.</div>}
        <div className="totals-list"><div className="cart-row"><span>Subtotal</span><strong>{money(subtotal,currency)}</strong></div><div className="cart-row"><span>Discount{appliedDiscount?` · ${appliedDiscount.code}`:''}</span><strong>− {money(discountAmount,currency)}</strong></div>{taxAmount>0&&<div className="cart-row"><span>Tax · {taxRate}%</span><strong>{money(taxAmount,currency)}{taxMode==='Prices include tax'?' included':''}</strong></div>}{deliveryFee>0&&<div className="cart-row"><span>Delivery</span><strong>{money(deliveryFee,currency)}</strong></div>}<div className="cart-row total-row"><strong>Total due</strong><strong>{money(total,currency)}</strong></div></div>
        {taxMode!=='Do not show tax'&&<p className="field-hint">Tax uses the percentage you entered in Settings. Confirm the correct rate for your business.</p>}
        {!enabledPayments.length&&<div className="callout">All payment methods are disabled. Enable one in Settings → Payments.</div>}
        <button className="button primary" style={{width:'100%',marginTop:16}} onClick={saveSale} disabled={!enabledPayments.length}><Check size={15}/> Complete sale</button><p className="muted" style={{fontSize:11,lineHeight:1.5}}>Demo only. No live payment is processed.</p>
      </div></div>
    </div>
  </>;
  return <>
    <PageHead title="Orders" subtitle="Review transactions, print receipts, or ring up a new sale." action={<div className="page-actions"><button className="button" onClick={exportOrders}><Download size={14}/> Export CSV</button><button className="button primary" disabled={!posEnabled} title={!posEnabled?'Enable point of sale in Settings → Sales channels':''} onClick={()=>setSaleMode(true)}><Plus size={15}/> {posEnabled?'Create sale':'POS paused'}</button></div>}/>
    {!posEnabled&&<div className="callout" style={{marginBottom:16}}>Point of sale is paused. Turn it back on in Settings → Sales channels to record new sales.</div>}
    <div className="stat-grid stat-grid-three"><Stat label="Orders" value={String(store.orders.length)} note="All recorded transactions" icon={ClipboardList}/><Stat label="Sales collected" value={money(store.orders.filter(o=>o.status==='completed').reduce((a,o)=>a+o.total,0),store.business.currency)} note="Completed transactions" icon={CircleDollarSign}/><Stat label="Average order" value={money(store.orders.length?Math.round(store.orders.filter(o=>o.status==='completed').reduce((a,o)=>a+o.total,0)/Math.max(1,store.orders.filter(o=>o.status==='completed').length)):0,store.business.currency)} note="Completed sales only" icon={Gauge}/></div>
    <div className="panel"><div className="toolbar"><div className="searchbar"><Search size={14}/><input placeholder="Search order or customer" value={search} onChange={e=>setSearch(e.target.value)}/></div>{['All','Completed','Refunded'].map(f=><button className={`button small ${filter===f?'primary':''}`} key={f} onClick={()=>setFilter(f)}>{f}</button>)}</div>
       {filtered.length?<div className="table-wrap"><table><thead><tr><th>Order</th><th>Date</th><th>Customer</th><th>Items</th><th>Payment</th><th>Total</th><th>Status</th><th>Actions</th></tr></thead><tbody>{filtered.map(o=><tr key={o.id}><td className="table-primary">#{o.id}</td><td>{dateText(o.createdAt)}</td><td>{store.customers.find(c=>c.id===o.customerId)?.name||'Walk-in'}</td><td>{o.items.reduce((s,i)=>s+i.quantity,0)}</td><td style={{textTransform:'capitalize'}}>{o.paymentMethod.replace('-',' ')}</td><td>{money(o.total,o.currency)}</td><td><span className={`badge ${o.status==='refunded'?'red':''}`}>{o.status}</span></td><td className="action-cell"><button className="button small" onClick={()=>setReceiptOrder(o)} aria-label={`Print receipt for ${o.id}`}><Printer size={13}/> Receipt</button>{o.status==='completed'&&<button className="button small danger" onClick={()=>refund(o)}><RotateCcw size={13}/> Refund</button>}</td></tr>)}</tbody></table></div>:<Empty title="No orders found" text={posEnabled?'Your next sale can be recorded here.':'Point of sale is paused in Settings → Sales channels.'} action={posEnabled?'Create sale':undefined} onClick={()=>setSaleMode(true)}/>}
    </div>
  </>;
}
function CashRegister({store,update,openForm}:{store:Store;update:(k:keyof Store,v:unknown)=>void;openForm:OpenForm}) {
  const active=store.shifts.find(s=>!s.closedAt);
  const summary=active?shiftCashSummary(store,active):null;
  const openShift=()=>openForm('Open cash register',[{key:'openingCash',label:`Opening cash (${store.business.currency})`,type:'number',required:true}],{openingCash:0},values=>{
    const shift:CashShift={id:id(),openedAt:new Date().toISOString(),openingCash:Math.max(0,Number(values.openingCash)||0)};
    update('shifts',[shift,...store.shifts]);
  },'Enter the amount physically in the drawer before the shift starts.');
  const closeShift=()=>{
    if(!active||!summary)return;
    openForm('Close cash register',[{key:'closingCash',label:`Cash counted in drawer (${store.business.currency})`,type:'number',required:true}],{closingCash:summary.expectedCash},values=>{
      const closingCash=Math.max(0,Number(values.closingCash)||0),closedAt=new Date().toISOString();
      update('shifts',store.shifts.map(s=>s.id===active.id?{...s,closedAt,closingCash,expectedCash:summary.expectedCash,difference:closingCash-summary.expectedCash}:s));
    },`Expected drawer total: ${money(summary.expectedCash,store.business.currency)}. Record the physical count to see any difference.`);
  };
  return <>
    <PageHead title="Cash register" subtitle="Open a drawer shift, track cash sales, and reconcile the closing count." action={active?<button className="button danger" onClick={closeShift}>Close shift</button>:<button className="button primary" onClick={openShift}><Plus size={15}/> Open register</button>}/>
    {active&&summary?<><div className="callout" style={{marginBottom:16}}>Shift opened {dateText(active.openedAt)}. Cash sales and cash refunds since opening are included; other payment methods are not.</div><div className="stat-grid"><Stat label="Opening float" value={money(active.openingCash,store.business.currency)} note="Cash counted at opening" icon={Wallet}/><Stat label="Cash sales" value={money(summary.cashSales,store.business.currency)} note="Completed cash orders" icon={CircleDollarSign}/><Stat label="Cash refunds" value={money(summary.cashRefunds,store.business.currency)} note="Recorded cash refunds" icon={ArrowDownRight}/><Stat label="Expected in drawer" value={money(summary.expectedCash,store.business.currency)} note="Opening float + sales − refunds" icon={Gauge}/></div><div className="panel"><div className="panel-head"><h3 className="panel-title">Shift actions</h3></div><div className="panel-body"><p className="muted">Count the cash in the drawer, then close the shift to save the expected amount and any difference.</p><button className="button primary" onClick={closeShift}>Count cash and close shift</button></div></div></>:<div className="panel"><div className="panel-body"><div className="empty-state"><div className="empty-state-mark"><Wallet size={21}/></div><h3>No open register</h3><p>Start a shift by recording the opening cash amount. Sales remain demo records; no funds are processed.</p><button className="button primary" onClick={openShift}><Plus size={14}/> Open cash register</button></div></div></div>}
    <div className="panel" style={{marginTop:16}}><div className="panel-head"><h3 className="panel-title">Shift history</h3><span className="muted">{store.shifts.length} shifts</span></div>{store.shifts.length?<div className="table-wrap"><table><thead><tr><th>Opened</th><th>Closed</th><th>Opening cash</th><th>Expected</th><th>Counted</th><th>Difference</th><th>Status</th></tr></thead><tbody>{store.shifts.map(s=>{const totals=shiftCashSummary(store,s);const expected=s.expectedCash??totals.expectedCash;return <tr key={s.id}><td>{dateText(s.openedAt)}</td><td>{s.closedAt?dateText(s.closedAt):'—'}</td><td>{money(s.openingCash,store.business.currency)}</td><td>{money(expected,store.business.currency)}</td><td>{s.closingCash===undefined?'—':money(s.closingCash,store.business.currency)}</td><td>{s.difference===undefined?'—':money(s.difference,store.business.currency)}</td><td><span className={`badge ${s.closedAt?'':'amber'}`}>{s.closedAt?'Closed':'Open'}</span></td></tr>})}</tbody></table></div>:<div className="panel-body"><p className="muted">Closed and active shifts will be listed here.</p></div>}</div>
  </>;
}

function ReceiptPreview({store,order,onClose}:{store:Store;order:Order;onClose:()=>void}) {
  const customer=store.customers.find(c=>c.id===order.customerId);
  return <div className="overlay receipt-overlay"><section id="receipt-print" className="receipt-paper" role="dialog" aria-label={`Receipt ${order.id}`}><header className="receipt-heading"><div className="receipt-mark">G</div><h2>{store.settings.receiptName||store.business.name}</h2><p>{store.settings.receiptAddress||`${store.business.city}, ${store.business.county}, Liberia`}</p><p>{store.settings.receiptPhone||store.settings.locationPhone||''}</p></header><div className="receipt-rule"/><div className="receipt-meta"><strong>Receipt #{order.id}</strong><span>{dateText(order.createdAt)}</span>{store.settings.receiptShowCustomer!=='false'&&<span>Customer: {customer?.name||'Walk-in'}</span>}</div><div className="receipt-items">{order.items.map((item,index)=><div className="receipt-line" key={`${item.productId}-${index}`}><span>{item.name}<small>{item.quantity} × {money(item.unitPrice,order.currency)}</small></span><strong>{money(item.quantity*item.unitPrice,order.currency)}</strong></div>)}</div><div className="receipt-totals"><div><span>Subtotal</span><span>{money(order.subtotal,order.currency)}</span></div>{order.discount>0&&<div><span>Discount{order.discountCode?` · ${order.discountCode}`:''}</span><span>− {money(order.discount,order.currency)}</span></div>}{order.taxAmount? <div><span>Tax{store.settings.taxDisplay==='Prices include tax'?' (included)':''}</span><span>{money(order.taxAmount,order.currency)}</span></div>:null}{order.deliveryFee? <div><span>Delivery</span><span>{money(order.deliveryFee,order.currency)}</span></div>:null}<div className="receipt-grand-total"><strong>Total</strong><strong>{money(order.total,order.currency)}</strong></div></div><div className="receipt-meta"><span>Paid by: {order.paymentMethod.replace('-',' ')}</span><span>Status: {order.status}</span>{order.refundReason&&<span>Refund reason: {order.refundReason}</span>}</div>{(store.settings.receiptThanks||store.settings.receiptFooter)&&<p className="receipt-footer">{store.settings.receiptThanks||store.settings.receiptFooter}</p>}<div className="receipt-actions"><button className="button" onClick={onClose}>Close</button><button className="button primary" onClick={()=>window.print()}><Printer size={14}/> Print receipt</button></div></section></div>;
}

const discountFields=[{key:'name',label:'Discount name',required:true},{key:'code',label:'Discount code',required:true},{key:'type',label:'Discount type',type:'select',options:['percent','fixed']},{key:'value',label:'Value',type:'number',required:true},{key:'startsAt',label:'Starts on',type:'date'},{key:'endsAt',label:'Ends on',type:'date'}];
function Discounts({store,update,search,setSearch,openForm,confirmDelete}:{store:Store;update:(k:keyof Store,v:unknown)=>void;search:string;setSearch:(s:string)=>void;openForm:OpenForm;confirmDelete:any}) {
  const [filter,setFilter]=useState('All');
  const save=(v:any,old?:Discount)=>{const d={...v,id:old?.id||id(),code:String(v.code).trim().toUpperCase(),value:Number(v.value),active:old?.active??true};update('discounts',old?store.discounts.map(x=>x.id===old.id?d:x):[d,...store.discounts]);};
  const items=store.discounts.filter(x=>`${x.name} ${x.code}`.toLowerCase().includes(search.toLowerCase())&&(filter==='All'||(filter==='Active'?x.active:!x.active)));
  const exportDiscounts=()=>downloadCsv('gotecx-discounts.csv',[['Name','Code','Type','Value','Starts','Ends','Status'],...store.discounts.map(d=>[d.name,d.code,d.type,d.value,d.startsAt,d.endsAt,d.active?'Active':'Paused'])]);
  const addDiscount=()=>openForm('Create discount',discountFields,{type:'percent',value:10},v=>save(v));
  return <><PageHead title="Discounts" subtitle="Create codes that can be applied directly to a sale." action={<div className="page-actions"><button className="button" onClick={exportDiscounts}><Download size={14}/> Export CSV</button><button className="button primary" onClick={addDiscount}><Plus size={15}/> Create discount</button></div>}/><div className="panel"><div className="toolbar"><div className="searchbar"><Search size={14}/><input placeholder="Search discount or code" value={search} onChange={e=>setSearch(e.target.value)}/></div>{['All','Active','Paused'].map(f=><button className={`button small ${filter===f?'primary':''}`} key={f} onClick={()=>setFilter(f)}>{f}</button>)}</div>{items.length?<div className="table-wrap"><table><thead><tr><th>Discount</th><th>Code</th><th>Type</th><th>Value</th><th>Schedule</th><th>Status</th><th></th></tr></thead><tbody>{items.map(d=><tr key={d.id}><td className="table-primary">{d.name}</td><td><span style={{fontFamily:'var(--app-font-mono)'}}>{d.code}</span></td><td>{d.type}</td><td>{d.type==='percent'?`${d.value}%`:money(d.value,store.business.currency)}</td><td>{d.startsAt||'Now'} — {d.endsAt||'No end date'}</td><td><span className={`badge ${d.active?'':'red'}`}>{d.active?'Active':'Paused'}</span></td><td className="action-cell"><button className="button small" onClick={()=>openForm('Edit discount',discountFields,d,v=>save(v,d))}>Edit</button> <button className="button small" onClick={()=>update('discounts',store.discounts.map(x=>x.id===d.id?{...x,active:!x.active}:x))}>{d.active?'Pause':'Activate'}</button> <button className="button small danger" onClick={()=>confirmDelete('discount',()=>update('discounts',store.discounts.filter(x=>x.id!==d.id)))}>Delete</button></td></tr>)}</tbody></table></div>:<Empty title="No discounts set up" text="Create a code for a seasonal offer or regular customers." action="Create discount" onClick={addDiscount}/>}</div></>;
}
function Analytics({store,period,setPeriod}:{store:Store;period:string;setPeriod:(s:string)=>void}) {
  const [currency,setCurrency]=useState<'LRD'|'USD'>(store.business.currency);
  const now=new Date();
  const today=new Date(now.getFullYear(),now.getMonth(),now.getDate());
  const buckets:{label:string;start:Date;end:Date;value:number}[]=[];
  if(period==='7 days'){
    for(let offset=6;offset>=0;offset--){
      const start=new Date(today);start.setDate(today.getDate()-offset);
      const end=new Date(start);end.setDate(start.getDate()+1);
      buckets.push({label:new Intl.DateTimeFormat('en-LR',{weekday:'short'}).format(start),start,end,value:0});
    }
  }else if(period==='30 days'){
    const first=new Date(today);first.setDate(today.getDate()-29);
    for(let i=0;i<4;i++){
      const start=new Date(first);start.setDate(first.getDate()+i*7);
      const end=i===3?new Date(today.getTime()+86400000):new Date(start.getTime()+7*86400000);
      buckets.push({label:`Days ${i*7+1}–${i===3?30:i*7+7}`,start,end,value:0});
    }
  }else{
    for(let offset=5;offset>=0;offset--){
      const start=new Date(now.getFullYear(),now.getMonth()-offset,1);
      const end=new Date(now.getFullYear(),now.getMonth()-offset+1,1);
      buckets.push({label:new Intl.DateTimeFormat('en-LR',{month:'short'}).format(start),start,end,value:0});
    }
  }
  const completed=store.orders.filter(o=>o.status==='completed'&&o.currency===currency);
  completed.forEach(order=>{const date=new Date(order.createdAt);const bucket=buckets.find(x=>date>=x.start&&date<x.end);if(bucket)bucket.value+=order.total;});
  const rangeStart=buckets[0].start,rangeEnd=buckets[buckets.length-1].end;
  const orders=completed.filter(o=>{const date=new Date(o.createdAt);return date>=rangeStart&&date<rangeEnd;});
  const rev=orders.reduce((sum,o)=>sum+o.total,0),max=Math.max(...buckets.map(b=>b.value),1);
  const cats:Record<string,number>={};
  orders.flatMap(o=>o.items).forEach(item=>{const product=store.products.find(p=>p.id===item.productId);const category=product?.category||'Other';cats[category]=(cats[category]||0)+item.unitPrice*item.quantity;});
  const returning=store.customers.filter(c=>orders.filter(o=>o.customerId===c.id).length>1).length;
  const exportAnalytics=()=>downloadCsv(`gotecx-sales-${period.replace(' ','-')}-${currency}.csv`,[['Period','Gross sales'],...buckets.map(b=>[b.label,b.value]),[],['Order','Date','Customer','Total','Currency','Payment'],...orders.map(o=>[o.id,o.createdAt,store.customers.find(c=>c.id===o.customerId)?.name||'Walk-in',o.total,o.currency,o.paymentMethod])]);
  return <><PageHead title="Analytics" subtitle="Explore recorded sales for the selected period and currency." action={<div className="page-actions"><select className="button" value={currency} onChange={e=>setCurrency(e.target.value as 'LRD'|'USD')}><option>LRD</option><option>USD</option></select><select className="button" value={period} onChange={e=>setPeriod(e.target.value)}><option>7 days</option><option>30 days</option><option>6 months</option></select><button className="button" onClick={exportAnalytics}><Download size={14}/> Export report</button></div>}/><div className="stat-grid"><Stat label="Gross sales" value={money(rev,currency)} note={`${currency} · ${period}`} icon={CircleDollarSign}/><Stat label="Orders" value={String(orders.length)} note="Completed sales in period" icon={ShoppingCart}/><Stat label="Average order value" value={money(orders.length?Math.round(rev/orders.length):0,currency)} note="Per completed order" icon={ArrowUpRight}/><Stat label="Returning customers" value={`${returning}`} note="More than one purchase in period" icon={Users}/></div><div className="analytics-grid"><div className="panel"><div className="panel-head"><div><h3 className="panel-title">Sales over time</h3><span className="muted">{period} · completed sales</span></div><BarChart3 size={18} color="var(--gotecx-green)"/></div><div className="panel-body"><div className="chart-bars">{buckets.map(bucket=><div className="bar-col" key={bucket.label}><span className="chart-value">{money(bucket.value,currency)}</span><div className="bar" style={{height:`${Math.max(8,bucket.value/max*68)}%`}}/><span className="bar-label">{bucket.label}</span></div>)}</div></div></div><div className="panel"><div className="panel-head"><h3 className="panel-title">Sales by category</h3></div><div className="panel-body">{Object.entries(cats).length?Object.entries(cats).sort((a,b)=>b[1]-a[1]).map(([category,total],i)=><div className="category-row" key={category}><div className="category-label"><span>{category}</span><strong>{money(total,currency)}</strong></div><div className="category-track"><div style={{height:'100%',width:`${Math.max(8,rev?total/rev*100:0)}%`,background:['var(--gotecx-green)','#e1aa4c','#5689a4','#bd7567'][i%4],borderRadius:8}}/></div></div>):<Empty title="Sales categories appear here" text="Complete sales with catalog items to see a breakdown."/>}</div></div></div></>;
}
function Finance({store,setPath}:{store:Store;setPath:(p:string)=>void}) {
  const [currency,setCurrency]=useState<'LRD'|'USD'>(store.business.currency);
  const orders=store.orders.filter(o=>o.status==='completed'&&o.currency===currency);const total=orders.reduce((s,o)=>s+o.total,0);const methods=['cash','mobile-money','card','bank-transfer'];
  const activeShift=store.shifts.find(s=>!s.closedAt);
  const refunds=store.orders.filter(o=>o.status==='refunded'&&o.currency===currency).reduce((s,o)=>s+o.total,0);
  const exportFinance=()=>downloadCsv(`gotecx-finance-${currency.toLowerCase()}.csv`,[['Payment method','Transactions','Gross amount','Share'],...methods.map(method=>{const matching=orders.filter(order=>order.paymentMethod===method),amount=matching.reduce((sum,order)=>sum+order.total,0);return[method,matching.length,amount,total?Math.round(amount/total*100):0]}),[],['Refunds',store.orders.filter(order=>order.status==='refunded'&&order.currency===currency).length,refunds,currency]]);
  return <><PageHead title="Finance" subtitle="Review payment totals, refunds, and cash reconciliation." action={<div className="page-actions"><select className="button" value={currency} onChange={e=>setCurrency(e.target.value as 'LRD'|'USD')}><option>LRD</option><option>USD</option></select><span className="badge">Demo ledger</span><button className="button" onClick={exportFinance}><Download size={14}/> Export summary</button><button className="button" onClick={()=>setPath('/cash-register')}>Cash register</button></div>}/><div className="stat-grid"><Stat label="Gross collected" value={money(total,currency)} note="Completed transactions" icon={Wallet}/><Stat label="Cash payments" value={money(orders.filter(o=>o.paymentMethod==='cash').reduce((s,o)=>s+o.total,0),currency)} note="Recorded as cash" icon={CircleDollarSign}/><Stat label="Mobile money" value={money(orders.filter(o=>o.paymentMethod==='mobile-money').reduce((s,o)=>s+o.total,0),currency)} note="No provider connected" icon={CreditCard}/><Stat label="Refunds" value={money(refunds,currency)} note="Recorded, not reversed" icon={ArrowDownRight}/></div><div className="panel"><div className="panel-head"><h3 className="panel-title">Payment summary</h3><span className="muted">All {currency} demo orders</span></div><div className="table-wrap"><table><thead><tr><th>Payment method</th><th>Transactions</th><th>Gross amount</th><th>Share</th></tr></thead><tbody>{methods.map(m=>{const os=orders.filter(o=>o.paymentMethod===m),sum=os.reduce((s,o)=>s+o.total,0);return <tr key={m}><td style={{textTransform:'capitalize'}}>{m.replace('-',' ')}</td><td>{os.length}</td><td>{money(sum,currency)}</td><td>{total?Math.round(sum/total*100):0}%</td></tr>})}</tbody></table></div></div>{activeShift&&currency===store.business.currency&&<div className="callout" style={{marginTop:16}}>Cash register is open. Expected drawer total: {money(shiftCashSummary(store,activeShift).expectedCash,store.business.currency)}.<button className="inline-link" onClick={()=>setPath('/cash-register')}>Review shift</button></div>}<div className="callout" style={{marginTop:16}}>GotecxPOS is not connected to a payment provider. Totals are for record keeping only; no funds are processed.</div></>;
}
function Team({store,update,confirmDelete}:{store:Store;update:(k:keyof Store,v:unknown)=>void;confirmDelete:any}) {
  const [editing,setEditing]=useState<TeamMember|null>(null);
  const [creating,setCreating]=useState(false);
  const [name,setName]=useState('');const [email,setEmail]=useState('');const [role,setRole]=useState<'manager'|'cashier'>('cashier');
  const [pin,setPin]=useState('');const [permissions,setPermissions]=useState<string[]>(roleDefaults.cashier);const [error,setError]=useState('');
  const startCreate=()=>{setName('');setEmail('');setRole('cashier');setPin('');setPermissions([...roleDefaults.cashier]);setError('');setEditing(null);setCreating(true);};
  const startEdit=(member:TeamMember)=>{setEditing(member);setCreating(false);setName(member.name);setEmail(member.email);setRole(member.role==='manager'?'manager':'cashier');setPin(member.pin||'');setPermissions(member.permissions?[...member.permissions]:[...roleDefaults[member.role==='manager'?'manager':'cashier']]);setError('');};
  const save=(event:FormEvent<HTMLFormElement>)=>{
    event.preventDefault();setError('');
    const cleanPin=pin.trim();
    if(!/^\d{4,6}$/.test(cleanPin)){setError('Set a 4–6 digit PIN for this local sign-in profile.');return;}
    if(store.team.some(member=>member.pin===cleanPin&&member.id!==editing?.id)){setError('Each staff profile needs a different PIN in this store.');return;}
    const member:TeamMember={id:editing?.id||id(),name:name.trim(),email:email.trim(),role,pin:cleanPin,permissions:[...permissions]};
    update('team',editing?store.team.map(person=>person.id===editing.id?member:person):[...store.team,member]);
    setCreating(false);setEditing(null);
  };
  const togglePermission=(route:string)=>setPermissions(current=>current.includes(route)?current.filter(item=>item!==route):[...current,route]);
  const form=(<div className="panel staff-editor"><div className="panel-head"><div><h3 className="panel-title">{editing?'Edit staff profile':'Create staff profile'}</h3><span className="panel-kicker">Store-scoped local PIN sign-in</span></div><button className="button small" type="button" onClick={()=>{setCreating(false);setEditing(null);}}>Cancel</button></div><form className="panel-body" onSubmit={save}>
    <div className="form-grid"><div className="field"><label htmlFor="staff-name">Full name</label><input id="staff-name" data-testid="input-staff-name" required value={name} onChange={event=>setName(event.target.value)} placeholder="Staff member name"/></div><div className="field"><label htmlFor="staff-email">Email (optional)</label><input id="staff-email" data-testid="input-staff-email" type="email" value={email} onChange={event=>setEmail(event.target.value)} placeholder="name@example.com"/></div><div className="field"><label htmlFor="staff-role">Role</label><select id="staff-role" value={role} onChange={event=>{const next=event.target.value as 'manager'|'cashier';setRole(next);setPermissions([...roleDefaults[next]]);}}><option value="cashier">Cashier</option><option value="manager">Manager</option></select></div><div className="field"><label htmlFor="staff-pin-field">Unique PIN</label><input id="staff-pin-field" data-testid="input-staff-pin-setup" type="password" inputMode="numeric" autoComplete="new-password" pattern="[0-9]{4,6}" minLength={4} maxLength={6} required value={pin} onChange={event=>setPin(event.target.value.replace(/\D/g,'').slice(0,6))} placeholder="4–6 digits"/><small className="field-hint">A convenience sign-in only. PINs are stored in this browser and are not secure.</small></div></div>
    <div className="permission-editor"><div className="permission-title"><div><strong>Feature access</strong><small>Choose which pages this member can open. Role defaults are preselected.</small></div><button type="button" className="inline-link" onClick={()=>setPermissions([...roleDefaults[role]])}>Reset role defaults</button></div><div className="permission-grid">{permissionPages.map(([route,label])=><label key={route} className="permission-option"><input type="checkbox" checked={permissions.includes(route)} onChange={()=>togglePermission(route)} data-testid={`permission-${route.slice(1).replaceAll('/','-')}`}/><span>{label}</span></label>)}</div></div>
    {error&&<p role="alert" className="form-error">{error}</p>}<div className="dialog-actions"><button className="button primary" type="submit" data-testid="button-save-staff">{editing?'Save profile':'Create profile'}</button></div>
    </form></div>);
  return <><PageHead title="Team" subtitle="Give each person a store profile and the right tools for their shift." action={<button className="button primary" data-testid="button-add-staff" onClick={startCreate}><Plus size={15}/> Add team member</button>}/><div className="callout demo-warning" style={{marginBottom:16}}><LockKeyhole size={17}/><span><strong>Browser-local demo access.</strong> PIN checks and feature restrictions run only in this browser. PINs are not secure credentials; there is no server, shared team, or production security.</span></div>{(creating||editing)&&form}<div className="panel"><div className="panel-head"><div><h3 className="panel-title">Store profiles</h3><span className="panel-kicker">{store.team.length} people · profiles belong to {store.business.name}</span></div></div><div className="table-wrap"><table><thead><tr><th>Team member</th><th>Role</th><th>Sign-in</th><th>Feature access</th><th></th></tr></thead><tbody>{store.team.map(member=><tr key={member.id} data-testid={`row-team-member-${member.id}`}><td><div style={{display:'flex',alignItems:'center',gap:9}}><div className="avatar">{initials(member.name)}</div><span className="table-primary">{member.name}</span></div><small className="muted">{member.email||'No email added'}</small></td><td><span className="badge">{member.role}</span></td><td>{member.role==='owner'?'Owner email':'PIN profile'}{member.role!=='owner'&&<small className="muted" style={{display:'block'}}>PIN stored locally</small>}</td><td>{member.role==='owner'?'All features':`${(member.permissions??roleDefaults[member.role as 'manager'|'cashier']).length} of ${permissionPages.length} pages`}</td><td className="action-cell">{member.role!=='owner'&&<><button className="button small" onClick={()=>startEdit(member)}>Edit access</button><button className="button small danger" onClick={()=>confirmDelete('team member',()=>update('team',store.team.filter(person=>person.id!==member.id)))}>Remove</button></>}</td></tr>)}</tbody></table></div></div></>;
}
type SupportRequest={id:string;subject:string;category:string;details:string;createdAt:string;status:'Received'};
function SupportPage({store,notify}:{store:Store;notify:(message:string)=>void}) {
  const [query,setQuery]=useState('');const [openTopic,setOpenTopic]=useState('');const [submitted,setSubmitted]=useState(false);
  const [requests,setRequests]=useState<SupportRequest[]>(()=>{try{return JSON.parse(localStorage.getItem('gotecx-demo-support')||'[]') as SupportRequest[];}catch{return [];}});
  const [subject,setSubject]=useState('');const [category,setCategory]=useState('Using the POS');const [details,setDetails]=useState('');
  useEffect(()=>{localStorage.setItem('gotecx-demo-support',JSON.stringify(requests));},[requests]);
  const topics=[
    {group:'Getting started',title:'Set up your store in Liberia',body:'Add your store details in Settings → General. Liberia is the fixed home market, Monrovia time is used for records, and LRD is the default currency. USD can be selected for your store or individual transactions.'},
    {group:'Sales & register',title:'Record a sale and print a receipt',body:'Open Orders to add catalog items, choose a payment method and complete the sale. Use the receipt action on a completed order to open the print-ready receipt. Cash register shifts track opening float, cash sales, refunds and closing counts.'},
    {group:'Products & stock',title:'Restock items with purchasing',body:'Create supplier profiles in Purchasing, then create a purchase order. Stock changes only when you select Receive stock. Reorder suggestions use each product’s low-stock threshold.'},
    {group:'Team & access',title:'Create local staff profiles',body:'Store admins can create a manager or cashier profile in Team, set a unique 4–6 digit PIN, and choose page permissions. Staff select their profile and enter the PIN on this browser’s sign-in screen. This is a convenience demo only: PINs are not secure and do not protect production data.'},
    {group:'Receipts',title:'Customize your store receipt',body:'Open Settings → Receipts to set the receipt name, contact details and thank-you message. The live sample can be printed to check your browser’s printer layout.'},
    {group:'Data & demo limits',title:'Where is my workspace saved?',body:'This demonstration stores workspace data in this browser’s local storage. It does not sync across devices and includes no server, database, shared user accounts, payment processing, or production security. Download a backup from Settings → General before clearing browser data.'},
  ];
  const filtered=topics.filter(topic=>`${topic.group} ${topic.title} ${topic.body}`.toLowerCase().includes(query.toLowerCase()));
  const submit=(event:FormEvent<HTMLFormElement>)=>{event.preventDefault();const request:SupportRequest={id:`HELP-${id().toUpperCase()}`,subject:subject.trim(),category,details:details.trim(),createdAt:new Date().toISOString(),status:'Received'};setRequests(current=>[request,...current]);setSubmitted(true);setSubject('');setDetails('');notify('Support request saved in this browser.');};
  return <><PageHead title="Support Center" subtitle={`Practical help for ${store.business.name} and the day-to-day work.`} action={<span className="badge"><LifeBuoy size={13}/> Help desk · local demo</span>}/><div className="support-hero"><div><span className="eyebrow">GOTECX POS HELP</span><h2>Let’s keep the day moving.</h2><p>Find a quick answer or leave a note for your store’s local support log.</p></div><div className="support-hero-mark"><CircleHelp size={36}/></div><div className="support-search"><Search size={16}/><input data-testid="input-support-search" aria-label="Search help topics" placeholder="Search setup, sales, receipts…" value={query} onChange={event=>setQuery(event.target.value)}/></div></div>
    <div className="support-layout"><section><div className="support-section-head"><div><h2>Help topics</h2><p>Short guides for common store tasks</p></div><span>{filtered.length} guides</span></div><div className="support-topics">{filtered.map(topic=><article className={`support-topic ${openTopic===topic.title?'expanded':''}`} key={topic.title}><button className="support-topic-toggle" aria-expanded={openTopic===topic.title} onClick={()=>setOpenTopic(current=>current===topic.title?'':topic.title)}><span className="support-topic-icon"><CircleHelp size={16}/></span><span><small>{topic.group}</small><strong>{topic.title}</strong></span><ChevronDown size={16}/></button>{openTopic===topic.title&&<p>{topic.body}</p>}</article>)}{!filtered.length&&<div className="empty-state"><div className="empty-state-mark"><Search size={19}/></div><h3>No matching topics</h3><p>Try a shorter search, or send us a support request below.</p><button className="button" onClick={()=>setQuery('')}>Clear search</button></div>}</div>
      <div className="support-contact-card"><div className="support-card-icon"><StoreIcon size={17}/></div><div><strong>Running a store in Liberia?</strong><p>Gotecx POS is set up around local currency, counties and store operations. Support requests here stay in this browser.</p></div><button className="button small" onClick={()=>document.getElementById('support-request')?.scrollIntoView({behavior:'smooth',block:'start'})}>Contact support</button></div></section>
      <aside className="support-request-panel panel" id="support-request"><div className="panel-head"><div><h3 className="panel-title">Send a support request</h3><span className="panel-kicker">Saved locally · no message is sent to a server</span></div><Send size={17} color="var(--gotecx-green)"/></div>{submitted&&<div className="support-success" role="status"><Check size={16}/> Request added to your local support history.</div>}<form className="panel-body" onSubmit={submit}><div className="field"><label htmlFor="support-subject">What do you need help with?</label><input id="support-subject" data-testid="input-support-subject" required minLength={4} maxLength={100} value={subject} onChange={event=>setSubject(event.target.value)} placeholder="A brief subject"/></div><div className="field"><label htmlFor="support-category">Topic</label><select id="support-category" value={category} onChange={event=>setCategory(event.target.value)}><option>Using the POS</option><option>Products and stock</option><option>Team access</option><option>Receipts</option><option>Workspace data</option><option>Other</option></select></div><div className="field"><label htmlFor="support-details">Details</label><textarea id="support-details" data-testid="input-support-details" required minLength={10} maxLength={1200} rows={5} value={details} onChange={event=>setDetails(event.target.value)} placeholder="Tell us what happened and what you expected."/><small className="field-hint">{details.length}/1200 characters</small></div><button className="button primary" data-testid="button-submit-support" type="submit"><Send size={14}/> Save request</button><div className="support-local-caption"><ShieldCheck size={14}/> Local-only demo behavior. No server or shared support inbox.</div></form>
        {requests.length>0&&<div className="support-history"><h4>Recent local requests</h4>{requests.slice(0,4).map(request=><div className="support-request-row" key={request.id} data-testid={`support-request-${request.id}`}><div><strong>{request.subject}</strong><small>{request.category} · {dateText(request.createdAt)}</small></div><span className="badge">{request.status}</span></div>)}</div>}</aside></div>
  </>;
}
function Markets({store,update,openForm,notify}:{store:Store;update:(k:keyof Store,v:unknown)=>void;openForm:OpenForm;notify:(s:string)=>void}) {
  const b=store.business;
  return <><PageHead title="Markets" subtitle="Set the defaults your Liberian customers see." action={<button className="button primary" onClick={()=>openForm('Edit market defaults',[{key:'currency',label:'Store currency',type:'select',options:['LRD','USD']},{key:'county',label:'Primary county',type:'select',options:counties},{key:'city',label:'City or town'},{key:'timezone',label:'Timezone',type:'select',options:['Africa/Monrovia']}],b,v=>{update('business',{...b,...v});notify('Market preferences saved.')})}>Edit settings</button>}/><div className="panel" style={{maxWidth:820}}><div className="panel-head"><div><h3 className="panel-title">{b.name}</h3><span className="muted" style={{fontSize:11}}>Primary market · Liberia</span></div><span className="badge">Active</span></div><div className="panel-body"><div className="form-grid"><div className="field"><label>Country</label><input value="Liberia" readOnly/></div><div className="field"><label>Currency</label><input value={`${b.currency} · ${b.currency==='LRD'?'Liberian Dollar':'US Dollar'}`} readOnly/></div><div className="field"><label>County</label><input value={b.county} readOnly/></div><div className="field"><label>City or town</label><input value={b.city} readOnly/></div><div className="field wide"><label>Timezone</label><input value="Africa/Monrovia (GMT)" readOnly/></div></div><div className="callout">Liberia is your fixed home market. Store currency defaults to LRD and business time follows Africa/Monrovia. This is a local demo configuration.</div></div></div></>;
}
function Growth({setPath,store}:{setPath:(p:string)=>void;store:Store}) {
  const cards=[{title:'Bring customers back',text:'Keep customer names and numbers close to each sale. Build a useful record of the people who choose your business.',cta:'Add a customer',to:'/customers',icon:Users},{title:'Make an offer',text:'Set up a discount code for a new product, a quiet day, or your regular customers.',cta:'Create discount',to:'/discounts',icon:Tag},{title:'Know what moves',text:'Use your sales history to spot best sellers and plan your next stock run.',cta:'View analytics',to:'/analytics',icon:BarChart3}];
  return <><PageHead title="Growth" subtitle="Small ways to bring people back and grow steadily."/><div className="callout" style={{marginBottom:18}}>You have {store.customers.length} customers and {store.discounts.length} discounts in this workspace. Here are a few practical next steps.</div><div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(230px,1fr))',gap:14}}>{cards.map(({title,text,cta,to,icon:Icon})=><div className="panel" key={title} style={{padding:21}}><div className="stat-accent" style={{position:'static',display:'inline-flex',marginBottom:14}}><Icon size={17}/></div><h3 style={{fontSize:16,margin:'0 0 8px'}}>{title}</h3><p className="muted" style={{fontSize:12,lineHeight:1.7,minHeight:62}}>{text}</p><button className="button" onClick={()=>setPath(to)}>{cta}</button></div>)}</div><div className="panel" style={{marginTop:16}}><div className="panel-head"><h3 className="panel-title">A simple weekly rhythm</h3></div><div className="panel-body" style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:16}}>{[['01','Check stock','Refill the items customers ask for most.'],['02','Note repeat visits','Save a customer profile when it helps.'],['03','Review the week','Use analytics to decide what to try next.']].map(x=><div key={x[0]}><span style={{font:'12px var(--app-font-mono)',color:'#38885b'}}>{x[0]}</span><h4 style={{margin:'7px 0',fontSize:13}}>{x[1]}</h4><p className="muted" style={{margin:0,fontSize:11,lineHeight:1.6}}>{x[2]}</p></div>)}</div></div></>;
}
function Content({setPath,store,update,openForm,notify}:{setPath:(p:string)=>void;store:Store;update:(k:keyof Store,v:unknown)=>void;openForm:OpenForm;notify:(s:string)=>void}) {
  const [preview,setPreview]=useState(false);
  const title=store.settings.storefrontTitle||store.business.name;
  const message=store.settings.storefrontMessage||`Local goods and everyday essentials from ${store.business.city}, Liberia.`;
  const editCopy=()=>openForm('Edit storefront copy',[{key:'storefrontTitle',label:'Storefront heading',required:true},{key:'storefrontMessage',label:'Welcome message',type:'textarea',required:true}],{storefrontTitle:title,storefrontMessage:message},values=>{update('settings',{...store.settings,...values});notify('Storefront preview updated.');});
  const activeProducts=store.products.filter(p=>p.active);
  const featuredIds=(()=>{try{const parsed=JSON.parse(store.settings.featuredProductIds||'');if(Array.isArray(parsed))return parsed.filter((productId:string)=>activeProducts.some(product=>product.id===productId)).slice(0,4);}catch{}return activeProducts.slice(0,4).map(product=>product.id);})();
  const featured=featuredIds.map(productId=>activeProducts.find(product=>product.id===productId)).filter((product):product is Product=>Boolean(product));
  const storefrontEnabled=store.settings.storefrontChannel!=='false';
  const toggleFeatured=(productId:string)=>{
    if(featuredIds.includes(productId)){const next=featuredIds.filter(id=>id!==productId);update('settings',{...store.settings,featuredProductIds:JSON.stringify(next)});notify('Featured product removed.');return;}
    if(featuredIds.length>=4){notify('Choose up to four featured products.');return;}
    update('settings',{...store.settings,featuredProductIds:JSON.stringify([...featuredIds,productId])});notify('Featured product added.');
  };
  return <>
    <PageHead title="Content" subtitle="Edit and preview a private storefront for your business." action={<div className="page-actions"><button className="button" disabled={!storefrontEnabled} title={!storefrontEnabled?'Enable storefront preview in Settings → Sales channels':''} onClick={()=>setPreview(!preview)}>{!storefrontEnabled?'Preview paused':preview?'Hide preview':'Preview storefront'}</button><button className="button primary" onClick={editCopy}>Edit page copy</button></div>}/>
    {preview&&<div className="local-store-preview"><div className="store-preview-nav"><strong>{store.business.name}</strong><span>{store.business.city}, Liberia</span></div><div className="store-preview-hero"><span>WELCOME TO {store.business.name.toUpperCase()}</span><h2>{title}</h2><p>{message}</p></div><div className="store-preview-products"><h3>Featured products</h3>{featured.length?featured.map(p=><div className="store-preview-product" key={p.id}><strong>{p.name}</strong><span>{money(p.price,p.currency)}</span></div>):<p className="muted">Add active products to show them in this preview.</p>}</div><div className="callout">Private local preview. This does not publish a website.</div></div>}
    <div className="panel" style={{maxWidth:880}}><div className="panel-head"><div><h3 className="panel-title">Online storefront</h3><span className="muted">Private local preview · not published</span></div><span className={`badge ${storefrontEnabled?'':'red'}`}>{storefrontEnabled?'Preview enabled':'Preview paused'}</span></div><div className="panel-body"><div style={{background:'#e5eee7',borderRadius:10,padding:25,marginBottom:18}}><div style={{font:'11px var(--app-font-mono)',color:'var(--gotecx-green)',letterSpacing:1}}>WELCOME TO</div><h2 style={{fontSize:29,margin:'8px 0',fontFamily:'var(--app-font-sans)',fontWeight:600}}>{title}</h2><p className="muted" style={{fontSize:14}}>{message}</p></div><div className="form-grid"><div><h4 style={{fontSize:15}}>Catalog</h4><p className="muted">{activeProducts.length} active products in the shop catalog.</p><button className="button small" onClick={()=>setPath('/products')}>Manage products</button></div><div><h4 style={{fontSize:15}}>Store details</h4><p className="muted">Update your business name and location from General settings.</p><button className="button small" onClick={()=>setPath('/settings')}>Open settings</button></div></div></div></div>
    <div className="panel" style={{maxWidth:880,marginTop:16}}><div className="panel-head"><div><h3 className="panel-title">Featured products</h3><span className="muted">Choose up to four items for the private preview.</span></div><span className="badge">{featured.length} / 4 selected</span></div><div className="panel-body">{activeProducts.length?activeProducts.map(product=><label className="cart-row featured-product-choice" key={product.id}><span><strong>{product.name}</strong><small className="muted">{product.category} · {money(product.price,product.currency)}</small></span><input type="checkbox" checked={featuredIds.includes(product.id)} onChange={()=>toggleFeatured(product.id)}/></label>):<p className="muted">Add active products to select storefront features.</p>}</div></div>
  </>;
}
function SettingsPage({store,update,tab,setTab,setPath,exportBackup,importBackup,notify}:{store:Store;update:(k:keyof Store,v:unknown)=>void;tab:string;setTab:(s:string)=>void;setPath:(s:string)=>void;exportBackup:()=>void;importBackup:(f:File)=>Promise<void>;notify:(s:string)=>void}) {
  const [draft,setDraft]=useState<Record<string,string>>({...store.settings});
  useEffect(()=>setDraft({...store.settings}),[tab,store.settings]);
  const set=(key:string,val:string)=>setDraft({...draft,[key]:val});
  const save=()=>{
    if(tab==='Payments'){
      const enabled=[0,1,2,3].some(i=>(draft[`payment-${i}`]??store.settings[`payment-${i}`]??(i<2?'true':'false'))==='true');
      if(!enabled){notify('Keep at least one payment method enabled.');return;}
    }
    if(tab==='Checkout'){
      const values=['cash','mobile-money','card','bank-transfer'];
      const index=values.indexOf(draft.defaultPayment||'cash');
      const enabled=index<0||((draft[`payment-${index}`]??store.settings[`payment-${index}`]??(index<2?'true':'false'))==='true');
      if(!enabled){notify('Enable the default payment method in Payments first.');return;}
    }
    update('settings',{...store.settings,...draft});
    if(tab==='General')update('business',{...store.business,name:draft.businessName||store.business.name,category:draft.category||store.business.category,county:draft.county||store.business.county,city:draft.city||store.business.city,currency:(draft.currency||store.business.currency) as 'LRD'|'USD'});
    if(tab==='Markets')update('business',{...store.business,currency:(draft.marketCurrency||store.business.currency) as 'LRD'|'USD',timezone:'Africa/Monrovia'});
    notify(`${tab} preferences saved.`);
  };
  const fallback=(key:string)=>store.settings[key]??({businessName:store.business.name,category:store.business.category,county:store.business.county,city:store.business.city,currency:store.business.currency,timezone:store.business.timezone,primaryCountry:'Liberia',marketCurrency:store.business.currency,marketTimezone:'Africa/Monrovia',defaultCounty:'Montserrado',customerMode:'Optional',defaultPayment:'cash',askCustomer:'Optional',taxDisplay:'Do not show tax',taxRate:'0',deliveryFee:'0',deliveryCurrency:store.business.currency,pickupLocation:store.business.city}[key] as string|undefined)??'';
  const field=(label:string,key:string,type='text',options?:string[])=><div className="field" key={key}><label>{label}</label>{options?<select value={draft[key]??(fallback(key)||options[0])} onChange={e=>set(key,e.target.value)}>{options.map(x=><option key={x}>{x}</option>)}</select>:<input type={type} min={type==='number'?0:undefined} max={key==='taxRate'?100:undefined} value={draft[key]??fallback(key)} placeholder={label} onChange={e=>set(key,e.target.value)}/>}</div>;
   const titleText:Record<string,string>={General:'Business details and store defaults',Plan:'Choose a plan for your business',Billing:'Billing contact and invoices',Users:'People with access to this store',Payments:'Ways customers can pay',Checkout:'A smooth counter checkout',Receipts:'Customize what customers take home', 'Customer accounts':'Customer profile preferences','Shipping and delivery':'Local pickup and delivery options','Taxes and duties':'Tax settings for your records',Locations:'Business locations','Markets':'Country, currency and time zone',Apps:'Extensions for your workspace','Sales channels':'Where you sell','Domains':'Your online address',Notifications:'Updates for your business'};
  return <><PageHead title="Settings" subtitle="Set up the details and preferences behind your workspace."/><div className="settings-layout"><div className="panel settings-nav">{settingsItems.map(x=><button key={x} aria-current={tab===x?'page':undefined} className={tab===x?'selected':''} onClick={()=>setTab(x)}>{x}</button>)}</div><div className="settings-content"><div className="field settings-mobile-select"><label htmlFor="settings-section-select">Settings section</label><select id="settings-section-select" value={tab} onChange={e=>setTab(e.target.value)}>{settingsItems.map(item=><option key={item}>{item}</option>)}</select></div><div className="panel"><div className="panel-head"><div><h3 className="panel-title">{tab}</h3><span className="muted" style={{fontSize:11}}>{titleText[tab]}</span></div></div><div className="panel-body">
    {tab==='General'&&<><h4 style={{fontSize:12,margin:'0 0 13px'}}>Business details</h4><div className="form-grid">{field('Business name','businessName')}{field('Business type','category','select',['Retail','Food & beverage','Beauty & personal care','Professional services','Handmade goods','Other'])}{field('Country','country','select',['Liberia'])}{field('County','county','select',counties)}{field('City / town','city')}{field('Store currency','currency','select',['LRD','USD'])}{field('Timezone','timezone','select',['Africa/Monrovia'])}</div><div className="callout">Liberia is fixed as your business country. Your local timezone is Africa/Monrovia.</div><div className="settings-tools"><div><strong>Workspace data</strong><p className="muted">Download a JSON backup or restore one from this device. Restoring replaces the current browser copy.</p></div><div className="page-actions"><button className="button" onClick={exportBackup}><Download size={14}/> Download backup</button><label className="button file-button"><Upload size={14}/> Restore backup<input type="file" accept=".json,application/json" onChange={e=>{const file=e.target.files?.[0];if(file)void importBackup(file);e.target.value='';}}/></label></div></div></>}
    {tab==='Plan'&&<><div className="callout" style={{marginBottom:17}}>You are using the Gotecx demo plan. All features in this workspace are available locally.</div><div className="panel" style={{padding:18}}><div style={{display:'flex',justifyContent:'space-between'}}><div><h3 style={{margin:'0 0 6px',fontSize:15}}>Local demo</h3><span className="muted" style={{fontSize:11}}>No subscription or payment required</span></div><span className="badge">Current plan</span></div></div></>}
    {tab==='Billing'&&<><div className="callout" style={{marginBottom:16}}>Billing is not connected in this demo. These preferences are stored in your browser only.</div><div className="form-grid">{field('Billing contact name','billingName')}{field('Billing email','billingEmail','email')}{field('Business address','billingAddress')}</div></>}
    {tab==='Users'&&<><div className="callout" style={{marginBottom:16}}>Local team profiles only. No account invitations or shared access are provided.</div><div className="cart-row"><span>Team members</span><strong>{store.team.length}</strong></div><div className="settings-tools"><div><strong>Manage team profiles</strong><p className="muted">Add local staff profiles and assign a demo role. These roles do not create separate logins.</p></div><button className="button" onClick={()=>setPath('/team')}>Open team management</button></div></>}
    {tab==='Payments'&&<><div className="callout" style={{marginBottom:16}}>No real payment provider is connected. Select the methods you accept at your counter.</div>{['Cash','Mobile money','Card','Bank transfer'].map((x,i)=><label key={x} className="cart-row" style={{cursor:'pointer'}}><span>{x}</span><input type="checkbox" checked={(draft[`payment-${i}`]??store.settings[`payment-${i}`]??(i<2?'true':'false'))==='true'} onChange={e=>set(`payment-${i}`,String(e.target.checked))}/></label>)}</>}
    {tab==='Checkout'&&<><p className="muted" style={{fontSize:12,lineHeight:1.7}}>These defaults are used when creating a sale. Receipt footer text prints on local demo receipts.</p><div className="form-grid">{field('Receipt footer','receiptFooter')}{field('Default payment method','defaultPayment','select',['cash','mobile-money','card','bank-transfer'])}{field('Ask for customer each sale','askCustomer','select',['Optional','Required','Never'])}</div></>}
     {tab==='Receipts'&&<><div className="callout demo-warning" style={{marginBottom:16}}><ReceiptText size={16}/><span>Live preview updates as you type. Print uses this browser’s print dialog. Receipt data and settings are local to this browser.</span></div><div className="receipt-settings-layout"><div><div className="form-grid">{field('Receipt display name','receiptName')}{field('Phone number','receiptPhone')}{field('Receipt address','receiptAddress')}{field('Thank-you message','receiptThanks')}{field('Legacy footer note','receiptFooter')}</div><label className="cart-row receipt-customer-toggle"><span><strong>Show customer name</strong><small className="muted">Include customer or walk-in on each printed receipt.</small></span><input type="checkbox" checked={(draft.receiptShowCustomer??store.settings.receiptShowCustomer??'true')==='true'} onChange={event=>set('receiptShowCustomer',String(event.target.checked))}/></label></div><div className="receipt-preview-wrap"><div className="receipt-preview-label"><span>PRINT PREVIEW</span><span className="badge">80 mm</span></div><section id="receipt-print" className="receipt-paper receipt-sample" aria-label="Live receipt preview"><header className="receipt-heading"><div className="receipt-mark">G</div><h2>{draft.receiptName||store.business.name}</h2><p>{draft.receiptAddress||`${store.business.city}, ${store.business.county}, Liberia`}</p>{(draft.receiptPhone||store.settings.locationPhone)&&<p>{draft.receiptPhone||store.settings.locationPhone}</p>}</header><div className="receipt-rule"/><div className="receipt-meta"><strong>Receipt #GC-SAMPLE</strong><span>{dateText(new Date().toISOString())}</span>{(draft.receiptShowCustomer??store.settings.receiptShowCustomer??'true')==='true'&&<span>Customer: Walk-in</span>}</div><div className="receipt-items"><div className="receipt-line"><span>Liberian Coffee · 250g<small>2 × {money(1150,store.business.currency)}</small></span><strong>{money(2300,store.business.currency)}</strong></div><div className="receipt-line"><span>Palm Butter · 500ml<small>1 × {money(780,store.business.currency)}</small></span><strong>{money(780,store.business.currency)}</strong></div></div><div className="receipt-totals"><div><span>Subtotal</span><span>{money(3080,store.business.currency)}</span></div><div className="receipt-grand-total"><strong>Total</strong><strong>{money(3080,store.business.currency)}</strong></div></div><p className="receipt-footer">{draft.receiptThanks||draft.receiptFooter||'Thank you for shopping with us.'}</p></section><button type="button" className="button receipt-print-button" onClick={()=>window.print()}><Printer size={14}/> Print sample receipt</button></div></div></>}
    {tab==='Customer accounts'&&<><p className="muted" style={{fontSize:12,lineHeight:1.7}}>Keep customer records useful and respectful. Phone numbers should use the +231 country code when possible.</p><div className="form-grid">{field('Default customer county','defaultCounty','select',counties)}{field('Customer account mode','customerMode','select',['Optional','Required','Disabled'])}</div></>}
    {tab==='Shipping and delivery'&&<><p className="muted" style={{fontSize:12,lineHeight:1.7}}>Choose pickup or delivery while creating a sale. The fee is added only when the sale currency matches the fee currency.</p><div className="form-grid">{field('Pickup location','pickupLocation')}{field('Delivery areas','deliveryAreas')}{field(`Standard delivery fee (${draft.deliveryCurrency||store.business.currency})`,'deliveryFee','number')}{field('Delivery fee currency','deliveryCurrency','select',['LRD','USD'])}{field('Estimated delivery time','deliveryTime')}</div></>}
    {tab==='Taxes and duties'&&<><div className="callout" style={{marginBottom:16}}>The POS uses the percentage you enter as a calculator only. Confirm the correct rate and treatment for your business with a qualified local adviser.</div><div className="form-grid">{field('Tax display','taxDisplay','select',['Prices include tax','Add tax at checkout','Do not show tax'])}{field('Tax rate (%)','taxRate','number')}{field('Tax reference','taxReference')}</div></>}
    {tab==='Locations'&&<><div className="panel" style={{padding:16,marginBottom:16}}><strong style={{fontSize:13}}>{store.business.name}</strong><p className="muted" style={{fontSize:11,marginBottom:0}}>{store.business.city}, {store.business.county}, Liberia · Primary location</p></div><div className="form-grid">{field('Location phone','locationPhone')}{field('Location address','locationAddress')}</div></>}
    {tab==='Markets'&&<><div className="callout" style={{marginBottom:16}}>Your primary market is Liberia. Currency support is for recording demo sales only.</div><div className="form-grid">{field('Primary country','primaryCountry','select',['Liberia'])}{field('Default currency','marketCurrency','select',['LRD','USD'])}{field('Time zone','marketTimezone','select',['Africa/Monrovia'])}</div></>}
    {tab==='Apps'&&<><div className="empty-state"><div className="empty-state-mark"><Settings size={20}/></div><h3>No apps connected</h3><p>App connections are not available in this local demo. No external services are contacted.</p></div></>}
    {tab==='Sales channels'&&<><p className="muted" style={{fontSize:12,lineHeight:1.7}}>Control which local demo screens are available. The storefront stays private; these settings do not publish a website or connect an external sales channel.</p><label className="cart-row" style={{cursor:'pointer'}}><span><strong>Point of sale</strong><small className="muted">Allow new sales and checkout in this browser.</small></span><input type="checkbox" checked={(draft.posChannel??store.settings.posChannel??'true')==='true'} onChange={e=>set('posChannel',String(e.target.checked))}/></label><label className="cart-row" style={{cursor:'pointer'}}><span><strong>Online storefront preview</strong><small className="muted">Allow opening the private product and copy preview.</small></span><input type="checkbox" checked={(draft.storefrontChannel??store.settings.storefrontChannel??'true')==='true'} onChange={e=>set('storefrontChannel',String(e.target.checked))}/></label></>}
    {tab==='Domains'&&<><div className="callout" style={{marginBottom:16}}>A public domain is not included in this browser-only demo.</div>{field('Store subdomain','subdomain')}</>}
    {tab==='Notifications'&&<><p className="muted" style={{fontSize:12}}>Choose which reminders appear in your workspace. No email or SMS notifications are sent.</p>{['Low stock reminders','Daily sales summary','New customer reminders'].map((x,i)=><label className="cart-row" key={x}><span>{x}</span><input type="checkbox" checked={(draft[`notify-${i}`]??store.settings[`notify-${i}`]??'true')==='true'} onChange={e=>set(`notify-${i}`,String(e.target.checked))}/></label>)}</>}
     <div className="dialog-actions settings-save-bar"><button className="button primary" data-testid={`button-save-settings-${tab.toLowerCase().replaceAll(' ','-')}`} onClick={save}>Save {tab.toLowerCase()} settings</button></div>
  </div></div></div></div></>;
}

export default App;
