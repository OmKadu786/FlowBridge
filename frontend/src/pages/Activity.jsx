import { useState, useEffect } from 'react';
import { useApp } from '../App';
import { api } from '../lib/api';

const ICO = { system: '⚙️', sale: '💰', restock: '📦', product: '📦', email: '✉️' };
const BG = { system: '#f4f4f4', sale: '#f0fdf4', restock: '#eff6ff', product: '#f4f4f4', email: '#faf5ff' };

export default function Activity() {
  const { store, activity, setActivity } = useApp();
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!store?.id || loaded) return;
    api.listActivity(store.id).then(a => { setActivity(a); setLoaded(true); });
  }, [store?.id]);

  return (
    <div>
      <div className="view-hd">
        <div className="view-title">Analytics & Activity</div>
        <div className="view-sub">All system events and activity history</div>
      </div>
      <div className="card">
        <div className="card-hd">
          <span className="card-ht">Activity Log</span>
          <span style={{ fontSize: 12, color: '#8a8a8a' }}>{activity.length} entries</span>
        </div>
        <div style={{ maxHeight: '68vh', overflowY: 'auto' }}>
          {activity.length === 0 ? (
            <div className="empty-state">No activity yet.</div>
          ) : activity.map(e => (
            <div key={e.id} className="logrow">
              <div className="log-ico" style={{ background: BG[e.type] || '#f4f4f4' }}>
                {ICO[e.type] || '📋'}
              </div>
              <div>
                <div className="log-msg">{e.message}</div>
                <div className="log-time">{new Date(e.created_at).toLocaleString()}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
