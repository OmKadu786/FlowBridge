import React, { useState, useRef, useEffect } from 'react';
import { Upload, ChevronRight, CheckCircle2, AlertCircle, FileSpreadsheet, PlayCircle, Loader2, Sparkles, Send, Database, Search } from 'lucide-react';
import { MOCK_ANALYZE_RESPONSE, MOCK_SYNC_RESPONSE } from './mockData';
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
  const [localConfig, setLocalConfig] = useState(config);

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
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: 'var(--text-secondary)' }}>n8n Analyze Webhook URL</label>
            <input 
              type="text" 
              className="input-field" 
              placeholder="https://your-n8n.com/webhook/analyze"
              value={localConfig.analyzeUrl}
              onChange={(e) => setLocalConfig({ ...localConfig, analyzeUrl: e.target.value })}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: 'var(--text-secondary)' }}>n8n Sync Webhook URL</label>
            <input 
              type="text" 
              className="input-field" 
              placeholder="https://your-n8n.com/webhook/sync"
              value={localConfig.syncUrl}
              onChange={(e) => setLocalConfig({ ...localConfig, syncUrl: e.target.value })}
            />
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Enter your n8n workflow URLs here. If URLs are empty, the app will use mock data for demonstrations.</p>
          <div className="flex-center gap-3" style={{ marginTop: 8 }}>
            <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => onSave(localConfig)}>Save Configuration</button>
            <button className="btn" style={{ flex: 1, background: 'var(--bg-surface)', color: 'var(--text-secondary)', border: '1px solid var(--border-glass)' }} onClick={onClose}>Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );
};

function App() {
  const [file, setFile] = useState(null);
  const [step, setStep] = useState(1); // 1: Upload, 2: Parsing, 3: Results, 4: Syncing, 5: Done
  const [analysisData, setAnalysisData] = useState(null);
  const [syncData, setSyncData] = useState(null);
  const [error, setError] = useState(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  const isMounted = useRef(true);

  useEffect(() => {
    return () => { isMounted.current = false; };
  }, []);

  const [history, setHistory] = useState(() => {
    const saved = localStorage.getItem('flowbridge_history');
    return saved ? JSON.parse(saved) : [];
  });
  const [config, setConfig] = useState(() => {
    const saved = localStorage.getItem('flowbridge_config');
    return saved ? JSON.parse(saved) : { 
      analyzeUrl: import.meta.env?.VITE_ANALYZE_WEBHOOK || '', 
      syncUrl: import.meta.env?.VITE_SYNC_WEBHOOK || '' 
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

  const handleFileChange = (e) => { e.target.files?.[0] && setFile(e.target.files[0]); };
  const preventDefaults = (e) => { e.preventDefault(); e.stopPropagation(); };
  const handleDragEnter = (e) => { preventDefaults(e); setIsDragActive(true); };
  const handleDragOver = (e) => { preventDefaults(e); setIsDragActive(true); };
  const handleDragLeave = (e) => { preventDefaults(e); setIsDragActive(false); };
  const handleDrop = (e) => {
    preventDefaults(e);
    setIsDragActive(false);
    if (e.dataTransfer.files?.length > 0) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleAnalyze = async () => {
    if (!file) return;
    setStep(2);
    setError(null);

    try {
      if (config.analyzeUrl) {
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch(config.analyzeUrl, { method: 'POST', body: formData });
        if (res.ok) {
          const data = await res.json();
          if (isMounted.current) setAnalysisData(data);
        } else {
          throw new Error('Analyze webhook failed');
        }
      } else {
        await new Promise(r => setTimeout(r, 2000));
        if (isMounted.current) setAnalysisData(MOCK_ANALYZE_RESPONSE);
      }
      if (isMounted.current) setStep(3);
    } catch (err) {
      console.error(err);
      if (isMounted.current) {
        setError('Analysis failed. Using mock data for demo.');
        setAnalysisData(MOCK_ANALYZE_RESPONSE);
        setStep(3);
      }
    }
  };

  const downloadSample = () => {
    const csvContent = "data:text/csv;charset=utf-8,cust_name,email_addr,inv_amt,ph_no,addr_line1,cntry\nAlice Johnson,alice@example.com,4200.00,555-0199,123 Main St,US\nBob Smith,bob@smith.com,150.00,555-0122,456 Oak Ave,CA\nAlice J.,alice@example.com,4200.00,555-0199,123 Main St,US";
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "sample_flowbridge_data.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSync = async () => {
    setStep(4);
    setError(null);
    try {
      if (config.syncUrl) {
        const res = await fetch(config.syncUrl, { 
          method: 'POST', 
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(analysisData)
        });
        if (res.ok) {
          const data = await res.json();
          if (!isMounted.current) return;
          setSyncData(data);
          addHistory({
            id: Date.now(),
            entity: analysisData.detected_entity,
            action: 'Synced to Xero',
            time: new Date().toLocaleTimeString(),
            status: 'Success'
          });
        } else {
          throw new Error('Sync webhook failed');
        }
      } else {
        await new Promise(r => setTimeout(r, 2000));
        if (!isMounted.current) return;
        setSyncData(MOCK_SYNC_RESPONSE);
        addHistory({
          id: Date.now(),
          entity: analysisData.detected_entity,
          action: 'Synced (Mock)',
          time: new Date().toLocaleTimeString(),
          status: 'Success'
        });
      }
      if (isMounted.current) setStep(5);
    } catch (err) {
      console.error(err);
      if (isMounted.current) {
        setError('Sync failed. Using mock data for demo.');
        setSyncData(MOCK_SYNC_RESPONSE);
        setStep(5);
      }
    }
  };

  const handleReset = () => {
    setFile(null);
    setAnalysisData(null);
    setSyncData(null);
    setError(null);
    setStep(1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <>
      <header className="header flex-center">
        <div className="header-inner flex-between" style={{ width: '100%' }}>
          <a href="#" className="logo">
            <div className="logo-icon flex-center"><Database size={20} /></div>
            <div className="logo-text">Flow<span>Bridge</span></div>
          </a>
          <div className="flex-center gap-4">
            <button className="btn-icon-text" onClick={() => setIsSettingsOpen(true)}>
              <Database size={16} /> <span>Settings</span>
            </button>
          </div>
        </div>
      </header>

      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
        config={config} 
        onSave={saveConfig} 
      />

      <section className="hero">
        <div className="hero-eyebrow"><Sparkles size={14} /> AI-Powered Automation</div>
        <h1>Transform complex data<br />into <span className="gradient-text">intelligent workflows</span> seamlessly</h1>
        <p>Upload a CSV or Excel file, let AI analyze it, then trigger real workflows — invoices, emails, and more.</p>
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
            {/* STEP 1: Upload & Process */}
            {step >= 1 && (
              <Card title="Step 1 — Upload Your Data" subtitle="Select a file to begin AI analysis" icon={FileSpreadsheet} color="blue">
                {step === 1 ? (
                  <>
                    <div 
                      className={`upload-zone ${isDragActive ? 'dragover' : ''}`}
                      onDragEnter={handleDragEnter} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
                      onClick={() => document.getElementById('file-upload').click()}
                      tabIndex={0}
                      role="button"
                      aria-label="Upload file by clicking or dragging"
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') document.getElementById('file-upload').click() }}
                    >
                      <input id="file-upload" type="file" accept=".csv,.xlsx,.xls" onChange={handleFileChange} style={{ display: 'none' }} />
                      <Upload size={32} className="upload-icon" aria-hidden="true" />
                      <h3>Drop your file here or click to browse</h3>
                      <p>Supports CSV, XLS, XLSX — up to 50 MB</p>
                      <div className="flex-center gap-2" style={{ marginTop: 14 }}>
                        <span className="file-chip">CSV</span> <span className="file-chip">XLSX</span>
                      </div>
                    </div>
                    {file && (
                      <div className="file-selected">
                        <CheckCircle2 size={16} /> <span>{file.name}</span>
                      </div>
                    )}
                    <div className="flex-center gap-3" style={{ marginTop: 24 }}>
                      <button 
                        className="btn btn-primary" 
                        style={{ flex: 1 }}
                        disabled={!file}
                        onClick={handleAnalyze}
                      >
                        <PlayCircle size={18} /> Analyze Data
                      </button>
                      <button 
                        className="btn" 
                        style={{ background: 'var(--bg-surface)', color: 'var(--text-secondary)', border: '1px solid var(--border-glass)' }}
                        onClick={downloadSample}
                      >
                        Sample CSV
                      </button>
                    </div>
                  </>
                ) : step === 2 ? (
                  <div className="flex-center" style={{ flexDirection: 'column', gap: 16, padding: '40px 0' }}>
                    <div className="loader-container">
                      <Loader2 size={48} className="spinner" style={{ color: 'var(--accent-2)' }} />
                      <div className="loader-sparkles"><Sparkles size={24} /></div>
                    </div>
                    <h3 style={{ fontSize: 18, color: 'var(--text-primary)' }}>Analyzing data with AI…</h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Detecting entities and resolving conflicts.</p>
                  </div>
                ) : (
                    <div className="file-selected" style={{ marginTop: 0 }}>
                      <CheckCircle2 size={16} /> <span>{file.name} analyzed</span>
                    </div>
                )}
              </Card>
            )}

            {/* STEP 2: AI Results */}
            {step >= 3 && analysisData && (
              <Card title="Step 2 — AI Analysis Results" subtitle="Entity detected, fields mapped, conflicts flagged" icon={Search} color="purple">
                <div style={{ padding: '4px 12px', background: 'rgba(99,102,241,0.12)', color: 'var(--accent-2)', display: 'inline-flex', borderRadius: 6, fontWeight: 700, fontSize: 13, marginBottom: 20 }}>
                  <Database size={14} style={{ marginRight: 6 }} /> Entity: {analysisData.detected_entity}
                </div>

                <div className="table-container">
                  <table className="mapping-table">
                    <thead>
                      <tr>
                        <th>Source Field</th>
                        <th>Mapped To</th>
                        <th style={{ textAlign: 'right' }}>Confidence</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analysisData.field_mappings.map(m => (
                        <tr key={m.source}>
                          <td>{m.source}</td>
                          <td style={{ fontWeight: 600 }}>{m.mapped_to}</td>
                          <td>
                            <div className="flex-center gap-2" style={{ justifyContent: 'flex-end' }}>
                              <div className="confidence-bar" style={{ maxWidth: 80 }}>
                                <div className="confidence-fill" style={{ width: `${m.confidence}%` }}></div>
                              </div>
                              <span style={{ fontSize: 12, fontWeight: 700, width: 32 }}>{m.confidence}%</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {analysisData.duplicates?.length > 0 && (
                  <div className="conflict-section">
                    <div className="conflict-banner">
                      <AlertCircle size={16} /> {analysisData.duplicates.length} SmartConflict™ Issues Found
                    </div>
                    <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {analysisData.duplicates.map(d => (
                        <div key={d.field} className="conflict-card">
                          <div className="conflict-label">Potential Duplicate: {d.field}</div>
                          <div className="conflict-value">"{d.value}" appears {d.occurrences}x</div>
                        </div>
                      ))}
                      <div className="recommended-box">
                        <CheckCircle2 size={14} /> <strong>AI Choice:</strong> Keeping most complete record: <strong>{analysisData.recommended_record.customer_name}</strong>
                      </div>
                    </div>
                  </div>
                )}

                {step === 3 ? (
                  <button className="btn btn-success" style={{ width: '100%', marginTop: 20 }} onClick={handleSync}>
                    <Send size={18} /> Sync & Generate Invoice
                  </button>
                ) : step === 4 ? (
                  <div className="flex-center" style={{ flexDirection: 'column', gap: 16, padding: '20px 0' }}>
                    <Loader2 size={32} className="spinner" style={{ color: 'var(--accent-3)' }} />
                    <p style={{ color: 'var(--text-primary)', fontSize: 14, fontWeight: 600 }}>Firing automation workflows...</p>
                  </div>
                ) : null}
              </Card>
            )}

            {/* STEP 3: Status */}
            {step === 5 && syncData && (
              <Card title="Automation Successful!" subtitle="Invoices generated and synced to Xero" icon={CheckCircle2} color="green">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="status-item-enhanced">
                <div className="status-icon success"><Database size={20} /></div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>Invoice created successfully</div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Ref: {syncData.invoice_number} · ID: {syncData.xero_contact_id}</div>
                </div>
              </div>
              <div className="status-item-enhanced">
                <div className="status-icon blue"><Send size={20} /></div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>Email sent to client</div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Sent to: {syncData.email_sent_to}</div>
                </div>
              </div>
              <div className="status-item-enhanced">
                <div className="status-icon purple"><FileSpreadsheet size={20} /></div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>Invoice saved locally</div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Path: {syncData.pdf_path || './invoices/'}</div>
                </div>
              </div>
            </div>
                <button className="btn reset-btn" onClick={handleReset}>
                   Run Another Task
                </button>
              </Card>
            )}
          </div>

          {/* SIDEBAR */}
          <aside className="sidebar">
            <Card title="Activity Log" subtitle="Recent automations" icon={Database} className="sidebar-card">
              <div className="history-list">
                {history.length === 0 ? (
                  <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                    No recent activity
                  </div>
                ) : (
                  history.map(item => (
                    <div key={item.id} className="history-item">
                      <div className="history-dot"></div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{item.entity}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{item.action} • {item.time}</div>
                      </div>
                      <div className="status-badge success">{item.status}</div>
                    </div>
                  ))
                )}
              </div>
            </Card>


          </aside>
        </div>
      </main>
      <footer>
        <span>FlowBridge</span> — AI + n8n automation bridge · v1.0.4-beta
      </footer>
    </>
  );
}

export default App;
