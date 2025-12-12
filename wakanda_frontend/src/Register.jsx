import { useState } from 'react';
import axios from 'axios';
import './App.css';

const USERS_API = "http://localhost:8006";

export default function Register({ switchToLogin }) {
  const [formData, setFormData] = useState({ email: '', password: '', fullName: '' });
  const [secret, setSecret] = useState(null);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    const data = new FormData();
    data.append('email', formData.email);
    data.append('password', formData.password);
    data.append('full_name', formData.fullName);

    try {
      const res = await axios.post(`${USERS_API}/register`, data);
      setSecret(res.data['2fa_secret']);
    } catch (err) {
      setError(err.response?.data?.detail || "Error en el registro");
    }
  };

  if (secret) {
    return (
      <div className="login-container">
        <div className="login-box">
          <h2>✅ REGISTRO COMPLETADO</h2>
          <p>Tu clave secreta de recuperación (Guárdala bien):</p>
          <div className="data-value vibranium" style={{fontSize: '1.5rem', margin: '20px 0'}}>
            {secret}
          </div>
          <p style={{fontSize: '0.8rem', color: '#aaa'}}>
            Si usas Google Authenticator, introduce esta clave manualmente para configurar tu 2FA.
          </p>
          <button className="vibranium-btn" onClick={switchToLogin}>
            IR AL LOGIN
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="login-container">
      <div className="login-box">
        <h2>📝 NUEVO CIUDADANO</h2>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Nombre Completo"
            className="password-input"
            value={formData.fullName}
            onChange={e => setFormData({...formData, fullName: e.target.value})}
            required
          />
          <input
            type="email"
            placeholder="Correo Electrónico"
            className="password-input"
            value={formData.email}
            onChange={e => setFormData({...formData, email: e.target.value})}
            required
          />
          <input
            type="password"
            placeholder="Contraseña"
            className="password-input"
            value={formData.password}
            onChange={e => setFormData({...formData, password: e.target.value})}
            required
          />
          <button type="submit" className="vibranium-btn">REGISTRARSE</button>
        </form>
        {error && <div className="error-message">{error}</div>}
        <button className="vibranium-btn secondary" onClick={switchToLogin}>
          Volver
        </button>
      </div>
    </div>
  );
}