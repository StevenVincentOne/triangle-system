class TriangleSystem {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.system = {
            n1: { x: -100, y: -100 },
            n2: { x: 100, y: -100 },
            n3: { x: 0, y: 100 },
            intelligence: { x: 0, y: 0 }
        };
        this.initializeSystem();
    }

    initializeSystem() {
        // Calculate intelligence point (centroid)
        this.system.intelligence.x = (this.system.n1.x + this.system.n2.x + this.system.n3.x) / 3;
        this.system.intelligence.y = (this.system.n1.y + this.system.n2.y + this.system.n3.y) / 3;
        this.drawSystem();
    }

    drawSystem() {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Set the coordinate system to the center of the canvas
        ctx.save();
        ctx.translate(this.canvas.width / 2, this.canvas.height / 2);
        ctx.scale(1, -1); // Flip the y-axis

        // Draw triangle
        ctx.beginPath();
        ctx.moveTo(this.system.n1.x, this.system.n1.y);
        ctx.lineTo(this.system.n2.x, this.system.n2.y);
        ctx.lineTo(this.system.n3.x, this.system.n3.y);
        ctx.closePath();
        ctx.strokeStyle = 'white';
        ctx.stroke();

        // Draw nodes
        this.drawNode(ctx, this.system.n1, 'red', 'N1');
        this.drawNode(ctx, this.system.n2, 'green', 'N2');
        this.drawNode(ctx, this.system.n3, 'blue', 'N3');

        // Draw intelligence point
        this.drawNode(ctx, this.system.intelligence, 'yellow', 'I');

        // Draw connections
        this.drawConnections(ctx);

        // Draw angles and edge lengths
        this.drawAngles(ctx);
        this.drawEdgeLengths(ctx);

        ctx.restore();

        // Update dashboard
        this.updateDashboard();

        // Request next animation frame
        requestAnimationFrame(() => this.drawSystem());
    }

    drawNode(ctx, node, color, label) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, 5, 0, 2 * Math.PI);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, node.x, node.y + 15);
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

    drawAngles(ctx) {
        const angles = this.calculateAngles();
        Object.entries(angles).forEach(([node, angle]) => {
            const nodeCoords = this.system[node];
            ctx.fillStyle = 'white';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(`${angle.toFixed(1)}°`, nodeCoords.x, nodeCoords.y - 15);
        });
    }

    drawEdgeLengths(ctx) {
        const lengths = this.calculateLengths();
        Object.entries(lengths).forEach(([edge, length]) => {
            const [node1, node2] = edge.split('-');
            const midX = (this.system[node1].x + this.system[node2].x) / 2;
            const midY = (this.system[node1].y + this.system[node2].y) / 2;
            ctx.fillStyle = 'white';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(`${length.toFixed(1)}`, midX, midY);
        });
    }

    calculateAngles() {
        const { n1, n2, n3 } = this.system;
        const angles = {};
        angles.n1 = this.calculateAngle(n2, n1, n3);
        angles.n2 = this.calculateAngle(n1, n2, n3);
        angles.n3 = this.calculateAngle(n1, n3, n2);
        return angles;
    }

    calculateAngle(p1, p2, p3) {
        const a = Math.sqrt(Math.pow(p2.x - p3.x, 2) + Math.pow(p2.y - p3.y, 2));
        const b = Math.sqrt(Math.pow(p1.x - p3.x, 2) + Math.pow(p1.y - p3.y, 2));
        const c = Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
        return Math.acos((a*a + c*c - b*b) / (2*a*c)) * (180 / Math.PI);
    }

    calculateLengths() {
        const { n1, n2, n3 } = this.system;
        return {
            'n1-n2': Math.sqrt(Math.pow(n1.x - n2.x, 2) + Math.pow(n1.y - n2.y, 2)),
            'n2-n3': Math.sqrt(Math.pow(n2.x - n3.x, 2) + Math.pow(n2.y - n3.y, 2)),
            'n3-n1': Math.sqrt(Math.pow(n3.x - n1.x, 2) + Math.pow(n3.y - n1.y, 2))
        };
    }

    updateDashboard() {
        const angles = this.calculateAngles();
        const lengths = this.calculateLengths();
        const perimeter = Object.values(lengths).reduce((sum, length) => sum + length, 0);
        const area = this.calculateArea();

        this.updateDashboardValue('system-perimeter', perimeter.toFixed(2));
        this.updateDashboardValue('system-area', area.toFixed(2));
        this.updateDashboardValue('subsystems-area', (area / 3).toFixed(2));

        ['n1', 'n2', 'n3'].forEach((node, index) => {
            this.updateDashboardValue(`subsystem-${index + 1}-perimeter`, (perimeter / 3).toFixed(2));
            this.updateDashboardValue(`subsystem-${index + 1}-angle`, (angles[node] / 2).toFixed(2));
            this.updateDashboardValue(`edge-nc${index + 1}`, lengths[`n${index + 1}-n${(index + 1) % 3 + 1}`].toFixed(2));
            this.updateDashboardValue(`median-${node}`, this.calculateMedian(node).toFixed(2));
            this.updateDashboardValue(`node-${node}-coords`, `${this.system[node].x.toFixed(2)}, ${this.system[node].y.toFixed(2)}`);
            this.updateDashboardValue(`node-${node}-angle`, angles[node].toFixed(2));
        });

        this.updateDashboardValue('centroid-coords', `${this.system.intelligence.x.toFixed(2)}, ${this.system.intelligence.y.toFixed(2)}`);
        // Add more dashboard updates here as needed
    }

    updateDashboardValue(id, value) {
        const element = document.getElementById(id);
        if (element) {
            element.value = value;
        }
    }

    calculateArea() {
        const { n1, n2, n3 } = this.system;
        return Math.abs((n1.x * (n2.y - n3.y) + n2.x * (n3.y - n1.y) + n3.x * (n1.y - n2.y)) / 2);
    }

    calculateMedian(node) {
        const oppositeNode1 = this.system[`n${(parseInt(node.slice(1)) % 3) + 1}`];
        const oppositeNode2 = this.system[`n${((parseInt(node.slice(1)) + 1) % 3) + 1}`];
        const midpoint = {
            x: (oppositeNode1.x + oppositeNode2.x) / 2,
            y: (oppositeNode1.y + oppositeNode2.y) / 2
        };
        return Math.sqrt(
            Math.pow(this.system[node].x - midpoint.x, 2) +
            Math.pow(this.system[node].y - midpoint.y, 2)
        );
    }
}

// Initialize the TriangleSystem when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('canvas');
    if (canvas) {
        new TriangleSystem(canvas);
    } else {
        console.error('Canvas element not found');
    }
});
