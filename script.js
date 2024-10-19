// ... (keep the existing code up to the updateDashboard method)

updateDashboard() {
    try {
        console.log('Updating dashboard...');
        
        const setElementValue = (selector, value) => {
            const element = document.querySelector(selector);
            if (element) {
                element.value = value;
                console.log(`Set ${selector} to ${value}`);
            } else {
                console.warn(`Element not found: ${selector}`);
            }
        };

        // System
        setElementValue('#system-perimeter', this.calculatePerimeter().toFixed(2));
        setElementValue('#system-area', this.calculateArea().toFixed(2));
        setElementValue('#subsystems-area', (this.calculateArea() / 3).toFixed(2));

        // Channels
        const lengths = this.calculateLengths();
        setElementValue('#edge-nc1', lengths.l1.toFixed(2));
        setElementValue('#edge-nc2', lengths.l2.toFixed(2));
        setElementValue('#edge-nc3', lengths.l3.toFixed(2));

        // Medians
        const medians = this.calculateMedians();
        setElementValue('#median-nc1', medians.m1.toFixed(2));
        setElementValue('#median-nc2', medians.m2.toFixed(2));
        setElementValue('#median-nc3', medians.m3.toFixed(2));

        // Nodes (Angles)
        const angles = this.calculateAngles();
        setElementValue('#node-n1-angle', angles.n1.toFixed(2));
        setElementValue('#node-n2-angle', angles.n2.toFixed(2));
        setElementValue('#node-n3-angle', angles.n3.toFixed(2));

        // Centers
        setElementValue('#centroid-coords', `(${this.system.intelligence.x.toFixed(2)}, ${this.system.intelligence.y.toFixed(2)})`);
        setElementValue('#incenter-coords', `(${this.system.incenter.x.toFixed(2)}, ${this.system.incenter.y.toFixed(2)})`);
        setElementValue('#i-to-ic', this.calculateDistance(this.system.intelligence, this.system.incenter).toFixed(2));

        // Subsystems
        for (let i = 1; i <= 3; i++) {
            const subsystemPerimeter = this.calculateSubsystemPerimeter(i);
            const subsystemAngle = this.calculateSubsystemAngle(i);
            setElementValue(`#subsystem-${i}-perimeter`, subsystemPerimeter.toFixed(2));
            setElementValue(`#subsystem-${i}-angle`, subsystemAngle.toFixed(2));
        }

        console.log('Dashboard updated successfully');
    } catch (error) {
        console.error('Error updating dashboard:', error);
    }
}

calculateMedians() {
    return {
        m1: this.calculateDistance(this.system.n1, this.system.intelligence),
        m2: this.calculateDistance(this.system.n2, this.system.intelligence),
        m3: this.calculateDistance(this.system.n3, this.system.intelligence)
    };
}

calculateSubsystemPerimeter(subsystemNumber) {
    const medians = this.calculateMedians();
    const lengths = this.calculateLengths();
    switch (subsystemNumber) {
        case 1:
            return medians.m2 + medians.m3 + lengths.l1;
        case 2:
            return medians.m1 + medians.m3 + lengths.l2;
        case 3:
            return medians.m1 + medians.m2 + lengths.l3;
        default:
            throw new Error('Invalid subsystem number');
    }
}

calculateSubsystemAngle(subsystemNumber) {
    const medians = this.calculateMedians();
    switch (subsystemNumber) {
        case 1:
            return this.calculateAngleBetweenVectors(
                this.vectorSubtract(this.system.n2, this.system.intelligence),
                this.vectorSubtract(this.system.n3, this.system.intelligence)
            );
        case 2:
            return this.calculateAngleBetweenVectors(
                this.vectorSubtract(this.system.n1, this.system.intelligence),
                this.vectorSubtract(this.system.n3, this.system.intelligence)
            );
        case 3:
            return this.calculateAngleBetweenVectors(
                this.vectorSubtract(this.system.n1, this.system.intelligence),
                this.vectorSubtract(this.system.n2, this.system.intelligence)
            );
        default:
            throw new Error('Invalid subsystem number');
    }
}

vectorSubtract(v1, v2) {
    return { x: v1.x - v2.x, y: v1.y - v2.y };
}

calculateAngleBetweenVectors(v1, v2) {
    const dotProduct = v1.x * v2.x + v1.y * v2.y;
    const magnitude1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
    const magnitude2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);
    const angleRadians = Math.acos(dotProduct / (magnitude1 * magnitude2));
    return angleRadians * (180 / Math.PI);
}

// ... (keep the rest of the existing code)
