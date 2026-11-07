# MMD to Humanoid GLB Motion Converter

A converter that turns MMD motion data (`.vmd`) into a standard humanoid skeletal animation stored in `.glb` format.

---

## Overview

Directly calculating and retargeting raw VMD motion tracks onto standard humanoid rigs is notoriously difficult due to MMD's proprietary IK chains, non-standard bone rest poses, physics interactions, and complex parent-child offsets.

This project bypasses that complexity by using a two-step forward-kinematics baking and reconstruction approach:

1. **Kinematic World Baking**: Load the `.pmx` model and `.vmd` motion inside Three.js (`MMDLoader`), step through the animation, and record the exact 3D world positions of key skeletal points frame by frame.
2. **Humanoid Motion Solving**: Feed the baked 3D point cloud into a mathematical solver to reconstruct root translations and continuous local rotations for a standard 52-bone humanoid rig, exporting the final result as a ready-to-use `.glb` file.

---

## Pipeline

```text
[ .pmx + .vmd ] 
       │
       ▼
1. Three.js MMDLoader Execution
   - Plays animation with IK evaluation
   - Captures frame-by-frame 3D world coordinates
       │
       ▼
2. Humanoid Solver Engine
   - Solves local bone orientations and hips motion
   - Smooths trajectory and ensures quaternion continuity
       │
       ▼
[ Output: Standard Humanoid .glb ]
```

---

## Features

- **Full In-Browser Processing**: Runs completely on the web via WebGL and Web APIs without server-side rendering or external dependencies like Blender.
- **Standard Humanoid Rig**: Generates a standard humanoid skeletal hierarchy compatible with game engines like Unity, Unreal Engine, and WebGL viewers.
- **Interactive 3D Visualizer**: Real-time preview of the baking process, point cloud landmarks, and immediate playback of the exported GLB animation.
- **Drag & Drop Workflow**: Easily upload custom `.pmx` and `.vmd` files or test directly with pre-bundled demo assets.

---

## Quick Start

### Installation

```bash
# Clone the repository
git clone https://github.com/SUXUING-star/mmd-baker-gltf.git
cd mmd-baker-gltf

# Install dependencies
npm install

# Start development server
npm run dev
```

### Usage

1. Open the application in your browser.
2. Drag and drop your `.pmx` character file and `.vmd` motion file into their respective drop zones (or click **Use Built-in Demo** to run a sample).
3. Click **Start Conversion**.
4. Watch the real-time landmark baking in the viewport.
5. Once solved, the generated `.glb` animation will play back automatically and download to your machine.
