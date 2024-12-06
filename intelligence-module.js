class IntelligenceModule {
    constructor(rulesModule) {
        this.rulesModule = rulesModule;
        this.entropyState = {
            totalLetters: 12990,    // Initial Data (letters)
            totalWords: 4330,       // Initial Bits (words)
            currentRatio: 0,        
            bufferSize: 0,          
            ratioHistory: [],       
            capacityUsed: 12990,    
            optimalRatio: 1/3,      
            criticalRatio: 0.0033,  
            ratioDeviation: 0,      
            systemStatus: 'stable'   
        };
        
        this.letterBuffer = [];
        this.words = [];
        this.maxHistoryLength = 100;
        
        // Initialize dashboard
        this.updateDashboard();
        
        // Calculate initial ratio
        this.updateEntropyRatio();
        
        console.log('IntelligenceModule initialized with default configuration:', {
            letters: this.entropyState.totalLetters,
            words: this.entropyState.totalWords,
            ratio: this.entropyState.currentRatio,
            capacityUsed: this.entropyState.capacityUsed,
            systemStatus: this.entropyState.systemStatus
        });
    }

    processLetter(letter) {
        // Check system capacity before processing
        const systemCapacity = this.rulesModule.calculateArea();
        const capacityRemaining = systemCapacity - this.entropyState.capacityUsed;
        
        if (capacityRemaining <= 0) {
            console.log('System at capacity - cannot process more data');
            return {
                atCapacity: true,
                capacityUsed: this.entropyState.capacityUsed,
                totalCapacity: systemCapacity
            };
        }

        console.log('Processing letter:', letter);
        this.entropyState.totalLetters++;
        this.letterBuffer.push(letter);
        this.entropyState.bufferSize = this.letterBuffer.length;
        
        // Check for three-letter repetition
        if (this.letterBuffer.length >= 3) {
            const lastThree = this.letterBuffer.slice(-3);
            if (this.isRepeatingSequence(lastThree)) {
                const word = lastThree.join('');
                console.log('Word detected:', word);
                this.words.push(word);
                this.entropyState.totalWords++;
                
                // Update capacity usage (each word uses 1 unit of capacity)
                this.entropyState.capacityUsed++;
                
                // Update and track B/D ratio
                this.updateEntropyRatio();
                
                this.letterBuffer = [];
            }
            
            if (this.letterBuffer.length > 10) {
                this.letterBuffer.shift();
            }
        }

        return {
            currentBuffer: this.letterBuffer.join(''),
            words: this.words,
            lastWord: this.words[this.words.length - 1],
            entropyState: this.getEntropyState(),
            capacityStatus: {
                used: this.entropyState.capacityUsed,
                total: systemCapacity,
                remaining: systemCapacity - this.entropyState.capacityUsed
            }
        };
    }

    updateDashboard() {
        // Update System Data (D)
        const systemDElement = document.getElementById('system-d');
        if (systemDElement) {
            systemDElement.value = this.entropyState.totalLetters.toFixed(2);
        }

        // Update System Bits (B)
        const systemBElement = document.getElementById('system-b');
        if (systemBElement) {
            systemBElement.value = this.entropyState.totalWords.toFixed(2);
        }

        // Update B/D Ratio
        const bdRatioElement = document.getElementById('system-bd-ratio');
        if (bdRatioElement) {
            bdRatioElement.value = this.entropyState.currentRatio.toFixed(4);
        }

        console.log('Dashboard updated:', {
            D: this.entropyState.totalLetters,
            B: this.entropyState.totalWords,
            'B/D': this.entropyState.currentRatio
        });
    }

    updateEntropyRatio() {
        const ratio = this.entropyState.totalWords / this.entropyState.totalLetters;
        this.entropyState.currentRatio = ratio;
        
        // Calculate deviation from optimal ratio
        this.entropyState.ratioDeviation = ratio / this.entropyState.optimalRatio;
        
        // Update dashboard before calculating angles
        this.updateDashboard();
        
        // Calculate triangle angles based on ratio
        const angles = this.calculateTriangleAngles(ratio);
        
        this.entropyState.ratioHistory.push({
            time: Date.now(),
            ratio: ratio,
            capacityUsed: this.entropyState.capacityUsed,
            angles: angles,
            systemStatus: this.entropyState.systemStatus
        });
        
        if (this.entropyState.ratioHistory.length > this.maxHistoryLength) {
            this.entropyState.ratioHistory.shift();
        }
        
        // For now, let's just log the angles instead of updating the triangle
        console.log('Calculated angles:', angles);
        
        return ratio;
    }

    calculateTriangleAngles(ratio) {
        // Base angle for equilateral triangle is 60 degrees
        const baseAngle = 60;
        
        // Check for critical or failed state
        if (ratio <= this.entropyState.criticalRatio) {
            this.entropyState.systemStatus = 'failed';
            console.log('SYSTEM FAILURE: Critical B/D ratio reached');
            // Return angles that violate triangle inequality
            return [0, 180, 0];
        }
        
        // Calculate deviation from optimal ratio (0.3333...)
        const deviation = ratio / this.entropyState.optimalRatio;
        
        // Calculate angles based on deviation
        let angles;
        if (deviation === 1) {
            // Perfect ratio - equilateral triangle
            angles = [60, 60, 60];
            this.entropyState.systemStatus = 'stable';
        } else if (deviation < 1) {
            // Below optimal ratio - compress triangle
            const adjustment = (1 - deviation) * 30; // max 30 degree adjustment
            angles = [
                baseAngle - adjustment,
                baseAngle + (adjustment * 2),
                baseAngle - adjustment
            ];
            
            // Check if approaching critical state
            if (deviation < 0.1) { // You can adjust this threshold
                this.entropyState.systemStatus = 'critical';
                console.warn('WARNING: System approaching critical state');
            }
        } else {
            // Above optimal ratio - expand triangle
            const adjustment = Math.min((deviation - 1) * 30, 30); // max 30 degree adjustment
            angles = [
                baseAngle + adjustment,
                baseAngle - (adjustment * 2),
                baseAngle + adjustment
            ];
        }
        
        // Validate triangle inequality
        if (!this.isValidTriangle(angles)) {
            this.entropyState.systemStatus = 'failed';
            console.log('SYSTEM FAILURE: Triangle inequality violated');
            return [0, 180, 0];
        }
        
        return angles;
    }

    isValidTriangle(angles) {
        // Check if any angle is 0 or 180
        if (angles.some(angle => angle <= 0 || angle >= 180)) {
            return false;
        }
        
        // Check triangle inequality (sum of angles must be 180)
        const sum = angles.reduce((a, b) => a + b, 0);
        if (Math.abs(sum - 180) > 0.001) { // Allow for small floating-point errors
            return false;
        }
        
        return true;
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
} 