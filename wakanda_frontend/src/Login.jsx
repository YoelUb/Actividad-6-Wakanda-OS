import { useState } from 'react';
import axios from 'axios';
import './Login.css';

const GATEWAY_URL = 'http://localhost:30007';

export default function Login({ onLogin, onNavigateToRegister, onReplayIntro }) {
  const [formData, setFormData] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [showRecover, setShowRecover] = useState(false);
  const [showRecoverPassword, setShowRecoverPassword] = useState(false);
  const [recoverStep, setRecoverStep] = useState(1);
  const [recoverData, setRecoverData] = useState({ email: '', code: '', new_password: '' });
  const [recoverMsg, setRecoverMsg] = useState({ type: '', text: '' });

  const [showVerify, setShowVerify] = useState(false);
  const [verifyCode, setVerifyCode] = useState('');
  const [verifyMsg, setVerifyMsg] = useState({ type: '', text: '' });

  const passwordRegex = /^(?=.*[A-Z])(?=.*\d)[A-Za-z\d@$!%*?&]{8,}$/;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const body = new FormData();
    body.append('username', formData.username);
    body.append('password', formData.password);

    try {
      const response = await axios.post(`${GATEWAY_URL}/login`, body);
      const { access_token, status, msg } = response.data;

      if (status === 'VERIFICATION_REQUIRED') {
        setShowVerify(true);
        setVerifyMsg({ type: 'info', text: msg || 'Introduce el código enviado a tu correo.' });
      } else {
        sessionStorage.setItem('wakanda_token', access_token);
        onLogin();
      }
    } catch (err) {
      setError('❌ Credenciales inválidas o error en el sistema');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAccount = async (e) => {
    e.preventDefault();
    const body = new FormData();
    body.append('email', formData.username);
    body.append('code', verifyCode);

    try {
      const response = await axios.post(`${GATEWAY_URL}/verify-account`, body);
      const { access_token } = response.data;

      sessionStorage.setItem('wakanda_token', access_token);
      alert("✅ ¡Cuenta verificada! Accediendo...");
      setShowVerify(false);
      onLogin();
    } catch (err) {
      setVerifyMsg({ type: 'error', text: err.response?.data?.detail || 'Código incorrecto' });
    }
  };

  const handleResendCode = async () => {
    const body = new FormData();
    body.append('email', formData.username);
    try {
        await axios.post(`${GATEWAY_URL}/resend-code`, body);
        alert("📩 Nuevo código enviado. Revisa tu correo.");
    } catch (err) {
        alert("Error: " + (err.response?.data?.detail || "No se pudo enviar el código"));
    }
  };

  const handleRecoverRequest = async (e) => {
    e.preventDefault();
    setRecoverMsg({ type: '', text: '' });

    try {
      await axios.post(`${GATEWAY_URL}/recover/request`, { email: recoverData.email });
      setRecoverMsg({ type: 'success', text: 'Código enviado. Revisa tu correo.' });
      setRecoverStep(2);
    } catch (err) {
      setRecoverMsg({ type: 'error', text: 'Error al enviar código.' });
    }
  };

  const handleRecoverConfirm = async (e) => {
    e.preventDefault();
    setRecoverMsg({ type: '', text: '' });

    if (!passwordRegex.test(recoverData.new_password)) {
        setRecoverMsg({ type: 'error', text: 'La contraseña debe tener al menos 8 caracteres, 1 mayúscula y 1 número.' });
        return;
    }

    try {
      await axios.post(`${GATEWAY_URL}/recover/confirm`, {
        email: recoverData.email,
        code: recoverData.code,
        new_password: recoverData.new_password
      });
      setRecoverMsg({ type: 'success', text: '¡Contraseña restablecida! Ahora puedes iniciar sesión.' });
      setTimeout(() => {
        setShowRecover(false);
        setRecoverMsg({ type: '', text: '' });
        setRecoverStep(1);
        setRecoverData({ email: '', code: '', new_password: '' });
      }, 2500);
    } catch (err) {
      setRecoverMsg({ type: 'error', text: 'Código incorrecto o expirado.' });
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

        <div style={{display: 'flex', justifyContent: 'space-between', marginTop: '15px'}}>
            <button
              type="button"
              className="vibranium-btn secondary"
              style={{fontSize: '0.8rem', border: 'none', color: 'var(--neon-purple)', padding: '0'}}
              onClick={() => setShowRecover(true)}
            >
              ¿Olvidaste la contraseña?
            </button>

            <button
                type="button"
                className="vibranium-btn secondary"
                onClick={onReplayIntro}
                style={{
                    background: 'transparent',
                    border: '1px dashed var(--neon-purple)',
                    color: 'var(--neon-purple)',
                    padding: '5px 10px',
                    fontSize: '0.8rem'
                }}
            >
                🎬 Ver Intro
            </button>
        </div>
      </div>

      {showRecover && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          background: 'rgba(0,0,0,0.9)', zIndex: 2000, display: 'flex',
          justifyContent: 'center', alignItems: 'center', padding: '20px'
        }}>
          <div className="login-box" style={{maxWidth: '400px', margin: '0', border: '2px solid var(--neon-purple)', transform: 'none'}}>
            <h2 style={{fontSize: '1.5rem', marginBottom: '15px'}}>Recuperación</h2>

            {recoverStep === 1 ? (
              <form onSubmit={handleRecoverRequest}>
                <p style={{marginBottom: '20px'}}>Introduce tu correo para recibir un código.</p>
                <input
                  className="login-input"
                  type="email"
                  placeholder="Correo electrónico"
                  value={recoverData.email}
                  onChange={(e) => setRecoverData({...recoverData, email: e.target.value})}
                  required
                />
                <button type="submit" className="vibranium-btn">ENVIAR CÓDIGO</button>
              </form>
            ) : (
              <form onSubmit={handleRecoverConfirm}>
                <p style={{marginBottom: '20px'}}>Introduce el código enviado y tu nueva contraseña.</p>
                <input
                  className="login-input"
                  type="text"
                  placeholder="Código de verificación"
                  value={recoverData.code}
                  onChange={(e) => setRecoverData({...recoverData, code: e.target.value})}
                  required
                />

                <div className="password-wrapper">
                    <input
                      className="login-input"
                      type={showRecoverPassword ? "text" : "password"}
                      placeholder="Nueva contraseña"
                      value={recoverData.new_password}
                      onChange={(e) => setRecoverData({...recoverData, new_password: e.target.value})}
                      required
                    />
                    <button
                      type="button"
                      className={`password-toggle ${showRecoverPassword ? 'active' : ''}`}
                      onClick={() => setShowRecoverPassword(!showRecoverPassword)}
                      style={{right: '10px'}}
                    >
                      {showRecoverPassword ? '👁️' : '🔒'}
                    </button>
                </div>
                <p style={{fontSize: '0.75rem', color: '#aaa', textAlign: 'left', marginTop: '-10px', marginBottom: '15px'}}>
                    * Mínimo 8 caracteres, 1 mayúscula y 1 número.
                </p>

                <button type="submit" className="vibranium-btn">CAMBIAR CONTRASEÑA</button>
              </form>
            )}

            {recoverMsg.text && (
              <div className={recoverMsg.type === 'error' ? 'error-message' : 'success-message'}>
                {recoverMsg.text}
              </div>
            )}

            <button
              type="button"
              className="vibranium-btn secondary"
              onClick={() => {
                setShowRecover(false);
                setRecoverStep(1);
                setRecoverMsg({type:'', text:''});
                setRecoverData({ email: '', code: '', new_password: '' });
              }}
            >
              CANCELAR
            </button>
          </div>
        </div>
      )}

      {showVerify && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          background: 'rgba(0,0,0,0.9)', zIndex: 2000, display: 'flex',
          justifyContent: 'center', alignItems: 'center', padding: '20px'
        }}>
          <div className="login-box" style={{maxWidth: '400px', margin: '0', border: '2px solid var(--neon-blue)', transform: 'none'}}>
            <h2 style={{fontSize: '1.5rem', marginBottom: '15px'}}>Verificación Requerida</h2>
            <p style={{marginBottom: '20px', color: '#ccc'}}>
                Hemos enviado un código a <strong>{formData.username}</strong>
            </p>

            <form onSubmit={handleVerifyAccount}>
              <input
                className="login-input"
                type="text"
                placeholder="Código de 6 dígitos"
                value={verifyCode}
                onChange={(e) => setVerifyCode(e.target.value)}
                required
                style={{textAlign: 'center', letterSpacing: '5px', fontSize: '1.2rem'}}
              />

              {verifyMsg.text && (
                <div className={verifyMsg.type === 'error' ? 'error-message' : 'success-message'} style={{marginBottom: '15px'}}>
                  {verifyMsg.text}
                </div>
              )}

              <button type="submit" className="vibranium-btn">VERIFICAR CUENTA</button>
            </form>

            <div style={{display: 'flex', gap: '10px', marginTop: '10px'}}>
                <button
                  type="button"
                  className="vibranium-btn secondary"
                  style={{fontSize: '0.8rem'}}
                  onClick={handleResendCode}
                >
                  Reenviar código
                </button>
                <button
                  type="button"
                  className="vibranium-btn secondary"
                  style={{fontSize: '0.8rem', borderColor: '#ff4757', color: '#ff4757'}}
                  onClick={() => {
                    setShowVerify(false);
                    setVerifyMsg({type:'', text:''});
                    setVerifyCode('');
                  }}
                >
                  Cancelar
                </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}