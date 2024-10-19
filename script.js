// Constants and Variables
const EPSILON = 1e-6;
let canvas, ctx, system;
let showConnections = true;
let showAreas = true;
let showMidpoints = true;
let showIncircle = true;
let showIncenter = true;
let draggingNode = null;

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

function drawAxes() {
    ctx.strokeStyle = 'gray';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-canvas.width / 2, 0);
    ctx.lineTo(canvas.width / 2, 0);
    ctx.moveTo(0, -canvas.height / 2);
    ctx.lineTo(0, canvas.height / 2);
    ctx.stroke();
}

function drawMainTriangle() {
    ctx.beginPath();
    ctx.moveTo(system.n1.x, system.n1.y);
    ctx.lineTo(system.n2.x, system.n2.y);
    ctx.lineTo(system.n3.x, system.n3.y);
    ctx.closePath();
    ctx.strokeStyle = 'white';
    ctx.stroke();
}

function drawSubtriangles() {
    const subtriangles = [
        { points: [system.n1, system.n2, system.intelligence], color: 'rgba(255, 0, 0, 0.3)' },
        { points: [system.n3, system.n1, system.intelligence], color: 'rgba(0, 255, 0, 0.3)' },
        { points: [system.n2, system.n3, system.intelligence], color: 'rgba(0, 0, 255, 0.3)' },
    ];

    subtriangles.forEach((tri) => {
        ctx.beginPath();
        ctx.moveTo(tri.points[0].x, tri.points[0].y);
        ctx.lineTo(tri.points[1].x, tri.points[1].y);
        ctx.lineTo(tri.points[2].x, tri.points[2].y);
        ctx.closePath();
        ctx.fillStyle = tri.color;
        ctx.fill();
    });
}

function drawConnections() {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(system.n1.x, system.n1.y);
    ctx.lineTo(system.intelligence.x, system.intelligence.y);
    ctx.moveTo(system.n2.x, system.n2.y);
    ctx.lineTo(system.intelligence.x, system.intelligence.y);
    ctx.moveTo(system.n3.x, system.n3.y);
    ctx.lineTo(system.intelligence.x, system.intelligence.y);
    ctx.stroke();
}

function drawMidpoints() {
    ctx.fillStyle = 'yellow';
    ctx.strokeStyle = 'yellow';
    ctx.setLineDash([5, 5]);

    for (let key of ['m1', 'm2', 'm3']) {
        const midpoint = system.midpoints[key];
        ctx.beginPath();
        ctx.arc(midpoint.x, midpoint.y, 5, 0, 2 * Math.PI);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(system.intelligence.x, system.intelligence.y);
        ctx.lineTo(midpoint.x, midpoint.y);
        ctx.stroke();
    }

    ctx.setLineDash([]);
}

function drawIncircle() {
    ctx.strokeStyle = 'cyan';
    ctx.beginPath();
    ctx.arc(system.incenter.x, system.incenter.y, system.incircleRadius, 0, 2 * Math.PI);
    ctx.stroke();
}

function drawTangencyPoints() {
    ctx.fillStyle = 'lightblue';
    system.tangencyPoints.forEach(point => {
        ctx.beginPath();
        ctx.arc(point.x, point.y, 5, 0, 2 * Math.PI);
        ctx.fill();
    });
}

function drawNodes() {
    drawNode(system.n1, 'red', 'N1');
    drawNode(system.n2, 'blue', 'N2');
    drawNode(system.n3, 'green', 'N3');
    drawNode(system.intelligence, 'white', 'I');
}

function drawNode(point, color, label) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(point.x, point.y, 5, 0, 2 * Math.PI);
    ctx.fill();

    ctx.fillStyle = 'white';
    ctx.font = '12px Arial';
    ctx.fillText(label, point.x + 8, point.y + 8);
}

function drawIncenter() {
    drawNode(system.incenter, 'cyan', 'Incenter');
}

function displayInfo() {
    const angles = calculateAngles();
    const lengths = calculateLengths();

    ctx.save();
    ctx.scale(1, -1);
    ctx.fillStyle = 'white';
    ctx.font = '14px Arial';

    ctx.fillText('N1', system.n1.x - 10, -system.n1.y - 25);
    ctx.fillText(`${angles.n1.toFixed(1)}°`, system.n1.x - 10, -system.n1.y - 10);

    ctx.fillText('N2', system.n2.x - 50, -system.n2.y + 5);
    ctx.fillText(`${angles.n2.toFixed(1)}°`, system.n2.x - 50, -system.n2.y + 20);

    ctx.fillText('N3', system.n3.x + 10, -system.n3.y + 5);
    ctx.fillText(`${angles.n3.toFixed(1)}°`, system.n3.x + 10, -system.n3.y + 20);

    const midPointNC1 = {
        x: (system.n1.x + system.n2.x) / 2,
        y: (system.n1.y + system.n2.y) / 2,
    };
    ctx.fillText(`NC1`, midPointNC1.x - 40, -midPointNC1.y + 20);
    ctx.fillText(`${lengths.l3.toFixed(1)}`, midPointNC1.x - 40, -midPointNC1.y + 35);

    const midPointNC2 = {
        x: (system.n1.x + system.n3.x) / 2,
        y: (system.n1.y + system.n3.y) / 2,
    };
    ctx.fillText(`NC2`, midPointNC2.x + 10, -midPointNC2.y - 10);
    ctx.fillText(`${lengths.l2.toFixed(1)}`, midPointNC2.x + 10, -midPointNC2.y + 5);

    const midPointNC3 = {
        x: (system.n2.x + system.n3.x) / 2,
        y: (system.n2.y + system.n3.y) / 2,
    };
    ctx.fillText(`NC3`, midPointNC3.x - 50, -midPointNC3.y + 20);
    ctx.fillText(`${lengths.l1.toFixed(1)}`, midPointNC3.x - 50, -midPointNC3.y + 35);

    ctx.restore();
}

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

function calculateDistance(p1, p2) {
    return Math.hypot(p1.x - p2.x, p1.y - p2.y);
}

function calculateLengths() {
    return {
        l1: calculateDistance(system.n2, system.n3), // NC3 (N2-N3)
        l2: calculateDistance(system.n1, system.n3), // NC2 (N1-N3)
        l3: calculateDistance(system.n1, system.n2), // NC1 (N1-N2)
    };
}

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

function calculateIncircleRadius() {
    const a = calculateDistance(system.n2, system.n3);
    const b = calculateDistance(system.n1, system.n3);
    const c = calculateDistance(system.n1, system.n2);
    const s = (a + b + c) / 2; // semi-perimeter
    const area = Math.sqrt(s * (s - a) * (s - b) * (s - c)); // area using Heron's formula
    return (2 * area) / (a + b + c);
}

function calculateIncircleTangencyPoints() {
    const { n1, n2, n3, incenter } = system;

    function tangencyPoint(p1, p2) {
        const a = calculateDistance(p1, p2);
        const b = calculateDistance(incenter, p1);
        const c = calculateDistance(incenter, p2);
        const s = (a + b + c) / 2;
        const area = Math.sqrt(s * (s - a) * (s - b) * (s - c));
        const h = (2 * area) / a;

        const vx = p2.x - p1.x;
        const vy = p2.y - p1.y;
        const length = Math.sqrt(vx * vx + vy * vy);
        const ux = vx / length;
        const uy = vy / length;

        return {
            x: p1.x + ux * (a - h),
            y: p1.y + uy * (a - h)
        };
    }

    return [
        tangencyPoint(n2, n3),
        tangencyPoint(n1, n3),
        tangencyPoint(n1, n2)
    ];
}

// Event Listeners and UI Interactions
function addEventListeners() {
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);
    // Add other event listeners for buttons and controls
}

function handleMouseDown(event) {
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left - canvas.width / 2;
    const y = canvas.height / 2 - (event.clientY - rect.top);

    for (let node of ['n1', 'n2', 'n3']) {
        if (isPointNearNode(x, y, system[node]) && !lockedNodes[node]) {
            draggingNode = node;
            return;
        }
    }

    if (isPointNearNode(x, y, system.intelligence) && !centroidLocked) {
        draggingCentroid = true;
    }
}

function handleMouseMove(event) {
    if (!draggingNode && !draggingCentroid) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left - canvas.width / 2;
    const y = canvas.height / 2 - (event.clientY - rect.top);

    if (draggingNode) {
        system[draggingNode] = { x, y };
    } else if (draggingCentroid) {
        const dx = x - system.intelligence.x;
        const dy = y - system.intelligence.y;
        for (let node of ['n1', 'n2', 'n3']) {
            if (!lockedNodes[node]) {
                system[node].x += dx;
                system[node].y += dy;
            }
        }
    }

    updateDerivedPoints();
    updateDashboard();
    drawSystem();
}

function handleMouseUp() {
    draggingNode = null;
    draggingCentroid = false;
}

function isPointNearNode(x, y, node) {
    const distance = Math.hypot(x - node.x, y - node.y);
    return distance < 10;
}

// Animation Functions
function startAnimation() {
    if (animationRequestId) {
        cancelAnimationFrame(animationRequestId);
    }
    animationStartTime = null;
    animate();
}

function animate(timestamp) {
    if (!animationStartTime) animationStartTime = timestamp;
    const progress = (timestamp - animationStartTime) / animationDuration;

    if (progress < 1) {
        const t = easeInOutCubic(progress);
        const value = animationStartValue + (animationEndValue - animationStartValue) * t;
        system[animationParameter] = value;

        updateDerivedPoints();
        updateDashboard();
        drawSystem();

        animationRequestId = requestAnimationFrame(animate);
    } else {
        system[animationParameter] = animationEndValue;
        updateDerivedPoints();
        updateDashboard();
        drawSystem();
    }
}

function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

// Dashboard Update Function
function updateDashboard() {
    const angles = calculateAngles();
    const lengths = calculateLengths();
    
    // Update angle displays
    updateElementContent('angle-n1', angles.n1.toFixed(1));
    updateElementContent('angle-n2', angles.n2.toFixed(1));
    updateElementContent('angle-n3', angles.n3.toFixed(1));

    // Update length displays
    updateElementContent('length-nc1', lengths.l3.toFixed(1));
    updateElementContent('length-nc2', lengths.l2.toFixed(1));
    updateElementContent('length-nc3', lengths.l1.toFixed(1));

    // Update other dashboard elements as needed
}

function updateElementContent(id, content) {
    const element = document.getElementById(id);
    if (element) {
        element.textContent = content;
    } else {
        console.warn(`Element with id '${id}' not found`);
    }
}

// Initialization
function init() {
    console.log("Initializing system...");
    try {
        canvas = document.getElementById('canvas');
        ctx = canvas.getContext('2d');
        initializeSystem();
        addEventListeners();
        updateDashboard();
        drawSystem();
        console.log("System initialized successfully.");
    } catch (error) {
        console.error("Error during initialization:", error);
    }
}

// Start the application
console.log("Starting application...");
document.addEventListener('DOMContentLoaded', init);