import { useState } from 'react';
import { useApp } from '../App';
import { api } from '../lib/api';

export default function AuthModal() {
  const { setUser, setStore, showToast } = useApp();
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      showToast('Please enter both username and password.', 'err');
      return;
    }
    setLoading(true);
    try {
      if (isLogin) {
        const data = await api.login({ username: username.trim(), password });
        setUser(data.user);
        setStore(data.store); // if they have a store
        showToast(`Welcome back, ${data.user.username}!`);
      } else {
        const data = await api.register({ username: username.trim(), password });
        setUser(data.user);
        showToast('Account created successfully!');
      }
    } catch (err) {
      showToast(err.message, 'err');
    }
    setLoading(false);
  };

  return (
    <div className="overlay">
      <div className="dialog" style={{ padding: '24px 32px' }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ width: 48, height: 48, background: '#95bf47', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="#fff"><path d="M6 2h12l4 6-10 14L2 8z"/></svg>
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: '#1a1a1a' }}>FlowBridge</h2>
          <p style={{ fontSize: 14, color: '#6d6d6d', marginTop: 4 }}>
            {isLogin ? 'Log in to your account' : 'Create a new account'}
          </p>
        </div>

        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#4a4a4a', marginBottom: 4 }}>Username</label>
            <input className="inp" type="text" placeholder="omkadu" value={username} onChange={e => setUsername(e.target.value)} disabled={loading} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#4a4a4a', marginBottom: 4 }}>Password</label>
            <input className="inp" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} disabled={loading} />
          </div>

          <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: '100%', justifyContent: 'center', marginTop: 10, padding: 12 }}>
            {loading ? <span className="spinner" /> : (isLogin ? 'Sign In' : 'Create Account')}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 24, fontSize: 13, color: '#6d6d6d' }}>
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <button onClick={() => setIsLogin(!isLogin)} style={{ background: 'none', border: 'none', color: '#1a1a1a', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
            {isLogin ? 'Sign up' : 'Log in'}
          </button>
        </div>
      </div>
    </div>
  );
}
