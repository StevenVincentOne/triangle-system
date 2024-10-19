// Constants and Variables
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
let system = {};
let showConnections = true;
let showAreas = true;
let showMidpoints = true;
let showIncircle = true;
let showIncenter = true;
let draggingNode = null;
const EPSILON = 1e-6;

const lockedNodes = {
    n1: false,
    n2: false,
    n3: false,
};

let draggingCentroid = false;
let centroidLocked = false;
let lockedCentroidPosition = { x: 0, y: 0 };

let animationRequestId = null;
let animationStartTime = null;
const animationDuration = 2000;
let animationParameter = null;
let animationStartValue = null;
let animationEndValue = null;

// Initialization Function
function initializeSystem(preset = 'equilateral') {
    const side = 300;
    const height = (Math.sqrt(3) / 2) * side;
    const BASE_Y = -150;

    switch (preset) {
        case 'equilateral':
            system = {
                n1: { x: 0, y: 2 * height / 3 },
                n2: { x: -side / 2, y: BASE_Y },
                n3: { x: side / 2, y: BASE_Y },
            };
            break;
        case 'isosceles':
            system = {
                n1: { x: 0, y: height / 2 },
                n2: { x: -side / 2, y: BASE_Y },
                n3: { x: side / 2, y: BASE_Y },
            };
            break;
        // Add other cases for different presets
    }

    updateDerivedPoints();
    updateDashboard();
    drawSystem();
}

// Derived Points Calculation
function updateDerivedPoints() {
    const { n1, n2, n3 } = system;
    system.intelligence = {
        x: (n1.x + n2.x + n3.x) / 3,
        y: (n1.y + n2.y + n3.y) / 3,
    };
    system.midpoints = {
        m1: { x: (n2.x + n3.x) / 2, y: n2.y },
        m2: { x: (n1.x + n3.x) / 2, y: (n1.y + n3.y) / 2 },
        m3: { x: (n1.x + n2.x) / 2, y: (n1.y + n2.y) / 2 },
    };
    system.incenter = calculateIncenter();
    system.incircleRadius = calculateIncircleRadius();
    system.tangencyPoints = calculateIncircleTangencyPoints();
}

// Drawing Functions
function drawSystem() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.scale(1, -1);

    drawAxes();
    drawMainTriangle();
    if (showAreas) drawSubtriangles();
    if (showConnections) drawConnections();
    if (showMidpoints) drawMidpoints();
    if (showIncircle) {
        drawIncircle();
        drawTangencyPoints();
    }
    drawNodes();
    if (showIncenter) drawIncenter();
    displayInfo();

    ctx.restore();
}

// Helper functions (drawAxes, drawMainTriangle, drawSubtriangles, etc.)
// ... (implement these functions based on the original code)

// Angle and Length Calculations
function calculateAngles() {
    return {
        n1: calculateAngle(system.n2, system.n1, system.n3),
        n2: calculateAngle(system.n3, system.n2, system.n1),
        n3: calculateAngle(system.n1, system.n3, system.n2),
    };
}

function calculateAngle(p1, p2, p3) {
    const v1 = { x: p1.x - p2.x, y: p1.y - p2.y };
    const v2 = { x: p3.x - p2.x, y: p3.y - p2.y };
    const dot = v1.x * v2.x + v1.y * v2.y;
    const cross = v1.x * v2.y - v1.y * v2.x;
    let angle = Math.atan2(Math.abs(cross), dot) * (180 / Math.PI);
    return Math.abs(angle) < EPSILON || Math.abs(180 - angle) < EPSILON ? 0 : angle;
}

// Other calculation functions (calculateLengths, calculateMedians, etc.)
// ... (implement these functions based on the original code)

// Incenter and Incircle Calculations
function calculateIncenter() {
    const a = calculateDistance(system.n2, system.n3);
    const b = calculateDistance(system.n1, system.n3);
    const c = calculateDistance(system.n1, system.n2);
    const perimeter = a + b + c;
    const x = (a * system.n1.x + b * system.n2.x + c * system.n3.x) / perimeter;
    const y = (a * system.n1.y + b * system.n2.y + c * system.n3.y) / perimeter;
    return { x, y };
}

// Other incenter and incircle calculation functions
// ... (implement these functions based on the original code)

// Event Listeners and UI Interactions
function addEventListeners() {
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);
    // Add other event listeners for buttons and controls
}

// Event handler functions (handleMouseDown, handleMouseMove, etc.)
// ... (implement these functions based on the original code)

// Animation Functions
function startAnimation() {
    // Implement animation logic
}

function animate(timestamp) {
    // Implement animation frame logic
}

// Dashboard Update Function
function updateDashboard() {
    // Update all dashboard elements with current values
}

// Initialization
function init() {
    initializeSystem();
    addEventListeners();
    updateDashboard();
}

// Start the application
init();
