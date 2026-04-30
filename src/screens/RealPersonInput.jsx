import { useState } from 'react'
import { Screen, Logo, Rule, PrimaryBtn, SecondaryBtn, Input, Textarea, Dim } from './UI'

export default function RealPersonInput({ dayNumber, stage, onDone, onSkip }) {
  const [name, setName] = useState('')
  const [role, setRole] = useState('')
  const [about, setAbout] = useState('')
  const [error, setError] = useState('')

  function handleSubmit() {
    if (!name.trim()) {
      setError('Enter their name.')
      return
    }
    onDone({ name: name.trim(), role: role.trim(), about: about.trim() })
  }

  return (
    <Screen>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', paddingTop: 16 }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 40 }}>
          <div style={s.logo}>FORCE</div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
            <div style={s.dayLabel}>DAY {dayNumber}</div>
            <div style={s.stageLabel}>{stage}</div>
          </div>
        </div>

        {/* Question */}
        <div style={s.question}>
          Who is the real person you need to speak to?
        </div>
        <div style={s.sub}>
          No fake names. No hypotheticals. A real person in your world right now.
        </div>

        <Rule style={{ marginBottom: 32, marginTop: 20 }} />

        {/* Name field */}
        <div style={s.fieldLabel}>THEIR NAME</div>
        <Input
          type="text"
          placeholder="e.g. Rahul"
          value={name}
          onChange={e => { setName(e.target.value); setError('') }}
          style={{ marginBottom: 20 }}
          autoFocus
        />

        {/* Role field */}
        <div style={s.fieldLabel}>THEIR ROLE / RELATIONSHIP</div>
        <Input
          type="text"
          placeholder="e.g. My manager, A client, Team lead"
          value={role}
          onChange={e => setRole(e.target.value)}
          style={{ marginBottom: 20 }}
        />

        {/* Optional context */}
        <div style={s.fieldLabel}>WHAT IS THE CONVERSATION ABOUT? <span style={{ color: '#444', fontWeight: 400 }}>(optional)</span></div>
        <Textarea
          placeholder="e.g. I've been avoiding asking for a raise. Or: I need to push back on a deadline."
          rows={3}
          value={about}
          onChange={e => setAbout(e.target.value)}
          style={{ marginBottom: 8 }}
        />

        {error && <div style={{ color: '#FF3333', fontFamily: "'Barlow Condensed', sans-serif", fontSize: 14, fontWeight: 600, marginBottom: 12 }}>{error}</div>}

        <PrimaryBtn onClick={handleSubmit} style={{ marginTop: 16 }}>
          BUILD MY MOVE →
        </PrimaryBtn>

        <SecondaryBtn onClick={onSkip} style={{ marginTop: 12 }}>
          I don't know yet — pick from my world
        </SecondaryBtn>

      </div>
    </Screen>
  )
}

const s = {
  logo: {
    fontFamily: "'Barlow Condensed', sans-serif",
    fontSize: 24, fontWeight: 900, color: '#E8FF00', letterSpacing: 7,
  },
  dayLabel: {
    fontFamily: "'Barlow Condensed', sans-serif",
    fontSize: 13, fontWeight: 700, color: '#666', letterSpacing: 2,
  },
  stageLabel: {
    fontFamily: "'Barlow Condensed', sans-serif",
    fontSize: 11, fontWeight: 800, color: '#E8FF00', letterSpacing: 3,
  },
  question: {
    fontFamily: "'Barlow Condensed', sans-serif",
    fontSize: 26, fontWeight: 700, color: '#ffffff', lineHeight: 1.2, marginBottom: 12,
  },
  sub: {
    fontFamily: "'Barlow Condensed', sans-serif",
    fontSize: 15, fontWeight: 400, color: '#666', lineHeight: 1.5,
  },
  fieldLabel: {
    fontFamily: "'Barlow Condensed', sans-serif",
    fontSize: 11, fontWeight: 800, color: '#909090', letterSpacing: 3,
    marginBottom: 8, textTransform: 'uppercase',
  }
}
