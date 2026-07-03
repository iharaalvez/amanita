"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type CaptureStatus = "idle" | "requesting" | "ready" | "error";

export type UseScreenCaptureReturn = {
  status: CaptureStatus;
  message: string;
  startCapture: () => Promise<void>;
  stopCapture: () => void;
  captureFrame: () => boolean;
  getFrameCanvas: () => HTMLCanvasElement | null;
};

export function useScreenCapture(): UseScreenCaptureReturn {
  const [status, setStatus] = useState<CaptureStatus>("idle");
  const [message, setMessage] = useState(
    "Click Start to select your capture window.",
  );

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const frameCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    const video = document.createElement("video");
    video.style.display = "none";
    video.muted = true;
    video.playsInline = true;
    document.body.appendChild(video);
    videoRef.current = video;
    return () => {
      video.remove();
      videoRef.current = null;
    };
  }, []);

  const stopCapture = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setStatus("idle");
    setMessage("Click Start to select your capture window.");
  }, []);

  const startCapture = useCallback(async () => {
    if (!navigator.mediaDevices?.getDisplayMedia) {
      setStatus("error");
      setMessage("Screen capture is not supported in this browser.");
      return;
    }
    stopCapture();
    setStatus("requesting");
    setMessage("Select your OBS projector window…");

    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: { ideal: 30 } },
        audio: false,
      });
      streamRef.current = stream;

      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        video.muted = true;
        await video.play().catch(() => {});
        if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
          await new Promise<void>((resolve) => {
            const onReady = () => {
              video.removeEventListener("playing", onReady);
              video.removeEventListener("canplay", onReady);
              resolve();
            };
            video.addEventListener("playing", onReady);
            video.addEventListener("canplay", onReady);
            setTimeout(resolve, 8000);
          });
        }
      }

      stream.getVideoTracks()[0]?.addEventListener("ended", () => {
        streamRef.current = null;
        setStatus("idle");
        setMessage("Screen sharing ended. Click Start to reconnect.");
      });

      setStatus("ready");
      setMessage("Ready.");
    } catch (err: unknown) {
      const denied =
        err instanceof DOMException && err.name === "NotAllowedError";
      setStatus("error");
      setMessage(
        denied
          ? "Screen capture permission denied."
          : "Could not start screen capture.",
      );
    }
  }, [stopCapture]);

  const captureFrame = useCallback((): boolean => {
    const video = videoRef.current;
    if (!video || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA)
      return false;
    if (!frameCanvasRef.current)
      frameCanvasRef.current = document.createElement("canvas");
    const canvas = frameCanvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")!.drawImage(video, 0, 0);
    return true;
  }, []);

  const getFrameCanvas = useCallback(
    (): HTMLCanvasElement | null => frameCanvasRef.current,
    [],
  );

  useEffect(() => {
    return () => stopCapture();
  }, [stopCapture]);

  return { status, message, startCapture, stopCapture, captureFrame, getFrameCanvas };
}
