class IntelligenceModule {
    constructor(rulesModule) {
        this.rulesModule = rulesModule;
        
        // Initialize arrays and storage
        this.words = [];          
        this.letterBuffer = [];   
        
        // Initialize data storage
        this.dataStorage = {
            letters: [],           
            processedLetters: 0,   
            maxCapacity: 38971,    
            bufferSize: 1000,      
        };

        this.entropyState = {
            totalLetters: 0,       
            totalWords: 0,         
            currentRatio: 0,        
            bufferSize: 0,          
            ratioHistory: [],       
            capacityUsed: 0,        
            optimalRatio: 1/3,      
            criticalRatio: 0.0033,  
            ratioDeviation: 0,      
            systemStatus: 'stable'   
        };

        this.maxHistoryLength = 100;

        // Generate initial dataset
        this.generateInitialDataset();
        
        // Explicitly update dashboard after initialization
        this.updateDashboard();
        
        console.log('IntelligenceModule initialized with in-memory storage');
    }

    generateInitialDataset() {
        console.log('Generating initial dataset...');
        
        const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        let letterCount = 0;
        
        while (letterCount < 12990) {
            const letter = alphabet[Math.floor(Math.random() * alphabet.length)];
            
            for (let i = 0; i < 3; i++) {
                this.dataStorage.letters.push({
                    value: letter,
                    timestamp: Date.now(),
                    processed: true,
                    position: letterCount + i
                });
            }
            
            this.words.push(letter.repeat(3));
            letterCount += 3;
        }

        // Update counts in entropyState
        this.entropyState.totalLetters = 12990;
        this.entropyState.totalWords = 4330;
        this.entropyState.currentRatio = this.entropyState.totalWords / this.entropyState.totalLetters;
        
        console.log('Initial dataset generated:', {
            letters: this.dataStorage.letters.length,
            words: this.words.length,
            sampleWords: this.words.slice(0, 5),
            totalLetters: this.entropyState.totalLetters,
            totalWords: this.entropyState.totalWords,
            ratio: this.entropyState.currentRatio
        });
    }

    processLetter(letter) {
        console.log('Processing letter:', letter);

        // Check capacity before adding
        if (this.dataStorage.letters.length >= this.dataStorage.maxCapacity) {
            console.log('System at capacity - cannot accept more letters');
            return {
                success: false,
                reason: 'capacity_reached',
                status: this.getStorageStatus()
            };
        }

        this.dataStorage.letters.push({
            value: letter,
            timestamp: Date.now(),
            processed: false,
            position: this.dataStorage.letters.length
        });

        this.entropyState.totalLetters++;
        this.letterBuffer.push(letter);
        
        // Process for words
        if (this.letterBuffer.length >= 3) {
            const lastThree = this.letterBuffer.slice(-3);
            if (this.isRepeatingSequence(lastThree)) {
                const word = lastThree.join('');
                this.words.push(word);
                this.entropyState.totalWords++;
                console.log('Word formed:', word);
                this.letterBuffer = [];
            }
            
            if (this.letterBuffer.length > 10) {
                this.letterBuffer.shift();
            }
        }
        
        // Explicitly update ratio and dashboard
        this.entropyState.currentRatio = this.entropyState.totalWords / this.entropyState.totalLetters;
        this.updateDashboard();
        
        console.log('Letter processed:', {
            totalLetters: this.entropyState.totalLetters,
            totalWords: this.entropyState.totalWords,
            currentRatio: this.entropyState.currentRatio,
            letterBuffer: this.letterBuffer.join('')
        });
        
        return {
            success: true,
            status: this.getStorageStatus()
        };
    }

    updateDashboard() {
        const systemD = document.getElementById('system-d');
        const systemB = document.getElementById('system-b');
        const bdRatio = document.getElementById('system-bd-ratio');
        
        if (systemD) {
            systemD.value = this.entropyState.totalLetters.toString();
            console.log('Updated system-d:', this.entropyState.totalLetters);
        }
        if (systemB) {
            systemB.value = this.entropyState.totalWords.toString();
            console.log('Updated system-b:', this.entropyState.totalWords);
        }
        if (bdRatio) {
            bdRatio.value = this.entropyState.currentRatio.toFixed(4);
            console.log('Updated B/D ratio:', this.entropyState.currentRatio);
        }
    }

    getEntropyState() {
        const systemCapacity = this.rulesModule.calculateArea();
        return {
            ...this.entropyState,
            currentBuffer: this.letterBuffer.join(''),
            wordsFound: this.words.length,
            capacityRemaining: systemCapacity - this.entropyState.capacityUsed,
            totalCapacity: systemCapacity
        };
    }

    isRepeatingSequence(letters) {
        return letters.length === 3 && 
               letters[0] === letters[1] && 
               letters[1] === letters[2];
    }

    getBufferContents() {
        return this.letterBuffer.join('');
    }

    getWords() {
        return this.words;
    }

    clearBuffer() {
        this.letterBuffer = [];
    }

    getStorageStatus() {
        return {
            totalLetters: this.entropyState.totalLetters,
            processedLetters: this.dataStorage.processedLetters,
            capacityUsed: (this.dataStorage.letters.length / this.dataStorage.maxCapacity) * 100,
            unprocessedCount: this.dataStorage.letters.filter(l => !l.processed).length,
            totalWords: this.entropyState.totalWords,
            currentRatio: this.entropyState.currentRatio,
            bufferContents: this.letterBuffer.join('')
        };
    }
} 