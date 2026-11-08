// src/hooks/useThreeScene.ts
import { useCallback, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export function useThreeScene(containerRef: React.RefObject<HTMLDivElement | null>) {
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const pointsGroupRef = useRef<THREE.Group | null>(null);
  const currentMeshRef = useRef<THREE.Object3D | null>(null);
  const skeletonHelperRef = useRef<THREE.SkeletonHelper | null>(null);
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);

  const sphereGeoRef = useRef<THREE.SphereGeometry>(new THREE.SphereGeometry(0.12, 8, 8));
  const pointMatRef = useRef<THREE.MeshBasicMaterial>(new THREE.MeshBasicMaterial({ color: 0xff0055, depthTest: false }));

  useEffect(() => {
    if (!containerRef.current) return;

    const width = containerRef.current.clientWidth;
    const height = 380; // 优化高度，留出空间给 UI 和页面滚动条

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xffffff);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 10, 25);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    containerRef.current.innerHTML = '';
    containerRef.current.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 9, 0);
    controls.update();
    controlsRef.current = controls;

    scene.add(new THREE.AmbientLight(0xffffff, 1.2));
    const dirLight1 = new THREE.DirectionalLight(0xffffff, 1.5);
    dirLight1.position.set(10, 20, 15);
    scene.add(dirLight1);
    const dirLight2 = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight2.position.set(-10, 10, -15);
    scene.add(dirLight2);

    const gridHelper = new THREE.GridHelper(20, 20, 0x007acc, 0xd0d0d0);
    scene.add(gridHelper);

    const pointsGroup = new THREE.Group();
    pointsGroup.renderOrder = 999; // 让关节点小红球保持前端显示
    scene.add(pointsGroup);
    pointsGroupRef.current = pointsGroup;

    const clock = new THREE.Clock();
    let animId: number;
    const renderLoop = () => {
      animId = requestAnimationFrame(renderLoop);
      const delta = clock.getDelta();
      // 如果处于自动播放状态（GLB/VRMA），则更新 mixer
      if (mixerRef.current && mixerRef.current.timeScale !== 0) {
        mixerRef.current.update(delta);
      }
      renderer.render(scene, camera);
    };
    renderLoop();

    return () => {
      cancelAnimationFrame(animId);
      renderer.dispose();
      sphereGeoRef.current.dispose();
      pointMatRef.current.dispose();
    };
  }, [containerRef]);

  const setMmdCamera = useCallback(() => {
    if (!cameraRef.current || !controlsRef.current) return;
    cameraRef.current.position.set(0, 10, 25);
    controlsRef.current.target.set(0, 9, 0);
    controlsRef.current.update();
  }, []);

  const setHumanoidCamera = useCallback(() => {
    if (!cameraRef.current || !controlsRef.current) return;
    cameraRef.current.position.set(0, 1.2, 2.5);
    controlsRef.current.target.set(0, 0.9, 0);
    controlsRef.current.update();
  }, []);

  const clearCurrentMesh = useCallback(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    if (currentMeshRef.current) scene.remove(currentMeshRef.current);
    if (skeletonHelperRef.current) scene.remove(skeletonHelperRef.current);
    if (mixerRef.current) {
      mixerRef.current.stopAllAction();
      mixerRef.current = null;
    }
  }, []);

  // 挂载 MMD 模型与 Track，提供手动时间控制
  const setupMmdAnimation = useCallback(
    (mesh: THREE.SkinnedMesh, animation: THREE.AnimationClip) => {
      clearCurrentMesh();
      const scene = sceneRef.current;
      if (!scene) return;

      scene.add(mesh);
      currentMeshRef.current = mesh;

      const mixer = new THREE.AnimationMixer(mesh);
      const action = mixer.clipAction(animation);
      action.play();
      mixer.timeScale = 0; // 手动根据时间控制帧
      mixerRef.current = mixer;
    },
    [clearCurrentMesh]
  );

  // 刷新关节点位置
  const renderLandmarksPositions = useCallback((landmarks: Record<string, [number, number, number]>) => {
    const pointsGroup = pointsGroupRef.current;
    if (!pointsGroup) return;

    const values = Object.values(landmarks);
    while (pointsGroup.children.length < values.length) {
      const sphere = new THREE.Mesh(sphereGeoRef.current, pointMatRef.current);
      pointsGroup.add(sphere);
    }
    while (pointsGroup.children.length > values.length) {
      pointsGroup.remove(pointsGroup.children[pointsGroup.children.length - 1]);
    }

    values.forEach(([x, y, z], i) => {
      pointsGroup.children[i].position.set(x, y, z);
    });
  }, []);

  // 关键核心：设置 MMD 模型与关节点在指定时间 (time) 处的姿态
  const setMmdTime = useCallback(
    (time: number, landmarks?: Record<string, [number, number, number]>) => {
      if (mixerRef.current) {
        mixerRef.current.setTime(time);
      }
      if (currentMeshRef.current) {
        currentMeshRef.current.updateMatrixWorld(true);
      }
      if (landmarks) {
        renderLandmarksPositions(landmarks);
      }
    },
    [renderLandmarksPositions]
  );

  const updateLandmarks = useCallback(
    (mesh: THREE.Object3D, landmarks: Record<string, [number, number, number]>) => {
      const scene = sceneRef.current;
      if (!scene) return;

      if (currentMeshRef.current !== mesh) {
        if (currentMeshRef.current) scene.remove(currentMeshRef.current);
        scene.add(mesh);
        currentMeshRef.current = mesh;
      }

      renderLandmarksPositions(landmarks);
    },
    [renderLandmarksPositions]
  );

  const loadAndPlayGLB = useCallback(
    (glbUrl: string): Promise<void> => {
      return new Promise((resolve, reject) => {
        const scene = sceneRef.current;
        if (!scene) return resolve();

        const gltfLoader = new GLTFLoader();
        gltfLoader.load(
          glbUrl,
          (gltf) => {
            clearCurrentMesh();
            if (pointsGroupRef.current) pointsGroupRef.current.clear();

            const model = gltf.scene;
            scene.add(model);
            currentMeshRef.current = model;

            const helper = new THREE.SkeletonHelper(model);
            if ('linewidth' in helper.material) {
              (helper.material as any).linewidth = 2;
            }
            scene.add(helper);
            skeletonHelperRef.current = helper;

            if (gltf.animations.length > 0) {
              const mixer = new THREE.AnimationMixer(model);
              mixer.timeScale = 1.0;
              const action = mixer.clipAction(gltf.animations[0]);
              action.play();
              mixerRef.current = mixer;
            }

            resolve();
          },
          undefined,
          reject
        );
      });
    },
    [clearCurrentMesh]
  );

  return {
    setMmdCamera,
    setHumanoidCamera,
    clearCurrentMesh,
    setupMmdAnimation,
    setMmdTime,
    updateLandmarks,
    renderLandmarksPositions,
    loadAndPlayGLB,
  };
}
