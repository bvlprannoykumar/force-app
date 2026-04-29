import { useState } from 'react'
import { Screen, Logo, Title, Sub, Input, PrimaryBtn, SecondaryBtn, Rule, Dim, Label } from './UI'

const PROVIDERS = [
  {
    id: 'gemini',
    name: 'GEMINI FLASH',
    tag: 'FREE',
    tagColor: '#00FF88',
    description: '1,500 requests/day. No credit card.',
    steps: [
      'Go to aistudio.google.com',
      'Sign in with Google',
      'Click "Get API Key" → Create API key',
      'Copy and paste below'
    ],
    link: 'https://aistudio.google.com/app/apikey',
    placeholder: 'AIzaSy...'
  },
  {
    id: 'groq',
    name: 'GROQ',
    tag: 'FREE',
    tagColor: '#00FF88',
    description: '14,400 requests/day. Fast.',
    steps: [
      'Go to console.groq.com',
      'Create a free account',
      'API Keys → Create API Key',
      'Copy and paste below'
    ],
    link: 'https://console.groq.com/keys',
    placeholder: 'gsk_...'
  },
  {
    id: 'openrouter',
    name: 'OPENROUTER',
    tag: 'FREE TIER',
    tagColor: '#00FF88',
    description: 'Free models available. Multi-model.',
    steps: [
      'Go to openrouter.ai',
      'Create account',
      'Keys → Create Key',
      'Copy and paste below'
    ],
    link: 'https://openrouter.ai/keys',
    placeholder: 'sk-or-...'
  },
  {
    id: 'anthropic',
    name: 'ANTHROPIC',
    tag: 'PAID',
    tagColor: '#FF3333',
    description: 'Claude Haiku. ~₹0.25/session.',
    steps: [
      'Go to console.anthropic.com',
      'Add billing (credit card required)',
      'API Keys → Create Key',
      'Copy and paste below'
    ],
    link: 'https://console.anthropic.com/settings/keys',
    placeholder: 'sk-ant-...'
  }
]

export default function APIKeySetup({ onDone }) {
  const [selected, setSelected] = useState('gemini')
  const [apiKey, setApiKey] = useState('')
  const [error, setError] = useState('')

  const provider = PROVIDERS.find(p => p.id === selected)

  function handleSave() {
    if (!apiKey.trim()) {
      setError('Paste your API key above.')
      return
    }
    localStorage.setItem('force_api_key', apiKey.trim())
    localStorage.setItem('force_provider', selected)
    onDone()
  }

  return (
    <Screen>
      <div style={{ paddingTop: 24, paddingBottom: 40 }}>
        <Logo />
        <div style={{ marginTop: 32, marginBottom: 24 }}>
          <Dim>STEP 2 OF 2</Dim>
          <Title style={{ marginTop: 8 }}>Connect your AI.</Title>
          <Sub style={{ marginTop: 8 }}>Choose a provider. Gemini is free and takes 60 seconds.</Sub>
        </div>

        <Rule />

        {/* Provider tabs */}
        <div style={{ display: 'flex', gap: 8, marginTop: 24, flexWrap: 'wrap' }}>
          {PROVIDERS.map(p => (
            <button
              key={p.id}
              onClick={() => setSelected(p.id)}
              style={{
                background: selected === p.id ? '#E8FF00' : 'transparent',
                color: selected === p.id ? '#080808' : '#666',
                border: `1px solid ${selected === p.id ? '#E8FF00' : '#2a2a2a'}`,
                padding: '6px 12px',
                fontFamily: "'Barlow Condensed', sans-serif",
                fontWeight: 700,
                fontSize: 13,
                letterSpacing: 1,
                cursor: 'pointer',
                transition: 'all 0.15s'
              }}
            >
              {p.name}
            </button>
          ))}
        </div>

        {/* Provider detail */}
        <div style={{ marginTop: 24, padding: '20px', background: '#111', border: '1px solid #2a2a2a' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 18, color: '#f0f0f0', letterSpacing: 1 }}>
              {provider.name}
            </span>
            <span style={{
              background: provider.tagColor + '22',
              color: provider.tagColor,
              fontSize: 11,
              fontWeight: 700,
              padding: '2px 8px',
              fontFamily: "'Barlow Condensed', sans-serif",
              letterSpacing: 1
            }}>
              {provider.tag}
            </span>
          </div>
          <Dim style={{ marginBottom: 16 }}>{provider.description}</Dim>
          <div style={{ marginBottom: 16 }}>
            {provider.steps.map((step, i) => (
              <div key={i} style={{ display: 'flex', gap: 12, marginBottom: 8, alignItems: 'flex-start' }}>
                <span style={{ color: '#E8FF00', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 13, minWidth: 16 }}>
                  {i + 1}.
                </span>
                <Dim style={{ fontSize: 14 }}>{step}</Dim>
              </div>
            ))}
          </div>
          <a
            href={provider.link}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: '#E8FF00',
              fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 700,
              fontSize: 13,
              letterSpacing: 1,
              textDecoration: 'none',
              borderBottom: '1px solid #E8FF00'
            }}
          >
            OPEN {provider.name} →
          </a>
        </div>

        <div style={{ marginTop: 24 }}>
          <Label>PASTE YOUR API KEY</Label>
          <Input
            type="password"
            placeholder={provider.placeholder}
            value={apiKey}
            onChange={e => setApiKey(e.target.value)}
            style={{ marginTop: 8 }}
          />
          {error && <Dim style={{ color: '#FF3333', marginTop: 6 }}>{error}</Dim>}
        </div>

        <PrimaryBtn onClick={handleSave} style={{ marginTop: 24 }}>
          SAVE AND CONTINUE →
        </PrimaryBtn>

        <Dim style={{ marginTop: 16, fontSize: 13 }}>
          Your key is stored only on this device. Never sent to our servers.
        </Dim>
      </div>
    </Screen>
  )
}
