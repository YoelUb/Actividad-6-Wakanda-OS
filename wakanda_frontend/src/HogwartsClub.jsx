import { useState, useEffect } from 'react'
import axios from 'axios'
import "./HogwartsClub.css"

const API_URL = "http://localhost:8000"

function WizardCard({ char }) {
  let statusClass = "status-unknown"
  if (char.alive) statusClass = "status-alive"
  else statusClass = "status-dead"

  return (
    <article className="rm-card">
      <div className="rm-img-wrapper">
        <img src={char.image || "https://via.placeholder.com/300x400?text=No+Image"} alt={char.name} />
      </div>
      <div className="rm-card-info">
        <div className="rm-section">
          <h2 className="rm-name">{char.name}</h2>
          <span className="rm-status">
            <span className={`rm-status-icon ${statusClass}`} />
            {char.house || "Vagabond"}
          </span>
        </div>
        <div className="rm-section">
          <span className="rm-label">Patronus:</span>
          <span className="rm-value">{char.patronus || "Ninguno"}</span>
        </div>
        <div className="rm-section">
          <span className="rm-label">Actor:</span>
          <span className="rm-value">{char.actor}</span>
        </div>
      </div>
    </article>
  )
}

export default function HogwartsClub({ onExit }) {
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
      const res = await axios.get(`${API_URL}/hogwarts/roster`)
      setRoster(res.data)
    } catch {}
  }

  const fetchCharacterById = async (id) => {
    setLoading(true); setError(null);
    try {
      const res = await axios.get(`${API_URL}/hogwarts/${id}`)
      setSingleChar(res.data)
    } catch {
      setError("El Ministerio de Magia ha denegado el acceso.")
      setSingleChar(null)
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e) => setCurrentId(e.target.value)
  const handlePrev = () => setCurrentId(p => p > 1 ? Number(p) - 1 : 20)
  const handleNext = () => setCurrentId(p => p < 25 ? Number(p) + 1 : 1)

  return (
    <div className="wakanda-wrapper">
      <div className="rm-container">
        <header className="wakanda-header">
          <div>
            <h1 className="marvel-title" style={{background: 'linear-gradient(90deg, #740001, #eeba30)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'}}>
              HOGWARTS <span className="os-text">ARCHIVES</span>
            </h1>
            <p className="subtitle">Magical Law Enforcement Scanner</p>
          </div>
          <button className="rm-btn-exit" onClick={onExit}>NOX (SALIR)</button>
        </header>

        <div className="control-panel">
          <h3 className="panel-title" style={{color: '#eeba30'}}>Búsqueda de Magos (ID 1-25)</h3>
          <div className="input-group">
            <button className="btn-control" onClick={handlePrev}>&lt;</button>
            <input type="text" value={currentId} onChange={handleInputChange} placeholder="ID" />
            <button className="btn-control" onClick={handleNext}>&gt;</button>
          </div>
        </div>

        <div className="featured-section">
           {loading && <div className="portal-loader" style={{color: '#eeba30'}}>Revelando secretos...</div>}
           {error && <div className="error-msg">{error}</div>}
           {singleChar && !loading && !error && (
             <div className="featured-card-wrapper">
               <WizardCard char={singleChar} />
             </div>
           )}
        </div>

        <div className="divider"><span>EXPEDIENTES ABIERTOS</span></div>
        <div className="rm-grid">
          {roster.map((char, index) => <WizardCard key={index} char={char} />)}
        </div>
      </div>
    </div>
  )
}