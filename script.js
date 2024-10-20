class TriangleSystem {
    // ... (previous code remains unchanged)

    updateDashboard() {
        // ... (previous code remains unchanged)

        // Calculate d(M, T) NC1
        const midpointNC1 = {
            x: (this.system.n2.x + this.system.n3.x) / 2,
            y: (this.system.n2.y + this.system.n3.y) / 2
        };
        const tangencyPointNC1 = this.system.tangencyPoints[0];
        const dMTNC1 = this.calculateDistance(midpointNC1, tangencyPointNC1);

        // Update information panel
        setElementValue('#info-d-i-ic', iToIcDistance, 'd(I, IC):');
        setElementValue('#info-d-m-t-nc1', dMTNC1, 'd(M, T) NC1:');
    }

    exportData() {
        // ... (previous code remains unchanged)

        const data = {
            // ... (previous data remains unchanged)
            info: {
                dCentroidIncircle: safeGetValue('#i-to-ic-distance'),
                dMidpointTangencyNC1: safeGetValue('#info-d-m-t-nc1'),
                medianN1: safeGetValue('#median-n1'),
                medianN2: safeGetValue('#median-n2'),
                medianN3: safeGetValue('#median-n3')
            }
        };

        // ... (rest of the function remains unchanged)
    }

    // ... (rest of the class remains unchanged)
}

// ... (rest of the file remains unchanged)
