class TriangleSystem {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.system = {};
        this.showConnections = true;
        this.showAreas = false;
        this.showMidpoints = false;
        this.showIncircle = false;
        this.showIncenter = false;
        this.showMedians = false;
        this.draggingNode = null;
        this.lockedNodes = { n1: false, n2: false, n3: false };
        this.centroidLocked = false;
        this.animationRequestId = null;
        this.animationStartTime = null;
        this.animationDuration = 2000;
        this.animationParameter = null;
        this.animationStartValue = null;
        this.animationEndValue = null;
        this.isDragging = false;
        this.draggedNode = null;

        this.initializeEventListeners();
        this.initializeSystem('equilateral');
    }

    initializeEventListeners() {
        this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
        this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
        this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));

        document.querySelector('#equilateral').addEventListener('click', () => this.initializeSystem('equilateral'));
        document.querySelector('#isosceles').addEventListener('click', () => this.initializeSystem('isosceles'));
        document.querySelector('#scalene').addEventListener('click', () => this.initializeSystem('scalene'));
        document.querySelector('#right').addEventListener('click', () => this.initializeSystem('right'));
        document.querySelector('#acute').addEventListener('click', () => this.initializeSystem('acute'));
        document.querySelector('#obtuse').addEventListener('click', () => this.initializeSystem('obtuse'));

        document.querySelector('#toggleMidpoints').addEventListener('click', () => { this.showMidpoints = !this.showMidpoints; this.drawSystem(); });
        document.querySelector('#toggleIncircle').addEventListener('click', () => { this.showIncircle = !this.showIncircle; this.drawSystem(); });
        document.querySelector('#toggleIncenter').addEventListener('click', () => { this.showIncenter = !this.showIncenter; this.drawSystem(); });
        document.querySelector('#toggleMedians').addEventListener('click', () => { this.showMedians = !this.showMedians; this.drawSystem(); });
        document.querySelector('#toggleAreas').addEventListener('click', () => { this.showAreas = !this.showAreas; this.drawSystem(); });

        document.querySelector('#apply-button').addEventListener('click', () => this.applyChanges());
        document.querySelector('#export-data').addEventListener('click', () => this.exportData());
    }

    handleMouseDown(event) {
        console.log('Mouse down event');
    }

    handleMouseMove(event) {
        console.log('Mouse move event');
    }

    handleMouseUp(event) {
        console.log('Mouse up event');
    }

    applyChanges() {
        console.log('Apply changes');
    }

    exportData() {
        console.log('Export data');
    }

    initializeSystem(preset) {
        console.log('Initialize system with preset:', preset);
        const canvasWidth = this.canvas.width;
        const canvasHeight = this.canvas.height;
        const centerX = canvasWidth / 2;
        const centerY = canvasHeight / 2;

        switch (preset) {
            case 'equilateral':
                const side = Math.min(canvasWidth, canvasHeight) * 0.4;
                const height = side * Math.sqrt(3) / 2;
                this.system = {
                    n1: { x: centerX, y: centerY + height / 3 },
                    n2: { x: centerX - side / 2, y: centerY - height * 2 / 3 },
                    n3: { x: centerX + side / 2, y: centerY - height * 2 / 3 },
                    intelligence: { x: centerX, y: centerY },
                    incenter: { x: centerX, y: centerY },
                };
                break;
            case 'isosceles':
                const baseWidth = Math.min(canvasWidth, canvasHeight) * 0.4;
                const isoHeight = baseWidth * 1.2;
                this.system = {
                    n1: { x: centerX, y: centerY - isoHeight / 2 },
                    n2: { x: centerX - baseWidth / 2, y: centerY + isoHeight / 2 },
                    n3: { x: centerX + baseWidth / 2, y: centerY + isoHeight / 2 },
                    intelligence: { x: centerX, y: centerY },
                    incenter: { x: centerX, y: centerY },
                };
                break;
            case 'scalene':
                const scaleWidth = Math.min(canvasWidth, canvasHeight) * 0.4;
                const scaleHeight = scaleWidth * 0.8;
                this.system = {
                    n1: { x: centerX - scaleWidth / 2, y: centerY + scaleHeight / 2 },
                    n2: { x: centerX + scaleWidth / 2, y: centerY + scaleHeight / 2 },
                    n3: { x: centerX + scaleWidth / 4, y: centerY - scaleHeight / 2 },
                    intelligence: { x: centerX, y: centerY },
                    incenter: { x: centerX, y: centerY },
                };
                break;
            case 'right':
                const rightSide = Math.min(canvasWidth, canvasHeight) * 0.4;
                this.system = {
                    n1: { x: centerX - rightSide / 2, y: centerY + rightSide / 2 },
                    n2: { x: centerX - rightSide / 2, y: centerY - rightSide / 2 },
                    n3: { x: centerX + rightSide / 2, y: centerY + rightSide / 2 },
                    intelligence: { x: centerX, y: centerY },
                    incenter: { x: centerX, y: centerY },
                };
                break;
            case 'acute':
                const acuteBase = Math.min(canvasWidth, canvasHeight) * 0.4;
                const acuteHeight = acuteBase * 0.8;
                this.system = {
                    n1: { x: centerX, y: centerY - acuteHeight / 2 },
                    n2: { x: centerX - acuteBase / 2, y: centerY + acuteHeight / 2 },
                    n3: { x: centerX + acuteBase / 2, y: centerY + acuteHeight / 2 },
                    intelligence: { x: centerX, y: centerY },
                    incenter: { x: centerX, y: centerY },
                };
                break;
            case 'obtuse':
                const obtuseBase = Math.min(canvasWidth, canvasHeight) * 0.4;
                const obtuseHeight = obtuseBase * 0.3;
                this.system = {
                    n1: { x: centerX - obtuseBase / 2, y: centerY },
                    n2: { x: centerX + obtuseBase / 2, y: centerY },
                    n3: { x: centerX - obtuseBase / 4, y: centerY - obtuseHeight },
                    intelligence: { x: centerX, y: centerY },
                    incenter: { x: centerX, y: centerY },
                };
                break;
            default:
                console.error('Invalid preset');
                return;
        }

        this.calculateIncenter();
        this.updateDashboard();
        this.drawSystem();
    }

    calculateIncenter() {
        const { n1, n2, n3 } = this.system;
        const a = this.calculateDistance(n2, n3);
        const b = this.calculateDistance(n1, n3);
        const c = this.calculateDistance(n1, n2);
        const perimeter = a + b + c;
        
        this.system.incenter = {
            x: (a * n1.x + b * n2.x + c * n3.x) / perimeter,
            y: (a * n1.y + b * n2.y + c * n3.y) / perimeter
        };
    }

    drawSystem() {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw triangle
        ctx.beginPath();
        ctx.moveTo(this.system.n1.x, this.system.n1.y);
        ctx.lineTo(this.system.n2.x, this.system.n2.y);
        ctx.lineTo(this.system.n3.x, this.system.n3.y);
        ctx.closePath();
        ctx.strokeStyle = 'white';
        ctx.stroke();

        // Draw nodes
        this.drawNode(this.system.n1, 'red', 'N1');
        this.drawNode(this.system.n2, 'green', 'N2');
        this.drawNode(this.system.n3, 'blue', 'N3');

        // Draw centroid (intelligence)
        this.drawNode(this.system.intelligence, 'yellow', 'I');

        // Draw incenter
        if (this.showIncenter) {
            this.drawNode(this.system.incenter, 'cyan', 'IC');
        }

        // Additional drawing methods can be added here for midpoints, incircle, etc.
    }

    drawNode(point, color, label) {
        const ctx = this.ctx;
        ctx.beginPath();
        ctx.arc(point.x, point.y, 5, 0, 2 * Math.PI);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.fillStyle = 'white';
        ctx.fillText(label, point.x + 10, point.y);
    }

    updateDashboard() {
        try {
            console.log('Updating dashboard...');
            
            const setElementValue = (selector, value) => {
                const element = document.querySelector(selector);
                if (element) {
                    element.value = value;
                    console.log(`Set ${selector} to ${value}`);
                } else {
                    console.warn(`Element not found: ${selector}`);
                }
            };

            setElementValue('#system-perimeter', this.calculatePerimeter().toFixed(2));
            setElementValue('#system-area', this.calculateArea().toFixed(2));
            setElementValue('#subsystems-area', (this.calculateArea() / 3).toFixed(2));

            const lengths = this.calculateLengths();
            setElementValue('#edge-nc1', lengths.l1.toFixed(2));
            setElementValue('#edge-nc2', lengths.l2.toFixed(2));
            setElementValue('#edge-nc3', lengths.l3.toFixed(2));

            const medians = this.calculateMedians();
            setElementValue('#median-nc1', medians.m1.toFixed(2));
            setElementValue('#median-nc2', medians.m2.toFixed(2));
            setElementValue('#median-nc3', medians.m3.toFixed(2));

            const angles = this.calculateAngles();
            setElementValue('#node-n1-angle', angles.n1.toFixed(2));
            setElementValue('#node-n2-angle', angles.n2.toFixed(2));
            setElementValue('#node-n3-angle', angles.n3.toFixed(2));

            setElementValue('#centroid-coords', `(${this.system.intelligence.x.toFixed(2)}, ${this.system.intelligence.y.toFixed(2)})`);
            setElementValue('#incenter-coords', `(${this.system.incenter.x.toFixed(2)}, ${this.system.incenter.y.toFixed(2)})`);
            setElementValue('#i-to-ic', this.calculateDistance(this.system.intelligence, this.system.incenter).toFixed(2));

            for (let i = 1; i <= 3; i++) {
                const subsystemPerimeter = this.calculateSubsystemPerimeter(i);
                const subsystemAngle = this.calculateSubsystemAngle(i);
                setElementValue(`#subsystem-${i}-perimeter`, subsystemPerimeter.toFixed(2));
                setElementValue(`#subsystem-${i}-angle`, subsystemAngle.toFixed(2));
            }

            console.log('Dashboard updated successfully');
        } catch (error) {
            console.error('Error updating dashboard:', error);
        }
    }

    calculateMedians() {
        return {
            m1: this.calculateDistance(this.system.n1, this.system.intelligence),
            m2: this.calculateDistance(this.system.n2, this.system.intelligence),
            m3: this.calculateDistance(this.system.n3, this.system.intelligence)
        };
    }

    calculateSubsystemPerimeter(subsystemNumber) {
        const medians = this.calculateMedians();
        const lengths = this.calculateLengths();
        switch (subsystemNumber) {
            case 1:
                return medians.m2 + medians.m3 + lengths.l1;
            case 2:
                return medians.m1 + medians.m3 + lengths.l2;
            case 3:
                return medians.m1 + medians.m2 + lengths.l3;
            default:
                throw new Error('Invalid subsystem number');
        }
    }

    calculateSubsystemAngle(subsystemNumber) {
        switch (subsystemNumber) {
            case 1:
                return this.calculateAngleBetweenVectors(
                    this.vectorSubtract(this.system.n2, this.system.intelligence),
                    this.vectorSubtract(this.system.n3, this.system.intelligence)
                );
            case 2:
                return this.calculateAngleBetweenVectors(
                    this.vectorSubtract(this.system.n1, this.system.intelligence),
                    this.vectorSubtract(this.system.n3, this.system.intelligence)
                );
            case 3:
                return this.calculateAngleBetweenVectors(
                    this.vectorSubtract(this.system.n1, this.system.intelligence),
                    this.vectorSubtract(this.system.n2, this.system.intelligence)
                );
            default:
                throw new Error('Invalid subsystem number');
        }
    }

    vectorSubtract(v1, v2) {
        return { x: v1.x - v2.x, y: v1.y - v2.y };
    }

    calculateAngleBetweenVectors(v1, v2) {
        const dotProduct = v1.x * v2.x + v1.y * v2.y;
        const magnitude1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
        const magnitude2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);
        const angleRadians = Math.acos(dotProduct / (magnitude1 * magnitude2));
        return angleRadians * (180 / Math.PI);
    }

    calculatePerimeter() {
        const lengths = this.calculateLengths();
        return lengths.l1 + lengths.l2 + lengths.l3;
    }

    calculateArea() {
        const { n1, n2, n3 } = this.system;
        return Math.abs((n1.x * (n2.y - n3.y) + n2.x * (n3.y - n1.y) + n3.x * (n1.y - n2.y)) / 2);
    }

    calculateLengths() {
        return {
            l1: this.calculateDistance(this.system.n2, this.system.n3),
            l2: this.calculateDistance(this.system.n1, this.system.n3),
            l3: this.calculateDistance(this.system.n1, this.system.n2)
        };
    }

    calculateAngles() {
        const { n1, n2, n3 } = this.system;
        const v1 = this.vectorSubtract(n2, n1);
        const v2 = this.vectorSubtract(n3, n1);
        const v3 = this.vectorSubtract(n1, n2);
        const v4 = this.vectorSubtract(n3, n2);
        const v5 = this.vectorSubtract(n1, n3);
        const v6 = this.vectorSubtract(n2, n3);

        return {
            n1: this.calculateAngleBetweenVectors(v1, v2),
            n2: this.calculateAngleBetweenVectors(v3, v4),
            n3: this.calculateAngleBetweenVectors(v5, v6)
        };
    }

    calculateDistance(point1, point2) {
        return Math.sqrt(Math.pow(point2.x - point1.x, 2) + Math.pow(point2.y - point1.y, 2));
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.querySelector('#canvas');
    if (canvas) {
        window.triangleSystem = new TriangleSystem(canvas);
        console.log("Initializing system...");
    } else {
        console.error("Canvas element not found");
    }
});
