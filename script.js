class TriangleSystem {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        
        // Set up canvas dimensions
        this.canvas.width = canvas.clientWidth;
        this.canvas.height = canvas.clientHeight;
        
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

        // Initialize with default triangle first
        this.initializeSystem('equilateral');
        
        // Then initialize controls
        this.initializeEventListeners();
        this.initializeManualControls();
        this.initializeAnimationControls();  // Add this line
        
        // Draw initial state
        this.drawSystem();
        this.updateDashboard();
        this.updateAnimationEndFields();  // Add this
        
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
        this.showOrthocircle = false; // For Orthocircle
        this.showCircumcircle = false; // For Circumcircle

        // Bind methods to this instance
        this.drawSystem = this.drawSystem.bind(this);
        this.drawNinePointCircle = this.drawNinePointCircle.bind(this);
        this.calculateNinePointCircle = this.calculateNinePointCircle.bind(this);
        this.calculateCircumcenter = this.calculateCircumcenter.bind(this);
        this.calculateOrthocenter = this.calculateOrthocenter.bind(this);
        this.updateDashboard = this.updateDashboard.bind(this);
        this.drawOrthocircle = this.drawOrthocircle.bind(this);
        this.calculateOrthocircle = this.calculateOrthocircle.bind(this);
        this.calculateAltitudeFoot = this.calculateAltitudeFoot.bind(this);
        this.calculateCircumcircle = this.calculateCircumcircle.bind(this);
        this.drawCircumcircle = this.drawCircumcircle.bind(this);
    }

    // Method to initialize all event listeners
    initializeEventListeners() {
        // Feature Toggle Buttons
        const featureButtons = [
            { id: 'toggleCentroid', property: 'showCentroid' },
            { id: 'toggleIncenter', property: 'showIncenter' },
            { id: 'toggleMidpoints', property: 'showMidpoints' },
            { id: 'toggleTangents', property: 'showTangents' },
            { id: 'toggleIncircle', property: 'showIncircle' },
            { id: 'toggleMedians', property: 'showMedians' },
            { id: 'toggleSubsystems', property: 'showSubsystems' },
            { id: 'toggleEuler', property: 'showSpecialCenters' },
            { id: 'toggleNinePointCircle', property: 'showNinePointCircle' },
            { id: 'toggleOrthocircle', property: 'showOrthocircle' },
            { id: 'toggleCircumcircle', property: 'showCircumcircle' }
        ];

        featureButtons.forEach(button => {
            const element = document.getElementById(button.id);
            if (element) {
                element.addEventListener('click', () => {
                    this[button.property] = !this[button.property];
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
                n2: { x: n2x, y: n2y },          // Right vertex (35°)
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
        const d = 2 * (n1.x * (n2.y - n3.y) + n2.x * (n3.y - n1.y) + n3.x * (n1.y - n2.y));
        
        if (Math.abs(d) > 1e-10) {
            this.system.circumcenter = {
                x: ((n1.x * n1.x + n1.y * n1.y) * (n2.y - n3.y) +
                    (n2.x * n2.x + n2.y * n2.y) * (n3.y - n1.y) +
                    (n3.x * n3.x + n3.y * n3.y) * (n1.y - n2.y)) / d,
                y: ((n1.x * n1.x + n1.y * n1.y) * (n3.x - n2.x) +
                    (n2.x * n2.x + n2.y * n2.y) * (n1.x - n3.x) +
                    (n3.x * n3.x + n3.y * n3.y) * (n2.x - n1.x)) / d
            };
        } else {
            // Handle degenerate case
            this.system.circumcenter = { x: 0, y: 0 };
        }

        // Calculate orthocenter
        this.calculateOrthocenter();
        
        // Calculate nine-point center
        this.calculateNinePointCenter();
    }

    calculateOrthocenter() {
        const { n1, n2, n3 } = this.system;
        
        // Calculate slopes of sides
        const slopeBC = (n3.y - n2.y) / (n3.x - n2.x);
        const slopeAC = (n3.y - n1.y) / (n3.x - n1.x);
        const slopeAB = (n2.y - n1.y) / (n2.x - n1.x);

        // Calculate perpendicular slopes from vertices to opposite sides
        const perpSlopeA = slopeBC !== 0 ? -1 / slopeBC : Infinity;
        const perpSlopeB = slopeAC !== 0 ? -1 / slopeAC : Infinity;

        // Calculate intersection point (orthocenter)
        let x, y;

        // Handle special cases for vertical/horizontal lines
        if (!isFinite(perpSlopeA) || !isFinite(perpSlopeB)) {
            // Handle vertical lines case
            if (!isFinite(perpSlopeA)) {
                x = n1.x;
                y = perpSlopeB * (x - n2.x) + n2.y;
            } else {
                x = n2.x;
                y = perpSlopeA * (x - n1.x) + n1.y;
            }
        } else {
            // Calculate intersection of altitude lines
            x = (n2.y - n1.y + perpSlopeA * n1.x - perpSlopeB * n2.x) / (perpSlopeA - perpSlopeB);
            y = perpSlopeA * (x - n1.x) + n1.y;
        }

        // Store orthocenter in system
        this.system.orthocenter = { x, y };
        
        return { x, y };
    }

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

    calculateCircumcenter() {
        const { n1, n2, n3 } = this.system;
        
        // Calculate perpendicular bisector parameters
        const d = 2 * (n1.x * (n2.y - n3.y) + n2.x * (n3.y - n1.y) + n3.x * (n1.y - n2.y));
        
        // Calculate circumcenter coordinates
        const x = ((n1.x * n1.x + n1.y * n1.y) * (n2.y - n3.y) + 
                  (n2.x * n2.x + n2.y * n2.y) * (n3.y - n1.y) + 
                  (n3.x * n3.x + n3.y * n3.y) * (n1.y - n2.y)) / d;
                  
        const y = ((n1.x * n1.x + n1.y * n1.y) * (n3.x - n2.x) + 
                  (n2.x * n2.x + n2.y * n2.y) * (n1.x - n3.x) + 
                  (n3.x * n3.x + n3.y * n3.y) * (n2.x - n1.x)) / d;
                  
        return { x, y };
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
        // Helper function to set element value and handle missing elements
        const setElementValue = (selector, value, precision = 2) => {
            const element = document.querySelector(selector);
            if (element) {
                element.value = typeof value === 'number' ? value.toFixed(precision) : value;
            }
        };

        // System Panel
        const area = this.calculateArea();
        const perimeter = this.calculatePerimeter();
        setElementValue('#system-perimeter', perimeter);
        setElementValue('#system-area', area);
        setElementValue('#subsystems-area', area / 3); // Each subsystem has equal area

        // Nodes Panel
        const angles = this.calculateAngles();
        setElementValue('#node-n1-angle', angles.n1);
        setElementValue('#node-n2-angle', angles.n2);
        setElementValue('#node-n3-angle', angles.n3);

        // Channels (Edges) Panel
        const lengths = this.calculateLengths();
        setElementValue('#edge-nc1', lengths.l1); // NC1 (Red): N1 to N3
        setElementValue('#edge-nc2', lengths.l2); // NC2 (Blue): N1 to N2
        setElementValue('#edge-nc3', lengths.l3); // NC3 (Green): N2 to N3

        // Medians Panel
        const medians = this.calculateMedians();
        setElementValue('#median-n1', medians.n1);
        setElementValue('#median-n2', medians.n2);
        setElementValue('#median-n3', medians.n3);

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
            
            const iToIcDistance = this.calculateDistance(
                { x: 0, y: 0 }, // Intelligence point is at origin
                this.system.incenter
            );
            setElementValue('#i-to-ic-distance', iToIcDistance);
            
            // Update Information Panel distances and ratios
            setElementValue('#d-i-ic', iToIcDistance);
            setElementValue('#r-i-ic', iToIcDistance / perimeter);
        }

        // Update subsystem metrics
        const subsystemAngles = this.calculateSubsystemAngles();
        const subsystemPerimeters = this.calculateSubsystemPerimeters();
        
        for (let i = 1; i <= 3; i++) {
            setElementValue(`#subsystem-${i}-angle`, subsystemAngles[i-1]);
            setElementValue(`#subsystem-${i}-perimeter`, subsystemPerimeters[i-1]);
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
            n3: this.calculateDistance(midpoints.m1, tangentPoints[1])  // For NC1 (Red)
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
        this.updateAnimationEndFields();  // Make sure this line is here

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
        // Clear canvas
        this.ctx.clearRect(-this.canvas.width/2, -this.canvas.height/2, this.canvas.width, this.canvas.height);
        
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
        if (this.showIncenter) this.drawIncenterPoint(this.ctx);  // New separate method for incenter
        if (this.showTangents) this.drawTangents(this.ctx);
        if (this.showCentroid) this.drawCentroid(this.ctx);
        
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

        // Draw special centers and Euler line
        if (this.showSpecialCenters) {
            // Draw Euler line first (so it appears behind the points)
            if (this.system.circumcenter && this.system.orthocenter) {
                this.ctx.strokeStyle = 'rgba(255, 105, 180, 0.5)'; // Pink with 0.5 opacity
                this.ctx.setLineDash([5, 5]);  // Match other dotted lines
                this.ctx.lineWidth = 1;  // Match other lines
                
                this.ctx.beginPath();
                this.ctx.moveTo(this.system.circumcenter.x, this.system.circumcenter.y);
                this.ctx.lineTo(this.system.orthocenter.x, this.system.orthocenter.y);
                this.ctx.stroke();
                
                // Reset line style
                this.ctx.setLineDash([]);
            }

            // Draw Circumcenter (O)
            if (this.system.circumcenter) {
                this.ctx.beginPath();
                this.ctx.arc(this.system.circumcenter.x, this.system.circumcenter.y, 
                            4, 0, 2 * Math.PI);
                this.ctx.fillStyle = '#FF69B4';
                this.ctx.fill();
                
                // Label O
                this.ctx.save();
                this.ctx.scale(1, -1);
                this.ctx.fillStyle = '#fff';
                this.ctx.font = '12px Arial';
                this.ctx.fillText('O', 
                    this.system.circumcenter.x + 10, 
                    -this.system.circumcenter.y);
                this.ctx.restore();
            }

            // Draw Orthocenter (H)
            if (this.system.orthocenter) {
                this.ctx.beginPath();
                this.ctx.arc(this.system.orthocenter.x, this.system.orthocenter.y, 
                            4, 0, 2 * Math.PI);
                this.ctx.fillStyle = '#FF69B4';
                this.ctx.fill();
                
                // Label H
                this.ctx.save();
                this.ctx.scale(1, -1);
                this.ctx.fillStyle = '#fff';
                this.ctx.font = '12px Arial';
                this.ctx.fillText('H', 
                    this.system.orthocenter.x + 10, 
                    -this.system.orthocenter.y);
                this.ctx.restore();
            }

            // Draw Nine-Point Center (N)
            if (this.system.ninePointCenter) {
                this.ctx.beginPath();
                this.ctx.arc(this.system.ninePointCenter.x, this.system.ninePointCenter.y, 
                            4, 0, 2 * Math.PI);
                this.ctx.fillStyle = '#FF69B4';
                this.ctx.fill();
                
                // Label N
                this.ctx.save();
                this.ctx.scale(1, -1);
                this.ctx.fillStyle = '#fff';
                this.ctx.font = '12px Arial';
                this.ctx.fillText('N', 
                    this.system.ninePointCenter.x + 10, 
                    -this.system.ninePointCenter.y);
                this.ctx.restore();
            }
        }

        // Draw Nine-Point Circle
        if (this.showNinePointCircle) {
            this.drawNinePointCircle(this.ctx);
        }

        // Draw Orthocircle
        if (this.showOrthocircle) {
            this.drawOrthocircle(this.ctx);
        }

        // Draw Circumcircle
        if (this.showCircumcircle) {
            this.drawCircumcircle(this.ctx);
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
        ctx.beginPath();
        ctx.arc(this.system.incenter.x, this.system.incenter.y, this.system.incircleRadius, 0, 2 * Math.PI);
        ctx.stroke();
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
        const centroidX = (this.system.n1.x + this.system.n2.x + this.system.n3.x) / 3;
        const centroidY = (this.system.n1.y + this.system.n2.y + this.system.n3.y) / 3;

        // Changed color from orange to white
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(centroidX, centroidY, 6, 0, 2 * Math.PI);
        ctx.fill();

        // Label remains white and changed from 'Centroid' to 'I'
        ctx.fillStyle = 'white';
        ctx.font = '12px Arial';
        ctx.save();
        ctx.scale(1, -1);
        ctx.fillText('I', centroidX + 10, -centroidY);  // Changed label text
        ctx.restore();
    }

    /**
     * Draws the subsystems of the triangle.
     * @param {CanvasRenderingContext2D} ctx 
     */
    drawSubsystems(ctx) {
        const { n1, n2, n3 } = this.system;
        const centroid = {
            x: (n1.x + n2.x + n3.x) / 3,
            y: (n1.y + n2.y + n3.y) / 3
        };

        // Draw SS1 (Red, Left Subsystem: N1-N3-I)
        ctx.fillStyle = 'rgba(255, 0, 0, 0.2)';
        ctx.beginPath();
        ctx.moveTo(n1.x, n1.y);
        ctx.lineTo(n3.x, n3.y);
        ctx.lineTo(centroid.x, centroid.y);
        ctx.closePath();
        ctx.fill();

        // Draw SS2 (Blue, Right Subsystem: N1-N2-I)
        ctx.fillStyle = 'rgba(0, 0, 255, 0.2)';
        ctx.beginPath();
        ctx.moveTo(n1.x, n1.y);
        ctx.lineTo(n2.x, n2.y);
        ctx.lineTo(centroid.x, centroid.y);
        ctx.closePath();
        ctx.fill();

        // Draw SS3 (Green, Base Subsystem: N2-N3-I)
        ctx.fillStyle = 'rgba(0, 255, 0, 0.2)';
        ctx.beginPath();
        ctx.moveTo(n2.x, n2.y);
        ctx.lineTo(n3.x, n3.y);
        ctx.lineTo(centroid.x, centroid.y);
        ctx.closePath();
        ctx.fill();
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
        return Math.abs(
            (n1.x * (n2.y - n3.y) +
                n2.x * (n3.y - n1.y) +
                n3.x * (n1.y - n2.y)) / 2
        );
    }

    calculateLengths() {
        const { n1, n2, n3 } = this.system;
        return {
            l1: this.calculateDistance(n1, n3),  // NC1 (Red)
            l2: this.calculateDistance(n1, n2),  // NC2 (Blue)
            l3: this.calculateDistance(n2, n3)   // NC3 (Green)
        };
    }

    calculateMedians() {
        const { n1, n2, n3 } = this.system;
        const midpoints = this.calculateMidpoints();
        
        return {
            n1: this.calculateDistance(n1, midpoints.m3),  // N1 to midpoint of base (N2-N3)
            n2: this.calculateDistance(n2, midpoints.m1),  // N2 to midpoint of left side (N1-N3)
            n3: this.calculateDistance(n3, midpoints.m2)   // N3 to midpoint of right side (N1-N2)
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

    calculateDistance(p1, p2) {
        const dx = p1.x - p2.x;
        const dy = p1.y - p2.y;
        return Math.sqrt(dx * dx + dy * dy);
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
        
        // Update derived points after centering
        this.updateDerivedPoints();
        this.drawSystem();
        this.updateDashboard();
        this.updateAnimationFields();  // Add this
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
    drawIncenterPoint(ctx) {
        if (!this.system.incenter) return;
        
        // Match incircle color
        ctx.fillStyle = 'cyan';
        ctx.beginPath();
        ctx.arc(this.system.incenter.x, this.system.incenter.y, 6, 0, 2 * Math.PI);
        ctx.fill();

        // Add label
        ctx.fillStyle = 'white';
        ctx.font = '12px Arial';
        ctx.save();
        ctx.scale(1, -1);
        ctx.fillText('IC', this.system.incenter.x + 10, -this.system.incenter.y);
        ctx.restore();
    }

    initializeManualControls() {
        // Get references to manual input fields
        const nc1Input = document.getElementById('manual-nc1');
        const nc2Input = document.getElementById('manual-nc2');
        const nc3Input = document.getElementById('manual-nc3');
        const applyButton = document.getElementById('apply-manual');

        // Ensure fields are editable
        [nc1Input, nc2Input, nc3Input].forEach(input => {
            if (input) {
                input.readOnly = false;
            }
        });

        const updateTriangle = () => {
            const nc1 = parseFloat(nc1Input.value);
            const nc2 = parseFloat(nc2Input.value);
            const nc3 = parseFloat(nc3Input.value);
            
            if (!isNaN(nc1) && !isNaN(nc2) && !isNaN(nc3)) {
                this.updateTriangleFromEdges(nc1, nc2, nc3);
            }
        };

        // Add click listener to Apply button
        if (applyButton) {
            applyButton.addEventListener('click', updateTriangle);
        }

        // Add keypress listeners to each input
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
        console.log('Handling manual update');
        // Get values from manual input fields
        const nc1 = parseFloat(document.getElementById('manual-nc1').value);
        const nc2 = parseFloat(document.getElementById('manual-nc2').value);
        const nc3 = parseFloat(document.getElementById('manual-nc3').value);

        console.log('Manual input values:', { nc1, nc2, nc3 });

        // Validate inputs are numbers
        if (isNaN(nc1) || isNaN(nc2) || isNaN(nc3)) {
            alert('Please enter valid numbers for all edges');
            return;
        }

        // Validate positive numbers
        if (nc1 <= 0 || nc2 <= 0 || nc3 <= 0) {
            alert('Edge lengths must be positive numbers');
            return;
        }

        // Check triangle inequality
        if (!this.validateTriangleInequality(nc1, nc2, nc3)) {
            alert('The sum of any two sides must be greater than the third side');
            return;
        }

        // Update triangle with new edge lengths
        this.updateTriangleFromEdges(nc1, nc2, nc3);
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
        this.updateDerivedPoints();  // Add this line to update all features

        // Update rendering and dashboard
        this.drawSystem();
        this.updateDashboard();
        this.updateAnimationFields();  // Add this
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

    initializeAnimationControls() {
        console.log('Initializing animation controls');
        
        // Make animation end fields editable and set initial values
        ['animation-nc1-end', 'animation-nc2-end', 'animation-nc3-end'].forEach(id => {
            const input = document.getElementById(id);
            if (input) {
                input.readOnly = false;  // Make editable
                
                // Set initial values based on current triangle state
                const nc = id.includes('nc1') ? this.calculateDistance(this.system.n1, this.system.n3) :
                          id.includes('nc2') ? this.calculateDistance(this.system.n1, this.system.n2) :
                          this.calculateDistance(this.system.n2, this.system.n3);
                
                input.value = nc.toFixed(2);  // Display with 2 decimal places
                console.log(`Initialized ${id} with value ${input.value}`);
            } else {
                console.error(`Animation input field ${id} not found`);
            }
        });

        // Set up animate button
        const animateButton = document.getElementById('animate-button');
        if (animateButton) {
            animateButton.addEventListener('click', () => {
                console.log('Animate button clicked');
                this.startAnimation();
            });
            console.log('Animate button listener added');
        }
    }

    startAnimation() {
        console.log('Starting animation');
        
        // Check for input fields existence first
        const nc1Input = document.getElementById('animation-nc1-end');
        const nc2Input = document.getElementById('animation-nc2-end');
        const nc3Input = document.getElementById('animation-nc3-end');

        if (!nc1Input || !nc2Input || !nc3Input) {
            console.error('Missing animation input fields');
            return;
        }

        // Get current state
        const currentState = {
            nc1: this.calculateDistance(this.system.n1, this.system.n3),  // NC1 maps to red edge (N1-N3)
            nc2: this.calculateDistance(this.system.n1, this.system.n2),  // NC2 maps to blue edge (N1-N2)
            nc3: this.calculateDistance(this.system.n2, this.system.n3)   // NC3 maps to green edge (N2-N3)
        };

        // If we're already animating, use the stored end state
        if (this.isAnimating) {
            this.animationStartState = currentState;
            this.animationStartTime = performance.now();
            requestAnimationFrame(this.animate.bind(this));
            return;
        }

        // Get end state values from input fields
        const endState = {
            nc1: parseFloat(nc1Input.value) || currentState.nc1,
            nc2: parseFloat(nc2Input.value) || currentState.nc2,
            nc3: parseFloat(nc3Input.value) || currentState.nc3
        };

        console.log('Animation states:', {
            start: currentState,
            end: endState
        });

        // Store the states
        this.animationStartState = currentState;
        this.animationEndState = endState;
        this.animationStartTime = performance.now();
        this.animationDuration = 2000;
        this.isAnimating = true;

        requestAnimationFrame(this.animate.bind(this));
    }

    animate(currentTime) {
        if (!this.isAnimating) return;

        const progress = (currentTime - this.animationStartTime) / this.animationDuration;

        if (progress >= 1) {
            this.isAnimating = false;
            // Update triangle with final values
            this.updateTriangleFromEdges(
                this.animationEndState.nc1,
                this.animationEndState.nc2,
                this.animationEndState.nc3
            );
            return;
        }

        // Calculate current values
        const currentNC1 = this.animationStartState.nc1 + (this.animationEndState.nc1 - this.animationStartState.nc1) * progress;
        const currentNC2 = this.animationStartState.nc2 + (this.animationEndState.nc2 - this.animationStartState.nc2) * progress;
        const currentNC3 = this.animationStartState.nc3 + (this.animationEndState.nc3 - this.animationStartState.nc3) * progress;

        // Update triangle with current values
        this.updateTriangleFromEdges(currentNC1, currentNC2, currentNC3);
        requestAnimationFrame(this.animate.bind(this));
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
        console.log('Saving current configuration');
        
        // Get current triangle configuration
        const config = {
            n1: { x: this.system.n1.x, y: this.system.n1.y },
            n2: { x: this.system.n2.x, y: this.system.n2.y },
            n3: { x: this.system.n3.x, y: this.system.n3.y }
        };

        // Prompt for preset name
        const name = prompt('Enter a name for this preset:');
        
        if (name) {
            // Save to user presets
            this.userPresets[name] = config;
            localStorage.setItem('userPresets', JSON.stringify(this.userPresets));
            console.log('Saved preset:', name);
            
            // Update dropdown
            this.initializeUserPresets();
        }
    }

    checkInputFields() {
        const inputFields = document.querySelectorAll('input[type="text"]:not(.manual-input):not([readonly="false"])');
        inputFields.forEach(field => {
            field.readOnly = true;
        });
    }

    saveCurrentAnimation() {
        console.log('Saving current animation');
        
        // Get current triangle configuration for start state
        const startConfig = {
            n1: { x: this.system.n1.x, y: this.system.n1.y },
            n2: { x: this.system.n2.x, y: this.system.n2.y },
            n3: { x: this.system.n3.x, y: this.system.n3.y }
        };

        // Get end state from animation inputs
        const nc1Input = document.getElementById('animation-nc1-end');
        const nc2Input = document.getElementById('animation-nc2-end');
        const nc3Input = document.getElementById('animation-nc3-end');

        if (!nc1Input || !nc2Input || !nc3Input) {
            console.error('Missing animation input fields');
            return;
        }

        const endState = {
            nc1: parseFloat(nc1Input.value),
            nc2: parseFloat(nc2Input.value),
            nc3: parseFloat(nc3Input.value)
        };

        // Validate inputs
        if (isNaN(endState.nc1) || isNaN(endState.nc2) || isNaN(endState.nc3)) {
            alert('Please enter valid numbers for all edge lengths');
            return;
        }

        // Prompt for animation name
        const name = prompt('Enter a name for this animation:');
        
        if (name) {
            // Save both states
            this.userAnimations[name] = {
                startConfig,
                endState
            };
            localStorage.setItem('userAnimations', JSON.stringify(this.userAnimations));
            console.log('Saved animation:', name);
            
            // Update dropdown if it exists
            this.initializeUserAnimations();
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

    // Add method to draw nine-point circle
    drawNinePointCircle(ctx) {
        if (!this.showNinePointCircle) return;
        
        const ninePointCircle = this.calculateNinePointCircle();
        
        // Draw the circle
        ctx.strokeStyle = '#FF69B4';  // Hot pink
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
        ctx.fillStyle = '#FF69B4';
        ctx.beginPath();
        ctx.arc(ninePointCircle.center.x, ninePointCircle.center.y, 4, 0, 2 * Math.PI);
        ctx.fill();

        // Add label 'N'
        ctx.fillStyle = '#FF69B4';
        ctx.font = '12px Arial';
        ctx.save();
        ctx.scale(1, -1);  // Flip text right-side up
        ctx.fillText('N', ninePointCircle.center.x + 10, -ninePointCircle.center.y);
        ctx.restore();
    }

    // Add method to calculate orthocircle
    calculateOrthocircle() {
        const { n1, n2, n3 } = this.system;
        
        // Calculate orthocenter
        const orthocenter = this.calculateOrthocenter();
        
        // Calculate feet of altitudes
        const foot1 = this.calculateAltitudeFoot(n1, n2, n3);
        const foot2 = this.calculateAltitudeFoot(n2, n3, n1);
        const foot3 = this.calculateAltitudeFoot(n3, n1, n2);
        
        // Calculate circumcenter of the triangle formed by the feet
        const d = 2 * (foot1.x * (foot2.y - foot3.y) + 
                       foot2.x * (foot3.y - foot1.y) + 
                       foot3.x * (foot1.y - foot2.y));
        
        const orthocircleCenter = {
            x: ((foot1.x * foot1.x + foot1.y * foot1.y) * (foot2.y - foot3.y) +
                (foot2.x * foot2.x + foot2.y * foot2.y) * (foot3.y - foot1.y) +
                (foot3.x * foot3.x + foot3.y * foot3.y) * (foot1.y - foot2.y)) / d,
            y: ((foot1.x * foot1.x + foot1.y * foot1.y) * (foot3.x - foot2.x) +
                (foot2.x * foot2.x + foot2.y * foot2.y) * (foot1.x - foot3.x) +
                (foot3.x * foot3.x + foot3.y * foot3.y) * (foot2.x - foot1.x)) / d
        };
        
        // Calculate radius (distance from center to any foot)
        const orthocircleRadius = this.calculateDistance(orthocircleCenter, foot1);
        
        return {
            center: orthocircleCenter,
            radius: orthocircleRadius,
            feet: { foot1, foot2, foot3 }
        };
    }

    // Helper method to calculate foot of altitude
    calculateAltitudeFoot(vertex, p1, p2) {
        // Calculate slope of base line (p1p2)
        const baseSlope = (p2.y - p1.y) / (p2.x - p1.x);
        
        // Handle vertical base line
        if (!isFinite(baseSlope)) {
            return {
                x: p1.x,
                y: vertex.y
            };
        }
        
        // Calculate perpendicular slope
        const perpSlope = -1 / baseSlope;
        
        // Handle horizontal base line
        if (!isFinite(perpSlope)) {
            return {
                x: vertex.x,
                y: p1.y
            };
        }
        
        // Calculate intersection
        const x = (p1.y - vertex.y + perpSlope * vertex.x - baseSlope * p1.x) / (perpSlope - baseSlope);
        const y = perpSlope * (x - vertex.x) + vertex.y;
        
        return { x, y };
    }

    // Add method to draw orthocircle
    drawOrthocircle(ctx) {
        if (!this.showOrthocircle) return;
        
        const orthocircle = this.calculateOrthocircle();
        
        // Draw the circle
        ctx.strokeStyle = '#00FF00';  // Bright neon green
        ctx.setLineDash([5, 5]);  // Dashed line
        ctx.beginPath();
        ctx.arc(
            orthocircle.center.x,
            orthocircle.center.y,
            orthocircle.radius,
            0,
            2 * Math.PI
        );
        ctx.stroke();
        ctx.setLineDash([]);  // Reset dash pattern
        
        // Draw the feet of altitudes
        ctx.fillStyle = '#00FF00';
        Object.values(orthocircle.feet).forEach(foot => {
            ctx.beginPath();
            ctx.arc(foot.x, foot.y, 3, 0, 2 * Math.PI);
            ctx.fill();
        });
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
        
        // Draw the circle
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
        
        // Draw the center point
        ctx.fillStyle = '#00FF00';
        ctx.beginPath();
        ctx.arc(circumcircle.center.x, circumcircle.center.y, 4, 0, 2 * Math.PI);
        ctx.fill();

        // Add label 'O'
        ctx.fillStyle = '#00FF00';
        ctx.font = '12px Arial';
        ctx.save();
        ctx.scale(1, -1);  // Flip text right-side up
        ctx.fillText('O', circumcircle.center.x + 10, -circumcircle.center.y);
        ctx.restore();
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
        
        // Calculate perpendicular bisector parameters
        const d = 2 * (n1.x * (n2.y - n3.y) + n2.x * (n3.y - n1.y) + n3.x * (n1.y - n2.y));
        
        // Calculate circumcenter coordinates
        const x = ((n1.x * n1.x + n1.y * n1.y) * (n2.y - n3.y) + 
                  (n2.x * n2.x + n2.y * n2.y) * (n3.y - n1.y) + 
                  (n3.x * n3.x + n3.y * n3.y) * (n1.y - n2.y)) / d;
                  
        const y = ((n1.x * n1.x + n1.y * n1.y) * (n3.x - n2.x) + 
                  (n2.x * n2.x + n2.y * n2.y) * (n1.x - n3.x) + 
                  (n3.x * n3.x + n3.y * n3.y) * (n2.x - n1.x)) / d;
                  
        return { x, y };
    }

    // Helper method to calculate orthocenter
    calculateOrthocenter() {
        const { n1, n2, n3 } = this.system;
        
        // Calculate angles
        const angles = this.calculateAngles();
        
        // Convert angles to radians
        const a1 = angles.n1 * Math.PI / 180;
        const a2 = angles.n2 * Math.PI / 180;
        const a3 = angles.n3 * Math.PI / 180;
        
        // Calculate orthocenter coordinates using trigonometric formulas
        const x = (n1.x * Math.tan(a1) + n2.x * Math.tan(a2) + n3.x * Math.tan(a3)) /
                 (Math.tan(a1) + Math.tan(a2) + Math.tan(a3));
                 
        const y = (n1.y * Math.tan(a1) + n2.y * Math.tan(a2) + n3.y * Math.tan(a3)) /
                 (Math.tan(a1) + Math.tan(a2) + Math.tan(a3));
                 
        return { x, y };
    }

    // Add method to draw nine-point circle
    drawNinePointCircle(ctx) {
        if (!this.showNinePointCircle) return;
        
        const ninePointCircle = this.calculateNinePointCircle();
        
        // Draw the circle
        ctx.strokeStyle = '#FF69B4';  // Hot pink
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
        ctx.fillStyle = '#FF69B4';
        ctx.beginPath();
        ctx.arc(ninePointCircle.center.x, ninePointCircle.center.y, 4, 0, 2 * Math.PI);
        ctx.fill();

        // Add label 'N'
        ctx.fillStyle = '#FF69B4';
        ctx.font = '12px Arial';
        ctx.save();
        ctx.scale(1, -1);  // Flip text right-side up
        ctx.fillText('N', ninePointCircle.center.x + 10, -ninePointCircle.center.y);
        ctx.restore();
    }

    // Add method to calculate circumcircle
    calculateCircumcircle() {
        const circumcenter = this.calculateCircumcenter();
        // Radius is distance from circumcenter to any vertex
        const radius = this.calculateDistance(circumcenter, this.system.n1);
        
        return {
            center: circumcenter,
            radius: radius
        };
    }

    // Add method to draw circumcircle
    drawCircumcircle(ctx) {
        if (!this.showCircumcircle) return;
        
        const circumcircle = this.calculateCircumcircle();
        
        // Draw the circle
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
        
        // Draw the center point
        ctx.fillStyle = '#00FF00';
        ctx.beginPath();
        ctx.arc(circumcircle.center.x, circumcircle.center.y, 4, 0, 2 * Math.PI);
        ctx.fill();

        // Add label 'O'
        ctx.fillStyle = '#00FF00';
        ctx.font = '12px Arial';
        ctx.save();
        ctx.scale(1, -1);  // Flip text right-side up
        ctx.fillText('O', circumcircle.center.x + 10, -circumcircle.center.y);
        ctx.restore();
    }

    // Add method to calculate orthocircle
    calculateOrthocircle() {
        const { n1, n2, n3 } = this.system;
        
        // Calculate orthocenter
        const orthocenter = this.calculateOrthocenter();
        
        // Calculate feet of altitudes
        const foot1 = this.calculateAltitudeFoot(n1, n2, n3);
        const foot2 = this.calculateAltitudeFoot(n2, n3, n1);
        const foot3 = this.calculateAltitudeFoot(n3, n1, n2);
        
        // Calculate circumcenter of the triangle formed by the feet
        const d = 2 * (foot1.x * (foot2.y - foot3.y) + 
                       foot2.x * (foot3.y - foot1.y) + 
                       foot3.x * (foot1.y - foot2.y));
        
        const orthocircleCenter = {
            x: ((foot1.x * foot1.x + foot1.y * foot1.y) * (foot2.y - foot3.y) +
                (foot2.x * foot2.x + foot2.y * foot2.y) * (foot3.y - foot1.y) +
                (foot3.x * foot3.x + foot3.y * foot3.y) * (foot1.y - foot2.y)) / d,
            y: ((foot1.x * foot1.x + foot1.y * foot1.y) * (foot3.x - foot2.x) +
                (foot2.x * foot2.x + foot2.y * foot2.y) * (foot1.x - foot3.x) +
                (foot3.x * foot3.x + foot3.y * foot3.y) * (foot2.x - foot1.x)) / d
        };
        
        // Calculate radius (distance from center to any foot)
        const orthocircleRadius = this.calculateDistance(orthocircleCenter, foot1);
        
        return {
            center: orthocircleCenter,
            radius: orthocircleRadius,
            feet: { foot1, foot2, foot3 }
        };
    }

    // Helper method to calculate foot of altitude
    calculateAltitudeFoot(vertex, p1, p2) {
        // Calculate slope of base line (p1p2)
        const baseSlope = (p2.y - p1.y) / (p2.x - p1.x);
        
        // Handle vertical base line
        if (!isFinite(baseSlope)) {
            return {
                x: p1.x,
                y: vertex.y
            };
        }
        
        // Calculate perpendicular slope
        const perpSlope = -1 / baseSlope;
        
        // Handle horizontal base line
        if (!isFinite(perpSlope)) {
            return {
                x: vertex.x,
                y: p1.y
            };
        }
        
        // Calculate intersection
        const x = (p1.y - vertex.y + perpSlope * vertex.x - baseSlope * p1.x) / (perpSlope - baseSlope);
        const y = perpSlope * (x - vertex.x) + vertex.y;
        
        return { x, y };
    }

    // Add method to draw orthocircle
    drawOrthocircle(ctx) {
        if (!this.showOrthocircle) return;
        
        const orthocircle = this.calculateOrthocircle();
        
        // Draw the circle
        ctx.strokeStyle = '#00FF00';  // Bright neon green
        ctx.setLineDash([5, 5]);  // Dashed line
        ctx.beginPath();
        ctx.arc(
            orthocircle.center.x,
            orthocircle.center.y,
            orthocircle.radius,
            0,
            2 * Math.PI
        );
        ctx.stroke();
        ctx.setLineDash([]);  // Reset dash pattern
        
        // Draw the feet of altitudes
        ctx.fillStyle = '#00FF00';
        Object.values(orthocircle.feet).forEach(foot => {
            ctx.beginPath();
            ctx.arc(foot.x, foot.y, 3, 0, 2 * Math.PI);
            ctx.fill();
        });
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
});

