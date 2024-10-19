class TriangleSystem {
    constructor() {
        this.canvas = document.getElementById('triangleCanvas');
        if (!this.canvas) {
            console.error('Canvas element not found');
            return;
        }
        this.ctx = this.canvas.getContext('2d');
        this.system = {};
        this.initializeEventListeners();
    }

    initializeSystem(preset = 'equilateral') {
        console.log('Initializing system...');
        const side = 300;
        const height = (Math.sqrt(3) / 2) * side;

        switch (preset) {
            case 'equilateral':
                this.system = {
                    n1: { x: 0, y: height / 2 },
                    n2: { x: -side / 2, y: -height / 2 },
                    n3: { x: side / 2, y: -height / 2 },
                };
                break;
            // Add other cases for different presets here
            default:
                this.system = {
                    n1: { x: 0, y: height / 2 },
                    n2: { x: -side / 2, y: -height / 2 },
                    n3: { x: side / 2, y: -height / 2 },
                };
        }

        this.updateDashboard();
        this.drawSystem();
    }

    drawSystem() {
        console.log('Drawing system...');
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        ctx.save();
        ctx.translate(this.canvas.width / 2, this.canvas.height / 2);
        ctx.scale(1, -1);

        this.drawAxes();

        console.log('Drawing triangle...');
        // Draw triangle
        ctx.beginPath();
        ctx.moveTo(this.system.n1.x, this.system.n1.y);
        ctx.lineTo(this.system.n2.x, this.system.n2.y);
        ctx.lineTo(this.system.n3.x, this.system.n3.y);
        ctx.closePath();
        ctx.strokeStyle = 'white';
        ctx.stroke();

        ctx.restore();
        console.log('System drawn');
    }

    drawAxes() {
        const ctx = this.ctx;
        const width = this.canvas.width;
        const height = this.canvas.height;

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 1;

        // Draw x-axis
        ctx.beginPath();
        ctx.moveTo(-width / 2, 0);
        ctx.lineTo(width / 2, 0);
        ctx.stroke();

        // Draw y-axis
        ctx.beginPath();
        ctx.moveTo(0, -height / 2);
        ctx.lineTo(0, height / 2);
        ctx.stroke();

        // Add labels
        ctx.fillStyle = 'white';
        ctx.font = '12px Arial';
        ctx.fillText('X', width / 2 - 15, -5);
        ctx.fillText('Y', 5, -height / 2 + 15);
    }

    updateDashboard() {
        // Implement dashboard update logic here
        console.log('Updating dashboard...');
    }

    initializeEventListeners() {
        const presetButtons = ['equilateral', 'isosceles', 'scalene', 'right', 'acute', 'obtuse'];
        presetButtons.forEach(preset => {
            const button = document.getElementById(preset);
            if (button) {
                button.addEventListener('click', () => this.initializeSystem(preset));
            }
        });

        const morePresetButtons = ['rightIsosceles', 'rightScalene', 'acuteIsosceles', 'acuteScalene', 'obtuseIsosceles', 'obtuseScalene'];
        morePresetButtons.forEach(preset => {
            const button = document.getElementById(preset);
            if (button) {
                button.addEventListener('click', () => this.initializeSystem(preset));
            }
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const triangleSystem = new TriangleSystem();
    triangleSystem.initializeSystem();
});

window.onerror = function(message, source, lineno, colno, error) {
    console.error('JavaScript error:', message, 'at', source, 'line', lineno);
    return false;
};
