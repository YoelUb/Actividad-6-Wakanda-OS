import { useState, useEffect, useCallback } from 'react'
import axios from 'axios'
import "./SecretClub.css"

const API_URL = "http://localhost:8000"
const MAX_CHARACTER_ID = 826

function CharacterCard({ char }) {
  let statusClass = "status-unknown"
  if (char.status === "Alive") statusClass = "status-alive"
  if (char.status === "Dead") statusClass = "status-dead"

  const defaultImage = "https://rickandmortyapi.com/api/character/avatar/19.jpeg"

  return (
    <article className="rm-card">
      <div className="rm-img-wrapper">
        <img
          src={char.image || char.img || defaultImage}
          alt={char.name || char.alias || "Unknown character"}
          onError={(e) => {
            e.target.src = defaultImage
          }}
        />
      </div>
      <div className="rm-card-info">
        <div className="rm-section">
          <h2 className="rm-name">{char.name || char.alias || "Unknown"}</h2>
          <span className="rm-status">
            <span className={`rm-status-icon ${statusClass}`} />
            {char.status || "Unknown"} - {char.species || "Unknown"}
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
  const [rosterLoading, setRosterLoading] = useState(false)

  useEffect(() => {
    fetchRoster()
  }, [])

  useEffect(() => {
    if (currentId === "" || isNaN(Number(currentId))) {
      setSingleChar(null)
      return
    }

    const id = Number(currentId)
    if (id >= 1 && id <= MAX_CHARACTER_ID) {
      fetchCharacterById(id)
    }
  }, [currentId])

  const fetchRoster = async () => {
    setRosterLoading(true)
    try {
      const res = await axios.get(`${API_URL}/secret-club/roster`)
      setRoster(res.data.results || [])
    } catch (err) {
      console.error("Error fetching roster:", err)
      setError("Failed to load character roster")
    } finally {
      setRosterLoading(false)
    }
  }

  const fetchCharacterById = async (id) => {
    if (id < 1 || id > MAX_CHARACTER_ID) {
      setError(`Invalid ID. Please enter a number between 1 and ${MAX_CHARACTER_ID}`)
      setSingleChar(null)
      return
    }

    setLoading(true)
    setError(null)
    try {
      const res = await axios.get(`${API_URL}/secret-club/${id}`)
      setSingleChar(res.data)
    } catch (err) {
      console.error("Error fetching character:", err)
      setError("Portal inestable: No se encontró el sujeto.")
      setSingleChar(null)
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e) => {
    const value = e.target.value.trim()

    if (value === "") {
      setCurrentId("")
      setSingleChar(null)
      setError(null)
      return
    }

    // Allow only numbers
    if (!/^\d*$/.test(value)) {
      return
    }

    const numValue = Number(value)
    if (numValue > MAX_CHARACTER_ID) {
      setCurrentId(MAX_CHARACTER_ID.toString())
    } else if (numValue < 1 && value !== "") {
      setCurrentId("1")
    } else {
      setCurrentId(value)
    }
  }

  const handlePrev = () => {
    setCurrentId((prev) => {
      if (prev === "" || isNaN(Number(prev))) return "1"
      const newId = Number(prev) - 1
      return newId < 1 ? MAX_CHARACTER_ID.toString() : newId.toString()
    })
  }

  const handleNext = () => {
    setCurrentId((prev) => {
      if (prev === "" || isNaN(Number(prev))) return "1"
      const newId = Number(prev) + 1
      return newId > MAX_CHARACTER_ID ? "1" : newId.toString()
    })
  }

  const handleInputBlur = () => {
    if (currentId === "") return

    const id = Number(currentId)
    if (id < 1) {
      setCurrentId("1")
    } else if (id > MAX_CHARACTER_ID) {
      setCurrentId(MAX_CHARACTER_ID.toString())
    }
  }

  return (
    <div className="wakanda-wrapper rick-theme">
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
            <button
              className="btn-control"
              onClick={handlePrev}
              disabled={loading}
            >
              &lt;
            </button>

            <input
              type="text"
              value={currentId}
              onChange={handleInputChange}
              onBlur={handleInputBlur}
              placeholder="ID (1-826)"
              disabled={loading}
            />

            <span className="limit-text">/ {MAX_CHARACTER_ID}</span>

            <button
              className="btn-control"
              onClick={handleNext}
              disabled={loading}
            >
              &gt;
            </button>
          </div>

          <div className="hint-text">
            Ingresa un número entre 1 y {MAX_CHARACTER_ID} para buscar un personaje
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

          {loading && (
            <div className="portal-loader">
              <div className="loader-spinner"></div>
              Abriendo portal...
            </div>
          )}

          {error && !loading && (
            <div className="error-msg">
              {error}
            </div>
          )}

          {!loading && !error && singleChar && (
            <div className="featured-card-wrapper">
              <CharacterCard char={singleChar} />
            </div>
          )}

          {!loading && !error && !singleChar && currentId && (
            <div className="no-results">
              Introduce un ID válido para buscar un personaje
            </div>
          )}

          {!loading && !error && !singleChar && !currentId && (
            <div className="welcome-message">
              <h3>Bienvenido al Scanner Interdimensional</h3>
              <p>Usa el selector para buscar personajes por ID</p>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}