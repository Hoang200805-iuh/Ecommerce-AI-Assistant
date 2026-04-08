export const CHECKOUT_STEPS = ['Thông tin', 'Thanh toán', 'Xác nhận']

export const PAYMENT_METHODS = [
  { id: 'qr', label: 'QR chuyển khoản', icon: '🏦', desc: 'Quét mã VietQR theo số tiền đơn hàng' },
  { id: 'cod', label: 'Tiền mặt', icon: '📦', desc: 'Thanh toán khi nhận hàng' },
]

export const QR_BANK = {
bankName: 'Techcombank',
bin: '970407',
accountNo: '19073304679016',
accountName: 'Le Duc Hoa',
}

export const INITIAL_FORM = {
  name: '',
  email: '',
  phone: '',
  address: '',
  city: '',
  note: '',
}
