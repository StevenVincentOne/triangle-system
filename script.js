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
        this.updateDashboard();
        this.drawSystem();
    }

    drawSystem() {
        console.log('Draw system');
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
        return 0;
    }

    calculateArea() {
        return 0;
    }

    calculateLengths() {
        return { l1: 0, l2: 0, l3: 0 };
    }

    calculateAngles() {
        return { n1: 0, n2: 0, n3: 0 };
    }

    calculateDistance(point1, point2) {
        return 0;
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