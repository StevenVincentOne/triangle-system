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

        // Update maxCapacity before checking
        this.dataStorage.maxCapacity = parseFloat(document.querySelector('#system-c')?.value) || this.dataStorage.maxCapacity;

        // Check capacity before adding new letter
        if (this.entropyState.totalLetters >= this.dataStorage.maxCapacity) {
            console.log('System at maximum capacity:', {
                capacity: this.dataStorage.maxCapacity,
                currentData: this.entropyState.totalLetters
            });
            
            // Signal environment to stop data flow
            return {
                success: false,
                reason: 'capacity_reached',
                status: this.getStorageStatus()
            };
        }

        // Add letter to storage
        this.dataStorage.letters.push({
            value: letter,
            timestamp: Date.now(),
            processed: false,
            position: this.dataStorage.letters.length
        });

        this.entropyState.totalLetters++;
        this.letterBuffer.push(letter);
        
        // Process buffer for words
        this.processLetterBuffer();
        
        // Update system state
        this.entropyState.currentRatio = this.entropyState.totalWords / this.entropyState.totalLetters;
        this.updateDashboard();
        
        console.log('Letter processed:', {
            totalLetters: this.entropyState.totalLetters,
            totalWords: this.entropyState.totalWords,
            currentRatio: this.entropyState.currentRatio,
            letterBuffer: this.letterBuffer.join(''),
            recentWords: this.words.slice(-3)
        });
        
        return {
            success: true,
            status: this.getStorageStatus()
        };
    }

    processLetterBuffer() {
        // Need at least 3 letters to form a word
        if (this.letterBuffer.length < 3) return;

        // Get the last three letters
        const lastThree = this.letterBuffer.slice(-3);
        
        // Check if they're all the same letter
        if (this.isRepeatingSequence(lastThree)) {
            // Form a new word
            const word = lastThree.join('');
            this.words.push(word);
            this.entropyState.totalWords++;
            
            // Mark these letters as processed in storage
            const lastThreeIndices = this.dataStorage.letters.length - 3;
            for (let i = 0; i < 3; i++) {
                if (this.dataStorage.letters[lastThreeIndices + i]) {
                    this.dataStorage.letters[lastThreeIndices + i].processed = true;
                }
            }
            
            // Update processed letters count
            this.dataStorage.processedLetters += 3;
            
            console.log('Word formed:', {
                word: word,
                totalWords: this.entropyState.totalWords,
                newRatio: this.entropyState.totalWords / this.entropyState.totalLetters
            });
            
            // Clear the buffer after word formation
            this.letterBuffer = [];
        }
        
        // Keep buffer from growing too large
        if (this.letterBuffer.length > 10) {
            this.letterBuffer = this.letterBuffer.slice(-10);
        }
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
        const currentCapacity = parseFloat(document.querySelector('#system-c')?.value) || this.dataStorage.maxCapacity;
        
        return {
            totalLetters: this.entropyState.totalLetters,
            processedLetters: this.dataStorage.processedLetters,
            capacityUsed: (this.entropyState.totalLetters / currentCapacity) * 100,
            capacityRemaining: currentCapacity - this.entropyState.totalLetters,
            unprocessedCount: this.dataStorage.letters.filter(l => !l.processed).length,
            totalWords: this.entropyState.totalWords,
            currentRatio: this.entropyState.currentRatio,
            bufferContents: this.letterBuffer.join('')
        };
    }
} 