/**
 * Helper class to handle complex numbers
 */
class Complex {
    constructor(re, im) {
        this.re = re;
        this.im = im;
    }
    
    add(other) {
        return new Complex(this.re + other.re, this.im + other.im);
    }
    
    subtract(other) {
        return new Complex(this.re - other.re, this.im - other.im);
    }
    
    multiply(scalar) {
        return new Complex(this.re * scalar, this.im * scalar);
    }
    
    exp() {
        const expRe = Math.exp(this.re);
        return new Complex(expRe * Math.cos(this.im), expRe * Math.sin(this.im));
    }
}

// Add this before the TriangleSystem class definition
class TriangleDatabase {
    constructor() {
        this.dbName = 'TriangleResearchDB';
        this.version = 1;
        this.init();
    }

    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);
            
            request.onerror = () => {
                console.error('Database error:', request.error);
                reject(request.error);
            };
            
            request.onupgradeneeded = (event) => {
                console.log('Initializing database...');
                const db = event.target.result;
                
                // Create store for triangle states
                if (!db.objectStoreNames.contains('triangleStates')) {
                    const stateStore = db.createObjectStore('triangleStates', { 
                        keyPath: 'id', 
                        autoIncrement: true 
                    });
                    
                    // Add indexes
                    stateStore.createIndex('timestamp', 'timestamp');
                    stateStore.createIndex('name', 'name');
                }
            };
            
            request.onsuccess = () => {
                console.log('Database initialized successfully');
                resolve(request.result);
            };
        });
    }

    async saveState(stateData) {
        try {
            const name = prompt('Enter a name for this triangle state:');
            if (!name) return null;
            
            const description = prompt('Enter a description (optional):');
            
            // Get all input values
            const inputValues = this.getAllInputValues();
            
            // Create record
            const record = {
                name,
                description,
                timestamp: new Date().toLocaleString('en-US', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true
                }),
                ...inputValues
            };

            const db = await this.init();
            const transaction = db.transaction(['triangleStates'], 'readwrite');
            const store = transaction.objectStore('triangleStates');
            
            const id = await new Promise((resolve, reject) => {
                const request = store.add(record);
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });

            console.log(`Saved triangle state "${name}" with ID: ${id}`, record);
            return id;
        } catch (error) {
            console.error('Error saving triangle state:', error);
            alert('Error saving triangle state. Please try again.');
            return null;
        }
    }

    getAllInputValues() {
        const values = {};
        
        // Helper function to clean label text
        const cleanLabel = (text) => {
            return text
                .replace(/[()]/g, '')         // remove parentheses
                .replace(/[,]/g, '')          // remove commas
                .replace(/\s+/g, '_')         // replace spaces with underscores
                .replace(/∠/g, 'Angle')       // replace angle symbol with 'Angle'
                .replace(/°/g, 'deg')         // replace degree symbol with 'deg'
                .replace(/\//g, '_to_')       // replace / with _to_
                .replace(/[^\w\s-_]/g, '')    // remove special characters
                .replace(/_xy$/, '');         // remove _xy suffix for coordinates
        };

        // Get all input fields with labels
        document.querySelectorAll('.label-value-pair').forEach(pair => {
            const label = pair.querySelector('label');
            const input = pair.querySelector('input');
            
            if (label && input && input.value) {
                // Get original label text and clean it
                let columnName = cleanLabel(label.textContent.trim());
                
                // Handle coordinate pairs (x,y)
                if (input.value.includes(',')) {
                    const [x, y] = input.value.split(',').map(v => parseFloat(v.trim()));
                    // Remove any _xy suffix and add _X and _Y
                    columnName = columnName.replace(/_xy$/, '');
                    values[`${columnName}_X`] = x || 0;
                    values[`${columnName}_Y`] = y || 0;
                } else {
                    values[columnName] = parseFloat(input.value) || input.value;
                }
            }
        });

        // Get subsystems table values with preserved ratio formatting
        document.querySelectorAll('.subsystems-table tr').forEach((row, index) => {
            if (index === 0) return; // Skip header row
            
            const inputs = row.querySelectorAll('input');
            const ssNum = row.cells[0].textContent; // SS1, SS2, or SS3
            
            inputs.forEach((input, colIndex) => {
                if (input.value) {
                    const headerCell = document.querySelector(`.subsystems-table th:nth-child(${colIndex + 2})`);
                    if (headerCell) {
                        const columnName = `${ssNum}_${cleanLabel(headerCell.textContent)}`;
                        values[columnName] = parseFloat(input.value) || input.value;
                    }
                }
            });
        });

        console.log('Collected input values:', values);
        return values;
    }

    async exportToCSV() {
        try {
            const db = await this.init();
            const transaction = db.transaction(['triangleStates'], 'readonly');
            const store = transaction.objectStore('triangleStates');
            
            const data = await new Promise((resolve, reject) => {
                const request = store.getAll();
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });

            if (data.length === 0) {
                alert('No data to export');
                return;
            }

            // Get all unique columns
            const columns = new Set();
            data.forEach(record => {
                Object.keys(record).forEach(key => columns.add(key));
            });

            // Create CSV
            const headers = Array.from(columns);
            const rows = data.map(record => 
                headers.map(header => {
                    const value = record[header] ?? '';
                    return typeof value === 'string' ? `"${value}"` : value;
                }).join(',')
            );
            const csv = [headers.join(','), ...rows].join('\n');

            // Download file
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `triangle_research_${new Date().toISOString()}.csv`;
            a.click();
            window.URL.revokeObjectURL(url);

        } catch (error) {
            console.error('Error exporting data:', error);
            alert('Error exporting data. Please check the console for details.');
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
            
            // Replace the title's content with a flex container
            manualTitle.innerHTML = `
                <div class="d-flex align-items-center gap-3">
                    <span>${titleText}</span>
                    <div class="dropdown">
                        <button class="btn btn-secondary btn-sm dropdown-toggle" type="button" id="userPresetsDropdown" data-bs-toggle="dropdown" aria-expanded="false">
                            User Presets
                        </button>
                        <ul class="dropdown-menu" id="userPresetsList">
                            <!-- Presets will be added here dynamically -->
                        </ul>
                    </div>
                </div>
            `;
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
        
        // Initialize presets storage
        this.initializePresets();
        
        // Bind save preset handler
        document.getElementById('save-preset').addEventListener('click', () => this.saveCurrentConfig());

        // Initialize both dropdowns
        this.initializePresets();
        this.initializeAnimations();
        
        // Update both dropdowns
        this.updatePresetsDropdown();
        this.updateAnimationsDropdown();

        // Add to your initialization code
        const animateButtonEnd = document.getElementById('animate-button-end');
        const saveAnimationButtonEnd = document.getElementById('save-animation-end');

        if (animateButtonEnd) {
            animateButtonEnd.addEventListener('click', () => {
                const mainAnimateButton = document.getElementById('animate-button');
                if (mainAnimateButton) {
                    mainAnimateButton.click();
                }
            });
        }

        if (saveAnimationButtonEnd) {
            saveAnimationButtonEnd.addEventListener('click', () => {
                const mainSaveButton = document.getElementById('save-animation');
                if (mainSaveButton) {
                    mainSaveButton.click();
                }
            });
        }

        // Initialize database
        this.db = new TriangleDatabase();
        
        // Add save button listener
        document.getElementById('saveState').addEventListener('click', () => {
            // Collect current triangle state data
            const stateData = {
                vertices: {
                    n1: { x: this.system.n1.x, y: this.system.n1.y },
                    n2: { x: this.system.n2.x, y: this.system.n2.y },
                    n3: { x: this.system.n3.x, y: this.system.n3.y }
                },
                // Add any other specific triangle data you want to save
                showConnections: this.showConnections,
                showAreas: this.showAreas,
                // ... other visualization states ...
            };
            
            this.db.saveState(stateData);
        });

        // Add export button listener
        document.getElementById('exportData').addEventListener('click', () => {
            this.db.exportToCSV();
        });
    }

    initializePresets() {
        // Initialize storage if it doesn't exist
        if (!localStorage.getItem('userPresets')) {
            localStorage.setItem('userPresets', JSON.stringify({}));
        }
        
        // Update presets dropdown
        this.updatePresetsDropdown();
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
            
            // Get presets from storage
            const presets = JSON.parse(localStorage.getItem('userPresets') || '{}');
            
            // Sort presets alphabetically by name (case-insensitive)
            const sortedPresets = Object.entries(presets)
                .sort(([nameA], [nameB]) => nameA.toLowerCase().localeCompare(nameB.toLowerCase()));
            
            // Add presets to dropdown
            sortedPresets.forEach(([name, values]) => {
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
                editBtn.className = 'btn btn-secondary btn-sm';
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
                deleteBtn.className = 'btn btn-danger btn-sm';
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
        } catch (error) {
            console.error('Error updating presets dropdown:', error);
        }
    }

    loadPreset(name, values) {
        try {
            // Set manual input values
            document.getElementById('manual-nc1').value = values.nc1;
            document.getElementById('manual-nc2').value = values.nc2;
            document.getElementById('manual-nc3').value = values.nc3;
            
            // Update triangle geometry
            this.system.n1 = { x: values.n1.x, y: values.n1.y };
            this.system.n2 = { x: values.n2.x, y: values.n2.y };
            this.system.n3 = { x: values.n3.x, y: values.n3.y };
            
            // Update display without affecting animation fields
            this.drawSystem();
            this.updateDashboard();
            
            // Do NOT update animation fields automatically
            
            console.log(`Loaded preset: ${name}`, values);
        } catch (error) {
            console.error('Error loading preset:', error);
            alert('Error loading preset. Please try again.');
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
            
            console.log(`Deleted preset: ${name}`); // Debug log
        } catch (error) {
            console.error('Error deleting preset:', error);
            alert('Error deleting preset. Please try again.');
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
            { id: 'toggleOrthocircle', property: 'showOrtho' },
            { id: 'toggleNinePointCenter', property: 'showNinePointCenter' },
            { id: 'toggleNinePointCircle', property: 'showNinePointCircle' },
            { id: 'toggleIncircle', property: 'showIncircle' },
            { id: 'toggleCircumcircle', property: 'showCircumcircle' },
            { id: 'toggleSubcircle', property: 'showSubcircle' },  // New toggle
        ];

        featureButtons.forEach(button => {
            const element = document.getElementById(button.id);
            if (element) {
                console.log(`Initializing ${button.id} button`);  // Add debug log
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

        // Dragging Functionality
        this.canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
        this.canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
        this.canvas.addEventListener('mouseup', this.onMouseUp.bind(this));
        this.canvas.addEventListener('mouseleave', this.onMouseUp.bind(this));

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
                
                const presetName = link.getAttribute('data-preset-name');
                console.log('Preset clicked:', presetName);
                
                const config = savedPresets[presetName];
                if (config && config.n1 && config.n2 && config.n3) {
                    console.log('Loading preset configuration...');
                    this.system.n1 = { ...config.n1 };
                    this.system.n2 = { ...config.n2 };
                    this.system.n3 = { ...config.n3 };
                    
                    this.updateDerivedPoints();
                    this.updateDashboard();
                    this.drawSystem();
                    console.log('Preset loaded successfully');
                } else {
                    console.error('Invalid preset configuration:', config);
                }
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
            
            console.log('Dropdown initialized with items:', presetDropdown.innerHTML);
        } else {
            console.error('Preset dropdown elements not found');
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

    onMouseDown(event) {
        const { offsetX, offsetY } = event;
        const transformed = this.transformCoordinates(offsetX, offsetY);
        const nodes = ['n1', 'n2', 'n3', 'incenter'];
        for (let node of nodes) {
            if (this.isPointNear(transformed, this.system[node])) {
                this.isDragging = true;
                this.draggedNode = node;
                break;
            }
        }
    }

    onMouseMove(event) {
        if (this.isDragging && this.draggedNode) {
            const { offsetX, offsetY } = event;
            const transformed = this.transformCoordinates(offsetX, offsetY);
            this.system[this.draggedNode].x = transformed.x;
            this.system[this.draggedNode].y = transformed.y;
            this.updateDerivedPoints();
            this.updateDashboard();
            this.drawSystem();
        }
    }

    onMouseUp() {
        this.isDragging = false;
        this.draggedNode = null;
    }

    transformCoordinates(x, y) {
        return {
            x: x - this.canvas.width / 2,
            y: this.canvas.height / 2 - y
        };
    }

    isPointNear(p1, p2, threshold = 10) {
        const dx = p1.x - p2.x;
        const dy = p1.y - p2.y;
        return Math.sqrt(dx * dx + dy * dy) < threshold;
    }

    roundToZero(value, epsilon = 1e-10) {
        return Math.abs(value) < epsilon ? 0 : value;
    }

    initializeSystem(preset) {
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
            
            // Calculate N1 position to create 35° angle at N2 and 85° angle at N3
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

        // Calculate centroid of raw triangle
        const centroid = {
            x: (rawTriangle.n1.x + rawTriangle.n2.x + rawTriangle.n3.x) / 3,
            y: (rawTriangle.n1.y + rawTriangle.n2.y + rawTriangle.n3.y) / 3
        };

        // Center the triangle around (0,0)
        this.system = {
            n1: { x: rawTriangle.n1.x - centroid.x, y: rawTriangle.n1.y - centroid.y },
            n2: { x: rawTriangle.n2.x - centroid.x, y: rawTriangle.n2.y - centroid.y },
            n3: { x: rawTriangle.n3.x - centroid.x, y: rawTriangle.n3.y - centroid.y },
            intelligence: { x: 0, y: 0 }
        };

        this.updateDerivedPoints();
        this.updateDashboard();
        this.drawSystem();
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

        console.log("Calculating orthocenter for points:", { n1, n2, n3 });

        // Calculate the slopes of sides n1-n2 and n2-n3
        const slopeAB = this.calculateSlope(n1, n2);
        const slopeBC = this.calculateSlope(n2, n3);

        // Calculate the slopes of the altitudes
        const slopeAltitudeA = Math.abs(slopeBC) < EPSILON ? Infinity : -1 / slopeBC; // Altitude from n1
        const slopeAltitudeB = Math.abs(slopeAB) < EPSILON ? Infinity : -1 / slopeAB; // Altitude from n3

        // Calculate the y-intercepts of the altitudes
        const interceptA = n1.y - slopeAltitudeA * n1.x;
        const interceptB = n3.y - slopeAltitudeB * n3.x;

        let orthocenter;

        if (Math.abs(slopeAltitudeA - slopeAltitudeB) < EPSILON) {
            console.warn("Altitudes are parallel. Orthocenter is undefined.");
            return null;
        }

        if (slopeAltitudeA === Infinity) {
            // Altitude A is vertical
            const x = roundNearZero(n1.x);
            const y = roundNearZero(slopeAltitudeB * x + interceptB);
            orthocenter = { x, y };
        } else if (slopeAltitudeB === Infinity) {
            // Altitude B is vertical
            const x = roundNearZero(n3.x);
            const y = roundNearZero(slopeAltitudeA * x + interceptA);
            orthocenter = { x, y };
        } else {
            // Calculate intersection point of the two altitudes
            const x = roundNearZero((interceptB - interceptA) / (slopeAltitudeA - slopeAltitudeB));
            const y = roundNearZero(slopeAltitudeA * x + interceptA);
            orthocenter = { x, y };
        }

        console.log("Calculated orthocenter:", orthocenter);
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

            // Helper function to set element value and handle missing elements
            const setElementValue = (selector, value, precision = 2) => {
                const element = document.querySelector(selector);
                if (element) {
                    element.value = typeof value === 'number' ? value.toFixed(precision) : value;
                } else {
                    
                }
            };

            // Calculate system values
            const area = this.calculateArea();
            const perimeter = this.calculatePerimeter();
            
            // Debug log to check values
            console.log('Area calculation:', area);
            console.log('Perimeter calculation:', perimeter);

            // Update both dashboard and Information Panel
            
            setElementValue('#system-b-copy', area.toFixed(2));  // Keep original ID
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

            // Medians Panel
            const medians = this.calculateMedians();
            setElementValue('#subsystem-1-mc', medians.n1.toFixed(2));
            setElementValue('#subsystem-2-mc', medians.n2.toFixed(2));
            setElementValue('#subsystem-3-mc', medians.n3.toFixed(2));

            // Position Panel
            const centroid = {
                x: (this.system.n1.x + this.system.n2.x + this.system.n3.x) / 3,
                y: (this.system.n1.y + this.system.n2.y + this.system.n3.y) / 3
            };
            
            // Update vertex coordinates
            setElementValue('#node1-coords', `${this.system.n1.x.toFixed(1)}, ${this.system.n1.y.toFixed(1)}`);
            setElementValue('#node2-coords', `${this.system.n2.x.toFixed(1)}, ${this.system.n2.y.toFixed(1)}`);
            setElementValue('#node3-coords', `${this.system.n3.x.toFixed(1)}, ${this.system.n3.y.toFixed(1)}`);
            
            // Update midpoint coordinates
            setElementValue('#mid1-coords', `${this.system.midpoints.m1.x.toFixed(1)}, ${this.system.midpoints.m1.y.toFixed(1)}`);
            setElementValue('#mid2-coords', `${this.system.midpoints.m2.x.toFixed(1)}, ${this.system.midpoints.m2.y.toFixed(1)}`);
            setElementValue('#mid3-coords', `${this.system.midpoints.m3.x.toFixed(1)}, ${this.system.midpoints.m3.y.toFixed(1)}`);
            
            // Update tangent point coordinates
            if (this.system.TangencyPoints && this.system.TangencyPoints.length === 3) {
                setElementValue('#tan1-coords', `${this.system.TangencyPoints[0].x.toFixed(1)}, ${this.system.TangencyPoints[0].y.toFixed(1)}`);
                setElementValue('#tan2-coords', `${this.system.TangencyPoints[1].x.toFixed(1)}, ${this.system.TangencyPoints[1].y.toFixed(1)}`);
                setElementValue('#tan3-coords', `${this.system.TangencyPoints[2].x.toFixed(1)}, ${this.system.TangencyPoints[2].y.toFixed(1)}`);
            }
            
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

            // Information Panel Updates
            const { n1, n2, n3, incenter } = this.system;
            
            // Calculate midpoints (M) for each edge
            const midpoints = this.calculateMidpoints();
            
            // Calculate tangent points (T)
            const tangentPoints = this.calculateTangents();
            
            // Calculate d(M,T) distances for each node
            const dMT = {
                n1: this.calculateDistance(midpoints.m2, tangentPoints[2]), // For NC2 (Blue)
                n2: this.calculateDistance(midpoints.m3, tangentPoints[0]), // For NC3 (Green)
                n3: this.calculateDistance(midpoints.m1, tangentPoints[1])   // For NC1 (Red)
            };

            // Calculate r(M,T) ratios (distance divided by total perimeter)
            const rMT = {
                n1: dMT.n1 / perimeter,
                n2: dMT.n2 / perimeter,
                n3: dMT.n3 / perimeter
            };

            // Update Information Panel
            setElementValue('#d-m-t-n1', dMT.n1);
            setElementValue('#d-m-t-n2', dMT.n2);
            setElementValue('#d-m-t-n3', dMT.n3);
            
            setElementValue('#r-m-t-n1', rMT.n1);
            setElementValue('#r-m-t-n2', rMT.n2);
            setElementValue('#r-m-t-n3', rMT.n3);

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
                    min-width: 90px !important;  /* Increase from current width */
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
        

            // Get the median values
            const medianValues = this.calculateMedians();
            
            // Update MC column in Subsystems table only
            setElementValue('#subsystem-1-mc', medianValues.n1.toFixed(2));
            setElementValue('#subsystem-2-mc', medianValues.n2.toFixed(2));
            setElementValue('#subsystem-3-mc', medianValues.n3.toFixed(2));

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

            // Calculate MCH (Median Channel Entropy) - Update selectors to match HTML
            const mc1 = parseFloat(document.querySelector('#subsystem-1-mc')?.value) || 0;
            const mc2 = parseFloat(document.querySelector('#subsystem-2-mc')?.value) || 0;
            const mc3 = parseFloat(document.querySelector('#subsystem-3-mc')?.value) || 0;
            const mcH = mc1 + mc2 + mc3;
            setElementValue('#system-mch', mcH.toFixed(2));

            // Get System Perimeter Entropy (HP) - Update selector to match HTML
            const hp = parseFloat(document.querySelector('#system-sph')?.value) || 0;

            // Calculate Total System Entropy (H = HP + MCH)
            const totalSystemEntropy = hp + mcH;
            setElementValue('#system-h', totalSystemEntropy.toFixed(2));

            // Get system capacity (C) value - Update selector to match HTML
            const systemCapacity = parseFloat(document.querySelector('#system-b-copy')?.value) || 0;

            // Calculate ratios only if elements exist
            if (systemCapacity !== 0) {
                // H/C and C/H ratios
                if (totalSystemEntropy !== 0) {
                    setElementValue('#sh-b-ratio', (totalSystemEntropy / systemCapacity).toFixed(4));
                    setElementValue('#b-sh-ratio', (systemCapacity / totalSystemEntropy).toFixed(4));
                }
                
                // HP/C and C/HP ratios
                if (hp !== 0 && systemCapacity !== 0) {
                    setElementValue('#sph-area-ratio', (hp / systemCapacity).toFixed(4));
                    setElementValue('#b-sph-ratio', (systemCapacity / hp).toFixed(4));
                }
                
                // HMC/C and C/HMC ratios
                if (mcH !== 0) {
                    setElementValue('#mch-b-ratio', (mcH / systemCapacity).toFixed(4));
                    setElementValue('#b-mch-ratio', (systemCapacity / mcH).toFixed(4));
                }
            }

            // Calculate and update ssh/H ratios for each subsystem
            for (let i = 1; i <= 3; i++) {
                const perimeter = subsystemPerimeters[i-1];
                const sshHRatio = totalSystemEntropy !== 0 ? perimeter / totalSystemEntropy : 0;
                setElementValue(`#subsystem-${i}-entropy-ratio`, sshHRatio.toFixed(4));
            }

            // Only try to update mc-h if it exists
            const mcHElement = document.querySelector('#mc-h');
            if (mcHElement) {
                setElementValue('#mc-h', mcH.toFixed(2));
            }

            // Calculate subchannels (distances between centroids)
            const subchannels = {
                sc1: this.calculateDistance(centroids.ss1, centroids.ss3), // SS1 to SS3
                sc2: this.calculateDistance(centroids.ss1, centroids.ss2), // SS1 to SS2
                sc3: this.calculateDistance(centroids.ss2, centroids.ss3)  // SS2 to SS3
            };

            // Update subchannel values in the table
            setElementValue('#subsystem-1-sc', subchannels.sc1.toFixed(2));
            setElementValue('#subsystem-2-sc', subchannels.sc2.toFixed(2));
            setElementValue('#subsystem-3-sc', subchannels.sc3.toFixed(2));

            // Add subchannel calculations right after the existing centroid updates
            setElementValue('#subsystem-1-sc', this.calculateDistance(centroids.ss1, centroids.ss3).toFixed(2)); // SS1 to SS3
            setElementValue('#subsystem-2-sc', this.calculateDistance(centroids.ss1, centroids.ss2).toFixed(2)); // SS1 to SS2
            setElementValue('#subsystem-3-sc', this.calculateDistance(centroids.ss2, centroids.ss3).toFixed(2)); // SS2 to SS3

            // Calculate HST (Entropy of Subtriangle) - sum of SC values
            const sc1 = parseFloat(document.querySelector('#subsystem-1-sc').value) || 0;
            const sc2 = parseFloat(document.querySelector('#subsystem-2-sc').value) || 0;
            const sc3 = parseFloat(document.querySelector('#subsystem-3-sc').value) || 0;
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
            setElementValue('#system-b-copy', capacity.toFixed(2));  // Keep original ID

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
                if (mcH !== 0) {
                    setElementValue('#mch-b-ratio', (mcH / capacity).toFixed(4));
                    setElementValue('#b-mch-ratio', (capacity / mcH).toFixed(4));
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

            // Update IC fields
            this.updateICFields();

            // Add Euler Line measurements with proper element selection
            const eulerMetrics = this.calculateEulerLineMetrics();
            if (eulerMetrics) {
                // Update using getElementById instead of setElementValue with '#'
                document.getElementById('euler-line-length').value = eulerMetrics.eulerLineLength;
                document.getElementById('euler-line-slope').value = eulerMetrics.eulerLineSlope;  // Add this line
                document.getElementById('o-i-ratio').value = eulerMetrics.oToIRatio;
                document.getElementById('i-sp-ratio').value = eulerMetrics.iToSPRatio;
                document.getElementById('sp-np-ratio').value = eulerMetrics.spToNPRatio;
                document.getElementById('np-ho-ratio').value = eulerMetrics.npToHORatio;
            }

            // Inside updateDashboard() method, where other ratios are calculated
            if (hp !== 0 && mcH !== 0) {
                // HP/HIC and HIC/HP ratios
                setElementValue('#hp-hic-ratio', (hp / mcH).toFixed(4));
                setElementValue('#hic-hp-ratio', (mcH / hp).toFixed(4));
            }

            if (totalSystemEntropy !== 0) {
                // HP/H and H/HP ratios
                setElementValue('#hp-h-ratio', (hp / totalSystemEntropy).toFixed(4));
                setElementValue('#h-hp-ratio', (totalSystemEntropy / hp).toFixed(4));
                
                // HIC/H and H/HIC ratios
                setElementValue('#hic-h-ratio', (mcH / totalSystemEntropy).toFixed(4));
                setElementValue('#h-hic-ratio', (totalSystemEntropy / mcH).toFixed(4));
            }

        } catch (error) {
            console.error('Error updating dashboard:', error);
        }
    }
    
    calculateSubsystemAngles() {
        const centroid = {
            x: (this.system.n1.x + this.system.n2.x + this.system.n3.x) / 3,
            y: (this.system.n1.y + this.system.n2.y + this.system.n3.y) / 3
        };

        // Calculate angles for each subsystem at the centroid
        const nodes = [
            [this.system.n1, this.system.n3],  // SS1 (Red, Left)
            [this.system.n1, this.system.n2],  // SS2 (Blue, Right)
            [this.system.n2, this.system.n3]   // SS3 (Green, Base)
        ];

        return nodes.map(([p1, p2]) => {
            const v1 = { x: p1.x - centroid.x, y: p1.y - centroid.y };
            const v2 = { x: p2.x - centroid.x, y: p2.y - centroid.y };
            const dot = v1.x * v2.x + v1.y * v2.y;
            const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
            const mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);
            const angle = Math.acos(dot / (mag1 * mag2)) * (180 / Math.PI);
            return angle;
        });
    }

    calculateSubsystemPerimeters() {
        const centroid = {
            x: (this.system.n1.x + this.system.n2.x + this.system.n3.x) / 3,
            y: (this.system.n1.y + this.system.n2.y + this.system.n3.y) / 3
        };

        return [
            // SS1 (Red, Left: N1-N3-I)
            this.calculateDistance(this.system.n1, this.system.n3) +
            this.calculateDistance(this.system.n3, centroid) +
            this.calculateDistance(centroid, this.system.n1),
            
            // SS2 (Blue, Right: N1-N2-I)
            this.calculateDistance(this.system.n1, this.system.n2) +
            this.calculateDistance(this.system.n2, centroid) +
            this.calculateDistance(centroid, this.system.n1),
            
            // SS3 (Green, Base: N2-N3-I)
            this.calculateDistance(this.system.n2, this.system.n3) +
            this.calculateDistance(this.system.n3, centroid) +
            this.calculateDistance(centroid, this.system.n2)
        ];
    }

    calculateSubsystemAreas() {
        const { n1, n2, n3 } = this.system;
        const origin = { x: 0, y: 0 };  // Intelligence point (I)

        return [
            // SS1 (triangle formed by N1, N3, and I)
            this.calculateTriangleArea(n1, n3, origin),
            // SS2 (triangle formed by N1, N2, and I)
            this.calculateTriangleArea(n1, n2, origin),
            // SS3 (triangle formed by N2, N3, and I)
            this.calculateTriangleArea(n2, n3, origin)
        ];
    }

    calculateTriangleArea(p1, p2, p3) {
        return Math.abs(
            (p1.x * (p2.y - p3.y) +
             p2.x * (p3.y - p1.y) +
             p3.x * (p1.y - p2.y)) / 2
        );  // Fixed parentheses here
    }

    updateInformationPanel() {
        const setElementValue = (selector, value) => {
            const element = document.querySelector(selector);
            if (element) {
                element.value = this.formatValue(value);
            }
        };

        // Calculate distances and ratios
        const dIIC = this.calculateDistance(
            this.system.intelligence,
            this.system.incenter
        );

        const roundToZero = (value, epsilon = 1e-10) => Math.abs(value) < epsilon ? 0 : value;
        const dIICRounded = roundToZero(dIIC);
        
        // Update distance and ratio values
        setElementValue('#d-i-ic', dIICRounded);
        
        const perimeter = this.calculatePerimeter();
        const rIIC = roundToZero(perimeter !== 0 ? dIICRounded / perimeter : 0);
        setElementValue('#r-i-ic', rIIC);

        // Update midpoint to tangent point distances
        const midpoints = this.calculateMidpoints();
        const tangencyPoints = this.system.TangencyPoints;

        if (dIICRounded === 0) {
            ['n1', 'n2', 'n3'].forEach(node => {
                setElementValue(`#d-m-t-${node}`, 0);
                setElementValue(`#r-m-t-${node}`, 0);
            });
        } else {
            // Update distances in correct order matching our node scheme
            ['n1', 'n2', 'n3'].forEach((node, index) => {
                const midpoint = midpoints[`m${index + 1}`];
                const tangentPoint = tangencyPoints[index];
                const dMT = this.calculateDistance(midpoint, tangentPoint);
                const rMT = perimeter !== 0 ? dMT / perimeter : 0;
                setElementValue(`#d-m-t-${node}`, roundToZero(dMT));
                setElementValue(`#r-m-t-${node}`, roundToZero(rMT));
            });
        }

        // Update coordinates
        ['n1', 'n2', 'n3'].forEach(node => {
            setElementValue(`#node-${node}-coords`, 
                `(${this.formatValue(this.system[node].x)}, ${this.formatValue(this.system[node].y)})`);
            setElementValue(`#node-${node}-angle`, 
                `${this.calculateAngles()[node].toFixed(2)}°`);
        });

        // Update center coordinates
        const centroid = {
            x: (this.system.n1.x + this.system.n2.x + this.system.n3.x) / 3,
            y: (this.system.n1.y + this.system.n2.y + this.system.n3.y) / 3
        };
        
        setElementValue('#centroid-coords', 
            `${this.formatValue(this.roundToZero(centroid.x))}, ${this.formatValue(this.roundToZero(centroid.y))}`);
        setElementValue('#incenter-coords', 
            `${this.formatValue(this.roundToZero(this.system.incenter.x))}, ${this.formatValue(this.roundToZero(this.system.incenter.y))}`);
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
            this.ctx.fillStyle = 'white';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';

            // Calculate edge midpoints
            const nc1Mid = this.calculateMidpoint(this.system.n1, this.system.n3);
            const nc2Mid = this.calculateMidpoint(this.system.n1, this.system.n2);
            const nc3Mid = this.calculateMidpoint(this.system.n2, this.system.n3);

            // Calculate edge lengths
            const nc1Length = this.calculateDistance(this.system.n1, this.system.n3).toFixed(2);
            const nc2Length = this.calculateDistance(this.system.n1, this.system.n2).toFixed(2);
            const nc3Length = this.calculateDistance(this.system.n2, this.system.n3).toFixed(2);

            // Calculate offset directions for each edge
            const offset = 25; // Adjust this value to position labels further or closer

            // NC1 label (left edge)
            const nc1Angle = Math.atan2(this.system.n1.y - this.system.n3.y, this.system.n1.x - this.system.n3.x);
            const nc1OffsetX = -offset * Math.sin(nc1Angle);
            const nc1OffsetY = offset * Math.cos(nc1Angle);
            this.ctx.fillText(nc1Length, nc1Mid.x + nc1OffsetX, -nc1Mid.y + nc1OffsetY);

            // NC2 label (right edge)
            const nc2Angle = Math.atan2(this.system.n1.y - this.system.n2.y, this.system.n1.x - this.system.n2.x);
            const nc2OffsetX = offset * Math.sin(nc2Angle);
            const nc2OffsetY = -offset * Math.cos(nc2Angle);
            this.ctx.fillText(nc2Length, nc2Mid.x + nc2OffsetX, -nc2Mid.y + nc2OffsetY);

            // NC3 label (bottom edge)
            this.ctx.fillText(nc3Length, nc3Mid.x, -nc3Mid.y + offset);

            this.ctx.restore();  // Restore context state

            // Draw special centers if enabled
            if (this.showSpecialCenters) {
                console.log("Drawing special centers with state:", {
                    showSpecialCenters: this.showSpecialCenters,
                    orthocenter: this.system.orthocenter
                });

                // Draw orthocenter point and label
                if (this.system.orthocenter) {
                    this.ctx.beginPath();
                    this.ctx.fillStyle = '#FF0000';  // Pink color
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
                    this.ctx.fillStyle = '#FF0000';
                    this.ctx.font = '12px Arial';
                    this.ctx.fillText('HO', this.system.orthocenter.x + 10, -this.system.orthocenter.y);
                    this.ctx.restore();
                }
            }

            // Draw Orthocircle if enabled (after special centers)
            if (this.showOrtho) {
                this.drawOrthocircle(this.ctx);
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
                    this.ctx.fillStyle = '#00FF00';  // Green color
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
                    this.ctx.fillStyle = '#00FF00';
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

        } catch (error) {
            console.error('Error drawing system:', error);
        }
    }

    drawNode(ctx, node, color, label) {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(node.x, node.y, 6, 0, 2 * Math.PI);  // Changed from 8 to 6 to match incenter/centroid
        ctx.fill();

        // Draw label
        ctx.fillStyle = 'white';
        ctx.font = '12px Arial';
        ctx.save();
        ctx.scale(1, -1);
        ctx.fillText(label, node.x + 10, -node.y);
        ctx.restore();
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
        ctx.font = '12px Arial';
        
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

        // Update colors to match subsystem definitions
        // Draw SS3 region (Red)
        this.ctx.fillStyle = 'rgba(255, 0, 0, 0.1)';
        this.ctx.beginPath();
        this.ctx.moveTo(n3.x, n3.y);
        this.ctx.lineTo(n1.x, n1.y);
        this.ctx.lineTo(origin.x, origin.y);
        this.ctx.closePath();
        this.ctx.fill();

        // Draw SS1 region (Blue)
        this.ctx.fillStyle = 'rgba(0, 0, 255, 0.1)';
        this.ctx.beginPath();
        this.ctx.moveTo(n1.x, n1.y);
        this.ctx.lineTo(n2.x, n2.y);
        this.ctx.lineTo(origin.x, origin.y);
        this.ctx.closePath();
        this.ctx.fill();

        // Draw SS2 region (Green)
        this.ctx.fillStyle = 'rgba(0, 255, 0, 0.1)';
        this.ctx.beginPath();
        this.ctx.moveTo(n2.x, n2.y);
        this.ctx.lineTo(n3.x, n3.y);
        this.ctx.lineTo(origin.x, origin.y);
        this.ctx.closePath();
        this.ctx.fill();

        // Draw centroids with matching colors
        const centroids = this.calculateSubsystemCentroids();
        
        // Draw SS1 centroid (Blue)
        this.ctx.fillStyle = 'rgba(0, 0, 255, 0.8)';
        this.ctx.beginPath();
        this.ctx.arc(centroids.ss1.x, centroids.ss1.y, 4, 0, 2 * Math.PI);
        this.ctx.fill();
        
        // Draw SS2 centroid (Green)
        this.ctx.fillStyle = 'rgba(0, 255, 0, 0.8)';
        this.ctx.beginPath();
        this.ctx.arc(centroids.ss2.x, centroids.ss2.y, 4, 0, 2 * Math.PI);
        this.ctx.fill();
        
        // Draw SS3 centroid (Red)
        this.ctx.fillStyle = 'rgba(255, 0, 0, 0.8)';
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

        return [
            calculateTangencyPoint(n2, n3),  // Tangent point on NC3 (Green)
            calculateTangencyPoint(n1, n3),  // Tangent point on NC1 (Red)
            calculateTangencyPoint(n1, n2)   // Tangent point on NC2 (Blue)
        ];
    }

    // Additional methods to calculate angles, perimeter, area, lengths, etc.
    calculateAngles() {
        const { n1, n2, n3 } = this.system;
        const lengths = this.calculateLengths();
        
        // Calculate angles using law of cosines
        const angleN1 = Math.acos(
            (lengths.l1 * lengths.l1 + lengths.l2 * lengths.l2 - lengths.l3 * lengths.l3) / 
            (2 * lengths.l1 * lengths.l2)
        ) * (180 / Math.PI);
        
        const angleN2 = Math.acos(
            (lengths.l2 * lengths.l2 + lengths.l3 * lengths.l3 - lengths.l1 * lengths.l1) / 
            (2 * lengths.l2 * lengths.l3)
        ) * (180 / Math.PI);
        
        const angleN3 = 180 - angleN1 - angleN2;
        
        return { n1: angleN1, n2: angleN2, n3: angleN3 };
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
        const MEDIAN_CHANNEL_RATIO = 2/3;  // MC is always 2/3 of median length
        
        return {
            n1: this.calculateDistance(n1, midpoints.m3) * MEDIAN_CHANNEL_RATIO,  // N1 to centroid
            n2: this.calculateDistance(n2, midpoints.m1) * MEDIAN_CHANNEL_RATIO,  // N2 to centroid
            n3: this.calculateDistance(n3, midpoints.m2) * MEDIAN_CHANNEL_RATIO   // N3 to centroid
        };
    }

    calculateMidpoints() {
        const { n1, n2, n3 } = this.system;
        return {
            m1: { x: (n1.x + n3.x) / 2, y: (n1.y + n3.y) / 2 },  // Midpoint of NC1 (Red, Left)
            m2: { x: (n1.x + n2.x) / 2, y: (n1.y + n2.y) / 2 },  // Midpoint of NC2 (Blue, Right)
            m3: { x: (n2.x + n3.x) / 2, y: (n2.y + n3.y) / 2 }   // Midpoint of NC3 (Green, Base)
        };
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
        ctx.fillStyle = 'white';
        ctx.font = '14px Arial';
        
        // Save current transform
        ctx.save();
        ctx.scale(1, -1);  // Flip text right-side up
        
        // N1 angle (top)
        ctx.fillText(
            `${Math.round(angles.n1)}°`, 
            this.system.n1.x - 25, 
            -this.system.n1.y - 20
        );
        
        // N2 angle (bottom right)
        ctx.fillText(
            `${Math.round(angles.n2)}°`, 
            this.system.n2.x + 25, 
            -this.system.n2.y + 20
        );
        
        // N3 angle (bottom left)
        ctx.fillText(
            `${Math.round(angles.n3)}°`, 
            this.system.n3.x - 40, 
            -this.system.n3.y + 20
        );
        
        // Restore transform
        ctx.restore();
    }

    drawEdgeLengths(ctx) {
        // Implement edge length drawing logic here
    }

    drawEdges(ctx) {
        const { n1, n2, n3 } = this.system;
        
        // Draw NC1 (Red, Left: N1-N3)
        ctx.strokeStyle = 'red';
        ctx.beginPath();
        ctx.moveTo(n1.x, n1.y);
        ctx.lineTo(n3.x, n3.y);
        ctx.stroke();
        
        // Draw NC2 (Blue, Right: N1-N2)
        ctx.strokeStyle = 'blue';
        ctx.beginPath();
        ctx.moveTo(n1.x, n1.y);
        ctx.lineTo(n2.x, n2.y);
        ctx.stroke();
        
        // Draw NC3 (Green, Base: N2-N3)
        ctx.strokeStyle = 'green';
        ctx.beginPath();
        ctx.moveTo(n2.x, n2.y);
        ctx.lineTo(n3.x, n3.y);
        ctx.stroke();
    }

    drawNodes(ctx) {
        // Draw each node with its label
        this.drawNode(ctx, this.system.n1, 'red', 'N1');
        this.drawNode(ctx, this.system.n2, 'blue', 'N2');
        this.drawNode(ctx, this.system.n3, 'green', 'N3');
        
        // Remove incenter from here since it's now handled separately
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
        this.updateAnimationFields();  // Add this
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
        ctx.arc(incenter.x, incenter.y, 4, 0, 2 * Math.PI);  // Reduced from 5 to 4
        ctx.fill();
        
        // Label 'IC' with smaller font size
        ctx.fillStyle = '#00FFFF';
        ctx.font = '12px Arial';  // Reduced from 14px to 12px
        ctx.save();
        ctx.scale(1, -1);
        ctx.fillText('ICP', incenter.x + 10, -incenter.y);
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
                deleteBtn.className = 'btn btn-danger btn-sm';
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

            console.log('Initialized animations dropdown with', sortedNames.length, 'items');
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
                console.log('Animate button clicked');
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
            console.log('Adding preset:', name);
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

        console.log('User presets initialized');
    }

    loadUserPreset(name) {
        console.log('Loading preset:', name);
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
            console.log('Preset loaded:', name);
        }
    }

    saveCurrentConfig() {
        console.log('Starting save configuration process');
        
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
                
                console.log('Preset saved successfully:', name, config);
                
                // Update dropdown immediately
                this.updatePresetsDropdown();
                
                alert('Preset saved successfully!');
            } catch (error) {
                console.error('Error saving preset:', error);
                alert('Error saving preset. Please try again.');
            }
        } else {
            console.log('Save cancelled by user');
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

            console.log('Saving animation with values:', {
                name,
                start: startState,
                end: endState
            });

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
        console.log('Initializing animations dropdown');
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
        console.log('Updating animation fields with lengths:', currentLengths);

        // Update Animation Start fields
        const startNc1Input = document.getElementById('animation-nc1-start');
        const startNc2Input = document.getElementById('animation-nc2-start');
        const startNc3Input = document.getElementById('animation-nc3-start');

        if (startNc1Input && startNc2Input && startNc3Input) {
            startNc1Input.value = currentLengths.l1.toFixed(2);
            startNc2Input.value = currentLengths.l2.toFixed(2);
            startNc3Input.value = currentLengths.l3.toFixed(2);
            console.log('Updated start fields');
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

        // Process Information Panel
        const infoPanel = document.getElementById('information-panel');
        if (infoPanel) {
            processPanel(infoPanel, 'Information Panel');
        }

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
        
        // Calculate slopes of sides
        const slope12 = (n2.y - n1.y) / (n2.x - n1.x);
        const slope23 = (n3.y - n2.y) / (n3.x - n2.x);
        const slope31 = (n1.y - n3.y) / (n1.x - n3.x);
        
        // Calculate slopes of altitudes (perpendicular to sides)
        const altSlope1 = slope23 !== 0 ? -1 / slope23 : Infinity;
        const altSlope2 = slope31 !== 0 ? -1 / slope31 : Infinity;
        
        // Calculate y-intercepts for altitude lines
        const b1 = n1.y - altSlope1 * n1.x;
        const b2 = n2.y - altSlope2 * n2.x;
        
        // Calculate intersection of altitudes
        let orthocenter;
        if (altSlope1 === Infinity) {
            orthocenter = {
                x: n1.x,
                y: altSlope2 * n1.x + b2
            };
        } else if (altSlope2 === Infinity) {
            orthocenter = {
                x: n2.x,
                y: altSlope1 * n2.x + b1
            };
        } else {
            const x = (b2 - b1) / (altSlope1 - altSlope2);
            const y = altSlope1 * x + b1;
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
        ctx.strokeStyle = '#00FF00';  // Bright neon green
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
        ctx.strokeStyle = '#FFFFFF';  // White color
        ctx.setLineDash([5, 5]);     // Dotted line
        ctx.lineWidth = 1;
        
        ctx.moveTo(startPoint.x, startPoint.y);
        ctx.lineTo(endPoint.x, endPoint.y);
        
        ctx.stroke();
        ctx.setLineDash([]);  // Reset dash pattern
        ctx.restore();
    }

    drawTriangle() {
        const { n1, n2, n3 } = this.system;
        
        // Draw edges
        this.ctx.strokeStyle = '#FFFFFF';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(n1.x, n1.y);
        this.ctx.lineTo(n2.x, n2.y);
        this.ctx.lineTo(n3.x, n3.y);
        this.ctx.closePath();
        this.ctx.stroke();

        // Draw vertices with N1, N2, N3 labels
        [n1, n2, n3].forEach((node, index) => {
            // Draw vertex point
            this.ctx.fillStyle = '#FFFFFF';
            this.ctx.beginPath();
            this.ctx.arc(node.x, node.y, 5, 0, 2 * Math.PI);
            this.ctx.fill();

            // Draw Node labels (N1, N2, N3)
            this.ctx.save();
            this.ctx.scale(1, -1); // Flip y-axis for text
            this.ctx.fillStyle = '#FFFFFF';
            this.ctx.font = '14px Arial';
            this.ctx.fillText(`N${index + 1}`, node.x + 10, -node.y);
            this.ctx.restore();
        });

        // Draw Median Channels (if enabled)
        if (this.showMedians) {
            const origin = { x: 0, y: 0 }; // I point
            
            // Draw lines from I to each vertex
            [n1, n2, n3].forEach((node, index) => {
                this.ctx.strokeStyle = '#AAAAAA'; // Gray color for medians
                this.ctx.lineWidth = 1;
                this.ctx.beginPath();
                this.ctx.moveTo(origin.x, origin.y);
                this.ctx.lineTo(node.x, node.y);
                this.ctx.stroke();

                // Optionally label the median channels (MC1, MC2, MC3)
                const midpoint = {
                    x: (origin.x + node.x) / 2,
                    y: (origin.y + node.y) / 2
                };
                
                this.ctx.save();
                this.ctx.scale(1, -1);
                this.ctx.fillStyle = '#AAAAAA';
                this.ctx.font = '12px Arial';
                this.ctx.fillText(`MC${index + 1}`, midpoint.x + 5, -midpoint.y);
                this.ctx.restore();
            });
        }
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

    /**
     * Calculates the Orthocircle of the triangle.
     * 
     * Definition:
     * The Orthocircle is defined as a circle centered at the orthocenter of the triangle,
     * with a radius equal to the distance from the orthocenter to one of the triangle's vertices.
     * 
     * @returns {Object|null} An object containing the center (orthocenter) and radius of the Orthocircle,
     *                        or null if calculation is not possible.
     */
    calculateOrthocircle() {
        const { n1, n2, n3 } = this.system;
        
        console.log("Calculating orthocircle for points:", { n1, n2, n3 });

        try {
            // Check if the triangle is degenerate
            if (this.areCollinear(n1, n2, n3)) {
                console.warn("Cannot calculate orthocircle: points are collinear");
                return null;
            }

            // Calculate the orthocenter
            const orthocenter = this.calculateOrthocenter();
            if (!orthocenter) {
                console.warn("Cannot calculate orthocircle: orthocenter calculation failed");
                return null;
            }

            // Calculate the radius as the distance from the orthocenter to one vertex
            const radius = this.calculateDistance(orthocenter, n1);
            
            console.log("Orthocircle calculated:", { center: orthocenter, radius });
            
            return {
                center: orthocenter,
                radius: radius
            };
        } catch (error) {
            console.error("Error calculating orthocircle:", error);
            return null;
        }
    }

    /**
     * Draws the Orthocircle on the canvas if it exists.
     * 
     * @param {CanvasRenderingContext2D} ctx - The canvas rendering context
     */
    drawOrthocircle(ctx) {
        const orthocircle = this.calculateOrthocircle();
        
        if (!orthocircle || !orthocircle.center || !orthocircle.radius) {
            console.warn("Cannot draw orthocircle: invalid calculation");
            return;
        }
        
        ctx.save();
        ctx.beginPath();
        ctx.strokeStyle = '#FF0000';  // Pink color to match orthocenter
        ctx.setLineDash([5, 5]);     // Dashed line
        ctx.lineWidth = 1;
        
        ctx.arc(
            orthocircle.center.x,
            orthocircle.center.y,
            orthocircle.radius,
            0,
            2 * Math.PI
        );
        
        ctx.stroke();
        ctx.setLineDash([]);  // Reset dash pattern
        ctx.restore();
        
        console.log("Orthocircle drawn");
    }

    calculateCentroid() {
        const { n1, n2, n3 } = this.system;
        return {
            x: (n1.x + n2.x + n3.x) / 3,
            y: (n1.y + n2.y + n3.y) / 3
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
                .sort(([nameA], [nameB]) => nameA.toLowerCase().localeCompare(nameB.toLowerCase()));
            
            // Add animations to dropdown
            sortedAnimations.forEach(([name, values]) => {
                const li = document.createElement('li');
                const a = document.createElement('a');
                a.className = 'dropdown-item';
                a.href = '#';
                
                // Create span for the text content
                const textSpan = document.createElement('span');
                textSpan.textContent = name;
                
                // Create button container for edit and delete
                const buttonContainer = document.createElement('div');
                buttonContainer.className = 'preset-buttons';
                
                // Create edit button
                const editBtn = document.createElement('button');
                editBtn.className = 'btn btn-secondary btn-sm';
                editBtn.textContent = '✎';
                editBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const newName = prompt('Enter new name for animation:', name);
                    if (newName && newName !== name) {
                        this.renameAnimation(name, newName, values);
                    }
                });
                
                // Create delete button
                const deleteBtn = document.createElement('button');
                deleteBtn.className = 'btn btn-danger btn-sm';
                deleteBtn.textContent = '×';
                deleteBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.deleteAnimation(name);
                });
                
                // Append buttons to container
                buttonContainer.appendChild(editBtn);
                buttonContainer.appendChild(deleteBtn);
                
                // Append in correct order
                a.appendChild(textSpan);
                a.appendChild(buttonContainer);
                li.appendChild(a);
                animationsList.appendChild(li);
                
                // Add click handler for loading animation
                a.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.loadAnimation(name, values);
                });
            });
            
        } catch (error) {
            console.error('Error updating animations dropdown:', error);
        }
    }

    renameAnimation(oldName, newName, values) {
        try {
            const animations = JSON.parse(localStorage.getItem('userAnimations') || '{}');
            delete animations[oldName];
            animations[newName] = values;
            localStorage.setItem('userAnimations', JSON.stringify(animations));
            this.updateAnimationsDropdown();
            console.log(`Renamed animation from "${oldName}" to "${newName}"`);
        } catch (error) {
            console.error('Error renaming animation:', error);
            alert('Error renaming animation. Please try again.');
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

            

            // First reset to start position
            this.updateTriangleFromEdges(startState.nc1, startState.nc2, startState.nc3);
            
            // Animation parameters
            const duration = 1000; // 1 second
            const startTime = performance.now();

            // Animation function
            const animate = (currentTime) => {
                const elapsed = currentTime - startTime;
                const progress = Math.min(elapsed / duration, 1);

                // Calculate current values using linear interpolation
                const current = {
                    nc1: startState.nc1 + (endState.nc1 - startState.nc1) * progress,
                    nc2: startState.nc2 + (endState.nc2 - startState.nc2) * progress,
                    nc3: startState.nc3 + (endState.nc3 - startState.nc3) * progress
                };

                // Update triangle with current values
                this.updateTriangleFromEdges(current.nc1, current.nc2, current.nc3);

                // Continue animation if not complete
                if (progress < 1) {
                    requestAnimationFrame(animate);
                }
            };

            // Start animation
            requestAnimationFrame(animate);
        } catch (error) {
            console.error('Error in startAnimation:', error);
            alert('Error starting animation. Please check the console for details.');
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
        ctx.strokeStyle = '#ffffff';  // Changed from #ff0000 to white
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(subtriangleCentroids.ss1.x, subtriangleCentroids.ss1.y);
        ctx.lineTo(subtriangleCentroids.ss2.x, subtriangleCentroids.ss2.y);
        ctx.lineTo(subtriangleCentroids.ss3.x, subtriangleCentroids.ss3.y);
        ctx.closePath();
        ctx.stroke();
        
        // Optional: Fill with semi-transparent white
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';  // Changed from red to white
        ctx.fill();
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
        ctx.strokeStyle = '#FFFFFF';
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
        ctx.fillStyle = '#FFFFFF';  // Changed from '#FFA500' to white
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
        ctx.fillStyle = '#FFFFFF';  // Changed from '#FFA500' to white
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
            const vertices = this.getSubsystemVertices(subsystemIndex);
            if (!vertices || vertices.length === 0) {
                console.error('No vertices found for subsystem:', subsystemIndex);
                return { x: 0, y: 0 }; // Return default values if no vertices
            }
            
            const x = vertices.reduce((sum, v) => sum + (v?.x || 0), 0) / vertices.length;
            const y = vertices.reduce((sum, v) => sum + (v?.y || 0), 0) / vertices.length;
            return { x, y };
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
             ss3.x * (ss1.y - ss2.y)) / 2
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
        // Calculate IC values (distance from centroid to each vertex)
        const centroid = {
            x: (this.system.n1.x + this.system.n2.x + this.system.n3.x) / 3,
            y: (this.system.n1.y + this.system.n2.y + this.system.n3.y) / 3
        };

        const icValues = {
            'manual-ic1': this.calculateDistance(centroid, this.system.n1),  // IC1 to Node 1
            'manual-ic2': this.calculateDistance(centroid, this.system.n2),  // IC2 to Node 2
            'manual-ic3': this.calculateDistance(centroid, this.system.n3)   // IC3 to Node 3
        };

        // Update each IC field while preserving editability
        Object.entries(icValues).forEach(([id, value]) => {
            const input = document.getElementById(id);
            if (input && !input.matches(':focus')) {
                input.value = value.toFixed(2);
                input.readOnly = false;
            }
        });
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

            // Calculate Euler Line slope and angle
            const dx = this.system.orthocenter.x - this.system.circumcenter.x;
            const dy = this.system.orthocenter.y - this.system.circumcenter.y;
            const eulerLineSlope = dx !== 0 ? (dy / dx) : Infinity;
            
            // Calculate angle using atan2 and normalize it
            const eulerLineAngle = Math.atan2(dy, dx) * (180 / Math.PI);
            const normalizedAngle = eulerLineAngle > 180 ? eulerLineAngle - 360 : eulerLineAngle;

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
            if (eulerLineLength > 0.0001) {
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

            return metrics;
        } catch (error) {
            console.error('Error calculating Euler Line metrics:', error);
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
    }
}

// Outside the class - DOM initialization
document.addEventListener('DOMContentLoaded', () => {
    // Check for animation elements
    ['animation-nc1-end', 'animation-nc2-end', 'animation-nc3-end', 'animate-button'].forEach(id => {
        const element = document.getElementById(id);
        console.log(`Element ${id} exists:`, !!element);
    });

    const canvas = document.querySelector('#canvas');
    if (canvas) {
        const triangleSystem = new TriangleSystem(canvas);
    } else {
        console.error("Canvas element not found");
    }

    // Add circumcircle toggle
    const toggleCircumcircleButton = document.getElementById('toggleCircumcircle');
    if (toggleCircumcircleButton) {
        toggleCircumcircleButton.addEventListener('click', () => {
            triangleSystem.showCircumcircle = !triangleSystem.showCircumcircle;
            triangleSystem.drawSystem();
        });
    }

    // Add CSS dynamically to ensure coordinate input fields are wide enough
    const style = document.createElement('style');
    style.textContent = `
        /* General subsystem table input styling */
        .subsystems-table input[type="text"] {
            min-width: 90px !important;
            width: auto !important;
            text-align: right;
        }

        /* Coordinate input fields (for all x,y positions) */
        input[type="text"].form-control[size="15"] {
            min-width: 120px !important;
            width: auto !important;
            text-align: center !important;
            font-family: monospace !important;  /* For better alignment of numbers */
        }

        /* Add these styles to your existing <style> section */
        #userPresetsDropdown {
            font-size: 0.875rem;
            padding: 0.25rem 0.75rem;
        }

        #userPresetsList {
            max-height: 300px;
            overflow-y: auto;
            padding: 0.25rem 0;
            margin: 0;
            font-size: 0.875rem;
        }

        #userPresetsList li {
            margin: 0 !important;
            padding: 0 !important;
        }

        #userPresetsList .dropdown-item {
            display: flex !important;
            align-items: center !important;
            justify-content: space-between !important;
            padding: 0.15rem 0.5rem !important;
            margin: 0 !important;
            font-size: 0.875rem !important;
            line-height: 1.2 !important;
            white-space: nowrap !important;  /* Prevent wrapping */
        }

        #userPresetsList .btn-danger {
            padding: 0 0.25rem !important;
            font-size: 0.75rem !important;
            line-height: 1 !important;
            margin-left: 0.5rem !important;
            height: 1.2rem !important;
            float: none !important;  /* Remove float */
            display: inline-flex !important;
            align-items: center !important;
        }

        /* Ensure dropdown menu has proper dark theme */
        .dropdown-menu {
            background-color: #2c2c2c;
            border-color: #444;
        }

        .dropdown-item {
            color: #fff;
        }

        .dropdown-item:hover {
            background-color: #444;
            color: #fff;
        }

        /* Dropdown specific styles */
        .dropdown-menu {
            padding: 0.25rem 0 !important;  /* Reduced padding top/bottom */
        }

        #userPresetsList {
            margin: 0 !important;
            padding: 0 !important;
        }

        #userPresetsList li {
            margin: 0 !important;
            padding: 0 !important;
            line-height: 0.5 !important;  /* Reduced line height */
        }

        #userPresetsList .dropdown-item {
            padding: 0.15rem 0.5rem !important;  /* Reduced padding top/bottom */
            margin: 0 !important;
            display: flex !important;
            align-items: center !important;
            justify-content: space-between !important;
            font-size: 0.875rem !important;
            line-height: 0.5 !important;  /* Match li line-height */
        }

        #userPresetsList .btn-danger {
            padding: 0 0.25rem !important;
            font-size: 0.75rem !important;
            line-height: 1 !important;
            margin-left: 0.5rem !important;
            height: 1.2rem !important;  /* Match line height */
        }

        /* Ensure the list items don't wrap */
        #userPresetsList li {
            margin: 0 !important;
            padding: 0 !important;
            white-space: nowrap !important;
        }

        /* Make dropdown wide enough to fit content */
        .dropdown-menu {
            min-width: max-content !important;
        }

        /* Dropdown item container */
        #userPresetsList li {
            margin: 0 !important;
            padding: 0 !important;
        }

        /* Dropdown item styling */
        #userPresetsList .dropdown-item {
            display: flex !important;
            align-items: center !important;
            justify-content: space-between !important;
            padding: 0.15rem 0.5rem !important;
            margin: 0 !important;
            font-size: 0.875rem !important;
            line-height: 1.2 !important;
            white-space: nowrap !important;
            width: 100% !important;
        }

        /* Text content wrapper */
        #userPresetsList .dropdown-item span {
            flex: 1 !important;
            margin-right: 0.5rem !important;
        }

        /* Delete button styling */
        #userPresetsList .btn-danger {
            font-size: 0.75rem !important;
            padding: 0 0.25rem !important;
            line-height: 1 !important;
            height: 1.2rem !important;
            flex-shrink: 0 !important;
            margin: 0 !important;
        }

        /* Add to your existing styles */
        .preset-buttons {
            display: flex !important;
            gap: 0.25rem !important;
            margin-left: 0.5rem !important;
        }

        #userPresetsList .btn-secondary {
            font-size: 0.75rem !important;
            padding: 0 0.25rem !important;
            line-height: 1 !important;
            height: 1.2rem !important;
        }

        #userPresetsList .dropdown-item {
            padding-right: 0.5rem !important;
        }

        /* Add to your existing styles */
        #animationsList {
            margin: 0 !important;
            padding: 0 !important;
        }

        #animationsList .dropdown-item {
            display: flex !important;
            align-items: center !important;
            justify-content: space-between !important;
            padding: 0.15rem 0.5rem !important;
            margin: 0 !important;
            font-size: 0.875rem !important;
            line-height: 1.2 !important;
            white-space: nowrap !important;
            width: 100% !important;
        }

        /* Make both dropdowns the same size */
        #userPresetsDropdown,
        #animationsDropdown {
            width: 120px !important;
            font-size: 0.875rem !important;
        }

        /* Export container button spacing */
        .export-container button {
            margin-right: 0.5rem !important;
        }
        
        .export-container button:last-child {
            margin-right: 0 !important;
        }

        /* Save State button styling */
        #saveState {
            background-color: #198754 !important;  /* Bootstrap success green */
            border-color: #198754 !important;
        }

        #saveState:hover {
            background-color: #157347 !important;
            border-color: #146c43 !important;
        }
    `;
    document.head.appendChild(style);

    // Update the HTML size attributes
    document.querySelectorAll('.subsystems-table td:nth-child(5) input, .subsystems-table td:nth-child(6) input').forEach(input => {
        input.setAttribute('size', '15');
    });

    // Add event listener for subcenter toggle button
    const toggleSubcenterButton = document.getElementById('toggleSubcenter');
    if (toggleSubcenterButton) {
        toggleSubcenterButton.addEventListener('click', function() {
            triangleSystem.toggleSubcenter();
        });
    }

    // Update toggle button text if it exists
    const specialCentersToggle = document.getElementById('toggleSpecialCenters');
    if (specialCentersToggle) {
        specialCentersToggle.textContent = 'Toggle Orthocenter (HO)';
    }

    // Update any tooltip or help text that might reference the orthocenter
    const orthocenterElement = document.getElementById('orthocenter-coords');
    if (orthocenterElement) {
        orthocenterElement.title = 'HO: Orthocenter coordinates';
    }
});

