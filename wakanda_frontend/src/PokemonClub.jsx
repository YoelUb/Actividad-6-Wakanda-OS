import { useState, useEffect } from 'react'
import axios from 'axios'
import "./PokemonClub.css"

const API_URL = "http://localhost:8000"

function PokeCard({ char }) {
  const typeClass = char.types ? `type-${char.types[0]}` : "type-unknown";

  const getIdFromUrl = (url) => {
    if (!url) return "";
    const parts = url.split("/");
    return parts[parts.length - 2];
  };

  const displayId = char.id || getIdFromUrl(char.url);
  const displayImg = char.image || `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${displayId}.png`;

  return (
    <article className="rm-card">
      <div className="rm-img-wrapper">
        <img src={displayImg} alt={char.name} style={{padding: '20px', objectFit: 'contain'}} />
      </div>
      <div className="rm-card-info">
        <div className="rm-section">
          <h2 className="rm-name" style={{textTransform: 'capitalize'}}>{char.name}</h2>
          <span className="rm-status">
            <span className={`rm-status-icon status-alive`} />
            {char.types ? char.types.join(" / ") : "Scanning..."}
          </span>
        </div>

        {char.height && (
          <div className="rm-section">
            <span className="rm-label">Stats:</span>
            <span className="rm-value">H: {char.height/10}m | W: {char.weight/10}kg</span>
          </div>
        )}
      </div>
    </article>
  )
}

export default function PokemonClub({ onExit }) {
  const [singleChar, setSingleChar] = useState(null)
  const [currentId, setCurrentId] = useState("")
  const [roster, setRoster] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => { fetchRoster() }, [])

  useEffect(() => {
    if (currentId === "" || isNaN(currentId)) return
    fetchCharacterById(currentId)
  }, [currentId])

  const fetchRoster = async () => {
    try {
      const res = await axios.get(`${API_URL}/pokemon/roster`)
      setRoster(res.data.results)
    } catch {}
  }

  const fetchCharacterById = async (id) => {
    setLoading(true); setError(null);
    try {
      const res = await axios.get(`${API_URL}/pokemon/${id}`)
      setSingleChar(res.data)
    } catch {
      setError("Señal perdida: Pokémon no registrado en la Pokédex.")
      setSingleChar(null)
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e) => setCurrentId(e.target.value)
  const handlePrev = () => setCurrentId(p => p > 1 ? Number(p) - 1 : 151)
  const handleNext = () => setCurrentId(p => p < 1000 ? Number(p) + 1 : 1)

  return (
    <div className="wakanda-wrapper">
      <div className="rm-container">
        <header className="wakanda-header">
          <div>
            <h1 className="marvel-title" style={{background: 'linear-gradient(90deg, #ffcb05, #3b4cca)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'}}>
              POKÉ <span className="os-text">DEX</span>
            </h1>
            <p className="subtitle">Creature Analysis System</p>
          </div>
          <button className="rm-btn-exit" onClick={onExit}>CERRAR SESIÓN</button>
        </header>

        <div className="control-panel">
          <h3 className="panel-title" style={{color: '#ffcb05'}}>Selector de Especímenes</h3>
          <div className="input-group">
            <button className="btn-control" onClick={handlePrev}>&lt;</button>
            <input type="text" value={currentId} onChange={handleInputChange} placeholder="ID" />
            <button className="btn-control" onClick={handleNext}>&gt;</button>
          </div>
        </div>

        <div className="featured-section">
           <div className="portal-particles">
            <span style={{background: '#ffcb05', boxShadow: '0 0 10px #ffcb05'}}></span>
           </div>

           {loading && <div className="portal-loader" style={{color: '#ffcb05'}}>Analizando ADN...</div>}
           {error && <div className="error-msg">{error}</div>}
           {singleChar && !loading && !error && (
             <div className="featured-card-wrapper">
               <PokeCard char={singleChar} />
             </div>
           )}
        </div>

        <div className="divider"><span>AVISTAMIENTOS RECIENTES</span></div>
        <div className="rm-grid">
          {roster.map((char) => <PokeCard key={char.name} char={char} />)}
        </div>
      </div>
    </div>
  )
}