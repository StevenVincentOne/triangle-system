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

            if (this.showConnections) {
                this.drawConnections(ctx);
            }

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

    // Add other necessary methods here (e.g., drawNode, drawConnections, drawMidpoints, etc.)

    updateDerivedPoints() {
        // Implement the logic to update derived points (e.g., midpoints, incenter, etc.)
    }

    updateDashboard() {
        // Implement the logic to update the dashboard with current triangle data
    }

    adjustTriangleToOrigin() {
        // Implement the logic to adjust the triangle to the origin if needed
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
        // Implement the logic to apply changes from the dashboard inputs
    }

    // Add any other necessary methods here
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
