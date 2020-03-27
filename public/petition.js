const canvas = $("#sign");
const blankCanvas = $("#blank");
const ctx = canvas[0].getContext("2d");
let mouseDown = false;
let mouseX;
let mouseY;

// if mouseDown is true, draw line

canvas.on("mousedown", function(e) {
    mouseDown = true;
    e.preventDefault();
    mouseX = e.clientX - this.offsetLeft;
    mouseY = e.clientY - this.offsetTop;
    ctx.beginPath();
    ctx.strokeStyle = "black";
    ctx.lineWidth = 2;

    ctx.moveTo(mouseX, mouseY);
});

$(document).on("mouseup", function() {
    if (mouseDown) {
        mouseDown = false;
    }
});

canvas.on("mousemove", function(e) {
    console.log("mouse down: ", mouseDown);
    if (mouseDown) {
        e.preventDefault();
        mouseX = e.clientX - this.offsetLeft;
        mouseY = e.clientY - this.offsetTop;
        ctx.lineTo(mouseX, mouseY);
        ctx.stroke();
    }
});

$("form").on("submit", function(e) {
    //compare canvas image to blank canvas image. If they are the same, it means canvas is blank.
    if (canvas[0].toDataURL() == blankCanvas[0].toDataURL()) {
        e.preventDefault();
        if ($("h3").length == 0) {
            $("main").append(
                "<h3 class='error'>Signature cannot be blank</h3>"
            );
        }
    } else {
        let signature = $("input[name='signature']");
        signature.val(canvas[0].toDataURL());
        ctx.clearRect(0, 0, canvas[0].width, canvas[0].height);
    }
});

$("#clear").on("click", function() {
    ctx.clearRect(0, 0, canvas[0].width, canvas[0].height);
});
