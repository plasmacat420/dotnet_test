// ============================================
// GAME.JS - Zombie Killer Three.js Game
// ============================================
// Handles 3D scene, orbs, zombies, and game logic

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';

// Expose THREE globally for compatibility
window.THREE = THREE;

(function() {
  'use strict';

  // Game state
  let gameInitialized = false;
  let scene, camera, renderer;
  let orbs = { ice: null, fire: null, electric: null };
  let animationId;
  let cssOrbsHidden = false;
  let zombieModel = null; // Loaded zombie model (TEMPLATE - never add to scene!)
  let zombieAnimations = []; // Zombie animations from GLTF
  let zombieTemplateReady = false; // Flag to indicate model is ready for cloning
  let zombies = []; // Active zombie instances
  let zombieSpawnTimer = 0; // Timer for spawning zombies
  const ZOMBIE_SPAWN_INTERVAL = 1000; // Spawn every 3 seconds
  const ZOMBIE_SPEED = 0.1; // Units per frame (adjusted to match walk animation)
  const ZOMBIE_SPAWN_DISTANCE = -90; // Spawn 90 units away (3x the original 30)
  const ZOMBIE_CLEANUP_DISTANCE = 28; // Cleanup when past camera

  // Scoring system
  let score = 0;

  // Mouse tracking for orbit
  let mouseX = 0;
  let mouseY = 0;
  let targetX = 0; // 3D world position from raycasting
  let targetY = 8; // 3D world position from raycasting (vertical)
  let targetZ = 0; // 3D world position from raycasting (depth)
  let orbitAngle = 0;
  const orbitRadius = 0.5; // ADJUST: Smaller = orbs closer to cursor (try: 0.3-1.0)
  const orbitSpeed = 0.3;

  // Raycasting for mouse position
  let raycaster = null;
  let targetPlane = null; // Invisible plane for raycasting

  // Clock for animation timing
  const clock = new THREE.Clock();

  // Orb throwing state
  let thrownOrbs = []; // Array of { orb, startPos, targetPos, progress, returnStart }
  let orbTrails = []; // Array of trail particles following orbs

  // Particle effects
  let particles = []; // Array of active particles for hit effects

  // Camera effects
  let cameraShake = { active: false, intensity: 0, duration: 0 };
  let cameraOriginalPos = null;

  // Time effects
  let timeScale = 1.0; // Normal speed = 1.0, slow-motion = 0.3

  // ============================================
  // SCORING FUNCTIONS
  // ============================================
  function updateScore(points) {
    score += points;
    const scoreElement = document.getElementById('game-score');
    if (scoreElement) {
      scoreElement.textContent = score;

      // Add visual feedback animation
      const animClass = points > 0 ? 'score-increase' : 'score-decrease';
      scoreElement.classList.remove('score-increase', 'score-decrease');
      // Force reflow to restart animation
      void scoreElement.offsetWidth;
      scoreElement.classList.add(animClass);

      // Remove animation class after it completes
      setTimeout(() => {
        scoreElement.classList.remove(animClass);
      }, 300);
    }

    // Update zombie count display
    const zombieCountElement = document.getElementById('game-zombie-count');
    if (zombieCountElement) {
      zombieCountElement.textContent = zombies.length;
    }

    console.log('[Game] Score:', score, '(', points > 0 ? '+' + points : points, ')');
  }

  function createScoreboard() {
    // Check if scoreboard already exists
    if (document.getElementById('game-scoreboard')) return;

    const scoreboard = document.createElement('div');
    scoreboard.id = 'game-scoreboard';
    scoreboard.innerHTML = `
      <div class="score-label">SCORE</div>
      <div id="game-score" class="score-value">0</div>
      <div class="zombie-count">Zombies: <span id="game-zombie-count">0</span></div>
    `;
    document.body.appendChild(scoreboard);
    console.log('[Game] Scoreboard created');
  }

  function createBackgroundEffects() {
    // Check if background effects already exist
    if (document.querySelector('.game-fog-layer-2')) return;

    // Create fog layer 2
    const fogLayer2 = document.createElement('div');
    fogLayer2.className = 'game-fog-layer-2';
    document.body.appendChild(fogLayer2);

    // Create ambient glow
    const ambientGlow = document.createElement('div');
    ambientGlow.className = 'game-ambient-glow';
    document.body.appendChild(ambientGlow);

    console.log('[Game] Background atmosphere effects created');
  }

  // ============================================
  // PARTICLE EFFECTS
  // ============================================
  function createHitParticles(position, orbType) {
    // Colors based on orb type
    const colors = {
      ice: 0x00ccff,
      fire: 0xff6600,
      electric: 0x8800cc
    };

    const color = colors[orbType] || 0xffffff;
    const particleCount = 20;

    for (let i = 0; i < particleCount; i++) {
      // Create particle
      const particleGeometry = new THREE.SphereGeometry(0.3, 8, 8);
      const particleMaterial = new THREE.MeshBasicMaterial({
        color: color,
        transparent: true,
        opacity: 1.0
      });
      const particle = new THREE.Mesh(particleGeometry, particleMaterial);

      // Position at hit point
      particle.position.copy(position);

      // Random velocity in all directions
      const speed = 0.3 + Math.random() * 0.4;
      const velocity = new THREE.Vector3(
        (Math.random() - 0.5) * speed,
        Math.random() * speed * 1.5, // More upward
        (Math.random() - 0.5) * speed
      );

      scene.add(particle);

      // Store particle data
      particles.push({
        mesh: particle,
        velocity: velocity,
        life: 1.0, // Life from 1.0 to 0.0
        geometry: particleGeometry,
        material: particleMaterial
      });
    }
  }

  function createScreenFlash() {
    // Create a white flash overlay
    const flashDiv = document.createElement('div');
    flashDiv.style.position = 'fixed';
    flashDiv.style.top = '0';
    flashDiv.style.left = '0';
    flashDiv.style.width = '100vw';
    flashDiv.style.height = '100vh';
    flashDiv.style.backgroundColor = 'rgba(255, 255, 255, 0.3)';
    flashDiv.style.pointerEvents = 'none';
    flashDiv.style.zIndex = '9999';
    flashDiv.style.transition = 'opacity 0.1s ease-out';
    document.body.appendChild(flashDiv);

    // Fade out quickly
    setTimeout(() => {
      flashDiv.style.opacity = '0';
      setTimeout(() => flashDiv.remove(), 100);
    }, 50);
  }

  function createZombieHitGlow(zombie) {
    // Make zombie flash red briefly on hit
    zombie.traverse((child) => {
      if (child.isMesh || child.isSkinnedMesh) {
        if (child.material) {
          // Store original emissive state
          const originalEmissive = child.material.emissive ? child.material.emissive.clone() : new THREE.Color(0x000000);
          const originalIntensity = child.material.emissiveIntensity || 0;

          // Set to bright red flash for hit effect
          if (!child.material.emissive) {
            child.material.emissive = new THREE.Color();
          }
          child.material.emissive.setHex(0xff0000);
          child.material.emissiveIntensity = 0.8; // Bright red flash

          // Reset to original state after short delay
          setTimeout(() => {
            child.material.emissive.copy(originalEmissive);
            child.material.emissiveIntensity = originalIntensity;
          }, 150);
        }
      }
    });
  }

  function startCameraShake(intensity = 0.5, duration = 0.3) {
    if (!cameraOriginalPos) {
      cameraOriginalPos = camera.position.clone();
    }
    cameraShake.active = true;
    cameraShake.intensity = intensity;
    cameraShake.duration = duration;
  }

  function triggerSlowMotion(duration = 150) {
    // Brief slow-motion effect
    timeScale = 0.3; // 30% speed
    setTimeout(() => {
      timeScale = 1.0; // Back to normal
    }, duration);
  }

  function createFloatingScore(position, points) {
    // Create floating score text at 3D position
    const scoreDiv = document.createElement('div');
    scoreDiv.textContent = '+' + points;
    scoreDiv.style.position = 'fixed';
    scoreDiv.style.fontSize = '48px';
    scoreDiv.style.fontWeight = 'bold';
    scoreDiv.style.color = '#6ee7b7';
    scoreDiv.style.textShadow = '0 0 10px rgba(110, 231, 183, 0.8), 0 0 20px rgba(110, 231, 183, 0.5)';
    scoreDiv.style.pointerEvents = 'none';
    scoreDiv.style.zIndex = '10000';
    scoreDiv.style.transition = 'all 1.0s ease-out';
    scoreDiv.style.opacity = '1';
    scoreDiv.style.fontFamily = 'monospace';

    // Convert 3D position to screen coordinates
    const vector = position.clone();
    vector.project(camera);

    const x = (vector.x * 0.5 + 0.5) * window.innerWidth;
    const y = (vector.y * -0.5 + 0.5) * window.innerHeight;

    scoreDiv.style.left = x + 'px';
    scoreDiv.style.top = y + 'px';
    scoreDiv.style.transform = 'translate(-50%, -50%)';

    document.body.appendChild(scoreDiv);

    // Animate upward and fade out
    setTimeout(() => {
      scoreDiv.style.transform = 'translate(-50%, -150px) scale(1.5)';
      scoreDiv.style.opacity = '0';
    }, 50);

    // Remove after animation
    setTimeout(() => scoreDiv.remove(), 1100);
  }

  // ============================================
  // ORB THROWING MECHANICS
  // ============================================
  function findNearestOrb(clickX, clickY) {
    // Find which orb is closest to the click position
    const orbArray = [
      { name: 'ice', orb: orbs.ice },
      { name: 'fire', orb: orbs.fire },
      { name: 'electric', orb: orbs.electric }
    ];

    let nearestOrb = null;
    let minDist = Infinity;

    orbArray.forEach(({ name, orb }) => {
      if (!orb) return;

      // Check if orb is already thrown
      const alreadyThrown = thrownOrbs.some(t => t.orb === orb);
      if (alreadyThrown) return;

      // Project orb's 3D position to 2D screen space
      const vector = orb.position.clone();
      vector.project(camera);

      // Convert to screen coordinates
      const orbX = (vector.x + 1) / 2;
      const orbY = (1 - vector.y) / 2;

      // Distance from click (Euclidean distance)
      const dist = Math.sqrt((orbX - clickX) ** 2 + (orbY - clickY) ** 2);

      if (dist < minDist) {
        minDist = dist;
        nearestOrb = { name, orb };
      }
    });

    return nearestOrb;
  }

  function throwOrb(clickX, clickY, clickWorldPos) {
    // Find nearest available orb
    const nearest = findNearestOrb(clickX, clickY);
    if (!nearest) {
      console.log('[Game] No available orbs to throw');
      return;
    }

    console.log('[Game] Throwing', nearest.name, 'orb');

    // Store throw state
    thrownOrbs.push({
      orb: nearest.orb,
      startPos: nearest.orb.position.clone(),
      targetPos: clickWorldPos.clone(),
      progress: 0,
      returnStart: null, // Will be set when throw completes
      type: nearest.name,
      hasHit: false // Track if this throw has registered a hit
    });
  }

  function handleCanvasClick(event) {
    // Get normalized click coordinates
    const clickX = event.clientX / window.innerWidth;
    const clickY = event.clientY / window.innerHeight;

    // Cast ray to find 3D position on ground plane
    const mouse = new THREE.Vector2(
      (event.clientX / window.innerWidth) * 2 - 1,
      -(event.clientY / window.innerHeight) * 2 + 1
    );

    raycaster.setFromCamera(mouse, camera);

    // Create a LARGE ground plane to raycast against (covers entire field of view)
    const groundPlaneGeom = new THREE.PlaneGeometry(2000, 2000); // Much larger plane
    groundPlaneGeom.rotateX(-Math.PI / 2);
    const groundPlaneMesh = new THREE.Mesh(groundPlaneGeom);
    groundPlaneMesh.position.y = 0;
    groundPlaneMesh.position.z = -50; // Centered on extended field

    const intersects = raycaster.intersectObject(groundPlaneMesh);

    if (intersects.length > 0) {
      const clickWorldPos = intersects[0].point;
      console.log('[Game] Click at:', clickWorldPos);
      throwOrb(clickX, clickY, clickWorldPos);
    } else {
      // Fallback: If no intersection, project ray to a fixed distance
      console.log('[Game] No ground intersection, using fallback');
      const rayDirection = raycaster.ray.direction.clone();
      const distance = 50; // Fixed distance along ray
      const clickWorldPos = raycaster.ray.origin.clone().add(rayDirection.multiplyScalar(distance));
      clickWorldPos.y = Math.max(clickWorldPos.y, 0); // Keep above ground
      throwOrb(clickX, clickY, clickWorldPos);
    }

    groundPlaneGeom.dispose();
  }

  function handleTouchStart(event) {
    if (event.touches.length === 0) return;
    const touch = event.touches[0];

    // Create a fake mouse event
    const fakeEvent = {
      clientX: touch.clientX,
      clientY: touch.clientY
    };

    handleCanvasClick(fakeEvent);
  }

  // ============================================
  // INIT GAME - Called when game mode starts
  // ============================================
  function initGame() {
    if (gameInitialized) return;

    console.log('[Game] Initializing three.js scene...');

    const container = document.getElementById('game-canvas-container');
    if (!container) {
      console.error('[Game] Container not found');
      return;
    }

    // Create scoreboard UI
    createScoreboard();
    score = 0; // Reset score
    updateScore(0); // Initialize display

    // Create background atmosphere elements
    createBackgroundEffects();

    // Create scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a1628); // Match CSS background

    // ====================================================================
    // CAMERA SETUP - ADJUST THESE VALUES TO CHANGE VIEW
    // ====================================================================
    camera = new THREE.PerspectiveCamera(
      60, // FOV - narrower = more zoomed in (try: 50-70)
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );

    // CAMERA POSITION - Where camera is located
    // X: left(-) / right(+)
    // Y: height (higher = more top-down view)
    // Z: back(+) / forward(-)
    camera.position.set(
      0,    // X: centered
      15,   // Y: ADJUST THIS - higher = more top-down (try: 10-20)
      20    // Z: ADJUST THIS - distance back from origin (try: 15-25)
    );

    // CAMERA LOOK AT - What point camera is looking at
    camera.lookAt(
      0,    // X: center
      0,    // Y: ground level
      -45   // Z: look ahead where zombies spawn (3x original, negative = distance ahead)
    );

    // Create renderer
    renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    // Add lighting
    setupLighting();

    // Add ground plane
    createGround();

    // Initialize raycaster for mouse tracking
    raycaster = new THREE.Raycaster();

    // Create invisible VERTICAL plane for mouse position projection
    // This plane faces the camera so orbs stick to screen space
    const planeGeometry = new THREE.PlaneGeometry(1000, 1000);
    const planeMaterial = new THREE.MeshBasicMaterial({
      visible: false, // Invisible
      side: THREE.DoubleSide
    });
    targetPlane = new THREE.Mesh(planeGeometry, planeMaterial);
    // No rotation = vertical plane (default orientation is Z-facing)
    // Position it much closer to camera for accurate cursor tracking
    // Camera is at Z=20, so Z=15 puts plane very close to camera
    targetPlane.position.set(0, 0, 15); // Much closer to camera
    scene.add(targetPlane);

    // Wait for CSS transition, then create 3D orbs and do handoff
    setTimeout(() => {
      createOrbs();
      handoffOrbs();
      loadZombieModel(); // Load zombie model asynchronously
    }, 1000); // Wait for CSS orbs to reach staging positions

    // Handle window resize
    window.addEventListener('resize', onWindowResize);

    // Mouse tracking for orbit
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('touchmove', onTouchMove, { passive: true });

    // Click/touch for throwing orbs
    window.addEventListener('click', handleCanvasClick);
    window.addEventListener('touchstart', handleTouchStart, { passive: true });

    // Start animation loop
    animate();

    gameInitialized = true;
    console.log('[Game] Initialization complete!');
  }

  // ============================================
  // MOUSE TRACKING
  // ============================================
  function onMouseMove(event) {
    // Convert screen coordinates to normalized device coordinates (-1 to +1)
    mouseX = (event.clientX / window.innerWidth) * 2 - 1;
    mouseY = -(event.clientY / window.innerHeight) * 2 + 1;
  }

  function onTouchMove(event) {
    if (event.touches[0]) {
      mouseX = (event.touches[0].clientX / window.innerWidth) * 2 - 1;
      mouseY = -(event.touches[0].clientY / window.innerHeight) * 2 + 1;
    }
  }

  // ============================================
  // CREATE GROUND
  // ============================================
  function createGround() {
    // Create a large ground plane (extended to 3x length)
    const groundGeometry = new THREE.PlaneGeometry(100, 250); // Width 100, Depth 250 (extended)
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: 0x1a2332, // Slightly lighter than background
      roughness: 0.8,
      metalness: 0.2,
      side: THREE.DoubleSide
    });

    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2; // Rotate to be horizontal
    ground.position.y = 0; // Ground level
    ground.receiveShadow = true;

    scene.add(ground);

    // Add a subtle grid helper to see depth (extended to 3x)
    const gridHelper = new THREE.GridHelper(250, 100, 0x2a3444, 0x1a2332); // Size 250, 100 divisions
    gridHelper.position.y = 0.01; // Slightly above ground to prevent z-fighting
    scene.add(gridHelper);

    console.log('[Game] Ground created');
  }

  // ============================================
  // SETUP LIGHTING
  // ============================================
  function setupLighting() {
    // Ambient light (bright overall illumination to make zombies visible)
    const ambientLight = new THREE.AmbientLight(0xffffff, 2.0); // Increased from 2.0 to 3.5
    scene.add(ambientLight);

    // Main directional light (sun-like) - positioned to light the ground
    const dirLight = new THREE.DirectionalLight(0xffffff, 2.0); // Increased from 1.5 to 2.0
    dirLight.position.set(10, 20, -30); // Moved back to center of extended field
    dirLight.castShadow = true;
    dirLight.shadow.camera.left = -50;
    dirLight.shadow.camera.right = 50;
    dirLight.shadow.camera.top = 80;  // Extended to cover longer field
    dirLight.shadow.camera.bottom = -80; // Extended to cover longer field
    scene.add(dirLight);

    // Additional front light to illuminate zombies coming toward camera
    const frontLight = new THREE.DirectionalLight(0xffffff, 1.2);
    frontLight.position.set(0, 15, 50); // From camera direction
    scene.add(frontLight);

    // Additional lights for atmosphere
    const backLight = new THREE.DirectionalLight(0x6ee7b7, 0.5); // Increased from 0.3
    backLight.position.set(0, 10, -60); // Moved back to light extended playing field
    scene.add(backLight);
  }

  // ============================================
  // CREATE 3D ORBS - True elemental orbs with effects
  // ============================================
  function createOrbs() {
    console.log('[Game] Creating elemental orbs with effects...');

    // === ICE ORB ===
    orbs.ice = new THREE.Group();

    // Core sphere
    const iceCore = new THREE.Mesh(
      new THREE.SphereGeometry(0.2, 32, 32),
      new THREE.MeshPhysicalMaterial({
        color: 0xaaccff,
        emissive: 0x00aaff,
        emissiveIntensity: 1.0,
        transparent: true,
        opacity: 0.8,
        roughness: 0.1,
        metalness: 0.5
      })
    );
    orbs.ice.add(iceCore);

    // Ice crystals floating around
    const crystals = [];
    for (let i = 0; i < 8; i++) {
      const crystal = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.06, 0),
        new THREE.MeshPhysicalMaterial({
          color: 0xccffff,
          emissive: 0x00aaff,
          emissiveIntensity: 0.5,
          transparent: true,
          opacity: 0.7,
          roughness: 0.0
        })
      );
      const angle = (i / 8) * Math.PI * 2;
      const radius = 0.35;
      crystal.position.x = Math.cos(angle) * radius;
      crystal.position.y = Math.sin(angle) * radius;
      crystal.position.z = Math.sin(angle * 2) * 0.2;
      crystal.rotation.set(Math.random(), Math.random(), Math.random());
      orbs.ice.add(crystal);
      crystals.push(crystal);
    }

    // Ice smoky aura (organic flowing shape)
    const iceGlowGeo = new THREE.IcosahedronGeometry(0.5, 2);
    const iceGlow = new THREE.Mesh(
      iceGlowGeo,
      new THREE.MeshBasicMaterial({
        color: 0x00aaff,
        transparent: true,
        opacity: 0.12,
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending,
        wireframe: false
      })
    );
    orbs.ice.add(iceGlow);

    // Ice inner aura layer
    const iceGlow2Geo = new THREE.IcosahedronGeometry(0.35, 2);
    const iceGlow2 = new THREE.Mesh(
      iceGlow2Geo,
      new THREE.MeshBasicMaterial({
        color: 0x00ddff,
        transparent: true,
        opacity: 0.18,
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending,
        wireframe: false
      })
    );
    orbs.ice.add(iceGlow2);

    orbs.ice.userData = {
      core: iceCore,
      crystals: crystals,
      glow: iceGlow,
      glow2: iceGlow2,
      glowGeo: iceGlowGeo,
      glow2Geo: iceGlow2Geo
    };
    orbs.ice.scale.set(2.5, 2.5, 2.5); // Make orb bigger
    scene.add(orbs.ice);

    // === FIRE ORB ===
    orbs.fire = new THREE.Group();

    // Fire core
    const fireCore = new THREE.Mesh(
      new THREE.SphereGeometry(0.2, 32, 32),
      new THREE.MeshBasicMaterial({
        color: 0xffaa00,
        transparent: true,
        opacity: 0.9
      })
    );
    orbs.fire.add(fireCore);

    // Fire particles (small spheres)
    const fireParticles = [];
    for (let i = 0; i < 20; i++) {
      const particle = new THREE.Mesh(
        new THREE.SphereGeometry(0.03, 8, 8),
        new THREE.MeshBasicMaterial({
          color: i % 2 === 0 ? 0xff4400 : 0xff8800,
          transparent: true,
          opacity: 0.8,
          blending: THREE.AdditiveBlending
        })
      );
      const angle = Math.random() * Math.PI * 2;
      const radius = 0.25 + Math.random() * 0.15;
      particle.position.x = Math.cos(angle) * radius;
      particle.position.y = Math.sin(angle) * radius;
      particle.position.z = (Math.random() - 0.5) * 0.3;
      particle.userData = { angle: angle, radius: radius, speed: 0.5 + Math.random() * 0.5 };
      orbs.fire.add(particle);
      fireParticles.push(particle);
    }

    // Fire smoky aura (organic flowing shape)
    const fireGlowGeo = new THREE.IcosahedronGeometry(0.55, 2);
    const fireGlow = new THREE.Mesh(
      fireGlowGeo,
      new THREE.MeshBasicMaterial({
        color: 0xff4400,
        transparent: true,
        opacity: 0.15,
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending,
        wireframe: false
      })
    );
    orbs.fire.add(fireGlow);

    // Fire inner aura layer
    const fireGlow2Geo = new THREE.IcosahedronGeometry(0.4, 2);
    const fireGlow2 = new THREE.Mesh(
      fireGlow2Geo,
      new THREE.MeshBasicMaterial({
        color: 0xff7700,
        transparent: true,
        opacity: 0.2,
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending,
        wireframe: false
      })
    );
    orbs.fire.add(fireGlow2);

    orbs.fire.userData = {
      core: fireCore,
      particles: fireParticles,
      glow: fireGlow,
      glow2: fireGlow2,
      glowGeo: fireGlowGeo,
      glow2Geo: fireGlow2Geo
    };
    orbs.fire.scale.set(2.5, 2.5, 2.5); // Make orb bigger
    scene.add(orbs.fire);

    // === ELECTRIC ORB ===
    orbs.electric = new THREE.Group();

    // Electric core (darker purple)
    const electricCore = new THREE.Mesh(
      new THREE.SphereGeometry(0.18, 32, 32),
      new THREE.MeshBasicMaterial({
        color: 0x8800cc,
        transparent: true,
        opacity: 1.0
      })
    );
    orbs.electric.add(electricCore);

    // Lightning arcs (lines) - darker purple
    const arcs = [];
    for (let i = 0; i < 6; i++) {
      const points = [];
      const segments = 8;
      for (let j = 0; j <= segments; j++) {
        const t = j / segments;
        const angle1 = Math.random() * Math.PI * 2;
        const angle2 = Math.random() * Math.PI * 2;
        const radius = 0.25 + Math.random() * 0.1;
        points.push(new THREE.Vector3(
          Math.cos(angle1) * radius * t,
          Math.sin(angle1) * radius * t,
          Math.sin(angle2) * radius * t
        ));
      }
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const material = new THREE.LineBasicMaterial({
        color: 0x6600aa,
        transparent: true,
        opacity: 0.8,
        linewidth: 2
      });
      const arc = new THREE.Line(geometry, material);
      orbs.electric.add(arc);
      arcs.push({ line: arc, points: points });
    }

    // Electric smoky aura (organic flowing shape)
    const electricGlowGeo = new THREE.IcosahedronGeometry(0.5, 2);
    const electricGlow = new THREE.Mesh(
      electricGlowGeo,
      new THREE.MeshBasicMaterial({
        color: 0x5500aa,
        transparent: true,
        opacity: 0.15,
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending,
        wireframe: false
      })
    );
    orbs.electric.add(electricGlow);

    // Electric inner aura layer
    const electricGlow2Geo = new THREE.IcosahedronGeometry(0.35, 2);
    const electricGlow2 = new THREE.Mesh(
      electricGlow2Geo,
      new THREE.MeshBasicMaterial({
        color: 0x7700cc,
        transparent: true,
        opacity: 0.18,
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending,
        wireframe: false
      })
    );
    orbs.electric.add(electricGlow2);

    orbs.electric.userData = {
      core: electricCore,
      arcs: arcs,
      glow: electricGlow,
      glow2: electricGlow2,
      glowGeo: electricGlowGeo,
      glow2Geo: electricGlow2Geo
    };
    orbs.electric.scale.set(2.5, 2.5, 2.5); // Make orb bigger
    scene.add(orbs.electric);

    // Add point lights with darker electric color (scaled intensity for bigger orbs)
    orbs.ice.add(new THREE.PointLight(0x00ccff, 3, 10));
    orbs.fire.add(new THREE.PointLight(0xff6600, 3.5, 10));
    orbs.electric.add(new THREE.PointLight(0x8800cc, 3.2, 10));

    console.log('[Game] Elemental orbs with effects created!');
  }

  // ============================================
  // LOAD ZOMBIE MODEL
  // ============================================
  function loadZombieModel() {
    console.log('[Game] Loading zombie model...');

    const loader = new GLTFLoader();
    loader.load(
      'assets/models/zombie.glb',
      (gltf) => {
        zombieModel = gltf.scene;
        zombieAnimations = gltf.animations; // Store animations

        // Debug: Check zombie model size
        const box = new THREE.Box3().setFromObject(zombieModel);
        const size = new THREE.Vector3();
        box.getSize(size);
        console.log('[Game] Zombie model loaded successfully!');
        console.log('[Game] Zombie model size:', size);
        console.log('[Game] Zombie bounding box:', box);
        console.log('[Game] Zombie animations:', zombieAnimations.length, 'found');

        // Mark template as ready for cloning
        zombieTemplateReady = true;
        console.log('[Game] Zombie template ready for spawning!');

        // Spawn first zombie immediately (as a clone, not the original!)
        spawnZombie(); // This will use the default parameter (useOriginal = false) to clone
        console.log('[Game] Initial zombie spawned');
      },
      (progress) => {
        console.log('[Game] Loading zombie:', (progress.loaded / progress.total * 100).toFixed(2) + '%');
      },
      (error) => {
        console.error('[Game] Error loading zombie model:', error);
      }
    );
  }

  // ============================================
  // SPAWN ZOMBIE
  // ============================================
  function spawnZombie(useOriginal = false) {
    if (!zombieModel) {
      console.error('[Game] Cannot spawn zombie - model not loaded');
      return;
    }

    // Use original model or clone it properly (SkeletonUtils for animated characters)
    const zombie = useOriginal ? zombieModel : SkeletonUtils.clone(zombieModel);
    console.log('[Game] Using', useOriginal ? 'ORIGINAL' : 'CLONED', 'zombie model');
    console.log('[Game] Zombie children count:', zombie.children.length);

    // ====================================================================
    // ZOMBIE SETUP - ADJUST THESE VALUES
    // ====================================================================
    const zombieScale = 12.0;        // ADJUST: Size of zombie (try: 8-12)
    const zombieSpawnZ = -90;        // ADJUST: How far away zombie spawns (3x original distance)
    const zombieSpawnRangeX = 80;     // ADJUST: Random left/right range (try: 2-6)

    const randomX = (Math.random() - 0.5) * zombieSpawnRangeX; // Random X position

    // Scale and rotate zombie
    zombie.scale.set(zombieScale, zombieScale, zombieScale);
    zombie.rotation.set(0, 0, -0.2); // Ensure perfectly upright

    // Temporarily position at origin to measure bounding box
    // zombie.position.set(0, 0, 0);

    // Calculate bounding box to find where feet are
    zombie.updateMatrixWorld(true);
    const bbox = new THREE.Box3().setFromObject(zombie);
    const minY = bbox.min.y+2.5; // Lowest point (feet)

    // Position zombie with feet on ground (Y=0)
    const groundOffset = -minY;
    zombie.position.set(randomX, groundOffset, zombieSpawnZ);

    console.log('[Game] Zombie scale:', zombieScale);
    console.log('[Game] Zombie spawn Z:', zombieSpawnZ);
    console.log('[Game] Ground offset:', groundOffset.toFixed(2));

    // Force all children to be visible and clone materials if needed
    zombie.traverse((child) => {
      child.visible = true;
      child.frustumCulled = false;

      if (child.isMesh || child.isSkinnedMesh) {
        console.log('[Game] Mesh found:', child.name, 'Type:', child.type, 'Material:', child.material ? 'YES' : 'NO');

        // Clone materials only if we cloned the model
        if (!useOriginal && child.material) {
          if (Array.isArray(child.material)) {
            child.material = child.material.map(mat => {
              const clonedMat = mat.clone();
              clonedMat.side = THREE.DoubleSide;

              // BRIGHTEN ZOMBIE: Make naturally brighter (no glow, just brighter colors)
              if (clonedMat.color) {
                clonedMat.color.multiplyScalar(1.2); // Much brighter base color
              }

              clonedMat.needsUpdate = true;
              return clonedMat;
            });
          } else {
            child.material = child.material.clone();
            child.material.side = THREE.DoubleSide;

            // BRIGHTEN ZOMBIE: Make naturally brighter (no glow, just brighter colors)
            if (child.material.color) {
              child.material.color.multiplyScalar(1.5); // Much brighter base color
            }

            child.material.needsUpdate = true;
          }
          console.log('[Game] Material cloned and brightened for:', child.name);
        }

        // Enable shadows for zombie meshes
        child.castShadow = true;
        child.receiveShadow = false; // Don't receive shadows on zombie itself
      }
    });

    // Create animation mixer for this zombie instance
    let mixer = null;
    if (zombieAnimations.length > 0) {
      mixer = new THREE.AnimationMixer(zombie);

      // Find the "walk" animation by name
  
      if(score<5){
        // Clone the animation and remove root motion (hip position changes)
        const walkAnimation = zombieAnimations.find(anim => anim.name.toLowerCase() === 'walk');
        const modifiedAnimation = walkAnimation.clone();

        // Remove position tracks from the root bone (mixamorigHips) to prevent snapping
        modifiedAnimation.tracks = modifiedAnimation.tracks.filter(track => {
          // Keep all tracks except hip position (which causes the snap-back)
          if (track.name.includes('mixamorigHips') && track.name.includes('.position')) {
            console.log('[Game] Removing root motion track:', track.name);
            return false; // Remove this track
          }
          return true; // Keep all other tracks
        });

        const action = mixer.clipAction(modifiedAnimation);
        action.setLoop(THREE.LoopRepeat); // Loop the animation
        action.timeScale = 1.0; // Normal animation speed to match movement
        action.play();
        console.log('[Game] Playing animation:', modifiedAnimation.name);
        console.log('[Game] Animation duration:', modifiedAnimation.duration.toFixed(2) + 's');
        console.log('[Game] Animation tracks after filtering:', modifiedAnimation.tracks.length);
      };
      if(score>=5){
        // Clone the animation and remove root motion (hip position changes)
        const runAnimation = zombieAnimations.find(anim => anim.name.toLowerCase() === 'run');
        const modifiedAnimation = runAnimation.clone();

        // Remove position tracks from the root bone (mixamorigHips) to prevent snapping
        modifiedAnimation.tracks = modifiedAnimation.tracks.filter(track => {
          // Keep all tracks except hip position (which causes the snap-back)
          if (track.name.includes('mixamorigHips') && track.name.includes('.position')) {
            console.log('[Game] Removing root motion track:', track.name);
            return false; // Remove this track
          }
          return true; // Keep all other tracks
        });

        const action = mixer.clipAction(modifiedAnimation);
        action.setLoop(THREE.LoopRepeat); // Loop the animation
        action.timeScale = 1.0; // Normal animation speed to match movement
        action.play();
        console.log('[Game] Playing animation:', modifiedAnimation.name);
        console.log('[Game] Animation duration:', modifiedAnimation.duration.toFixed(2) + 's');
        console.log('[Game] Animation tracks after filtering:', modifiedAnimation.tracks.length);
      };
      // if (walkAnimation && score<5) {
      //   // Clone the animation and remove root motion (hip position changes)
      //   const modifiedAnimation = walkAnimation.clone();

      //   // Remove position tracks from the root bone (mixamorigHips) to prevent snapping
      //   modifiedAnimation.tracks = modifiedAnimation.tracks.filter(track => {
      //     // Keep all tracks except hip position (which causes the snap-back)
      //     if (track.name.includes('mixamorigHips') && track.name.includes('.position')) {
      //       console.log('[Game] Removing root motion track:', track.name);
      //       return false; // Remove this track
      //     }
      //     return true; // Keep all other tracks
      //   });

      //   const action = mixer.clipAction(modifiedAnimation);
      //   action.setLoop(THREE.LoopRepeat); // Loop the animation
      //   action.timeScale = 1.0; // Normal animation speed to match movement
      //   action.play();
      //   console.log('[Game] Playing animation:', modifiedAnimation.name);
      //   console.log('[Game] Animation duration:', modifiedAnimation.duration.toFixed(2) + 's');
      //   console.log('[Game] Animation tracks after filtering:', modifiedAnimation.tracks.length);
      // } else {
      //   // Clone the animation and remove root motion (hip position changes)
      //   const modifiedAnimation = runAnimation.clone();

      //   // Remove position tracks from the root bone (mixamorigHips) to prevent snapping
      //   modifiedAnimation.tracks = modifiedAnimation.tracks.filter(track => {
      //     // Keep all tracks except hip position (which causes the snap-back)
      //     if (track.name.includes('mixamorigHips') && track.name.includes('.position')) {
      //       console.log('[Game] Removing root motion track:', track.name);
      //       return false; // Remove this track
      //     }
      //     return true; // Keep all other tracks
      //   });

      //   const action = mixer.clipAction(modifiedAnimation);
      //   action.setLoop(THREE.LoopRepeat); // Loop the animation
      //   action.timeScale = 1.0; // Normal animation speed to match movement
      //   action.play();
      //   console.log('[Game] Playing animation:', modifiedAnimation.name);
      //   console.log('[Game] Animation duration:', modifiedAnimation.duration.toFixed(2) + 's');
      //   console.log('[Game] Animation tracks after filtering:', modifiedAnimation.tracks.length);
      //   // // Fallback to first animation if "walk" not found
      //   // const action = mixer.clipAction(zombieAnimations[0]);
      //   // action.setLoop(THREE.LoopRepeat);
      //   // action.timeScale = 1.0;
      //   // action.play();
      //   // console.warn('[Game] "walk" animation not found, using:', zombieAnimations[0].name);
      // }
    } else {
      console.warn('[Game] No animations found for zombie');
    }

    scene.add(zombie);

    const zombieData = {
      mesh: zombie,
      mixer: mixer, // Store mixer to update each frame
      health: 100,
      speed: ZOMBIE_SPEED,
      isDying: false,
      deathTimer: 0
    };
    if(score>=5)zombieData.speed*=5; // Increase speed after 5 points
    zombies.push(zombieData);

    console.log('🧟 [Game] ===== ZOMBIE SPAWNED =====');
    console.log('[Game] Position:', zombie.position);
    console.log('[Game] Scale:', zombieScale);
    console.log('[Game] Visible:', zombie.visible);
    console.log('[Game] In scene:', scene.children.includes(zombie));
    console.log('[Game] Total zombies:', zombies.length);

    // Update zombie count display
    updateScore(0);
  }

  // ============================================
  // HANDOFF FROM CSS TO THREE.JS
  // ============================================
  function handoffOrbs() {
    console.log('[Game] Performing 2D→3D handoff...');

    // Hide CSS orbs with smooth fade
    const cssOrbContainer = document.querySelector('.orb-container');
    if (cssOrbContainer) {
      cssOrbContainer.style.transition = 'opacity 0.5s ease-out';
      cssOrbContainer.style.opacity = '0';
      cssOrbsHidden = true;
    }

    // Animate 3D orbs coming to life with vanilla JS
    const initialScale = 0.01;
    orbs.ice.scale.set(initialScale, initialScale, initialScale);
    orbs.fire.scale.set(initialScale, initialScale, initialScale);
    orbs.electric.scale.set(initialScale, initialScale, initialScale);

    // Smooth scale animation using requestAnimationFrame
    animateOrbScale(orbs.ice, 0);
    setTimeout(() => animateOrbScale(orbs.fire, 0), 100);
    setTimeout(() => animateOrbScale(orbs.electric, 0), 200);

    console.log('[Game] Handoff complete!');
  }

  // Vanilla JS scale animation (bounce effect)
  function animateOrbScale(orb, startTime) {
    const duration = 600; // ms

    function animate(currentTime) {
      if (!startTime) startTime = currentTime;
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Easing function: back.out effect
      const easeProgress = progress * (2 - progress);
      const scale = 0.01 + (easeProgress * 0.99);

      orb.scale.set(scale, scale, scale);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    }

    requestAnimationFrame(animate);
  }

  // ============================================
  // ANIMATION LOOP
  // ============================================
  function animate() {
    animationId = requestAnimationFrame(animate);

    // Get delta time for smooth animations
    let delta = clock.getDelta();

    // Apply time scale for slow-motion effect
    delta *= timeScale;

    // ============================================
    // CAMERA SHAKE EFFECT
    // ============================================
    if (cameraShake.active) {
      if (cameraShake.duration > 0) {
        // Random shake offset
        const shakeX = (Math.random() - 0.5) * cameraShake.intensity;
        const shakeY = (Math.random() - 0.5) * cameraShake.intensity;
        const shakeZ = (Math.random() - 0.5) * cameraShake.intensity * 0.5;

        camera.position.x = cameraOriginalPos.x + shakeX;
        camera.position.y = cameraOriginalPos.y + shakeY;
        camera.position.z = cameraOriginalPos.z + shakeZ;

        cameraShake.duration -= delta;
      } else {
        // Shake finished, reset camera
        camera.position.copy(cameraOriginalPos);
        cameraShake.active = false;
      }
    }

    // Convert mouse position to 3D world coordinates using raycasting
    // Vertical plane at Z=0 means orbs stick to screen space
    if (raycaster && targetPlane && camera) {
      // Cast ray from camera through mouse position
      raycaster.setFromCamera(new THREE.Vector2(mouseX, mouseY), camera);

      // Find intersection with vertical target plane
      const intersects = raycaster.intersectObject(targetPlane);

      if (intersects.length > 0) {
        // Get intersection point on the vertical plane
        // This gives us screen-space coordinates in 3D
        const intersectPoint = intersects[0].point;

        // Smooth following for all axes
        targetX += (intersectPoint.x - targetX) * 0.1; // Horizontal (left/right)
        targetY += (intersectPoint.y - targetY) * 0.1; // Vertical (up/down)
        targetZ += (intersectPoint.z - targetZ) * 0.1; // Depth (fixed at plane)
      }
    }

    // Update orbit angle
    orbitAngle += orbitSpeed * 0.01;

    // Animation time
    const time = Date.now() * 0.001;

    // ============================================
    // THROWN ORB ANIMATIONS
    // ============================================
    for (let i = thrownOrbs.length - 1; i >= 0; i--) {
      const thrown = thrownOrbs[i];
      const throwSpeed = 0.05; // Speed of throw animation

      // Throwing phase
      if (thrown.returnStart === null) {
        thrown.progress += throwSpeed;

        // Ease-in-out curve for smooth throw
        const t = Math.min(thrown.progress, 1);
        const easeT = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

        // Lerp position from start to target with HIGH arc
        // Zombie is 20 units tall when scaled 10x, so arc must be at least 15-20 units!
        const arcHeight = 15.0; // High enough to hit zombie head at 19-20 units

        thrown.orb.position.x = thrown.startPos.x + (thrown.targetPos.x - thrown.startPos.x) * easeT;
        thrown.orb.position.y = thrown.startPos.y + (thrown.targetPos.y - thrown.startPos.y) * easeT + Math.sin(easeT * Math.PI) * arcHeight;
        thrown.orb.position.z = thrown.startPos.z + (thrown.targetPos.z - thrown.startPos.z) * easeT;

        // Create trail particles behind orb
        if (Math.random() < 0.3) { // 30% chance each frame
          const colors = {
            ice: 0x00ccff,
            fire: 0xff6600,
            electric: 0x8800cc
          };

          const trailGeometry = new THREE.SphereGeometry(0.15, 8, 8);
          const trailMaterial = new THREE.MeshBasicMaterial({
            color: colors[thrown.type] || 0xffffff,
            transparent: true,
            opacity: 0.6
          });
          const trail = new THREE.Mesh(trailGeometry, trailMaterial);
          trail.position.copy(thrown.orb.position);
          scene.add(trail);

          orbTrails.push({
            mesh: trail,
            life: 0.5,
            geometry: trailGeometry,
            material: trailMaterial
          });
        }

        // ============================================
        // COLLISION DETECTION WITH ZOMBIES
        // ============================================
        // Simple, efficient sphere-to-box collision (industry standard)
        const orbPos = thrown.orb.position;
        const orbRadius = 6.0; // Orb collision radius

        // Check if orb has already registered a hit
        if (!thrown.hasHit) {
          for (let j = zombies.length - 1; j >= 0; j--) {
            const zombieData = zombies[j];
            const zombie = zombieData.mesh;

            // Skip if zombie is already dying
            if (zombieData.isDying) continue;

            // Update zombie matrices for accurate collision
            zombie.updateMatrixWorld(true);

            // Get zombie's full bounding box (THREE.Box3 handles SkinnedMesh correctly!)
            const bbox = new THREE.Box3().setFromObject(zombie);

            // Find closest point on box to orb (sphere-to-box collision)
            const closestPoint = bbox.clampPoint(orbPos, new THREE.Vector3());
            const distance = orbPos.distanceTo(closestPoint);

            // Check collision
            const isHit = distance <= orbRadius;

            if (isHit) {
              console.log('🎯 [Game] HIT! Zombie hit by', thrown.type, 'orb at distance:', distance.toFixed(2));

              // Mark this throw as having hit something
              thrown.hasHit = true;

              // Create hit particle explosion at orb position
              const hitPoint = orbPos.clone();
              createHitParticles(hitPoint, thrown.type);

              // Screen flash effect
              createScreenFlash();

              // Make zombie glow on hit
              createZombieHitGlow(zombie);

              // Reduce zombie health (100 damage = 1-hit kill)
              zombieData.health -= 100;
              console.log('[Game] Zombie health:', zombieData.health);

              // Visual feedback - flash the score
              const scoreElement = document.getElementById('game-score');
              if (scoreElement) {
                scoreElement.style.textShadow = '0 0 40px rgba(110, 231, 183, 1.0), 0 0 80px rgba(110, 231, 183, 0.8)';
                setTimeout(() => {
                  scoreElement.style.textShadow = '';
                }, 200);
              }

              // Check if zombie is dead
              if (zombieData.health <= 0) {
                console.log('💀 [Game] Zombie killed!');

                // Award points for kill
                updateScore(+2);

                // Get zombie center for popup
                zombie.updateMatrixWorld(true);
                const zombieBbox = new THREE.Box3().setFromObject(zombie);
                const zombieCenter = new THREE.Vector3();
                zombieBbox.getCenter(zombieCenter);

                // A-class game feel effects!
                startCameraShake(0.3, 0.2); // Subtle shake
                triggerSlowMotion(150); // 150ms slow-mo
                createFloatingScore(zombieCenter, 2); // Floating +2

                // Start death animation
                zombieData.isDying = true;
                zombieData.speed = 0; // Stop moving
                zombieData.deathTimer = 0;

                // Find and play death animation
                if (zombieData.mixer && zombieAnimations.length > 0) {
                  const deathAnim = zombieAnimations.find(anim =>
                    anim.name.toLowerCase().includes('death') ||
                    anim.name.toLowerCase().includes('die') ||
                    anim.name.toLowerCase().includes('dying')
                  );

                  if (deathAnim) {
                    // Stop all current animations
                    zombieData.mixer.stopAllAction();

                    // Play death animation once
                    const deathAction = zombieData.mixer.clipAction(deathAnim);
                    deathAction.setLoop(THREE.LoopOnce);
                    deathAction.clampWhenFinished = true;
                    deathAction.reset();
                    deathAction.play();

                    console.log('[Game] Playing death animation:', deathAnim.name, 'Duration:', deathAnim.duration.toFixed(2) + 's');
                  } else {
                    console.warn('[Game] No death animation found');
                  }
                }
              } else {
                // Hit but not dead - zombie flinches
                console.log('[Game] Zombie damaged! Health remaining:', zombieData.health);
              }

              // Start orb return immediately
              thrown.returnStart = thrown.orb.position.clone();
              thrown.progress = 0;

              // Break out of zombie loop (one hit per throw)
              break;
            }
          }
        }

        // Check if throw reached target (no hit)
        if (thrown.progress >= 1 && thrown.returnStart === null) {
          console.log('[Game]', thrown.type, 'orb reached target, starting return');
          thrown.returnStart = thrown.orb.position.clone();
          thrown.progress = 0;
        }
      }
      // Return phase
      else {
        thrown.progress += throwSpeed * 1.5; // Return faster

        const t = Math.min(thrown.progress, 1);
        const easeT = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

        // Return to orbit around cursor
        const returnTarget = new THREE.Vector3(targetX, targetY, targetZ);
        thrown.orb.position.x = thrown.returnStart.x + (returnTarget.x - thrown.returnStart.x) * easeT;
        thrown.orb.position.y = thrown.returnStart.y + (returnTarget.y - thrown.returnStart.y) * easeT;
        thrown.orb.position.z = thrown.returnStart.z + (returnTarget.z - thrown.returnStart.z) * easeT;

        // Check if return completed
        if (thrown.progress >= 1) {
          console.log('[Game]', thrown.type, 'orb returned to orbit');
          thrownOrbs.splice(i, 1); // Remove from thrown list
        }
      }
    }

    // Position orbs in orbit around mouse cursor, floating in 3D (only if not thrown)
    // ICE ORB - with rotating crystals
    const iceThrown = thrownOrbs.some(t => t.orb === orbs.ice);
    if (orbs.ice && !iceThrown) {
      const angle1 = orbitAngle;
      // Orbit in a tilted 3D circle (X-Y plane with some Z depth)
      orbs.ice.position.x = targetX + Math.cos(angle1) * orbitRadius * 2;
      orbs.ice.position.y = targetY + Math.sin(angle1) * orbitRadius * 2 + Math.sin(time * 2) * 0.3; // Vertical orbit + bobbing
      orbs.ice.position.z = targetZ + Math.cos(angle1 * 0.5) * orbitRadius * 0.5; // Slight depth variation

      // Rotate ice crystals
      if (orbs.ice.userData.crystals) {
        orbs.ice.userData.crystals.forEach((crystal, i) => {
          crystal.rotation.x += 0.02;
          crystal.rotation.y += 0.03;
          // Slight bobbing animation
          const baseY = Math.sin((i / 8) * Math.PI * 2) * 0.35;
          crystal.position.y = baseY + Math.sin(time * 2 + i) * 0.05;
        });
      }
      // Morphing amoeba-like glow
      if (orbs.ice.userData.glow) {
        orbs.ice.userData.glow.rotation.x += 0.005;
        orbs.ice.userData.glow.rotation.y += 0.008;
        orbs.ice.userData.glow.scale.setScalar(1 + Math.sin(time * 2) * 0.1);
      }
      if (orbs.ice.userData.glow2) {
        orbs.ice.userData.glow2.rotation.x -= 0.006;
        orbs.ice.userData.glow2.rotation.z += 0.007;
        orbs.ice.userData.glow2.scale.setScalar(1 + Math.sin(time * 2.5) * 0.08);
      }
    }

    // FIRE ORB - with swirling particles
    const fireThrown = thrownOrbs.some(t => t.orb === orbs.fire);
    if (orbs.fire && !fireThrown) {
      const angle2 = orbitAngle + (Math.PI * 2 / 3); // 120 degrees offset
      // Orbit in a tilted 3D circle
      orbs.fire.position.x = targetX + Math.cos(angle2) * orbitRadius * 2;
      orbs.fire.position.y = targetY + Math.sin(angle2) * orbitRadius * 2 + Math.sin(time * 2.5) * 0.3; // Vertical orbit + bobbing
      orbs.fire.position.z = targetZ + Math.cos(angle2 * 0.5) * orbitRadius * 0.5; // Slight depth variation

      // Animate fire particles in swirling motion
      if (orbs.fire.userData.particles) {
        orbs.fire.userData.particles.forEach((particle, i) => {
          particle.userData.angle += particle.userData.speed * 0.02;
          const swirl = particle.userData.angle;
          const r = particle.userData.radius;
          particle.position.x = Math.cos(swirl) * r;
          particle.position.y = Math.sin(swirl) * r;
          particle.position.z = Math.sin(swirl * 2) * 0.3;
          // Flicker opacity
          particle.material.opacity = 0.6 + Math.sin(time * 5 + i) * 0.3;
        });
      }
      // Morphing amoeba-like glow with rotation
      if (orbs.fire.userData.glow) {
        orbs.fire.userData.glow.rotation.x += 0.007;
        orbs.fire.userData.glow.rotation.z += 0.009;
        orbs.fire.userData.glow.scale.setScalar(1 + Math.sin(time * 3) * 0.15);
        orbs.fire.userData.glow.material.opacity = 0.25 + Math.sin(time * 4) * 0.1;
      }
      if (orbs.fire.userData.glow2) {
        orbs.fire.userData.glow2.rotation.y += 0.008;
        orbs.fire.userData.glow2.rotation.z -= 0.006;
        orbs.fire.userData.glow2.scale.setScalar(1 + Math.sin(time * 3.5) * 0.12);
      }
    }

    // ELECTRIC ORB - with crackling lightning arcs
    const electricThrown = thrownOrbs.some(t => t.orb === orbs.electric);
    if (orbs.electric && !electricThrown) {
      const angle3 = orbitAngle + (Math.PI * 4 / 3); // 240 degrees offset
      // Orbit in a tilted 3D circle
      orbs.electric.position.x = targetX + Math.cos(angle3) * orbitRadius * 2;
      orbs.electric.position.y = targetY + Math.sin(angle3) * orbitRadius * 2 + Math.sin(time * 3) * 0.3; // Vertical orbit + bobbing
      orbs.electric.position.z = targetZ + Math.cos(angle3 * 0.5) * orbitRadius * 0.5; // Slight depth variation

      // Regenerate lightning arcs periodically
      if (orbs.electric.userData.arcs && Math.random() < 0.1) {
        const arcData = orbs.electric.userData.arcs[Math.floor(Math.random() * orbs.electric.userData.arcs.length)];
        const newPoints = [];
        const segments = 8;
        for (let j = 0; j <= segments; j++) {
          const t = j / segments;
          const angle1 = Math.random() * Math.PI * 2;
          const angle2 = Math.random() * Math.PI * 2;
          const radius = 0.25 + Math.random() * 0.1;
          newPoints.push(new THREE.Vector3(
            Math.cos(angle1) * radius * t,
            Math.sin(angle1) * radius * t,
            Math.sin(angle2) * radius * t
          ));
        }
        arcData.line.geometry.setFromPoints(newPoints);
        arcData.line.material.opacity = 0.5 + Math.random() * 0.5;
      }
      // Morphing amoeba-like glow with rotation and crackle
      if (orbs.electric.userData.glow) {
        orbs.electric.userData.glow.rotation.y += 0.006;
        orbs.electric.userData.glow.rotation.z += 0.01;
        orbs.electric.userData.glow.scale.setScalar(1 + Math.sin(time * 2.5) * 0.12);
        orbs.electric.userData.glow.material.opacity = 0.2 + Math.random() * 0.15;
      }
      if (orbs.electric.userData.glow2) {
        orbs.electric.userData.glow2.rotation.x += 0.007;
        orbs.electric.userData.glow2.rotation.y -= 0.009;
        orbs.electric.userData.glow2.scale.setScalar(1 + Math.sin(time * 3) * 0.1);
      }
    }

    // ============================================
    // UPDATE PARTICLES
    // ============================================
    for (let i = particles.length - 1; i >= 0; i--) {
      const particle = particles[i];

      // Update position
      particle.mesh.position.add(particle.velocity);

      // Apply gravity
      particle.velocity.y -= 0.02;

      // Fade out
      particle.life -= delta * 2; // Life decreases over time
      particle.material.opacity = Math.max(0, particle.life);

      // Shrink over time
      const scale = particle.life;
      particle.mesh.scale.set(scale, scale, scale);

      // Remove dead particles
      if (particle.life <= 0) {
        scene.remove(particle.mesh);
        particle.geometry.dispose();
        particle.material.dispose();
        particles.splice(i, 1);
      }
    }

    // ============================================
    // UPDATE ORB TRAILS
    // ============================================
    for (let i = orbTrails.length - 1; i >= 0; i--) {
      const trail = orbTrails[i];

      // Fade out quickly
      trail.life -= delta * 3;
      trail.material.opacity = Math.max(0, trail.life);

      // Shrink
      const scale = trail.life * 2;
      trail.mesh.scale.set(scale, scale, scale);

      // Remove dead trails
      if (trail.life <= 0) {
        scene.remove(trail.mesh);
        trail.geometry.dispose();
        trail.material.dispose();
        orbTrails.splice(i, 1);
      }
    }

    // ============================================
    // ZOMBIE MOVEMENT & SPAWNING
    // ============================================
    // Update spawn timer (delta is in seconds, convert to ms)
    zombieSpawnTimer += delta * 1000;
    if (zombieSpawnTimer >= ZOMBIE_SPAWN_INTERVAL && zombieTemplateReady) {
      
      spawnZombie(); // Spawn cloned zombie (always uses clone, never original)
      if(score>=15){
        for(let i=0;i<score/5;i++)spawnZombie(); 
      }
      zombieSpawnTimer = 0;
      console.log('[Game] Auto-spawned zombie. Total:', zombies.length);
    }

    // Move zombies towards camera and cleanup
    for (let i = zombies.length - 1; i >= 0; i--) {
      const zombieData = zombies[i];
      const zombie = zombieData.mesh;

      // Update animation mixer with actual delta time (smooth animation!)
      if (zombieData.mixer) {
        // Clamp delta to avoid huge jumps (e.g., when tab is inactive)
        const clampedDelta = Math.min(delta, 0.1);
        zombieData.mixer.update(clampedDelta);
      }

      // Handle dying zombie
      if (zombieData.isDying) {
        zombieData.deathTimer += delta;

        // Remove zombie after death animation (2 seconds)
        if (zombieData.deathTimer > 2.0) {
          console.log('[Game] Removing dead zombie');

          // Remove from scene
          scene.remove(zombie);

          // Dispose geometry and materials
          zombie.traverse(object => {
            if (object.geometry) object.geometry.dispose();
            if (object.material) {
              if (Array.isArray(object.material)) {
                object.material.forEach(mat => mat.dispose());
              } else {
                object.material.dispose();
              }
            }
          });

          zombies.splice(i, 1);

          // Update zombie count
          updateScore(0);
        }
        continue; // Skip movement for dying zombies
      }

      // Move towards camera (positive Z direction)
      const oldZ = zombie.position.z;
      zombie.position.z += zombieData.speed;

      // Log zombie position every 60 frames (about once per second)
      if (!zombieData.logCounter) zombieData.logCounter = 0;
      zombieData.logCounter++;
      if (zombieData.logCounter % 60 === 0) {
        console.log(`🧟 Zombie #${i} at Z=${zombie.position.z.toFixed(2)} (moving ${zombieData.speed.toFixed(2)}/frame)`);
      }

      // Cleanup if zombie passed the camera
      if (zombie.position.z > ZOMBIE_CLEANUP_DISTANCE) {
        console.log('❌ [Game] Zombie escaped! Crossed border at Z=' + zombie.position.z.toFixed(2));

        // PENALTY: Zombie escaped! -1 point
        updateScore(-1);

        scene.remove(zombie);

        // Dispose geometry and materials
        zombie.traverse(object => {
          if (object.geometry) object.geometry.dispose();
          if (object.material) {
            if (Array.isArray(object.material)) {
              object.material.forEach(mat => mat.dispose());
            } else {
              object.material.dispose();
            }
          }
        });

        zombies.splice(i, 1);
      }
    }

    renderer.render(scene, camera);
  }

  // ============================================
  // WINDOW RESIZE HANDLER
  // ============================================
  function onWindowResize() {
    if (!camera || !renderer) return;

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }

  // ============================================
  // CLEANUP - Called when exiting game mode
  // ============================================
  function cleanup() {
    console.log('[Game] Cleaning up...');

    // Stop animation
    if (animationId) {
      cancelAnimationFrame(animationId);
      animationId = null;
    }

    // Remove scoreboard
    const scoreboard = document.getElementById('game-scoreboard');
    if (scoreboard) {
      scoreboard.remove();
      console.log('[Game] Scoreboard removed');
    }

    // Remove background effects
    const fogLayer2 = document.querySelector('.game-fog-layer-2');
    if (fogLayer2) {
      fogLayer2.remove();
    }
    const ambientGlow = document.querySelector('.game-ambient-glow');
    if (ambientGlow) {
      ambientGlow.remove();
    }

    // Show CSS orbs again
    const cssOrbContainer = document.querySelector('.orb-container');
    if (cssOrbContainer && cssOrbsHidden) {
      cssOrbContainer.style.opacity = '1';
      cssOrbsHidden = false;
    }

    // Remove renderer
    if (renderer && renderer.domElement) {
      renderer.domElement.remove();
    }

    // Clear three.js objects
    if (scene) {
      scene.traverse(object => {
        if (object.geometry) object.geometry.dispose();
        if (object.material) {
          if (Array.isArray(object.material)) {
            object.material.forEach(mat => mat.dispose());
          } else {
            object.material.dispose();
          }
        }
      });
    }

    scene = null;
    camera = null;
    renderer = null;
    orbs = { ice: null, fire: null, electric: null };
    zombies = [];
    zombieSpawnTimer = 0;
    raycaster = null;
    targetPlane = null;
    targetX = 0;
    targetY = 8;
    targetZ = 0;
    thrownOrbs = [];
    gameInitialized = false;

    window.removeEventListener('resize', onWindowResize);
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('touchmove', onTouchMove);
    window.removeEventListener('click', handleCanvasClick);
    window.removeEventListener('touchstart', handleTouchStart);

    console.log('[Game] Cleanup complete');
  }

  // ============================================
  // EVENT LISTENERS
  // ============================================

  // Listen for game start
  window.addEventListener('startGame', () => {
    console.log('[Game] Game start event received');
    // Wait for game container to fade in
    setTimeout(initGame, 1800);
  });

  // Listen for game exit (close button)
  document.addEventListener('click', (e) => {
    if (e.target.closest('.game-close-btn')) {
      cleanup();
    }
  });

  // Expose for debugging
  window.ZombieGame = {
    init: initGame,
    cleanup: cleanup,
    getScene: () => scene,
    getOrbs: () => orbs
  };

})();
