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
        this.isDragging = false;
        this.draggedNode = null;

        this.initializeEventListeners();
        this.initializeSystem('equilateral');
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

            // Draw triangle edges
            ctx.beginPath();
            ctx.strokeStyle = 'red';
            ctx.moveTo(this.system.n1.x, this.system.n1.y);
            ctx.lineTo(this.system.n2.x, this.system.n2.y);
            ctx.lineTo(this.system.n3.x, this.system.n3.y);
            ctx.closePath();
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

            if (this.showMedians) {
                this.drawMedians(ctx);
            }

            this.drawNode(ctx, this.system.n1, 'red', 'N1');
            this.drawNode(ctx, this.system.n2, 'green', 'N2');
            this.drawNode(ctx, this.system.n3, 'blue', 'N3');

            this.drawNode(ctx, this.system.intelligence, 'white', 'I');

            if (this.showIncenter) {
                this.drawNode(ctx, this.system.incenter, 'yellow', 'Incenter');
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

    updateDashboard() {
        const setElementValue = (selector, value, label = '') => {
            const element = document.querySelector(selector);
            if (element) {
                element.value = this.formatValue(value);
                if (label) {
                    const labelElement = element.previousElementSibling;
                    if (labelElement) {
                        labelElement.textContent = label.replace(':', '');
                    }
                }
            } else {
                console.warn(`Element not found: ${selector}`);
            }
        };

        const totalArea = this.calculateArea();
        const subsystemArea = totalArea / 3;
        setElementValue('#system-perimeter', this.calculatePerimeter(), 'P:');
        setElementValue('#system-area', totalArea, 'A:');
        setElementValue('#subsystems-area', subsystemArea, 'SS A:');

        const angles = this.calculateAngles();
        const lengths = this.calculateLengths();
        const I = this.system.intelligence;

        const subsystemPerimeters = {
            ss1: this.calculateDistance(I, this.system.n1) + this.calculateDistance(I, this.system.n2) + lengths.l1,
            ss2: this.calculateDistance(I, this.system.n2) + this.calculateDistance(I, this.system.n3) + lengths.l2,
            ss3: this.calculateDistance(I, this.system.n3) + this.calculateDistance(I, this.system.n1) + lengths.l3
        };

        ['1', '2', '3'].forEach((i) => {
            setElementValue(`#subsystem-${i}-perimeter`, subsystemPerimeters[`ss${i}`], 'P:');
            setElementValue(`#subsystem-${i}-angle`, `${(angles[`n${i}`] / 2).toFixed(2)}°`, '∠:');
        });

        setElementValue('#edge-nc1', lengths.l1, 'NC1:');
        setElementValue('#edge-nc2', lengths.l2, 'NC2:');
        setElementValue('#edge-nc3', lengths.l3, 'NC3:');

        const medians = this.calculateMedians();
        setElementValue('#median-n1', medians.n1, 'N1:');
        setElementValue('#median-n2', medians.n2, 'N2:');
        setElementValue('#median-n3', medians.n3, 'N3:');

        // Update node coordinates
        setElementValue('#node-n1-coords', `${this.formatValue(this.system.n1.x)}, ${this.formatValue(this.system.n1.y)}`, 'N1 x,y:');
        setElementValue('#node-n2-coords', `${this.formatValue(this.system.n2.x)}, ${this.formatValue(this.system.n2.y)}`, 'N2 x,y:');
        setElementValue('#node-n3-coords', `${this.formatValue(this.system.n3.x)}, ${this.formatValue(this.system.n3.y)}`, 'N3 x,y:');

        // Update node angles
        setElementValue('#node-n1-angle', `${angles.n1.toFixed(2)}°`, 'N1 ∠:');
        setElementValue('#node-n2-angle', `${angles.n2.toFixed(2)}°`, 'N2 ∠:');
        setElementValue('#node-n3-angle', `${angles.n3.toFixed(2)}°`, 'N3 ∠:');

        // Update centers
        const centroid = {
            x: (this.system.n1.x + this.system.n2.x + this.system.n3.x) / 3,
            y: (this.system.n1.y + this.system.n2.y + this.system.n3.y) / 3
        };
        setElementValue('#centroid-coords', `${this.formatValue(centroid.x)}, ${this.formatValue(centroid.y)}`, 'I x,y:');
        setElementValue('#incenter-coords', `${this.formatValue(this.system.incenter.x)}, ${this.formatValue(this.system.incenter.y)}`, 'IC x,y:');
        
        const iToIcDistance = this.calculateDistance(centroid, this.system.incenter);
        setElementValue('#i-to-ic-distance', iToIcDistance, 'd (I, IC):');

        // Call the separate method to update the Information Panel
        this.updateInformationPanel();
    }

    updateInformationPanel() {
        const setElementValue = (selector, value) => {
            const element = document.querySelector(selector);
            if (element) {
                element.value = this.formatValue(value);
            } else {
                console.warn(`Element not found: ${selector}`);
            }
        };

        // Calculate centroid
        const centroid = {
            x: (this.system.n1.x + this.system.n2.x + this.system.n3.x) / 3,
            y: (this.system.n1.y + this.system.n2.y + this.system.n3.y) / 3
        };
        const dIIC = this.calculateDistance(centroid, this.system.incenter);

        setElementValue('#d-i-ic', dIIC);

        const perimeter = this.calculatePerimeter();
        const rIIC = dIIC / perimeter;
        setElementValue('#r-i-ic', rIIC);

        const midpoints = this.calculateMidpoints();
        const tangentPoints = this.calculateTangencyPoints();

        ['n1', 'n2', 'n3'].forEach((node, index) => {
            const midpoint = midpoints[`m${index + 1}`];
            const tangentPoint = tangentPoints[index];
            const dMT = this.calculateDistance(midpoint, tangentPoint);
            const rMT = dMT / perimeter;
            setElementValue(`#d-m-t-${node}`, dMT);
            setElementValue(`#r-m-t-${node}`, rMT);
        });
    }
}

// Initialize the TriangleSystem when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.querySelector('#canvas');
    if (canvas) {
        window.triangleSystem = new TriangleSystem(canvas);
    } else {
        console.error("Canvas element not found");
    }
});