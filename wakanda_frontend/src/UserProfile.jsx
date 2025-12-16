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
  const [imageHash, setImageHash] = useState(Date.now()); // Para forzar recarga de imagen

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

      // Forzar actualización visual
      setImageHash(Date.now());
      await fetchUser();

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
                  // El parámetro 't' fuerza al navegador a recargar la imagen
                  src={`${user.profile_pic_url}?t=${imageHash}`}
                  alt="Avatar del usuario"
                  onError={(e) => {
                    // Solo si falla REALMENTE la carga mostramos el default
                    e.target.onerror = null;
                    e.target.src = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iNTAiIGN5PSI1MCIgcj0iNTAiIGZpbGw9IiMyMDIzMjkiLz48cGF0aCBkPSJNNjUgNDVBNTUgNTUgMCAxIDEgMzUgNDVBNTUgNTUgMCAxIDEgNjUgNDVaIiBmaWxsPSIjN2FmZmMxIi8+PHBhdGggZD0iTTUwIDI1QzQ1IDI1IDQ1IDM1IDUwIDM1QzU1IDM1IDU1IDI1IDUwIDI1WiIgZmlsbD0iI2ZmZmZmZiIvPjxjaXJjbGUgY3g9IjQwIiBjeT0iMjUiIHI9IjIiIGZpbGw9IiNmZmZmZmYiLz48Y2lyY2xlIGN4PSI2MCIgY3k9IjI1IiByPSIyIiBmaWxsPSIjZmZmZmZmIi8+PHBhdGggZD0iTTQ1IDQ1TDUwIDU1TDU1IDQ1IiBzdHJva2U9IiNmZmZmZmYiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIi8+PC9zdmc+";
                  }}
                />
              ) : (
                <div className="default-avatar">
                  <span>👤</span>
                </div>
              )}
              <div className="avatar-edit-icon">📸</div>
            </label>
            <input
              id="avatar-upload"
              type="file"
              accept="image/*"
              onChange={handleAvatarUpload}
              disabled={isUploading}
              style={{ display: 'none' }}
            />
            {isUploading && (
              <div className="upload-overlay">
                <div className="upload-spinner"></div>
              </div>
            )}
          </div>

          <div className="profile-info">
            <h2 className="user-name">{user.name} {user.last_name}</h2>
            <div className="user-email">{user.email}</div>
            <div className="profile-role">
              {user.team_id ? `🏆 ${getTeamName(user.team_id)}` : '🔓 Agente Libre'}
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