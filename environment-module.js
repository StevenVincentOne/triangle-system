class EnvironmentModule {
    constructor(intelligenceModule) {
        this.intelligenceModule = intelligenceModule;
        this.isGenerating = false;
        this.generationInterval = null;
        this.flowRate = 100;
        
        // Updated alphabet: 26 letters plus 4 special characters (30 total characters)
        this.alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ/+&∅';
        
        this.randomGenerator = {
            generateLetter: () => {
                const index = Math.floor(Math.random() * this.alphabet.length);
                return this.alphabet[index];
            }
        };

        this.initializeControls();
        console.log('EnvironmentModule initialized with weighted letter distribution');
        console.log('Total letter pool size:', this.alphabet.length);

        // Add zero data button handler
        const zeroDataButton = document.getElementById('zeroDataButton');
        if (zeroDataButton) {
            zeroDataButton.addEventListener('click', () => {
                this.stopLetterGeneration();
                const toggleBtn = document.getElementById('letterFlowToggle');
                if (toggleBtn) {
                    toggleBtn.textContent = 'Start Flow';
                    toggleBtn.classList.remove('active');
                }
            });
        }
    }

    initializeControls() {
        const toggleBtn = document.getElementById('letterFlowToggle');
        const rateSlider = document.getElementById('flowRateSlider');
        const rateValue = document.getElementById('flowRateValue');

        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => {
                if (this.isGenerating) {
                    this.stopLetterGeneration();
                    toggleBtn.textContent = 'Start Flow';
                    toggleBtn.classList.remove('active');
                } else {
                    this.startLetterGeneration();
                    toggleBtn.textContent = 'Stop Flow';
                    toggleBtn.classList.add('active');
                }
            });
        }

        if (rateSlider && rateValue) {
            // Sync slider and number input
            rateSlider.addEventListener('input', (e) => {
                const newRate = parseInt(e.target.value);
                rateValue.value = newRate;
                this.updateFlowRate(newRate);
            });

            rateValue.addEventListener('change', (e) => {
                const newRate = Math.min(1000, Math.max(0, parseInt(e.target.value)));
                rateValue.value = newRate;
                rateSlider.value = newRate;
                this.updateFlowRate(newRate);
            });
        }
    }

    updateFlowRate(newRate) {
        this.flowRate = newRate;
        if (this.isGenerating) {
            // Restart generation with new rate
            this.stopLetterGeneration();
            this.startLetterGeneration();
        }
    }

    startLetterGeneration() {
        if (!this.isGenerating && this.flowRate > 0) {
            console.log(`Starting letter generation at ${this.flowRate} letters/sec`);
            this.isGenerating = true;
            
            const interval = 1000 / this.flowRate;
            this.generationInterval = setInterval(() => {
                const letter = this.randomGenerator.generateLetter();
                
                if (this.intelligenceModule) {
                    const result = this.intelligenceModule.processLetter(letter);
                    
                    // Check if system capacity is reached
                    if (result && !result.success) {
                        if (result.reason === 'capacity_reached') {
                            console.log('System capacity reached - stopping letter generation');
                            this.stopLetterGeneration();
                            
                            const toggleBtn = document.getElementById('letterFlowToggle');
                            if (toggleBtn) {
                                toggleBtn.textContent = 'Capacity Full';
                                toggleBtn.disabled = true;
                            }
                        }
                    }
                }
            }, interval);
        }
    }

    stopLetterGeneration() {
        if (this.isGenerating) {
            console.log('Stopping letter generation');
            clearInterval(this.generationInterval);
            this.isGenerating = false;
            
            const toggleBtn = document.getElementById('letterFlowToggle');
            if (toggleBtn && !toggleBtn.disabled) {
                toggleBtn.textContent = 'Start Flow';
                toggleBtn.classList.remove('active');
            }
        }
    }

    initializeDataSources() {
        console.log('Initializing data sources...');
        // Placeholder for adding data sources
    }

    addDataSource(source) {
        console.log('Adding data source:', source);
        this.dataSources.push(source);
    }

    getMixedData(params) {
        console.log('Mixing data with params:', params);
        // Placeholder for data mixing logic
        return {};
    }
} 