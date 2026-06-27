import { useState, useCallback, useEffect } from 'react'
import { Chess } from 'chess.js'
import { Chessboard } from 'react-chessboard'
import { fetchRecentGames } from './api/chesscom'
import { useStockfish } from './hooks/useStockfish'

const CLASSIFICATION = {
  Blunder: { label: 'Blunder', color: 'rgba(220,50,50,0.55)' },
  Miss:    { label: 'Miss',    color: 'rgba(230,130,50,0.55)' },
  Good:    { label: 'Good',    color: 'rgba(60,180,60,0.55)' },
  Great:   { label: 'Great',   color: 'rgba(50,110,220,0.55)' },
}

function parseScore(score) {
  if (!score) return null
  if (score.startsWith('M')) {
    const n = parseInt(score.slice(1))
    return n > 0 ? 100 : -100
  }
  const v = parseFloat(score)
  return isNaN(v) ? null : v
}

function classifyMove(prevScore, currScore) {
  const prev = parseScore(prevScore)
  const curr = parseScore(currScore)
  if (prev === null || curr === null) return null
  // Both scores are from the perspective of the side to move.
  // loss for the player who just moved = prev + curr
  const loss = prev + curr
  if (loss > 2.0) return 'Blunder'
  if (loss > 0.5) return 'Miss'
  if (loss < -0.5) return 'Great'
  return 'Good'
}

function formatGame(game) {
  const white = game.white?.username ?? '?'
  const black = game.black?.username ?? '?'
  const result = game.white?.result === 'win' ? '1-0' : game.black?.result === 'win' ? '0-1' : '½-½'
  const date = game.end_time ? new Date(game.end_time * 1000).toLocaleDateString() : ''
  return `${white} vs ${black}  ${result}  ${date}`
}

function parseMoves(pgn) {
  const chess = new Chess()
  chess.loadPgn(pgn)
  const history = chess.history({ verbose: true })
  const positions = [new Chess().fen()]
  const replay = new Chess()
  for (const move of history) {
    replay.move(move)
    positions.push(replay.fen())
  }
  return { positions, history }
}

function resolveBestMove(uci, fen) {
  if (!uci || !fen) return null
  const chess = new Chess(fen)
  const from = uci.slice(0, 2)
  const to = uci.slice(2, 4)
  const promotion = uci[4]
  try {
    const m = chess.move({ from, to, promotion })
    return m ? { from, to, san: m.san } : null
  } catch {
    return null
  }
}

export default function App() {
  const [input, setInput] = useState('')
  const [games, setGames] = useState([])
  const [loading, setLoading] = useState(false)
  const [fetchError, setFetchError] = useState(null)
  const [selectedIndex, setSelectedIndex] = useState(null)
  const [positions, setPositions] = useState([])
  const [moveHistory, setMoveHistory] = useState([])
  const [moveIndex, setMoveIndex] = useState(0)
  const [evalCache, setEvalCache] = useState({})

  const { ready: engineReady, error: engineError, analysis, evaluate, completedEval } = useStockfish()

  useEffect(() => {
    if (!completedEval?.fen) return
    setEvalCache(prev => ({ ...prev, [completedEval.fen]: completedEval }))
  }, [completedEval])

  async function handleFetch(e) {
    e.preventDefault()
    const username = input.trim()
    if (!username) return
    setLoading(true)
    setFetchError(null)
    setGames([])
    setSelectedIndex(null)
    setPositions([])
    setMoveHistory([])
    setMoveIndex(0)
    setEvalCache({})
    try {
      const result = await fetchRecentGames(username)
      setGames(result)
    } catch (err) {
      setFetchError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function selectGame(i) {
    const game = games[i]
    if (!game?.pgn) return
    try {
      const { positions: pos, history } = parseMoves(game.pgn)
      setPositions(pos)
      setMoveHistory(history)
      setMoveIndex(0)
      setSelectedIndex(i)
      setEvalCache({})
    } catch {
      setFetchError('Failed to parse game PGN')
    }
  }

  const goTo = useCallback((idx) => {
    setMoveIndex(Math.max(0, Math.min(idx, positions.length - 1)))
  }, [positions.length])

  function handleKey(e) {
    if (e.key === 'ArrowLeft') goTo(moveIndex - 1)
    if (e.key === 'ArrowRight') goTo(moveIndex + 1)
  }

  useEffect(() => {
    if (positions.length === 0) return
    const fen = positions[moveIndex]
    if (fen) evaluate(fen)
  }, [moveIndex, positions])

  const currentFen = positions[moveIndex] ?? 'start'
  const lastMove = moveHistory[moveIndex - 1]
  const moveNumber = moveIndex > 0 ? `move ${moveIndex} / ${moveHistory.length}` : 'starting position'

  const bestMove = analysis.bestMove ? resolveBestMove(analysis.bestMove, currentFen) : null

  const scoreDisplay = (() => {
    if (!analysis.score) return null
    const raw = analysis.score
    if (raw.startsWith('M')) return raw
    const num = parseFloat(raw)
    return num > 0 ? `+${num.toFixed(2)}` : `${num.toFixed(2)}`
  })()

  const classification = (() => {
    if (moveIndex === 0 || positions.length === 0) return null
    const prevFen = positions[moveIndex - 1]
    const currFen = positions[moveIndex]
    const prevEval = evalCache[prevFen]
    const currEval = evalCache[currFen]
    return classifyMove(prevEval?.score, currEval?.score)
  })()

  const classInfo = classification ? CLASSIFICATION[classification] : null

  const squareStyles = (() => {
    if (!lastMove) return {}
    const base = {
      [lastMove.from]: { backgroundColor: 'rgba(255,255,100,0.2)' },
    }
    if (classInfo) {
      base[lastMove.to] = { backgroundColor: classInfo.color }
    } else {
      base[lastMove.to] = { backgroundColor: 'rgba(255,255,100,0.35)' }
    }
    return base
  })()

  return (
    <div onKeyDown={handleKey} tabIndex={-1} style={{ outline: 'none' }}>
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

      {fetchError && <div className="error">{fetchError}</div>}

      <div style={{ display: 'flex', gap: 32, alignItems: 'flex-start' }}>
        <div>
          <div style={{ width: 480 }}>
            <Chessboard
              position={currentFen}
              arePiecesDraggable={false}
              customDarkSquareStyle={{ backgroundColor: '#4a4a4a' }}
              customLightSquareStyle={{ backgroundColor: '#9a9a9a' }}
              customSquareStyles={squareStyles}
              customArrows={bestMove ? [[bestMove.from, bestMove.to, 'rgba(0,180,120,0.85)']] : []}
              customArrowColor="rgba(0,180,120,0.85)"
            />
          </div>

          {positions.length > 0 && (
            <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <button onClick={() => goTo(0)} disabled={moveIndex === 0}>|&lt;</button>
              <button onClick={() => goTo(moveIndex - 1)} disabled={moveIndex === 0}>&lt;</button>
              <span style={{ color: '#aaa', minWidth: 160, textAlign: 'center' }}>{moveNumber}</span>
              <button onClick={() => goTo(moveIndex + 1)} disabled={moveIndex === positions.length - 1}>&gt;</button>
              <button onClick={() => goTo(positions.length - 1)} disabled={moveIndex === positions.length - 1}>&gt;|</button>
              {classInfo && (
                <span style={{ color: classInfo.color, fontWeight: 'bold', marginLeft: 8 }}>
                  {classInfo.label}
                </span>
              )}
            </div>
          )}

          <div style={{ marginTop: 20, padding: '12px 16px', background: '#222', border: '1px solid #333', minHeight: 80 }}>
            <div style={{ color: '#666', fontSize: 12, marginBottom: 8 }}>
              stockfish {engineReady ? '— ready' : '— initializing...'}
            </div>
            {engineError && <div className="error">{engineError}</div>}
            {!engineError && positions.length > 0 && (
              <div>
                <div style={{ display: 'flex', gap: 24 }}>
                  <div>
                    <span className="dim">eval  </span>
                    <span style={{ color: scoreDisplay ? '#e0e0e0' : '#555' }}>
                      {scoreDisplay ?? '—'}
                    </span>
                  </div>
                  <div>
                    <span className="dim">best  </span>
                    <span style={{ color: bestMove ? '#e0e0e0' : '#555' }}>
                      {bestMove ? `${bestMove.from}${bestMove.to} (${bestMove.san})` : '—'}
                    </span>
                  </div>
                </div>
                {analysis.depth && (
                  <div style={{ marginTop: 4, fontSize: 12, color: '#555' }}>depth {analysis.depth}</div>
                )}
              </div>
            )}
          </div>
        </div>

        {games.length > 0 && (
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="dim" style={{ marginBottom: 8 }}>recent games — click to load</div>
            {games.map((game, i) => (
              <div
                key={game.url ?? i}
                onClick={() => selectGame(i)}
                style={{
                  padding: '6px 8px',
                  borderBottom: '1px solid #2a2a2a',
                  cursor: 'pointer',
                  background: selectedIndex === i ? '#2a2a2a' : 'transparent',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {formatGame(game)}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
