// Shared include shapes so every route fetches (and formats) movies consistently.
export const movieInclude = {
  votes:   { include: { user: { select: { id: true, username: true } } } },
  addedBy: { select: { id: true, username: true } },
}

export const watchedMovieInclude = {
  watchedVotes:     { include: { user: { select: { id: true, username: true } } } },
  watchedReactions: { include: { user: { select: { id: true, username: true } } } },
  addedBy:          { select: { id: true, username: true } },
}

export function formatMovie(movie, userId) {
  const netVotes = movie.votes.reduce((sum, v) => sum + v.value, 0)
  const userVote = userId ? (movie.votes.find((v) => v.userId === userId)?.value ?? 0) : 0
  const lastVotedAt =
    movie.votes.length > 0
      ? new Date(
          Math.max(...movie.votes.map((v) => new Date(v.createdAt).getTime()))
        ).toISOString()
      : null
  const upvoters = movie.votes.filter((v) => v.value === 1).map((v) => v.user?.username).filter(Boolean)
  const downvoters = movie.votes.filter((v) => v.value === -1).map((v) => v.user?.username).filter(Boolean)
  const { votes, ...rest } = movie
  return {
    ...rest,
    genres: JSON.parse(rest.genres || '[]'),
    streamingPlatforms: JSON.parse(rest.streamingPlatforms || '[]'),
    streamingInfo: JSON.parse(rest.streamingInfo || '[]'),
    netVotes,
    userVote,
    lastVotedAt,
    upvoters,
    downvoters,
  }
}

export function formatWatchedMovie(movie, userId) {
  const up = movie.watchedVotes.filter((v) => v.vote === 'UP')
  const down = movie.watchedVotes.filter((v) => v.vote === 'DOWN')
  const userWatchedVote = movie.watchedVotes.find((v) => v.userId === userId)?.vote ?? null
  const reactions = movie.watchedReactions ?? []
  const { watchedVotes, watchedReactions, votes, ...rest } = movie
  return {
    ...rest,
    genres: JSON.parse(rest.genres || '[]'),
    streamingPlatforms: JSON.parse(rest.streamingPlatforms || '[]'),
    thumbsUp: up.map((v) => v.user.username),
    thumbsDown: down.map((v) => v.user.username),
    userWatchedVote,
    reactions: reactions.map((r) => ({
      userId: r.userId,
      username: r.user.username,
      text: r.text,
      vote: movie.watchedVotes.find((v) => v.userId === r.userId)?.vote ?? null,
    })),
    userReaction: reactions.find((r) => r.userId === userId)?.text ?? null,
  }
}
