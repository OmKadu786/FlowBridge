import { useState, useEffect } from 'react';
import { useApp } from '../App';
import { api } from '../lib/api';

export default function Inventory() {
  const { store, products, setProducts, showToast, fmt } = useApp();
  const [query, setQuery] = useState('');
  const [showRestock, setShowRestock] = useState(null); // product obj
  const [loaded, setLoaded] = useState(false);

  // Restock form
  const [rsSup, setRsSup] = useState('');
  const [rsQty, setRsQty] = useState('10');
  const [rsCost, setRsCost] = useState('');

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
    ? products.filter(p => p.name.toLowerCase().includes(query) || p.pid?.toLowerCase().includes(query))
    : products;

  const doRestock = async () => {
    if (!rsSup.trim()) { showToast('Enter supplier.', 'err'); return; }
    const qty = parseInt(rsQty) || 0;
    if (qty < 1) { showToast('Qty must be ≥ 1.', 'err'); return; }
    try {
      const updated = await api.restockProduct(showRestock.id, {
        quantity: qty,
        supplier: rsSup.trim(),
        cost_per_unit: rsCost ? parseFloat(rsCost) : null,
      });
      await api.createLog({ store_id: store.id, type: 'restock', message: `Restocked ${qty}× "${showRestock.name}" via ${rsSup.trim()}` });
      setProducts(prev => prev.map(p => p.id === showRestock.id ? { ...p, ...updated } : p));
      setShowRestock(null);
      showToast(`Restocked ${qty}× ${showRestock.name}`);
    } catch (e) {
      showToast(e.message, 'err');
    }
  };

  return (
    <div>
      <div className="view-hd">
        <div className="view-title">Inventory Levels</div>
        <div className="view-sub">Review current stock count and perform supplier restocks</div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div className="srch" style={{ flex: 1, maxWidth: 300 }}>
          <svg fill="none" viewBox="0 0 24 24" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35"/></svg>
          <input className="inp" type="text" placeholder="Search by name or PID…" value={query} onChange={e => setQuery(e.target.value.toLowerCase())} style={{ paddingLeft: 34 }} />
        </div>
      </div>

      <div className="card">
        <table>
          <thead>
            <tr><th>Status</th><th>Product</th><th>PID</th><th className="r">Stock</th><th className="r">Cost</th><th className="r">Price</th><th className="r">Margin</th><th className="c">Action</th></tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan="8" className="empty-state">No products{query ? ' match.' : ' yet. Click "Add product" to begin.'}</td></tr>
            ) : filtered.map(p => {
              const s = si(p.stock);
              const mg = p.sale_price > 0 ? Math.round((p.sale_price - p.cost_price) / p.sale_price * 100) : 0;
              const mc = mg >= 25 ? 'mg-g' : mg >= 10 ? 'mg-y' : 'mg-r';
              return (
                <tr key={p.id}>
                  <td><span className={s.pill}><span className="pill-dot" />{s.l}</span></td>
                  <td>
                    <div className="tb">{p.name}</div>
                    <div style={{ marginTop: 3 }}>
                      {(p.attributes || []).map((a, i) => <span key={i} className="atag">{a.k}: {a.v}</span>)}
                    </div>
                  </td>
                  <td className="tmono">{p.pid || '[Auto]'}</td>
                  <td className="r tb">{p.stock}</td>
                  <td className="r" style={{ color: '#6d6d6d' }}>{fmt(p.cost_price)}</td>
                  <td className="r tb">{fmt(p.sale_price)}</td>
                  <td className="r"><span className={mc}>{mg}%</span></td>
                  <td className="c">
                    <button className="btn-restock" onClick={() => { setShowRestock(p); setRsSup(''); setRsQty('10'); setRsCost(p.cost_price?.toString() || ''); }}>
                      Restock
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Restock Modal */}
      {showRestock && (
        <div className="overlay">
          <div className="dialog">
            <div className="dlg-hd">
              <div className="dlg-title">Restock Product</div>
              <div className="dlg-sub">{showRestock.name} (PID: {showRestock.pid})</div>
            </div>
            <div className="dlg-body">
              <div className="fl"><label>Supplier Name *</label><input className="inp" type="text" placeholder="e.g. TechDistrib Inc." value={rsSup} onChange={e => setRsSup(e.target.value)} /></div>
              <div className="fgrid">
                <div className="fl" style={{ margin: 0 }}><label>Quantity</label><input className="inp" type="number" min="1" value={rsQty} onChange={e => setRsQty(e.target.value)} /></div>
                <div className="fl" style={{ margin: 0 }}><label>Cost per Unit</label><input className="inp" type="number" step="0.01" placeholder="0.00" value={rsCost} onChange={e => setRsCost(e.target.value)} /></div>
              </div>
            </div>
            <div className="dlg-ft">
              <button className="btn btn-secondary" onClick={() => setShowRestock(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={doRestock}>Confirm Restock</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
