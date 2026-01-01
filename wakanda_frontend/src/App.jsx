import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import SecretClub from './SecretClub';
import PokemonClub from './PokemonClub';
import HogwartsClub from './HogwartsClub';
import Login from './Login';
import Register from './Register';
import UserProfile from './UserProfile';
import AdminPanel from './AdminPanel';
import './App.css';

const GATEWAY_URL = 'http://localhost:30007';
const USERS_API = 'http://localhost:30007';

function ServiceCard({ title, endpoint, icon, theme = 'default' }) {
    const [data, setData] = useState(null);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
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

    const fetchData = async (isManualRefresh = false) => {
        if (abortControllerRef.current) abortControllerRef.current.abort();
        abortControllerRef.current = new AbortController();

        if (isManualRefresh) {
            setRefreshing(true);
        } else if (!data) {
            setLoading(true);
        }

        setError(null);
        try {
            const timestamp = Date.now();
            const response = await axios.get(`${GATEWAY_URL}${endpoint}`, {
                params: { _: timestamp },
                headers: {
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    'Pragma': 'no-cache',
                    'Expires': '0'
                },
                signal: abortControllerRef.current.signal,
                timeout: 3000
            });
            setData(response.data);
            setLastUpdated(new Date());
        } catch (err) {
            if (!axios.isCancel(err)) setError(err.response?.data?.message || err.message || 'Error de conexión');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(() => fetchData(false), 3000);
        return () => {
            clearInterval(interval);
            if (abortControllerRef.current) abortControllerRef.current.abort();
        };
    }, [endpoint]);

    const formatTime = (date) => date?.toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });

    const formatLabel = (key) => {
        return key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ');
    };

    const formatValue = (value) => {
        if (Array.isArray(value)) return value.join(', ');
        if (typeof value === 'boolean') return value ? 'Sí' : 'No';
        return String(value);
    };

    return (
        <div className={themeClasses[theme]}>
            <div className="card-header">
                <div className="card-icon">{icon}</div>
                <h3>{title}</h3>
                <div className="status-indicator">
                    <div className={`status-dot ${loading && !data ? 'loading' : error ? 'error' : 'success'}`} />
                </div>
            </div>
            <div className="card-body">
                {loading && !data && <div className="loading-state"><span>Conectando sistemas...</span></div>}
                {error && <div className="error-state">{error}</div>}

                {data && (
                    <div className="data-container">
                        {data.status && (
                            <div className="data-row main-status" style={{borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '10px', marginBottom: '10px'}}>
                                <span className="data-label" style={{color: 'var(--neon-blue)'}}>ESTADO ACTUAL</span>
                                <span className="data-value vibranium" style={{fontSize: '1.1rem'}}>{data.status}</span>
                            </div>
                        )}

                        <div className="data-grid">
                            {Object.entries(data).map(([key, value]) => {
                                if (key === 'status' || key === 'db_connection') return null;
                                return (
                                    <div key={key} className="data-row">
                                        <span className="data-label">{formatLabel(key)}</span>
                                        <span className="data-value">{formatValue(value)}</span>
                                    </div>
                                );
                            })}

                            {data.db_connection && (
                                <div className="data-row" style={{marginTop: '10px', paddingTop: '10px', borderTop: '1px dashed rgba(255,255,255,0.1)'}}>
                                    <span className="data-label">Base de Datos</span>
                                    <span className={`db-status ${data.db_connection === 'OK' ? 'active' : 'inactive'}`}>
                                        {data.db_connection}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
            <div className="card-footer">
                <div className="update-info">
                    {lastUpdated && <span className="timestamp">Actualizado: {formatTime(lastUpdated)}</span>}
                </div>
                <button
                    className="vibranium-btn"
                    onClick={() => fetchData(true)}
                    disabled={loading || refreshing}
                    style={{minWidth: '110px', display: 'flex', justifyContent: 'center', gap: '8px'}}
                >
                    {(loading || refreshing) && <span className="spin-icon">↻</span>}
                    {refreshing ? 'Cargando' : 'Actualizar'}
                </button>
            </div>
        </div>
    );
}

function App() {
    const [view, setView] = useState('login');
    const [token, setToken] = useState(sessionStorage.getItem('wakanda_token'));
    const [activeServices] = useState(6);
    const [secretCode, setSecretCode] = useState('');
    const [currentUser, setCurrentUser] = useState(null);

    const handleLogout = () => {
        sessionStorage.removeItem('wakanda_token');
        setToken(null);
        setView('login');
        setCurrentUser(null);
    };

    useEffect(() => {
        if (token) {
            setView('dashboard');
        } else {
            setView('login');
        }
    }, [token]);

    useEffect(() => {
        if (token && view === 'dashboard') {
            axios.get(`${USERS_API}/me`, {
                headers: { Authorization: `Bearer ${token}` }
            })
                .then(res => {
                    setCurrentUser(res.data);
                })
                .catch(() => {
                    handleLogout();
                });
        }
    }, [token, view]);

    const handleLoginSuccess = () => {
        const accessToken = sessionStorage.getItem('wakanda_token');
        setToken(accessToken);
        setView('dashboard');
    };

    const handleSecretAccess = async (password) => {
        try {
            const res = await axios.post(
                `${USERS_API}/clubs/verify`,
                { password: password },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            if (res.data.status === 'ok') {
                setView(res.data.view);
                setSecretCode('');
            }
        } catch (err) {
            alert(err.response?.data?.detail || '⛔ ACCESO DENEGADO: Contraseña incorrecta');
        }
    };

    if (!token && view === 'register') {
        return <Register switchToLogin={() => setView('login')} />;
    }

    if (!token) {
        return (
            <Login
                onLogin={handleLoginSuccess}
                onNavigateToRegister={() => setView('register')}
            />
        );
    }

    if (view === 'rickmorty') return <SecretClub onExit={() => setView('dashboard')} />;
    if (view === 'pokemon') return <PokemonClub onExit={() => setView('dashboard')} />;
    if (view === 'hogwarts') return <HogwartsClub onExit={() => setView('dashboard')} />;

    if (view === 'profile') return <UserProfile token={token} onLogout={handleLogout} onBackToHome={() => setView('dashboard')} />;

    if (view === 'admin') {
        if (currentUser?.role !== 'ADMIN') {
             if (currentUser && currentUser.role !== 'ADMIN') {
                 setView('dashboard');
                 return null;
             }
        }
        return <AdminPanel onExit={() => setView('dashboard')} />;
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
                        Sistema Operativo Urbano - Panel de Control
                    </div>
                </div>

                <div className="header-stats">
                    <div className="stat-card">
                        <div className="stat-value">{activeServices}</div>
                        <div className="stat-label">Sistemas</div>
                    </div>

                    {currentUser && currentUser.role === 'ADMIN' && (
                        <button
                            className="vibranium-btn"
                            style={{
                                backgroundColor: '#ff4757',
                                border: '1px solid white',
                                marginRight: '10px',
                                padding: '5px 15px'
                            }}
                            onClick={() => setView('admin')}
                        >
                            🛡️ ADMIN
                        </button>
                    )}

                    <button className="vibranium-btn secondary" onClick={() => setView('profile')}
                        style={{ width: 'auto', display: 'flex', alignItems: 'center', gap: '10px', padding: '5px 15px' }}>
                        {currentUser && currentUser.profile_pic_url ? (
                            <img
                                src={currentUser.profile_pic_url}
                                alt="Profile"
                                style={{
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: '50%',
                                    objectFit: 'cover',
                                    border: '2px solid var(--neon-blue)'
                                }}
                                onError={(e) => {
                                    e.target.onerror = null;
                                    e.target.src = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iNTAiIGN5PSI1MCIgcj0iNTAiIGZpbGw9IiMyMDIzMjkiLz48cGF0aCBkPSJNNjUgNDVBNTUgNTUgMCAxIDEgMzUgNDVBNTUgNTUgMCAxIDEgNjUgNDVaIiBmaWxsPSIjN2FmZmMxIi8+PHBhdGggZD0iTTUwIDI1QzQ1IDI1IDQ1IDM1IDUwIDM1QzU1IDM1IDU1IDI1IDUwIDI1WiIgZmlsbD0iI2ZmZmZmZiIvPjxjaXJjbGUgY3g9IjQwIiBjeT0iMjUiIHI9IjIiIGZpbGw9IiNmZmZmZmYiLz48Y2lyY2xlIGN4PSI2MCIgY3k9IjI1IiByPSIyIiBmaWxsPSIjZmZmZmZmIi8+PHBhdGggZD0iTTQ1IDQ1TDUwIDU1TDU1IDQ1IiBzdHJva2U9IiNmZmZmZmYiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIi8+PC9zdmc+";
                                }}
                            />
                        ) : (
                            <span style={{ fontSize: '1.2rem' }}>👤</span>
                        )}
                        <span>MI PERFIL</span>
                    </button>
                </div>
            </header>

            <main className="dashboard-main">
                <div className="services-grid">
                    <ServiceCard title="Gestión de Tráfico" endpoint="/traffic/status" icon="🚦" theme="traffic" />
                    <ServiceCard title="Red Energética" endpoint="/energy/grid" icon="⚡" theme="energy" />
                    <ServiceCard title="Suministro de Agua" endpoint="/water/pressure" icon="💧" theme="water" />
                    <ServiceCard title="Gestión de Residuos" endpoint="/waste/status" icon="🗑️" theme="waste" />
                    <ServiceCard title="Seguridad y Drones" endpoint="/security/alerts" icon="🛡️" theme="security" />

                    <div className="secret-club-card">
                        <div className="secret-header">
                            <div className="secret-icon">🕵️‍♂️</div>
                            <h2>Archivos Secretos</h2>
                        </div>
                        <div className="login-form">
                            <input
                                type="password"
                                placeholder="Código de Acceso"
                                className="password-input"
                                style={{ fontSize: '1rem', padding: '10px' }}
                                value={secretCode}
                                onChange={(e) => setSecretCode(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleSecretAccess(secretCode);
                                }}
                            />
                            <button
                                className="vibranium-btn"
                                style={{ marginTop: '10px' }}
                                onClick={() => handleSecretAccess(secretCode)}
                            >
                                ACCEDER
                            </button>
                        </div>
                    </div>
                </div>

                <div className="dashboard-footer">
                    <div className="system-status">
                        <div className="system-status-label">Usuario Conectado:</div>
                        <div className="system-status-value operational">Autenticado vía JWT</div>
                    </div>
                    <div className="vibranium-pulse">
                        <div className="pulse-dot"></div>
                        <span>Secure Connection</span>
                    </div>
                </div>
            </main>
        </div>
    );
}

export default App;