import { useEffect, useMemo } from "react";
import { suspend } from "suspend-react";
import { SRGBColorSpace, VideoTexture } from "three";

/**
 * Vídeo en bucle como textura, sin dependencias extra.
 * (El useVideoTexture de drei arrastra hls.js: ~570 KB de JS que este sitio no necesita.)
 * Suspende hasta tener metadatos, se pausa con la pestaña oculta y al desmontar.
 */
export function useLoopVideoTexture(src: string) {
  const video = suspend(
    () =>
      new Promise<HTMLVideoElement>((resolve) => {
        const v = document.createElement("video");
        v.src = src;
        v.muted = true;
        v.loop = true;
        v.playsInline = true;
        v.crossOrigin = "anonymous";
        v.preload = "auto";
        v.setAttribute("playsinline", "");
        v.setAttribute("muted", "");
        v.addEventListener("loadedmetadata", () => resolve(v), { once: true });
        v.addEventListener("error", () => resolve(v), { once: true });
        v.load();
      }),
    [src, "loop-video-texture"],
  );

  const texture = useMemo(() => {
    const t = new VideoTexture(video);
    t.colorSpace = SRGBColorSpace;
    return t;
  }, [video]);

  useEffect(() => {
    const play = () => void video.play().catch(() => {});
    const onVisibility = () => (document.hidden ? video.pause() : play());
    play();
    // Autoplay bloqueado (ahorro de datos / iOS): reintenta con el primer gesto
    window.addEventListener("pointerdown", play, { once: true });
    window.addEventListener("scroll", play, { once: true });
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("pointerdown", play);
      window.removeEventListener("scroll", play);
      document.removeEventListener("visibilitychange", onVisibility);
      video.pause();
    };
  }, [video]);

  useEffect(() => () => texture.dispose(), [texture]);
  return texture;
}
