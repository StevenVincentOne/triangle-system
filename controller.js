class TriangleSystemController {
    constructor(canvas) {
        console.log('Initializing TriangleSystemController');
        this.rulesModule = new RulesModule(canvas);
        this.intelligenceModule = new IntelligenceModule(this.rulesModule);
        this.environmentModule = new EnvironmentModule(this.intelligenceModule);
    }
}
