/**
 * Interactive Celebration Portal Logic
 * Implements a high-performance custom confetti physics canvas and synthesized Web Audio chime.
 */

document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const celebrateBtn = document.getElementById('celebrate-btn');
    const closeBtn = document.getElementById('close-modal-btn');
    const modal = document.getElementById('congrats-modal');
    const overlay = document.getElementById('modal-overlay');
    const confettiCanvas = document.getElementById('confetti-canvas');
    const ctx = confettiCanvas.getContext('2d');
    
    // Confetti Config & State
    let animationFrameId;
    let particles = [];
    const colors = [
        '#38bdf8', // Sky blue
        '#0ea5e9', // Deep blue
        '#818cf8', // Indigo
        '#a78bfa', // Purple
        '#c084fc', // Light purple
        '#fb7185', // Coral/Rose
        '#34d399', // Mint green
        '#fbbf24'  // Amber/Gold
    ];

    /**
     * Synthesizes a high-fidelity "Victory Chime" sound using the Web Audio API.
     * Creating an uplifting melodic chord arpeggio with synthetic instruments.
     */
    function playVictoryChime() {
        try {
            // Create AudioContext (fallback to webkitAudioContext)
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (!AudioContext) return;
            
            const audioCtx = new AudioContext();
            
            // Core notes for a premium major chord progression (Arpeggio in C Major / G Major mix)
            // Frequencies: C5 (523.25Hz), E5 (659.25Hz), G5 (783.99Hz), C6 (1046.50Hz), E6 (1318.51Hz)
            const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51];
            const startTime = audioCtx.currentTime;
            
            notes.forEach((freq, idx) => {
                const osc = audioCtx.createOscillator();
                const gainNode = audioCtx.createGain();
                const filterNode = audioCtx.createBiquadFilter();
                
                // Triangle oscillator gives a warm, sweet chime sound
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(freq, startTime + idx * 0.08);
                
                // Add a subtle pitch slide for premium organic feel
                osc.frequency.exponentialRampToValueAtTime(freq * 1.01, startTime + idx * 0.08 + 0.4);
                
                // Setup lowpass filter to warm up the sound and reduce high-end harshness
                filterNode.type = 'lowpass';
                filterNode.frequency.setValueAtTime(4000, startTime);
                filterNode.frequency.exponentialRampToValueAtTime(1200, startTime + idx * 0.08 + 0.5);
                
                // Setup volume envelope (fast attack, smooth release)
                const noteStart = startTime + idx * 0.08;
                gainNode.gain.setValueAtTime(0, noteStart);
                gainNode.gain.linearRampToValueAtTime(0.2, noteStart + 0.02); // fast attack
                gainNode.gain.exponentialRampToValueAtTime(0.001, noteStart + 0.6); // smooth decay
                
                // Connect node chain
                osc.connect(filterNode);
                filterNode.connect(gainNode);
                gainNode.connect(audioCtx.destination);
                
                // Start & Stop
                osc.start(noteStart);
                osc.stop(noteStart + 0.65);
            });
            
        } catch (e) {
            console.warn("Web Audio Context could not start. Browser security settings may require user interaction first.", e);
        }
    }

    /**
     * Resize canvas to perfectly fill the modal boundaries
     */
    function resizeCanvas() {
        const rect = modal.getBoundingClientRect();
        // Multiply by devicePixelRatio for crisp rendering on high-DPI screens
        const dpr = window.devicePixelRatio || 1;
        confettiCanvas.width = rect.width * dpr;
        confettiCanvas.height = rect.height * dpr;
        ctx.scale(dpr, dpr);
    }

    /**
     * Particle Class defining the physics and drawing of each confetti element
     */
    class ConfettiParticle {
        constructor(width, height) {
            this.canvasWidth = width;
            this.canvasHeight = height;
            this.reset(true);
        }

        reset(isInitial = false) {
            // Initial distribution starts from bottom center (explosion point) or top
            this.x = this.canvasWidth / 2 + (Math.random() * 40 - 20);
            this.y = isInitial ? this.canvasHeight - 20 : -20;
            
            // Random particle properties
            this.size = Math.random() * 6 + 6; // size range: 6 - 12
            this.color = colors[Math.floor(Math.random() * colors.length)];
            
            // Speed vectors (Initial explosive velocity upwards and outward)
            this.vx = (Math.random() * 8 - 4); // horizontal dispersion
            this.vy = isInitial ? -(Math.random() * 12 + 10) : (Math.random() * 3 + 2); // vertical burst vs gravity fall
            
            // Rotation and oscillation states
            this.rotation = Math.random() * 360;
            this.rotationSpeed = Math.random() * 4 - 2;
            this.wobble = Math.random() * 10;
            this.wobbleSpeed = Math.random() * 0.05 + 0.02;
            
            // Gravity and resistance coefficients
            this.gravity = 0.28;
            this.drag = 0.985;
            
            // Confetti shapes: 0 = rectangle, 1 = circle, 2 = triangle
            this.shape = Math.floor(Math.random() * 3);
        }

        update() {
            // Physics application
            this.vy += this.gravity;
            this.vx *= this.drag;
            this.vy *= this.drag;
            
            this.x += this.vx;
            this.y += this.vy;
            
            // Swing movement
            this.wobble += this.wobbleSpeed;
            this.x += Math.sin(this.wobble) * 0.5;
            
            // Rotate particle
            this.rotation += this.rotationSpeed;
            
            // If particle leaves modal, remove or reset it
            if (this.y > this.canvasHeight + 10) {
                return false; // mark as inactive
            }
            return true;
        }

        draw() {
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.rotate((this.rotation * Math.PI) / 180);
            ctx.fillStyle = this.color;
            
            ctx.beginPath();
            if (this.shape === 0) {
                // Rectangle shape
                ctx.fillRect(-this.size / 2, -this.size / 4, this.size, this.size / 2);
            } else if (this.shape === 1) {
                // Circle shape
                ctx.arc(0, 0, this.size / 2, 0, Math.PI * 2);
                ctx.fill();
            } else {
                // Triangle shape
                ctx.moveTo(0, -this.size / 2);
                ctx.lineTo(this.size / 2, this.size / 2);
                ctx.lineTo(-this.size / 2, this.size / 2);
                ctx.closePath();
                ctx.fill();
            }
            ctx.restore();
        }
    }

    /**
     * Animation Loop for Confetti Rendering
     */
    function animateConfetti() {
        const rect = modal.getBoundingClientRect();
        ctx.clearRect(0, 0, rect.width, rect.height);
        
        // Update & Draw particles
        particles = particles.filter(p => {
            const isActive = p.update();
            if (isActive) p.draw();
            return isActive;
        });
        
        // Keep generating a few gentle floating particles while modal is open
        if (particles.length < 150 && modal.classList.contains('active')) {
            const p = new ConfettiParticle(rect.width, rect.height);
            // Spawn naturally from top
            p.reset(false);
            particles.push(p);
        }
        
        if (modal.classList.contains('active') || particles.length > 0) {
            animationFrameId = requestAnimationFrame(animateConfetti);
        }
    }

    /**
     * Trigger the full explosion celebration
     */
    function triggerCelebration() {
        // Play audio chime
        playVictoryChime();
        
        // Open Modal and Overlay
        modal.classList.add('active');
        overlay.classList.add('active');
        
        modal.setAttribute('aria-hidden', 'false');
        overlay.setAttribute('aria-hidden', 'false');
        
        // Prepare Confetti Canvas
        resizeCanvas();
        particles = [];
        
        const rect = modal.getBoundingClientRect();
        // Generate initial big explosive burst
        for (let i = 0; i < 180; i++) {
            particles.push(new ConfettiParticle(rect.width, rect.height));
        }
        
        // Cancel existing animation loop if any, then start a new one
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
        }
        animateConfetti();
    }

    /**
     * Closes the Congratulations Modal cleanly
     */
    function closeModal() {
        modal.classList.remove('active');
        overlay.classList.remove('active');
        
        modal.setAttribute('aria-hidden', 'true');
        overlay.setAttribute('aria-hidden', 'true');
        
        // Gently fade out confetti particles by stopping generation
        // Confetti physics loop will naturally terminate when remaining particles leave canvas boundary.
    }

    // Event Listeners
    celebrateBtn.addEventListener('click', triggerCelebration);
    closeBtn.addEventListener('click', closeModal);
    overlay.addEventListener('click', closeModal);
    
    // Accessibility Keyboard Controls (ESC to close)
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.classList.contains('active')) {
            closeModal();
        }
    });

    // Auto-resize canvas on viewport adjustments
    window.addEventListener('resize', () => {
        if (modal.classList.contains('active')) {
            resizeCanvas();
        }
    });
});
