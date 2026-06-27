import { Chessboard } from 'react-chessboard'

export default function App() {
  return (
    <div>
      <h1>chess analyzer</h1>
      <div style={{ width: 480, marginTop: 16 }}>
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
