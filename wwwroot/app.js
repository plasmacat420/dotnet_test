// ============================================
// APP.JS - Prepreater & Co. Premium Contact Card
// Complete rewrite - tested and working perfectly
// Features: Orbiting elemental orbs, animated tentacles, interactive card
// ============================================

const { useState, useEffect, useRef, Component } = React;

// ============================================
// ERROR BOUNDARY COMPONENT
// ============================================
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('React Error Boundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return React.createElement('div', { className: 'error-boundary' },
        React.createElement('div', { className: 'error-content' },
          React.createElement('h1', null, 'Oops! Something went wrong'),
          React.createElement('p', null, 'We encountered an unexpected error. Please try refreshing the page.'),
          React.createElement('button', {
            onClick: () => window.location.reload()
          }, 'Reload Page')
        )
      );
    }
    return this.props.children;
  }
}

// ============================================
// LOADING SCREEN COMPONENT
// ============================================
function LoadingScreen() {
  return React.createElement('div', { className: 'loading-screen' },
    React.createElement('div', { className: 'loading-spinner' }),
    React.createElement('div', { className: 'brand-preview' }, 'PREPREATER & CO.')
  );
}

// ============================================
// ICON COMPONENT - Social Media & Speaker Icons
// ============================================
function Icon({ name }) {
  if (name === 'linkedin') {
    return React.createElement('svg', { viewBox: "0 0 24 24", className: "icon" },
      React.createElement('path', { 
        fill: "currentColor", 
        d: "M4.98 3.5C4.98 4.6 4.08 5.5 2.98 5.5S0.98 4.6 .98 3.5 1.88 1.5 2.98 1.5 4.98 2.4 4.98 3.5zM.98 8.5h3.99V23H.98V8.5zM8.98 8.5h3.83v2.02h.05c.53-.99 1.83-2.02 3.77-2.02 4.03 0 4.78 2.65 4.78 6.09V23H18.4v-6.9c0-1.65-.03-3.77-2.3-3.77-2.3 0-2.65 1.8-2.65 3.66V23H8.98V8.5z"
      })
    );
  }
  if (name === 'leetcode') {
    return React.createElement('svg', { viewBox: "0 0 24 24", className: "icon" },
      React.createElement('path', { 
        fill: "none", stroke: "currentColor", strokeWidth: "1.8", 
        strokeLinecap: "round", strokeLinejoin: "round", 
        d: "M6 6L12 2L18 6M6 12L12 8L18 12M6 18L12 14L18 18"
      })
    );
  }
  if (name === 'github') {
    return React.createElement('svg', { viewBox: "0 0 24 24", className: "icon" },
      React.createElement('path', { 
        fill: "currentColor", 
        d: "M12 .5C5.73.5.98 5.25.98 11.52c0 4.63 3.01 8.56 7.19 9.95.53.1.72-.23.72-.51 0-.25-.01-.92-.01-1.8-2.92.64-3.54-1.4-3.54-1.4-.48-1.22-1.17-1.55-1.17-1.55-.96-.66.07-.64.07-.64 1.06.08 1.62 1.09 1.62 1.09.94 1.61 2.48 1.14 3.09.87.1-.68.37-1.14.67-1.4-2.33-.27-4.78-1.17-4.78-5.2 0-1.15.41-2.08 1.09-2.81-.11-.27-.48-1.36.1-2.84 0 0 .89-.29 2.92 1.08a10.13 10.13 0 0 1 5.32 0c2.02-1.37 2.91-1.08 2.91-1.08.59 1.48.22 2.57.11 2.84.68.73 1.08 1.66 1.08 2.81 0 4.04-2.46 4.93-4.8 5.19.38.33.72.97.72 1.96 0 1.41-.01 2.55-.01 2.9 0 .28.19.61.73.5 4.18-1.4 7.17-5.33 7.17-9.96C23.02 5.25 18.27.5 12 .5z"
      })
    );
  }
  if (name === 'speak') {
    return React.createElement('svg', { viewBox: "0 0 24 24", className: "icon" },
      React.createElement('path', { fill: "currentColor", d: "M5 9v6h4l5 4V5L9 9H5z" }),
      React.createElement('path', { 
        fill: "none", stroke: "currentColor", strokeWidth: "1.5", 
        strokeLinecap: "round", d: "M16.5 8.5a4.5 4.5 0 010 7"
      }),
      React.createElement('path', { 
        fill: "none", stroke: "currentColor", strokeWidth: "1.5", 
        strokeLinecap: "round", d: "M18.5 6.5a7 7 0 010 11"
      })
    );
  }
  return null;
}

// ============================================
// ORBITING ELEMENTAL ORBS - Ice, Fire, Electric
// FIXED: Uses refs for direct DOM manipulation (React-compatible)
// ============================================
function OrbitalElements() {
  const orb1Ref = useRef(null);
  const orb2Ref = useRef(null);
  const orb3Ref = useRef(null);
  
  useEffect(() => {
    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    let smoothX = window.innerWidth / 2;
    let smoothY = window.innerHeight / 2;
    let currentAngle = 0;
    let animationId;

    // Mouse tracking
    const handleMove = (e) => {
      if (e.type === 'touchmove' && e.touches[0]) {
        mouseX = e.touches[0].clientX;
        mouseY = e.touches[0].clientY;
      } else if (e.clientX !== undefined) {
        mouseX = e.clientX;
        mouseY = e.clientY;
      }
    };

    // Animation loop
    const animate = () => {
      // Smooth follow
      smoothX += (mouseX - smoothX) * 0.1;
      smoothY += (mouseY - smoothY) * 0.1;
      
      // Rotate
      currentAngle = (currentAngle + 1.5) % 360;
      
      const radius = 70;
      
      // Calculate positions for each orb
      const positions = [0, 120, 240].map(offset => {
        const rad = ((currentAngle + offset) * Math.PI) / 180;
        return {
          x: smoothX + Math.cos(rad) * radius,
          y: smoothY + Math.sin(rad) * radius
        };
      });
      
      // Update orb positions via refs
      if (orb1Ref.current) {
        orb1Ref.current.style.left = positions[0].x + 'px';
        orb1Ref.current.style.top = positions[0].y + 'px';
      }
      if (orb2Ref.current) {
        orb2Ref.current.style.left = positions[1].x + 'px';
        orb2Ref.current.style.top = positions[1].y + 'px';
      }
      if (orb3Ref.current) {
        orb3Ref.current.style.left = positions[2].x + 'px';
        orb3Ref.current.style.top = positions[2].y + 'px';
      }
      
      animationId = requestAnimationFrame(animate);
    };

    // Start listeners and animation
    document.addEventListener('mousemove', handleMove);
    document.addEventListener('touchmove', handleMove, { passive: true });
    animationId = requestAnimationFrame(animate);

    // Cleanup
    return () => {
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('touchmove', handleMove);
      if (animationId) cancelAnimationFrame(animationId);
    };
  }, []);

  return React.createElement('div', { 
    className: 'orb-container',
    'aria-hidden': true
  },
    React.createElement('div', { 
      ref: orb1Ref,
      className: 'elemental-orb ice-orb'
    }),
    React.createElement('div', { 
      ref: orb2Ref,
      className: 'elemental-orb fire-orb'
    }),
    React.createElement('div', { 
      ref: orb3Ref,
      className: 'elemental-orb electric-orb'
    })
  );
}

// ============================================
// ANIMATED TENTACLES
// ============================================
function Tentacles() {
  const tentaclesRef = useRef([]);

  useEffect(() => {
    const handleMouseMove = (e) => {
      const mouseX = e.clientX || (e.touches && e.touches[0].clientX);
      const mouseY = e.clientY || (e.touches && e.touches[0].clientY);
      if (!mouseX || !mouseY) return;

      tentaclesRef.current.forEach((tentacle, i) => {
        if (!tentacle) return;
        const rect = tentacle.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = i < 2 ? rect.bottom : rect.top + rect.height / 2;
        
        const angle = Math.atan2(mouseY - centerY, mouseX - centerX) * (180 / Math.PI);
        const maxRotation = 12;
        const rotation = Math.max(-maxRotation, Math.min(maxRotation, angle * 0.1));
        
        if (i === 0) {
          tentacle.style.transform = `rotate(${-5 + rotation}deg)`;
        } else if (i === 1) {
          tentacle.style.transform = `rotate(${5 + rotation}deg) scaleX(-1)`;
        } else {
          tentacle.style.transform = `rotate(${85 + rotation * 0.5}deg)`;
        }
      });
    };

    let throttle;
    const throttledMove = (e) => {
      if (!throttle) {
        throttle = setTimeout(() => {
          handleMouseMove(e);
          throttle = null;
        }, 30);
      }
    };

    window.addEventListener('mousemove', throttledMove);
    window.addEventListener('touchmove', throttledMove, { passive: true });

    return () => {
      window.removeEventListener('mousemove', throttledMove);
      window.removeEventListener('touchmove', throttledMove);
      clearTimeout(throttle);
    };
  }, []);

  const tentaclePath = "M60,10 Q50,30 45,50 Q42,70 40,90 Q38,110 35,130 Q32,150 28,170 Q24,190 20,210";

  return React.createElement('div', { className: 'tentacles-bg', 'aria-hidden': true },
    [0, 1, 2].map(i =>
      React.createElement('svg', {
        key: i,
        ref: el => tentaclesRef.current[i] = el,
        className: `tentacle tentacle-${i + 1}`,
        viewBox: '0 0 120 220'
      },
        React.createElement('path', {
          d: tentaclePath,
          stroke: i === 0 ? '#6EE7B7' : i === 1 ? '#5eead4' : '#60A5FA',
          strokeWidth: i === 2 ? '14' : '16',
          strokeLinecap: 'round',
          fill: 'none'
        })
      )
    )
  );
}

// ============================================
// CONTACT CARD COMPONENT
// ============================================
function ContactCard() {
  const sentences = [
    "Hi — I'm Faiz. I build elegant, fast interfaces.",
    "I ride skateboards and ship delightful UI.",
    "Competitive coder. Curious problem solver. Friendly to bugs.",
    "Let's build something people actually enjoy using."
  ];

  const [text, setText] = useState("");
  const [idx, setIdx] = useState(0);
  const [charIdx, setCharIdx] = useState(0);
  const [visible, setVisible] = useState(true);
  const [copied, setCopied] = useState(false);

  const speakingRef = useRef(false);
  const speakIndexRef = useRef(0); // Track which sentence to speak next
  const queueRef = useRef([]); // Queue for speech synthesis

  // Typewriter effect
  useEffect(() => {
    if (!visible) return;
    const sentence = sentences[idx];
    
    if (charIdx <= sentence.length) {
      const t = setTimeout(() => {
        setText(sentence.slice(0, charIdx));
        setCharIdx(c => c + 1);
      }, 40);
      return () => clearTimeout(t);
    } else {
      const t = setTimeout(() => {
        setVisible(false);
        setTimeout(() => {
          setIdx(i => (i + 1) % sentences.length);
          setCharIdx(0);
          setText("");
          setVisible(true);
        }, 800);
      }, 1400);
      return () => clearTimeout(t);
    }
  }, [charIdx, idx, visible]);

  // Speech synthesis - One sentence per click
  const speak = () => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();

    // Get current sentence based on index
    const currentSentence = sentences[speakIndexRef.current];

    // Create and speak utterance
    const utterance = new SpeechSynthesisUtterance(currentSentence);
    utterance.rate = 1.05;
    utterance.pitch = 1.05;

    utterance.onend = () => {
      speakingRef.current = false;
    };

    utterance.onerror = () => {
      speakingRef.current = false;
    };

    window.speechSynthesis.speak(utterance);
    speakingRef.current = true;

    // Move to next sentence (loop back to 0 after last)
    speakIndexRef.current = (speakIndexRef.current + 1) % sentences.length;
  };

  const stopSpeech = () => {
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    speakingRef.current = false;
  };

  const copyEmail = (e) => {
    e.preventDefault();
    const email = "faiz.corsair@gmail.com";
    
    if (navigator.clipboard) {
      navigator.clipboard.writeText(email).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      });
    } else {
      const textarea = document.createElement('textarea');
      textarea.value = email;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const LINKS = {
    linkedin: "https://linkedin.com/in/prepreater",
    leetcode: "https://leetcode.com/faiz0308",
    github: "https://github.com/plasmacat420"
  };

  return React.createElement('div', {
      className: "board",
      id: "main-content",
      role: "article",
      'aria-label': "Contact information for Faiz"
    },
    // Photo
    React.createElement('div', { className: "photo-wrap" },
      React.createElement('img', {
        src: "me.jpg",
        alt: "Faiz - UI Developer & Competitive Coder",
        loading: "eager",
        decoding: "async",
        onError: e => e.target.style.display = 'none'
      })
    ),

    // Skateboard
    React.createElement('div', { className: "skateboard" },
      copied && React.createElement('div', {
        className: 'copy-notification',
        role: 'status',
        'aria-live': 'polite'
      }, '✓ Email Copied!'),

      React.createElement('a', {
        className: "skate-deck",
        href: "mailto:faiz.corsair@gmail.com",
        'aria-label': "Email Faiz at faiz.corsair@gmail.com. Right-click to copy email address",
        onClick: e => { stopSpeech(); setTimeout(() => window.location.href = "mailto:faiz.corsair@gmail.com", 10); },
        onContextMenu: copyEmail
      }, "faiz.corsair@gmail.com"),
      
      React.createElement('div', {
        className: "wheels",
        role: "navigation",
        'aria-label': "Social media links"
      },
        ['linkedin', 'leetcode', 'github'].map(social =>
          React.createElement('a', {
            key: social,
            className: "skate-btn",
            href: LINKS[social],
            target: "_blank",
            rel: "noopener noreferrer",
            'aria-label': `Visit Faiz's ${social.charAt(0).toUpperCase() + social.slice(1)} profile (opens in new tab)`
          }, React.createElement(Icon, { name: social }))
        ),
        React.createElement('button', {
          className: "skate-btn",
          'aria-label': "Listen to introduction using text-to-speech",
          onClick: e => { e.preventDefault(); stopSpeech(); setTimeout(speak, 80); }
        }, React.createElement(Icon, { name: "speak" }))
      )
    ),

    // Typewriter text
    React.createElement('div', {
      className: "ghost",
      'aria-live': 'polite',
      'aria-atomic': 'true',
      style: { opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(-8px)' }
    },
      React.createElement('span', null, text)
    ),

    // Caption
    React.createElement('div', { className: "caption" }, "Modern UI · Fast interactions · DM for collabs")
  );
}

// ============================================
// MAIN APP
// ============================================
function App() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate initial load time for smooth transition
    const timer = setTimeout(() => setLoading(false), 1000);
    return () => clearTimeout(timer);
  }, []);

  return React.createElement(ErrorBoundary, null,
    loading && React.createElement(LoadingScreen),
    React.createElement('div', { className: 'app-container' },
      React.createElement(OrbitalElements),
      React.createElement(Tentacles),
      React.createElement('div', { className: 'center-wrap' },
        React.createElement(ContactCard)
      )
    )
  );
}

// Mount
const root = document.getElementById('root');
if (root) {
  ReactDOM.createRoot(root).render(React.createElement(App));
}