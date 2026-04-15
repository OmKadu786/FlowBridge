import React, { useState, useRef, useEffect } from 'react';
import { Upload, CheckCircle2, AlertCircle, FileSpreadsheet, PlayCircle, Loader2, Sparkles, Send, Database, Search, Wand2, MessageCircle, ArrowRight, TrendingUp, Users, BarChart2, Copy, Droplets, Clock } from 'lucide-react';
import { MOCK_ANALYZE_RESPONSE, MOCK_SYNC_RESPONSE, MOCK_CLEAN_RESPONSE, MOCK_ASK_RESPONSE } from './mockData';
import { PieChart, Pie, Cell, Tooltip as ChartTooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';
import './index.css';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#3b82f6', '#ec4899', '#8b5cf6', '#14b8a6', '#e8bdda'];

// Custom pie label: show percentage only to avoid label overlaps
const renderPieLabel = ({ percent }) => `${(percent * 100).toFixed(0)}%`;

/* ——————————————————————————————————————
   HEALTH RING — SVG animated donut
   —————————————————————————————————————— */
const HealthRing = ({ score }) => {
  const radius = 65;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.min(Math.max(score, 0), 100);
  const offset = circumference - (pct / 100) * circumference;
  const tier = pct >= 80 ? 'good' : pct >= 50 ? 'okay' : 'bad';

  return (
    <div className="health-ring-container">
      <div className="health-ring-wrapper">
        <svg className="health-ring-svg" viewBox="0 0 160 160">
          <circle className="health-ring-bg" cx="80" cy="80" r={radius} />
          <circle
            className={`health-ring-fill ${tier}`}
            cx="80" cy="80" r={radius}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
          />
        </svg>
        <div className="health-ring-label">
          <div className={`health-ring-value ${tier}`}>{score}</div>
          <div className="health-ring-sub">/ 100</div>
        </div>
      </div>
      <div style={{ marginTop: 8, fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        Health Score
      </div>
    </div>
  );
};

/* ——————————————————————————————————————
   STAT CARD
   —————————————————————————————————————— */
const StatCard = ({ value, label, icon: Icon, color = 'blue' }) => (
  <div className="stat-card">
    <div className={`stat-card-icon ${color}`}>
      <Icon size={20} />
    </div>
    <div>
      <div className="stat-card-value">{value}</div>
      <div className="stat-card-label">{label}</div>
    </div>
  </div>
);

/* ——————————————————————————————————————
   CARD
   —————————————————————————————————————— */
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

/* ——————————————————————————————————————
   SETTINGS MODAL
   —————————————————————————————————————— */
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

/* ——————————————————————————————————————
   PREVIEW TABLE — sticky headers, zebra stripes, scroll container
   —————————————————————————————————————— */
const PreviewTable = ({ data, maxRows = 5 }) => {
  if (!data || data.length === 0) return <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No data to show.</p>;
  const keys = Object.keys(data[0]);
  const rows = data.slice(0, maxRows);
  return (
    <div className="preview-table-wrap">
      <div className="preview-table-scroll">
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
    </div>
  );
};

/* ——————————————————————————————————————
   MAIN APP
   —————————————————————————————————————— */
function App() {
  const [file, setFile] = useState(null);
  const [step, setStep] = useState(1);
  const [analysisData, setAnalysisData] = useState(null);
  const [syncData, setSyncData] = useState(null);
  const [error, setError] = useState(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [cleanData, setCleanData] = useState(null);
  const [chartData, setChartData] = useState(null);
  const [chartsLoading, setChartsLoading] = useState(false);
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
      setChartsLoading(true);
      const res = await fetch('/api/clean', { method: 'POST', body: formData });
      if (res.ok) {
        const data = await res.json();
        setCleanData(data);
        setChartData(data.charts || []);
        setChartsLoading(false);
        setStep(3);
      } else { throw new Error(`Status: ${res.status}`); }
    } catch (err) {
      console.error(err);
      setError(`Notice: Using demo mode (Connectivity: ${err.message})`);
      setCleanData(MOCK_CLEAN_RESPONSE);
      setChartData(MOCK_CLEAN_RESPONSE.charts || []);
      setChartsLoading(false);
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
        body: JSON.stringify({ question })
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
    setChartData(null); setChartsLoading(false);
    setError(null); setStep(1); setChatMessages([]); setChatInput('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <>
      <header className="header">
        <div className="header-inner flex-between">
          <a href="/" className="logo">
            <div className="logo-icon flex-center"><Database size={18} /></div>
            <div className="logo-text">Flow<span>Bridge</span></div>
          </a>
          <button className="btn-icon-text" onClick={() => setIsSettingsOpen(true)}>
            <Database size={14} /> <span>Settings</span>
          </button>
        </div>
      </header>

      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} config={config} onSave={saveConfig} />

      <section className="hero">
        <div className="hero-eyebrow"><Sparkles size={14} /> AI-Powered Automation</div>
        <h1>Transform complex data<br />into <span className="gradient-text">intelligent workflows</span></h1>
        <p>Upload a CSV or Excel file, let AI analyze it, then trigger real-world business automation.</p>
      </section>

      <main className="main-container">
        {error && (
          <div className="error-banner">
            <AlertCircle size={18} aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        <div className="dashboard-grid">
          {/* ═══════════ STEP 1: UPLOAD ═══════════ */}
          {step === 1 && (
            <Card title="Ingest Business Data" subtitle="Select a file to begin real-time AI audit" icon={FileSpreadsheet} color="blue">
              <div className="upload-zone" onClick={() => document.getElementById('f').click()}>
                <input id="f" type="file" accept=".csv,.xls,.xlsx" onChange={(e) => setFile(e.target.files[0])} style={{ display: 'none' }} />
                <Upload size={28} className="upload-icon" />
                <h3>Drop your file here or click to browse</h3>
                <p>Supports CSV, XLS, XLSX — up to 50 MB</p>
              </div>
              {file && <div className="file-selected"><CheckCircle2 size={16} /> <span>{file.name} ready for processing</span></div>}
              <div className="flex-center gap-3" style={{ marginTop: 20 }}>
                <button className="btn btn-success" style={{ flex: 1 }} disabled={!file} onClick={handleClean}>
                  <Wand2 size={16} /> Fix My Data
                </button>
                <button className="btn btn-primary" style={{ flex: 1 }} disabled={!file} onClick={handleAnalyze}>
                  <PlayCircle size={16} /> Analyze with AI
                </button>
              </div>
            </Card>
          )}

          {/* ═══════════ STEP 2: CLEANING LOADER ═══════════ */}
          {step === 2 && (
            <Card title="Cleaning Your Data" subtitle="AI is generating cleaning rules..." icon={Wand2} color="blue">
              <div className="flex-center" style={{ flexDirection: 'column', gap: 16, padding: '40px 0' }}>
                <div className="loader-container">
                  <Loader2 size={44} className="spinner" style={{ color: 'var(--accent-1)' }} />
                  <div className="loader-sparkles"><Wand2 size={22} /></div>
                </div>
                <h3 style={{ fontSize: 17, fontWeight: 700 }}>Fixing your data...</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Renaming columns, removing duplicates, filling gaps.</p>
              </div>
            </Card>
          )}

          {/* ═══════════ STEP 3: DATA HEALTH REPORT ═══════════ */}
          {step === 3 && cleanData && (
            <Card title="Data Health Report" subtitle="Your data has been cleaned and standardized" icon={CheckCircle2} color="green">
              
              {/* Health Ring */}
              <HealthRing score={cleanData.health_score} />

              {/* Stat Cards */}
              <div className="stats-grid">
                <StatCard value={cleanData.total_rows} label="Clean Rows" icon={CheckCircle2} color="green" />
                <StatCard value={cleanData.duplicates_removed} label="Duplicates Removed" icon={Copy} color="amber" />
                <StatCard value={cleanData.nulls_filled} label="Nulls Filled" icon={Droplets} color="blue" />
              </div>

              {/* Before / After Tables — up and down */}
              <div className="tables-grid">
                <div className="preview-section">
                  <div className="preview-label before">Before</div>
                  <PreviewTable data={cleanData.preview_before} />
                </div>
                <div className="preview-section">
                  <div className="preview-label after">After</div>
                  <PreviewTable data={cleanData.preview_after} />
                </div>
              </div>

              {/* Charts Section */}
              <div className="charts-section">
                <div className="section-heading">
                  <BarChart2 size={20} /> Automated Data Visualizations
                </div>

                {chartsLoading && (
                  <div className="flex-center" style={{ padding: '40px 0', flexDirection: 'column', gap: 12 }}>
                    <Loader2 size={24} className="spinner" style={{ color: 'var(--accent-1)' }} />
                    <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Generating visualizations...</p>
                  </div>
                )}

                {!chartsLoading && chartData && chartData.length > 0 && (
                  <div className="charts-grid">
                    {chartData.map((chart, idx) => (
                      <div key={chart.id} className="chart-card" style={{ animation: `slideUp 0.4s ease-out ${idx * 0.1}s both` }}>
                        <div className="chart-card-title">{chart.title}</div>
                        <div className="chart-card-sub">{chart.type === 'pie' ? 'Distribution breakdown' : 'Top values comparison'}</div>
                        <div style={{ width: '100%', height: 280 }}>
                          <ResponsiveContainer>
                            {chart.type === 'pie' ? (
                              <PieChart>
                                <Pie data={chart.data} cx="50%" cy="50%" outerRadius={90} innerRadius={45} fill="#8884d8" dataKey={chart.dataKey} nameKey={chart.nameKey} label={renderPieLabel} labelLine={false} strokeWidth={2} stroke="#ffffff">
                                  {chart.data.map((entry, i) => (
                                    <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />
                                  ))}
                                </Pie>
                                <ChartTooltip contentStyle={{ backgroundColor: '#fff', borderColor: 'var(--border-glass)', color: 'var(--text-primary)', borderRadius: 10, fontSize: 13, boxShadow: 'var(--shadow-sm)' }} />
                                <Legend wrapperStyle={{ fontSize: 12 }} />
                              </PieChart>
                            ) : (
                              <BarChart data={chart.data} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-glass)" />
                                <XAxis dataKey={chart.nameKey} stroke="var(--text-muted)" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} tickLine={false} axisLine={false} />
                                <YAxis stroke="var(--text-muted)" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} tickLine={false} axisLine={false} />
                                <ChartTooltip contentStyle={{ backgroundColor: '#fff', borderColor: 'var(--border-glass)', color: 'var(--text-primary)', borderRadius: 10, fontSize: 13, boxShadow: 'var(--shadow-sm)' }} cursor={{ fill: 'rgba(59, 130, 246, 0.04)' }} />
                                <Bar dataKey={chart.dataKey} fill="var(--accent-1)" radius={[6, 6, 0, 0]}>
                                  {chart.data.map((entry, i) => (
                                    <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />
                                  ))}
                                </Bar>
                              </BarChart>
                            )}
                          </ResponsiveContainer>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {!chartsLoading && chartData && chartData.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)', fontSize: 13 }}>
                    No visualizations could be auto-generated for this dataset.
                  </div>
                )}
              </div>

              <button className="btn btn-primary" style={{ width: '100%', marginTop: 28 }} onClick={handleAnalyze}>
                <ArrowRight size={16} /> Continue to Analysis
              </button>
            </Card>
          )}

          {/* ═══════════ STEP 4: ANALYZING LOADER ═══════════ */}
          {step === 4 && (
            <Card title="AI Analysis" subtitle="Scanning your data with AI auditor..." icon={Sparkles} color="purple">
              <div className="flex-center" style={{ flexDirection: 'column', gap: 16, padding: '40px 0' }}>
                <div className="loader-container">
                  <Loader2 size={44} className="spinner" style={{ color: 'var(--accent-2)' }} />
                  <div className="loader-sparkles"><Sparkles size={22} /></div>
                </div>
                <h3 style={{ fontSize: 17, fontWeight: 700 }}>AI Auditor is scanning file...</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Extracting entities and identifying conflicts.</p>
              </div>
            </Card>
          )}

          {/* ═══════════ STEP 5+6: AI REPORT ═══════════ */}
          {step >= 5 && step <= 6 && analysisData && (
            <Card title="AI Strategic Auditor" subtitle="Deep data audit complete" icon={Sparkles} color="purple">
              <div style={{ 
                padding: '28px', 
                background: 'var(--bg-elevated)', 
                borderRadius: 16, 
                border: '1px solid var(--border-glass)',
                animation: 'slideUp 0.5s ease-out'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, color: 'var(--accent-2)', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em' }}>
                  <Sparkles size={16} /> Auditor's Summary
                </div>
                <div style={{ 
                  fontSize: 15, 
                  color: 'var(--text-primary)', 
                  lineHeight: 1.8, 
                  whiteSpace: 'pre-wrap',
                }}>
                  {analysisData.ai_summary || "Audit successfully completed. No critical errors found."}
                </div>
                
                {analysisData.duplicates?.length > 0 && (
                  <div className="recommended-box" style={{ marginTop: 20 }}>
                    <CheckCircle2 size={16} /> 
                    <div style={{ fontWeight: 600 }}>
                      Smart Reconciliation: Kept unified master record for <strong>{analysisData.recommended_record?.customer_name || 'Production'}</strong>.
                    </div>
                  </div>
                )}
              </div>

              {step === 5 && (
                <button className="btn btn-success" style={{ width: '100%', marginTop: 28, padding: '14px' }} onClick={handleSync}>
                  <Send size={18} /> Send Invoices for Unpaid Orders
                  {analysisData.unpaid_records?.length > 0 && (
                    <span style={{ marginLeft: 8, background: 'rgba(255,255,255,0.2)', padding: '2px 10px', borderRadius: 99, fontSize: 12, fontWeight: 800 }}>
                      {analysisData.unpaid_records.length}
                    </span>
                  )}
                </button>
              )}
              
              {step === 6 && (
                <div className="flex-center" style={{ padding: '36px 0', flexDirection: 'column', gap: 14 }}>
                  <Loader2 size={28} className="spinner" style={{ color: 'var(--accent-2)' }} />
                  <p style={{ fontWeight: 700, fontSize: 14, letterSpacing: '0.03em', color: 'var(--text-secondary)' }}>EXECUTING WORKFLOWS...</p>
                </div>
              )}
            </Card>
          )}

          {/* ═══════════ STEP 7: EMAIL RESULTS ═══════════ */}
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
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{r.email} — {r.items_count} item(s)</div>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 99, textTransform: 'uppercase',
                      background: r.status === 'sent' || r.status === 'simulated' ? 'var(--green-50)' : 'var(--amber-50)',
                      color: r.status === 'sent' || r.status === 'simulated' ? 'var(--green-500)' : 'var(--amber-500)',
                      border: `1px solid ${r.status === 'sent' || r.status === 'simulated' ? 'var(--green-border)' : 'var(--amber-border)'}`
                    }}>{r.status}</span>
                  </div>
                ))}
                {(!syncData.email_results || syncData.email_results.length === 0) && (
                  <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)' }}>No unpaid records found to email.</div>
                )}
              </div>
              <button className="btn btn-primary" style={{ width: '100%', marginTop: 20 }} onClick={handleReset}>
                Process New Batch
              </button>
            </Card>
          )}

          {/* ═══════════ ACTIVITY STRIP (horizontal) ═══════════ */}
          <div className="activity-strip">
            <Card title="Activity Log" subtitle="Live automation feed" icon={Clock} color="blue">
              <div className="activity-list">
                {history.length === 0 && <div className="activity-empty">No activity yet — process a file to see results here</div>}
                {history.map(item => (
                  <div key={item.id} className="activity-item">
                    <div className="activity-dot"></div>
                    <div>
                      <div className="activity-item-entity">{item.entity}</div>
                      <div className="activity-item-detail">{item.action} • {item.time}</div>
                    </div>
                    <div className="status-badge success">Synced</div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>

        {/* ═══════════ CHAT PANEL ═══════════ */}
        <div className="chat-panel" style={{ opacity: cleanData ? 1 : 0.5, pointerEvents: cleanData ? 'auto' : 'none' }}>
          <Card 
            title="Ask Your Data" 
            subtitle={cleanData ? "Chat with your dataset using natural language" : "Run 'Fix My Data' first to unlock natural language querying"} 
            icon={MessageCircle} 
            color={cleanData ? "blue" : "blue"}
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
                    <MessageCircle size={24} style={{ marginBottom: 8, opacity: 0.3 }} />
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
                    <Loader2 size={16} className="spinner" style={{ color: 'var(--accent-1)' }} />
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
      </main>

      <footer>
        <div style={{ marginBottom: 6 }}>Flow<span>Bridge</span> — AI Automation Gateway</div>
        <span>Consolidating enterprise data into seamless workflows · v1.0.5</span>
      </footer>
    </>
  );
}

export default App;
