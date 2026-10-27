import { useState, type FormEvent } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { Currency, Product, Supplier } from '@/lib/purchasing-types';

type DraftLine = {
  key: string;
  productId: string;
  quantity: string;
  unitCost: string;
};

export type PurchaseOrderDraft = {
  supplierId: string;
  currency: Currency;
  items: { productId: string; quantity: number; unitCost: number }[];
};

type Props = {
  suppliers: Supplier[];
  products: Product[];
  defaultCurrency: Currency;
  initialProductIds?: string[];
  onSave: (draft: PurchaseOrderDraft) => void;
  onCancel: () => void;
};

const newLine = (productId = '', quantity = '1'): DraftLine => ({
  key: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  productId,
  quantity,
  unitCost: '',
});

export default function PurchaseOrderComposer({
  suppliers,
  products,
  defaultCurrency,
  initialProductIds = [],
  onSave,
  onCancel,
}: Props) {
  const [supplierId, setSupplierId] = useState(suppliers[0]?.id ?? '');
  const [currency, setCurrency] = useState<Currency>(defaultCurrency);
  const [lines, setLines] = useState<DraftLine[]>(() =>
    initialProductIds.length
      ? initialProductIds.map((productId) => {
          const product = products.find((item) => item.id === productId);
          const suggestedQuantity = product
            ? Math.max(1, product.lowStockThreshold - product.stock + 1)
            : 1;
          return newLine(productId, String(suggestedQuantity));
        })
      : [newLine()],
  );
  const [error, setError] = useState('');

  const total = lines.reduce(
    (sum, line) =>
      sum + Math.max(0, Number(line.quantity) || 0) * Math.max(0, Number(line.unitCost) || 0),
    0,
  );
  const displayedTotal =
    currency === 'LRD' ? Math.round(total) : Math.round(total * 100) / 100;

  const updateLine = (index: number, changes: Partial<DraftLine>) => {
    setLines((current) =>
      current.map((line, lineIndex) =>
        lineIndex === index ? { ...line, ...changes } : line,
      ),
    );
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supplierId) {
      setError('Choose a supplier before saving the purchase order.');
      return;
    }

    const items = lines.map((line) => ({
      productId: line.productId,
      quantity: Number(line.quantity),
      unitCost: Number(line.unitCost),
    }));
    if (
      !items.length ||
      items.some(
        (item) =>
          !item.productId ||
          !Number.isInteger(item.quantity) ||
          item.quantity < 1 ||
          !Number.isFinite(item.unitCost) ||
          item.unitCost < 0,
      )
    ) {
      setError('Choose a product, whole-number quantity, and valid unit cost for every line.');
      return;
    }

    onSave({ supplierId, currency, items });
  };

  return (
    <form onSubmit={submit}>
      <div className="form-grid">
        <div className="field">
          <label htmlFor="purchase-supplier">Supplier</label>
          <select
            id="purchase-supplier"
            value={supplierId}
            required
            onChange={(event) => setSupplierId(event.target.value)}
          >
            <option value="">Choose a supplier</option>
            {suppliers.map((supplier) => (
              <option key={supplier.id} value={supplier.id}>
                {supplier.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="purchase-currency">Order currency</label>
          <select
            id="purchase-currency"
            value={currency}
            onChange={(event) => setCurrency(event.target.value as Currency)}
          >
            <option value="LRD">LRD · Liberian dollar</option>
            <option value="USD">USD · US dollar</option>
          </select>
        </div>
      </div>

      <div className="purchase-lines-heading">
        <strong>Items to order</strong>
        <span className="muted">Stock changes only when you receive the order.</span>
      </div>
      <div className="purchase-lines">
        {lines.map((line, index) => (
          <div className="purchase-line" key={line.key}>
            <div className="field purchase-product-field">
              <label htmlFor={`purchase-product-${line.key}`}>Product</label>
              <select
                id={`purchase-product-${line.key}`}
                required
                value={line.productId}
                onChange={(event) => updateLine(index, { productId: event.target.value })}
              >
                <option value="">Choose a product</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name}{product.sku ? ` · ${product.sku}` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor={`purchase-quantity-${line.key}`}>Quantity</label>
              <input
                id={`purchase-quantity-${line.key}`}
                type="number"
                min="1"
                step="1"
                required
                value={line.quantity}
                onChange={(event) => updateLine(index, { quantity: event.target.value })}
              />
            </div>
            <div className="field">
              <label htmlFor={`purchase-cost-${line.key}`}>Unit cost</label>
              <input
                id={`purchase-cost-${line.key}`}
                type="number"
                min="0"
                step={currency === 'LRD' ? '1' : '0.01'}
                required
                value={line.unitCost}
                onChange={(event) => updateLine(index, { unitCost: event.target.value })}
              />
            </div>
            <button
              type="button"
              className="button small danger purchase-remove-line"
              aria-label={`Remove line ${index + 1}`}
              onClick={() => setLines((current) => current.filter((_, i) => i !== index))}
              disabled={lines.length === 1}
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>

      <div className="purchase-composer-footer">
        <button
          type="button"
          className="button small"
          onClick={() => setLines((current) => [...current, newLine()])}
        >
          <Plus size={14} /> Add another item
        </button>
        <strong>
          Estimated total{' '}
          {new Intl.NumberFormat('en-LR', {
            style: 'currency',
            currency,
            maximumFractionDigits: currency === 'LRD' ? 0 : 2,
          }).format(displayedTotal)}
        </strong>
      </div>
      {error && (
        <p role="alert" className="purchase-form-error">
          {error}
        </p>
      )}

      <div className="dialog-actions">
        <button type="button" className="button" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="button primary">
          Save purchase order
        </button>
      </div>
    </form>
  );
}
