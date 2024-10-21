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

    // ... (keep all other methods unchanged)

    updateDashboard() {
        const setElementValue = (selector, value, label = '') => {
            const element = document.querySelector(selector);
            if (element) {
                element.value = this.formatValue(value);
                if (label) {
                    const labelElement = element.previousElementSibling;
                    if (labelElement) {
                        labelElement.textContent = label.replace(':', '');
                    }
                }
            }
        };

        const totalArea = this.calculateArea();
        const subsystemArea = totalArea / 3;
        setElementValue('#system-perimeter', this.calculatePerimeter(), 'P:');
        setElementValue('#system-area', totalArea, 'A:');
        setElementValue('#subsystems-area', subsystemArea, 'SS A:');

        const angles = this.calculateAngles();
        const lengths = this.calculateLengths();
        const I = this.system.intelligence;

        const subsystemPerimeters = {
            ss1: this.calculateDistance(I, this.system.n1) + this.calculateDistance(I, this.system.n2) + lengths.l1,
            ss2: this.calculateDistance(I, this.system.n2) + this.calculateDistance(I, this.system.n3) + lengths.l2,
            ss3: this.calculateDistance(I, this.system.n3) + this.calculateDistance(I, this.system.n1) + lengths.l3
        };

        ['1', '2', '3'].forEach((i) => {
            setElementValue(`#subsystem-${i}-perimeter`, subsystemPerimeters[`ss${i}`], 'P:');
            setElementValue(`#subsystem-${i}-angle`, `${(angles[`n${i}`] / 2).toFixed(2)}°`, '∠:');
        });

        setElementValue('#edge-nc1', lengths.l1, 'NC1:');
        setElementValue('#edge-nc2', lengths.l2, 'NC2:');
        setElementValue('#edge-nc3', lengths.l3, 'NC3:');

        const medians = this.calculateMedians();
        setElementValue('#median-n1', medians.n1, 'N1:');
        setElementValue('#median-n2', medians.n2, 'N2:');
        setElementValue('#median-n3', medians.n3, 'N3:');

        // Update node coordinates
        setElementValue('#node-n1-coords', `${this.formatValue(this.system.n1.x)}, ${this.formatValue(this.system.n1.y)}`, 'N1 x,y:');
        setElementValue('#node-n2-coords', `${this.formatValue(this.system.n2.x)}, ${this.formatValue(this.system.n2.y)}`, 'N2 x,y:');
        setElementValue('#node-n3-coords', `${this.formatValue(this.system.n3.x)}, ${this.formatValue(this.system.n3.y)}`, 'N3 x,y:');

        // Update node angles
        setElementValue('#node-n1-angle', `${angles.n1.toFixed(2)}°`, 'N1 ∠:');
        setElementValue('#node-n2-angle', `${angles.n2.toFixed(2)}°`, 'N2 ∠:');
        setElementValue('#node-n3-angle', `${angles.n3.toFixed(2)}°`, 'N3 ∠:');

        // Call the separate method
        this.updateInformationPanel();
    }

    // ... (keep all other methods unchanged)
}

// ... (keep the rest of the file unchanged)
