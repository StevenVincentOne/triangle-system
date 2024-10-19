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
                this.system = {
                    n1: { x: 0, y: 200 },
                    n2: { x: -120, y: 0 },
                    n3: { x: 120, y: 0 },
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

            console.log('Side lengths:', {
                NC1: lengths.l3.toFixed(2),
                NC2: lengths.l2.toFixed(2),
                NC3: lengths.l1.toFixed(2)
            });

            setElementValue('#centroid-x', this.system.intelligence.x.toFixed(2));
            setElementValue('#centroid-y', this.system.intelligence.y.toFixed(2));
            setElementValue('#incenter-x', this.system.incenter.x.toFixed(2));
            setElementValue('#incenter-y', this.system.incenter.y.toFixed(2));

            const angles = this.calculateAngles();
            console.log('Vertex angles:', {
                N1: angles.n1.toFixed(2),
                N2: angles.n2.toFixed(2),
                N3: angles.n3.toFixed(2)
            });

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

            console.log('Dashboard updated successfully');
        } catch (error) {
            console.error('Error updating dashboard:', error);
        }
    }

    drawSystem() {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        ctx.save();
        ctx.translate(this.canvas.width / 2, this.canvas.height / 2);
        ctx.scale(1, -1);

        if (this.showAreas) {
            this.drawAreas(ctx);
        }

        ctx.beginPath();
        ctx.moveTo(this.system.n1.x, this.system.n1.y);
        ctx.lineTo(this.system.n2.x, this.system.n2.y);
        ctx.lineTo(this.system.n3.x, this.system.n3.y);
        ctx.closePath();
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
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
        this.drawNode(ctx, this.system.n2, 'blue', 'N2', this.lockedNodes.n2);
        this.drawNode(ctx, this.system.n3, 'green', 'N3', this.lockedNodes.n3);

        this.drawNode(ctx, this.system.intelligence, 'white', 'I', this.centroidLocked);

        if (this.showIncenter) {
            this.drawNode(ctx, this.system.incenter, 'yellow', 'Incenter', false);
        }

        ctx.restore();
    }

    drawNode(ctx, point, color, label, locked) {
        ctx.fillStyle = label === 'Incenter' ? 'lightblue' : color;
        ctx.beginPath();
        ctx.arc(point.x, point.y, 8, 0, 2 * Math.PI);
        ctx.fill();

        ctx.fillStyle = 'white';
        ctx.font = '14px Arial';
        ctx.fillText(label, point.x + 10, point.y + 5);

        if (locked) {
            ctx.fillStyle = 'gold';
            ctx.font = '16px Arial';
            ctx.fillText('🔒', point.x - 12, point.y + 5);
        }
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
                    x: safeGetValue('#node-n1-x'),
                    y: safeGetValue('#node-n1-y')
                },
                n2: {
                    x: safeGetValue('#node-n2-x'),
                    y: safeGetValue('#node-n2-y')
                },
                n3: {
                    x: safeGetValue('#node-n3-x'),
                    y: safeGetValue('#node-n3-y')
                }
            },
            channels: {
                nc1: safeGetValue('#edge-nc1'),
                nc2: safeGetValue('#edge-nc2'),
                nc3: safeGetValue('#edge-nc3')
            },
            centers: {
                centroid: {
                    x: safeGetValue('#centroid-x'),
                    y: safeGetValue('#centroid-y')
                },
                incenter: {
                    x: safeGetValue('#incenter-x'),
                    y: safeGetValue('#incenter-y')
                }
            },
            info: {
                dCentroidIncircle: safeGetValue('#d-centroid-incircle'),
                dMidNC1: safeGetValue('#d-mid-nc1'),
                dMidNC2: safeGetValue('#d-mid-nc2'),
                dMidNC3: safeGetValue('#d-mid-nc3'),
                rMidNC1: safeGetValue('#r-mid-nc1'),
                rMidNC2: safeGetValue('#r-mid-nc2'),
                rMidNC3: safeGetValue('#r-mid-nc3')
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

        const applyButton = document.querySelector('#apply-button');
        if (applyButton) {
            applyButton.addEventListener('click', () => {
                this.applyChanges();
            });
        }
    }

    applyChanges() {
        ['n1', 'n2', 'n3'].forEach(node => {
            const xElement = document.querySelector(`#node-${node}-x`);
            const yElement = document.querySelector(`#node-${node}-y`);
            if (xElement && yElement) {
                this.system[node].x = parseFloat(xElement.value);
                this.system[node].y = parseFloat(yElement.value);
            }
        });

        this.adjustTriangleToOrigin();
        this.updateDerivedPoints();
        this.updateDashboard();
        this.drawSystem();
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