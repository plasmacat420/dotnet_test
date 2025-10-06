// ============================================
// CHAT COMPONENT - Real-time conversation display
// ============================================

function ChatWindow({ voiceClient, isConnected, onClose }) {
  const { useState, useEffect, useRef, useMemo } = React;
  const [messages, setMessages] = useState([]);
  const messagesEndRef = useRef(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  // Track segments by ID for updates
  const segmentsMapRef = useRef(new Map());
  const updateTimeoutRef = useRef(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Show/hide chat window based on connection
  useEffect(() => {
    if (isConnected) {
      setIsVisible(true);
    } else {
      const timeout = setTimeout(() => setIsVisible(false), 1000);
      return () => clearTimeout(timeout);
    }
  }, [isConnected]);

  // Rebuild messages from segments (memoized)
  const rebuildMessages = () => {
    const allSegments = Array.from(segmentsMapRef.current.values());

    // Sort by timestamp
    allSegments.sort((a, b) => a.timestamp - b.timestamp);

    // Group consecutive segments from the same speaker
    const groupedMessages = [];
    let currentMessage = null;

    allSegments.forEach(segment => {
      if (!currentMessage || currentMessage.isUser !== segment.isUser) {
        // Different speaker - start new message
        if (currentMessage) {
          groupedMessages.push(currentMessage);
        }
        currentMessage = {
          id: segment.id,
          text: segment.text,
          isUser: segment.isUser,
          timestamp: segment.timestamp,
          isFinal: segment.final,
          segmentIds: [segment.id]
        };
      } else {
        // Same speaker - append to current message
        currentMessage.text += ' ' + segment.text;
        currentMessage.isFinal = currentMessage.isFinal && segment.final;
        currentMessage.segmentIds.push(segment.id);
      }
    });

    if (currentMessage) {
      groupedMessages.push(currentMessage);
    }

    return groupedMessages;
  };

  // Debounced update function
  const scheduleUpdate = () => {
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }

    updateTimeoutRef.current = setTimeout(() => {
      setMessages(rebuildMessages());
    }, 50); // 50ms debounce - smooth but responsive
  };

  // Listen for LiveKit track transcriptions
  useEffect(() => {
    if (!voiceClient || !voiceClient.room) {
      console.log('[Chat] No voice client or room available');
      return;
    }

    const room = voiceClient.room;
    const LiveKit = window.LivekitClient || window.LiveKit;

    if (!LiveKit) {
      console.error('[Chat] LiveKit client not loaded');
      return;
    }

    // Handle transcription received event
    const handleTranscriptionReceived = (segments, participant, publication) => {
      if (!segments || segments.length === 0) return;

      const isUser = participant === room.localParticipant;

      // Update segments map
      segments.forEach(segment => {
        segmentsMapRef.current.set(segment.id, {
          id: segment.id,
          text: segment.text,
          final: segment.final,
          isUser: isUser,
          timestamp: Date.now()
        });
      });

      // Schedule debounced update
      scheduleUpdate();
    };

    // Subscribe to transcription events
    room.on(LiveKit.RoomEvent.TranscriptionReceived, handleTranscriptionReceived);

    console.log('[Chat] Subscribed to LiveKit transcription events');

    return () => {
      room.off(LiveKit.RoomEvent.TranscriptionReceived, handleTranscriptionReceived);
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
      segmentsMapRef.current.clear();
      console.log('[Chat] Unsubscribed from transcription events');
    };
  }, [voiceClient]);

  if (!isVisible && messages.length === 0) {
    return null;
  }

  const chatStyle = {
    position: 'relative',
    width: '100%',
    height: '85vh',
    maxHeight: '800px',
    background: 'rgba(10, 22, 40, 0.95)',
    backdropFilter: 'blur(20px)',
    borderRadius: '24px',
    border: '1px solid rgba(110, 231, 183, 0.2)',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.4), 0 0 1px rgba(110, 231, 183, 0.3)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    opacity: isVisible ? 1 : 0,
    pointerEvents: isVisible ? 'auto' : 'none',
    zIndex: 10,
    transition: 'opacity 2.5s ease-in-out'
  };

  const handleClose = () => {
    setIsClosing(true);
    if (onClose) onClose();
  };

  return React.createElement('div', {
    className: `chat-window ${isClosing ? 'curtain-close' : isVisible ? 'curtain-open' : ''}`,
    style: chatStyle
  },
    // Header
    React.createElement('div', {
      style: {
        padding: '16px 20px',
        background: 'linear-gradient(135deg, rgba(110, 231, 183, 0.15) 0%, rgba(94, 234, 212, 0.1) 100%)',
        borderBottom: '1px solid rgba(110, 231, 183, 0.2)',
        color: '#6EE7B7',
        fontWeight: '600',
        fontSize: '15px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '10px'
      }
    },
      React.createElement('div', {
        style: {
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }
      },
        React.createElement('div', {
          style: {
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: isConnected ? '#4ade80' : '#f87171',
            animation: isConnected ? 'pulse 2s infinite' : 'none'
          }
        }),
        React.createElement('span', null, isConnected ? 'Connected to Agent' : 'Disconnected')
      ),
      React.createElement('button', {
        onClick: handleClose,
        'aria-label': 'Close chat and disconnect',
        style: {
          background: 'transparent',
          border: 'none',
          color: '#6EE7B7',
          cursor: 'pointer',
          padding: '4px 8px',
          borderRadius: '6px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.2s',
          fontSize: '20px',
          lineHeight: '1'
        },
        onMouseEnter: (e) => {
          e.target.style.background = 'rgba(110, 231, 183, 0.2)';
          e.target.style.transform = 'scale(1.1)';
        },
        onMouseLeave: (e) => {
          e.target.style.background = 'transparent';
          e.target.style.transform = 'scale(1)';
        }
      }, '✕')
    ),

    // Messages container
    React.createElement('div', {
      style: {
        flex: 1,
        overflowY: 'auto',
        overflowX: 'hidden',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        scrollBehavior: 'smooth',
        // Performance optimization
        willChange: 'scroll-position'
      }
    },
      messages.length === 0 ?
        React.createElement('div', {
          style: {
            textAlign: 'center',
            color: '#9ca3af',
            padding: '40px 20px',
            fontSize: '14px'
          }
        }, 'Start speaking to see the conversation...') :
        messages.map((msg) =>
          React.createElement('div', {
            key: msg.id,
            className: 'chat-message',
            style: {
              display: 'flex',
              justifyContent: msg.isUser ? 'flex-end' : 'flex-start',
              // Performance optimization
              willChange: 'transform'
            }
          },
            React.createElement('div', {
              style: {
                maxWidth: '75%',
                padding: '12px 16px',
                borderRadius: '16px',
                background: msg.isUser
                  ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                  : 'linear-gradient(135deg, rgba(110, 231, 183, 0.15) 0%, rgba(94, 234, 212, 0.1) 100%)',
                border: msg.isUser ? 'none' : '1px solid rgba(110, 231, 183, 0.2)',
                color: msg.isUser ? 'white' : '#e6eef8',
                fontSize: '14px',
                lineHeight: '1.6',
                wordWrap: 'break-word',
                boxShadow: msg.isUser
                  ? '0 4px 12px rgba(102, 126, 234, 0.3)'
                  : '0 4px 12px rgba(0, 0, 0, 0.2)',
                transition: 'opacity 0.2s ease',
                opacity: msg.isFinal ? 1 : 0.7
              }
            },
              React.createElement('div', null, msg.text + (msg.isFinal ? '' : '...')),
              React.createElement('div', {
                style: {
                  fontSize: '11px',
                  marginTop: '4px',
                  opacity: 0.7
                }
              }, new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))
            )
          )
        ),
      React.createElement('div', { ref: messagesEndRef })
    )
  );
}

// Export to global scope
window.ChatWindow = ChatWindow;
