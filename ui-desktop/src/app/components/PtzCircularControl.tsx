import React, { useCallback, useRef, useState } from 'react';

export type PtzDirection8 =
    | 'up'
    | 'down'
    | 'left'
    | 'right'
    | 'up-left'
    | 'up-right'
    | 'down-left'
    | 'down-right';

interface PtzCircularControlProps {
    onStartMove: (direction: PtzDirection8) => void;
    onStopMove: () => void;
    onJoystickMove?: (panSpeed: number, tiltSpeed: number) => void;
    disabled?: boolean;
    className?: string;
    style?: React.CSSProperties;
}

const toSvgAngle = (deg: number) => deg - 90;

interface SectorDef {
    id: PtzDirection8;
    startAngle: number;
    endAngle: number;
    isDiagonal: boolean;
}

const sectors: SectorDef[] = [
    { id: 'up', startAngle: -22.5, endAngle: 22.5, isDiagonal: false },
    { id: 'up-right', startAngle: 22.5, endAngle: 67.5, isDiagonal: true },
    { id: 'right', startAngle: 67.5, endAngle: 112.5, isDiagonal: false },
    { id: 'down-right', startAngle: 112.5, endAngle: 157.5, isDiagonal: true },
    { id: 'down', startAngle: 157.5, endAngle: 202.5, isDiagonal: false },
    { id: 'down-left', startAngle: 202.5, endAngle: 247.5, isDiagonal: true },
    { id: 'left', startAngle: 247.5, endAngle: 292.5, isDiagonal: false },
    { id: 'up-left', startAngle: 292.5, endAngle: 337.5, isDiagonal: true },
];

export function PtzCircularControl({ onStartMove, onStopMove, onJoystickMove, disabled, className = '' }: PtzCircularControlProps) {
    const [activeDirection, setActiveDirection] = useState<PtzDirection8 | 'center' | null>(null);
    const [joystickOffset, setJoystickOffset] = useState({ x: 0, y: 0 });
    const svgRef = useRef<SVGSVGElement>(null);

    // Helpers to create annular sectors
    const createSectorPath = (startAngle: number, endAngle: number, innerRadius: number, outerRadius: number) => {
        const startRad = (startAngle - 90) * Math.PI / 180;
        const endRad = (endAngle - 90) * Math.PI / 180;

        const x1 = 50 + outerRadius * Math.cos(startRad);
        const y1 = 50 + outerRadius * Math.sin(startRad);
        const x2 = 50 + outerRadius * Math.cos(endRad);
        const y2 = 50 + outerRadius * Math.sin(endRad);

        const x3 = 50 + innerRadius * Math.cos(endRad);
        const y3 = 50 + innerRadius * Math.sin(endRad);
        const x4 = 50 + innerRadius * Math.cos(startRad);
        const y4 = 50 + innerRadius * Math.sin(startRad);

        const largeArc = endAngle - startAngle > 180 ? 1 : 0;

        return `M ${x1} ${y1} A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${x2} ${y2} L ${x3} ${y3} A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${x4} ${y4} Z`;
    };

    const innerR = 18;
    const outerR = 48;

    const clamp = (val: number, min: number, max: number) => Math.min(Math.max(val, min), max);

    const handlePointerMove = useCallback((e: React.PointerEvent) => {
        // Only handle move if we are in joystick mode (activeDirection === 'center') and pointer is captured
        if (activeDirection !== 'center' || !svgRef.current) return;

        const rect = svgRef.current.getBoundingClientRect();
        // Calculate raw pixel offset from center
        // Center of SVG is at rect.left + rect.width/2
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        const dxPx = e.clientX - centerX;
        const dyPx = e.clientY - centerY;

        // Convert to SVG space (assuming 100x100 viewbox)
        // scale = 100 / rect.width
        const scale = 100 / rect.width;
        const dxSv = dxPx * scale;
        const dySv = dyPx * scale;

        // Visual offset clamp (limit to inner circle or slightly less)
        // Visual limit say 10 units
        const visualLimit = 10;
        const visualDist = Math.sqrt(dxSv * dxSv + dySv * dySv);
        let visualX = dxSv;
        let visualY = dySv;
        if (visualDist > visualLimit) {
            visualX = (dxSv / visualDist) * visualLimit;
            visualY = (dySv / visualDist) * visualLimit;
        }
        setJoystickOffset({ x: visualX, y: visualY });

        if (onJoystickMove) {
            // Speed calculation
            // Base radius is outerR (48)
            // panSpeed: left is negative (x < 50 => dx < 0) -> fits strict math
            // tiltSpeed: down is negative. Screen dy > 0 is down. So we need to invert dy.

            const rawPan = dxSv / outerR;
            const rawTilt = -(dySv / outerR); // Inverted Y

            const pan = clamp(rawPan, -1, 1);
            const tilt = clamp(rawTilt, -1, 1);

            onJoystickMove(pan, tilt);
        }

    }, [activeDirection, onJoystickMove]);

    const handlePointerDown = useCallback((dir: PtzDirection8 | 'center', e: React.PointerEvent) => {
        if (disabled) return;
        e.preventDefault();
        try {
            e.currentTarget.setPointerCapture(e.pointerId);
        } catch (err) {
            // Check if element is still connected
        }
        setActiveDirection(dir);
        if (dir === 'center') {
            // Start Joystick mode
            // We do NOT call onStopMove immediately here, we might want to start sending 0,0 or just wait for move
            if (onJoystickMove) onJoystickMove(0, 0);
        } else {
            onStartMove(dir);
        }
    }, [disabled, onStartMove, onJoystickMove]);

    const handlePointerUp = useCallback((e: React.PointerEvent) => {
        e.preventDefault();
        try {
            if (e.currentTarget.hasPointerCapture(e.pointerId)) {
                e.currentTarget.releasePointerCapture(e.pointerId);
            }
        } catch (err) {
            // ignore
        }

        if (activeDirection === 'center') {
            // End Joystick mode
            setJoystickOffset({ x: 0, y: 0 });
            if (onJoystickMove) onJoystickMove(0, 0);
        } else {
            onStopMove();
        }
        setActiveDirection(null);
    }, [activeDirection, onStopMove, onJoystickMove]);

    return (
        <div className={`zcam-ptz-circular-control ${className}`} style={{
            position: 'relative',
            width: '240px',
            height: '240px',
            margin: '0 auto',
            userSelect: 'none',
            touchAction: 'none'
        }}>
            <svg
                ref={svgRef}
                viewBox="0 0 100 100"
                style={{ width: '100%', height: '100%', filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.6))' }}
                onPointerMove={handlePointerMove}
            >
                {/* Defs for Gradients */}
                <defs>
                    <radialGradient id="grad-ring-bg" cx="50%" cy="50%" r="50%">
                        <stop offset="30%" stopColor="#2a2a2a" />
                        <stop offset="90%" stopColor="#1a1a1a" />
                        <stop offset="100%" stopColor="#111" />
                    </radialGradient>
                    <linearGradient id="grad-sector-hover" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#3d3d3d" />
                        <stop offset="100%" stopColor="#333" />
                    </linearGradient>
                    <linearGradient id="grad-sector-active" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#ffc069" />
                        <stop offset="100%" stopColor="#ff7a45" />
                    </linearGradient>
                    <radialGradient id="grad-center" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="#444" />
                        <stop offset="100%" stopColor="#222" />
                    </radialGradient>
                    <radialGradient id="grad-center-active" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="#ffc069" />
                        <stop offset="100%" stopColor="#ff7a45" />
                    </radialGradient>
                </defs>

                {/* Main continuous ring background to prevent gaps */}
                <circle cx="50" cy="50" r={outerR} fill="url(#grad-ring-bg)" stroke="#111" strokeWidth="2" />

                {/* Inner hole background */}
                <circle cx="50" cy="50" r={innerR} fill="#181818" />

                {/* Sectors - Render on top but transparent/blending unless active */}
                {sectors.map((sector) => {
                    const isActive = activeDirection === sector.id;
                    return (
                        <path
                            key={sector.id}
                            d={createSectorPath(sector.startAngle, sector.endAngle, innerR, outerR)}
                            // Transparent when idle to show seamless ring, lit up when active
                            fill={isActive ? "url(#grad-sector-active)" : "transparent"}
                            stroke={isActive ? "#d4380d" : "none"} // only stroke when active
                            strokeWidth="0.5"
                            onPointerDown={(e) => handlePointerDown(sector.id, e)}
                            onPointerUp={handlePointerUp}
                            onLostPointerCapture={handlePointerUp}
                            onPointerCancel={handlePointerUp}
                            style={{ cursor: disabled ? 'default' : 'pointer' }}
                        >
                        </path>
                    );
                })}

                {/* Icons / Arrows */}
                {sectors.map((sector) => {
                    // Calculate center angle of sector to place icon
                    const midAngleDeg = (sector.startAngle + sector.endAngle) / 2;
                    const midRad = toSvgAngle(midAngleDeg) * Math.PI / 180;

                    // Position: slightly outwards for aesthetics
                    const iconR = (innerR + outerR) / 2;
                    const x = 50 + iconR * Math.cos(midRad);
                    const y = 50 + iconR * Math.sin(midRad);

                    const isActive = activeDirection === sector.id;
                    const fillColor = isActive ? "#fff" : "#999";

                    // Size differentiation
                    const scale = sector.isDiagonal ? 0.6 : 1.0;

                    // Triangle Icon Construction
                    // Pointing OUTWARDS away from center? Or Directional?
                    // Standard PTZ: Up points Up (Top). Right points Right.
                    // Rotation should align with sector direction.
                    // midAngleDeg is exactly that direction.

                    return (
                        <g
                            key={`icon-${sector.id}`}
                            transform={`translate(${x}, ${y}) rotate(${midAngleDeg}) scale(${scale})`}
                            style={{ pointerEvents: 'none' }} // Let clicks pass through to path
                        >
                            {/* Standard Arrow Triangle */}
                            {/* Pointing 'Up' relative to group rotation means pointing OUT from center */}
                            {/* Reference image: "Up" triangle points UP. this means 0deg rotation for UP. */}
                            {/* But here we rotate by midAngleDeg. 0 is UP. So an 'up pointing arrow' logic works. */}
                            {/* Shape: Simple triangle pointing "Up" in local coords (which is "Out" in global) */}
                            <path
                                d="M 0 -5 L 4 2 L -4 2 Z"
                                fill={fillColor}
                            />
                        </g>
                    );
                })}

                {/* Center Button Area */}
                <g
                    onPointerDown={(e) => handlePointerDown('center', e)}
                    onPointerUp={handlePointerUp}
                    onLostPointerCapture={handlePointerUp}
                    onPointerCancel={handlePointerUp}
                    style={{ cursor: disabled ? 'default' : 'pointer' }}
                >
                    {/* Shadow/Outer Ring of center button */}
                    <circle cx="50" cy="50" r={innerR - 1} fill="#111" />

                    {/* Actual clickable button */}
                    <circle
                        cx="50"
                        cy="50"
                        r={innerR - 3}
                        fill={activeDirection === 'center' ? "url(#grad-center-active)" : "url(#grad-center)"}
                        stroke="#333"
                        strokeWidth="1"
                    />

                    {/* Inner decorative dot */}
                    <circle cx="50" cy="50" r={innerR * 0.46} fill={activeDirection === 'center' ? "#fff" : "#888"} opacity="0.8" />
                </g>
            </svg>
        </div>
    );
}

// Just export these for use
export { };
