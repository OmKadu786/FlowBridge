import { useEffect, useState } from 'react';
import { useApp } from '../App';
import { api } from '../lib/api';

export default function Orders() {
  const { store, orders, setOrders, fmt } = useApp();
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!store?.id || loaded) return;
    api.listOrders(store.id).then(o => { setOrders(o); setLoaded(true); });
  }, [store?.id]);

  return (
    <div>
      <div className="view-hd">
        <div className="view-title">Order History</div>
        <div className="view-sub">Review completed sales and customer transactions</div>
      </div>

      <div className="card">
        <table>
          <thead>
            <tr><th>Order ID</th><th>Customer</th><th>Date</th><th className="r">Items</th><th className="r">Total</th></tr>
          </thead>
          <tbody>
            {orders.length === 0 ? (
              <tr><td colSpan="5" className="empty-state">No orders have been placed yet.</td></tr>
            ) : orders.map(o => (
              <tr key={o.id}>
                <td className="tmono">{o.id.split('-')[0].toUpperCase()}</td>
                <td>
                  <div className="tb">{o.customer_name || 'Walk-in Customer'}</div>
                  <div style={{ color: '#6d6d6d', fontSize: 13, marginTop: 2 }}>{o.customer_email || '—'}</div>
                </td>
                <td style={{ color: '#6d6d6d' }}>{new Date(o.created_at).toLocaleString()}</td>
                <td className="r">
                  {(o.items || []).reduce((acc, i) => acc + i.quantity, 0)} items
                </td>
                <td className="r tb">{fmt(o.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
