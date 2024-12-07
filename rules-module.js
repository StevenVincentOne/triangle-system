// Add this before the TriangleSystem class definition
class TriangleDatabase {
    constructor() {
        this.API_KEY = 'AIzaSyCQh02aAcYmvvGJVVJFwRFOQ5Ptvug8dOQ';
        this.CLIENT_ID = '66954381705-rib6tkc4qse6rdue4id2e1svmb6otm24.apps.googleusercontent.com';
        this.SPREADSHEET_ID = '1LN0wA4gUY0XFdY_v8SlHvwMeu1A4_X8t56FF2mP1l40';
        this.SCOPES = 'https://www.googleapis.com/auth/spreadsheets';
        this.tokenClient = null;
        this.accessToken = null;
        this.initialized = false;
    }

    async init() {
        try {
            await new Promise((resolve, reject) => {
                gapi.load('client', async () => {
                    try {
                        await gapi.client.init({
                            apiKey: this.API_KEY,
                            discoveryDocs: ['https://sheets.googleapis.com/$discovery/rest?version=v4'],
                        });

                        // Initialize the tokenClient
                        this.tokenClient = google.accounts.oauth2.initTokenClient({
                            client_id: this.CLIENT_ID,
                            scope: this.SCOPES,
                            callback: '', // Will be set later
                        });

                        this.initialized = true;
                        resolve();
                    } catch (error) {
                        console.error('Error initializing Google Sheets API:', error);
                        reject(error);
                    }
                });
            });
        } catch (error) {
            console.error('Failed to initialize Google Sheets:', error);
            throw error;
        }
    }

    async getAccessToken() {
        return new Promise((resolve, reject) => {
            try {
                this.tokenClient.callback = (response) => {
                    if (response.error !== undefined) {
                        reject(response);
                    }
                    this.accessToken = response.access_token;
                    resolve(response.access_token);
                };
                
                if (this.accessToken === null) {
                    // Request a new token
                    this.tokenClient.requestAccessToken({ prompt: 'consent' });
                } else {
                    // Use existing token
                    resolve(this.accessToken);
                }
            } catch (error) {
                console.error('Error getting access token:', error);
                reject(error);
            }
        });
    }

    /**
     * Saves the provided values to Google Sheets.
     * @param {Object} values - The data to append to the spreadsheet.
     */
    async saveToGoogleSheets(values) {
        try {
            console.log('Starting saveToGoogleSheets with values:', values);

            // Get current headers
            const response = await gapi.client.sheets.spreadsheets.values.get({
                spreadsheetId: this.SPREADSHEET_ID,
                range: 'Sheet1!A1:ZZ1'
            });

            let currentHeaders = response.result.values?.[0] || [];
            console.log('Current headers:', currentHeaders);

            // Get all keys from the values object
            const allKeys = Object.keys(values);
            
            // Ensure State and Notes are first, ID is last
            const orderedKeys = ['State', 'Notes'];
            allKeys.forEach(key => {
                if (key !== 'State' && key !== 'Notes' && key !== 'ID') {
                    orderedKeys.push(key);
                }
            });
            orderedKeys.push('ID');

            // Update headers if needed
            if (JSON.stringify(currentHeaders) !== JSON.stringify(orderedKeys)) {
                console.log('Updating headers...');
                await gapi.client.sheets.spreadsheets.values.update({
                    spreadsheetId: this.SPREADSHEET_ID,
                    range: `Sheet1!A1:${this.numberToColumn(orderedKeys.length)}1`,
                    valueInputOption: 'RAW',
                    resource: {
                        values: [orderedKeys]
                    }
                });
                currentHeaders = orderedKeys;
            }

            // Create row data using ordered headers
            const rowData = orderedKeys.map(header => {
                const value = values[header];
                return value === Infinity ? '∞' : (value ?? '');
            });

            // Append the row
            const appendResponse = await gapi.client.sheets.spreadsheets.values.append({
                spreadsheetId: this.SPREADSHEET_ID,
                range: `Sheet1!A1:${this.numberToColumn(orderedKeys.length)}`,
                valueInputOption: 'USER_ENTERED',
                resource: {
                    values: [rowData]
                }
            });

            console.log('Save successful:', appendResponse);
            return true;

        } catch (error) {
            console.error('Error in saveToGoogleSheets:', {
                message: error.message,
                response: error.result,
                status: error.status,
                error
            });
            throw error;
        }
    }

    async addNewColumns(existingHeaders, newColumns) {
        try {
            const startCol = this.numberToColumn(existingHeaders.length + 1);
            const endCol = this.numberToColumn(existingHeaders.length + newColumns.length);

            const response = await gapi.client.sheets.spreadsheets.values.update({
                spreadsheetId: this.SPREADSHEET_ID,
                range: `Sheet1!${startCol}1:${endCol}1`,
                valueInputOption: 'RAW',
                resource: {
                    values: [newColumns]
                }
            });

            if (response.status !== 200) {
                throw new Error(`Failed to update columns: ${response.statusText}`);
            }

        } catch (error) {
            console.error('Error adding new columns:', {
                message: error.message,
                response: error.result,
                status: error.status,
                error
            });
            throw error;
        }
    }

    numberToColumn(num) {
        let column = '';
        while (num > 0) {
            const modulo = (num - 1) % 26;
            column = String.fromCharCode(65 + modulo) + column;
            num = Math.floor((num - modulo) / 26);
        }
        return column;
    }

    async saveState() {
        try {
            // Prompt user for State name and Notes
            const { stateName, notes, cancelled } = await this.promptStateDetails();
            if (cancelled) {
                return false;  // Exit early without showing success message
            }

            // Get next available ID
            const nextId = await this.getNextStateId();
            
            console.log('Starting data collection...');
            const collectedData = {
                // Add State and Notes first
                'State': stateName,
                'Notes': notes || '',
                
                // System - Nodes
                'N1 Angle': document.getElementById('node-n1-angle')?.value || '',
                'N2 Angle': document.getElementById('node-n2-angle')?.value || '',
                'N3 Angle': document.getElementById('node-n3-angle')?.value || '',
                'N1 (xy)': document.getElementById('node1-coords')?.value || '',
                'N2 (xy)': document.getElementById('node2-coords')?.value || '',
                'N3 (xy)': document.getElementById('node3-coords')?.value || '',

                // Node Channels
                'NC1': document.getElementById('channel-1')?.value || '',
                'NC2': document.getElementById('channel-2')?.value || '',
                'NC3': document.getElementById('channel-3')?.value || '',

                // I-Channels
                'IC1': document.getElementById('ic-1')?.value || '',
                'IC2': document.getElementById('ic-2')?.value || '',
                'IC3': document.getElementById('ic-3')?.value || '',

                // Medians
                'M1 (xy)': document.getElementById('mid1-coords')?.value || '',
                'M2 (xy)': document.getElementById('mid2-coords')?.value || '',
                'M3 (xy)': document.getElementById('mid3-coords')?.value || '',
                'ml1': document.getElementById('median1-length')?.value || '',
                'ml2': document.getElementById('median2-length')?.value || '',
                'ml3': document.getElementById('median3-length')?.value || '',

                // Altitudes
                'Af1 (xy)': document.getElementById('altitude1-coords')?.value || '',
                'Af2 (xy)': document.getElementById('altitude2-coords')?.value || '',
                'Af3 (xy)': document.getElementById('altitude3-coords')?.value || '',
                'Al1': document.getElementById('altitude1-length')?.value || '',
                'Al2': document.getElementById('altitude2-length')?.value || '',
                'Al3': document.getElementById('altitude3-length')?.value || '',

                // System Entropy and Capacity
                'H': document.getElementById('system-h')?.value || '',
                'C': document.getElementById('system-c')?.value || '',
                'HP': document.getElementById('system-sph')?.value || '',
                'HIC': document.getElementById('system-mch')?.value || '',
                'HP/HIC': document.getElementById('hp-hic-ratio')?.value || '',
                'HIC/HP': document.getElementById('hic-hp-ratio')?.value || '',
                'HP/H': document.getElementById('hp-h-ratio')?.value || '',
                'H/HP': document.getElementById('h-hp-ratio')?.value || '',
                'HIC/H': document.getElementById('hic-h-ratio')?.value || '',
                'H/HIC': document.getElementById('h-hic-ratio')?.value || '',

                // Subsystems
                'ss∠1': document.getElementById('subsystem-1-angle')?.value || '',
                'ssh1': document.getElementById('subsystem-1-perimeter')?.value || '',
                'ssc1': document.getElementById('subsystem-1-area')?.value || '',
                'ssh/ssc1': document.getElementById('subsystem-1-ratio')?.value || '',
                'ssc/ssh1': document.getElementById('subsystem-1-inverse-ratio')?.value || '',
                'ssh/H1': document.getElementById('subsystem-1-system-ratio')?.value || '',
                'H/ssh1': document.getElementById('subsystem-1-entropy-ratio')?.value || '',

                'ss∠2': document.getElementById('subsystem-2-angle')?.value || '',
                'ssh2': document.getElementById('subsystem-2-perimeter')?.value || '',
                'ssc2': document.getElementById('subsystem-2-area')?.value || '',
                'ssh/ssc2': document.getElementById('subsystem-2-ratio')?.value || '',
                'ssc/ssh2': document.getElementById('subsystem-2-inverse-ratio')?.value || '',
                'ssh/H2': document.getElementById('subsystem-2-system-ratio')?.value || '',
                'H/ssh2': document.getElementById('subsystem-2-entropy-ratio')?.value || '',

                'ss∠3': document.getElementById('subsystem-3-angle')?.value || '',
                'ssh3': document.getElementById('subsystem-3-perimeter')?.value || '',
                'ssc3': document.getElementById('subsystem-3-area')?.value || '',
                'ssh/ssc3': document.getElementById('subsystem-3-ratio')?.value || '',
                'ssc/ssh3': document.getElementById('subsystem-3-inverse-ratio')?.value || '',
                'ssh/H3': document.getElementById('subsystem-3-system-ratio')?.value || '',
                'H/ssh3': document.getElementById('subsystem-3-entropy-ratio')?.value || '',

                // Euler Line
                'O (xy)': document.getElementById('circumcenter-coords')?.value || '',
                'I (xy)': document.getElementById('centroid-coords')?.value || '',
                'SP (xy)': document.getElementById('subcenter-coords')?.value || '',
                'NP (xy)': document.getElementById('nine-point-coords')?.value || '',
                'HO (xy)': document.getElementById('orthocenter-coords')?.value || '',
                'EL': document.getElementById('euler-line-length')?.value || '',
                'mEL': document.getElementById('euler-line-slope')?.value || '',
                'θEL': document.getElementById('euler-line-angle')?.value || '',
                'O-I/EL': document.getElementById('o-i-ratio')?.value || '',
                'I-SP/EL': document.getElementById('i-sp-ratio')?.value || '',
                'SP-NP/EL': document.getElementById('sp-np-ratio')?.value || '',
                'NP-HO/EL': document.getElementById('np-ho-ratio')?.value || '',
                'NC1 θa': document.getElementById('nc1-acute')?.value || '',
                'NC1 θo': document.getElementById('nc1-obtuse')?.value || '',
                'NC2 θa': document.getElementById('nc2-acute')?.value || '',
                'NC2 θo': document.getElementById('nc2-obtuse')?.value || '',
                'NC3 θa': document.getElementById('nc3-acute')?.value || '',
                'NC3 θo': document.getElementById('nc3-obtuse')?.value || '',

                // Incircle Panel
                'IN (xy)': document.getElementById('incenter-coords')?.value || '',
                'T1 (xy)': document.getElementById('tan1-coords')?.value || '',
                'T2 (xy)': document.getElementById('tan2-coords')?.value || '',
                'T3 (xy)': document.getElementById('tan3-coords')?.value || '',
                'd(I,IN)': document.getElementById('d-i-in')?.value || '',
                'd(IN,ssi1)': document.getElementById('d-in-ssi1')?.value || '',
                'd(IN,ssi2)': document.getElementById('d-in-ssi2')?.value || '',
                'd(IN,ssi3)': document.getElementById('d-in-ssi3')?.value || '',
                'rIN': document.getElementById('inradius')?.value || '',
                'CIN': document.getElementById('incircle-capacity')?.value || '',
                'HIN': document.getElementById('incircle-entropy')?.value || '',
                'CIN/HIN': document.getElementById('cin-hin-ratio')?.value || '',
                'HIN/CIN': document.getElementById('hin-cin-ratio')?.value || '',
                'CIN/C': document.getElementById('cin-c-ratio')?.value || '',
                'HIN/H': document.getElementById('hin-h-ratio')?.value || '',
                'd(M,T)1': document.getElementById('d-m-t-n1')?.value || '',
                'd(M,T)2': document.getElementById('d-m-t-n2')?.value || '',
                'd(M,T)3': document.getElementById('d-m-t-n3')?.value || '',
                'r(M,T)1': document.getElementById('r-m-t-n1')?.value || '',
                'r(M,T)2': document.getElementById('r-m-t-n2')?.value || '',
                'r(M,T)3': document.getElementById('r-m-t-n3')?.value || '',
                'rNC(M,T)1': document.getElementById('r-m-t-nc1')?.value || '',
                'rNC(M,T)2': document.getElementById('r-m-t-nc2')?.value || '',
                'rNC(M,T)3': document.getElementById('r-m-t-nc3')?.value || '',

                // ID must be last
                'ID': nextId
            };

            console.log('Final collected data:', collectedData);
            
            // Save to Google Sheets
            await this.saveToGoogleSheets(collectedData);
            return true;  // Only return true if save was successful

        } catch (error) {
            console.error('Error in saveState:', {
                message: error.message,
                stack: error.stack,
                error
            });
            throw error;
        }
    }

    async promptStateDetails() {
        return new Promise((resolve) => {
            // Create modal div
            const modalDiv = document.createElement('div');
            modalDiv.className = 'modal-overlay save-state-dialog';
            modalDiv.innerHTML = `
                <div class="modal-content">
                    <h2>Save State Details</h2>
                    <div class="form-group">
                        <label for="stateName">State Name *</label>
                        <input type="text" id="stateName" required>
                    </div>
                    <div class="form-group">
                        <label for="stateNotes">Notes (optional)</label>
                        <textarea id="stateNotes" rows="3"></textarea>
                    </div>
                    <div class="button-container">
                        <button type="button" class="cancel">Cancel</button>
                        <button type="button" class="save">Save</button>
                    </div>
                </div>
            `;

            document.body.appendChild(modalDiv);

            // Handle save button click
            const handleSave = () => {
                const stateName = document.getElementById('stateName').value.trim();
                const notes = document.getElementById('stateNotes').value.trim();

                if (!stateName) {
                    alert('Please enter a state name');
                    return;
                }

                modalDiv.remove();
                resolve({ stateName, notes, cancelled: false });
            };

            // Handle cancel
            const handleCancel = () => {
                modalDiv.remove();
                resolve({ stateName: null, notes: null, cancelled: true });
            };

            // Add event listeners
            modalDiv.querySelector('.save').addEventListener('click', handleSave);
            modalDiv.querySelector('.cancel').addEventListener('click', handleCancel);
        });
    }

    async getNextStateId() {
        try {
            // Get all values from the sheet
            const response = await gapi.client.sheets.spreadsheets.values.get({
                spreadsheetId: this.SPREADSHEET_ID,
                range: 'Sheet1'  // Get all data
            });

            const values = response.result.values || [];
            if (values.length === 0) return 1;  // Empty sheet

            // Find the ID column index (should be last column)
            const headers = values[0];
            const idColumnIndex = headers.indexOf('ID');
            
            if (idColumnIndex === -1) return 1;  // No ID column yet

            // Get all IDs, skipping header row
            const ids = values.slice(1)
                .map(row => row[idColumnIndex])
                .filter(id => id && !isNaN(id))
                .map(Number);

            // Return max + 1, or 1 if no valid IDs
            return ids.length > 0 ? Math.max(...ids) + 1 : 1;

        } catch (error) {
            console.error('Error getting next state ID:', {
                message: error.message,
                response: error.result,
                status: error.status,
                error
            });
            // Return 1 if there's an error
            return 1;
        }
    }

}

class TriangleSystem {
    constructor(canvasId) {
        this.canvas = canvasId;
        this.ctx = canvasId.getContext('2d');
        
        // Set up canvas dimensions
        this.canvas.width = canvasId.clientWidth;
        this.canvas.height = canvasId.clientHeight;
        
        // Transform to center origin and flip y-axis correctly
        this.ctx.translate(this.canvas.width/2, this.canvas.height/2);
        this.ctx.scale(1, -1);  // This flips the y-axis
        
        this.system = {};
        this.showConnections = true;
        this.showAreas = false;
        this.showMidpoints = false;
        this.showIncircle = false;
        this.showIncenter = false;
        this.showMedians = false;
        this.showCentroid = false;
        this.showTangents = false;
        this.showSubsystems = false;
        this.isDragging = false;
        this.draggedNode = null;
        this.showCircumcenter = false;  // Add new property
        this.showCircumcircle = false;  // Rename existing property
        this.showOrtho = false;  // Change from showSpecialCenters
        this.showNinePointCenter = false;  // Add new property
        this.showNinePointCircle = false;  // Rename existing property
        this.showSubcircle = false;
        this.showSubcenter = false;  // Add this line with other show* properties
        this.isAnimating = false; // Add this to track animation state
        this.animationLoop = null; // Add this to store animation loop reference
        this.showAltitudes = false;  // Add this property

        // Initialize with default triangle first
        this.initializeSystem('equilateral');
        
        // Then initialize controls
        this.initializeEventListeners();
        this.initializeManualControls();
        this.initializeAnimations();  // Changed from initializeAnimationControls
        
        // Draw initial state
        this.drawSystem();
        this.updateDashboard();
        
        // Update the title and dropdown container in the HTML
        const manualTitle = document.querySelector('.manual-title');
        if (manualTitle) {
            // Preserve the original text content
            const titleText = manualTitle.textContent;   
            
        }

        // Initialize storage for user animations
        this.userAnimations = JSON.parse(localStorage.getItem('userAnimations')) || {};
        
        // Initialize the animations dropdown
        this.initializeUserAnimations();
        
        // Add Save Animation button listener
        const saveAnimationButton = document.getElementById('save-animation');
        if (saveAnimationButton) {
            saveAnimationButton.addEventListener('click', () => {
                console.log('Save Animation button clicked');
                this.saveCurrentAnimation();
            });
        }

        // Add to your constants/settings section at the top
        const SPECIAL_CENTERS_COLOR = '#FF69B4';  // Pink color for O, H, N
        const SPECIAL_CENTERS_RADIUS = 4;  // Match the radius used for I and IC

        // Set all feature flags to false by default
        this.showCentroid = false;
        this.showIncenter = false;
        this.showMidpoints = false;
        this.showTangents = false;
        this.showIncircle = false;
        this.showMedians = false;
        this.showSubsystems = false;
        this.showSpecialCenters = false;  // For Euler
        this.showNinePointCircle = false; // For 9-Points Circle

        // Bind methods to this instance
        this.drawSystem = this.drawSystem.bind(this);
        this.drawNinePointCircle = this.drawNinePointCircle.bind(this);
        this.calculateNinePointCircle = this.calculateNinePointCircle.bind(this);
        this.calculateCircumcenter = this.calculateCircumcenter.bind(this);
        this.calculateOrthocenter = this.calculateOrthocenter.bind(this);
        this.updateDashboard = this.updateDashboard.bind(this);

        // Add this line
        this.showEuler = false;  // New clean flag for Euler line

        // Initialize subsystem metrics
        this.subsystemAreas = [0, 0, 0];  // Initialize array for three subsystems
        
        // Bind save preset handler
        document.getElementById('save-preset').addEventListener('click', () => this.saveCurrentConfig());

        // Initialize database
        this.db = new TriangleDatabase();
        
        // Add Save State button listener
        const saveStateButton = document.getElementById('saveState');
        if (saveStateButton) {
            const handleSaveClick = async () => {
                console.log('Save State button clicked');
                try {
                    // Initialize database first
                    console.log('Checking database initialization...');
                    if (!this.db.initialized) {
                        console.log('Database not initialized, initializing now...');
                        await this.db.init();
                    }
                    console.log('Database initialization complete');

                    // Get access token
                    console.log('Getting access token...');
                    await this.db.getAccessToken();
                    console.log('Access token obtained successfully');

                    // Call saveState with our new explicit mapping approach
                    const result = await this.db.saveState();

                    if (result === true) {  // Changed condition to check specifically for true
                        alert('State saved successfully!');
                    } else if (result === false) {
                        // Do nothing - user cancelled
                    } else {
                        alert('Failed to save the state. Please try again.');
                    }
                } catch (error) {
                    console.error('Detailed save state error:', {
                        message: error.message,
                        stack: error.stack,
                        error
                    });
                    alert('Error saving state: ' + error.message);
                }
            };

            // Attach the event listener
            saveStateButton.addEventListener('click', handleSaveClick);
        } else {
            console.error("Save State button not found");
        }

        // Add export button listener
        document.getElementById('exportData').addEventListener('click', () => {
            this.db.exportToCSV();
        });

        // Add new property for IC visibility
        this.showIC = false;
        
        // Add event listener for IC toggle button
        const toggleICButton = document.getElementById('toggleIC');
        if (toggleICButton) {
            toggleICButton.addEventListener('click', () => {
                this.showIC = !this.showIC;
                // Only toggle the active class, don't change text
                toggleICButton.classList.toggle('active');
                this.drawSystem();
            });
        }

        // Initialize the search functionality
        this.initializeInfoBoxSearch();
        this.selectedMetric = null;

        // Initialize the preset manager with this triangle system
        this.presetManager = new PresetManager(this);
        
        // Initialize managers
        this.importManager = new ImportManager(this);
    }  // End of constructor

    initializePresets() {
        // Initialize storage if it doesn't exist
        if (!localStorage.getItem('userPresets')) {
            localStorage.setItem('userPresets', JSON.stringify({}));
        }
        
        // Update presets dropdown
        this.updatePresetsDropdown();
    }
    
    // Separate method for initializing both dropdowns
    initializeDropdowns() {
        // Initialize both dropdowns
        this.initializePresets();
        this.initializeAnimations();
        
        // Update animations dropdown
        this.updateAnimationsDropdown();
    }

    savePreset() {
        // Get current NC values
        const nc1 = document.getElementById('manual-nc1').value;
        const nc2 = document.getElementById('manual-nc2').value;
        const nc3 = document.getElementById('manual-nc3').value;

        // Validate values
        if (!nc1 || !nc2 || !nc3) {
            alert('Please enter all NC values before saving a preset.');
            return;
        }

        // Prompt for preset name
        const presetName = prompt('Enter a name for this preset:');
        if (!presetName) return; // User cancelled

        try {
            // Get existing presets
            const presets = JSON.parse(localStorage.getItem('userPresets') || '{}');
            
            // Add new preset
            presets[presetName] = {
                nc1: parseFloat(nc1),
                nc2: parseFloat(nc2),
                nc3: parseFloat(nc3),
                timestamp: Date.now() // Add timestamp for sorting
            };
            
            // Save back to localStorage
            localStorage.setItem('userPresets', JSON.stringify(presets));
            
            // Update dropdown
            this.updatePresetsDropdown();
            
            console.log(`Saved preset: ${presetName}`, presets[presetName]); // Debug log
            alert('Preset saved successfully!');
        } catch (error) {
            console.error('Error saving preset:', error);
            alert('Error saving preset. Please try again.');
        }
    }

    updatePresetsDropdown() {
        const presetsList = document.getElementById('userPresetsList');
        if (!presetsList) {
            console.error('Presets list element not found');
            return;
        }
        
        try {
            // Clear existing items
            presetsList.innerHTML = '';
            
            // Get presets from storage and log them
            const presetsString = localStorage.getItem('userPresets');
            console.log('Raw presets from storage:', presetsString);
            
            const presets = JSON.parse(presetsString || '{}');
            console.log('Parsed presets:', presets);
            
            // Sort presets alphabetically by name (case-insensitive)
            const sortedPresets = Object.entries(presets)
                .sort(([nameA], [nameB]) => nameA.toLowerCase().localeCompare(nameB.toLowerCase()));
            console.log('Sorted presets:', sortedPresets);
            
            // Add presets to dropdown
            sortedPresets.forEach(([name, values]) => {
                console.log(`Creating dropdown item for preset: ${name}`, values);
                
                const li = document.createElement('li');
                const a = document.createElement('a');
                a.className = 'dropdown-item';
                a.href = '#';
                
                // Create span for the text content
                const textSpan = document.createElement('span');
                const ncValues = `(${values.nc1}, ${values.nc2}, ${values.nc3})`;
                textSpan.textContent = `${name} ${ncValues}`;
                
                // Create button container for edit and delete
                const buttonContainer = document.createElement('div');
                buttonContainer.className = 'preset-buttons';
                
                // Create edit button
                const editBtn = document.createElement('button');
                editBtn.className = 'edit-button small-button';
                editBtn.textContent = '✎';
                editBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const newName = prompt('Enter new name for preset:', name);
                    if (newName && newName !== name) {
                        this.renamePreset(name, newName, values);
                    }
                });
                
                // Create delete button
                const deleteBtn = document.createElement('button');
                deleteBtn.className = 'delete-button small-button';
                deleteBtn.textContent = '×';
                deleteBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.deletePreset(name);
                });
                
                // Append buttons to container
                buttonContainer.appendChild(editBtn);
                buttonContainer.appendChild(deleteBtn);
                
                // Append in correct order
                a.appendChild(textSpan);
                a.appendChild(buttonContainer);
                li.appendChild(a);
                presetsList.appendChild(li);
                
                // Add click handler for loading preset
                a.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.loadPreset(name, values);
                });
            });
            
            console.log('Updated presets dropdown with', Object.keys(presets).length, 'items');
            console.log('Final dropdown HTML:', presetsList.innerHTML);
        } catch (error) {
            console.error('Detailed error in updatePresetsDropdown:', {
                error,
                message: error.message,
                stack: error.stack
            });
        }
    }

    loadPreset(name, values) {
        try {
            console.log('Starting preset load:', name);
            console.log('Input values:', values);

            // 1. Validate input values
            if (!values || typeof values !== 'object') {
                throw new Error('Invalid preset values');
            }

            // 2. Update vertex positions with validation
            const vertices = {
                n1: { 
                    x: parseFloat(values.n1?.x) || 0, 
                    y: parseFloat(values.n1?.y) || 0 
                },
                n2: { 
                    x: parseFloat(values.n2?.x) || 0, 
                    y: parseFloat(values.n2?.y) || 0 
                },
                n3: { 
                    x: parseFloat(values.n3?.x) || 0, 
                    y: parseFloat(values.n3?.y) || 0 
                }
            };

            console.log('Processed vertices:', vertices);

            // 3. Update system vertices
            this.system = {
                ...this.system,
                n1: vertices.n1,
                n2: vertices.n2,
                n3: vertices.n3,
                intelligence: { x: 0, y: 0 }  // Reset intelligence point
            };

            console.log('Updated system:', this.system);

            // 4. Recalculate all derived properties
            this.updateDerivedPoints();

            // 5. Force redraw and dashboard update
            this.drawSystem();
            this.updateDashboard();

            return true;
        } catch (error) {
            console.error('Detailed error in loadPreset:', {
                error,
                name,
                values,
                systemState: this.system
            });
            alert(`Error loading preset "${name}": ${error.message}`);
            return false;
        }
    }

    // Method to initialize all event listeners
    initializeEventListeners() {
        // Feature Toggle Buttons
        const featureButtons = [
            { id: 'toggleOrthocenter', property: 'showSpecialCenters' },
            { id: 'toggleCentroid', property: 'showCentroid' },
            { id: 'toggleIncenter', property: 'showIncenter' },
            { id: 'toggleMidpoints', property: 'showMidpoints' },
            { id: 'toggleTangents', property: 'showTangents' },
            { id: 'toggleMedians', property: 'showMedians' },
            { id: 'toggleSubsystems', property: 'showSubsystems' },
            { id: 'toggleSubtriangle', property: 'showSubtriangle' },  // New button
            { id: 'toggleEuler', property: 'showEuler' },
            { id: 'toggleCircumcenter', property: 'showCircumcenter' },
            { id: 'toggleNinePointCenter', property: 'showNinePointCenter' },
            { id: 'toggleNinePointCircle', property: 'showNinePointCircle' },
            { id: 'toggleIncircle', property: 'showIncircle' },
            { id: 'toggleCircumcircle', property: 'showCircumcircle' },
            { id: 'toggleSubcircle', property: 'showSubcircle' },  // New toggle
            { id: 'toggleAltitudes', property: 'showAltitudes' },  // Add this line
        ];

        featureButtons.forEach(button => {
            const element = document.getElementById(button.id);
            if (element) {
                
                element.addEventListener('click', () => {
                    console.log(`Toggle ${button.id}: ${!this[button.property]}`); // Add this line
                    this[button.property] = !this[button.property];
                    console.log(`Euler state: ${this.showEuler}`);  // Add debug log
                    element.classList.toggle('btn-info', this[button.property]);
                    element.classList.toggle('btn-secondary', !this[button.property]);
                    this.drawSystem();
                });
            } else {
                console.warn(`Button with ID ${button.id} not found.`);
            }
        });

        // Preset Buttons
        const presetButtons = [
            'equilateral',
            'isosceles',
            'scalene',
            'right',
            'acute',
            'obtuse',
        ];

        presetButtons.forEach(preset => {
            const element = document.getElementById(preset);
            if (element) {
                element.addEventListener('click', () => {
                    this.initializeSystem(preset);
                    this.drawSystem();
                    this.updateDashboard();  // This will call updateAnimationEndFields
                });
            } else {
                console.warn(`Preset button with ID ${preset} not found.`);
            }
        });

        // Dragging Functionality - Add these lines back
        this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
        this.canvas.addEventListener('mouseup', (e) => this.onMouseUp(e));
        this.canvas.addEventListener('mouseleave', (e) => this.onMouseUp(e));

        // Add Save button listener with debug logs
        console.log('Setting up Save button listener');
        const saveButton = document.getElementById('save-preset');
        if (saveButton) {
            console.log('Save button found');
            saveButton.addEventListener('click', () => {
                console.log('Save button clicked');
                this.saveCurrentConfig();
            });
        } else {
            console.error('Save button not found');
        }

        // Add Preset Dropdown Functionality
        const presetDropdown = document.getElementById('userPresetsList');
        const dropdownButton = document.getElementById('userPresetsDropdown');
        
        if (presetDropdown && dropdownButton) {
            // Load saved presets from localStorage
            const savedPresets = JSON.parse(localStorage.getItem('userPresets')) || {};
            console.log('Loaded presets from storage:', savedPresets);
            
            // Clear existing items
            presetDropdown.innerHTML = '';
            
            // Add each preset to the dropdown
            Object.entries(savedPresets).forEach(([name, config]) => {
                console.log('Adding preset to dropdown:', name, config);
                const item = document.createElement('li');
                const link = document.createElement('a');
                link.className = 'dropdown-item';
                link.href = '#';
                link.textContent = name;
                link.setAttribute('data-preset-name', name);  // Add data attribute
                item.appendChild(link);
                presetDropdown.appendChild(item);
            });

            // Add a single event listener to the dropdown container
            presetDropdown.addEventListener('click', (e) => {
                const link = e.target.closest('.dropdown-item');
                if (!link) return;
                
                e.preventDefault();
                e.stopPropagation();
                
                
            });

            // Initialize Bootstrap dropdown
            dropdownButton.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('Dropdown button clicked');
                presetDropdown.classList.toggle('show');
            });

            // Close dropdown when clicking outside
            document.addEventListener('click', (e) => {
                if (!dropdownButton.contains(e.target) && !presetDropdown.contains(e.target)) {
                    presetDropdown.classList.remove('show');
                }
            });
            
            
        }

        // Add Export button listener with correct ID
        const exportButton = document.getElementById('exportData');
        console.log('Export button found:', !!exportButton); // Debug log
        
        if (exportButton) {
            exportButton.addEventListener('click', () => {
                console.log('Export button clicked'); // Debug log
                this.exportToCSV();
            });
        } else {
            console.error('Export button not found');
        }

        // Add Image Export button listener
        const exportImageButton = document.getElementById('exportImage');
        if (exportImageButton) {
            exportImageButton.addEventListener('click', () => {
                console.log('Export Image button clicked');
                this.exportToImage();
            });
        } else {
            console.error('Export Image button not found');
        }

        // Animation button handlers
        const animateButtons = ['animate-button', 'animate-button-end'];
        const saveAnimationButtons = ['save-animation', 'save-animation-end'];

        // Add click handlers for both sets of animate buttons
        animateButtons.forEach(buttonId => {
            const button = document.getElementById(buttonId);
            if (button) {
                button.addEventListener('click', () => {
                    console.log('Animate button clicked');
                    this.startAnimation();
                });
            }
        });

        // Add click handlers for both sets of save buttons
        saveAnimationButtons.forEach(buttonId => {
            const button = document.getElementById(buttonId);
            if (button) {
                button.addEventListener('click', () => {
                    console.log('Save Animation button clicked');
                    this.saveCurrentAnimation();
                });
            }
        });

        // Add Subcenter toggle with null check
        const toggleSubcenterButton = document.getElementById('toggleSubcenter');
        if (toggleSubcenterButton) {
            toggleSubcenterButton.addEventListener('click', () => {
                this.showSubcenter = !this.showSubcenter;
                toggleSubcenterButton.classList.toggle('btn-info');
                
                // Always calculate and show coordinates when enabled
                if (this.showSubcenter) {
                    const subcircle = this.calculateSubcircle();
                    if (subcircle && subcircle.center) {
                        this.setElementValue('#subcenter-coords', 
                            `${subcircle.center.x.toFixed(1)}, ${subcircle.center.y.toFixed(1)}`);
                    }
                }
                
                this.drawSystem();
            });
        } else {
            console.warn('Subcenter toggle button not found');
        }
        
    }

    // Add these methods if they're missing
    onMouseDown(e) {
        console.log('Mouse Down Event Triggered');
        
        const rect = this.canvas.getBoundingClientRect();
        console.log('Canvas rect:', rect);
        console.log('Mouse event:', { clientX: e.clientX, clientY: e.clientY });
        console.log('Canvas dimensions:', { 
            width: this.canvas.width, 
            height: this.canvas.height,
            scale: this.scale
        });

        // Calculate mouse position relative to canvas
        const canvasX = e.clientX - rect.left;
        const canvasY = e.clientY - rect.top;
        console.log('Canvas relative coordinates:', { canvasX, canvasY });

        // Transform to our coordinate system
        const mouseX = (canvasX - this.canvas.width / 2) / (this.scale || 1);
        const mouseY = -(canvasY - this.canvas.height / 2) / (this.scale || 1);
        
        console.log('Transformed coordinates:', { mouseX, mouseY });

        // Check if click is near any node
        for (const node of ['n1', 'n2', 'n3']) {
            const nodePos = this.system[node];
            console.log(`Node ${node} position:`, nodePos);
            
            const distance = Math.sqrt(
                Math.pow(nodePos.x - mouseX, 2) + 
                Math.pow(nodePos.y - mouseY, 2)
            );
            
            console.log(`Distance to ${node}:`, distance);
            
            if (distance < 10 / (this.scale || 1)) {  // 10 pixel threshold for clicking
                this.draggedNode = node;
                console.log('Started dragging node:', node);
                break;
            }
        }
    }

    onMouseMove(e) {
        if (!this.draggedNode) return;
        
        console.log('Mouse Move with dragged node:', this.draggedNode);

        const rect = this.canvas.getBoundingClientRect();
        const canvasX = e.clientX - rect.left;
        const canvasY = e.clientY - rect.top;
        
        // Transform to our coordinate system
        const mouseX = (canvasX - this.canvas.width / 2) / (this.scale || 1);
        const mouseY = -(canvasY - this.canvas.height / 2) / (this.scale || 1);

        console.log('Moving to:', { mouseX, mouseY });

        // Update node position
        this.system[this.draggedNode].x = mouseX;
        this.system[this.draggedNode].y = mouseY;

        // Update the system
        this.updateDerivedPoints();
        this.drawSystem();
        this.updateDashboard();
    }

    onMouseUp(e) {
        if (this.draggedNode) {
            console.log('Stopped dragging node:', this.draggedNode);
        }
        this.draggedNode = null;
    }

    transformCoordinates(x, y) {
        return {
            x: this.roundToZero(x - this.canvas.width / 2),
            y: this.roundToZero(this.canvas.height / 2 - y)
        };
    }

    roundToZero(value, epsilon = 1e-10) {
        return Math.abs(value) < epsilon ? 0 : parseFloat(value.toFixed(4));
    }

    formatCoordinate(coord) {
        if (coord === undefined || coord === null || isNaN(coord)) {
            return '0.0000';
        }
        return this.roundToZero(coord).toFixed(4);
    }

    initializeSystem(preset) {
        try {
            console.log('Initializing system with preset:', preset);
            
            let rawTriangle;
            const side = 300;  // Base size

            if (preset === 'equilateral') {
                const height = side * Math.sin(60 * Math.PI/180);
                rawTriangle = {
                    n1: { x: 0, y: height },
                    n2: { x: side/2, y: 0 },
                    n3: { x: -side/2, y: 0 }
                };
            }
            else if (preset === 'isosceles') {
                // For 70-70-40 triangle
                const baseAngle = 70 * Math.PI/180;  // Base angles (70 degrees)
                const topAngle = 40 * Math.PI/180;   // Top angle (40 degrees)
                const baseLength = side * 0.9;        // Base reduced by 10%
                
                // Calculate height using trigonometry
                const height = (baseLength/2) * Math.tan(baseAngle);
                
                // Scale all coordinates by 0.9 to reduce size while maintaining angles
                rawTriangle = {
                    n1: { x: 0, y: height * 0.9 },           // Top vertex (40° angle)
                    n2: { x: baseLength/2 * 0.9, y: 0 },     // Right vertex (70° angle)
                    n3: { x: -baseLength/2 * 0.9, y: 0 }     // Left vertex (70° angle)
                };
            }
            else if (preset === 'scalene') {
                // Base length for scaling
                const baseLength = side * 0.9;  // Slightly smaller than equilateral
                
                // First, place N2 and N3 on the base
                const n2x = baseLength/2;
                const n2y = 0;
                const n3x = -baseLength/2;
                const n3y = 0;
                
                // Calculate N1 position to create 44° angle at N2 and 76° angle at N3
                const angleN2 = 44 * Math.PI/180;  // Convert 44° to radians
                const height = baseLength * Math.sin(angleN2);
                const offset = -baseLength * 0.2;  // Shift left to make angles asymmetric
                
                rawTriangle = {
                    n1: { x: offset, y: height },    // Top vertex (should give us 60°)
                    n2: { x: n2x, y: n2y },          // Right vertex (44°)
                    n3: { x: n3x, y: n3y }           // Left vertex (76°)
                };
            }
            else if (preset === 'right') {
                rawTriangle = {
                    n1: { x: 0, y: side },
                    n2: { x: side, y: 0 },
                    n3: { x: 0, y: 0 }
                };
            }
            else if (preset === 'acute') {
                // Base length for scaling
                const baseLength = side * 0.9;  // Slightly smaller than equilateral
                
                // First, place N2 and N3 on the base
                const n2x = baseLength/2;
                const n2y = 0;
                const n3x = -baseLength/2;
                const n3y = 0;
                
                // Calculate N1 position to create 35 angle at N2 and 85° angle at N3
                const angleN2 = 35 * Math.PI/180;  // Convert 35° to radians
                const height = baseLength * Math.sin(angleN2);
                const offset = -baseLength * 0.2;  // Shift left to make angles asymmetric
                
                rawTriangle = {
                    n1: { x: offset, y: height },    // Top vertex (should give us 60°)
                    n2: { x: n2x, y: n2y },          // Right vertex (35)
                    n3: { x: n3x, y: n3y }           // Left vertex (85°)
                };
            }
            else if (preset === 'obtuse') {
                // Define exact edge lengths
                const nc1 = 270;  // Red line (N1-N3)
                const nc2 = 215;  // Blue line (N1-N2)
                const nc3 = 400;  // Green line (N2-N3)
                
                // Place N3 at origin
                const n3x = 0;
                const n3y = 0;
                
                // Place N2 relative to N3 along x-axis
                const n2x = nc3;  // Length of N2-N3
                const n2y = 0;
                
                // Calculate N1 position using triangulation
                // We can use the law of cosines to find the angle at N3
                const cosN3 = (nc1*nc1 + nc3*nc3 - nc2*nc2) / (2*nc1*nc3);
                const angleN3 = Math.acos(cosN3);
                
                // Now we can find N1's position
                const n1x = nc1 * Math.cos(angleN3);
                const n1y = nc1 * Math.sin(angleN3);
                
                // Create the triangle with these coordinates
                rawTriangle = {
                    n1: { x: n1x, y: n1y },
                    n2: { x: n2x, y: n2y },
                    n3: { x: n3x, y: n3y }
                };
                
                // Center the triangle by calculating centroid and offsetting
                const centroidX = (n1x + n2x + n3x) / 3;
                const centroidY = (n1y + n2y + n3y) / 3;
                
                rawTriangle.n1.x -= centroidX;
                rawTriangle.n1.y -= centroidY;
                rawTriangle.n2.x -= centroidX;
                rawTriangle.n2.y -= centroidY;
                rawTriangle.n3.x -= centroidX;
                rawTriangle.n3.y -= centroidY;
            }

            if (!rawTriangle) {
                throw new Error(`Unknown preset type: ${preset}`);
            }

            console.log('Raw triangle calculated:', rawTriangle);

            // Calculate centroid
            const centroid = {
                x: (rawTriangle.n1.x + rawTriangle.n2.x + rawTriangle.n3.x) / 3,
                y: (rawTriangle.n1.y + rawTriangle.n2.y + rawTriangle.n3.y) / 3
            };

            // Center the triangle
            const centeredTriangle = {
                n1: { 
                    x: rawTriangle.n1.x - centroid.x, 
                    y: rawTriangle.n1.y - centroid.y 
                },
                n2: { 
                    x: rawTriangle.n2.x - centroid.x, 
                    y: rawTriangle.n2.y - centroid.y 
                },
                n3: { 
                    x: rawTriangle.n3.x - centroid.x, 
                    y: rawTriangle.n3.y - centroid.y 
                }
            };

            console.log('Centered triangle:', centeredTriangle);

            // Load the preset with the centered triangle
            return this.loadPreset(preset, centeredTriangle);

        } catch (error) {
            console.error('Error in initializeSystem:', error);
            alert(`Failed to initialize system: ${error.message}`);
            return false;
        }
    }

    setAcuteTriangle() {
        const baseLength = 200;  // NC3 length (between N2 and N3)
        const height = baseLength * Math.tan(60 * Math.PI / 180);  // Height for 60-degree angles

        this.system = {
            n1: { x: 0, y: 2 * height / 3 },                    // Top (Red)
            n2: { x: 100, y: -height / 3 },                     // Bottom Right (Blue)
            n3: { x: -100, y: -height / 3 },                    // Bottom Left (Green)
            intelligence: { x: 0, y: 0 }
        };

        this.updateDerivedPoints();
        this.updateDashboard();
        this.drawSystem();
    }

    adjustTriangleToOrigin() {
        const centroid = {
            x: (this.system.n1.x + this.system.n2.x + this.system.n3.x) / 3,
            y: (this.system.n1.y + this.system.n2.y + this.system.n3.y) / 3
        };

        const dx = -centroid.x;
        const dy = -centroid.y;

        this.system.n1.x += dx;
        this.system.n1.y += dy;
        this.system.n2.x += dx;
        this.system.n2.y += dy;
        this.system.n3.x += dx;
        this.system.n3.y += dy;

        this.system.intelligence = { x: 0, y: 0 };
    }

    
    updateDerivedPoints() {
        const { n1, n2, n3 } = this.system;
        
        // Calculate angles
        const angles = this.calculateAngles();
        
        // Calculate incenter using angle bisector theorem
        this.system.incenter = {
            x: (n1.x * Math.sin(angles.n1 * Math.PI / 180) +
                n2.x * Math.sin(angles.n2 * Math.PI / 180) +
                n3.x * Math.sin(angles.n3 * Math.PI / 180)) /
                (Math.sin(angles.n1 * Math.PI / 180) +
                    Math.sin(angles.n2 * Math.PI / 180) +
                    Math.sin(angles.n3 * Math.PI / 180)),
            y: (n1.y * Math.sin(angles.n1 * Math.PI / 180) +
                n2.y * Math.sin(angles.n2 * Math.PI / 180) +
                n3.y * Math.sin(angles.n3 * Math.PI / 180)) /
                (Math.sin(angles.n1 * Math.PI / 180) +
                    Math.sin(angles.n2 * Math.PI / 180) +
                    Math.sin(angles.n3 * Math.PI / 180))
        };

        // Calculate incircle radius
        const semiperimeter = this.calculatePerimeter() / 2;
        const area = this.calculateArea();
        this.system.incircleRadius = area / semiperimeter;

        // Update midpoints
        this.system.midpoints = this.calculateMidpoints();
        
        // Calculate tangency points
        this.system.TangencyPoints = this.calculateTangents();

        // Re-adjust triangle to maintain centroid's position after updating points
        this.adjustTriangleToOrigin();

        // Calculate circumcenter
        const circumcenter = this.calculateCircumcenter();
        this.system.circumcenter = circumcenter;
        
        // Calculate orthocenter
        const orthocenter = this.calculateOrthocenter();
        this.system.orthocenter = orthocenter;

        // Calculate subcenter
        const subcircle = this.calculateSubcircle();
        if (subcircle?.center) {
            this.system.subcenter = subcircle.center;
        }
        
        // Calculate nine-point center
        this.calculateNinePointCenter();

        console.log("Updated all centers:", {
            circumcenter: this.system.circumcenter,
            orthocenter: this.system.orthocenter,
            subcenter: this.system.subcenter,
            ninePointCenter: this.system.ninePointCenter
        });
    }

    /**
     * Calculates the Orthocenter of the triangle.
     * 
     * @returns {Object|null} An object containing the x and y coordinates of the orthocenter,
     *                        or null if the orthocenter cannot be determined.
     */
    calculateOrthocenter() {
        const { n1, n2, n3 } = this.system;
        const EPSILON = 1e-10;
        const roundNearZero = (value) => Math.abs(value) < EPSILON ? 0 : value;

        // Calculate slopes of sides
        const slope12 = this.calculateSlope(n1, n2);
        const slope23 = this.calculateSlope(n2, n3);
        const slope31 = this.calculateSlope(n3, n1);
        
        // Calculate slopes of altitudes (perpendicular to sides)
        const altSlope1 = Math.abs(slope23) < EPSILON ? Infinity : -1 / slope23;
        const altSlope2 = Math.abs(slope31) < EPSILON ? Infinity : -1 / slope31;
        
        // Calculate y-intercepts for altitude lines
        const b1 = n1.y - altSlope1 * n1.x;
        const b2 = n2.y - altSlope2 * n2.x;
        
        let orthocenter;
        
        if (Math.abs(altSlope1 - altSlope2) < EPSILON) {
            console.warn("Altitudes are parallel. Orthocenter is undefined.");
            return null;
        }

        if (altSlope1 === Infinity) {
            orthocenter = {
                x: roundNearZero(n1.x),
                y: roundNearZero(altSlope2 * n1.x + b2)
            };
        } else if (altSlope2 === Infinity) {
            orthocenter = {
                x: roundNearZero(n2.x),
                y: roundNearZero(altSlope1 * n2.x + b1)
            };
        } else {
            const x = roundNearZero((b2 - b1) / (altSlope1 - altSlope2));
            const y = roundNearZero(altSlope1 * x + b1);
            orthocenter = { x, y };
        }
        
        return orthocenter;
    }

    calculateNinePointCenter() {
        // Nine-point center is the midpoint between orthocenter and circumcenter
        if (this.system.orthocenter && this.system.circumcenter) {
            this.system.ninePointCenter = {
                x: (this.system.orthocenter.x + this.system.circumcenter.x) / 2,
                y: (this.system.orthocenter.y + this.system.circumcenter.y) / 2
            };
        }
    }

    updateDashboard() {
        try {
            if (!this.isSystemInitialized()) {
                console.log('System not fully initialized, skipping dashboard update');
                return;
            }

            // Initialize altitudePoints if not already set
            if (!this.altitudePoints) {
                this.altitudePoints = Array(3).fill({ x: 0, y: 0 });
            }

            // Try to calculate new altitude points only if system is properly initialized
            if (this.system && this.system.n1 && this.system.n2 && this.system.n3) {
                const altitudes = this.calculateAltitudes();
                if (altitudes) {
                    this.altitudePoints = [
                        altitudes.α1 || { x: 0, y: 0 },
                        altitudes.α2 || { x: 0, y: 0 },
                        altitudes.α3 || { x: 0, y: 0 }
                    ];
                }
            }

            // Update Altitudes panel values with defensive checks
            ['1', '2', '3'].forEach(i => {
                const altitudeCoordsId = `altitude${i}-coords`;
                const altitudeCoordsElement = document.getElementById(altitudeCoordsId);
                
                if (altitudeCoordsElement) {
                    const point = this.altitudePoints[i-1] || { x: 0, y: 0 };
                    const x = isNaN(point.x) ? 0 : point.x;
                    const y = isNaN(point.y) ? 0 : point.y;
                    altitudeCoordsElement.value = `${x.toFixed(1)}, ${y.toFixed(1)}`;
                }
            });

            // Helper function to set element value and handle missing elements
            const setElementValue = (selector, value, precision = 2) => {
                const element = document.querySelector(selector);
                if (element) {
                    element.value = typeof value === 'number' ? value.toFixed(precision) : value;
                }
            };

            // Calculate system values
            const area = this.calculateArea();
            const perimeter = this.calculatePerimeter();
            
            // Calculate and display inradius (rIN)
            const semiperimeter = perimeter / 2;
            const inradius = area / semiperimeter;
            setElementValue('#inradius', inradius);

            // Calculate and display incircle capacity (CIN = π * rIN²)
            const incircleCapacity = Math.PI * inradius * inradius;
            setElementValue('#incircle-capacity', incircleCapacity);

            // Calculate and display incircle entropy (HIN = 2π * rIN)
            const incircleEntropy = 2 * Math.PI * inradius;
            setElementValue('#incircle-entropy', incircleEntropy);

            // Debug log to check values
            console.log('Area calculation:', area);
            console.log('Perimeter calculation:', perimeter);

            // Update both dashboard and Information Panel
            
            setElementValue('#system-c', area.toFixed(2));  // Keep original ID
            setElementValue('#system-sph', perimeter);  // Perimeter is now shown as 'SPH'

            // Calculate and set SPH/A ratio
            if (area !== 0) {
                const sphAreaRatio = perimeter / area;
                setElementValue('#sph-area-ratio', sphAreaRatio.toFixed(4));  // Changed from #sph-b-ratio
                setElementValue('#b-sph-ratio', (1 / sphAreaRatio).toFixed(4));
            }

            // Nodes Panel
            const angles = this.calculateAngles();
            setElementValue('#node-n1-angle', angles.n1);
            setElementValue('#node-n2-angle', angles.n2);
            setElementValue('#node-n3-angle', angles.n3);

            // Channels (Edges) Panel
            const lengths = this.calculateLengths();
            setElementValue('#channel-1', lengths.l1); // NC1 (Red): N1 to N3
            setElementValue('#channel-2', lengths.l2); // NC2 (Blue): N1 to N2
            setElementValue('#channel-3', lengths.l3); // NC3 (Green): N2 to N3

            // Position Panel
            const centroid = {
                x: (this.system.n1.x + this.system.n2.x + this.system.n3.x) / 3,
                y: (this.system.n1.y + this.system.n2.y + this.system.n3.y) / 3
            };
            
            // Update vertex coordinates
            setElementValue('#node1-coords', `${this.system.n1.x.toFixed(1)}, ${this.system.n1.y.toFixed(1)}`);
            setElementValue('#node2-coords', `${this.system.n2.x.toFixed(1)}, ${this.system.n2.y.toFixed(1)}`);
            setElementValue('#node3-coords', `${this.system.n3.x.toFixed(1)}, ${this.system.n3.y.toFixed(1)}`);
            
            setElementValue('#centroid-coords', `${centroid.x.toFixed(1)}, ${centroid.y.toFixed(1)}`);
            
            if (this.system.incenter) {
                setElementValue('#incenter-coords', 
                    `${this.system.incenter.x.toFixed(1)}, ${this.system.incenter.y.toFixed(1)}`);
                
                // Update Information Panel distances and ratios
                setElementValue('#d-i-ic', this.calculateDistance(
                    { x: 0, y: 0 }, // Intelligence point is at origin
                    this.system.incenter
                ));
                setElementValue('#r-i-ic', this.calculateDistance(
                    { x: 0, y: 0 }, // Intelligence point is at origin
                    this.system.incenter
                ) / perimeter);
            }

            // Update subsystem metrics
            const subsystemAngles = this.calculateSubsystemAngles();
            const subsystemPerimeters = this.calculateSubsystemPerimeters();
            this.subsystemAreas = this.calculateSubsystemAreas();  // Update the class property
            
            for (let i = 1; i <= 3; i++) {
                const area = this.subsystemAreas[i-1];
                const perimeter = subsystemPerimeters[i-1];
                
                // Calculate both ratios (if perimeter is not zero)
                const ratio = area !== 0 ? perimeter / area : 0;
                const inverseRatio = perimeter !== 0 ? area / perimeter : 0;
                
                // Update displays
                setElementValue(`#subsystem-${i}-angle`, subsystemAngles[i-1].toFixed(2));
                setElementValue(`#subsystem-${i}-area`, area.toFixed(2));
                setElementValue(`#subsystem-${i}-perimeter`, perimeter.toFixed(2));
                setElementValue(`#subsystem-${i}-ratio`, ratio.toFixed(4));
                setElementValue(`#subsystem-${i}-inverse-ratio`, inverseRatio.toFixed(4));
            }

            // Panel Updates
            const { n1, n2, n3, incenter } = this.system;
            
            // Calculate midpoints (M) for each edge
            const midpoints = this.calculateMidpoints();
            
            // Calculate tangent points (T)
            const tangentPoints = this.calculateTangents();
            
            // Calculate d(M,T) distances for each node
            const dMT = {
                n1: this.calculateDistance(midpoints.m1, tangentPoints[0]), // For NC1
                n2: this.calculateDistance(midpoints.m2, tangentPoints[1]), // For NC2
                n3: this.calculateDistance(midpoints.m3, tangentPoints[2])  // For NC3
            };

            // Calculate r(M,T) ratios (distance divided by total perimeter)
            const rMT = {
                n1: perimeter !== 0 ? dMT.n1 / perimeter : 0,
                n2: perimeter !== 0 ? dMT.n2 / perimeter : 0,
                n3: perimeter !== 0 ? dMT.n3 / perimeter : 0
            };

            // Update Information Panel
            setElementValue('#d-m-t-n1', dMT.n1.toFixed(2));
            setElementValue('#d-m-t-n2', dMT.n2.toFixed(2));
            setElementValue('#d-m-t-n3', dMT.n3.toFixed(2));
            
            setElementValue('#r-m-t-n1', rMT.n1.toFixed(4));
            setElementValue('#r-m-t-n2', rMT.n2.toFixed(4));
            setElementValue('#r-m-t-n3', rMT.n3.toFixed(4));

            this.updateManualFields();

            // Update vertex coordinates in Position panel
            document.getElementById('node1-coords').value = `${n1.x.toFixed(1)}, ${n1.y.toFixed(1)}`;
            document.getElementById('node2-coords').value = `${n2.x.toFixed(1)}, ${n2.y.toFixed(1)}`;
            document.getElementById('node3-coords').value = `${n3.x.toFixed(1)}, ${n3.y.toFixed(1)}`;

            // Update circumcenter coordinates
            if (this.system.circumcenter) {
                const { x, y } = this.system.circumcenter;
                document.getElementById('circumcenter-coords').value = `${x.toFixed(1)}, ${y.toFixed(1)}`;
            }

            // Update orthocenter coordinates
            const orthocenter = this.calculateOrthocenter();
            if (orthocenter) {
                setElementValue('#orthocenter-coords', 
                    `${orthocenter.x.toFixed(1)}, ${orthocenter.y.toFixed(1)}`);
            }

            // Update nine-point center coordinates
            const ninePointCircle = this.calculateNinePointCircle();
            if (ninePointCircle && ninePointCircle.center) {
                setElementValue('#nine-point-coords', 
                    `${ninePointCircle.center.x.toFixed(1)}, ${ninePointCircle.center.y.toFixed(1)}`);
            }

            // Get the subsystem area (which is already calculated as system area / 3)
            const subsystemArea = area / 3;  // Using the existing 'area' variable

            // Update subsystem areas
            setElementValue('#subsystem-1-area', subsystemArea.toFixed(2));
            setElementValue('#subsystem-2-area', subsystemArea.toFixed(2));
            setElementValue('#subsystem-3-area', subsystemArea.toFixed(2));

            // Add CSS dynamically to ensure input fields are wide enough
            const style = document.createElement('style');
            style.textContent = `
                .subsystems-table input[type="text"] {
                    min-width: 90px !important;  /* Increased from current width */
                    width: auto !important;
                    text-align: right;
                }
            `;
            document.head.appendChild(style);

            // Calculate and update subsystem centroids
            const centroids = this.calculateSubsystemCentroids();
            const formatCoord = (x, y) => {
                const xStr = x.toFixed(1);  // Remove padStart
                const yStr = y.toFixed(1);  // Remove padStart
                return `${xStr},${yStr}`;   // No spaces, just comma
            };

            // Get the elements first with null checks
            const sphAreaRatioElement = document.getElementById('sph-area-ratio');
            const areaSphRatioElement = document.getElementById('area-sph-ratio');

            // Only proceed if both elements exist
            if (sphAreaRatioElement && areaSphRatioElement) {
                // Use the system's existing values instead of reading from DOM
                const sphValue = this.system.sph;
                const areaValue = this.system.area;
                
                if (sphValue && areaValue && areaValue !== 0) {
                    const ratio = sphValue / areaValue;
                    sphAreaRatioElement.value = ratio.toFixed(4);
                    areaSphRatioElement.value = (1 / ratio).toFixed(4);
                }
            }  // Close the first if block

            // Calculate I-Channel Entropy) - Update selectors to match HTML
            const ic1 = parseFloat(document.getElementById('ic-1')?.value) || 0;
            const ic2 = parseFloat(document.getElementById('ic-2')?.value) || 0;
            const ic3 = parseFloat(document.getElementById('ic-3')?.value) || 0;
            const hic = ic1 + ic2 + ic3;
            setElementValue('#system-mch', hic.toFixed(2));
            console.log('Updated HIC calculation:', {
                ic1, ic2, ic3,
                total: hic,
                elementId: 'system-mch'
            });

            // Get System Perimeter Entropy (HP) - Update selector to match HTML
            const hp = parseFloat(document.querySelector('#system-sph')?.value) || 0;

            // Calculate Total System Entropy (H = HP + MCH)
            const totalSystemEntropy = hp + hic;
            setElementValue('#system-h', totalSystemEntropy.toFixed(2));

            // Get system capacity (C) value - Update selector to match HTML
            const systemCapacity = parseFloat(document.querySelector('#system-c')?.value) || 0;

            

            // Calculate and update ssh/H ratios for each subsystem
            for (let i = 1; i <= 3; i++) {
                const perimeter = subsystemPerimeters[i-1];
                const sshHRatio = totalSystemEntropy !== 0 ? perimeter / totalSystemEntropy : 0;
                setElementValue(`#subsystem-${i}-entropy-ratio`, sshHRatio.toFixed(4));
            }

            // Only try to update mc-h if it exists
            const mcHElement = document.querySelector('#mc-h');
            if (mcHElement) {
                setElementValue('#mc-h', hic.toFixed(2));
            }

            // Calculate subchannels (distances between centroids)
            const subchannels = {
                sc1: this.calculateDistance(centroids.ss1, centroids.ss3), // SS1 to SS3
                sc2: this.calculateDistance(centroids.ss1, centroids.ss2), // SS1 to SS2
                sc3: this.calculateDistance(centroids.ss2, centroids.ss3)  // SS2 to SS3
            };

            // Add subchannel calculations right after the existing centroid updates
            setElementValue('#subchannel-1', this.calculateDistance(centroids.ss1, centroids.ss3).toFixed(2)); // SS1 to SS3
            setElementValue('#subchannel-2', this.calculateDistance(centroids.ss1, centroids.ss2).toFixed(2)); // SS1 to SS2
            setElementValue('#subchannel-3', this.calculateDistance(centroids.ss2, centroids.ss3).toFixed(2)); // SS2 to SS3

            // Calculate HST (Entropy of Subtriangle) - sum of SC values
            const sc1 = parseFloat(document.querySelector('#subchannel-1').value) || 0;
            const sc2 = parseFloat(document.querySelector('#subchannel-2').value) || 0;
            const sc3 = parseFloat(document.querySelector('#subchannel-3').value) || 0;
            const subtrianglePerimeter = sc1 + sc2 + sc3;

            // Update HST values
            setElementValue('#subsystem-1-hst', subtrianglePerimeter.toFixed(2));
            setElementValue('#subsystem-2-hst', subtrianglePerimeter.toFixed(2));
            setElementValue('#subsystem-3-hst', subtrianglePerimeter.toFixed(2));

            // Update subcenter coordinates using existing calculateSubcircle method
            const subcircle = this.calculateSubcircle();
            if (subcircle && subcircle.center) {
                setElementValue('#subcenter-coords', 
                    `${subcircle.center.x.toFixed(1)}, ${subcircle.center.y.toFixed(1)}`);
            }

            // Calculate new Capacity (C) value using area
            const capacity = this.calculateArea();
            
            // Update capacity value in System Entropy and Capacity panel
            setElementValue('#system-c', capacity.toFixed(2));  // Keep original ID

            // Calculate and update ratios using the new capacity value
            if (capacity !== 0) {
                // H/C and C/H ratios
                if (totalSystemEntropy !== 0) {
                    setElementValue('#sh-b-ratio', (totalSystemEntropy / capacity).toFixed(4));
                    setElementValue('#b-sh-ratio', (capacity / totalSystemEntropy).toFixed(4));
                }
                
                // HP/C and C/HP ratios
                if (hp !== 0 && systemCapacity !== 0) {
                    setElementValue('#sph-area-ratio', (hp / capacity).toFixed(4));
                    setElementValue('#b-sph-ratio', (systemCapacity / hp).toFixed(4));
                }
                
                // HMC/C and C/HMC ratios
                if (hic !== 0) {
                    setElementValue('#mch-b-ratio', (hic / capacity).toFixed(4));
                    setElementValue('#b-mch-ratio', (capacity / hic).toFixed(4));
                }
            }

            // Update Subtriangle Panel
            // Calculate centroids for each subsystem and store them
            const subtriangleCentroids = {
                ss1: this.calculateSubsystemCentroid(1),
                ss2: this.calculateSubsystemCentroid(2),
                ss3: this.calculateSubsystemCentroid(3)
            };

            // Only update if we have valid centroids
            if (subtriangleCentroids.ss1.x !== 0 || subtriangleCentroids.ss1.y !== 0) {
                // Update centroid coordinates display
                setElementValue('#subsystem-1-centroid', 
                    `${subtriangleCentroids.ss1.x.toFixed(1)}, ${subtriangleCentroids.ss1.y.toFixed(1)}`);
                setElementValue('#subsystem-2-centroid', 
                    `${subtriangleCentroids.ss2.x.toFixed(1)}, ${subtriangleCentroids.ss2.y.toFixed(1)}`);
                setElementValue('#subsystem-3-centroid', 
                    `${subtriangleCentroids.ss3.x.toFixed(1)}, ${subtriangleCentroids.ss3.y.toFixed(1)}`);

                // Calculate subchannels (distances between centroids)
                const subchannelDistances = {
                    sc1: this.calculateDistance(subtriangleCentroids.ss2, subtriangleCentroids.ss3),
                    sc2: this.calculateDistance(subtriangleCentroids.ss1, subtriangleCentroids.ss3),
                    sc3: this.calculateDistance(subtriangleCentroids.ss1, subtriangleCentroids.ss2)
                };

                // Update subchannel values
                setElementValue('#subchannel-1', subchannelDistances.sc1.toFixed(2));
                setElementValue('#subchannel-2', subchannelDistances.sc2.toFixed(2));
                setElementValue('#subchannel-3', subchannelDistances.sc3.toFixed(2));

                // Calculate HST and CST
                const subtriangle_hst = subchannelDistances.sc1 + 
                                          subchannelDistances.sc2 + 
                                          subchannelDistances.sc3;
                const subtriangle_cst = this.calculateSubtriangleArea(subtriangleCentroids);

                setElementValue('#subtriangle-hst', subtriangle_hst.toFixed(2));
                setElementValue('#subtriangle-cst', subtriangle_cst.toFixed(2));

                // Update ratios
                if (subtriangle_cst !== 0 && subtriangle_hst !== 0) {
                    setElementValue('#hst-cst-ratio', (subtriangle_hst / subtriangle_cst).toFixed(4));
                    setElementValue('#cst-hst-ratio', (subtriangle_cst / subtriangle_hst).toFixed(4));
                }
            }

            // Add Euler Line measurements with proper element selection
            const eulerMetrics = this.calculateEulerLineMetrics();
            if (eulerMetrics) {
                // Existing Euler Line metric updates
                document.getElementById('euler-line-length').value = eulerMetrics.eulerLineLength;
                document.getElementById('euler-line-slope').value = eulerMetrics.eulerLineSlope;
                document.getElementById('euler-line-angle').value = eulerMetrics.eulerLineAngle;
                document.getElementById('o-i-ratio').value = eulerMetrics.oToIRatio;
                document.getElementById('i-sp-ratio').value = eulerMetrics.iToSPRatio;
                document.getElementById('sp-np-ratio').value = eulerMetrics.spToNPRatio;
                document.getElementById('np-ho-ratio').value = eulerMetrics.npToHORatio;

                // Add new intersection angle updates
                if (eulerMetrics.intersectionAngles) {
                    document.getElementById('nc1-acute').value = eulerMetrics.intersectionAngles.nc1_acute;
                    document.getElementById('nc1-obtuse').value = eulerMetrics.intersectionAngles.nc1_obtuse;
                    document.getElementById('nc2-acute').value = eulerMetrics.intersectionAngles.nc2_acute;
                    document.getElementById('nc2-obtuse').value = eulerMetrics.intersectionAngles.nc2_obtuse;
                    document.getElementById('nc3-acute').value = eulerMetrics.intersectionAngles.nc3_acute;
                    document.getElementById('nc3-obtuse').value = eulerMetrics.intersectionAngles.nc3_obtuse;
                }
            }

            // Inside updateDashboard() method, where other ratios are calculated
            if (hp !== 0 && hic !== 0) {
                // HP/HIC and HIC/HP ratios
                setElementValue('#hp-hic-ratio', (hp / hic).toFixed(4));
                setElementValue('#hic-hp-ratio', (hic / hp).toFixed(4));
            }

            if (totalSystemEntropy !== 0) {
                // HP/H and H/HP ratios
                setElementValue('#hp-h-ratio', (hp / totalSystemEntropy).toFixed(4));
                setElementValue('#h-hp-ratio', (totalSystemEntropy / hp).toFixed(4));
                
                // HIC/H and H/HIC ratios
                setElementValue('#hic-h-ratio', (hic / totalSystemEntropy).toFixed(4));
                setElementValue('#h-hic-ratio', (totalSystemEntropy / hic).toFixed(4));
            }

            // Calculate d(I,IN) - distance between centroid and incenter
            if (this.system.incenter) {
            const centroid = this.calculateCentroid();
                const dIIN = this.calculateDistance(centroid, this.system.incenter);
                setElementValue('#d-i-in', dIIN.toFixed(2));

                // Calculate distances between Incenter and Subsystem centroids
                const subsystemCentroids = this.calculateSubsystemCentroids();
                
                // Calculate and set distances between Incenter and each subsystem centroid
                const dINssi1 = this.calculateDistance(this.system.incenter, subsystemCentroids.ss1);
                const dINssi2 = this.calculateDistance(this.system.incenter, subsystemCentroids.ss2);
                const dINssi3 = this.calculateDistance(this.system.incenter, subsystemCentroids.ss3);

                setElementValue('#d-in-ssi1', dINssi1.toFixed(2));
                setElementValue('#d-in-ssi2', dINssi2.toFixed(2));
                setElementValue('#d-in-ssi3', dINssi3.toFixed(2));
            }

            this.updateICFields();
            this.updateRNCMTFields();  // Add this line

            // Add after line 1177 (after calculating incircleEntropy)
            // Calculate Incircle ratios
            if (incircleEntropy !== 0) {
                // CIN/HIN and HIN/CIN ratios
                setElementValue('#cin-hin-ratio', (incircleCapacity / incircleEntropy).toFixed(4));
                setElementValue('#hin-cin-ratio', (incircleEntropy / incircleCapacity).toFixed(4));
                
                // Add CIN/C ratio (using systemCapacity)
                if (systemCapacity !== 0) {
                    setElementValue('#cin-c-ratio', (incircleCapacity / systemCapacity).toFixed(4));
                }
                
                // Add HIN/H ratio (using totalSystemEntropy)
                if (totalSystemEntropy !== 0) {
                    setElementValue('#hin-h-ratio', (incircleEntropy / totalSystemEntropy).toFixed(4));
                }
            }

            // Update subsystems table
            for (let i = 1; i <= 3; i++) {
                const centroid = this.calculateCentroid();
                
                // Calculate ssh (subsystem entropy/perimeter) first
                let ssh;
                if (i === 1) {
                    // SS1 (red): NC1 + IC1 + IC3
                    ssh = this.calculateDistance(this.system.n1, this.system.n3) +  // NC1
                         this.calculateDistance(this.system.n1, centroid) +         // IC1
                         this.calculateDistance(this.system.n3, centroid);          // IC3
                } else if (i === 2) {
                    // SS2 (blue): NC2 + IC1 + IC2
                    ssh = this.calculateDistance(this.system.n1, this.system.n2) +  // NC2
                         this.calculateDistance(this.system.n1, centroid) +         // IC1
                         this.calculateDistance(this.system.n2, centroid);          // IC2
                } else {
                    // SS3 (green): NC3 + IC2 + IC3
                    ssh = this.calculateDistance(this.system.n2, this.system.n3) +  // NC3
                         this.calculateDistance(this.system.n2, centroid) +         // IC2
                         this.calculateDistance(this.system.n3, centroid);          // IC3
                }
                
                // Update ssh value
                setElementValue(`#subsystem-${i}-perimeter`, ssh.toFixed(4));
                
                // Calculate capacity (ssc)
                const capacity = this.calculateSubsystemCapacity(i);
                setElementValue(`#subsystem-${i}-area`, capacity.toFixed(4));
                
                // Update ratios only if capacity is not zero
                if (capacity !== 0) {
                    // Update ssh/ssc ratio
                    const sshSscRatio = ssh / capacity;
                    setElementValue(`#subsystem-${i}-ratio`, sshSscRatio.toFixed(4));
                    
                    // Update ssc/ssh ratio
                    const sscSshRatio = capacity / ssh;
                    setElementValue(`#subsystem-${i}-inverse-ratio`, sscSshRatio.toFixed(4));
                }
                
                // Update entropy ratios separately
                if (totalSystemEntropy !== 0 && ssh !== 0) {
                    // Update ssh/H ratio (System Entropy Ratio)
                    setElementValue(`#subsystem-${i}-system-ratio`, (ssh/totalSystemEntropy).toFixed(4));
                    
                    // Update H/ssh ratio (Inverse System entropy ratio)
                    setElementValue(`#subsystem-${i}-entropy-ratio`, (totalSystemEntropy/ssh).toFixed(4));
                }
            }

            // Draw IC lines if enabled (after drawing nodes but before special centers)
            if (this.showIC) {
                this.drawICLines(this.ctx);
            }

            // Update altitude coordinates and lengths
            const altitudes = this.calculateAltitudes();
            ['1', '2', '3'].forEach(i => {
                const foot = altitudes[`α${i}`];
                const length = altitudes.lengths[`α${i}`];
                
                setElementValue(
                    `#altitude${i}-coords`,
                    `${foot.x.toFixed(1)}, ${foot.y.toFixed(1)}`
                );
                setElementValue(
                    `#altitude${i}-length`,
                    length.toFixed(2)
                );
            });

            // Update Medians panel - Display Full Medians
            const fullMedians = this.calculateFullMedians();
            ['1', '2', '3'].forEach(i => {
                const m = fullMedians[`m${i}`];
                if (m) {
                    // Update median coordinates
                    setElementValue(
                        `#mid${i}-coords`,
                        `${m.point.x.toFixed(1)}, ${m.point.y.toFixed(1)}`
                    );
                    console.log(`Updated mid${i}-coords: ${m.point.x.toFixed(1)}, ${m.point.y.toFixed(1)}`);
                    
                    // Update median lengths with correct mapping
                    let medianLengthId;
                    switch(i) {
                        case '1':
                            medianLengthId = '#median2-length'; // N2 to M1
                            break;
                        case '2':
                            medianLengthId = '#median3-length'; // N3 to M2
                            break;
                        case '3':
                            medianLengthId = '#median1-length'; // N1 to M3
                            break;
                    }
                    
                    setElementValue(medianLengthId, m.length.toFixed(2));
                    console.log(`Updated ${medianLengthId}: ${m.length.toFixed(2)}`);
                } else {
                    console.warn(`Full median data not found for m${i}`);
                }
            });

            // Draw altitudes if enabled
            if (this.showAltitudes) {
                const altitudes = this.calculateAltitudes();
                
                // Set up the dotted line style
                this.ctx.setLineDash([5, 5]);
                this.ctx.strokeStyle = '#b600ff';  // Purple color
                this.ctx.lineWidth = 2;

                // Draw altitude lines
                this.ctx.beginPath();
                // Altitude from N1
                this.ctx.moveTo(this.system.n1.x, this.system.n1.y);
                this.ctx.lineTo(altitudes.α1.x, altitudes.α1.y);
                // Altitude from N2
                this.ctx.moveTo(this.system.n2.x, this.system.n2.y);
                this.ctx.lineTo(altitudes.α2.x, altitudes.α2.y);
                // Altitude from N3
                this.ctx.moveTo(this.system.n3.x, this.system.n3.y);
                this.ctx.lineTo(altitudes.α3.x, altitudes.α3.y);
                this.ctx.stroke();

                // Reset line dash and draw feet points
                this.ctx.setLineDash([]);
                this.ctx.fillStyle = '#b600ff';
                
                // Draw feet points
                ['α1', 'α2', 'α3'].forEach(foot => {
                    this.ctx.beginPath();
                    this.ctx.arc(altitudes[foot].x, altitudes[foot].y, 4, 0, 2 * Math.PI);
                    this.ctx.fill();
                });
            }

            // Update the display value
            this.updateDisplayValue();

            // Update Altitudes panel values
            ['1', '2', '3'].forEach(i => {
                const altitudeCoordsId = `altitude${i}-coords`;
                const altitudeCoordsElement = document.getElementById(altitudeCoordsId);
                
                if (altitudeCoordsElement) {
                    // Check if altitudePoints exists and has the required index
                    if (this.altitudePoints && this.altitudePoints[i-1]) {
                        const point = this.altitudePoints[i-1];
                        const x = isNaN(point.x) ? 0 : point.x;
                        const y = isNaN(point.y) ? 0 : point.y;
                        altitudeCoordsElement.value = `${x.toFixed(1)}, ${y.toFixed(1)}`;
                    } else {
                        // If no valid altitude point exists, display zeros
                        altitudeCoordsElement.value = '0.0, 0.0';
                    }
                }
            });

            // Update subsystem sc values - make these optional
            for (let i = 1; i <= 3; i++) {
                const scElement = document.getElementById(`subsystem-${i}-sc`);
                if (scElement) {  // Only update if element exists
                    const ic = this.calculateDistance(centroid, this.system[`n${i}`]);
                    scElement.value = ic.toFixed(2);
                }
            }

            // Example line that might cause the error
            const firstArea = this.subsystemAreas[0];

            // Update tangent point coordinates
            if (this.tangentPoints || this.system.tangentPoints) {
                const points = this.tangentPoints || this.system.tangentPoints;
                ['1', '2', '3'].forEach(i => {
                    const inputElement = document.getElementById(`tan${i}-coords`);
                    
                    if (inputElement && points[i-1]) {
                        const point = points[i-1];
                        // Remove parentheses, just use comma-separated values
                        const coordString = `${this.formatValue(point.x)}, ${this.formatValue(point.y)}`;
                        inputElement.value = coordString;
                        console.log(`Set T${i} to:`, coordString);
                    } else {
                        if (inputElement) {
                            inputElement.value = '-, -';
                        }
                        console.warn(`Issue with T${i}`);
                    }
                });
                
            } else {
                console.warn('No tangent points available');
                ['1', '2', '3'].forEach(i => {
                    const inputElement = document.getElementById(`tan${i}-coords`);
                    if (inputElement) {
                        inputElement.value = '-, -';
                    }
                });
            }

        } catch (error) {
            console.error('Error updating dashboard:', error);
        }
    }
    
    calculateSubsystemAngles() {
        const centroid = this.calculateCentroid();
        
        // Calculate vectors from centroid to each node
        const vectors = {
            n1: { 
                x: this.system.n1.x - centroid.x, 
                y: this.system.n1.y - centroid.y 
            },
            n2: { 
                x: this.system.n2.x - centroid.x, 
                y: this.system.n2.y - centroid.y 
            },
            n3: { 
                x: this.system.n3.x - centroid.x, 
                y: this.system.n3.y - centroid.y 
            }
        };

        // Calculate angles at centroid (I) for each subsystem
        return [
            // SS1 (red): angle at I between IC1 and IC3
            this.calculateAngleBetweenVectors(vectors.n1, vectors.n3),
            
            // SS2 (blue): angle at I between IC1 and IC2
            this.calculateAngleBetweenVectors(vectors.n1, vectors.n2),
            
            // SS3 (green): angle at I between IC2 and IC3
            this.calculateAngleBetweenVectors(vectors.n2, vectors.n3)
        ];
    }

    calculateAngleBetweenVectors(v1, v2) {
        // Calculate dot product
        const dotProduct = v1.x * v2.x + v1.y * v2.y;
        
        // Calculate magnitudes
        const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
        const mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);
        
        // Calculate angle in degrees
        const angleRad = Math.acos(dotProduct / (mag1 * mag2));
        return (angleRad * 180) / Math.PI;
    }

    calculateSubsystemPerimeters() {
        const centroid = this.calculateCentroid();
        
        return [
            // SS1 (red): N1-N3-I
            this.calculateDistance(this.system.n1, this.system.n3) +
            this.calculateDistance(this.system.n3, centroid) +
            this.calculateDistance(centroid, this.system.n1),
            
            // SS2 (blue): N1-N2-I
            this.calculateDistance(this.system.n1, this.system.n2) +
            this.calculateDistance(this.system.n2, centroid) +
            this.calculateDistance(centroid, this.system.n1),
            
            // SS3 (green): N2-N3-I
            this.calculateDistance(this.system.n2, this.system.n3) +
            this.calculateDistance(this.system.n3, centroid) +
            this.calculateDistance(centroid, this.system.n2)
        ];
    }

    calculateSubsystemAreas() {
        const centroid = this.calculateCentroid();
        
        return [
            // SS1 (red): N1-N3-I
            this.calculateTriangleArea(this.system.n1, this.system.n3, centroid),
            
            // SS2 (blue): N1-N2-I
            this.calculateTriangleArea(this.system.n1, this.system.n2, centroid),
            
            // SS3 (green): N2-N3-I
            this.calculateTriangleArea(this.system.n2, this.system.n3, centroid)
        ];
    }

    calculateTriangleArea(p1, p2, p3) {
        return Math.abs(
            (p1.x * (p2.y - p3.y) +
             p2.x * (p3.y - p1.y) +
             p3.x * (p1.y - p2.y)) / 2
        );  // Fixed parentheses here
    }

    formatValue(value) {
        if (typeof value === 'number') {
            if (Math.abs(value) >= 1e5 || (Math.abs(value) < 1e-5 && value !== 0)) {
                return value.toExponential(2);
            } else {
                return value.toFixed(2);
            }
        }
        return value.toString();
    }

    drawSystem() {
        try {
            if (!this.isSystemInitialized()) {
                return;
            }

            // Clear canvas
            this.ctx.clearRect(-this.canvas.width/2, -this.canvas.height/2, 
                              this.canvas.width, this.canvas.height);

            // Draw base triangle first
            this.drawTriangle();

            // Draw Euler line if enabled
            if (this.showEuler) {
                console.log("Drawing Euler line");
                this.drawEulerLine(this.ctx);
            }

            // Draw axes for reference
            this.drawAxes(this.ctx);
            
            // Draw edges first
            this.drawEdges(this.ctx);
            
            // Draw nodes on top
            this.drawNodes(this.ctx);
            
            // Draw features
            if (this.showSubsystems) this.drawSubsystems(this.ctx);
            if (this.showMidpoints) this.drawMidpoints(this.ctx);
            if (this.showMedians) this.drawMedians(this.ctx);
            if (this.showIncircle) this.drawIncircle(this.ctx);
            if (this.showIncenter) this.drawIncenter(this.ctx);  // New separate method for incenter
            if (this.showTangents) this.drawTangents(this.ctx);
            if (this.showCentroid) this.drawCentroid(this.ctx);
            if (this.showSubsystems) this.drawSubsystems(this.ctx);
            if (this.showSubtriangle) this.drawSubtriangle(this.ctx);
            if (this.showSubcircle) this.drawSubcircle(this.ctx);
            
            // Always draw angles
            this.drawAngles(this.ctx);

            // Draw edge length labels
            this.ctx.save();  // Save current context state
            
            // Reset text orientation and scale for labels
            this.ctx.scale(1, -1);  // Flip back for text
            
            this.ctx.font = '14px Arial';
            
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';

            // Calculate edge midpoints
            const nc1Mid = this.calculateMidpoint(this.system.n1, this.system.n3);
            const nc2Mid = this.calculateMidpoint(this.system.n1, this.system.n2);
            const nc3Mid = this.calculateMidpoint(this.system.n2, this.system.n3);

            // Calculate triangle centroid for reference
            const centroid = {
                x: (this.system.n1.x + this.system.n2.x + this.system.n3.x) / 3,
                y: (this.system.n1.y + this.system.n2.y + this.system.n3.y) / 3
            };

            // Calculate edge lengths
            const nc1Length = this.calculateDistance(this.system.n1, this.system.n3).toFixed(2);
            const nc2Length = this.calculateDistance(this.system.n1, this.system.n2).toFixed(2);
            const nc3Length = this.calculateDistance(this.system.n2, this.system.n3).toFixed(2);

            const baseOffset = 35; // Base offset distance

            // NC1 label (left edge)
            const nc1Dir = {
                x: nc1Mid.x - centroid.x,
                y: nc1Mid.y - centroid.y
            };
            const nc1Dist = Math.sqrt(nc1Dir.x * nc1Dir.x + nc1Dir.y * nc1Dir.y);
            this.ctx.fillStyle = '#FF073A';
            this.ctx.fillText(nc1Length, 
                nc1Mid.x + (nc1Dir.x / nc1Dist) * baseOffset,
                -(nc1Mid.y + (nc1Dir.y / nc1Dist) * baseOffset)
            );

            // NC2 label (right edge)
            const nc2Dir = {
                x: nc2Mid.x - centroid.x,
                y: nc2Mid.y - centroid.y
            };
            const nc2Dist = Math.sqrt(nc2Dir.x * nc2Dir.x + nc2Dir.y * nc2Dir.y);
            this.ctx.fillStyle = '#0692f5';
            this.ctx.fillText(nc2Length,
                nc2Mid.x + (nc2Dir.x / nc2Dist) * baseOffset,
                -(nc2Mid.y + (nc2Dir.y / nc2Dist) * baseOffset)
            );

            // NC3 label (bottom edge)
            const nc3Dir = {
                x: nc3Mid.x - centroid.x,
                y: nc3Mid.y - centroid.y
            };
            const nc3Dist = Math.sqrt(nc3Dir.x * nc3Dir.x + nc3Dir.y * nc3Dir.y);
            this.ctx.fillStyle = '#44FF44';
            this.ctx.fillText(nc3Length,
                nc3Mid.x + (nc3Dir.x / nc3Dist) * baseOffset,
                -(nc3Mid.y + (nc3Dir.y / nc3Dist) * baseOffset)
            );

            this.ctx.restore();

            // Draw special centers if enabled
            if (this.showSpecialCenters) {
                console.log("Drawing special centers with state:", {
                    showSpecialCenters: this.showSpecialCenters,
                    orthocenter: this.system.orthocenter
                });

                // Draw orthocenter point and label
                if (this.system.orthocenter) {
                    this.ctx.beginPath();
                    this.ctx.fillStyle = '#b600ff';  // Update to match altitude purple
                    this.ctx.arc(
                        this.system.orthocenter.x,
                        this.system.orthocenter.y,
                        4,
                        0,
                        2 * Math.PI
                    );
                    this.ctx.fill();

                    // Label 'HO' for orthocenter
                    this.ctx.save();
                    this.ctx.scale(1, -1);  // Flip text right-side up
                    this.ctx.fillStyle = '#b600ff';  // Update to match altitude purple
                    this.ctx.font = '12px Arial';
                    this.ctx.fillText('HO', this.system.orthocenter.x + 10, -this.system.orthocenter.y);
                    this.ctx.restore();
                }
            }

            // Separate drawing of nine-point center and circle
            if (this.showNinePointCenter) {
                const ninePointCircle = this.calculateNinePointCircle();
                if (ninePointCircle && ninePointCircle.center) {
                    // Draw just the center point
                    this.ctx.beginPath();
                    this.ctx.fillStyle = '#FF00FF';  // White
                    this.ctx.arc(
                        ninePointCircle.center.x,
                        ninePointCircle.center.y,
                        4,
                        0,
                        2 * Math.PI
                    );
                    this.ctx.fill();

                    // Update label from 'N' to 'NP'
                    this.ctx.save();
                    this.ctx.scale(1, -1);
                    this.ctx.fillStyle = '#FF00FF';
                    this.ctx.font = '12px Arial';
                    this.ctx.fillText('NP', ninePointCircle.center.x + 10, -ninePointCircle.center.y);
                    this.ctx.restore();
                }
            }

            if (this.showNinePointCircle) {
                const ninePointCircle = this.calculateNinePointCircle();
                if (ninePointCircle && ninePointCircle.center && ninePointCircle.radius) {
                    // Draw just the circle
                    this.ctx.beginPath();
                    this.ctx.strokeStyle = '#FF00FF';  // White
                    this.ctx.setLineDash([5, 5]);
                    this.ctx.lineWidth = 1;
                    this.ctx.arc(
                        ninePointCircle.center.x,
                        ninePointCircle.center.y,
                        ninePointCircle.radius,
                        0,
                        2 * Math.PI
                    );
                    this.ctx.stroke();
                    this.ctx.setLineDash([]);
                }
            }

            if (this.showCircumcenter) {
                const circumcenter = this.calculateCircumcenter();
                if (circumcenter) {
                    this.ctx.beginPath();
                    this.ctx.fillStyle = '#F7F107';  // Green color
                    this.ctx.arc(
                        circumcenter.x,
                        circumcenter.y,
                        4,
                        0,
                        2 * Math.PI
                    );
                    this.ctx.fill();

                    // Label 'O' for circumcenter
                    this.ctx.save();
                    this.ctx.scale(1, -1);
                    this.ctx.fillStyle = '#F7F107';
                    this.ctx.font = '12px Arial';
                    this.ctx.fillText('O', circumcenter.x + 10, -circumcenter.y);
                    this.ctx.restore();
                }
            }

            if (this.showCircumcircle) {
                this.drawCircumcircle(this.ctx);
            }

            // Draw Exponential Point if enabled
            if (this.showExpo) {
                this.drawExponentialPoint(this.ctx);
            }

            // Draw Subtriangle if enabled
            if (this.showSubtriangle) {
                this.drawSubtriangle(this.ctx);
            }

            // Draw Subcenter if enabled
            if (this.showSubcenter) {
                this.drawSubcenter(this.ctx);
            }

            // Draw Subcircle if enabled
            if (this.showSubcircle) {
                this.drawSubcircle(this.ctx);
            }

            // Draw IC lines if enabled (after drawing nodes but before special centers)
            if (this.showIC) {
                this.drawICLines(this.ctx);
            }

            // Draw altitudes if enabled
            if (this.showAltitudes) {
                const altitudes = this.calculateAltitudes();
                
                // Set up the dotted line style
                this.ctx.setLineDash([5, 5]);
                this.ctx.strokeStyle = '#b600ff';  // Purple color
                this.ctx.lineWidth = 2;

                // Draw altitude lines
                this.ctx.beginPath();
                // Altitude from N1
                this.ctx.moveTo(this.system.n1.x, this.system.n1.y);
                this.ctx.lineTo(altitudes.α1.x, altitudes.α1.y);
                // Altitude from N2
                this.ctx.moveTo(this.system.n2.x, this.system.n2.y);
                this.ctx.lineTo(altitudes.α2.x, altitudes.α2.y);
                // Altitude from N3
                this.ctx.moveTo(this.system.n3.x, this.system.n3.y);
                this.ctx.lineTo(altitudes.α3.x, altitudes.α3.y);
                this.ctx.stroke();

                // Reset line dash and draw feet points
                this.ctx.setLineDash([]);
                this.ctx.fillStyle = '#b600ff';
                
                // Draw feet points
                ['α1', 'α2', 'α3'].forEach(foot => {
                    this.ctx.beginPath();
                    this.ctx.arc(altitudes[foot].x, altitudes[foot].y, 4, 0, 2 * Math.PI);
                    this.ctx.fill();
                });
            }

        } catch (error) {
            console.error('Error drawing system:', error);
        }
    }

    drawTriangle() {
        const { n1, n2, n3 } = this.system;
        
        // Draw only the triangle edges in white
        
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(n1.x, n1.y);
        this.ctx.lineTo(n2.x, n2.y);
        this.ctx.lineTo(n3.x, n3.y);
        this.ctx.closePath();
        this.ctx.stroke();
    }

    drawNode(ctx, node, color, label) {
        // Define colors at method level to ensure consistency
        const neonColors = {
            'red': '#FF0000',    // Bright red for N1
            'blue': '#0692f5',   // Cyan/neon blue for N2
            'green': '#44FF44'   // Neon green for N3
        };
        
        // Get the neon color based on the input color
        const neonColor = neonColors[color] || color;
        
        // Draw node circle with neon color
        ctx.fillStyle = neonColor;
        ctx.beginPath();
        ctx.arc(node.x, node.y, 6, 0, 2 * Math.PI);
        ctx.fill();

        // Draw label with the same neon color
        ctx.fillStyle = neonColor;  // Explicitly set the same neon color for text
        ctx.font = '14px Arial';
        ctx.save();
        ctx.scale(1, -1);

        // Keep existing offset calculations
        let xOffset = 10;
        let yOffset = 0;

        if (label === 'N3') {
            xOffset = -35;
            yOffset = -15;
        } else if (label === 'N2') {
            xOffset = 35;
            yOffset = -15;
        } else if (label === 'N1') {
            xOffset = 0;
            yOffset = 25;
        }

        // Draw the label text with the neon color
        ctx.fillStyle = neonColor;  // Ensure color is set before drawing text
        ctx.fillText(label, node.x + xOffset, -(node.y + yOffset));
        ctx.restore();
    }

    drawNodes(ctx) {
        // Draw each node with its label
        this.drawNode(ctx, this.system.n1, 'red', 'N1');
        this.drawNode(ctx, this.system.n2, 'blue', 'N2');
        this.drawNode(ctx, this.system.n3, 'green', 'N3');
    }

    drawAxes(ctx) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 1;

        // X-axis
        ctx.beginPath();
        ctx.moveTo(-this.canvas.width / 2, 0);
        ctx.lineTo(this.canvas.width / 2, 0);
        ctx.stroke();

        // Y-axis
        ctx.beginPath();
        ctx.moveTo(0, -this.canvas.height / 2);
        ctx.lineTo(0, this.canvas.height / 2);
        ctx.stroke();

        // Draw axis labels
        ctx.fillStyle = 'white';
        ctx.font = '14px Arial';
        
        // X axis label
        ctx.save();
        ctx.scale(1, -1);
        ctx.fillText('X', this.canvas.width / 2 - 20, 20);
        ctx.restore();

        // Y axis label
        ctx.save();
        ctx.translate(15, 0);
        ctx.rotate(Math.PI / 2);  // Changed to positive rotation
        ctx.fillText('Y', -this.canvas.height / 2 + 20, 0);  // Adjusted position
        ctx.restore();
    }

    drawAreas(ctx) {
        const areas = [
            { points: [this.system.n1, this.system.n2, this.system.incenter], color: 'rgba(255, 0, 0, 0.2)' },
            { points: [this.system.n2, this.system.n3, this.system.incenter], color: 'rgba(0, 255, 0, 0.2)' },
            { points: [this.system.n3, this.system.n1, this.system.incenter], color: 'rgba(0, 0, 255, 0.2)' }
        ];

        areas.forEach(area => {
            ctx.beginPath();
            ctx.moveTo(area.points[0].x, area.points[0].y);
            ctx.lineTo(area.points[1].x, area.points[1].y);
            ctx.lineTo(area.points[2].x, area.points[2].y);
            ctx.closePath();
            ctx.fillStyle = area.color;
            ctx.fill();
        });
    }

    drawConnections(ctx) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(this.system.n1.x, this.system.n1.y);
        ctx.lineTo(this.system.intelligence.x, this.system.intelligence.y);
        ctx.moveTo(this.system.n2.x, this.system.n2.y);
        ctx.lineTo(this.system.intelligence.x, this.system.intelligence.y);
        ctx.moveTo(this.system.n3.x, this.system.n3.y);
        ctx.lineTo(this.system.intelligence.x, this.system.intelligence.y);
        ctx.stroke();
        ctx.setLineDash([]);
    }

    drawMidpoints(ctx) {
        const midpoints = this.calculateMidpoints();
        
        ctx.fillStyle = 'yellow';
        
        // Draw midpoint on NC1 (Red, Left: N1-N3)
        ctx.beginPath();
        ctx.arc(midpoints.m1.x, midpoints.m1.y, 4, 0, 2 * Math.PI);
        ctx.fill();
        
        // Draw midpoint on NC2 (Blue, Right: N1-N2)
        ctx.beginPath();
        ctx.arc(midpoints.m2.x, midpoints.m2.y, 4, 0, 2 * Math.PI);
        ctx.fill();
        
        // Draw midpoint on NC3 (Green, Base: N2-N3)
        ctx.beginPath();
        ctx.arc(midpoints.m3.x, midpoints.m3.y, 4, 0, 2 * Math.PI);
        ctx.fill();
    }

    drawIncircle(ctx) {
        if (!this.showIncircle) return;

        ctx.strokeStyle = 'cyan';
        ctx.setLineDash([5, 5]);  // Add dashed line
        ctx.beginPath();
        ctx.arc(this.system.incenter.x, this.system.incenter.y, this.system.incircleRadius, 0, 2 * Math.PI);
        ctx.stroke();
        ctx.setLineDash([]);  // Reset dash pattern
    }

    /**
     * Draws the tangents from the incenter to the points of tangency.
     * @param {CanvasRenderingContext2D} ctx 
     */
    drawTangents(ctx) {
        if (!this.system.incenter || !this.system.TangencyPoints) return;
        
        const { incenter } = this.system;
        const tangentPoints = this.system.TangencyPoints;
        
        // Set line style to match incircle color
        ctx.strokeStyle = 'rgba(0, 255, 255, 0.5)';  // cyan with 0.5 opacity
        ctx.setLineDash([5, 5]);
        ctx.lineWidth = 1;
        
        // Draw lines from incenter to tangent points
        tangentPoints.forEach(point => {
            ctx.beginPath();
            ctx.moveTo(incenter.x, incenter.y);
            ctx.lineTo(point.x, point.y);
            ctx.stroke();
            
            // Draw tangent points in cyan
            ctx.fillStyle = 'cyan';
            ctx.beginPath();
            ctx.arc(point.x, point.y, 4, 0, 2 * Math.PI);
            ctx.fill();
        });
        
        ctx.setLineDash([]);
    }

    /**
     * Draws the medians of the triangle.
     * @param {CanvasRenderingContext2D} ctx 
     */
    drawMedians(ctx) {
        ctx.strokeStyle = 'rgba(255, 255, 0, 0.5)';
        ctx.setLineDash([5, 5]);
        ctx.beginPath();

        // Median from N1 to midpoint of N2-N3 (base)
        ctx.moveTo(this.system.n1.x, this.system.n1.y);
        ctx.lineTo(this.system.midpoints.m3.x, this.system.midpoints.m3.y);

        // Median from N2 to midpoint of N1-N3 (left side)
        ctx.moveTo(this.system.n2.x, this.system.n2.y);
        ctx.lineTo(this.system.midpoints.m1.x, this.system.midpoints.m1.y);

        // Median from N3 to midpoint of N1-N2 (right side)
        ctx.moveTo(this.system.n3.x, this.system.n3.y);
        ctx.lineTo(this.system.midpoints.m2.x, this.system.midpoints.m2.y);

        ctx.stroke();
        ctx.setLineDash([]);
    }

    /**
     * Draws the centroid of the triangle.
     * @param {CanvasRenderingContext2D} ctx 
     */
    drawCentroid(ctx) {
        if (!this.showCentroid) return;
        
        const centroid = this.calculateCentroid();
        if (!centroid) return;
        
        // Already using white for both the point and label
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(centroid.x, centroid.y, 4, 0, 2 * Math.PI);
        ctx.fill();
        
        // Label 'I' also in white
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '12px Arial';
        ctx.save();
        ctx.scale(1, -1);
        ctx.fillText('I', centroid.x + 8, -centroid.y);
        ctx.restore();
    }

    /**
     * Draws the subsystems of the triangle.
     * @param {CanvasRenderingContext2D} ctx 
     */
    drawSubsystems(ctx) {
        if (!this.showSubsystems) return;
        
        const { n1, n2, n3 } = this.system;
        const origin = { x: 0, y: 0 };

        // Draw SS1 region (Red)
        this.ctx.fillStyle = 'rgba(255, 0, 0, 0.1)';
        this.ctx.beginPath();
        this.ctx.moveTo(n1.x, n1.y);
        this.ctx.lineTo(n3.x, n3.y);
        this.ctx.lineTo(origin.x, origin.y);
        this.ctx.closePath();
        this.ctx.fill();

        // Draw SS2 region (Blue)
        this.ctx.fillStyle = 'rgba(0, 0, 255, 0.1)';
        this.ctx.beginPath();
        this.ctx.moveTo(n1.x, n1.y);
        this.ctx.lineTo(n2.x, n2.y);
        this.ctx.lineTo(origin.x, origin.y);
        this.ctx.closePath();
        this.ctx.fill();

        // Draw SS3 region (Green)
        this.ctx.fillStyle = 'rgba(0, 255, 0, 0.1)';
        this.ctx.beginPath();
        this.ctx.moveTo(n2.x, n2.y);
        this.ctx.lineTo(n3.x, n3.y);
        this.ctx.lineTo(origin.x, origin.y);
        this.ctx.closePath();
        this.ctx.fill();

        // Draw centroids with matching colors
        const centroids = this.calculateSubsystemCentroids();
        
        // Draw SS1 centroid (Red)
        this.ctx.fillStyle = 'rgba(255, 0, 0, 0.8)';  // Changed to red
        this.ctx.beginPath();
        this.ctx.arc(centroids.ss1.x, centroids.ss1.y, 4, 0, 2 * Math.PI);
        this.ctx.fill();
        
        // Draw SS2 centroid (Blue)
        this.ctx.fillStyle = 'rgba(0, 0, 255, 0.8)';  // Changed to blue
        this.ctx.beginPath();
        this.ctx.arc(centroids.ss2.x, centroids.ss2.y, 4, 0, 2 * Math.PI);
        this.ctx.fill();
        
        // Draw SS3 centroid (Green)
        this.ctx.fillStyle = 'rgba(0, 255, 0, 0.8)';  // Changed to green
        this.ctx.beginPath();
        this.ctx.arc(centroids.ss3.x, centroids.ss3.y, 4, 0, 2 * Math.PI);
        this.ctx.fill();
    }

    calculateTangents() {
        const { n1, n2, n3, incenter, incircleRadius } = this.system;
        
        const calculateTangencyPoint = (p1, p2) => {
            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;
            const sideLength = Math.sqrt(dx * dx + dy * dy);
            
            if (sideLength === 0) return { x: p1.x, y: p1.y };
            
            // Calculate projection point relative to incenter, not origin
            const t = ((incenter.x - p1.x) * dx + (incenter.y - p1.y) * dy) / (sideLength * sideLength);
            const projX = p1.x + t * dx;
            const projY = p1.y + t * dy;
            
            // Calculate direction from incenter to projection point
            const dirX = projX - incenter.x;
            const dirY = projY - incenter.y;
            const dirLength = Math.sqrt(dirX * dirX + dirY * dirY);
            
            if (dirLength === 0) return { x: p1.x, y: p1.y };
            
            // Calculate tangent point relative to incenter
            return {
                x: incenter.x + (dirX / dirLength) * incircleRadius,
                y: incenter.y + (dirY / dirLength) * incircleRadius
            };
        };

        const tangent1 = calculateTangencyPoint(n1, n3);
        const tangent2 = calculateTangencyPoint(n1, n2);
        const tangent3 = calculateTangencyPoint(n2, n3);

        const tangentPoints = [
            tangent1,
            tangent2,
            tangent3
        ];

        // Store in both places to ensure availability
        this.tangentPoints = tangentPoints;
        this.system.tangentPoints = tangentPoints;

        return tangentPoints;
    }

    // Additional methods to calculate angles, perimeter, area, lengths, etc.
    calculateAngles() {
        const angles = {};
        ['n1', 'n2', 'n3'].forEach((node, i) => {
            const prev = this.system[`n${i === 0 ? 3 : i}`];
            const curr = this.system[node];
            const next = this.system[`n${i === 2 ? 1 : i + 2}`];
            
            // Handle degenerate cases
            if (!prev || !curr || !next || 
                (prev.x === curr.x && prev.y === curr.y) || 
                (next.x === curr.x && next.y === curr.y)) {
                angles[node] = 0;
                return;
            }

            const v1 = {
                x: prev.x - curr.x,
                y: prev.y - curr.y
            };
            const v2 = {
                x: next.x - curr.x,
                y: next.y - curr.y
            };

            // Handle zero-length vectors
            if ((v1.x === 0 && v1.y === 0) || (v2.x === 0 && v2.y === 0)) {
                angles[node] = 0;
                return;
            }

            const dot = v1.x * v2.x + v1.y * v2.y;
            const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
            const mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);
            
            let angle = Math.acos(dot / (mag1 * mag2)) * (180 / Math.PI);
            
            // Handle NaN and negative cases
            angles[node] = isNaN(angle) || angle < 0 ? 0 : angle;
        });
        
        return angles;
    }

    calculatePerimeter() {
        const lengths = this.calculateLengths();
        return lengths.l1 + lengths.l2 + lengths.l3;
    }

    calculateArea() {
        const { n1, n2, n3 } = this.system;
        // Area calculation using the formula: |Ax(By - Cy) + Bx(Cy - Ay) + Cx(Ay - By)| / 2
        const area = Math.abs(
            n1.x * (n2.y - n3.y) +
            n2.x * (n3.y - n1.y) +
            n3.x * (n1.y - n2.y)) / 2;
        return area;
    }

    calculateLengths() {
        return {
            l1: this.calculateDistance(this.system.n1, this.system.n3),  // NC1
            l2: this.calculateDistance(this.system.n1, this.system.n2),  // NC2
            l3: this.calculateDistance(this.system.n2, this.system.n3)   // NC3
        };
    }

    calculateMedians() {
        const { n1, n2, n3 } = this.system;
        const midpoints = this.calculateMidpoints();
        const MEDIAN_CHANNEL_RATIO = 2 / 3;  // MC is always 2/3 of median length

        // Calculate m1 (IC for N1), m2 (IC for N2), m3 (IC for N3)
        this.medianLengths = [
            this.calculateDistance(n1, midpoints.m1) * MEDIAN_CHANNEL_RATIO,  // I to N1
            this.calculateDistance(n2, midpoints.m2) * MEDIAN_CHANNEL_RATIO,  // I to N2
            this.calculateDistance(n3, midpoints.m3) * MEDIAN_CHANNEL_RATIO   // I to N3
        ];
    }

    calculateMidpoints() {
        // Ensure consistent mapping:
        // m1 = midpoint of side opposite to N1 (between N2 and N3)
        // m2 = midpoint of side opposite to N2 (between N1 and N3)
        // m3 = midpoint of side opposite to N3 (between N1 and N2)
        const midpoints = {
            m1: this.calculateMidpoint(this.system.n1, this.system.n3),  // Opposite to N2
            m2: this.calculateMidpoint(this.system.n1, this.system.n2),  // Opposite to N3
            m3: this.calculateMidpoint(this.system.n2, this.system.n3)   // Opposite to N1
        };
        
        console.log('Calculated midpoints:', {
            'm1 (N1-N3)': midpoints.m1,
            'm2 (N1-N2)': midpoints.m2,
            'm3 (N3-N2)': midpoints.m3
        });
        
        // Store midpoints in the system for global access
        this.system.midpoints = midpoints;

        return midpoints;
    }

    /**
     * Calculates the Euclidean distance between two points.
     * 
     * @param {Object} point1 - First point with properties x and y.
     * @param {Object} point2 - Second point with properties x and y.
     * @returns {number} The distance between point1 and point2.
     */
    calculateDistance(point1, point2) {
        return Math.sqrt((point2.x - point1.x) ** 2 + (point2.y - point1.y) ** 2);
    }

    // Placeholder methods for drawAngles and drawEdgeLengths
    // Implement these based on your specific requirements
    drawAngles(ctx) {
        const angles = this.calculateAngles();
        ctx.save();
        ctx.scale(1, -1);
        
        // N1 angle (top)
        this.drawAngleLabel(
            ctx,
            angles.n1,
            this.system.n1.x - 25,
            -this.system.n1.y - 40
        );
        
        // N2 angle (bottom right)
        this.drawAngleLabel(
            ctx,
            angles.n2,
            this.system.n2.x + 45,
            -this.system.n2.y + 35
        );
        
        // N3 angle (bottom left)
        this.drawAngleLabel(
            ctx,
            angles.n3,
            this.system.n3.x - 55,
            -this.system.n3.y + 35
        );
        
        ctx.restore();
    }

    drawEdgeLengths(ctx) {
        const { n1, n2, n3 } = this.system;
        const offset = 20;

        ctx.save();
        ctx.scale(1, -1);
        
        ctx.restore();
    }

    drawEdges(ctx) {
        const { n1, n2, n3 } = this.system;
        
        ctx.lineWidth = 2;
        
        // Draw NC1 (Red, Left: N1-N3)
        ctx.strokeStyle = '#FF0000';
        ctx.beginPath();
        ctx.moveTo(n1.x, n1.y);
        ctx.lineTo(n3.x, n3.y);
        ctx.stroke();
        
        // Draw NC2 (Blue, Right: N1-N2)
        ctx.strokeStyle = '#0692f5';  // Keep the true blue we like
        ctx.beginPath();
        ctx.moveTo(n1.x, n1.y);
        ctx.lineTo(n2.x, n2.y);
        ctx.stroke();
        
        // Draw NC3 (Green, Base: N2-N3)
        ctx.strokeStyle = '#44FF44';
        ctx.beginPath();
        ctx.moveTo(n2.x, n2.y);
        ctx.lineTo(n3.x, n3.y);
        ctx.stroke();

        ctx.lineWidth = 1;
    }

    centerSystem() {
        const centroid = {
            x: (this.system.n1.x + this.system.n2.x + this.system.n3.x) / 3,
            y: (this.system.n1.y + this.system.n2.y + this.system.n3.y) / 3
        };

        const dx = -centroid.x;
        const dy = -centroid.y;

        this.system.n1.x += dx;
        this.system.n1.y += dy;
        this.system.n2.x += dx;
        this.system.n2.y += dy;
        this.system.n3.x += dx;
        this.system.n3.y += dy;

        this.system.intelligence = { x: 0, y: 0 };
    }

    handleDrag(e) {
        if (!this.isDragging || !this.draggedNode) return;

        const rect = this.canvas.getBoundingClientRect();
        const mouseX = (e.clientX - rect.left - this.canvas.width/2) / this.scale;
        const mouseY = -(e.clientY - rect.top - this.canvas.height/2) / this.scale;

        // Update the dragged node position
        this.system[this.draggedNode].x = mouseX;
        this.system[this.draggedNode].y = mouseY;

        // Adjust triangle to maintain centroid at origin
        this.adjustTriangleToOrigin();
        
        this.updateDerivedPoints();
        this.updateDashboard();
        this.drawSystem();
    }

    // Add new method for drawing just the incenter point
    drawIncenter(ctx) {
        if (!this.showIncenter) return;
        
        const incenter = this.calculateIncenter();
        if (!incenter) return;
        
        // Draw the point with smaller radius
        ctx.fillStyle = '#00FFFF';  // Keep the cyan color
        ctx.beginPath();
        ctx.arc(incenter.x, incenter.y, 4, 0, 2 * Math.PI);
        ctx.fill();
        
        // Label 'IC' with smaller font size
        ctx.fillStyle = '#00FFFF';
        ctx.font = '12px Arial';  // Reduced from 14px to 12px
        ctx.save();
        ctx.scale(1, -1);
        ctx.fillText('IN', incenter.x + 10, -incenter.y);
        ctx.restore();
    }

    initializeManualControls() {
        try {
            // Get NC elements
            const nc1Input = document.getElementById('manual-nc1');
            const nc2Input = document.getElementById('manual-nc2');
            const nc3Input = document.getElementById('manual-nc3');
            const applyButton = document.getElementById('apply-manual');

            // Get IC elements
            const ic1Input = document.getElementById('manual-ic1');
            const ic2Input = document.getElementById('manual-ic2');
            const ic3Input = document.getElementById('manual-ic3');
            const applyICButton = document.getElementById('apply-manual-ic');

            // Verify NC elements exist before adding listeners
            if (nc1Input && nc2Input && nc3Input && applyButton) {
                const updateTriangle = () => {
                    const nc1 = parseFloat(nc1Input.value);
                    const nc2 = parseFloat(nc2Input.value);
                    const nc3 = parseFloat(nc3Input.value);
                    
                    if (!isNaN(nc1) && !isNaN(nc2) && !isNaN(nc3)) {
                        // Update triangle geometry
                        this.updateTriangleFromEdges(nc1, nc2, nc3);
                        
                        // Update animation fields based on checkbox states
                        const startChecked = document.getElementById('applyToStart')?.checked;
                        const endChecked = document.getElementById('applyToEnd')?.checked;
                        
                        if (startChecked) {
                            document.getElementById('animation-nc1-start').value = nc1.toFixed(2);
                            document.getElementById('animation-nc2-start').value = nc2.toFixed(2);
                            document.getElementById('animation-nc3-start').value = nc3.toFixed(2);
                        }
                        
                        if (endChecked) {
                            document.getElementById('animation-nc1-end').value = nc1.toFixed(2);
                            document.getElementById('animation-nc2-end').value = nc2.toFixed(2);
                            document.getElementById('animation-nc3-end').value = nc3.toFixed(2);
                        }

                        // Update Dashboard
                        this.updateDashboard();
                    }
                };

                // Add NC event listeners
                applyButton.addEventListener('click', updateTriangle);
                
                const handleEnterKey = (event) => {
                    if (event.key === 'Enter') {
                        event.preventDefault();
                        updateTriangle();
                    }
                };

                nc1Input.addEventListener('keypress', handleEnterKey);
                nc2Input.addEventListener('keypress', handleEnterKey);
                nc3Input.addEventListener('keypress', handleEnterKey);
            }

            // Verify IC elements exist before adding listeners
            if (ic1Input && ic2Input && ic3Input && applyICButton) {
                const updateIC = () => {
                    const ic1 = parseFloat(ic1Input.value);
                    const ic2 = parseFloat(ic2Input.value);
                    const ic3 = parseFloat(ic3Input.value);
                    
                    if (!isNaN(ic1) && !isNaN(ic2) && !isNaN(ic3)) {
                        // Update triangle based on IC values
                        this.updateTriangleFromIC(ic1, ic2, ic3);
                        
                        // Update Dashboard
                        this.updateDashboard();
                        
                        // Redraw the system
                        this.drawSystem();
                    } else {
                        alert('Please enter valid numbers for all IC fields.');
                    }
                };

                // Add IC event listeners
                applyICButton.addEventListener('click', updateIC);
                
                const handleICEnterKey = (event) => {
                    if (event.key === 'Enter') {
                        event.preventDefault();
                        updateIC();
                    }
                };

                ic1Input.addEventListener('keypress', handleICEnterKey);
                ic2Input.addEventListener('keypress', handleICEnterKey);
                ic3Input.addEventListener('keypress', handleICEnterKey);
            }

        } catch (error) {
            console.error('Error initializing manual controls:', error);
        }
    }

    updateManualFields() {
        // Get current edge lengths with correct mapping
        const manualInputs = {
            'manual-nc2': this.calculateDistance(this.system.n1, this.system.n2),  // NC2 maps to blue edge
            'manual-nc1': this.calculateDistance(this.system.n1, this.system.n3),  // NC1 maps to red edge
            'manual-nc3': this.calculateDistance(this.system.n2, this.system.n3)   // NC3 maps to green edge
        };

        // Update each field while preserving editability
        Object.entries(manualInputs).forEach(([id, value]) => {
            const input = document.getElementById(id);
            if (input && !input.matches(':focus')) {
                input.value = value.toFixed(2);
                input.readOnly = false;
            }
        });

        // Update the display value
        this.updateDisplayValue();
    }

    handleManualUpdate() {
        const nc1 = parseFloat(document.getElementById('manual-nc1').value);
        const nc2 = parseFloat(document.getElementById('manual-nc2').value);
        const nc3 = parseFloat(document.getElementById('manual-nc3').value);

        // Validate inputs
        if (isNaN(nc1) || isNaN(nc2) || isNaN(nc3)) {
            alert('Please enter valid numbers for all edges');
            return;
        }

        // Update triangle with new edge lengths
        this.updateTriangleFromEdges(nc1, nc2, nc3);
        
        // Only update manual fields and dashboard
        this.updateDashboard();
        
        // Do NOT automatically update animation fields
    }

    validateTriangleInequality(a, b, c) {
        return (
            a + b > c &&
            b + c > a &&
            a + c > b
        );
    }

    updateTriangleFromEdges(nc1, nc2, nc3) {
        console.log('Updating triangle from edges:', { nc1, nc2, nc3 });
        
        // Place n3 at origin (0,0)
        // Place n2 on x-axis at distance nc3
        // Calculate n1 position using cosine law
        
        const x = (nc1 * nc1 - nc2 * nc2 + nc3 * nc3) / (2 * nc3);
        const y = Math.sqrt(nc1 * nc1 - x * x);

        // Update system coordinates
        this.system.n3 = { x: 0, y: 0 };
        this.system.n2 = { x: nc3, y: 0 };
        this.system.n1 = { x: x, y: y };

        // Center the triangle
        this.centerTriangle();

        // Update all derived points and features
        this.updateDerivedPoints();

        // Update rendering and dashboard
        this.drawSystem();
        this.updateDashboard();
        // Remove this line to prevent automatic animation field updates
        // this.updateAnimationFields();  
    }

    centerTriangle() {
        // Calculate the center of the triangle
        const center = {
            x: (this.system.n1.x + this.system.n2.x + this.system.n3.x) / 3,
            y: (this.system.n1.y + this.system.n2.y + this.system.n3.y) / 3
        };

        // Subtract the center coordinates from each point to center the triangle
        this.system.n1.x -= center.x;
        this.system.n1.y -= center.y;
        this.system.n2.x -= center.x;
        this.system.n2.y -= center.y;
        this.system.n3.x -= center.x;
        this.system.n3.y -= center.y;
    }

    // Add this helper method to calculate midpoint of a line
    calculateMidpoint(point1, point2) {
        return {
            x: (point1.x + point2.x) / 2,
            y: (point1.y + point2.y) / 2
        };
    }

    initializeAnimations() {
        const animationsList = document.getElementById('animationsList');
        if (!animationsList) {
            console.error('Animations list element not found');
            return;
        }

        try {
            // Clear existing items
            animationsList.innerHTML = '';
            
            // Get saved animations from localStorage
            const animations = JSON.parse(localStorage.getItem('userAnimations') || '{}');
            
            // Sort animation names alphabetically
            const sortedNames = Object.keys(animations).sort();
            
            // Add each animation to the dropdown
            sortedNames.forEach(name => {
                const li = document.createElement('li');
                const a = document.createElement('a');
                a.className = 'dropdown-item';
                a.href = '#';
                
                // Create span for the text content
                const textSpan = document.createElement('span');
                textSpan.textContent = name;
                
                // Create button container
                const buttonContainer = document.createElement('div');
                buttonContainer.className = 'preset-buttons';
                
                // Create delete button
                const deleteBtn = document.createElement('button');
                deleteBtn.className = 'delete-button small-button';  // instead of 'btn btn-danger btn-sm'
                deleteBtn.textContent = '×';
                deleteBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (confirm(`Delete animation "${name}"?`)) {
                        this.deleteAnimation(name);
                    }
                });
                
                // Add click handler for loading animation - FIXED HERE
                a.addEventListener('click', (e) => {
                    e.preventDefault();
                    const animationData = animations[name];  // Get the animation data
                    this.loadAnimationPreset(name, animationData);  // Pass both name and data
                });
                
                // Assemble the dropdown item
                buttonContainer.appendChild(deleteBtn);
                a.appendChild(textSpan);
                a.appendChild(buttonContainer);
                li.appendChild(a);
                animationsList.appendChild(li);
            });
        } catch (error) {
            console.error('Error initializing animations dropdown:', error);
        }
    }

    // Remove or update the old loadAnimation method
    loadAnimation(name) {
        try {
            const animations = JSON.parse(localStorage.getItem('userAnimations') || '{}');
            const animation = animations[name];
            
            if (!animation) {
                console.error(`Animation "${name}" not found`);
                return;
            }

            // Call the proper loading method
            this.loadAnimationPreset(name, animation);
        } catch (error) {
            console.error('Error loading animation:', error);
        }
    }

    updateAnimationEndFields() {
        // Get current edge lengths with correct mapping
        const animationEndInputs = {
            'animation-nc2': this.calculateDistance(this.system.n1, this.system.n2),  // NC2 maps to blue edge
            'animation-nc1': this.calculateDistance(this.system.n1, this.system.n3),  // NC1 maps to red edge
            'animation-nc3': this.calculateDistance(this.system.n2, this.system.n3)   // NC3 maps to green edge
        };

        // Update each field while preserving editability
        Object.entries(animationEndInputs).forEach(([id, value]) => {
            const input = document.getElementById(`${id}-end`);
            if (input && !input.matches(':focus')) {  // Don't update if user is editing
                input.value = value.toFixed(2);
                input.readOnly = false;
            }
        });
    }

    // Add method to clear stored animation
    clearStoredAnimation() {
        this.storedAnimation = null;
    }

    // Update initializeAnimationControls to clear stored animation when values change
    initializeAnimationControls() {
        const animateButton = document.getElementById('animate-button');
        const animationInputs = document.querySelectorAll('[id^="animation-nc"]');

        if (animateButton) {
            animateButton.addEventListener('click', () => {
                this.startAnimation();
            });
        }

        // Clear stored animation when inputs change
        animationInputs.forEach(input => {
            input.addEventListener('input', () => {
                this.clearStoredAnimation();
            });
        });
    }

    initializeUserPresets() {
        console.log('Initializing user presets dropdown');
        const userPresetsList = document.getElementById('userPresetsList');
        
        if (!userPresetsList) {
            console.error('User presets list element not found');
            return;
        }
        
        // Clear existing items
        userPresetsList.innerHTML = '';
        
        // Add each saved preset
        Object.entries(this.userPresets).forEach(([name, config]) => {
            const item = document.createElement('li');
            const link = document.createElement('a');
            link.className = 'dropdown-item';
            link.href = '#';
            link.textContent = name;
            link.addEventListener('click', (e) => {
                e.preventDefault();
                this.loadUserPreset(name);
            });
            item.appendChild(link);
            userPresetsList.appendChild(item);
        });
    }

    loadUserPreset(name) {
        const config = this.userPresets[name];
        if (config) {
            // Load the configuration
            this.system.n1.x = config.n1.x;
            this.system.n1.y = config.n1.y;
            this.system.n2.x = config.n2.x;
            this.system.n2.y = config.n2.y;
            this.system.n3.x = config.n3.x;
            this.system.n3.y = config.n3.y;

            // Update display
            this.drawSystem();
            this.updateDashboard();
        }
    }

    saveCurrentConfig() {
        
        // Get current NC values
        const nc1 = document.getElementById('manual-nc1')?.value;
        const nc2 = document.getElementById('manual-nc2')?.value;
        const nc3 = document.getElementById('manual-nc3')?.value;
        
        // Validate values
        if (!nc1 || !nc2 || !nc3) {
            alert('Please enter all NC values before saving a preset.');
            return;
        }

        // Get current triangle configuration
        const config = {
            n1: { x: this.system.n1.x, y: this.system.n1.y },
            n2: { x: this.system.n2.x, y: this.system.n2.y },
            n3: { x: this.system.n3.x, y: this.system.n3.y },
            nc1: parseFloat(nc1),
            nc2: parseFloat(nc2),
            nc3: parseFloat(nc3),
            timestamp: Date.now()
        };

        // Single prompt for preset name
        const name = prompt('Enter a name for this preset:');
        
        if (name) {
            try {
                // Get existing presets
                const existingPresets = JSON.parse(localStorage.getItem('userPresets') || '{}');
                
                // Add new preset
                existingPresets[name] = config;
                
                // Save to localStorage
                localStorage.setItem('userPresets', JSON.stringify(existingPresets));
                
                // Update dropdown immediately
                this.updatePresetsDropdown();
                
                alert('Preset saved successfully!');

            } catch (error) {
                console.error('Error saving preset:', error);
                alert('Error saving preset. Please try again.');
            }
        
        }
    }

    checkInputFields() {
        const inputFields = document.querySelectorAll('input[type="text"]:not(.manual-input):not([readonly="false"])');
        inputFields.forEach(field => {
            field.readOnly = true;
        });
    }

    saveCurrentAnimation() {
        try {
            const name = prompt('Enter a name for this animation:');
            if (!name) return;

            // Get start values from start input fields
            const startState = {
                nc1: parseFloat(document.getElementById('animation-nc1-start').value),
                nc2: parseFloat(document.getElementById('animation-nc2-start').value),
                nc3: parseFloat(document.getElementById('animation-nc3-start').value)
            };

            // Get end values from end input fields
            const endState = {
                nc1: parseFloat(document.getElementById('animation-nc1-end').value),
                nc2: parseFloat(document.getElementById('animation-nc2-end').value),
                nc3: parseFloat(document.getElementById('animation-nc3-end').value)
            };

            // Create animation data
            const animationData = {
                start: startState,
                end: endState
            };

            // Save to localStorage
            const animations = JSON.parse(localStorage.getItem('userAnimations') || '{}');
            animations[name] = animationData;
            localStorage.setItem('userAnimations', JSON.stringify(animations));

            this.initializeAnimations();
            console.log(`Successfully saved animation "${name}"`, animationData);
        } catch (error) {
            console.error('Error saving animation:', error);
            alert('Error saving animation. Please try again.');
        }
    }

    // Add new method to initialize animations dropdown
    initializeUserAnimations() {
        const animationsList = document.getElementById('animationsList');
        const animationsDropdown = document.getElementById('animationsDropdown');
        
        if (!animationsList || !animationsDropdown) {
            console.error('Animation dropdown elements not found');
            return;
        }
        
        // Clear existing items
        animationsList.innerHTML = '';
        
        // Add each saved animation to dropdown
        Object.entries(this.userAnimations).forEach(([name, config]) => {
            console.log('Adding animation:', name);
            const item = document.createElement('li');
            const link = document.createElement('a');
            link.className = 'dropdown-item';
            link.href = '#';
            link.textContent = name;
            item.appendChild(link);
            animationsList.appendChild(item);
        });

        // Initialize Bootstrap dropdown functionality
        animationsDropdown.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('Animations dropdown clicked');
            animationsList.classList.toggle('show');
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!animationsDropdown.contains(e.target) && !animationsList.contains(e.target)) {
                animationsList.classList.remove('show');
            }
        });

        console.log('Animations dropdown initialized');
    }

    // Add this method if it doesn't exist, or update it if it does
    updateAnimationFields() {
        // Get current lengths
        const currentLengths = this.calculateLengths();

        // Update Animation Start fields
        const startNc1Input = document.getElementById('animation-nc1-start');
        const startNc2Input = document.getElementById('animation-nc2-start');
        const startNc3Input = document.getElementById('animation-nc3-start');

        if (startNc1Input && startNc2Input && startNc3Input) {
            startNc1Input.value = currentLengths.l1.toFixed(2);
            startNc2Input.value = currentLengths.l2.toFixed(2);
            startNc3Input.value = currentLengths.l3.toFixed(2);
            
        } else {
            console.error('Some animation start input fields not found');
        }

        // Update Animation End fields
        const endNc1Input = document.getElementById('animation-nc1-end');
        const endNc2Input = document.getElementById('animation-nc2-end');
        const endNc3Input = document.getElementById('animation-nc3-end');

        if (endNc1Input && endNc2Input && endNc3Input) {
            endNc1Input.value = currentLengths.l1.toFixed(2);
            endNc2Input.value = currentLengths.l2.toFixed(2);
            endNc3Input.value = currentLengths.l3.toFixed(2);
            console.log('Updated end fields');
        } else {
            console.error('Some animation end input fields not found');
        }
    }

    exportToCSV() {
        console.log('Exporting data');
        
        // Initialize CSV content with headers
        let csvContent = "data:text/csv;charset=utf-8,Section,Label,Value\n";

        // Function to process a panel's data
        const processPanel = (panel, sectionName) => {
            console.log(`Processing section: ${sectionName}`);
            // Get all label-value pairs
            const labelValuePairs = panel.querySelectorAll('.label-value-pair');
            console.log(`Found ${labelValuePairs.length} label-value pairs`);
            labelValuePairs.forEach(pair => {
                const label = pair.querySelector('label')?.textContent.trim() || '';
                const value = pair.querySelector('input')?.value || '';
                console.log(`Found pair - Label: ${label}, Value: ${value}`);
                csvContent += `"${sectionName}","${label}","${value}"\n`;
            });

            // Special handling for subsystems table if it exists
            const subsystemsTable = panel.querySelector('.subsystems-table');
            if (subsystemsTable) {
                const headers = Array.from(subsystemsTable.querySelectorAll('thead th'))
                    .map(th => th.textContent.trim())
                    .filter(text => text !== '');
                
                const rows = subsystemsTable.querySelectorAll('tbody tr');
                rows.forEach(row => {
                    const rowHeader = row.querySelector('th').textContent.trim();
                    const inputs = row.querySelectorAll('input');
                    inputs.forEach((input, index) => {
                        const label = `${rowHeader} ${headers[index]}`;
                        csvContent += `"${sectionName}","${label}","${input.value}"\n`;
                    });
                });
            }
        };

        // Process Dashboard sections
        const dashboard = document.getElementById('dashboard');
        if (dashboard) {
            // Get all dashboard panels
            const panels = dashboard.querySelectorAll('.dashboard-panel');
            panels.forEach(panel => {
                const sectionTitle = panel.querySelector('.panel-header')?.textContent.trim() || 'Unnamed Section';
                processPanel(panel, sectionTitle);
            });
        }

        // Create and trigger download
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "triangle_data.csv");
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        console.log('Export complete');
    }

    // Add new method for image export
    exportToImage() {
        console.log('Exporting canvas as image');
        
        try {
            // Create a temporary canvas
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = this.canvas.width;
            tempCanvas.height = this.canvas.height;
            const tempCtx = tempCanvas.getContext('2d');
            
            // Draw dark background
            tempCtx.fillStyle = '#1a1a1a';  // Match your app's dark background
            tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
            
            // Draw the original canvas content on top
            tempCtx.drawImage(this.canvas, 0, 0);
            
            // Convert to JPEG instead of PNG (JPEG doesn't support transparency)
            const imageData = tempCanvas.toDataURL('image/jpeg', 1.0);
            
            // Create download link
            const link = document.createElement('a');
            link.download = 'triangle_system.jpg';  // Changed extension to .jpg
            link.href = imageData;
            
            // Trigger download
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            console.log('Image export complete');
        } catch (error) {
            console.error('Error exporting image:', error);
        }
    }

    // Add a toggle method
    toggleSpecialCenters() {
        this.showSpecialCenters = !this.showSpecialCenters;
        this.drawSystem();  // Use drawSystem instead of draw
    }

    // Add method to calculate nine-point circle
    calculateNinePointCircle() {
        const { n1, n2, n3 } = this.system;
        
        // First calculate circumcenter (O)
        const circumcenter = this.calculateCircumcenter();
        
        // Calculate orthocenter (H)
        const orthocenter = this.calculateOrthocenter();
        
        // Nine-point center (N) is the midpoint of OH
        const ninePointCenter = {
            x: (circumcenter.x + orthocenter.x) / 2,
            y: (circumcenter.y + orthocenter.y) / 2
        };
        
        // The radius is half of the circumradius
        const circumradius = this.calculateDistance(circumcenter, n1);
        const ninePointRadius = circumradius / 2;
        
        return {
            center: ninePointCenter,
            radius: ninePointRadius
        };
    }

    // Helper method to calculate circumcenter
    calculateCircumcenter() {
        const { n1, n2, n3 } = this.system;
        const EPSILON = 1e-10;
        const roundNearZero = (value) => Math.abs(value) < EPSILON ? 0 : value;

        console.log("Calculating circumcenter for points:", { n1, n2, n3 });

        // Calculate the midpoints of sides n1-n2 and n2-n3
        const midAB = this.calculateMidpoint(n1, n2);
        const midBC = this.calculateMidpoint(n2, n3);

        // Calculate the slopes of sides n1-n2 and n2-n3
        const slopeAB = this.calculateSlope(n1, n2);
        const slopeBC = this.calculateSlope(n2, n3);

        // Calculate the slopes of the perpendicular bisectors
        const perpSlopeAB = slopeAB !== Infinity ? -1 / slopeAB : 0;
        const perpSlopeBC = slopeBC !== Infinity ? -1 / slopeBC : 0;

        // Calculate the y-intercepts of the perpendicular bisectors
        const interceptAB = midAB.y - perpSlopeAB * midAB.x;
        const interceptBC = midBC.y - perpSlopeBC * midBC.x;

        let circumcenter;

        if (Math.abs(perpSlopeAB - perpSlopeBC) < EPSILON) {
            console.warn("Perpendicular bisectors are parallel. Circumcenter is undefined.");
            return null;
        }

        if (perpSlopeAB === Infinity) {
            // First bisector is vertical
            const x = roundNearZero(midAB.x);
            const y = roundNearZero(perpSlopeBC * x + interceptBC);
            circumcenter = { x, y };
        } else if (perpSlopeBC === Infinity) {
            // Second bisector is vertical
            const x = roundNearZero(midBC.x);
            const y = roundNearZero(perpSlopeAB * x + interceptAB);
            circumcenter = { x, y };
        } else {
            // Calculate intersection point of the two perpendicular bisectors
            const x = roundNearZero((interceptBC - interceptAB) / (perpSlopeAB - perpSlopeBC));
            const y = roundNearZero(perpSlopeAB * x + interceptAB);
            circumcenter = { x, y };
        }

        console.log("Calculated circumcenter:", circumcenter);
        return circumcenter;
    }

    // Helper method to calculate orthocenter
    calculateOrthocenter() {
        const { n1, n2, n3 } = this.system;
        const EPSILON = 1e-10;
        const roundNearZero = (value) => Math.abs(value) < EPSILON ? 0 : value;

        // Calculate slopes of sides
        const slope12 = this.calculateSlope(n1, n2);
        const slope23 = this.calculateSlope(n2, n3);
        const slope31 = this.calculateSlope(n3, n1);
        
        // Calculate slopes of altitudes (perpendicular to sides)
        const altSlope1 = Math.abs(slope23) < EPSILON ? Infinity : -1 / slope23;
        const altSlope2 = Math.abs(slope31) < EPSILON ? Infinity : -1 / slope31;
        
        // Calculate y-intercepts for altitude lines
        const b1 = n1.y - altSlope1 * n1.x;
        const b2 = n2.y - altSlope2 * n2.x;
        
        let orthocenter;
        
        if (Math.abs(altSlope1 - altSlope2) < EPSILON) {
            console.warn("Altitudes are parallel. Orthocenter is undefined.");
            return null;
        }

        if (altSlope1 === Infinity) {
            orthocenter = {
                x: roundNearZero(n1.x),
                y: roundNearZero(altSlope2 * n1.x + b2)
            };
        } else if (altSlope2 === Infinity) {
            orthocenter = {
                x: roundNearZero(n2.x),
                y: roundNearZero(altSlope1 * n2.x + b1)
            };
        } else {
            const x = roundNearZero((b2 - b1) / (altSlope1 - altSlope2));
            const y = roundNearZero(altSlope1 * x + b1);
            orthocenter = { x, y };
        }
        
        return orthocenter;
    }

    // Add method to draw nine-point circle
    drawNinePointCircle(ctx) {
        if (!this.showNinePointCircle) return;
        
        const ninePointCircle = this.calculateNinePointCircle();
        
        // Draw the circle
        ctx.strokeStyle = '#FF00FF';  // Hot pink
        ctx.setLineDash([5, 5]);  // Dashed line
        ctx.beginPath();
        ctx.arc(
            ninePointCircle.center.x,
            ninePointCircle.center.y,
            ninePointCircle.radius,
            0,
            2 * Math.PI
        );
        ctx.stroke();
        ctx.setLineDash([]);  // Reset dash pattern
        
        // Draw the center point
        ctx.beginPath();
        ctx.fillStyle = '#FF00FF';
        ctx.arc(ninePointCircle.center.x, ninePointCircle.center.y, 4, 0, 2 * Math.PI);
        ctx.fill();

        // Label 'N'
        ctx.fillStyle = '#FF00FF';
        ctx.font = '12px Arial';
        ctx.save();
        ctx.scale(1, -1);  // Flip text right-side up
        ctx.fillText('NP', ninePointCircle.center.x + 10, -ninePointCircle.center.y);
        ctx.restore();
    }

    calculateCircumcircle() {
        const circumcenter = this.calculateCircumcenter();
        // Radius is distance from circumcenter to any vertex
        const radius = this.calculateDistance(circumcenter, this.system.n1);
        
        return {
            center: circumcenter,
            radius: radius
        };
    }

    drawCircumcircle(ctx) {
        if (!this.showCircumcircle) return;
        
        const circumcircle = this.calculateCircumcircle();
        
        // Draw only the circle, not the center point
        ctx.strokeStyle = '#F7F107';  // Bright neon yellow
        ctx.setLineDash([5, 5]);  // Dashed line
        ctx.beginPath();
        ctx.arc(
            circumcircle.center.x,
            circumcircle.center.y,
            circumcircle.radius,
            0,
            2 * Math.PI
        );
        ctx.stroke();
        ctx.setLineDash([]);  // Reset dash pattern
    }

    drawEulerLine(ctx) {
        // Don't draw Euler Line if triangle is equilateral
        if (this.isIsosceles() && Math.abs(this.calculateAngles().n1 - 60) < 0.1) {
            return;  // Exit early for equilateral triangles
        }

        // Get the required points
        const O = this.system.circumcenter;
        const H = this.system.orthocenter;
        
        if (!O || !H) {
            console.log("Missing required points");
            return;
        }
        
        // Calculate the direction vector of the Euler line
        const dx = H.x - O.x;
        const dy = H.y - O.y;
        
        // Normalize the direction vector
        const length = Math.sqrt(dx * dx + dy * dy);
        if (length === 0) return;
        
        const unitX = dx / length;
        const unitY = dy / length;
        
        // Extend the line by a large factor (e.g., 1000 units) in both directions
        const extensionFactor = 1000;
        const startPoint = {
            x: O.x - unitX * extensionFactor,
            y: O.y - unitY * extensionFactor
        };
        const endPoint = {
            x: H.x + unitX * extensionFactor,
            y: H.y + unitY * extensionFactor
        };
        
        // Draw the extended line
        ctx.save();
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(128, 128, 128, 0.5)'; 
        
        ctx.lineWidth = 1;
        
        ctx.moveTo(startPoint.x, startPoint.y);
        ctx.lineTo(endPoint.x, endPoint.y);
        
        ctx.stroke();
        ctx.setLineDash([]);  // Reset dash pattern
        ctx.restore();
    }

    // Helper functions for orthocenter calculation
    calculateSlope(p1, p2) {
        const EPSILON = 1e-10;
        if (Math.abs(p2.x - p1.x) < EPSILON) {
            return Infinity; // Vertical line
        }
        return (p2.y - p1.y) / (p2.x - p1.x);
    }

    areCollinear(n1, n2, n3) {
        // Using epsilon for floating-point comparison
        const epsilon = 1e-10;
        const area = (n2.x - n1.x) * (n3.y - n1.y) - (n3.x - n1.x) * (n2.y - n1.y);
        return Math.abs(area) < epsilon;
    }

    calculateCentroid() {
        return {
            x: (this.system.n1.x + this.system.n2.x + this.system.n3.x) / 3,
            y: (this.system.n1.y + this.system.n2.y + this.system.n3.y) / 3
        };
    }

    calculateIncenter() {
        const { n1, n2, n3 } = this.system;
        const angles = this.calculateAngles();
        
        // Calculate incenter using angle bisector theorem
        const sinA1 = Math.sin(angles.n1 * Math.PI / 180);
        const sinA2 = Math.sin(angles.n2 * Math.PI / 180);
        const sinA3 = Math.sin(angles.n3 * Math.PI / 180);
        
        const denominator = sinA1 + sinA2 + sinA3;
        
        return {
            x: (n1.x * sinA1 + n2.x * sinA2 + n3.x * sinA3) / denominator,
            y: (n1.y * sinA1 + n2.y * sinA2 + n3.y * sinA3) / denominator
        };
    }

    calculateSubsystemCentroids() {
        // Check if system is initialized
        if (!this.isSystemInitialized()) {
            console.log('System not initialized for centroid calculations');
            return {
                ss1: { x: 0, y: 0 },
                ss2: { x: 0, y: 0 },
                ss3: { x: 0, y: 0 }
            };
        }

        // Ensure centroid exists
        if (!this.system.centroid) {
            this.system.centroid = {
                x: (this.system.n1.x + this.system.n2.x + this.system.n3.x) / 3,
                y: (this.system.n1.y + this.system.n2.y + this.system.n3.y) / 3
            };
        }

        try {
            return {
                ss1: this.calculateSubsystemCentroid(1),
                ss2: this.calculateSubsystemCentroid(2),
                ss3: this.calculateSubsystemCentroid(3)
            };
        } catch (error) {
            console.error('Error calculating subsystem centroids:', error);
            return {
                ss1: { x: 0, y: 0 },
                ss2: { x: 0, y: 0 },
                ss3: { x: 0, y: 0 }
            };
        }
    }

    /**
     * Calculates the Circumcenter for any three given points.
     * 
     * @param {Object} p1 - First point with properties x and y.
     * @param {Object} p2 - Second point with properties x and y.
     * @param {Object} p3 - Third point with properties x and y.
     * @returns {Object|null} Circumcenter with properties x and y, or null if undefined.
     */
    calculateCircumcenterForPoints(p1, p2, p3) {
        // Validate input points
        if (!p1 || !p2 || !p3 || 
            typeof p1.x === 'undefined' || typeof p1.y === 'undefined' ||
            typeof p2.x === 'undefined' || typeof p2.y === 'undefined' ||
            typeof p3.x === 'undefined' || typeof p3.y === 'undefined') {
            console.error("Invalid points passed to calculateCircumcenterForPoints:", { p1, p2, p3 });
            return null;
        }

        try {
            // Calculate midpoints
            const midAB = this.calculateMidpoint(p1, p2);
            const midBC = this.calculateMidpoint(p2, p3);

            // Calculate slopes
            const slopeAB = this.calculateSlope(p1, p2);
            const slopeBC = this.calculateSlope(p2, p3);

            // Calculate perpendicular slopes
            const perpSlopeAB = slopeAB !== Infinity ? -1 / slopeAB : 0;
            const perpSlopeBC = slopeBC !== Infinity ? -1 / slopeBC : 0;

            // Calculate intercepts
            const interceptAB = midAB.y - perpSlopeAB * midAB.x;
            const interceptBC = midBC.y - perpSlopeBC * midBC.x;

            const EPSILON = 1e-10;
            if (Math.abs(perpSlopeAB - perpSlopeBC) < EPSILON) {
                console.warn("Perpendicular bisectors are parallel.");
                return null;
            }

            let circumcenter;
            if (perpSlopeAB === Infinity) {
                const x = midAB.x;
                const y = perpSlopeBC * x + interceptBC;
                circumcenter = { x, y };
            } else if (perpSlopeBC === Infinity) {
                const x = midBC.x;
                const y = perpSlopeAB * x + interceptAB;
                circumcenter = { x, y };
            } else {
                const x = (interceptBC - interceptAB) / (perpSlopeAB - perpSlopeBC);
                const y = perpSlopeAB * x + interceptAB;
                circumcenter = { x, y };
            }

            // Round near-zero values
            if (Math.abs(circumcenter.x) < EPSILON) circumcenter.x = 0;
            if (Math.abs(circumcenter.y) < EPSILON) circumcenter.y = 0;

            return circumcenter;
        } catch (error) {
            console.error("Error in calculateCircumcenterForPoints:", error);
            return null;
        }
    }

    renamePreset(oldName, newName, values) {
        try {
            // Get existing presets
            const presets = JSON.parse(localStorage.getItem('userPresets') || '{}');
            
            // Delete old name and add with new name
            delete presets[oldName];
            presets[newName] = values;
            
            // Save back to localStorage
            localStorage.setItem('userPresets', JSON.stringify(presets));
            
            // Update dropdown
            this.updatePresetsDropdown();
            
            console.log(`Renamed preset from "${oldName}" to "${newName}"`);
        } catch (error) {
            console.error('Error renaming preset:', error);
            alert('Error renaming preset. Please try again.');
        }
    }

    updateAnimationsDropdown() {
        const animationsList = document.getElementById('animationsList');
        if (!animationsList) {
            console.error('Animations list element not found');
            return;
        }
        
        try {
            // Clear existing items
            animationsList.innerHTML = '';
            
            // Get animations from storage
            const animations = JSON.parse(localStorage.getItem('userAnimations') || '{}');
            
            // Sort animations alphabetically by name (case-insensitive)
            const sortedAnimations = Object.entries(animations)
                .sort(([nameA], [nameB]) => nameA.localeCompare(nameB));
            
            if (sortedAnimations.length > 0) {
                sortedAnimations.forEach(([name, config]) => {
                    const li = document.createElement('li');
                    const a = document.createElement('a');
                    a.className = 'dropdown-item';
                    a.href = '#';
                    
                    // Create container for name and buttons
                    const container = document.createElement('div');
                    container.className = 'preset-item-container';
                    
                    // Add animation name
                    const nameSpan = document.createElement('span');
                    nameSpan.className = 'preset-name';
                    nameSpan.textContent = name;
                    container.appendChild(nameSpan);
                    
                    // Add edit button
                    const editBtn = document.createElement('button');
                    editBtn.className = 'edit-btn';
                    editBtn.innerHTML = '✎';
                    editBtn.onclick = (e) => {
                        e.stopPropagation();
                        this.editAnimation(name, config);
                    };
                    container.appendChild(editBtn);
                    
                    // Add delete button
                    const deleteBtn = document.createElement('button');
                    deleteBtn.className = 'delete-btn';
                    deleteBtn.innerHTML = '×';
                    deleteBtn.onclick = (e) => {
                        e.stopPropagation();
                        this.deleteAnimation(name);
                    };
                    container.appendChild(deleteBtn);
                    
                    a.appendChild(container);
                    li.appendChild(a);
                    this.animationsList.appendChild(li);
                    
                    // Add click handler for loading animation
                    a.onclick = (e) => {
                        e.preventDefault();
                        this.playAnimation(name, config);
                    };
                });
            } else {
                const li = document.createElement('li');
                const a = document.createElement('a');
                a.className = 'dropdown-item disabled';
                a.href = '#';
                a.textContent = 'No saved animations';
                li.appendChild(a);
                this.animationsList.appendChild(li);
            }
            
        } catch (error) {
            console.error('Error updating animations dropdown:', error);
        }
    }

    // Add these new methods to handle editing and deleting animations
    editAnimation(name, config) {
        const newName = prompt('Enter new name for animation:', name);
        if (newName && newName !== name) {
            try {
                // Get current animations
                const animations = JSON.parse(localStorage.getItem('userAnimations') || '{}');
                
                // Delete old name and add with new name
                delete animations[name];
                animations[newName] = config;
                
                // Save back to storage
                localStorage.setItem('userAnimations', JSON.stringify(animations));
                
                // Refresh dropdown
                this.initializeAnimationsDropdown();
                
                console.log('Animation renamed:', name, 'to', newName);
            } catch (error) {
                console.error('Error editing animation:', error);
                alert('Error editing animation. Please try again.');
            }
        }
    }

    deleteAnimation(name) {
        if (confirm(`Are you sure you want to delete the animation "${name}"?`)) {
            try {
                // Get current animations
                const animations = JSON.parse(localStorage.getItem('userAnimations') || '{}');
                
                // Delete the animation
                delete animations[name];
                
                // Save back to storage
                localStorage.setItem('userAnimations', JSON.stringify(animations));
                
                // Refresh dropdown
                this.initializeAnimationsDropdown();
                
                console.log('Animation deleted:', name);
            } catch (error) {
                console.error('Error deleting animation:', error);
                alert('Error deleting animation. Please try again.');
            }
        }
    }

    // Add or update the startAnimation method
    startAnimation() {
        try {
            // Get start values from input fields
            const startState = {
                nc1: parseFloat(document.getElementById('animation-nc1-start').value),
                nc2: parseFloat(document.getElementById('animation-nc2-start').value),
                nc3: parseFloat(document.getElementById('animation-nc3-start').value)
            };

            // Get end values from input fields
            const endState = {
                nc1: parseFloat(document.getElementById('animation-nc1-end').value),
                nc2: parseFloat(document.getElementById('animation-nc2-end').value),
                nc3: parseFloat(document.getElementById('animation-nc3-end').value)
            };

            // Check if animation is already running
            if (this.isAnimating) {
                this.isAnimating = false;
                return;
            }

            // First reset to start position
            this.updateTriangleFromEdges(startState.nc1, startState.nc2, startState.nc3);
            
            // Animation parameters
            const duration = 4000; // 4 seconds
            let startTime = performance.now(); // Changed to let
            let forward = true;
            this.isAnimating = true;

            // Animation function
            const animate = (currentTime) => {
                if (!this.isAnimating) return;

                const elapsed = currentTime - startTime;
                let progress = (elapsed % duration) / duration;
                const loopCheckbox = document.getElementById('animation-loop');
                const isLooping = loopCheckbox?.checked;

                // Handle single play vs loop
                if (!isLooping && elapsed >= duration) {
                    // For single play, stop at end state
                    this.updateTriangleFromEdges(endState.nc1, endState.nc2, endState.nc3);
                    this.isAnimating = false;
                    return;
                } else if (isLooping && elapsed >= duration) {
                    // For loop, reverse direction and reset start time
                    forward = !forward; // Simplified direction toggle
                    startTime = currentTime; // Reset start time for next loop
                    progress = 0; // Reset progress
                }

                const effectiveProgress = forward ? progress : 1 - progress;

                // Calculate current values
                const current = {
                    nc1: startState.nc1 + (endState.nc1 - startState.nc1) * effectiveProgress,
                    nc2: startState.nc2 + (endState.nc2 - startState.nc2) * effectiveProgress,
                    nc3: startState.nc3 + (endState.nc3 - startState.nc3) * effectiveProgress
                };

                // Update triangle with current values
                this.updateTriangleFromEdges(current.nc1, current.nc2, current.nc3);
                
                // Continue animation
                if (this.isAnimating) {
                    requestAnimationFrame(animate);
                }
            };

            // Start animation
            requestAnimationFrame(animate);

        } catch (error) {
            console.error('Error in startAnimation:', error);
            this.isAnimating = false;
        }
    }

    loadAnimationPreset(name, values) {
        try {
            console.log('Loading animation preset:', name);
            console.log('Values received:', values);
            
            // First update end fields if they exist in the preset
            if (values.end) {
                console.log('Setting end values:', values.end);
                const endFields = {
                    'animation-nc1-end': values.end.nc1,
                    'animation-nc2-end': values.end.nc2,
                    'animation-nc3-end': values.end.nc3
                };

                Object.entries(endFields).forEach(([id, value]) => {
                    const input = document.getElementById(id);
                    if (input) {
                        input.value = Number(value).toFixed(2);
                        console.log(`Set ${id} to ${input.value}`);
                    }
                });
            }
            
            // Then update start fields and triangle position
            if (values.start) {
                console.log('Setting start values:', values.start);
                
                // Update start input fields
                const startFields = {
                    'animation-nc1-start': values.start.nc1,
                    'animation-nc2-start': values.start.nc2,
                    'animation-nc3-start': values.start.nc3
                };

                Object.entries(startFields).forEach(([id, value]) => {
                    const input = document.getElementById(id);
                    if (input) {
                        input.value = Number(value).toFixed(2);
                        console.log(`Set ${id} to ${input.value}`);
                    }
                });

                // Update the current triangle to match start state
                console.log('Updating triangle with start values:', values.start);
                this.updateTriangleFromEdges(
                    values.start.nc1,
                    values.start.nc2,
                    values.start.nc3
                );
            }
            
            // Redraw and update
            this.drawSystem();
            this.updateDashboard();
            
            console.log('Successfully loaded animation preset');
        } catch (error) {
            console.error('Error loading animation preset:', error);
            console.error('Error details:', error.message);
            alert('Error loading animation preset. Please check the console for details.');
        }
    }

    // Add this method to update triangle dimensions
    updateTriangle(nc1, nc2, nc3) {
        try {
            // Update manual control inputs to match current state
            const manualNc1Input = document.getElementById('manual-nc1');
            const manualNc2Input = document.getElementById('manual-nc2');
            const manualNc3Input = document.getElementById('manual-nc3');

            if (manualNc1Input && manualNc2Input && manualNc3Input) {
                manualNc1Input.value = nc1.toFixed(2);
                manualNc2Input.value = nc2.toFixed(2);
                manualNc3Input.value = nc3.toFixed(2);
            }

            // Apply the new dimensions
            this.applyManualInput(nc1, nc2, nc3);
            
            // Update the display
            this.drawSystem();
            this.updateDashboard();
        } catch (error) {
            console.error('Error in updateTriangle:', error);
        }
    }

    saveAnimation(name) {
        try {
            // Get start values from current triangle state
            const startValues = {
                nc1: this.calculateDistance(this.system.n1, this.system.n3),
                nc2: this.calculateDistance(this.system.n1, this.system.n2),
                nc3: this.calculateDistance(this.system.n2, this.system.n3)
            };

            // Get end values from inputs
            const endValues = {
                nc1: parseFloat(document.getElementById('animation-nc1-end').value),
                nc2: parseFloat(document.getElementById('animation-nc2-end').value),
                nc3: parseFloat(document.getElementById('animation-nc3-end').value)
            };

            // Log the values being saved
            console.log('Saving animation with values:', {
                name,
                start: startValues,
                end: endValues
            });

            // Get existing animations
            const animations = JSON.parse(localStorage.getItem('userAnimations') || '{}');
            
            // Save both start and end values
            animations[name] = {
                start: startValues,
                end: endValues
            };
            
            // Save to localStorage
            localStorage.setItem('userAnimations', JSON.stringify(animations));
            
            // Update dropdown
            this.updateAnimationsDropdown();
            
            console.log('Successfully saved animation:', name);
        } catch (error) {
            console.error('Error saving animation:', error);
            alert('Error saving animation. Please try again.');
        }
    }

    drawSubtriangle(ctx) {
        if (!this.showSubtriangle) return;
        
        const subtriangleCentroids = {
            ss1: this.calculateSubsystemCentroid(1),
            ss2: this.calculateSubsystemCentroid(2),
            ss3: this.calculateSubsystemCentroid(3)
        };
        
        // Draw the subtriangle in white
        ctx.strokeStyle = '#fba900';  // Changed from #ff0000 to white
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(subtriangleCentroids.ss1.x, subtriangleCentroids.ss1.y);
        ctx.lineTo(subtriangleCentroids.ss2.x, subtriangleCentroids.ss2.y);
        ctx.lineTo(subtriangleCentroids.ss3.x, subtriangleCentroids.ss3.y);
        ctx.closePath();
        ctx.stroke();
    
    }

    /**
     * Draws the circle that passes through the subsystem centroids
     * @param {CanvasRenderingContext2D} ctx 
     */
    drawSubcircle(ctx) {
        if (!this.showSubcircle) return;
        
        // Use the calculateSubcircle method instead of direct calculation
        const { center, radius } = this.calculateSubcircle();
        if (!center || !radius) return;
        
        // Draw the circle in white
        ctx.strokeStyle = '#fba900';
        ctx.setLineDash([5, 5]);  // Add dashed line
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(center.x, center.y, radius, 0, 2 * Math.PI);
        ctx.stroke();
        ctx.setLineDash([]);  // Reset dash pattern
    }

    calculateSubcircle() {
        try {
            if (!this.isSystemInitialized()) {
                console.log('System not initialized for subcircle calculation');
                return { center: null, radius: 0 };
            }

            const centroids = {
                ss1: this.calculateSubsystemCentroid(1),
                ss2: this.calculateSubsystemCentroid(2),
                ss3: this.calculateSubsystemCentroid(3)
            };

            // Verify centroids are valid
            if (!centroids.ss1 || !centroids.ss2 || !centroids.ss3 ||
                (centroids.ss1.x === 0 && centroids.ss1.y === 0) ||
                (centroids.ss2.x === 0 && centroids.ss2.y === 0) ||
                (centroids.ss3.x === 0 && centroids.ss3.y === 0)) {
                console.log('Invalid centroids for subcircle calculation');
                return { center: null, radius: 0 };
            }

            // Calculate circumcenter of the subtriangle formed by the centroids
            const a = centroids.ss1;
            const b = centroids.ss2;
            const c = centroids.ss3;

            // Calculate center using circumcenter formula
            const d = 2 * (a.x * (b.y - c.y) + b.x * (c.y - a.y) + c.x * (a.y - b.y));
            
            if (Math.abs(d) < 1e-10) {
                console.log('Points are collinear, cannot form a circle');
                return { center: null, radius: 0 };
            }

            const center = {
                x: ((a.x * a.x + a.y * a.y) * (b.y - c.y) + 
                    (b.x * b.x + b.y * b.y) * (c.y - a.y) + 
                    (c.x * c.x + c.y * c.y) * (a.y - b.y)) / d,
                y: ((a.x * a.x + a.y * a.y) * (c.x - b.x) + 
                    (b.x * b.x + b.y * b.y) * (a.x - c.x) + 
                    (c.x * c.x + c.y * c.y) * (b.x - a.x)) / d
            };

            // Calculate radius as distance from center to any centroid
            const radius = Math.sqrt(
                Math.pow(center.x - a.x, 2) + 
                Math.pow(center.y - a.y, 2)
            );

            return { center, radius };

        } catch (error) {
            console.error('Error calculating subcircle:', error);
            return { center: null, radius: 0 };
        }
    }

    /**
     * Draws the subcenter of the triangle (center of the subcircle).
     * @param {CanvasRenderingContext2D} ctx 
     */
    drawSubcenter(ctx) {
        if (!this.showSubcenter || !this.isSystemInitialized()) {
            return;
        }

        const subcircle = this.calculateSubcircle();
        if (!subcircle?.center) {
            console.log('No valid subcenter to draw');
            return;
        }

        // Draw subcenter point in white instead of orange
        ctx.beginPath();
        ctx.fillStyle = '#fba900';  // Changed from '#FFA500' to white
        ctx.arc(
            subcircle.center.x,
            subcircle.center.y,
            4, // Point size
            0,
            2 * Math.PI
        );
        ctx.fill();

        // Label the subcenter in white
        ctx.save();
        ctx.scale(1, -1); // Flip text right-side up
        ctx.fillStyle = '#fba900';  // Changed from '#FFA500' to white
        ctx.font = '12px Arial';
        ctx.fillText('SP', subcircle.center.x + 10, -subcircle.center.y);
        ctx.restore();
    }

    // Add helper function inside the class
    setElementValue(selector, value) {
        const element = document.querySelector(selector);
        if (element) {
            element.value = value;
        }
    }

    // Helper method to calculate subsystem centroid
    calculateSubsystemCentroid(subsystemIndex) {
        try {
            const centroid = this.calculateCentroid();
            const nodes = {
                1: [this.system.n1, this.system.n3], // SS1: N1-N3-I
                2: [this.system.n1, this.system.n2], // SS2: N1-N2-I
                3: [this.system.n2, this.system.n3]  // SS3: N2-N3-I
            };

            const [n1, n2] = nodes[subsystemIndex];
            return {
                x: (n1.x + n2.x + centroid.x) / 3,
                y: (n1.y + n2.y + centroid.y) / 3
            };
        } catch (error) {
            console.error('Error calculating subsystem centroid:', error);
            return { x: 0, y: 0 }; // Return default values on error
        }
    }

    // Helper method to get vertices for a specific subsystem
    getSubsystemVertices(subsystemIndex) {
        if (!this.isSystemInitialized()) {
            return null;
        }

        // Calculate centroid if not already set
        if (!this.system.centroid) {
            this.system.centroid = {
                x: (this.system.n1.x + this.system.n2.x + this.system.n3.x) / 3,
                y: (this.system.n1.y + this.system.n2.y + this.system.n3.y) / 3
            };
        }

        switch (subsystemIndex) {
            case 1: return [this.system.n1, this.system.n2, this.system.centroid];
            case 2: return [this.system.n2, this.system.n3, this.system.centroid];
            case 3: return [this.system.n3, this.system.n1, this.system.centroid];
            default: return null;
        }
    }

    // Helper method to calculate area of triangle formed by three points
    calculateSubtriangleArea(points) {
        const { ss1, ss2, ss3 } = points;
        return Math.abs(
            (ss1.x * (ss2.y - ss3.y) +
             ss2.x * (ss3.y - ss1.y) +
             ss3.x * (ss1.y - ss2.y)) /2
        );
    }

    // Add this method to check if system is ready for calculations
    isSystemInitialized() {
        return Boolean(
            this.system?.n1?.x !== undefined &&
            this.system?.n1?.y !== undefined &&
            this.system?.n2?.x !== undefined &&
            this.system?.n2?.y !== undefined &&
            this.system?.n3?.x !== undefined &&
            this.system?.n3?.y !== undefined
        );
    }

    // Add toggle method for subcenter
    toggleSubcenter() {
        this.showSubcenter = !this.showSubcenter;
        console.log('Subcenter toggled:', this.showSubcenter);
        this.drawSystem();
    }

    // Add new method to update IC fields
    updateICFields() {
        try {
            // Calculate centroid (I)
            const centroid = this.calculateCentroid();

            // Calculate I-Channel distances from centroid to each node
            const icValues = {
                'manual-ic1': this.calculateDistance(centroid, this.system.n1),  // I to Node 1
                'manual-ic2': this.calculateDistance(centroid, this.system.n2),  // I to Node 2
                'manual-ic3': this.calculateDistance(centroid, this.system.n3)   // I to Node 3
            };

            // Debug log for Manual IC Values
            console.log('Calculated Manual IC Values:', icValues);

            // Update Manual IC Fields while preserving editability
            Object.entries(icValues).forEach(([id, value]) => {
                const input = document.getElementById(id);
                if (input && !input.matches(':focus')) {
                    input.value = value.toFixed(2);
                    input.readOnly = false;
                }
            });

            // Update Dashboard IC Fields with correct IDs
            const dashboardICValues = {
                'ic-1': icValues['manual-ic1'].toFixed(2),  // Changed from d-ic1
                'ic-2': icValues['manual-ic2'].toFixed(2),  // Changed from d-ic2
                'ic-3': icValues['manual-ic3'].toFixed(2)   // Changed from d-ic3
            };

            // Debug log for Dashboard IC Values
            console.log('Calculated Dashboard IC Values:', dashboardICValues);

            Object.entries(dashboardICValues).forEach(([id, value]) => {
                const input = document.getElementById(id);
                if (input && !input.matches(':focus')) {
                    input.value = value;
                }
            });

        } catch (error) {
            console.error('Error updating I-Channel (IC) fields:', error);
            console.error('\n Stack trace:', error.stack);
        }
    }

    /**
     * Updates the triangle based on IC values using an iterative approach
     * to maintain the exact submitted IC value.
     * @param {number} targetIC1 - Desired distance from centroid to Node 1
     * @param {number} targetIC2 - Desired distance from centroid to Node 2
     * @param {number} targetIC3 - Desired distance from centroid to Node 3
     */
    updateTriangleFromIC(targetIC1, targetIC2, targetIC3) {
        // Store current IC values
        const centroid = this.calculateCentroid();
        const currentIC1 = this.calculateDistance(centroid, this.system.n1);
        const currentIC2 = this.calculateDistance(centroid, this.system.n2);
        const currentIC3 = this.calculateDistance(centroid, this.system.n3);
        
        // Determine which IC value changed by finding largest difference
        const changes = [
            Math.abs(targetIC1 - currentIC1),
            Math.abs(targetIC2 - currentIC2),
            Math.abs(targetIC3 - currentIC3)
        ];
        
        const maxChangeIndex = changes.indexOf(Math.max(...changes));
        const targetValue = [targetIC1, targetIC2, targetIC3][maxChangeIndex];
        
        // Store the ratios of the unchanged IC values relative to each other
        let ratio12, ratio23, ratio13;
        if (maxChangeIndex === 0) {
            // IC1 changed, preserve IC2/IC3 ratio
            ratio23 = currentIC2 / currentIC3;
        } else if (maxChangeIndex === 1) {
            // IC2 changed, preserve IC1/IC3 ratio
            ratio13 = currentIC1 / currentIC3;
        } else {
            // IC3 changed, preserve IC1/IC2 ratio
            ratio12 = currentIC1 / currentIC2;
        }
        
        // Initial positioning with 120° angles
        const angles = [90, 210, 330]; // Degrees
        
        // Iterative adjustment
        const maxIterations = 100;
        let iteration = 0;
        const epsilon = 0.001;
        
        while (iteration < maxIterations) {
            // Update centroid
            const currentCentroid = this.calculateCentroid();
            
            // Get current IC values
            const currIC1 = this.calculateDistance(currentCentroid, this.system.n1);
            const currIC2 = this.calculateDistance(currentCentroid, this.system.n2);
            const currIC3 = this.calculateDistance(currentCentroid, this.system.n3);
            
            // Check if target IC is achieved
            const targetNode = this.system[`n${maxChangeIndex + 1}`];
            const currentTargetIC = this.calculateDistance(currentCentroid, targetNode);
            
            if (Math.abs(currentTargetIC - targetValue) < epsilon) {
                break;
            }
            
            // Calculate scaling factors
            const targetScale = targetValue / currentTargetIC;
            
            // Adjust the target node
            const dx = targetNode.x - currentCentroid.x;
            const dy = targetNode.y - currentCentroid.y;
            targetNode.x = currentCentroid.x + dx * targetScale;
            targetNode.y = currentCentroid.y + dy * targetScale;
            
            // Adjust other nodes while maintaining their ratio
            if (maxChangeIndex === 0) {
                // Adjust n2 and n3 maintaining their ratio
                const desiredIC2 = currIC2 * Math.sqrt(targetScale);
                const desiredIC3 = desiredIC2 / ratio23;
                
                this.adjustNodePosition(2, desiredIC2, currentCentroid);
                this.adjustNodePosition(3, desiredIC3, currentCentroid);
            } else if (maxChangeIndex === 1) {
                // Adjust n1 and n3 maintaining their ratio
                const desiredIC1 = currIC1 * Math.sqrt(targetScale);
                const desiredIC3 = desiredIC1 / ratio13;
                
                this.adjustNodePosition(1, desiredIC1, currentCentroid);
                this.adjustNodePosition(3, desiredIC3, currentCentroid);
            } else {
                // Adjust n1 and n2 maintaining their ratio
                const desiredIC1 = currIC1 * Math.sqrt(targetScale);
                const desiredIC2 = desiredIC1 / ratio12;
                
                this.adjustNodePosition(1, desiredIC1, currentCentroid);
                this.adjustNodePosition(2, desiredIC2, currentCentroid);
            }
            
            iteration++;
        }
        
        // Final adjustments
        this.adjustTriangleToOrigin();
        this.updateManualFields();
        this.updateDerivedPoints();
    }

    /**
     * Helper method to adjust a node's position to achieve desired IC value
     * @param {number} nodeIndex - Index of node to adjust (1, 2, or 3)
     * @param {number} desiredIC - Desired IC value
     * @param {Object} centroid - Current centroid position
     */
    adjustNodePosition(nodeIndex, desiredIC, centroid) {
        const node = this.system[`n${nodeIndex}`];
        const currentIC = this.calculateDistance(centroid, node);
        const scale = desiredIC / currentIC;
        
        const dx = node.x - centroid.x;
        const dy = node.y - centroid.y;
        
        node.x = centroid.x + dx * scale;
        node.y = centroid.y + dy * scale;
    }

    /**
     * Updates triangle to satisfy multiple IC/NC constraints
     * @param {Object} constraints - Object containing target values and their priorities
     * Example: {
     *   ic: { value1: 193.21, value2: 193.21, value3: null, priority: 1 },
     *   nc: { value1: null, value2: null, value3: 193.21, priority: 1 }
     * }
     */
    updateTriangleWithConstraints(constraints) {
        const maxIterations = 100;
        let iteration = 0;
        const epsilon = 0.001;
        
        // Sort constraints by priority
        const activeConstraints = [];
        
        // Add IC constraints
        if (constraints.ic) {
            if (constraints.ic.value1 !== null) {
                activeConstraints.push({
                    type: 'ic',
                    index: 1,
                    value: constraints.ic.value1,
                    priority: constraints.ic.priority
                });
            }
            // Similar for value2 and value3
        }
        
        // Add NC constraints
        if (constraints.nc) {
            if (constraints.nc.value3 !== null) {
                activeConstraints.push({
                    type: 'nc',
                    index: 3,
                    value: constraints.nc.value3,
                    priority: constraints.nc.priority
                });
            }
            // Similar for value1 and value2
        }
        
        // Sort by priority (higher priority first)
        activeConstraints.sort((a, b) => b.priority - a.priority);
        
        while (iteration < maxIterations) {
            let maxError = 0;
            
            // Apply each constraint while trying to maintain others
            for (const constraint of activeConstraints) {
                if (constraint.type === 'ic') {
                    const currentIC = this.getICValue(constraint.index);
                    const error = Math.abs(currentIC - constraint.value);
                    maxError = Math.max(maxError, error);
                    
                    if (error > epsilon) {
                        this.adjustICValueMaintainingOthers(
                            constraint.index,
                            constraint.value,
                            activeConstraints.filter(c => c !== constraint)
                        );
                    }
                } else if (constraint.type === 'nc') {
                    const currentNC = this.getNCValue(constraint.index);
                    const error = Math.abs(currentNC - constraint.value);
                    maxError = Math.max(maxError, error);
                    
                    if (error > epsilon) {
                        this.adjustNCValueMaintainingOthers(
                            constraint.index,
                            constraint.value,
                            activeConstraints.filter(c => c !== constraint)
                        );
                    }
                }
            }
            
            // Check if all constraints are satisfied within epsilon
            if (maxError < epsilon) {
                break;
            }
            
            iteration++;
        }
        
        // Final adjustments
        this.adjustTriangleToOrigin();
        this.updateManualFields();
        this.updateDerivedPoints();
    }
    
    /**
     * Adjusts an IC value while trying to maintain other constraints
     */
    adjustICValueMaintainingOthers(index, targetValue, otherConstraints) {
        const centroid = this.calculateCentroid();
        const node = this.system[`n${index}`];
        const currentIC = this.calculateDistance(centroid, node);
        const scale = targetValue / currentIC;
        
        // First, adjust the target IC
        const dx = node.x - centroid.x;
        const dy = node.y - centroid.y;
        node.x = centroid.x + dx * scale;
        node.y = centroid.y + dy * scale;
        
        // Then adjust other nodes to maintain other constraints
        for (const constraint of otherConstraints) {
            if (constraint.type === 'ic') {
                this.adjustNodePosition(constraint.index, constraint.value, centroid);
            } else if (constraint.type === 'nc') {
                this.adjustNCValue(constraint.index, constraint.value);
            }
        }
    }
    
    /**
     * Helper method to get current IC value
     */
    getICValue(index) {
        const centroid = this.calculateCentroid();
        return this.calculateDistance(centroid, this.system[`n${index}`]);
    }
    
    /**
     * Helper method to get current NC value
     */
    getNCValue(index) {
        const nodes = {
            1: [2, 3],
            2: [1, 3],
            3: [1, 2]
        };
        const [n1, n2] = nodes[index];
        return this.calculateDistance(
            this.system[`n${n1}`],
            this.system[`n${n2}`]
        );
    }

    // Add this method to calculate Euler Line length and ratios
    calculateEulerLineMetrics() {
        // Check if triangle is equilateral
        if (this.isIsosceles() && Math.abs(this.calculateAngles().n1 - 60) < 0.1) {
            return {
                eulerLineLength: "0.00",
                eulerLineSlope: "∞",
                eulerLineAngle: "∞",
                oToIRatio: "∞",
                iToSPRatio: "∞",
                spToNPRatio: "∞",
                npToHORatio: "∞",
                intersectionAngles: {
                    nc1_acute: "",
                    nc1_obtuse: "∞",
                    nc2_acute: "∞",
                    nc2_obtuse: "∞",
                    nc3_acute: "∞",
                    nc3_obtuse: "∞"
                }
            };
        }

        console.log('Calculating Euler Line metrics...');
        
        // Check for required points
        if (!this.system?.circumcenter || !this.system?.orthocenter) {
            console.log('Missing basic Euler line points');
            return {
                eulerLineLength: "0.00",
                eulerLineSlope: "0.0000",
                eulerLineAngle: "0.00",  // Add this line
                oToIRatio: "0.0000",
                iToSPRatio: "0.0000",
                spToNPRatio: "0.0000",
                npToHORatio: "0.0000"
            };
        }

        try {
            // Calculate Euler Line length (distance from O to HO)
            const eulerLineLength = this.calculateDistance(
                this.system.circumcenter,
                this.system.orthocenter
            );

            // If points are essentially coincident (equilateral triangle case)
            if (eulerLineLength < 0.0001) {
                return {
                    eulerLineLength: "0.00",
                    eulerLineSlope: "∞",
                    eulerLineAngle: "∞",  // Changed from "0.00" to "∞"
                    oToIRatio: "0.0000",
                    iToSPRatio: "0.0000",
                    spToNPRatio: "0.0000",
                    npToHORatio: "0.0000"
                };
            }

            // Calculate Euler Line slope and angle
            const dx = this.system.circumcenter.x - this.system.orthocenter.x;  // Swap direction
            const dy = this.system.circumcenter.y - this.system.orthocenter.y;  // Swap direction
            const eulerLineSlope = dx !== 0 ? (dy / dx) : Infinity;
            
            // Calculate angle using atan2 and normalize it
            const eulerLineAngle = Math.atan2(dy, dx) * (180 / Math.PI);
            const normalizedAngle = eulerLineAngle >180 ? eulerLineAngle - 360 : eulerLineAngle;

            // Initialize metrics object with default values
            const metrics = {
                eulerLineLength: eulerLineLength.toFixed(2),
                eulerLineSlope: eulerLineSlope === Infinity ? "∞" : eulerLineSlope.toFixed(4),
                eulerLineAngle: normalizedAngle.toFixed(2),  // Add this line
                oToIRatio: "0.0000",
                iToSPRatio: "0.0000",
                spToNPRatio: "0.0000",
                npToHORatio: "0.0000"
            };

            // Only calculate ratios if points exist and eulerLineLength is not zero
            if (eulerLineLength >0.0001) {
                metrics.oToIRatio = (this.calculateDistance(this.system.circumcenter, this.system.centroid) / eulerLineLength).toFixed(4);
                
                if (this.system.subcenter) {
                    metrics.iToSPRatio = (this.calculateDistance(this.system.centroid, this.system.subcenter) / eulerLineLength).toFixed(4);
                }

                if (this.system.ninePointCenter && this.system.subcenter) {
                    metrics.spToNPRatio = (this.calculateDistance(this.system.subcenter, this.system.ninePointCenter) / eulerLineLength).toFixed(4);
                }

                if (this.system.ninePointCenter) {
                    metrics.npToHORatio = (this.calculateDistance(this.system.ninePointCenter, this.system.orthocenter) / eulerLineLength).toFixed(4);
                }
            }

            // Add intersection angles if Euler Line exists
            if (eulerLineLength >0.0001) {
                const intersectionAngles = this.calculateEulerLineIntersectionAngles();
                metrics.intersectionAngles = intersectionAngles;
            } else {
                // If triangle is equilateral or Euler Line doesn't exist
                metrics.intersectionAngles = {
                    nc1_acute: "∞",
                    nc1_obtuse: "∞",
                    nc2_acute: "∞",
                    nc2_obtuse: "∞",
                    nc3_acute: "∞",
                    nc3_obtuse: "∞"
                };
            }

            return metrics;
        } catch (error) {
            console.error('Error calculating Euler Line metrics:', error);
            return {
                eulerLineLength: "0.00",
                eulerLineSlope: "0.0000",
                eulerLineAngle: "∞",  // Changed here too for consistency
                oToIRatio: "0.0000",
                iToSPRatio: "0.0000",
                spToNPRatio: "0.0000",
                npToHORatio: "0.0000"
            };
        }
    }

    calculateNCSlopes() {
        const { n1, n2, n3 } = this.system;
        
        // Calculate slopes for each NC (node channel)
        const slopes = {
            nc1: this.calculateSlope(n1, n3),
            nc2: this.calculateSlope(n1, n2),
            nc3: this.calculateSlope(n2, n3)
        };
        
        return slopes;
    }

    // Helper method to calculate slope between two points
    calculateSlope(point1, point2) {
        const dx = point2.x - point1.x;
        const dy = point2.y - point1.y;
        
        // Handle vertical lines
        if (Math.abs(dx) < 1e-10) {
            return Infinity;
        }
        
        return dy / dx;
    }

    calculateEulerLineIntersectionAngles() {
        try {
            const epsilon = 1e-6;
            
            // Get Euler Line points
            const { orthocenter, circumcenter } = this.system;
            if (!orthocenter || !circumcenter) return null;

            // Calculate Euler Line angle
            let elAngle = Math.atan2(
                circumcenter.y - orthocenter.y,
                circumcenter.x - orthocenter.x
            ) * (180 / Math.PI);
            
            // Normalize Euler line angle to positive value
            if (elAngle < 0) elAngle += 360;
            
            console.log('Euler Line:', {
                orthocenter: `(${orthocenter.x}, ${orthocenter.y})`,
                circumcenter: `(${circumcenter.x}, ${circumcenter.y})`,
                angle: elAngle
            });
            
            const ncs = [
                { id: 'nc1', points: [this.system.n1, this.system.n3] },
                { id: 'nc2', points: [this.system.n1, this.system.n2] },
                { id: 'nc3', points: [this.system.n2, this.system.n3] }
            ];

            const angles = {};

            ncs.forEach(nc => {
                console.log(`\nChecking ${nc.id}:`, {
                    start: `(${nc.points[0].x}, ${nc.points[0].y})`,
                    end: `(${nc.points[1].x}, ${nc.points[1].y})`
                });

                const intersects = this.lineSegmentsIntersect(
                    orthocenter, circumcenter,
                    nc.points[0], nc.points[1]
                );

                if (!intersects) {
                    angles[`${nc.id}_acute`] = "∞";
                    angles[`${nc.id}_obtuse`] = "∞";
                } else {
                    let ncAngle = Math.atan2(
                        nc.points[1].y - nc.points[0].y,
                        nc.points[1].x - nc.points[0].x
                    ) * (180 / Math.PI);
                    
                    if (ncAngle < 0) ncAngle += 360;
                    
                    let angleDiff = Math.abs(ncAngle - elAngle);
                    if (angleDiff > 180) angleDiff = 360 - angleDiff;
                    if (angleDiff > 90) angleDiff = 180 - angleDiff;
                    
                    console.log(`${nc.id} calculation:`, {
                        ncAngle,
                        elAngle,
                        rawDiff: Math.abs(ncAngle - elAngle),
                        normalizedDiff: angleDiff
                    });
                    
                    angles[`${nc.id}_acute`] = angleDiff.toFixed(2);
                    angles[`${nc.id}_obtuse`] = (180 - angleDiff).toFixed(2);
                }
            });

            return angles;
        } catch (error) {
            console.error('Error calculating angles:', error);
            return {
                nc1_acute: "∞",
                nc1_obtuse: "∞",
                nc2_acute: "∞",
                nc2_obtuse: "∞",
                nc3_acute: "∞",
                nc3_obtuse: "∞"
            };
        }
    }

    lineSegmentsIntersect(p1, p2, p3, p4) {
        const epsilon = 1e-6;
        
        // First try normal intersection
        const denominator = (p4.y - p3.y) * (p2.x - p1.x) - (p4.x - p3.x) * (p2.y - p1.y);
        if (Math.abs(denominator) < epsilon) {
            console.log('Lines are parallel or coincident');
            return false;
        }

        const ua = ((p4.x - p3.x) * (p1.y - p3.y) - (p4.y - p3.y) * (p1.x - p3.x)) / denominator;
        const ub = ((p2.x - p1.x) * (p1.y - p3.y) - (p2.y - p1.y) * (p1.x - p3.x)) / denominator;

        // Get intersection point
        const x = p1.x + ua * (p2.x - p1.x);
        const y = p1.y + ua * (p2.y - p1.y);

        // If we find a regular intersection, check if it's at a node
        if (ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1) {
            // Check if intersection is at a node
            const nodes = [this.system.n1, this.system.n2, this.system.n3];
            const isNode = nodes.some(node => 
                Math.abs(x - node.x) < epsilon && Math.abs(y - node.y) < epsilon
            );
            
            if (isNode) {
                console.log('Intersection is at a node - ignoring');
                return false;
            }
            return true;
        }

        // For acute triangles, check if NC intersects extended Euler line
        const angles = this.calculateAngles();
        if (angles.n1 < 90 && angles.n2 < 90 && angles.n3 < 90) {
            // Only check if intersection is within NC segment
            if (ub >= 0 && ub <= 1) {
                // Check if intersection is at a node
                const nodes = [this.system.n1, this.system.n2, this.system.n3];
                const isNode = nodes.some(node => 
                    Math.abs(x - node.x) < epsilon && Math.abs(y - node.y) < epsilon
                );
                
                if (isNode) {
                    console.log('Intersection is at a node - ignoring');
                    return false;
                }
                return true;
            }
        }

        return false;
    }

    isRightAngled() {
        const angles = this.calculateAngles();
        return Math.abs(angles.n1 - 90) < 0.1 || 
               Math.abs(angles.n2 - 90) < 0.1 || 
               Math.abs(angles.n3 - 90) < 0.1;
    }

    isIsosceles() {
        const { n1, n2, n3 } = this.system;
        const sides = {
            nc1: this.calculateDistance(n1, n3),
            nc2: this.calculateDistance(n1, n2),
            nc3: this.calculateDistance(n2, n3)
        };
        
        const epsilon = 0.0001;
        return Math.abs(sides.nc1 - sides.nc2) < epsilon ||
               Math.abs(sides.nc2 - sides.nc3) < epsilon ||
               Math.abs(sides.nc3 - sides.nc1) < epsilon;
    }

    drawLabels() {
        const ctx = this.ctx;
        ctx.font = '14px Arial';
        
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Update Incenter label from ICP to IN
        if (this.system.incenter) {
            ctx.fillText('IN', 
                this.system.incenter.x + 15, 
                this.system.incenter.y + 15
            );
        }
    }

    // Add new method to update rNC(M,T) fields
    updateRNCMTFields() {
        try {
            // Use the stored midpoints instead of recalculating
            const midpoints = this.system.midpoints;
            const tangentPoints = this.calculateTangents();

            if (!midpoints || !tangentPoints) {
                console.warn('Midpoints or Tangent Points are undefined');
                return;
            }
            
            // Calculate NC lengths with correct mapping
            const ncLengths = {
                nc1: this.calculateDistance(this.system.n1, this.system.n3),  // NC1: N1-N3
                nc2: this.calculateDistance(this.system.n1, this.system.n2),  // NC2: N1-N2
                nc3: this.calculateDistance(this.system.n2, this.system.n3)   // NC3: N2-N3
            };

            // Add debug logging
            console.log('Midpoints:', midpoints);
            console.log('Tangent Points:', tangentPoints);
            console.log('NC Lengths:', ncLengths);

            // Calculate and update each rNC(M,T) value
            ['1', '2', '3'].forEach((i) => {
                const dMT = this.calculateDistance(midpoints[`m${i}`], tangentPoints[i - 1]);
                const ncLength = ncLengths[`nc${i}`];
                const rMTNC = ncLength !== 0 ? dMT / ncLength : 0;
                
                console.log(`Channel ${i}:`, { dMT, ncLength, rMTNC });
                
                const input = document.getElementById(`r-m-t-nc${i}`);
                if (input) {
                    input.value = rMTNC.toFixed(4);
                } else {
                    console.warn(`Input element not found: r-m-t-nc${i}`);
                }
            });
        } catch (error) {
            console.error('Error updating rNC(M,T) fields:', error);
            console.error('\n Stack trace:', error.stack);
        }
    }

    // Helper methods for subsystem calculations
    calculateSubsystemAngle(index) {
        const angles = this.calculateAngles();
        return angles[`n${index}`];
    }

    calculateSubsystemEntropy(index) {
        // Calculate perimeter of the subsystem
        const nodes = {
            1: [this.system.n1, this.system.n2, this.system.centroid],
            2: [this.system.n2, this.system.n3, this.system.centroid],
            3: [this.system.n3, this.system.n1, this.system.centroid]
        };
        
        const [n1, n2, c] = nodes[index];
        return this.calculateDistance(n1, n2) + 
               this.calculateDistance(n2, c) + 
               this.calculateDistance(c, n1);
    }

    calculateSubsystemCapacity(index) {
        // Calculate area of the subsystem triangle
        const nodes = {
            1: [this.system.n1, this.system.n2, this.system.centroid],
            2: [this.system.n2, this.system.n3, this.system.centroid],
            3: [this.system.n3, this.system.n1, this.system.centroid]
        };
        
        const [n1, n2, c] = nodes[index];
        return Math.abs((n1.x * (n2.y - c.y) + n2.x * (c.y - n1.y) + c.x * (n1.y - n2.y)) /2);
    }

    calculateTotalEntropy() {
        // Calculate total entropy based on subsystem angles and entropies
        const subsystemAngles = this.calculateSubsystemAngles();
        const subsystemEntropies = [this.calculateSubsystemEntropy(1), this.calculateSubsystemEntropy(2), this.calculateSubsystemEntropy(3)];
        const totalEntropy = subsystemEntropies.reduce((sum, entropy) => sum + entropy, 0);
        return totalEntropy;
    }

    // Helper method to calculate angle at a point between two other points
    calculateAngleAtPoint(p1, center, p2) {
        const v1 = {
            x: p1.x - center.x,
            y: p1.y - center.y
        };
        const v2 = {
            x: p2.x - center.x,
            y: p2.y - center.y
        };
        
        const dot = v1.x * v2.x + v1.y * v2.y;
        const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
        const mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);
        
        return Math.acos(dot / (mag1 * mag2)) * (180 / Math.PI);
    }

    updateSubsystemsTable() {
        try {
            const centroid = this.calculateCentroid();
            const totalSystemEntropy = this.calculateTotalEntropy();
            
            // Debug total system entropy
            console.log('=== Subsystem Table Update ===');
            console.log('Total System Entropy:', totalSystemEntropy);
            
            for (let i =1; i <= 3; i++) {
                // Calculate ssh
                let ssh;
                if (i === 1) {
                    ssh = this.calculateDistance(this.system.n1, this.system.n3) +
                          this.calculateDistance(this.system.n1, centroid) +
                          this.calculateDistance(this.system.n3, centroid);
                } else if (i === 2) {
                    ssh = this.calculateDistance(this.system.n1, this.system.n2) +
                          this.calculateDistance(this.system.n1, centroid) +
                          this.calculateDistance(this.system.n2, centroid);
                } else {
                    ssh = this.calculateDistance(this.system.n2, this.system.n3) +
                          this.calculateDistance(this.system.n2, centroid) +
                          this.calculateDistance(this.system.n3, centroid);
                }

                // Debug values
                console.log(`Subsystem ${i}:`, {
                    ssh,
                    'ssh/H': (ssh/totalSystemEntropy).toFixed(4),
                    'H/ssh': (totalSystemEntropy/ssh).toFixed(4)
                });

                // Force update the entropy ratio fields
                const inverseRatioField = document.getElementById(`subsystem-${i}-inverse-ratio`);
                const entropyRatioField = document.getElementById(`subsystem-${i}-entropy-ratio`);

                if (inverseRatioField && entropyRatioField) {
                    // Clear existing values first
                    inverseRatioField.value = '';
                    entropyRatioField.value = '';

                    // Force style updates
                    Object.assign(inverseRatioField.style, {
                        backgroundColor: '#2b4280',
                        color: '#fff',
                        textAlign: 'center',
                        width: '8ch',
                        minWidth: '8ch'
                    });

                    Object.assign(entropyRatioField.style, {
                        backgroundColor: '#2b4280',
                        color: '#fff',
                        textAlign: 'center',
                        width: '8ch',
                        minWidth: '8ch'
                    });

                    // Set new values with a slight delay
                    setTimeout(() => {
                        if (totalSystemEntropy !== 0 && ssh !== 0) {
                            inverseRatioField.value = (ssh/totalSystemEntropy).toFixed(4);
                            entropyRatioField.value = (totalSystemEntropy/ssh).toFixed(4);
                            
                            // Debug - verify values were set
                            console.log(`Set values for subsystem ${i}:`, {
                                'ssh/H field': inverseRatioField.value,
                                'H/ssh field': entropyRatioField.value
                            });
                        }
                    }, 0);
                } else {
                    console.error(`Missing fields for subsystem ${i}:`, {
                        'inverse-ratio': !!inverseRatioField,
                        'entropy-ratio': !!entropyRatioField
                    });
                }
            }

        } catch (error) {
            console.error('Error updating subsystems table:', error);
            console.error(error.stack);
        }
    }

    // Keep our working angle calculation method unchanged
    calculateSubsystemAngle(startNode, endNode, center) {
        // If any of the points are at the same location, return 0
        if (!startNode || !endNode || !center || 
            (startNode.x === endNode.x && startNode.y === endNode.y)) {
            return 0;
        }

        const v1 = {
            x: startNode.x - center.x,
            y: startNode.y - center.y
        };
        const v2 = {
            x: endNode.x - center.x,
            y: endNode.y - center.y
        };

        // If vectors are zero length, return 0
        if ((v1.x === 0 && v1.y === 0) || (v2.x === 0 && v2.y === 0)) {
            return 0;
        }

        const angle1 = Math.atan2(v1.y, v1.x);
        const angle2 = Math.atan2(v2.y, v2.x);
        
        let angle = (angle2 - angle1) * (180 / Math.PI);
        if (angle < 0) {
            angle += 360;
        }
        
        return angle;
    }

    // Update the label drawing methods to use the new shadow effect
    drawNodeLabel(ctx, node, label) {
        const offsetX = 15;
        const offsetY = 5;
        (ctx, label, node.x + offsetX, node.y + offsetY);
    }

    drawAngleLabel(ctx, angle, x, y) {
        const displayAngle = isNaN(angle) ? 0 : angle;
        this.drawTextWithShadow(ctx, `${displayAngle.toFixed(1)}°`, x, y, '14px');
    }

    drawLengthLabel(ctx, length, x, y) {
        this.drawTextWithShadow(ctx, length.toFixed(2), x, y, '10px');
    }

    // Add this method to handle the loop animation
    startLoopAnimation() {
        if (this.isAnimating) {
            this.isAnimating = false;
            if (this.animationLoop) {
                cancelAnimationFrame(this.animationLoop);
                this.animationLoop = null;
            }
            return;
        }

        const startState = {
            nc1: parseFloat(document.getElementById('animation-nc1-start').value),
            nc2: parseFloat(document.getElementById('animation-nc2-start').value),
            nc3: parseFloat(document.getElementById('animation-nc3-start').value)
        };

        const endState = {
            nc1: parseFloat(document.getElementById('animation-nc1-end').value),
            nc2: parseFloat(document.getElementById('animation-nc2-end').value),
            nc3: parseFloat(document.getElementById('animation-nc3-end').value)
        };

        this.isAnimating = true;
        const duration = 4000;
        let startTime = performance.now();
        let forward = true;

        const animate = (currentTime) => {
            if (!this.isAnimating) return;

            const elapsed = currentTime - startTime;
            let progress = (elapsed % duration) / duration;

            if (forward && elapsed >= duration) {
                forward = false;
                startTime = currentTime;
                progress = 1;
            } else if (!forward && elapsed >= duration) {
                forward = true;
                startTime = currentTime;
                progress = 0;
            }

            const effectiveProgress = forward ? progress : 1 - progress;

            // Calculate current values
            const current = {
                nc1: startState.nc1 + (endState.nc1 - startState.nc1) * effectiveProgress,
                nc2: startState.nc2 + (endState.nc2 - startState.nc2) * effectiveProgress,
                nc3: startState.nc3 + (endState.nc3 - startState.nc3) * effectiveProgress
            };

            // Update triangle
            this.updateTriangleFromEdges(current.nc1, current.nc2, current.nc3);

            // Continue loop
            this.animationLoop = requestAnimationFrame(animate);
        };

        this.animationLoop = requestAnimationFrame(animate);
    }

    drawICLines(ctx) {
        if (!this.system.n1 || !this.system.n2 || !this.system.n3) return;
        
        // Calculate centroid
        const centroid = this.calculateCentroid();
        if (!centroid) return;

        // Set line style for IC lines
        ctx.save();
        ctx.strokeStyle = 'white';
        ctx.setLineDash([5, 5]);
        ctx.lineWidth = 1;

        // Draw IC1 (Centroid to N1)
        ctx.beginPath();
        ctx.moveTo(centroid.x, centroid.y);
        ctx.lineTo(this.system.n1.x, this.system.n1.y);
        ctx.stroke();

        // Draw IC2 (Centroid to N2)
        ctx.beginPath();
        ctx.moveTo(centroid.x, centroid.y);
        ctx.lineTo(this.system.n2.x, this.system.n2.y);
        ctx.stroke();

        // Draw IC3 (Centroid to N3)
        ctx.beginPath();
        ctx.moveTo(centroid.x, centroid.y);
        ctx.lineTo(this.system.n3.x, this.system.n3.y);
        ctx.stroke();

        // Add IC labels - fix inversion by scaling y coordinate
        ctx.save();
        ctx.scale(1, -1); // Flip text right-side up
        ctx.fillStyle = 'white';
        ctx.font = '12px Arial';

        // Position IC1 label
        const ic1Mid = {
            x: (centroid.x + this.system.n1.x) / 2,
            y: -(centroid.y + this.system.n1.y) / 2 // Negative for correct orientation
        };
        ctx.fillText('IC1', ic1Mid.x + 5, ic1Mid.y);

        // Position IC2 label
        const ic2Mid = {
            x: (centroid.x + this.system.n2.x) / 2,
            y: -(centroid.y + this.system.n2.y) / 2
        };
        ctx.fillText('IC2', ic2Mid.x + 5, ic2Mid.y);

        // Position IC3 label
        const ic3Mid = {
            x: (centroid.x + this.system.n3.x) / 2,
            y: -(centroid.y + this.system.n3.y) / 2
        };
        ctx.fillText('IC3', ic3Mid.x + 5, ic3Mid.y);

        ctx.restore();
        ctx.restore();
    }

    drawTextWithShadow(ctx, text, x, y, fontSize = '14px') {
        ctx.save();
        
        // Set up the text properties
        ctx.font = `${fontSize} Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Measure text width for background
        const metrics = ctx.measureText(text);
        const padding = 4; // Padding around text
        
        // Draw semi-transparent background
        ctx.fillStyle = 'rgba(32, 32, 32, 0.5)'; // 50% gray with 50% opacity
        ctx.fillRect(
            x - metrics.width/2 - padding,
            y - parseInt(fontSize)/2 - padding,
            metrics.width + padding * 2,
            parseInt(fontSize) + padding * 2
        );
        
        // Draw the text
        ctx.fillStyle = '#ffffff';
        ctx.fillText(text, x, y);
        
        ctx.restore();
    }

    // Update edge length labels
    drawEdgeLengths(ctx) {
        // ... existing midpoint calculations ...
        
        ctx.save();
        ctx.scale(1, -1);
        
        // NC1 label (left edge)
        const nc1Length = this.system.nc1.toFixed(2);
        this.drawTextWithShadow(
            ctx,
            nc1Length,
            nc1Mid.x + nc1OffsetX,
            -nc1Mid.y + nc1OffsetY,
            '14px'
        );
        
        // NC2 label (right edge)
        this.drawTextWithShadow(
            ctx,
            nc2Length,
            nc2Mid.x + nc2OffsetX,
            -nc2Mid.y + nc2OffsetY,
            '14px'
        );
        
        // NC3 label (bottom edge)
        this.drawTextWithShadow(
            ctx,
            nc3Length,
            nc3Mid.x,
            -nc3Mid.y + offset,
            '14px'
        );
        
        ctx.restore();
    }

    // Update special point labels (HO, NP, etc.)
    drawSpecialPointLabel(ctx, text, x, y) {
        ctx.save();
        ctx.scale(1, -1);
        this.drawTextWithShadow(ctx, text, x + 10, -y, '12px');
        ctx.restore();
    }

    // Add this method to TriangleSystem class
    calculateAltitudes() {
        const { n1, n2, n3 } = this.system;
        
        // Calculate altitude feet with correct order
        const altitudes = {
            α1: this.calculateAltitudeFoot(n1, n2, n3),  // From n1 to n2-n3
            α2: this.calculateAltitudeFoot(n2, n3, n1),  // From n2 to n3-n1
            α3: this.calculateAltitudeFoot(n3, n1, n2)   // From n3 to n1-n2
        };

        // Calculate lengths
        altitudes.lengths = {
            α1: this.calculateDistance(n1, altitudes.α1),
            α2: this.calculateDistance(n2, altitudes.α2),
            α3: this.calculateDistance(n3, altitudes.α3)
        };

        console.log('Altitude Calculations:', {
            vertices: { n1, n2, n3 },
            feet: altitudes,
            lengths: altitudes.lengths
        });

        return altitudes;
    }

    // Helper method to calculate the foot of an altitude
    calculateAltitudeFoot(vertex, lineStart, lineEnd) {
        // Vector from lineStart to lineEnd
        const dx = lineEnd.x - lineStart.x;
        const dy = lineEnd.y - lineStart.y;
        
        // Vector from lineStart to vertex
        const px = vertex.x - lineStart.x;
        const py = vertex.y - lineStart.y;
        
        // Calculate projection length
        const lineLength = dx * dx + dy * dy;
        if (lineLength === 0) return lineStart; // Degenerate case
        
        const t = (px * dx + py * dy) / lineLength;
        
        // Calculate foot point
        const footX = lineStart.x + t * dx;
        const footY = lineStart.y + t * dy;
        
        // If foot point is outside segment, return nearest endpoint
        if (t <= 0) return lineStart;
        if (t >=1) return lineEnd;
        
        return { x: footX, y: footY };
    }

    // Add this method to TriangleSystem class
    calculateFullMedians() {
        const midpoints = this.calculateMidpoints();
        return {
            m1: { 
                point: midpoints.m1,  // Midpoint of NC1 (N1 to N3)
                length: this.calculateDistance(this.system.n2, midpoints.m1)
            },
            m2: { 
                point: midpoints.m2,  // Midpoint of NC2 (N2 to N1)
                length: this.calculateDistance(this.system.n3, midpoints.m2)
            },
            m3: { 
                point: midpoints.m3,  // Midpoint of NC3 (N3 to N2)
                length: this.calculateDistance(this.system.n1, midpoints.m3)
            }
        };
    }

    initializeInfoBoxSearch() {
        // Initialize arrays to store selected metrics
        this.selectedMetrics = [null, null, null];
        
        // Initialize metric list first
        this.metricList = [];
        const labelValuePairs = document.querySelectorAll('.label-value-pair');
        
        labelValuePairs.forEach(pair => {
            const labelElement = pair.querySelector('label');
            const inputElement = pair.querySelector('input[id], span[id], textarea[id]');

            if (labelElement && inputElement) {
                const labelText = labelElement.textContent.trim();
                const inputId = inputElement.id.trim();

                this.metricList.push({
                    label: labelText,
                    id: inputId
                });
            }
        });

        // Now initialize each search box
        for (let i = 1; i <= 3; i++) {
            const searchInput = document.getElementById(`info-search-${i}`);
            const searchResults = document.getElementById(`search-results-${i}`);
            const displayValue = document.getElementById(`info-display-value-${i}`);

            if (!searchInput || !searchResults || !displayValue) {
                console.error(`Info box ${i} elements not found`);
                continue;
            }

            // Event listener for search input
            searchInput.addEventListener('input', () => {
                const searchTerm = searchInput.value.toLowerCase().trim();
                searchResults.innerHTML = '';

                if (searchTerm.length > 0) {
                    const matches = this.metricList.filter(metric =>
                        metric.label.toLowerCase().includes(searchTerm)
                    );

                    if (matches.length > 0) {
                        matches.forEach(metric => {
                            const div = document.createElement('div');
                            div.className = 'search-result-item';
                            div.textContent = metric.label;

                            div.addEventListener('click', () => {
                                this.selectedMetrics[i-1] = metric;
                                searchInput.value = metric.label;
                                
                                // Update the display value
                                const inputElement = document.getElementById(metric.id);
                                if (inputElement) {
                                    displayValue.value = inputElement.value || inputElement.textContent || '-';
                                }

                                searchResults.classList.remove('active');
                            });
                            searchResults.appendChild(div);
                        });
                        searchResults.classList.add('active');
                    }
                }
                searchResults.classList.toggle('active', searchTerm.length > 0);
            });

            // Close search results when clicking outside
            document.addEventListener('click', (e) => {
                if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
                    searchResults.classList.remove('active');
                }
            });
        }

        // Single update button for all three displays
        const updateButton = document.getElementById('info-display-update');
        if (updateButton) {
            updateButton.addEventListener('click', () => {
                this.selectedMetrics.forEach((metric, index) => {
                    if (metric) {
                        const displayValue = document.getElementById(`info-display-value-${index + 1}`);
                        const inputElement = document.getElementById(metric.id);
                        if (displayValue && inputElement) {
                            displayValue.value = inputElement.value || inputElement.textContent || '-';
                        }
                    }
                });
            });
        }
    }

    // Helper method to get the current value of the metric
    getMetricValue(elementId) {
        const element = document.getElementById(elementId);
        if (element) {
            if (element.tagName.toLowerCase() === 'input' || element.tagName.toLowerCase() === 'textarea') {
                return element.value || '-';
            } else {
                return element.textContent || '-';
            }
        } else {
            return '-';
        }
    }

    // Add this method to update the display value
    updateDisplayValue() {
        if (this.selectedMetric) {
            const displayValue = document.getElementById('info-display-value');
            const inputElement = document.getElementById(this.selectedMetric);
            if (displayValue && inputElement) {
                displayValue.textContent = inputElement.value || inputElement.textContent || '-';
            }
        }
    }

    validateInput(input, value) {
        // Convert value to number for comparison
        const numValue = parseFloat(value);
        
        // Check if input is for an angle
        const isAngle = input.id.toLowerCase().includes('angle');
        
        // Validate based on input type
        if (isAngle) {
            // Angles should be between 0 and 180 degrees
            if (isNaN(numValue) || numValue < 0 || numValue > 180) {
                alert('Angle values must be between 0 and 180 degrees');
                return false;
            }
        } else {
            // NC lengths should be zero or positive
            if (isNaN(numValue) || numValue < 0) {
                alert('Length values must be zero or positive');
                return false;
            }
        }
        
        return true;
    }

    calculateSystemValues() {
        // When using NC values in calculations, use null checks and handle zeros
        const nc1 = parseFloat(this.getInputValue('nc1')) || 0;
        const nc2 = parseFloat(this.getInputValue('nc2')) || 0;
        const nc3 = parseFloat(this.getInputValue('nc3')) || 0;
        
        // Example calculation
        const someValue = nc1 + nc2 + nc3;
        return someValue === 0 ? 0 : someValue; // Return 0 instead of NaN for zero sums
    }

    // Add this method to ensure altitudePoints are properly initialized
    calculateAltitudePoints() {
        if (!this.system || !this.system.n1 || !this.system.n2 || !this.system.n3) {
            return Array(3).fill({ x: 0, y: 0 });
        }

        // Calculate altitude points here...
        const altitudes = this.calculateAltitudes();
        this.altitudePoints = [
            altitudes.α1 || { x: 0, y: 0 },
            altitudes.α2 || { x: 0, y: 0 },
            altitudes.α3 || { x: 0, y: 0 }
        ];

        return this.altitudePoints;
    }
    
    

    

    /**
     * Calculates the full median lengths for each node.
     * @returns {Object} Full medians with points and lengths for m1, m2, and m3.
     */
    calculateFullMedians() {
        const midpoints = this.calculateMidpoints();
        return {
            m1: { 
                point: midpoints.m1,  // Midpoint of NC1 (N1 to N3)
                length: this.calculateDistance(this.system.n2, midpoints.m1)
            },
            m2: { 
                point: midpoints.m2,  // Midpoint of NC2 (N2 to N1)
                length: this.calculateDistance(this.system.n3, midpoints.m2)
            },
            m3: { 
                point: midpoints.m3,  // Midpoint of NC3 (N3 to N2)
                length: this.calculateDistance(this.system.n1, midpoints.m3)
            }
        };
    }

    /**
     * Calculates and updates the Median Channel Entropy (MCH).
     */
    updateMedianChannelEntropy() {
        try {
            // Fetch MC values from Subsystems table
            const ic1 = parseFloat(document.getElementById('ic-1')?.value) || 0;
            const ic2 = parseFloat(document.getElementById('ic-2')?.value) || 0;
            const ic3 = parseFloat(document.getElementById('ic-3')?.value) || 0;

            const hic = ic1 + ic2 + ic3;
            setElementValue('#system-mch', hic.toFixed(2));
            console.log('Updated HIC calculation:', {
                ic1, ic2, ic3,
                total: hic,
                elementId: 'system-mch'
            });
        } catch (error) {
            console.error('Error updating Median Channel Entropy (MCH):', error);
            console.error('\n Stack trace:', error.stack);
        }
    }

    /**
     * Calculates and updates the Subchannels (SC) between Subtriangle Centroids.
     */
    updateSubchannels(subtriangleCentroids) {
        try {
            // Calculate subchannels (distances between centroids)
            const subchannelDistances = {
                sc1: this.calculateDistance(subtriangleCentroids.ss2, subtriangleCentroids.ss3), // SS1 to SS3
                sc2: this.calculateDistance(subtriangleCentroids.ss1, subtriangleCentroids.ss3), // SS1 to SS2
                sc3: this.calculateDistance(subtriangleCentroids.ss2, subtriangleCentroids.ss3)  // SS2 to SS3
            };

            console.log('Calculated Subchannel Distances (SC):', subchannelDistances);

            // Update subchannel values in the table
            ['1', '2', '3'].forEach(i => {
                const scValue = subchannelDistances[`sc${i}`];
                const scId = `#subchannel-${i}`;
                if (scValue !== undefined) {
                    setElementValue(scId, scValue.toFixed(2));
                    console.log(`Updated ${scId} with value: ${scValue.toFixed(2)}`);
                } else {
                    console.warn(`Subchannel value sc${i} is undefined`);
                    setElementValue(scId, '0.00'); // Default or error value
                }
            });

            // Calculate HST (Entropy of Subtriangle) - sum of SC values
            const subtriangle_hst = subchannelDistances.sc1 + 
                                     subchannelDistances.sc2 + 
                                     subchannelDistances.sc3;
            setElementValue('#subtriangle-hst', subtriangle_hst.toFixed(2));
            console.log(`Updated #subtriangle-hst with value: ${subtriangle_hst.toFixed(2)}`);

            // Calculate CST (Subtriangle Area)
            const subtriangle_cst = this.calculateSubtriangleArea(subtriangleCentroids);
            setElementValue('#subtriangle-cst', subtriangle_cst.toFixed(2));
            console.log(`Updated #subtriangle-cst with value: ${subtriangle_cst.toFixed(2)}`);

        } catch (error) {
            console.error('Error updating Subchannels (SC):', error);
            console.error('\n Stack trace:', error.stack);
        }
    }

    /**
     * Updates the I-Channels (IC) in the dashboard.
     */
    updateIChannels() {
        try {
            // Calculate centroid (I)
            const centroid = this.calculateCentroid();
            console.log('Calculated Centroid:', centroid);

            // Get full median lengths for comparison
            const fullMedians = this.calculateFullMedians();
            console.log('Full Medians:', fullMedians);
            
            // Calculate I-Channels using centroid to node distances
            const iChannels = {
                n1: this.calculateDistance(centroid, this.system.n1),
                n2: this.calculateDistance(centroid, this.system.n2),
                n3: this.calculateDistance(centroid, this.system.n3)
            };

            console.log('Node Positions:', {
                n1: this.system.n1,
                n2: this.system.n2,
                n3: this.system.n3
            });
            
            console.log('Calculated I-Channels (IC):', iChannels);

            // Update IC inputs in the dashboard
            ['1', '2', '3'].forEach(i => {
                const icValue = iChannels[`n${i}`];
                const icId = `ic-${i}`;  // Remove the # since we're using getElementById
                const element = document.getElementById(icId);
                
                console.log(`Updating IC${i}:`, {
                    value: icValue,
                    elementId: icId,
                    elementExists: !!element
                });

                if (element && icValue !== undefined) {
                    element.value = icValue.toFixed(2);
                    console.log(`Successfully updated ${icId} with value: ${icValue.toFixed(2)}`);
                } else {
                    console.warn(`Issue updating IC${i}:`, {
                        elementMissing: !element,
                        valueUndefined: icValue === undefined
                    });
                }
            });

        } catch (error) {
            console.error('Error updating I-Channels (IC):', error);
            console.error('\n Stack trace:', error.stack);
        }
    }
    
    // Update this method in your TriangleSystem class
    updateFromManualInputs() {
        try {
            // Get the manual input values
            const nc1 = parseFloat(document.getElementById('manual-nc1').value);
            const nc2 = parseFloat(document.getElementById('manual-nc2').value);
            const nc3 = parseFloat(document.getElementById('manual-nc3').value);

            console.log('Updating system with values:', { nc1, nc2, nc3 });

            // Validate the values
            if (isNaN(nc1) || isNaN(nc2) || isNaN(nc3)) {
                console.error('Invalid NC values');
                return;
            }

            // Update the system's values directly
            this.system = {
                ...this.system, // Keep existing properties
                nc1: nc1,
                nc2: nc2,
                nc3: nc3
            };

            // Force a redraw
            this.drawSystem();
            
            // Also update any other necessary UI elements
            this.updateInformationPanel();

            console.log('System updated successfully');
        } catch (error) {
            console.error('Error updating from manual inputs:', error);
        }
    }

    deletePreset(name) {
        if (!confirm(`Are you sure you want to delete the preset "${name}"?`)) return;

        try {
            // Get existing presets
            const presets = JSON.parse(localStorage.getItem('userPresets') || '{}');
            
            // Delete preset
            delete presets[name];
            
            // Save back to localStorage
            localStorage.setItem('userPresets', JSON.stringify(presets));
            
            // Update dropdown
            this.updatePresetsDropdown();
            
        } catch (error) {
            console.error('Error deleting preset:', error);
            alert('Error deleting preset. Please try again.');
        }
    }
}

class PresetManager {
    constructor(triangleSystem) {
        this.triangleSystem = triangleSystem;
        
        // Remove any existing click handlers
        const existingPresetItems = document.querySelectorAll('.dropdown-item[data-preset-name]');
        existingPresetItems.forEach(item => {
            item.removeEventListener('click', null);
        });
        
        // Initialize dropdowns
        this.userPresetsDropdown = document.getElementById('userPresetsDropdown');
        this.presetsList = document.getElementById('userPresetsList');
        this.animationsDropdown = document.getElementById('animationsDropdown');
        this.animationsList = document.getElementById('animationsList');
        
        this.initializePresetsDropdown();
        this.initializeAnimationsDropdown();
        this.setupEventListeners();
    }

    initializePresetsDropdown() {
        if (!this.userPresetsDropdown || !this.presetsList) {
            console.error('Presets dropdown elements not found');
            return;
        }

        // Remove old event listeners
        const oldItems = this.presetsList.querySelectorAll('.dropdown-item');
        oldItems.forEach(item => {
            item.replaceWith(item.cloneNode(true));
        });

        // Get presets from storage and convert to sorted array
        const presets = JSON.parse(localStorage.getItem('userPresets') || '{}');
        const sortedPresets = Object.entries(presets)
            .sort(([nameA], [nameB]) => nameA.localeCompare(nameB));
        
        // Clear and populate dropdown
        this.presetsList.innerHTML = '';
        
        sortedPresets.forEach(([name, values]) => {
            const li = document.createElement('li');
            const a = document.createElement('a');
            a.className = 'dropdown-item';
            a.href = '#';
            
            // Create container for name and buttons
            const container = document.createElement('div');
            container.className = 'preset-item-container';
            
            // Add preset name
            const nameSpan = document.createElement('span');
            nameSpan.className = 'preset-name';
            nameSpan.textContent = name;
            container.appendChild(nameSpan);
            
            // Add edit button
            const editBtn = document.createElement('button');
            editBtn.className = 'edit-btn';
            editBtn.innerHTML = '✎';
            editBtn.onclick = (e) => {
                e.stopPropagation();
                this.editPreset(name, values);
            };
            container.appendChild(editBtn);
            
            // Add delete button
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-btn';
            deleteBtn.innerHTML = '×';
            deleteBtn.onclick = (e) => {
                e.stopPropagation();
                this.deletePreset(name);
            };
            container.appendChild(deleteBtn);
            
            a.appendChild(container);
            li.appendChild(a);
            this.presetsList.appendChild(li);
            
            // Add click handler for loading preset
            a.onclick = (e) => {
                e.preventDefault();
                this.loadPreset(name, values);
            };
        });
    }

    initializeAnimationsDropdown() {
        if (!this.animationsDropdown || !this.animationsList) {
            console.error('Animations dropdown elements not found');
            return;
        }

        // Clear existing items
        this.animationsList.innerHTML = '';

        // Get saved animations and sort alphabetically
        const savedAnimations = JSON.parse(localStorage.getItem('userAnimations') || '{}');
        const sortedAnimations = Object.entries(savedAnimations)
            .sort(([nameA], [nameB]) => nameA.localeCompare(nameB));
        
        if (sortedAnimations.length > 0) {
            sortedAnimations.forEach(([name, config]) => {
                const li = document.createElement('li');
                const a = document.createElement('a');
                a.className = 'dropdown-item';
                a.href = '#';
                
                // Create container for name and buttons
                const container = document.createElement('div');
                container.className = 'preset-item-container';
                
                // Add animation name
                const nameSpan = document.createElement('span');
                nameSpan.className = 'preset-name';
                nameSpan.textContent = name;
                container.appendChild(nameSpan);
                
                // Add edit button
                const editBtn = document.createElement('button');
                editBtn.className = 'edit-btn';
                editBtn.innerHTML = '✎';
                editBtn.onclick = (e) => {
                    e.stopPropagation();
                    this.editAnimation(name, config);
                };
                container.appendChild(editBtn);
                
                // Add delete button
                const deleteBtn = document.createElement('button');
                deleteBtn.className = 'delete-btn';
                deleteBtn.innerHTML = '×';
                deleteBtn.onclick = (e) => {
                    e.stopPropagation();
                    this.deleteAnimation(name);
                };
                container.appendChild(deleteBtn);
                
                a.appendChild(container);
                li.appendChild(a);
                this.animationsList.appendChild(li);
                
                // Add click handler for loading animation
                a.onclick = (e) => {
                    e.preventDefault();
                    this.playAnimation(name, config);
                };
            });
        } else {
            const li = document.createElement('li');
            const a = document.createElement('a');
            a.className = 'dropdown-item disabled';
            a.href = '#';
            a.textContent = 'No saved animations';
            li.appendChild(a);
            this.animationsList.appendChild(li);
        }
    }

    // Add these new methods to handle editing and deleting animations
    editAnimation(name, config) {
        const newName = prompt('Enter new name for animation:', name);
        if (newName && newName !== name) {
            try {
                // Get current animations
                const animations = JSON.parse(localStorage.getItem('userAnimations') || '{}');
                
                // Delete old name and add with new name
                delete animations[name];
                animations[newName] = config;
                
                // Save back to storage
                localStorage.setItem('userAnimations', JSON.stringify(animations));
                
                // Refresh dropdown
                this.initializeAnimationsDropdown();
                
                console.log('Animation renamed:', name, 'to', newName);
            } catch (error) {
                console.error('Error editing animation:', error);
                alert('Error editing animation. Please try again.');
            }
        }
    }

    deleteAnimation(name) {
        if (confirm(`Are you sure you want to delete the animation "${name}"?`)) {
            try {
                // Get current animations
                const animations = JSON.parse(localStorage.getItem('userAnimations') || '{}');
                
                // Delete the animation
                delete animations[name];
                
                // Save back to storage
                localStorage.setItem('userAnimations', JSON.stringify(animations));
                
                // Refresh dropdown
                this.initializeAnimationsDropdown();
                
                console.log('Animation deleted:', name);
            } catch (error) {
                console.error('Error deleting animation:', error);
                alert('Error deleting animation. Please try again.');
            }
        }
    }

    setupEventListeners() {
        // Presets dropdown toggle
        this.userPresetsDropdown.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('Toggle presets dropdown');
            this.presetsList.classList.toggle('show');
        });

        // Animations dropdown toggle
        this.animationsDropdown.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('Toggle animations dropdown');
            this.animationsList.classList.toggle('show');
        });

        // Close dropdowns when clicking outside
        document.addEventListener('click', (e) => {
            if (!this.userPresetsDropdown.contains(e.target) && 
                !this.presetsList.contains(e.target)) {
                this.presetsList.classList.remove('show');
            }
            if (!this.animationsDropdown.contains(e.target) && 
                !this.animationsList.contains(e.target)) {
                this.animationsList.classList.remove('show');
            }
        });
    }

    loadPreset(name, values) {
        try {
            console.log('Loading preset:', name, values);
            
            // Update vertex positions directly
            if (this.triangleSystem) {
                // Update the system's vertices
                this.triangleSystem.system = {
                    ...this.triangleSystem.system,
                    n1: { 
                        x: parseFloat(values.n1?.x) || 0, 
                        y: parseFloat(values.n1?.y) || 0 
                    },
                    n2: { 
                        x: parseFloat(values.n2?.x) || 0, 
                        y: parseFloat(values.n2?.y) || 0 
                    },
                    n3: { 
                        x: parseFloat(values.n3?.x) || 0, 
                        y: parseFloat(values.n3?.y) || 0 
                    },
                    intelligence: { x: 0, y: 0 }  // Reset intelligence point
                };
                
                // Recalculate derived points
                this.triangleSystem.updateDerivedPoints();
                
                // Update display
                this.triangleSystem.drawSystem();
                this.triangleSystem.updateDashboard();
                
                console.log('Triangle system updated directly');
            } else {
                console.error('Triangle system reference not found');
            }

            // Close the dropdown
            this.presetsList.classList.remove('show');

            console.log('Preset loaded and applied successfully');
        } catch (error) {
            console.error('Error loading preset:', error);
        }
    }

    startAnimation(animationType) {
        console.log('Starting animation:', animationType);
        // Add animation logic here
    }

    // Add this method to handle animation playback
    playAnimation(name, config) {
        console.log('Playing animation:', name, config);
        if (this.triangleSystem) {
            // Populate start values
            const startNc1Input = document.getElementById('animation-nc1-start');
            const startNc2Input = document.getElementById('animation-nc2-start');
            const startNc3Input = document.getElementById('animation-nc3-start');

            if (startNc1Input && startNc2Input && startNc3Input) {
                startNc1Input.value = config.start.nc1;
                startNc2Input.value = config.start.nc2;
                startNc3Input.value = config.start.nc3;
                console.log('Updated start fields:', config.start);
            } else {
                console.error('Some animation start input fields not found');
            }

            // Populate end values
            const endNc1Input = document.getElementById('animation-nc1-end');
            const endNc2Input = document.getElementById('animation-nc2-end');
            const endNc3Input = document.getElementById('animation-nc3-end');

            if (endNc1Input && endNc2Input && endNc3Input) {
                endNc1Input.value = config.end.nc1;
                endNc2Input.value = config.end.nc2;
                endNc3Input.value = config.end.nc3;
                console.log('Updated end fields:', config.end);
            } else {
                console.error('Some animation end input fields not found');
            }

            // Optional: Update the current triangle to match start position
            this.triangleSystem.system = {
                ...this.triangleSystem.system,
                nc1: config.start.nc1,
                nc2: config.start.nc2,
                nc3: config.start.nc3
            };
            this.triangleSystem.drawSystem();
        }
    }

    editPreset(name, values) {
        const newName = prompt('Enter new name for preset:', name);
        if (newName && newName !== name) {
            try {
                // Get current presets
                const presets = JSON.parse(localStorage.getItem('userPresets') || '{}');
                
                // Delete old name and add with new name
                delete presets[name];
                presets[newName] = values;
                
                // Save back to storage
                localStorage.setItem('userPresets', JSON.stringify(presets));
                
                // Refresh dropdown
                this.initializePresetsDropdown();
                
                console.log('Preset renamed:', name, 'to', newName);
            } catch (error) {
                console.error('Error editing preset:', error);
                alert('Error editing preset. Please try again.');
            }
        }
    }

    deletePreset(name) {
        if (confirm(`Are you sure you want to delete the preset "${name}"?`)) {
            try {
                // Get current presets
                const presets = JSON.parse(localStorage.getItem('userPresets') || '{}');
                
                // Delete the preset
                delete presets[name];
                
                // Save back to storage
                localStorage.setItem('userPresets', JSON.stringify(presets));
                
                // Refresh dropdown
                this.initializePresetsDropdown();
                
                console.log('Preset deleted:', name);
            } catch (error) {
                console.error('Error deleting preset:', error);
                alert('Error deleting preset. Please try again.');
            }
        }
    }
}

class ImportManager {
    constructor(triangleSystem) {
        this.triangleSystem = triangleSystem;
        this.initializeImportButton();
    }

    initializeImportButton() {
        const importButton = document.getElementById('importButton');
        const fileInput = document.getElementById('importFile');

        if (!importButton || !fileInput) {
            console.error('Import button or file input not found');
            return;
        }

        // Handle import button click
        importButton.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            fileInput.click();
        });

        // Handle file selection
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                this.importPresets(file);
                fileInput.value = ''; // Reset file input
            }
        });
    }

    importPresets(file) {
        console.log('Starting import process for file:', file.name);
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const text = e.target.result;
                console.log('File contents loaded, first 100 chars:', text.substring(0, 100));

                // Get existing presets first
                const existingPresets = JSON.parse(localStorage.getItem('userPresets') || '{}');
                console.log('Existing presets:', Object.keys(existingPresets).length);

                // Parse and process the CSV data
                const newPresets = this.parseCSVToPresets(text);
                const newPresetCount = Object.keys(newPresets).length;
                console.log('New presets created:', newPresetCount);

                if (newPresetCount === 0) {
                    throw new Error('No valid presets found in file');
                }

                // Merge presets
                const mergedPresets = { ...existingPresets, ...newPresets };
                
                // Save to localStorage
                localStorage.setItem('userPresets', JSON.stringify(mergedPresets));
                console.log('Saved merged presets:', Object.keys(mergedPresets).length);

                // Notify user
                alert(`Successfully imported ${newPresetCount} presets`);

                // Only update the presets dropdown, not animations
                if (this.triangleSystem.initializePresets) {
                    this.triangleSystem.initializePresets();
                }

            } catch (error) {
                console.error('Error during import:', error);
                alert('Error importing presets. Please check the console for details.');
            }
        };

        reader.onerror = (error) => {
            console.error('Error reading file:', error);
            alert('Error reading file. Please try again.');
        };

        reader.readAsText(file);
    }

    parseCSVToPresets(csvText) {
        const presets = {};
        
        // Split into rows and filter out empty ones
        const rows = csvText.split('\n')
            .map(row => row.trim())
            .filter(row => row.length > 0);

        console.log('First few rows:', rows.slice(0, 3));

        // Skip header row
        for (let i = 1; i < rows.length; i++) {
            try {
                const row = rows[i];
                console.log(`Processing row ${i}:`, row);

                // Split by comma but preserve commas within quotes
                const columns = this.parseCSVRow(row);
                console.log('Parsed columns:', columns);

                if (columns.length >= 4) {
                    const name = columns[0];
                    // Handle the coordinate pairs which might be in "x,y" format
                    const n1Coords = this.parseCoordinates(columns[1]);
                    const n2Coords = this.parseCoordinates(columns[2]);
                    const n3Coords = this.parseCoordinates(columns[3]);

                    console.log('Parsed coordinates:', {
                        name,
                        n1: n1Coords,
                        n2: n2Coords,
                        n3: n3Coords
                    });

                    if (n1Coords && n2Coords && n3Coords) {
                        presets[name] = {
                            n1: { x: n1Coords[0], y: n1Coords[1] },
                            n2: { x: n2Coords[0], y: n2Coords[1] },
                            n3: { x: n3Coords[0], y: n3Coords[1] },
                            timestamp: Date.now()
                        };
                        console.log('Successfully added preset:', name);
                    } else {
                        console.warn(`Invalid coordinates for row ${i}`);
                    }
                } else {
                    console.warn(`Not enough columns in row ${i}:`, columns);
                }
            } catch (rowError) {
                console.error(`Error processing row ${i}:`, rowError);
            }
        }

        return presets;
    }

    parseCSVRow(row) {
        const result = [];
        let inQuotes = false;
        let currentValue = '';
        
        for (let i = 0; i < row.length; i++) {
            const char = row[i];
            
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                result.push(currentValue.trim());
                currentValue = '';
            } else {
                currentValue += char;
            }
        }
        
        // Push the last value
        result.push(currentValue.trim());
        
        // Clean up quotes
        return result.map(val => val.replace(/^"|"$/g, '').trim());
    }

    parseCoordinates(coordString) {
        try {
            // Remove any quotes and extra whitespace
            coordString = coordString.replace(/"/g, '').trim();
            
            // Split on comma and parse as floats
            const [x, y] = coordString.split(',').map(v => {
                const parsed = parseFloat(v.trim());
                if (isNaN(parsed)) {
                    throw new Error(`Invalid coordinate value: ${v}`);
                }
                return parsed;
            });

            return [x, y];
        } catch (error) {
            console.warn('Error parsing coordinates:', coordString, error);
            return null;
        }
    }
}

// Outside the class - DOM initialization
document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.querySelector('#canvas');
    if (canvas) {
        const triangleSystem = new TriangleSystem(canvas);
    } else {
        console.error("Canvas element not found");
    }
    
    // Remove duplicate event listeners that are now in initializeEventListeners
});

// Helper function to convert number to column letter (including multi-letter columns)
function getColumnLetter(columnNumber) {
    let dividend = columnNumber;
    let columnName = '';
    let modulo;

    while (dividend > 0) {
        modulo = (dividend - 1) % 26;
        columnName = String.fromCharCode(65 + modulo) + columnName;
        dividend = Math.floor((dividend - modulo) / 26);
    }

    return columnName;
}

// Add this at the end of rules-module.js
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
        console.log('Updating system state through RulesModule', newState);
        if (newState.angles) {
            // Convert angles to NC values
            const nc1 = this.angleToNC(newState.angles[0]);
            const nc2 = this.angleToNC(newState.angles[1]);
            const nc3 = this.angleToNC(newState.angles[2]);
            
            // Update triangle through NC values
            this.triangleSystem.updateNodeChannels(nc1, nc2, nc3);
        }
        
        if (newState.systemStatus) {
            console.log('System Status:', newState.systemStatus);
            // Handle system status changes if needed
        }
    }

    // Helper method to convert angle to NC value
    angleToNC(angle) {
        // Scale angle to NC range (0-600)
        return Math.round((angle / 180) * 600);
    }

    calculateArea() {
        // Get the current triangle area
        return this.triangleSystem.getArea();
    }

    validateUpdates(updates) {
        if (updates.angles) {
            // Check triangle inequality
            const sum = updates.angles.reduce((a, b) => a + b, 0);
            if (Math.abs(sum - 180) > 0.001) return false;
            
            // Check angle bounds
            if (updates.angles.some(angle => angle <= 0 || angle >= 180)) return false;
        }
        return true;
    }
}


