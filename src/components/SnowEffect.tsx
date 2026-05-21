"use client";

import React, { useEffect, useRef } from "react";

interface Flake {
  x: number;
  y: number;
  r: number; // radius
  d: number; // density/sway
  speed: number;
  opacity: number;
}

export default function SnowEffect() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    // Initialize snow particles
    const maxFlakes = 80;
    const flakes: Flake[] = [];

    for (let i = 0; i < maxFlakes; i++) {
      flakes.push({
        x: Math.random() * width,
        y: Math.random() * height,
        r: Math.random() * 2.5 + 0.8, // subtle small flakes for premium realism
        d: Math.random() * maxFlakes, // density factor for sway
        speed: Math.random() * 0.8 + 0.3, // slow, comforting snowfall
        opacity: Math.random() * 0.4 + 0.2, // soft, blending opacity
      });
    }

    // Handle resizing
    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", handleResize);

    // Animation Loop
    let angle = 0;
    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      // Gradient background matching the mood: very soft transition
      // We let the CSS handle the primary background, and keep the canvas overlay transparent.
      ctx.fillStyle = "rgba(255, 255, 255, 255)";
      
      angle += 0.005;

      for (let i = 0; i < maxFlakes; i++) {
        const f = flakes[i];
        
        ctx.beginPath();
        ctx.fillStyle = `rgba(255, 255, 255, ${f.opacity})`;
        ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2, true);
        ctx.fill();

        // Update positions
        // f.speed controls downward movement, Math.sin(angle + f.d) controls horizontal sway
        f.y += f.speed;
        f.x += Math.sin(angle + f.d) * 0.4;

        // Reset flakes when they fall out of view
        if (f.y > height) {
          flakes[i] = {
            x: Math.random() * width,
            y: -10,
            r: f.r,
            d: f.d,
            speed: f.speed,
            opacity: f.opacity,
          };
        }
        
        // Wrap horizontally
        if (f.x > width) {
          f.x = 0;
        } else if (f.x < 0) {
          f.x = width;
        }
      }

      animationId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-10 block h-full w-full opacity-60"
    />
  );
}
