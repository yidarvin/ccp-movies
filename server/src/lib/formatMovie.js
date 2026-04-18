export function formatMovie(movie, userId) {
  const netVotes = movie.votes.reduce((sum, v) => sum + v.value, 0)
  const userVote = userId ? (movie.votes.find((v) => v.userId === userId)?.value ?? 0) : 0
  const lastVotedAt =
    movie.votes.length > 0
      ? new Date(
          Math.max(...movie.votes.map((v) => new Date(v.createdAt).getTime()))
        ).toISOString()
      : null
  const { votes, ...rest } = movie
  return {
    ...rest,
    genres: JSON.parse(rest.genres || '[]'),
    streamingPlatforms: JSON.parse(rest.streamingPlatforms || '[]'),
    netVotes,
    userVote,
    lastVotedAt,
  }
}
