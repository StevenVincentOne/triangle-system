class TriangleSystem {
    // ... (previous code remains unchanged)

    initializeSystem(preset = 'equilateral') {
        // ... (existing code for setting up the system)

        this.adjustTriangleToOrigin();
        this.updateDerivedPoints();
        this.updateDashboard();
        this.drawSystem();
    }

    drawSystem() {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        ctx.save();
        ctx.translate(this.canvas.width / 2, this.canvas.height / 2);
        ctx.scale(1, -1);

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

        // Draw centroid
        this.drawNode(ctx, this.system.intelligence, 'white', 'I');

        ctx.restore();
    }

    drawNode(ctx, point, color, label) {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(point.x, point.y, 5, 0, 2 * Math.PI);
        ctx.fill();

        ctx.fillStyle = 'white';
        ctx.font = '12px Arial';
        ctx.save();
        ctx.scale(1, -1);
        ctx.fillText(label, point.x + 10, -point.y - 10);
        ctx.restore();
    }

    updateDashboard() {
        // ... (previous code remains unchanged)

        // Calculate d(M, T) NC1
        const midpointNC1 = {
            x: (this.system.n2.x + this.system.n3.x) / 2,
            y: (this.system.n2.y + this.system.n3.y) / 2
        };
        const tangencyPointNC1 = this.system.tangencyPoints[0];
        const dMTNC1 = this.calculateDistance(midpointNC1, tangencyPointNC1);

        // Update information panel
        setElementValue('#info-d-i-ic', iToIcDistance, 'd(I, IC):');
        setElementValue('#info-d-m-t-nc1', dMTNC1, 'd(M, T) NC1:');
    }

    exportData() {
        // ... (previous code remains unchanged)

        const data = {
            // ... (previous data remains unchanged)
            info: {
                dCentroidIncircle: safeGetValue('#i-to-ic-distance'),
                dMidpointTangencyNC1: safeGetValue('#info-d-m-t-nc1'),
                medianN1: safeGetValue('#median-n1'),
                medianN2: safeGetValue('#median-n2'),
                medianN3: safeGetValue('#median-n3')
            }
        };

        // ... (rest of the function remains unchanged)
    }

    // ... (rest of the class remains unchanged)
}

// ... (rest of the file remains unchanged)