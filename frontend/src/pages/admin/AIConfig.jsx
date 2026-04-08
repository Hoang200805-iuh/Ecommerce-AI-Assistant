import { useState } from 'react'
import { Bot, Save, RefreshCw, Zap, Thermometer, FileText, Shield, ChevronDown, ToggleLeft, ToggleRight } from 'lucide-react'

export default function AIConfig() {
  const [config, setConfig] = useState({
    model: 'gpt-4o',
    temperature: 0.7,
    maxTokens: 2048,
    systemPrompt: 'Bạn là trợ lý tư vấn sản phẩm điện thoại thông minh của SmartMobile. Hãy tư vấn chuyên nghiệp, thân thiện và dựa trên dữ liệu sản phẩm thực tế. Luôn đề xuất sản phẩm phù hợp với ngân sách và nhu cầu của khách hàng.',
    features: {
      productConsultation: true,
      reviewSummary: true,
      priceComparison: true,
      personalizedRecommendation: true,
      multiLanguage: false,
    },
    reviewSummaryMinReviews: 10,
    maxContext: 20,
  })
  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const toggleFeature = (key) => {
    setConfig(c => ({ ...c, features: { ...c.features, [key]: !c.features[key] } }))
  }

  const features = [
    { key: 'productConsultation', label: 'Tư vấn sản phẩm bằng AI', desc: 'Cho phép AI tư vấn sản phẩm cho khách hàng' },
    { key: 'reviewSummary', label: 'Tóm tắt đánh giá AI', desc: 'AI tự động tóm tắt đánh giá từ người dùng' },
    { key: 'priceComparison', label: 'So sánh giá thông minh', desc: 'AI so sánh giá các sản phẩm tương tự' },
    { key: 'personalizedRecommendation', label: 'Gợi ý cá nhân hóa', desc: 'Dựa trên lịch sử mua hàng và sở thích' },
    { key: 'multiLanguage', label: 'Đa ngôn ngữ', desc: 'Hỗ trợ tư vấn nhiều ngôn ngữ khác nhau' },
  ]

  return (
    <div className="space-y-6 fade-in max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Cấu hình AI Agent</h1>
          <p className="text-slate-500 text-sm mt-1">Tùy chỉnh hành vi và khả năng của trợ lý AI</p>
        </div>
        <button
          onClick={handleSave}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${saved ? 'bg-green-500/20 border border-green-500/30 text-green-400' : 'btn-glow text-white'}`}
        >
          {saved ? <><RefreshCw size={16} className="animate-spin" /> Đã lưu!</> : <><Save size={16} /> Lưu cấu hình</>}
        </button>
      </div>

      {/* Model config */}
      <div className="glass rounded-2xl border border-white/10 p-6 space-y-5">
        <h2 className="text-white font-semibold flex items-center gap-2"><Bot size={18} className="text-indigo-400" /> Cài đặt mô hình</h2>
        
        <div>
          <label className="block text-slate-400 text-sm mb-2">Mô hình AI</label>
          <select
            value={config.model}
            onChange={e => setConfig(c => ({ ...c, model: e.target.value }))}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500 transition-colors"
          >
            {['gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo', 'claude-3-opus', 'gemini-1.5-pro'].map(m => (
              <option key={m} value={m} className="bg-slate-800">{m}</option>
            ))}
          </select>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-slate-400 text-sm flex items-center gap-2"><Thermometer size={14} /> Temperature (Sáng tạo)</label>
            <span className="text-indigo-400 font-bold text-sm">{config.temperature}</span>
          </div>
          <input
            type="range" min="0" max="1" step="0.1"
            value={config.temperature}
            onChange={e => setConfig(c => ({ ...c, temperature: parseFloat(e.target.value) }))}
            className="w-full accent-indigo-500"
          />
          <div className="flex justify-between text-xs text-slate-600 mt-1">
            <span>Chính xác (0)</span><span>Cân bằng (0.5)</span><span>Sáng tạo (1)</span>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-slate-400 text-sm">Max Tokens</label>
            <span className="text-indigo-400 font-bold text-sm">{config.maxTokens}</span>
          </div>
          <input
            type="range" min="256" max="8192" step="256"
            value={config.maxTokens}
            onChange={e => setConfig(c => ({ ...c, maxTokens: parseInt(e.target.value) }))}
            className="w-full accent-indigo-500"
          />
        </div>

        <div>
          <label className="block text-slate-400 text-sm mb-2 flex items-center gap-2"><FileText size={14} /> System Prompt</label>
          <textarea
            rows={5}
            value={config.systemPrompt}
            onChange={e => setConfig(c => ({ ...c, systemPrompt: e.target.value }))}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors resize-none font-mono leading-relaxed"
          />
          <p className="text-slate-600 text-xs mt-1">{config.systemPrompt.length} ký tự</p>
        </div>
      </div>

      {/* Features */}
      <div className="glass rounded-2xl border border-white/10 p-6">
        <h2 className="text-white font-semibold mb-5 flex items-center gap-2"><Zap size={18} className="text-amber-400" /> Tính năng AI</h2>
        <div className="space-y-4">
          {features.map(f => (
            <div key={f.key} className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
              <div>
                <p className="text-white text-sm font-medium">{f.label}</p>
                <p className="text-slate-500 text-xs mt-0.5">{f.desc}</p>
              </div>
              <button onClick={() => toggleFeature(f.key)} className="ml-6 flex-shrink-0">
                {config.features[f.key]
                  ? <div className="w-12 h-6 bg-indigo-600 rounded-full flex items-center justify-end pr-1 transition-all"><div className="w-4 h-4 bg-white rounded-full" /></div>
                  : <div className="w-12 h-6 bg-slate-700 rounded-full flex items-center pl-1 transition-all"><div className="w-4 h-4 bg-slate-400 rounded-full" /></div>
                }
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Safety */}
      <div className="glass rounded-2xl border border-white/10 p-6">
        <h2 className="text-white font-semibold mb-4 flex items-center gap-2"><Shield size={18} className="text-green-400" /> Bảo mật & Giới hạn</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-slate-400 text-sm mb-2">Số đánh giá tối thiểu để tóm tắt</label>
            <input type="number" min="5" max="100"
              value={config.reviewSummaryMinReviews}
              onChange={e => setConfig(c => ({ ...c, reviewSummaryMinReviews: parseInt(e.target.value) }))}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>
          <div>
            <label className="block text-slate-400 text-sm mb-2">Số tin nhắn lưu trong context</label>
            <input type="number" min="5" max="50"
              value={config.maxContext}
              onChange={e => setConfig(c => ({ ...c, maxContext: parseInt(e.target.value) }))}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
