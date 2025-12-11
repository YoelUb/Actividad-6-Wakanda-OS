import { useState, useEffect } from 'react';
import axios from 'axios';
import './SecretClub.css';

const API_URL = 'http://localhost:8000';

function CharacterCard({ char }) {
  let statusClass = 'status-unknown';
  if (char.status === 'Alive') statusClass = 'status-alive';
  if (char.status === 'Dead') statusClass = 'status-dead';

  return (
    <article className="rm-card">
      <div className="rm-img-wrapper">
        <img src={char.image || char.img} alt={char.name} />
      </div>
      <div className="rm-card-info">
        <div className="rm-section">
          <h2 className="rm-name">{char.name || char.alias}</h2>
          <span className="rm-status">
            <span className={`rm-status-icon ${statusClass}`}></span>
            {char.status} - {char.species || 'Unknown'}
          </span>
        </div>

        <div className="rm-section">
          <span className="rm-label">Last known location:</span>
          <span className="rm-value">{char.location?.name || 'Unknown'}</span>
        </div>

        <div className="rm-section">
          <span className="rm-label">First seen in:</span>
          <span className="rm-value">{char.origin?.name || char.origin || 'Unknown'}</span>
        </div>
      </div>
    </article>
  );
}

export default function SecretClub({ onExit }) {
  const [singleChar, setSingleChar] = useState(null);
  const [currentId, setCurrentId] = useState(1);
  const [roster, setRoster] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchRoster = async () => {
      try {
        const res = await axios.get(`${API_URL}/secret-club/roster`);
        setRoster(res.data.results);
      } catch (err) {
        console.error(err);
      }
    };
    fetchRoster();
  }, []);

  useEffect(() => {
    const fetchCharacterById = async (id) => {
      setLoading(true);
      setError(null);
      try {
        const res = await axios.get(`${API_URL}/secret-club/${id}`);
        setSingleChar(res.data);
      } catch (err) {
        setError("Sujeto no encontrado en esta dimensión.");
        setSingleChar(null);
      } finally {
        setLoading(false);
      }
    };
    fetchCharacterById(currentId);
  }, [currentId]);

  const handleInputChange = (e) => {
    let val = parseInt(e.target.value);
    if (isNaN(val)) val = 1;
    if (val < 1) val = 1;
    if (val > 826) val = 826;
    setCurrentId(val);
  };

  const handlePrev = () => {
    setCurrentId(prev => prev > 1 ? prev - 1 : 826);
  };

  const handleNext = () => {
    setCurrentId(prev => prev < 826 ? prev + 1 : 1);
  };

  return (
    <div className="wakanda-wrapper">
      <div className="rm-container">

        <header className="wakanda-header">
          <div className="header-text">
            <h1 className="marvel-title">WAKANDA <span className="os-text">OS</span></h1>
            <p className="subtitle">CLASSIFIED ARCHIVES // RICK_AND_MORTY_DB</p>
          </div>
          <button className="rm-btn-exit" onClick={onExit}>
            CERRAR SESIÓN 🔒
          </button>
        </header>

        <div className="control-panel">
          <h3 className="panel-title">SELECTOR DE SUJETO [ID 1-826]</h3>
          <div className="input-group">
            <button className="btn-control" onClick={handlePrev}>&lt;</button>
            <input
              type="number"
              value={currentId}
              onChange={handleInputChange}
              min="1"
              max="826"
            />
            <span className="limit-text">/ 826</span>
            <button className="btn-control" onClick={handleNext}>&gt;</button>
          </div>
        </div>

        <div className="featured-section">
          {loading && <div className="portal-loader">ABRIENDO PORTAL DIMENSIONAL...</div>}
          {error && <div className="error-msg">{error}</div>}

          {singleChar && !loading && !error && (
             <div className="featured-card-wrapper">
                <CharacterCard char={{
                    ...singleChar,
                    name: singleChar.name || singleChar.alias,
                    image: singleChar.image || "https://rickandmortyapi.com/api/character/avatar/19.jpeg"
                }} />
             </div>
          )}
        </div>

        <div className="divider">
          <span>BASE DE DATOS COMPLETA</span>
        </div>

        <div className="rm-grid">
          {roster.map(char => (
            <CharacterCard key={char.id} char={char} />
          ))}
        </div>
      </div>
    </div>
  );
}