import {useState, useEffect, useRef} from 'react';
import axios from 'axios';
import SecretClub from './SecretClub';
import PokemonClub from './PokemonClub';
import HogwartsClub from './HogwartsClub';
import Login from './Login';
import Register from './Register';
import UserProfile from './UserProfile';
import './App.css';

const GATEWAY_URL = 'http://localhost:8000';

function ServiceCard({title, endpoint, icon, theme = 'default'}) {
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
        if (abortControllerRef.current) abortControllerRef.current.abort();
        abortControllerRef.current = new AbortController();
        setLoading(true);
        setError(null);
        try {
            const response = await axios.get(`${GATEWAY_URL}${endpoint}`, {
                signal: abortControllerRef.current.signal, timeout: 3000
            });
            setData(response.data);
            setLastUpdated(new Date());
        } catch (err) {
            if (!axios.isCancel(err)) setError(err.response?.data?.message || err.message || 'Error de conexión');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 5000);
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

    return (
        <div className={themeClasses[theme]}>
            <div className="card-header">
                <div className="card-icon">{icon}</div>
                <h3>{title}</h3>
                <div className="status-indicator">
                    <div className={`status-dot ${loading ? 'loading' : error ? 'error' : 'success'}`}/>
                </div>
            </div>
            <div className="card-body">
                {loading && !data && <div className="loading-state"><span>Conectando...</span></div>}
                {error && <div className="error-state">{error}</div>}
                {data && (
                    <div className="data-container">
                        <div className="data-grid">
                            <div className="data-row"><span className="data-label">Estado:</span><span
                                className="data-value vibranium">{data.status || 'Operativo'}</span></div>
                            {data.db_connection &&
                                <div className="data-row"><span className="data-label">DB:</span><span
                                    className="db-status active">{data.db_connection}</span></div>}
                        </div>
                        <div className="data-raw">
                            <pre>{JSON.stringify(data, null, 2)}</pre>
                        </div>
                    </div>
                )}
            </div>
            <div className="card-footer">
                <div className="update-info">{lastUpdated &&
                    <span className="timestamp">{formatTime(lastUpdated)}</span>}</div>
                <button className="vibranium-btn" onClick={fetchData} disabled={loading}>Actualizar</button>
            </div>
        </div>
    );
}

function App() {
    const [view, setView] = useState('login'); // 'login', 'register', 'dashboard', 'rickmorty', etc.
    const [token, setToken] = useState(localStorage.getItem('wakanda_token'));
    const [activeServices] = useState(6);

    // Verificar sesión al cargar
    useEffect(() => {
        if (token) {
            setView('dashboard');
        } else {
            setView('login');
        }
    }, [token]);

    const handleLoginSuccess = (accessToken) => {
        localStorage.setItem('wakanda_token', accessToken);
        setToken(accessToken);
        setView('dashboard');
    };

    const handleLogout = () => {
        localStorage.removeItem('wakanda_token');
        setToken(null);
        setView('login');
    };

    const handleSecretAccess = (password) => {
        if (password === '123456789') setView('rickmorty');
        else if (password === '987654321') setView('pokemon');
        else if (password === '123456') setView('harrypotter');
        alert('⛔ ACCESO DENEGADO: Código de autorización inválido');
    };

    if (!token && view === 'register') {
        return <Register switchToLogin={() => setView('login')}/>;
    }

    if (!token) {
        return <Login onLoginSuccess={handleLoginSuccess} switchToRegister={() => setView('register')}/>;
    }

    // Vistas protegidas
    if (view === 'rickmorty') return <SecretClub onExit={() => setView('dashboard')}/>;
    if (view === 'pokemon') return <PokemonClub onExit={() => setView('dashboard')}/>;
    if (view === 'harrypotter') return <HogwartsClub onExit={() => setView('dashboard')}/>;
    if (view === 'profile') return <UserProfile token={token} onLogout={handleLogout}/>;

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
                    <button className="vibranium-btn secondary" onClick={() => setView('profile')}
                            style={{width: 'auto'}}>
                        👤 MI PERFIL
                    </button>
                </div>
            </header>

            <main className="dashboard-main">
                <div className="services-grid">
                    <ServiceCard title="Gestión de Tráfico" endpoint="/traffic/status" icon="🚦" theme="traffic"/>
                    <ServiceCard title="Red Energética" endpoint="/energy/grid" icon="⚡" theme="energy"/>
                    <ServiceCard title="Suministro de Agua" endpoint="/water/pressure" icon="💧" theme="water"/>
                    <ServiceCard title="Gestión de Residuos" endpoint="/waste/status" icon="🗑️" theme="waste"/>
                    <ServiceCard title="Seguridad y Drones" endpoint="/security/alerts" icon="🛡️" theme="security"/>

                    {/* Tarjeta de Acceso Secreto (Easter Egg Legacy) */}
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
                                style={{fontSize: '1rem', padding: '10px'}}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleSecretAccess(e.target.value);
                                }}
                            />
                            <p style={{fontSize: '0.7rem', color: '#888'}}>Pulsa Enter para acceder</p>
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