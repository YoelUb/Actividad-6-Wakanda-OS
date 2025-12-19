import { useState, useEffect } from 'react';
import axios from 'axios';
import './AdminPanel.css';

const GATEWAY_URL = 'http://localhost:30006';

export default function AdminPanel({ onExit }) {
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [pulseEffect, setPulseEffect] = useState(true);
  const [restarting, setRestarting] = useState({});

  const services = [
    { key: 'traffic', url: '/traffic/status', name: 'TRÁFICO AÉREO', icon: '🛸', theme: 'traffic', deployName: 'ms-trafico' },
    { key: 'energy', url: '/energy/grid', name: 'RED VIBRANIUM', icon: '⚡', theme: 'energy', deployName: 'ms-energia' },
    { key: 'water', url: '/water/pressure', name: 'HIDROELÉCTRICA', icon: '💧', theme: 'water', deployName: 'ms-agua' },
    { key: 'waste', url: '/waste/status', name: 'GESTIÓN DE RESIDUOS', icon: '♻️', theme: 'waste', deployName: 'ms-residuos' },
    { key: 'security', url: '/security/alerts', name: 'DEFENSA FRONTERIZA', icon: '🛡️', theme: 'security', deployName: 'ms-seguridad' }
  ];

  useEffect(() => {
    fetchAllStats();
    const interval = setInterval(fetchAllStats, 3000);
    const pulseInterval = setInterval(() => setPulseEffect(!pulseEffect), 2000);
    return () => {
      clearInterval(interval);
      clearInterval(pulseInterval);
    };
  }, [pulseEffect]);

  const fetchAllStats = async () => {
    const promises = services.map(s =>
      axios.get(`${GATEWAY_URL}${s.url}`)
        .then(res => ({ key: s.key, data: res.data }))
        .catch(() => ({ key: s.key, error: true }))
    );
    const results = await Promise.all(promises);
    const newStats = {};
    results.forEach(r => {
      newStats[r.key] = r.data || { status: 'OFFLINE', lastUpdate: new Date().toLocaleTimeString() };
    });
    setStats(newStats);
    setLoading(false);
  };

  const handleRestart = async (deployName, serviceTitle) => {
    if (restarting[deployName]) return;
    const confirmed = window.confirm(`⚠ ALERTA OMEGA\n¿Confirmar reinicio de ${serviceTitle}?`);
    if (!confirmed) return;

    setRestarting(prev => ({ ...prev, [deployName]: true }));
    try {
      const res = await axios.post(`${GATEWAY_URL}/admin/restart/${deployName}`, {});
      if (res.data.error) {
        alert(`❌ ERROR DE CLÚSTER: ${res.data.error}`);
      } else {
        alert(`✅ PROTOCOLO ACTIVADO: ${res.data.status}`);
      }
    } catch (error) {
      alert("❌ ERROR: El Gateway no responde o no tiene permisos de Kubernetes.");
    } finally {
      setTimeout(() => {
        setRestarting(prev => ({ ...prev, [deployName]: false }));
        fetchAllStats();
      }, 5000);
    }
  };

  const handleLogout = () => {
    // CORRECCIÓN: Usar el mismo nombre que en App.jsx
    localStorage.removeItem('wakanda_token');
    localStorage.clear(); // Limpia todo por seguridad
    onExit();
    window.location.reload(); // Fuerza el reset del estado de la App
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
        <div className="header-right">
          <div className={`system-pulse ${pulseEffect ? 'pulse-active' : ''}`}>
            <div className="pulse-dot"></div>
            <span>SISTEMA ACTIVO</span>
          </div>
          <button className="cyber-btn-exit" onClick={handleLogout}>
            <span className="btn-text">CERRAR SESIÓN</span>
          </button>
        </div>
      </header>

      <main className="dashboard-main">
        {loading ? (
          <div className="cyber-loader"><p className="loader-text">SINCRONIZANDO VIBRANIUM...</p></div>
        ) : (
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
                      <div className="error-display"><span className="error-icon">⚠</span><p>SISTEMA CAÍDO</p></div>
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
                    <span className="update-time">{data.lastUpdate || ''}</span>
                    <button className="cyber-restart-btn" onClick={() => handleRestart(s.deployName, s.name)} disabled={isRestarting}>
                      {isRestarting ? '⏳...' : '💣 REINICIAR'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}