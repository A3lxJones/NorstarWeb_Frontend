/**
 * Mini Drill Visualization Generator (for list cards)
 * Creates smaller SVG diagrams suitable for card thumbnails
 */

interface MiniDrillConfig {
    name: string;
    category: string;
}

/**
 * Generate a mini SVG visualization for a drill card thumbnail
 */
export function generateMiniDrillVisualization(config: MiniDrillConfig): string {
    const { name, category } = config;
    const normalizedName = name.toLowerCase();
    const normalizedCategory = category.toLowerCase();

    // Route to appropriate mini visualization
    if (normalizedCategory.includes('pass') || normalizedName.includes('pass')) {
        return generateMiniPassing();
    }
    if (normalizedCategory.includes('shoot') || normalizedName.includes('shoot')) {
        return generateMiniShooting();
    }
    if (normalizedCategory.includes('agil') || normalizedName.includes('agil') || normalizedName.includes('cone')) {
        return generateMiniAgility();
    }
    if (normalizedCategory.includes('speed') || normalizedName.includes('speed')) {
        return generateMiniSpeed();
    }
    if (normalizedCategory.includes('cross') || normalizedName.includes('cross')) {
        return generateMiniCrossover();
    }
    if (normalizedCategory.includes('stop') || normalizedName.includes('stop') || normalizedName.includes('brake')) {
        return generateMiniStopping();
    }
    if (normalizedCategory.includes('footwork') || normalizedName.includes('footwork')) {
        return generateMiniFootwork();
    }
    if (normalizedCategory.includes('game') || normalizedName.includes('game')) {
        return generateMiniGameSim();
    }
    if (normalizedCategory.includes('defense') || normalizedName.includes('defense')) {
        return generateMiniDefensive();
    }
    if (normalizedCategory.includes('transition') || normalizedName.includes('transition')) {
        return generateMiniTransition();
    }

    return generateMiniDefault();
}

function generateMiniPassing(): string {
    return `<svg viewBox="0 0 300 150" class="w-full h-auto" xmlns="http://www.w3.org/2000/svg">
  <rect x="10" y="10" width="280" height="130" fill="none" stroke="#a855f7" stroke-width="1.5" rx="4" opacity="0.4"/>
  <line x1="150" y1="10" x2="150" y2="140" stroke="#a855f7" stroke-width="1" opacity="0.2" stroke-dasharray="3,3"/>
  <circle cx="40" cy="50" r="5" fill="#a855f7" opacity="0.6"/>
  <circle cx="40" cy="100" r="5" fill="#a855f7" opacity="0.6"/>
  <circle cx="150" cy="75" r="5" fill="#f59e0b" opacity="0.6"/>
  <circle cx="260" cy="75" r="5" fill="#a855f7" opacity="0.5"/>
  <path d="M 45 50 Q 100 40 145 75" stroke="#f59e0b" stroke-width="1" fill="none" opacity="0.5" stroke-dasharray="2,2"/>
  <path d="M 155 75 Q 200 70 255 75" stroke="#f59e0b" stroke-width="1" fill="none" opacity="0.4" stroke-dasharray="2,2"/>
</svg>`;
}

function generateMiniShooting(): string {
    return `<svg viewBox="0 0 300 150" class="w-full h-auto" xmlns="http://www.w3.org/2000/svg">
  <rect x="10" y="10" width="280" height="130" fill="none" stroke="#a855f7" stroke-width="1.5" rx="4" opacity="0.4"/>
  <rect x="10" y="40" width="30" height="70" fill="#3b1d8e" opacity="0.1"/>
  <rect x="260" y="40" width="30" height="70" fill="#3b1d8e" opacity="0.1"/>
  <circle cx="10" cy="75" r="4" fill="#f59e0b" opacity="0.6"/>
  <circle cx="290" cy="75" r="4" fill="#f59e0b" opacity="0.6"/>
  <circle cx="50" cy="60" r="4" fill="#a855f7" opacity="0.7"/>
  <circle cx="50" cy="90" r="4" fill="#a855f7" opacity="0.7"/>
  <path d="M 54 60 Q 150 50 280 75" stroke="#f59e0b" stroke-width="1.5" fill="none" opacity="0.6"/>
  <path d="M 54 90 Q 150 90 280 75" stroke="#f59e0b" stroke-width="1" fill="none" opacity="0.4" stroke-dasharray="2,2"/>
</svg>`;
}

function generateMiniAgility(): string {
    return `<svg viewBox="0 0 300 150" class="w-full h-auto" xmlns="http://www.w3.org/2000/svg">
  <rect x="10" y="10" width="280" height="130" fill="none" stroke="#a855f7" stroke-width="1.5" rx="4" opacity="0.4"/>
  <circle cx="40" cy="50" r="3" fill="#f59e0b" opacity="0.7"/>
  <circle cx="80" cy="80" r="3" fill="#f59e0b" opacity="0.6"/>
  <circle cx="120" cy="50" r="3" fill="#f59e0b" opacity="0.6"/>
  <circle cx="160" cy="100" r="3" fill="#f59e0b" opacity="0.5"/>
  <circle cx="200" cy="70" r="3" fill="#f59e0b" opacity="0.5"/>
  <circle cx="240" cy="100" r="3" fill="#f59e0b" opacity="0.4"/>
  <circle cx="20" cy="75" r="4" fill="#a855f7" opacity="0.7"/>
  <path d="M 25 75 Q 50 40 75 75 Q 100 100 125 60 Q 150 95 175 65" stroke="#a855f7" stroke-width="1" fill="none" opacity="0.5" stroke-dasharray="2,2"/>
</svg>`;
}

function generateMiniSpeed(): string {
    return `<svg viewBox="0 0 300 150" class="w-full h-auto" xmlns="http://www.w3.org/2000/svg">
  <rect x="10" y="10" width="280" height="130" fill="none" stroke="#a855f7" stroke-width="1.5" rx="4" opacity="0.4"/>
  <line x1="10" y1="20" x2="290" y2="20" stroke="#3b1d8e" stroke-width="1.5" opacity="0.6"/>
  <line x1="10" y1="130" x2="290" y2="130" stroke="#f59e0b" stroke-width="1.5" opacity="0.6"/>
  <circle cx="40" cy="30" r="4" fill="#a855f7" opacity="0.8"/>
  <circle cx="120" cy="30" r="4" fill="#a855f7" opacity="0.7"/>
  <circle cx="200" cy="30" r="4" fill="#a855f7" opacity="0.7"/>
  <circle cx="40" cy="120" r="4" fill="#a855f7" opacity="0.3"/>
  <line x1="45" y1="25" x2="55" y2="25" stroke="#a855f7" stroke-width="1" opacity="0.4"/>
  <text x="270" y="85" font-size="20" fill="#f59e0b" opacity="0.1">→</text>
</svg>`;
}

function generateMiniCrossover(): string {
    return `<svg viewBox="0 0 300 150" class="w-full h-auto" xmlns="http://www.w3.org/2000/svg">
  <rect x="10" y="10" width="280" height="130" fill="none" stroke="#a855f7" stroke-width="1.5" rx="4" opacity="0.4"/>
  <line x1="150" y1="10" x2="150" y2="140" stroke="#a855f7" stroke-width="1" opacity="0.2" stroke-dasharray="3,3"/>
  <circle cx="40" cy="40" r="4" fill="#a855f7" opacity="0.8"/>
  <circle cx="260" cy="110" r="4" fill="#a855f7" opacity="0.8"/>
  <path d="M 44 40 Q 150 30 256 110" stroke="#a855f7" stroke-width="1.5" fill="none" opacity="0.6" stroke-dasharray="2,2"/>
  <path d="M 256 40 Q 150 120 44 110" stroke="#a855f7" stroke-width="1.5" fill="none" opacity="0.4" stroke-dasharray="2,2"/>
  <circle cx="256" cy="40" r="4" fill="#a855f7" opacity="0.4"/>
  <circle cx="44" cy="110" r="4" fill="#a855f7" opacity="0.4"/>
</svg>`;
}

function generateMiniStopping(): string {
    return `<svg viewBox="0 0 300 150" class="w-full h-auto" xmlns="http://www.w3.org/2000/svg">
  <rect x="10" y="10" width="280" height="130" fill="none" stroke="#a855f7" stroke-width="1.5" rx="4" opacity="0.4"/>
  <rect x="120" y="40" width="60" height="70" fill="#f59e0b" opacity="0.1" stroke="#f59e0b" stroke-width="1" stroke-dasharray="2,2"/>
  <circle cx="30" cy="75" r="4" fill="#a855f7" opacity="0.8"/>
  <line x1="35" y1="70" x2="45" y2="70" stroke="#a855f7" stroke-width="1" opacity="0.4"/>
  <line x1="35" y1="75" x2="50" y2="75" stroke="#a855f7" stroke-width="1" opacity="0.4"/>
  <line x1="35" y1="80" x2="45" y2="80" stroke="#a855f7" stroke-width="1" opacity="0.4"/>
  <path d="M 35 75 L 115 75" stroke="#a855f7" stroke-width="1" fill="none" opacity="0.5" stroke-dasharray="2,2"/>
  <circle cx="150" cy="75" r="6" fill="none" stroke="#f59e0b" stroke-width="1.5" opacity="0.7"/>
  <circle cx="150" cy="75" r="4" fill="#a855f7" opacity="0.6"/>
</svg>`;
}

function generateMiniFootwork(): string {
    return `<svg viewBox="0 0 300 150" class="w-full h-auto" xmlns="http://www.w3.org/2000/svg">
  <rect x="10" y="10" width="280" height="130" fill="none" stroke="#a855f7" stroke-width="1.5" rx="4" opacity="0.4"/>
  <circle cx="30" cy="75" r="4" fill="#a855f7" opacity="0.7"/>
  <circle cx="70" cy="50" r="3" fill="#f59e0b" opacity="0.6"/>
  <circle cx="70" cy="100" r="3" fill="#f59e0b" opacity="0.6"/>
  <circle cx="110" cy="60" r="3" fill="#a855f7" opacity="0.6"/>
  <circle cx="110" cy="90" r="3" fill="#a855f7" opacity="0.6"/>
  <circle cx="150" cy="75" r="3" fill="#f59e0b" opacity="0.5"/>
  <circle cx="190" cy="55" r="3" fill="#a855f7" opacity="0.5"/>
  <circle cx="190" cy="95" r="3" fill="#a855f7" opacity="0.5"/>
  <circle cx="230" cy="75" r="3" fill="#f59e0b" opacity="0.4"/>
  <path d="M 35 75 L 70 50 L 110 90 L 150 75 L 190 55 L 230 75" stroke="#a855f7" stroke-width="1" fill="none" opacity="0.4"/>
</svg>`;
}

function generateMiniGameSim(): string {
    return `<svg viewBox="0 0 300 150" class="w-full h-auto" xmlns="http://www.w3.org/2000/svg">
  <rect x="10" y="10" width="280" height="130" fill="none" stroke="#a855f7" stroke-width="1.5" rx="4" opacity="0.4"/>
  <line x1="150" y1="10" x2="150" y2="140" stroke="#a855f7" stroke-width="1" opacity="0.2" stroke-dasharray="3,3"/>
  <rect x="10" y="40" width="25" height="70" fill="#3b1d8e" opacity="0.1"/>
  <rect x="265" y="40" width="25" height="70" fill="#3b1d8e" opacity="0.1"/>
  <circle cx="50" cy="50" r="4" fill="#a855f7" opacity="0.8"/>
  <circle cx="50" cy="100" r="4" fill="#a855f7" opacity="0.8"/>
  <circle cx="150" cy="75" r="4" fill="#f59e0b" opacity="0.7"/>
  <circle cx="250" cy="60" r="4" fill="#3b1d8e" opacity="0.7"/>
  <circle cx="250" cy="90" r="4" fill="#3b1d8e" opacity="0.7"/>
</svg>`;
}

function generateMiniDefensive(): string {
    return `<svg viewBox="0 0 300 150" class="w-full h-auto" xmlns="http://www.w3.org/2000/svg">
  <rect x="10" y="10" width="280" height="130" fill="none" stroke="#a855f7" stroke-width="1.5" rx="4" opacity="0.4"/>
  <rect x="150" y="30" width="140" height="90" fill="#3b1d8e" opacity="0.08" stroke="#3b1d8e" stroke-width="1" stroke-dasharray="2,2"/>
  <circle cx="60" cy="50" r="3" fill="#a855f7" opacity="0.8"/>
  <circle cx="60" cy="100" r="3" fill="#a855f7" opacity="0.8"/>
  <circle cx="200" cy="50" r="4" fill="#3b1d8e" opacity="0.8"/>
  <circle cx="200" cy="100" r="4" fill="#3b1d8e" opacity="0.8"/>
  <circle cx="260" cy="75" r="4" fill="#3b1d8e" opacity="0.8"/>
  <path d="M 65 50 Q 130 40 200 50" stroke="#3b1d8e" stroke-width="1" fill="none" opacity="0.4"/>
</svg>`;
}

function generateMiniTransition(): string {
    return `<svg viewBox="0 0 300 150" class="w-full h-auto" xmlns="http://www.w3.org/2000/svg">
  <rect x="10" y="10" width="280" height="130" fill="none" stroke="#a855f7" stroke-width="1.5" rx="4" opacity="0.4"/>
  <line x1="150" y1="10" x2="150" y2="140" stroke="#a855f7" stroke-width="1" opacity="0.2" stroke-dasharray="3,3"/>
  <rect x="30" y="40" width="50" height="70" fill="#3b1d8e" opacity="0.08"/>
  <rect x="220" y="40" width="50" height="70" fill="#a855f7" opacity="0.08"/>
  <circle cx="50" cy="60" r="3" fill="#3b1d8e" opacity="0.8"/>
  <circle cx="50" cy="90" r="3" fill="#3b1d8e" opacity="0.8"/>
  <circle cx="150" cy="75" r="4" fill="#f59e0b" opacity="0.7"/>
  <circle cx="250" cy="60" r="3" fill="#a855f7" opacity="0.8"/>
  <circle cx="250" cy="90" r="3" fill="#a855f7" opacity="0.8"/>
  <path d="M 155 65 L 245 60" stroke="#f59e0b" stroke-width="1" fill="none" opacity="0.5"/>
  <path d="M 155 85 L 245 90" stroke="#f59e0b" stroke-width="1" fill="none" opacity="0.5"/>
</svg>`;
}

function generateMiniDefault(): string {
    return `<svg viewBox="0 0 300 150" class="w-full h-auto" xmlns="http://www.w3.org/2000/svg">
  <rect x="10" y="10" width="280" height="130" fill="none" stroke="#a855f7" stroke-width="1.5" rx="4" opacity="0.4"/>
  <line x1="150" y1="10" x2="150" y2="140" stroke="#a855f7" stroke-width="1" opacity="0.2" stroke-dasharray="3,3"/>
  <circle cx="80" cy="40" r="4" fill="#a855f7" opacity="0.6"/>
  <circle cx="150" cy="75" r="4" fill="#f59e0b" opacity="0.6"/>
  <circle cx="220" cy="110" r="4" fill="#3b1d8e" opacity="0.5"/>
  <circle cx="100" cy="120" r="4" fill="#a855f7" opacity="0.5"/>
  <path d="M 85 45 Q 120 60 145 75" stroke="#a855f7" stroke-width="1" fill="none" opacity="0.4" stroke-dasharray="2,2"/>
</svg>`;
}
