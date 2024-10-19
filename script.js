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
        
        const applyButton = document.querySelector('#apply-button');
        if (applyButton) {
            applyButton.addEventListener('click', () => this.applyChanges());
        }
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

            const setSpanText = (selector, value) => {
                const element = document.querySelector(selector);
                if (element) {
                    element.textContent = value;
                    console.log(`Set ${selector} to ${value}`);
                } else {
                    console.warn(`Element not found: ${selector}`);
                }
            };

            setElementValue('#system-perimeter', this.calculatePerimeter().toFixed(2));
            setElementValue('#system-area', this.calculateArea().toFixed(2));

            ['n1', 'n2', 'n3'].forEach(node => {
                setElementValue(`#node-${node}-x`, this.system[node].x.toFixed(2));
                setElementValue(`#node-${node}-y`, this.system[node].y.toFixed(2));
            });

            const lengths = this.calculateLengths();
            setElementValue('#edge-nc1', lengths.l3.toFixed(2));
            setElementValue('#edge-nc2', lengths.l2.toFixed(2));
            setElementValue('#edge-nc3', lengths.l1.toFixed(2));

            setElementValue('#centroid-x', this.system.intelligence.x.toFixed(2));
            setElementValue('#centroid-y', this.system.intelligence.y.toFixed(2));
            setElementValue('#incenter-x', this.system.incenter.x.toFixed(2));
            setElementValue('#incenter-y', this.system.incenter.y.toFixed(2));

            const angles = this.calculateAngles();
            setElementValue('#node-n1-angle', angles.n1.toFixed(2));
            setElementValue('#node-n2-angle', angles.n2.toFixed(2));
            setElementValue('#node-n3-angle', angles.n3.toFixed(2));

            ['1', '2', '3'].forEach((i) => {
                const nodeKey = `n${i}`;
                setElementValue(`#subsystem-${i}-area`, (this.calculateArea() / 3).toFixed(2));
                setElementValue(`#subsystem-${i}-perimeter`, (this.calculatePerimeter() / 2).toFixed(2));
                setElementValue(`#subsystem-${i}-centroid-angle`, (angles[nodeKey] / 2).toFixed(2));
            });

            setSpanText('#d-centroid-incircle', this.calculateDistance(this.system.intelligence, this.system.incenter).toFixed(2));

            const midpoints = this.system.midpoints;
            const tangencyPoints = this.system.tangencyPoints;
            
            setSpanText('#d-mid-nc1', this.calculateDistance(midpoints.m1, tangencyPoints[0]).toFixed(2));
            setSpanText('#d-mid-nc2', this.calculateDistance(midpoints.m2, tangencyPoints[1]).toFixed(2));
            setSpanText('#d-mid-nc3', this.calculateDistance(midpoints.m3, tangencyPoints[2]).toFixed(2));

            setSpanText('#r-mid-nc1', this.calculateDistance(this.system.incenter, midpoints.m1).toFixed(2));
            setSpanText('#r-mid-nc2', this.calculateDistance(this.system.incenter, midpoints.m2).toFixed(2));
            setSpanText('#r-mid-nc3', this.calculateDistance(this.system.incenter, midpoints.m3).toFixed(2));

            setElementValue('#n1-angle', angles.n1.toFixed(2));
            setElementValue('#n2-angle', angles.n2.toFixed(2));
            setElementValue('#n3-angle', angles.n3.toFixed(2));
            setElementValue('#nc1-length', lengths.l3.toFixed(2));
            setElementValue('#nc2-length', lengths.l2.toFixed(2));
            setElementValue('#nc3-length', lengths.l1.toFixed(2));

            console.log('Dashboard updated successfully');
        } catch (error) {
            console.error('Error updating dashboard:', error);
        }
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

    calculateLengths() {
        const { n1, n2, n3 } = this.system;
        return {
            l1: this.calculateDistance(n2, n3),
            l2: this.calculateDistance(n1, n3),
            l3: this.calculateDistance(n1, n2)
        };
    }

    calculateAngles() {
        const { n1, n2, n3 } = this.system;
        const lengths = this.calculateLengths();
        const { l1, l2, l3 } = lengths;

        const calculateAngle = (a, b, c) => {
            return Math.acos((a*a + b*b - c*c) / (2*a*b)) * 180 / Math.PI;
        };

        return {
            n1: calculateAngle(l2, l3, l1),
            n2: calculateAngle(l1, l3, l2),
            n3: calculateAngle(l1, l2, l3)
        };
    }

    calculatePerimeter() {
        const lengths = this.calculateLengths();
        return lengths.l1 + lengths.l2 + lengths.l3;
    }

    calculateArea() {
        const { l1, l2, l3 } = this.calculateLengths();
        const s = (l1 + l2 + l3) / 2;
        return Math.sqrt(s * (s - l1) * (s - l2) * (s - l3));
    }

    calculateDistance(point1, point2) {
        return Math.sqrt(Math.pow(point2.x - point1.x, 2) + Math.pow(point2.y - point1.y, 2));
    }

    validateTriangleParameters(angles, lengths) {
        const angleSum = angles.reduce((sum, angle) => sum + angle, 0);
        if (Math.abs(angleSum - 180) > 0.01) {
            return { valid: false, message: "The sum of angles must be 180 degrees." };
        }

        const [a, b, c] = lengths;
        if (a + b <= c || b + c <= a || c + a <= b) {
            return { valid: false, message: "The lengths violate the triangle inequality theorem." };
        }

        return { valid: true };
    }

    applyChanges() {
        const getInputValue = (id) => parseFloat(document.querySelector(id).value);

        const angles = [
            getInputValue('#n1-angle'),
            getInputValue('#n2-angle'),
            getInputValue('#n3-angle')
        ];

        const lengths = [
            getInputValue('#nc1-length'),
            getInputValue('#nc2-length'),
            getInputValue('#nc3-length')
        ];

        const validation = this.validateTriangleParameters(angles, lengths);

        if (validation.valid) {
            this.reconstructTriangle(angles, lengths);
            this.adjustTriangleToOrigin();
            this.updateDerivedPoints();
            this.updateDashboard();
            this.drawSystem();
        } else {
            alert(validation.message);
        }
    }

    reconstructTriangle(angles, lengths) {
        const [a, b, c] = angles.map(angle => angle * Math.PI / 180);
        const [AB, BC, CA] = lengths;

        this.system.n1 = { x: 0, y: 0 };
        this.system.n2 = { x: AB, y: 0 };

        const x3 = BC * Math.cos(a);
        const y3 = BC * Math.sin(a);
        this.system.n3 = { x: x3, y: y3 };
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