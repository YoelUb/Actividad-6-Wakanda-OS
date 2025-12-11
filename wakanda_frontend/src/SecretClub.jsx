import { useState, useEffect } from 'react'
import axios from 'axios'
import "./SecretClub.css"

const API_URL = 'http://localhost:8000'

function CharacterCard({ char }) {
  let statusClass = 'status-unknown'
  if (char.status === 'Alive') statusClass = 'status-alive'
  if (char.status === 'Dead') statusClass = 'status-dead'

  return (
    <article className="rm-card">
      <div className="rm-img-wrapper">
        <img src={char.image} alt={char.name} />
      </div>
      <div className="rm-card-info">

        <div className="rm-section">
          <h2 className="rm-name">{char.name}</h2>
          <span className="rm-status">
            <span className={`rm-status-icon ${statusClass}`}></span>
            {char.status} - {char.species}
          </span>
        </div>

        <div className="rm-section">
          <span className="rm-label">Last known location:</span>
          <span className="rm-value">{char.location?.name || 'Unknown'}</span>
        </div>

        <div className="rm-section">
          <span className="rm-label">First seen in:</span>
          <span className="rm-value">{char.origin?.name || 'Unknown'}</span>
        </div>

      </div>
    </article>
  )
}

export default function SecretClub({ onExit }) {
  const [characters, setCharacters] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchClubMembers = async () => {
      try {
        const res = await axios.get(`${API_URL}/secret-club/roster`)
        setCharacters(res.data.results)
      } catch (err) {
        console.error(err)
        setError("Error de comunicación interdimensional con el Gateway.")
      } finally {
        setLoading(false)
      }
    }
    fetchClubMembers()
  }, [])

  return (
    <div className="rm-container">

      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px'}}>
        <div>
            <h1 style={{margin: 0, color: '#97ce4c', fontSize: '3rem', fontWeight: 900}}>
                The Rick and Morty API
            </h1>
            <p style={{color: '#9e9e9e', fontWeight: 'bold'}}>Wakanda OS Secret Database</p>
        </div>
        <button className="rm-btn-exit" onClick={onExit}>
            Cerrar Sesión 🔒
        </button>
      </div>

      {loading && <p style={{color: '#97ce4c', textAlign: 'center', fontSize: '1.5rem'}}>Cargando portal dimensional...</p>}
      {error && <p style={{color: '#d63d2e', textAlign: 'center', fontSize: '1.2rem'}}>{error}</p>}

      <div className="rm-grid">
        {characters.map(char => (
          <CharacterCard key={char.id} char={char} />
        ))}
      </div>
    </div>
  )
}