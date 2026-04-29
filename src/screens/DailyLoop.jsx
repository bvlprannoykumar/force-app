import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { generateMove, generatePreConversation, generateReflection } from '../lib/ai'
import { Screen, Logo, Title, Sub, PrimaryBtn, SecondaryBtn, DangerBtn, Rule, Dim, Label, Section, Textarea, StreakBadge } from './UI'

const FOUR_HOURS_MS = 4 * 60 * 60 * 1000

const FEEDBACK = {
  no: {
    label: 'AVOIDED.',
    color: '#FF3333',
    lines: ["You didn't do it.", "Not because you were busy.", "Because you avoided discomfort.", "That's the pattern keeping you stuck."]
  },
  yes_weak: {
    label: 'PARTICIPATED.',
    color: '#888',
    lines: ["You showed up.", "But you stayed safe.", "That's not execution.", "That's participation."]
  },
  yes_strong: {
    label: 'EXECUTED.',
    color: '#00FF88',
    lines: ["Good.", "You did the part most people avoid.", "Now we make it sharper tomorrow."]
  }
}

// ─── Timer Utils ──────────────────────────────────────────────────────────────

function formatTime(ms) {
  if (ms <= 0) return '00:00:00'
  const h = Math.floor(ms / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  const s = Math.floor((ms % 60000) / 1000)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function getToday() {
  return new Date().toDateString()
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function DailyLoop({ user, onUserUpdate }) {
  const [step, setStep] = useState('init')
  const [moveData, setMoveData] = useState(null)
  const [preData, setPreData] = useState(null)
  const [reflectionData, setReflectionData] = useState(null)
  const [reflectionInput, setReflectionInput] = useState('')
  const [feedbackType, setFeedbackType] = useState(null)
  const [sessionId, setSessionId] = useState(null)
  const [dayNumber, setDayNumber] = useState(1)
  const [timerStart, setTimerStart] = useState(null)
  const [timeLeft, setTimeLeft] = useState(FOUR_HOURS_MS)
  const [showPreModal, setShowPreModal] = useState(false)
  const [loadingPre, setLoadingPre] = useState(false)
  const [error, setError] = useState('')
  const timerRef = useRef(null)

  // Init session on mount
  useEffect(() => { initSession() }, [])

  // Timer tick
  useEffect(() => {
    if (step === 'timer' && timerStart) {
      timerRef.current = setInterval(() => {
        const elapsed = Date.now() - timerStart
        const remaining = Math.max(0, FOUR_HOURS_MS - elapsed)
        setTimeLeft(remaining)
        if (remaining === 0) {
          clearInterval(timerRef.current)
          goToStep('completion')
        }
      }, 1000)
    }
    return () => clearInterval(timerRef.current)
  }, [step, timerStart])

  function goToStep(s) {
    setStep(s)
    localStorage.setItem('force_session_step', s)
  }

  async function initSession() {
    const today = getToday()
    const savedDate = localStorage.getItem('force_session_date')
    const savedStep = localStorage.getItem('force_session_step')
    const savedMove = localStorage.getItem('force_move_data')
    const savedSessionId = localStorage.getItem('force_session_id')
    const savedTimerStart = localStorage.getItem('force_timer_start')
    const savedFeedback = localStorage.getItem('force_feedback_type')

    // Resume today's session
    if (savedDate === today && savedStep && savedMove) {
      setMoveData(JSON.parse(savedMove))
      if (savedSessionId) setSessionId(savedSessionId)
      if (savedTimerStart) setTimerStart(parseInt(savedTimerStart))
      if (savedFeedback) setFeedbackType(savedFeedback)
      setStep(savedStep)
      return
    }

    // New day
    await generateNewSession()
  }

  async function generateNewSession() {
    goToStep('generating')

    const apiKey = localStorage.getItem('force_api_key')
    const provider = localStorage.getItem('force_provider') || 'gemini'

    // Get day number
    let dayNum = 1
    let previousStatus = 'first_day'

    if (supabase && user?.id) {
      const { count } = await supabase
        .from('sessions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)

      dayNum = (count || 0) + 1

      const { data: last } = await supabase
        .from('sessions')
        .select('completed')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      previousStatus = last
        ? last.completed ? 'completed' : 'not_completed'
        : 'first_day'
    }

    setDayNumber(dayNum)

    try {
      const move = await generateMove(apiKey, provider, {
        goal: user.goal || 'salary_growth',
        context: user.context_type || 'corporate',
        confidence_level: user.confidence_level || 'medium',
        day_number: dayNum,
        previous_status: previousStatus
      })

      setMoveData(move)

      // Save session to Supabase
      if (supabase && user?.id) {
        const today = new Date().toISOString().split('T')[0]
        const { data: session } = await supabase
          .from('sessions')
          .insert({ user_id: user.id, date: today, day_number: dayNum, move: move.raw, completed: false })
          .select()
          .single()
        if (session) {
          setSessionId(session.id)
          localStorage.setItem('force_session_id', session.id)
        }
      }

      const today = getToday()
      localStorage.setItem('force_session_date', today)
      localStorage.setItem('force_move_data', JSON.stringify(move))

      goToStep('move')
    } catch (err) {
      setError(err.message || 'Failed to generate. Check your API key.')
      goToStep('error')
    }
  }

  function handleStartTimer() {
    const start = Date.now()
    setTimerStart(start)
    localStorage.setItem('force_timer_start', start.toString())
    goToStep('timer')
  }

  async function handleAboutToDoIt() {
    setLoadingPre(true)
    setShowPreModal(true)

    if (!preData) {
      const apiKey = localStorage.getItem('force_api_key')
      const provider = localStorage.getItem('force_provider') || 'gemini'
      try {
        const pre = await generatePreConversation(apiKey, provider, moveData)
        setPreData(pre)
      } catch {
        setPreData({
          focus: 'Stay locked on your objective. Nothing else.',
          risk: 'You will over-explain yourself.',
          anchor: 'Ask the question. Then wait. Do not fill the silence.'
        })
      }
    }

    setLoadingPre(false)
  }

  function handleCompletion(didIt) {
    if (!didIt) {
      finalizeFeedback('no')
    } else {
      goToStep('reflection')
    }
  }

  async function handleReflectionSubmit() {
    if (!reflectionInput.trim()) {
      finalizeFeedback('yes_strong')
      return
    }
    goToStep('analyzing')

    const apiKey = localStorage.getItem('force_api_key')
    const provider = localStorage.getItem('force_provider') || 'gemini'

    try {
      const reflection = await generateReflection(apiKey, provider, reflectionInput, moveData)
      setReflectionData(reflection)

      // Update Supabase session
      if (supabase && sessionId) {
        await supabase.from('sessions').update({
          completed: true,
          reflection_input: reflectionInput,
          reflection_output: reflection.raw,
          completion_strength: reflection.isStrong ? 'strong' : 'weak'
        }).eq('id', sessionId)
      }

      await updateStreak(true)
      const type = reflection.isStrong ? 'yes_strong' : 'yes_weak'
      setFeedbackType(type)
      localStorage.setItem('force_feedback_type', type)
      goToStep('reflection_result')
    } catch {
      finalizeFeedback('yes_strong')
    }
  }

  async function finalizeFeedback(type) {
    setFeedbackType(type)
    localStorage.setItem('force_feedback_type', type)

    if (supabase && sessionId) {
      await supabase.from('sessions').update({
        completed: type !== 'no',
        completion_strength: type
      }).eq('id', sessionId)
    }

    if (type !== 'no') await updateStreak(true)
    goToStep('feedback')
  }

  async function updateStreak(completed) {
    if (!user?.id || !supabase) return
    if (!completed) return

    const today = new Date().toISOString().split('T')[0]
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
    const newStreak = user.last_completed_date === yesterday
      ? (user.streak_days || 0) + 1
      : 1

    await supabase.from('users').update({
      streak_days: newStreak,
      last_completed_date: today,
      total_completions: (user.total_completions || 0) + 1
    }).eq('id', user.id)

    onUserUpdate?.({ ...user, streak_days: newStreak, last_completed_date: today })
  }

  // ─── Renders ───────────────────────────────────────────────────────────────

  if (step === 'init' || step === 'generating') {
    return (
      <Screen>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: 16 }}>
          <Logo />
          <Dim style={{ letterSpacing: 3, marginTop: 24, textAlign: 'center' }}>
            GENERATING YOUR MOVE...
          </Dim>
          <div style={{ width: 40, height: 2, background: '#E8FF00', animation: 'none', marginTop: 8 }} />
        </div>
      </Screen>
    )
  }

  if (step === 'error') {
    return (
      <Screen>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <Logo />
          <div style={{ marginTop: 40, marginBottom: 24 }}>
            <Dim style={{ color: '#FF3333', letterSpacing: 2, marginBottom: 12 }}>ERROR</Dim>
            <Title style={{ color: '#FF3333', fontSize: 24 }}>Generation failed.</Title>
            <Sub style={{ marginTop: 12, color: '#FF3333' }}>{error}</Sub>
          </div>
          <Rule />
          <Sub style={{ marginTop: 20, marginBottom: 32 }}>
            Check your API key and provider settings. Make sure you have credits or quota remaining.
          </Sub>
          <PrimaryBtn onClick={() => {
            localStorage.removeItem('force_api_key')
            window.location.reload()
          }}>
            UPDATE API KEY →
          </PrimaryBtn>
          <SecondaryBtn style={{ marginTop: 12 }} onClick={generateNewSession}>
            TRY AGAIN
          </SecondaryBtn>
        </div>
      </Screen>
    )
  }

  if (step === 'move') {
    return (
      <Screen style={{ paddingBottom: 100 }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
          <Logo />
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <StreakBadge streak={user?.streak_days} />
            <Dim>DAY {dayNumber}</Dim>
          </div>
        </div>

        {/* Move */}
        <Dim style={{ letterSpacing: 3, marginBottom: 16 }}>TODAY'S MOVE</Dim>
        <Rule style={{ marginBottom: 24 }} />
        <Section label="CONVERSATION" accent>{moveData?.conversation}</Section>
        <Section label="OBJECTIVE">{moveData?.objective}</Section>
        <Section label="CONSTRAINT" accent>{moveData?.constraint}</Section>

        <Rule style={{ marginBottom: 24, marginTop: 8 }} />
        <Dim style={{ letterSpacing: 3, marginBottom: 16 }}>EXECUTION PLAN</Dim>
        <Section label="OPENING" accent>{moveData?.opening}</Section>
        <Section label="QUESTION 1">{moveData?.q1}</Section>
        <Section label="QUESTION 2">{moveData?.q2}</Section>

        <Rule style={{ marginBottom: 24, marginTop: 8 }} />
        <Section label="MANDATORY ASK" accent>{moveData?.mandatoryAsk}</Section>
        <Section label="FAILURE RISK">{moveData?.prediction}</Section>
        <Section label="WIN CONDITION" accent>{moveData?.winCondition}</Section>

        {/* Sticky CTA */}
        <div style={{
          position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
          width: '100%', maxWidth: 430, padding: '16px 24px',
          background: 'linear-gradient(to top, #080808 80%, transparent)',
        }}>
          <PrimaryBtn onClick={handleStartTimer}>
            I UNDERSTAND. START THE CLOCK →
          </PrimaryBtn>
        </div>
      </Screen>
    )
  }

  if (step === 'timer') {
    const isUrgent = timeLeft < 3600000 // under 1 hour
    return (
      <Screen>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 40 }}>
          <Logo />
          <StreakBadge streak={user?.streak_days} />
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <Dim style={{ letterSpacing: 3, marginBottom: 16 }}>YOU HAVE</Dim>
          <div style={{
            fontFamily: "'Courier Prime', monospace",
            fontSize: 52,
            fontWeight: 700,
            color: isUrgent ? '#FF3333' : '#E8FF00',
            letterSpacing: 4,
            marginBottom: 8,
            transition: 'color 0.5s'
          }}>
            {formatTime(timeLeft)}
          </div>
          <Dim style={{ marginBottom: 48 }}>TO INITIATE THIS CONVERSATION.</Dim>

          <Rule style={{ marginBottom: 28 }} />

          <Section label="FAILURE RISK">
            {moveData?.prediction}
          </Section>

          <Rule style={{ marginBottom: 28 }} />

          <PrimaryBtn onClick={handleAboutToDoIt} disabled={loadingPre}>
            {loadingPre ? 'LOADING...' : "I'M ABOUT TO DO IT →"}
          </PrimaryBtn>

          <SecondaryBtn style={{ marginTop: 12 }} onClick={() => handleCompletion(true)}>
            MARK AS COMPLETE
          </SecondaryBtn>

          <DangerBtn style={{ marginTop: 12 }} onClick={() => handleCompletion(false)}>
            I DIDN'T DO IT
          </DangerBtn>
        </div>

        {/* Pre-conversation modal */}
        {showPreModal && (
          <div style={{
            position: 'fixed', inset: 0, background: 'rgba(8,8,8,0.95)',
            display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
            zIndex: 100
          }}>
            <div style={{
              background: '#111', border: '1px solid #2a2a2a',
              padding: '32px 24px 40px', maxWidth: 430, width: '100%', margin: '0 auto'
            }}>
              {loadingPre ? (
                <Dim style={{ textAlign: 'center', letterSpacing: 3 }}>LOADING REMINDER...</Dim>
              ) : (
                <>
                  <Dim style={{ letterSpacing: 3, marginBottom: 24 }}>EXECUTION REMINDER</Dim>
                  <Rule style={{ marginBottom: 24 }} />
                  {preData?.focus && <Section label="FOCUS" accent>{preData.focus}</Section>}
                  {preData?.risk && <Section label="RISK">{preData.risk}</Section>}
                  {preData?.anchor && <Section label="ANCHOR" accent>{preData.anchor}</Section>}
                  <Rule style={{ marginBottom: 24 }} />
                  <PrimaryBtn onClick={() => { setShowPreModal(false); handleCompletion(true) }}>
                    I'VE DONE IT ✓
                  </PrimaryBtn>
                  <SecondaryBtn style={{ marginTop: 10 }} onClick={() => setShowPreModal(false)}>
                    NOT YET. BACK TO TIMER.
                  </SecondaryBtn>
                </>
              )}
            </div>
          </div>
        )}
      </Screen>
    )
  }

  if (step === 'completion') {
    return (
      <Screen>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <Logo />
          <div style={{ marginTop: 48, marginBottom: 48 }}>
            <Title style={{ fontSize: 44 }}>Did you</Title>
            <Title style={{ fontSize: 44, color: '#E8FF00' }}>do it?</Title>
          </div>
          <Rule style={{ marginBottom: 40 }} />
          <PrimaryBtn onClick={() => handleCompletion(true)}>
            YES →
          </PrimaryBtn>
          <DangerBtn style={{ marginTop: 16 }} onClick={() => handleCompletion(false)}>
            NO
          </DangerBtn>
        </div>
      </Screen>
    )
  }

  if (step === 'reflection') {
    return (
      <Screen>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', paddingTop: 32 }}>
          <Logo />
          <div style={{ marginTop: 32, marginBottom: 24 }}>
            <Dim style={{ letterSpacing: 3, marginBottom: 12 }}>REFLECTION</Dim>
            <Title>What happened?</Title>
          </div>
          <Rule style={{ marginBottom: 24 }} />
          <Sub style={{ marginBottom: 24 }}>
            Write what you said. What the response was. What you avoided.
          </Sub>
          <Textarea
            placeholder="They said... I responded... The outcome was..."
            rows={8}
            value={reflectionInput}
            onChange={e => setReflectionInput(e.target.value)}
          />
          <PrimaryBtn onClick={handleReflectionSubmit} style={{ marginTop: 20 }}>
            ANALYZE →
          </PrimaryBtn>
          <SecondaryBtn style={{ marginTop: 12 }} onClick={() => finalizeFeedback('yes_strong')}>
            SKIP. JUST SHOW RESULT.
          </SecondaryBtn>
        </div>
      </Screen>
    )
  }

  if (step === 'analyzing') {
    return (
      <Screen>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
          <Logo />
          <Dim style={{ letterSpacing: 3, marginTop: 32, textAlign: 'center' }}>
            ANALYZING YOUR EXECUTION...
          </Dim>
        </div>
      </Screen>
    )
  }

  if (step === 'reflection_result') {
    return (
      <Screen style={{ paddingBottom: 100 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
          <Logo />
          <StreakBadge streak={user?.streak_days} />
        </div>

        <Dim style={{ letterSpacing: 3, marginBottom: 16 }}>REALITY CHECK</Dim>
        <Rule style={{ marginBottom: 24 }} />

        {reflectionData?.reality && <Section label="WHAT ACTUALLY HAPPENED" accent>{reflectionData.reality}</Section>}
        {reflectionData?.hesitation && <Section label="HESITATION POINT">{reflectionData.hesitation}</Section>}
        {reflectionData?.avoidance && <Section label="AVOIDANCE PATTERN">{reflectionData.avoidance}</Section>}
        {reflectionData?.correction && <Section label="CORRECTION FOR TOMORROW" accent>{reflectionData.correction}</Section>}

        <div style={{
          position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
          width: '100%', maxWidth: 430, padding: '16px 24px',
          background: 'linear-gradient(to top, #080808 80%, transparent)'
        }}>
          <PrimaryBtn onClick={() => goToStep('feedback')}>
            CONTINUE →
          </PrimaryBtn>
        </div>
      </Screen>
    )
  }

  if (step === 'feedback') {
    const fb = FEEDBACK[feedbackType] || FEEDBACK.yes_strong
    const streak = user?.streak_days || 0
    return (
      <Screen>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <Logo />

          {/* Status */}
          <div style={{
            marginTop: 32, marginBottom: 32,
            padding: '12px 16px',
            border: `2px solid ${fb.color}`,
            display: 'inline-block'
          }}>
            <span style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: 28,
              fontWeight: 900,
              color: fb.color,
              letterSpacing: 4
            }}>
              {fb.label}
            </span>
          </div>

          <Rule style={{ marginBottom: 32 }} />

          {/* Feedback lines */}
          {fb.lines.map((line, i) => (
            <div key={i} style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: i === 0 ? 32 : 22,
              fontWeight: i === 0 ? 800 : 400,
              color: i === 0 ? '#f0f0f0' : '#666',
              marginBottom: i === 0 ? 12 : 6,
              lineHeight: 1.3
            }}>
              {line}
            </div>
          ))}

          <Rule style={{ marginTop: 40, marginBottom: 32 }} />

          {/* Streak */}
          {streak > 0 && (
            <div style={{ marginBottom: 32 }}>
              <StreakBadge streak={streak} />
              {streak >= 3 && streak < 7 && (
                <Dim style={{ marginTop: 12 }}>Day 7 unlocks objection handling.</Dim>
              )}
              {streak >= 7 && streak < 11 && (
                <Dim style={{ marginTop: 12 }}>Day 11 unlocks custom move selection.</Dim>
              )}
              {streak >= 11 && streak < 21 && (
                <Dim style={{ marginTop: 12 }}>Day 21 unlocks a free 1:1 call.</Dim>
              )}
              {streak >= 21 && (
                <Dim style={{ marginTop: 12, color: '#E8FF00' }}>
                  You've unlocked a free 1:1 call. Reach out to claim it.
                </Dim>
              )}
            </div>
          )}

          <Dim style={{ marginBottom: 24 }}>
            Come back tomorrow. One conversation. Every day.
          </Dim>

          <SecondaryBtn onClick={() => {
            localStorage.removeItem('force_session_date')
            localStorage.removeItem('force_session_step')
            localStorage.removeItem('force_move_data')
            localStorage.removeItem('force_session_id')
            localStorage.removeItem('force_timer_start')
            localStorage.removeItem('force_feedback_type')
            window.location.reload()
          }}>
            SEE YOU TOMORROW.
          </SecondaryBtn>
        </div>
      </Screen>
    )
  }

  return null
}
