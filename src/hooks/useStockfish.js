import { useEffect, useRef, useState } from 'react'

export function useStockfish() {
  const workerRef = useRef(null)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState(null)
  const [analysis, setAnalysis] = useState({ bestMove: null, score: null, depth: null })
  const pendingFen = useRef(null)

  useEffect(() => {
    let worker
    try {
      worker = new Worker('/stockfish.js')
    } catch (e) {
      setError(`Failed to load Stockfish worker: ${e.message}`)
      return
    }

    workerRef.current = worker

    worker.onerror = (e) => {
      setError(`Stockfish worker error: ${e.message ?? 'unknown error'}`)
    }

    worker.onmessage = (e) => {
      const msg = e.data
      if (typeof msg !== 'string') return

      if (msg === 'uciok') {
        worker.postMessage('isready')
      } else if (msg === 'readyok') {
        setReady(true)
        if (pendingFen.current) {
          sendPosition(worker, pendingFen.current)
          pendingFen.current = null
        }
      } else if (msg.startsWith('info') && msg.includes('score')) {
        const depthMatch = msg.match(/depth (\d+)/)
        const cpMatch = msg.match(/score cp (-?\d+)/)
        const mateMatch = msg.match(/score mate (-?\d+)/)
        const depth = depthMatch ? parseInt(depthMatch[1]) : null

        if (depth !== null && depth < 12) return

        if (mateMatch) {
          const mateIn = parseInt(mateMatch[1])
          setAnalysis(prev => ({ ...prev, score: `M${mateIn}`, depth }))
        } else if (cpMatch) {
          const cp = parseInt(cpMatch[1]) / 100
          setAnalysis(prev => ({ ...prev, score: cp.toFixed(2), depth }))
        }
      } else if (msg.startsWith('bestmove')) {
        const parts = msg.split(' ')
        const bm = parts[1]
        if (bm && bm !== '(none)') {
          setAnalysis(prev => ({ ...prev, bestMove: bm }))
        }
      }
    }

    worker.postMessage('uci')

    return () => {
      worker.postMessage('quit')
      worker.terminate()
    }
  }, [])

  function sendPosition(worker, fen) {
    worker.postMessage('stop')
    worker.postMessage(`position fen ${fen}`)
    worker.postMessage('go depth 18')
  }

  function evaluate(fen) {
    setAnalysis({ bestMove: null, score: null, depth: null })
    if (!workerRef.current) return
    if (!ready) {
      pendingFen.current = fen
      return
    }
    sendPosition(workerRef.current, fen)
  }

  return { ready, error, analysis, evaluate }
}
