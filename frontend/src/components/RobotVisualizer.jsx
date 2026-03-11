import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const RobotVisualizer = ({ status, action }) => {
  // status: 0 (Pending), 1 (Executing), 2 (Completed)
  const isExecuting = status === 1;
  const isCompleted = status === 2;
  const isPending = status === 0;

  const getRobotColor = () => {
    if (isExecuting) return 'var(--primary)';
    if (isCompleted) return 'var(--success)';
    return 'var(--text-dim)';
  };

  const robotColor = getRobotColor();

  return (
    <div className="robot-visualizer glass platinum-border" style={{ 
      height: '350px', 
      position: 'relative', 
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'radial-gradient(circle at center, rgba(0,242,255,0.05) 0%, rgba(0,0,0,0.6) 100%)',
      borderRadius: '24px',
      marginBottom: '2rem',
      boxShadow: 'inset 0 0 50px rgba(0,0,0,0.5), 0 10px 30px rgba(0,0,0,0.3)'
    }}>
      {/* HUD Background Decorations */}
      <div className="hud-corner top-left">
        <span className="hud-tag">ID: TITAN-01</span>
        <div className="hud-line"></div>
      </div>
      <div className="hud-corner top-right">
        <span className="hud-tag">FEEDS: ACTIVE</span>
        <div className="hud-line"></div>
      </div>
      <div className="hud-corner bottom-left">
        <span className="hud-tag">LATENCY: 12ms</span>
      </div>
      <div className="hud-corner bottom-right">
        <span className="hud-tag">STABILITY: 100%</span>
      </div>

      {/* Holographic Grid */}
      <div className="holo-grid"></div>

      <div className="drone-container" style={{ position: 'relative', perspective: '1000px' }}>
        <motion.div
          animate={isExecuting ? {
            y: [0, -10, 0],
            rotateX: [0, 5, 0],
            rotateZ: [0, -2, 2, 0]
          } : { y: 0 }}
          transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
        >
            {/* Main Robot SVG */}
            <svg width="200" height="200" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <filter id="glow-p">
                  <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                  <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
                <linearGradient id="armorGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="rgba(0,242,255,0.25)" />
                  <stop offset="50%" stopColor="rgba(0,242,255,0.05)" />
                  <stop offset="100%" stopColor="rgba(112,0,255,0.2)" />
                </linearGradient>
              </defs>
  
              {/* Outer Glow Ring */}
              <circle cx="50" cy="55" r="45" stroke={robotColor} strokeWidth="0.2" opacity="0.2" />
  
              {/* Armor Plates */}
              <motion.path 
                d="M35 48H65L75 55V62L65 69H35L25 62V55L35 48Z" 
                stroke={robotColor} 
                strokeWidth="1.5" 
                fill="url(#armorGrad)"
                style={{ filter: 'url(#glow-p)' }}
              />
  
              {/* Internal Circuits */}
              <path d="M40 55H60 M50 50V60" stroke={robotColor} strokeWidth="0.5" opacity="0.5" />
  
              {/* Thrusters / Rotors */}
              <g>
                {/* FL */}
                <motion.ellipse 
                  cx="25" cy="48" rx="14" ry="2" 
                  stroke={robotColor} 
                  strokeWidth="0.8"
                  animate={{ ry: [2, 0.2, 2], opacity: [0.8, 1, 0.8] }}
                  transition={{ repeat: Infinity, duration: 0.12 }}
                />
                {/* FR */}
                <motion.ellipse 
                  cx="75" cy="48" rx="14" ry="2" 
                  stroke={robotColor} 
                  strokeWidth="0.8"
                  animate={{ ry: [2, 0.2, 2], opacity: [0.8, 1, 0.8] }}
                  transition={{ repeat: Infinity, duration: 0.1 }}
                />
                {/* BL */}
                <motion.ellipse 
                  cx="25" cy="62" rx="10" ry="2" 
                  stroke={robotColor} 
                  strokeWidth="0.5"
                  opacity="0.6"
                  animate={{ ry: [2, 0.5, 2] }}
                  transition={{ repeat: Infinity, duration: 0.15 }}
                />
                {/* BR */}
                <motion.ellipse 
                  cx="75" cy="62" rx="10" ry="2" 
                  stroke={robotColor} 
                  strokeWidth="0.5"
                  opacity="0.6"
                  animate={{ ry: [2, 0.5, 2] }}
                  transition={{ repeat: Infinity, duration: 0.13 }}
                />
              </g>
  
              {/* Neural Optimizer Eye */}
              <motion.circle 
                cx="50" cy="58" r="7" 
                stroke={robotColor} 
                strokeWidth="1.5" 
              />
              <motion.circle 
                cx="50" cy="58" r="3" 
                fill={isExecuting ? "var(--error)" : robotColor}
                animate={isExecuting ? { opacity: [1, 0.2, 1], scale: [1, 1.4, 1] } : {}}
                transition={{ repeat: Infinity, duration: 0.6 }}
              />
  
              {/* Dynamic Action Layers */}
              <AnimatePresence>
                {action === 'wave' && isExecuting && (
                  <motion.g
                    initial={{ rotate: 0 }}
                    animate={{ rotate: [-30, 30, -30] }}
                    transition={{ repeat: Infinity, duration: 0.8, ease: "easeInOut" }}
                    style={{ originX: '25px', originY: '55px' }}
                  >
                    <path d="M25 55L10 40M10 40L15 35M10 40L5 35" stroke={robotColor} strokeWidth="2" strokeLinecap="round" />
                  </motion.g>
                )}
                
                {action === 'pick object' && isExecuting && (
                  <motion.g
                    animate={{ y: [0, 8, 0] }}
                    transition={{ repeat: Infinity, duration: 1.2 }}
                  >
                    <path d="M42 69V78M58 69V78" stroke={robotColor} strokeWidth="1.5" />
                    <motion.path 
                      d="M38 78C38 82 46 82 46 78 M54 78C54 82 62 82 62 78" 
                      stroke={robotColor} 
                      strokeWidth="1.5"
                      animate={{ d: ["M38 78C38 80 46 80 46 78", "M38 78C38 85 46 85 46 78"] }}
                      transition={{ repeat: Infinity, duration: 0.6 }}
                    />
                  </motion.g>
                )}
              </AnimatePresence>
  
              {/* HUD Geometric Elements */}
              <circle cx="50" cy="58" r="35" stroke={robotColor} strokeWidth="0.3" strokeDasharray="1 5" opacity="0.4">
                 <animateTransform attributeName="transform" type="rotate" from="0 50 58" to="360 50 58" dur="20s" repeatCount="indefinite" />
              </circle>
              <rect x="10" y="55" width="5" height="5" stroke={robotColor} strokeWidth="0.5" opacity="0.3">
                <animate attributeName="opacity" values="0.3;1;0.3" dur="2s" repeatCount="indefinite" />
              </rect>
            </svg>
        </motion.div>

        {/* Action Specific HUD Overlays */}
        {isExecuting && action === 'scan' && (
          <motion.div 
            className="scan-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
        )}
      </div>

      {/* Status Indicators */}
      <div className="visualizer-footer">
        <div className="status-pill-group">
          <div className={`status-pill ${isExecuting ? 'active' : ''}`}>
            {isPending ? "STANDBY" : isExecuting ? "EXECUTING" : "SUCCESS"}
          </div>
          <div className="action-label">
            {action?.toUpperCase().replace(' ', '_') || "IDLE_NODE"}
          </div>
        </div>
        <div className="telemetry-compact">
          <div className="telemetry-row">
            <span>PWR</span>
            <div className="pwr-bar"><div className="pwr-fill"></div></div>
          </div>
          <div className="telemetry-row">
            <span>SIG</span>
            <div className="sig-dots"><span></span><span></span><span></span></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RobotVisualizer;
