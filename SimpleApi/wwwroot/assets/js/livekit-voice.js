// ============================================
// LIVEKIT VOICE CLIENT
// Connects to LiveKit room with voice agent
// ============================================

/**
 * LiveKitVoiceClient - Manages connection to LiveKit voice agent
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
  }

  /**
   * Connect to LiveKit room with voice agent
   */
  async connect() {
    // Prevent multiple simultaneous connections
    if (this.isConnected || this.isConnecting) {
      console.warn('Already connected or connecting');
      return;
    }

    this.isConnecting = true;

    try {
      // Check LiveKit SDK
      this.LiveKit = window.LivekitClient || window.LiveKit;
      if (!this.LiveKit) {
        throw new Error('LiveKit client SDK not loaded. Please refresh the page.');
      }

      // Stage 1: Getting token
      if (this.onStageChange) this.onStageChange('Getting token...');
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

      // Stage 5: Waiting for agent
      if (this.onStageChange) this.onStageChange('Waiting for agent...');
      this.isConnected = true;
      this.isConnecting = false;

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
