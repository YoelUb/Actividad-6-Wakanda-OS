import { useState } from 'react';
import axios from 'axios';
import './Login.css';

const USERS_API = "http://localhost:8006";

export default function Login({ onLoginSuccess, switchToRegister }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [step, setStep] = useState(1);
  const [tempToken, setTempToken] = useState(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [method, setMethod] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const [msg, setMsg] = useState('');

  const handleCredentials = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMsg('');

    const formData = new FormData();
    formData.append('username', email);
    formData.append('password', password);

    try {
      const res = await axios.post(`${USERS_API}/login`, formData);

      if (res.data.status === "2FA_REQUIRED") {
        setStep(2);
        setTempToken(res.data.temp_token);
        setMethod(res.data.method);
      } else if (res.data.status === "VERIFICATION_REQUIRED") {
        // Nuevo manejo para cuenta no verificada
        setStep(3);
        setError(res.data.msg); // Muestra "Cuenta no verificada..."
      } else {
        onLoginSuccess(res.data.access_token);
      }
    } catch (err) {
      setError(err.response?.data?.detail || "Error de autenticación");
    } finally {
      setLoading(false);
    }
  };

  const handle2FA = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await axios.post(`${USERS_API}/verify-2fa?code=${code}&temp_token=${tempToken}`);
      onLoginSuccess(res.data.access_token);
    } catch (err) {
      setError(err.response?.data?.detail || "Código incorrecto");
    } finally {
      setLoading(false);
    }
  };

  // Nueva función para verificar cuenta (registro inicial)
  const handleAccountVerification = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMsg('');

    const formData = new FormData();
    formData.append('email', email);
    formData.append('code', code);

    try {
      const res = await axios.post(`${USERS_API}/verify-account`, formData);
      onLoginSuccess(res.data.access_token);
    } catch (err) {
      setError(err.response?.data?.detail || "Código de verificación incorrecto");
    } finally {
      setLoading(false);
    }
  };

  // Nueva función para reenviar código
  const handleResendCode = async () => {
    setLoading(true);
    setError('');
    setMsg('');

    const formData = new FormData();
    formData.append('email', email);

    try {
      const res = await axios.post(`${USERS_API}/resend-code`, formData);
      setMsg(res.data.msg || "Código reenviado. Revisa tu correo.");
    } catch (err) {
      setError(err.response?.data?.detail || "Error al reenviar código");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <h2>🔐 WAKANDA ACCESS</h2>

        {step === 1 && (
          <form onSubmit={handleCredentials}>
            <p>Identifícate, ciudadano.</p>

            <input
              type="email"
              placeholder="Correo Oficial"
              className="login-input"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />

            <div className="password-wrapper">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Clave de Acceso"
                className="login-input"
                value={password}
                onChange={e => setPassword(e.target.value)}
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

            <button type="submit" className="vibranium-btn" disabled={loading}>
              {loading ? 'Verificando...' : 'INICIAR SESIÓN'}
            </button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handle2FA}>
            <div className="secret-icon">🛡️</div>
            <p>SE REQUIERE AUTENTICACIÓN DE NIVEL 2</p>
            <p style={{fontSize: '0.9rem', color: '#aaa'}}>
              {method === 'EMAIL'
                ? `Hemos enviado un código a tu correo: ${email}`
                : 'Introduce el código de tu Google Authenticator'}
            </p>

            <div className="password-wrapper">
              <input
                type={showCode ? "text" : "text"}
                placeholder="000000"
                className="login-input"
                value={code}
                onChange={e => setCode(e.target.value)}
                maxLength={6}
                autoFocus
              />
              <button
                type="button"
                className={`password-toggle ${showCode ? 'active' : ''}`}
                onClick={() => setShowCode(!showCode)}
              >
                {showCode ? "👁️" : "🔒"}
              </button>
            </div>

            <button type="submit" className="vibranium-btn" disabled={loading}>
              {loading ? 'Validando...' : 'VERIFICAR IDENTIDAD'}
            </button>
          </form>
        )}

        {step === 3 && (
          <form onSubmit={handleAccountVerification}>
            <div className="secret-icon">📩</div>
            <p>VERIFICACIÓN DE CUENTA REQUERIDA</p>
            <p style={{fontSize: '0.9rem', color: '#aaa'}}>
              Introduce el código enviado a: <br/><strong>{email}</strong>
            </p>

            <div className="password-wrapper">
              <input
                type="text"
                placeholder="Código de Email"
                className="login-input"
                value={code}
                onChange={e => setCode(e.target.value)}
                maxLength={6}
                autoFocus
              />
            </div>

            <button type="submit" className="vibranium-btn" disabled={loading}>
              {loading ? 'Verificando...' : 'ACTIVAR CUENTA'}
            </button>

            <button
              type="button"
              className="vibranium-btn secondary"
              onClick={handleResendCode}
              disabled={loading}
              style={{marginTop: '10px'}}
            >
              Reenviar Código
            </button>
          </form>
        )}

        {error && <div className="error-message" style={{marginTop: '15px'}}>{error}</div>}
        {msg && <div className="success-message" style={{marginTop: '15px', color: '#2ed573'}}>{msg}</div>}

        {step === 1 && (
          <button className="vibranium-btn secondary" onClick={switchToRegister}>
            Solicitar Nueva Ciudadanía (Registro)
          </button>
        )}

        {step !== 1 && (
           <button
             className="vibranium-btn secondary"
             onClick={() => { setStep(1); setError(''); setMsg(''); setCode(''); }}
             style={{marginTop: '20px'}}
           >
             Volver al Login
           </button>
        )}
      </div>
    </div>
  );
}