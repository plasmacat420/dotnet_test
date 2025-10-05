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
    this.token = null;
    this.roomName = null;
    this.LiveKit = null;
  }

  /**
   * Connect to LiveKit room with voice agent
   */
  async connect() {
    if (this.isConnected) {
      return;
    }

    try {
      // Check LiveKit SDK
      this.LiveKit = window.LivekitClient || window.LiveKit;
      if (!this.LiveKit) {
        throw new Error('LiveKit client SDK not loaded. Please refresh the page.');
      }

      // Get access token from backend
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

      // Create LiveKit room with optimized settings for voice
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

      // Connect to room
      await this.room.connect(livekitUrl, this.token);

      // Enable microphone
      await this.room.localParticipant.setMicrophoneEnabled(true);

      this.isConnected = true;

    } catch (error) {
      console.error('Connection error:', error);
      this.isConnected = false;
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

    // Disconnected
    this.room.on(this.LiveKit.RoomEvent.Disconnected, () => {
      this.isConnected = false;
    });

    // Data received (for agent messages)
    this.room.on(this.LiveKit.RoomEvent.DataReceived, (payload, participant) => {
      // Data received - handled by chat component
    });
  }

  /**
   * Disconnect from room
   */
  async disconnect() {
    if (!this.room) return;

    try {
      await this.room.disconnect();
      this.room = null;
      this.isConnected = false;
    } catch (error) {
      console.error('Error disconnecting:', error);
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
