class TriangleSystemController {
    constructor(canvas) {
        console.log('Initializing TriangleSystemController');
        this.rulesModule = new RulesModule(canvas);
        this.environmentModule = new EnvironmentModule();
        this.intelligenceModule = new IntelligenceModule(this.rulesModule);
        this.advancedFeaturesEnabled = false;
    }

    enableAdvancedFeatures() {
        if (!this.advancedFeaturesEnabled) {
            console.log('Enabling advanced features...');
            this.environmentModule.initializeDataSources();
            this.advancedFeaturesEnabled = true;
        }
    }

    disableAdvancedFeatures() {
        if (this.advancedFeaturesEnabled) {
            console.log('Disabling advanced features...');
            this.advancedFeaturesEnabled = false;
        }
    }
}
