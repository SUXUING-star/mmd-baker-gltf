// src/App.tsx
import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { bakePure3DLandmarks } from './utils/baker';
import { exportFull52HumanoidGLB } from './utils/glbExporter';

export default function App() {
  const [pmxFile, setPmxFile] = useState<File | null>(null);
  const [vmdFile, setVmdFile] = useState<File | null>(null);

  // 内置预设作为演示测试使用
  const demoPmxPath = '/Gentildonna Tracksuit/Gentildonna Tracksuit.pmx';
  const demoVmdPath = '/动作.vmd';

  const [status, setStatus] = useState<string>('就绪：可拖拽本地文件或直接使用内置演示测试');
  const [progress, setProgress] = useState<number>(0);
  const [baking, setBaking] = useState<boolean>(false);

  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const pointsGroupRef = useRef<THREE.Group | null>(null);
  const currentMeshRef = useRef<THREE.Object3D | null>(null);
  const skeletonHelperRef = useRef<THREE.SkeletonHelper | null>(null);

  useEffect(() => {
    if (!canvasContainerRef.current) return;

    const width = canvasContainerRef.current.clientWidth;
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

    canvasContainerRef.current.innerHTML = '';
    canvasContainerRef.current.appendChild(renderer.domElement);

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

    let animId: number;
    const renderLoop = () => {
      animId = requestAnimationFrame(renderLoop);
      renderer.render(scene, camera);
    };
    renderLoop();

    return () => {
      cancelAnimationFrame(animId);
      renderer.dispose();
    };
  }, []);

  const runPipeline = async (pmxTarget: File | string, vmdTarget: File | string) => {
    try {
      setBaking(true);
      setStatus('1/2 抓取 MMD 动作 3D 世界坐标...');

      const scene = sceneRef.current!;
      const camera = cameraRef.current!;
      const controls = controlsRef.current!;

      camera.position.set(0, 10, 25);
      controls.target.set(0, 9, 0);
      controls.update();

      if (currentMeshRef.current) scene.remove(currentMeshRef.current);
      if (skeletonHelperRef.current) scene.remove(skeletonHelperRef.current);

      const sphereGeo = new THREE.SphereGeometry(0.12, 8, 8);
      const pointMat = new THREE.MeshBasicMaterial({ color: 0xff0055 });

      const landmarkData = await bakePure3DLandmarks(
        pmxTarget,
        vmdTarget,
        (mesh, landmarks, prog) => {
          setProgress(prog);

          if (currentMeshRef.current !== mesh) {
            if (currentMeshRef.current) scene.remove(currentMeshRef.current);
            scene.add(mesh);
            currentMeshRef.current = mesh;
          }

          const pointsGroup = pointsGroupRef.current!;
          pointsGroup.clear();
          Object.values(landmarks).forEach(([x, y, z]) => {
            const sphere = new THREE.Mesh(sphereGeo, pointMat);
            sphere.position.set(x, y, z);
            pointsGroup.add(sphere);
          });
        }
      );

      setStatus('2/2 运行解算引擎并导出 Humanoid GLB...');
      const glbBlob = await exportFull52HumanoidGLB(landmarkData);

      // 解算完成，切换相机到人物高度中心
      camera.position.set(0, 1.2, 2.5);
      controls.target.set(0, 0.9, 0);
      controls.update();

      const glbUrl = URL.createObjectURL(glbBlob);
      const gltfLoader = new GLTFLoader();
      gltfLoader.load(glbUrl, (gltf) => {
        if (currentMeshRef.current) scene.remove(currentMeshRef.current);
        if (pointsGroupRef.current) pointsGroupRef.current.clear();
        if (skeletonHelperRef.current) scene.remove(skeletonHelperRef.current);

        const model = gltf.scene;
        scene.add(model);
        currentMeshRef.current = model;

        // 关键修正：类型断言解决 TS 2339 linewidth 报错
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

          const clock = new THREE.Clock();
          const animateGLB = () => {
            requestAnimationFrame(animateGLB);
            mixer.update(clock.getDelta());
          };
          animateGLB();
        }
      });

      const a = document.createElement('a');
      a.href = glbUrl;
      a.download = typeof pmxTarget === 'string' ? 'output_humanoid.glb' : `${pmxTarget.name.replace('.pmx', '')}_humanoid.glb`;
      a.click();

      setStatus('解算完成，GLB 已下载并在视口播放');
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : String(err);
      setStatus(`错误: ${msg}`);
    } finally {
      setBaking(false);
    }
  };

  // 拖拽文件处理器
  const handleDrop = (e: React.DragEvent<HTMLDivElement>, type: 'pmx' | 'vmd') => {
    e.preventDefault();
    if (baking) return;
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    if (type === 'pmx' && file.name.toLowerCase().endsWith('.pmx')) {
      setPmxFile(file);
    } else if (type === 'vmd' && file.name.toLowerCase().endsWith('.vmd')) {
      setVmdFile(file);
    } else {
      alert(`请放入正确的 .${type} 文件！`);
    }
  };

  return (
    <div style={{ maxWidth: 960, margin: '20px auto', padding: '0 20px', fontFamily: 'system-ui, sans-serif' }}>
      <h2 style={{ marginBottom: 12, color: '#222' }}>MMD 动作转 Humanoid 动捕解算器</h2>

      {/* 3D 渲染画布 */}
      <div
        ref={canvasContainerRef}
        style={{
          width: '100%',
          height: 480,
          borderRadius: 8,
          border: '1px solid #ddd',
          marginBottom: 14,
          background: '#ffffff'
        }}
      />

      <div style={{ padding: '10px 14px', background: '#f0f5ff', borderRadius: 6, marginBottom: 16, fontSize: 14, color: '#1d39c4' }}>
        <strong>运行状态：</strong> {status} {baking && `(${progress}%)`}
      </div>

      {/* 拖拽/点击上传区域 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
        {/* PMX 放置区 */}
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => handleDrop(e, 'pmx')}
          style={{
            border: '2px dashed #1677ff',
            borderRadius: 8,
            padding: 16,
            textAlign: 'center',
            background: pmxFile ? '#f6ffed' : '#fafafa',
            cursor: 'pointer'
          }}
          onClick={() => document.getElementById('pmx-input')?.click()}
        >
          <input
            id="pmx-input"
            type="file"
            accept=".pmx"
            style={{ display: 'none' }}
            disabled={baking}
            onChange={(e) => setPmxFile(e.target.files?.[0] || null)}
          />
          <h4 style={{ margin: '0 0 6px 0', color: '#1677ff' }}>1. 模型文件 (.pmx)</h4>
          <p style={{ margin: 0, fontSize: 13, color: '#666' }}>
            {pmxFile ? `已选择: ${pmxFile.name}` : '点击选择或拖拽 .pmx 文件至此处'}
          </p>
        </div>

        {/* VMD 放置区 */}
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => handleDrop(e, 'vmd')}
          style={{
            border: '2px dashed #52c41a',
            borderRadius: 8,
            padding: 16,
            textAlign: 'center',
            background: vmdFile ? '#f6ffed' : '#fafafa',
            cursor: 'pointer'
          }}
          onClick={() => document.getElementById('vmd-input')?.click()}
        >
          <input
            id="vmd-input"
            type="file"
            accept=".vmd"
            style={{ display: 'none' }}
            disabled={baking}
            onChange={(e) => setVmdFile(e.target.files?.[0] || null)}
          />
          <h4 style={{ margin: '0 0 6px 0', color: '#52c41a' }}>2. 动作文件 (.vmd)</h4>
          <p style={{ margin: 0, fontSize: 13, color: '#666' }}>
            {vmdFile ? `已选择: ${vmdFile.name}` : '点击选择或拖拽 .vmd 文件至此处'}
          </p>
        </div>
      </div>

      {/* 操作按钮区 */}
      <div style={{ display: 'flex', gap: 12 }}>
        <button
          disabled={baking || !pmxFile || !vmdFile}
          onClick={() => pmxFile && vmdFile && runPipeline(pmxFile, vmdFile)}
          style={{
            flex: 2,
            padding: '12px 0',
            background: baking || !pmxFile || !vmdFile ? '#ccc' : '#1677ff',
            color: '#fff',
            fontSize: 15,
            fontWeight: 600,
            border: 'none',
            borderRadius: 6,
            cursor: baking || !pmxFile || !vmdFile ? 'not-allowed' : 'pointer'
          }}
        >
          {baking ? `正在解算 (${progress}%)...` : '开始转换上传的文件'}
        </button>

        <button
          disabled={baking}
          onClick={() => runPipeline(demoPmxPath, demoVmdPath)}
          style={{
            flex: 1,
            padding: '12px 0',
            background: baking ? '#eee' : '#fff',
            color: baking ? '#999' : '#555',
            fontSize: 14,
            fontWeight: 500,
            border: '1px solid #d9d9d9',
            borderRadius: 6,
            cursor: baking ? 'not-allowed' : 'pointer'
          }}
        >
          使用内置演示快速测试
        </button>
      </div>
    </div>
  );
}
