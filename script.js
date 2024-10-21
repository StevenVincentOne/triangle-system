class TriangleSystem {
    constructor(canvas) {
        console.log("TriangleSystem constructor called");
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.system = {};
        this.showConnections = true;
        this.showAreas = false;
        this.showMidpoints = false;
        this.showIncircle = false;
        this.showIncenter = false;
        this.showMedians = false;
        this.isDragging = false;
        this.draggedNode = null;

        this.initializeEventListeners();
        this.initializeSystem('equilateral');
    }

    initializeEventListeners() {
        console.log("Initializing event listeners");
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

        this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('mouseup', (e) => this.handleMouseUp(e));
        this.canvas.addEventListener('mouseleave', (e) => this.handleMouseUp(e));
    }

    initializeSystem(preset = 'equilateral') {
        console.log(`Initializing system with preset: ${preset}`);
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

    drawSystem() {
        console.log("Drawing system");
        const draw = () => {
            // ... (rest of the method remains unchanged)
        };

        draw();
    }

    updateDashboard() {
        console.log("Updating dashboard");
        const setElementValue = (selector, value, label = '') => {
            const element = document.querySelector(selector);
            if (element) {
                const formattedValue = this.formatValue(value);
                element.value = formattedValue;
                if (label) {
                    const labelElement = element.previousElementSibling;
                    if (labelElement) {
                        labelElement.textContent = label.replace(':', '');
                    }
                }
                console.log(`Set ${selector} to ${formattedValue}`);
            } else {
                console.warn(`Element not found: ${selector}`);
            }
        };

        // ... (keep existing dashboard updates)

        ['n1', 'n2', 'n3'].forEach(node => {
            setElementValue(`#node-${node}-coords`, `(${this.formatValue(this.system[node].x)}, ${this.formatValue(this.system[node].y)})`, `${node.toUpperCase()} (x, y):`);
            setElementValue(`#node-${node}-angle`, `${angles[node].toFixed(2)}°`, `${node.toUpperCase()} ∠:`);
        });

        // ... (keep remaining dashboard updates)

        // Calculate and update new ratios
        this.updateInformationPanel();
    }

    updateInformationPanel() {
        console.log("Updating information panel");
        const triangleArea = this.calculateArea();
        const circumcircleArea = this.calculateCircumcircleArea();
        const incircleArea = Math.PI * Math.pow(this.system.incircleRadius, 2);
        
        const lengths = this.calculateLengths();
        const [shortestSide, longestSide] = [Math.min(...Object.values(lengths)), Math.max(...Object.values(lengths))];
        
        const angles = this.calculateAngles();
        const [smallestAngle, largestAngle] = [Math.min(...Object.values(angles)), Math.max(...Object.values(angles))];

        const setRatio = (selector, value) => {
            const element = document.querySelector(selector);
            if (element) {
                element.textContent = this.formatValue(value);
            }
        };

        setRatio('#triangle-to-circumcircle-ratio', triangleArea / circumcircleArea);
        setRatio('#incircle-to-triangle-ratio', incircleArea / triangleArea);
        setRatio('#longest-to-shortest-side-ratio', longestSide / shortestSide);
        setRatio('#largest-to-smallest-angle-ratio', largestAngle / smallestAngle);
    }

    calculateCircumcircleArea() {
        console.log("Calculating circumcircle area");
        const [a, b, c] = Object.values(this.calculateLengths());
        const s = (a + b + c) / 2;
        const area = Math.sqrt(s * (s - a) * (s - b) * (s - c));
        const circumradius = (a * b * c) / (4 * area);
        return Math.PI * Math.pow(circumradius, 2);
    }

    // ... (keep all other existing methods)
}

document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM content loaded");
    const canvas = document.querySelector('#canvas');
    if (canvas) {
        console.log("Canvas element found");
        window.triangleSystem = new TriangleSystem(canvas);
        checkInputFields();
    } else {
        console.error("Canvas element not found");
    }
});

function checkInputFields() {
    console.log("Checking input fields");
    const inputFields = document.querySelectorAll('input[type="text"]');
    inputFields.forEach(field => {
        const contentLength = field.value.length;
        const newSize = Math.max(contentLength, 6);
        if (field.size !== newSize || !field.readOnly) {
            console.warn(`Adjusting input field ${field.id}. Old Size: ${field.size}, New Size: ${newSize}, ReadOnly: ${field.readOnly}`);
            field.size = newSize;
            field.readOnly = true;
        }
    });
}

// ... (keep any other existing code)