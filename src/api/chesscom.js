const BASE = 'https://api.chess.com/pub/player'

export async function fetchRecentGames(username) {
  const archivesRes = await fetch(`${BASE}/${username}/games/archives`)
  if (!archivesRes.ok) {
    if (archivesRes.status === 404) throw new Error(`Player "${username}" not found`)
    throw new Error(`Chess.com error: ${archivesRes.status}`)
  }
  const { archives } = await archivesRes.json()
  if (!archives || archives.length === 0) throw new Error('No game archives found')

  const latestUrl = archives[archives.length - 1]
  const gamesRes = await fetch(latestUrl)
  if (!gamesRes.ok) throw new Error(`Failed to fetch games: ${gamesRes.status}`)
  const { games } = await gamesRes.json()
  if (!games || games.length === 0) throw new Error('No games in most recent archive')

  return games.slice(-20).reverse()
}
