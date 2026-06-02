"use client";

import React, { useEffect, useRef, useState } from "react";
import type { Socket } from "socket.io-client";
import type { UserProfile } from "./types";

interface VideoCallModalProps {
  socket: Socket | null;
  currentUser: UserProfile;
  recipientId?: string; // If initiating a call
  recipientName?: string;
  incomingCallData?: { from: string; callerName: string; signal: any } | null;
  onClose: () => void;
}

export default function VideoCallModal({
  socket,
  currentUser,
  recipientId,
  recipientName,
  incomingCallData,
  onClose,
}: VideoCallModalProps) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [callStatus, setCallStatus] = useState<"ringing" | "connected" | "ended">("ringing");
  const myVideo = useRef<HTMLVideoElement>(null);
  const userVideo = useRef<HTMLVideoElement>(null);
  const connectionRef = useRef<RTCPeerConnection | null>(null);

  useEffect(() => {
    let currentStream: MediaStream | null = null;
    
    const startMedia = async () => {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        setStream(mediaStream);
        if (myVideo.current) {
          myVideo.current.srcObject = mediaStream;
        }
        currentStream = mediaStream;

        if (incomingCallData) {
          // We are receiving a call, wait for user to accept (or accept immediately for this demo)
          // In a real app we'd wait for a button click, but let's just ring for a sec then they click accept.
        } else if (recipientId) {
          // We are initiating a call
          initiateCall(mediaStream);
        }
      } catch (err) {
        console.error("Failed to get media", err);
      }
    };

    startMedia();

    return () => {
      if (currentStream) {
        currentStream.getTracks().forEach((track) => track.stop());
      }
      if (connectionRef.current) {
        connectionRef.current.close();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  const initiateCall = async (mediaStream: MediaStream) => {
    const peer = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });
    connectionRef.current = peer;

    mediaStream.getTracks().forEach((track) => peer.addTrack(track, mediaStream));

    peer.ontrack = (event) => {
      if (userVideo.current) {
        userVideo.current.srcObject = event.streams[0];
        setCallStatus("connected");
      }
    };

    peer.onicecandidate = (event) => {
      if (event.candidate && socket) {
        socket.emit("iceCandidate", {
          to: recipientId,
          candidate: event.candidate,
        });
      }
    };

    const offer = await peer.createOffer();
    await peer.setLocalDescription(offer);

    if (socket) {
      socket.emit("callUser", {
        userToCall: recipientId,
        signalData: offer,
        from: currentUser.id,
        callerName: currentUser.username,
      });

      // Listen for answer
      socket.on("callAccepted", async (signal: RTCSessionDescriptionInit) => {
        setCallStatus("connected");
        await peer.setRemoteDescription(new RTCSessionDescription(signal));
      });

      // Listen for ICE candidates from the other side
      socket.on("iceCandidate", async (candidate: RTCIceCandidateInit) => {
        try {
          await peer.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e) {
          console.error("Error adding ice candidate", e);
        }
      });
    }
  };

  const acceptCall = async () => {
    if (!incomingCallData || !stream || !socket) return;
    
    setCallStatus("connected");

    const peer = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });
    connectionRef.current = peer;

    stream.getTracks().forEach((track) => peer.addTrack(track, stream));

    peer.ontrack = (event) => {
      if (userVideo.current) {
        userVideo.current.srcObject = event.streams[0];
      }
    };

    peer.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("iceCandidate", {
          to: incomingCallData.from,
          candidate: event.candidate,
        });
      }
    };

    await peer.setRemoteDescription(new RTCSessionDescription(incomingCallData.signal));
    const answer = await peer.createAnswer();
    await peer.setLocalDescription(answer);

    socket.emit("answerCall", {
      to: incomingCallData.from,
      signal: answer,
    });

    socket.on("iceCandidate", async (candidate: RTCIceCandidateInit) => {
      try {
        await peer.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (e) {
        console.error("Error adding ice candidate", e);
      }
    });
  };

  const endCall = () => {
    if (socket) {
      socket.emit("endCall", { to: recipientId || incomingCallData?.from });
    }
    setCallStatus("ended");
    onClose();
  };

  // Listen for remote end call
  useEffect(() => {
    if (!socket) return;
    const handleEndCall = () => {
      setCallStatus("ended");
      onClose();
    };
    socket.on("callEnded", handleEndCall);
    return () => {
      socket.off("callEnded", handleEndCall);
    };
  }, [socket, onClose]);

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 rounded-3xl w-full max-w-4xl overflow-hidden shadow-2xl border border-slate-800 relative flex flex-col md:flex-row h-[80vh] md:h-[60vh]">
        
        {/* Remote Video (Main) */}
        <div className="flex-1 bg-black relative flex items-center justify-center">
          <video
            playsInline
            ref={userVideo}
            autoPlay
            className="w-full h-full object-cover"
          />
          {callStatus === "ringing" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 z-10">
              <div className="h-20 w-20 rounded-full bg-slate-800 flex items-center justify-center animate-pulse mb-4">
                <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white">
                {incomingCallData ? `${incomingCallData.callerName} is calling...` : `Calling ${recipientName}...`}
              </h3>
            </div>
          )}
        </div>

        {/* Local Video (PIP) */}
        <div className="absolute bottom-6 right-6 w-32 md:w-48 aspect-[3/4] bg-slate-800 rounded-2xl overflow-hidden border-2 border-slate-700 shadow-xl z-20">
          <video
            playsInline
            muted
            ref={myVideo}
            autoPlay
            className="w-full h-full object-cover scale-x-[-1]" // mirror effect
          />
        </div>

        {/* Controls Overlay */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4 z-30">
          {incomingCallData && callStatus === "ringing" && (
            <button
              onClick={acceptCall}
              className="h-14 w-14 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center shadow-lg transition-transform hover:scale-110"
            >
              <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.94.725l.548 2.2a1 1 0 01-.321.988l-1.305.98a10.582 10.582 0 004.872 4.872l.98-1.305a1 1 0 01.988-.321l2.2.548a1 1 0 01.725.94V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
            </button>
          )}
          <button
            onClick={endCall}
            className="h-14 w-14 rounded-full bg-rose-500 hover:bg-rose-600 text-white flex items-center justify-center shadow-lg transition-transform hover:scale-110"
          >
            <svg className="w-7 h-7 rotate-[135deg]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.94.725l.548 2.2a1 1 0 01-.321.988l-1.305.98a10.582 10.582 0 004.872 4.872l.98-1.305a1 1 0 01.988-.321l2.2.548a1 1 0 01.725.94V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
          </button>
        </div>

      </div>
    </div>
  );
}
