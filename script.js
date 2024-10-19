class TriangleSystem {
    constructor() {
        this.canvas = document.getElementById('triangleCanvas');
        if (!this.canvas) {
            console.error('Canvas element not found');
            return;
        }
        this.ctx = this.canvas.getContext('2d');
        if (!this.ctx) {
            console.error('Unable to get 2D context');
            return;
        }
        this.system = {};
        this.initializeEventListeners();
        this.initializeSystem(); // Call this here to ensure the system is initialized on load
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
            case 'isosceles':
                this.system = {
                    n1: { x: 0, y: height / 2 },
                    n2: { x: -side / 3, y: -height / 2 },
                    n3: { x: side / 3, y: -height / 2 },
                };
                break;
            case 'scalene':
                this.system = {
                    n1: { x: 0, y: height / 2 },
                    n2: { x: -side / 4, y: -height / 2 },
                    n3: { x: side / 2, y: -height / 3 },
                };
                break;
            case 'right':
                this.system = {
                    n1: { x: 0, y: side / 2 },
                    n2: { x: 0, y: -side / 2 },
                    n3: { x: side / 2, y: -side / 2 },
                };
                break;
            case 'acute':
                this.system = {
                    n1: { x: 0, y: height / 2 },
                    n2: { x: -side / 3, y: -height / 3 },
                    n3: { x: side / 3, y: -height / 3 },
                };
                break;
            case 'obtuse':
                this.system = {
                    n1: { x: -side / 4, y: height / 4 },
                    n2: { x: -side / 2, y: -height / 2 },
                    n3: { x: side / 2, y: -height / 4 },
                };
                break;
            case 'rightIsosceles':
                this.system = {
                    n1: { x: 0, y: side / 2 },
                    n2: { x: -side / 2, y: -side / 2 },
                    n3: { x: side / 2, y: -side / 2 },
                };
                break;
            case 'rightScalene':
                this.system = {
                    n1: { x: 0, y: side * 0.6 },
                    n2: { x: 0, y: -side * 0.6 },
                    n3: { x: side * 0.8, y: -side * 0.6 },
                };
                break;
            case 'acuteIsosceles':
                this.system = {
                    n1: { x: 0, y: height * 0.7 },
                    n2: { x: -side * 0.4, y: -height * 0.7 },
                    n3: { x: side * 0.4, y: -height * 0.7 },
                };
                break;
            case 'acuteScalene':
                this.system = {
                    n1: { x: 0, y: height * 0.6 },
                    n2: { x: -side * 0.3, y: -height * 0.6 },
                    n3: { x: side * 0.5, y: -height * 0.4 },
                };
                break;
            case 'obtuseIsosceles':
                this.system = {
                    n1: { x: 0, y: height * 0.3 },
                    n2: { x: -side * 0.7, y: -height * 0.3 },
                    n3: { x: side * 0.7, y: -height * 0.3 },
                };
                break;
            case 'obtuseScalene':
                this.system = {
                    n1: { x: -side * 0.1, y: height * 0.4 },
                    n2: { x: -side * 0.6, y: -height * 0.4 },
                    n3: { x: side * 0.7, y: -height * 0.2 },
                };
                break;
            default:
                console.error('Unknown preset:', preset);
                return;
        }

        console.log('System initialized:', this.system);
        this.updateDashboard();
        this.drawSystem();
    }

    drawSystem() {
        console.log('Drawing system...');
        if (!this.ctx) {
            console.error('Context not available for drawing');
            return;
        }
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
        console.log('System drawn', this.system);
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
            } else {
                console.warn(`Button not found for preset: ${preset}`);
            }
        });

        const morePresetButtons = ['rightIsosceles', 'rightScalene', 'acuteIsosceles', 'acuteScalene', 'obtuseIsosceles', 'obtuseScalene'];
        morePresetButtons.forEach(preset => {
            const button = document.getElementById(preset);
            if (button) {
                button.addEventListener('click', () => this.initializeSystem(preset));
            } else {
                console.warn(`Button not found for preset: ${preset}`);
            }
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM content loaded, initializing TriangleSystem');
    const triangleSystem = new TriangleSystem();
});

window.onerror = function(message, source, lineno, colno, error) {
    console.error('JavaScript error:', message, 'at', source, 'line', lineno);
    return false;
};
