'use client'

import { useRouter } from 'next/navigation'
import { BarChart2, Layers, FileText, Calculator } from 'lucide-react'

type Section = 'charts' | 'indicators'

interface Props {
  active: Section
  onChange: (s: Section) => void
  symbol: string
}

const tabs: { key: Section | 'report' | 'valuation'; icon: typeof BarChart2; label: string }[] = [
  { key: 'charts', icon: BarChart2, label: 'Charts' },
  { key: 'indicators', icon: Layers, label: 'Indicators' },
  { key: 'report', icon: FileText, label: 'AI Report' },
  { key: 'valuation', icon: Calculator, label: 'Valuation' },
]

export default function MobileNav({ active, onChange, symbol }: Props) {
  const router = useRouter()

  function handleTab(key: Section | 'report' | 'valuation') {
    if (key === 'report') {
      router.push(`/ticker/${symbol}/report`)
    } else if (key === 'valuation') {
      router.push(`/ticker/${symbol}/valuation`)
    } else {
      onChange(key)
    }
  }

  return (
    <div
      className="md:hidden"
      style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: 'var(--md-surface)',
        borderTop: '1px solid var(--md-outline-variant)',
        paddingBottom: 'env(safe-area-inset-bottom)',
        zIndex: 40,
        display: 'flex',
      }}>
      {tabs.map(({ key, icon: Icon, label }) => {
        const isActive = active === key
        return (
          <button
            key={key}
            onClick={() => handleTab(key)}
            className="md-ripple"
            style={{
              flex: 1, padding: '10px 2px 14px',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
              background: 'transparent', border: 'none', cursor: 'pointer',
            }}>
            <div style={{
              padding: '4px 16px', borderRadius: 16,
              background: isActive ? 'rgba(124,185,244,0.16)' : 'transparent',
              marginBottom: 2,
            }}>
              <Icon size={20} color={isActive ? 'var(--md-primary)' : 'var(--md-on-surface-variant)'}
                strokeWidth={isActive ? 2 : 1.5} />
            </div>
            <span style={{
              fontSize: 11, fontWeight: isActive ? 600 : 400,
              color: isActive ? 'var(--md-primary)' : 'var(--md-on-surface-variant)',
            }}>{label}</span>
          </button>
        )
      })}
    </div>
  )
}
