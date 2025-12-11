import { useState, useEffect } from 'react'
import axios from 'axios'
import "./SecretClub.css"

const API_URL = "http://localhost:8000"

function CharacterCard({ char }) {
  let statusClass = "status-unknown"
  if (char.status === "Alive") statusClass = "status-alive"
  if (char.status === "Dead") statusClass = "status-dead"

  return (
    <article className="rm-card">
      <div className="rm-img-wrapper">
        <img src={char.image || char.img} alt={char.name} />
      </div>
      <div className="rm-card-info">
        <div className="rm-section">
          <h2 className="rm-name">{char.name || char.alias}</h2>
          <span className="rm-status">
            <span className={`rm-status-icon ${statusClass}`} />
            {char.status} - {char.species || "Unknown"}
          </span>
        </div>

        <div className="rm-section">
          <span className="rm-label">Last known location:</span>
          <span className="rm-value">{char.location?.name || "Unknown"}</span>
        </div>

        <div className="rm-section">
          <span className="rm-label">First seen in:</span>
          <span className="rm-value">
            {char.origin?.name || char.origin || "Unknown"}
          </span>
        </div>
      </div>
    </article>
  )
}

export default function SecretClub({ onExit }) {
  const [singleChar, setSingleChar] = useState(null)
  const [currentId, setCurrentId] = useState("")
  const [roster, setRoster] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchRoster()
  }, [])

  useEffect(() => {
    if (currentId === "" || isNaN(currentId)) return
    fetchCharacterById(currentId)
  }, [currentId])

  const fetchRoster = async () => {
    try {
      const res = await axios.get(`${API_URL}/secret-club/roster`)
      setRoster(res.data.results)
    } catch {}
  }

  const fetchCharacterById = async (id) => {
    setLoading(true)
    setError(null)
    try {
      const res = await axios.get(`${API_URL}/secret-club/${id}`)
      setSingleChar(res.data)
    } catch {
      setError("Portal inestable: No se encontró el sujeto.")
      setSingleChar(null)
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e) => {
    const value = e.target.value
    if (value === "") {
      setCurrentId("")
      return
    }
    const num = Math.max(1, Math.min(826, Number(value)))
    setCurrentId(num)
  }

  const handlePrev = () => {
    setCurrentId((prev) => {
      if (prev === "" || isNaN(prev)) return 1
      return prev > 1 ? prev - 1 : 826
    })
  }

  const handleNext = () => {
    setCurrentId((prev) => {
      if (prev === "" || isNaN(prev)) return 1
      return prev < 826 ? prev + 1 : 1
    })
  }

  return (
    <div className="wakanda-wrapper">
      <div className="rm-container">

        <header className="wakanda-header">
          <div>
            <h1 className="marvel-title">RICK&MORTY <span className="os-text">OS</span></h1>
            <p className="subtitle">Central Interdimensional Scanner</p>
          </div>
          <button className="rm-btn-exit" onClick={onExit}>CERRAR SESIÓN</button>
        </header>

        <div className="control-panel">
          <h3 className="panel-title">Selector Dimensional</h3>

          <div className="input-group">
            <button className="btn-control" onClick={handlePrev}>&lt;</button>

            <input
              type="text"
              value={currentId}
              onChange={handleInputChange}
              placeholder="ID"
            />

            <span className="limit-text">/ 826</span>

            <button className="btn-control" onClick={handleNext}>&gt;</button>
          </div>
        </div>

        <div className="featured-section">
          <div className="portal-particles">
            <span style={{ top: "20%", left: "40%", animationDuration: "3s" }} />
            <span style={{ top: "60%", left: "70%", animationDuration: "4s" }} />
            <span style={{ top: "30%", left: "80%", animationDuration: "2.6s" }} />
            <span style={{ top: "50%", left: "20%", animationDuration: "3.4s" }} />
            <span style={{ top: "75%", left: "50%", animationDuration: "3.8s" }} />
            <span style={{ top: "10%", left: "60%", animationDuration: "2.9s" }} />
          </div>

          {loading && <div className="portal-loader">Abriendo portal...</div>}
          {error && <div className="error-msg">{error}</div>}

          {singleChar && !loading && !error && (
            <div className="featured-card-wrapper">
              <CharacterCard
                char={{
                  ...singleChar,
                  name: singleChar.name || singleChar.alias,
                  image:
                    singleChar.image ||
                    "https://rickandmortyapi.com/api/character/avatar/19.jpeg"
                }}
              />
            </div>
          )}
        </div>

        <div className="divider">
          <span>ÚLTIMAS INTERCEPCIONES</span>
        </div>

        <div className="rm-grid">
          {roster.map((char) => (
            <CharacterCard key={char.id} char={char} />
          ))}
        </div>

      </div>
    </div>
  )
}
