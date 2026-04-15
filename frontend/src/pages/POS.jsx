import { useState, useEffect } from 'react';
import { useApp } from '../App';
import { api } from '../lib/api';

export default function POS() {
  const { store, products, setProducts, orders, setOrders, showToast, fmt } = useApp();
  const [query, setQuery] = useState('');
  const [cart, setCart] = useState([]);
  const [email, setEmail] = useState('');
  const [showSuccess, setShowSuccess] = useState(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!store?.id || loaded) return;
    api.listProducts(store.id).then(p => { setProducts(p); setLoaded(true); });
  }, [store?.id]);

  const si = (qty) => {
    if (qty === 0) return { pill: 'pill pr', l: 'Out of Stock' };
    if (qty < 5) return { pill: 'pill po', l: 'Low Stock' };
    return { pill: 'pill pg', l: 'In Stock' };
  };

  const filtered = query
    ? products.filter(p => p.name.toLowerCase().includes(query))
    : products;

  const addToCart = (p) => {
    if (p.stock === 0) { showToast('Out of stock.', 'err'); return; }
    const ex = cart.find(c => c.id === p.id);
    if (ex) {
      if (ex.qty >= p.stock) { showToast('Max stock reached.', 'info'); return; }
      setCart(cart.map(c => c.id === p.id ? { ...c, qty: c.qty + 1 } : c));
    } else {
      setCart([...cart, { id: p.id, name: p.name, price: p.sale_price, qty: 1 }]);
    }
  };

  const updateQty = (id, delta) => {
    const item = cart.find(c => c.id === id);
    if (!item) return;
    const newQty = item.qty + delta;
    if (newQty < 1) { setCart(cart.filter(c => c.id !== id)); return; }
    const p = products.find(x => x.id === id);
    if (p && newQty > p.stock) { showToast('Max stock.', 'info'); return; }
    setCart(cart.map(c => c.id === id ? { ...c, qty: newQty } : c));
  };

  const removeFromCart = (id) => setCart(cart.filter(c => c.id !== id));

  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const taxAmt = subtotal * ((store?.tax_rate || 0) / 100);
  const total = subtotal + taxAmt;

  const completeSale = async () => {
    if (cart.length === 0) return;
    try {
      const order = await api.createOrder({
        store_id: store.id,
        items: cart.map(c => ({ product_id: c.id, name: c.name, price: c.price, quantity: c.qty })),
        subtotal,
        tax: taxAmt,
        total,
        customer_email: email.trim() || null,
      });
      await api.createLog({
        store_id: store.id,
        type: 'sale',
        message: `Order ${fmt(total)} · ${cart.length} item(s)${email.trim() ? ' → ' + email.trim() : ''}`,
      });
      // Refresh products
      const updatedProducts = await api.listProducts(store.id);
      setProducts(updatedProducts);
      setOrders(prev => [order, ...prev]);
      setShowSuccess({ id: order.id, subtotal, tax: taxAmt, total, email: email.trim() });
      setCart([]);
      setEmail('');
      showToast('Sale completed!');
    } catch (e) {
      showToast(e.message, 'err');
    }
  };

  const sendInvoice = async () => {
    if (showSuccess?.email && showSuccess?.id) {
      try {
        await api.sendInvoice(showSuccess.id);
        await api.createLog({ store_id: store.id, type: 'email', message: `Invoice sent to ${showSuccess.email}` });
        showToast(`Invoice sent to ${showSuccess.email}`);
      } catch(e) {
        showToast('Failed to send invoice', 'err');
      }
    }
    setShowSuccess(null);
  };

  return (
    <div>
      <div className="view-hd">
        <div className="view-title">Point of Sale</div>
        <div className="view-sub">Process transactions and manage orders</div>
      </div>

      <div className="pos-layout">
        <div>
          <div className="srch" style={{ marginBottom: 14 }}>
            <svg fill="none" viewBox="0 0 24 24" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35"/></svg>
            <input className="inp" type="text" placeholder="Search products to add…" value={query} onChange={e => setQuery(e.target.value.toLowerCase())} style={{ paddingLeft: 34 }} />
          </div>
          <div className="pos-grid">
            {filtered.length === 0 ? (
              <div style={{ gridColumn: '1/-1' }} className="empty-state">
                {products.length === 0 ? 'Add inventory products first.' : 'No products found.'}
              </div>
            ) : filtered.map(p => {
              const s = si(p.stock);
              const inCart = cart.find(c => c.id === p.id);
              return (
                <div key={p.id} className={`ptile${p.stock === 0 ? ' oos' : ''}`} onClick={() => p.stock > 0 && addToCart(p)}>
                  <div className="ptile-name">{p.name}</div>
                  <div className="ptile-sku">{p.sku}</div>
                  <div className="ptile-row">
                    <span className="ptile-price">{fmt(p.sale_price)}</span>
                    <span className="ptile-meta">
                      {inCart && <b style={{ color: '#404040' }}>{inCart.qty} in cart</b>}
                      {inCart && ' · '}
                      {p.stock} left
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="cart-panel">
          <div className="cart-hd">
            <span className="cart-ht">Order</span>
            <button className="btn-ghost-sm" onClick={() => setCart([])}>Clear</button>
          </div>
          <div className="cart-body">
            {cart.length === 0 ? (
              <div className="cart-empty">
                <svg width="40" height="40" fill="none" viewBox="0 0 24 24" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4"/></svg>
                <p>Cart is empty</p>
              </div>
            ) : cart.map(item => (
              <div key={item.id} className="crow">
                <div className="crow-top">
                  <span className="crow-name">{item.name}</span>
                  <span className="crow-amt">{fmt(item.price * item.qty)}</span>
                </div>
                <div className="crow-btm">
                  <span className="crow-each">{fmt(item.price)} each</span>
                  <div className="qctrl">
                    <button className="qb" onClick={() => updateQty(item.id, -1)}>−</button>
                    <span className="qv">{item.qty}</span>
                    <button className="qb" onClick={() => updateQty(item.id, 1)}>+</button>
                    <button className="qrm" onClick={() => removeFromCart(item.id)}>×</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="cart-foot">
            <div className="cline"><span>Subtotal</span><span>{fmt(subtotal)}</span></div>
            <div className="cline"><span>Tax ({store?.tax_rate || 0}%)</span><span>{fmt(taxAmt)}</span></div>
            <div className="ctotal"><span>Total</span><span>{fmt(total)}</span></div>
            <div style={{ marginBottom: 10 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#4a4a4a', marginBottom: 5 }}>Customer email (optional)</label>
              <input className="inp" type="email" placeholder="customer@email.com" value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            <button className="btn btn-primary" onClick={completeSale} style={{ width: '100%', justifyContent: 'center' }} disabled={cart.length === 0}>
              Complete order
            </button>
          </div>
        </div>
      </div>

      {/* Sale Success Modal */}
      {showSuccess && (
        <div className="overlay">
          <div className="dialog" style={{ textAlign: 'center' }}>
            <div className="dlg-body" style={{ paddingTop: 28 }}>
              <div className="ok-icon"><svg viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg></div>
              <p style={{ fontSize: 18, fontWeight: 800, color: '#1a1a1a' }}>Sale Complete</p>
              <p style={{ fontSize: 12, color: '#8a8a8a', marginTop: 4 }}>Transaction recorded successfully</p>
              <div className="receipt">
                <div className="rcpt-row"><span>Subtotal</span><span>{fmt(showSuccess.subtotal)}</span></div>
                <div className="rcpt-row"><span>Tax</span><span>{fmt(showSuccess.tax)}</span></div>
                <div className="rcpt-tot"><span>Total</span><span>{fmt(showSuccess.total)}</span></div>
              </div>
            </div>
            <div className="dlg-ft">
              <button className="btn btn-secondary" onClick={() => setShowSuccess(null)}>Close</button>
              <button className="btn btn-primary" onClick={sendInvoice}>
                <svg fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
                Send Invoice
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
