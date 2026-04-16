import { useState } from 'react';
import { useApp } from '../App';
import { api } from '../lib/api';

export default function OnboardingModal() {
  const { user, setStore, setProducts, showToast } = useApp();
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [taxRate, setTaxRate] = useState('');
  const [loading, setLoading] = useState(false);

  const next = async () => {
    if (step === 1) {
      if (!name.trim() || !category) { showToast('Fill in all fields.', 'err'); return; }
      setStep(2);
    } else if (step === 2) {
      setStep(3);
    } else {
      // Launch
      setLoading(true);
      try {
        const store = await api.createStore({
          user_id: user.id,
          name: name.trim(),
          category,
          currency,
          tax_rate: parseFloat(taxRate) || 0,
        });
        // Log the store creation
        await api.createLog({ store_id: store.id, type: 'system', message: `Store "${store.name}" created` });
        // Load products (empty initially)
        const prods = await api.listProducts(store.id);
        setProducts(prods);
        setStore(store);
        showToast(`Welcome! ${store.name} is ready.`);
      } catch (e) {
        showToast(e.message, 'err');
      }
      setLoading(false);
    }
  };

  const back = () => {
    if (step > 1) setStep(step - 1);
  };

  const stepClass = (n) => {
    if (n < step) return 'sdot done';
    if (n === step) return 'sdot active';
    return 'sdot idle';
  };

  const stepText = (n) => {
    if (n < step) return '✓';
    return n;
  };

  return (
    <div className="overlay">
      <div className="dialog">
        <div className="dlg-hd">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <div style={{ width: 30, height: 30, background: '#95bf47', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="#fff"><path d="M6 2h12l4 6-10 14L2 8z"/></svg>
            </div>
            <span className="dlg-title">FlowBridge</span>
          </div>
          <p className="dlg-sub">Set up your store to get started — takes 30 seconds.</p>
        </div>

        <div className="steps">
          <div className={stepClass(1)}>{stepText(1)}</div>
          <div className="sline" />
          <div className={stepClass(2)}>{stepText(2)}</div>
          <div className="sline" />
          <div className={stepClass(3)}>{stepText(3)}</div>
        </div>

        {step === 1 && (
          <div className="dlg-body">
            <div className="fl">
              <label>Store Name *</label>
              <input className="inp" type="text" placeholder="e.g. TechHub Electronics" value={name} onChange={e => setName(e.target.value)} />
            </div>
            <div className="fl" style={{ marginBottom: 0 }}>
              <label>Business Category *</label>
              <select className="inp" value={category} onChange={e => setCategory(e.target.value)}>
                <option value="">Select a category…</option>
                <option>Electronics</option>
                <option>Retail / General</option>
                <option>Food & Beverage</option>
                <option>Fashion & Apparel</option>
                <option>Hardware & Tools</option>
                <option>Other</option>
              </select>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="dlg-body">
            <div className="fl">
              <label>Currency</label>
              <select className="inp" value={currency} onChange={e => setCurrency(e.target.value)}>
                <option value="USD">USD — US Dollar ($)</option>
                <option value="EUR">EUR — Euro (€)</option>
                <option value="GBP">GBP — British Pound (£)</option>
                <option value="INR">INR — Indian Rupee (₹)</option>
                <option value="AED">AED — UAE Dirham</option>
                <option value="CAD">CAD — Canadian Dollar</option>
              </select>
            </div>
            <div className="fl" style={{ marginBottom: 0 }}>
              <label>Tax Rate (%)</label>
              <input className="inp" type="number" placeholder="e.g. 8.5" min="0" max="50" step="0.1" value={taxRate} onChange={e => setTaxRate(e.target.value)} />
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="dlg-body">
            <p style={{ fontSize: 13, fontWeight: 600, color: '#1a1a1a', marginBottom: 12 }}>Review your store</p>
            <div className="review-box">
              <div className="rrow"><span className="rkey">Store Name</span><span className="rval">{name}</span></div>
              <div className="rrow"><span className="rkey">Category</span><span className="rval">{category}</span></div>
              <div className="rrow"><span className="rkey">Currency</span><span className="rval">{currency}</span></div>
              <div className="rrow"><span className="rkey">Tax Rate</span><span className="rval">{taxRate || 0}%</span></div>
            </div>
          </div>
        )}

        <div className="dlg-ft" style={{ justifyContent: 'space-between' }}>
          {step > 1 ? (
            <button className="btn btn-secondary" onClick={back}>← Back</button>
          ) : <div />}
          <button className="btn btn-primary" onClick={next} disabled={loading}>
            {loading ? <span className="spinner" /> : step === 3 ? 'Launch →' : 'Continue →'}
          </button>
        </div>
      </div>
    </div>
  );
}
