let page = document.createElement("canvas");
page.width = document.body.clientWidth;
page.height = document.body.clientHeight;
page.style = `position: absolute;
top: 0;
left: 0;
width: 100%;
height: 100%;
z-index: 1;
pointer-events: none;`

let drawer = document.createElement("div");
drawer.style = `position: absolute;
left: -126px;
width: 126px;
height: 190px;
z-index: 1;
background-image: url('/images/drawer.png');`

drawer.addEventListener("mousedown", e => {
    if (e.offsetY < (drawer.clientHeight/2)) {
        drawer.style.backgroundImage = "url('/images/drawer-pen.png')" 
        page.style.pointerEvents = "all";
    } else {
        drawer.style.backgroundImage = "url('/images/drawer-eraser.png')" 
        ctx.clearRect(0, 0, page.width, page.height);
    }
});

var drawerIsShown;
document.addEventListener("mousemove", e => {
    if (e.clientX > 0) return;
    if (drawerIsShown) return;
    drawerIsShown = true;
    drawer.style.backgroundImage = "url('/images/drawer.png')" 
    drawer.style.left = "-50px";
    drawer.style.top = (e.clientY - 25) + "px";
});
drawer.addEventListener("mouseout", e => {
    drawer.style.left = "-126px";
    drawerIsShown = false;
});

document.addEventListener("keyup", e => {
    if (e.key === "Escape") {
        page.style.pointerEvents = "none";
    }
});

let ctx = page.getContext("2d");
ctx.lineWidth = 5;
ctx.strokeStyle = "#ff5555";
ctx.lineJoin = ctx.lineCap = 'round';

var isDrawing, points = [];
page.addEventListener("pointerdown", e => {
    isDrawing = true;
    points.push({x: e.clientX, y: e.clientY});
});
page.addEventListener("pointerup", e => {
    isDrawing = false;
    points.length = 0;
});
page.addEventListener("pointermove", e => {
    if (!isDrawing) return;
    var p1 = points[0];
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);

    points.push({ x: e.clientX, y: e.clientY });
    for (p2 of points.slice(1)) {
        ctx.quadraticCurveTo(p1.x, p1.y, (p2.x + p1.x) / 2, (p2.y + p1.y) / 2);
        p1 = p2;
    }

    ctx.stroke();
});

document.body.appendChild(page);
document.body.appendChild(drawer);
