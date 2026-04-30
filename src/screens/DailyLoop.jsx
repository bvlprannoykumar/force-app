import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { generateMove, generatePreConversation, generateReflection, generateDaySummary, getStage } from '../lib/ai'
import { Screen, Logo, Title, Sub, PrimaryBtn, SecondaryBtn, DangerBtn, Rule, Dim, Section, Textarea, StreakBadge } from './UI'
import RealPersonInput from './RealPersonInput'

const FOUR_HOURS_MS = 4 * 60 * 60 * 1000

// Move types for Day 11+ unlock
const MOVE_TYPES = [
  { value: 'NEGOTIATION',           desc: 'Push for more' },
  { value: 'DIRECT ASK',            desc: 'Ask the thing you avoid' },
  { value: 'PUSHBACK',              desc: 'Disagree clearly' },
  { value: 'VISIBILITY MOVE',       desc: 'Make yourself seen' },
  { value: 'CLARITY CONVERSATION',  desc: 'Force a clear answer' },
]

function formatTime(ms) {
  if (ms <= 0) return '00:00:00'
  const h = Math.floor(ms / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  const s = Math.floor((ms % 60000) / 1000)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function getToday() { return new Date().toDateString() }

function clearDayStorage() {
  const keys = [
    'force_session_date','force_session_step','force_task_number',
    'force_move_data_1','force_move_data_2',
    'force_reflection_1','force_reflection_2',
    'force_real_person','force_session_id',
    'force_timer_start','force_day_summary','force_move_type'
  ]
  keys.forEach(k => localStorage.removeItem(k))
}

// ─── Header bar ────────────────────────────────────────────────────────────────

function DayHeader({ dayNumber, stage, streak }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }}>
      <div style={hdr.logo}>FORCE</div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
        {streak > 0 && <StreakBadge streak={streak} />}
        <div style={hdr.dayLabel}>DAY {dayNumber}</div>
        <div style={hdr.stageLabel}>{stage}</div>
      </div>
    </div>
  )
}

const hdr = {
  logo:       { fontFamily: "'Barlow Condensed', sans-serif", fontSize: 24, fontWeight: 900, color: '#E8FF00', letterSpacing: 7 },
  dayLabel:   { fontFamily: "'Barlow Condensed', sans-serif", fontSize: 13, fontWeight: 700, color: '#666', letterSpacing: 2 },
  stageLabel: { fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, fontWeight: 800, color: '#E8FF00', letterSpacing: 3 },
}

// ─── Task progress pills ──────────────────────────────────────────────────────

function TaskProgress({ taskNumber, task1Done, task2Done }) {
  const pills = [
    { n: 1, done: task1Done, active: taskNumber === 1 },
    { n: 2, done: task2Done, active: taskNumber === 2 },
  ]
  return (
    <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
      {pills.map(p => (
        <div key={p.n} style={{
          flex: 1, height: 4,
          background: p.done ? '#00FF88' : p.active ? '#E8FF00' : '#222',
          transition: 'background 0.3s'
        }} />
      ))}
    </div>
  )
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function DailyLoop({ user, onUserUpdate }) {
  const [step, setStep]               = useState('init')
  const [taskNumber, setTaskNumber]   = useState(1)
  const [dayNumber, setDayNumber]     = useState(1)
  const [stage, setStage]             = useState('AWARENESS')
  const [realPerson, setRealPerson]   = useState(null)
  const [moveData1, setMoveData1]     = useState(null)
  const [moveData2, setMoveData2]     = useState(null)
  const [preData, setPreData]         = useState(null)
  const [reflInput1, setReflInput1]   = useState('')
  const [reflInput2, setReflInput2]   = useState('')
  const [reflData1, setReflData1]     = useState(null)
  const [reflData2, setReflData2]     = useState(null)
  const [summaryData, setSummaryData] = useState(null)
  const [sessionId, setSessionId]     = useState(null)
  const [timerStart, setTimerStart]   = useState(null)
  const [timeLeft, setTimeLeft]       = useState(FOUR_HOURS_MS)
  const [showPreModal, setShowPreModal] = useState(false)
  const [loadingPre, setLoadingPre]   = useState(false)
  const [selectedMoveType, setSelectedMoveType] = useState(null)
  const [error, setError]             = useState('')
  const timerRef = useRef(null)

  const currentMove = taskNumber === 1 ? moveData1 : moveData2
  const task1Done = !!reflData1
  const task2Done = !!reflData2

  useEffect(() => { initSession() }, [])

  useEffect(() => {
    if ((step === 'timer') && timerStart) {
      timerRef.current = setInterval(() => {
        const elapsed = Date.now() - timerStart
        const remaining = Math.max(0, FOUR_HOURS_MS - elapsed)
        setTimeLeft(remaining)
        if (remaining === 0) { clearInterval(timerRef.current); goTo('completion') }
      }, 1000)
    }
    return () => clearInterval(timerRef.current)
  }, [step, timerStart])

  function goTo(s) {
    setStep(s)
    localStorage.setItem('force_session_step', s)
    localStorage.setItem('force_task_number', String(taskNumber))
  }

  // ─── Session init ───────────────────────────────────────────────────────────

  async function initSession() {
    const today = getToday()
    const savedDate  = localStorage.getItem('force_session_date')
    const savedStep  = localStorage.getItem('force_session_step')
    const savedTask  = localStorage.getItem('force_task_number')
    const savedMove1 = localStorage.getItem('force_move_data_1')
    const savedMove2 = localStorage.getItem('force_move_data_2')
    const savedPerson = localStorage.getItem('force_real_person')
    const savedTimer  = localStorage.getItem('force_timer_start')
    const savedSummary = localStorage.getItem('force_day_summary')

    // Resume today's session
    if (savedDate === today && savedStep && savedMove1) {
      const tn = parseInt(savedTask || '1')
      setTaskNumber(tn)
      if (savedMove1) setMoveData1(JSON.parse(savedMove1))
      if (savedMove2) setMoveData2(JSON.parse(savedMove2))
      if (savedPerson) setRealPerson(JSON.parse(savedPerson))
      if (savedTimer) setTimerStart(parseInt(savedTimer))
      if (savedSummary) setSummaryData(JSON.parse(savedSummary))
      await loadDayMeta()
      setStep(savedStep)
      return
    }

    await loadDayMeta()
    goTo('real_person')
  }

  async function loadDayMeta() {
    let dayNum = 1
    if (supabase && user?.id) {
      const { count } = await supabase
        .from('sessions').select('*', { count: 'exact', head: true }).eq('user_id', user.id)
      dayNum = (count || 0) + 1
    }
    const stageData = getStage(dayNum)
    setDayNumber(dayNum)
    setStage(stageData.label)
  }

  // ─── Real person handling ────────────────────────────────────────────────────

  function handleRealPersonDone(person) {
    setRealPerson(person)
    localStorage.setItem('force_real_person', JSON.stringify(person))
    localStorage.setItem('force_session_date', getToday())

    if (dayNumber >= 11) {
      goTo('move_type_select')
    } else {
      generateTask(1, person, null)
    }
  }

  function handleRealPersonSkip() {
    setRealPerson(null)
    localStorage.setItem('force_session_date', getToday())
    if (dayNumber >= 11) {
      goTo('move_type_select')
    } else {
      generateTask(1, null, null)
    }
  }

  // ─── Move type select (Day 11+) ──────────────────────────────────────────────

  function handleMoveTypeSelect(type) {
    setSelectedMoveType(type)
    localStorage.setItem('force_move_type', type)
    generateTask(taskNumber, realPerson, type)
  }

  // ─── Task generation ─────────────────────────────────────────────────────────

  async function generateTask(tNumber, person, moveType) {
    goTo('generating')
    const apiKey   = localStorage.getItem('force_api_key')
    const provider = localStorage.getItem('force_provider') || 'gemini'

    let previousStatus = 'first_day'
    if (supabase && user?.id) {
      const { data: last } = await supabase
        .from('sessions').select('completed').eq('user_id', user.id)
        .order('created_at', { ascending: false }).limit(1).single()
      previousStatus = last ? (last.completed ? 'completed' : 'not_completed') : 'first_day'
    }

    try {
      const move = await generateMove(apiKey, provider, {
        goal:             user.goal || 'not_paid',
        context:          user.context_type || 'manager_team',
        confidence_level: user.confidence_level || 'medium',
        day_number:       dayNumber,
        previous_status:  previousStatus,
        stage,
        real_person:      person,
        task_number:      tNumber,
        move_type:        moveType
      })

      if (tNumber === 1) {
        setMoveData1(move)
        setTaskNumber(1)
        localStorage.setItem('force_move_data_1', JSON.stringify(move))

        if (supabase && user?.id) {
          const today = new Date().toISOString().split('T')[0]
          const { data: session } = await supabase
            .from('sessions')
            .insert({ user_id: user.id, date: today, day_number: dayNumber, move: move.raw, completed: false })
            .select().single()
          if (session) { setSessionId(session.id); localStorage.setItem('force_session_id', session.id) }
        }
      } else {
        setMoveData2(move)
        setTaskNumber(2)
        localStorage.setItem('force_move_data_2', JSON.stringify(move))
      }

      goTo('move')
    } catch (err) {
      setError(err.message || 'Failed to generate. Check your API key.')
      goTo('error')
    }
  }

  // ─── Timer ───────────────────────────────────────────────────────────────────

  function handleStartTimer() {
    const start = Date.now()
    setTimerStart(start)
    localStorage.setItem('force_timer_start', start.toString())
    goTo('timer')
  }

  // ─── Pre-conversation ─────────────────────────────────────────────────────────

  async function handleAboutToDoIt() {
    setLoadingPre(true)
    setShowPreModal(true)
    if (!preData) {
      const apiKey   = localStorage.getItem('force_api_key')
      const provider = localStorage.getItem('force_provider') || 'gemini'
      try {
        const pre = await generatePreConversation(apiKey, provider, currentMove)
        setPreData(pre)
      } catch {
        setPreData({
          focus:  'Stay locked on your objective. Nothing else.',
          risk:   'You will over-explain yourself.',
          anchor: 'Ask the question. Then wait. Do not fill the silence.'
        })
      }
    }
    setLoadingPre(false)
  }

  // ─── Completion ───────────────────────────────────────────────────────────────

  function handleCompletion(didIt) {
    if (!didIt) {
      handleNoCompletion()
    } else {
      goTo('reflection')
    }
  }

  function handleNoCompletion() {
    if (taskNumber === 1) {
      setReflData1({ isStrong: false, reality: 'Not done.', hesitation: '', avoidance: 'Avoided entirely.', correction: '', raw: '' })
      advanceAfterTask1()
    } else {
      setReflData2({ isStrong: false, reality: 'Not done.', hesitation: '', avoidance: 'Avoided entirely.', correction: '', raw: '' })
      handleGenerateSummary()
    }
  }

  // ─── Reflection ───────────────────────────────────────────────────────────────

  async function handleReflectionSubmit() {
    const input = taskNumber === 1 ? reflInput1 : reflInput2

    if (!input.trim()) {
      if (taskNumber === 1) { setReflData1({ isStrong: true, reality: '', hesitation: '', avoidance: '', correction: '', raw: '' }); advanceAfterTask1() }
      else { setReflData2({ isStrong: true, reality: '', hesitation: '', avoidance: '', correction: '', raw: '' }); handleGenerateSummary() }
      return
    }

    goTo('analyzing')
    const apiKey   = localStorage.getItem('force_api_key')
    const provider = localStorage.getItem('force_provider') || 'gemini'

    try {
      const reflection = await generateReflection(apiKey, provider, input, currentMove)
      if (taskNumber === 1) {
        setReflData1(reflection)
        localStorage.setItem('force_reflection_1', input)
        await updateStreak()
        goTo('reflection_result')
      } else {
        setReflData2(reflection)
        localStorage.setItem('force_reflection_2', input)
        await updateStreak()
        goTo('reflection_result')
      }
    } catch {
      if (taskNumber === 1) { setReflData1({ isStrong: true, reality: '', hesitation: '', avoidance: '', correction: '', raw: '' }); goTo('reflection_result') }
      else { setReflData2({ isStrong: true, reality: '', hesitation: '', avoidance: '', correction: '', raw: '' }); goTo('reflection_result') }
    }
  }

  function advanceAfterTask1() {
    setPreData(null)
    setTimerStart(null)
    setTimeLeft(FOUR_HOURS_MS)
    localStorage.removeItem('force_timer_start')

    if (dayNumber >= 11) {
      setTaskNumber(2)
      goTo('move_type_select')
    } else {
      setTaskNumber(2)
      generateTask(2, realPerson, null)
    }
  }

  // ─── Day Summary ──────────────────────────────────────────────────────────────

  async function handleGenerateSummary() {
    goTo('summary_generating')
    const apiKey   = localStorage.getItem('force_api_key')
    const provider = localStorage.getItem('force_provider') || 'gemini'

    const r1 = localStorage.getItem('force_reflection_1') || ''
    const r2 = localStorage.getItem('force_reflection_2') || ''

    try {
      const summary = await generateDaySummary(apiKey, provider, {
        day_number: dayNumber,
        stage,
        task1: moveData1 || (localStorage.getItem('force_move_data_1') ? JSON.parse(localStorage.getItem('force_move_data_1')) : null),
        task2: moveData2 || (localStorage.getItem('force_move_data_2') ? JSON.parse(localStorage.getItem('force_move_data_2')) : null),
        reflection1: r1,
        reflection2: r2
      })
      setSummaryData(summary)
      localStorage.setItem('force_day_summary', JSON.stringify(summary))
      goTo('day_summary')
    } catch {
      goTo('day_complete')
    }
  }

  async function updateStreak() {
    if (!user?.id || !supabase) return
    const today = new Date().toISOString().split('T')[0]
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
    const newStreak = user.last_completed_date === yesterday ? (user.streak_days || 0) + 1 : 1
    await supabase.from('users').update({
      streak_days: newStreak,
      last_completed_date: today,
      total_completions: (user.total_completions || 0) + 1
    }).eq('id', user.id)
    onUserUpdate?.({ ...user, streak_days: newStreak, last_completed_date: today })
  }

  // ─── RENDERS ─────────────────────────────────────────────────────────────────

  // Loading
  if (step === 'init' || step === 'generating' || step === 'summary_generating' || step === 'analyzing') {
    const msg = step === 'summary_generating' ? 'ANALYZING YOUR DAY...'
              : step === 'analyzing' ? 'ANALYZING YOUR EXECUTION...'
              : 'GENERATING YOUR MOVE...'
    return (
      <Screen>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: 20 }}>
          <div style={hdr.logo}>FORCE</div>
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 14, color: '#555', letterSpacing: 3 }}>{msg}</div>
          <div style={{ width: 48, height: 3, background: '#E8FF00' }} />
        </div>
      </Screen>
    )
  }

  // Error
  if (step === 'error') {
    return (
      <Screen>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={hdr.logo}>FORCE</div>
          <div style={{ marginTop: 40, marginBottom: 24 }}>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 13, color: '#FF3333', letterSpacing: 3, marginBottom: 12 }}>ERROR</div>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 24, fontWeight: 800, color: '#FF3333' }}>Generation failed.</div>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 15, color: '#FF3333', marginTop: 12 }}>{error}</div>
          </div>
          <Rule />
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 15, color: '#777', marginTop: 20, marginBottom: 32 }}>
            Check your API key. Make sure you have quota remaining.
          </div>
          <PrimaryBtn onClick={() => { localStorage.removeItem('force_api_key'); window.location.reload() }}>
            UPDATE API KEY →
          </PrimaryBtn>
          <SecondaryBtn style={{ marginTop: 12 }} onClick={() => generateTask(taskNumber, realPerson, selectedMoveType)}>
            TRY AGAIN
          </SecondaryBtn>
        </div>
      </Screen>
    )
  }

  // Real person input
  if (step === 'real_person') {
    return (
      <RealPersonInput
        dayNumber={dayNumber}
        stage={stage}
        onDone={handleRealPersonDone}
        onSkip={handleRealPersonSkip}
      />
    )
  }

  // Move type select (Day 11+)
  if (step === 'move_type_select') {
    return (
      <Screen>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <DayHeader dayNumber={dayNumber} stage={stage} streak={user?.streak_days} />
          <TaskProgress taskNumber={taskNumber} task1Done={task1Done} task2Done={task2Done} />
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 13, color: '#555', letterSpacing: 2, marginBottom: 16 }}>
            DAY 11 UNLOCK — CHOOSE YOUR MOVE TYPE
          </div>
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 24, fontWeight: 700, color: '#fff', marginBottom: 8 }}>
            What kind of conversation do you need?
          </div>
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 15, color: '#666', marginBottom: 28 }}>
            System defines the exact task. You choose the type.
          </div>
          <Rule style={{ marginBottom: 28 }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {MOVE_TYPES.map(mt => (
              <button key={mt.value} onClick={() => handleMoveTypeSelect(mt.value)}
                style={{
                  background: '#141414', color: '#e0e0e0',
                  border: '1px solid #303030', padding: '16px 18px',
                  textAlign: 'left', cursor: 'pointer',
                  fontFamily: "'Barlow Condensed', sans-serif",
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}>
                <span style={{ fontSize: 18, fontWeight: 700 }}>{mt.value}</span>
                <span style={{ fontSize: 14, color: '#555', fontWeight: 400 }}>{mt.desc}</span>
              </button>
            ))}
          </div>
        </div>
      </Screen>
    )
  }

  // Move display
  if (step === 'move') {
    const m = currentMove
    return (
      <Screen style={{ paddingBottom: 100 }}>
        <DayHeader dayNumber={dayNumber} stage={stage} streak={user?.streak_days} />
        <TaskProgress taskNumber={taskNumber} task1Done={task1Done} task2Done={task2Done} />

        <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 13, color: '#555', letterSpacing: 2, marginBottom: 20 }}>
          TASK {taskNumber} OF 2
        </div>

        <Rule style={{ marginBottom: 28 }} />

        <Section label="CONVERSATION" accent>{m?.conversation}</Section>
        <Section label="OBJECTIVE">{m?.objective}</Section>
        <Section label="CONSTRAINT" accent>{m?.constraint}</Section>

        <Rule style={{ marginBottom: 28 }} />

        <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 13, color: '#555', letterSpacing: 2, marginBottom: 20 }}>
          EXECUTION PLAN
        </div>

        <Section label="OPENING" accent>{m?.opening}</Section>
        <Section label="QUESTION 1">{m?.q1}</Section>
        <Section label="QUESTION 2">{m?.q2}</Section>

        <Rule style={{ marginBottom: 28 }} />

        <Section label="MANDATORY ASK" accent>{m?.mandatoryAsk}</Section>
        <Section label="FAILURE RISK">{m?.prediction}</Section>
        <Section label="WIN CONDITION" accent>{m?.winCondition}</Section>

        <div style={{
          position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
          width: '100%', maxWidth: 430, padding: '16px 24px',
          background: 'linear-gradient(to top, #080808 85%, transparent)'
        }}>
          <PrimaryBtn onClick={handleStartTimer}>I UNDERSTAND. START THE CLOCK →</PrimaryBtn>
        </div>
      </Screen>
    )
  }

  // Timer
  if (step === 'timer') {
    const isUrgent = timeLeft < 3600000
    return (
      <Screen>
        <DayHeader dayNumber={dayNumber} stage={stage} streak={user?.streak_days} />
        <TaskProgress taskNumber={taskNumber} task1Done={task1Done} task2Done={task2Done} />

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 13, color: '#555', letterSpacing: 2, marginBottom: 12 }}>
            TASK {taskNumber} OF 2 — YOU HAVE
          </div>
          <div style={{
            fontFamily: "'Courier Prime', monospace", fontSize: 52, fontWeight: 700,
            color: isUrgent ? '#FF3333' : '#E8FF00', letterSpacing: 4, marginBottom: 8, transition: 'color 0.5s'
          }}>
            {formatTime(timeLeft)}
          </div>
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 14, color: '#555', marginBottom: 40 }}>
            TO INITIATE THIS CONVERSATION.
          </div>

          <Rule style={{ marginBottom: 28 }} />
          <Section label="FAILURE RISK">{currentMove?.prediction}</Section>
          <Rule style={{ marginBottom: 28 }} />

          <PrimaryBtn onClick={handleAboutToDoIt} disabled={loadingPre}>
            {loadingPre ? 'LOADING...' : "I'M ABOUT TO DO IT →"}
          </PrimaryBtn>
          <SecondaryBtn style={{ marginTop: 12 }} onClick={() => handleCompletion(true)}>MARK AS COMPLETE</SecondaryBtn>
          <DangerBtn style={{ marginTop: 12 }} onClick={() => handleCompletion(false)}>I DIDN'T DO IT</DangerBtn>
        </div>

        {/* Pre-conversation modal */}
        {showPreModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(8,8,8,0.96)', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', zIndex: 100 }}>
            <div style={{ background: '#111', border: '1px solid #2a2a2a', padding: '32px 24px 40px', maxWidth: 430, width: '100%', margin: '0 auto' }}>
              {loadingPre
                ? <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 14, color: '#555', letterSpacing: 3, textAlign: 'center' }}>LOADING REMINDER...</div>
                : <>
                    <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 13, color: '#555', letterSpacing: 3, marginBottom: 24 }}>EXECUTION REMINDER</div>
                    <Rule style={{ marginBottom: 24 }} />
                    {preData?.focus  && <Section label="FOCUS"  accent>{preData.focus}</Section>}
                    {preData?.risk   && <Section label="RISK">{preData.risk}</Section>}
                    {preData?.anchor && <Section label="ANCHOR" accent>{preData.anchor}</Section>}
                    <Rule style={{ marginBottom: 24 }} />
                    <PrimaryBtn onClick={() => { setShowPreModal(false); handleCompletion(true) }}>I'VE DONE IT ✓</PrimaryBtn>
                    <SecondaryBtn style={{ marginTop: 10 }} onClick={() => setShowPreModal(false)}>NOT YET. BACK TO TIMER.</SecondaryBtn>
                  </>
              }
            </div>
          </div>
        )}
      </Screen>
    )
  }

  // Completion
  if (step === 'completion') {
    return (
      <Screen>
        <DayHeader dayNumber={dayNumber} stage={stage} streak={user?.streak_days} />
        <TaskProgress taskNumber={taskNumber} task1Done={task1Done} task2Done={task2Done} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 13, color: '#555', letterSpacing: 2, marginBottom: 24 }}>TASK {taskNumber} OF 2</div>
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 44, fontWeight: 800, color: '#fff', lineHeight: 1.1, marginBottom: 48 }}>
            Did you<br /><span style={{ color: '#E8FF00' }}>do it?</span>
          </div>
          <Rule style={{ marginBottom: 40 }} />
          <PrimaryBtn onClick={() => handleCompletion(true)}>YES →</PrimaryBtn>
          <DangerBtn style={{ marginTop: 16 }} onClick={() => handleCompletion(false)}>NO</DangerBtn>
        </div>
      </Screen>
    )
  }

  // Reflection
  if (step === 'reflection') {
    const input = taskNumber === 1 ? reflInput1 : reflInput2
    const setInput = taskNumber === 1 ? setReflInput1 : setReflInput2
    return (
      <Screen>
        <DayHeader dayNumber={dayNumber} stage={stage} streak={user?.streak_days} />
        <TaskProgress taskNumber={taskNumber} task1Done={task1Done} task2Done={task2Done} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 13, color: '#555', letterSpacing: 2, marginBottom: 16 }}>TASK {taskNumber} REFLECTION</div>
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 26, fontWeight: 700, color: '#fff', marginBottom: 8 }}>What happened?</div>
          <Rule style={{ marginBottom: 20 }} />
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 15, color: '#777', marginBottom: 20, lineHeight: 1.5 }}>
            What you said. How they responded. What you avoided.
          </div>
          <Textarea
            placeholder="They said... I responded... The outcome was..."
            rows={7}
            value={input}
            onChange={e => setInput(e.target.value)}
          />
          <PrimaryBtn onClick={handleReflectionSubmit} style={{ marginTop: 20 }}>ANALYZE →</PrimaryBtn>
          <SecondaryBtn style={{ marginTop: 12 }} onClick={() => {
            if (taskNumber === 1) { setReflData1({ isStrong: true, reality: '', hesitation: '', avoidance: '', correction: '', raw: '' }); goTo('reflection_result') }
            else { setReflData2({ isStrong: true, reality: '', hesitation: '', avoidance: '', correction: '', raw: '' }); goTo('reflection_result') }
          }}>SKIP ANALYSIS</SecondaryBtn>
        </div>
      </Screen>
    )
  }

  // Reflection result
  if (step === 'reflection_result') {
    const rData = taskNumber === 1 ? reflData1 : reflData2
    const isTask1 = taskNumber === 1
    return (
      <Screen style={{ paddingBottom: 100 }}>
        <DayHeader dayNumber={dayNumber} stage={stage} streak={user?.streak_days} />
        <TaskProgress taskNumber={taskNumber} task1Done={task1Done} task2Done={task2Done} />

        <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 13, color: '#555', letterSpacing: 2, marginBottom: 20 }}>TASK {taskNumber} — REALITY CHECK</div>
        <Rule style={{ marginBottom: 28 }} />

        {rData?.reality    && <Section label="WHAT ACTUALLY HAPPENED" accent>{rData.reality}</Section>}
        {rData?.hesitation && <Section label="HESITATION POINT">{rData.hesitation}</Section>}
        {rData?.avoidance  && <Section label="AVOIDANCE PATTERN">{rData.avoidance}</Section>}
        {rData?.correction && <Section label="CORRECTION" accent>{rData.correction}</Section>}

        <div style={{
          position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
          width: '100%', maxWidth: 430, padding: '16px 24px',
          background: 'linear-gradient(to top, #080808 85%, transparent)'
        }}>
          {isTask1
            ? <PrimaryBtn onClick={advanceAfterTask1}>TASK 1 DONE. START TASK 2 →</PrimaryBtn>
            : <PrimaryBtn onClick={handleGenerateSummary}>COMPLETE DAY {dayNumber} →</PrimaryBtn>
          }
        </div>
      </Screen>
    )
  }

  // Day summary
  if (step === 'day_summary') {
    const nextUnlock = dayNumber < 11
      ? `Day 11 unlocks move selection.`
      : dayNumber < 21
      ? `Day 21 unlocks a free 1:1 call.`
      : `You have unlocked a free 1:1 call. Reach out to claim it.`

    return (
      <Screen style={{ paddingBottom: 100 }}>
        <DayHeader dayNumber={dayNumber} stage={stage} streak={user?.streak_days} />

        {/* Day complete badge */}
        <div style={{
          border: '2px solid #E8FF00', padding: '10px 16px',
          display: 'inline-block', marginBottom: 28
        }}>
          <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 22, fontWeight: 900, color: '#E8FF00', letterSpacing: 4 }}>
            DAY {dayNumber} COMPLETE
          </span>
        </div>

        <Rule style={{ marginBottom: 28 }} />

        {summaryData?.whatTheyDid && <Section label="WHAT YOU DID">{summaryData.whatTheyDid}</Section>}
        {summaryData?.pattern     && <Section label="PATTERN OBSERVED" accent>{summaryData.pattern}</Section>}
        {summaryData?.correction  && <Section label="CORRECTION FOR TOMORROW">{summaryData.correction}</Section>}
        {summaryData?.identity    && <Section label="IDENTITY" accent>{summaryData.identity}</Section>}
        {summaryData?.next        && <Section label="TOMORROW">{summaryData.next}</Section>}

        <Rule style={{ marginBottom: 24 }} />

        <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 14, color: '#555', letterSpacing: 1, marginBottom: 32 }}>
          {nextUnlock}
        </div>

        <div style={{
          position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
          width: '100%', maxWidth: 430, padding: '16px 24px',
          background: 'linear-gradient(to top, #080808 85%, transparent)'
        }}>
          <SecondaryBtn onClick={() => { clearDayStorage(); window.location.reload() }}>
            SEE YOU TOMORROW.
          </SecondaryBtn>
        </div>
      </Screen>
    )
  }

  // Day complete fallback
  if (step === 'day_complete') {
    return (
      <Screen>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={hdr.logo}>FORCE</div>
          <div style={{ marginTop: 40, marginBottom: 40 }}>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 13, color: '#555', letterSpacing: 2, marginBottom: 12 }}>DAY {dayNumber} — {stage}</div>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 36, fontWeight: 800, color: '#fff' }}>Day complete.</div>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 18, color: '#666', marginTop: 12 }}>Come back tomorrow.</div>
          </div>
          <Rule />
          <SecondaryBtn style={{ marginTop: 32 }} onClick={() => { clearDayStorage(); window.location.reload() }}>
            SEE YOU TOMORROW.
          </SecondaryBtn>
        </div>
      </Screen>
    )
  }

  return null
}
