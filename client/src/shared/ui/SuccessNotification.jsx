import React, { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { Trophy, Sparkles, X, Zap } from 'lucide-react';
import { Box, Typography, IconButton, Paper } from '@mui/material';

// Enhanced SuccessNotification with GSAP animations and Glassmorphism
const SuccessNotification = ({ xp, message = "Lessons Complete!", onClose }) => {
  const containerRef = useRef(null);
  const contentRef = useRef(null);
  const glowRef = useRef(null);
  const particlesRef = useRef(null);
  const ribbonRef = useRef(null);
  
  // State for XP counter animation
  const [displayXp, setDisplayXp] = useState(0);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // 1. Initial State Setup
      gsap.set(containerRef.current, { y: -100, opacity: 0, scale: 0.8 });
      gsap.set(contentRef.current.children, { y: 20, opacity: 0 });
      gsap.set(".particle", { scale: 0, opacity: 0, x: 0, y: 0 });
      gsap.set(glowRef.current, { opacity: 0, scale: 0.5 });
      gsap.set(ribbonRef.current, { y: -12, opacity: 0, scaleX: 0.9 });

      // 2. Entrance Timeline
      const tl = gsap.timeline({
        defaults: { ease: "back.out(1.7)" }
      });

      tl.to(containerRef.current, {
        duration: 0.8,
        y: 0,
        opacity: 1,
        scale: 1,
        ease: "elastic.out(1, 0.6)"
      })
      .to(ribbonRef.current, {
        duration: 0.5,
        y: 0,
        opacity: 1,
        scaleX: 1,
        ease: "bounce.out"
      }, "-=0.45")
      .to(glowRef.current, {
        duration: 0.6,
        opacity: 0.6,
        scale: 1.5,
        ease: "power2.out"
      }, "-=0.6")
      .to(".particle", {
        duration: 0.6,
        opacity: 1,
        scale: "random(0.6, 1)",
        x: "random(-80, 80)",
        y: "random(-40, 40)",
        ease: "power3.out",
        stagger: { each: 0.02, from: "center" }
      }, "-=0.35")
      .to(".particle", {
        duration: 0.6,
        opacity: 0,
        scale: 0.5,
        ease: "power2.in"
      }, "-=0.2")
      .to(contentRef.current.children, {
        duration: 0.4,
        y: 0,
        opacity: 1,
        stagger: 0.1,
        ease: "power2.out"
      }, "-=0.4");

      // 3. XP Counter Animation
      if (xp > 0) {
        gsap.to({}, {
          duration: 1.5,
          val: xp,
          ease: "power2.out",
          onUpdate: function() {
            setDisplayXp(Math.ceil(this.targets()[0].val));
          },
          targets: { val: 0 }
        });
      }

      // 4. Continuous Ambient Animation
      gsap.to(glowRef.current, {
        rotation: 360,
        duration: 20,
        repeat: -1,
        ease: "none"
      });

    }, containerRef);

    return () => ctx.revert();
  }, [xp]);

  // Handle close with exit animation
  const handleClose = () => {
    gsap.to(containerRef.current, {
      y: -50,
      opacity: 0,
      scale: 0.9,
      duration: 0.3,
      ease: "power2.in",
      onComplete: onClose
    });
  };

  // Generate random particles
  const particleCount = 12;

  return (
    <Box
      ref={containerRef}
      sx={{
        position: 'fixed',
        top: '24px',
        left: '50%',
        transform: 'translateX(-50%)', // GSAP will overwrite this but good for initial render
        zIndex: 9999,
        perspective: '1000px',
        pointerEvents: 'none', // Allow clicks to pass through around the card
        display: 'flex',
        justifyContent: 'center',
        width: '100%',
      }}
    >
      <Paper
        elevation={0}
        sx={{
          position: 'relative',
          pointerEvents: 'auto',
          background: 'rgba(15, 23, 42, 0.85)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '24px',
          padding: '24px 32px',
          minWidth: '360px',
          maxWidth: '90vw',
          overflow: 'hidden',
          boxShadow: `
            0 20px 40px -10px rgba(0, 0, 0, 0.5),
            0 0 30px -5px rgba(99, 102, 241, 0.3),
            inset 0 1px 0 rgba(255, 255, 255, 0.1)
          `,
          display: 'flex',
          alignItems: 'center',
          gap: 2,
        }}
      >
        {/* Slim Ribbon */}
        <Box
          ref={ribbonRef}
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '6px',
            background: 'linear-gradient(90deg, #16a34a, #22c55e, #4ade80)',
            boxShadow: '0 0 12px rgba(34, 197, 94, 0.6)',
            borderTopLeftRadius: '24px',
            borderTopRightRadius: '24px',
            zIndex: 2,
            transformOrigin: 'center',
            pointerEvents: 'none'
          }}
        />

        {/* Animated Glow Background */}
        <Box
          ref={glowRef}
          sx={{
            position: 'absolute',
            top: '50%',
            left: '20%',
            width: '300px',
            height: '300px',
            background: 'conic-gradient(from 0deg at 50% 50%, #4f46e5, #ec4899, #8b5cf6, #4f46e5)',
            filter: 'blur(60px)',
            opacity: 0,
            zIndex: 0,
            transform: 'translate(-50%, -50%)',
            borderRadius: '50%',
          }}
        />

        {/* Floating Particles */}
        <div ref={particlesRef} style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
          {[...Array(particleCount)].map((_, i) => (
            <div
              key={i}
              className="particle"
              style={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                width: Math.random() > 0.5 ? '4px' : '6px',
                height: Math.random() > 0.5 ? '4px' : '6px',
                background: Math.random() > 0.5 ? '#FFD700' : '#4F46E5',
                borderRadius: '50%',
                boxShadow: '0 0 10px rgba(255, 255, 255, 0.5)',
              }}
            />
          ))}
        </div>

        {/* Icon Section */}
        <Box
          sx={{
            position: 'relative',
            zIndex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.05))',
            borderRadius: '16px',
            padding: '12px',
            border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: '0 8px 16px rgba(0,0,0,0.2)'
          }}
        >
          <Trophy size={32} color="#FFD700" style={{ filter: 'drop-shadow(0 0 8px rgba(255, 215, 0, 0.6))' }} />
        </Box>

        {/* Content Section */}
        <Box ref={contentRef} sx={{ flex: 1, zIndex: 1, display: 'flex', flexDirection: 'column' }}>
          <Typography
            variant="overline"
            sx={{
              color: '#94a3b8',
              fontWeight: 700,
              letterSpacing: '1px',
              lineHeight: 1,
              mb: 0.5,
              display: 'flex',
              alignItems: 'center',
              gap: 0.5
            }}
          >
            <Sparkles size={12} color="#ec4899" />
            ACHIEVEMENT UNLOCKED
          </Typography>
          
          <Typography
            variant="h6"
            sx={{
              fontWeight: 800,
              background: 'linear-gradient(to right, #ffffff, #e2e8f0)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              textShadow: '0 2px 10px rgba(0,0,0,0.3)',
              lineHeight: 1.2
            }}
          >
            {message}
          </Typography>

          {xp > 0 && (
            <Box sx={{ display: 'flex', alignItems: 'center', mt: 1, gap: 1 }}>
              <Box
                sx={{
                  background: 'rgba(79, 70, 229, 0.2)',
                  border: '1px solid rgba(79, 70, 229, 0.4)',
                  borderRadius: '12px',
                  padding: '4px 10px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5
                }}
              >
                <Zap size={14} color="#818cf8" fill="#818cf8" />
                <Typography
                  variant="subtitle2"
                  sx={{
                    color: '#818cf8',
                    fontWeight: 'bold',
                    fontFamily: 'monospace'
                  }}
                >
                  +{displayXp} XP
                </Typography>
              </Box>
            </Box>
          )}
        </Box>

        {/* Close Button */}
        {onClose && (
          <IconButton
            onClick={handleClose}
            size="small"
            sx={{
              zIndex: 1,
              color: 'rgba(255,255,255,0.4)',
              '&:hover': {
                color: 'white',
                background: 'rgba(255,255,255,0.1)'
              }
            }}
          >
            <X size={18} />
          </IconButton>
        )}
      </Paper>
    </Box>
  );
};

export default SuccessNotification;
