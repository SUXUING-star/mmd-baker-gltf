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
  const pointMatRef = useRef<THREE.MeshBasicMaterial>(new THREE.MeshBasicMaterial({ color: 0xff0055 }));

  useEffect(() => {
    if (!containerRef.current) return;

    const width = containerRef.current.clientWidth;
    const height = 480;

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
    scene.add(pointsGroup);
    pointsGroupRef.current = pointsGroup;

    // 单一主渲染循环驱动骨骼动画与视口渲染
    const clock = new THREE.Clock();
    let animId: number;
    const renderLoop = () => {
      animId = requestAnimationFrame(renderLoop);
      const delta = clock.getDelta();
      if (mixerRef.current) {
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

  // 重置相机到 MMD 视角
  const setMmdCamera = useCallback(() => {
    if (!cameraRef.current || !controlsRef.current) return;
    cameraRef.current.position.set(0, 10, 25);
    controlsRef.current.target.set(0, 9, 0);
    controlsRef.current.update();
  }, []);

  // 重置相机到 Humanoid 模型中心
  const setHumanoidCamera = useCallback(() => {
    if (!cameraRef.current || !controlsRef.current) return;
    cameraRef.current.position.set(0, 1.2, 2.5);
    controlsRef.current.target.set(0, 0.9, 0);
    controlsRef.current.update();
  }, []);

  // 清除旧模型与骨骼
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

  // 刷新 Landmarks 散点
  const updateLandmarks = useCallback((mesh: THREE.Object3D, landmarks: Record<string, [number, number, number]>) => {
    const scene = sceneRef.current;
    const pointsGroup = pointsGroupRef.current;
    if (!scene || !pointsGroup) return;

    if (currentMeshRef.current !== mesh) {
      if (currentMeshRef.current) scene.remove(currentMeshRef.current);
      scene.add(mesh);
      currentMeshRef.current = mesh;
    }

    pointsGroup.clear();
    Object.values(landmarks).forEach(([x, y, z]) => {
      const sphere = new THREE.Mesh(sphereGeoRef.current, pointMatRef.current);
      sphere.position.set(x, y, z);
      pointsGroup.add(sphere);
    });
  }, []);

  // 加载并播放导出的 GLB
  const loadAndPlayGLB = useCallback((glbUrl: string): Promise<void> => {
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
  }, [clearCurrentMesh]);

  return {
    setMmdCamera,
    setHumanoidCamera,
    clearCurrentMesh,
    updateLandmarks,
    loadAndPlayGLB
  };
}
