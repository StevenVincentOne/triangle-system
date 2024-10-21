class TriangleSystem {
    constructor(canvas) {
        console.log("TriangleSystem constructor called");
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.system = {};
        this.showMidpoints = false;
        this.showIncircle = false;
        this.showIncenter = false;
        this.showMedians = false;
        this.showAreas = false;
        this.isDragging = false;
        this.draggedNode = null;

        this.initializeEventListeners();
        this.initializeSystem('equilateral');
    }

    initializeEventListeners() {
        console.log("Initializing event listeners");
        this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
        this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
        this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
        this.canvas.addEventListener('mouseleave', this.handleMouseUp.bind(this));
    }

    handleMouseDown(event) {
        const rect = this.canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        const node = this.getNodeAtPosition(x, y);
        if (node) {
            this.isDragging = true;
            this.draggedNode = node;
        }
    }

    handleMouseMove(event) {
        if (this.isDragging) {
            const rect = this.canvas.getBoundingClientRect();
            const x = event.clientX - rect.left - this.canvas.width / 2;
            const y = -(event.clientY - rect.top - this.canvas.height / 2);
            this.system[this.draggedNode] = { x, y };
            this.updateDerivedPoints();
            this.updateDashboard();
            this.drawSystem();
        }
    }

    handleMouseUp() {
        this.isDragging = false;
        this.draggedNode = null;
    }

    getNodeAtPosition(x, y) {
        const nodes = ['n1', 'n2', 'n3'];
        for (const node of nodes) {
            const dx = this.system[node].x + this.canvas.width / 2 - x;
            const dy = -this.system[node].y + this.canvas.height / 2 - y;
            if (dx * dx + dy * dy < 25) {
                return node;
            }
        }
        return null;
    }

    initializeSystem(preset = 'equilateral') {
        console.log(`Initializing system with preset: ${preset}`);
        const side = 200;
        const height = (Math.sqrt(3) / 2) * side;

        switch (preset) {
            case 'equilateral':
                this.system = {
                    n1: { x: 0, y: height * 2/3 },
                    n2: { x: -side / 2, y: -height / 3 },
                    n3: { x: side / 2, y: -height / 3 },
                };
                break;
            case 'isosceles':
                this.system = {
                    n1: { x: 0, y: height },
                    n2: { x: -side / 2, y: 0 },
                    n3: { x: side / 2, y: 0 },
                };
                break;
            case 'scalene':
                this.system = {
                    n1: { x: 0, y: height },
                    n2: { x: -side / 2, y: 0 },
                    n3: { x: side / 3, y: 0 },
                };
                break;
            case 'right':
                this.system = {
                    n1: { x: 0, y: side },
                    n2: { x: 0, y: 0 },
                    n3: { x: side, y: 0 },
                };
                break;
            case 'acute':
                this.system = {
                    n1: { x: 0, y: height },
                    n2: { x: -side / 3, y: 0 },
                    n3: { x: side / 3, y: 0 },
                };
                break;
            case 'obtuse':
                this.system = {
                    n1: { x: 0, y: height / 2 },
                    n2: { x: -side, y: 0 },
                    n3: { x: side / 4, y: 0 },
                };
                break;
        }

        // Calculate the current centroid
        const centroid = {
            x: (this.system.n1.x + this.system.n2.x + this.system.n3.x) / 3,
            y: (this.system.n1.y + this.system.n2.y + this.system.n3.y) / 3
        };

        // Adjust all coordinates to move the centroid to (0, 0)
        for (const node of ['n1', 'n2', 'n3']) {
            this.system[node].x -= centroid.x;
            this.system[node].y -= centroid.y;
        }

        this.updateDerivedPoints();
        this.updateDashboard();
        this.drawSystem();
    }

    updateDerivedPoints() {
        this.system.intelligence = { x: 0, y: 0 }; // Centroid is always at (0, 0) now

        const a = this.calculateDistance(this.system.n2, this.system.n3);
        const b = this.calculateDistance(this.system.n1, this.system.n3);
        const c = this.calculateDistance(this.system.n1, this.system.n2);
        const p = a + b + c;
        this.system.incenter = {
            x: (a * this.system.n1.x + b * this.system.n2.x + c * this.system.n3.x) / p,
            y: (a * this.system.n1.y + b * this.system.n2.y + c * this.system.n3.y) / p
        };

        this.system.tangencyPoints = [
            { x: (this.system.n2.x + this.system.n3.x) / 2, y: (this.system.n2.y + this.system.n3.y) / 2 },
            { x: (this.system.n1.x + this.system.n3.x) / 2, y: (this.system.n1.y + this.system.n3.y) / 2 },
            { x: (this.system.n1.x + this.system.n2.x) / 2, y: (this.system.n1.y + this.system.n2.y) / 2 }
        ];
    }

    drawSystem() {
        console.log("Drawing system");
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        ctx.save();
        ctx.translate(this.canvas.width / 2, this.canvas.height / 2);
        ctx.scale(1, -1);

        // Draw axes
        this.drawAxes(ctx);

        // Draw triangle
        ctx.beginPath();
        ctx.moveTo(this.system.n1.x, this.system.n1.y);
        ctx.lineTo(this.system.n2.x, this.system.n2.y);
        ctx.lineTo(this.system.n3.x, this.system.n3.y);
        ctx.closePath();
        ctx.strokeStyle = 'white';
        ctx.stroke();

        // Draw nodes
        this.drawNode(ctx, this.system.n1, 'red', 'N1');
        this.drawNode(ctx, this.system.n2, 'green', 'N2');
        this.drawNode(ctx, this.system.n3, 'blue', 'N3');

        // Draw centroid (intelligence)
        this.drawNode(ctx, this.system.intelligence, 'white', 'I');

        // Draw additional features based on toggle states
        if (this.showMidpoints) {
            this.drawMidpoints(ctx);
        }
        if (this.showIncircle) {
            this.drawIncircle(ctx);
        }
        if (this.showIncenter) {
            this.drawNode(ctx, this.system.incenter, 'yellow', 'IC');
        }
        if (this.showMedians) {
            this.drawMedians(ctx);
        }
        if (this.showAreas) {
            this.drawAreas(ctx);
        }

        ctx.restore();
    }

    drawAxes(ctx) {
        const axisLength = Math.max(this.canvas.width, this.canvas.height) / 2;
        ctx.beginPath();
        ctx.moveTo(-axisLength, 0);
        ctx.lineTo(axisLength, 0);
        ctx.moveTo(0, -axisLength);
        ctx.lineTo(0, axisLength);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.stroke();

        // Draw axis labels
        ctx.save();
        ctx.scale(1, -1);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.font = '12px Arial';
        ctx.fillText('X', axisLength - 20, 20);
        ctx.fillText('Y', 10, -axisLength + 20);
        ctx.restore();
    }

    drawNode(ctx, point, color, label) {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(point.x, point.y, 5, 0, 2 * Math.PI);
        ctx.fill();

        ctx.fillStyle = 'white';
        ctx.font = '12px Arial';
        ctx.save();
        ctx.scale(1, -1);
        ctx.fillText(label, point.x + 10, -point.y - 10);
        ctx.restore();
    }

    drawMidpoints(ctx) {
        const midpoints = this.system.tangencyPoints;
        ctx.fillStyle = 'orange';
        for (const point of midpoints) {
            ctx.beginPath();
            ctx.arc(point.x, point.y, 3, 0, 2 * Math.PI);
            ctx.fill();
        }
    }

    drawIncircle(ctx) {
        const incenter = this.system.incenter;
        const radius = this.calculateIncircleRadius();
        ctx.beginPath();
        ctx.arc(incenter.x, incenter.y, radius, 0, 2 * Math.PI);
        ctx.strokeStyle = 'yellow';
        ctx.stroke();
    }

    drawMedians(ctx) {
        ctx.beginPath();
        ctx.moveTo(this.system.n1.x, this.system.n1.y);
        ctx.lineTo(0, 0);
        ctx.moveTo(this.system.n2.x, this.system.n2.y);
        ctx.lineTo(0, 0);
        ctx.moveTo(this.system.n3.x, this.system.n3.y);
        ctx.lineTo(0, 0);
        ctx.strokeStyle = 'purple';
        ctx.stroke();
    }

    drawAreas(ctx) {
        const area = this.calculateArea();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.fill();
        ctx.fillStyle = 'white';
        ctx.font = '14px Arial';
        ctx.save();
        ctx.scale(1, -1);
        ctx.fillText(`Area: ${this.formatValue(area)}`, 10, -10);
        ctx.restore();
    }

    updateDashboard() {
        console.log("Updating dashboard");
        const setElementValue = (selector, value, label = '') => {
            const element = document.querySelector(selector);
            if (element) {
                const formattedValue = this.formatValue(value);
                element.value = formattedValue;
                if (label) {
                    const labelElement = element.previousElementSibling;
                    if (labelElement) {
                        labelElement.textContent = label.replace(':', '');
                    }
                }
                console.log(`Set ${selector} to ${formattedValue}`);
            } else {
                console.warn(`Element not found: ${selector}`);
            }
        };

        const perimeter = this.calculatePerimeter();
        const area = this.calculateArea();
        setElementValue('#system-perimeter', perimeter);
        setElementValue('#system-area', area);

        const nc1 = this.calculateDistance(this.system.n2, this.system.n3);
        const nc2 = this.calculateDistance(this.system.n1, this.system.n3);
        const nc3 = this.calculateDistance(this.system.n1, this.system.n2);
        setElementValue('#edge-nc1', nc1);
        setElementValue('#edge-nc2', nc2);
        setElementValue('#edge-nc3', nc3);

        const angles = this.calculateAngles();
        setElementValue('#node-n1-angle', angles.n1);
        setElementValue('#node-n2-angle', angles.n2);
        setElementValue('#node-n3-angle', angles.n3);

        const iToIcDistance = this.calculateDistance(this.system.intelligence, this.system.incenter);

        const midpointNC1 = {
            x: (this.system.n2.x + this.system.n3.x) / 2,
            y: (this.system.n2.y + this.system.n3.y) / 2
        };
        const tangencyPointNC1 = this.system.tangencyPoints[0];
        const dMTNC1 = this.calculateDistance(midpointNC1, tangencyPointNC1);

        setElementValue('#info-d-i-ic', iToIcDistance, 'd(I, IC):');
        setElementValue('#info-d-m-t-nc1', dMTNC1, 'd(M, T) NC1:');

        setElementValue('#centroid-coords', `${this.formatValue(this.system.intelligence.x)}, ${this.formatValue(this.system.intelligence.y)}`);
        setElementValue('#incenter-coords', `${this.formatValue(this.system.incenter.x)}, ${this.formatValue(this.system.incenter.y)}`);
        setElementValue('#i-to-ic-distance', iToIcDistance);

        // Update subsystems
        const subsystemPerimeters = this.calculateSubsystemPerimeters();
        setElementValue('#subsystem-1-perimeter', subsystemPerimeters.ss1);
        setElementValue('#subsystem-2-perimeter', subsystemPerimeters.ss2);
        setElementValue('#subsystem-3-perimeter', subsystemPerimeters.ss3);

        const subsystemAngles = this.calculateSubsystemAngles();
        setElementValue('#subsystem-1-angle', subsystemAngles.ss1);
        setElementValue('#subsystem-2-angle', subsystemAngles.ss2);
        setElementValue('#subsystem-3-angle', subsystemAngles.ss3);

        // Update medians
        const medians = this.calculateMedians();
        setElementValue('#median-n1', medians.n1);
        setElementValue('#median-n2', medians.n2);
        setElementValue('#median-n3', medians.n3);

        // Update subsystems area
        const subsystemsArea = this.calculateSubsystemsArea();
        setElementValue('#subsystems-area', subsystemsArea);
    }

    calculatePerimeter() {
        return this.calculateDistance(this.system.n1, this.system.n2) +
               this.calculateDistance(this.system.n2, this.system.n3) +
               this.calculateDistance(this.system.n3, this.system.n1);
    }

    calculateArea() {
        const [x1, y1] = [this.system.n1.x, this.system.n1.y];
        const [x2, y2] = [this.system.n2.x, this.system.n2.y];
        const [x3, y3] = [this.system.n3.x, this.system.n3.y];
        return Math.abs((x1*(y2-y3) + x2*(y3-y1) + x3*(y1-y2)) / 2);
    }

    calculateAngles() {
        const a = this.calculateDistance(this.system.n2, this.system.n3);
        const b = this.calculateDistance(this.system.n1, this.system.n3);
        const c = this.calculateDistance(this.system.n1, this.system.n2);
        
        const angleN1 = Math.acos((b*b + c*c - a*a) / (2*b*c)) * (180 / Math.PI);
        const angleN2 = Math.acos((a*a + c*c - b*b) / (2*a*c)) * (180 / Math.PI);
        const angleN3 = 180 - angleN1 - angleN2;
        
        return { n1: angleN1, n2: angleN2, n3: angleN3 };
    }

    calculateDistance(point1, point2) {
        const dx = point2.x - point1.x;
        const dy = point2.y - point1.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    calculateSubsystemPerimeters() {
        const ss1 = this.calculateDistance(this.system.n1, this.system.intelligence) * 2;
        const ss2 = this.calculateDistance(this.system.n2, this.system.intelligence) * 2;
        const ss3 = this.calculateDistance(this.system.n3, this.system.intelligence) * 2;
        return { ss1, ss2, ss3 };
    }

    calculateSubsystemAngles() {
        const angles = this.calculateAngles();
        return {
            ss1: angles.n1 / 2,
            ss2: angles.n2 / 2,
            ss3: angles.n3 / 2
        };
    }

    calculateMedians() {
        const n1 = this.calculateDistance(this.system.n1, this.system.intelligence) * 3 / 2;
        const n2 = this.calculateDistance(this.system.n2, this.system.intelligence) * 3 / 2;
        const n3 = this.calculateDistance(this.system.n3, this.system.intelligence) * 3 / 2;
        return { n1, n2, n3 };
    }

    calculateSubsystemsArea() {
        return this.calculateArea() / 3;
    }

    calculateIncircleRadius() {
        const a = this.calculateDistance(this.system.n2, this.system.n3);
        const b = this.calculateDistance(this.system.n1, this.system.n3);
        const c = this.calculateDistance(this.system.n1, this.system.n2);
        const s = (a + b + c) / 2;
        const area = Math.sqrt(s * (s - a) * (s - b) * (s - c));
        return area / s;
    }

    formatValue(value) {
        if (typeof value === 'number') {
            return Number(value.toFixed(2)).toString();
        } else if (typeof value === 'string' && value.includes(',')) {
            // Handle coordinate pairs
            const [x, y] = value.split(',').map(v => this.formatValue(parseFloat(v.trim())));
            return `${x}, ${y}`;
        }
        return value.toString();
    }

    exportData() {
        const safeGetValue = (selector) => {
            const element = document.querySelector(selector);
            return element ? element.value : '';
        };

        const data = {
            system: {
                perimeter: safeGetValue('#system-perimeter'),
                area: safeGetValue('#system-area'),
            },
            channels: {
                nc1: safeGetValue('#edge-nc1'),
                nc2: safeGetValue('#edge-nc2'),
                nc3: safeGetValue('#edge-nc3'),
            },
            nodes: {
                n1Angle: safeGetValue('#node-n1-angle'),
                n2Angle: safeGetValue('#node-n2-angle'),
                n3Angle: safeGetValue('#node-n3-angle'),
            },
            centers: {
                centroidCoords: safeGetValue('#centroid-coords'),
                incenterCoords: safeGetValue('#incenter-coords'),
                iToIcDistance: safeGetValue('#i-to-ic-distance'),
            },
            info: {
                dCentroidIncircle: safeGetValue('#info-d-i-ic'),
                dMidpointTangencyNC1: safeGetValue('#info-d-m-t-nc1'),
            }
        };

        const jsonString = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = 'triangle_system_data.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM content loaded");
    const canvas = document.querySelector('#canvas');
    if (canvas) {
        console.log("Canvas found, initializing TriangleSystem");
        window.triangleSystem = new TriangleSystem(canvas);

        const presetButtons = ['equilateral', 'isosceles', 'scalene', 'right', 'acute', 'obtuse'];
        presetButtons.forEach(preset => {
            const button = document.getElementById(preset);
            if (button) {
                button.addEventListener('click', () => {
                    console.log(`${preset} button clicked`);
                    window.triangleSystem.initializeSystem(preset);
                });
            } else {
                console.warn(`Button not found: ${preset}`);
            }
        });

        const exportButton = document.getElementById('export-data');
        if (exportButton) {
            exportButton.addEventListener('click', () => window.triangleSystem.exportData());
        } else {
            console.warn("Export button not found");
        }

        // Add event listeners for toggle buttons
        const toggleButtons = {
            'toggleMidpoints': 'showMidpoints',
            'toggleIncircle': 'showIncircle',
            'toggleIncenter': 'showIncenter',
            'toggleMedians': 'showMedians',
            'toggleAreas': 'showAreas'
        };

        Object.entries(toggleButtons).forEach(([buttonId, propertyName]) => {
            const button = document.getElementById(buttonId);
            if (button) {
                button.addEventListener('click', () => {
                    console.log(`${buttonId} clicked`);
                    window.triangleSystem[propertyName] = !window.triangleSystem[propertyName];
                    window.triangleSystem.drawSystem();
                });
            } else {
                console.warn(`Toggle button not found: ${buttonId}`);
            }
        });
    } else {
        console.error("Canvas element not found");
    }
});
