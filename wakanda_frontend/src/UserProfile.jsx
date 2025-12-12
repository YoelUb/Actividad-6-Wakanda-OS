import { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

const USERS_API = "http://localhost:8006";

export default function UserProfile({ token, onLogout }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');

  const config = { headers: { Authorization: `Bearer ${token}` } };

  useEffect(() => {
    fetchUser();
  }, []);

  const fetchUser = async () => {
    try {
      const res = await axios.get(`${USERS_API}/me`, config);
      setUser(res.data);
    } catch {
      onLogout();
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);

    try {
      setLoading(true);
      await axios.post(`${USERS_API}/me/avatar`, formData, config);
      fetchUser();
    } catch (err) {
      setMsg("Error al subir imagen");
    } finally {
      setLoading(false);
    }
  };

  const handleChangeTeam = async (teamId) => {
    try {
      await axios.post(`${USERS_API}/me/team?team_id=${teamId}`, {}, config);
      setMsg("¡Te has unido al equipo!");
      fetchUser();
    } catch (err) {
      setMsg(err.response?.data?.detail || "No puedes cambiar de equipo aún");
    }
  };

  const toggle2FA = async (method) => {
    try {
      await axios.post(`${USERS_API}/me/2fa/enable?method=${method}`, {}, config);
      setMsg(`2FA cambiado a modo: ${method}`);
      fetchUser();
    } catch (err) {
      setMsg("Error al cambiar configuración 2FA");
    }
  };

  if (!user) return <div className="pulse-loader">Cargando perfil...</div>;

  return (
    <div className="service-card" style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div className="card-header">
        <div className="card-icon" style={{ overflow: 'hidden' }}>
          {user.profile_pic_url ? (
            <img src={user.profile_pic_url} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <span>👤</span>
          )}
        </div>
        <h3>PERFIL DE CIUDADANO</h3>
        <button onClick={onLogout} className="rm-btn-exit" style={{ fontSize: '0.8rem', padding: '5px 10px' }}>
          Cerrar Sesión
        </button>
      </div>

      <div className="card-body">
        <div className="data-container">
          <div className="data-row">
            <span className="data-label">Nombre:</span>
            <span className="data-value">{user.full_name}</span>
          </div>
          <div className="data-row">
            <span className="data-label">Email:</span>
            <span className="data-value">{user.email}</span>
          </div>
          <div className="data-row">
            <span className="data-label">Equipo Actual:</span>
            <span className="data-value vibranium">
              {user.team_id ? `Equipo #${user.team_id}` : 'Sin Asignar'}
            </span>
          </div>
          <div className="data-row">
            <span className="data-label">Seguridad 2FA:</span>
            <span className={`db-status ${user.is_2fa_enabled ? 'active' : 'inactive'}`}>
              {user.is_2fa_enabled ? `ACTIVO (${user.preferred_2fa_method})` : 'INACTIVO'}
            </span>
          </div>
        </div>

        {msg && <div className="error-message" style={{ borderColor: '#2ed573', color: '#2ed573' }}>{msg}</div>}

        <div style={{ marginTop: '20px', display: 'grid', gap: '10px' }}>
          <h4>📸 Actualizar Credencial (Foto)</h4>
          <input type="file" onChange={handleAvatarUpload} className="password-input" style={{ fontSize: '0.9rem' }} />

          <h4>🛡️ Configuración de Seguridad</h4>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="vibranium-btn secondary" onClick={() => toggle2FA('APP')}>Usar Google Auth</button>
            <button className="vibranium-btn secondary" onClick={() => toggle2FA('EMAIL')}>Usar Email OTP</button>
          </div>

          <h4>⚔️ Selección de Escuadrón</h4>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="vibranium-btn" onClick={() => handleChangeTeam(1)}>Unirse a Avengers</button>
            <button className="vibranium-btn" onClick={() => handleChangeTeam(2)}>Unirse a Guardianes</button>
          </div>
        </div>
      </div>
    </div>
  );
}