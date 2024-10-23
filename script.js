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

        this.initializeEventListeners();
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
        const side = 200;  // Base size for all presets

        if (preset === 'equilateral') {
            const height = side * Math.sin(60 * Math.PI/180);
            rawTriangle = {
                n1: { x: 0, y: height },
                n2: { x: side/2, y: 0 },
                n3: { x: -side/2, y: 0 }
            };
        }
        else if (preset === 'isosceles') {
            const height = side * Math.sin(70 * Math.PI/180);
            rawTriangle = {
                n1: { x: 0, y: height },
                n2: { x: side/2, y: 0 },
                n3: { x: -side/2, y: 0 }
            };
        }
        else if (preset === 'scalene') {
            rawTriangle = {
                n1: { x: 0, y: 200 },
                n2: { x: 150, y: 0 },
                n3: { x: -100, y: 0 }
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
            const height = side * Math.sin(75 * Math.PI/180);
            rawTriangle = {
                n1: { x: 0, y: height },
                n2: { x: side/2, y: 0 },
                n3: { x: -side/2, y: 0 }
            };
        }
        else if (preset === 'obtuse') {
            const height = side * Math.sin(45 * Math.PI/180);
            rawTriangle = {
                n1: { x: -100, y: height },
                n2: { x: side/2, y: 0 },
                n3: { x: -side/2, y: 0 }
            };
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
        
        // Set line style to match medians
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';  // Using white with 0.5 opacity
        ctx.setLineDash([5, 5]);
        ctx.lineWidth = 1;  // Ensure line width is thin
        
        // Draw lines from incenter to tangent points
        tangentPoints.forEach(point => {
            ctx.beginPath();
            ctx.moveTo(incenter.x, incenter.y);
            ctx.lineTo(point.x, point.y);
            ctx.stroke();
            
            // Draw tangent points
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
}

function checkInputFields() {
    const inputFields = document.querySelectorAll('input[type="text"]');
    inputFields.forEach(field => {
        const contentLength = field.value.length;
        const newSize = Math.max(contentLength, 6);
        if (field.size !== newSize || !field.readOnly) {
            console.warn(`Adjusting input field ${field.id}. Old Size: ${field.size}, New Size: ${newSize}, ReadOnly: ${field.readOnly}`);
            field.size = newSize;
            field.readOnly = true;
        }
    });
}

// Initialization once the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.querySelector('#canvas');
    if (canvas) {
        window.triangleSystem = new TriangleSystem(canvas);
        checkInputFields();

        window.triangleSystem.initializeSystem('equilateral');
    } else {
        console.error("Canvas element not found");
    }
});

