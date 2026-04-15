import { useState, useEffect } from 'react';
import { useApp } from '../App';
import { api } from '../lib/api';

export default function Customers() {
  const { store, customers, setCustomers, fmt } = useApp();
  const [query, setQuery] = useState('');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!store?.id || loaded) return;
    api.listCustomers(store.id).then(c => { setCustomers(c); setLoaded(true); });
  }, [store?.id]);

  const filtered = query
    ? customers.filter(c => c.email.toLowerCase().includes(query))
    : customers;

  return (
    <div>
      <div className="view-hd">
        <div className="view-title">Customers</div>
        <div className="view-sub">Purchase history and customer contacts</div>
      </div>
      <div style={{ marginBottom: 16 }}>
        <div className="srch" style={{ maxWidth: 300 }}>
          <svg fill="none" viewBox="0 0 24 24" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35"/></svg>
          <input className="inp" type="text" placeholder="Search customers…" value={query} onChange={e => setQuery(e.target.value.toLowerCase())} style={{ paddingLeft: 34 }} />
        </div>
      </div>
      <div className="card">
        <table>
          <thead>
            <tr><th>Customer</th><th>Email</th><th className="r">Orders</th><th className="r">Total Spent</th><th>Last Seen</th></tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan="5" className="empty-state">{query ? 'No match.' : 'No customers yet. Emails entered at checkout appear here.'}</td></tr>
            ) : filtered.map(c => (
              <tr key={c.id}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div className="cav">{c.email[0].toUpperCase()}</div>
                    <span className="tb">{c.email.split('@')[0]}</span>
                  </div>
                </td>
                <td style={{ color: '#6d6d6d' }}>{c.email}</td>
                <td className="r tb">{c.order_count}</td>
                <td className="r tb">{fmt(c.total_spent)}</td>
                <td style={{ color: '#6d6d6d' }}>{c.last_seen ? new Date(c.last_seen).toLocaleDateString() : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
