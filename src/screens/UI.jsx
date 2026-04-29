// Shared UI primitives for FORCE

export function Screen({ children, style = {} }) {
  return (
    <div style={{
      minHeight: '100dvh',
      background: '#080808',
      display: 'flex',
      flexDirection: 'column',
      padding: '24px 24px 40px',
      maxWidth: 430,
      margin: '0 auto',
      width: '100%',
      ...style
    }}>
      {children}
    </div>
  )
}

export function Logo() {
  return (
    <div style={{
      fontFamily: "'Barlow Condensed', sans-serif",
      fontSize: 28,
      fontWeight: 900,
      color: '#E8FF00',
      letterSpacing: 8,
    }}>
      FORCE
    </div>
  )
}

export function Title({ children, style = {} }) {
  return (
    <div style={{
      fontFamily: "'Barlow Condensed', sans-serif",
      fontSize: 32,
      fontWeight: 800,
      color: '#f0f0f0',
      lineHeight: 1.15,
      ...style
    }}>
      {children}
    </div>
  )
}

export function Sub({ children, style = {} }) {
  return (
    <div style={{
      fontFamily: "'Barlow Condensed', sans-serif",
      fontSize: 16,
      fontWeight: 400,
      color: '#777',
      lineHeight: 1.5,
      ...style
    }}>
      {children}
    </div>
  )
}

export function Label({ children, style = {} }) {
  return (
    <div style={{
      fontFamily: "'Barlow Condensed', sans-serif",
      fontSize: 12,
      fontWeight: 700,
      color: '#555',
      letterSpacing: 2,
      ...style
    }}>
      {children}
    </div>
  )
}

export function Dim({ children, style = {} }) {
  return (
    <div style={{
      fontFamily: "'Barlow Condensed', sans-serif",
      fontSize: 14,
      color: '#555',
      letterSpacing: 1,
      ...style
    }}>
      {children}
    </div>
  )
}

export function Rule({ style = {} }) {
  return (
    <div style={{
      width: '100%',
      height: 1,
      background: '#1e1e1e',
      ...style
    }} />
  )
}

export function Input({ style = {}, ...props }) {
  return (
    <input
      {...props}
      style={{
        width: '100%',
        background: '#111',
        border: '1px solid #2a2a2a',
        borderRadius: 0,
        color: '#f0f0f0',
        padding: '14px 16px',
        fontSize: 16,
        fontFamily: "'Courier Prime', monospace",
        outline: 'none',
        WebkitAppearance: 'none',
        '&:focus': { borderColor: '#E8FF00' },
        ...style
      }}
      onFocus={e => e.target.style.borderColor = '#E8FF00'}
      onBlur={e => e.target.style.borderColor = '#2a2a2a'}
    />
  )
}

export function Textarea({ style = {}, ...props }) {
  return (
    <textarea
      {...props}
      style={{
        width: '100%',
        background: '#111',
        border: '1px solid #2a2a2a',
        borderRadius: 0,
        color: '#f0f0f0',
        padding: '14px 16px',
        fontSize: 15,
        fontFamily: "'Courier Prime', monospace",
        outline: 'none',
        resize: 'none',
        lineHeight: 1.6,
        WebkitAppearance: 'none',
        ...style
      }}
      onFocus={e => e.target.style.borderColor = '#E8FF00'}
      onBlur={e => e.target.style.borderColor = '#2a2a2a'}
    />
  )
}

export function PrimaryBtn({ children, style = {}, ...props }) {
  return (
    <button
      {...props}
      style={{
        width: '100%',
        background: '#E8FF00',
        color: '#080808',
        border: 'none',
        padding: '18px 24px',
        fontFamily: "'Barlow Condensed', sans-serif",
        fontWeight: 800,
        fontSize: 18,
        letterSpacing: 3,
        cursor: props.disabled ? 'not-allowed' : 'pointer',
        opacity: props.disabled ? 0.5 : 1,
        transition: 'opacity 0.15s',
        ...style
      }}
    >
      {children}
    </button>
  )
}

export function SecondaryBtn({ children, style = {}, ...props }) {
  return (
    <button
      {...props}
      style={{
        width: '100%',
        background: 'transparent',
        color: '#555',
        border: '1px solid #2a2a2a',
        padding: '16px 24px',
        fontFamily: "'Barlow Condensed', sans-serif",
        fontWeight: 700,
        fontSize: 16,
        letterSpacing: 2,
        cursor: 'pointer',
        transition: 'border-color 0.15s, color 0.15s',
        ...style
      }}
    >
      {children}
    </button>
  )
}

export function DangerBtn({ children, style = {}, ...props }) {
  return (
    <button
      {...props}
      style={{
        width: '100%',
        background: 'transparent',
        color: '#FF3333',
        border: '2px solid #FF3333',
        padding: '18px 24px',
        fontFamily: "'Barlow Condensed', sans-serif",
        fontWeight: 800,
        fontSize: 18,
        letterSpacing: 3,
        cursor: 'pointer',
        ...style
      }}
    >
      {children}
    </button>
  )
}

export function Section({ label, children, accent = false }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{
        fontFamily: "'Barlow Condensed', sans-serif",
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: 3,
        color: accent ? '#E8FF00' : '#444',
        marginBottom: 10
      }}>
        {label}
      </div>
      <div style={{
        fontFamily: "'Courier Prime', monospace",
        fontSize: 15,
        color: '#d0d0d0',
        lineHeight: 1.7,
        borderLeft: `2px solid ${accent ? '#E8FF00' : '#1e1e1e'}`,
        paddingLeft: 14
      }}>
        {children}
      </div>
    </div>
  )
}

export function StreakBadge({ streak }) {
  if (!streak) return null
  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      background: '#1a1a00',
      border: '1px solid #E8FF00',
      padding: '4px 10px',
      fontFamily: "'Barlow Condensed', sans-serif",
      fontSize: 14,
      fontWeight: 700,
      color: '#E8FF00',
      letterSpacing: 1
    }}>
      🔥 {streak} {streak === 1 ? 'DAY' : 'DAYS'}
    </div>
  )
}
