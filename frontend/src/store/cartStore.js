const CART_KEY_PREFIX = 'smartmobile_cart_v2'
const SESSION_KEY = 'smartmobile_session'

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase()
}

function readSessionUser() {
  if (typeof window === 'undefined') return null
  try {
    return JSON.parse(window.localStorage.getItem(SESSION_KEY) || 'null')
  } catch {
    return null
  }
}

function getCartKey() {
  const sessionUser = readSessionUser()
  const scope = sessionUser?.email
    ? `user:${normalizeEmail(sessionUser.email)}`
    : 'guest'
  return `${CART_KEY_PREFIX}:${scope}`
}

function readCart() {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(window.localStorage.getItem(getCartKey()) || '[]')
  } catch {
    return []
  }
}

function writeCart(cart) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(getCartKey(), JSON.stringify(cart))
  window.dispatchEvent(new Event('smartmobile-cart-change'))
}

export function getCart() {
  return readCart()
}

export function setCart(cart) {
  writeCart(Array.isArray(cart) ? cart : [])
}

export function addToCart(product, quantity = 1) {
  const cart = readCart()
  const productId = Number(product.id ?? product.product_id ?? product.productId)
  const existing = cart.find(item => Number(item.id) === productId)

  if (existing) {
    existing.quantity += quantity
  } else {
    cart.push({
      id: productId,
      name: product.name,
      brand: product.brand,
      price: Number(product.price ?? 0),
      image_url: product.image_url || '',
      quantity,
    })
  }

  writeCart(cart)
  return cart
}

export function updateCartItem(productId, quantity) {
  const cart = readCart()
  const next = cart
    .map(item => Number(item.id) === Number(productId) ? { ...item, quantity: Math.max(1, quantity) } : item)
    .filter(Boolean)
  writeCart(next)
  return next
}

export function removeFromCart(productId) {
  const cart = readCart().filter(item => Number(item.id) !== Number(productId))
  writeCart(cart)
  return cart
}

export function clearCart() {
  writeCart([])
}

export function useCartSync(setState) {
  if (typeof window === 'undefined') return () => {}
  const sync = () => setState(readCart())
  const handler = () => sync()
  window.addEventListener('smartmobile-cart-change', handler)
  window.addEventListener('smartmobile-session-change', handler)
  window.addEventListener('storage', handler)
  return () => {
    window.removeEventListener('smartmobile-cart-change', handler)
    window.removeEventListener('smartmobile-session-change', handler)
    window.removeEventListener('storage', handler)
  }
}
