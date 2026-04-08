const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3001/api'

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(options.headers ?? {}) },
    ...options,
  })
  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error(payload?.detail ?? payload?.message ?? 'API request failed')
  }
  return payload
}

function buildQuery(params = {}) {
  const query = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      query.set(key, String(value))
    }
  })
  const queryString = query.toString()
  return queryString ? `?${queryString}` : ''
}

export async function fetchProducts(filters = {}) {
  const query = buildQuery({ limit: 24, ...filters })
  const { data } = await request(`/products${query}`)
  return data
}

export async function fetchProduct(productId) {
  return request(`/products/${productId}`)
}

export async function createOrder(payload) {
  return request('/orders', { method: 'POST', body: JSON.stringify(payload) })
}

export async function registerCustomerAccount(payload) {
  return request('/users/register', { method: 'POST', body: JSON.stringify(payload) })
}

export async function fetchOrder(orderId) {
  return request(`/orders/${orderId}`)
}

export async function fetchUserOrders(userEmail) {
  const { data } = await request(`/orders/user/${encodeURIComponent(userEmail)}`)
  return data
}

export async function cancelUserOrder(orderId, userEmail) {
  return request(`/orders/${encodeURIComponent(orderId)}/cancel`, {
    method: 'PATCH',
    body: JSON.stringify({ userEmail }),
  })
}

export async function fetchAdminReports() {
  return request('/admin/reports')
}

export async function fetchWarehouseInventory(filters = {}) {
  const query = buildQuery(filters)
  const { data, summary } = await request(`/warehouse/inventory${query}`)
  return { data, summary }
}

export async function updateWarehouseInventory(productId, payload) {
  return request(`/warehouse/inventory/${encodeURIComponent(productId)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export async function createWarehouseProduct(payload) {
  return request('/warehouse/products', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function fetchWarehouseOrders(filters = {}) {
  const query = buildQuery(filters)
  const { data } = await request(`/warehouse/orders${query}`)
  return data
}

export async function updateWarehouseOrderStatus(orderId, status, comment = '') {
  return request(`/warehouse/orders/${encodeURIComponent(orderId)}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status, comment }),
  })
}

export async function fetchAdminUsers() {
  const { data } = await request('/admin/users')
  return data
}

export async function createAdminUser(payload) {
  return request('/admin/users', { method: 'POST', body: JSON.stringify(payload) })
}

export async function updateAdminUser(userId, payload) {
  return request(`/admin/users/${encodeURIComponent(userId)}`, { method: 'PUT', body: JSON.stringify(payload) })
}

export async function deleteAdminUser(userId) {
  return request(`/admin/users/${encodeURIComponent(userId)}`, { method: 'DELETE' })
}

export async function fetchProductReviews(productId) {
  const { data } = await request(`/reviews/product/${productId}`)
  return data
}

export async function submitReview(payload) {
  return request('/reviews', { method: 'POST', body: JSON.stringify(payload) })
}

export async function fetchAISuggestions(query, limit = 3) {
  return request(`/ai/suggestions${buildQuery({ q: query, limit })}`)
}
