class EnvironmentModule {
    constructor() {
        this.dataSources = [];
        this.isGenerating = false;
        this.generationInterval = null;
        
        // Define our character set
        this.alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ .';
        
        // Initialize random generator
        this.randomGenerator = {
            generateLetter: () => {
                const index = Math.floor(Math.random() * this.alphabet.length);
                return this.alphabet[index];
            }
        };

        console.log('EnvironmentModule initialized with random letter generator');
    }

    startLetterGeneration(callback, interval = 1000) {
        if (!this.isGenerating) {
            console.log('Starting letter generation...');
            this.isGenerating = true;
            
            this.generationInterval = setInterval(() => {
                const letter = this.randomGenerator.generateLetter();
                console.log('Generated letter:', letter);
                if (callback) callback(letter);
            }, interval);
        }
    }

    stopLetterGeneration() {
        if (this.isGenerating) {
            console.log('Stopping letter generation');
            clearInterval(this.generationInterval);
            this.isGenerating = false;
        }
    }

    toggleLetterGeneration(callback, interval) {
        if (this.isGenerating) {
            this.stopLetterGeneration();
        } else {
            this.startLetterGeneration(callback, interval);
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