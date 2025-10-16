# Claude's Zombie Game - Complete Technical Documentation

## Game Overview

A Three.js-based zombie killer game where players throw elemental orbs (ice, fire, electric) at approaching zombies. Features particle effects, camera shake, slow-motion on kills, and animated 3D models.

---

## Current Game State

### Scene Setup
- **Camera Position**: (0, 15, 20) - Top-down angled view
- **Camera LookAt**: (0, 0, -45) - Looking at extended playing field
- **Ground Size**: 100×250 units (extended to 3x original)
- **Playing Field**: 90 units deep (zombies spawn at Z=-90, cleanup at Z=28)

### Zombie Configuration
- **Scale**: 10.0x (CRITICAL - affects all dimensions)
- **Spawn Distance**: Z = -90 units
- **Movement Speed**: 0.04 units/frame
- **Original Model Size**: ~2 units tall (unscaled)
- **Scaled Model Size**: **~20 units tall** (this is the problem!)

### Orb System
- **Orb Types**: Ice, Fire, Electric
- **Orb Scale**: 2.5x
- **Orbit Behavior**: Orbs orbit around cursor in 3D space
- **Throw Mechanism**: Click to throw nearest orb

### Current Orb Trajectory
```javascript
// Line 1117 in game.js
thrown.orb.position.y = thrown.startPos.y +
                        (thrown.targetPos.y - thrown.startPos.y) * easeT +
                        Math.sin(easeT * Math.PI) * 1.5;
```
- **Arc Height**: 1.5 units
- **Problem**: Zombie head is at ~20 units, arc only reaches 1.5 units!

---

## The REAL Problem - Root Cause Analysis

### Problem Statement
**"Orb won't hit above the knee line"**

### Root Cause
The issue is NOT the collision detection - it's the **orb trajectory**!

1. **Zombie Scaling Math**:
   - Original zombie height: ~2.0 units
   - Scaled 10x: **20.0 units tall**
   - Knee height (~40% of body): ~8 units
   - Waist height (~50% of body): ~10 units
   - Chest height (~70% of body): ~14 units
   - Head height (~95% of body): ~19 units

2. **Orb Trajectory Math**:
   - Orb starts at cursor Y position: ~8-15 units (depending on where cursor is)
   - Arc peak: startY + 1.5 units
   - If clicking on ground (Y=0), orb path: 0 → 1.5 → 0
   - **The orb NEVER reaches above 10 units!**

3. **Why "Above Knee Line" Fails**:
   - Knee: ~8 units → Orb can reach (barely)
   - Waist: ~10 units → Orb at maximum arc height
   - Chest: ~14 units → **Orb never reaches here**
   - Head: ~19 units → **Orb never reaches here**

### Evidence Supporting This Theory
1. Previous attempts to "fix collision" all failed
2. Collision detection code iterations show hits work when they DO occur
3. Green wireframe showed correct hit zones
4. User specifically says "above knee line" - suggests height-based issue

---

## Collision Detection History - What We Tried

### Attempt 1: Bounding Box + Padding
```javascript
const padding = 12.0;
const isHit = orbPos.x >= bbox.min.x - padding && ...
```
**Result**: Only hit lower body
**Why It Failed**: Not a collision problem - trajectory problem!

### Attempt 2: Sphere-to-Mesh Bounding Spheres
```javascript
const boundingSphere = child.geometry.boundingSphere.clone();
boundingSphere.applyMatrix4(child.matrixWorld);
```
**Result**: Only hit lower body
**Why It Failed**: Bounding spheres were correct, but orbs never reached upper body!

### Attempt 3: Manual Vertex Iteration (Current)
```javascript
for (let i = 0; i < positions.count; i++) {
  vertex.fromBufferAttribute(positions, i);
  vertex.applyMatrix4(child.matrixWorld);
  tempBox.expandByPoint(vertex);
}
```
**Result**: Still only hits lower body
**Why It Failed**: Same trajectory issue!
**Additional Problem**: This is EXTREMELY expensive (iterating 1000s of vertices per frame per orb)

---

## The Correct Solution

### THREE.js Best Practices for SkinnedMesh Collision

From Three.js documentation and game development best practices:

1. **THREE.Box3().setFromObject()** IS the correct approach for SkinnedMesh
   - It properly handles skeletal animation
   - Accounts for bone transformations
   - Updated per-frame automatically

2. **For animated characters**, use simple collision primitives:
   - Full body box: `THREE.Box3().setFromObject(zombie)`
   - Sphere-to-box distance check: Most efficient
   - Don't iterate vertices - way too expensive!

3. **Raycaster** is another option for precise collision:
   - Cast ray from orb position in direction of travel
   - Check intersection with zombie meshes
   - More accurate but more expensive

---

## Proposed Solution - Complete Fix

### Fix 1: Dynamic Arc Height Based on Target
```javascript
// Calculate target height including zombie height
const targetHeight = Math.max(thrown.targetPos.y, 15); // At least 15 units high
const arcHeight = Math.min(10, targetHeight * 0.5); // Scale arc to target

// Updated trajectory
thrown.orb.position.y = thrown.startPos.y +
                        (targetHeight - thrown.startPos.y) * easeT +
                        Math.sin(easeT * Math.PI) * arcHeight;
```

### Fix 2: Proper Collision Detection
```javascript
// Simple, efficient, CORRECT collision for SkinnedMesh
const orbPos = thrown.orb.position;
const orbRadius = 6.0; // Collision radius

// Get zombie's FULL bounding box (handles animation automatically)
zombie.updateMatrixWorld(true);
const bbox = new THREE.Box3().setFromObject(zombie);

// Sphere-to-box collision (industry standard)
const closestPoint = bbox.clampPoint(orbPos, new THREE.Vector3());
const distance = orbPos.distanceTo(closestPoint);

if (distance <= orbRadius) {
  // HIT!
}
```

### Fix 3: Optional Raycaster for Precise Hits
```javascript
// For pixel-perfect collision
const raycaster = new THREE.Raycaster();
const orbDirection = new THREE.Vector3()
  .subVectors(thrown.targetPos, thrown.startPos)
  .normalize();

raycaster.set(orbPos, orbDirection);
const intersects = raycaster.intersectObject(zombie, true);

if (intersects.length > 0 && intersects[0].distance < orbRadius) {
  // HIT!
}
```

---

## Implementation Plan

### Phase 1: Fix Orb Trajectory (CRITICAL)
1. **Increase arc height** to 10-15 units
2. **Make arc dynamic** based on cursor position
3. **Ensure orbs can reach zombie head** (20 units)

### Phase 2: Simplify Collision Detection
1. **Remove manual vertex iteration** (too expensive)
2. **Use THREE.Box3().setFromObject()** (correct for SkinnedMesh)
3. **Implement sphere-to-box distance** check
4. **Test with different zombie heights** and positions

### Phase 3: Add Debug Visualization
1. **Show orb trajectory** path as line
2. **Show collision sphere** around orb
3. **Show zombie bounding box** in real-time
4. **Log collision attempts** with distances

### Phase 4: Performance Optimization
1. **Skip collision** checks when orb is far from any zombie
2. **Use squared distances** (avoid sqrt until needed)
3. **Cache bounding boxes** for 2-3 frames
4. **Remove all console.log** in production

---

## Known Issues

### Issue 1: SkinnedMesh Bounding Box Updates
**Problem**: SkinnedMesh bounding boxes need skeleton updates
**Solution**: `zombie.updateMatrixWorld(true)` before `Box3.setFromObject()`
**Status**: Already implemented

### Issue 2: Orb Speed vs Zombie Animation
**Problem**: Orb might pass through zombie between frames
**Solution**: Increase collision radius or reduce orb speed
**Status**: Need to test

### Issue 3: Multiple Zombies Performance
**Problem**: Checking all zombies every frame is expensive
**Solution**: Spatial partitioning or early distance checks
**Status**: Not implemented (works fine for now)

---

## Three.js Collision Detection Reference

### Recommended Approaches (Ranked)

1. **Sphere-to-Box** (Best for this game)
   - Fast: O(1) per zombie
   - Accurate enough for gameplay
   - Handles SkinnedMesh correctly
   ```javascript
   const bbox = new THREE.Box3().setFromObject(zombie);
   const closestPoint = bbox.clampPoint(orbPosition, new THREE.Vector3());
   const distance = orbPosition.distanceTo(closestPoint);
   if (distance <= orbRadius) { /* HIT */ }
   ```

2. **Raycaster** (Most accurate)
   - Slower: O(triangles) per zombie
   - Pixel-perfect collision
   - Use for headshot detection or precision games
   ```javascript
   const raycaster = new THREE.Raycaster(orbPos, direction);
   const hits = raycaster.intersectObject(zombie, true);
   ```

3. **Sphere-to-Sphere** (Fastest, least accurate)
   - Very fast: O(1) per zombie
   - Only good for spherical objects
   - Not suitable for humanoid shapes

4. **Vertex Iteration** (NEVER use in production)
   - Extremely slow: O(vertices) per zombie per frame
   - Causes performance issues
   - Wrong results for SkinnedMesh (bind pose only)

---

## Game Configuration Reference

### Tunable Parameters

```javascript
// Zombie
const ZOMBIE_SCALE = 10.0;           // Size multiplier
const ZOMBIE_SPEED = 0.04;           // Units per frame
const ZOMBIE_SPAWN_DISTANCE = -90;   // How far away they spawn
const ZOMBIE_SPAWN_INTERVAL = 3000;  // Milliseconds between spawns

// Orbs
const ORB_COLLISION_RADIUS = 6.0;    // Collision size
const ORB_THROW_SPEED = 0.05;        // Animation speed
const ORB_ARC_HEIGHT = 1.5;          // Current (TOO LOW!)
const ORB_ARC_HEIGHT_NEW = 12.0;     // Proposed fix

// Camera
const CAMERA_POSITION = [0, 15, 20]; // X, Y, Z
const CAMERA_LOOKAT = [0, 0, -45];   // X, Y, Z

// Effects
const PARTICLE_COUNT = 20;           // Hit explosion particles
const CAMERA_SHAKE_INTENSITY = 0.3;  // Shake amount
const SLOW_MOTION_DURATION = 150;    // Milliseconds
const SLOW_MOTION_SCALE = 0.3;       // 30% speed
```

---

## Testing Checklist

### Collision Testing
- [ ] Orb hits zombie head (19-20 units high)
- [ ] Orb hits zombie chest (14-16 units high)
- [ ] Orb hits zombie waist (10-12 units high)
- [ ] Orb hits zombie legs (0-8 units high)
- [ ] Orb misses when thrown to side
- [ ] Orb misses when thrown too far
- [ ] Multiple orbs can hit same zombie
- [ ] Collision works during zombie walk animation

### Performance Testing
- [ ] 60 FPS with 10 zombies on screen
- [ ] 60 FPS with 20+ particles active
- [ ] No frame drops during slow-motion
- [ ] Memory doesn't leak over time
- [ ] Works on mobile devices

### Visual Testing
- [ ] Particle explosions appear at hit point
- [ ] Screen flash is visible but not blinding
- [ ] Zombie glow effect is clear
- [ ] Floating score appears correctly
- [ ] Camera shake feels satisfying
- [ ] Slow-motion is noticeable

---

## Conclusion

The collision detection attempts were technically sound, but they were solving the WRONG PROBLEM. The real issue is that:

**The orb trajectory only reaches 1.5 units high, but the zombie is 20 units tall!**

Fix the trajectory first, THEN the collision will work perfectly with the simple `THREE.Box3().setFromObject()` approach.

---

## Next Steps

1. **Immediately**: Fix orb arc height to reach at least 20 units
2. **Test**: Verify hits register on all body parts
3. **Optimize**: Switch to simple sphere-to-box collision
4. **Polish**: Add trajectory visualization for debugging
5. **Document**: Update this file with test results

---

*Document Created:* 2025-10-15
*Last Updated:* 2025-10-15
*Status:* Ready for implementation
