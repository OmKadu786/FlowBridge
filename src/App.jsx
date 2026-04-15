import React, { useState, useRef, useEffect } from 'react';
import { Upload, CheckCircle2, AlertCircle, FileSpreadsheet, PlayCircle, Loader2, Sparkles, Send, Database, Search, Wand2, MessageCircle, ArrowRight, TrendingUp, Users, TriangleAlert } from 'lucide-react';
import { MOCK_ANALYZE_RESPONSE, MOCK_SYNC_RESPONSE, MOCK_CLEAN_RESPONSE, MOCK_ASK_RESPONSE } from './mockData';
import './index.css';

const Card = ({ title, subtitle, icon: Icon, children, color = "blue", style, className = "" }) => (
  <div className={`card ${className}`} style={style}>
    <div className="card-header">
      <div className={`card-icon ${color}`}>
        <Icon size={20} aria-hidden="true" />
      </div>
      <div>
        <div className="card-title">{title}</div>
        <div className="card-sub">{subtitle}</div>
      </div>
    </div>
    <div className="card-body">
      {children}
    </div>
  </div>
);

const SettingsModal = ({ isOpen, onClose, config, onSave }) => {
  const [localConfig, setLocalConfig] = useState(() => ({
    analyzeUrl: config.analyzeUrl,
    syncUrl: config.syncUrl,
    adminEmail: config.adminEmail || ''
  }));

  if (!isOpen) return null;

  return (
    <div className="modal-overlay flex-center">
      <div className="modal-content card" style={{ maxWidth: 500, width: '90%', animation: 'popIn 0.3s ease-out' }}>
        <div className="card-header flex-between">
          <div className="flex-center gap-3">
            <div className="card-icon blue"><Database size={20} aria-hidden="true" /></div>
            <div className="card-title">Backend Configuration</div>
          </div>
          <button className="btn-icon" onClick={onClose} aria-label="Close settings"><AlertCircle size={20} style={{ transform: 'rotate(45deg)' }} aria-hidden="true" /></button>
        </div>
        <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: 'var(--text-secondary)' }}>Business Owner / Admin Email</label>
            <input 
              type="email" 
              className="input-field" 
              placeholder="owner@company.com"
              value={localConfig.adminEmail} 
              onChange={(e) => setLocalConfig({ ...localConfig, adminEmail: e.target.value })}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: 'var(--text-secondary)' }}>Analyze Webhook URL</label>
            <input 
              type="text" 
              className="input-field" 
              value={localConfig.analyzeUrl}
              onChange={(e) => setLocalConfig({ ...localConfig, analyzeUrl: e.target.value })}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: 'var(--text-secondary)' }}>Sync Webhook URL</label>
            <input 
              type="text" 
              className="input-field" 
              value={localConfig.syncUrl}
              onChange={(e) => setLocalConfig({ ...localConfig, syncUrl: e.target.value })}
            />
          </div>
          <div className="flex-center gap-3" style={{ marginTop: 8 }}>
            <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => onSave(localConfig)}>Save Configuration</button>
            <button className="btn" style={{ flex: 1, background: 'var(--bg-surface)', border: '1px solid var(--border-glass)' }} onClick={onClose}>Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );
};

const PreviewTable = ({ data, maxRows = 5 }) => {
  if (!data || data.length === 0) return <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No data to show.</p>;
  const keys = Object.keys(data[0]);
  const rows = data.slice(0, maxRows);
  return (
    <div className="preview-table-wrap">
      <table className="preview-table">
        <thead>
          <tr>{keys.map(k => <th key={k}>{k}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>{keys.map(k => <td key={k}>{String(row[k] ?? '')}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

function App() {
  const [file, setFile] = useState(null);
  const [step, setStep] = useState(1); // 1: Upload, 2: Cleaning, 3: CleanResults, 4: Analyzing, 5: AuditReport, 6: Syncing, 7: Done
  const [sessionId, setSessionId] = useState(null);
  const [analysisData, setAnalysisData] = useState(null);
  const [syncData, setSyncData] = useState(null);
  const [error, setError] = useState(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [cleanData, setCleanData] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef(null);
  
  const [history, setHistory] = useState(() => {
    const saved = localStorage.getItem('flowbridge_history');
    return saved ? JSON.parse(saved) : [];
  });

  const [config, setConfig] = useState(() => {
    const saved = localStorage.getItem('flowbridge_config');
    return saved ? JSON.parse(saved) : { 
      analyzeUrl: import.meta.env?.VITE_ANALYZE_WEBHOOK || '/api/analyze', 
      syncUrl: import.meta.env?.VITE_SYNC_WEBHOOK || '/api/sync',
      adminEmail: ''
    };
  });

  const saveConfig = (newConfig) => {
    setConfig(newConfig);
    localStorage.setItem('flowbridge_config', JSON.stringify(newConfig));
    setIsSettingsOpen(false);
  };

  const addHistory = (item) => {
    const newHistory = [item, ...history].slice(0, 5);
    setHistory(newHistory);
    localStorage.setItem('flowbridge_history', JSON.stringify(newHistory));
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleClean = async () => {
    if (!file) return;
    setStep(2);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/clean', { method: 'POST', body: formData });
      if (res.ok) {
        const data = await res.json();
        setCleanData(data);
        if (data.session_id) setSessionId(data.session_id);
        setStep(3);
      } else { throw new Error(`Status: ${res.status}`); }
    } catch (err) {
      console.error(err);
      setError(`Notice: Using demo mode (Connectivity: ${err.message})`);
      setCleanData(MOCK_CLEAN_RESPONSE);
      setStep(3);
    }
  };

  const handleAnalyze = async () => {
    if (!file) return;
    setStep(4);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(config.analyzeUrl, { method: 'POST', body: formData });
      if (res.ok) {
        const data = await res.json();
        setAnalysisData(data);
        setStep(5);
      } else { throw new Error(`Status: ${res.status}`); }
    } catch (err) {
      console.error(err);
      setError(`Notice: Using demo mode (Connectivity: ${err.message})`);
      setAnalysisData(MOCK_ANALYZE_RESPONSE);
      setStep(5);
    }
  };

  const handleSync = async () => {
    setStep(6);
    try {
      const payload = {
        detected_entity: analysisData?.detected_entity || 'Dataset',
        recommended_record: analysisData?.recommended_record || {},
        admin_email: config.adminEmail || '',
        unpaid_records: analysisData?.unpaid_records || []
      };
      const res = await fetch(config.syncUrl, { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload) 
      });
      if (res.ok) {
        const data = await res.json();
        setSyncData(data);
        addHistory({
          id: Date.now(),
          entity: analysisData?.detected_entity || 'Batch Sync',
          action: `Emailed ${data.emails_sent || 0} customers`,
          time: new Date().toLocaleTimeString(),
          status: 'Success'
        });
        setStep(7);
      } else { throw new Error('Sync failed'); }
    } catch (err) {
      setSyncData(MOCK_SYNC_RESPONSE);
      setStep(7);
      setError(`Finalizing Sync (Demo Mode)`);
    }
  };

  const handleAsk = async (question) => {
    if (!question.trim()) return;
    setChatMessages(prev => [...prev, { role: 'user', text: question }]);
    setChatInput('');
    setChatLoading(true);
    try {
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, session_id: sessionId || "demo" })
      });
      if (res.ok) {
        const data = await res.json();
        setChatMessages(prev => [...prev, { role: 'assistant', text: data.answer, rows: data.rows }]);
      } else { throw new Error('Ask failed'); }
    } catch (err) {
      setChatMessages(prev => [...prev, { role: 'assistant', text: MOCK_ASK_RESPONSE.answer, rows: MOCK_ASK_RESPONSE.rows }]);
    }
    setChatLoading(false);
  };

  const handleReset = () => {
    setFile(null); setAnalysisData(null); setSyncData(null); setCleanData(null);
    setError(null); setStep(1); setChatMessages([]); setChatInput(''); setSessionId(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <>
      <header className="header">
        <div className="header-inner flex-between">
          <a href="#" className="logo">
            <div className="logo-icon flex-center"><Database size={20} /></div>
            <div className="logo-text">Flow<span>Bridge</span></div>
          </a>
          <button className="btn-icon-text" onClick={() => setIsSettingsOpen(true)}>
            <Database size={16} /> <span>Settings</span>
          </button>
        </div>
      </header>

      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} config={config} onSave={saveConfig} />

      <section className="hero">
        <div className="hero-eyebrow"><Sparkles size={14} /> AI-Powered Automation</div>
        <h1>Transform complex data<br />into <span className="gradient-text">intelligent workflows</span> seamlessly</h1>
        <p>Upload a CSV or Excel file, let AI analyze it, then trigger real-world business automation.</p>
      </section>

      <main className="main-container">
        {error && (
          <div className="error-banner">
            <AlertCircle size={20} aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        <div className="dashboard-grid">
          <div className="main-content">

            {/* STEP 1: Upload */}
            {step === 1 && (
              <Card title="Step 1 — Ingest Business Data" subtitle="Select a file to begin real-time AI audit" icon={FileSpreadsheet} color="blue">
                <div className="upload-zone" onClick={() => document.getElementById('f').click()}>
                  <input id="f" type="file" accept=".csv,.xls,.xlsx" onChange={(e) => setFile(e.target.files[0])} style={{ display: 'none' }} />
                  <Upload size={32} className="upload-icon" />
                  <h3>Drop your file here or click to browse</h3>
                  <p>Supports CSV, XLS, XLSX — up to 50 MB</p>
                </div>
                {file && <div className="file-selected"><CheckCircle2 size={16} /> <span>{file.name} ready for processing</span></div>}
                <div className="flex-center gap-3" style={{ marginTop: 24 }}>
                  <button className="btn btn-success" style={{ flex: 1 }} disabled={!file} onClick={handleClean}>
                    <Wand2 size={18} /> Fix My Data
                  </button>
                  <button className="btn btn-primary" style={{ flex: 1 }} disabled={!file} onClick={handleAnalyze}>
                    <PlayCircle size={18} /> Analyze with AI
                  </button>
                </div>
              </Card>
            )}

            {/* STEP 2: Cleaning Loader */}
            {step === 2 && (
              <Card title="Cleaning Your Data" subtitle="AI is generating cleaning rules..." icon={Wand2} color="blue">
                <div className="flex-center" style={{ flexDirection: 'column', gap: 16, padding: '40px 0' }}>
                  <div className="loader-container">
                    <Loader2 size={48} className="spinner" style={{ color: 'var(--accent-3)' }} />
                    <div className="loader-sparkles"><Wand2 size={24} /></div>
                  </div>
                  <h3 style={{ fontSize: 18 }}>Fixing your data...</h3>
                  <p style={{ color: 'var(--text-muted)' }}>Renaming columns, removing duplicates, filling gaps.</p>
                </div>
              </Card>
            )}

            {/* STEP 3: Clean Results */}
            {step === 3 && cleanData && (
              <Card title="Data Health Report" subtitle="Your data has been cleaned and standardized" icon={CheckCircle2} color="green">
                <div className="clean-score-display">
                  <div>
                    <div className={`health-score ${cleanData.health_score >= 80 ? 'good' : cleanData.health_score >= 50 ? 'okay' : 'bad'}`}>
                      {cleanData.health_score}
                    </div>
                    <div className="health-score-label">/ 100 Health Score</div>
                  </div>
                </div>

                <div className="clean-stats">
                  <div className="clean-stat">
                    <div className="clean-stat-val">{cleanData.total_rows}</div>
                    <div className="clean-stat-label">Clean Rows</div>
                  </div>
                  <div className="clean-stat">
                    <div className="clean-stat-val" style={{ color: 'var(--amber-500)' }}>{cleanData.duplicates_removed}</div>
                    <div className="clean-stat-label">Dupes Removed</div>
                  </div>
                  <div className="clean-stat">
                    <div className="clean-stat-val" style={{ color: 'var(--accent-2)' }}>{cleanData.nulls_filled}</div>
                    <div className="clean-stat-label">Nulls Filled</div>
                  </div>
                </div>

                <div className="preview-section">
                  <div className="preview-label">Before</div>
                  <PreviewTable data={cleanData.preview_before} />
                </div>
                <div className="preview-section">
                  <div className="preview-label">After</div>
                  <PreviewTable data={cleanData.preview_after} />
                </div>

                <button className="btn btn-primary" style={{ width: '100%', marginTop: 16 }} onClick={handleAnalyze}>
                  <ArrowRight size={18} /> Continue to Analysis
                </button>
              </Card>
            )}

            {/* STEP 4: Analyzing Loader */}
            {step === 4 && (
              <Card title="Step 2 — AI Analysis" subtitle="Scanning your data with AI auditor..." icon={Sparkles} color="purple">
                <div className="flex-center" style={{ flexDirection: 'column', gap: 16, padding: '40px 0' }}>
                  <div className="loader-container">
                    <Loader2 size={48} className="spinner" style={{ color: 'var(--accent-2)' }} />
                    <div className="loader-sparkles"><Sparkles size={24} /></div>
                  </div>
                  <h3 style={{ fontSize: 18 }}>AI Auditor is scanning file...</h3>
                  <p style={{ color: 'var(--text-muted)' }}>Extracting entities and identifying conflicts.</p>
                </div>
              </Card>
            )}

            {/* STEP 5+6: AI AUDITOR'S REPORT */}
            {step >= 5 && step <= 6 && analysisData && (
              <Card title="AI Strategic Auditor" subtitle="Deep data audit complete" icon={Sparkles} color="purple">
                
                {/* AI AUDITOR REPORT - CHAT STYLE */}
                <div style={{ 
                  padding: '30px', 
                  background: 'rgba(255, 255, 255, 0.03)', 
                  borderRadius: 20, 
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  boxShadow: 'inset 0 0 40px rgba(0,0,0,0.3)',
                  animation: 'fadeIn 0.6s ease-out'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, color: 'var(--accent-2)', fontSize: 13, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.2em' }}>
                    <Sparkles size={18} /> Auditor's Summary
                  </div>
                  <div style={{ 
                    fontSize: 16, 
                    color: 'var(--text-primary)', 
                    lineHeight: 1.8, 
                    whiteSpace: 'pre-wrap',
                    fontFamily: "'Inter', sans-serif"
                  }}>
                    {analysisData.ai_summary || "Audit successfully completed. No critical errors found."}
                  </div>
                  
                  {analysisData.duplicates?.length > 0 && (
                    <div className="recommended-box" style={{ marginTop: 24, padding: '16px 20px' }}>
                      <CheckCircle2 size={16} /> 
                      <div style={{ fontWeight: 600 }}>
                        Smart Reconciliation: Kept unified master record for <strong>{analysisData.recommended_record?.customer_name || 'Production'}</strong>.
                      </div>
                    </div>
                  )}

                  {analysisData.high_risk_clients && analysisData.high_risk_clients.length > 0 && (
                    <div style={{ marginTop: 20, background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 12, padding: 16 }}>
                      <div style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, marginBottom: 12 }}>
                        <TriangleAlert size={18} /> SMART THREAT DETECTION
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {analysisData.high_risk_clients.map((client, idx) => (
                          <div key={idx} style={{ background: 'rgba(0,0,0,0.2)', padding: 12, borderRadius: 8 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                              <span style={{ fontWeight: 600, color: 'white' }}>{client.client}</span>
                              <span style={{ fontSize: 11, background: '#ef4444', color: 'white', padding: '2px 8px', borderRadius: 99, fontWeight: 800, textTransform: 'uppercase' }}>{client.risk_level || 'High'} RISK</span>
                            </div>
                            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{client.reason}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {step === 5 && (
                  <button className="btn btn-success" style={{ width: '100%', marginTop: 32, padding: '16px' }} onClick={handleSync}>
                    <Send size={20} /> Send Invoices for Unpaid Orders
                    {analysisData.unpaid_records?.length > 0 && (
                      <span style={{ marginLeft: 8, background: 'rgba(255,255,255,0.2)', padding: '2px 10px', borderRadius: 99, fontSize: 12, fontWeight: 800 }}>
                        {analysisData.unpaid_records.length}
                      </span>
                    )}
                  </button>
                )}
                
                {step === 6 && (
                  <div className="flex-center" style={{ padding: '40px 0', flexDirection: 'column', gap: 16 }}>
                    <Loader2 size={32} className="spinner" style={{ color: 'var(--accent-3)' }} />
                    <p style={{ fontWeight: 800, letterSpacing: '0.05em' }}>EXECUTING WORKFLOWS...</p>
                  </div>
                )}
              </Card>
            )}

            {/* STEP 7: Email Results */}
            {step === 7 && syncData && (
              <Card title="Invoices Sent!" subtitle={`${syncData.emails_sent || 0} emails delivered`} icon={CheckCircle2} color="green">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {syncData.email_results?.map((r, i) => (
                    <div key={i} className="status-item-enhanced">
                      <div className={`status-icon ${r.status === 'sent' || r.status === 'simulated' ? 'success' : 'blue'}`}>
                        {r.status === 'sent' || r.status === 'simulated' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>{r.name}</div>
                        <div style={{ fontSize: 12, opacity: 0.6 }}>{r.email} — {r.items_count} item(s)</div>
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 99, textTransform: 'uppercase',
                        background: r.status === 'sent' || r.status === 'simulated' ? 'var(--green-900)' : 'var(--amber-900)',
                        color: r.status === 'sent' || r.status === 'simulated' ? 'var(--green-400)' : 'var(--amber-500)',
                        border: `1px solid ${r.status === 'sent' || r.status === 'simulated' ? 'var(--green-border)' : 'var(--amber-border)'}`
                      }}>{r.status}</span>
                    </div>
                  ))}
                  {(!syncData.email_results || syncData.email_results.length === 0) && (
                    <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)' }}>No unpaid records found to email.</div>
                  )}
                </div>
                <button className="btn btn-primary" style={{ width: '100%', marginTop: 24 }} onClick={handleReset}>
                  Process New Batch
                </button>
              </Card>
            )}
          </div>

          <aside className="sidebar">
            <Card title="Activity log" subtitle="Live automation feed" icon={Database}>
              <div className="history-list">
                {history.map(item => (
                  <div key={item.id} className="history-item">
                    <div className="history-dot"></div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{item.entity}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{item.action} • {item.time}</div>
                    </div>
                    <div className="status-badge success">Synced</div>
                  </div>
                ))}
                {history.length === 0 && <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, padding: '20px 0' }}>No local activity log</p>}
              </div>
            </Card>
          </aside>
        </div>

        {/* CHAT PANEL — Ask Your Data */}
        <div className="chat-panel" style={{ opacity: cleanData ? 1 : 0.5, pointerEvents: cleanData ? 'auto' : 'none' }}>
          <Card 
            title="Ask Your Data" 
            subtitle={cleanData ? "Chat with your dataset using natural language" : "Run 'Fix My Data' first to unlock natural language querying"} 
            icon={MessageCircle} 
            color={cleanData ? "blue" : "gray"}
          >
              <div className="quick-actions">
                <button className="quick-action-btn" onClick={() => handleAsk('What is the total revenue?')}>
                  <TrendingUp size={14} /> Total Revenue
                </button>
                <button className="quick-action-btn" onClick={() => handleAsk('Show me all unpaid invoices')}>
                  <AlertCircle size={14} /> Unpaid Invoices
                </button>
                <button className="quick-action-btn" onClick={() => handleAsk('Who are the top 5 customers by amount?')}>
                  <Users size={14} /> Top Customers
                </button>
              </div>

              <div className="chat-messages">
                {chatMessages.length === 0 && (
                  <div className="chat-empty">
                    <MessageCircle size={24} style={{ marginBottom: 8, opacity: 0.4 }} />
                    <div>Ask a question about your data, or use a quick action above.</div>
                  </div>
                )}
                {chatMessages.map((msg, i) => (
                  <div key={i} className={`chat-bubble ${msg.role}`}>
                    <div className="chat-answer">{msg.text}</div>
                    {msg.rows && msg.rows.length > 0 && (
                      <div className="chat-table-wrap">
                        <table className="chat-table">
                          <thead>
                            <tr>{Object.keys(msg.rows[0]).map(k => <th key={k}>{k}</th>)}</tr>
                          </thead>
                          <tbody>
                            {msg.rows.map((row, j) => (
                              <tr key={j}>{Object.keys(row).map(k => <td key={k}>{String(row[k] ?? '')}</td>)}</tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                ))}
                {chatLoading && (
                  <div className="chat-bubble assistant">
                    <Loader2 size={16} className="spinner" style={{ color: 'var(--accent-2)' }} />
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              <div className="chat-input-row">
                <input
                  type="text"
                  className="input-field"
                  placeholder="Ask anything about your data..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAsk(chatInput)}
                />
                <button className="btn btn-primary" onClick={() => handleAsk(chatInput)} disabled={chatLoading || !chatInput.trim()}>
                  <Send size={16} />
                </button>
              </div>
            </Card>
          </div>
        {/* Removed conditional bracket */}
      </main>

      <footer>
        <div style={{ marginBottom: 8 }}>Flow<span>Bridge</span> — AI Automation Gateway</div>
        <span>Consolidating enterprise data into seamless workflows · v1.0.5</span>
      </footer>
    </>
  );
}

export default App;
