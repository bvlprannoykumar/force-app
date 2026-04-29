import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { Screen, Rule } from './UI'

// ─── Goal → behavior focus mapping ───────────────────────────────────────────
const GOAL_BEHAVIOR_MAP = {
  not_paid:        'negotiation + clarity + direct questioning',
  not_serious:     'tone + structure + confidence control',
  hold_back:       'expression + discomfort + directness',
  income_convert:  'sales + probing + outcome focus'
}

const STEPS = [
  {
    question: 'Where are you stuck right now?',
    key: 'goal',
    autoDefault: 'not_paid',
    options: [
      { value: 'not_paid',       label: "I'm not getting paid what I should" },
      { value: 'not_serious',    label: "People don't take me seriously in conversations" },
      { value: 'hold_back',      label: "I hold back instead of saying what I really think" },
      { value: 'income_convert', label: "I don't know how to turn conversations into income" }
    ]
  },
  {
    question: 'Where do your conversations usually happen?',
    key: 'context_type',
    autoDefault: 'manager_team',
    options: [
      { value: 'manager_team',  label: 'With my manager or team' },
      { value: 'clients',       label: 'With clients or external people' },
      { value: 'own_business',  label: 'I work on my own (freelance/business)' },
      { value: 'mixed',         label: 'Not sure / mixed situations' }
    ]
  },
  {
    question: 'How do you usually handle uncomfortable conversations?',
    key: 'confidence_level',
    autoDefault: 'medium',
    options: [
      { value: 'low',    label: 'I avoid them completely' },
      { value: 'medium', label: 'I try, but I soften my words' },
      { value: 'high',   label: 'I lean in. I just need structure.' }
    ]
  }
]

const QUICK_START_DEFAULTS = {
  goal: 'not_paid',
  context_type: 'manager_team',
  confidence_level: 'medium'
}

const NUDGE_DELAY = 6000
const AUTO_DELAY = 10000

export default function Onboarding({ user, onDone }) {
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState({})
  const [loading, setLoading] = useState(false)
  const [nudge, setNudge] = useState(false)
  const nudgeTimer = useRef(null)
  const autoTimer = useRef(null)

  const current = STEPS[step]
  const isLast = step === STEPS.length - 1

  useEffect(() => {
    setNudge(false)
    clearTimeout(nudgeTimer.current)
    clearTimeout(autoTimer.current)

    nudgeTimer.current = setTimeout(() => setNudge(true), NUDGE_DELAY)
    autoTimer.current = setTimeout(() => {
      setNudge(false)
      select(current.key, current.autoDefault, true)
    }, AUTO_DELAY)

    return () => {
      clearTimeout(nudgeTimer.current)
      clearTimeout(autoTimer.current)
    }
  }, [step])

  function select(key, value, isAuto = false) {
    clearTimeout(nudgeTimer.current)
    clearTimeout(autoTimer.current)
    setNudge(false)
    const updated = { ...answers, [key]: value }
    setAnswers(updated)
    if (!isLast) {
      setTimeout(() => setStep(s => s + 1), isAuto ? 0 : 160)
    } else {
      handleSubmit(updated)
    }
  }

  function handleQuickStart() {
    clearTimeout(nudgeTimer.current)
    clearTimeout(autoTimer.current)
    handleSubmit(QUICK_START_DEFAULTS)
  }

  async function handleSubmit(finalAnswers) {
    setLoading(true)
    const updates = {
      ...finalAnswers,
      behavior_focus: GOAL_BEHAVIOR_MAP[finalAnswers.goal] || '',
      streak_days: 0,
      total_completions: 0,
      last_completed_date: null
    }

    if (supabase && user?.id) {
      await supabase.from('users').update(updates).eq('id', user.id)
    }

    const updatedUser = { ...user, ...updates }
    if (!supabase) {
      localStorage.setItem('force_user_data', JSON.stringify(updatedUser))
    }

    setLoading(false)
    onDone(updatedUser)
  }

  if (loading) {
    return (
      <Screen>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: 20 }}>
          <div style={s.logo}>FORCE</div>
          <div style={s.meta}>BUILDING YOUR SYSTEM...</div>
        </div>
      </Screen>
    )
  }

  return (
    <Screen>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', paddingTop: 16 }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 40 }}>
          <div style={s.logo}>FORCE</div>
          {step === 0 && (
            <button onClick={handleQuickStart} style={s.skipBtn}>
              Skip → Just give me today's move
            </button>
          )}
        </div>

        {/* Progress bar */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 32 }}>
          {STEPS.map((_, i) => (
            <div key={i} style={{
              height: 3,
              flex: i === step ? 2 : 1,
              background: i <= step ? '#E8FF00' : '#222',
              transition: 'all 0.3s',
            }} />
          ))}
        </div>

        <div style={s.meta}>{step + 1} / {STEPS.length}</div>

        {/* Question */}
        <div style={s.question}>{current.question}</div>

        <Rule style={{ marginBottom: 24, marginTop: 4 }} />

        {/* Options */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {current.options.map(opt => {
            const sel = answers[current.key] === opt.value
            return (
              <button
                key={opt.value}
                onClick={() => select(current.key, opt.value)}
                style={{
                  ...s.optBtn,
                  background: sel ? '#E8FF00' : '#141414',
                  color: sel ? '#080808' : '#e0e0e0',
                  border: `1px solid ${sel ? '#E8FF00' : '#303030'}`,
                }}
              >
                {opt.label}
              </button>
            )
          })}
        </div>

        {/* Overthink nudge */}
        <div style={{
          marginTop: 24,
          padding: nudge ? '12px 16px' : '0 16px',
          minHeight: 44,
          background: nudge ? '#1a0808' : 'transparent',
          border: nudge ? '1px solid #FF3333' : '1px solid transparent',
          transition: 'all 0.35s',
          display: 'flex',
          alignItems: 'center'
        }}>
          {nudge && (
            <div style={s.nudge}>You're overthinking this. Pick one.</div>
          )}
        </div>

      </div>
    </Screen>
  )
}

const s = {
  logo: {
    fontFamily: "'Barlow Condensed', sans-serif",
    fontSize: 24,
    fontWeight: 900,
    color: '#E8FF00',
    letterSpacing: 7,
  },
  skipBtn: {
    background: 'transparent',
    border: 'none',
    color: '#555',
    fontFamily: "'Barlow Condensed', sans-serif",
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    textDecoration: 'underline',
    padding: 0,
    letterSpacing: 0.3,
  },
  meta: {
    fontFamily: "'Barlow Condensed', sans-serif",
    fontSize: 13,
    fontWeight: 600,
    color: '#444',
    letterSpacing: 2,
    marginBottom: 14,
  },
  question: {
    fontFamily: "'Barlow Condensed', sans-serif",
    fontSize: 26,
    fontWeight: 700,
    color: '#ffffff',
    lineHeight: 1.25,
    marginBottom: 20,
    letterSpacing: 0.2,
  },
  optBtn: {
    width: '100%',
    padding: '16px 18px',
    textAlign: 'left',
    fontFamily: "'Barlow Condensed', sans-serif",
    fontWeight: 600,
    fontSize: 17,
    letterSpacing: 0.2,
    cursor: 'pointer',
    transition: 'all 0.12s',
    lineHeight: 1.3,
  },
  nudge: {
    fontFamily: "'Barlow Condensed', sans-serif",
    fontSize: 15,
    fontWeight: 700,
    color: '#FF3333',
    letterSpacing: 1,
  }
}
