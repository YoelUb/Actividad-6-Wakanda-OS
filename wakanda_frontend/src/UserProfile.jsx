import { useState, useEffect } from 'react';
import axios from 'axios';
import './UserProfile.css';

const USERS_API = "http://localhost:8006";

export default function UserProfile({ token, onLogout, onBackToHome }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(null);

  const config = {
    headers: {
      Authorization: `Bearer ${token}`
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  useEffect(() => {
    if (!user?.last_team_change) return;

    const interval = setInterval(() => {
      const lastChange = new Date(user.last_team_change);
      const nextAvailable = new Date(lastChange.getTime() + 86400000);
      const now = new Date();
      const diff = nextAvailable - now;

      if (diff <= 0) {
        setTimeLeft(null);
        clearInterval(interval);
      } else {
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [user]);

  const fetchUser = async () => {
    try {
      const res = await axios.get(`${USERS_API}/me`, config);
      setUser(res.data);
    } catch (error) {
      console.error("Error fetching user:", error);
      setMsg("Error al cargar el perfil. Intenta nuevamente.");
      if (error.response?.status === 401) {
        onLogout();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.match('image.*')) {
      setMsg("Solo se permiten archivos de imagen");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setMsg("La imagen no debe superar los 5MB");
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      setIsUploading(true);
      await axios.post(`${USERS_API}/me/avatar`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      setMsg("✅ Avatar actualizado correctamente");
      fetchUser();
    } catch (err) {
      setMsg(err.response?.data?.detail || "Error al subir la imagen");
    } finally {
      setIsUploading(false);
    }
  };

  const handleChangeTeam = async (teamId, teamName) => {
    try {
      await axios.post(`${USERS_API}/me/team?team_id=${teamId}`, {}, config);
      setMsg(`✅ ¡Te has unido al Club ${teamName}!`);
      fetchUser();
    } catch (err) {
      setMsg(err.response?.data?.detail || "No puedes cambiar de club todavía");
    }
  };

  const toggle2FA = async (method) => {
    try {
      await axios.post(`${USERS_API}/me/2fa/enable?method=${method}`, {}, config);
      setMsg(`✅ 2FA cambiado a modo: ${method === 'APP' ? 'Google Auth' : 'Email OTP'}`);
      fetchUser();
    } catch (err) {
      setMsg(err.response?.data?.detail || "Error al cambiar configuración 2FA");
    }
  };

  const getTeamName = (id) => {
    switch(id) {
      case 1: return "Rick & Morty";
      case 2: return "Pokémon League";
      case 3: return "Hogwarts School";
      default: return "Ninguno";
    }
  };

  if (loading) {
    return (
      <div className="profile-wrapper">
        <div className="portal-loader">🔮 Cargando perfil...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="profile-wrapper">
        <div className="error-msg">
          No se pudo cargar el perfil.
          <button onClick={fetchUser} className="team-btn secondary">
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-wrapper">
      <div className="profile-card">
        <div className="profile-navigation">
          {onBackToHome && (
            <button onClick={onBackToHome} className="back-btn">
              ← Volver al Home
            </button>
          )}
        </div>

        <div className="profile-header">
          <div className="avatar-container">
            <label htmlFor="avatar-upload" className="avatar-label">
              {user.profile_pic_url ? (
                <img
                  src={user.profile_pic_url}
                  alt="Avatar del usuario"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iNTAiIGN5PSI1MCIgcj0iNTAiIGZpbGw9IiMyMDIzMjkiLz48cGF0aCBkPSJNNjUgNDVBNTUgNTUgMCAxIDEgMzUgNDVBNTUgNTUgMCAxIDEgNjUgNDVaIiBmaWxsPSIjN2FmZmMxIi8+PHBhdGggZD0iTTUwIDI1QzQ1IDI1IDQ1IDM1IDUwIDM1QzU1IDM1IDU1IDI1IDUwIDI1WiIgZmlsbD0iI2ZmZmZmZiIvPjxjaXJjbGUgY3g9IjQwIiBjeT0iMjUiIHI9IjIiIGZpbGw9IiNmZmZmZmYiLz48Y2lyY2xlIGN4PSI2MCIgY3k9IjI1IiByPSIyIiBmaWxsPSIjZmZmZmZmIi8+PHBhdGggZD0iTTQ1IDQ1TDUwIDU1TDU1IDQ1IiBzdHJva2U9IiNmZmZmZmYiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIi8+PC9zdmc+";
                  }}
                />
              ) : (
                <div className="default-avatar">
                  <span>👤</span>
                </div>
              )}
            </label>
            <input
              id="avatar-upload"
              type="file"
              accept="image/*"
              onChange={handleAvatarUpload}
              disabled={isUploading}
            />
            {isUploading && (
              <div className="upload-overlay">
                <div className="upload-spinner"></div>
              </div>
            )}
          </div>

          <div className="profile-info">
            <h3>{user.name} {user.last_name}</h3>
            <div className="profile-role">
              {user.team_id ? `🏆 Miembro de ${getTeamName(user.team_id)}` : '🔓 Agente Libre'}
            </div>
          </div>

          <button onClick={onLogout} className="logout-btn">
            🚪 Cerrar Sesión
          </button>
        </div>

        <div className="profile-body">
          {msg && (
            <div className={`notification ${msg.includes('✅') ? 'success' : 'error'}`}>
              {msg}
            </div>
          )}

          <div className="info-grid">
            <div className="info-item">
              <span className="info-label">📧 Email</span>
              <span className="info-value">{user.email}</span>
            </div>

            <div className="info-item">
              <span className="info-label">🛡️ Seguridad 2FA</span>
              <span className="info-value status-active">
                <span
                  className="status-indicator"
                  style={{
                    backgroundColor: user.is_2fa_enabled ? '#2ed573' : '#ff4757',
                    boxShadow: `0 0 15px ${user.is_2fa_enabled ? '#2ed573' : '#ff4757'}`
                  }}
                ></span>
                {user.is_2fa_enabled
                  ? `ACTIVO (${user.preferred_2fa_method === 'APP' ? 'Google Auth' : 'Email OTP'})`
                  : 'INACTIVO'}
              </span>
            </div>

            <div className="info-item">
              <span className="info-label">📅 Ultimo Cambio</span>
              <span className="info-value">
                {user.last_team_change ? new Date(user.last_team_change).toLocaleDateString() : 'Nunca'}
              </span>
            </div>
          </div>

          <div className="control-section">
            <h4>🛡️ Configuración de Seguridad</h4>
            <div className="action-buttons">
              <button
                className={`team-btn ${user.preferred_2fa_method === 'APP' ? 'active' : ''}`}
                onClick={() => toggle2FA('APP')}
                disabled={user.is_2fa_enabled && user.preferred_2fa_method === 'APP'}
              >
                {user.preferred_2fa_method === 'APP' ? '✓ ' : ''}
                Usar Google Auth
              </button>

              <button
                className={`team-btn ${user.preferred_2fa_method === 'EMAIL' ? 'active' : ''}`}
                onClick={() => toggle2FA('EMAIL')}
                disabled={user.is_2fa_enabled && user.preferred_2fa_method === 'EMAIL'}
              >
                {user.preferred_2fa_method === 'EMAIL' ? '✓ ' : ''}
                Usar Email OTP
              </button>

              <button
                className="team-btn secondary"
                onClick={() => document.getElementById('avatar-upload').click()}
              >
                {isUploading ? '📤 Subiendo...' : '📸 Cambiar Avatar'}
              </button>
            </div>
          </div>

          <div className="control-section">
            <h4 className="club-section-header">
              <span>⚔️ Afiliación de Club</span>
              {timeLeft && <span className="countdown-timer">⏳ Cambio disponible en: {timeLeft}</span>}
            </h4>

            <div className="action-buttons clubs-grid">
              <button
                className={`team-btn ${user.team_id === 1 ? 'active' : ''}`}
                onClick={() => handleChangeTeam(1, "Rick & Morty")}
                disabled={!!timeLeft || user.team_id === 1}
              >
                <div className="club-icon">🧪</div>
                Rick & Morty
              </button>

              <button
                className={`team-btn ${user.team_id === 2 ? 'active' : ''}`}
                onClick={() => handleChangeTeam(2, "Pokémon")}
                disabled={!!timeLeft || user.team_id === 2}
              >
                <div className="club-icon">⚡</div>
                Pokémon
              </button>

              <button
                className={`team-btn ${user.team_id === 3 ? 'active' : ''}`}
                onClick={() => handleChangeTeam(3, "Hogwarts")}
                disabled={!!timeLeft || user.team_id === 3}
              >
                <div className="club-icon">🧙‍♂️</div>
                Hogwarts
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}