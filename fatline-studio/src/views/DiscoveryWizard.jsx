import { useEffect, useState, useRef, useCallback } from 'react'
import { fetchDiscoveryQuestions, sendDiscoveryChat, skipDiscovery, triggerInstantBuild, getProjectStatus } from '../lib/api.js'

function PhaseBar({ phase }) {
  const phases = ['discovery', 'prototype', 'review', 'production']
  const idx = phases.indexOf(phase)
  return (
    <div className="phase-bar">
      {phases.map((p, i) => (
        <div key={p} className={`phase-step ${i <= idx ? 'active' : ''} ${i < idx ? 'done' : ''}`}>
          <div className="phase-dot" />
          <div className="phase-label">{p}</div>
        </div>
      ))}
    </div>
  )
}

export default function DiscoveryWizard({ projectId, onComplete, onSkip }) {
  const [step, setStep] = useState('loading') // loading | question | building | error
  const [question, setQuestion] = useState('')
  const [questionNumber, setQuestionNumber] = useState(1)
  const [totalEstimate, setTotalEstimate] = useState(5)
  const [answer, setAnswer] = useState('')
  const [history, setHistory] = useState([])
  const [error, setError] = useState('')
  const [buildStatus, setBuildStatus] = useState('')
  const pollRef = useRef(null)

  const loadQuestions = useCallback(async () => {
    try {
      const data = await fetchDiscoveryQuestions(projectId)
      if (data.already_complete) {
        setStep('building')
        startPrototypePoll()
        return
      }
      const q = data.questions?.[0] || data.question
      if (q) {
        setQuestion(q)
        setQuestionNumber(1)
        setStep('question')
      } else if (data.isComplete) {
        setStep('building')
        startPrototypePoll()
      } else {
        throw new Error('No question returned')
      }
    } catch (err) {
      setError(err.message)
      setStep('error')
    }
  }, [projectId])

  useEffect(() => {
    loadQuestions()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const startPrototypePoll = () => {
    if (pollRef.current) return
    let attempts = 0
    const tick = async () => {
      attempts++
      try {
        const data = await getProjectStatus(projectId)
        const project = data.project || data
        const meta = project.metadata || {}
        setBuildStatus(project.status || project.build_status || 'building')
        if (meta.prototype_url || project.prototype_url || project.preview_url) {
          clearInterval(pollRef.current)
          pollRef.current = null
          onComplete(projectId)
          return
        }
        if (attempts > 120) {
          clearInterval(pollRef.current)
          pollRef.current = null
          setError('Prototype is taking longer than expected. You can wait in the studio.')
          setStep('error')
        }
      } catch {
        // ignore poll errors
      }
    }
    pollRef.current = setInterval(tick, 5000)
    tick()
  }

  const handleSubmit = async () => {
    if (!answer.trim()) return
    const userAnswer = answer.trim()
    setHistory((h) => [...h, { role: 'user', content: userAnswer }])
    setAnswer('')
    setStep('loading')
    try {
      const data = await sendDiscoveryChat(projectId, userAnswer)
      if (data.isComplete || data.done) {
        setStep('building')
        setBuildStatus('triggering')
        try {
          await triggerInstantBuild(projectId)
        } catch (buildErr) {
          console.warn('Instant build trigger failed:', buildErr.message)
        }
        startPrototypePoll()
      } else {
        setQuestion(data.question || 'Next question…')
        setQuestionNumber(data.questionNumber || history.length + 2)
        setTotalEstimate(data.totalEstimate || 5)
        setHistory((h) => [...h, { role: 'assistant', content: data.question }])
        setStep('question')
      }
    } catch (err) {
      setError(err.message)
      setStep('error')
    }
  }

  const handleSkip = async () => {
    setStep('loading')
    try {
      await skipDiscovery(projectId)
      setStep('building')
      try {
        await triggerInstantBuild(projectId)
      } catch (buildErr) {
        console.warn('Instant build trigger failed:', buildErr.message)
      }
      startPrototypePoll()
    } catch (err) {
      setError(err.message)
      setStep('error')
    }
  }

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [])

  if (step === 'loading') {
    return (
      <div className="wizard">
        <div className="wizard-center">
          <div className="spinner" />
          <div className="empty-title">Loading discovery…</div>
        </div>
      </div>
    )
  }

  if (step === 'building') {
    return (
      <div className="wizard">
        <PhaseBar phase="prototype" />
        <div className="wizard-center">
          <div className="spinner" />
          <div className="empty-title">Building your prototype</div>
          <p className="subtle">Status: {buildStatus || 'working…'}</p>
          <p className="subtle">This usually takes 60–120 seconds.</p>
        </div>
      </div>
    )
  }

  if (step === 'error') {
    return (
      <div className="wizard">
        <div className="wizard-center">
          <div className="empty-title">Something went wrong</div>
          <p className="error-text">{error}</p>
          <div className="button-row" style={{ marginTop: 16 }}>
            <button className="button primary" onClick={loadQuestions}>Retry</button>
            <button className="button ghost" onClick={() => onSkip(projectId)}>Go to Studio</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="wizard">
      <PhaseBar phase="discovery" />

      <div className="wizard-content panel">
        <div className="wizard-header">
          <div className="eyebrow">Discovery • Question {questionNumber} of ~{totalEstimate}</div>
          <h2>Help us understand your app</h2>
        </div>

        {history.length > 0 && (
          <div className="wizard-history">
            {history.map((h, i) => (
              <div key={i} className={`history-bubble history-${h.role}`}>
                <strong>{h.role === 'user' ? 'You' : 'Fatline'}:</strong> {h.content}
              </div>
            ))}
          </div>
        )}

        <div className="question-box">{question}</div>

        <textarea
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder="Type your answer…"
          rows={4}
        />

        <div className="button-row">
          <button
            className="button primary"
            onClick={handleSubmit}
            disabled={!answer.trim()}
          >
            Submit
          </button>
          <button className="button ghost" onClick={handleSkip}>
            Skip discovery
          </button>
        </div>
      </div>
    </div>
  )
}
