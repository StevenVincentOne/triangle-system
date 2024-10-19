class TriangleSystem {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.system = {};
        this.showAreas = false;
        this.showMidpoints = false;
        this.showIncircle = false;
        this.showIncenter = false;
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
        
        const presetButtons = ['equilateral', 'isosceles', 'scalene', 'right', 'acute', 'obtuse'];
        presetButtons.forEach(preset => {
            const button = document.getElementById(preset);
            if (button) {
                button.addEventListener('click', () => this.initializeSystem(preset));
            }
        });
        
        ['Midpoints', 'Incircle', 'Incenter', 'Medians', 'Areas'].forEach(feature => {
            const button = document.getElementById(`toggle${feature}`);
            if (button) {
                button.addEventListener('click', () => {
                    this[`show${feature.toLowerCase()}`] = !this[`show${feature.toLowerCase()}`];
                    this.drawSystem();
                });
            }
        });
        
        const applyButton = document.getElementById('apply-button');
        if (applyButton) {
            applyButton.addEventListener('click', () => this.applyChanges());
        }
    }

    initializeSystem(preset) {
        // Reset the system
        this.system = {};

        const side = 200; // Base side length for calculations

        // Set up the nodes based on the preset
        switch(preset) {
            case 'equilateral':
                const height = side * Math.sqrt(3) / 2;
                this.system = {
                    n1: { x: 0, y: height * 2/3 },
                    n2: { x: -side / 2, y: -height / 3 },
                    n3: { x: side / 2, y: -height / 3 }
                };
                break;
            case 'isosceles':
                this.system = {
                    n1: { x: 0, y: side * 0.8 },
                    n2: { x: -side / 2, y: 0 },
                    n3: { x: side / 2, y: 0 }
                };
                break;
            case 'scalene':
                this.system = {
                    n1: { x: 0, y: side * 0.9 },
                    n2: { x: -side * 0.6, y: 0 },
                    n3: { x: side * 0.4, y: 0 }
                };
                break;
            case 'right':
                this.system = {
                    n1: { x: 0, y: side },
                    n2: { x: 0, y: 0 },
                    n3: { x: side, y: 0 }
                };
                break;
            case 'acute':
                const acuteHeight = side * Math.sqrt(3) / 2 * 0.8;
                this.system = {
                    n1: { x: 0, y: acuteHeight },
                    n2: { x: -side * 0.4, y: 0 },
                    n3: { x: side * 0.4, y: 0 }
                };
                break;
            case 'obtuse':
                this.system = {
                    n1: { x: side * 0.1, y: side * 0.8 },
                    n2: { x: -side, y: 0 },
                    n3: { x: side * 0.5, y: 0 }
                };
                break;
            default:
                // Set up a default equilateral triangle
                const defaultHeight = side * Math.sqrt(3) / 2;
                this.system = {
                    n1: { x: 0, y: defaultHeight * 2/3 },
                    n2: { x: -side / 2, y: -defaultHeight / 3 },
                    n3: { x: side / 2, y: -defaultHeight / 3 }
                };
        }

        // Calculate and set the centroid (intelligence)
        const centroidX = (this.system.n1.x + this.system.n2.x + this.system.n3.x) / 3;
        const centroidY = (this.system.n1.y + this.system.n2.y + this.system.n3.y) / 3;
        this.system.intelligence = { x: centroidX, y: centroidY };

        // Update derived points and dashboard
        this.updateDerivedPoints();
        this.updateDashboard();
        this.drawSystem();
    }

    handleMouseDown(event) {
        const mousePos = this.getMousePosition(event);
        for (const node of ['n1', 'n2', 'n3']) {
            if (this.isClickOnNode(mousePos.x, mousePos.y, this.system[node])) {
                this.isDragging = true;
                this.draggedNode = node;
                break;
            }
        }
    }

    handleMouseMove(event) {
        if (this.isDragging && this.draggedNode) {
            const mousePos = this.getMousePosition(event);
            this.system[this.draggedNode] = mousePos;
            this.adjustTriangleToOrigin();
            this.updateDerivedPoints();
            this.updateDashboard();
            this.drawSystem();
        }
    }

    handleMouseUp() {
        this.isDragging = false;
        this.draggedNode = null;
    }

    drawAxes(ctx) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 1;
        
        // Draw x-axis
        ctx.beginPath();
        ctx.moveTo(-this.canvas.width / 2, 0);
        ctx.lineTo(this.canvas.width / 2, 0);
        ctx.stroke();
        
        // Draw y-axis
        ctx.beginPath();
        ctx.moveTo(0, -this.canvas.height / 2);
        ctx.lineTo(0, this.canvas.height / 2);
        ctx.stroke();
        
        // Add labels
        ctx.fillStyle = 'white';
        ctx.font = '12px Arial';
        ctx.fillText('X', this.canvas.width / 2 - 20, -10);
        ctx.fillText('Y', 10, -this.canvas.height / 2 + 20);
    }

    drawSystem() {
        const draw = () => {
            const ctx = this.ctx;
            ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

            ctx.save();
            ctx.translate(this.canvas.width / 2, this.canvas.height / 2);
            ctx.scale(1, -1);

            this.drawAxes(ctx);

            if (this.showAreas) {
                this.drawAreas(ctx);
            }

            ctx.lineWidth = 2;

            ctx.beginPath();
            ctx.strokeStyle = 'red';
            ctx.moveTo(this.system.n1.x, this.system.n1.y);
            ctx.lineTo(this.system.n2.x, this.system.n2.y);
            ctx.stroke();

            ctx.beginPath();
            ctx.strokeStyle = 'blue';
            ctx.moveTo(this.system.n1.x, this.system.n1.y);
            ctx.lineTo(this.system.n3.x, this.system.n3.y);
            ctx.stroke();

            ctx.beginPath();
            ctx.strokeStyle = 'green';
            ctx.moveTo(this.system.n2.x, this.system.n2.y);
            ctx.lineTo(this.system.n3.x, this.system.n3.y);
            ctx.stroke();

            if (this.showMidpoints) {
                this.drawMidpoints(ctx);
            }

            if (this.showIncircle) {
                this.drawIncircle(ctx);
                this.drawTangents(ctx);
            }

            this.drawNode(ctx, this.system.n1, 'red', 'N1', this.lockedNodes.n1);
            this.drawNode(ctx, this.system.n2, 'green', 'N2', this.lockedNodes.n2);
            this.drawNode(ctx, this.system.n3, 'blue', 'N3', this.lockedNodes.n3);

            this.drawNode(ctx, this.system.intelligence, 'white', 'I', this.centroidLocked);

            if (this.showIncenter) {
                this.drawNode(ctx, this.system.incenter, 'yellow', 'Incenter', false);
            }

            this.drawAngles(ctx);
            this.drawEdgeLengths(ctx);

            ctx.restore();

            if (this.isDragging) {
                requestAnimationFrame(draw);
            }
        };

        draw();
    }

    drawNode(ctx, node, color, label, isLocked) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, 5, 0, 2 * Math.PI);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = 'white';
        ctx.font = '14px Arial';
        ctx.fillText(label, node.x + 10, node.y - 10);

        if (isLocked) {
            ctx.beginPath();
            ctx.arc(node.x, node.y, 8, 0, 2 * Math.PI);
            ctx.strokeStyle = 'yellow';
            ctx.stroke();
        }
    }

    drawMidpoints(ctx) {
        const midpoints = this.calculateMidpoints();
        ctx.fillStyle = 'yellow';
        for (const midpoint of Object.values(midpoints)) {
            ctx.beginPath();
            ctx.arc(midpoint.x, midpoint.y, 3, 0, 2 * Math.PI);
            ctx.fill();
        }
    }

    drawIncircle(ctx) {
        const incenter = this.calculateIncenter();
        const radius = this.calculateInradius();

        ctx.beginPath();
        ctx.arc(incenter.x, incenter.y, radius, 0, 2 * Math.PI);
        ctx.strokeStyle = 'rgba(255, 255, 0, 0.5)';
        ctx.stroke();
    }

    drawTangents(ctx) {
        const tangentPoints = this.calculateTangentPoints();
        ctx.fillStyle = 'lightblue';
        for (const point of tangentPoints) {
            ctx.beginPath();
            ctx.arc(point.x, point.y, 3, 0, 2 * Math.PI);
            ctx.fill();
        }
    }

    drawAngles(ctx) {
        const angles = this.calculateAngles();
        ctx.font = '12px Arial';
        ctx.fillStyle = 'white';
        ctx.fillText(`${angles.n1.toFixed(1)}°`, this.system.n1.x, this.system.n1.y - 15);
        ctx.fillText(`${angles.n2.toFixed(1)}°`, this.system.n2.x - 30, this.system.n2.y + 5);
        ctx.fillText(`${angles.n3.toFixed(1)}°`, this.system.n3.x + 15, this.system.n3.y + 5);
    }

    drawEdgeLengths(ctx) {
        const edgeLengths = this.calculateEdgeLengths();
        ctx.font = '12px Arial';
        ctx.fillStyle = 'white';
        ctx.fillText(`NC1: ${edgeLengths.nc1.toFixed(1)}`, (this.system.n2.x + this.system.n3.x) / 2, (this.system.n2.y + this.system.n3.y) / 2 - 10);
        ctx.fillText(`NC2: ${edgeLengths.nc2.toFixed(1)}`, (this.system.n1.x + this.system.n3.x) / 2 + 10, (this.system.n1.y + this.system.n3.y) / 2);
        ctx.fillText(`NC3: ${edgeLengths.nc3.toFixed(1)}`, (this.system.n1.x + this.system.n2.x) / 2 - 40, (this.system.n1.y + this.system.n2.y) / 2);
    }

    drawAreas(ctx) {
        const areas = this.calculateSubsystemAreas();
        ctx.globalAlpha = 0.2;
        ctx.fillStyle = 'red';
        ctx.beginPath();
        ctx.moveTo(this.system.n1.x, this.system.n1.y);
        ctx.lineTo(this.system.n2.x, this.system.n2.y);
        ctx.lineTo(this.system.intelligence.x, this.system.intelligence.y);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = 'green';
        ctx.beginPath();
        ctx.moveTo(this.system.n2.x, this.system.n2.y);
        ctx.lineTo(this.system.n3.x, this.system.n3.y);
        ctx.lineTo(this.system.intelligence.x, this.system.intelligence.y);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = 'blue';
        ctx.beginPath();
        ctx.moveTo(this.system.n3.x, this.system.n3.y);
        ctx.lineTo(this.system.n1.x, this.system.n1.y);
        ctx.lineTo(this.system.intelligence.x, this.system.intelligence.y);
        ctx.closePath();
        ctx.fill();

        ctx.globalAlpha = 1;
    }

    updateDerivedPoints() {
        this.system.midpoints = this.calculateMidpoints();
        this.system.incenter = this.calculateIncenter();
        this.system.tangentPoints = this.calculateTangentPoints();
    }

    updateDashboard() {
        const angles = this.calculateAngles();
        const edgeLengths = this.calculateEdgeLengths();
        const areas = this.calculateSubsystemAreas();
        const perimeter = this.calculatePerimeter();
        const totalArea = this.calculateTotalArea();

        // Update system information
        document.getElementById('system-perimeter').value = perimeter.toFixed(2);
        document.getElementById('system-area').value = totalArea.toFixed(2);

        // Update node information
        ['n1', 'n2', 'n3'].forEach(node => {
            document.getElementById(`node-${node}-x`).value = this.system[node].x.toFixed(2);
            document.getElementById(`node-${node}-y`).value = this.system[node].y.toFixed(2);
            document.getElementById(`node-${node}-angle`).value = angles[node].toFixed(2);
        });

        // Update edge lengths
        document.getElementById('edge-nc1').value = edgeLengths.nc1.toFixed(2);
        document.getElementById('edge-nc2').value = edgeLengths.nc2.toFixed(2);
        document.getElementById('edge-nc3').value = edgeLengths.nc3.toFixed(2);

        // Update centers
        document.getElementById('centroid-x').value = this.system.intelligence.x.toFixed(2);
        document.getElementById('centroid-y').value = this.system.intelligence.y.toFixed(2);
        document.getElementById('incenter-x').value = this.system.incenter.x.toFixed(2);
        document.getElementById('incenter-y').value = this.system.incenter.y.toFixed(2);

        // Update subsystem information
        ['1', '2', '3'].forEach((subsystem, index) => {
            document.getElementById(`subsystem-${subsystem}-area`).value = areas[index].toFixed(2);
            document.getElementById(`subsystem-${subsystem}-perimeter`).value = this.calculateSubsystemPerimeter(index).toFixed(2);
            document.getElementById(`subsystem-${subsystem}-centroid-angle`).value = this.calculateSubsystemCentroidAngle(index).toFixed(2);
        });

        // Update information panel
        document.getElementById('d-centroid-incircle').textContent = this.calculateDistanceCentroidToIncircle().toFixed(2);
        ['nc1', 'nc2', 'nc3'].forEach(edge => {
            document.getElementById(`d-mid-${edge}`).textContent = this.calculateDistanceMidpointToTangent(edge).toFixed(2);
            document.getElementById(`r-mid-${edge}`).textContent = this.calculateRatioMidpointToTangent(edge).toFixed(2);
        });
    }

    adjustTriangleToOrigin() {
        const centroid = {
            x: (this.system.n1.x + this.system.n2.x + this.system.n3.x) / 3,
            y: (this.system.n1.y + this.system.n2.y + this.system.n3.y) / 3
        };

        ['n1', 'n2', 'n3'].forEach(node => {
            this.system[node].x -= centroid.x;
            this.system[node].y -= centroid.y;
        });

        this.system.intelligence = { x: 0, y: 0 };
    }

    getMousePosition(event) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        return {
            x: (event.clientX - rect.left - this.canvas.width / 2) * scaleX,
            y: -(event.clientY - rect.top - this.canvas.height / 2) * scaleY
        };
    }

    isClickOnNode(x, y, node) {
        const distance = Math.sqrt(Math.pow(x - node.x, 2) + Math.pow(y - node.y, 2));
        return distance <= 10; // Adjust this value to change the click area size
    }

    applyChanges() {
        ['n1', 'n2', 'n3'].forEach(node => {
            this.system[node].x = parseFloat(document.getElementById(`node-${node}-x`).value);
            this.system[node].y = parseFloat(document.getElementById(`node-${node}-y`).value);
        });

        this.adjustTriangleToOrigin();
        this.updateDerivedPoints();
        this.updateDashboard();
        this.drawSystem();
    }

    calculateMidpoints() {
        return {
            m1: { x: (this.system.n2.x + this.system.n3.x) / 2, y: (this.system.n2.y + this.system.n3.y) / 2 },
            m2: { x: (this.system.n1.x + this.system.n3.x) / 2, y: (this.system.n1.y + this.system.n3.y) / 2 },
            m3: { x: (this.system.n1.x + this.system.n2.x) / 2, y: (this.system.n1.y + this.system.n2.y) / 2 }
        };
    }

    calculateIncenter() {
        const a = Math.sqrt(Math.pow(this.system.n2.x - this.system.n3.x, 2) + Math.pow(this.system.n2.y - this.system.n3.y, 2));
        const b = Math.sqrt(Math.pow(this.system.n1.x - this.system.n3.x, 2) + Math.pow(this.system.n1.y - this.system.n3.y, 2));
        const c = Math.sqrt(Math.pow(this.system.n1.x - this.system.n2.x, 2) + Math.pow(this.system.n1.y - this.system.n2.y, 2));

        const x = (a * this.system.n1.x + b * this.system.n2.x + c * this.system.n3.x) / (a + b + c);
        const y = (a * this.system.n1.y + b * this.system.n2.y + c * this.system.n3.y) / (a + b + c);

        return { x, y };
    }

    calculateInradius() {
        const semiperimeter = this.calculatePerimeter() / 2;
        const area = this.calculateTotalArea();
        return area / semiperimeter;
    }

    calculateTangentPoints() {
        const incenter = this.calculateIncenter();
        const inradius = this.calculateInradius();
        const points = [];

        ['n1', 'n2', 'n3'].forEach((node, i, arr) => {
            const nextNode = arr[(i + 1) % 3];
            const dx = this.system[nextNode].x - this.system[node].x;
            const dy = this.system[nextNode].y - this.system[node].y;
            const length = Math.sqrt(dx * dx + dy * dy);
            const unitX = dx / length;
            const unitY = dy / length;

            const perpX = -unitY;
            const perpY = unitX;

            points.push({
                x: incenter.x + inradius * perpX,
                y: incenter.y + inradius * perpY
            });
        });

        return points;
    }

    calculateAngles() {
        const angles = {};
        ['n1', 'n2', 'n3'].forEach((node, i, arr) => {
            const prev = arr[(i - 1 + 3) % 3];
            const next = arr[(i + 1) % 3];
            const v1 = {
                x: this.system[prev].x - this.system[node].x,
                y: this.system[prev].y - this.system[node].y
            };
            const v2 = {
                x: this.system[next].x - this.system[node].x,
                y: this.system[next].y - this.system[node].y
            };
            const dot = v1.x * v2.x + v1.y * v2.y;
            const v1mag = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
            const v2mag = Math.sqrt(v2.x * v2.x + v2.y * v2.y);
            const angle = Math.acos(dot / (v1mag * v2mag));
            angles[node] = angle * (180 / Math.PI);
        });
        return angles;
    }

    calculateEdgeLengths() {
        return {
            nc1: Math.sqrt(Math.pow(this.system.n2.x - this.system.n3.x, 2) + Math.pow(this.system.n2.y - this.system.n3.y, 2)),
            nc2: Math.sqrt(Math.pow(this.system.n1.x - this.system.n3.x, 2) + Math.pow(this.system.n1.y - this.system.n3.y, 2)),
            nc3: Math.sqrt(Math.pow(this.system.n1.x - this.system.n2.x, 2) + Math.pow(this.system.n1.y - this.system.n2.y, 2))
        };
    }

    calculateSubsystemAreas() {
        const areas = [];
        ['n1', 'n2', 'n3'].forEach((node, i, arr) => {
            const nextNode = arr[(i + 1) % 3];
            const area = Math.abs(
                (this.system[node].x - this.system.intelligence.x) *
                (this.system[nextNode].y - this.system.intelligence.y) -
                (this.system[nextNode].x - this.system.intelligence.x) *
                (this.system[node].y - this.system.intelligence.y)
            ) / 2;
            areas.push(area);
        });
        return areas;
    }

    calculatePerimeter() {
        const edgeLengths = this.calculateEdgeLengths();
        return edgeLengths.nc1 + edgeLengths.nc2 + edgeLengths.nc3;
    }

    calculateTotalArea() {
        return this.calculateSubsystemAreas().reduce((sum, area) => sum + area, 0);
    }

    calculateSubsystemPerimeter(index) {
        const nodes = ['n1', 'n2', 'n3'];
        const node = nodes[index];
        const nextNode = nodes[(index + 1) % 3];
        const edgeLength = Math.sqrt(
            Math.pow(this.system[node].x - this.system[nextNode].x, 2) +
            Math.pow(this.system[node].y - this.system[nextNode].y, 2)
        );
        const intelligenceToNode = Math.sqrt(
            Math.pow(this.system.intelligence.x - this.system[node].x, 2) +
            Math.pow(this.system.intelligence.y - this.system[node].y, 2)
        );
        const intelligenceToNextNode = Math.sqrt(
            Math.pow(this.system.intelligence.x - this.system[nextNode].x, 2) +
            Math.pow(this.system.intelligence.y - this.system[nextNode].y, 2)
        );
        return edgeLength + intelligenceToNode + intelligenceToNextNode;
    }

    calculateSubsystemCentroidAngle(index) {
        const nodes = ['n1', 'n2', 'n3'];
        const node = nodes[index];
        const nextNode = nodes[(index + 1) % 3];
        const v1 = {
            x: this.system[node].x - this.system.intelligence.x,
            y: this.system[node].y - this.system.intelligence.y
        };
        const v2 = {
            x: this.system[nextNode].x - this.system.intelligence.x,
            y: this.system[nextNode].y - this.system.intelligence.y
        };
        const dot = v1.x * v2.x + v1.y * v2.y;
        const v1mag = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
        const v2mag = Math.sqrt(v2.x * v2.x + v2.y * v2.y);
        const angle = Math.acos(dot / (v1mag * v2mag));
        return angle * (180 / Math.PI);
    }

    calculateDistanceCentroidToIncircle() {
        const incenter = this.calculateIncenter();
        return Math.sqrt(
            Math.pow(this.system.intelligence.x - incenter.x, 2) +
            Math.pow(this.system.intelligence.y - incenter.y, 2)
        );
    }

    calculateDistanceMidpointToTangent(edge) {
        const midpoints = this.calculateMidpoints();
        const tangentPoints = this.calculateTangentPoints();
        const edgeIndex = ['nc1', 'nc2', 'nc3'].indexOf(edge);
        const midpoint = midpoints[`m${edgeIndex + 1}`];
        const tangentPoint = tangentPoints[edgeIndex];
        return Math.sqrt(
            Math.pow(midpoint.x - tangentPoint.x, 2) +
            Math.pow(midpoint.y - tangentPoint.y, 2)
        );
    }

    calculateRatioMidpointToTangent(edge) {
        const edgeLengths = this.calculateEdgeLengths();
        const distanceToTangent = this.calculateDistanceMidpointToTangent(edge);
        return distanceToTangent / (edgeLengths[edge] / 2);
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
