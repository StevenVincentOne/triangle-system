class TriangleSystem {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.system = {};
        this.showConnections = true;
        this.showAreas = true;
        this.showMidpoints = true;
        this.showIncircle = true;
        this.showIncenter = true;
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
                    n1: { x: -side / 2, y: -height / 3 },
                    n2: { x: side / 2, y: -height / 3 },
                    n3: { x: 0, y: (2 * height) / 3 },
                };
                break;
            case 'isosceles':
                this.system = {
                    n1: { x: -side / 2, y: -height / 2 },
                    n2: { x: side / 2, y: -height / 2 },
                    n3: { x: 0, y: height },
                };
                break;
            case 'scalene':
                this.system = {
                    n1: { x: -100, y: 150 },
                    n2: { x: 50, y: -50 },
                    n3: { x: 150, y: 100 },
                };
                break;
            case 'right':
                this.system = {
                    n1: { x: 0, y: 0 },
                    n2: { x: 0, y: 200 },
                    n3: { x: 300, y: 0 },
                };
                break;
            default:
                this.system = {
                    n1: { x: -side / 2, y: -height / 3 },
                    n2: { x: side / 2, y: -height / 3 },
                    n3: { x: 0, y: (2 * height) / 3 },
                };
        }

        this.updateDerivedPoints();
        this.updateDashboard();
        this.drawSystem();
    }

    updateDerivedPoints() {
        const N1 = this.system.n1;
        const N2 = this.system.n2;
        const N3 = this.system.n3;

        this.system.intelligence = {
            x: (N1.x + N2.x + N3.x) / 3,
            y: (N1.y + N2.y + N3.y) / 3,
        };

        this.system.midpoints = {
            m1: { x: (N2.x + N3.x) / 2, y: (N2.y + N3.y) / 2 },
            m2: { x: (N1.x + N3.x) / 2, y: (N1.y + N3.y) / 2 },
            m3: { x: (N1.x + N2.x) / 2, y: (N1.y + N2.y) / 2 },
        };
    }

    updateDashboard() {
        document.getElementById('system-perimeter').value = this.calculatePerimeter().toFixed(2);
        document.getElementById('system-area').value = this.calculateArea().toFixed(2);

        ['n1', 'n2', 'n3'].forEach(node => {
            document.getElementById(`node-${node}-x`).value = this.system[node].x.toFixed(2);
            document.getElementById(`node-${node}-y`).value = this.system[node].y.toFixed(2);
        });

        const lengths = this.calculateLengths();
        document.getElementById('edge-nc1').value = lengths.l3.toFixed(2);
        document.getElementById('edge-nc2').value = lengths.l2.toFixed(2);
        document.getElementById('edge-nc3').value = lengths.l1.toFixed(2);

        document.getElementById('centroid-x').value = this.system.intelligence.x.toFixed(2);
        document.getElementById('centroid-y').value = this.system.intelligence.y.toFixed(2);
    }

    drawSystem() {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        ctx.save();
        ctx.translate(this.canvas.width / 2, this.canvas.height / 2);
        ctx.scale(1, -1);

        ctx.beginPath();
        ctx.moveTo(this.system.n1.x, this.system.n1.y);
        ctx.lineTo(this.system.n2.x, this.system.n2.y);
        ctx.lineTo(this.system.n3.x, this.system.n3.y);
        ctx.closePath();
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        ctx.stroke();

        this.drawNode(ctx, this.system.n1, 'red', 'N1', this.lockedNodes.n1);
        this.drawNode(ctx, this.system.n2, 'blue', 'N2', this.lockedNodes.n2);
        this.drawNode(ctx, this.system.n3, 'green', 'N3', this.lockedNodes.n3);

        this.drawNode(ctx, this.system.intelligence, 'white', 'I', this.centroidLocked);

        ctx.restore();
    }

    drawNode(ctx, point, color, label, locked) {
        ctx.fillStyle = color;
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

    gatherAllData() {
        const data = {
            system: {
                perimeter: document.getElementById('system-perimeter').value,
                area: document.getElementById('system-area').value
            },
            nodes: {
                n1: {
                    x: document.getElementById('node-n1-x').value,
                    y: document.getElementById('node-n1-y').value,
                    angle: document.getElementById('node-n1-angle').value
                },
                n2: {
                    x: document.getElementById('node-n2-x').value,
                    y: document.getElementById('node-n2-y').value,
                    angle: document.getElementById('node-n2-angle').value
                },
                n3: {
                    x: document.getElementById('node-n3-x').value,
                    y: document.getElementById('node-n3-y').value,
                    angle: document.getElementById('node-n3-angle').value
                }
            },
            channels: {
                nc1: document.getElementById('edge-nc1').value,
                nc2: document.getElementById('edge-nc2').value,
                nc3: document.getElementById('edge-nc3').value
            },
            centers: {
                centroid: {
                    x: document.getElementById('centroid-x').value,
                    y: document.getElementById('centroid-y').value
                }
            },
            info: {
                dCentroidIncircle: document.getElementById('d-centroid-incircle').textContent,
                dMidTangent: {
                    nc1: document.getElementById('d-mid-nc1').textContent,
                    nc2: document.getElementById('d-mid-nc2').textContent,
                    nc3: document.getElementById('d-mid-nc3').textContent
                },
                rMidTangent: {
                    nc1: document.getElementById('r-mid-nc1').textContent,
                    nc2: document.getElementById('r-mid-nc2').textContent,
                    nc3: document.getElementById('r-mid-nc3').textContent
                }
            }
        };
        return data;
    }

    formatDataAsCSV(data) {
        const rows = [
            ['Category', 'Subcategory', 'Property', 'Value'],
            ['System', '', 'Perimeter', data.system.perimeter],
            ['System', '', 'Area', data.system.area],
            ['Nodes', 'N1', 'X', data.nodes.n1.x],
            ['Nodes', 'N1', 'Y', data.nodes.n1.y],
            ['Nodes', 'N1', 'Angle', data.nodes.n1.angle],
            ['Nodes', 'N2', 'X', data.nodes.n2.x],
            ['Nodes', 'N2', 'Y', data.nodes.n2.y],
            ['Nodes', 'N2', 'Angle', data.nodes.n2.angle],
            ['Nodes', 'N3', 'X', data.nodes.n3.x],
            ['Nodes', 'N3', 'Y', data.nodes.n3.y],
            ['Nodes', 'N3', 'Angle', data.nodes.n3.angle],
            ['Channels', '', 'NC1', data.channels.nc1],
            ['Channels', '', 'NC2', data.channels.nc2],
            ['Channels', '', 'NC3', data.channels.nc3],
            ['Centers', 'Centroid', 'X', data.centers.centroid.x],
            ['Centers', 'Centroid', 'Y', data.centers.centroid.y],
            ['Info', '', 'd Centroid to Incircle', data.info.dCentroidIncircle],
            ['Info', 'd Mid to Tangent', 'NC1', data.info.dMidTangent.nc1],
            ['Info', 'd Mid to Tangent', 'NC2', data.info.dMidTangent.nc2],
            ['Info', 'd Mid to Tangent', 'NC3', data.info.dMidTangent.nc3],
            ['Info', 'r Mid to Tangent', 'NC1', data.info.rMidTangent.nc1],
            ['Info', 'r Mid to Tangent', 'NC2', data.info.rMidTangent.nc2],
            ['Info', 'r Mid to Tangent', 'NC3', data.info.rMidTangent.nc3]
        ];

        return rows.map(row => row.join(',')).join('\n');
    }

    exportDataToCSV() {
        const data = this.gatherAllData();
        const csvContent = this.formatDataAsCSV(data);
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            link.setAttribute("download", "triangle_system_data.csv");
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    }

    initializeEventListeners() {
        const presetButtons = ['equilateral', 'isosceles', 'scalene', 'right'];
        presetButtons.forEach(preset => {
            const button = document.getElementById(preset);
            if (button) {
                button.addEventListener('click', () => this.initializeSystem(preset));
            }
        });

        const exportButton = document.getElementById('exportData');
        if (exportButton) {
            exportButton.addEventListener('click', () => this.exportDataToCSV());
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('canvas');
    if (canvas) {
        const triangleSystem = new TriangleSystem(canvas);
        console.log("Initializing system...");
    } else {
        console.error("Canvas element not found");
    }
});