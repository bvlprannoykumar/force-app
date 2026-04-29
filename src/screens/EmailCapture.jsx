import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { Screen, Logo, Title, Sub, Input, PrimaryBtn, Rule, Dim } from './UI'

export default function EmailCapture({ onDone }) {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit() {
    const trimmed = email.trim().toLowerCase()
    if (!trimmed || !trimmed.includes('@')) {
      setError('Enter a valid email.')
      return
    }
    setLoading(true)
    setError('')

    try {
      let userData

      if (supabase) {
        // Check if user exists
        const { data: existing } = await supabase
          .from('users')
          .select('*')
          .eq('email', trimmed)
          .single()

        if (existing) {
          userData = existing
        } else {
          // Create new user
          const { data: created, error: createErr } = await supabase
            .from('users')
            .insert({ email: trimmed })
            .select()
            .single()
          if (createErr) throw createErr
          userData = created
        }
      } else {
        // Supabase not configured: use localStorage
        const uid = crypto.randomUUID()
        userData = { id: uid, email: trimmed, streak_days: 0 }
        localStorage.setItem('force_user_data', JSON.stringify(userData))
      }

      localStorage.setItem('force_uid', userData.id)
      localStorage.setItem('force_email', trimmed)
      onDone(userData)
    } catch (err) {
      setError(err.message || 'Something went wrong. Try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Screen>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <Logo />
        <div style={{ marginTop: 40, marginBottom: 48 }}>
          <Title>You don't need more learning.</Title>
          <Title style={{ color: '#E8FF00' }}>You need one real conversation.</Title>
        </div>
        <Rule />
        <Sub style={{ marginTop: 24, marginBottom: 32 }}>
          Every day. One forced conversation.<br />
          No motivation. No content. Just execution.
        </Sub>
        <Input
          type="email"
          placeholder="your@email.com"
          value={email}
          onChange={e => setEmail(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          autoFocus
        />
        {error && <Dim style={{ color: '#FF3333', marginTop: 8 }}>{error}</Dim>}
        <PrimaryBtn onClick={handleSubmit} disabled={loading} style={{ marginTop: 16 }}>
          {loading ? 'ENTERING...' : 'ENTER →'}
        </PrimaryBtn>
        <Rule style={{ marginTop: 40 }} />
        <Dim style={{ marginTop: 20, lineHeight: 1.8 }}>
          No password. No verification.<br />
          Just your email. That's it.
        </Dim>
      </div>
    </Screen>
  )
}
