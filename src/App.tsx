import { useState, useEffect, useMemo } from 'react'
import './App.css'
import { DAY_MS, getState, saveState, formatTime, syncToGitHub, reasons } from './lib/timer'

const IS_DEV = import.meta.env.DEV
const TEST_EMAIL = "1234@fake.out"

const HEARTS = {
  main: "https://em-content.zobj.net/source/telegram/386/sparkling-heart_1f496.webp",
  grow: "https://em-content.zobj.net/source/telegram/386/growing-heart_1f497.webp",
  letter: "https://em-content.zobj.net/source/telegram/386/love-letter_1f48c.webp",
  small: "https://em-content.zobj.net/source/telegram/386/red-heart_2764-fe0f.webp",
  floating: [
    "https://em-content.zobj.net/source/telegram/386/heart-with-arrow_1f498.webp",
    "https://em-content.zobj.net/source/telegram/386/beating-heart_1f493.webp",
    "https://em-content.zobj.net/source/telegram/386/two-hearts_1f495.webp",
    "https://em-content.zobj.net/source/telegram/386/revolving-hearts_1f49e.webp",
    "https://em-content.zobj.net/source/telegram/386/heart-decoration_1f49f.webp",
  ],
}

function FloatingHearts() {
  const hearts = useMemo(() => 
    Array.from({ length: 10 }, (_, i) => ({
      img: HEARTS.floating[i % HEARTS.floating.length],
      left: `${5 + Math.random() * 90}%`,
      delay: `${Math.random() * 8}s`,
      duration: `${14 + Math.random() * 8}s`,
      size: `${28 + Math.random() * 20}px`,
    }))
  , [])

  return (
    <div className="floating-hearts">
      {hearts.map((h, i) => (
        <span key={i} className="heart" style={{ left: h.left, animationDelay: h.delay, animationDuration: h.duration, width: h.size, height: h.size }}>
          <img src={h.img} alt="" />
        </span>
      ))}
    </div>
  )
}

function DevTools({ email, unlocked, viewing, total, onSkip, onResetTo, onUnlockAll, onResetAll }: {
  email: string
  unlocked: number
  viewing: number
  total: number
  onSkip: () => void
  onResetTo: () => void
  onUnlockAll: () => void
  onResetAll: () => void
}) {
  const [open, setOpen] = useState(false)
  if (!IS_DEV && email !== TEST_EMAIL) return null
  
  return (
    <div className="dev-toolbar">
      <button className="dev-toggle" onClick={() => setOpen(!open)}>🛠️</button>
      {open && (
        <div className="dev-panel">
          <div className="dev-info">
            <span>Unlocked: {unlocked}/{total}</span>
            <span>Viewing: #{viewing}</span>
          </div>
          <div className="dev-buttons">
            <button onClick={onSkip} className="dev-btn">⏩ Skip Timer</button>
            <button onClick={onResetTo} className="dev-btn">↩️ Reset to #{viewing}</button>
            <button onClick={onUnlockAll} className="dev-btn">🔓 Unlock All</button>
            <button onClick={onResetAll} className="dev-btn dev-btn-danger">🗑️ Clear Data</button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function App() {
  const [email, setEmail] = useState(() => localStorage.getItem("email") || (IS_DEV ? TEST_EMAIL : ""))
  const [loggedIn, setLoggedIn] = useState(() => !!localStorage.getItem("email"))
  const [unlocked, setUnlocked] = useState(0)
  const [unlockAt, setUnlockAt] = useState(() => Date.now() + DAY_MS)
  const [now, setNow] = useState(() => Date.now())
  const [viewing, setViewing] = useState(0)

  useEffect(() => {
    if (loggedIn && email) {
      const state = getState(email)
      setUnlocked(state.index)
      setUnlockAt(state.unlockAt)
      setViewing(state.index)
    }
  }, [loggedIn, email])

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  const last = Math.max(0, reasons.length - 1)
  const canUnlock = now >= unlockAt
  const atEnd = viewing >= last
  const allUnlocked = unlocked >= last
  const canPrev = viewing > 0
  const canNext = !atEnd && (viewing < unlocked || (viewing === unlocked && canUnlock))

  const login = () => {
    if (!email.trim()) return
    localStorage.setItem("email", email.trim())
    setLoggedIn(true)
  }

  const logout = () => {
    localStorage.removeItem("email")
    setEmail("")
    setLoggedIn(false)
  }

  const go = (dir: number) => {
    const next = viewing + dir
    if (next < 0 || next >= reasons.length) return
    if (next > unlocked) {
      const t = Date.now() + DAY_MS
      saveState(email, { index: next, unlockAt: t })
      setUnlocked(next)
      setUnlockAt(t)
      syncToGitHub(email, next, t)
    }
    setViewing(next)
  }

  const devSkip = () => {
    const t = Date.now() - 1000
    setUnlockAt(t)
    saveState(email, { index: unlocked, unlockAt: t })
  }

  const devResetTo = () => {
    const t = Date.now() + DAY_MS
    setUnlocked(viewing)
    setUnlockAt(t)
    saveState(email, { index: viewing, unlockAt: t })
  }

  const devUnlockAll = () => {
    const t = Date.now() - 1000
    setUnlocked(last)
    setUnlockAt(t)
    saveState(email, { index: last, unlockAt: t })
  }

  const devResetAll = () => {
    localStorage.clear()
    location.reload()
  }

  if (reasons.length === 0) {
    return (
      <div className="card" style={{ margin: '2rem auto', textAlign: 'center' }}>
        <h1>No reasons configured</h1>
        <p>Set VITE_REASONS in environment.</p>
      </div>
    )
  }

  if (!loggedIn) {
    return (
      <>
        <FloatingHearts />
        <div className="card">
          <div className="header-heart"><img src={HEARTS.letter} alt="" /></div>
          <h1 className="login-title">Hey cutie</h1>
          <p className="login-subtitle">Enter your email to see your messages</p>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && login()}
            placeholder="your@email.com"
            className="login-input"
          />
          <button onClick={login} disabled={!email.trim()} className="login-btn">
            Let me in! <img src={HEARTS.small} alt="" className="mini-heart" />
          </button>
          <div className="footer-deco">
            {[0, 1, 2].map(i => <span key={i} className="deco-heart"><img src={HEARTS.small} alt="" /></span>)}
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <FloatingHearts />
      <div className="card">
        <div className="user-header">
          <span className="user-email">{email}</span>
          <button onClick={logout} className="logout-btn">Exit</button>
        </div>
        
        <div className="header-heart"><img src={HEARTS.main} alt="" /></div>
        
        <div className="reason-pill">
          <img src={HEARTS.small} alt="" className="mini-heart" />
          Reason #{viewing + 1}
        </div>
        
        <h1 className="main-title">Why <span>Justin</span> loves <span>Jennifer</span></h1>
        
        <div className="status-box">
          {allUnlocked ? (
            <div className="end-message">
              <div className="end-message-heart"><img src={HEARTS.grow} alt="" /></div>
              <p className="end-message-title">You made it to the end! 🎉</p>
              <p className="end-message-text">
                Even though this list is complete, my love for you will never end.
              </p>
            </div>
          ) : (
            <div className="timer-box">
              <p className="timer-label">Next reason unlocks in</p>
              <p className={`timer-value ${canUnlock ? 'timer-ready' : ''}`}>
                {canUnlock ? "Now! ✨" : formatTime(now, unlockAt)}
              </p>
            </div>
          )}
        </div>
        
        <div className="nav-buttons">
          <button className="nav-btn" disabled={!canPrev} onClick={() => go(-1)}>←</button>
          <button className="nav-btn" disabled={!canNext} onClick={() => go(1)}>→</button>
        </div>
        
        <div className="reason-card">
          <p className="reason-prefix">I love...</p>
          <p className="reason-text">{reasons[viewing]}</p>
        </div>
        
        <div className="footer-deco">
          <span className="deco-heart"><img src={HEARTS.floating[0]} alt="" /></span>
          <span className="deco-heart"><img src={HEARTS.grow} alt="" /></span>
          <span className="deco-heart"><img src={HEARTS.floating[1]} alt="" /></span>
        </div>
      </div>
      
      <DevTools
        email={email}
        unlocked={unlocked + 1}
        viewing={viewing + 1}
        total={reasons.length}
        onSkip={devSkip}
        onResetTo={devResetTo}
        onUnlockAll={devUnlockAll}
        onResetAll={devResetAll}
      />
    </>
  )
}
