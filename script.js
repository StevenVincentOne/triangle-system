function updateDerivedPoints() {
    const { n1, n2, n3 } = system;
    system.intelligence = {
        x: (n1.x + n2.x + n3.x) / 3,
        y: (n1.y + n2.y + n3.y) / 3,
    };
    system.midpoints = {
        m1: { x: (n2.x + n3.x) / 2, y: n2.y },
        m2: { x: (n1.x + n3.x) / 2, y: (n1.y + n3.y) / 2 },
        m3: { x: (n1.x + n2.x) / 2, y: (n1.y + n2.y) / 2 },
    };
    system.incenter = calculateIncenter();
    system.incircleRadius = calculateIncircleRadius();
    system.tangencyPoints = calculateIncircleTangencyPoints();
    system.subsystems = calculateSubsystems();
}

// Ensure calculateIncenter is defined before it's used
function calculateIncenter() {
    const a = calculateDistance(system.n2, system.n3);
    const b = calculateDistance(system.n1, system.n3);
    const c = calculateDistance(system.n1, system.n2);
    const perimeter = a + b + c;
    const x = (a * system.n1.x + b * system.n2.x + c * system.n3.x) / perimeter;
    const y = (a * system.n1.y + b * system.n2.y + c * system.n3.y) / perimeter;
    return { x, y };
}

function calculateIncircleRadius() {
    const area = calculateArea();
    const perimeter = calculatePerimeter();
    return (2 * area) / perimeter;
}

function calculateIncircleTangencyPoints() {
    const { n1, n2, n3, incenter } = system;

    function tangencyPoint(p1, p2) {
        const a = calculateDistance(p1, p2);
        const b = calculateDistance(incenter, p1);
        const c = calculateDistance(incenter, p2);
        const s = (a + b + c) / 2;
        const area = Math.sqrt(s * (s - a) * (s - b) * (s - c));
        const h = (2 * area) / a;

        const vx = p2.x - p1.x;
        const vy = p2.y - p1.y;
        const length = Math.sqrt(vx * vx + vy * vy);
        const ux = vx / length;
        const uy = vy / length;

        return {
            x: p1.x + ux * (a - h),
            y: p1.y + uy * (a - h)
        };
    }

    return [
        tangencyPoint(n2, n3),
        tangencyPoint(n1, n3),
        tangencyPoint(n1, n2)
    ];
}
