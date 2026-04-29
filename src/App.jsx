import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import EmailCapture from './screens/EmailCapture'
import APIKeySetup from './screens/APIKeySetup'
import Onboarding from './screens/Onboarding'
import DailyLoop from './screens/DailyLoop'

export default function App() {
  const [screen, setScreen] = useState('loading')
  const [user, setUser] = useState(null)

  useEffect(() => { bootstrap() }, [])

  async function bootstrap() {
    const uid = localStorage.getItem('force_uid')
    const apiKey = localStorage.getItem('force_api_key')

    if (!uid) { setScreen('email'); return }
    if (!apiKey) { setScreen('apikey'); return }

    if (supabase) {
      const { data } = await supabase.from('users').select('*').eq('id', uid).single()
      if (!data) { localStorage.removeItem('force_uid'); setScreen('email'); return }
      setUser(data)
      if (!data.goal) { setScreen('onboarding'); return }
    } else {
      // Supabase not configured: use localStorage only
      const stored = localStorage.getItem('force_user_data')
      if (stored) {
        const u = JSON.parse(stored)
        setUser(u)
        if (!u.goal) { setScreen('onboarding'); return }
      } else {
        setScreen('email'); return
      }
    }

    setScreen('daily')
  }

  function handleEmailDone(u) {
    setUser(u)
    if (!localStorage.getItem('force_api_key')) {
      setScreen('apikey')
    } else if (!u.goal) {
      setScreen('onboarding')
    } else {
      setScreen('daily')
    }
  }

  function handleAPIKeyDone() {
    if (!user?.goal) {
      setScreen('onboarding')
    } else {
      setScreen('daily')
    }
  }

  function handleOnboardingDone(updatedUser) {
    setUser(updatedUser)
    setScreen('daily')
  }

  if (screen === 'loading') return <Splash />
  if (screen === 'email') return <EmailCapture onDone={handleEmailDone} />
  if (screen === 'apikey') return <APIKeySetup onDone={handleAPIKeyDone} />
  if (screen === 'onboarding') return <Onboarding user={user} onDone={handleOnboardingDone} />
  if (screen === 'daily') return <DailyLoop user={user} onUserUpdate={setUser} />
  return null
}

function Splash() {
  return (
    <div style={{ minHeight: '100dvh', background: '#080808', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 52, fontWeight: 900, color: '#E8FF00', letterSpacing: 10 }}>
        FORCE
      </span>
    </div>
  )
}
