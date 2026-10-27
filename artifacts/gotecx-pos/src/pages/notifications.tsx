import {
  Bell,
  CircleDollarSign,
  Package,
  Sparkles,
  Users,
} from 'lucide-react';

type NotificationStore = {
  business: { currency: 'LRD' | 'USD' };
  products: Array<{
    active: boolean;
    stock: number;
    lowStockThreshold: number;
  }>;
  orders: Array<{
    createdAt: string;
    status: 'completed' | 'refunded';
    total: number;
    currency: 'LRD' | 'USD';
  }>;
  customers: Array<{ createdAt?: string }>;
  settings: Record<string, string>;
};

type Props = {
  store: NotificationStore;
  welcomeRead: boolean;
  onMarkWelcomeRead: () => void;
};

const money = (value: number, currency: 'LRD' | 'USD') =>
  new Intl.NumberFormat('en-LR', {
    style: 'currency',
    currency,
    maximumFractionDigits: currency === 'LRD' ? 0 : 2,
  }).format(value);

export default function NotificationsPage({
  store,
  welcomeRead,
  onMarkWelcomeRead,
}: Props) {
  const today = new Date().toDateString();
  const lowStockCount = store.products.filter(
    (product) =>
      product.active && product.stock <= product.lowStockThreshold,
  ).length;
  const todayOrders = store.orders.filter(
    (order) =>
      order.status === 'completed' &&
      order.currency === store.business.currency &&
      new Date(order.createdAt).toDateString() === today,
  );
  const todaySales = todayOrders.reduce((sum, order) => sum + order.total, 0);
  const newCustomerCount = store.customers.filter(
    (customer) =>
      customer.createdAt &&
      new Date(customer.createdAt).toDateString() === today,
  ).length;

  const notifications = [
    {
      id: 'welcome',
      title: 'Welcome to Gotecx POS',
      message:
        'Your workspace is ready. Manage sales, stock, customers, and reports from one place.',
      detail: 'Your local workspace',
      icon: Sparkles,
      unread: !welcomeRead,
    },
    ...(store.settings['notify-0'] !== 'false' && lowStockCount > 0
      ? [
          {
            id: 'low-stock',
            title: 'Low-stock items need attention',
            message: `${lowStockCount} active product${lowStockCount === 1 ? '' : 's'} ${lowStockCount === 1 ? 'is' : 'are'} at or below its stock threshold.`,
            detail: 'Inventory reminder',
            icon: Package,
            unread: false,
          },
        ]
      : []),
    ...(store.settings['notify-1'] !== 'false'
      ? [
          {
            id: 'daily-sales',
            title: 'Today’s sales summary',
            message: `${todayOrders.length} completed sale${todayOrders.length === 1 ? '' : 's'} recorded today · ${money(todaySales, store.business.currency)}.`,
            detail: 'Daily summary',
            icon: CircleDollarSign,
            unread: false,
          },
        ]
      : []),
    ...(store.settings['notify-2'] !== 'false' && newCustomerCount > 0
      ? [
          {
            id: 'new-customers',
            title: 'New customer profiles',
            message: `${newCustomerCount} new customer profile${newCustomerCount === 1 ? '' : 's'} added today.`,
            detail: 'Customer reminder',
            icon: Users,
            unread: false,
          },
        ]
      : []),
  ];

  return (
    <div className="notifications-page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Notifications</h1>
          <p className="page-subtitle">
            Welcome messages and reminders for this browser workspace.
          </p>
        </div>
        {!welcomeRead && (
          <button
            type="button"
            className="button small"
            data-testid="button-mark-welcome-read"
            onClick={onMarkWelcomeRead}
          >
            Mark welcome as read
          </button>
        )}
      </div>

      <div className="callout notification-demo-note">
        These reminders are local to this browser. No email or SMS messages are
        sent.
      </div>

      <section
        className="panel notification-list"
        aria-label="Notification list"
      >
        <div className="panel-head">
          <div>
            <h2 className="panel-title">Your notifications</h2>
            <span className="panel-kicker">
              {notifications.length} notification
              {notifications.length === 1 ? '' : 's'}
            </span>
          </div>
          <Bell size={17} className="notification-list-icon" />
        </div>
        <div className="notification-items">
          {notifications.map((notification) => {
            const Icon = notification.icon;
            return (
              <article
                key={notification.id}
                className={`notification-item ${notification.unread ? 'unread' : ''}`}
                data-testid={`notification-${notification.id}`}
              >
                <span className="notification-item-icon" aria-hidden="true">
                  <Icon size={18} />
                </span>
                <div className="notification-item-copy">
                  <div className="notification-item-heading">
                    <h3>{notification.title}</h3>
                    {notification.unread ? (
                      <span className="notification-unread-label">New</span>
                    ) : (
                      <span className="notification-read-label">Reminder</span>
                    )}
                  </div>
                  <p>{notification.message}</p>
                  <span>{notification.detail}</span>
                </div>
                {notification.unread && (
                  <span className="notification-unread-dot" aria-label="Unread" />
                )}
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
