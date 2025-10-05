// ============================================
// CHAT COMPONENT - Real-time conversation display
// ============================================

function ChatWindow({ voiceClient, isConnected, onClose }) {
  const { useState, useEffect, useRef } = React;
  const [messages, setMessages] = useState([]);
  const messagesEndRef = useRef(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Show/hide chat window based on connection
  useEffect(() => {
    if (isConnected) {
      setIsVisible(true);
    } else {
      // Delay hiding to allow user to see final message
      const timeout = setTimeout(() => setIsVisible(false), 1000);
      return () => clearTimeout(timeout);
    }
  }, [isConnected]);

  // Listen for transcription events from LiveKit
  useEffect(() => {
    if (!voiceClient || !voiceClient.room) return;

    const room = voiceClient.room;

    // Handle track subscribed (agent audio)
    const handleTrackSubscribed = (track, publication, participant) => {
      // Track subscribed - handled silently
    };

    // Handle data received (can be used for transcripts)
    const handleDataReceived = (payload, participant) => {
      try {
        const decoder = new TextDecoder();
        const data = JSON.parse(decoder.decode(payload));

        if (data.type === 'transcript') {
          addMessage(data.text, data.role === 'user', Date.now());
        }
      } catch (e) {
        // Non-JSON data received - ignore
      }
    };

    room.on(window.LivekitClient.RoomEvent.TrackSubscribed, handleTrackSubscribed);
    room.on(window.LivekitClient.RoomEvent.DataReceived, handleDataReceived);

    return () => {
      room.off(window.LivekitClient.RoomEvent.TrackSubscribed, handleTrackSubscribed);
      room.off(window.LivekitClient.RoomEvent.DataReceived, handleDataReceived);
    };
  }, [voiceClient]);

  // Add message to chat
  const addMessage = (text, isUser, timestamp) => {
    setMessages(prev => {
      const newMessages = [...prev, {
        id: Date.now() + Math.random(),
        text,
        isUser,
        timestamp: timestamp || Date.now()
      }];
      return newMessages;
    });
  };

  // Expose method to add messages (can be called from livekit-voice.js)
  useEffect(() => {
    if (isConnected) {
      window.addChatMessage = addMessage;
    } else {
      window.addChatMessage = null;
    }
  }, [isConnected]);

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

  // Handle close with animation
  const handleClose = () => {
    setIsClosing(true);
    if (onClose) onClose();
     // Match animation duration
  };

  return React.createElement('div', {
    className: `chat-window ${isClosing ? 'curtain-close' : isVisible ? 'curtain-open' : ''}`,
    style: chatStyle
  },
    // Header with close button
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
      // Status indicator and text
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
      // Close button
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
        scrollBehavior: 'smooth'
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
        messages.map((msg, idx) =>
          React.createElement('div', {
            key: msg.id,
            className: 'chat-message',
            style: {
              display: 'flex',
              justifyContent: msg.isUser ? 'flex-end' : 'flex-start'
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
                transition: 'all 0.2s ease'
              }
            },
              React.createElement('div', null, msg.text),
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
