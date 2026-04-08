/**
 * Convert ISO date to relative text in Vietnamese.
 * This keeps feed timestamps compact and easy to scan.
 */
export function formatRelativeTime(isoDate) {
  const target = new Date(isoDate).getTime()
  if (!target) return 'Vừa xong'

  const diffMs = target - Date.now()
  const minute = 60 * 1000
  const hour = 60 * minute
  const day = 24 * hour

  const rtf = new Intl.RelativeTimeFormat('vi', { numeric: 'auto' })

  if (Math.abs(diffMs) < hour) {
    return rtf.format(Math.round(diffMs / minute), 'minute')
  }

  if (Math.abs(diffMs) < day) {
    return rtf.format(Math.round(diffMs / hour), 'hour')
  }

  return rtf.format(Math.round(diffMs / day), 'day')
}

/**
 * Simple hot score to prioritize posts with strong engagement and recency.
 */
export function scoreHot(post) {
  const likeCount = Array.isArray(post.likes) ? post.likes.length : 0
  const commentCount = Array.isArray(post.comments) ? post.comments.length : 0
  const ageHours = Math.max(1, (Date.now() - new Date(post.createdAt).getTime()) / (1000 * 60 * 60))
  return (likeCount * 2 + commentCount * 3 + 5) / Math.pow(ageHours, 0.35)
}

export function getCommunityStats(posts) {
  const postCount = posts.length
  const commentCount = posts.reduce((total, post) => total + (Array.isArray(post.comments) ? post.comments.length : 0), 0)
  const activeUsers = new Set(posts.map(post => post.author?.email || post.author?.name).filter(Boolean)).size

  return { postCount, commentCount, activeUsers }
}

export function getHotTopics(posts) {
  const counts = posts.reduce((acc, post) => {
    acc[post.topic] = (acc[post.topic] || 0) + 1
    return acc
  }, {})

  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
}
