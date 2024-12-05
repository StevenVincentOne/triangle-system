class RulesModule {
    constructor(canvas) {
        this.triangleSystem = new TriangleSystem(canvas);
        console.log('RulesModule initialized');
    }

    getSystemState() {
        console.log('Getting system state from RulesModule');
        return {
            triangleSystem: this.triangleSystem
        };
    }

    updateState(newState) {
        console.log('Updating system state through RulesModule');
        // We'll implement this properly later
    }
}
