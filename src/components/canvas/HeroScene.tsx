"use client";

import { Suspense, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { extend, useFrame, useThree } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import { useLoopVideoTexture } from "@/lib/videoTexture";
import { SRGBColorSpace } from "three";
import { useRouter } from "next/navigation";
import gsap from "gsap";
import { MathUtils, Vector3, type Group } from "three";
import { HatchMaterial } from "@/shaders/hatchMaterial";
import { IrisMaterial } from "@/shaders/irisMaterial";
import { VideoBackdropMaterial, VideoEyeMaterial } from "@/shaders/videoEyeMaterial";
import { scrollState } from "@/lib/scroll-state";
import { uiStore } from "@/lib/ui-store";
import { lerp, portraitFactor } from "@/lib/responsive";
import { done, pending } from "@/lib/loading";
import type { CoverItem } from "@/content/types";
import WorkPlane from "./WorkPlane";

extend({ HatchMaterial, IrisMaterial, VideoEyeMaterial, VideoBackdropMaterial });

declare module "@react-three/fiber" {
  interface ThreeElements {
    hatchMaterial: import("@react-three/fiber").ThreeElement<typeof HatchMaterial>;
    irisMaterial: import("@react-three/fiber").ThreeElement<typeof IrisMaterial>;
    videoEyeMaterial: import("@react-three/fiber").ThreeElement<typeof VideoEyeMaterial>;
    videoBackdropMaterial: import("@react-three/fiber").ThreeElement<typeof VideoBackdropMaterial>;
  }
}

/**
 * Portada: un ojo dibujado a plumilla que sigue al visitante, rodeado de puertas
 * que flotan y de un anillo con las últimas obras. El scroll aleja la cámara.
 */
export interface HeroVideos {
  /** Cuadro fijo de «Dream 11» con el iris centrado (vista frontal del globo ocular). */
  eye?: string;
  /** Animación de fondo a pantalla completa. */
  backdrop?: string;
}

export default function HeroScene({ projects, videos = {} }: { projects: CoverItem[]; videos?: HeroVideos }) {
  // El loader espera a que los vídeos de portada puedan reproducirse
  useLayoutEffect(() => {
    if (videos.eye) pending("hero-eye");
    if (videos.backdrop) pending("hero-backdrop");
  }, [videos.eye, videos.backdrop]);

  const router = useRouter();
  const ring = useRef<Group>(null);
  const orbit = projects.slice(0, 7);
  // Responsive: en pantallas verticales la cámara se aleja, el ojo sube y la órbita se cierra
  const size = useThree((s) => s.size);
  const pf = portraitFactor(size.width, size.height);
  const aspect = size.width / Math.max(1, size.height);
  const radius = lerp(4.6, 2.5, pf);

  useFrame((state, dt) => {
    const p = Math.min(1, scrollState.offset / window.innerHeight);
    const cam = state.camera;
    const baseZ = Math.max(7, 5.2 / aspect); // el ojo ocupa ~60 % del ancho en vertical
    const yOff = -1.4 * pf; // cámara y mirada más abajo → el ojo queda arriba, lejos del título
    cam.position.x = MathUtils.damp(cam.position.x, state.pointer.x * 0.6, 2, dt);
    cam.position.y = MathUtils.damp(cam.position.y, state.pointer.y * 0.4 + p * 1.5 + yOff, 2, dt);
    cam.position.z = MathUtils.damp(cam.position.z, baseZ + p * 4, 3, dt);
    cam.lookAt(0, p * 0.8 + yOff, 0);
    if (ring.current) ring.current.rotation.y += dt * 0.06 + scrollState.velocity * 0.0004;
  });

  return (
    <>
      {videos.backdrop && (
        <Suspense fallback={null}>
          <Backdrop src={videos.backdrop} />
        </Suspense>
      )}
      {videos.eye ? (
        <Suspense fallback={<Eye />}>
          <Eye video={videos.eye} />
        </Suspense>
      ) : (
        <Eye />
      )}
      <FloatingDoors spread={lerp(1, 0.45, pf)} />
      <group ref={ring} rotation={[0.28, 0, 0]}>
        {orbit.map((proj, i) => {
          const a = (i / orbit.length) * Math.PI * 2;
          return (
            <Billboard key={proj.slug} position={[Math.cos(a) * radius, Math.sin(i * 1.7) * 0.5 - 0.4, Math.sin(a) * radius]}>
              <WorkPlane
                media={proj.cover}
                maxW={1.1}
                maxH={1.3}
                texSize="sm"
                delay={0.8 + i * 0.12}
                scrollReactive={false}
                onHover={(v) => uiStore.set({ hoveredId: v ? proj.slug : null })}
                onSelect={() => router.push(`/proyecto/${proj.slug}`)}
              />
            </Billboard>
          );
        })}
      </group>
    </>
  );
}

/** Mantiene la obra mirando a cámara mientras orbita. */
function Billboard({ children, position }: { children: React.ReactNode; position: [number, number, number] }) {
  const g = useRef<Group>(null);
  useFrame(({ camera }) => g.current?.quaternion.copy(camera.quaternion));
  return (
    <group position={position}>
      <group ref={g}>{children}</group>
    </group>
  );
}

function Eye({ video }: { video?: string }) {
  const eye = useRef<Group>(null);
  const iris = useRef<InstanceType<typeof IrisMaterial>>(null);
  const target = useMemo(() => new Vector3(), []);
  const look = useMemo(() => new Vector3(0, 0, 10), []);

  // Parpadeo onírico: el ojo entero se aplasta, a intervalos irregulares.
  useEffect(() => {
    const el = eye.current;
    if (!el) return;
    let t: ReturnType<typeof setTimeout>;
    const blink = () => {
      gsap.timeline().to(el.scale, { y: 0.06, duration: 0.09, ease: "power2.in" }).to(el.scale, { y: 1, duration: 0.22, ease: "power2.out" });
      t = setTimeout(blink, (video ? 5000 : 2500) + Math.random() * 5000);
    };
    t = setTimeout(blink, 2000);
    return () => clearTimeout(t);
  }, []);

  useFrame((state, dt) => {
    if (!eye.current) return;
    target.set(state.pointer.x * 7, state.pointer.y * 5 + 0.3, 8);
    look.lerp(target, 1 - Math.exp(-4 * dt));
    eye.current.lookAt(look);
    eye.current.position.y = Math.sin(state.clock.elapsedTime * 0.6) * 0.08;
    if (iris.current) {
      const u = iris.current.uniforms as Record<string, { value: number }>;
      u.uTime.value = state.clock.elapsedTime;
      // la pupila se dilata con la velocidad del scroll
      u.uPupil.value = MathUtils.damp(u.uPupil.value, 0.34 + Math.min(0.3, Math.abs(scrollState.velocity) * 0.01), 4, dt);
    }
  });

  if (video) {
    return (
      <group ref={eye}>
        <VideoEyeball src={video} />
      </group>
    );
  }

  return (
    <group ref={eye}>
      <mesh>
        <sphereGeometry args={[1.35, 64, 64]} />
        <hatchMaterial key={HatchMaterial.key} uSpacing={5} uTone={1.15} />
      </mesh>
      {/* Casquete del iris orientado a +Z (hacia donde mira el grupo) */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <sphereGeometry args={[1.362, 64, 24, 0, Math.PI * 2, 0, 0.62]} />
        <irisMaterial ref={iris} key={IrisMaterial.key} />
      </mesh>
    </group>
  );
}

function FloatingDoors({ spread = 1 }: { spread?: number }) {
  const doors = useMemo(
    () =>
      Array.from({ length: 6 }, (_, i) => ({
        pos: [Math.cos(i * 1.9) * (5 + (i % 3)) * spread, Math.sin(i * 2.3) * (2.2 + (1 - spread) * 3), -2 - (i % 4) * 1.5] as [number, number, number],
        rot: i * 0.7,
        speed: 0.1 + (i % 3) * 0.05,
        scale: 0.6 + (i % 3) * 0.25,
      })),
    [spread],
  );
  const refs = useRef<(Group | null)[]>([]);
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    refs.current.forEach((g, i) => {
      if (!g) return;
      const d = doors[i];
      g.rotation.y = d.rot + t * d.speed;
      g.rotation.z = Math.sin(t * 0.3 + i) * 0.2;
      g.position.y = d.pos[1] + Math.sin(t * 0.5 + i * 2) * 0.25;
    });
  });

  return (
    <>
      {doors.map((d, i) => (
        <group key={i} ref={(el) => void (refs.current[i] = el)} position={d.pos} scale={d.scale}>
          <Door />
        </group>
      ))}
    </>
  );
}

export function Door({ leaf = true }: { leaf?: boolean }) {
  return (
    <group>
      {[
        { p: [-0.55, 0, 0], s: [0.14, 2.2, 0.14] },
        { p: [0.55, 0, 0], s: [0.14, 2.2, 0.14] },
        { p: [0, 1.1, 0], s: [1.24, 0.14, 0.14] },
      ].map((b, i) => (
        <mesh key={i} position={b.p as [number, number, number]}>
          <boxGeometry args={b.s as [number, number, number]} />
          <hatchMaterial key={HatchMaterial.key} uSpacing={4} />
        </mesh>
      ))}
      {/* Hoja de puerta entreabierta */}
      {leaf && <mesh position={[-0.05, -0.03, -0.25]} rotation={[0, 0.9, 0]}>
        <boxGeometry args={[1.0, 2.1, 0.05]} />
        <hatchMaterial key={HatchMaterial.key} uSpacing={4} uTone={0.8} />
      </mesh>}
    </group>
  );
}

/** Esfera con el ojo del artista proyectado en su hemisferio frontal. */
function VideoEyeball({ src }: { src: string }) {
  // Imagen fija: el ojo no se deforma; solo gira la esfera hacia el cursor.
  const tex = useTexture(src, (t) => {
    t.colorSpace = SRGBColorSpace;
    t.anisotropy = 8;
  });
  useEffect(() => done("hero-eye"), []);
  const mat = useRef<InstanceType<typeof VideoEyeMaterial>>(null);
  useFrame((state) => {
    if (mat.current) (mat.current.uniforms as Record<string, { value: number }>).uTime.value = state.clock.elapsedTime;
  });
  return (
    <mesh>
      <sphereGeometry args={[1.35, 64, 64]} />
      <videoEyeMaterial ref={mat} key={VideoEyeMaterial.key} uVideo={tex} />
    </mesh>
  );
}

/**
 * Fondo: vídeo a pantalla completa pegado a la cámara (siempre cubre el encuadre,
 * sin importar el scroll), con parallax sutil del cursor. Ignora la niebla.
 */
function Backdrop({ src }: { src: string }) {
  const tex = useLoopVideoTexture(src);
  useEffect(() => done("hero-backdrop"), []);
  const forward = useMemo(() => new Vector3(), []);
  const mesh = useRef<import("three").Mesh>(null);
  const mat = useRef<InstanceType<typeof VideoBackdropMaterial>>(null);
  const size = useThree((s) => s.size);
  const DIST = 18;

  useFrame((state) => {
    const m = mesh.current;
    if (!m) return;
    const cam = state.camera as import("three").PerspectiveCamera;
    const h = 2 * Math.tan((cam.fov * Math.PI) / 360) * DIST * 1.08; // 8 % extra para el parallax
    const w = h * (size.width / size.height);
    m.position.copy(cam.position).add(cam.getWorldDirection(forward).multiplyScalar(DIST));
    m.quaternion.copy(cam.quaternion);
    m.scale.set(w, h, 1);
    if (mat.current) {
      const u = mat.current.uniforms as Record<string, { value: unknown }>;
      const img = tex.image as HTMLVideoElement;
      const va = (img.videoWidth || 16) / (img.videoHeight || 9);
      const pa = w / h;
      // cover: recorta el vídeo para llenar sin deformar
      u.uCover.value = pa > va ? [1, va / pa] : [pa / va, 1];
      u.uOffset.value = [state.pointer.x * -0.015, state.pointer.y * -0.015];
      u.uTime.value = state.clock.elapsedTime;
    }
  });

  return (
    <mesh ref={mesh} renderOrder={-1}>
      <planeGeometry args={[1, 1]} />
      <videoBackdropMaterial ref={mat} key={VideoBackdropMaterial.key} uVideo={tex} depthWrite={false} fog={false} />
    </mesh>
  );
}
