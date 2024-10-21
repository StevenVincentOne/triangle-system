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

    initializeSystem(preset = 'equilateral') {
        const side = 300;
        const height = (Math.sqrt(3) / 2) * side;

        switch (preset) {
            case 'equilateral':
                this.system = {
                    n1: { x: 0, y: height },
                    n2: { x: -side / 2, y: 0 },
                    n3: { x: side / 2, y: 0 },
                };
                break;
            case 'isosceles':
                this.system = {
                    n1: { x: 0, y: Math.sqrt(400*400 - 100*100) },
                    n2: { x: -100, y: 0 },
                    n3: { x: 100, y: 0 },
                };
                break;
            case 'scalene':
                this.system = {
                    n1: { x: 0, y: 200 },
                    n2: { x: -120, y: 0 },
                    n3: { x: 180, y: 0 },
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
                const scale = 300;
                const a = scale * Math.sin(45 * Math.PI / 180) / Math.sin(75 * Math.PI / 180);
                const b = scale * Math.sin(60 * Math.PI / 180) / Math.sin(75 * Math.PI / 180);
                const c = scale;

                const x3 = b * Math.cos(75 * Math.PI / 180);
                const y3 = b * Math.sin(75 * Math.PI / 180);

                this.system = {
                    n1: { x: 0, y: 0 },
                    n2: { x: c, y: 0 },
                    n3: { x: x3, y: y3 },
                };
                break;
            case 'obtuse':
                this.system = {
                    n1: { x: 50, y: 200 },
                    n2: { x: -200, y: 0 },
                    n3: { x: 100, y: 0 },
                };
                break;
            default:
                this.system = {
                    n1: { x: 0, y: height },
                    n2: { x: -side / 2, y: 0 },
                    n3: { x: side / 2, y: 0 },
                };
        }

        this.adjustTriangleToOrigin();
        this.updateDerivedPoints();
        this.updateDashboard();
        this.drawSystem();
    }

    adjustTriangleToOrigin() {
        const centerX = (this.system.n1.x + this.system.n2.x + this.system.n3.x) / 3;
        const centerY = (this.system.n1.y + this.system.n2.y + this.system.n3.y) / 3;
        this.system.n1.x -= centerX;
        this.system.n1.y -= centerY;
        this.system.n2.x -= centerX;
        this.system.n2.y -= centerY;
        this.system.n3.x -= centerX;
        this.system.n3.y -= centerY;
    }

    updateDerivedPoints() {
        this.calculateIncenter();
    }

    calculateIncenter() {
        const a = this.calculateDistance(this.system.n2, this.system.n3);
        const b = this.calculateDistance(this.system.n1, this.system.n3);
        const c = this.calculateDistance(this.system.n1, this.system.n2);
        const x = (a * this.system.n1.x + b * this.system.n2.x + c * this.system.n3.x) / (a + b + c);
        const y = (a * this.system.n1.y + b * this.system.n2.y + c * this.system.n3.y) / (a + b + c);
        this.system.incenter = { x, y };
    }

    updateDashboard() {
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

        ['n1', 'n2', 'n3'].forEach(node => {
            setElementValue(`#node-${node}-angle`, `${angles[node].toFixed(2)}°`, `${node.toUpperCase()} ∠:`);
        });

        setElementValue('#centroid-coords', `${this.formatValue(this.roundToZero(this.system.intelligence.x))}, ${this.formatValue(this.roundToZero(this.system.intelligence.y))}`, 'I x,y');
        setElementValue('#incenter-coords', `${this.formatValue(this.roundToZero(this.system.incenter.x))}, ${this.formatValue(this.roundToZero(this.system.incenter.y))}`, 'IC x,y');

        const iToIcDistance = this.calculateDistance(
            {x: this.roundToZero(this.system.intelligence.x), y: this.roundToZero(this.system.intelligence.y)},
            {x: this.roundToZero(this.system.incenter.x), y: this.roundToZero(this.system.incenter.y)}
        );
        setElementValue('#i-to-ic-distance', iToIcDistance, 'd (I, IC)');

        this.updateInformationPanel();
    }

    updateInformationPanel() {
        const setElementValue = (selector, value) => {
            const element = document.querySelector(selector);
            if (element) {
                element.value = this.formatValue(value);
            }
        };

        // Calculate d(I, IC)
        const centroidX = (this.system.n1.x + this.system.n2.x + this.system.n3.x) / 3;
        const centroidY = (this.system.n1.y + this.system.n2.y + this.system.n3.y) / 3;
        const dIIC = this.calculateDistance({x: centroidX, y: centroidY}, this.system.incenter);
        setElementValue('#d-i-ic', dIIC);

        // Calculate r(I, IC)
        const rIIC = dIIC / this.calculatePerimeter();
        setElementValue('#r-i-ic', rIIC);

        // Calculate d(M, T) and r(M, T) for each node
        ['n1', 'n2', 'n3'].forEach((node, index) => {
            const nextNode = ['n2', 'n3', 'n1'][index];
            const midpoint = {
                x: (this.system[node].x + this.system[nextNode].x) / 2,
                y: (this.system[node].y + this.system[nextNode].y) / 2
            };
            const dMT = this.calculateDistance(midpoint, this.system.incenter);
            const rMT = dMT / this.calculatePerimeter();
            setElementValue(`#d-m-t-${node}`, dMT);
            setElementValue(`#r-m-t-${node}`, rMT);
        });
    }

    calculateDistance(point1, point2) {
        const dx = point2.x - point1.x;
        const dy = point2.y - point1.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    calculatePerimeter() {
        const lengths = this.calculateLengths();
        return lengths.l1 + lengths.l2 + lengths.l3;
    }

    calculateArea() {
        const [a, b, c] = Object.values(this.calculateLengths());
        const s = (a + b + c) / 2;
        return Math.sqrt(s * (s - a) * (s - b) * (s - c));
    }

    calculateLengths() {
        return {
            l1: this.calculateDistance(this.system.n2, this.system.n3),
            l2: this.calculateDistance(this.system.n1, this.system.n3),
            l3: this.calculateDistance(this.system.n1, this.system.n2),
        };
    }

    calculateAngles() {
        const lengths = this.calculateLengths();
        const { l1, l2, l3 } = lengths;
        return {
            n1: Math.acos((l2*l2 + l3*l3 - l1*l1) / (2*l2*l3)) * 180 / Math.PI,
            n2: Math.acos((l1*l1 + l3*l3 - l2*l2) / (2*l1*l3)) * 180 / Math.PI,
            n3: Math.acos((l1*l1 + l2*l2 - l3*l3) / (2*l1*l2)) * 180 / Math.PI
        };
    }

    calculateMedians() {
        const midpoints = {
            m1: { x: (this.system.n2.x + this.system.n3.x) / 2, y: (this.system.n2.y + this.system.n3.y) / 2 },
            m2: { x: (this.system.n1.x + this.system.n3.x) / 2, y: (this.system.n1.y + this.system.n3.y) / 2 },
            m3: { x: (this.system.n1.x + this.system.n2.x) / 2, y: (this.system.n1.y + this.system.n2.y) / 2 }
        };
        return {
            n1: this.calculateDistance(this.system.n1, midpoints.m1),
            n2: this.calculateDistance(this.system.n2, midpoints.m2),
            n3: this.calculateDistance(this.system.n3, midpoints.m3)
        };
    }

    roundToZero(value, epsilon = 1e-10) {
        return Math.abs(value) < epsilon ? 0 : value;
    }

    formatValue(value) {
        if (typeof value === 'number') {
            if (Math.abs(value) >= 1e5 || (Math.abs(value) < 1e-5 && value !== 0)) {
                return value.toExponential(2);
            } else {
                return value.toFixed(2);
            }
        }
        return value.toString();
    }

    drawSystem() {
        const draw = () => {
            const ctx = this.ctx;
            ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

            ctx.save();
            ctx.translate(this.canvas.width / 2, this.canvas.height / 2);
            ctx.scale(1, -1);

            this.drawTriangle(ctx);
            if (this.showConnections) this.drawConnections(ctx);
            if (this.showAreas) this.drawAreas(ctx);
            if (this.showMidpoints) this.drawMidpoints(ctx);
            if (this.showIncircle) this.drawIncircle(ctx);
            if (this.showIncenter) this.drawIncenter(ctx);
            if (this.showMedians) this.drawMedians(ctx);

            this.drawNodes(ctx);
            this.drawAngles(ctx);
            this.drawEdgeLengths(ctx);

            ctx.restore();

            if (this.isDragging) {
                requestAnimationFrame(draw);
            }
        };

        draw();
    }

    drawTriangle(ctx) {
        ctx.beginPath();
        ctx.moveTo(this.system.n1.x, this.system.n1.y);
        ctx.lineTo(this.system.n2.x, this.system.n2.y);
        ctx.lineTo(this.system.n3.x, this.system.n3.y);
        ctx.closePath();
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        ctx.stroke();
    }

    drawConnections(ctx) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(this.system.n1.x, this.system.n1.y);
        ctx.lineTo(0, 0);
        ctx.moveTo(this.system.n2.x, this.system.n2.y);
        ctx.lineTo(0, 0);
        ctx.moveTo(this.system.n3.x, this.system.n3.y);
        ctx.lineTo(0, 0);
        ctx.stroke();
        ctx.setLineDash([]);
    }

    drawAreas(ctx) {
        const areas = [
            { points: [this.system.n1, this.system.n2, {x: 0, y: 0}], color: 'rgba(255, 0, 0, 0.2)' },
            { points: [this.system.n2, this.system.n3, {x: 0, y: 0}], color: 'rgba(0, 255, 0, 0.2)' },
            { points: [this.system.n3, this.system.n1, {x: 0, y: 0}], color: 'rgba(0, 0, 255, 0.2)' }
        ];

        areas.forEach(area => {
            ctx.beginPath();
            ctx.moveTo(area.points[0].x, area.points[0].y);
            ctx.lineTo(area.points[1].x, area.points[1].y);
            ctx.lineTo(area.points[2].x, area.points[2].y);
            ctx.closePath();
            ctx.fillStyle = area.color;
            ctx.fill();
        });
    }

    drawMidpoints(ctx) {
        const midpoints = [
            { x: (this.system.n1.x + this.system.n2.x) / 2, y: (this.system.n1.y + this.system.n2.y) / 2 },
            { x: (this.system.n2.x + this.system.n3.x) / 2, y: (this.system.n2.y + this.system.n3.y) / 2 },
            { x: (this.system.n3.x + this.system.n1.x) / 2, y: (this.system.n3.y + this.system.n1.y) / 2 }
        ];

        ctx.fillStyle = 'yellow';
        midpoints.forEach(point => {
            ctx.beginPath();
            ctx.arc(point.x, point.y, 4, 0, 2 * Math.PI);
            ctx.fill();
        });
    }

    drawIncircle(ctx) {
        if (!this.system.incenter) return;
        const radius = this.calculateIncircleRadius();
        ctx.strokeStyle = 'cyan';
        ctx.beginPath();
        ctx.arc(this.system.incenter.x, this.system.incenter.y, radius, 0, 2 * Math.PI);
        ctx.stroke();
    }

    calculateIncircleRadius() {
        const area = this.calculateArea();
        const semiPerimeter = this.calculatePerimeter() / 2;
        return area / semiPerimeter;
    }

    drawIncenter(ctx) {
        if (!this.system.incenter) return;
        ctx.fillStyle = 'yellow';
        ctx.beginPath();
        ctx.arc(this.system.incenter.x, this.system.incenter.y, 4, 0, 2 * Math.PI);
        ctx.fill();
    }

    drawMedians(ctx) {
        const midpoints = [
            { x: (this.system.n2.x + this.system.n3.x) / 2, y: (this.system.n2.y + this.system.n3.y) / 2 },
            { x: (this.system.n1.x + this.system.n3.x) / 2, y: (this.system.n1.y + this.system.n3.y) / 2 },
            { x: (this.system.n1.x + this.system.n2.x) / 2, y: (this.system.n1.y + this.system.n2.y) / 2 }
        ];

        ctx.strokeStyle = 'rgba(255, 255, 0, 0.5)';
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(this.system.n1.x, this.system.n1.y);
        ctx.lineTo(midpoints[0].x, midpoints[0].y);
        ctx.moveTo(this.system.n2.x, this.system.n2.y);
        ctx.lineTo(midpoints[1].x, midpoints[1].y);
        ctx.moveTo(this.system.n3.x, this.system.n3.y);
        ctx.lineTo(midpoints[2].x, midpoints[2].y);
        ctx.stroke();
        ctx.setLineDash([]);
    }

    drawNodes(ctx) {
        const drawNode = (point, color, label) => {
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(point.x, point.y, 6, 0, 2 * Math.PI);
            ctx.fill();

            ctx.fillStyle = 'white';
            ctx.font = '12px Arial';
            ctx.save();
            ctx.scale(1, -1);
            ctx.fillText(label, point.x + 10, -point.y - 10);
            ctx.restore();
        };

        drawNode(this.system.n1, 'red', 'N1');
        drawNode(this.system.n2, 'green', 'N2');
        drawNode(this.system.n3, 'blue', 'N3');
        drawNode({x: 0, y: 0}, 'white', 'I');
    }

    drawAngles(ctx) {
        const angles = this.calculateAngles();
        ['n1', 'n2', 'n3'].forEach((node, index) => {
            const point = this.system[node];
            const angle = `${angles[node].toFixed(1)}°`;
            ctx.fillStyle = 'white';
            ctx.font = '12px Arial';
            ctx.save();
            ctx.scale(1, -1);
            let xOffset = 20, yOffset = 20;
            if (index === 1) xOffset = -40;
            if (index === 2) yOffset = -20;
            ctx.fillText(angle, point.x + xOffset, -point.y + yOffset);
            ctx.restore();
        });
    }

    drawEdgeLengths(ctx) {
        const lengths = this.calculateLengths();
        const midpoints = [
            { x: (this.system.n2.x + this.system.n3.x) / 2, y: (this.system.n2.y + this.system.n3.y) / 2 },
            { x: (this.system.n1.x + this.system.n3.x) / 2, y: (this.system.n1.y + this.system.n3.y) / 2 },
            { x: (this.system.n1.x + this.system.n2.x) / 2, y: (this.system.n1.y + this.system.n2.y) / 2 }
        ];
        ctx.fillStyle = 'white';
        ctx.font = '12px Arial';
        ctx.save();
        ctx.scale(1, -1);
        ctx.fillText(lengths.l1.toFixed(0), midpoints[0].x, -midpoints[0].y - 10);
        ctx.fillText(lengths.l2.toFixed(0), midpoints[1].x + 10, -midpoints[1].y + 20);
        ctx.fillText(lengths.l3.toFixed(0), midpoints[2].x - 30, -midpoints[2].y + 20);
        ctx.restore();
    }

    initializeEventListeners() {
        const presetButtons = ['equilateral', 'isosceles', 'scalene', 'right', 'acute', 'obtuse'];
        presetButtons.forEach(preset => {
            const button = document.querySelector(`#${preset}`);
            if (button) {
                button.addEventListener('click', () => this.initializeSystem(preset));
            }
        });

        ['Midpoints', 'Incircle', 'Incenter', 'Medians', 'Areas'].forEach(feature => {
            const button = document.querySelector(`#toggle${feature}`);
            if (button) {
                button.addEventListener('click', () => {
                    this[`show${feature}`] = !this[`show${feature}`];
                    this.drawSystem();
                });
            }
        });

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
        return distance <= 6;
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
