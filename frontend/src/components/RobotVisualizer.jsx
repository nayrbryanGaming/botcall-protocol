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
          <svg width="180" height="180" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <filter id="glow">
                <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
              <linearGradient id="bodyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="rgba(0,242,255,0.2)" />
                <stop offset="100%" stopColor="rgba(0,242,255,0.05)" />
              </linearGradient>
            </defs>

            {/* Base/Chassis */}
            <motion.path 
              d="M30 45H70L85 55V65L70 75H30L15 65V55L30 45Z" 
              stroke={robotColor} 
              strokeWidth="2" 
              fill="url(#bodyGrad)"
              style={{ filter: 'url(#glow)' }}
            />

            {/* Rotors / Thrusters */}
            <g>
              {/* Front Left */}
              <motion.ellipse 
                cx="20" cy="45" rx="12" ry="3" 
                stroke={robotColor} 
                strokeWidth="1"
                animate={{ ry: [3, 0.5, 3] }}
                transition={{ repeat: Infinity, duration: 0.1 }}
              />
              {/* Front Right */}
              <motion.ellipse 
                cx="80" cy="45" rx="12" ry="3" 
                stroke={robotColor} 
                strokeWidth="1"
                animate={{ ry: [3, 0.5, 3] }}
                transition={{ repeat: Infinity, duration: 0.1 }}
              />
            </g>

            {/* Main Sensor Eye */}
            <motion.circle 
              cx="50" cy="55" r="10" 
              stroke={robotColor} 
              strokeWidth="2" 
            />
            <motion.circle 
              cx="50" cy="55" r="4" 
              fill={isExecuting ? "var(--error)" : robotColor}
              animate={isExecuting ? { opacity: [1, 0.3, 1], scale: [1, 1.2, 1] } : {}}
              transition={{ repeat: Infinity, duration: 0.8 }}
            />

            {/* Manipulators / Arms */}
            <AnimatePresence>
              {action === 'wave' && isExecuting && (
                <motion.g
                  initial={{ rotate: 0 }}
                  animate={{ rotate: [-20, 20, -20] }}
                  transition={{ repeat: Infinity, duration: 1 }}
                  style={{ originX: '20px', originY: '55px' }}
                >
                  <rect x="15" y="55" width="6" height="25" rx="3" stroke={robotColor} strokeWidth="2" />
                </motion.g>
              )}
              {action === 'pick object' && isExecuting && (
                <motion.g
                  animate={{ y: [0, 5, 0] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                >
                  <path d="M40 75L40 85M60 75L60 85" stroke={robotColor} strokeWidth="2" />
                  <motion.path 
                    d="M35 85H45 M55 85H65" 
                    stroke={robotColor} 
                    strokeWidth="2"
                    animate={{ x: [-2, 2, -2] }}
                    transition={{ repeat: Infinity, duration: 0.5 }}
                  />
                </motion.g>
              )}
            </AnimatePresence>

            {/* Scanning Laser */}
            {isExecuting && (action === 'scan' || action === 'patrol') && (
              <motion.line 
                x1="10" y1="55" x2="90" y2="55" 
                stroke={action === 'patrol' ? 'var(--error)' : 'var(--primary)'} 
                strokeWidth="2"
                animate={{ y1: [45, 75, 45], y2: [45, 75, 45], opacity: [0.2, 0.8, 0.2] }}
                transition={{ repeat: Infinity, duration: 2 }}
              />
            )}

            {/* UI Decors inside SVG */}
            <circle cx="50" cy="55" r="40" stroke={robotColor} strokeWidth="0.5" strokeDasharray="2 4" opacity="0.3">
               <animateTransform attributeName="transform" type="rotate" from="0 50 55" to="360 50 55" dur="10s" repeatCount="indefinite" />
            </circle>
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
