import { useState } from 'react'
import { Chessboard } from 'react-chessboard'
import { fetchRecentGames } from './api/chesscom'

function formatGame(game) {
  const white = game.white?.username ?? '?'
  const black = game.black?.username ?? '?'
  const result = game.white?.result === 'win' ? '1-0' : game.black?.result === 'win' ? '0-1' : '½-½'
  const date = game.end_time ? new Date(game.end_time * 1000).toLocaleDateString() : ''
  return `${white} vs ${black}  ${result}  ${date}`
}

export default function App() {
  const [input, setInput] = useState('')
  const [games, setGames] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function handleFetch(e) {
    e.preventDefault()
    const username = input.trim()
    if (!username) return
    setLoading(true)
    setError(null)
    setGames([])
    try {
      const result = await fetchRecentGames(username)
      setGames(result)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <h1>chess analyzer</h1>

      <form onSubmit={handleFetch} style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        <input
          type="text"
          placeholder="chess.com username"
          value={input}
          onChange={e => setInput(e.target.value)}
        />
        <button type="submit" disabled={loading}>
          {loading ? 'loading...' : 'fetch games'}
        </button>
      </form>

      {error && <div className="error">{error}</div>}

      {games.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div className="dim" style={{ marginBottom: 8 }}>recent games</div>
          {games.map((game, i) => (
            <div
              key={game.url ?? i}
              style={{ padding: '6px 0', borderBottom: '1px solid #2a2a2a', cursor: 'pointer' }}
            >
              {formatGame(game)}
            </div>
          ))}
        </div>
      )}

      <div style={{ width: 480 }}>
        <Chessboard
          position="start"
          arePiecesDraggable={false}
          customDarkSquareStyle={{ backgroundColor: '#4a4a4a' }}
          customLightSquareStyle={{ backgroundColor: '#9a9a9a' }}
        />
      </div>
    </div>
  )
}
