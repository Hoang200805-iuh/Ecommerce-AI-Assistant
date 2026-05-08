export function formatCurrency(value) {
  return `${Number(value || 0).toLocaleString('vi-VN')} VND`
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_REGEX = /^(0|\+84)\d{8,10}$/

function normalizeText(value) {
  return String(value || '').trim()
}

export function computeSubtotal(items) {
  return items.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 1), 0)
}

export function normalizeCheckoutForm(form = {}) {
  return {
    name: normalizeText(form.name),
    email: normalizeText(form.email).toLowerCase(),
    phone: normalizeText(form.phone).replace(/[\s.-]/g, ''),
    address: normalizeText(form.address),
    city: normalizeText(form.city),
    note: normalizeText(form.note),
  }
}

export function validateShippingForm(form = {}) {
  const normalized = normalizeCheckoutForm(form)
  const errors = {}

  if (!normalized.name || normalized.name.length < 2) {
    errors.name = 'Vui lòng nhập họ tên hợp lệ (ít nhất 2 ký tự).'
  }

  if (!normalized.email || !EMAIL_REGEX.test(normalized.email)) {
    errors.email = 'Email không hợp lệ.'
  }

  if (!normalized.phone || !PHONE_REGEX.test(normalized.phone)) {
    errors.phone = 'Số điện thoại không hợp lệ (vd: 0905123456 hoặc +84905123456).'
  }

  if (!normalized.address || normalized.address.length < 6) {
    errors.address = 'Địa chỉ cần tối thiểu 6 ký tự.'
  }

  if (!normalized.city || normalized.city.length < 2) {
    errors.city = 'Vui lòng nhập thành phố hợp lệ.'
  }

  return { normalized, errors }
}

export function validateCheckoutConstraints({ form, items, payment, qrConfirmed }) {
  const { normalized, errors } = validateShippingForm(form)
  if (Object.keys(errors).length > 0) {
    return {
      ok: false,
      errors,
      normalized,
      message: 'Vui lòng kiểm tra lại thông tin giao hàng trước khi thanh toán.',
    }
  }

  if (!Array.isArray(items) || items.length === 0) {
    return {
      ok: false,
      errors: {},
      normalized,
      message: 'Giỏ hàng đang trống, không thể thanh toán.',
    }
  }

  const hasInvalidItem = items.some(item => {
    const productId = item?.id ?? item?.product_id ?? item?.productId
    return !productId || Number(item?.quantity || 0) <= 0
  })

  if (hasInvalidItem) {
    return {
      ok: false,
      errors: {},
      normalized,
      message: 'Giỏ hàng có sản phẩm không hợp lệ. Vui lòng kiểm tra lại.',
    }
  }

  if (!['qr', 'cod'].includes(payment)) {
    return {
      ok: false,
      errors: {},
      normalized,
      message: 'Phương thức thanh toán không hợp lệ.',
    }
  }

  if (payment === 'qr' && !qrConfirmed) {
    return {
      ok: false,
      errors: {},
      normalized,
      message: 'Vui lòng xác nhận đã chuyển khoản QR trước khi đặt đơn.',
    }
  }

  return {
    ok: true,
    errors: {},
    normalized,
    message: '',
  }
}

export function buildQrTransferContent({ phone, userEmail, qrRef }) {
  const payer = String(phone || userEmail || 'guest').replace(/\s+/g, '')
  return `${qrRef}-${payer.slice(0, 18)}`
}

export function buildQrImageUrl({ bank, amount, transferContent }) {
  const query = new URLSearchParams({
    amount: String(Math.max(0, Math.round(amount))),
    addInfo: transferContent,
    accountName: bank.accountName,
  }).toString()

  return `https://img.vietqr.io/image/${bank.bin}-${bank.accountNo}-compact2.png?${query}`
}

export function getPaymentLabel(paymentMethods, paymentId) {
  const method = paymentMethods.find(item => item.id === paymentId)
  return method?.label || 'QR chuyển khoản'
}

export function buildReceiptFromOrder({ result, form, items, paymentLabel }) {
  const orderItems = Array.isArray(result?.items) && result.items.length
    ? result.items.map(item => ({
        id: item.productId,
        name: item.productName,
        quantity: Number(item.quantity || 1),
        price: Number(item.price || 0),
      }))
    : (Array.isArray(items) ? items : []).map(item => ({
        id: item.id ?? item.product_id ?? item.productId,
        name: item.name || item.product_name || 'Sản phẩm',
        quantity: Number(item.quantity || 1),
        price: Number(item.price || 0),
      }))

  const total = Number(result?.totalPrice || computeSubtotal(orderItems))

  return {
    orderId: result?.orderId || '',
    createdAt: new Date().toISOString(),
    paymentLabel,
    customerName: form.name,
    customerEmail: form.email,
    customerPhone: form.phone,
    shippingAddress: [form.address, form.city].filter(Boolean).join(', '),
    note: form.note || '',
    items: orderItems,
    total,
  }
}
