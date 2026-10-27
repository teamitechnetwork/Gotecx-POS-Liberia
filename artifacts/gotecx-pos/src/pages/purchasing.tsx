import { useState } from 'react';
import { Download, PackageCheck, Plus, Search, Truck, Users, type LucideIcon } from 'lucide-react';
import PurchaseOrderComposer, {
  type PurchaseOrderDraft,
} from '@/components/purchase-order-composer';
import type {
  ConfirmDelete,
  Currency,
  OpenForm,
  Product,
  PurchaseOrder,
  StockMovement,
  Supplier,
} from '@/lib/purchasing-types';

type Props = {
  suppliers: Supplier[];
  purchaseOrders: PurchaseOrder[];
  products: Product[];
  stockMovements: StockMovement[];
  currency: Currency;
  search: string;
  setSearch: (value: string) => void;
  setPath: (path: string) => void;
  updateSuppliers: (value: Supplier[]) => void;
  updatePurchaseOrders: (value: PurchaseOrder[]) => void;
  updateProducts: (value: Product[]) => void;
  updateStockMovements: (value: StockMovement[]) => void;
  openForm: OpenForm;
  confirmDelete: ConfirmDelete;
  notify: (message: string) => void;
};

const supplierFields = [
  { key: 'name', label: 'Supplier name', required: true },
  { key: 'phone', label: 'Phone number' },
  { key: 'email', label: 'Email address', type: 'email' },
  { key: 'county', label: 'County', type: 'select', options: ['Bomi','Bong','Gbarpolu','Grand Bassa','Grand Cape Mount','Grand Gedeh','Grand Kru','Lofa','Margibi','Maryland','Montserrado','Nimba','River Cess','River Gee','Sinoe'] },
  { key: 'notes', label: 'Notes', type: 'textarea' },
];

const formatMoney = (amount: number, currency: Currency) =>
  new Intl.NumberFormat('en-LR', {
    style: 'currency',
    currency,
    maximumFractionDigits: currency === 'LRD' ? 0 : 2,
  }).format(amount);

const exportCsv = (filename: string, rows: (string | number)[][]) => {
  const csv = rows
    .map((row) =>
      row.map((value) => `"${String(value ?? '').replaceAll('"', '""')}"`).join(','),
    )
    .join('\r\n');
  const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
};

function SummaryCard({
  label,
  value,
  note,
  icon: Icon,
}: {
  label: string;
  value: string;
  note: string;
  icon: LucideIcon;
}) {
  return (
    <div className="panel stat-card">
      <div className="stat-label">{label}</div>
      <div className="stat-accent"><Icon size={16} /></div>
      <div className="stat-value">{value}</div>
      <div className="stat-note">{note}</div>
    </div>
  );
}

export default function PurchasingPage({
  suppliers,
  purchaseOrders,
  products,
  stockMovements,
  currency,
  search,
  setSearch,
  setPath,
  updateSuppliers,
  updatePurchaseOrders,
  updateProducts,
  updateStockMovements,
  openForm,
  confirmDelete,
  notify,
}: Props) {
  const [tab, setTab] = useState<'Orders' | 'Suppliers'>('Orders');
  const [composerOpen, setComposerOpen] = useState(false);
  const [initialProductIds, setInitialProductIds] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState('All');

  const lowStockProducts = products.filter(
    (product) => product.active && product.stock <= product.lowStockThreshold,
  );
  const openOrders = purchaseOrders.filter((order) => order.status === 'open');
  const activeProducts = products.filter((product) => product.active);

  const startPurchaseOrder = (productIds: string[] = []) => {
    if (!suppliers.length) {
      setTab('Suppliers');
      notify('Add a supplier before creating a purchase order.');
      return;
    }
    if (!activeProducts.length) {
      setPath('/products');
      notify('Add an active product before creating a purchase order.');
      return;
    }
    setInitialProductIds(productIds);
    setComposerOpen(true);
  };

  const savePurchaseOrder = (draft: PurchaseOrderDraft) => {
    const supplier = suppliers.find((item) => item.id === draft.supplierId);
    const items = draft.items.flatMap((item) => {
      const product = products.find((candidate) => candidate.id === item.productId);
      return product
        ? [{
            productId: product.id,
            productName: product.name,
            quantity: item.quantity,
            unitCost: item.unitCost,
          }]
        : [];
    });
    if (!supplier || !items.length || items.length !== draft.items.length) {
      notify('Check the supplier and product selections, then try again.');
      return;
    }

    const rawTotal = items.reduce(
      (sum, item) => sum + item.quantity * item.unitCost,
      0,
    );
    const total =
      draft.currency === 'LRD' ? Math.round(rawTotal) : Math.round(rawTotal * 100) / 100;
    const order: PurchaseOrder = {
      id: `PO-${new Date().getFullYear()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`,
      createdAt: new Date().toISOString(),
      supplierId: supplier.id,
      supplierName: supplier.name,
      items,
      total,
      currency: draft.currency,
      status: 'open',
    };
    updatePurchaseOrders([order, ...purchaseOrders]);
    setComposerOpen(false);
    notify(`${order.id} created · stock will update when it is received.`);
  };

  const receivePurchaseOrder = (order: PurchaseOrder) => {
    if (order.status !== 'open') return;
    const missingProduct = order.items.find(
      (item) => !products.some((product) => product.id === item.productId),
    );
    if (missingProduct) {
      notify(`Cannot receive ${order.id}: ${missingProduct.productName} is no longer in the catalog.`);
      return;
    }

    const receivedAt = new Date().toISOString();
    const quantityByProduct = new Map<string, number>();
    order.items.forEach((item) =>
      quantityByProduct.set(
        item.productId,
        (quantityByProduct.get(item.productId) ?? 0) + item.quantity,
      ),
    );
    updateProducts(
      products.map((product) => {
        const quantity = quantityByProduct.get(product.id);
        return quantity ? { ...product, stock: product.stock + quantity } : product;
      }),
    );
    updateStockMovements([
      ...stockMovements,
      ...order.items.map((item) => ({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        productId: item.productId,
        productName: item.productName,
        delta: item.quantity,
        reason: `Purchase order ${order.id}`,
        createdAt: receivedAt,
      })),
    ]);
    updatePurchaseOrders(
      purchaseOrders.map((item) =>
        item.id === order.id ? { ...item, status: 'received', receivedAt } : item,
      ),
    );
    notify(`${order.id} received · ${order.items.reduce((sum, item) => sum + item.quantity, 0)} units added to stock.`);
  };

  const cancelPurchaseOrder = (order: PurchaseOrder) => {
    if (order.status !== 'open') return;
    if (!window.confirm(`Cancel ${order.id}? It will stay in history and no stock will be added.`)) {
      return;
    }
    updatePurchaseOrders(
      purchaseOrders.map((item) =>
        item.id === order.id ? { ...item, status: 'cancelled' } : item,
      ),
    );
    notify(`${order.id} cancelled.`);
  };

  const addSupplier = () =>
    openForm(
      'Add supplier',
      supplierFields,
      { county: 'Montserrado' },
      (values) => {
        const supplier: Supplier = {
          id: `SUP-${Math.random().toString(36).slice(2, 9).toUpperCase()}`,
          name: String(values.name).trim(),
          phone: String(values.phone || '').trim(),
          email: String(values.email || '').trim(),
          county: String(values.county || 'Montserrado'),
          notes: String(values.notes || '').trim(),
        };
        updateSuppliers([supplier, ...suppliers]);
        notify(`${supplier.name} added to suppliers.`);
      },
      'Supplier details are saved to this browser only.',
    );

  const editSupplier = (supplier: Supplier) =>
    openForm('Edit supplier', supplierFields, supplier, (values) => {
      const updated: Supplier = {
        ...supplier,
        name: String(values.name).trim(),
        phone: String(values.phone || '').trim(),
        email: String(values.email || '').trim(),
        county: String(values.county || 'Montserrado'),
        notes: String(values.notes || '').trim(),
      };
      updateSuppliers(suppliers.map((item) => item.id === supplier.id ? updated : item));
      updatePurchaseOrders(
        purchaseOrders.map((order) =>
          order.supplierId === supplier.id ? { ...order, supplierName: updated.name } : order,
        ),
      );
      notify(`${updated.name} updated.`);
    });

  const removeSupplier = (supplier: Supplier) => {
    if (purchaseOrders.some((order) => order.supplierId === supplier.id && order.status === 'open')) {
      notify('Receive or cancel this supplier’s open purchase orders before removing them.');
      return;
    }
    confirmDelete('supplier', () =>
      updateSuppliers(suppliers.filter((item) => item.id !== supplier.id)),
    );
  };

  const matchingSuppliers = suppliers.filter((supplier) =>
    `${supplier.name} ${supplier.phone} ${supplier.email} ${supplier.county}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  const matchingOrders = purchaseOrders.filter((order) => {
    const matchesFilter = statusFilter === 'All' || order.status === statusFilter.toLowerCase();
    const matchesSearch = `${order.id} ${order.supplierName} ${order.items
      .map((item) => item.productName)
      .join(' ')}`
      .toLowerCase()
      .includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const exportOrders = () =>
    exportCsv('gotecx-purchase-orders.csv', [
      ['Order','Created','Supplier','Items','Total','Currency','Status','Received'],
      ...purchaseOrders.map((order) => [
        order.id,
        order.createdAt,
        order.supplierName,
        order.items.map((item) => `${item.productName} x${item.quantity} @ ${item.unitCost}`).join('; '),
        order.total,
        order.currency,
        order.status,
        order.receivedAt || '',
      ]),
    ]);
  const exportSuppliers = () =>
    exportCsv('gotecx-suppliers.csv', [
      ['Supplier','Phone','Email','County','Notes'],
      ...suppliers.map((supplier) => [
        supplier.name,
        supplier.phone,
        supplier.email,
        supplier.county,
        supplier.notes,
      ]),
    ]);

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">Purchasing</h1>
          <p className="page-subtitle">Manage suppliers, restock products, and receive inventory.</p>
        </div>
        <div className="page-actions">
          {tab === 'Orders' && (
            <>
              <button className="button" onClick={exportOrders}>
                <Download size={14} /> Export orders
              </button>
              {lowStockProducts.length > 0 && (
                <button className="button" onClick={() => startPurchaseOrder(lowStockProducts.map((product) => product.id))}>
                  <PackageCheck size={14} /> Reorder low stock
                </button>
              )}
              <button className="button primary" onClick={() => startPurchaseOrder()}>
                <Plus size={15} /> Create purchase order
              </button>
            </>
          )}
          {tab === 'Suppliers' && (
            <>
              <button className="button" onClick={exportSuppliers}>
                <Download size={14} /> Export suppliers
              </button>
              <button className="button primary" onClick={addSupplier}>
                <Plus size={15} /> Add supplier
              </button>
            </>
          )}
        </div>
      </div>

      <div className="stat-grid">
        <SummaryCard label="Open orders" value={String(openOrders.length)} note="Awaiting delivery" icon={Truck} />
        <SummaryCard label="Suppliers" value={String(suppliers.length)} note="Saved locally" icon={Users} />
        <SummaryCard label="Low-stock items" value={String(lowStockProducts.length)} note="Ready to reorder" icon={PackageCheck} />
        <SummaryCard label="Orders received" value={String(purchaseOrders.filter((order) => order.status === 'received').length)} note="Inventory added to stock" icon={PackageCheck} />
      </div>

      <div className="panel">
        <div className="toolbar purchasing-toolbar">
          <div className="purchasing-tabs" role="tablist" aria-label="Purchasing sections">
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'Orders'}
              className={`button small ${tab === 'Orders' ? 'primary' : ''}`}
              onClick={() => setTab('Orders')}
            >
              Purchase orders <span className="nav-count">{openOrders.length}</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'Suppliers'}
              className={`button small ${tab === 'Suppliers' ? 'primary' : ''}`}
              onClick={() => setTab('Suppliers')}
            >
              Suppliers <span className="nav-count">{suppliers.length}</span>
            </button>
          </div>
          <div className="searchbar">
            <Search size={14} />
            <input
              aria-label={tab === 'Orders' ? 'Search purchase orders' : 'Search suppliers'}
              placeholder={tab === 'Orders' ? 'Search purchase orders' : 'Search suppliers'}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
        </div>

        {tab === 'Orders' ? (
          <>
            <div className="toolbar">
              {['All','Open','Received','Cancelled'].map((item) => (
                <button
                  type="button"
                  key={item}
                  className={`button small ${statusFilter === item ? 'primary' : ''}`}
                  onClick={() => setStatusFilter(item)}
                >
                  {item}
                </button>
              ))}
            </div>
            {matchingOrders.length ? (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr><th>Purchase order</th><th>Supplier</th><th>Created</th><th>Items</th><th>Total</th><th>Status</th><th>Actions</th></tr>
                  </thead>
                  <tbody>
                    {matchingOrders.map((order) => (
                      <tr key={order.id}>
                        <td className="table-primary">{order.id}</td>
                        <td>{order.supplierName}</td>
                        <td>{new Intl.DateTimeFormat('en-LR', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(order.createdAt))}</td>
                        <td>{order.items.reduce((sum, item) => sum + item.quantity, 0)} units</td>
                        <td>{formatMoney(order.total, order.currency)}</td>
                        <td><span className={`badge ${order.status === 'open' ? 'amber' : order.status === 'cancelled' ? 'red' : ''}`}>{order.status}</span></td>
                        <td className="action-cell">
                          {order.status === 'open' ? (
                            <>
                              <button className="button small primary" onClick={() => receivePurchaseOrder(order)}>
                                <PackageCheck size={13} /> Receive stock
                              </button>
                              <button className="button small danger" onClick={() => cancelPurchaseOrder(order)}>
                                Cancel
                              </button>
                            </>
                          ) : order.receivedAt ? (
                            <span className="muted">Received {new Intl.DateTimeFormat('en-LR', { month: 'short', day: 'numeric' }).format(new Date(order.receivedAt))}</span>
                          ) : (
                            <span className="muted">No stock added</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="panel-body">
                <div className="empty-state">
                  <div className="empty-state-mark"><Truck size={21} /></div>
                  <h3>{purchaseOrders.length ? 'No purchase orders match' : 'No purchase orders yet'}</h3>
                  <p>Create an order with one or more catalog products. Receive it when stock arrives to update inventory.</p>
                  <button className="button primary" onClick={() => startPurchaseOrder()}>
                    <Plus size={14} /> Create purchase order
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          matchingSuppliers.length ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Supplier</th><th>Phone</th><th>Email</th><th>County</th><th>Purchase orders</th><th></th></tr>
                </thead>
                <tbody>
                  {matchingSuppliers.map((supplier) => (
                    <tr key={supplier.id}>
                      <td className="table-primary">{supplier.name}</td>
                      <td>{supplier.phone || '—'}</td>
                      <td>{supplier.email || '—'}</td>
                      <td>{supplier.county || '—'}</td>
                      <td>{purchaseOrders.filter((order) => order.supplierId === supplier.id).length}</td>
                      <td className="action-cell">
                        <button className="button small" onClick={() => editSupplier(supplier)}>Edit</button>
                        <button className="button small danger" onClick={() => removeSupplier(supplier)}>Remove</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="panel-body">
              <div className="empty-state">
                <div className="empty-state-mark"><Users size={21} /></div>
                <h3>{suppliers.length ? 'No suppliers match' : 'Add your first supplier'}</h3>
                <p>Save supplier contacts here, then attach them to purchase orders and stock receipts.</p>
                <button className="button primary" onClick={addSupplier}><Plus size={14} /> Add supplier</button>
              </div>
            </div>
          )
        )}
      </div>

      {tab === 'Orders' && (
        <div className="panel" style={{ marginTop: 16 }}>
          <div className="panel-head">
            <h3 className="panel-title">Reorder suggestions</h3>
            <span className="muted">{lowStockProducts.length} products at or below their alert level</span>
          </div>
          {lowStockProducts.length ? (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Product</th><th>Current stock</th><th>Alert at</th><th>Suggested quantity</th><th></th></tr></thead>
                <tbody>
                  {lowStockProducts.map((product) => (
                    <tr key={product.id}>
                      <td className="table-primary">{product.name}</td>
                      <td><span className="badge red">{product.stock} left</span></td>
                      <td>{product.lowStockThreshold}</td>
                      <td>{Math.max(1, product.lowStockThreshold - product.stock + 1)} units</td>
                      <td><button className="button small" onClick={() => startPurchaseOrder([product.id])}>Order this item</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="panel-body"><p className="muted">All active products are above their stock alerts.</p></div>
          )}
        </div>
      )}

      {composerOpen && (
        <div
          className="overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setComposerOpen(false);
          }}
        >
          <section className="dialog" role="dialog" aria-modal="true" aria-labelledby="purchase-dialog-title">
            <div className="dialog-head">
              <div>
                <h2 id="purchase-dialog-title">Create purchase order</h2>
                <p>Record expected supplier costs in LRD or USD.</p>
              </div>
              <button className="button small" onClick={() => setComposerOpen(false)} aria-label="Close purchase order form">×</button>
            </div>
            <PurchaseOrderComposer
              suppliers={suppliers}
              products={activeProducts}
              defaultCurrency={currency}
              initialProductIds={initialProductIds}
              onSave={savePurchaseOrder}
              onCancel={() => setComposerOpen(false)}
            />
          </section>
        </div>
      )}
    </>
  );
}
