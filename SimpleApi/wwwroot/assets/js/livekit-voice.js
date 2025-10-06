// ============================================
// LIVEKIT VOICE CLIENT
// Connects to LiveKit room with voice agent
// ============================================
//
// IMPORTANT: Agent Wake-up Flow
// ==============================
// LiveKit agents sleep when inactive to save resources.
// This client handles the wake-up sequence:
//
// 1. Get access token from backend
// 2. Create LiveKit room with optimized audio settings
// 3. Connect to LiveKit server
// 4. Enable microphone (triggers agent dispatch)
// 5. Wait for agent to connect (with timeout)
// 6. If timeout, retry with exponential backoff
//
// Retry Strategy:
// - 3 attempts maximum
// - Delays: 2s, 4s, 8s (exponential backoff)
// - Clear error messages to user
//
// Security:
// - Input sanitization on backend
// - Rate limiting per IP
// - Secure token generation with 6-hour expiry
//
// ============================================

/**
 * LiveKitVoiceClient - Manages connection to LiveKit voice agent with retry logic
 */
class LiveKitVoiceClient {
  constructor() {
    this.room = null;
    this.isConnected = false;
    this.isConnecting = false;
    this.token = null;
    this.roomName = null;
    this.LiveKit = null;
    this.onStageChange = null; // Callback for stage updates
    this.onDisconnect = null; // Callback for disconnect events
    this.onError = null; // Callback for error events
    this.maxRetries = 3;
    this.retryCount = 0;
    this.agentWakeTimeout = 15000; // 15 seconds to wait for agent
  }

  /**
   * Connect to LiveKit room with voice agent (with retry logic)
   */
  async connect() {
    // Prevent multiple simultaneous connections
    if (this.isConnected || this.isConnecting) {
      console.warn('Already connected or connecting');
      return;
    }

    this.isConnecting = true;
    this.retryCount = 0;

    while (this.retryCount <= this.maxRetries) {
      try {
        await this._attemptConnection();
        return; // Success
      } catch (error) {
        console.error(`Connection attempt ${this.retryCount + 1} failed:`, error);

        if (this.retryCount < this.maxRetries) {
          // Exponential backoff: 2s, 4s, 8s
          const delay = Math.pow(2, this.retryCount) * 2000;
          if (this.onStageChange) {
            this.onStageChange(`Retrying in ${delay / 1000}s... (${this.retryCount + 1}/${this.maxRetries})`);
          }
          await this._sleep(delay);
          this.retryCount++;
        } else {
          // Max retries exceeded
          this.isConnected = false;
          this.isConnecting = false;
          if (this.onError) {
            this.onError('Failed to connect after multiple attempts. The agent may be sleeping or unavailable.');
          }
          throw error;
        }
      }
    }
  }

  /**
   * Attempt a single connection to LiveKit
   */
  async _attemptConnection() {
    try {
      // Check LiveKit SDK
      this.LiveKit = window.LivekitClient || window.LiveKit;
      if (!this.LiveKit) {
        throw new Error('LiveKit client SDK not loaded. Please refresh the page.');
      }

      // Stage 1: Getting token
      if (this.onStageChange) this.onStageChange('Getting access token...');
      const response = await fetch('/api/livekit/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identity: `user-${Date.now()}`,
          name: 'Guest'
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to get token: ${response.statusText}`);
      }

      const data = await response.json();
      this.token = data.token;
      this.roomName = data.roomName;
      const livekitUrl = data.url;

      // Stage 2: Creating room
      if (this.onStageChange) this.onStageChange('Creating room...');
      this.room = new this.LiveKit.Room({
        adaptiveStream: true,
        dynacast: true,
        audioCaptureDefaults: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      // Set up event handlers BEFORE connecting
      this.setupEventHandlers();

      // Stage 3: Connecting to server
      if (this.onStageChange) this.onStageChange('Connecting to server...');
      await this.room.connect(livekitUrl, this.token);

      // Stage 4: Enabling microphone
      if (this.onStageChange) this.onStageChange('Enabling microphone...');
      await this.room.localParticipant.setMicrophoneEnabled(true);

      // Stage 5: Waking up agent (critical step!)
      if (this.onStageChange) this.onStageChange('Waking up voice agent...');

      // Wait for agent to connect or timeout
      const agentConnected = await this._waitForAgent();

      if (!agentConnected) {
        throw new Error('Agent did not wake up in time');
      }

      // Stage 6: Success
      if (this.onStageChange) this.onStageChange('Connected! Start speaking...');
      this.isConnected = true;
      this.isConnecting = false;
      this.retryCount = 0; // Reset retry count on success

    } catch (error) {
      console.error('Connection error:', error);
      this.isConnected = false;
      this.isConnecting = false;

      // Clean up partial connection
      if (this.room) {
        try {
          await this.room.disconnect();
        } catch (e) {
          console.error('Error cleaning up after failed connection:', e);
        }
        this.room = null;
      }

      throw error;
    }
  }

  /**
   * Wait for agent to connect to the room
   */
  async _waitForAgent() {
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        this.room.off(this.LiveKit.RoomEvent.ParticipantConnected, onAgentJoin);
        resolve(false); // Timeout
      }, this.agentWakeTimeout);

      const onAgentJoin = (participant) => {
        // Check if it's the agent (not the local user)
        if (participant.identity !== this.room.localParticipant.identity) {
          clearTimeout(timeout);
          this.room.off(this.LiveKit.RoomEvent.ParticipantConnected, onAgentJoin);
          console.log('Agent connected:', participant.identity);
          resolve(true); // Agent connected
        }
      };

      // Check if agent already in room
      const existingParticipants = Array.from(this.room.remoteParticipants.values());
      if (existingParticipants.length > 0) {
        clearTimeout(timeout);
        console.log('Agent already in room');
        resolve(true);
        return;
      }

      // Listen for agent joining
      this.room.on(this.LiveKit.RoomEvent.ParticipantConnected, onAgentJoin);
    });
  }

  /**
   * Sleep utility for retry delays
   */
  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Setup event handlers for LiveKit room
   */
  setupEventHandlers() {
    // Track subscribed (agent starts speaking)
    this.room.on(this.LiveKit.RoomEvent.TrackSubscribed, (track, publication, participant) => {
      if (track.kind === this.LiveKit.Track.Kind.Audio) {
        // Attach audio track to play agent's voice
        const audioElement = track.attach();
        audioElement.autoplay = true;
        document.body.appendChild(audioElement);
      }
    });

    // Track unsubscribed
    this.room.on(this.LiveKit.RoomEvent.TrackUnsubscribed, (track) => {
      track.detach().forEach(el => el.remove());
    });

    // Participant connected (agent joined)
    this.room.on(this.LiveKit.RoomEvent.ParticipantConnected, (participant) => {
      // Agent connected - silent handling
    });

    // Participant disconnected
    this.room.on(this.LiveKit.RoomEvent.ParticipantDisconnected, (participant) => {
      // Participant disconnected - silent handling
    });

    // Connection state changed
    this.room.on(this.LiveKit.RoomEvent.ConnectionStateChanged, (state) => {
      // State changed - silent handling
    });

    // Disconnected (by server or error)
    this.room.on(this.LiveKit.RoomEvent.Disconnected, () => {
      this.isConnected = false;
      this.isConnecting = false;

      // Notify UI that we've been disconnected
      if (this.onDisconnect) {
        this.onDisconnect();
      }
    });

    // Data received (for agent messages)
    this.room.on(this.LiveKit.RoomEvent.DataReceived, (payload, participant) => {
      // Data received - handled by chat component
    });
  }

  /**
   * Disconnect from room and clean up resources
   */
  async disconnect() {
    if (!this.room) {
      this.isConnected = false;
      this.isConnecting = false;
      return;
    }

    try {
      // Remove all audio elements created by this client
      const audioElements = document.querySelectorAll('audio');
      audioElements.forEach(el => {
        if (el.srcObject) {
          el.pause();
          el.srcObject = null;
          el.remove();
        }
      });

      // Disconnect from room
      await this.room.disconnect();
      this.room = null;
      this.isConnected = false;
      this.isConnecting = false;
    } catch (error) {
      console.error('Error disconnecting:', error);
      // Force cleanup even if disconnect fails
      this.room = null;
      this.isConnected = false;
      this.isConnecting = false;
    }
  }

  /**
   * Toggle microphone mute
   */
  async toggleMicrophone() {
    if (!this.room) return;

    const enabled = this.room.localParticipant.isMicrophoneEnabled;
    await this.room.localParticipant.setMicrophoneEnabled(!enabled);
  }
}

// Export to global scope
window.LiveKitVoiceClient = LiveKitVoiceClient;
