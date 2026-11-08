去掉了不必要的修饰词、大量括号和过度加粗，整体排版更接近 GitHub 原生维护者编写的简洁干净风格：

```markdown
# MMD to Humanoid & VRMA Motion Converter

Convert MMD motion files (`.vmd`) into standard Humanoid GLB and VRMA animations directly in your browser.

## How it works

Directly retargeting MMD motion files onto standard humanoid rigs is difficult due to custom IK solvers, non-standard rest poses, and unique bone hierarchies.

This tool solves the issue in two simple steps:

1. **FK Baking**: Runs the PMX model and VMD animation in Three.js frame-by-frame to extract 3D world coordinates of key skeletal joints.
2. **Humanoid Retargeting**: Reconstructs bone rotations and root movement from the 3D coordinates, then exports the motion as GLB or VRMA.

## Features

- **GLB & VRMA Export**: Generates standard Humanoid GLB files for game engines and VRMA files for VRM avatars.
- **Browser Native**: Runs entirely in the browser—no backend server, Python scripts, or Blender plugins needed.
- **Interactive Preview**: Real-time 3D landmark baking visualization and instant playback of the exported animation.
- **Custom Assets**: Drag and drop your own PMX and VMD files, or test with built-in presets.

## Pipeline

```text
.pmx + .vmd
   │
   ▼
1. Three.js FK Baking (Evaluate IK and record 3D joint coordinates)
   │
   ▼
2. Humanoid Solver (Compute joint rotations and root offset)
   │
   ▼
Output: .glb / .vrma
```

## Quick Start

```bash
git clone https://github.com/SUXUING-star/mmd-baker-gltf.git
cd mmd-baker-gltf
npm install
npm run dev
```

## Credits

Demo assets sourced from Aplaybox:

- Model: [Ganyu](https://www.aplaybox.com/details/model/xfyv7yIWHaxH) by 原神
- Motion: [奶蛙上掌下拳](https://www.aplaybox.com/details/motion/77uat05QX3I2)
