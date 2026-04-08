import { useEffect, useMemo, useState } from 'react'
import { MessageCircle, Heart, PlusCircle, Send, Clock3, Users2, Flame, Filter } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import {
  addDiscussionComment,
  addDiscussionPost,
  getDiscussionPosts,
  hasUserLikedPost,
  toggleDiscussionLike,
  useCommunitySync,
} from '../../store/communityStore.js'
import { COMMUNITY_TOPICS } from '../../features/community/community.constants.js'
import { formatRelativeTime, getCommunityStats, getHotTopics, scoreHot } from '../../features/community/community.utils.js'
import CommunityHero from '../../features/community/components/CommunityHero.jsx'

export default function Community() {
  const { user } = useAuth()
  const [posts, setPosts] = useState(() => getDiscussionPosts())
  const [activeTopic, setActiveTopic] = useState('Tất cả')
  const [sortBy, setSortBy] = useState('newest')
  const [newPost, setNewPost] = useState({ title: '', content: '', topic: 'Tư vấn mua máy' })
  const [commentDrafts, setCommentDrafts] = useState({})
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    setPosts(getDiscussionPosts())
    return useCommunitySync(setPosts)
  }, [])

  // Sorting and filtering are computed, so UI stays reactive without manual refresh logic.
  const visiblePosts = useMemo(() => {
    const filtered = posts.filter(post => activeTopic === 'Tất cả' || post.topic === activeTopic)

    if (sortBy === 'hot') {
      return [...filtered].sort((a, b) => scoreHot(b) - scoreHot(a))
    }

    return [...filtered].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }, [posts, activeTopic, sortBy])

  const stats = useMemo(() => getCommunityStats(posts), [posts])
  const hotTopics = useMemo(() => getHotTopics(posts), [posts])

  const handlePostSubmit = (event) => {
    event.preventDefault()
    setNotice('')
    setError('')

    try {
      addDiscussionPost({
        ...newPost,
        author: {
          name: user?.name || 'Khách vãng lai',
          email: user?.email || '',
          role: user?.role || 'guest',
        },
      })

      setNewPost({ title: '', content: '', topic: newPost.topic })
      setNotice('Đăng bài thành công. Bài viết của bạn đã xuất hiện trong cộng đồng.')
    } catch (submitError) {
      setError(submitError.message || 'Không thể đăng bài. Vui lòng thử lại.')
    }
  }

  const handleLike = (postId) => {
    setPosts(toggleDiscussionLike(postId, user?.email))
  }

  const handleCommentSubmit = (event, postId) => {
    event.preventDefault()

    const draft = String(commentDrafts[postId] || '').trim()
    if (!draft) return

    setNotice('')
    setError('')

    try {
      setPosts(addDiscussionComment(postId, {
        content: draft,
        author: {
          name: user?.name || 'Khách vãng lai',
          email: user?.email || '',
          role: user?.role || 'guest',
        },
      }))

      setCommentDrafts(prev => ({ ...prev, [postId]: '' }))
    } catch (submitError) {
      setError(submitError.message || 'Không thể gửi bình luận.')
    }
  }

  return (
    <div className="min-h-screen retail-bg px-4 py-8">
      <div className="mx-auto max-w-7xl">
        <CommunityHero stats={stats} user={user} />

        <section className="mt-6 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
          <div className="space-y-4">
            <div className="retail-card rounded-3xl p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap gap-2">
                  {COMMUNITY_TOPICS.map(topic => (
                    <button
                      key={topic}
                      type="button"
                      onClick={() => setActiveTopic(topic)}
                      className={`rounded-full px-4 py-2 text-sm font-semibold transition-all ${activeTopic === topic ? 'bg-[#2563eb] text-white shadow-lg shadow-blue-500/25' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                    >
                      {topic}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <Filter size={16} className="text-slate-500" />
                  <select
                    value={sortBy}
                    onChange={event => setSortBy(event.target.value)}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 outline-none focus:border-[#2563eb]"
                  >
                    <option value="newest">Mới nhất</option>
                    <option value="hot">Nổi bật</option>
                  </select>
                </div>
              </div>
            </div>

            {notice && (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
                {notice}
              </div>
            )}

            {error && (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
                {error}
              </div>
            )}

            <div className="space-y-4">
              {visiblePosts.map(post => {
                const likes = Array.isArray(post.likes) ? post.likes.length : 0
                const comments = Array.isArray(post.comments) ? post.comments : []
                const liked = hasUserLikedPost(post, user?.email)

                return (
                  <article key={post.id} className="retail-card rounded-3xl p-5 retail-card-hover">
                    <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                      <span className="rounded-full bg-[#eff6ff] px-3 py-1 text-[#2563eb]">{post.topic}</span>
                      <span className="inline-flex items-center gap-1 text-slate-500">
                        <Clock3 size={13} />
                        {formatRelativeTime(post.createdAt)}
                      </span>
                    </div>

                    <h2 className="mt-3 text-xl font-bold text-slate-900">{post.title}</h2>
                    <p className="mt-2 text-sm leading-7 text-slate-600">{post.content}</p>

                    <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                      <p className="text-xs text-slate-500">
                        Đăng bởi <span className="font-semibold text-slate-700">{post.author?.name || 'Khách vãng lai'}</span>
                      </p>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => handleLike(post.id)}
                          className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-sm font-semibold transition-colors ${liked ? 'border-rose-200 bg-rose-50 text-rose-600' : 'border-slate-200 bg-white text-slate-600 hover:border-[#2563eb] hover:text-[#2563eb]'}`}
                        >
                          <Heart size={15} className={liked ? 'fill-rose-500 text-rose-500' : ''} />
                          {likes}
                        </button>
                        <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-600">
                          <MessageCircle size={15} />
                          {comments.length}
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-3">
                      <form onSubmit={event => handleCommentSubmit(event, post.id)} className="flex gap-2">
                        <input
                          value={commentDrafts[post.id] || ''}
                          onChange={event => setCommentDrafts(prev => ({ ...prev, [post.id]: event.target.value }))}
                          placeholder="Viết bình luận của bạn..."
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 outline-none focus:border-[#2563eb]"
                        />
                        <button type="submit" className="btn-retail inline-flex items-center gap-1 rounded-xl px-3 py-2 text-sm font-semibold text-white">
                          <Send size={14} />
                          Gửi
                        </button>
                      </form>

                      <div className="mt-3 space-y-2">
                        {comments.slice(0, 3).map(comment => (
                          <div key={comment.id} className="rounded-xl bg-slate-50 px-3 py-2">
                            <p className="text-xs text-slate-500">
                              <span className="font-semibold text-slate-700">{comment.author?.name || 'Khách vãng lai'}</span>
                              {' • '}
                              {formatRelativeTime(comment.createdAt)}
                            </p>
                            <p className="mt-1 text-sm text-slate-700">{comment.content}</p>
                          </div>
                        ))}
                        {comments.length > 3 && (
                          <p className="text-xs text-slate-500">+ {comments.length - 3} bình luận khác</p>
                        )}
                      </div>
                    </div>
                  </article>
                )
              })}

              {!visiblePosts.length && (
                <div className="retail-card rounded-3xl p-10 text-center">
                  <MessageCircle size={36} className="mx-auto text-slate-400" />
                  <h3 className="mt-3 text-lg font-bold text-slate-800">Chưa có bài viết phù hợp</h3>
                  <p className="mt-1 text-sm text-slate-500">Hãy thử đổi bộ lọc hoặc đăng câu hỏi đầu tiên của bạn.</p>
                </div>
              )}
            </div>
          </div>

          <aside className="space-y-4">
            <form onSubmit={handlePostSubmit} className="retail-card rounded-3xl p-5">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Tạo bài viết mới</p>
              <h3 className="mt-1 text-xl font-bold text-slate-900">Bạn đang quan tâm điều gì?</h3>

              <label className="mt-4 block text-sm font-semibold text-slate-700">Chủ đề</label>
              <select
                value={newPost.topic}
                onChange={event => setNewPost(prev => ({ ...prev, topic: event.target.value }))}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 outline-none focus:border-[#2563eb]"
              >
                {COMMUNITY_TOPICS.filter(item => item !== 'Tất cả').map(item => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>

              <label className="mt-4 block text-sm font-semibold text-slate-700">Tiêu đề</label>
              <input
                value={newPost.title}
                onChange={event => setNewPost(prev => ({ ...prev, title: event.target.value }))}
                placeholder="Ví dụ: Xin tư vấn điện thoại chụp ảnh đêm"
                className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 outline-none focus:border-[#2563eb]"
              />

              <label className="mt-4 block text-sm font-semibold text-slate-700">Nội dung</label>
              <textarea
                value={newPost.content}
                onChange={event => setNewPost(prev => ({ ...prev, content: event.target.value }))}
                placeholder="Mô tả rõ nhu cầu hoặc chia sẻ trải nghiệm của bạn..."
                rows={5}
                className="mt-2 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 outline-none focus:border-[#2563eb]"
              />

              <button type="submit" className="btn-retail mt-4 inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white">
                <PlusCircle size={16} />
                Đăng thảo luận
              </button>
            </form>

            <div className="retail-card rounded-3xl p-5">
              <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.24em] text-slate-500">
                <Flame size={14} />
                Chủ đề nổi bật
              </p>
              <div className="mt-3 space-y-2">
                {hotTopics.map(([topic, count]) => (
                  <button
                    key={topic}
                    type="button"
                    onClick={() => setActiveTopic(topic)}
                    className="flex w-full items-center justify-between rounded-2xl bg-slate-50 px-4 py-3 text-left transition-all hover:bg-slate-100"
                  >
                    <span className="text-sm font-semibold text-slate-700">{topic}</span>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-[#2563eb]">{count}</span>
                  </button>
                ))}
                {!hotTopics.length && (
                  <p className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-500">Chưa có dữ liệu chủ đề.</p>
                )}
              </div>
            </div>

            <div className="retail-card rounded-3xl p-5">
              <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.24em] text-slate-500">
                <Users2 size={14} />
                Gợi ý nhanh
              </p>
              <div className="mt-3 space-y-2 text-sm text-slate-600">
                <p className="rounded-xl bg-slate-50 px-3 py-2">Nêu ngân sách, nhu cầu chụp ảnh, chơi game hoặc pin để được tư vấn sát nhất.</p>
                <p className="rounded-xl bg-slate-50 px-3 py-2">Nếu đã mua máy, chia sẻ ưu nhược điểm thực tế để giúp người mới chọn đúng hơn.</p>
              </div>
            </div>
          </aside>
        </section>
      </div>
    </div>
  )
}
