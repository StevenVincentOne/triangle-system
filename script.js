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

    // ... (rest of the code remains unchanged)
}

// ... (rest of the file remains unchanged)
