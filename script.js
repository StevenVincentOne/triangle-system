class TriangleSystem {
    // ... (previous code remains unchanged)

    calculateTangentPoints() {
        const radius = this.calculateIncircleRadius();
        const tangentPoints = [];
        ['n1', 'n2', 'n3'].forEach((node, index) => {
            const nextNode = ['n2', 'n3', 'n1'][index];
            const dx = this.system[nextNode].x - this.system[node].x;
            const dy = this.system[nextNode].y - this.system[node].y;
            const edgeLength = Math.sqrt(dx * dx + dy * dy);
            const distanceFromNode = (edgeLength * radius) / (edgeLength - radius);
            tangentPoints.push({
                x: this.system[node].x + (dx * distanceFromNode) / edgeLength,
                y: this.system[node].y + (dy * distanceFromNode) / edgeLength
            });
        });
        return tangentPoints;
    }

    drawSystem() {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        ctx.save();
        ctx.translate(this.canvas.width / 2, this.canvas.height / 2);
        ctx.scale(1, -1);
        this.drawTriangle(ctx);
        this.drawNodes(ctx);
        if (this.system.incenter) {
            const radius = this.calculateIncircleRadius();
            ctx.strokeStyle = 'rgba(0, 255, 255, 0.5)';
            ctx.beginPath();
            ctx.arc(this.system.incenter.x, this.system.incenter.y, radius, 0, 2 * Math.PI);
            ctx.stroke();
            // Draw incenter
            ctx.fillStyle = 'rgba(0, 255, 255, 0.5)';
            ctx.beginPath();
            ctx.arc(this.system.incenter.x, this.system.incenter.y, 6, 0, 2 * Math.PI);
            ctx.fill();
            // Draw tangent points
            const tangentPoints = this.calculateTangentPoints();
            tangentPoints.forEach(point => {
                ctx.fillStyle = 'rgba(0, 255, 255, 0.5)';
                ctx.beginPath();
                ctx.arc(point.x, point.y, 4, 0, 2 * Math.PI);
                ctx.fill();
            });
        }
        if (this.showConnections) this.drawConnections(ctx);
        if (this.showAreas) this.drawAreas(ctx);
        if (this.showMidpoints) this.drawMidpoints(ctx);
        if (this.showMedians) this.drawMedians(ctx);
        this.drawAngles(ctx);
        this.drawEdgeLengths(ctx);
        ctx.restore();
    }

    // ... (rest of the code remains unchanged)
}

// ... (rest of the file remains unchanged)
