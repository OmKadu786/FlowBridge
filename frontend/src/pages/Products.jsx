import { useState, useEffect } from 'react';
import { useApp } from '../App';
import { api } from '../lib/api';

export default function Products() {
  const { store, products, setProducts, showToast, fmt } = useApp();
  const [query, setQuery] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [activeCategory, setActiveCategory] = useState(null);

  // Add product form
  const [npName, setNpName] = useState('');
  const [npCat, setNpCat] = useState('');
  const [npStock, setNpStock] = useState('0');
  const [npCost, setNpCost] = useState('');
  const [npPrice, setNpPrice] = useState('');
  const [attrs, setAttrs] = useState([]);

  // Extract unique categories
  const categories = Array.from(new Set(products.map(p => p.category || 'General')));

  const addProduct = async () => {
    if (!npName.trim()) { showToast('Name required.', 'err'); return; }
    try {
      const p = await api.createProduct({
        store_id: store.id,
        name: npName.trim(),
        category: npCat.trim() || 'General',
        stock: parseInt(npStock) || 0,
        cost_price: parseFloat(npCost) || 0,
        sale_price: parseFloat(npPrice) || 0,
        attributes: attrs.filter(a => a.k && a.v).map(a => ({ k: a.k, v: a.v })),
      });
      await api.createLog({ store_id: store.id, type: 'product', message: `Added "${p.name}"` });
      // Fetch latest to get updated pid from db, or just append optimally omitting pid temporarily until refresh
      // Best to let the page reload naturally or append standard:
      setProducts(prev => [{...p, pid: p.pid || '[Auto-PID]'}, ...prev]);
      setShowAdd(false);
      resetForm();
      showToast(`"${p.name}" added.`);
    } catch (e) {
      showToast(e.message, 'err');
    }
  };

  const resetForm = () => {
    setNpName(''); setNpCat(''); setNpStock('0'); setNpCost(''); setNpPrice(''); setAttrs([]);
  };

  if (activeCategory) {
    const catProducts = products.filter(p => (p.category || 'General') === activeCategory);
    const filtered = query ? catProducts.filter(p => p.name.toLowerCase().includes(query)) : catProducts;

    return (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <button className="btn-secondary" onClick={() => { setActiveCategory(null); setQuery(''); }} style={{ padding: '6px 12px' }}>← Back</button>
          <div>
            <div className="view-title">{activeCategory}</div>
            <div className="view-sub">{catProducts.length} product(s) in this category</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div className="srch" style={{ flex: 1, maxWidth: 300 }}>
            <svg fill="none" viewBox="0 0 24 24" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35"/></svg>
            <input className="inp" type="text" placeholder={`Search ${activeCategory}…`} value={query} onChange={e => setQuery(e.target.value.toLowerCase())} style={{ paddingLeft: 34 }} />
          </div>
        </div>

        <div className="card">
          <table>
            <thead>
              <tr><th>Product</th><th>PID</th><th className="r">Stock</th><th className="r">Price</th></tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan="4" className="empty-state">No matching products in this category.</td></tr>
              ) : filtered.map(p => (
                <tr key={p.id}>
                  <td>
                    <div className="tb">{p.name}</div>
                    <div style={{ marginTop: 3 }}>
                      {(p.attributes || []).map((a, i) => <span key={i} className="atag">{a.k}: {a.v}</span>)}
                    </div>
                  </td>
                  <td className="tmono">{p.pid || '[Auto]'}</td>
                  <td className="r tb">{p.stock}</td>
                  <td className="r">{fmt(p.sale_price)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="view-hd" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <div className="view-title">Product Catalog</div>
          <div className="view-sub">All models and items you sell, organized by category</div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
          <svg fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/></svg>
          Add Product
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
        {categories.length === 0 ? (
           <div className="empty-state" style={{ gridColumn: '1 / -1' }}>No products yet. Click "Add Product" to get started!</div>
        ) : categories.map(cat => (
          <div key={cat} className="card" style={{ cursor: 'pointer', transition: 'transform 0.1s, box-shadow 0.1s' }} onClick={() => setActiveCategory(cat)}>
            <div style={{ padding: '24px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 48, height: 48, background: '#f4f4f4', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="#8a8a8a" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/></svg>
              </div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#1a1a1a', marginBottom: 2 }}>{cat}</div>
                <div style={{ fontSize: 13, color: '#8a8a8a' }}>{products.filter(p => (p.category || 'General') === cat).length} items</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add Product Modal */}
      {showAdd && (
        <div className="overlay">
          <div className="dialog dlg-lg">
            <div className="dlg-hd">
              <div className="dlg-title">Add New Product</div>
              <div className="dlg-sub">It will automatically create a new category folder if it doesn't exist</div>
            </div>
            <div className="dlg-body">
              <div className="fl"><label>Product / Model Name *</label><input className="inp" type="text" placeholder='e.g. iPhone 15 Pro' value={npName} onChange={e => setNpName(e.target.value)} /></div>
              <div className="fgrid">
                <div className="fl"><label>Category *</label><input className="inp" type="text" list="cat-list" placeholder="e.g. Phones" value={npCat} onChange={e => setNpCat(e.target.value)} />
                  <datalist id="cat-list">{categories.map(c => <option key={c} value={c} />)}</datalist>
                </div>
                <div className="fl" style={{ margin: 0 }}><label>Initial Stock</label><input className="inp" type="number" min="0" placeholder="0" value={npStock} onChange={e => setNpStock(e.target.value)} /></div>
                <div className="fl" style={{ margin: 0 }}><label>Cost Price</label><input className="inp" type="number" step="0.01" placeholder="0.00" value={npCost} onChange={e => setNpCost(e.target.value)} /></div>
              </div>
              <div className="fl" style={{ marginTop: 12 }}><label>Sale Price *</label><input className="inp" type="number" step="0.01" placeholder="0.00" value={npPrice} onChange={e => setNpPrice(e.target.value)} /></div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#4a4a4a' }}>Variations / Attributes</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 7 }}>
                  {attrs.map((a, i) => (
                    <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <input className="inp" type="text" placeholder="e.g. Color" style={{ flex: 1 }} value={a.k} onChange={e => { const n = [...attrs]; n[i].k = e.target.value; setAttrs(n); }} />
                      <input className="inp" type="text" placeholder="e.g. Space Black" style={{ flex: 1 }} value={a.v} onChange={e => { const n = [...attrs]; n[i].v = e.target.value; setAttrs(n); }} />
                      <button onClick={() => setAttrs(attrs.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#c9c9c9', fontSize: 20 }}>×</button>
                    </div>
                  ))}
                </div>
                <button onClick={() => setAttrs([...attrs, { k: '', v: '' }])} style={{ marginTop: 8, background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: '#3b82f6', fontWeight: 600, fontFamily: 'inherit' }}>+ Add Variation</button>
              </div>
            </div>
            <div className="dlg-ft">
              <button className="btn btn-secondary" onClick={() => { setShowAdd(false); resetForm(); }}>Cancel</button>
              <button className="btn btn-primary" onClick={addProduct}>Create Product</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
