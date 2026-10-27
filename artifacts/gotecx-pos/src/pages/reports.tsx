import { useMemo, useState } from 'react';
import { ArrowDownToLine, BarChart3, CalendarDays, ChevronRight, FileSpreadsheet, ReceiptText } from 'lucide-react';
import './reports.css';

type Currency = 'LRD' | 'USD';
type SaleItem = { productId: string; name: string; quantity: number; unitPrice: number };
type Order = {
  id: string; createdAt: string; customerId: string | null; items: SaleItem[]; subtotal: number;
  discount: number; total: number; currency: Currency; paymentMethod: string;
  status: 'completed' | 'refunded'; discountCode?: string; taxAmount?: number;
  employeeId?: string; refundedAt?: string;
};
type Store = {
  business: { currency: Currency };
  orders: Order[];
  products: { id: string; name: string; category: string }[];
  customers: { id: string; name: string }[];
  team: { id: string; name: string }[];
  discounts: { id: string; name: string; code: string; type: string; value: number; active: boolean }[];
};
type Props = {
  path: string;
  setPath: (path: string) => void;
  store: Store;
  onShowReceipt: (order: Order) => void;
};
type Row = { key: string; label: string; count?: number; quantity?: number; gross?: number; discount?: number; tax?: number; total?: number; details?: string; order?: Order; date?: string; currency?: Currency };

const reports = [
  { path: '/reports/sales-summary', label: 'Sales summary' },
  { path: '/reports/sales-by-item', label: 'Sales by item' },
  { path: '/reports/sales-by-category', label: 'Sales by category' },
  { path: '/reports/sales-by-employee', label: 'Sales by employee' },
  { path: '/reports/sales-by-payment-type', label: 'Sales by payment type' },
  { path: '/reports/receipts', label: 'Receipts' },
  { path: '/reports/sales-by-modifier', label: 'Sales by modifier' },
  { path: '/reports/discounts', label: 'Discounts' },
  { path: '/reports/taxes', label: 'Taxes' },
];
const titles = new Map(reports.map(report => [report.path, report.label]));
const dateInput = (date: Date) => {
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 10);
};
const money = (amount: number, currency: Currency) => new Intl.NumberFormat('en-LR', {
  style: 'currency', currency, maximumFractionDigits: currency === 'LRD' ? 0 : 2,
}).format(Number.isFinite(amount) ? amount : 0);
const csvCell = (value: unknown) => `"${String(value ?? '').replaceAll('"', '""')}"`;
const slug = (value: string) => value.toLowerCase().replaceAll(/[^a-z0-9]+/g, '-').replaceAll(/(^-|-$)/g, '');
const dateLabel = (value?: string) => value ? new Intl.DateTimeFormat('en-LR', { dateStyle: 'medium' }).format(new Date(value)) : '—';
const timeValue = (value?: string) => value ? new Date(value).getTime() : 0;

export default function ReportsPage({ path, setPath, store, onShowReceipt }: Props) {
  const [startDate, setStartDate] = useState(() => dateInput(new Date(Date.now() - 29 * 86_400_000)));
  const [endDate, setEndDate] = useState(() => dateInput(new Date()));
  const [currencyFilter, setCurrencyFilter] = useState<'all' | Currency>(store.business.currency);
  const reportPath = reports.some(report => report.path === path) ? path : reports[0].path;
  const title = titles.get(reportPath) ?? 'Sales summary';

  const filteredOrders = useMemo(() => store.orders.filter(order => {
    const stamp = timeValue(order.status === 'refunded' && reportPath === '/reports/receipts' ? order.refundedAt || order.createdAt : order.createdAt);
    const after = startDate ? new Date(`${startDate}T00:00:00`).getTime() : Number.NEGATIVE_INFINITY;
    const before = endDate ? new Date(`${endDate}T23:59:59.999`).getTime() : Number.POSITIVE_INFINITY;
    return stamp >= after && stamp <= before && (currencyFilter === 'all' || order.currency === currencyFilter);
  }), [store.orders, startDate, endDate, currencyFilter, reportPath]);

  const currencies = useMemo(() => [...new Set(filteredOrders.map(order => order.currency))].sort(), [filteredOrders]);
  const rows = useMemo(() => buildRows(reportPath, filteredOrders, store), [reportPath, filteredOrders, store]);
  const completed = filteredOrders.filter(order => order.status === 'completed');
  const refunded = filteredOrders.filter(order => order.status === 'refunded');
  const grossSales = sumByCurrency(completed, order => order.subtotal);
  const discountsTotal = sumByCurrency(completed, order => order.discount);
  const netSales = sumByCurrency(completed, order => order.total);
  const refundsTotal = sumByCurrency(refunded, order => order.total);
  const activeRows = reportPath === '/reports/sales-by-modifier' ? [] : rows;
  const columns = getColumns(reportPath);

  const exportCsv = () => {
    const headings = columns.map(column => column.label);
    const content = [headings, ...activeRows.map(row => columns.map(column => column.value(row, currencyFilter)))];
    const csv = '\uFEFF' + content.map(record => record.map(csvCell).join(',')).join('\r\n');
    const href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = href;
    anchor.download = `gotecx-${slug(title)}-${startDate}-to-${endDate}.csv`;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(href), 1000);
  };

  return (
    <div className="reports-page" data-testid="page-reports">
      <header className="reports-header">
        <div>
          <div className="reports-eyebrow"><BarChart3 size={14} /> STORE PERFORMANCE</div>
          <h1 data-testid="text-report-title">{title}</h1>
          <p>Clear numbers from sales recorded in this browser.</p>
        </div>
        <button className="reports-export" type="button" onClick={exportCsv} data-testid="button-export-csv">
          <ArrowDownToLine size={16} /> Export CSV
        </button>
      </header>

      <nav className="reports-nav" aria-label="Reports" data-testid="nav-report-types">
        {reports.map(report => (
          <button key={report.path} type="button" className={report.path === reportPath ? 'selected' : ''}
            aria-current={report.path === reportPath ? 'page' : undefined}
            data-testid={`link-report-${slug(report.label)}`} onClick={() => setPath(report.path)}>
            {report.label}{report.path === reportPath && <ChevronRight size={14} />}
          </button>
        ))}
      </nav>

      <section className="reports-filter panel" aria-label="Report filters">
        <div className="reports-filter-intro"><CalendarDays size={17} /><div><strong>Report period</strong><span>Choose dates and currency</span></div></div>
        <label className="report-control"><span>From</span><input type="date" value={startDate} max={endDate || undefined}
          onChange={event => setStartDate(event.target.value)} data-testid="input-report-start-date" /></label>
        <label className="report-control"><span>To</span><input type="date" value={endDate} min={startDate || undefined}
          onChange={event => setEndDate(event.target.value)} data-testid="input-report-end-date" /></label>
        <label className="report-control currency-control"><span>Currency</span><select value={currencyFilter}
          onChange={event => setCurrencyFilter(event.target.value as 'all' | Currency)} data-testid="select-report-currency">
          <option value="all">All currencies</option><option value="LRD">LRD · Liberian dollar</option><option value="USD">USD · US dollar</option>
        </select></label>
      </section>

      {reportPath === '/reports/sales-by-modifier' ? (
        <section className="report-empty panel" data-testid="empty-modifier-report">
          <div className="report-empty-icon"><FileSpreadsheet size={22} /></div>
          <span className="report-section-label">NOT AVAILABLE YET</span>
          <h2>Modifier details aren’t recorded</h2>
          <p>Sales by modifier will be available when this workspace captures modifier choices on sale items. No modifier data is included in this report today.</p>
        </section>
      ) : (
        <>
          <section className={`report-metrics ${reportPath === '/reports/sales-summary' ? '' : 'report-metrics-compact'}`} aria-label="Report totals">
            {reportPath === '/reports/sales-summary' ? <>
              {currencies.length ? currencies.map(currency => <Metric key={`net-${currency}`} label={`Net sales · ${currency}`} value={money(sumByCurrency(completed.filter(order => order.currency === currency), order => order.total), currency)} note="Completed sales" />) : <Metric label="Net sales" value="—" note="No sales in this period" />}
              <Metric label="Completed orders" value={completed.length.toLocaleString()} note={`${refunded.length} refunded in period`} />
              {currencies.map(currency => <Metric key={`refund-${currency}`} label={`Refunds · ${currency}`} value={money(sumByCurrency(refunded.filter(order => order.currency === currency), order => order.total), currency)} note="Recorded separately from sales" />)}
            </> : <Metric label={metricLabel(reportPath)} value={metricValue(reportPath, rows, completed.length, refunded.length, currencies, grossSales, discountsTotal, refundsTotal)} note={`${activeRows.length.toLocaleString()} rows · ${filteredOrders.length.toLocaleString()} orders in period`} />}
          </section>

          {reportPath === '/reports/sales-summary' && <section className="report-detail-strip" data-testid="summary-breakdown">
            {currencies.map(currency => <div className="report-detail panel" key={currency} data-testid={`card-summary-${currency.toLowerCase()}`}>
              <div className="report-detail-heading"><span>SALES BREAKDOWN</span><b>{currency}</b></div>
              <div><span>Gross sales</span><strong>{money(sumByCurrency(completed.filter(order => order.currency === currency), order => order.subtotal), currency)}</strong></div>
              <div><span>Discounts</span><strong>{money(sumByCurrency(completed.filter(order => order.currency === currency), order => order.discount), currency)}</strong></div>
              <div><span>Tax collected</span><strong>{money(sumByCurrency(completed.filter(order => order.currency === currency), order => order.taxAmount ?? 0), currency)}</strong></div>
              <div><span>Refunds</span><strong>{money(sumByCurrency(refunded.filter(order => order.currency === currency), order => order.total), currency)}</strong></div>
            </div>)}
            {!currencies.length && <div className="report-no-currency">No sales to break down for this date range.</div>}
          </section>}

          <section className="report-table panel">
            <div className="report-table-heading">
              <div><h2>{tableHeading(reportPath)}</h2><p data-testid="text-report-row-count">{activeRows.length.toLocaleString()} {activeRows.length === 1 ? 'row' : 'rows'}</p></div>
              <span className="report-local-tag">Browser data</span>
            </div>
            {activeRows.length ? <div className="report-table-scroll">
              <table data-testid="table-report-results">
                <thead><tr>{columns.map(column => <th key={column.label}>{column.label}</th>)}</tr></thead>
                <tbody>{activeRows.map(row => <tr key={row.key} data-testid={`row-report-${slug(row.key)}`}>
                  {columns.map(column => <td key={column.label} className={column.numeric ? 'numeric' : ''}>
                    {column.action && row.order ? <button className="report-receipt-link" type="button"
                      onClick={() => onShowReceipt(row.order!)} data-testid={`button-view-receipt-${slug(row.order.id)}`}>
                      <ReceiptText size={14} /> View receipt
                    </button> : column.value(row, currencyFilter)}
                  </td>)}
                </tr>)}</tbody>
              </table>
            </div> : <div className="report-table-empty" data-testid="empty-report-results">
              <span>No matching records</span><p>Try another date range or currency to see available store data.</p>
            </div>}
          </section>
          <div className="report-footnote"><span>Sales totals use completed orders only.</span><span>Refunds remain separate and are not combined with sales.</span></div>
        </>
      )}
    </div>
  );
}

function sumByCurrency(orders: Order[], amount: (order: Order) => number) {
  return orders.reduce((sum, order) => sum + (Number(amount(order)) || 0), 0);
}
function buildRows(path: string, orders: Order[], store: Store): Row[] {
  if (path === '/reports/receipts') return [...orders].sort((a, b) => timeValue(b.createdAt) - timeValue(a.createdAt)).map(order => ({
    key: order.id, label: order.id, date: order.status === 'refunded' ? order.refundedAt || order.createdAt : order.createdAt,
    count: order.items.reduce((sum, item) => sum + item.quantity, 0), total: order.total,
    details: `${order.status} · ${order.paymentMethod}`, order, currency: order.currency,
  }));
  if (path === '/reports/sales-by-item' || path === '/reports/sales-by-category') {
    const grouped = new Map<string, Row>();
    orders.filter(order => order.status === 'completed').forEach(order => order.items.forEach(item => {
      const product = store.products.find(candidate => candidate.id === item.productId);
      const label = path === '/reports/sales-by-category' ? product?.category || 'Uncategorized' : item.name;
      const key = `${order.currency}:${label}`;
      const current = grouped.get(key) ?? { key, label, quantity: 0, total: 0, count: 0, details: order.currency, currency: order.currency };
      current.quantity = (current.quantity || 0) + item.quantity;
      current.total = (current.total || 0) + item.quantity * item.unitPrice;
      current.count = (current.count || 0) + 1;
      grouped.set(key, current);
    }));
    return [...grouped.values()].sort((a, b) => (b.total || 0) - (a.total || 0));
  }
  if (path === '/reports/sales-by-employee') {
    const grouped = new Map<string, Row>();
    orders.filter(order => order.status === 'completed').forEach(order => {
      const label = store.team.find(member => member.id === order.employeeId)?.name || 'Unassigned';
      const key = `${order.currency}:${label}`;
      const current = grouped.get(key) ?? { key, label, count: 0, total: 0, details: order.currency, currency: order.currency };
      current.count = (current.count || 0) + 1;
      current.total = (current.total || 0) + order.total;
      grouped.set(key, current);
    });
    return [...grouped.values()].sort((a, b) => (b.total || 0) - (a.total || 0));
  }
  if (path === '/reports/sales-by-payment-type') {
    const grouped = new Map<string, Row>();
    orders.filter(order => order.status === 'completed').forEach(order => {
      const label = order.paymentMethod || 'Not recorded';
      const key = `${order.currency}:${label}`;
      const current = grouped.get(key) ?? { key, label, count: 0, total: 0, details: order.currency, currency: order.currency };
      current.count = (current.count || 0) + 1; current.total = (current.total || 0) + order.total;
      grouped.set(key, current);
    });
    return [...grouped.values()].sort((a, b) => (b.total || 0) - (a.total || 0));
  }
  if (path === '/reports/discounts') {
    const eligible = orders.filter(order => order.status === 'completed' && (order.discount > 0 || order.discountCode));
    return eligible.map(order => {
      const discount = store.discounts.find(item => item.code.toLowerCase() === (order.discountCode || '').toLowerCase());
      return { key: order.id, label: discount?.name || order.discountCode || 'Manual discount', date: order.createdAt,
        count: 1, discount: order.discount, total: order.total, details: `${order.id} · ${order.currency}`, currency: order.currency };
    }).sort((a, b) => timeValue(b.date) - timeValue(a.date));
  }
  if (path === '/reports/taxes') return orders.filter(order => order.status === 'completed' && (order.taxAmount ?? 0) > 0)
    .map(order => ({ key: order.id, label: order.id, date: order.createdAt, tax: order.taxAmount ?? 0, total: order.total, details: order.currency, currency: order.currency }))
    .sort((a, b) => timeValue(b.date) - timeValue(a.date));
  return orders.filter(order => order.status === 'completed').map(order => ({
    key: order.id, label: order.id, date: order.createdAt, count: 1, total: order.total, details: order.currency, currency: order.currency,
  }));
}

type Column = { label: string; numeric?: boolean; action?: boolean; value: (row: Row, currency: 'all' | Currency) => string };
const getColumns = (path: string): Column[] => {
  const name: Column = { label: path === '/reports/sales-by-category' ? 'Category' : 'Item / group', value: row => row.label };
  const count: Column = { label: 'Orders', numeric: true, value: row => String(row.count ?? 0) };
  const gross: Column = { label: 'Sales', numeric: true, value: row => row.total == null ? '—' : money(row.total, row.currency || 'LRD') };
  if (path === '/reports/receipts') return [
    { label: 'Receipt', value: row => row.label }, { label: 'Date', value: row => dateLabel(row.date) },
    { label: 'Items', numeric: true, value: row => String(row.count ?? 0) },
    { label: 'Payment / status', value: row => row.details?.replace(' · ', ' / ') || '—' }, gross,
    { label: 'Action', action: true, value: () => 'View receipt' },
  ];
  if (path === '/reports/sales-by-item' || path === '/reports/sales-by-category') return [
    name, { label: 'Units sold', numeric: true, value: row => String(row.quantity ?? 0) }, gross,
  ];
  if (path === '/reports/sales-by-employee' || path === '/reports/sales-by-payment-type') return [
    name, count, gross,
  ];
  if (path === '/reports/discounts') return [
    { label: 'Discount', value: row => row.label }, { label: 'Order', value: row => row.details?.split(' · ')[0] || '—' },
    { label: 'Date', value: row => dateLabel(row.date) },
    { label: 'Discount amount', numeric: true, value: row => money(row.discount ?? 0, row.currency || 'LRD') },
    gross,
  ];
  if (path === '/reports/taxes') return [
    { label: 'Order', value: row => row.label }, { label: 'Date', value: row => dateLabel(row.date) },
    { label: 'Tax collected', numeric: true, value: row => money(row.tax ?? 0, row.currency || 'LRD') }, gross,
  ];
  return [
    { label: 'Order', value: row => row.label }, { label: 'Date', value: row => dateLabel(row.date) },
    { label: 'Currency', value: row => row.currency || '—' }, count, gross,
  ];
};
function metricLabel(path: string) {
  if (path === '/reports/sales-by-item') return 'Units sold';
  if (path === '/reports/sales-by-category') return 'Categories';
  if (path === '/reports/sales-by-employee') return 'Employees';
  if (path === '/reports/sales-by-payment-type') return 'Payment types';
  if (path === '/reports/receipts') return 'Receipts';
  if (path === '/reports/discounts') return 'Discounts given';
  return 'Tax collected';
}
function metricValue(path: string, rows: Row[], completedCount: number, refundCount: number, currencies: Currency[], gross: number, discounts: number, refunds: number) {
  if (path === '/reports/sales-by-item') return rows.reduce((sum, row) => sum + (row.quantity || 0), 0).toLocaleString();
  if (path === '/reports/sales-by-category') return rows.length.toLocaleString();
  if (path === '/reports/sales-by-employee') return `${rows.length} groups`;
  if (path === '/reports/sales-by-payment-type') return `${rows.length} methods`;
  if (path === '/reports/receipts') return rows.length.toLocaleString();
  if (path === '/reports/discounts') return formatTotals(rows.map(row => row.discount || 0), rows, currencies);
  if (path === '/reports/taxes') return formatTotals(rows.map(row => row.tax || 0), rows, currencies);
  return `${completedCount} completed · ${refundCount} refunded`;
}
function formatTotals(values: number[], rows: Row[], currencies: Currency[]) {
  if (!rows.length) return currencies.length ? money(0, currencies[0]) : '—';
  const parts = new Map<Currency, number>();
  rows.forEach((row, index) => {
    const currency = row.currency || 'LRD';
    parts.set(currency, (parts.get(currency) || 0) + values[index]);
  });
  return [...parts].map(([currency, amount]) => money(amount, currency)).join(' / ');
}
function tableHeading(path: string) {
  if (path === '/reports/receipts') return 'Receipt activity';
  if (path === '/reports/discounts') return 'Discounted sales';
  if (path === '/reports/taxes') return 'Tax details';
  if (path === '/reports/sales-by-payment-type') return 'Sales by payment method';
  if (path === '/reports/sales-by-employee') return 'Sales by employee';
  if (path === '/reports/sales-by-item') return 'Sales by item';
  if (path === '/reports/sales-by-category') return 'Sales by category';
  return 'Sales transactions';
}
function Metric({ label, value, note }: { label: string; value: string; note: string }) {
  return <div className="report-metric panel" data-testid={`metric-${slug(label)}`}>
    <span>{label}</span><strong>{value}</strong><small>{note}</small>
  </div>;
}
