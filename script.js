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
        this.initializeAnimationControls();
        
        // Draw initial state
        this.drawSystem();
        this.updateDashboard();
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

        // Centers Panel
        const centroid = {
            x: (this.system.n1.x + this.system.n2.x + this.system.n3.x) / 3,
            y: (this.system.n1.y + this.system.n2.y + this.system.n3.y) / 3
        };
        
        setElementValue('#centroid-coords', 
            `${centroid.x.toFixed(1)}, ${centroid.y.toFixed(1)}`);
        
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
        console.log('Initializing manual controls');
        
        // Get all manual input fields
        const manualInputs = document.querySelectorAll('.manual-input');
        
        manualInputs.forEach(input => {
            // Ensure the field is editable
            input.readOnly = false;
            
            // When field is clicked, move cursor to end
            input.addEventListener('click', function(e) {
                this.readOnly = false;  // Ensure it's editable
                // Move cursor to end of input
                this.setSelectionRange(this.value.length, this.value.length);
            });

            // Also handle focus via tab key
            input.addEventListener('focus', function(e) {
                this.readOnly = false;  // Ensure it's editable
                this.setSelectionRange(this.value.length, this.value.length);
            });
        });

        // Get the apply button
        const applyButton = document.getElementById('apply-manual');
        if (!applyButton) {
            console.error('Apply button not found');
            return;
        }

        // Add click event listener to the apply button
        applyButton.addEventListener('click', () => {
            console.log('Apply button clicked');
            const nc1 = document.getElementById('manual-nc1').value;
            const nc2 = document.getElementById('manual-nc2').value;
            const nc3 = document.getElementById('manual-nc3').value;
            console.log('Current input values:', { nc1, nc2, nc3 });
            this.handleManualUpdate();
        });
    }

    updateManualFields() {
        // Update edge length fields with current values
        const manualInputs = {
            'manual-nc1': this.calculateDistance(this.system.n1, this.system.n3),
            'manual-nc2': this.calculateDistance(this.system.n1, this.system.n2),
            'manual-nc3': this.calculateDistance(this.system.n2, this.system.n3)
        };

        // Update each field while preserving editability
        Object.entries(manualInputs).forEach(([id, value]) => {
            const input = document.getElementById(id);
            if (input && !input.matches(':focus')) {  // Only update if not being edited
                input.value = value.toFixed(2);
                input.readOnly = false;  // Ensure it remains editable
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
        
        // Get animation input fields
        const animationInputs = document.querySelectorAll('.animation-input');
        console.log('Found animation inputs:', animationInputs.length);
        
        // Initialize each input field
        animationInputs.forEach((input, index) => {
            console.log(`Initializing animation input ${index}:`, input.id);
            
            // Set initial values from current triangle state
            if (this.system && this.system.n1) {
                let value;
                if (index === 0) {
                    value = this.calculateDistance(this.system.n1, this.system.n3);
                } else if (index === 1) {
                    value = this.calculateDistance(this.system.n1, this.system.n2);
                } else if (index === 2) {
                    value = this.calculateDistance(this.system.n2, this.system.n3);
                }
                
                // Set the value and ensure the input is editable
                input.value = value.toFixed(2);
                input.removeAttribute('readonly');
                input.removeAttribute('disabled');
            }
            
            // Add input handler
            input.addEventListener('input', (e) => {
                console.log('Input value changed:', e.target.id, e.target.value);
            });
        });

        // Get and initialize the animate button
        const animateButton = document.getElementById('animate-button');
        if (animateButton) {
            animateButton.addEventListener('click', () => {
                console.log('Animate button clicked');
                this.startAnimation();
            });
        } else {
            console.error('Animate button not found');
        }
    }

    startAnimation() {
        console.log('Starting animation');
        
        // Get end state values from input fields
        const nc1End = parseFloat(document.getElementById('animation-nc1').value);
        const nc2End = parseFloat(document.getElementById('animation-nc2').value);
        const nc3End = parseFloat(document.getElementById('animation-nc3').value);

        console.log('End state values:', { nc1End, nc2End, nc3End });

        // Get current edge lengths as start values
        const startState = {
            nc1: this.calculateDistance(this.system.n1, this.system.n2),
            nc2: this.calculateDistance(this.system.n1, this.system.n3),
            nc3: this.calculateDistance(this.system.n2, this.system.n3)
        };

        console.log('Start state:', startState);
        console.log('End state:', { nc1: nc1End, nc2: nc2End, nc3: nc3End });

        // Store animation parameters
        this.animationStartState = startState;
        this.animationEndState = { nc1: nc1End, nc2: nc2End, nc3: nc3End };
        this.animationStartTime = performance.now();
        this.animationDuration = 2000; // 2 seconds
        this.isAnimating = true;

        // Start animation loop
        requestAnimationFrame(this.animate.bind(this));
    }

    animate(currentTime) {
        if (!this.isAnimating) return;

        const elapsed = currentTime - this.animationStartTime;
        const progress = Math.min(elapsed / this.animationDuration, 1);

        console.log('Animation progress:', progress);

        // Calculate current values using linear interpolation
        const currentNC1 = this.lerp(this.animationStartState.nc1, this.animationEndState.nc1, progress);
        const currentNC2 = this.lerp(this.animationStartState.nc2, this.animationEndState.nc2, progress);
        const currentNC3 = this.lerp(this.animationStartState.nc3, this.animationEndState.nc3, progress);

        console.log('Current values:', { currentNC1, currentNC2, currentNC3 });

        // Update triangle with current values
        this.adjustEdgeLength('nc1', currentNC1, true);
        this.adjustEdgeLength('nc2', currentNC2, true);
        this.adjustEdgeLength('nc3', currentNC3, true);

        // Draw updated state
        this.drawSystem();
        this.updateDashboard();

        // Continue animation if not complete
        if (progress < 1) {
            requestAnimationFrame(this.animate.bind(this));
        } else {
            this.isAnimating = false;
            console.log('Animation complete');
        }
    }

    lerp(start, end, progress) {
        return start + (end - start) * progress;
    }

    adjustEdgeLength(edge, newLength, suppressAlert = false) {
        let nodeA, nodeB;
        
        switch(edge) {
            case 'nc1':
                nodeA = this.system.n1;
                nodeB = this.system.n2;
                break;
            case 'nc2':
                nodeA = this.system.n1;
                nodeB = this.system.n3;
                break;
            case 'nc3':
                nodeA = this.system.n2;
                nodeB = this.system.n3;
                break;
            default:
                return;
        }

        const currentLength = this.calculateDistance(nodeA, nodeB);
        const scaleFactor = newLength / currentLength;

        // Calculate midpoint
        const midpoint = {
            x: (nodeA.x + nodeB.x) / 2,
            y: (nodeA.y + nodeB.y) / 2
        };

        // Scale points from midpoint
        nodeA.x = midpoint.x + (nodeA.x - midpoint.x) * scaleFactor;
        nodeA.y = midpoint.y + (nodeA.y - midpoint.y) * scaleFactor;
        nodeB.x = midpoint.x + (nodeB.x - midpoint.x) * scaleFactor;
        nodeB.y = midpoint.y + (nodeB.y - midpoint.y) * scaleFactor;

        // Ensure base nodes stay at BASE_Y
        if (edge === 'nc3') {
            nodeA.y = this.BASE_Y;
            nodeB.y = this.BASE_Y;
        }
    }
}

function checkInputFields() {
    // If this exists, modify it to exclude manual inputs
    const inputFields = document.querySelectorAll('input[type="text"]:not(.manual-input)');
    inputFields.forEach(field => {
        field.readOnly = true;
    });
}

// Initialization once the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.querySelector('#canvas');
    if (canvas) {
        window.triangleSystem = new TriangleSystem(canvas);
        checkInputFields();
    } else {
        console.error("Canvas element not found");
    }
});

