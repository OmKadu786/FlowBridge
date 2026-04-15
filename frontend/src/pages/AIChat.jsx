import { useState, useRef, useEffect } from 'react';
import { useApp } from '../App';
import { api } from '../lib/api';

export default function AIChat() {
  const { user, store, showToast } = useApp();
  
  // Minimal chat sessions state (persisted locally for the session)
  const [sessions, setSessions] = useState(() => {
    try { return JSON.parse(localStorage.getItem('fb_chats')) || [{ id: Date.now(), title: 'New Conversation', msgs: [] }]; }
    catch { return [{ id: Date.now(), title: 'New Conversation', msgs: [] }]; }
  });
  const [activeId, setActiveId] = useState(sessions[0].id);
  const activeSess = sessions.find(s => s.id === activeId) || sessions[0];

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const endRef = useRef(null);

  useEffect(() => {
    localStorage.setItem('fb_chats', JSON.stringify(sessions));
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [sessions, activeSess.msgs]);

  const newChat = () => {
    const fresh = { id: Date.now(), title: 'New Conversation', msgs: [] };
    setSessions([fresh, ...sessions]);
    setActiveId(fresh.id);
  };

  const ask = async (e, directQ = null) => {
    if (e) e.preventDefault();
    const q = directQ || input.trim();
    if (!q || loading) return;

    setInput('');
    setLoading(true);

    // Update current session with user message
    const um = { role: 'user', content: q };
    let currentMsgs = [...activeSess.msgs, um];
    
    // Auto-rename chat if it's the first message
    let newTitle = activeSess.title;
    if (currentMsgs.length === 1) {
      newTitle = q.length > 25 ? q.substring(0, 25) + '...' : q;
    }

    setSessions(sess => sess.map(s => s.id === activeId ? { ...s, title: newTitle, msgs: currentMsgs } : s));

    try {
      const payload = {
        store_id: store.id,
        messages: currentMsgs.slice(-10) // send last 10 msgs
      };
      const res = await api.chat(payload);
      
      const am = { role: 'assistant', content: res.reply };
      setSessions(sess => sess.map(s => s.id === activeId ? { ...s, msgs: [...s.msgs, am] } : s));
    } catch (err) {
      showToast('AI failed to respond. Please check console.', 'err');
    }
    setLoading(false);
  };

  const isE = activeSess.msgs.length === 0;

  return (
    <div style={{ display: 'flex', height: '100%', margin: '-24px', background: '#fff' }}>
      {/* Side - History */}
      <div style={{ width: 260, borderRight: '1px solid #e5e5e5', display: 'flex', flexDirection: 'column', background: '#f9f9f9' }}>
        <div style={{ padding: 16 }}>
          <button className="btn btn-primary" onClick={newChat} style={{ width: '100%', justifyContent: 'center', background: '#fff', color: '#1a1a1a', border: '1px solid #dcdcdc', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
            <svg fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" style={{ width: 16, height: 16 }}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/></svg>
            New conversation
          </button>
        </div>
        <div style={{ overflowY: 'auto', flex: 1, padding: '0 12px 16px' }}>
          {sessions.map(s => (
            <button key={s.id} onClick={() => setActiveId(s.id)} style={{ width: '100%', textAlign: 'left', padding: '10px 12px', background: s.id === activeId ? '#ebebeb' : 'transparent', border: 'none', borderRadius: 8, cursor: 'pointer', color: s.id === activeId ? '#1a1a1a' : '#4a4a4a', fontWeight: s.id === activeId ? 600 : 500, fontSize: 13, marginBottom: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {s.title}
            </button>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}>
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 24px', display: 'flex', flexDirection: 'column' }}>
          
          {isE ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#1a1a1a' }}>
               <div style={{ width: 56, height: 56, background: '#ede9fe', color: '#7c3aed', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                 <svg fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" style={{ width: 32, height: 32 }}><path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.3 24.3 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.693L5 14.5"/></svg>
               </div>
               <h2 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Hey there, {user.username}</h2>
               <p style={{ fontSize: 18, fontWeight: 600, color: '#6d6d6d', marginTop: 4 }}>How can I help?</p>

               <div style={{ display: 'flex', gap: 12, marginTop: 40, flexWrap: 'wrap', justifyContent: 'center', maxWidth: 600 }}>
                 <button className="atag" style={{ background: '#f4f4f4', border: '1px solid #e5e5e5', padding: '10px 16px', fontSize: 14, cursor: 'pointer', borderRadius: 20 }} onClick={() => ask(null, "What's low on stock right now?")}>
                    <span style={{ color: '#7c3aed', marginRight: 6 }}>●</span> What's low in stock?
                 </button>
                 <button className="atag" style={{ background: '#f4f4f4', border: '1px solid #e5e5e5', padding: '10px 16px', fontSize: 14, cursor: 'pointer', borderRadius: 20 }} onClick={() => ask(null, "Show me my recent orders and revenue.")}>
                    <span style={{ color: '#3b82f6', marginRight: 6 }}>●</span> Recent orders & revenue
                 </button>
               </div>
            </div>
          ) : (
            <div style={{ maxWidth: 768, width: '100%', margin: '0 auto', padding: '40px 0 80px' }}>
              {activeSess.msgs.map((m, i) => (
                <div key={i} style={{ display: 'flex', gap: 16, marginBottom: 32, flexDirection: m.role === 'user' ? 'row-reverse' : 'row' }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    background: m.role === 'user' ? '#1a1a1a' : '#7c3aed', color: '#fff', fontWeight: 600, fontSize: 14 }}>
                    {m.role === 'user' ? user.username[0].toUpperCase() : 'AI'}
                  </div>
                  <div style={{ 
                    padding: '12px 16px', 
                    borderRadius: 16, 
                    borderTopRightRadius: m.role === 'user' ? 4 : 16,
                    borderTopLeftRadius: m.role === 'assistant' ? 4 : 16,
                    background: m.role === 'user' ? '#f4f4f4' : '#fff',
                    border: m.role === 'assistant' ? '1px solid #e5e5e5' : 'none',
                    color: '#1a1a1a', fontSize: 15, lineHeight: 1.5,
                    maxWidth: Object.keys(activeSess.msgs).length > 0 ? '75%' : '100%',
                    whiteSpace: 'pre-wrap'
                  }}>
                    {m.content}
                  </div>
                </div>
              ))}
              {loading && (
                 <div style={{ display: 'flex', gap: 16, marginBottom: 32 }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#7c3aed', color: '#fff', fontWeight: 600, fontSize: 14 }}>AI</div>
                  <div style={{ padding: '12px 16px' }}><span className="spinner" style={{ borderColor: '#dcdcdc', borderTopColor: '#7c3aed' }} /></div>
                </div>
              )}
              <div ref={endRef} />
            </div>
          )}
        </div>

        {/* Input Dock */}
        <div style={{ padding: '24px', background: 'linear-gradient(180deg, rgba(255,255,255,0) 0%, #fff 30%)', position: 'absolute', bottom: 0, left: 0, right: 0 }}>
          <div style={{ maxWidth: 768, margin: '0 auto', position: 'relative' }}>
            <textarea 
              className="inp" 
              placeholder="Ask anything (Shift + Enter for new line)..." 
              style={{ width: '100%', padding: '16px 20px', paddingRight: 60, borderRadius: 24, boxShadow: '0 4px 20px rgba(0,0,0,0.05)', border: '1px solid #e5e5e5', minHeight: 56, maxHeight: 200, resize: 'none', lineHeight: '1.5', fontFamily: 'inherit', boxSizing: 'border-box' }} 
              value={input} 
              onChange={e => {
                setInput(e.target.value);
                e.target.style.height = '56px';
                e.target.style.height = `${Math.min(e.target.scrollHeight, 200)}px`;
              }}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  if (e.shiftKey) {
                    // Allow normal newline behavior
                    return;
                  } else {
                    // Submit
                    e.preventDefault();
                    ask();
                  }
                }
              }}
              disabled={loading} 
              rows={1}
            />
            <button disabled={loading || !input.trim()} onClick={() => ask()} style={{ position: 'absolute', right: 8, bottom: 8, width: 40, height: 40, background: input.trim() ? '#1a1a1a' : '#f0f0f0', color: input.trim() ? '#fff' : '#a0a0a0', border: 'none', borderRadius: '50%', cursor: input.trim() ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s' }}>
              <svg fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" style={{ width: 14, height: 14 }}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m0-16l-4 4m4-4l4 4"/></svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
