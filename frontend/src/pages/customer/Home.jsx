import { useState, useEffect, useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Star, ShoppingCart, Search, Zap, Shield, Truck, Bot, ChevronRight, Users2, MessageCircle } from 'lucide-react'
import { fetchProducts } from '../../services/api.js'
import { addToCart } from '../../store/cartStore.js'
import { getDiscussionPosts, useCommunitySync } from '../../store/communityStore.js'
import { useAuth } from '../../context/AuthContext'
import { formatRelativeTime, getCommunityStats, getHotTopics } from '../../features/community/community.utils.js'

const categories = ['Tất cả', 'Điện thoại', 'Laptop']
const fallbackPhoneBrands = ['Apple', 'Samsung', 'Google', 'Xiaomi', 'OPPO', 'OnePlus']
const fallbackLaptopBrands = ['Apple', 'ASUS', 'Acer', 'Dell', 'HP', 'Lenovo', 'MSI']

function formatPrice(n) {
  return Number(n || 0).toLocaleString('vi-VN') + ' VND'
}

const backendOrigin = (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3001/api').replace(/\/api\/?$/, '')

function toProxyImageUrl(url) {
  if (!url) return ''
  return `${backendOrigin}/api/proxy-image?url=${encodeURIComponent(url)}`
}

function isLaptopProduct(product) {
  const text = `${product?.category || ''} ${product?.name || ''} ${product?.brand || ''}`.toLowerCase()
  return text.includes('laptop') || text.includes('macbook') || text.includes('vivobook') || text.includes('zenbook') || text.includes('thinkpad') || text.includes('ideapad') || text.includes('loq') || text.includes('victus') || text.includes('pavilion') || text.includes('inspiron') || text.includes('probook') || text.includes('elitebook') || text.includes('aspire') || text.includes('swift') || text.includes('modern') || text.includes('gram') || text.includes('nitro') || text.includes('rog') || text.includes('gaming')
}

function getProductTypeLabel(product) {
  return isLaptopProduct(product) ? 'Laptop' : 'Điện thoại'
}

function getEmoji(brand, product) {
  if (isLaptopProduct(product)) return '💻'
  const brandMap = {
    Apple: '🍎',
    Samsung: '📱',
    Google: '🔵',
    Xiaomi: '🟠',
    OPPO: '🟢',
    OnePlus: '⚫',
    Sony: '🎧',
    Bose: '🎵',
  }
  return brandMap[brand] || '📱'
}

function getQuickFacts(product) {
  const ram = product?.ram || product?.specs?.['Dung lượng RAM'] || product?.specs?.RAM || product?.specs?.['Loại RAM'] || 'N/A'
  const rom = product?.rom || product?.specs?.['Bộ nhớ trong'] || product?.specs?.['Bộ nhớ'] || product?.specs?.['Ổ cứng'] || 'N/A'
  const battery = product?.battery || product?.specs?.Pin || 'N/A'

  if (isLaptopProduct(product)) {
    return [ram, rom, battery].filter(item => item && item !== 'N/A')
  }

  return [
    ram !== 'N/A' ? `RAM ${ram}` : null,
    rom !== 'N/A' ? `ROM ${rom}` : null,
    battery !== 'N/A' ? `Pin ${battery}` : null,
  ].filter(Boolean)
}

function sortProducts(a, b) {
  const ratingDelta = Number(b.rating ?? 0) - Number(a.rating ?? 0)
  if (ratingDelta !== 0) return ratingDelta

  const reviewDelta = Number(b.review_count ?? 0) - Number(a.review_count ?? 0)
  if (reviewDelta !== 0) return reviewDelta

  return Number(a.price ?? 0) - Number(b.price ?? 0)
}

export default function Home() {
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [query, setQuery] = useState(searchParams.get('q') ?? '')
  const [brand, setBrand] = useState('Tất cả')
  const [category, setCategory] = useState('Tất cả')
  const [products, setProducts] = useState([])
  const [communityPosts, setCommunityPosts] = useState(() => getDiscussionPosts())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setQuery(searchParams.get('q') ?? '')
  }, [searchParams])

  useEffect(() => {
    const loadProducts = async () => {
      try {
        const data = await fetchProducts({ limit: 100 })
        setProducts(data || [])
      } catch (error) {
        console.error('Failed to load products:', error)
      } finally {
        setLoading(false)
      }
    }
    loadProducts()
  }, [])

  useEffect(() => {
    setCommunityPosts(getDiscussionPosts())
    return useCommunitySync(setCommunityPosts)
  }, [])

  const derivedStats = useMemo(() => {
    const phones = products.filter(product => !isLaptopProduct(product)).length
    const laptops = products.filter(product => isLaptopProduct(product)).length
    const apple = products.filter(product => product.brand === 'Apple').length
    const samsung = products.filter(product => product.brand === 'Samsung').length
    return { phones, laptops, apple, samsung, total: products.length }
  }, [products])

  const allBrands = useMemo(() => {
    return [...new Set(
      products
        .map(product => String(product?.brand || '').trim())
        .filter(Boolean)
    )].sort((a, b) => a.localeCompare(b, 'vi'))
  }, [products])

  const phoneBrands = useMemo(() => {
    const dynamicPhoneBrands = [...new Set(
      products
        .filter(product => !isLaptopProduct(product))
        .map(product => String(product?.brand || '').trim())
        .filter(Boolean)
    )]

    return (dynamicPhoneBrands.length ? dynamicPhoneBrands : fallbackPhoneBrands)
      .slice()
      .sort((a, b) => a.localeCompare(b, 'vi'))
  }, [products])

  const laptopBrands = useMemo(() => {
    const dynamicLaptopBrands = [...new Set(
      products
        .filter(product => isLaptopProduct(product))
        .map(product => String(product?.brand || '').trim())
        .filter(Boolean)
    )]

    return (dynamicLaptopBrands.length ? dynamicLaptopBrands : fallbackLaptopBrands)
      .slice()
      .sort((a, b) => a.localeCompare(b, 'vi'))
  }, [products])

  const visibleBrands = useMemo(() => {
    if (category === 'Điện thoại') {
      return ['Tất cả', ...phoneBrands]
    }
    if (category === 'Laptop') {
      return ['Tất cả', ...laptopBrands]
    }
    return ['Tất cả', ...allBrands]
  }, [category, phoneBrands, laptopBrands, allBrands])

  useEffect(() => {
    if (!visibleBrands.includes(brand)) {
      setBrand('Tất cả')
    }
  }, [brand, visibleBrands])

  const filtered = useMemo(() => products.filter(product => {
    const matchBrand = brand === 'Tất cả' || product.brand === brand
    const matchCategory = category === 'Tất cả' || (category === 'Laptop' ? isLaptopProduct(product) : !isLaptopProduct(product))
    const searchableText = [product.name, product.brand, product.description, ...(product.specs ? Object.entries(product.specs).flat() : [])]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
    const matchQuery = !query.trim() || searchableText.includes(query.toLowerCase())
    return matchBrand && matchCategory && matchQuery
  }), [brand, category, products, query])

  const sortedProducts = useMemo(() => [...filtered].sort(sortProducts), [filtered])
  const visiblePhones = useMemo(() => sortedProducts.filter(product => !isLaptopProduct(product)), [sortedProducts])
  const visibleLaptops = useMemo(() => sortedProducts.filter(product => isLaptopProduct(product)), [sortedProducts])
  const communityStats = useMemo(() => getCommunityStats(communityPosts), [communityPosts])
  const communityHotTopics = useMemo(() => getHotTopics(communityPosts).slice(0, 3), [communityPosts])
  const communityHighlights = useMemo(() => communityPosts.slice(0, 3), [communityPosts])
  const heroProduct = sortedProducts[0] || products[0] || null
  const promoProducts = sortedProducts.slice(0, 4)
  const hasFilters = Boolean(query.trim()) || brand !== 'Tất cả' || category !== 'Tất cả'

  const submitSearch = (event) => {
    event.preventDefault()
    const trimmedQuery = query.trim()
    setSearchParams(trimmedQuery ? { q: trimmedQuery } : {})
    document.getElementById('product-list')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const clearSearch = () => {
    setQuery('')
    setSearchParams({})
  }

  const heroQuickFacts = heroProduct ? getQuickFacts(heroProduct).slice(0, 3) : []
  const heroRating = Number(heroProduct?.rating ?? 0)
  const heroReviewCount = Number(heroProduct?.review_count ?? (Array.isArray(heroProduct?.reviews) ? heroProduct.reviews.length : 0))
  const heroImage = heroProduct?.image_url || ''
  const heroEmoji = heroProduct ? getEmoji(heroProduct.brand, heroProduct) : '📱'

  return (
    <div className="min-h-screen retail-bg text-slate-900">
      <section className="max-w-7xl mx-auto px-4 pt-6">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">

          <div className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-[#2563eb] via-[#3b82f6] to-[#93c5fd] p-6 force-white shadow-[0_24px_70px_rgba(37,99,235,0.28)]">
            <div className="absolute -left-16 top-0 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
            <div className="absolute -bottom-24 right-0 h-64 w-64 rounded-full bg-white/10 blur-3xl" />

            <div className="relative z-10 grid gap-8 xl:grid-cols-[minmax(0,1fr)_280px] xl:items-center">
              <div>
                <h1 className="mt-5 max-w-2xl text-3xl font-black leading-tight sm:text-4xl xl:text-5xl">
                  Sắm công nghệ xịn, giá tốt mỗi ngày.
                </h1>
                <p className="mt-4 max-w-xl text-base leading-7 text-white/85 md:text-lg">
                  Tìm nhanh điện thoại, laptop và phụ kiện theo nhu cầu. Gợi ý thông minh, xem đánh giá thật và mua sắm trong vài cú chạm.
                </p>

                <form onSubmit={submitSearch} className="mt-6 flex flex-col gap-3 sm:flex-row">
                  <div className="relative flex-1">
                    <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Tìm iPhone, Samsung, laptop..."
                      value={query}
                      onChange={e => setQuery(e.target.value)}
                      className="w-full rounded-2xl border border-white/20 bg-white px-12 py-4 text-sm font-medium text-slate-900 placeholder-slate-400 shadow-lg outline-none transition-colors focus:border-white/60"
                    />
                  </div>
                  <button type="submit" className="btn-retail rounded-2xl px-6 py-4 text-sm font-bold text-white">
                    Tìm kiếm
                  </button>
                </form>

                <div className="mt-6 flex flex-wrap gap-3 text-sm">
                  <button type="button" onClick={submitSearch} className="rounded-full bg-white/15 px-4 py-2 font-semibold text-white backdrop-blur hover:bg-white/20">
                    Xem khuyến mãi
                  </button>
                  <button type="button" onClick={clearSearch} className="rounded-full border border-white/25 px-4 py-2 font-semibold text-white/90 hover:bg-white/10">
                    Xóa tìm kiếm
                  </button>
                </div>

                <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {[
                    { label: 'Sản phẩm', value: `${derivedStats.total}+` },
                    { label: 'Điện thoại', value: `${derivedStats.phones}+` },
                    { label: 'Laptop', value: `${derivedStats.laptops}+` },
                    { label: 'Thương hiệu', value: `${allBrands.length}+` },
                  ].map(item => (
                    <div key={item.label} className="rounded-2xl bg-white/14 px-4 py-3 backdrop-blur">
                      <p className="text-2xl font-black">{item.value}</p>
                      <p className="text-xs uppercase tracking-[0.22em] text-white/70">{item.label}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="relative mx-auto w-full max-w-sm">
                <div className="absolute inset-x-8 top-8 h-52 rounded-[32px] bg-white/20 blur-2xl" />
                <div className="relative overflow-hidden rounded-[32px] bg-white p-4 text-slate-900 shadow-2xl">
                  <div className="rounded-[28px] bg-gradient-to-br from-slate-50 to-slate-100 p-4">
                    <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                      <span>{heroProduct ? getProductTypeLabel(heroProduct) : 'Sản phẩm hot'}</span>
                      <span className="rounded-full bg-[#2563eb] px-3 py-1 force-white">Hot deal</span>
                    </div>
                    <div className="mt-4 flex min-h-[260px] items-center justify-center overflow-hidden rounded-[28px] bg-white">
                      {heroImage ? (
                        <img
                          src={heroImage}
                          alt={heroProduct?.name || 'Sản phẩm nổi bật'}
                          className="h-full w-full object-contain p-3"
                        />
                      ) : (
                        <span className="text-8xl">{heroEmoji}</span>
                      )}
                    </div>
                    <div className="mt-4 space-y-3 rounded-[24px] bg-white p-4 shadow-sm">
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Gợi ý nổi bật</p>
                        <p className="mt-1 text-lg font-bold text-slate-900">{heroProduct?.name || 'Chọn máy hợp nhu cầu'}</p>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <div className="flex gap-0.5">
                          {[...Array(5)].map((_, index) => (
                            <Star key={index} size={14} className={index < Math.floor(heroRating) ? 'fill-yellow-400 text-yellow-400' : 'text-slate-300'} />
                          ))}
                        </div>
                        <span>{heroRating.toFixed(1)}</span>
                        <span>({heroReviewCount} đánh giá)</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {heroQuickFacts.map(fact => (
                          <div key={fact} className="rounded-2xl bg-slate-50 px-3 py-2 text-center text-xs font-semibold text-slate-700">
                            {fact}
                          </div>
                        ))}
                      </div>
                      <div className="flex items-center justify-between rounded-2xl bg-[#eff6ff] px-4 py-3">
                        <div>
                          <p className="text-[11px] uppercase tracking-[0.24em] text-[#2563eb]">Giá bán</p>
                          <p className="text-lg font-black text-[#2563eb]">{heroProduct ? formatPrice(heroProduct.price) : 'Liên hệ'}</p>
                        </div>
                        <ChevronRight size={18} className="text-[#2563eb]" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <aside className="retail-card rounded-[28px] p-5">
            <div className="rounded-[24px] bg-slate-950 px-5 py-4 force-white">
              <p className="text-xs uppercase tracking-[0.24em] text-white/60">Tài khoản</p>
              <h3 className="mt-1 text-lg font-bold">{user ? `Xin chào, ${user.name}` : 'Chào mừng bạn quay lại'}</h3>
              <p className="mt-2 text-sm text-white/70">
                {user ? 'Xem đơn hàng, tiếp tục thanh toán hoặc quản lý tài khoản của bạn.' : 'Đăng nhập để theo dõi đơn hàng và nhận ưu đãi cá nhân hóa.'}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {user ? (
                  <Link to="/orders" className="btn-retail rounded-xl px-4 py-2 text-sm font-semibold text-white">
                    Xem đơn hàng
                  </Link>
                ) : (
                  <Link to="/login" className="btn-retail rounded-xl px-4 py-2 text-sm font-semibold text-white">
                    Đăng nhập ngay
                  </Link>
                )}
                <Link to="/cart" className="rounded-xl border border-white/15 px-4 py-2 text-sm font-semibold text-white/90 hover:bg-white/10">
                  Giỏ hàng
                </Link>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {[
                { title: 'Trả góp 0%', desc: 'Duyệt nhanh, hồ sơ gọn.' },
                { title: 'Thu cũ đổi mới', desc: 'Lên đời máy tiết kiệm hơn.' },
                { title: 'Giao siêu tốc', desc: 'Nhận hàng trong 2-4 giờ.' },
              ].map(item => (
                <div key={item.title} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                  <p className="text-xs text-slate-500">{item.desc}</p>
                </div>
              ))}
            </div>

            <div className="mt-4 rounded-[24px] bg-[#eff6ff] p-4">
              <div className="flex items-center gap-2 text-[#2563eb]">
                <Bot size={16} />
                <p className="text-xs font-semibold uppercase tracking-[0.24em]">AI tư vấn</p>
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-700">
                Gõ nhu cầu hoặc ngân sách vào thanh tìm kiếm để nhận gợi ý sản phẩm phù hợp nhất.
              </p>
            </div>
          </aside>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[
            { icon: Shield, title: 'Hàng chính hãng', desc: 'Bảo hành rõ ràng, nguồn gốc minh bạch.' },
            { icon: Truck, title: 'Giao nhanh', desc: 'Hỗ trợ giao trong ngày ở khu vực lớn.' },
            { icon: Bot, title: 'Tư vấn AI', desc: 'Gợi ý máy phù hợp theo nhu cầu thực tế.' },
            { icon: Users2, title: 'Cộng đồng', desc: 'Trao đổi trải nghiệm, mẹo dùng máy.' },
          ].map(item => (
            <div key={item.title} className="retail-card retail-card-hover rounded-[24px] p-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#eff6ff] text-[#2563eb]">
                <item.icon size={22} />
              </div>
              <h3 className="mt-4 text-base font-bold text-slate-900">{item.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-500">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="product-list" className="max-w-7xl mx-auto px-4 pb-16 pt-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
          </div>

          <div className="flex flex-wrap gap-2">
            {query.trim() && (
              <button onClick={clearSearch} className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:border-[#2563eb]/30 hover:text-[#2563eb]">
                Xóa tìm kiếm
              </button>
            )}
            {categories.map(item => {
              const categoryLabel = item === 'Tất cả' ? 'Tất cả loại' : item

              return (
                <button
                  key={item}
                  onClick={() => {
                    setCategory(item)
                    setBrand('Tất cả')
                  }}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition-all ${category === item ? 'bg-[#2563eb] force-white shadow-md' : 'border border-slate-200 bg-white text-slate-700 hover:border-[#2563eb]/30 hover:text-[#2563eb]'}`}
                >
                  {categoryLabel}
                </button>
              )
            })}
            {visibleBrands.map(item => {
              const brandLabel = item === 'Tất cả' ? 'Tất cả hãng' : item

              return (
                <button
                  key={item}
                  onClick={() => setBrand(item)}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition-all ${brand === item ? 'bg-slate-900 force-white shadow-md' : 'border border-slate-200 bg-white text-slate-700 hover:border-slate-400 hover:text-slate-900'}`}
                >
                  {brandLabel}
                </button>
              )
            })}
          </div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {promoProducts.map(product => (
            <div key={`promo-${product.id}`} className="retail-card rounded-[24px] p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#2563eb]">Gợi ý nhanh</p>
                <span className="rounded-full bg-[#eff6ff] px-3 py-1 text-xs font-semibold text-[#2563eb]">Hot</span>
              </div>
              <p className="mt-3 text-base font-bold text-slate-900">{product.name}</p>
              <p className="mt-2 text-sm text-slate-500">{getProductTypeLabel(product)} · {product.brand}</p>
              <p className="mt-4 text-2xl font-black text-[#2563eb]">{formatPrice(product.price)}</p>
              <Link to={`/product/${product.id}`} className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-slate-900 hover:text-[#2563eb]">
                Xem chi tiết <ChevronRight size={16} />
              </Link>
            </div>
          ))}
        </div>

        {loading ? (
          <div className="mt-8 rounded-[28px] border border-slate-200 bg-white p-12 text-center text-slate-500 shadow-sm">
            Đang tải sản phẩm...
          </div>
        ) : hasFilters ? (
          <div className="mt-8">
            {sortedProducts.length > 0 ? (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
                {sortedProducts.map(product => (
                  <ProductCard key={product.id} product={product} onAddToCart={addToCart} />
                ))}
              </div>
            ) : (
              <div className="mt-8 rounded-[28px] border border-slate-200 bg-white p-12 text-center text-slate-500 shadow-sm">
                Không tìm thấy sản phẩm phù hợp
              </div>
            )}
          </div>
        ) : (
          <>
            <section className="mt-10">
              <div className="mb-4 flex items-end justify-between gap-3">
                <div>
                  <p className="text-sm font-bold uppercase tracking-[0.24em] text-[#2563eb]">Điện thoại nổi bật</p>
                  <h3 className="mt-2 text-2xl font-black text-slate-900">Mẫu hot đang được quan tâm</h3>
                </div>
              </div>
              {visiblePhones.length > 0 ? (
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
                  {visiblePhones.map(product => (
                    <ProductCard key={product.id} product={product} onAddToCart={addToCart} />
                  ))}
                </div>
              ) : (
                <div className="rounded-[28px] border border-slate-200 bg-white p-10 text-center text-slate-500 shadow-sm">
                  Chưa có sản phẩm điện thoại phù hợp.
                </div>
              )}
            </section>

            <section className="mt-12">
              <div className="mb-4 flex items-end justify-between gap-3">
                <div>
                  <p className="text-sm font-bold uppercase tracking-[0.24em] text-[#2563eb]">Laptop mỏng nhẹ</p>
                  <h3 className="mt-2 text-2xl font-black text-slate-900">Gọn, đẹp và đủ mạnh</h3>
                </div>
              </div>
              {visibleLaptops.length > 0 ? (
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
                  {visibleLaptops.map(product => (
                    <ProductCard key={product.id} product={product} onAddToCart={addToCart} />
                  ))}
                </div>
              ) : (
                <div className="rounded-[28px] border border-slate-200 bg-white p-10 text-center text-slate-500 shadow-sm">
                  Chưa có sản phẩm laptop phù hợp.
                </div>
              )}
            </section>
          </>
        )}
      </section>
    </div>
  )
}

function ProductCard({ product: p, onAddToCart }) {
  const [imageFailed, setImageFailed] = useState(false)
  const [useProxy, setUseProxy] = useState(false)
  const colors = ['from-[#fff1f2] to-white', 'from-[#eff6ff] to-white', 'from-[#f0fdf4] to-white', 'from-[#fff7ed] to-white', 'from-[#faf5ff] to-white']
  const color = colors[p.id % colors.length]
  const rating = Number(p.rating ?? 0)
  const reviewCount = Number(p.review_count ?? (Array.isArray(p.reviews) ? p.reviews.length : 0))
  const emoji = getEmoji(p.brand, p)
  const imageSrc = !imageFailed ? (useProxy ? toProxyImageUrl(p.image_url) : (p.image_url || '')) : ''

  return (
    <div className="retail-card retail-card-hover group overflow-hidden rounded-[28px]">
      <div className={`relative flex h-56 items-center justify-center overflow-hidden bg-gradient-to-br ${color}`}>
        {imageSrc ? (
          <img
            src={imageSrc}
            alt={p.name}
            className="h-full w-full object-contain p-5 transition-transform duration-300 group-hover:scale-[1.05]"
            loading="lazy"
            onError={() => {
              if (!useProxy && p.image_url) {
                setUseProxy(true)
                return
              }
              setImageFailed(true)
            }}
          />
        ) : (
          <span className="text-8xl drop-shadow-sm">{emoji}</span>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-transparent" />
        <span className="absolute left-3 top-3 rounded-full bg-white/95 px-3 py-1 text-xs font-bold text-slate-700 shadow-sm">
          {p.brand}
        </span>
        <span className="absolute right-3 top-3 rounded-full bg-[#2563eb] px-3 py-1 text-xs font-bold force-white shadow-sm">
          {getProductTypeLabel(p)}
        </span>
      </div>

      <div className="p-5">
        <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#2563eb]">{p.brand}</p>
        <Link to={`/product/${p.id}`}>
          <h3 className="mt-2 text-lg font-bold leading-snug text-slate-900 transition-colors group-hover:text-[#2563eb]">
            {p.name}
          </h3>
        </Link>

        <div className="mt-3 flex items-center gap-1">
          {[...Array(5)].map((_, index) => (
            <Star key={index} size={12} className={index < Math.floor(rating) ? 'fill-yellow-400 text-yellow-400' : 'text-slate-300'} />
          ))}
          <span className="ml-1 text-xs font-semibold text-slate-600">{rating.toFixed(1)}</span>
          <span className="text-xs text-slate-400">({reviewCount})</span>
        </div>

        <div className="mt-4 flex items-end justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Giá bán</p>
            <p className="text-2xl font-black text-[#2563eb]">{formatPrice(p.price)}</p>
          </div>
          <div className="rounded-2xl bg-[#eff6ff] px-3 py-2 text-right">
            <p className="text-xs font-semibold text-[#2563eb]">{reviewCount} đánh giá</p>
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <button
            onClick={() => onAddToCart(p, 1)}
            className="flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 transition-all hover:border-[#2563eb]/25 hover:text-[#2563eb]"
          >
            <span className="flex items-center justify-center gap-2">
              <ShoppingCart size={16} /> Giỏ hàng
            </span>
          </button>
          <Link to={`/product/${p.id}`} className="flex-1 rounded-2xl btn-retail px-4 py-3 text-center text-sm font-semibold text-white">
            <span className="flex items-center justify-center gap-2">
              Xem chi tiết <ChevronRight size={14} />
            </span>
          </Link>
        </div>
      </div>
    </div>
  )
}
