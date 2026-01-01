import { useState } from 'react';
import axios from 'axios';
import './Login.css';

const GATEWAY_URL = 'http://localhost:30007';

export default function Login({ onLogin, onNavigateToRegister }) {
  const [formData, setFormData] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [showRecover, setShowRecover] = useState(false);
  const [recoverData, setRecoverData] = useState({ secret_key: '', new_password: '' });
  const [recoverMsg, setRecoverMsg] = useState({ type: '', text: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const body = new FormData();
    body.append('username', formData.username);
    body.append('password', formData.password);

    try {
      const response = await axios.post(`${GATEWAY_URL}/login`, body);
      const { access_token, status } = response.data;

      if (status === 'VERIFICATION_REQUIRED') {
        setError('⚠️ Cuenta no verificada. Revisa tu correo.');
      } else {
        sessionStorage.setItem('wakanda_token', `Bearer ${access_token}`);
        onLogin();
      }
    } catch (err) {
      setError('❌ Credenciales inválidas o error en el sistema');
    } finally {
      setLoading(false);
    }
  };

  const handleRecover = async (e) => {
    e.preventDefault();
    setRecoverMsg({ type: '', text: '' });

    try {
      await axios.post(`${GATEWAY_URL}/recover`, recoverData);
      setRecoverMsg({ type: 'success', text: '¡Contraseña restablecida! Ahora puedes iniciar sesión.' });
      setTimeout(() => {
        setShowRecover(false);
        setRecoverMsg({ type: '', text: '' });
        setRecoverData({ secret_key: '', new_password: '' });
      }, 2500);
    } catch (err) {
      setRecoverMsg({ type: 'error', text: 'Error: Llave secreta incorrecta.' });
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <div className="secret-icon">🛡️</div>
        <h2>ACCESO RESTRINGIDO</h2>
        <p>Introduce tus credenciales de ciudadano</p>

        <form onSubmit={handleSubmit}>
          <input
            className="login-input"
            type="email"
            placeholder="Correo electrónico"
            value={formData.username}
            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
            required
          />

          <div className="password-wrapper">
            <input
              className="login-input"
              type={showPassword ? "text" : "password"}
              placeholder="Contraseña"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
            />
            <button
              type="button"
              className={`password-toggle ${showPassword ? 'active' : ''}`}
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? '👁️' : '🔒'}
            </button>
          </div>

          {error && <div className="error-message">{error}</div>}

          <button type="submit" className="vibranium-btn" disabled={loading}>
            {loading ? 'AUTENTICANDO...' : 'INICIAR SESIÓN'}
          </button>
        </form>

        <button className="vibranium-btn secondary" onClick={onNavigateToRegister}>
          SOLICITAR CIUDADANÍA
        </button>

        <button
          type="button"
          className="vibranium-btn secondary"
          style={{marginTop: '10px', fontSize: '0.8rem', border: 'none', color: 'var(--neon-purple)'}}
          onClick={() => setShowRecover(true)}
        >
          ¿Olvidaste la contraseña? Usar Llave Maestra
        </button>
      </div>

      {showRecover && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          background: 'rgba(0,0,0,0.9)', zIndex: 2000, display: 'flex',
          justifyContent: 'center', alignItems: 'center', padding: '20px'
        }}>
          <div className="login-box" style={{maxWidth: '400px', margin: '0', border: '2px solid var(--neon-purple)', transform: 'none'}}>
            <h2 style={{fontSize: '1.5rem', marginBottom: '15px'}}>Protocolo de Recuperación</h2>
            <p style={{marginBottom: '20px'}}>Introduce tu Llave Vibranium (Secret Key) para restablecer el acceso.</p>

            <form onSubmit={handleRecover}>
              <input
                className="login-input"
                type="text"
                placeholder="Pegar Secret Key aquí..."
                value={recoverData.secret_key}
                onChange={(e) => setRecoverData({...recoverData, secret_key: e.target.value})}
                required
              />
              <input
                className="login-input"
                type="password"
                placeholder="Nueva Contraseña"
                value={recoverData.new_password}
                onChange={(e) => setRecoverData({...recoverData, new_password: e.target.value})}
                required
              />

              {recoverMsg.text && (
                <div className={recoverMsg.type === 'error' ? 'error-message' : 'success-message'}>
                  {recoverMsg.text}
                </div>
              )}

              <button type="submit" className="vibranium-btn">RESTABLECER ACCESO</button>
              <button
                type="button"
                className="vibranium-btn secondary"
                onClick={() => setShowRecover(false)}
              >
                CANCELAR OPERACIÓN
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}