"use client";

import { Canvas } from "@react-three/fiber";

export function ThreeSmokeScene() {
  return (
    <div className="h-[28rem] w-full overflow-hidden rounded-xl border bg-neutral-950">
      <Canvas
        camera={{ position: [3, 2, 4], fov: 45 }}
        gl={{ antialias: false }}
        onCreated={({ gl }) => {
          const context = gl.getContext();
          gl.domElement.dataset.rendererReady = String(
            context instanceof WebGLRenderingContext ||
              context instanceof WebGL2RenderingContext,
          );
        }}
      >
        <color attach="background" args={["#10151d"]} />
        <ambientLight intensity={1.2} />
        <directionalLight position={[4, 5, 3]} intensity={2} />
        <mesh rotation={[0.35, 0.55, 0]}>
          <boxGeometry args={[1.4, 1.4, 1.4]} />
          <meshStandardMaterial color="#7dd3c7" roughness={0.35} />
        </mesh>
      </Canvas>
    </div>
  );
}
