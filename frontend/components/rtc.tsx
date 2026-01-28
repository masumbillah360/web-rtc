"use client";

import { useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";

const ROOM_ID = "room-1"; // later dynamic per call
const STUN_SERVER = {urls: "stun:stun.l.google.com:19302"};
const TURN_SERVER = {
    urls: "turn:YOUR_TURN_SERVER:3478",
    username: "TURN_USERNAME",
    credential: "TURN_PASSWORD",
};

export default function VideoChat() {
    const localVideoRef = useRef<HTMLVideoElement | null>(null);
    const remoteVideoRef = useRef<HTMLVideoElement | null>(null);

    const pcRef = useRef<RTCPeerConnection | null>(null);
    const socketRef = useRef<Socket | null>(null);

    const polite = useRef(false);
    const makingOffer = useRef(false);
    const ignoreOffer = useRef(false);
    const pendingCandidates = useRef<RTCIceCandidateInit[]>([]);

    useEffect(() => {
        const init = async () => {
            // 1️⃣ Get user media
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { width: 640, height: 480 },
                audio: true,
            });

            if (localVideoRef.current) localVideoRef.current.srcObject = stream;

            // 2️⃣ Create RTCPeerConnection
            const pc = new RTCPeerConnection({
                // iceServers: [STUN_SERVER, TURN_SERVER],
            });

            pcRef.current = pc;

            // Add local tracks
            stream.getTracks().forEach((track) => pc.addTrack(track, stream));

            // Remote stream
            pc.ontrack = (event) => {
                if (remoteVideoRef.current) remoteVideoRef.current.srcObject = event.streams[0];
            };

            // ICE candidates
            pc.onicecandidate = ({ candidate }) => {
                if (candidate && socketRef.current) {
                    socketRef.current.emit("ice-candidate", { roomId: ROOM_ID, candidate });
                }
            };

            // 3️⃣ Initialize Socket
            const socket = io("http://localhost:3001", { transports: ["websocket"] });
            socketRef.current = socket;

            socket.on("connect", () => {
                console.log("🟢 Socket connected:", socket.id);
                socket.emit("join-room", ROOM_ID);
            });

            socket.on("peer-joined", async () => {
                console.log("👤 Peer joined");
                polite.current = true;

                if (!pcRef.current) return;

                makingOffer.current = true;
                const offer = await pcRef.current.createOffer();
                await pcRef.current.setLocalDescription(offer);

                socket.emit("offer", { roomId: ROOM_ID, offer });
                makingOffer.current = false;
            });

            // Offer received
            socket.on("offer", async ({ offer }) => {
                const pc = pcRef.current;
                if (!pc) return;

                const offerCollision = makingOffer.current || pc.signalingState !== "stable";
                ignoreOffer.current = !polite.current && offerCollision;
                if (ignoreOffer.current) return;

                await pc.setRemoteDescription(offer);

                for (const c of pendingCandidates.current) {
                    await pc.addIceCandidate(c);
                }
                pendingCandidates.current = [];

                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);

                socket.emit("answer", { roomId: ROOM_ID, answer });
            });

            // Answer received
            socket.on("answer", async ({ answer }) => {
                const pc = pcRef.current;
                if (!pc) return;
                await pc.setRemoteDescription(answer);
            });

            // ICE candidate received
            socket.on("ice-candidate", async ({ candidate }) => {
                const pc = pcRef.current;
                if (!pc) return;
                if (pc.remoteDescription) {
                    await pc.addIceCandidate(candidate);
                } else {
                    pendingCandidates.current.push(candidate);
                }
            });
        };

        init();

        return () => {
            if (socketRef.current) socketRef.current.disconnect();
        };
    }, []);

    return (
        <div className="flex gap-4">
            <video ref={localVideoRef} autoPlay muted playsInline className="w-1/2 bg-black" />
            <video ref={remoteVideoRef} autoPlay playsInline className="w-1/2 bg-black" />
        </div>
    );
}
