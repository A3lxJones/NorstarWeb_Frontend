/**
 * Drill Visualization Generator
 * Creates SVG diagrams based on drill properties (category, difficulty, name)
 */

interface DrillVisualizationConfig {
    name: string;
    category: string;
    difficulty: string;
    min_players: number;
    max_players: number;
}

/**
 * Generate a unique SVG visualization for a drill based on its properties
 */
export function generateDrillVisualization(config: DrillVisualizationConfig): string {
    const { name, category, difficulty, min_players, max_players } = config;
    const normalizedName = name.toLowerCase();
    const normalizedCategory = category.toLowerCase();

    // Route to appropriate visualization function
    if (normalizedCategory.includes('pass') || normalizedName.includes('pass')) {
        return generatePassingDrill(difficulty, min_players, max_players);
    }
    if (normalizedCategory.includes('shoot') || normalizedName.includes('shoot')) {
        return generateShootingDrill(difficulty, min_players, max_players);
    }
    if (normalizedCategory.includes('agil') || normalizedName.includes('agil') || normalizedName.includes('cone')) {
        return generateAgilityDrill(difficulty, min_players, max_players);
    }
    if (normalizedCategory.includes('speed') || normalizedName.includes('speed')) {
        return generateSpeedDrill(difficulty, min_players, max_players);
    }
    if (normalizedCategory.includes('cross') || normalizedName.includes('cross')) {
        return generateCrossoverDrill(difficulty, min_players, max_players);
    }
    if (normalizedCategory.includes('stop') || normalizedName.includes('stop') || normalizedName.includes('brake')) {
        return generateStoppingDrill(difficulty, min_players, max_players);
    }
    if (normalizedCategory.includes('footwork') || normalizedName.includes('footwork')) {
        return generateFootworkDrill(difficulty, min_players, max_players);
    }
    if (normalizedCategory.includes('game') || normalizedName.includes('game')) {
        return generateGameSimulationDrill(difficulty, min_players, max_players);
    }
    if (normalizedCategory.includes('defense') || normalizedName.includes('defense')) {
        return generateDefensiveDrill(difficulty, min_players, max_players);
    }
    if (normalizedCategory.includes('transition') || normalizedName.includes('transition')) {
        return generateTransitionDrill(difficulty, min_players, max_players);
    }

    // Default visualization
    return generateDefaultDrill(difficulty, min_players, max_players);
}

// ═══════════════════════════════════════════════════════════════
// PASSING DRILLS
// ═══════════════════════════════════════════════════════════════

function generatePassingDrill(difficulty: string, minPlayers: number, maxPlayers: number): string {
    const isAdvanced = difficulty === 'Advanced';
    const numPlayers = Math.min(maxPlayers, isAdvanced ? 5 : 3);

    return `
<svg viewBox="0 0 1200 600" xmlns="http://www.w3.org/2000/svg">
  <!-- Court -->
  <rect x="50" y="50" width="1100" height="500" fill="none" stroke="#a855f7" stroke-width="3" rx="10"/>
  <line x1="600" y1="50" x2="600" y2="550" stroke="#a855f7" stroke-width="2" stroke-dasharray="10,10" opacity="0.5"/>
  
  <!-- Grid pattern for passing lanes -->
  <line x1="200" y1="50" x2="200" y2="550" stroke="#a855f7" stroke-width="1" opacity="0.2"/>
  <line x1="400" y1="50" x2="400" y2="550" stroke="#a855f7" stroke-width="1" opacity="0.2"/>
  <line x1="800" y1="50" x2="800" y2="550" stroke="#a855f7" stroke-width="1" opacity="0.2"/>
  <line x1="1000" y1="50" x2="1000" y2="550" stroke="#a855f7" stroke-width="1" opacity="0.2"/>
  
  <!-- Player 1 - Starting position -->
  <circle cx="150" cy="250" r="28" fill="#a855f7" opacity="0.8"/>
  <text x="150" y="260" text-anchor="middle" fill="white" font-weight="bold" font-size="18">1</text>
  
  <!-- Player 2 - Receiving pass -->
  <circle cx="350" cy="200" r="28" fill="#a855f7" opacity="0.8"/>
  <text x="350" y="210" text-anchor="middle" fill="white" font-weight="bold" font-size="18">2</text>
  
  <!-- Player 3 - Third option -->
  <circle cx="350" cy="300" r="28" fill="#a855f7" opacity="0.8"/>
  <text x="350" y="310" text-anchor="middle" fill="white" font-weight="bold" font-size="18">3</text>
  
  ${
    isAdvanced
      ? `
  <!-- Advanced: Additional players -->
  <circle cx="550" cy="250" r="28" fill="#a855f7" opacity="0.8"/>
  <text x="550" y="260" text-anchor="middle" fill="white" font-weight="bold" font-size="18">4</text>
  
  <circle cx="750" cy="250" r="28" fill="#a855f7" opacity="0.8"/>
  <text x="750" y="260" text-anchor="middle" fill="white" font-weight="bold" font-size="18">5</text>
  `
      : ''
  }
  
  <!-- Puck -->
  <circle cx="150" cy="250" r="8" fill="#f59e0b"/>
  
  <!-- Pass arrows -->
  <defs>
    <marker id="passArrow" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
      <polygon points="0 0, 10 3, 0 6" fill="#f59e0b"/>
    </marker>
  </defs>
  
  <path d="M 165 240 L 335 210" stroke="#f59e0b" stroke-width="2.5" fill="none" marker-end="url(#passArrow)" stroke-dasharray="5,5"/>
  <path d="M 365 228 L 365 272" stroke="#f59e0b" stroke-width="2.5" fill="none" marker-end="url(#passArrow)" stroke-dasharray="5,5" opacity="0.6"/>
  
  ${
    isAdvanced
      ? `
  <path d="M 365 300 Q 450 280 550 250" stroke="#f59e0b" stroke-width="2.5" fill="none" marker-end="url(#passArrow)" stroke-dasharray="5,5" opacity="0.5"/>
  <path d="M 565 235 L 735 250" stroke="#f59e0b" stroke-width="2.5" fill="none" marker-end="url(#passArrow)" stroke-dasharray="5,5" opacity="0.4"/>
  `
      : ''
  }
  
  <!-- Labels -->
  <text x="600" y="590" text-anchor="middle" font-size="14" fill="#a855f7" font-weight="bold">Passing Drill</text>
  <text x="100" y="590" font-size="12" fill="#f59e0b" font-weight="bold">→ Pass sequence</text>
</svg>
  `;
}

// ═══════════════════════════════════════════════════════════════
// SHOOTING DRILLS
// ═══════════════════════════════════════════════════════════════

function generateShootingDrill(difficulty: string, minPlayers: number, maxPlayers: number): string {
    const isAdvanced = difficulty === 'Advanced';

    return `
<svg viewBox="0 0 1200 600" xmlns="http://www.w3.org/2000/svg">
  <!-- Court -->
  <rect x="50" y="50" width="1100" height="500" fill="none" stroke="#a855f7" stroke-width="3" rx="10"/>
  
  <!-- Goal zones highlighted -->
  <rect x="50" y="150" width="150" height="300" fill="#3b1d8e" opacity="0.15" stroke="#3b1d8e" stroke-width="2"/>
  <rect x="1000" y="150" width="150" height="300" fill="#3b1d8e" opacity="0.15" stroke="#3b1d8e" stroke-width="2"/>
  
  <!-- Goals -->
  <circle cx="50" cy="300" r="10" fill="#f59e0b" opacity="0.8"/>
  <circle cx="1150" cy="300" r="10" fill="#f59e0b" opacity="0.8"/>
  
  <!-- Shooting lane -->
  <line x1="300" y1="150" x2="1000" y2="150" stroke="#a855f7" stroke-width="1" opacity="0.3" stroke-dasharray="5,5"/>
  <line x1="300" y1="450" x2="1000" y2="450" stroke="#a855f7" stroke-width="1" opacity="0.3" stroke-dasharray="5,5"/>
  
  <!-- Players in shooting formation -->
  <circle cx="300" cy="250" r="28" fill="#a855f7" opacity="0.8"/>
  <text x="300" y="260" text-anchor="middle" fill="white" font-weight="bold" font-size="18">1</text>
  
  <circle cx="300" cy="350" r="28" fill="#a855f7" opacity="0.8"/>
  <text x="300" y="360" text-anchor="middle" fill="white" font-weight="bold" font-size="18">2</text>
  
  ${
    isAdvanced
      ? `
  <!-- Advanced: Multiple shooting angles -->
  <circle cx="500" cy="200" r="28" fill="#a855f7" opacity="0.8"/>
  <text x="500" y="210" text-anchor="middle" fill="white" font-weight="bold" font-size="18">3</text>
  
  <circle cx="500" cy="400" r="28" fill="#a855f7" opacity="0.8"/>
  <text x="500" y="410" text-anchor="middle" fill="white" font-weight="bold" font-size="18">4</text>
  
  <circle cx="700" cy="300" r="28" fill="#a855f7" opacity="0.8"/>
  <text x="700" y="310" text-anchor="middle" fill="white" font-weight="bold" font-size="18">5</text>
  `
      : ''
  }
  
  <!-- Puck at goal -->
  <circle cx="1100" cy="300" r="8" fill="#f59e0b"/>
  
  <!-- Shot trajectory -->
  <defs>
    <marker id="shotArrow" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
      <polygon points="0 0, 10 3, 0 6" fill="#f59e0b"/>
    </marker>
  </defs>
  
  <path d="M 328 250 Q 700 280 1090 300" stroke="#f59e0b" stroke-width="3" fill="none" marker-end="url(#shotArrow)" opacity="0.7"/>
  
  ${
    isAdvanced
      ? `
  <path d="M 328 350 Q 600 340 1090 300" stroke="#f59e0b" stroke-width="2.5" fill="none" marker-end="url(#shotArrow)" opacity="0.5" stroke-dasharray="5,5"/>
  `
      : ''
  }
  
  <!-- Labels -->
  <text x="600" y="590" text-anchor="middle" font-size="14" fill="#a855f7" font-weight="bold">Shooting Drill</text>
  <text x="100" y="590" font-size="12" fill="#f59e0b" font-weight="bold">→ Shot on goal</text>
</svg>
  `;
}

// ═══════════════════════════════════════════════════════════════
// AGILITY & CONE DRILLS
// ═══════════════════════════════════════════════════════════════

function generateAgilityDrill(difficulty: string, minPlayers: number, maxPlayers: number): string {
    const numCones = difficulty === 'Advanced' ? 8 : difficulty === 'Intermediate' ? 5 : 3;

    return `
<svg viewBox="0 0 1200 600" xmlns="http://www.w3.org/2000/svg">
  <!-- Court -->
  <rect x="50" y="50" width="1100" height="500" fill="none" stroke="#a855f7" stroke-width="3" rx="10"/>
  
  <!-- Cone pattern -->
  ${Array.from({ length: numCones })
    .map((_, i) => {
      const x = 200 + (i % 4) * 250;
      const y = 150 + (Math.floor(i / 4) * 250);
      return `
    <!-- Cone ${i + 1} -->
    <polygon points="${x},${y - 20} ${x + 15},${y + 15} ${x - 15},${y + 15}" fill="#f59e0b" opacity="0.7"/>
    <circle cx="${x}" cy="${y + 20}" r="10" fill="#f59e0b" opacity="0.5"/>
      `;
    })
    .join('')}
  
  <!-- Player path -->
  <circle cx="100" cy="300" r="28" fill="#a855f7" opacity="0.8"/>
  <text x="100" y="310" text-anchor="middle" fill="white" font-weight="bold" font-size="18">1</text>
  
  <!-- Weaving path through cones -->
  <path d="M 130 300 Q 200 200 250 300 Q 300 400 350 300 Q 400 200 450 300 ${
    numCones > 3
      ? 'Q 500 400 550 300 Q 600 200 650 300 Q 700 400 750 300'
      : ''
  }" stroke="#a855f7" stroke-width="2" fill="none" stroke-dasharray="5,5" opacity="0.6"/>
  
  <!-- Direction arrows -->
  <defs>
    <marker id="dirArrow" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
      <polygon points="0 0, 10 3, 0 6" fill="#a855f7" opacity="0.6"/>
    </marker>
  </defs>
  
  <!-- Labels -->
  <text x="600" y="590" text-anchor="middle" font-size="14" fill="#a855f7" font-weight="bold">Agility Drill</text>
  <text x="100" y="590" font-size="12" fill="#f59e0b" font-weight="bold">⚡ Cone weaving</text>
</svg>
  `;
}

// ═══════════════════════════════════════════════════════════════
// SPEED DRILLS
// ═══════════════════════════════════════════════════════════════

function generateSpeedDrill(difficulty: string, minPlayers: number, maxPlayers: number): string {
    return `
<svg viewBox="0 0 1200 600" xmlns="http://www.w3.org/2000/svg">
  <!-- Court -->
  <rect x="50" y="50" width="1100" height="500" fill="none" stroke="#a855f7" stroke-width="3" rx="10"/>
  
  <!-- Sprint lanes -->
  <line x1="150" y1="50" x2="150" y2="550" stroke="#a855f7" stroke-width="2" opacity="0.4"/>
  <line x1="350" y1="50" x2="350" y2="550" stroke="#a855f7" stroke-width="2" opacity="0.4"/>
  <line x1="550" y1="50" x2="550" y2="550" stroke="#a855f7" stroke-width="2" opacity="0.4"/>
  <line x1="750" y1="50" x2="750" y2="550" stroke="#a855f7" stroke-width="2" opacity="0.4"/>
  <line x1="950" y1="50" x2="950" y2="550" stroke="#a855f7" stroke-width="2" opacity="0.4"/>
  
  <!-- Start line -->
  <line x1="50" y1="50" x2="1150" y2="50" stroke="#3b1d8e" stroke-width="3" opacity="0.7"/>
  
  <!-- Finish line -->
  <line x1="50" y1="550" x2="1150" y2="550" stroke="#f59e0b" stroke-width="3" opacity="0.7"/>
  
  <!-- Players at start -->
  <circle cx="150" cy="80" r="25" fill="#a855f7" opacity="0.8"/>
  <text x="150" y="90" text-anchor="middle" fill="white" font-weight="bold" font-size="16">1</text>
  
  <circle cx="350" cy="80" r="25" fill="#a855f7" opacity="0.8"/>
  <text x="350" y="90" text-anchor="middle" fill="white" font-weight="bold" font-size="16">2</text>
  
  <circle cx="550" cy="80" r="25" fill="#a855f7" opacity="0.8"/>
  <text x="550" y="90" text-anchor="middle" fill="white" font-weight="bold" font-size="16">3</text>
  
  <!-- Players at finish (faded) -->
  <circle cx="150" cy="520" r="25" fill="#a855f7" opacity="0.3"/>
  <text x="150" y="530" text-anchor="middle" fill="white" font-weight="bold" font-size="16">1</text>
  
  <!-- Speed indicators -->
  <text x="1050" y="300" font-size="48" fill="#f59e0b" opacity="0.15" font-weight="bold">→</text>
  <text x="1050" y="350" font-size="48" fill="#f59e0b" opacity="0.15" font-weight="bold">→</text>
  
  <!-- Labels -->
  <text x="600" y="590" text-anchor="middle" font-size="14" fill="#a855f7" font-weight="bold">Speed Drill</text>
  <text x="100" y="590" font-size="12" fill="#f59e0b" font-weight="bold">⚡ Sprint</text>
</svg>
  `;
}

// ═══════════════════════════════════════════════════════════════
// CROSSOVER DRILLS
// ═══════════════════════════════════════════════════════════════

function generateCrossoverDrill(difficulty: string, minPlayers: number, maxPlayers: number): string {
    return `
<svg viewBox="0 0 1200 600" xmlns="http://www.w3.org/2000/svg">
  <!-- Court -->
  <rect x="50" y="50" width="1100" height="500" fill="none" stroke="#a855f7" stroke-width="3" rx="10"/>
  <line x1="600" y1="50" x2="600" y2="550" stroke="#a855f7" stroke-width="2" stroke-dasharray="10,10" opacity="0.5"/>
  
  <!-- Player 1 - Starting left -->
  <circle cx="150" cy="200" r="28" fill="#a855f7" opacity="0.8"/>
  <text x="150" y="210" text-anchor="middle" fill="white" font-weight="bold" font-size="18">1</text>
  
  <!-- Player 2 - Starting right -->
  <circle cx="1050" cy="400" r="28" fill="#a855f7" opacity="0.8"/>
  <text x="1050" y="410" text-anchor="middle" fill="white" font-weight="bold" font-size="18">2</text>
  
  <!-- Crossover paths -->
  <defs>
    <marker id="crossArrow" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
      <polygon points="0 0, 10 3, 0 6" fill="#a855f7" opacity="0.6"/>
    </marker>
  </defs>
  
  <!-- Player 1 crossing to right -->
  <path d="M 178 200 Q 600 100 1000 400" stroke="#a855f7" stroke-width="2.5" fill="none" marker-end="url(#crossArrow)" opacity="0.7" stroke-dasharray="5,5"/>
  
  <!-- Player 2 crossing to left -->
  <path d="M 1022 400 Q 600 500 200 200" stroke="#a855f7" stroke-width="2.5" fill="none" marker-end="url(#crossArrow)" opacity="0.5" stroke-dasharray="5,5"/>
  
  <!-- End positions (faded) -->
  <circle cx="1000" cy="400" r="28" fill="#a855f7" opacity="0.2"/>
  <circle cx="200" cy="200" r="28" fill="#a855f7" opacity="0.2"/>
  
  <!-- Labels -->
  <text x="600" y="590" text-anchor="middle" font-size="14" fill="#a855f7" font-weight="bold">Crossover Drill</text>
  <text x="100" y="590" font-size="12" fill="#a855f7" font-weight="bold">↔ Cross pattern</text>
</svg>
  `;
}

// ═══════════════════════════════════════════════════════════════
// STOPPING DRILLS
// ═══════════════════════════════════════════════════════════════

function generateStoppingDrill(difficulty: string, minPlayers: number, maxPlayers: number): string {
    return `
<svg viewBox="0 0 1200 600" xmlns="http://www.w3.org/2000/svg">
  <!-- Court -->
  <rect x="50" y="50" width="1100" height="500" fill="none" stroke="#a855f7" stroke-width="3" rx="10"/>
  
  <!-- Stopping zones marked -->
  <rect x="300" y="150" width="200" height="300" fill="#f59e0b" opacity="0.1" stroke="#f59e0b" stroke-width="2" stroke-dasharray="5,5"/>
  <rect x="700" y="150" width="200" height="300" fill="#f59e0b" opacity="0.1" stroke="#f59e0b" stroke-width="2" stroke-dasharray="5,5"/>
  
  <!-- Zone labels -->
  <text x="400" y="180" text-anchor="middle" font-size="12" fill="#f59e0b" opacity="0.6">STOP ZONE 1</text>
  <text x="800" y="180" text-anchor="middle" font-size="12" fill="#f59e0b" opacity="0.6">STOP ZONE 2</text>
  
  <!-- Players in motion -->
  <circle cx="100" cy="300" r="28" fill="#a855f7" opacity="0.8"/>
  <text x="100" y="310" text-anchor="middle" fill="white" font-weight="bold" font-size="18">1</text>
  
  <!-- Speed lines (motion) -->
  <line x1="130" y1="290" x2="150" y2="290" stroke="#a855f7" stroke-width="2" opacity="0.5"/>
  <line x1="135" y1="300" x2="160" y2="300" stroke="#a855f7" stroke-width="2" opacity="0.5"/>
  <line x1="130" y1="310" x2="150" y2="310" stroke="#a855f7" stroke-width="2" opacity="0.5"/>
  
  <!-- Path to stop zone -->
  <path d="M 130 300 L 300 300" stroke="#a855f7" stroke-width="2" fill="none" stroke-dasharray="5,5" opacity="0.6"/>
  
  <!-- Stopped position -->
  <circle cx="400" cy="300" r="28" fill="#a855f7" opacity="0.4"/>
  <text x="400" y="310" text-anchor="middle" fill="white" font-weight="bold" font-size="18">1</text>
  
  <!-- Stop marker -->
  <circle cx="400" cy="300" r="35" fill="none" stroke="#f59e0b" stroke-width="2" opacity="0.7"/>
  
  <!-- Labels -->
  <text x="600" y="590" text-anchor="middle" font-size="14" fill="#a855f7" font-weight="bold">Stopping Drill</text>
  <text x="100" y="590" font-size="12" fill="#f59e0b" font-weight="bold">⏹ Braking control</text>
</svg>
  `;
}

// ═══════════════════════════════════════════════════════════════
// FOOTWORK DRILLS
// ═══════════════════════════════════════════════════════════════

function generateFootworkDrill(difficulty: string, minPlayers: number, maxPlayers: number): string {
    return `
<svg viewBox="0 0 1200 600" xmlns="http://www.w3.org/2000/svg">
  <!-- Court -->
  <rect x="50" y="50" width="1100" height="500" fill="none" stroke="#a855f7" stroke-width="3" rx="10"/>
  
  <!-- Grid for footwork zones -->
  <rect x="200" y="150" width="250" height="300" fill="#a855f7" opacity="0.05" stroke="#a855f7" stroke-width="1"/>
  <rect x="500" y="150" width="250" height="300" fill="#a855f7" opacity="0.05" stroke="#a855f7" stroke-width="1"/>
  <rect x="800" y="150" width="250" height="300" fill="#a855f7" opacity="0.05" stroke="#a855f7" stroke-width="1"/>
  
  <!-- Footwork pattern 1 -->
  <circle cx="200" cy="200" r="8" fill="#f59e0b" opacity="0.7"/>
  <circle cx="250" cy="250" r="8" fill="#f59e0b" opacity="0.6"/>
  <circle cx="200" cy="300" r="8" fill="#f59e0b" opacity="0.5"/>
  <circle cx="250" cy="350" r="8" fill="#f59e0b" opacity="0.4"/>
  
  <!-- Footwork pattern 2 -->
  <circle cx="500" cy="150" r="8" fill="#a855f7" opacity="0.7"/>
  <circle cx="550" cy="200" r="8" fill="#a855f7" opacity="0.6"/>
  <circle cx="500" cy="250" r="8" fill="#a855f7" opacity="0.5"/>
  <circle cx="550" cy="300" r="8" fill="#a855f7" opacity="0.4"/>
  <circle cx="500" cy="350" r="8" fill="#a855f7" opacity="0.3"/>
  
  <!-- Footwork pattern 3 -->
  <circle cx="800" cy="300" r="8" fill="#f59e0b" opacity="0.7"/>
  <circle cx="850" cy="250" r="8" fill="#f59e0b" opacity="0.6"/>
  <circle cx="900" cy="300" r="8" fill="#f59e0b" opacity="0.5"/>
  <circle cx="850" cy="350" r="8" fill="#f59e0b" opacity="0.4"/>
  
  <!-- Player -->
  <circle cx="150" cy="300" r="28" fill="#a855f7" opacity="0.8"/>
  <text x="150" y="310" text-anchor="middle" fill="white" font-weight="bold" font-size="18">1</text>
  
  <!-- Labels -->
  <text x="600" y="590" text-anchor="middle" font-size="14" fill="#a855f7" font-weight="bold">Footwork Drill</text>
  <text x="100" y="590" font-size="12" fill="#f59e0b" font-weight="bold">👟 Foot placement</text>
</svg>
  `;
}

// ═══════════════════════════════════════════════════════════════
// GAME SIMULATION DRILLS
// ═══════════════════════════════════════════════════════════════

function generateGameSimulationDrill(difficulty: string, minPlayers: number, maxPlayers: number): string {
    return `
<svg viewBox="0 0 1200 600" xmlns="http://www.w3.org/2000/svg">
  <!-- Court -->
  <rect x="50" y="50" width="1100" height="500" fill="none" stroke="#a855f7" stroke-width="3" rx="10"/>
  <line x1="600" y1="50" x2="600" y2="550" stroke="#a855f7" stroke-width="2" stroke-dasharray="10,10" opacity="0.5"/>
  
  <!-- Goal zones -->
  <rect x="50" y="150" width="150" height="300" fill="#3b1d8e" opacity="0.1" stroke="#3b1d8e" stroke-width="2"/>
  <rect x="1000" y="150" width="150" height="300" fill="#3b1d8e" opacity="0.1" stroke="#3b1d8e" stroke-width="2"/>
  
  <!-- Offensive team (Purple) -->
  <circle cx="200" cy="200" r="25" fill="#a855f7" opacity="0.8"/>
  <text x="200" y="210" text-anchor="middle" fill="white" font-weight="bold" font-size="16">O1</text>
  
  <circle cx="200" cy="400" r="25" fill="#a855f7" opacity="0.8"/>
  <text x="200" y="410" text-anchor="middle" fill="white" font-weight="bold" font-size="16">O2</text>
  
  <circle cx="600" cy="300" r="25" fill="#a855f7" opacity="0.9"/>
  <text x="600" y="310" text-anchor="middle" fill="white" font-weight="bold" font-size="16">O3</text>
  
  <!-- Defensive team (Blue) -->
  <circle cx="400" cy="250" r="25" fill="#3b1d8e" opacity="0.7"/>
  <text x="400" y="260" text-anchor="middle" fill="white" font-weight="bold" font-size="16">D1</text>
  
  <circle cx="800" cy="350" r="25" fill="#3b1d8e" opacity="0.7"/>
  <text x="800" y="360" text-anchor="middle" fill="white" font-weight="bold" font-size="16">D2</text>
  
  <!-- Puck -->
  <circle cx="600" cy="300" r="8" fill="#f59e0b"/>
  
  <!-- Game movement -->
  <path d="M 615 290 L 950 200" stroke="#f59e0b" stroke-width="2" fill="none" opacity="0.6" stroke-dasharray="5,5"/>
  
  <!-- Labels -->
  <text x="600" y="590" text-anchor="middle" font-size="14" fill="#a855f7" font-weight="bold">Game Simulation</text>
  <text x="100" y="590" font-size="12" fill="#a855f7" font-weight="bold">🎮 Offense vs Defense</text>
</svg>
  `;
}

// ═══════════════════════════════════════════════════════════════
// DEFENSIVE DRILLS
// ═══════════════════════════════════════════════════════════════

function generateDefensiveDrill(difficulty: string, minPlayers: number, maxPlayers: number): string {
    return `
<svg viewBox="0 0 1200 600" xmlns="http://www.w3.org/2000/svg">
  <!-- Court -->
  <rect x="50" y="50" width="1100" height="500" fill="none" stroke="#a855f7" stroke-width="3" rx="10"/>
  
  <!-- Defensive zone highlighted -->
  <rect x="700" y="100" width="400" height="400" fill="#3b1d8e" opacity="0.1" stroke="#3b1d8e" stroke-width="2" stroke-dasharray="5,5"/>
  <text x="900" y="130" text-anchor="middle" font-size="12" fill="#3b1d8e" opacity="0.6" font-weight="bold">DEFENSIVE ZONE</text>
  
  <!-- Offensive players attacking -->
  <circle cx="300" cy="200" r="25" fill="#a855f7" opacity="0.8"/>
  <text x="300" y="210" text-anchor="middle" fill="white" font-weight="bold" font-size="16">O</text>
  
  <circle cx="300" cy="400" r="25" fill="#a855f7" opacity="0.8"/>
  <text x="300" y="410" text-anchor="middle" fill="white" font-weight="bold" font-size="16">O</text>
  
  <!-- Defensive players -->
  <circle cx="800" cy="200" r="25" fill="#3b1d8e" opacity="0.9"/>
  <text x="800" y="210" text-anchor="middle" fill="white" font-weight="bold" font-size="16">D</text>
  
  <circle cx="800" cy="400" r="25" fill="#3b1d8e" opacity="0.9"/>
  <text x="800" y="410" text-anchor="middle" fill="white" font-weight="bold" font-size="16">D</text>
  
  <circle cx="1000" cy="300" r="25" fill="#3b1d8e" opacity="0.9"/>
  <text x="1000" y="310" text-anchor="middle" fill="white" font-weight="bold" font-size="16">D</text>
  
  <!-- Puck -->
  <circle cx="550" cy="300" r="8" fill="#f59e0b"/>
  
  <!-- Defensive positioning -->
  <path d="M 575 290 Q 650 200 800 200" stroke="#3b1d8e" stroke-width="2" fill="none" opacity="0.5" stroke-dasharray="5,5"/>
  <path d="M 575 310 Q 650 400 800 400" stroke="#3b1d8e" stroke-width="2" fill="none" opacity="0.5" stroke-dasharray="5,5"/>
  
  <!-- Labels -->
  <text x="600" y="590" text-anchor="middle" font-size="14" fill="#a855f7" font-weight="bold">Defensive Drill</text>
  <text x="100" y="590" font-size="12" fill="#3b1d8e" font-weight="bold">🛡 Defensive coverage</text>
</svg>
  `;
}

// ═══════════════════════════════════════════════════════════════
// TRANSITION DRILLS
// ═══════════════════════════════════════════════════════════════

function generateTransitionDrill(difficulty: string, minPlayers: number, maxPlayers: number): string {
    return `
<svg viewBox="0 0 1200 600" xmlns="http://www.w3.org/2000/svg">
  <!-- Court -->
  <rect x="50" y="50" width="1100" height="500" fill="none" stroke="#a855f7" stroke-width="3" rx="10"/>
  <line x1="600" y1="50" x2="600" y2="550" stroke="#a855f7" stroke-width="2" stroke-dasharray="10,10" opacity="0.5"/>
  
  <!-- Transition zones -->
  <rect x="200" y="150" width="200" height="300" fill="#a855f7" opacity="0.08"/>
  <rect x="800" y="150" width="200" height="300" fill="#3b1d8e" opacity="0.08"/>
  
  <!-- Defensive zone -->
  <circle cx="200" cy="200" r="22" fill="#3b1d8e" opacity="0.8"/>
  <text x="200" y="208" text-anchor="middle" fill="white" font-weight="bold" font-size="14">D</text>
  
  <circle cx="200" cy="400" r="22" fill="#3b1d8e" opacity="0.8"/>
  <text x="200" y="408" text-anchor="middle" fill="white" font-weight="bold" font-size="14">D</text>
  
  <!-- Mid-ice (transition) -->
  <circle cx="600" cy="300" r="25" fill="#a855f7" opacity="0.9"/>
  <text x="600" y="310" text-anchor="middle" fill="white" font-weight="bold" font-size="16">•</text>
  
  <!-- Offensive zone -->
  <circle cx="1000" cy="250" r="22" fill="#a855f7" opacity="0.8"/>
  <text x="1000" y="258" text-anchor="middle" fill="white" font-weight="bold" font-size="14">O</text>
  
  <circle cx="1000" cy="350" r="22" fill="#a855f7" opacity="0.8"/>
  <text x="1000" y="358" text-anchor="middle" fill="white" font-weight="bold" font-size="14">O</text>
  
  <!-- Puck -->
  <circle cx="600" cy="300" r="8" fill="#f59e0b"/>
  
  <!-- Transition paths -->
  <defs>
    <marker id="transArrow" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
      <polygon points="0 0, 10 3, 0 6" fill="#f59e0b"/>
    </marker>
  </defs>
  
  <path d="M 625 285 L 970 250" stroke="#f59e0b" stroke-width="2.5" fill="none" marker-end="url(#transArrow)" opacity="0.7"/>
  <path d="M 625 315 L 970 350" stroke="#f59e0b" stroke-width="2.5" fill="none" marker-end="url(#transArrow)" opacity="0.7"/>
  
  <!-- Labels -->
  <text x="200" y="530" text-anchor="middle" font-size="11" fill="#3b1d8e" font-weight="bold">DEF</text>
  <text x="600" y="590" text-anchor="middle" font-size="14" fill="#a855f7" font-weight="bold">Transition Drill</text>
  <text x="1000" y="530" text-anchor="middle" font-size="11" fill="#a855f7" font-weight="bold">OFF</text>
</svg>
  `;
}

// ═══════════════════════════════════════════════════════════════
// DEFAULT / FALLBACK
// ═══════════════════════════════════════════════════════════════

function generateDefaultDrill(difficulty: string, minPlayers: number, maxPlayers: number): string {
    return `
<svg viewBox="0 0 1200 600" xmlns="http://www.w3.org/2000/svg">
  <!-- Court -->
  <rect x="50" y="50" width="1100" height="500" fill="none" stroke="#a855f7" stroke-width="3" rx="10"/>
  <line x1="600" y1="50" x2="600" y2="550" stroke="#a855f7" stroke-width="2" stroke-dasharray="10,10" opacity="0.5"/>
  
  <!-- Generic players based on min/max -->
  ${Array.from({ length: Math.min(maxPlayers, 5) })
    .map((_, i) => {
      const angle = (i / Math.min(maxPlayers, 5)) * Math.PI * 2;
      const x = 600 + Math.cos(angle) * 150;
      const y = 300 + Math.sin(angle) * 150;
      return `
    <circle cx="${x}" cy="${y}" r="25" fill="#a855f7" opacity="0.8"/>
    <text x="${x}" y="${y + 8}" text-anchor="middle" fill="white" font-weight="bold" font-size="16">${i + 1}</text>
      `;
    })
    .join('')}
  
  <!-- Center puck -->
  <circle cx="600" cy="300" r="8" fill="#f59e0b"/>
  
  <!-- Labels -->
  <text x="600" y="590" text-anchor="middle" font-size="14" fill="#a855f7" font-weight="bold">Drill Visualization</text>
  <text x="100" y="590" font-size="12" fill="#a855f7" font-weight="bold">Players: ${minPlayers}-${maxPlayers}</text>
</svg>
  `;
}
