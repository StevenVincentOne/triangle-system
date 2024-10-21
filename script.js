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
        // ... (keep existing updateDashboard code)

        // Call the new updateInformationPanel method
        this.updateInformationPanel();
    }

    updateInformationPanel() {
        const setElementValue = (selector, value) => {
            const element = document.querySelector(selector);
            if (element) {
                element.value = this.formatValue(value);
            }
        };

        // Calculate d(I, IC)
        const centroidX = (this.system.n1.x + this.system.n2.x + this.system.n3.x) / 3;
        const centroidY = (this.system.n1.y + this.system.n2.y + this.system.n3.y) / 3;
        const dIIC = this.calculateDistance({x: centroidX, y: centroidY}, this.system.incenter);
        setElementValue('#d-i-ic', dIIC);

        // Calculate r(I, IC)
        const rIIC = dIIC / this.calculatePerimeter();
        setElementValue('#r-i-ic', rIIC);

        // Calculate d(M, T) and r(M, T) for each node
        ['n1', 'n2', 'n3'].forEach((node, index) => {
            const nextNode = ['n2', 'n3', 'n1'][index];
            const midpoint = {
                x: (this.system[node].x + this.system[nextNode].x) / 2,
                y: (this.system[node].y + this.system[nextNode].y) / 2
            };
            const dMT = this.calculateDistance(midpoint, this.system.incenter);
            const rMT = dMT / this.calculatePerimeter();
            setElementValue(`#d-m-t-${node}`, dMT);
            setElementValue(`#r-m-t-${node}`, rMT);
        });
    }

    // Ensure that the calculateDistance method exists
    calculateDistance(point1, point2) {
        const dx = point2.x - point1.x;
        const dy = point2.y - point1.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    // ... (keep all other existing methods)
}

// ... (keep the rest of the file unchanged)
