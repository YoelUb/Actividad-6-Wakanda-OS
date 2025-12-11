import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import SecretClub from './SecretClub';
import PokemonClub from './PokemonClub';
import HogwartsClub from './HogwartsClub';
import './App.css';

const GATEWAY_URL = 'http://localhost:8000';

function ServiceCard({ title, endpoint, icon, theme = 'default' }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const abortControllerRef = useRef(null);

  const themeClasses = {
    default: 'service-card',
    traffic: 'service-card traffic-theme',
    energy: 'service-card energy-theme',
    water: 'service-card water-theme',
    waste: 'service-card waste-theme',
    security: 'service-card security-theme'
  };

  const fetchData = async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();

    setLoading(true);
    setError(null);

    try {
      const response = await axios.get(`${GATEWAY_URL}${endpoint}`, {
        signal: abortControllerRef.current.signal,
        timeout: 3000
      });
      setData(response.data);
      setLastUpdated(new Date());
    } catch (err) {
      if (!axios.isCancel(err)) {
        setError(err.response?.data?.message || err.message || 'Error de conexión');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => {
      clearInterval(interval);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [endpoint]);

  const formatTime = (date) => {
    return date?.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <div className={themeClasses[theme]}>
      <div className="card-header">
        <div className="card-icon">{icon}</div>
        <h3>{title}</h3>
        <div className="status-indicator">
          <div className={`status-dot ${loading ? 'loading' : error ? 'error' : 'success'}`} />
        </div>
      </div>

      <div className="card-body">
        {loading && !data && (
          <div className="loading-state">
            <div className="pulse-loader"></div>
            <span>Conectando con el sistema...</span>
          </div>
        )}

        {error && (
          <div className="error-state">
            <div className="error-icon">⚠️</div>
            <div className="error-message">{error}</div>
          </div>
        )}

        {data && (
          <div className="data-container">
            <div className="data-grid">
              <div className="data-row">
                <span className="data-label">Estado:</span>
                <span className="data-value vibranium">{data.status || data.club_status || 'Operativo'}</span>
              </div>

              {data.db_connection && (
                <div className="data-row">
                  <span className="data-label">Conexión DB:</span>
                  <span className={`db-status ${data.db_connection === 'active' ? 'active' : 'inactive'}`}>
                    {data.db_connection}
                  </span>
                </div>
              )}
            </div>

             <div className="data-raw">
               <pre>{JSON.stringify(data, null, 2)}</pre>
             </div>
          </div>
        )}
      </div>

      <div className="card-footer">
        <div className="update-info">
          {lastUpdated && (
            <span className="timestamp">
              Actualizado: {formatTime(lastUpdated)}
            </span>
          )}
        </div>
        <button
          className="vibranium-btn"
          onClick={fetchData}
          disabled={loading}
        >
          {loading ? 'Actualizando...' : 'Forzar Actualización'}
        </button>
      </div>
    </div>
  );
}

function App() {
  const [view, setView] = useState('dashboard');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [activeServices] = useState(6);

  const handleLogin = (e) => {
    e.preventDefault();

    if (password === '123456789') {
      setView('rickmorty');
      setError('');
    } else if (password === '987654321') {
      setView('pokemon');
      setError('');
    } else if (password === '123456') {
      setView('harrypotter'); r
      setError('');
    } else {
      setError('⛔ CLAVE INCORRECTA: Acceso denegado');
    }
    setPassword('');
  };


  if (view === 'rickmorty') {
    return <SecretClub onExit={() => setView('dashboard')} />;
  }

  if (view === 'pokemon') {
    return <PokemonClub onExit={() => setView('dashboard')} />;
  }

  if (view === 'harrypotter') {
    return <HogwartsClub onExit={() => setView('dashboard')} />;
  }

  return (
    <div className="wakanda-dashboard">
      <header className="dashboard-header">
        <div className="header-content">
          <div className="logo-container">
            <div className="wakanda-logo">✸</div>
            <h1>Wakanda Smart City OS</h1>
          </div>
          <div className="header-subtitle">
            Sistema Operativo Urbano - Panel de Control en Tiempo Real
          </div>
        </div>

        <div className="header-stats">
          <div className="stat-card">
            <div className="stat-value">{activeServices}</div>
            <div className="stat-label">Sistemas Activos</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">24/7</div>
            <div className="stat-label">Monitoreo</div>
          </div>
          <div className="stat-card">
            <div className="stat-value vibranium">100%</div>
            <div className="stat-label">Eficiencia</div>
          </div>
        </div>
      </header>

      <main className="dashboard-main">
        {view === 'dashboard' && (
          <div className="services-grid">
            <ServiceCard title="Gestión de Tráfico" endpoint="/traffic/status" icon="🚦" theme="traffic" />
            <ServiceCard title="Red Energética" endpoint="/energy/grid" icon="⚡" theme="energy" />
            <ServiceCard title="Suministro de Agua" endpoint="/water/pressure" icon="💧" theme="water" />
            <ServiceCard title="Gestión de Residuos" endpoint="/waste/status" icon="🗑️" theme="waste" />
            <ServiceCard title="Seguridad y Drones" endpoint="/security/alerts" icon="🛡️" theme="security" />

            <div className="secret-club-card">
              <div className="secret-header">
                <div className="secret-icon">🕵️‍♂️</div>
                <h2>Club Secreto</h2>
                <div className="secret-badge">Nivel 5</div>
              </div>

              <div className="login-form">
                <p className="login-description">Acceso restringido a miembros autorizados</p>
                <button
                  className="vibranium-btn"
                  onClick={() => setView('login')}
                >
                  🔓 Acceder
                </button>
              </div>
            </div>
          </div>
        )}

        {view === 'login' && (
          <div className="login-container">
            <div className="login-box">
              <h2>🔒 Top Secret Clearance</h2>
              <p>Introduce código de acceso</p>
              <form onSubmit={handleLogin}>
                <input
                  type="password"
                  autoFocus
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="password-input"
                  placeholder="Contraseña"
                />
                <button type="submit" className="vibranium-btn">
                  AUTENTICAR
                </button>
                <button
                  type="button"
                  className="vibranium-btn secondary"
                  onClick={() => setView('dashboard')}
                >
                  Cancelar
                </button>
              </form>
              {error && <div className="error-message">{error}</div>}
            </div>
          </div>
        )}

        <div className="dashboard-footer">
          <div className="system-status">
            <div className="system-status-label">Estado del Sistema:</div>
            <div className="system-status-value operational">Operacional</div>
          </div>
          <div className="vibranium-pulse">
            <div className="pulse-dot"></div>
            <span>Vibranium Active</span>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;