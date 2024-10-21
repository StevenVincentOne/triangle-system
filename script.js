class TriangleSystem {
    // ... (previous code remains unchanged)

    updateInformationPanel() {
        const setElementValue = (selector, value) => {
            const element = document.querySelector(selector);
            if (element) {
                element.value = this.formatValue(value);
            }
        };

        // Calculate centroid
        const centroidX = (this.system.n1.x + this.system.n2.x + this.system.n3.x) / 3;
        const centroidY = (this.system.n1.y + this.system.n2.y + this.system.n3.y) / 3;
        const dIIC = this.calculateDistance({x: centroidX, y: centroidY}, this.system.incenter);

        // Round very small values to zero
        const roundToZero = (value, epsilon = 1e-10) => Math.abs(value) < epsilon ? 0 : value;

        const dIICRounded = roundToZero(dIIC);
        setElementValue('#d-i-ic', dIICRounded);

        const perimeter = this.calculatePerimeter();
        const rIIC = roundToZero(dIICRounded / perimeter);
        setElementValue('#r-i-ic', rIIC);

        const midpoints = this.calculateMidpoints();
        const tangentPoints = this.calculateTangencyPoints();

        ['n1', 'n2', 'n3'].forEach((node, index) => {
            const midpoint = midpoints[`m${index + 1}`];
            const tangentPoint = tangentPoints[index];
            const dMT = this.calculateDistance(midpoint, tangentPoint);
            const rMT = dMT / perimeter;
            setElementValue(`#d-m-t-${node}`, roundToZero(dMT));
            setElementValue(`#r-m-t-${node}`, roundToZero(rMT));
        });
    }

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

        // ... (existing dashboard updates remain unchanged)

        ['n1', 'n2', 'n3'].forEach(node => {
            setElementValue(`#node-${node}-coords`, `(${this.formatValue(this.system[node].x)}, ${this.formatValue(this.system[node].y)})`, `${node.toUpperCase()} (x, y):`);
            setElementValue(`#node-${node}-angle`, `${angles[node].toFixed(2)}°`, `${node.toUpperCase()} ∠:`);
        });

        // ... (remaining code remains unchanged)
    }

    // ... (rest of the code remains unchanged)
}

// ... (rest of the file remains unchanged)