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
        const centroid = {
            x: (this.system.n1.x + this.system.n2.x + this.system.n3.x) / 3,
            y: (this.system.n1.y + this.system.n2.y + this.system.n3.y) / 3
        };
        
        const dx = -centroid.x;
        const dy = -centroid.y;
        
        this.system.n1.x += dx;
        this.system.n1.y += dy;
        this.system.n2.x += dx;
        this.system.n2.y += dy;
        this.system.n3.x += dx;
        this.system.n3.y += dy;
        
        this.system.intelligence = { x: 0, y: 0 };
    }

    updateDerivedPoints() {
        const N1 = this.system.n1;
        const N2 = this.system.n2;
        const N3 = this.system.n3;

        this.system.midpoints = {
            m1: { x: (N2.x + N3.x) / 2, y: (N2.y + N3.y) / 2 },
            m2: { x: (N1.x + N3.x) / 2, y: (N1.y + N3.y) / 2 },
            m3: { x: (N1.x + N2.x) / 2, y: (N1.y + N2.y) / 2 },
        };

        const angles = this.calculateAngles();
        const a = angles.n1 * Math.PI / 180;
        const b = angles.n2 * Math.PI / 180;
        const c = angles.n3 * Math.PI / 180;
        
        const incenter = {
            x: (N1.x * Math.sin(a) + N2.x * Math.sin(b) + N3.x * Math.sin(c)) / (Math.sin(a) + Math.sin(b) + Math.sin(c)),
            y: (N1.y * Math.sin(a) + N2.y * Math.sin(b) + N3.y * Math.sin(c)) / (Math.sin(a) + Math.sin(b) + Math.sin(c))
        };

        const semiperimeter = this.calculatePerimeter() / 2;
        const area = this.calculateArea();
        const incircleRadius = area / semiperimeter;

        this.system.incenter = incenter;
        this.system.incircleRadius = incircleRadius;

        this.system.tangencyPoints = this.calculateTangencyPoints();

        this.adjustTriangleToOrigin();
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
                        labelElement.textContent = label;
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
        ['1', '2', '3'].forEach((i) => {
            setElementValue(`#subsystem-${i}-perimeter`, this.calculatePerimeter() / 2, 'P:');
            setElementValue(`#subsystem-${i}-angle`, `${(angles[`n${i}`] / 2).toFixed(2)}°`, '∠:');
        });

        const lengths = this.calculateLengths();
        setElementValue('#edge-nc1', lengths.l1, 'NC1:');
        setElementValue('#edge-nc2', lengths.l2, 'NC2:');
        setElementValue('#edge-nc3', lengths.l3, 'NC3:');

        const medians = this.calculateMedians();
        setElementValue('#median-n1', medians.n1, 'N1:');
        setElementValue('#median-n2', medians.n2, 'N2:');
        setElementValue('#median-n3', medians.n3, 'N3:');

        ['n1', 'n2', 'n3'].forEach(node => {
            setElementValue(`#node-${node}-coords`, `(${this.formatValue(this.system[node].x)}, ${this.formatValue(this.system[node].y)})`, `${node.toUpperCase()} (x, y):`);
            setElementValue(`#node-${node}-angle`, `${angles[node].toFixed(2)}°`, `${node.toUpperCase()} ∠:`);
        });

        setElementValue('#centroid-coords', `(${this.formatValue(this.system.intelligence.x)}, ${this.formatValue(this.system.intelligence.y)})`, 'I (x, y):');
        setElementValue('#incenter-coords', `(${this.formatValue(this.system.incenter.x)}, ${this.formatValue(this.system.incenter.y)})`, 'IC (x, y):');

        const iToIcDistance = this.calculateDistance(this.system.intelligence, this.system.incenter);
        setElementValue('#i-to-ic-distance', iToIcDistance, 'd (I, IC):');
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

    drawNode(ctx, point, color, label) {
        ctx.fillStyle = label === 'Incenter' ? 'lightblue' : color;
        ctx.beginPath();
        ctx.arc(point.x, point.y, 8, 0, 2 * Math.PI);
        ctx.fill();

        ctx.fillStyle = 'white';
        ctx.font = '14px Arial';
        ctx.save();
        ctx.scale(1, -1);
        if (label === 'N2') {
            ctx.fillText(label, point.x - 30, -point.y - 5);
        } else {
            ctx.fillText(label === 'Incenter' ? 'IC' : label, point.x + 10, -point.y - 5);
        }
        ctx.restore();
    }

    drawAxes(ctx) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 1;
        
        ctx.beginPath();
        ctx.moveTo(-this.canvas.width / 2, 0);
        ctx.lineTo(this.canvas.width / 2, 0);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(0, -this.canvas.height / 2);
        ctx.lineTo(0, this.canvas.height / 2);
        ctx.stroke();
        
        ctx.fillStyle = 'white';
        ctx.font = '12px Arial';
        ctx.fillText('X', this.canvas.width / 2 - 20, -10);
        ctx.fillText('Y', 10, -this.canvas.height / 2 + 20);
    }

    drawAreas(ctx) {
        const areas = [
            { points: [this.system.n1, this.system.n2, this.system.intelligence], color: 'rgba(255, 0, 0, 0.2)' },
            { points: [this.system.n2, this.system.n3, this.system.intelligence], color: 'rgba(0, 255, 0, 0.2)' },
            { points: [this.system.n3, this.system.n1, this.system.intelligence], color: 'rgba(0, 0, 255, 0.2)' }
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

    drawConnections(ctx) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(this.system.n1.x, this.system.n1.y);
        ctx.lineTo(this.system.intelligence.x, this.system.intelligence.y);
        ctx.moveTo(this.system.n2.x, this.system.n2.y);
        ctx.lineTo(this.system.intelligence.x, this.system.intelligence.y);
        ctx.moveTo(this.system.n3.x, this.system.n3.y);
        ctx.lineTo(this.system.intelligence.x, this.system.intelligence.y);
        ctx.stroke();
        ctx.setLineDash([]);
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
        ctx.strokeStyle = 'cyan';
        ctx.beginPath();
        ctx.arc(this.system.incenter.x, this.system.incenter.y, this.system.incircleRadius, 0, 2 * Math.PI);
        ctx.stroke();
    }

    drawTangents(ctx) {
        ctx.fillStyle = 'lightblue';
        this.system.tangencyPoints.forEach(point => {
            ctx.beginPath();
            ctx.arc(point.x, point.y, 4, 0, 2 * Math.PI);
            ctx.fill();
        });
    }

    drawMedians(ctx) {
        ctx.strokeStyle = 'rgba(255, 255, 0, 0.5)';
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(this.system.n1.x, this.system.n1.y);
        ctx.lineTo(this.system.midpoints.m1.x, this.system.midpoints.m1.y);
        ctx.moveTo(this.system.n2.x, this.system.n2.y);
        ctx.lineTo(this.system.midpoints.m2.x, this.system.midpoints.m2.y);
        ctx.moveTo(this.system.n3.x, this.system.n3.y);
        ctx.lineTo(this.system.midpoints.m3.x, this.system.midpoints.m3.y);
        ctx.stroke();
        ctx.setLineDash([]);
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
            let xOffset = 20, yOffset = -20;
            if (node === 'n2') xOffset = -40;
            if (node === 'n3') xOffset = 30;
            ctx.fillText(angle, point.x + xOffset, -point.y + yOffset);
            ctx.restore();
        });
    }

    drawEdgeLengths(ctx) {
        const lengths = this.calculateLengths();
        const midpoints = this.system.midpoints;
        ctx.fillStyle = 'white';
        ctx.font = '12px Arial';
        ctx.save();
        ctx.scale(1, -1);
        ctx.fillText(lengths.l1.toFixed(0), midpoints.m1.x, -midpoints.m1.y - 10);
        ctx.fillText(lengths.l2.toFixed(0), midpoints.m2.x + 10, -midpoints.m2.y + 20);
        ctx.fillText(lengths.l3.toFixed(0), midpoints.m3.x - 30, -midpoints.m3.y + 20);
        ctx.restore();
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

    calculateDistance(p1, p2) {
        return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
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

    calculateTangencyPoints() {
        const { n1, n2, n3 } = this.system;
        const { incenter, incircleRadius } = this.system;
        
        const calculateTangencyPoint = (p1, p2) => {
            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const unitX = dx / dist;
            const unitY = dy / dist;
            
            return {
                x: incenter.x + incircleRadius * unitY,
                y: incenter.y - incircleRadius * unitX
            };
        };

        return [
            calculateTangencyPoint(n2, n3),
            calculateTangencyPoint(n3, n1),
            calculateTangencyPoint(n1, n2)
        ];
    }

    calculateMedians() {
        const midpoints = this.system.midpoints;
        return {
            n1: this.calculateDistance(this.system.n1, midpoints.m1),
            n2: this.calculateDistance(this.system.n2, midpoints.m2),
            n3: this.calculateDistance(this.system.n3, midpoints.m3)
        };
    }

    exportData() {
        const safeGetValue = (selector) => {
            const element = document.querySelector(selector);
            return element ? element.value || element.textContent : 'N/A';
        };

        const data = {
            system: {
                perimeter: safeGetValue('#system-perimeter'),
                area: safeGetValue('#system-area')
            },
            nodes: {
                n1: {
                    coords: safeGetValue('#node-n1-coords'),
                    angle: safeGetValue('#node-n1-angle')
                },
                n2: {
                    coords: safeGetValue('#node-n2-coords'),
                    angle: safeGetValue('#node-n2-angle')
                },
                n3: {
                    coords: safeGetValue('#node-n3-coords'),
                    angle: safeGetValue('#node-n3-angle')
                }
            },
            channels: {
                nc1: safeGetValue('#edge-nc1'),
                nc2: safeGetValue('#edge-nc2'),
                nc3: safeGetValue('#edge-nc3')
            },
            centers: {
                centroid: safeGetValue('#centroid-coords'),
                incenter: safeGetValue('#incenter-coords')
            },
            subsystems: {
                subsystem1: {
                    area: safeGetValue('#subsystem-1-area'),
                    perimeter: safeGetValue('#subsystem-1-perimeter'),
                    angle: safeGetValue('#subsystem-1-angle')
                },
                subsystem2: {
                    area: safeGetValue('#subsystem-2-area'),
                    perimeter: safeGetValue('#subsystem-2-perimeter'),
                    angle: safeGetValue('#subsystem-2-angle')
                },
                subsystem3: {
                    area: safeGetValue('#subsystem-3-area'),
                    perimeter: safeGetValue('#subsystem-3-perimeter'),
                    angle: safeGetValue('#subsystem-3-angle')
                }
            },
            info: {
                dCentroidIncircle: safeGetValue('#i-to-ic-distance'),
                medianN1: safeGetValue('#median-n1'),
                medianN2: safeGetValue('#median-n2'),
                medianN3: safeGetValue('#median-n3')
            }
        };

        let csv = 'Category,Property,Value\n';
        for (const [category, properties] of Object.entries(data)) {
            for (const [property, value] of Object.entries(properties)) {
                if (typeof value === 'object') {
                    for (const [subProperty, subValue] of Object.entries(value)) {
                        csv += `${category},${property}_${subProperty},${subValue}\n`;
                    }
                } else {
                    csv += `${category},${property},${value}\n`;
                }
            }
        }

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', 'triangle_system_data.csv');
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    initializeEventListeners() {
        const presetButtons = ['equilateral', 'isosceles', 'scalene', 'right', 'acute', 'obtuse'];
        presetButtons.forEach(preset => {
            const button = document.querySelector(`#${preset}`);
            if (button) {
                button.addEventListener('click', () => this.initializeSystem(preset));
            }
        });

        const exportButton = document.querySelector('#export-data');
        if (exportButton) {
            exportButton.addEventListener('click', () => this.exportData());
        }

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
        return distance <= 8;
    }
}

function checkInputFields() {
    const inputFields = document.querySelectorAll('input[type="text"]');
    inputFields.forEach(field => {
        if (field.size !== 8 || !field.readOnly) {
            console.warn(`Correcting input field ${field.id}. Old Size: ${field.size}, ReadOnly: ${field.readOnly}`);
            field.size = 8;
            field.readOnly = true;
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.querySelector('#canvas');
    if (canvas) {
        window.triangleSystem = new TriangleSystem(canvas);
        checkInputFields();
        
        window.triangleSystem.initializeSystem('equilateral');
    } else {
        console.error("Canvas element not found");
    }
});