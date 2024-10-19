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

// ... (keep all other drawing functions as they are)

function calculateSubsystems() {
    const subsystems = [];
    
    // Subsystem 1: N1, N2, I
    subsystems.push(calculateSubsystem(system.n1, system.n2, system.intelligence, 'N1', 'N2'));
    
    // Subsystem 2: N3, N1, I
    subsystems.push(calculateSubsystem(system.n3, system.n1, system.intelligence, 'N3', 'N1'));
    
    // Subsystem 3: N2, N3, I
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

    // Update subsystems information
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

// ... (keep all other functions as they are)

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

document.addEventListener('DOMContentLoaded', init);
