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
        default:
            console.error("Invalid preset");
            return;
    }

    updateDerivedPoints();
    updateDashboard();
    drawSystem();
}

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
    system.subsystems = calculateSubsystems();
}

function drawSystem() {
    if (!ctx) {
        console.error("Canvas context is not initialized");
        return;
    }
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
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
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

function calculateSubsystems() {
    const subsystems = [];
    
    subsystems.push(calculateSubsystem(system.n1, system.n2, system.intelligence, 'N1', 'N2'));
    subsystems.push(calculateSubsystem(system.n3, system.n1, system.intelligence, 'N3', 'N1'));
    subsystems.push(calculateSubsystem(system.n2, system.n3, system.intelligence, 'N2', 'N3'));
    
    return subsystems;
}

function calculateSubsystem(nodeA, nodeB, centroid, labelA, labelB) {
    const area = Math.abs((nodeA.x * (nodeB.y - centroid.y) + nodeB.x * (centroid.y - nodeA.y) + centroid.x * (nodeA.y - nodeB.y)) / 2);
    const perimeter = calculateDistance(nodeA, nodeB) + calculateDistance(nodeB, centroid) + calculateDistance(centroid, nodeA);
    const centroidAngle = calculateAngle(nodeA, centroid, nodeB);
    const adjSubangleA = calculateAngle(centroid, nodeA, nodeB);
    const adjSubangleB = calculateAngle(nodeA, nodeB, centroid);

    return {
        area,
        perimeter,
        centroidAngle,
        adjSubangleA,
        adjSubangleB,
        labelA,
        labelB,
    };
}

function updateDashboard() {
    const angles = calculateAngles();
    const lengths = calculateLengths();
    const area = calculateArea();
    const perimeter = calculatePerimeter();
    
    updateElementContent('angle-n1', angles.n1.toFixed(1));
    updateElementContent('angle-n2', angles.n2.toFixed(1));
    updateElementContent('angle-n3', angles.n3.toFixed(1));

    updateElementContent('length-nc1', lengths.l3.toFixed(1));
    updateElementContent('length-nc2', lengths.l2.toFixed(1));
    updateElementContent('length-nc3', lengths.l1.toFixed(1));

    updateElementContent('system-perimeter', perimeter.toFixed(1));
    updateElementContent('system-area', area.toFixed(1));

    updateElementContent('centroid-x', system.intelligence.x.toFixed(1));
    updateElementContent('centroid-y', system.intelligence.y.toFixed(1));
    updateElementContent('incenter-x', system.incenter.x.toFixed(1));
    updateElementContent('incenter-y', system.incenter.y.toFixed(1));

    system.subsystems.forEach((subsystem, index) => {
        const i = index + 1;
        updateElementContent(`subsystem${i}-area`, subsystem.area.toFixed(1));
        updateElementContent(`subsystem${i}-perimeter`, subsystem.perimeter.toFixed(1));
        updateElementContent(`subsystem${i}-centroid-angle`, subsystem.centroidAngle.toFixed(1));
        updateElementContent(`subsystem${i}-adj-subangle-a`, subsystem.adjSubangleA.toFixed(1));
        updateElementContent(`subsystem${i}-adj-subangle-b`, subsystem.adjSubangleB.toFixed(1));
    });

    updateInformationPanel();
}

function updateElementContent(id, content) {
    const element = document.getElementById(id);
    if (element) {
        element.textContent = content;
    } else {
        console.warn(`Element with id '${id}' not found`);
    }
}

function calculateArea() {
    const { n1, n2, n3 } = system;
    return Math.abs((n1.x * (n2.y - n3.y) + n2.x * (n3.y - n1.y) + n3.x * (n1.y - n2.y)) / 2);
}

function calculatePerimeter() {
    const lengths = calculateLengths();
    return lengths.l1 + lengths.l2 + lengths.l3;
}

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

function calculateLengths() {
    return {
        l1: calculateDistance(system.n2, system.n3),
        l2: calculateDistance(system.n1, system.n3),
        l3: calculateDistance(system.n1, system.n2),
    };
}

function calculateDistance(p1, p2) {
    return Math.hypot(p1.x - p2.x, p1.y - p2.y);
}

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
    const area = calculateArea();
    const perimeter = calculatePerimeter();
    return (2 * area) / perimeter;
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

function updateInformationPanel() {
    const centroidToIncenter = calculateDistance(system.intelligence, system.incenter);
    updateElementContent('d-centroid-incenter', centroidToIncenter.toFixed(2));

    const midpoints = [system.midpoints.m1, system.midpoints.m2, system.midpoints.m3];
    const tangencyPoints = system.tangencyPoints;

    for (let i = 0; i < 3; i++) {
        const distanceToTangent = calculateDistance(midpoints[i], tangencyPoints[i]);
        const ratio = distanceToTangent / calculateDistance(system[`n${i + 1}`], midpoints[i]);

        updateElementContent(`d-midpoint-tangent-nc${i + 1}`, distanceToTangent.toFixed(2));
        updateElementContent(`r-midpoint-tangent-nc${i + 1}`, ratio.toFixed(2));
    }
}

function init() {
    console.log("Initializing system...");
    try {
        console.log("Getting canvas element...");
        canvas = document.getElementById('canvas');
        if (!canvas) {
            throw new Error("Canvas element not found");
        }
        console.log("Canvas element found successfully.");

        console.log("Getting canvas context...");
        ctx = canvas.getContext('2d');
        if (!ctx) {
            throw new Error("Unable to get canvas context");
        }
        console.log("Canvas context obtained successfully.");

        console.log("Initializing system...");
        initializeSystem();
        console.log("System initialized successfully.");

        console.log("Adding event listeners...");
        addEventListeners();
        console.log("Event listeners added successfully.");

        console.log("Updating dashboard...");
        updateDashboard();
        console.log("Dashboard updated successfully.");

        console.log("Drawing system...");
        drawSystem();
        console.log("System drawn successfully.");

        console.log("Initialization complete.");
    } catch (error) {
        console.error("Error during initialization:", error.message);
        console.error("Stack trace:", error.stack);
        console.error("Error details:", error);
    }
}

function addEventListeners() {
    // Add event listeners here if needed
}

document.addEventListener('DOMContentLoaded', init);