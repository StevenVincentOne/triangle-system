// ... (previous code remains unchanged)

updateDashboard() {
    // ... (previous code remains unchanged)

    // Calculate and set median values
    const medianN1 = this.calculateDistance(this.system.intelligence, this.system.n1);
    const medianN2 = this.calculateDistance(this.system.intelligence, this.system.n2);
    const medianN3 = this.calculateDistance(this.system.intelligence, this.system.n3);

    setElementValue('#median-n1', medianN1);
    setElementValue('#median-n2', medianN2);
    setElementValue('#median-n3', medianN3);

    // ... (rest of the function remains unchanged)
}

// ... (rest of the file remains unchanged)
