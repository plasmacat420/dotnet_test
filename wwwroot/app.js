// app.js (place in wwwroot/app.js)
// Uses React 18 global from CDN (React, ReactDOM)

const { useState, useEffect, useRef } = React;

function Icon({ name }) {
  // simple inline SVG icons for linkedin, leetcode, github, speaker (replaces twitter)
  if (name === 'linkedin') return (
    <svg viewBox="0 0 24 24" className="icon" aria-hidden><path fill="currentColor" d="M4.98 3.5C4.98 4.6 4.08 5.5 2.98 5.5S0.98 4.6 .98 3.5 1.88 1.5 2.98 1.5 4.98 2.4 4.98 3.5zM.98 8.5h3.99V23H.98V8.5zM8.98 8.5h3.83v2.02h.05c.53-.99 1.83-2.02 3.77-2.02 4.03 0 4.78 2.65 4.78 6.09V23H18.4v-6.9c0-1.65-.03-3.77-2.3-3.77-2.3 0-2.65 1.8-2.65 3.66V23H8.98V8.5z"/></svg>
  );
  if (name === 'leetcode') return (
    <svg viewBox="0 0 24 24" className="icon" aria-hidden><path fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" d="M6 6L12 2L18 6M6 12L12 8L18 12M6 18L12 14L18 18" /></svg>
  );
  if (name === 'github') return (
    <svg viewBox="0 0 24 24" className="icon" aria-hidden><path fill="currentColor" d="M12 .5C5.73.5.98 5.25.98 11.52c0 4.63 3.01 8.56 7.19 9.95.53.1.72-.23.72-.51 0-.25-.01-.92-.01-1.8-2.92.64-3.54-1.4-3.54-1.4-.48-1.22-1.17-1.55-1.17-1.55-.96-.66.07-.64.07-.64 1.06.08 1.62 1.09 1.62 1.09.94 1.61 2.48 1.14 3.09.87.1-.68.37-1.14.67-1.4-2.33-.27-4.78-1.17-4.78-5.2 0-1.15.41-2.08 1.09-2.81-.11-.27-.48-1.36.1-2.84 0 0 .89-.29 2.92 1.08a10.13 10.13 0 0 1 5.32 0c2.02-1.37 2.91-1.08 2.91-1.08.59 1.48.22 2.57.11 2.84.68.73 1.08 1.66 1.08 2.81 0 4.04-2.46 4.93-4.8 5.19.38.33.72.97.72 1.96 0 1.41-.01 2.55-.01 2.9 0 .28.19.61.73.5 4.18-1.4 7.17-5.33 7.17-9.96C23.02 5.25 18.27.5 12 .5z"/></svg>
  );
  if (name === 'speak') return (
    // speaker icon
    <svg viewBox="0 0 24 24" className="icon" aria-hidden>
      <path fill="currentColor" d="M5 9v6h4l5 4V5L9 9H5z"></path>
      <path fill="currentColor" d="M16.5 8.5a4.5 4.5 0 010 7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      <path fill="currentColor" d="M18.5 6.5a7 7 0 010 11" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
  return null;
}

function ContactMe() {
  const sentences = [
    "Hi — I'm Faiz. I build elegant, fast interfaces.",
    "I ride skateboards and ship delightful UI.",
    "Competitive coder. Curious problem solver. Friendly to bugs.",
    "Let's build something people actually enjoy using."
  ];

  // typewriter state
  const [text, setText] = useState("");
  const [idx, setIdx] = useState(0);
  const [charIdx, setCharIdx] = useState(0);
  const [visible, setVisible] = useState(true);

  // speaking state refs
  const speakingRef = useRef(false);        // true while speak-all is in progress
  const utterQueueRef = useRef([]);        // store utterances when speaking
  const currentUtterRef = useRef(null);    // reference to currently speaking utterance

  // Typewriter (unchanged behavior: types and cycles)
  useEffect(() => {
    if (!visible) return;
    let t1, t2;
    const currentSentence = sentences[idx];

    if (charIdx <= currentSentence.length) {
      t1 = setTimeout(() => {
        setText(currentSentence.slice(0, charIdx));
        setCharIdx(c => c + 1);
      }, 36);
    } else {
      t2 = setTimeout(() => {
        // fade out then go next (typing cycles continue)
        setVisible(false);
        setTimeout(() => {
          setIdx(i => (i + 1) % sentences.length);
          setCharIdx(0);
          setText("");
          setVisible(true);
        }, 900);
      }, 1200);
    }

    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [charIdx, idx, visible]);

  // cleanup on unmount: cancel any speech
  useEffect(() => {
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      speakingRef.current = false;
      utterQueueRef.current = [];
      currentUtterRef.current = null;
    };
  }, []);

  // speak-all: speaks all sentences in order once. Clicking again restarts.
  function speakAll() {
    if (!('speechSynthesis' in window)) {
      // No TTS support
      return;
    }

    // cancel any current speech and clear queue
    window.speechSynthesis.cancel();
    speakingRef.current = true;
    utterQueueRef.current = sentences.map((s, i) => ({ text: s, idx: i }));
    currentUtterRef.current = null;

    // helper to start next utterance
    function playNext() {
      const next = utterQueueRef.current.shift();
      if (!next) {
        speakingRef.current = false;
        currentUtterRef.current = null;
        return;
      }

      try {
        const utt = new SpeechSynthesisUtterance(next.text);
        utt.rate = 1.03;
        utt.pitch = 1.05;
        utt.lang = 'en-US';
        utt.onend = () => {
          currentUtterRef.current = null;
          // small delay between sentences
          setTimeout(() => {
            playNext();
          }, 300);
        };
        utt.onerror = () => {
          // proceed to next even on error
          currentUtterRef.current = null;
          playNext();
        };
        currentUtterRef.current = utt;
        window.speechSynthesis.speak(utt);
      } catch (e) {
        console.warn("TTS speak error", e);
        // continue anyway
        currentUtterRef.current = null;
        playNext();
      }
    }

    // start playing
    playNext();
  }

  // stop current speech (used when clicking mail or when restarting speak)
  function stopSpeech() {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    speakingRef.current = false;
    utterQueueRef.current = [];
    currentUtterRef.current = null;
  }

  const LINKS = {
    linkedin: "https://linkedin.com/in/prepreater",
    leetcode: "https://leetcode.com/faiz0308",
    github: "https://github.com/plasmacat420",
    // twitter replaced by speak button
  };

  // stop any speaking if user clicks the mailto deck — allow default mailto behavior
  function handleMailClick() {
    stopSpeech();
  }

  // speak button click handler
  function handleSpeakClick(e) {
    e.preventDefault(); // prevent any navigation (it's a control)
    // If already speaking, restart sequence
    stopSpeech();
    // slight delay to ensure cancel finishes
    setTimeout(() => {
      speakAll();
    }, 80);
  }

  // to reflect speaking state in UI (aria-pressed) we query speakingRef.current; create a small state to re-render when speaking starts/stops
  const [, setTick] = useState(0);
  useEffect(() => {
    let t;
    function poll() {
      // tick every 200ms while speaking, to update aria/visual state
      setTick(n => n + 1);
      if (speakingRef.current) {
        t = setTimeout(poll, 200);
      }
    }
    if (speakingRef.current) poll();
    return () => clearTimeout(t);
  }, [speakingRef.current]);

  return (
    <div className="center-wrap">
      <div className="board" role="region" aria-label="Faiz contact card">
        <div className="photo-wrap" aria-hidden>
          <img src="me.jpg" alt="Faiz portrait" onError={(e)=>{ e.target.style.display='none'; }} />
        </div>

        <div className="skateboard" aria-hidden>
          <a
            className="skate-deck"
            href="mailto:faiz.corsair@gmail.com"
            aria-label="Email Faiz"
            onClick={handleMailClick}
          >
            <span style={{mixBlendMode:'screen'}}>faiz.corsair@gmail.com</span>

            {/* Wheel cluster visually below the deck */}
            <div className="wheels" aria-hidden>
              <div className="wheel-slot">
                <a className="skate-btn" href={LINKS.linkedin} target="_blank" rel="noreferrer" aria-label="LinkedIn">
                  <Icon name="linkedin" />
                </a>
              </div>
              <div className="wheel-slot">
                <a className="skate-btn" href={LINKS.leetcode} target="_blank" rel="noreferrer" aria-label="LeetCode">
                  <Icon name="leetcode" />
                </a>
              </div>
              <div className="wheel-slot">
                <a className="skate-btn" href={LINKS.github} target="_blank" rel="noreferrer" aria-label="GitHub">
                  <Icon name="github" />
                </a>
              </div>
              <div className="wheel-slot">
                {/* Speak button: not a navigation link, acts as a control */}
                <button
                  className="skate-btn"
                  onClick={handleSpeakClick}
                  aria-label={speakingRef.current ? "Stop speaking" : "Speak about Faiz"}
                  aria-pressed={speakingRef.current ? "true" : "false"}
                  title={speakingRef.current ? "Speaking…" : "Speak"}
                >
                  <Icon name="speak" />
                </button>
              </div>
            </div>
          </a>
        </div>

        <div className="ghost" style={{ opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(-8px)' }}>
          <span style={{display:'inline-block'}}>{text}</span>
        </div>

        <div className="caption">Modern UI · Fast interactions · DM for collabs</div>
      </div>
    </div>
  );
}

// Mount
const rootEl = document.getElementById("root");
ReactDOM.createRoot(rootEl).render(React.createElement(ContactMe));
