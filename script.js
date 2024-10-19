class TriangleSystem {
    // ... existing code ...

    drawAxes(ctx) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 1;
        
        // Draw x-axis
        ctx.beginPath();
        ctx.moveTo(-this.canvas.width / 2, 0);
        ctx.lineTo(this.canvas.width / 2, 0);
        ctx.stroke();
        
        // Draw y-axis
        ctx.beginPath();
        ctx.moveTo(0, -this.canvas.height / 2);
        ctx.lineTo(0, this.canvas.height / 2);
        ctx.stroke();
        
        // Add labels
        ctx.fillStyle = 'white';
        ctx.font = '12px Arial';
        ctx.fillText('X', this.canvas.width / 2 - 20, -10);
        ctx.fillText('Y', 10, -this.canvas.height / 2 + 20);
    }

    drawSystem() {
        const draw = () => {
            const ctx = this.ctx;
            ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

            ctx.save();
            ctx.translate(this.canvas.width / 2, this.canvas.height / 2);
            ctx.scale(1, -1);

            this.drawAxes(ctx);

            // ... rest of the existing drawing code ...

            ctx.restore();

            if (this.isDragging) {
                requestAnimationFrame(draw);
            }
        };

        draw();
    }

    // ... rest of the existing code ...
}

// ... rest of the file content ...
