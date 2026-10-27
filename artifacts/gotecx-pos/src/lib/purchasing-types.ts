export type Currency = 'LRD' | 'USD';

export type Product = {
  id: string;
  name: string;
  sku: string;
  category: string;
  price: number;
  currency: Currency;
  stock: number;
  lowStockThreshold: number;
  active: boolean;
};

export type StockMovement = {
  id: string;
  productId: string;
  productName: string;
  delta: number;
  reason: string;
  createdAt: string;
};

export type Supplier = {
  id: string;
  name: string;
  phone: string;
  email: string;
  county: string;
  notes: string;
};

export type PurchaseOrderItem = {
  productId: string;
  productName: string;
  quantity: number;
  unitCost: number;
};

export type PurchaseOrderStatus = 'open' | 'received' | 'cancelled';

export type PurchaseOrder = {
  id: string;
  createdAt: string;
  supplierId: string;
  supplierName: string;
  items: PurchaseOrderItem[];
  total: number;
  currency: Currency;
  status: PurchaseOrderStatus;
  receivedAt?: string;
};

export type FormField = {
  key: string;
  label: string;
  type?: string;
  options?: string[];
  required?: boolean;
  defaultValue?: string | number;
};

export type OpenForm = (
  title: string,
  fields: FormField[],
  initial: Record<string, any>,
  onSave: (values: Record<string, any>) => void,
  subtitle?: string,
) => void;

export type ConfirmDelete = (label: string, onDelete: () => void) => void;
