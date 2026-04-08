export function formatCurrency(value) {
  return `${Number(value || 0).toLocaleString('vi-VN')} VND`
}

export function computeSubtotal(items) {
  return items.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 1), 0)
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
