"use client";

export function FlyingCarScene() {
  return (
    <svg
      viewBox="0 0 480 200"
      style={{ width: "100%", maxWidth: 560, imageRendering: "pixelated", display: "block" }}
      xmlns="http://www.w3.org/2000/svg"
      shapeRendering="crispEdges"
    >
      {/* Sky */}
      <rect x="0" y="0" width="480" height="200" fill="#06060f" />

      {/* Stars */}
      {([[12,8],[48,18],[90,6],[140,20],[200,10],[260,14],[310,5],[360,18],[420,8],[450,22],[30,36],[75,28],[160,32],[230,40],[290,24],[380,30],[440,38],[55,12],[175,16],[330,10]] as [number,number][]).map(([x,y],i) => (
        <rect key={i} x={x} y={y} width="2" height="2" fill="#ffffff" opacity="0.7" />
      ))}

      {/* Moon */}
      <rect x="402" y="10" width="20" height="4" fill="#ccccdd" />
      <rect x="400" y="14" width="24" height="16" fill="#ccccdd" />
      <rect x="402" y="30" width="20" height="4" fill="#ccccdd" />
      <rect x="406" y="16" width="4" height="4" fill="#aaaacc" />
      <rect x="414" y="22" width="4" height="4" fill="#aaaacc" />

      {/* City buildings */}
      <rect x="0"   y="132" width="32" height="68" fill="#1a1a30" />
      <rect x="4"   y="136" width="6"  height="6"  fill="#ffbe0b" opacity="0.8" />
      <rect x="14"  y="136" width="6"  height="6"  fill="#ffbe0b" opacity="0.5" />
      <rect x="4"   y="148" width="6"  height="6"  fill="#ffbe0b" opacity="0.6" />
      <rect x="22"  y="144" width="6"  height="6"  fill="#00f5ff" opacity="0.4" />

      <rect x="36"  y="108" width="28" height="92" fill="#141428" />
      <rect x="49"  y="102" width="4"  height="8"  fill="#141428" />
      <rect x="50"  y="100" width="2"  height="4"  fill="#ff006e" opacity="0.9" />
      <rect x="40"  y="116" width="6"  height="6"  fill="#ffbe0b" opacity="0.7" />
      <rect x="50"  y="116" width="6"  height="6"  fill="#ffbe0b" opacity="0.4" />
      <rect x="40"  y="128" width="6"  height="6"  fill="#00f5ff" opacity="0.5" />
      <rect x="50"  y="128" width="6"  height="6"  fill="#ffbe0b" opacity="0.8" />
      <rect x="40"  y="140" width="6"  height="6"  fill="#ffbe0b" opacity="0.3" />

      <rect x="68"  y="148" width="20" height="52" fill="#1e1e36" />
      <rect x="92"  y="120" width="24" height="80" fill="#12122a" />
      <rect x="96"  y="124" width="6"  height="6"  fill="#00f5ff" opacity="0.5" />
      <rect x="104" y="124" width="6"  height="6"  fill="#ffbe0b" opacity="0.6" />
      <rect x="96"  y="136" width="6"  height="6"  fill="#ffbe0b" opacity="0.4" />
      <rect x="104" y="136" width="6"  height="6"  fill="#00f5ff" opacity="0.7" />

      <rect x="120" y="140" width="16" height="60" fill="#1a1a30" />
      <rect x="140" y="128" width="36" height="72" fill="#141428" />
      <rect x="144" y="132" width="6"  height="6"  fill="#ffbe0b" opacity="0.7" />
      <rect x="154" y="132" width="6"  height="6"  fill="#00f5ff" opacity="0.5" />
      <rect x="164" y="132" width="6"  height="6"  fill="#ffbe0b" opacity="0.4" />
      <rect x="144" y="144" width="6"  height="6"  fill="#00f5ff" opacity="0.6" />
      <rect x="154" y="144" width="6"  height="6"  fill="#ffbe0b" opacity="0.8" />

      <rect x="300" y="120" width="28" height="80" fill="#12122a" />
      <rect x="304" y="128" width="6"  height="6"  fill="#ffbe0b" opacity="0.7" />
      <rect x="314" y="128" width="6"  height="6"  fill="#00f5ff" opacity="0.5" />
      <rect x="304" y="140" width="6"  height="6"  fill="#ffbe0b" opacity="0.4" />
      <rect x="314" y="140" width="6"  height="6"  fill="#ffbe0b" opacity="0.8" />

      <rect x="332" y="100" width="32" height="100" fill="#141428" />
      <rect x="333" y="94"  width="4"  height="8"   fill="#141428" />
      <rect x="334" y="92"  width="2"  height="4"   fill="#ff006e" opacity="0.9" />
      <rect x="336" y="108" width="6"  height="6"   fill="#00f5ff" opacity="0.6" />
      <rect x="348" y="108" width="6"  height="6"   fill="#ffbe0b" opacity="0.5" />
      <rect x="336" y="120" width="6"  height="6"   fill="#ffbe0b" opacity="0.7" />
      <rect x="348" y="120" width="6"  height="6"   fill="#00f5ff" opacity="0.4" />
      <rect x="336" y="132" width="6"  height="6"   fill="#ffbe0b" opacity="0.6" />

      <rect x="368" y="132" width="20" height="68" fill="#1e1e36" />
      <rect x="392" y="116" width="28" height="84" fill="#141428" />
      <rect x="396" y="124" width="6"  height="6"  fill="#ffbe0b" opacity="0.7" />
      <rect x="406" y="124" width="6"  height="6"  fill="#00f5ff" opacity="0.5" />
      <rect x="396" y="136" width="6"  height="6"  fill="#00f5ff" opacity="0.6" />
      <rect x="406" y="136" width="6"  height="6"  fill="#ffbe0b" opacity="0.4" />

      <rect x="424" y="140" width="24" height="60" fill="#1a1a30" />
      <rect x="452" y="124" width="28" height="76" fill="#12122a" />
      <rect x="456" y="132" width="6"  height="6"  fill="#ffbe0b" opacity="0.5" />
      <rect x="456" y="144" width="6"  height="6"  fill="#00f5ff" opacity="0.4" />

      {/* Horizon glow */}
      <rect x="0" y="148" width="480" height="4" fill="#00f5ff" opacity="0.06" />

      {/* Motion trail lines (left of car) */}
      <rect x="82"  y="93"  width="44" height="3" fill="#00f5ff" opacity="0.35" />
      <rect x="72"  y="101" width="32" height="3" fill="#00f5ff" opacity="0.2" />
      <rect x="78"  y="109" width="38" height="2" fill="#00f5ff" opacity="0.12" />

      {/* ── FLYING CAR (centered ~x=255, y=100) ── */}

      {/* Rotor arms */}
      <rect x="165" y="88" width="24" height="4" fill="#3a3a5a" />
      <rect x="315" y="88" width="24" height="4" fill="#3a3a5a" />

      {/* Rotor blades */}
      <rect x="145" y="84" width="60" height="4" fill="#8888aa" />
      <rect x="319" y="84" width="60" height="4" fill="#8888aa" />

      {/* Rotor hub */}
      <rect x="186" y="80" width="6" height="14" fill="#8888aa" />
      <rect x="312" y="80" width="6" height="14" fill="#8888aa" />

      {/* Skids */}
      <rect x="216" y="120" width="12" height="4" fill="#2a2a4a" />
      <rect x="276" y="120" width="12" height="4" fill="#2a2a4a" />
      <rect x="216" y="124" width="4"  height="4" fill="#1a1a30" />
      <rect x="284" y="124" width="4"  height="4" fill="#1a1a30" />

      {/* Body underside shadow */}
      <rect x="208" y="116" width="92" height="4" fill="#005060" />

      {/* Main body */}
      <rect x="208" y="96" width="92" height="20" fill="#00b8c8" />

      {/* Body top highlight */}
      <rect x="208" y="96" width="92" height="4" fill="#00f5ff" />

      {/* Side stripe */}
      <rect x="208" y="108" width="92" height="2" fill="#0090a0" />

      {/* Cockpit canopy */}
      <rect x="218" y="82" width="56" height="18" fill="#091820" />
      <rect x="220" y="84" width="52" height="14" fill="#002838" />
      {/* canopy glare */}
      <rect x="222" y="85" width="16" height="4" fill="#00f5ff" opacity="0.25" />
      <rect x="222" y="90" width="8"  height="2" fill="#00f5ff" opacity="0.12" />

      {/* Nose */}
      <rect x="296" y="99"  width="14" height="14" fill="#006070" />
      <rect x="308" y="102" width="6"  height="10" fill="#004858" />
      <rect x="312" y="104" width="4"  height="6"  fill="#003040" />

      {/* Tail fin */}
      <rect x="208" y="88"  width="4" height="10" fill="#006070" />
      <rect x="204" y="90"  width="4" height="8"  fill="#004858" />

      {/* Exhaust thruster */}
      <rect x="194" y="100" width="14" height="8" fill="#ff006e" opacity="0.95" />
      <rect x="184" y="101" width="12" height="6" fill="#ff006e" opacity="0.55" />
      <rect x="174" y="102" width="12" height="5" fill="#ff4488" opacity="0.3" />
      <rect x="164" y="103" width="12" height="4" fill="#ff6699" opacity="0.15" />

      {/* Nav lights */}
      <rect x="208" y="100" width="3" height="3" fill="#ff2222" />
      <rect x="310" y="100" width="3" height="3" fill="#22ff22" />

      {/* Rotor blur */}
      <rect x="145" y="85" width="60" height="2" fill="#00f5ff" opacity="0.15" />
      <rect x="319" y="85" width="60" height="2" fill="#00f5ff" opacity="0.15" />

      {/* Underglow */}
      <rect x="204" y="120" width="100" height="6"  fill="#00f5ff" opacity="0.08" />
      <rect x="200" y="125" width="108" height="4" fill="#00f5ff" opacity="0.04" />
    </svg>
  );
}
