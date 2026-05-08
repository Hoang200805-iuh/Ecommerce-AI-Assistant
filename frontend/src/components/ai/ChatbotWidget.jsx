import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bot, Send, ShoppingCart, X, Zap } from 'lucide-react'
import { chatWithAI } from '../../services/api.js'
import { useAuth } from '../../context/AuthContext'
import { addToCart } from '../../store/cartStore.js'

const INITIAL_MESSAGE = 'Xin chào! Mình là trợ lý tư vấn SmartMobile. Bạn hãy nói nhu cầu như tầm giá, hãng, pin, camera hoặc hiệu năng để mình gợi ý chính xác hơn.'

function formatPrice(value) {
	if (value === null || value === undefined || Number.isNaN(Number(value))) {
		return 'Liên hệ'
	}
	return `${Number(value).toLocaleString('vi-VN')} đ`
}

function mapHistory(messages) {
	return messages
		.filter(item => item.role === 'user' || item.role === 'assistant')
		.map(item => ({ role: item.role, content: item.content }))
}

function resolveProductId(product) {
	const rawId = product?.id ?? product?.product_id ?? product?.productId
	const value = Number(rawId)
	if (!Number.isFinite(value) || value <= 0) return null
	return value
}

export default function ChatbotWidget({ light = false }) {
	const navigate = useNavigate()
	const { user } = useAuth()
	const [isOpen, setIsOpen] = useState(false)
	const [input, setInput] = useState('')
	const [isSending, setIsSending] = useState(false)
	const [products, setProducts] = useState([])
	const [actionFeedback, setActionFeedback] = useState('')
	const [messages, setMessages] = useState([
		{ role: 'assistant', content: INITIAL_MESSAGE },
	])
	const [error, setError] = useState('')
	const scrollRef = useRef(null)
	const feedbackTimerRef = useRef(null)

	const shellClass = useMemo(
		() => (light
			? 'bg-white border border-slate-200'
			: 'glass border border-indigo-500/30'),
		[light]
	)

	useEffect(() => {
		const viewport = scrollRef.current
		if (!viewport) return
		viewport.scrollTop = viewport.scrollHeight
	}, [messages, isSending])

	useEffect(() => () => {
		if (feedbackTimerRef.current) {
			window.clearTimeout(feedbackTimerRef.current)
		}
	}, [])

	const pushFeedback = (message) => {
		setActionFeedback(message)
		if (feedbackTimerRef.current) {
			window.clearTimeout(feedbackTimerRef.current)
		}
		feedbackTimerRef.current = window.setTimeout(() => {
			setActionFeedback('')
		}, 2400)
	}

	const requireCustomerRole = () => {
		if (!user) {
			pushFeedback('Vui lòng đăng nhập tài khoản khách hàng để đặt mua.')
			navigate('/login', { state: { from: { pathname: '/checkout' } } })
			return false
		}

		if (user.role !== 'customer') {
			pushFeedback('Tài khoản hiện tại không có quyền đặt hàng trên trang khách.')
			return false
		}

		return true
	}

	const addSuggestedProductToCart = (product) => {
		const productId = resolveProductId(product)
		if (!productId) {
			pushFeedback('Không xác định được sản phẩm để thêm vào giỏ.')
			return
		}

		if (Number(product.stock ?? 0) <= 0) {
			pushFeedback('Sản phẩm này đang tạm hết hàng.')
			return
		}

		if (!requireCustomerRole()) return

		addToCart({ ...product, id: productId }, 1)
		pushFeedback(`Đã thêm ${product.name} vào giỏ hàng.`)
	}

	const buySuggestedProductNow = (product) => {
		const productId = resolveProductId(product)
		if (!productId) {
			pushFeedback('Không xác định được sản phẩm để đặt hàng.')
			return
		}

		if (Number(product.stock ?? 0) <= 0) {
			pushFeedback('Sản phẩm này đang tạm hết hàng.')
			return
		}

		if (!requireCustomerRole()) return

		addToCart({ ...product, id: productId }, 1)
		navigate('/checkout')
	}

	const sendMessage = async () => {
		const prompt = input.trim()
		if (!prompt || isSending) return

		const currentHistory = mapHistory(messages).slice(-8)
		const nextUserMessage = { role: 'user', content: prompt }

		setInput('')
		setError('')
		setIsSending(true)
		setMessages(prev => [...prev, nextUserMessage])

		try {
			const response = await chatWithAI({
				message: prompt,
				history: currentHistory,
				topK: 5,
			})
			const payload = response?.data ?? response
			const answer = String(payload?.answer || 'Mình chưa thể trả lời rõ với câu này, bạn thử diễn đạt kỹ hơn nhé.')
			const nextProducts = Array.isArray(payload?.products) ? payload.products : []

			setMessages(prev => [...prev, { role: 'assistant', content: answer }])
			setProducts(nextProducts)
		} catch (requestError) {
			setError(requestError?.message || 'Không thể kết nối chatbot lúc này.')
			setMessages(prev => [
				...prev,
				{ role: 'assistant', content: 'Đã có lỗi khi gọi chatbot. Bạn thử lại sau ít phút nhé.' },
			])
		} finally {
			setIsSending(false)
		}
	}

	return (
		<div className="fixed bottom-6 right-6 z-50">
			{isOpen && (
				<div className={`${shellClass} mb-4 flex h-[560px] w-[360px] flex-col overflow-hidden rounded-2xl shadow-2xl`}>
					<div className={`flex items-center gap-3 border-b p-4 ${light ? 'border-slate-200 bg-slate-50' : 'border-indigo-500/20'}`}>
						<div className={`flex h-9 w-9 items-center justify-center rounded-xl ${light ? 'btn-retail' : 'btn-glow'}`}>
							<Bot size={18} className="text-white" />
						</div>
						<div>
							<p className={`text-sm font-semibold ${light ? 'text-slate-900' : 'text-white'}`}>AI Tư vấn sản phẩm</p>
							<p className="flex items-center gap-1 text-xs text-green-500">
								<span className="inline-block h-1.5 w-1.5 rounded-full bg-green-500" /> Online
							</p>
						</div>
						<button
							type="button"
							onClick={() => setIsOpen(false)}
							className={`ml-auto ${light ? 'text-slate-400 hover:text-slate-700' : 'text-slate-400 hover:text-white'}`}
							aria-label="Đóng chatbot"
						>
							<X size={18} />
						</button>
					</div>

					<div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
						{messages.map((message, index) => (
							<div key={`${message.role}-${index}`} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
								<div
									className={`max-w-[86%] whitespace-pre-wrap rounded-xl px-3 py-2 text-sm leading-6 ${
										message.role === 'user'
											? 'bg-[#2563eb] text-white'
											: light
												? 'border border-slate-200 bg-slate-50 text-slate-700'
												: 'bg-white/8 text-slate-200'
									}`}
								>
									{message.content}
								</div>
							</div>
						))}

						{isSending && (
							<div className="flex justify-start">
								<div className={`flex gap-1 rounded-xl px-3 py-2 ${light ? 'bg-slate-100' : 'bg-white/8'}`}>
									<span className="typing-dot h-2 w-2 rounded-full bg-slate-400" />
									<span className="typing-dot h-2 w-2 rounded-full bg-slate-400" />
									<span className="typing-dot h-2 w-2 rounded-full bg-slate-400" />
								</div>
							</div>
						)}

						{error && (
							<p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-600">
								{error}
							</p>
						)}
					</div>

					{products.length > 0 && (
						<div className={`max-h-44 overflow-y-auto border-t p-3 ${light ? 'border-slate-200 bg-slate-50/70' : 'border-indigo-500/20 bg-slate-900/25'}`}>
							<p className={`mb-2 text-xs font-semibold uppercase tracking-[0.18em] ${light ? 'text-slate-500' : 'text-slate-300'}`}>
								Sản phẩm gợi ý
							</p>
							<div className="space-y-2">
								{products.map(product => {
									const productId = resolveProductId(product)
									const canOrder = Boolean(productId) && Number(product.stock ?? 0) > 0

									return (
									<article key={productId || product.name} className={`rounded-xl border px-3 py-2 ${light ? 'border-slate-200 bg-white' : 'border-slate-700 bg-slate-900/45'}`}>
										<p className={`text-sm font-semibold ${light ? 'text-slate-900' : 'text-white'}`}>{product.name}</p>
										<p className={`text-xs ${light ? 'text-slate-500' : 'text-slate-300'}`}>
											{product.brand} | RAM {product.ram || 'N/A'} | ROM {product.rom || 'N/A'}
										</p>
										<div className="mt-1 flex items-center justify-between">
											<span className="text-sm font-bold text-[#2563eb]">{product.price_text || formatPrice(product.price)}</span>
											<span className={`text-xs ${Number(product.stock ?? 0) > 0 ? (light ? 'text-emerald-600' : 'text-emerald-400') : (light ? 'text-rose-600' : 'text-rose-400')}`}>Kho: {product.stock ?? 0}</span>
										</div>

										<div className="mt-2 grid grid-cols-2 gap-2">
											<button
												type="button"
												onClick={() => addSuggestedProductToCart(product)}
												disabled={!canOrder}
												className={`inline-flex items-center justify-center gap-1 rounded-lg border px-2 py-1.5 text-[11px] font-semibold transition-all ${canOrder ? (light ? 'border-slate-300 bg-slate-100 text-slate-700 hover:border-[#2563eb]/50 hover:text-[#2563eb]' : 'border-indigo-500/30 bg-indigo-500/10 text-indigo-300 hover:bg-indigo-500/20') : 'cursor-not-allowed border-slate-300 bg-slate-100 text-slate-400 opacity-70'}`}
											>
												<ShoppingCart size={13} /> Thêm giỏ
											</button>
											<button
												type="button"
												onClick={() => buySuggestedProductNow(product)}
												disabled={!canOrder}
												className={`inline-flex items-center justify-center gap-1 rounded-lg px-2 py-1.5 text-[11px] font-semibold text-white transition-all ${canOrder ? (light ? 'btn-retail' : 'btn-glow') : 'cursor-not-allowed bg-slate-400 opacity-60'}`}
											>
												<Zap size={13} /> Đặt ngay
											</button>
										</div>
									</article>
									)
								})}
							</div>

							{actionFeedback && (
								<p className={`mt-2 rounded-lg px-2.5 py-1.5 text-xs ${light ? 'border border-slate-200 bg-white text-slate-700' : 'border border-indigo-500/30 bg-indigo-500/10 text-indigo-200'}`}>
									{actionFeedback}
								</p>
							)}
						</div>
					)}

					<div className={`flex gap-2 border-t p-3 ${light ? 'border-slate-200 bg-white' : 'border-indigo-500/20'}`}>
						<input
							value={input}
							onChange={event => setInput(event.target.value)}
							onKeyDown={event => {
								if (event.key === 'Enter') {
									event.preventDefault()
									sendMessage()
								}
							}}
							placeholder="Nhập câu hỏi..."
							className={`flex-1 rounded-lg px-3 py-2 text-sm focus:outline-none ${
								light
									? 'border border-slate-300 bg-slate-50 text-slate-900 placeholder-slate-400 focus:border-[#2563eb]'
									: 'border border-indigo-500/30 bg-white/5 text-white placeholder-slate-500 focus:border-indigo-400'
							}`}
						/>
						<button
							type="button"
							onClick={sendMessage}
							disabled={isSending || !input.trim()}
							className={`rounded-lg px-3 py-2 text-sm font-semibold text-white ${light ? 'btn-retail' : 'btn-glow'} ${isSending || !input.trim() ? 'cursor-not-allowed opacity-60' : ''}`}
						>
							<span className="inline-flex items-center gap-1">
								<Send size={14} />
								Gửi
							</span>
						</button>
					</div>
				</div>
			)}

			<button
				type="button"
				onClick={() => setIsOpen(open => !open)}
				className={`flex h-14 w-14 items-center justify-center rounded-2xl text-white shadow-xl ${light ? 'btn-retail' : 'btn-glow'}`}
				aria-label="Mở chatbot"
			>
				<Bot size={26} />
			</button>
		</div>
	)
}
