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
        this.showMedians = false;
        this.isDragging = false;
        this.draggedNode = null;

        this.initializeEventListeners();
        this.initializeSystem('equilateral');
    }

    // ... (keep all existing methods)

    updateDashboard() {
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
        const [a, b, c] = Object.values(this.calculateLengths());
        const s = (a + b + c) / 2;
        const area = Math.sqrt(s * (s - a) * (s - b) * (s - c));
        const circumradius = (a * b * c) / (4 * area);
        return Math.PI * Math.pow(circumradius, 2);
    }

    // ... (keep all other existing methods)
}

// ... (keep the rest of the file unchanged)
