import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { Screen, Logo, Title, Sub, PrimaryBtn, Rule, Dim, Label } from './UI'

const STEPS = [
  {
    question: 'What do you want?',
    key: 'goal',
    options: [
      { value: 'salary_growth', label: 'SALARY GROWTH' },
      { value: 'influence', label: 'INFLUENCE' },
      { value: 'sales', label: 'SALES' },
      { value: 'career_switch', label: 'CAREER SWITCH' }
    ]
  },
  {
    question: 'Your context?',
    key: 'context_type',
    options: [
      { value: 'corporate', label: 'CORPORATE JOB' },
      { value: 'freelance', label: 'FREELANCE' },
      { value: 'internal', label: 'INTERNAL ROLE' },
      { value: 'client_facing', label: 'CLIENT-FACING' }
    ]
  },
  {
    question: 'Your current level?',
    key: 'confidence_level',
    sub: 'How comfortable are you with uncomfortable conversations?',
    options: [
      { value: 'low', label: 'LOW', desc: 'I avoid them' },
      { value: 'medium', label: 'MEDIUM', desc: 'I try but soften' },
      { value: 'high', label: 'HIGH', desc: 'I lean in' }
    ]
  }
]

export default function Onboarding({ user, onDone }) {
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState({})
  const [loading, setLoading] = useState(false)

  const current = STEPS[step]
  const isLast = step === STEPS.length - 1

  function select(key, value) {
    const updated = { ...answers, [key]: value }
    setAnswers(updated)

    if (!isLast) {
      setTimeout(() => setStep(s => s + 1), 200)
    } else {
      handleSubmit(updated)
    }
  }

  async function handleSubmit(finalAnswers) {
    setLoading(true)
    const updates = {
      ...finalAnswers,
      streak_days: 0,
      total_completions: 0,
      last_completed_date: null
    }

    if (supabase && user?.id) {
      await supabase.from('users').update(updates).eq('id', user.id)
    }

    const updatedUser = { ...user, ...updates }
    const stored = localStorage.getItem('force_user_data')
    if (stored || !supabase) {
      localStorage.setItem('force_user_data', JSON.stringify(updatedUser))
    }

    setLoading(false)
    onDone(updatedUser)
  }

  if (loading) {
    return (
      <Screen>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
          <Dim style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 18, letterSpacing: 2 }}>
            BUILDING YOUR SYSTEM...
          </Dim>
        </div>
      </Screen>
    )
  }

  return (
    <Screen>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        {/* Progress dots */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 48 }}>
          {STEPS.map((_, i) => (
            <div key={i} style={{
              width: i === step ? 24 : 8,
              height: 4,
              background: i <= step ? '#E8FF00' : '#2a2a2a',
              transition: 'all 0.3s'
            }} />
          ))}
        </div>

        <Dim style={{ letterSpacing: 2, marginBottom: 16 }}>
          QUESTION {step + 1} OF {STEPS.length}
        </Dim>
        <Title style={{ marginBottom: 8 }}>{current.question}</Title>
        {current.sub && <Sub style={{ marginBottom: 32 }}>{current.sub}</Sub>}

        <Rule style={{ marginBottom: 32 }} />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {current.options.map(opt => {
            const isSelected = answers[current.key] === opt.value
            return (
              <button
                key={opt.value}
                onClick={() => select(current.key, opt.value)}
                style={{
                  background: isSelected ? '#E8FF00' : 'transparent',
                  color: isSelected ? '#080808' : '#f0f0f0',
                  border: `2px solid ${isSelected ? '#E8FF00' : '#2a2a2a'}`,
                  padding: '16px 20px',
                  textAlign: 'left',
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontWeight: 800,
                  fontSize: 20,
                  letterSpacing: 2,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <span>{opt.label}</span>
                {opt.desc && (
                  <span style={{ fontSize: 13, fontWeight: 400, opacity: 0.7, letterSpacing: 0 }}>
                    {opt.desc}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>
    </Screen>
  )
}
