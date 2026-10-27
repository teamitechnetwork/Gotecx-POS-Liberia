import { CreditCard, LockKeyhole, Trash2 } from 'lucide-react';
import { useState, type FormEvent } from 'react';

type PaymentSettings = Record<string, string>;

type Props = {
  settings: PaymentSettings;
  onSave: (settings: PaymentSettings) => void;
  notify: (message: string) => void;
};

const providersByType = {
  card: ['Visa', 'Mastercard'],
  mobile: ['Orange Money', 'Lonestar Cell MTN Money'],
} as const;

export default function ProPaymentMethods({
  settings,
  onSave,
  notify,
}: Props) {
  const savedLabel = settings.proPaymentMethodLabel || '';
  const [editing, setEditing] = useState(!savedLabel);
  const [methodType, setMethodType] = useState<'card' | 'mobile'>(
    settings.proPaymentMethodType === 'mobile' ? 'mobile' : 'card',
  );
  const [provider, setProvider] = useState(
    settings.proPaymentMethodProvider || 'Visa',
  );
  const [lastFour, setLastFour] = useState(
    settings.proPaymentMethodLastFour || '',
  );
  const [error, setError] = useState('');
  const providers = providersByType[methodType];

  const changeType = (value: 'card' | 'mobile') => {
    setMethodType(value);
    setProvider(providersByType[value][0]);
    setError('');
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const digits = lastFour.replace(/\D/g, '').slice(-4);
    if (digits.length !== 4) {
      setError('Enter the last four digits to label this demo method.');
      return;
    }

    onSave({
      ...settings,
      proPaymentMethodType: methodType,
      proPaymentMethodProvider: provider,
      proPaymentMethodLastFour: digits,
      proPaymentMethodLabel: `${provider} ending in ${digits}`,
    });
    setLastFour(digits);
    setEditing(false);
    setError('');
    notify('Demo payment method saved in this browser. No payment was processed.');
  };

  const removeMethod = () => {
    const next = { ...settings };
    delete next.proPaymentMethodType;
    delete next.proPaymentMethodProvider;
    delete next.proPaymentMethodLastFour;
    delete next.proPaymentMethodLabel;
    onSave(next);
    setLastFour('');
    setEditing(true);
    notify('Demo payment method removed.');
  };

  return (
    <section className="panel pro-payment-panel">
      <div className="panel-head">
        <div>
          <h3 className="panel-title">Pro payment method</h3>
          <span className="panel-kicker">
            Frontend preview only · nothing is charged
          </span>
        </div>
        <span className="pro-payment-icon" aria-hidden="true">
          <CreditCard size={17} />
        </span>
      </div>
      <div className="panel-body">
        <p className="pro-payment-intro">
          Save a masked label for the Advanced Inventory Pro checkout preview.
          This does not activate a subscription or connect a payment provider.
        </p>

        {savedLabel && !editing && (
          <div className="pro-payment-saved" data-testid="status-pro-payment-method">
            <div className="pro-payment-saved-icon">
              <CreditCard size={17} />
            </div>
            <div>
              <strong>{savedLabel}</strong>
              <span>Saved on this browser</span>
            </div>
            <div className="pro-payment-saved-actions">
              <button
                type="button"
                className="button small"
                data-testid="button-edit-pro-payment-method"
                onClick={() => setEditing(true)}
              >
                Change
              </button>
              <button
                type="button"
                className="button small danger"
                aria-label="Remove demo payment method"
                data-testid="button-remove-pro-payment-method"
                onClick={removeMethod}
              >
                <Trash2 size={13} />
              </button>
            </div>
          </div>
        )}

        {editing ? (
          <form className="pro-payment-form" onSubmit={submit}>
            <div className="form-grid">
              <div className="field">
                <label htmlFor="pro-method-type">Method type</label>
                <select
                  id="pro-method-type"
                  data-testid="select-pro-payment-type"
                  value={methodType}
                  onChange={(event) =>
                    changeType(event.target.value as 'card' | 'mobile')
                  }
                >
                  <option value="card">Card</option>
                  <option value="mobile">Mobile money</option>
                </select>
              </div>
              <div className="field">
                <label htmlFor="pro-method-provider">Provider</label>
                <select
                  id="pro-method-provider"
                  data-testid="select-pro-payment-provider"
                  value={providers.includes(provider as never) ? provider : providers[0]}
                  onChange={(event) => setProvider(event.target.value)}
                >
                  {providers.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field pro-payment-last-four">
                <label htmlFor="pro-method-last-four">
                  {methodType === 'card'
                    ? 'Last four digits'
                    : 'Phone number · last four digits'}
                </label>
                <input
                  id="pro-method-last-four"
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  maxLength={4}
                  pattern="[0-9]{4}"
                  placeholder="0000"
                  value={lastFour}
                  data-testid="input-pro-payment-last-four"
                  onChange={(event) =>
                    setLastFour(event.target.value.replace(/\D/g, '').slice(0, 4))
                  }
                />
              </div>
            </div>
            {error && (
              <p className="form-error" role="alert" data-testid="text-pro-payment-error">
                {error}
              </p>
            )}
            <div className="pro-payment-safety-note">
              <LockKeyhole size={15} />
              <span>
                Only the provider and last four digits are stored locally. Never
                enter a full card number, CVV, PIN, or mobile-money passcode.
              </span>
            </div>
            <div className="pro-payment-form-actions">
              {savedLabel && (
                <button
                  type="button"
                  className="button"
                  onClick={() => setEditing(false)}
                >
                  Cancel
                </button>
              )}
              <button
                type="submit"
                className="button primary"
                data-testid="button-save-pro-payment-method"
              >
                Save demo method
              </button>
            </div>
          </form>
        ) : (
          <button
            type="button"
            className="button"
            data-testid="button-change-pro-payment-method"
            onClick={() => setEditing(true)}
          >
            <CreditCard size={14} />
            Add or change method
          </button>
        )}
      </div>
    </section>
  );
}
