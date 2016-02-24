var canvas, stage;
var drawingCanvas;
var oldPt;
var oldMidPt;
var title;
var color;
var colors;
var index;

function initCanvas() {
    canvas = document.getElementById("notes-canvas");
    index = 0;
    colors = ["#f299d8","#d049f2","#4da1f9","#7ce7fb","#00c8e1"];

    //check to see if we are running in a browser with touch support
    stage = new createjs.Stage(canvas);
    stage.autoClear = false;
    stage.enableDOMEvents(true);

    createjs.Touch.enable(stage);
    createjs.Ticker.setFPS(24);

    drawingCanvas = new createjs.Shape();

    stage.addEventListener("stagemousedown", handleMouseDown);
    stage.addEventListener("stagemouseup", handleMouseUp);

    title = new createjs.Text("click and drag to draw", "24px Arial", "#777777");
    title.x = 10;
    title.y = 10;
    stage.addChild(title);

    stage.addChild(drawingCanvas);
    stage.update();
}

function handleMouseDown(event) {
    if (!event.primary) { return; }
    if (stage.contains(title)) {
        stage.clear();
        stage.removeChild(title);
    }
    color = colors[(index++) % colors.length];
    stroke = 3;
    oldPt = new createjs.Point(stage.mouseX, stage.mouseY);
    oldMidPt = oldPt.clone();
    stage.addEventListener("stagemousemove", handleMouseMove);
}

function handleMouseMove(event) {
    if (!event.primary) { return; }
    var midPt = new createjs.Point(oldPt.x + stage.mouseX >> 1, oldPt.y + stage.mouseY >> 1);

    drawingCanvas.graphics.clear().setStrokeStyle(stroke, 'round', 'round').beginStroke(color).moveTo(midPt.x, midPt.y).curveTo(oldPt.x, oldPt.y, oldMidPt.x, oldMidPt.y);

    oldPt.x = stage.mouseX;
    oldPt.y = stage.mouseY;

    oldMidPt.x = midPt.x;
    oldMidPt.y = midPt.y;

    stage.update();
}

function handleMouseUp(event) {
    if (!event.primary) { return; }
    stage.removeEventListener("stagemousemove", handleMouseMove);
}

function clearCanvas(){
    stage.clear();
}

