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
    email: "prepreater1@gmail.com",
    tagline: "Enterprise GenAI Engineer · Voice AI · Agentic Systems"
  },

  // Social Links
  links: {
    linkedin: "https://linkedin.com/in/prepreater",
    leetcode: "https://leetcode.com/faiz0308",
    github: "https://github.com/plasmacat420"
  },

  // Typewriter Messages
  messages: [
    "Hi — I'm Faiz. I build production-grade AI systems.",
    "LangGraph · RAG · Voice AI · Agentic workflows.",
    "You're talking to one of my voice agents right now.",
    "Let's build something genuinely useful with AI."
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
