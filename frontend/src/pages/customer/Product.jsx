import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { Star, ShoppingCart, Zap, Shield, ChevronRight, Bot, ThumbsUp, ChevronDown, ChevronUp, ArrowLeft, Loader } from 'lucide-react'
import { fetchProduct } from '../../services/api.js'
import { addToCart } from '../../store/cartStore.js'

function formatPrice(n) {
  return n.toLocaleString('vi-VN') + ' VND'
}

const backendOrigin = (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3001/api').replace(/\/api\/?$/, '')

function toProxyImageUrl(url) {
  if (!url) return ''
  return `${backendOrigin}/api/proxy-image?url=${encodeURIComponent(url)}`
}

function getPhoneEmoji(brand) {
  const brandMap = {
    'Apple': '🍎',
    'Samsung': '📱',
    'Google': '🔵',
    'Xiaomi': '🟠',
    'OPPO': '🟢',
    'OnePlus': '⚫',
    'Sony': '🎧',
    'Bose': '🎵'
  }
  return brandMap[brand] || '📱'
}

function isLaptopProduct(product) {
  const text = `${product?.category || ''} ${product?.name || ''} ${product?.brand || ''}`.toLowerCase()
  return text.includes('laptop') || text.includes('macbook') || text.includes('vivobook') || text.includes('zenbook') || text.includes('thinkpad') || text.includes('ideapad') || text.includes('loq') || text.includes('victus') || text.includes('pavilion') || text.includes('inspiron') || text.includes('probook') || text.includes('elitebook') || text.includes('aspire') || text.includes('swift') || text.includes('modern') || text.includes('gram')
}

function formatSpecValue(value) {
  const text = String(value || 'N/A').replace(/\s+/g, ' ').trim()
  if (text.length <= 28) return text
  return `${text.slice(0, 28).trimEnd()}...`
}

function normalizeSpecValue(label, value) {
  const text = String(value || '').replace(/\s+/g, ' ').trim()
  if (!text) return 'Đang cập nhật'

  const lowerLabel = String(label || '').toLowerCase()

  if (lowerLabel.includes('pin')) {
    const batteryMatch = text.match(/\b\d{3,5}\s?(?:mah|wh)\b/i)
    return batteryMatch ? batteryMatch[0].replace(/\s+/g, ' ').trim() : 'Đang cập nhật'
  }

  if (lowerLabel.includes('ram')) {
    const ramMatch = text.match(/\b\d+\s?(?:gb|mb)\b/i)
    return ramMatch ? ramMatch[0].replace(/\s+/g, ' ').trim() : 'Đang cập nhật'
  }

  if (lowerLabel.includes('ổ cứng') || lowerLabel.includes('bộ nhớ')) {
    const storageMatch = text.match(/\b\d+\s?(?:gb|tb|mb)\b/i)
    return storageMatch ? storageMatch[0].replace(/\s+/g, ' ').trim() : 'Đang cập nhật'
  }

  if (lowerLabel.includes('màn hình')) {
    const screenMatch = text.match(/\b\d+(?:\.\d+)?\s?(?:inch|inches|\")\b/i)
    if (screenMatch) return screenMatch[0].replace(/\s+/g, ' ').trim()
    return text.length > 24 ? `${text.slice(0, 24).trimEnd()}...` : text
  }

  if (lowerLabel.includes('hệ điều hành')) {
    return text.length > 24 ? `${text.slice(0, 24).trimEnd()}...` : text
  }

  if (lowerLabel.includes('chip')) {
    return text.length > 28 ? `${text.slice(0, 28).trimEnd()}...` : text
  }

  return text.length > 28 ? `${text.slice(0, 28).trimEnd()}...` : text
}

function shortenText(value, maxLength = 160) {
  const text = String(value || '').replace(/\s+/g, ' ').trim()
  if (!text) return ''
  if (text.length <= maxLength) return text
  return `${text.slice(0, maxLength).trimEnd()}...`
}

export default function Product() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [imageFailed, setImageFailed] = useState(false)
  const [useProxy, setUseProxy] = useState(false)
  const [selectedColor, setSelectedColor] = useState(0)
  const [selectedStorage, setSelectedStorage] = useState(0)
  const [showFullSpecs, setShowFullSpecs] = useState(false)
  const [showAI, setShowAI] = useState(true)

  useEffect(() => {
    setImageFailed(false)
    setUseProxy(false)
    const loadProduct = async () => {
      try {
        console.log(`Loading product ${id}...`)
        const data = await fetchProduct(id)
        console.log('API Response:', data)
        const productData = data.data || data
        console.log('Product Data:', productData)
        setProduct(productData)
      } catch (error) {
        console.error('Failed to load product:', error)
      } finally {
        setLoading(false)
      }
    }
    loadProduct()
  }, [id])

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8 flex items-center justify-center min-h-screen">
        <Loader size={48} className="text-indigo-400 animate-spin" />
      </div>
    )
  }

  if (!product) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <p className="text-blue-500">Sản phẩm không tìm thấy</p>
      </div>
    )
  }

  const p = product
  const storageOptions = ['256GB', '512GB', '1TB']
  const storagePriceMultiplier = { '256GB': 1, '512GB': 1.15, '1TB': 1.35 }  // 15% more for 512GB, 35% more for 1TB
  const selectedStorageOption = storageOptions[selectedStorage]
  const priceWithStorage = Math.floor(p.price * storagePriceMultiplier[selectedStorageOption])
  const originalPrice = priceWithStorage * 1.1
  const discount = Math.round((1 - priceWithStorage / originalPrice) * 100)
  const averageRating = Number(p.rating ?? 0)
  const reviewCount = Number(p.review_count ?? (Array.isArray(p.reviews) ? p.reviews.length : 0))
  const isLaptop = isLaptopProduct(p)
  const ram = p.ram || p.specs?.['Dung lượng RAM'] || p.specs?.RAM || p.specs?.['Loại RAM'] || 'N/A'
  const rom = p.rom || p.specs?.['Bộ nhớ trong'] || p.specs?.['Bộ nhớ'] || p.specs?.['Ổ cứng'] || 'N/A'
  const battery = p.battery || p.specs?.Pin || 'N/A'
  const screenSize = p.specs?.['Kích thước màn hình'] || p.specs?.['Màn hình'] || 'N/A'
  const chipset = p.specs?.Chipset || p.specs?.['Chip xử lý'] || p.specs?.CPU || p.specs?.['Loại CPU'] || 'N/A'
  const operatingSystem = p.specs?.['Hệ điều hành'] || p.specs?.OS || 'N/A'
  const quickFacts = isLaptop
    ? [
        { label: 'RAM', value: normalizeSpecValue('RAM', ram) },
        { label: 'Ổ cứng', value: normalizeSpecValue('Ổ cứng', rom) },
        { label: 'Màn hình', value: normalizeSpecValue('Màn hình', screenSize) },
        { label: 'Pin', value: normalizeSpecValue('Pin', battery) },
      ]
    : [
        { label: 'RAM', value: normalizeSpecValue('RAM', ram) },
        { label: 'ROM', value: normalizeSpecValue('ROM', rom) },
        { label: 'Pin', value: normalizeSpecValue('Pin', battery) },
        { label: 'Đánh giá', value: reviewCount > 0 ? `${averageRating.toFixed(1)}/5 (${reviewCount})` : `${averageRating.toFixed(1)}/5` },
      ]
  const specRows = isLaptop
    ? [
        ['Loại RAM', normalizeSpecValue('Loại RAM', p.specs?.['Loại RAM'] || p.specs?.RAM)],
        ['Ổ cứng', normalizeSpecValue('Ổ cứng', p.specs?.['Ổ cứng'] || p.rom)],
        ['Kích thước màn hình', normalizeSpecValue('Kích thước màn hình', p.specs?.['Kích thước màn hình'] || p.specs?.['Màn hình'])],
        ['Công nghệ màn hình', normalizeSpecValue('Công nghệ màn hình', p.specs?.['Công nghệ màn hình'])],
        ['Chip xử lý', normalizeSpecValue('Chip xử lý', p.specs?.Chipset || p.specs?.['Loại CPU'] || p.specs?.CPU)],
        ['Pin', normalizeSpecValue('Pin', p.specs?.Pin || p.battery)],
        ['Hệ điều hành', normalizeSpecValue('Hệ điều hành', p.specs?.['Hệ điều hành'])],
      ]
    : [
        ['Chipset', normalizeSpecValue('Chipset', chipset)],
        ['RAM', normalizeSpecValue('RAM', ram)],
        ['Bộ nhớ trong', normalizeSpecValue('Bộ nhớ trong', rom)],
        ['Pin', normalizeSpecValue('Pin', battery)],
        ['Kích thước màn hình', normalizeSpecValue('Kích thước màn hình', screenSize)],
        ['Công nghệ màn hình', normalizeSpecValue('Công nghệ màn hình', p.specs?.['Công nghệ màn hình'])],
        ['Hệ điều hành', normalizeSpecValue('Hệ điều hành', operatingSystem)],
      ]
  const emoji = getPhoneEmoji(p.brand)
  const gradients = ['from-blue-500 to-purple-600', 'from-indigo-500 to-pink-500', 'from-green-500 to-teal-500', 'from-orange-500 to-red-500', 'from-purple-500 to-violet-600']
  const bgGradient = gradients[p.id % gradients.length]
  const imageSrc = !imageFailed
    ? (useProxy ? toProxyImageUrl(p.image_url) : (p.image_url || ''))
    : ''

  const handleAddToCart = () => {
    addToCart(p, 1)
  }

  const handleBuyNow = () => {
    addToCart(p, 1)
    navigate('/checkout')
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <Link to="/" className="flex items-center gap-2 text-slate-400 hover:text-white mb-8 transition-colors text-sm">
          <ArrowLeft size={18} /> Quay lại danh sách
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Left: Product image */}
          <div>
            <div className={`rounded-3xl h-96 lg:h-[32rem] bg-gradient-to-br ${bgGradient} flex items-center justify-center mb-4 relative overflow-hidden`}>
              {imageSrc ? (
                <img 
                  src={imageSrc}
                  alt={p.name} 
                  className="w-full h-full object-contain p-6"
                  onError={() => {
                    if (!useProxy && p.image_url) {
                      setUseProxy(true)
                      return
                    }
                    setImageFailed(true)
                  }}
                />
              ) : (
                <span className="text-9xl drop-shadow-lg">{emoji}</span>
              )}
              {discount > 0 && (
                <div className="absolute top-4 right-4 bg-blue-500 text-white text-sm font-bold px-3 py-1 rounded-xl">-{discount}%</div>
              )}
            </div>
          </div>

          {/* Right: Details */}
          <div className="fade-in">
            <p className="text-indigo-400 font-medium text-sm mb-2">{p.brand}</p>
            <h1 className="text-3xl font-bold text-white mb-3">{p.name}</h1>

            {/* Rating */}
            <div className="flex items-center gap-2 mb-4">
              <div className="flex gap-0.5">{[...Array(5)].map((_,i) => <Star key={i} size={16} className={i < Math.floor(averageRating) ? 'text-yellow-400 fill-yellow-400' : 'text-slate-600'} />)}</div>
              <span className="text-yellow-400 font-semibold">{averageRating.toFixed(1)}</span>
              <span className="text-slate-500 text-sm">({reviewCount} đánh giá)</span>
            </div>

            {/* Price */}
            <div className="flex items-end gap-3 mb-6">
              <span className="text-4xl font-extrabold text-white">{formatPrice(priceWithStorage)}</span>
              <span className="text-slate-500 line-through text-lg mb-1">{formatPrice(originalPrice)}</span>
              <span className="bg-blue-500/15 text-blue-600 text-sm font-semibold px-2 py-0.5 rounded-lg mb-1">Tiết kiệm {formatPrice(originalPrice - priceWithStorage)}</span>
            </div>

            {p.description && (
              <p className="text-slate-300 text-sm mb-6 leading-relaxed">{shortenText(p.description, 110)}</p>
            )}

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
              {quickFacts.map((fact) => (
                <div key={fact.label} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-500 mb-1">{fact.label}</p>
                  <p className="text-sm font-semibold text-white leading-snug">{fact.value}</p>
                </div>
              ))}
            </div>

            {/* Storage Selection */}
            <div className="mb-6">
              <p className="text-slate-400 text-sm font-semibold mb-3">Bộ nhớ trong:</p>
              <div className="flex gap-3">
                {storageOptions.map((storage, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedStorage(idx)}
                    className={`px-6 py-2 rounded-xl font-semibold transition-all ${
                      selectedStorage === idx
                        ? 'bg-indigo-600 text-white border-2 border-indigo-400'
                        : 'bg-white/5 text-slate-300 border-2 border-white/10 hover:border-indigo-500/50'
                    }`}
                  >
                    {storage}
                  </button>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 mb-8">
              <button onClick={handleAddToCart} className="flex-1 flex items-center justify-center gap-2 bg-white/5 border border-white/10 hover:border-indigo-500/50 text-white py-3.5 rounded-2xl transition-all font-medium">
                <ShoppingCart size={20} /> Thêm giỏ hàng
              </button>
              <button onClick={handleBuyNow} className="flex-1 btn-glow text-white py-3.5 rounded-2xl font-bold text-center flex items-center justify-center gap-2">
                Mua ngay <Zap size={18} />
              </button>
            </div>

            <div className="flex gap-4 text-sm text-slate-500">
              <span className="flex items-center gap-1.5"><Shield size={14} className="text-green-400" /> Bảo hành 12 tháng</span>
              <span className="flex items-center gap-1.5"><Shield size={14} className="text-blue-400" /> Hàng chính hãng</span>
            </div>
          </div>
        </div>

        {/* Specs */}
        {specRows.some(([, value]) => value) && (
          <div className="mt-8 glass rounded-3xl p-6 border border-white/10">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold text-xl">Thông số kỹ thuật</h3>
              <button onClick={() => setShowFullSpecs(!showFullSpecs)} className="text-indigo-400 text-sm hover:text-indigo-300 flex items-center gap-1">
                {showFullSpecs ? 'Rút gọn' : 'Xem tất cả'}
                {showFullSpecs ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
            </div>
            <div className="overflow-hidden rounded-2xl border border-white/10">
              <table className="w-full text-sm">
                <tbody>
                  {specRows.filter(([, value]) => value).slice(0, showFullSpecs ? undefined : 6).map(([label, value]) => (
                    <tr key={label} className="border-b border-white/5 last:border-0">
                      <th className="w-1/3 bg-white/5 px-4 py-3 text-left text-slate-400 font-medium align-top">{label}</th>
                      <td className="px-4 py-3 text-white font-medium align-top" title={String(value || '')}>{formatSpecValue(value)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Reviews */}
        {p.reviews && Array.isArray(p.reviews) && p.reviews.length > 0 && (
          <div className="mt-8 mb-12">
            <h3 className="text-white font-semibold text-xl mb-4">Đánh giá từ khách hàng</h3>
            <div className="space-y-4">
              {p.reviews.map((review, i) => {
                const reviewText = String(review || '')
                const match = reviewText.match(/^(.+?)\s*\((\d+)⭐\):\s*(.+)$/)
                const [, name, rating, comment] = match || [null, 'Ẩn danh', '5', reviewText]
                return (
                  <div key={i} className="glass rounded-2xl p-5 border border-white/8">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-indigo-600/30 rounded-full flex items-center justify-center text-indigo-400 font-bold text-sm">
                          {name ? name.charAt(0).toUpperCase() : 'U'}
                        </div>
                        <div>
                          <p className="text-white text-sm font-medium">{name || 'Ẩn danh'}</p>
                          <div className="flex gap-0.5 mt-0.5">{[...Array(5)].map((_,j) => <Star key={j} size={10} className={j < parseInt(rating || 5) ? 'text-yellow-400 fill-yellow-400' : 'text-slate-600'} />)}</div>
                        </div>
                      </div>
                    </div>
                    <p className="text-slate-300 text-sm leading-relaxed">{shortenText(comment, 100)}</p>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
