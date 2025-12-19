import { useState, useEffect } from 'react';
import axios from 'axios';
import './AdminPanel.css';

const GATEWAY_URL = 'http://localhost:30006';

export default function AdminPanel({ onExit }) {
  const [activeTab, setActiveTab] = useState('services');
  const [stats, setStats] = useState({});
  const [k8sData, setK8sData] = useState({ pods: [], nodes: [] });
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [restarting, setRestarting] = useState({});

  const services = [
    { key: 'traffic', url: '/traffic/status', name: 'TRÁFICO AÉREO', icon: '🛸', theme: 'traffic', deployName: 'ms-trafico' },
    { key: 'energy', url: '/energy/grid', name: 'RED VIBRANIUM', icon: '⚡', theme: 'energy', deployName: 'ms-energia' },
    { key: 'water', url: '/water/pressure', name: 'HIDROELÉCTRICA', icon: '💧', theme: 'water', deployName: 'ms-agua' },
    { key: 'waste', url: '/waste/status', name: 'GESTIÓN RESIDUOS', icon: '♻️', theme: 'waste', deployName: 'ms-residuos' },
    { key: 'security', url: '/security/alerts', name: 'DEFENSA FRONTERIZA', icon: '🛡️', theme: 'security', deployName: 'ms-seguridad' }
  ];

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 3000);
    return () => clearInterval(interval);
  }, [activeTab]);

  const fetchData = async () => {
    try {
      const servicePromises = services.map(s =>
        axios.get(`${GATEWAY_URL}${s.url}`)
          .then(r => ({ key: s.key, data: r.data }))
          .catch(() => ({ key: s.key, error: true }))
      );

      const results = await Promise.all(servicePromises);
      const newStats = {};
      results.forEach(r => newStats[r.key] = r.data || { status: 'OFFLINE', lastUpdate: new Date().toLocaleTimeString() });
      setStats(newStats);

      if (activeTab === 'k8s') {
        const k8sRes = await axios.get(`${GATEWAY_URL}/admin/k8s/info`);
        setK8sData(k8sRes.data);
      } else if (activeTab === 'metrics') {
        const metricsRes = await axios.get(`${GATEWAY_URL}/admin/system/metrics`);
        setMetrics(metricsRes.data);
      }

      setLoading(false);
    } catch (e) {
      console.error("Error fetching data", e);
    }
  };

  const handleRestart = async (deployName) => {
    if (!confirm(`⚠ ALERTA OMEGA\n¿Confirmar reinicio de ${deployName}?`)) return;
    setRestarting(p => ({ ...p, [deployName]: true }));
    try {
      await axios.post(`${GATEWAY_URL}/admin/restart/${deployName}`, {});
      alert("✅ REINICIO INICIADO");
    } catch (e) {
      alert("❌ Error: Gateway sin permisos RBAC");
    } finally {
      setTimeout(() => setRestarting(p => ({ ...p, [deployName]: false })), 5000);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('wakanda_token');
    onExit();
    window.location.reload();
  };

  return (
    <div className="cyberpunk-dashboard">
      <div className="cyber-grid"></div>
      <div className="neon-glows">
        <div className="glow glow-1"></div>
        <div className="glow glow-2"></div>
        <div className="glow glow-3"></div>
      </div>

      <header className="cyber-header">
        <div className="header-left">
          <div className="logo-container">
            <span className="cyber-icon">⟁</span>
            <h1 className="cyber-title">
              <span className="cyber-text">WAKANDA</span>
              <span className="neon-text">DEFENSE SYSTEM</span>
            </h1>
          </div>
          <div className="cyber-subtitle">
            <span className="cyber-badge">PANEL ADMIN</span>
            <span className="access-level">NIVEL 5</span>
          </div>
        </div>

        <div className="cyber-tabs">
          <button className={`tab-btn ${activeTab === 'services' ? 'active' : ''}`} onClick={() => setActiveTab('services')}>
            📡 SERVICIOS
          </button>
          <button className={`tab-btn ${activeTab === 'k8s' ? 'active' : ''}`} onClick={() => setActiveTab('k8s')}>
            🛳️ KUBERNETES
          </button>
          <button className={`tab-btn ${activeTab === 'metrics' ? 'active' : ''}`} onClick={() => setActiveTab('metrics')}>
            📊 RENDIMIENTO
          </button>
        </div>

        <div className="header-right">
          <button className="cyber-btn-exit" onClick={handleLogout}>
            <span className="btn-text">CERRAR SESIÓN</span>
          </button>
        </div>
      </header>

      <main className="dashboard-main">
        {loading ? (
          <div className="cyber-loader">
            <p className="loader-text">CARGANDO SISTEMA...</p>
          </div>
        ) : (
          <>
            {activeTab === 'services' && (
              <div className="services-grid">
                {services.map(s => {
                  const data = stats[s.key];
                  const isError = !data || data.status === 'OFFLINE' || data.error;
                  const isRestarting = restarting[s.deployName];

                  return (
                    <div key={s.key} className={`service-card ${s.theme}-theme`}>
                      <div className="card-header">
                        <div className="card-icon">{s.icon}</div>
                        <h3>{s.name}</h3>
                        <div className={`status-indicator ${isError ? 'status-error' : isRestarting ? 'status-warning' : 'status-ok'}`}>
                          <div className="status-light"></div>
                          <span>{isError ? 'OFFLINE' : isRestarting ? 'REBOOTING' : 'ONLINE'}</span>
                        </div>
                      </div>
                      <div className="card-body">
                        {isError ? (
                          <div className="error-display">
                            <span className="error-icon">⚠</span>
                            <p>SISTEMA CAÍDO</p>
                          </div>
                        ) : (
                          <div className="data-display">
                            <div className="data-grid">
                              {Object.entries(data).map(([key, value]) => (
                                <div key={key} className="data-row">
                                  <span className="data-label">{key.toUpperCase()}</span>
                                  <span className="data-value">{String(value)}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="card-footer">
                        <span className="update-time">{data?.lastUpdate || ''}</span>
                        <button
                          className="cyber-restart-btn"
                          onClick={() => handleRestart(s.deployName)}
                          disabled={isRestarting}
                        >
                          {isRestarting ? '⏳ REINICIANDO...' : '💣 REINICIAR'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {activeTab === 'k8s' && (
              <div className="k8s-panel">
                <div className="panel-section">
                  <h3 className="section-title">INFRAESTRUCTURA DE NODOS</h3>
                  <div className="nodes-grid">
                    {k8sData.nodes?.map((n, i) => (
                      <div key={i} className="node-card">
                        <span>🖥️ {n.name}</span>
                        <div className="node-specs">CPU: {n.cpu} | MEM: {n.memory}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="panel-section">
                  <h3 className="section-title">ESTADO DE PODS (VIBRANIUM CLUSTER)</h3>
                  <table className="cyber-table">
                    <thead>
                      <tr>
                        <th>POD NAME</th>
                        <th>STATUS</th>
                        <th>RESTARTS</th>
                        <th>AGE</th>
                        <th>IP</th>
                      </tr>
                    </thead>
                    <tbody>
                      {k8sData.pods?.map((pod, i) => (
                        <tr key={i} className={pod.status === 'Running' ? '' : 'row-error'}>
                          <td>{pod.name}</td>
                          <td>
                            <span className={`status-pill ${pod.status}`}>
                              {pod.status}
                            </span>
                          </td>
                          <td>{pod.restarts > 0 ? `⚠️ ${pod.restarts}` : '0'}</td>
                          <td>{pod.age}</td>
                          <td>{pod.ip}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'metrics' && metrics && (
              <div className="metrics-dashboard">
                <div className="metric-card big">
                  <h4>LATENCIA GLOBAL</h4>
                  <div className="metric-value">{metrics.latency_ms} ms</div>
                  <div className="metric-bar">
                    <div style={{width: `${Math.min(metrics.latency_ms, 100)}%`}}></div>
                  </div>
                </div>
                <div className="metric-card big">
                  <h4>PETICIONES / SEG</h4>
                  <div className="metric-value neon-blue">{metrics.requests_per_sec}</div>
                  <div className="metric-bar blue">
                    <div style={{width: `${Math.min(metrics.requests_per_sec / 30, 100)}%`}}></div>
                  </div>
                </div>

                <div className="metric-row">
                  <div className="metric-card small">
                    <h4>TASA DE ERROR</h4>
                    <span className={metrics.error_rate_percent > 1 ? "text-danger" : "text-success"}>
                      {metrics.error_rate_percent}%
                    </span>
                  </div>
                  <div className="metric-card small">
                    <h4>USO CPU</h4>
                    <span>{metrics.cpu_usage_percent}%</span>
                  </div>
                  <div className="metric-card small">
                    <h4>USO MEMORIA</h4>
                    <span>{metrics.memory_usage_percent.toFixed(2)} GB</span>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}