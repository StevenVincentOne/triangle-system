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

        document.querySelector('#equilateral').addEventListener('click', () => {
            console.log("Equilateral button clicked");
            this.initializeSystem('equilateral');
        });
        document.querySelector('#isosceles').addEventListener('click', () => {
            console.log("Isosceles button clicked");
            this.initializeSystem('isosceles');
        });
        document.querySelector('#scalene').addEventListener('click', () => {
            console.log("Scalene button clicked");
            this.initializeSystem('scalene');
        });
        document.querySelector('#right').addEventListener('click', () => {
            console.log("Right button clicked");
            this.initializeSystem('right');
        });
        document.querySelector('#acute').addEventListener('click', () => {
            console.log("Acute button clicked");
            this.initializeSystem('acute');
        });
        document.querySelector('#obtuse').addEventListener('click', () => {
            console.log("Obtuse button clicked");
            this.initializeSystem('obtuse');
        });

        document.querySelector('#toggleMidpoints').addEventListener('click', () => { 
            console.log("Toggle Midpoints clicked");
            this.showMidpoints = !this.showMidpoints; 
            this.drawSystem(); 
        });
        document.querySelector('#toggleIncircle').addEventListener('click', () => { 
            console.log("Toggle Incircle clicked");
            this.showIncircle = !this.showIncircle; 
            this.drawSystem(); 
        });
        document.querySelector('#toggleIncenter').addEventListener('click', () => { 
            console.log("Toggle Incenter clicked");
            this.showIncenter = !this.showIncenter; 
            this.drawSystem(); 
        });
        document.querySelector('#toggleMedians').addEventListener('click', () => { 
            console.log("Toggle Medians clicked");
            this.showMedians = !this.showMedians; 
            this.drawSystem(); 
        });
        document.querySelector('#toggleAreas').addEventListener('click', () => { 
            console.log("Toggle Areas clicked");
            this.showAreas = !this.showAreas; 
            this.drawSystem(); 
        });

        document.querySelector('#apply-button').addEventListener('click', () => this.applyChanges());
        document.querySelector('#export-data').addEventListener('click', () => this.exportData());
    }

    handleMouseDown(event) {
        const rect = this.canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = this.canvas.height - (event.clientY - rect.top);
        
        this.isDragging = true;
        this.draggedNode = this.getNodeAtPosition(x, y);
    }

    handleMouseMove(event) {
        const rect = this.canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = this.canvas.height - (event.clientY - rect.top);

        if (this.isDragging && this.draggedNode) {
            this.system[this.draggedNode] = { x, y };
            this.updateDashboard();
            this.drawSystem();
        }
    }

    handleMouseUp(event) {
        this.isDragging = false;
        this.draggedNode = null;
    }

    getNodeAtPosition(x, y) {
        const nodes = ['n1', 'n2', 'n3'];
        for (const node of nodes) {
            const dx = this.system[node].x - x;
            const dy = this.system[node].y - y;
            if (Math.sqrt(dx*dx + dy*dy) < 10) {
                return node;
            }
        }
        return null;
    }

    applyChanges() {
        console.log('Applying changes...');
        try {
            // Get values from dashboard inputs
            const n1x = parseFloat(document.querySelector('#node-n1-x').value);
            const n1y = parseFloat(document.querySelector('#node-n1-y').value);
            const n2x = parseFloat(document.querySelector('#node-n2-x').value);
            const n2y = parseFloat(document.querySelector('#node-n2-y').value);
            const n3x = parseFloat(document.querySelector('#node-n3-x').value);
            const n3y = parseFloat(document.querySelector('#node-n3-y').value);

            // Update system with new values
            this.system.n1 = { x: n1x, y: n1y };
            this.system.n2 = { x: n2x, y: n2y };
            this.system.n3 = { x: n3x, y: n3y };

            // Recalculate centroid and incenter
            this.calculateCentroid();
            this.calculateIncenter();

            // Update dashboard and redraw
            this.updateDashboard();
            this.drawSystem();

            console.log('Changes applied successfully');
        } catch (error) {
            console.error('Error applying changes:', error);
        }
    }

    exportData() {
        console.log('Exporting data...');
        try {
            const data = {
                nodes: {
                    n1: this.system.n1,
                    n2: this.system.n2,
                    n3: this.system.n3
                },
                centroid: this.system.intelligence,
                incenter: this.system.incenter,
                perimeter: this.calculatePerimeter(),
                area: this.calculateArea(),
                angles: this.calculateAngles(),
                lengths: this.calculateLengths()
            };

            const jsonData = JSON.stringify(data, null, 2);
            const blob = new Blob([jsonData], { type: 'application/json' });
            const url = URL.createObjectURL(blob);

            const a = document.createElement('a');
            a.href = url;
            a.download = 'triangle_data.json';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            console.log('Data exported successfully');
        } catch (error) {
            console.error('Error exporting data:', error);
        }
    }

    initializeSystem(preset) {
        console.log('Initialize system with preset:', preset);
        try {
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
                    };
                    break;
                case 'isosceles':
                    const baseWidth = Math.min(canvasWidth, canvasHeight) * 0.4;
                    const isoHeight = baseWidth * 1.2;
                    this.system = {
                        n1: { x: centerX, y: centerY - isoHeight / 2 },
                        n2: { x: centerX - baseWidth / 2, y: centerY + isoHeight / 2 },
                        n3: { x: centerX + baseWidth / 2, y: centerY + isoHeight / 2 },
                    };
                    break;
                case 'scalene':
                    const scaleWidth = Math.min(canvasWidth, canvasHeight) * 0.4;
                    const scaleHeight = scaleWidth * 0.8;
                    this.system = {
                        n1: { x: centerX - scaleWidth / 2, y: centerY + scaleHeight / 2 },
                        n2: { x: centerX + scaleWidth / 2, y: centerY + scaleHeight / 2 },
                        n3: { x: centerX + scaleWidth / 4, y: centerY - scaleHeight / 2 },
                    };
                    break;
                case 'right':
                    const rightSide = Math.min(canvasWidth, canvasHeight) * 0.4;
                    this.system = {
                        n1: { x: centerX - rightSide / 2, y: centerY + rightSide / 2 },
                        n2: { x: centerX - rightSide / 2, y: centerY - rightSide / 2 },
                        n3: { x: centerX + rightSide / 2, y: centerY + rightSide / 2 },
                    };
                    break;
                case 'acute':
                    const acuteBase = Math.min(canvasWidth, canvasHeight) * 0.4;
                    const acuteHeight = acuteBase * 0.8;
                    this.system = {
                        n1: { x: centerX, y: centerY - acuteHeight / 2 },
                        n2: { x: centerX - acuteBase / 2, y: centerY + acuteHeight / 2 },
                        n3: { x: centerX + acuteBase / 2, y: centerY + acuteHeight / 2 },
                    };
                    break;
                case 'obtuse':
                    const obtuseBase = Math.min(canvasWidth, canvasHeight) * 0.4;
                    const obtuseHeight = obtuseBase * 0.3;
                    this.system = {
                        n1: { x: centerX - obtuseBase / 2, y: centerY },
                        n2: { x: centerX + obtuseBase / 2, y: centerY },
                        n3: { x: centerX - obtuseBase / 4, y: centerY - obtuseHeight },
                    };
                    break;
                default:
                    console.error('Invalid preset');
                    return;
            }

            this.calculateCentroid();
            this.calculateIncenter();
            console.log('System initialized:', this.system);
            this.updateDashboard();
            this.drawSystem();
        } catch (error) {
            console.error('Error initializing system:', error);
        }
    }

    calculateCentroid() {
        const { n1, n2, n3 } = this.system;
        this.system.intelligence = {
            x: (n1.x + n2.x + n3.x) / 3,
            y: (n1.y + n2.y + n3.y) / 3
        };
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
        try {
            const ctx = this.ctx;
            ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

            ctx.save();
            ctx.translate(0, this.canvas.height);
            ctx.scale(1, -1);

            // Set up canvas context
            ctx.lineWidth = 2;
            ctx.strokeStyle = 'white';

            // Draw triangle
            ctx.beginPath();
            ctx.moveTo(this.system.n1.x, this.system.n1.y);
            ctx.lineTo(this.system.n2.x, this.system.n2.y);
            ctx.lineTo(this.system.n3.x, this.system.n3.y);
            ctx.closePath();
            ctx.stroke();

            // Log node coordinates
            console.log('Node coordinates:',
                'N1:', this.system.n1,
                'N2:', this.system.n2,
                'N3:', this.system.n3
            );

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

            // Draw additional elements based on toggle states
            if (this.showMidpoints) this.drawMidpoints();
            if (this.showIncircle) this.drawIncircle();
            if (this.showMedians) this.drawMedians();
            if (this.showAreas) this.drawAreas();

            ctx.restore();
        } catch (error) {
            console.error('Error drawing system:', error);
        }
    }

    drawNode(point, color, label) {
        const ctx = this.ctx;
        ctx.beginPath();
        ctx.arc(point.x, point.y, 5, 0, 2 * Math.PI);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.fillStyle = 'white';
        ctx.save();
        ctx.scale(1, -1);
        ctx.fillText(label, point.x + 10, -point.y);
        ctx.restore();
    }

    drawMidpoints() {
        // Implementation for drawing midpoints
    }

    drawIncircle() {
        // Implementation for drawing incircle
    }

    drawMedians() {
        // Implementation for drawing medians
    }

    drawAreas() {
        // Implementation for drawing areas
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
