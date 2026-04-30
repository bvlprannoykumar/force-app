const SYSTEM_PROMPT = `You are a high-performance behavioral execution system designed to force users into taking real-world conversations that increase their professional leverage.

Your purpose is NOT to educate, motivate, or comfort.
Your purpose is to force clarity, force action, expose avoidance, and improve execution.

The user is a professional who overthinks, avoids uncomfortable conversations, consumes content but does not act, and lacks consistency in execution.

Be direct. Be slightly confronting. Avoid motivational language, fluff, and over-explanation.
Tone: calm, sharp, precise, slightly uncomfortable when needed.
You are NOT a coach. You are an execution system.`

// ─── Provider Calls ───────────────────────────────────────────────────────────

// Gemini free-tier models in priority order (2026 verified)
const GEMINI_FREE_MODELS = [
  'gemini-2.5-flash',       // Most powerful free model, 250 req/day
  'gemini-2.5-flash-lite',  // High volume fallback, 1000 req/day
  'gemini-1.5-flash',       // Legacy stable, always available
]

async function callGemini(apiKey, userPrompt) {
  let lastError = null

  for (const model of GEMINI_FREE_MODELS) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
            contents: [{ parts: [{ text: userPrompt }] }],
            generationConfig: { maxOutputTokens: 900, temperature: 0.8 }
          })
        }
      )

      // Catch HTTP-level failures (402, 403, 429 etc)
      if (!res.ok) {
        lastError = new Error(`Gemini model ${model} returned HTTP ${res.status}`)
        continue
      }

      const data = await res.json()

      if (data.error) {
        lastError = new Error(data.error.message || JSON.stringify(data.error))
        continue
      }

      const text = data.candidates?.[0]?.content?.parts?.[0]?.text
      if (!text) { lastError = new Error(`Model ${model} returned empty`); continue }

      return text
    } catch (err) {
      lastError = err
      continue
    }
  }

  throw lastError || new Error('All Gemini models failed. Check your API key.')
}

// Groq free models in priority order
const GROQ_FREE_MODELS = [
  'llama-3.3-70b-versatile',
  'llama3-70b-8192',
  'mixtral-8x7b-32768',
]

async function callGroq(apiKey, userPrompt) {
  let lastError = null

  for (const model of GROQ_FREE_MODELS) {
    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: userPrompt }
          ],
          max_tokens: 900,
          temperature: 0.8
        })
      })

      if (!res.ok) {
        lastError = new Error(`Groq model ${model} returned HTTP ${res.status}`)
        continue
      }

      const data = await res.json()
      if (data.error) {
        lastError = new Error(data.error.message || JSON.stringify(data.error))
        continue
      }

      const text = data.choices?.[0]?.message?.content
      if (!text) { lastError = new Error(`Model ${model} returned empty`); continue }

      return text
    } catch (err) {
      lastError = err
      continue
    }
  }

  throw lastError || new Error('All Groq models failed. Check your API key.')
}

// OpenRouter free models in priority order — auto-fallback if one is down
const OPENROUTER_FREE_MODELS = [
  'meta-llama/llama-3.3-70b-instruct:free',
  'google/gemma-2-9b-it:free',
  'mistralai/mistral-7b-instruct:free',
  'qwen/qwen-2.5-72b-instruct:free',
  'deepseek/deepseek-r1-zero:free',
  'nousresearch/hermes-3-llama-3.1-405b:free',
]

async function callOpenRouter(apiKey, userPrompt) {
  let lastError = null

  for (const model of OPENROUTER_FREE_MODELS) {
    try {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
          'HTTP-Referer': 'https://force.vercel.app',
          'X-Title': 'FORCE'
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: userPrompt }
          ],
          max_tokens: 900
        })
      })
      if (!res.ok) {
        lastError = new Error(`Model ${model} unavailable (HTTP ${res.status})`)
        continue
      }
      const data = await res.json()
      if (data.error) {
        lastError = new Error(data.error.message || JSON.stringify(data.error))
        continue
      }
      const text = data.choices?.[0]?.message?.content
      if (!text) { lastError = new Error(`Model ${model} returned empty`); continue }
      return text
    } catch (err) {
      lastError = err
      continue
    }
  }

  throw lastError || new Error('All OpenRouter free models failed. Try again shortly.')
}

async function callAnthropic(apiKey, userPrompt) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true'
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 900,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }]
    })
  })
  const data = await res.json()
  if (data.error) throw new Error(data.error.message || JSON.stringify(data.error))
  return data.content?.[0]?.text || ''
}

async function callAI(apiKey, provider, userPrompt) {
  return withBackoff(() => {
    switch (provider) {
      case 'gemini': return callGemini(apiKey, userPrompt)
      case 'groq': return callGroq(apiKey, userPrompt)
      case 'openrouter': return callOpenRouter(apiKey, userPrompt)
      case 'anthropic': return callAnthropic(apiKey, userPrompt)
      default: throw new Error('Unknown provider: ' + provider)
    }
  })
}


// ─── Stage Map ────────────────────────────────────────────────────────────────

export function getStage(dayNum) {
  if (dayNum <= 3)  return { label: 'AWARENESS',   desc: 'Notice your avoidance and hesitation patterns' }
  if (dayNum <= 7)  return { label: 'CONTROL',     desc: 'Slow down, ask better, stop over-explaining' }
  if (dayNum <= 11) return { label: 'PRESSURE',    desc: 'Hold discomfort, ask direct, tolerate pushback' }
  if (dayNum <= 14) return { label: 'LEADERSHIP',  desc: 'Guide conversations instead of reacting' }
  if (dayNum <= 18) return { label: 'CONVICTION',  desc: 'State your value, make clear asks, stop softening' }
  if (dayNum <= 21) return { label: 'EXECUTION',   desc: 'Combine everything in real conversations' }
  return              { label: 'OPERATOR',     desc: 'You are the system now' }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function generateMove(apiKey, provider, config) {
  const { goal, context, confidence_level, day_number, previous_status, real_person, stage, task_number, move_type } = config

  const personContext = real_person?.name
    ? `Real Person: ${real_person.name} (${real_person.role || "colleague"})${real_person.about ? " — Context: " + real_person.about : ""}`
    : "No specific person provided — use their onboarding context to create a realistic scenario"

  const taskLabel = task_number === 2 ? "TASK 2 OF 2" : "TASK 1 OF 2"
  const moveTypeInstruction = move_type ? `Move Type Requested: ${move_type}` : ""

  const prompt = `Generate ${taskLabel} for this professional's daily execution.

PROFILE:
Goal: ${goal}
Context: ${context}
Confidence Level: ${confidence_level}
Day Number: ${day_number}
Stage: ${stage}
Yesterday\'s Status: ${previous_status}
${personContext}
${moveTypeInstruction}

RULES:
- Use the REAL PERSON provided. Do NOT invent fake names or placeholders.
- If no real person, generate a realistic scenario based on their context.
- Confidence LOW: uncomfortable but achievable
- Confidence HIGH: direct confrontation, high stakes
- Give ONE path only. No options.
- Constraint must be behavioral. What they CANNOT do.
- Make it feel immediately doable today.

Respond in EXACTLY this format, nothing else:

TODAY\'S MOVE
Conversation: [exact person and what to say — use the real name if provided]
Objective: [what this forces]
Constraint: [what they cannot do during it]

EXECUTION PLAN
Opening: [exact first line to say to this person]
Question 1: [first question to ask]
Question 2: [follow-up question]

DISCOMFORT TRIGGER
Mandatory Ask: [the uncomfortable ask they must make]

FAILURE RISK
Prediction: [exactly how they will avoid]

SUCCESS CRITERIA
Win Condition: [the clear, measurable win]`

  const raw = await callAI(apiKey, provider, prompt)
  return { ...parseMove(raw), raw }
}

export async function generateDaySummary(apiKey, provider, data) {
  const { day_number, stage, task1, task2, reflection1, reflection2 } = data

  const prompt = `Analyze this professional\'s full day of execution.

Day ${day_number} — Stage: ${stage}

TASK 1: ${task1?.conversation || "Not completed"}
What they reported: ${reflection1 || "No reflection provided"}

TASK 2: ${task2?.conversation || "Not completed"}
What they reported: ${reflection2 || "No reflection provided"}

Generate a sharp Day Summary. No motivation. No celebration. Be confronting and direct.

Respond in EXACTLY this format:

DAY SUMMARY
What they did: [summarize both conversations in 2 sentences, factually]

PATTERN: [one behavioral pattern observed across both tasks — name it clearly]

CORRECTION: [one specific thing that must change tomorrow — not generic]

IDENTITY: [one line that names what they proved about themselves today — can be positive or negative]

NEXT: [one line about what tomorrow\'s stage demands — build anticipation, not comfort]`

  const raw = await callAI(apiKey, provider, prompt)
  return { ...parseDaySummary(raw), raw }
}

export async function generatePreConversation(apiKey, provider, moveData) {
  const prompt = `The user is about to initiate this conversation:
${moveData.conversation}
Their objective: ${moveData.objective}
Their constraint: ${moveData.constraint}

Give a 3-line execution reminder. Be sharp. No fluff.

Respond in EXACTLY this format:

FOCUS
[One thing to prioritize]

RISK
[What they will do wrong]

ANCHOR
[One line they can say or rely on]`

  const raw = await callAI(apiKey, provider, prompt)
  return parsePre(raw)
}

export async function generateReflection(apiKey, provider, input, moveData) {
  const prompt = `Analyze this professional's execution of a real conversation.

The conversation they were supposed to have: ${moveData.conversation}
What they reported: ${input}

Analyze honestly. Be direct and confronting. No comfort.
Start REALITY CHECK with either "STRONG:" or "WEAK:" based on how well they executed.

Respond in EXACTLY this format:

REALITY CHECK
[Start with STRONG: or WEAK:] [What actually happened]

HESITATION POINT
[Where they lost control or softened]

AVOIDANCE PATTERN
[What they avoided doing or saying]

CORRECTION
[What must be different tomorrow]`

  const raw = await callAI(apiKey, provider, prompt)
  return { ...parseReflection(raw), raw }
}

// ─── Parsers ──────────────────────────────────────────────────────────────────

export function parseMove(text) {
  const g = (pattern) => text.match(pattern)?.[1]?.trim() || ''
  return {
    conversation: g(/Conversation:\s*(.+?)(?=Objective:|$)/s),
    objective: g(/Objective:\s*(.+?)(?=Constraint:|$)/s),
    constraint: g(/Constraint:\s*(.+?)(?=EXECUTION PLAN|Opening:|$)/s),
    opening: g(/Opening:\s*(.+?)(?=Question 1:|$)/s),
    q1: g(/Question 1:\s*(.+?)(?=Question 2:|$)/s),
    q2: g(/Question 2:\s*(.+?)(?=DISCOMFORT|Mandatory|$)/s),
    mandatoryAsk: g(/Mandatory Ask:\s*(.+?)(?=FAILURE|Prediction:|$)/s),
    prediction: g(/Prediction:\s*(.+?)(?=SUCCESS|Win Condition:|$)/s),
    winCondition: g(/Win Condition:\s*(.+?)$/s)
  }
}

function parsePre(text) {
  const g = (pattern) => text.match(pattern)?.[1]?.trim() || ''
  return {
    focus: g(/FOCUS\s*\n(.+?)(?=RISK|$)/s),
    risk: g(/RISK\s*\n(.+?)(?=ANCHOR|$)/s),
    anchor: g(/ANCHOR\s*\n(.+?)$/s)
  }
}

function parseReflection(text) {
  const g = (pattern) => text.match(pattern)?.[1]?.trim() || ''
  const isStrong = /STRONG:/i.test(text)
  return {
    reality: g(/REALITY CHECK\s*\n(.+?)(?=HESITATION|$)/s),
    hesitation: g(/HESITATION POINT\s*\n(.+?)(?=AVOIDANCE|$)/s),
    avoidance: g(/AVOIDANCE PATTERN\s*\n(.+?)(?=CORRECTION|$)/s),
    correction: g(/CORRECTION\s*\n(.+?)$/s),
    isStrong
  }
}

// ─── Exponential Backoff ──────────────────────────────────────────────────────
// Defined at bottom to avoid hoisting issues. Retries on 429 only.
// Non-429 errors thrown immediately so fallback chain handles them.
async function withBackoff(fn, maxRetries = 3) {
  let delay = 2000
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (err) {
      const is429 = err.message.includes('429') || err.message.toLowerCase().includes('rate limit')
      if (is429 && attempt < maxRetries) {
        await new Promise(r => setTimeout(r, delay))
        delay *= 2
        continue
      }
      throw err
    }
  }
}

function parseDaySummary(text) {
  const g = (pattern) => text.match(pattern)?.[1]?.trim() || ''
  return {
    whatTheyDid: g(/What they did:\s*(.+?)(?=PATTERN:|$)/s),
    pattern:     g(/PATTERN:\s*(.+?)(?=CORRECTION:|$)/s),
    correction:  g(/CORRECTION:\s*(.+?)(?=IDENTITY:|$)/s),
    identity:    g(/IDENTITY:\s*(.+?)(?=NEXT:|$)/s),
    next:        g(/NEXT:\s*(.+?)$/s)
  }
}
