const COMMUNITY_STORAGE_KEY = 'smartmobile_community_posts_v1'
const COMMUNITY_GUEST_KEY = 'smartmobile_community_guest_id'

const seedPosts = [
  {
    id: 'post-seed-1',
    title: 'Nên chọn iPhone 15 hay Galaxy S24 cho quay video?',
    content: 'Mình hay quay TikTok và vlog ngắn, cần máy chống rung tốt, pin ổn. Mọi người đang dùng thấy con nào ổn hơn về màu sắc và chống rung?',
    topic: 'Tư vấn mua máy',
    createdAt: '2026-04-05T08:30:00.000Z',
    author: {
      name: 'Trần Minh Khánh',
      role: 'customer',
      email: 'khanh.user@example.com',
    },
    likes: ['user:customer@smartmobile.vn'],
    comments: [
      {
        id: 'comment-seed-1-1',
        content: 'Nếu quay video nhiều thì iPhone 15 vẫn ổn định hơn. Nhưng ảnh tele thì S24 khá mạnh.',
        createdAt: '2026-04-05T09:00:00.000Z',
        author: {
          name: 'Nguyễn Hoàng Long',
          role: 'customer',
          email: 'long.user@example.com',
        },
      },
    ],
  },
  {
    id: 'post-seed-2',
    title: 'Có ai dùng Redmi Note 14 Pro để học online chưa?',
    content: 'Mình cần máy dưới 9 triệu để học online, pin trâu và loa to. Redmi Note 14 Pro có ổn cho nhu cầu Teams/Zoom không?',
    topic: 'Trải nghiệm thực tế',
    createdAt: '2026-04-03T13:10:00.000Z',
    author: {
      name: 'Lê Thùy An',
      role: 'customer',
      email: 'an.user@example.com',
    },
    likes: ['guest:device-seed'],
    comments: [
      {
        id: 'comment-seed-2-1',
        content: 'Mình đang dùng, pin khá tốt. Tầm 1 ngày rưỡi nếu dùng vừa phải, học online ổn nhé.',
        createdAt: '2026-04-03T15:25:00.000Z',
        author: {
          name: 'Phạm Anh Duy',
          role: 'customer',
          email: 'duy.user@example.com',
        },
      },
    ],
  },
]

function safeParse(raw, fallback) {
  try {
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase()
}

function createId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function getGuestDeviceId() {
  if (typeof window === 'undefined') return 'device-ssr'

  const existing = window.localStorage.getItem(COMMUNITY_GUEST_KEY)
  if (existing) return existing

  const created = createId('device')
  window.localStorage.setItem(COMMUNITY_GUEST_KEY, created)
  return created
}

function getViewerKey(userEmail) {
  const normalized = normalizeEmail(userEmail)
  if (normalized) {
    return `user:${normalized}`
  }
  return `guest:${getGuestDeviceId()}`
}

function sortPosts(posts) {
  return [...posts].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}

function readPosts() {
  if (typeof window === 'undefined') return seedPosts

  const stored = safeParse(window.localStorage.getItem(COMMUNITY_STORAGE_KEY), null)
  if (!Array.isArray(stored) || !stored.length) {
    window.localStorage.setItem(COMMUNITY_STORAGE_KEY, JSON.stringify(seedPosts))
    return sortPosts(seedPosts)
  }

  return sortPosts(stored)
}

function writePosts(posts) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(COMMUNITY_STORAGE_KEY, JSON.stringify(posts))
  window.dispatchEvent(new Event('smartmobile-community-change'))
}

export function getDiscussionPosts() {
  return readPosts()
}

export function addDiscussionPost(payload) {
  const title = String(payload?.title || '').trim()
  const content = String(payload?.content || '').trim()
  const topic = String(payload?.topic || 'Khác').trim()

  if (!title || !content) {
    throw new Error('Vui lòng nhập tiêu đề và nội dung bài viết.')
  }

  const authorName = String(payload?.author?.name || 'Khách vãng lai').trim()
  const authorEmail = normalizeEmail(payload?.author?.email)
  const role = String(payload?.author?.role || 'guest')

  const post = {
    id: createId('post'),
    title,
    content,
    topic,
    createdAt: new Date().toISOString(),
    author: {
      name: authorName || 'Khách vãng lai',
      email: authorEmail,
      role,
    },
    likes: [],
    comments: [],
  }

  const posts = readPosts()
  const next = [post, ...posts]
  writePosts(next)

  return post
}

export function addDiscussionComment(postId, payload) {
  const content = String(payload?.content || '').trim()
  if (!content) {
    throw new Error('Nội dung bình luận không được để trống.')
  }

  const authorName = String(payload?.author?.name || 'Khách vãng lai').trim()
  const authorEmail = normalizeEmail(payload?.author?.email)
  const role = String(payload?.author?.role || 'guest')

  const posts = readPosts()
  const next = posts.map(post => {
    if (post.id !== postId) return post

    const comments = Array.isArray(post.comments) ? post.comments : []
    return {
      ...post,
      comments: [
        {
          id: createId('comment'),
          content,
          createdAt: new Date().toISOString(),
          author: {
            name: authorName || 'Khách vãng lai',
            email: authorEmail,
            role,
          },
        },
        ...comments,
      ],
    }
  })

  writePosts(next)
  return sortPosts(next)
}

export function toggleDiscussionLike(postId, userEmail) {
  const viewerKey = getViewerKey(userEmail)

  const posts = readPosts()
  const next = posts.map(post => {
    if (post.id !== postId) return post

    const likes = Array.isArray(post.likes) ? post.likes : []
    const alreadyLiked = likes.includes(viewerKey)

    return {
      ...post,
      likes: alreadyLiked ? likes.filter(item => item !== viewerKey) : [...likes, viewerKey],
    }
  })

  writePosts(next)
  return sortPosts(next)
}

export function hasUserLikedPost(post, userEmail) {
  const viewerKey = getViewerKey(userEmail)
  const likes = Array.isArray(post?.likes) ? post.likes : []
  return likes.includes(viewerKey)
}

export function useCommunitySync(setState) {
  if (typeof window === 'undefined') return () => {}

  const sync = () => setState(readPosts())
  const handler = () => sync()

  window.addEventListener('smartmobile-community-change', handler)
  window.addEventListener('smartmobile-session-change', handler)
  window.addEventListener('storage', handler)

  return () => {
    window.removeEventListener('smartmobile-community-change', handler)
    window.removeEventListener('smartmobile-session-change', handler)
    window.removeEventListener('storage', handler)
  }
}
