"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Maximize, 
  Minimize, 
  RotateCcw, 
  X, 
  Sparkles, 
  Github, 
  Check, 
  FileText, 
  ArrowRight,
  TrendingUp,
  Layers,
  MessageSquare,
  AlertTriangle,
  Captions,
  User,
  Users
} from "lucide-react";

interface FilmModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const scenes = [
  { id: 1, title: "Intro", label: "01. Introduction", start: 0, end: 15 },
  { id: 2, title: "Problem", label: "02. The Pain Point", start: 15, end: 22.5 },
  { id: 3, title: "Reveal", label: "03. Introducing ContriTrack", start: 22.5, end: 30 },
  { id: 4, title: "GitHub", label: "04. Git Telemetry Sync", start: 30, end: 41.25 },
  { id: 5, title: "Tasks", label: "05. Kanban Orchestration", start: 41.25, end: 52.5 },
  { id: 6, title: "Analytics", label: "06. Contribution Metrics", start: 52.5, end: 63.75 },
  { id: 7, title: "Meetings", label: "07. Auditable Discussion Logs", start: 63.75, end: 75 },
  { id: 8, title: "PDF Reports", label: "08. Certified Audit Reports", start: 75, end: 78.75 },
  { id: 9, title: "Outro", label: "09. Start Collaborating Fairly", start: 78.75, end: 90 }
];

const narrationCues = [
  // Scene 1: Intro (Cues 0, 1, 2, 3)
  { id: 0, sceneId: 1, text: "Every student knows the feeling.", pauseMs: 800 },
  { id: 1, sceneId: 1, text: "The deadline gets closer...", pauseMs: 800 },
  { id: 2, sceneId: 1, text: "messages go unanswered...", pauseMs: 800 },
  { id: 3, sceneId: 1, text: "and somehow, one person ends up carrying the entire project.", pauseMs: 1500 },
  
  // Scene 2: Problem (Cues 4, 5)
  { id: 4, sceneId: 2, text: "Group projects were meant to build collaboration.", pauseMs: 800 },
  { id: 5, sceneId: 2, text: "But too often... they create frustration instead.", pauseMs: 1500 },
  
  // Scene 3: Reveal (Cues 6, 7)
  { id: 6, sceneId: 3, text: "So we built something different.", pauseMs: 800 },
  { id: 7, sceneId: 3, text: "A platform designed for transparency... accountability... and fair collaboration.", pauseMs: 1500 },
  
  // Scene 4: GitHub (Cues 8, 9, 10)
  { id: 8, sceneId: 4, text: "ContriTrack automatically tracks GitHub activity,", pauseMs: 600 },
  { id: 9, sceneId: 4, text: "repository contributions, pull requests,", pauseMs: 600 },
  { id: 10, sceneId: 4, text: "and coding progress... in real time.", pauseMs: 1500 },
  
  // Scene 5: Tasks (Cues 11, 12, 13)
  { id: 11, sceneId: 5, text: "Assign responsibilities beautifully.", pauseMs: 600 },
  { id: 12, sceneId: 5, text: "Track deadlines effortlessly.", pauseMs: 600 },
  { id: 13, sceneId: 5, text: "And organize every task with clarity your team can actually follow.", pauseMs: 1500 },
  
  // Scene 6: Analytics (Cues 14, 15, 16)
  { id: 14, sceneId: 6, text: "See exactly who contributed.", pauseMs: 600 },
  { id: 15, sceneId: 6, text: "Visualize team performance.", pauseMs: 600 },
  { id: 16, sceneId: 6, text: "And replace assumptions with real evidence.", pauseMs: 1500 },
  
  // Scene 7: Meetings (Cues 17, 18, 19)
  { id: 17, sceneId: 7, text: "Every discussion.", pauseMs: 500 },
  { id: 18, sceneId: 7, text: "Every meeting.", pauseMs: 500 },
  { id: 19, sceneId: 7, text: "Every decision... beautifully documented.", pauseMs: 1500 },
  
  // Scene 8: PDF Reports (Cue 20)
  { id: 20, sceneId: 8, text: "Generate professor-ready reports instantly... with contribution proof your entire team can trust.", pauseMs: 2000 },
  
  // Scene 9: Outro (Cues 21, 22, 23)
  { id: 21, sceneId: 9, text: "Because collaboration should feel fair.", pauseMs: 800 },
  { id: 22, sceneId: 9, text: "And every contribution should matter.", pauseMs: 800 },
  { id: 23, sceneId: 9, text: "ContriTrack.", pauseMs: 2500 }
];

export default function FilmModal({ isOpen, onClose }: FilmModalProps) {
  const [isPlaying, setIsPlaying] = useState(true);
  const [activeCueIdx, setActiveCueIdx] = useState(0);
  const [cueProgress, setCueProgress] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [showSubtitles, setShowSubtitles] = useState(true);
  const [narratorGender, setNarratorGender] = useState<"female" | "male">("female");
  const [volume, setVolume] = useState(80);
  const totalDuration = 90; // 90 seconds simulated film

  const modalRef = useRef<HTMLDivElement>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pauseTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const speechUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const particleCanvasRef = useRef<HTMLCanvasElement>(null);
  const visualizerCanvasRef = useRef<HTMLCanvasElement>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Web Audio refs for real-time ambient synthesis
  const audioContextRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const synthNodesRef = useRef<AudioNode[]>([]);

  // Compute current time dynamically
  const currentTime = ((activeCueIdx + cueProgress) / narrationCues.length) * totalDuration;

  // Determine active cue and active scene dynamically
  const activeCue = narrationCues[activeCueIdx];
  const activeSceneId = activeCue ? activeCue.sceneId : 1;
  const activeSceneIdx = scenes.findIndex(s => s.id === activeSceneId);
  const activeScene = activeSceneIdx !== -1 ? scenes[activeSceneIdx] : scenes[0];

  // Ref for recursive cue triggers
  const triggerActiveCueRef = React.useRef<(cueIdx: number) => void>(() => {});

  // Dynamic cue trigger manager
  const triggerActiveCue = React.useCallback((cueIdx: number) => {
    // 1. Clear any active intervals/timeouts and remove utterance listeners
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    if (pauseTimeoutRef.current) clearTimeout(pauseTimeoutRef.current);
    if (speechUtteranceRef.current) {
      speechUtteranceRef.current.onend = null;
      speechUtteranceRef.current.onerror = null;
      speechUtteranceRef.current = null;
    }
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }

    const cue = narrationCues[cueIdx];
    if (!cue) return;

    // Reset progress for this cue
    setCueProgress(0);

    // Calculate speech/reading duration
    const textLength = cue.text.length;
    const estimatedSpeechDuration = Math.max(2200, textLength * 70); // ms

    // Start interval to smoothly animate progress bar
    const tickMs = 50;
    let elapsedMs = 0;
    progressIntervalRef.current = setInterval(() => {
      elapsedMs += tickMs;
      const progress = Math.min(1.0, elapsedMs / estimatedSpeechDuration);
      setCueProgress(progress);
      if (progress >= 1.0) {
        if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      }
    }, tickMs);

    // Transition handling function
    const startPostSpeechPause = () => {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      setCueProgress(1.0);

      pauseTimeoutRef.current = setTimeout(() => {
        // Move to next cue if available
        if (cueIdx < narrationCues.length - 1) {
          setActiveCueIdx(cueIdx + 1);
          triggerActiveCueRef.current(cueIdx + 1);
        } else {
          setIsPlaying(false);
        }
      }, cue.pauseMs);
    };

    // If muted or speech synthesis is not supported/available, trigger fallback timer
    const hasSpeechSynth = typeof window !== "undefined" && window.speechSynthesis;
    if (isMuted || !hasSpeechSynth) {
      pauseTimeoutRef.current = setTimeout(() => {
        startPostSpeechPause();
      }, estimatedSpeechDuration);
      return;
    }

    // Voice Synthesis flow
    try {
      const utterance = new SpeechSynthesisUtterance(cue.text);
      speechUtteranceRef.current = utterance;
      const voices = window.speechSynthesis.getVoices();

      // Look for ideal high-fidelity narrative voices
      let activeVoice = null;
      if (narratorGender === "female") {
        activeVoice = voices.find(v => 
          v.name.includes("Samantha") || 
          v.name.includes("Zira") || 
          v.name.includes("Google US English") || 
          v.name.includes("Microsoft Zira") ||
          v.name.includes("female") || 
          v.name.includes("Female")
        );
      } else {
        activeVoice = voices.find(v => 
          v.name.includes("David") || 
          v.name.includes("Alex") || 
          v.name.includes("Google US English Male") || 
          v.name.includes("Microsoft David") ||
          v.name.includes("male") || 
          v.name.includes("Male")
        );
      }

      if (activeVoice) {
        utterance.voice = activeVoice;
      }

      // Voice calibrations for premium narrative tone
      if (narratorGender === "female") {
        utterance.pitch = 1.12;
        utterance.rate = 0.85;
      } else {
        utterance.pitch = 0.85;
        utterance.rate = 0.82;
      }

      utterance.volume = (volume / 100) * 0.85;

      utterance.onend = () => {
        startPostSpeechPause();
      };

      utterance.onerror = (e) => {
        console.warn("Speech Synthesis error, falling back to estimated timer", e);
        startPostSpeechPause();
      };

      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.error("Speech Synthesis failed, falling back", err);
      pauseTimeoutRef.current = setTimeout(() => {
        startPostSpeechPause();
      }, estimatedSpeechDuration);
    }
  }, [isMuted, narratorGender, volume]);

  React.useEffect(() => {
    triggerActiveCueRef.current = triggerActiveCue;
  }, [triggerActiveCue]);

  // Timeline Scrubber scrubbing logic snapping to start of nearest cue
  const handleScrub = React.useCallback((timeVal: number) => {
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    if (pauseTimeoutRef.current) clearTimeout(pauseTimeoutRef.current);
    if (speechUtteranceRef.current) {
      speechUtteranceRef.current.onend = null;
      speechUtteranceRef.current.onerror = null;
      speechUtteranceRef.current = null;
    }
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }

    const progressFraction = timeVal / totalDuration;
    const floatCueIdx = progressFraction * narrationCues.length;
    const targetIdx = Math.min(narrationCues.length - 1, Math.max(0, Math.floor(floatCueIdx)));
    
    // Snap to the start of the target cue
    setActiveCueIdx(targetIdx);
    setCueProgress(0);

    if (isPlaying) {
      triggerActiveCue(targetIdx);
    }
  }, [isPlaying, triggerActiveCue]);

  // Replay from beginning helper
  const handleReplay = React.useCallback(() => {
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    if (pauseTimeoutRef.current) clearTimeout(pauseTimeoutRef.current);
    if (speechUtteranceRef.current) {
      speechUtteranceRef.current.onend = null;
      speechUtteranceRef.current.onerror = null;
      speechUtteranceRef.current = null;
    }
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }

    setActiveCueIdx(0);
    setCueProgress(0);
    setIsPlaying(true);
    triggerActiveCue(0);
  }, [triggerActiveCue]);

  // Real-time Sound Design synthesizer via Web Audio API
  const startAmbientSynth = React.useCallback(() => {
    if (typeof window === "undefined") return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!audioContextRef.current) {
        const ctx = new AudioCtx();
        audioContextRef.current = ctx;

        // Visualizer Analysis node
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 64;
        analyserRef.current = analyser;

        // Master Volume Gain node
        const masterGain = ctx.createGain();
        masterGain.gain.setValueAtTime(isMuted ? 0 : (volume / 100) * 0.15, ctx.currentTime);
        masterGainRef.current = masterGain;

        analyser.connect(masterGain);
        masterGain.connect(ctx.destination);

        // Cinematic feedback echo delay networks
        const delayNode = ctx.createDelay();
        delayNode.delayTime.value = 0.6;
        const feedbackGain = ctx.createGain();
        feedbackGain.gain.value = 0.45;

        delayNode.connect(feedbackGain);
        feedbackGain.connect(delayNode);
        feedbackGain.connect(analyser);

        // Drone Synthesizer pad chords (C minor ambient breathing scale)
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const lowpassFilter = ctx.createBiquadFilter();

        osc1.type = "sine";
        osc1.frequency.value = 65.41; // Low drone C2
        osc2.type = "triangle";
        osc2.frequency.value = 130.81; // Mid breathing C3

        lowpassFilter.type = "lowpass";
        lowpassFilter.frequency.value = 320;

        const padGain = ctx.createGain();
        padGain.gain.value = 0.08;

        osc1.connect(lowpassFilter);
        osc2.connect(lowpassFilter);
        lowpassFilter.connect(padGain);
        padGain.connect(analyser);

        osc1.start();
        osc2.start();

        synthNodesRef.current.push(osc1, osc2, padGain, lowpassFilter);

        // Low frequency breathing modulator
        const lfoOsc = ctx.createOscillator();
        const lfoGain = ctx.createGain();
        lfoOsc.type = "sine";
        lfoOsc.frequency.value = 0.12; // breathing speed
        lfoGain.gain.value = 140;

        lfoOsc.connect(lfoGain);
        lfoGain.connect(lowpassFilter.frequency);
        lfoOsc.start();

        synthNodesRef.current.push(lfoOsc, lfoGain);

        // Dynamic Randomized Piano Chime droplets (C minor Pentatonic scale chimes)
        const dropletInterval = setInterval(() => {
          if (ctx.state === "suspended") return;
          if (isMuted || !isPlaying) return;

          const minorNotes = [261.63, 293.66, 311.13, 392.00, 440.00, 523.25, 587.33, 622.25];
          const chosenFreq = minorNotes[Math.floor(Math.random() * minorNotes.length)];

          const pianoOsc = ctx.createOscillator();
          const pianoGain = ctx.createGain();

          pianoOsc.type = "sine";
          pianoOsc.frequency.value = chosenFreq;

          pianoGain.gain.setValueAtTime(0, ctx.currentTime);
          pianoGain.gain.linearRampToValueAtTime(0.05, ctx.currentTime + 0.04);
          pianoGain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 2.4);

          pianoOsc.connect(pianoGain);
          pianoGain.connect(analyser); // dry sound
          pianoGain.connect(delayNode); // wet sound echo

          pianoOsc.start();
          pianoOsc.stop(ctx.currentTime + 2.8);
        }, 3200);

        (window as unknown as { dropletIntervalId: NodeJS.Timeout }).dropletIntervalId = dropletInterval;
      }

      if (audioContextRef.current.state === "suspended") {
        audioContextRef.current.resume();
      }
    } catch (e) {
      console.error("Synthesizer failed to load", e);
    }
  }, [isMuted, isPlaying, volume]);

  // Dynamically update audio gain nodes when volume/mute updates
  useEffect(() => {
    if (masterGainRef.current && audioContextRef.current) {
      const targetVolume = isMuted ? 0 : (volume / 100) * 0.15;
      masterGainRef.current.gain.linearRampToValueAtTime(targetVolume, audioContextRef.current.currentTime + 0.15);
    }
  }, [volume, isMuted]);

  // Synchronized background music swells based on active scene index
  useEffect(() => {
    if (!audioContextRef.current || isMuted || !isPlaying) return;
    
    // Scene 3: Introducing ContriTrack - rise music frequencies
    const lowpassNode = synthNodesRef.current.find(node => node instanceof BiquadFilterNode);
    if (lowpassNode) {
      if (activeScene.id === 3) {
        lowpassNode.frequency.exponentialRampToValueAtTime(750, audioContextRef.current.currentTime + 1.5);
      } else if (activeScene.id === 8) {
        lowpassNode.frequency.exponentialRampToValueAtTime(880, audioContextRef.current.currentTime + 1.0); // success chime filter opens
      } else {
        lowpassNode.frequency.exponentialRampToValueAtTime(320, audioContextRef.current.currentTime + 2.0); // breathing background drone
      }
    }
  }, [activeScene.id, isPlaying, isMuted]);

  // Playback timeline controller driver
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (isOpen && isPlaying) {
      timer = setTimeout(() => {
        triggerActiveCue(activeCueIdx);
      }, 0);
      startAmbientSynth();
    } else {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      if (pauseTimeoutRef.current) clearTimeout(pauseTimeoutRef.current);
      if (speechUtteranceRef.current) {
        speechUtteranceRef.current.onend = null;
        speechUtteranceRef.current.onerror = null;
        speechUtteranceRef.current = null;
      }
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    }

    return () => {
      if (timer) clearTimeout(timer);
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      if (pauseTimeoutRef.current) clearTimeout(pauseTimeoutRef.current);
      if (speechUtteranceRef.current) {
        speechUtteranceRef.current.onend = null;
        speechUtteranceRef.current.onerror = null;
        speechUtteranceRef.current = null;
      }
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, isPlaying]);

  // Restart active cue speech when narrator settings or mute state changes dynamically
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (isOpen && isPlaying) {
      timer = setTimeout(() => {
        triggerActiveCue(activeCueIdx);
      }, 0);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [narratorGender, isMuted]);

  // Particle background canvas animation (Snowfall + Cinematic floating dust)
  useEffect(() => {
    if (!isOpen) return;

    const canvas = particleCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", handleResize);

    const particles: Array<{
      x: number;
      y: number;
      radius: number;
      speedY: number;
      speedX: number;
      opacity: number;
      amplitude: number;
      frequency: number;
      color: string;
    }> = [];

    const colors = ["#F2C1A3", "#F8CCAA", "#CD9FA0", "#857C91"];

    for (let i = 0; i < 60; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: Math.random() * 1.5 + 0.5,
        speedY: Math.random() * 0.4 + 0.1,
        speedX: Math.random() * 0.2 - 0.1,
        opacity: Math.random() * 0.4 + 0.1,
        amplitude: Math.random() * 15,
        frequency: Math.random() * 0.01 + 0.005,
        color: colors[Math.floor(Math.random() * colors.length)]
      });
    }

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      particles.forEach(p => {
        p.y += p.speedY;
        p.x += p.speedX + Math.sin(p.y * p.frequency) * 0.05;

        if (p.y > height) {
          p.y = -10;
          p.x = Math.random() * width;
        }
        if (p.x > width) p.x = 0;
        if (p.x < 0) p.x = width;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.opacity;
        ctx.shadowBlur = 4;
        ctx.shadowColor = p.color;
        ctx.fill();
        ctx.globalAlpha = 1.0;
        ctx.shadowBlur = 0;
      });

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [isOpen]);

  // Real-time Canvas-based Frequency Equalizer visualizer
  useEffect(() => {
    if (!isOpen) return;

    let visualFrameId: number;
    const canvas = visualizerCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const bufferLength = 24;
    const dataArray = new Uint8Array(bufferLength);

    const drawVisualizer = () => {
      visualFrameId = requestAnimationFrame(drawVisualizer);

      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      if (analyserRef.current && isPlaying && !isMuted) {
        analyserRef.current.getByteFrequencyData(dataArray);
      } else {
        // Fallback breathing curves when muted/paused
        for (let i = 0; i < bufferLength; i++) {
          dataArray[i] = isPlaying 
            ? Math.max(8, Math.floor(Math.sin((Date.now() / 250) + i * 0.6) * 15 + 20))
            : 4; // idle flat lines
        }
      }

      const barWidth = (width / bufferLength) * 1.4;
      let barHeight;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        barHeight = (dataArray[i] / 255) * height * 0.95;
        barHeight = Math.max(3, barHeight);

        const grad = ctx.createLinearGradient(0, height, 0, height - barHeight);
        grad.addColorStop(0, "#CD9FA0");
        grad.addColorStop(0.5, "#F2C1A3");
        grad.addColorStop(1, "#F8CCAA");

        ctx.fillStyle = grad;
        ctx.fillRect(x, height - barHeight, barWidth - 1.5, barHeight);

        x += barWidth;
      }
    };

    drawVisualizer();

    return () => {
      cancelAnimationFrame(visualFrameId);
    };
  }, [isOpen, isPlaying, isMuted]);


  // Fullscreen support
  const toggleFullscreen = () => {
    if (!modalRef.current) return;
    if (!document.fullscreenElement) {
      modalRef.current.requestFullscreen().then(() => setIsFullscreen(true));
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false));
    }
  };

  // Keyboard Escape listener to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
      if (e.key === " " && isOpen) {
        e.preventDefault();
        setIsPlaying(prev => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Controls Auto-Hide
  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) setShowControls(false);
    }, 4500);
  };

  useEffect(() => {
    return () => {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, []);

  // Complete Sound design and Voice cancel cleanups upon close
  useEffect(() => {
    if (!isOpen) {
      if (typeof window !== "undefined") {
        if (window.speechSynthesis) window.speechSynthesis.cancel();
        if ((window as unknown as { dropletIntervalId: NodeJS.Timeout }).dropletIntervalId) {
          clearInterval((window as unknown as { dropletIntervalId: NodeJS.Timeout }).dropletIntervalId);
        }
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
      masterGainRef.current = null;
      analyserRef.current = null;
      synthNodesRef.current = [];
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        ref={modalRef}
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        onMouseMove={handleMouseMove}
        className="fixed inset-0 z-50 bg-[#090a10] overflow-hidden flex flex-col justify-between select-none"
      >
        {/* Background Canvas particles */}
        <canvas ref={particleCanvasRef} className="absolute inset-0 z-0 pointer-events-none" />

        {/* Ambient background glows */}
        <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 -z-10 w-[700px] h-[700px] rounded-full bg-[#CD9FA0] opacity-[0.03] blur-[150px] pointer-events-none animate-pulse-gentle" />
        <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 -z-10 w-[800px] h-[800px] rounded-full bg-[#F2C1A3] opacity-[0.03] blur-[180px] pointer-events-none animate-pulse-gentle delay-3s" />

        {/* Film Top Ambient Spotlight Sweep */}
        <div className="absolute inset-0 bg-gradient-to-t from-transparent via-[#CD9FA0]/[0.005] to-[#F2C1A3]/[0.015] pointer-events-none z-10" />

        {/* ----------------- TOP BAR ----------------- */}
        <motion.div 
          animate={{ opacity: showControls ? 1 : 0, y: showControls ? 0 : -20 }}
          transition={{ duration: 0.4 }}
          className="w-full flex items-center justify-between py-6 px-6 md:px-12 bg-gradient-to-b from-[#090a10]/80 to-transparent backdrop-blur-md border-b border-white/5 relative z-40"
        >
          {/* Brand Logo & Film Indicator */}
          <div className="flex items-center gap-3">
            <span className="font-serif text-lg tracking-wider text-white flex items-center gap-2">
              <Sparkles size={16} className="text-[#F2C1A3]" /> ContriTrack
            </span>
            <span className="px-2 py-0.5 rounded bg-[#F2C1A3]/10 border border-[#F2C1A3]/20 text-[9px] font-mono text-[#F2C1A3] uppercase tracking-widest">
              Cinematic Film
            </span>
          </div>

          {/* Current Scene Display */}
          <div className="hidden md:flex items-center gap-2 text-xs text-[#857C91] font-light">
            <span>Now Showing:</span>
            <span className="font-mono text-[#F2C1A3] font-medium">{activeScene.label}</span>
          </div>

          {/* Close trigger */}
          <button
            onClick={onClose}
            className="p-2.5 rounded-full bg-white/[0.02] border border-white/10 hover:border-white/20 text-[#857C91] hover:text-white transition duration-300 backdrop-blur-md cursor-pointer hover:scale-105"
            aria-label="Close Film Modal"
          >
            <X size={16} />
          </button>
        </motion.div>

        {/* ----------------- SCREEN FILM CANVAS (SCENES) ----------------- */}
        <div className="flex-1 w-full max-w-7xl mx-auto flex items-center justify-center relative px-6 md:px-12 py-10 z-20">
          <AnimatePresence mode="wait">
            {/* SCENE 1: Introduction */}
            {activeScene.id === 1 && (
              <motion.div
                key="scene-1"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.05 }}
                transition={{ duration: 0.8 }}
                className="flex flex-col items-center justify-center text-center max-w-3xl"
              >
                <motion.h2 
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5, duration: 0.8 }}
                  className="text-4xl md:text-6xl font-normal text-white font-serif tracking-wide leading-tight mb-6"
                >
                  Group projects were never truly fair.
                </motion.h2>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.6 }}
                  transition={{ delay: 1.5, duration: 1 }}
                  className="text-[#857C91] font-light text-base md:text-lg tracking-wide uppercase font-mono"
                >
                  A simulated narrative on teamwork contribution
                </motion.p>
              </motion.div>
            )}

            {/* SCENE 2: The Pain Point */}
            {activeScene.id === 2 && (
              <motion.div
                key="scene-2"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.6 }}
                className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center w-full"
              >
                <div className="lg:col-span-5 text-left flex flex-col gap-4">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-mono uppercase tracking-widest font-semibold">
                    <AlertTriangle size={10} /> The Reality of Social Loafing
                  </div>
                  <h2 className="text-3xl md:text-5xl font-serif text-white tracking-tight leading-tight">
                    One person works.<br />Everyone gets credit.
                  </h2>
                  <p className="text-[#857C91] text-sm md:text-base font-light leading-relaxed">
                    Unequal contributions breed resentment. Silent group members collect equal marks while developers take the entire weight of academic stress.
                  </p>
                </div>

                {/* Visual mockup of chaos */}
                <div className="lg:col-span-7 flex justify-center">
                  <div className="w-full max-w-lg p-6 rounded-3xl border border-red-500/10 bg-[#160b0f]/50 relative overflow-hidden shadow-2xl backdrop-blur-md">
                    <div className="absolute top-0 right-0 h-40 w-40 rounded-full bg-red-500/[0.03] blur-3xl pointer-events-none" />
                    
                    {/* Chaotic Messages Mockup */}
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center justify-between text-[9px] font-mono text-red-400 border-b border-red-500/10 pb-2 mb-2">
                        <span>Project Status Check</span>
                        <span>4 missed milestones</span>
                      </div>
                      
                      <div className="flex gap-3 p-3 rounded-xl bg-white/[0.01] border border-white/5 opacity-55">
                        <div className="w-7 h-7 rounded-full bg-[#857C91] text-[#12131e] font-semibold text-[10px] flex items-center justify-center shrink-0">RM</div>
                        <div className="flex-1 text-left">
                          <div className="flex justify-between items-center text-[10px] font-mono text-[#857C91]">
                            <span>Rohan (Developer)</span>
                            <span>Sunday 11:20 PM</span>
                          </div>
                          <p className="text-[#857C91] text-xs font-light mt-1">{"Is anyone going to help finish the API endpoints? I've been coding all weekend alone."}</p>
                        </div>
                      </div>

                      <div className="flex gap-3 p-3 rounded-xl bg-white/[0.01] border border-white/5 opacity-[0.25]">
                        <div className="w-7 h-7 rounded-full bg-[#CD9FA0] text-[#12131e] font-semibold text-[10px] flex items-center justify-center shrink-0">IV</div>
                        <div className="flex-1 text-left">
                          <div className="flex justify-between items-center text-[10px] font-mono text-[#857C91]">
                            <span>Ishaan (Inactive)</span>
                            <span>Seen 2 days ago</span>
                          </div>
                          <p className="text-[#857C91] text-xs font-light mt-1">No response...</p>
                        </div>
                      </div>

                      {/* Uneven contribution bar graph */}
                      <div className="mt-4 p-4 rounded-2xl bg-white/[0.01] border border-white/5">
                        <span className="text-[10px] font-mono text-[#857C91] block text-left mb-2">Task Share Breakdown</span>
                        <div className="flex flex-col gap-2">
                          <div>
                            <div className="flex justify-between text-[9px] text-white/80 font-mono mb-1">
                              <span>Rohan (Coding)</span>
                              <span>94%</span>
                            </div>
                            <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                              <motion.div className="h-full bg-red-400" initial={{ width: 0 }} animate={{ width: "94%" }} transition={{ duration: 1.2 }} />
                            </div>
                          </div>
                          <div>
                            <div className="flex justify-between text-[9px] text-[#857C91] font-mono mb-1">
                              <span>Ishaan (Analyst)</span>
                              <span>6%</span>
                            </div>
                            <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                              <div className="h-full bg-[#857C91]/30 w-[6%]" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* SCENE 3: Introducing ContriTrack */}
            {activeScene.id === 3 && (
              <motion.div
                key="scene-3"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.8 }}
                className="flex flex-col items-center justify-center text-center max-w-4xl"
              >
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -z-10 w-[550px] h-[550px] rounded-full bg-gradient-to-r from-[#F2C1A3] to-[#CD9FA0] opacity-10 blur-[130px] pointer-events-none" />
                
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 100, damping: 20 }}
                  className="mb-8 p-4 rounded-3xl bg-gradient-to-br from-white/10 to-transparent border border-white/10 flex items-center justify-center shadow-2xl relative"
                >
                  <div className="absolute inset-0 rounded-3xl bg-[#F2C1A3]/5 opacity-50 blur-md" />
                  <Sparkles size={50} className="text-[#F2C1A3] animate-pulse" />
                </motion.div>

                <motion.h2 
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="text-4xl md:text-7xl font-normal text-white font-serif tracking-tight leading-tight mb-4"
                >
                  ContriTrack.
                </motion.h2>

                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.8 }}
                  transition={{ delay: 1.0 }}
                  className="text-lg md:text-2xl font-light text-[#F2C1A3] tracking-wide max-w-2xl font-serif italic"
                >
                  Built for transparency, accountability, and academic fair play.
                </motion.p>
              </motion.div>
            )}

            {/* SCENE 4: Git Telemetry Sync */}
            {activeScene.id === 4 && (
              <motion.div
                key="scene-4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.6 }}
                className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center w-full"
              >
                <div className="lg:col-span-5 text-left flex flex-col gap-4">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F2C1A3]/10 border border-[#F2C1A3]/20 text-[#F2C1A3] text-[10px] font-mono uppercase tracking-widest font-semibold">
                    <Github size={10} /> Auto-Sync Integration
                  </div>
                  <h2 className="text-3xl md:text-5xl font-serif text-white tracking-tight leading-tight">
                    Track real work automatically.
                  </h2>
                  <p className="text-[#857C91] text-sm md:text-base font-light leading-relaxed">
                    By connecting directly with GitHub repositories, ContriTrack securely audits coding activities. Say goodbye to dynamic self-reports and subjective reviews.
                  </p>
                </div>

                {/* Animated branches flow */}
                <div className="lg:col-span-7 flex justify-center">
                  <div className="w-full max-w-lg p-6 rounded-3xl border border-white/5 bg-[#141523]/45 shadow-2xl backdrop-blur-md relative overflow-hidden flex flex-col gap-4">
                    <div className="absolute top-0 right-0 h-40 w-40 rounded-full bg-[#F2C1A3]/5 blur-3xl pointer-events-none" />
                    
                    <div className="flex items-center justify-between text-[10px] font-mono text-[#857C91] border-b border-white/5 pb-3">
                      <span className="flex items-center gap-1.5 text-white"><Github size={12} /> secure-oauth-sync</span>
                      <span className="text-emerald-400 animate-pulse">● active telemetry synced</span>
                    </div>

                    {/* Commit nodes graph */}
                    <div className="relative h-44 rounded-xl border border-white/5 bg-white/[0.01] p-4 flex flex-col justify-between overflow-hidden">
                      {/* Grid background lines */}
                      <div className="absolute inset-0 bg-grid-pattern opacity-10" />

                      <div className="flex items-center justify-between relative z-10">
                        <span className="text-[10px] font-mono text-[#857C91]">Branch: main</span>
                        <span className="text-[9px] font-mono text-emerald-400">8 commits parsed</span>
                      </div>

                      {/* Visual commits list */}
                      <div className="flex flex-col gap-2.5 relative z-10 mt-2">
                        {[
                          { author: "AS", msg: "Refactored dashboard components", hash: "4d9a3b", time: "2 min ago", color: "bg-[#F2C1A3]" },
                          { author: "AS", msg: "Implemented OAuth integration endpoints", hash: "7f1e9c", time: "15 min ago", color: "bg-[#F2C1A3]" },
                          { author: "RM", msg: "Updated core models & schemas", hash: "a3b9d0", time: "1 hour ago", color: "bg-[#F8CCAA]" }
                        ].map((commit, cIdx) => (
                          <motion.div 
                            key={cIdx} 
                            initial={{ opacity: 0, x: -15 }} 
                            animate={{ opacity: 1, x: 0 }} 
                            transition={{ delay: cIdx * 0.25 }}
                            className="flex items-center justify-between p-2 rounded-lg bg-white/[0.02] border border-white/5 text-[10px] hover:border-white/10 hover:bg-white/[0.03] transition duration-200"
                          >
                            <div className="flex items-center gap-2">
                              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[#12131e] font-bold text-[9px] ${commit.color}`}>{commit.author}</span>
                              <span className="text-white/90 font-light truncate max-w-[200px]">{commit.msg}</span>
                            </div>
                            <div className="flex items-center gap-3 font-mono text-[#857C91]">
                              <span className="text-[#F2C1A3]/80 hover:text-white transition cursor-pointer">{commit.hash}</span>
                              <span>{commit.time}</span>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* SCENE 5: Kanban Orchestration */}
            {activeScene.id === 5 && (
              <motion.div
                key="scene-5"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.6 }}
                className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center w-full"
              >
                <div className="lg:col-span-5 text-left flex flex-col gap-4">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F8CCAA]/10 border border-[#F8CCAA]/20 text-[#F8CCAA] text-[10px] font-mono uppercase tracking-widest font-semibold">
                    <Layers size={10} /> Task Orchestration
                  </div>
                  <h2 className="text-3xl md:text-5xl font-serif text-white tracking-tight leading-tight">
                    Organize every responsibility beautifully.
                  </h2>
                  <p className="text-[#857C91] text-sm md:text-base font-light leading-relaxed">
                    Map out core deliverables. Drag and drop task ownerships in synchronous Kanban boards, linking code progression instantly to the active workspace.
                  </p>
                </div>

                {/* Animated Kanban cards */}
                <div className="lg:col-span-7 flex justify-center">
                  <div className="w-full max-w-lg p-6 rounded-3xl border border-white/5 bg-[#141523]/45 shadow-2xl backdrop-blur-md relative overflow-hidden flex flex-col gap-4">
                    <div className="absolute top-0 right-0 h-40 w-40 rounded-full bg-[#F8CCAA]/5 blur-3xl pointer-events-none" />
                    
                    <div className="flex items-center justify-between text-[10px] font-mono text-[#857C91] border-b border-white/5 pb-3">
                      <span>Collaborative Kanban Board</span>
                      <span>3 Columns</span>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      {/* Column 1: To Do */}
                      <div className="flex flex-col gap-2 bg-white/[0.01] border border-white/5 rounded-xl p-2.5 min-h-[170px] text-left">
                        <span className="text-[9px] font-mono text-[#857C91] uppercase tracking-wider block border-b border-white/5 pb-1 mb-1">To Do (1)</span>
                        <div className="p-2 rounded-lg bg-white/[0.02] border border-white/5 text-[9px] flex flex-col gap-1.5">
                          <span className="text-white/80 leading-snug">Design landing slides</span>
                          <span className="text-[#CD9FA0] font-mono">AS • High</span>
                        </div>
                      </div>

                      {/* Column 2: In Progress */}
                      <div className="flex flex-col gap-2 bg-white/[0.01] border border-white/5 rounded-xl p-2.5 min-h-[170px] text-left">
                        <span className="text-[9px] font-mono text-[#857C91] uppercase tracking-wider block border-b border-white/5 pb-1 mb-1 text-[#F2C1A3]">In Progress</span>
                        <motion.div 
                          initial={{ y: 20, opacity: 0 }}
                          animate={{ y: 0, opacity: 1 }}
                          transition={{ delay: 0.5 }}
                          className="p-2 rounded-lg bg-white/[0.02] border border-[#F2C1A3]/25 text-[9px] flex flex-col gap-1.5 shadow-[0_0_10px_rgba(242,193,163,0.02)]"
                        >
                          <span className="text-white/80 leading-snug font-medium">Create Film Modal</span>
                          <span className="text-[#F2C1A3] font-mono">AS • Medium</span>
                        </motion.div>
                      </div>

                      {/* Column 3: Done */}
                      <div className="flex flex-col gap-2 bg-white/[0.01] border border-white/5 rounded-xl p-2.5 min-h-[170px] text-left">
                        <span className="text-[9px] font-mono text-[#857C91] uppercase tracking-wider block border-b border-white/5 pb-1 mb-1 text-emerald-400">Done (1)</span>
                        <div className="p-2 rounded-lg bg-[#14231b]/35 border border-emerald-500/20 text-[9px] flex flex-col gap-1.5 relative overflow-hidden">
                          <div className="absolute top-1 right-1 w-3 h-3 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                            <Check size={8} />
                          </div>
                          <span className="text-[#857C91] line-through leading-snug">Sync pricing plans</span>
                          <span className="text-[#857C91] font-mono">RM • Sync Done</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* SCENE 6: Contribution Metrics */}
            {activeScene.id === 6 && (
              <motion.div
                key="scene-6"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.6 }}
                className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center w-full"
              >
                <div className="lg:col-span-5 text-left flex flex-col gap-4">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#CD9FA0]/10 border border-[#CD9FA0]/20 text-[#CD9FA0] text-[10px] font-mono uppercase tracking-widest font-semibold">
                    <TrendingUp size={10} /> Certified Contribution Matrix
                  </div>
                  <h2 className="text-3xl md:text-5xl font-serif text-white tracking-tight leading-tight">
                    Know exactly who contributed.
                  </h2>
                  <p className="text-[#857C91] text-sm md:text-base font-light leading-relaxed">
                    Compare contribution metrics with direct radial pacing meters and contribution statistics, ensuring every single grading metric corresponds strictly to transparent telemetry.
                  </p>
                </div>

                {/* Animated Analytics Dashboard */}
                <div className="lg:col-span-7 flex justify-center">
                  <div className="w-full max-w-lg p-6 rounded-3xl border border-white/5 bg-[#141523]/45 shadow-2xl backdrop-blur-md relative overflow-hidden flex flex-col gap-4">
                    <div className="absolute top-0 right-0 h-40 w-40 rounded-full bg-[#CD9FA0]/5 blur-3xl pointer-events-none" />
                    
                    <div className="flex items-center justify-between text-[10px] font-mono text-[#857C91] border-b border-white/5 pb-3">
                      <span>Live Contribution Balance</span>
                      <span>Verified parity</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Metric Card 1 */}
                      <div className="p-4 rounded-2xl bg-white/[0.01] border border-white/5 text-left relative flex flex-col justify-between">
                        <span className="text-[10px] font-mono text-[#857C91] uppercase tracking-wider block mb-2">Team Sync Rating</span>
                        <div className="flex items-baseline gap-1 mt-1">
                          <span className="text-3xl font-serif text-white">96.8%</span>
                          <span className="text-emerald-400 text-[10px] font-mono font-medium">+4.2%</span>
                        </div>
                        <p className="text-[#857C91] text-[9px] font-light mt-2 leading-relaxed">Activity matches deadlines. Parity index verified high.</p>
                      </div>

                      {/* Metric Card 2 (Radial Graph Mock) */}
                      <div className="p-4 rounded-2xl bg-white/[0.01] border border-white/5 text-left flex items-center justify-between">
                        <div className="flex flex-col justify-between h-full">
                          <span className="text-[10px] font-mono text-[#857C91] uppercase tracking-wider block">Parity Balance</span>
                          <div className="mt-4">
                            <span className="text-2xl font-serif text-white">Balanced</span>
                            <span className="text-[9px] text-[#857C91] block mt-0.5">Parity: High</span>
                          </div>
                        </div>

                        {/* Circular Progress Ring SVGs */}
                        <div className="relative w-16 h-16 flex items-center justify-center shrink-0">
                          <svg className="w-full h-full transform -rotate-90">
                            <circle cx="32" cy="32" r="28" fill="transparent" stroke="rgba(255,255,255,0.03)" strokeWidth="3" />
                            <motion.circle 
                              cx="32" cy="32" r="28" fill="transparent" stroke="#F2C1A3" strokeWidth="3"
                              strokeDasharray={175}
                              initial={{ strokeDashoffset: 175 }}
                              animate={{ strokeDashoffset: 40 }}
                              transition={{ duration: 1.5, delay: 0.2 }}
                            />
                          </svg>
                          <span className="absolute text-[10px] font-mono text-white">82%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* SCENE 7: Auditable Discussion Logs */}
            {activeScene.id === 7 && (
              <motion.div
                key="scene-7"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.6 }}
                className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center w-full"
              >
                <div className="lg:col-span-5 text-left flex flex-col gap-4">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#857C91]/10 border border-[#857C91]/20 text-[#857C91] text-[10px] font-mono uppercase tracking-widest font-semibold">
                    <MessageSquare size={10} /> Meeting Auditing
                  </div>
                  <h2 className="text-3xl md:text-5xl font-serif text-white tracking-tight leading-tight">
                    Every discussion.<br />Every decision. Tracked.
                  </h2>
                  <p className="text-[#857C91] text-sm md:text-base font-light leading-relaxed">
                    Meeting minutes, attendance, checklists, and action item trackers ensure non-code contributions are graded as transparently and fairly as development commits.
                  </p>
                </div>

                {/* Animated Meeting Logs list */}
                <div className="lg:col-span-7 flex justify-center">
                  <div className="w-full max-w-lg p-6 rounded-3xl border border-white/5 bg-[#141523]/45 shadow-2xl backdrop-blur-md relative overflow-hidden flex flex-col gap-4">
                    <div className="absolute top-0 right-0 h-40 w-40 rounded-full bg-[#857C91]/5 blur-3xl pointer-events-none" />
                    
                    <div className="flex items-center justify-between text-[10px] font-mono text-[#857C91] border-b border-white/5 pb-3">
                      <span>Weekly Status Meeting</span>
                      <span>Verified Attendance</span>
                    </div>

                    <div className="flex flex-col gap-2.5">
                      <div className="p-3 rounded-xl bg-white/[0.01] border border-white/5 text-left">
                        <div className="flex items-center justify-between text-[10px] font-mono text-[#857C91] mb-1">
                          <span className="text-white font-medium">Sprint Review Meeting</span>
                          <span>May 15, 2026</span>
                        </div>
                        <p className="text-white/80 text-[11px] font-light">Discussed code repository structure, database schemas, and finalized frontend wireframes.</p>
                      </div>

                      <div className="p-3 rounded-xl bg-white/[0.01] border border-white/5 text-left">
                        <span className="text-[9px] font-mono text-[#857C91] uppercase tracking-wider block mb-2">Meeting Action Items</span>
                        <div className="flex flex-col gap-2">
                          {[
                            { name: "Aanya: Complete core auth workflow integration", checked: true },
                            { name: "Rohan: Write API routing test modules", checked: true },
                            { name: "Kabir: Format final Capstone PDF export report", checked: false }
                          ].map((item, idx) => (
                            <div key={idx} className="flex items-center gap-2 text-[10px]">
                              <div className={`w-3.5 h-3.5 rounded flex items-center justify-center shrink-0 border ${
                                item.checked 
                                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" 
                                  : "border-white/10 bg-white/[0.01] text-transparent"
                              }`}>
                                <Check size={8} />
                              </div>
                              <span className={`font-light ${item.checked ? "text-[#857C91] line-through" : "text-white/90"}`}>{item.name}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* SCENE 8: Certified Audit Reports */}
            {activeScene.id === 8 && (
              <motion.div
                key="scene-8"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.05 }}
                transition={{ duration: 0.6 }}
                className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center w-full"
              >
                <div className="lg:col-span-5 text-left flex flex-col gap-4">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F2C1A3]/10 border border-[#F2C1A3]/20 text-[#F2C1A3] text-[10px] font-mono uppercase tracking-widest font-semibold">
                    <FileText size={10} /> Proof of Work Export
                  </div>
                  <h2 className="text-3xl md:text-5xl font-serif text-white tracking-tight leading-tight">
                    Generate proof,<br />not assumptions.
                  </h2>
                  <p className="text-[#857C91] text-sm md:text-base font-light leading-relaxed">
                    Export high-fidelity, certified PDF reports containing full contribution graphs, task checklists, meeting logs, and grading reviews verified for university professors.
                  </p>
                </div>

                {/* Animated PDF Page assembly */}
                <div className="lg:col-span-7 flex justify-center">
                  <div className="w-full max-w-lg p-6 rounded-3xl border border-white/5 bg-[#141523]/45 shadow-2xl backdrop-blur-md relative overflow-hidden flex flex-col gap-4">
                    <div className="absolute top-0 right-0 h-40 w-40 rounded-full bg-[#F2C1A3]/5 blur-3xl pointer-events-none" />
                    
                    <div className="flex items-center justify-between text-[10px] font-mono text-[#857C91] border-b border-white/5 pb-3">
                      <span>Report Compilation Engine</span>
                      <span className="text-emerald-400">PDF Compile Done</span>
                    </div>

                    <div className="relative bg-[#191b2e] border border-white/5 rounded-2xl p-5 flex flex-col gap-3.5 text-left">
                      <div className="flex items-center justify-between border-b border-white/5 pb-2">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-white text-xs font-semibold">Academic Parity Review</span>
                          <span className="text-[8px] font-mono text-[#857C91]">Project: Capstone TeamTrace</span>
                        </div>
                        <span className="text-[10px] font-mono text-[#F2C1A3] uppercase tracking-wider">Certified</span>
                      </div>

                      <div className="flex flex-col gap-2">
                        <div className="flex justify-between items-center text-[10px] border-b border-white/5 pb-1">
                          <span className="text-[#857C91] font-light">Total commits synced:</span>
                          <span className="text-white font-mono">148 commits</span>
                        </div>
                        <div className="flex justify-between items-center text-[10px] border-b border-white/5 pb-1">
                          <span className="text-[#857C91] font-light">Task completion rating:</span>
                          <span className="text-white font-mono">100%</span>
                        </div>
                        <div className="flex justify-between items-center text-[10px] border-b border-white/5 pb-1">
                          <span className="text-[#857C91] font-light">Professor Sync Integrity:</span>
                          <span className="text-emerald-400 font-mono">Pass</span>
                        </div>
                      </div>

                      <motion.button 
                        whileHover={{ scale: 1.02 }}
                        className="w-full py-2 bg-gradient-to-r from-[#F2C1A3] to-[#F8CCAA] text-[#12131e] rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 shadow-md shadow-[#F2C1A3]/10"
                      >
                        <Check size={12} /> Certified PDF Compilation Verified
                      </motion.button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* SCENE 9: Start Collaborating Fairly */}
            {activeScene.id === 9 && (
              <motion.div
                key="scene-9"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.8 }}
                className="flex flex-col items-center justify-center text-center max-w-4xl"
              >
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -z-10 w-[600px] h-[600px] rounded-full bg-gradient-to-r from-[#F2C1A3] to-[#CD9FA0] opacity-[0.12] blur-[150px] pointer-events-none" />
                
                <motion.h2 
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3, duration: 0.6 }}
                  className="text-4xl md:text-7xl font-normal text-white font-serif tracking-tight leading-tight mb-6"
                >
                  Fair collaboration starts here.
                </motion.h2>

                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.8 }}
                  transition={{ delay: 0.8, duration: 0.6 }}
                  className="text-base md:text-xl font-light text-[#857C91] tracking-wide max-w-2xl leading-relaxed mb-10"
                >
                  Take control of your academic grading reviews, sync code telemetry, and establish parity transparency inside a premium team workspace.
                </motion.p>

                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.2, duration: 0.6 }}
                  className="flex flex-col sm:flex-row items-center gap-4"
                >
                  <button 
                    onClick={onClose}
                    className="px-8 py-4 rounded-full text-xs font-semibold text-[#12131e] bg-gradient-to-r from-[#F2C1A3] to-[#F8CCAA] flex items-center gap-2 btn-glow cursor-pointer hover:scale-105 transition duration-300"
                  >
                    Create Your First Project
                    <ArrowRight size={14} />
                  </button>
                  <button 
                    onClick={handleReplay}
                    className="px-8 py-4 rounded-full text-xs font-medium text-white bg-white/[0.02] border border-white/10 hover:border-white/20 hover:bg-white/[0.05] transition flex items-center gap-2 backdrop-blur-md cursor-pointer hover:scale-105"
                  >
                    <RotateCcw size={14} /> Replay Showcase
                  </button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ----------------- CINEMATIC SUBTITLE OVERLAY ----------------- */}
        <AnimatePresence>
          {showSubtitles && activeCue && (
            <motion.div 
              initial={{ opacity: 0, y: 15, filter: "blur(6px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -10, filter: "blur(6px)" }}
              transition={{ duration: 0.45, ease: "easeOut" }}
              className="absolute bottom-28 left-6 right-6 md:left-24 md:right-24 text-center pointer-events-none z-30"
            >
              <p className="font-serif text-lg md:text-2xl text-white font-light leading-relaxed max-w-4xl mx-auto italic tracking-wide text-glow drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)]">
                {"\""}{activeCue.text}{"\""}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ----------------- CUSTOM CONTROLS ----------------- */}
        <motion.div
          animate={{ opacity: showControls ? 1 : 0, y: showControls ? 0 : 20 }}
          transition={{ duration: 0.4 }}
          className="w-full bg-gradient-to-t from-[#090a10] to-[#090a10]/50 backdrop-blur-md border-t border-white/5 px-6 md:px-12 py-6 relative z-40"
        >
          <div className="max-w-7xl mx-auto flex flex-col gap-4">
            
            {/* Timeline Scrub track bar */}
            <div className="relative group/timeline w-full">
              {/* Notches overlay represent scenes */}
              <div className="absolute inset-0 flex justify-between pointer-events-none z-10">
                {scenes.map((s, sIdx) => {
                  const percent = (s.start / totalDuration) * 100;
                  return (
                    <div 
                      key={s.id} 
                      className={`absolute w-[1.5px] h-[3px] bg-white/20 ${sIdx === 0 ? "hidden" : ""}`}
                      {...{ style: { left: `${percent}%` } }}
                    />
                  );
                })}
              </div>

              {/* Progress Slider Track */}
              <div className="w-full h-1.5 bg-white/5 rounded-full relative overflow-hidden group-hover/timeline:h-2 transition-all duration-300 cursor-pointer">
                {/* Visual active progress fill bar */}
                <div 
                  className="h-full bg-gradient-to-r from-[#F2C1A3] via-[#CD9FA0] to-[#F8CCAA] relative rounded-full"
                  {...{ style: { width: `${(currentTime / totalDuration) * 100}%` } }}
                />
                
                {/* Clicking scrubbing range cover */}
                <input 
                  type="range"
                  min={0}
                  max={totalDuration}
                  step={0.1}
                  value={currentTime}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    handleScrub(val);
                  }}
                  title="Timeline Scrubber"
                  aria-label="Timeline Scrubber"
                  placeholder="Scrub through product film"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
              </div>
            </div>

            {/* Bottom Row controls */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              
              {/* Left Column: Play, Pause, Replay, Time readouts */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="w-9 h-9 rounded-full flex items-center justify-center bg-white/[0.02] border border-white/10 hover:border-white/25 hover:bg-white/[0.04] text-white hover:text-[#F2C1A3] transition duration-300 cursor-pointer"
                  aria-label={isPlaying ? "Pause" : "Play"}
                >
                  {isPlaying ? <Pause size={13} /> : <Play size={13} fill="currentColor" className="ml-0.5" />}
                </button>

                <button
                  onClick={handleReplay}
                  className="w-9 h-9 rounded-full flex items-center justify-center bg-white/[0.02] border border-white/10 hover:border-white/25 hover:bg-white/[0.04] text-[#857C91] hover:text-white transition duration-300 cursor-pointer"
                  aria-label="Replay Film"
                >
                  <RotateCcw size={13} />
                </button>

                {/* Time stamp readout */}
                <span className="text-[10px] font-mono text-[#857C91] tracking-wide select-none">
                  {Math.floor(currentTime / 60)}:
                  {Math.floor(currentTime % 60).toString().padStart(2, "0")} / 1:30
                </span>
              </div>

              {/* Middle Section: Cinematic Narrator Panel (Glassmorphism selector) */}
              <div className="flex items-center gap-3 bg-white/[0.01] border border-white/5 rounded-full px-3 py-1.5 backdrop-blur-md shadow-2xl">
                
                {/* Narrator Voice Selector */}
                <div className="flex items-center bg-white/[0.02] border border-white/5 rounded-full p-0.5 relative">
                  <button
                    onClick={() => setNarratorGender("female")}
                    className={`px-3 py-1 rounded-full text-[9px] font-mono uppercase tracking-widest transition duration-300 flex items-center gap-1.5 ${
                      narratorGender === "female" 
                        ? "bg-gradient-to-r from-[#F2C1A3]/20 to-[#CD9FA0]/20 border border-[#F2C1A3]/30 text-white font-semibold"
                        : "text-[#857C91] hover:text-white border border-transparent"
                    }`}
                  >
                    <User size={9} /> Female
                  </button>
                  <button
                    onClick={() => setNarratorGender("male")}
                    className={`px-3 py-1 rounded-full text-[9px] font-mono uppercase tracking-widest transition duration-300 flex items-center gap-1.5 ${
                      narratorGender === "male" 
                        ? "bg-gradient-to-r from-[#F2C1A3]/20 to-[#CD9FA0]/20 border border-[#F2C1A3]/30 text-white font-semibold"
                        : "text-[#857C91] hover:text-white border border-transparent"
                    }`}
                  >
                    <Users size={9} /> Male
                  </button>
                </div>

                <div className="h-3 w-[1px] bg-white/10" />

                {/* Subtitles Toggle button */}
                <button
                  onClick={() => setShowSubtitles(!showSubtitles)}
                  className={`w-7 h-7 rounded-full flex items-center justify-center border transition duration-300 hover:scale-105 ${
                    showSubtitles 
                      ? "bg-[#F2C1A3]/10 border-[#F2C1A3]/30 text-white" 
                      : "bg-transparent border-white/5 text-[#857C91] hover:text-white"
                  }`}
                  title="Toggle Subtitles"
                  aria-label="Toggle Subtitles"
                >
                  <Captions size={12} />
                </button>
              </div>

              {/* Right Side: Visualizer Canvas, Volume control, Fullscreen toggles */}
              <div className="flex items-center gap-3">
                
                {/* Real-time Frequency Analyser Equalizer Canvas */}
                <div className="w-16 h-5 rounded-lg border border-white/5 bg-white/[0.01] px-1 overflow-hidden flex items-center justify-center">
                  <canvas ref={visualizerCanvasRef} width={64} height={20} className="w-full h-full" />
                </div>

                <div className="h-3 w-[1px] bg-white/10" />

                {/* Volume Slider control */}
                <div className="flex items-center gap-2 group/volume relative">
                  <button
                    onClick={() => setIsMuted(!isMuted)}
                    className={`w-9 h-9 rounded-full flex items-center justify-center bg-white/[0.02] border hover:bg-white/[0.04] transition duration-300 cursor-pointer ${
                      isMuted ? "border-white/5 text-[#857C91]" : "border-white/10 text-white"
                    }`}
                    aria-label={isMuted ? "Unmute sound" : "Mute sound"}
                  >
                    {isMuted ? <VolumeX size={13} /> : <Volume2 size={13} />}
                  </button>

                  <div className="w-0 overflow-hidden group-hover/volume:w-16 transition-all duration-300 flex items-center">
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={volume}
                      onChange={(e) => {
                        const val = parseInt(e.target.value);
                        setVolume(val);
                        if (val > 0) setIsMuted(false);
                      }}
                      title="Volume Control"
                      aria-label="Volume Control"
                      placeholder="Volume"
                      className="w-14 h-1 bg-white/20 rounded-full cursor-pointer accent-[#F2C1A3]"
                    />
                  </div>
                </div>

                {/* Fullscreen icon trigger */}
                <button
                  onClick={toggleFullscreen}
                  className="w-9 h-9 rounded-full flex items-center justify-center bg-white/[0.02] border border-white/10 hover:border-white/25 hover:bg-white/[0.04] text-[#857C91] hover:text-white transition duration-300 cursor-pointer"
                  aria-label="Toggle Fullscreen"
                >
                  {isFullscreen ? <Minimize size={13} /> : <Maximize size={13} />}
                </button>
              </div>

            </div>

          </div>
        </motion.div>

      </motion.div>
    </AnimatePresence>
  );
}
