import { useEffect, useState } from 'react';
import { useApp } from '../App';
import { api } from '../lib/api';

export default function Payments() {
  const { store, orders, setOrders, showToast, fmt } = useApp();
  const [loaded, setLoaded] = useState(false);
  const [tab, setTab] = useState('due');

  useEffect(() => {
    if (!store?.id || loaded) return;
    api.listOrders(store.id).then(o => { setOrders(o); setLoaded(true); });
  }, [store?.id]);

  const paidOrders = orders.filter(o => o.status !== 'due');
  const dueOrders = orders.filter(o => o.status === 'due');

  const visibleFields = tab === 'due' ? dueOrders : paidOrders;

  const handleReminder = async (id, email) => {
    if (!email) {
      showToast('Cannot send reminder: No customer email provided for this order.', 'err');
      return;
    }
    
    try {
      showToast('Sending reminder...');
      const res = await api.sendReminder(id);
      if (res.error) throw new Error(res.error);
      
      await api.createLog({ store_id: store.id, type: 'email', message: `Payment reminder sent to ${email}` });
      showToast('Payment reminder sent successfully!');
    } catch (e) {
      showToast(`Failed to send reminder: ${e.message}`, 'err');
    }
  };

  return (
    <div>
      <div className="view-hd" style={{ marginBottom: 16 }}>
        <div>
          <div className="view-title">Payments</div>
          <div className="view-sub">Track upfront payments and follow up on due balances</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 16, marginBottom: 20, borderBottom: '1px solid #e5e5e5', paddingBottom: 10 }}>
        <button 
          onClick={() => setTab('due')}
          style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: tab === 'due' ? 600 : 500, color: tab === 'due' ? '#ef4444' : '#8a8a8a', position: 'relative' }}
        >
          Payments Due ({dueOrders.length})
          {tab === 'due' && <div style={{ position: 'absolute', bottom: -11, left: 0, right: 0, height: 2, background: '#ef4444' }}/>}
        </button>
        <button 
          onClick={() => setTab('paid')}
          style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: tab === 'paid' ? 600 : 500, color: tab === 'paid' ? '#1a1a1a' : '#8a8a8a', position: 'relative' }}
        >
          Paid in Full ({paidOrders.length})
          {tab === 'paid' && <div style={{ position: 'absolute', bottom: -11, left: 0, right: 0, height: 2, background: '#1a1a1a' }}/>}
        </button>
      </div>

      <div className="card">
        <table>
          <thead>
            <tr><th>Order ID</th><th>Customer</th><th>Date</th><th className="r">Total</th>{tab === 'due' && <th className="r">Actions</th>}</tr>
          </thead>
          <tbody>
            {visibleFields.length === 0 ? (
              <tr><td colSpan={tab === 'due' ? 5 : 4} className="empty-state">No {tab} payments to display.</td></tr>
            ) : visibleFields.map(o => (
              <tr key={o.id}>
                <td className="tmono">{o.id.split('-')[0].toUpperCase()}</td>
                <td>
                  <div className="tb">{o.customer_name || 'Walk-in Customer'}</div>
                  <div style={{ color: '#6d6d6d', fontSize: 13, marginTop: 2 }}>{o.customer_email || '—'}</div>
                </td>
                <td style={{ color: '#6d6d6d' }}>{new Date(o.created_at).toLocaleString()}</td>
                <td className="r tb">{fmt(o.total)}</td>
                {tab === 'due' && (
                  <td className="r">
                    <button className="btn-outline-sm" onClick={() => handleReminder(o.id, o.customer_email)} disabled={!o.customer_email}>
                      Send Reminder
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
