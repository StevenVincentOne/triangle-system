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

    initializeEventListeners() {
        this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
        this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
        this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
        this.canvas.addEventListener('mouseleave', this.handleMouseUp.bind(this));
    }

    handleMouseDown(event) {
        const mousePos = this.getMousePosition(event);
        for (const node of ['n1', 'n2', 'n3']) {
            if (this.isClickOnNode(mousePos, this.system[node])) {
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

    getMousePosition(event) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        return {
            x: (event.clientX - rect.left - this.canvas.width / 2) * scaleX,
            y: -(event.clientY - rect.top - this.canvas.height / 2) * scaleY
        };
    }

    isClickOnNode(mousePos, node) {
        const distance = Math.sqrt(Math.pow(mousePos.x - node.x, 2) + Math.pow(mousePos.y - node.y, 2));
        return distance <= 8;
    }

    initializeSystem(shape = 'equilateral') {
        const side = 200;
        const height = side * Math.sqrt(3) / 2;
        
        this.system = {
            n1: { x: -side / 2, y: -height / 3 },
            n2: { x: side / 2, y: -height / 3 },
            n3: { x: 0, y: 2 * height / 3 }
        };
        
        switch (shape) {
            case 'isosceles':
                this.system.n2.x = -this.system.n2.x;
                this.system.n3.x = 0;
                this.system.n3.y = height / 2;
                break;
            case 'scalene':
                this.system.n1.x *= 0.8;
                this.system.n2.x *= 1.2;
                this.system.n3.y *= 0.9;
                break;
            case 'right':
                this.system.n1 = { x: -side / 2, y: -height / 2 };
                this.system.n2 = { x: side / 2, y: -height / 2 };
                this.system.n3 = { x: -side / 2, y: height / 2 };
                break;
        }
        
        this.updateDerivedPoints();
        this.updateDashboard();
        this.drawSystem();
    }

    updateDerivedPoints() {
        const { n1, n2, n3 } = this.system;
        
        this.system.intelligence = {
            x: (n1.x + n2.x + n3.x) / 3,
            y: (n1.y + n2.y + n3.y) / 3
        };
        
        const a = this.calculateDistance(n2, n3);
        const b = this.calculateDistance(n1, n3);
        const c = this.calculateDistance(n1, n2);
        const perimeterHalf = (a + b + c) / 2;
        
        this.system.incenter = {
            x: (a * n1.x + b * n2.x + c * n3.x) / (a + b + c),
            y: (a * n1.y + b * n2.y + c * n3.y) / (a + b + c)
        };
        
        const area = Math.sqrt(perimeterHalf * (perimeterHalf - a) * (perimeterHalf - b) * (perimeterHalf - c));
        this.system.incircleRadius = area / perimeterHalf;
        
        this.system.midpoints = {
            m1: { x: (n2.x + n3.x) / 2, y: (n2.y + n3.y) / 2 },
            m2: { x: (n1.x + n3.x) / 2, y: (n1.y + n3.y) / 2 },
            m3: { x: (n1.x + n2.x) / 2, y: (n1.y + n2.y) / 2 }
        };
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

        setElementValue('#node-n1-coords', `${this.formatValue(this.system.n1.x)}, ${this.formatValue(this.system.n1.y)}`, 'N1 x,y:');
        setElementValue('#node-n2-coords', `${this.formatValue(this.system.n2.x)}, ${this.formatValue(this.system.n2.y)}`, 'N2 x,y:');
        setElementValue('#node-n3-coords', `${this.formatValue(this.system.n3.x)}, ${this.formatValue(this.system.n3.y)}`, 'N3 x,y:');

        setElementValue('#node-n1-angle', `${angles.n1.toFixed(2)}°`, 'N1 ∠:');
        setElementValue('#node-n2-angle', `${angles.n2.toFixed(2)}°`, 'N2 ∠:');
        setElementValue('#node-n3-angle', `${angles.n3.toFixed(2)}°`, 'N3 ∠:');

        const centroid = {
            x: (this.system.n1.x + this.system.n2.x + this.system.n3.x) / 3,
            y: (this.system.n1.y + this.system.n2.y + this.system.n3.y) / 3
        };
        setElementValue('#centroid-coords', `${this.formatValue(centroid.x)}, ${this.formatValue(centroid.y)}`, 'I x,y:');
        setElementValue('#incenter-coords', `${this.formatValue(this.system.incenter.x)}, ${this.formatValue(this.system.incenter.y)}`, 'IC x,y:');
        
        const iToIcDistance = this.calculateDistance(centroid, this.system.incenter);
        setElementValue('#i-to-ic-distance', iToIcDistance, 'd (I, IC):');

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

document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.querySelector('#canvas');
    if (canvas) {
        window.triangleSystem = new TriangleSystem(canvas);
    } else {
        console.error("Canvas element not found");
    }
});