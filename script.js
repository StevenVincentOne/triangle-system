class TriangleSystem {
    // ... existing code ...

    drawAxes() {
        const ctx = this.ctx;
        const width = this.canvas.width;
        const height = this.canvas.height;

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 1;

        // Draw x-axis
        ctx.beginPath();
        ctx.moveTo(0, height / 2);
        ctx.lineTo(width, height / 2);
        ctx.stroke();

        // Draw y-axis
        ctx.beginPath();
        ctx.moveTo(width / 2, 0);
        ctx.lineTo(width / 2, height);
        ctx.stroke();

        // Add labels
        ctx.fillStyle = 'white';
        ctx.font = '12px Arial';
        ctx.fillText('X', width - 15, height / 2 - 5);
        ctx.fillText('Y', width / 2 + 5, 15);
    }

    drawSystem() {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        ctx.save();
        ctx.translate(this.canvas.width / 2, this.canvas.height / 2);
        ctx.scale(1, -1);

        this.drawAxes(); // Call the new drawAxes method

        // ... rest of the existing drawSystem code ...
    }

    // ... rest of the existing code ...

    initializeSystem(preset = 'equilateral') {
        // ... existing code ...

        switch (preset) {
            // ... existing cases ...

            case 'rightIsosceles':
                this.system = {
                    n1: { x: 0, y: 200 },
                    n2: { x: 0, y: 0 },
                    n3: { x: 200, y: 0 },
                };
                break;
            case 'rightScalene':
                this.system = {
                    n1: { x: 0, y: 200 },
                    n2: { x: 0, y: 0 },
                    n3: { x: 300, y: 0 },
                };
                break;
            case 'acuteIsosceles':
                this.system = {
                    n1: { x: 0, y: 200 },
                    n2: { x: -150, y: 0 },
                    n3: { x: 150, y: 0 },
                };
                break;
            case 'acuteScalene':
                this.system = {
                    n1: { x: 0, y: 200 },
                    n2: { x: -100, y: 0 },
                    n3: { x: 180, y: 0 },
                };
                break;
            case 'obtuseIsosceles':
                this.system = {
                    n1: { x: 0, y: 100 },
                    n2: { x: -200, y: 0 },
                    n3: { x: 200, y: 0 },
                };
                break;
            case 'obtuseScalene':
                this.system = {
                    n1: { x: 50, y: 100 },
                    n2: { x: -200, y: 0 },
                    n3: { x: 150, y: 0 },
                };
                break;
        }

        // ... existing code ...
    }

    initializeEventListeners() {
        // ... existing code ...

        const morePresetButtons = ['rightIsosceles', 'rightScalene', 'acuteIsosceles', 'acuteScalene', 'obtuseIsosceles', 'obtuseScalene'];
        morePresetButtons.forEach(preset => {
            const button = document.querySelector(`#${preset}`);
            if (button) {
                button.addEventListener('click', () => this.initializeSystem(preset));
            }
        });

        // ... existing code ...
    }
}

// ... rest of the existing code ...
