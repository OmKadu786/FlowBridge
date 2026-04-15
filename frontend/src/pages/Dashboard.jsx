import { useState, useEffect } from 'react';
import { useApp } from '../App';
import { api } from '../lib/api';

export default function Dashboard() {
  const { store, products, setProducts, orders, setOrders, setPage, setChatOpen, fmt } = useApp();
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!store?.id || loaded) return;
    (async () => {
      const [prods, ords] = await Promise.all([
        api.listProducts(store.id),
        api.listOrders(store.id),
      ]);
      setProducts(prods);
      setOrders(ords);
      setLoaded(true);
    })();
  }, [store?.id]);

  const revenue = orders.reduce((s, o) => s + parseFloat(o.total || 0), 0);
  const lowStock = products.filter(p => p.stock < 5).length;
  const sortedStock = [...products].sort((a, b) => a.stock - b.stock).slice(0, 6);

  const si = (qty) => {
    if (qty === 0) return { pill: 'pill pr', label: 'Out of Stock' };
    if (qty < 5) return { pill: 'pill po', label: 'Low Stock' };
    return { pill: 'pill pg', label: 'In Stock' };
  };

  const skSend = () => {
    setPage('chat');
  };

  return (
    <div>
      <div className="dash-greeting">Hey there, {store?.name || 'Admin'}.</div>

      {/* Main Chat Navigation Box */}
      <div style={{ marginTop: 24, padding: '20px 24px', background: '#fff', borderRadius: 16, border: '1px solid #e5e5e5', display: 'flex', alignItems: 'center', gap: 12, cursor: 'text' }} onClick={() => setPage('chat')}>
        <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#7c3aed', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" style={{ width: 20, height: 20 }}><path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.3 24.3 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.693L5 14.5"/></svg>
        </div>
        <div style={{ flex: 1, position: 'relative' }}>
          <input className="inp" type="text" placeholder="Ask FlowBridge AI anything..." style={{ width: '100%', cursor: 'pointer', background: 'transparent', border: 'none', outline: 'none', fontSize: 15 }} readOnly />
        </div>
        <button style={{ background: '#1a1a1a', color: '#fff', border: 'none', borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <svg fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" style={{ width: 14, height: 14 }}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m0-16l-4 4m4-4l4 4"/></svg>
        </button>
      </div>

      {/* Quick action cards */}
      <div className="quick-cards">
        <div className="qcard">
          <div className="qcard-img">
            <div className="qcard-img-inner">
              <div className="qcard-thumb">
                <svg viewBox="0 0 24 24" fill="none" stroke="#c9c9c9" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>
              </div>
              <div className="qcard-thumb-b">
                <svg viewBox="0 0 24 24" fill="none" stroke="#c9c9c9" strokeWidth="1.5"><path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10"/></svg>
              </div>
            </div>
          </div>
          <div className="qcard-body">
            <div className="qcard-title">Add your first product</div>
            <div className="qcard-desc">Start building your inventory. Add products with pricing, stock levels, and custom attributes.</div>
            <div className="qcard-actions">
              <button className="btn-dark" onClick={() => setPage('inventory')}>Add product</button>
              <button className="btn-outline" onClick={() => setPage('inventory')}>View inventory</button>
            </div>
          </div>
        </div>
        <div className="qcard">
          <div className="qcard-img">
            <div className="qcard-img-inner">
              <div className="qcard-thumb">
                <svg viewBox="0 0 24 24" fill="none" stroke="#c9c9c9" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13l-2 2.3A1 1 0 006 17h11m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"/></svg>
              </div>
              <div className="qcard-thumb-b">
                <svg viewBox="0 0 24 24" fill="none" stroke="#c9c9c9" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
              </div>
            </div>
          </div>
          <div className="qcard-body">
            <div className="qcard-title">Start your first sale</div>
            <div className="qcard-desc">Use the Point of Sale to process orders, manage your cart, and send email invoices.</div>
            <div className="qcard-actions">
              <button className="btn-dark" onClick={() => setPage('sales')}>Open POS</button>
              <button className="btn-outline" onClick={() => setPage('customers')}>View customers</button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="stats">
        <div className="sc">
          <div className="sc-lbl">Revenue</div>
          <div className="sc-val">{fmt(revenue)}</div>
          <div className="sc-sub">All-time</div>
        </div>
        <div className="sc">
          <div className="sc-lbl">Products</div>
          <div className="sc-val">{products.length}</div>
          <div className="sc-sub">In inventory</div>
        </div>
        <div className="sc">
          <div className="sc-lbl">Low Stock</div>
          <div className="sc-val">{lowStock}</div>
          <div className="sc-sub">Need restock</div>
        </div>
        <div className="sc">
          <div className="sc-lbl">Orders</div>
          <div className="sc-val">{orders.length}</div>
          <div className="sc-sub">Completed</div>
        </div>
      </div>

      {/* Recent + Stock */}
      <div className="dash-row">
        <div className="card">
          <div className="card-hd">
            <span className="card-ht">Recent Orders</span>
            <button className="card-act" onClick={() => setPage('activity')}>View all</button>
          </div>
          <div>
            {orders.length === 0 ? (
              <div className="empty-state">No orders yet. Process a sale to see them here.</div>
            ) : (
              orders.slice(0, 6).map(o => (
                <div key={o.id} className="txrow">
                  <div>
                    <div className="tx-name">{(o.items || []).length} item{(o.items || []).length > 1 ? 's' : ''}</div>
                    <div className="tx-meta">{o.customer_email || 'Walk-in'} · {new Date(o.created_at).toLocaleTimeString()}</div>
                  </div>
                  <span className="tx-amt">{fmt(o.total)}</span>
                </div>
              ))
            )}
          </div>
        </div>
        <div className="card">
          <div className="card-hd">
            <span className="card-ht">Stock Overview</span>
            <button className="card-act" onClick={() => setPage('inventory')}>Manage</button>
          </div>
          <div>
            {products.length === 0 ? (
              <div className="empty-state">No products yet.</div>
            ) : (
              sortedStock.map(p => {
                const s = si(p.stock);
                return (
                  <div key={p.id} className="stk-row">
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div className="stk-name">{p.name}</div>
                      <div className="stk-sku">{p.pid || '[Auto]'}</div>
                    </div>
                    <span className={s.pill}><span className="pill-dot" />{p.stock}</span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
