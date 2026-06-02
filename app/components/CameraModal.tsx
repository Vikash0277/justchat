"use client";

import { useState, useRef, useEffect, useCallback } from "react";

interface CameraModalProps {
  onCapture: (file: File) => void;
  onClose: () => void;
}

export default function CameraModal({ onCapture, onClose }: CameraModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const [mode, setMode] = useState<"photo" | "video">("photo");
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [preview, setPreview] = useState<string | null>(null);
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [error, setError] = useState("");
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startCamera = useCallback(async () => {
    try {
      // Stop any existing stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: mode === "video",
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraReady(true);
      setError("");
    } catch (err: any) {
      setError("Camera access denied. Please allow camera permissions.");
      console.error("Camera error:", err);
    }
  }, [facingMode, mode]);

  useEffect(() => {
    startCamera();
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [startCamera]);

  const flipCamera = () => {
    setFacingMode((prev) => (prev === "user" ? "environment" : "user"));
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (blob) {
          const file = new File([blob], `camera_${Date.now()}.jpg`, {
            type: "image/jpeg",
          });
          setPreviewFile(file);
          setPreview(URL.createObjectURL(blob));
        }
      },
      "image/jpeg",
      0.92
    );
  };

  const startRecording = () => {
    if (!streamRef.current) return;
    chunksRef.current = [];
    const options: MediaRecorderOptions = {};
    if (MediaRecorder.isTypeSupported("video/webm;codecs=vp9")) {
      options.mimeType = "video/webm;codecs=vp9";
    } else if (MediaRecorder.isTypeSupported("video/webm")) {
      options.mimeType = "video/webm";
    }
    const recorder = new MediaRecorder(streamRef.current, options);
    mediaRecorderRef.current = recorder;
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, {
        type: options.mimeType || "video/webm",
      });
      // Check 10MB limit
      if (blob.size > 10 * 1024 * 1024) {
        setError("Video exceeds 10MB limit. Please record a shorter clip.");
        return;
      }
      const file = new File([blob], `camera_${Date.now()}.webm`, {
        type: blob.type,
      });
      setPreviewFile(file);
      setPreview(URL.createObjectURL(blob));
    };
    recorder.start(100);
    setIsRecording(true);
    setRecordingTime(0);
    intervalRef.current = setInterval(() => {
      setRecordingTime((prev) => prev + 1);
    }, 1000);
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const confirmSend = () => {
    if (previewFile) {
      onCapture(previewFile);
      onClose();
    }
  };

  const retake = () => {
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    setPreviewFile(null);
    setError("");
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/90 flex flex-col items-center justify-center animate-fadeIn">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-4 z-10">
        <button
          onClick={onClose}
          className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-sm transition cursor-pointer"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        <div className="flex items-center gap-2">
          {/* Mode toggle */}
          <div className="flex bg-white/10 rounded-full p-0.5 backdrop-blur-sm">
            <button
              onClick={() => {
                setMode("photo");
                retake();
              }}
              className={`px-3 py-1 rounded-full text-xs font-bold transition cursor-pointer ${
                mode === "photo"
                  ? "bg-white text-black"
                  : "text-white/70 hover:text-white"
              }`}
            >
              Photo
            </button>
            <button
              onClick={() => {
                setMode("video");
                retake();
              }}
              className={`px-3 py-1 rounded-full text-xs font-bold transition cursor-pointer ${
                mode === "video"
                  ? "bg-rose-500 text-white"
                  : "text-white/70 hover:text-white"
              }`}
            >
              Video
            </button>
          </div>
        </div>

        {/* Flip camera */}
        <button
          onClick={flipCamera}
          className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-sm transition cursor-pointer"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="absolute top-16 left-4 right-4 bg-rose-500/90 text-white text-xs font-bold px-4 py-2 rounded-xl text-center backdrop-blur-sm z-10">
          {error}
        </div>
      )}

      {/* Preview or Live Camera */}
      {preview ? (
        <div className="flex-1 flex items-center justify-center w-full max-w-lg px-4">
          {mode === "photo" ? (
            <img
              src={preview}
              alt="Captured"
              className="max-h-[70vh] rounded-2xl shadow-2xl object-contain"
            />
          ) : (
            <video
              src={preview}
              controls
              autoPlay
              className="max-h-[70vh] rounded-2xl shadow-2xl object-contain"
            />
          )}
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center w-full max-w-lg px-4 relative">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="max-h-[70vh] rounded-2xl shadow-2xl object-cover"
          />
          {isRecording && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/50 backdrop-blur-sm px-3 py-1.5 rounded-full">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-500 animate-pulse" />
              <span className="text-white text-xs font-bold">
                REC {formatTime(recordingTime)}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Hidden canvas for photo capture */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Controls */}
      <div className="absolute bottom-0 left-0 right-0 p-6 flex items-center justify-center gap-6">
        {preview ? (
          <>
            <button
              onClick={retake}
              className="px-5 py-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white font-bold text-sm backdrop-blur-sm transition cursor-pointer"
            >
              Retake
            </button>
            <button
              onClick={confirmSend}
              className="px-6 py-2.5 rounded-full bg-blue-500 hover:bg-blue-600 text-white font-bold text-sm shadow-lg shadow-blue-500/30 transition cursor-pointer flex items-center gap-2"
            >
              <svg
                className="w-4 h-4 rotate-90"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                />
              </svg>
              Send
            </button>
          </>
        ) : (
          <>
            {mode === "photo" ? (
              <button
                onClick={capturePhoto}
                disabled={!cameraReady}
                className="h-16 w-16 rounded-full bg-white border-4 border-white/30 hover:scale-105 active:scale-95 transition-all cursor-pointer disabled:opacity-40 shadow-lg"
              />
            ) : isRecording ? (
              <button
                onClick={stopRecording}
                className="h-16 w-16 rounded-full bg-rose-500 flex items-center justify-center hover:scale-105 active:scale-95 transition-all cursor-pointer shadow-lg shadow-rose-500/40 animate-pulse"
              >
                <span className="h-6 w-6 rounded-sm bg-white" />
              </button>
            ) : (
              <button
                onClick={startRecording}
                disabled={!cameraReady}
                className="h-16 w-16 rounded-full bg-rose-500 border-4 border-rose-300/30 hover:scale-105 active:scale-95 transition-all cursor-pointer disabled:opacity-40 shadow-lg shadow-rose-500/40"
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
