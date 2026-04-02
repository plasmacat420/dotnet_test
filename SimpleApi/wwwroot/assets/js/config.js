// ============================================
// CONFIG - Centralized configuration for the application
// ============================================

window.AppConfig = {
  // Backend API (Render) - used when served from GitHub Pages
  api: {
    baseUrl: 'https://voicebot-api-4s40.onrender.com'
  },

  // Personal Information
  contact: {
    name: "Faiz",
    email: "faiz.corsair@gmail.com",
    tagline: "Modern UI · Fast interactions · DM for collabs"
  },

  // Social Links
  links: {
    linkedin: "https://linkedin.com/in/prepreater",
    leetcode: "https://leetcode.com/faiz0308",
    github: "https://github.com/plasmacat420"
  },

  // Typewriter Messages
  messages: [
    "Hi — I'm Faiz. I build elegant, fast interfaces.",
    "I ride skateboards and ship delightful UI.",
    "Competitive coder. Curious problem solver. Friendly to bugs.",
    "Let's build something people actually enjoy using."
  ],

  // Typewriter Settings
  typewriter: {
    charDelay: 40,        // ms between each character
    sentencePause: 1400,  // ms pause after sentence completes
    fadeOutDuration: 800  // ms to fade out before next sentence
  },

  // Speech Synthesis Settings
  speech: {
    rate: 1.05,
    pitch: 1.05
  },

  // Animation Settings
  animations: {
    loadingDuration: 1000,      // Initial loading screen duration
    copyNotification: 2500,     // Copy notification display time
    orbitRadius: 70,            // Orbital elements radius
    orbitSpeed: 1.5,            // Degrees per frame
    tentacleFollowSpeed: 0.1,   // Mouse follow smoothing (0-1)
    tentacleMaxRotation: 12     // Max rotation in degrees
  },

  // Brand
  brand: {
    name: "PREPREATER",
    suffix: "& CO.",
    fullName: "Prepreater & Co."
  }
};
