class TriangleSystem {
    // ... (previous code) ...

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

            // ... (previous updateDashboard code) ...

            // Update new input fields for angles and edge lengths
            const angles = this.calculateAngles();
            setElementValue('#n1-angle', angles.n1.toFixed(2));
            setElementValue('#n2-angle', angles.n2.toFixed(2));
            setElementValue('#n3-angle', angles.n3.toFixed(2));

            const lengths = this.calculateLengths();
            setElementValue('#nc1-length', lengths.l3.toFixed(2));
            setElementValue('#nc2-length', lengths.l2.toFixed(2));
            setElementValue('#nc3-length', lengths.l1.toFixed(2));

            console.log('Dashboard updated successfully');
        } catch (error) {
            console.error('Error updating dashboard:', error);
        }
    }

    validateTriangleParameters(angles, lengths) {
        // Check if the sum of angles is approximately 180 degrees
        const angleSum = angles.reduce((sum, angle) => sum + angle, 0);
        if (Math.abs(angleSum - 180) > 0.01) {
            return { valid: false, message: "The sum of angles must be 180 degrees." };
        }

        // Check triangle inequality
        const [a, b, c] = lengths;
        if (a + b <= c || b + c <= a || c + a <= b) {
            return { valid: false, message: "The lengths violate the triangle inequality theorem." };
        }

        return { valid: true };
    }

    applyChanges() {
        const getInputValue = (id) => parseFloat(document.querySelector(id).value);

        const angles = [
            getInputValue('#n1-angle'),
            getInputValue('#n2-angle'),
            getInputValue('#n3-angle')
        ];

        const lengths = [
            getInputValue('#nc1-length'),
            getInputValue('#nc2-length'),
            getInputValue('#nc3-length')
        ];

        const validation = this.validateTriangleParameters(angles, lengths);

        if (validation.valid) {
            this.reconstructTriangle(angles, lengths);
            this.adjustTriangleToOrigin();
            this.updateDerivedPoints();
            this.updateDashboard();
            this.drawSystem();
        } else {
            alert(validation.message);
        }
    }

    reconstructTriangle(angles, lengths) {
        const [a, b, c] = angles.map(angle => angle * Math.PI / 180);
        const [AB, BC, CA] = lengths;

        // Place first point at origin
        this.system.n1 = { x: 0, y: 0 };

        // Calculate second point
        this.system.n2 = { x: AB, y: 0 };

        // Calculate third point
        const x3 = BC * Math.cos(a);
        const y3 = BC * Math.sin(a);
        this.system.n3 = { x: x3, y: y3 };
    }

    // ... (rest of the class code) ...
}

document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.querySelector('#canvas');
    if (canvas) {
        window.triangleSystem = new TriangleSystem(canvas);
        console.log("Initializing system...");

        // Add event listener for the apply button
        const applyButton = document.querySelector('#apply-button');
        if (applyButton) {
            applyButton.addEventListener('click', () => {
                window.triangleSystem.applyChanges();
            });
        }
    } else {
        console.error("Canvas element not found");
    }
});
