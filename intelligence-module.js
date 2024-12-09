class LossFunction {
    constructor(symbolMapping) {
        this.lossFactors = {
            inputLoss: 0.05
        };
        this.symbolMapping = symbolMapping;
    }

    processDataLoss(letter) {
        const isEntropy = Math.random() < this.lossFactors.inputLoss;
        
        if (isEntropy) {
            const mapping = this.symbolMapping.getGreekMapping(letter);
            return {
                entropy: true,
                value: mapping.greek,
                nodeChannel: mapping.nodeChannel,
                remainingData: 0
            };
        }
        
        return {
            entropy: false,
            value: letter,
            nodeChannel: this.symbolMapping.getNodeChannel(letter),
            remainingData: 1
        };
    }
}

class IntelligenceModule {
    constructor(rulesModule) {
        this.rulesModule = rulesModule;
        
        // Initialize arrays and storage
        this.words = [];          
        this.letterBuffer = [];   
        
        // Initialize data storage with system capacity
        this.dataStorage = {
            letters: [],           
            processedLetters: 0,   
            maxCapacity: parseFloat(document.querySelector('#system-c')?.value) || 38971,
            bufferSize: 1000,      
        };

        this.entropyState = {
            totalLetters: 0,       
            totalWords: 0,         
            totalEntropy: 0,       
            currentRatio: 0
        };

        // Initialize entropy tracking
        this.entropyTracking = {
            processedToEntropy: 0,
            currentLossRate: 0,
            greekLetters: []
        };

        this.letterPool = {
            groups: {},
            totalUnprocessed: 0,
            letterHistory: {
                added: 0,
                processed: 0,
                carryOverFromLastInterval: 0
            }
        };

        // Add tracking for logging
        this.loggingState = {
            lettersSinceLastLog: 0,
            wordsFormedSinceLastLog: 0,
            lastRatio: 0,
            logInterval: 300
        };

        // Initialize loss function
        this.lossFunction = new LossFunction();
        
        // Set initial loss input value in UI
        const lossInputField = document.getElementById('loss-input-factor');
        if (lossInputField) {
            lossInputField.value = (this.lossFunction.getLossFactor() * 100).toFixed(4);
            
            // Add event listener for changes
            lossInputField.addEventListener('change', (e) => {
                const value = parseFloat(e.target.value);
                if (!isNaN(value) && value >= 0 && value <= 100) {
                    this.lossFunction.setLossFactor(value / 100);
                    console.log('Loss factor updated to:', value, '%');
                } else {
                    // Reset to current value if invalid input
                    e.target.value = (this.lossFunction.getLossFactor() * 100).toFixed(4);
                }
            });
        }

        // Generate initial dataset
        this.generateInitialDataset();
        
        // Explicitly update dashboard after initialization
        this.updateDashboard();
        
        console.log('IntelligenceModule initialized with in-memory storage');

        // Add zero data button handler
        const zeroDataButton = document.getElementById('zeroDataButton');
        if (zeroDataButton) {
            zeroDataButton.addEventListener('click', () => this.resetSystem());
        }
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

    updateLetterPool(letter, isAdding = true) {
        if (isAdding) {
            this.letterPool.groups[letter] = (this.letterPool.groups[letter] || 0) + 1;
            this.letterPool.totalUnprocessed++;
            this.letterPool.letterHistory.added++;
        } else {
            this.letterPool.groups[letter] -= 9;
            this.letterPool.totalUnprocessed -= 9;
            this.letterPool.letterHistory.processed += 9;
        }
    }

    processLetter(letter) {
        if (this.entropyState.totalLetters >= this.dataStorage.maxCapacity) {
            return {
                success: false,
                reason: 'capacity_reached',
                status: this.getStorageStatus()
            };
        }

        const lossResult = this.lossFunction.processDataLoss(letter);
        
        if (lossResult.entropy) {
            this.entropyTracking.greekLetters.push({
                value: lossResult.value,
                timestamp: Date.now()
            });
            this.entropyState.totalEntropy++;
        } else if (lossResult.remainingData > 0) {
            this.updateLetterPool(letter);
            this.dataStorage.letters.push({
                value: letter,
                timestamp: Date.now(),
                processed: false,
                position: this.dataStorage.letters.length,
                isEntropy: false
            });
        }
        
        this.entropyState.totalLetters = this.dataStorage.letters.filter(
            l => !l.processed && !l.isEntropy
        ).length;
        
        this.loggingState.lettersSinceLastLog++;
        
        this.processLetterBuffer();
        this.updateDashboard();
        
        return {
            success: true,
            status: this.getStorageStatus()
        };
    }

    processLetterBuffer() {
        for (const [letter, count] of Object.entries(this.letterPool.groups)) {
            if (count >= 9) {
                const unprocessedOfType = this.dataStorage.letters
                    .filter(l => !l.processed && l.value === letter)
                    .slice(0, 9);
                
                // Verify we have exactly 9 letters before processing
                if (unprocessedOfType.length === 9) {
                    this.words.push(letter.repeat(9));
                    this.entropyState.totalWords++;
                    this.entropyState.totalLetters -= 9;
                    this.loggingState.wordsFormedSinceLastLog++;
                    
                    this.updateLetterPool(letter, false);
                    
                    unprocessedOfType.forEach(letter => {
                        letter.processed = true;
                    });
                    
                    this.dataStorage.processedLetters += 9;
                    
                    // Update ratio after word formation
                    this.entropyState.currentRatio = this.entropyState.totalWords / this.entropyState.totalLetters;
                }
            }
        }
    }

    updateDashboard() {
        const systemD = document.getElementById('system-d');
        const systemB = document.getElementById('system-b');
        const systemE = document.getElementById('system-e');
        const bdRatio = document.getElementById('system-bd-ratio');
        const edRatio = document.getElementById('system-ed-ratio');
        const beRatio = document.getElementById('system-be-ratio');
        const edbRatio = document.getElementById('system-edb-ratio');
        
        // Update base values
        if (systemD) systemD.value = this.entropyState.totalLetters.toString();
        if (systemB) systemB.value = this.entropyState.totalWords.toString();
        if (systemE) systemE.value = this.entropyState.totalEntropy.toString();
        
        // Calculate and update ratios
        if (bdRatio) {
            bdRatio.value = (this.entropyState.totalWords / this.entropyState.totalLetters).toFixed(4);
        }
        
        if (edRatio) {
            edRatio.value = (this.entropyState.totalEntropy / this.entropyState.totalLetters).toFixed(4);
        }
        
        if (beRatio) {
            const beValue = this.entropyState.totalEntropy > 0 
                ? (this.entropyState.totalWords / this.entropyState.totalEntropy).toFixed(4)
                : '0.0000';
            beRatio.value = beValue;
        }

        if (edbRatio) {
            // Calculate (E+D)/B ratio
            const combinedED = this.entropyState.totalEntropy + this.entropyState.totalLetters;
            const edbValue = this.entropyState.totalWords > 0 
                ? (combinedED / this.entropyState.totalWords).toFixed(4)
                : '0.0000';
            edbRatio.value = edbValue;
        }

        // Update system status log
        if (this.loggingState.lettersSinceLastLog >= this.loggingState.logInterval) {
            const unprocessedLetters = this.dataStorage.letters.filter(
                l => !l.processed && !l.isEntropy
            );
            
            console.log('System Status Report:', {
                lettersSinceLastReport: this.loggingState.lettersSinceLastLog,
                currentPoolSize: unprocessedLetters.length,
                currentPool: unprocessedLetters.map(l => l.value).join(''),
                wordsFormedSinceLastReport: this.loggingState.wordsFormedSinceLastLog,
                currentBDRatio: this.entropyState.currentRatio.toFixed(4),
                bdRatioChange: ratioChange.toFixed(4),
                totalLettersInSystem: this.entropyState.totalLetters,
                totalWordsFormed: this.entropyState.totalWords,
                entropyStatus: {
                    totalGreekLetters: this.entropyTracking.greekLetters.length,
                    currentEntropyPool: this.entropyTracking.greekLetters.map(l => l.value).join('')
                }
            });
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
        const isRepeating = letters.length === 3 && 
                           letters[0] === letters[1] && 
                           letters[1] === letters[2];
        
        console.log('Checking repeating sequence:', {
            letters: letters,
            isRepeating: isRepeating,
            length: letters.length,
            firstMatch: letters[0] === letters[1],
            secondMatch: letters[1] === letters[2]
        });
        
        return isRepeating;
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
        const currentCapacity = parseFloat(document.querySelector('#system-c')?.value) || this.dataStorage.maxCapacity;
        const unprocessedCount = this.dataStorage.letters.filter(
            l => !l.processed && !l.isEntropy
        ).length;
        
        return {
            totalLetters: unprocessedCount,  // D is unprocessed, non-entropy letters
            processedLetters: this.dataStorage.processedLetters,
            capacityUsed: ((unprocessedCount + this.entropyState.totalEntropy) / currentCapacity) * 100,
            capacityRemaining: currentCapacity - (unprocessedCount + this.entropyState.totalEntropy),
            unprocessedCount: unprocessedCount,
            totalWords: this.entropyState.totalWords,
            currentRatio: this.entropyState.currentRatio,
            bufferContents: this.letterBuffer.join('')
        };
    }

    resetLoggingCounters() {
        this.loggingState.lettersSinceLastLog = 0;
        this.loggingState.wordsFormedSinceLastLog = 0;
        this.loggingState.lastRatio = this.entropyState.currentRatio;
    }

    resetSystem() {
        // Reset all counters and storage
        this.dataStorage.letters = [];
        this.dataStorage.processedLetters = 0;
        
        this.letterPool = {
            groups: {},
            totalUnprocessed: 0,
            letterHistory: {
                added: 0,
                processed: 0,
                carryOverFromLastInterval: 0
            }
        };

        this.entropyState.totalLetters = 0;
        this.entropyState.totalWords = 0;
        this.entropyState.currentRatio = 0;
        
        this.words = [];
        this.letterBuffer = [];
        
        // Reset logging state
        this.loggingState = {
            lettersSinceLastLog: 0,
            wordsFormedSinceLastLog: 0,
            lastRatio: 0,
            logInterval: 300
        };

        // Reset entropy tracking
        this.entropyState.totalEntropy = 0;
        this.entropyTracking.processedToEntropy = 0;
        this.entropyTracking.currentLossRate = 0;
        this.entropyTracking.greekLetters = [];

        // Update dashboard
        this.updateDashboard();
        
        console.log('System reset to zero');
        
        // Make sure to reset all ratios
        const ratios = ['system-bd-ratio', 'system-ed-ratio', 'system-be-ratio', 'system-edb-ratio'];
        ratios.forEach(id => {
            const element = document.getElementById(id);
            if (element) element.value = '0.0000';
        });
    }
} 