import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { createOrder } from '../../services/api.js'
import { clearCart, getCart, useCartSync } from '../../store/cartStore.js'
import { useAuth } from '../../context/AuthContext'
import { CHECKOUT_STEPS, INITIAL_FORM, PAYMENT_METHODS, QR_BANK } from '../../features/checkout/checkout.constants.js'
import { buildQrImageUrl, buildQrTransferContent, computeSubtotal, formatCurrency, getPaymentLabel } from '../../features/checkout/checkout.utils.js'
import CheckoutStepProgress from '../../features/checkout/components/CheckoutStepProgress.jsx'
import CheckoutShippingStep from '../../features/checkout/components/CheckoutShippingStep.jsx'
import CheckoutPaymentStep from '../../features/checkout/components/CheckoutPaymentStep.jsx'
import CheckoutConfirmStep from '../../features/checkout/components/CheckoutConfirmStep.jsx'
import CheckoutOrderSummary from '../../features/checkout/components/CheckoutOrderSummary.jsx'
import CheckoutSuccessView from '../../features/checkout/components/CheckoutSuccessView.jsx'

export default function Checkout() {
  const [step, setStep] = useState(1)
  const [payment, setPayment] = useState('qr')
  const [qrConfirmed, setQrConfirmed] = useState(false)
  const [copiedField, setCopiedField] = useState('')
  const [qrRef] = useState(() => `SM${Date.now().toString().slice(-8)}`)
  // Keep all shipping inputs in one object so API payload mapping stays simple.
  const [form, setForm] = useState(INITIAL_FORM)
  const [success, setSuccess] = useState(false)
  const [orderId, setOrderId] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [items, setItems] = useState(() => getCart())
  const { user } = useAuth()

  // Keep cart synced with localStorage events (add/remove/update/session change).
  useEffect(() => useCartSync(setItems), [])

  useEffect(() => {
    if (payment !== 'qr') {
      setQrConfirmed(false)
    }
  }, [payment])

  useEffect(() => {
    if (user) {
      setForm(current => ({
        ...current,
        name: current.name || user.name || '',
        email: current.email || user.email || '',
      }))
    }
  }, [user])

  // QR content is deterministic from current payer identity + generated order reference.
  const subtotal = useMemo(() => computeSubtotal(items), [items])
  const qrTransferContent = useMemo(() => buildQrTransferContent({
    phone: form.phone,
    userEmail: user?.email,
    qrRef,
  }), [form.phone, qrRef, user?.email])
  const qrImageUrl = useMemo(() => buildQrImageUrl({
    bank: QR_BANK,
    amount: subtotal,
    transferContent: qrTransferContent,
  }), [subtotal, qrTransferContent])
  const paymentLabel = useMemo(() => getPaymentLabel(PAYMENT_METHODS, payment), [payment])

  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const copyToClipboard = async (value, field) => {
    try {
      await navigator.clipboard.writeText(String(value))
      setCopiedField(field)
      window.setTimeout(() => {
        setCopiedField(current => current === field ? '' : current)
      }, 1200)
    } catch (copyError) {
      console.error('Failed to copy:', copyError)
    }
  }

  const handleOrder = async () => {
    setError('')
    setSubmitting(true)

    try {
      const response = await createOrder({
        customer: form,
        paymentMethod: payment,
        items,
        user,
      })

      const result = response.data || response
      setOrderId(result.orderId)
      setSuccess(true)
      clearCart()
      setItems([])
    } catch (err) {
      setError(err.message || 'Không thể tạo đơn hàng.')
    } finally {
      setSubmitting(false)
    }
  }

  if (success) {
    return <CheckoutSuccessView orderId={orderId} />
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold text-white mb-8">Thanh toán đơn hàng</h1>

      {items.length === 0 ? (
        <div className="glass rounded-3xl p-10 border border-white/10 text-center">
          <p className="text-slate-400 mb-4">Giỏ hàng đang trống. Hãy thêm sản phẩm trước khi thanh toán.</p>
          <Link to="/" className="btn-glow text-white px-6 py-3 rounded-2xl font-semibold inline-block">Về trang chủ</Link>
        </div>
      ) : (
        <>

      <CheckoutStepProgress steps={CHECKOUT_STEPS} step={step} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          {step === 1 && (
            <CheckoutShippingStep
              form={form}
              onChange={handleChange}
              onNext={() => setStep(2)}
            />
          )}

          {step === 2 && (
            <CheckoutPaymentStep
              paymentMethods={PAYMENT_METHODS}
              payment={payment}
              onPaymentChange={setPayment}
              onBack={() => setStep(1)}
              onNext={() => setStep(3)}
              qrInfo={{
                bank: QR_BANK,
                qrImageUrl,
                qrAmountLabel: formatCurrency(subtotal),
                transferContent: qrTransferContent,
                copiedField,
              }}
              onCopy={copyToClipboard}
            />
          )}

          {step === 3 && (
            <CheckoutConfirmStep
              form={form}
              user={user}
              paymentLabel={paymentLabel}
              payment={payment}
              qrTransferContent={qrTransferContent}
              qrConfirmed={qrConfirmed}
              onQrConfirmedChange={setQrConfirmed}
              error={error}
              submitting={submitting}
              onBack={() => setStep(2)}
              onSubmit={handleOrder}
            />
          )}
        </div>

        <div>
          <CheckoutOrderSummary
            items={items}
            subtotal={subtotal}
            formatCurrency={formatCurrency}
          />
        </div>
      </div>
        </>
      )}
    </div>
  )
}
