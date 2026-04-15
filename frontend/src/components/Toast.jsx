import { useApp } from '../App';

export default function Toast() {
  const { toast } = useApp();
  if (!toast) return null;

  const colors = { ok: '#4ade80', err: '#f87171', info: '#60a5fa' };
  const color = colors[toast.type] || colors.ok;

  return (
    <div className={`toast${toast ? ' on' : ''}`}>
      <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke={color} strokeWidth="2.5">
        {toast.type === 'err'
          ? <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
          : <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
        }
      </svg>
      <span>{toast.msg}</span>
    </div>
  );
}
