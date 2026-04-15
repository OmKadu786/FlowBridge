import { useApp } from '../App';

export default function Topnav() {
  const { store, page, setPage } = useApp();

  return (
    <div className="topnav">
      <div className="tn-logo">
        <div className="tn-logo-icon">
          <svg viewBox="0 0 24 24"><path d="M6 2h12l4 6-10 14L2 8z"/></svg>
        </div>
        <span className="tn-logo-text">flowbridge</span>
      </div>

      <div className="tn-search">
        <svg fill="none" viewBox="0 0 24 24" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35"/></svg>
        <input type="text" placeholder="Search" />
        <div className="tn-search-hint">
          <kbd>⌘</kbd><kbd>K</kbd>
        </div>
      </div>

      <div className="tn-right">
        <button className={`tn-btn ${page === 'chat' ? 'active-btn' : ''}`} onClick={() => setPage('chat')} title="FlowBridge AI">
          <svg fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.3 24.3 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.693L5 14.5"/></svg>
        </button>
        <button className="tn-btn" title="Notifications">
          <svg fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 00-4-5.7V5a2 2 0 10-4 0v.3A6 6 0 006 11v3.2c0 .5-.2 1.1-.6 1.4L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>
        </button>
        <div className="tn-user" onClick={() => {
          if(confirm('Are you sure you want to log out?')) {
            window.location.reload();
          }
        }}>
          <div className="tn-avatar">{store?.name?.[0]?.toUpperCase() || 'A'}</div>
          <span className="tn-store-name">{store?.name || 'My Store'}</span>
        </div>
      </div>
    </div>
  );
}
