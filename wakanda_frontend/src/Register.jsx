import { useState } from 'react';
import axios from 'axios';
import './Register.css';

const USERS_API = "http://localhost:30007";

export default function Register({ switchToLogin }) {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    lastName: '',
    teamId: '1'
  });

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [touched, setTouched] = useState({
    name: false,
    lastName: false,
    email: false,
    password: false
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

  const handleNameChange = (e, field) => {
    const val = e.target.value;
    if (/^[a-zA-ZÀ-ÿ\s]*$/.test(val)) {
      setFormData(prev => ({ ...prev, [field]: val }));
    }
  };

  const validateField = (field, value) => {
    switch(field) {
      case 'name':
        if (!value.trim()) return 'El nombre es requerido';
        return '';
      case 'lastName':
        if (!value.trim()) return 'Los apellidos son requeridos';
        return '';
      case 'email':
        if (!value.trim()) return 'El email es requerido';
        if (!emailRegex.test(value)) return 'Formato de email inválido';
        return '';
      case 'password':
        if (!value.trim()) return 'La contraseña es requerida';
        if (!passwordRegex.test(value)) return 'Mínimo 8 caracteres, letra y número';
        return '';
      default:
        return '';
    }
  };

  const errors = {
    name: validateField('name', formData.name),
    lastName: validateField('lastName', formData.lastName),
    email: validateField('email', formData.email),
    password: validateField('password', formData.password)
  };

  const isFormValid =
    formData.name.trim() &&
    formData.lastName.trim() &&
    formData.email.trim() &&
    formData.password.trim() &&
    !errors.name &&
    !errors.lastName &&
    !errors.email &&
    !errors.password;

  const handleBlur = (field) => {
    setTouched(prev => ({ ...prev, [field]: true }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    if (!isFormValid) {
      setTouched({
        name: true,
        lastName: true,
        email: true,
        password: true
      });
      setIsSubmitting(false);
      return;
    }

    const data = new FormData();
    data.append('email', formData.email);
    data.append('password', formData.password);
    data.append('name', formData.name);
    data.append('last_name', formData.lastName);
    data.append('team_id', formData.teamId);

    try {
      await axios.post(`${USERS_API}/register`, data);
      alert(`Registro exitoso. Se ha enviado un código a ${formData.email}. Úsalo para iniciar sesión.`);
      switchToLogin();
    } catch (err) {
      setError(err.response?.data?.detail || "Error en el sistema de registro");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="register-container">
      <div className="register-box">
        <h2>NUEVA CIUDADANÍA</h2>

        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <input
                type="text"
                placeholder="Nombre (Solo letras) *"
                className={`register-input ${touched.name && errors.name ? 'input-error' : ''}`}
                value={formData.name}
                onChange={(e) => handleNameChange(e, 'name')}
                onBlur={() => handleBlur('name')}
                required
              />
              {touched.name && errors.name && (
                <div className="field-error">{errors.name}</div>
              )}
            </div>

            <div className="form-group">
              <input
                type="text"
                placeholder="Apellidos (Solo letras) *"
                className={`register-input ${touched.lastName && errors.lastName ? 'input-error' : ''}`}
                value={formData.lastName}
                onChange={(e) => handleNameChange(e, 'lastName')}
                onBlur={() => handleBlur('lastName')}
                required
              />
              {touched.lastName && errors.lastName && (
                <div className="field-error">{errors.lastName}</div>
              )}
            </div>
          </div>

          <div className="form-group">
            <input
              type="email"
              placeholder="Correo Electrónico *"
              className={`register-input ${touched.email && errors.email ? 'input-error' : ''}`}
              value={formData.email}
              onChange={e => setFormData({...formData, email: e.target.value})}
              onBlur={() => handleBlur('email')}
              required
            />
            {touched.email && errors.email && (
              <div className="field-error">{errors.email}</div>
            )}
          </div>

          <div className="form-group">
            <div className="password-wrapper">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Contraseña *"
                className={`register-input ${touched.password && errors.password ? 'input-error' : ''}`}
                value={formData.password}
                onChange={e => setFormData({...formData, password: e.target.value})}
                onBlur={() => handleBlur('password')}
                required
              />
              <button
                type="button"
                className={`password-toggle ${showPassword ? 'active' : ''}`}
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? "👁️" : "🔒"}
              </button>
            </div>
            {touched.password && errors.password && (
              <div className="field-error">{errors.password}</div>
            )}
            <div className="password-hint">
              Mínimo 8 caracteres con letras y números
            </div>
          </div>

          <div className="form-group">
            <label className="club-label">Selecciona tu Club:</label>
            <select
              className="register-select"
              value={formData.teamId}
              onChange={e => setFormData({...formData, teamId: e.target.value})}
            >
              <option value="1">🧪 Rick & Morty Club</option>
              <option value="2">⚡ Club Pokémon</option>
              <option value="3">🧙‍♂️ Hogwarts School</option>
            </select>
          </div>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="vibranium-btn"
            disabled={!isFormValid || isSubmitting}
          >
            {isSubmitting ? 'PROCESANDO...' : 'SOLICITAR ACCESO'}
          </button>
        </form>

        <div className="login-redirect">
          <button className="vibranium-btn secondary" onClick={switchToLogin}>
            ¿Ya tienes cuenta? Iniciar Sesión
          </button>
        </div>
      </div>
    </div>
  );
}