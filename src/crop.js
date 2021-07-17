/*
 * HTML5 crop image in polygon shape
 * author: netplayer@gmx.com
 * file : crop.js
   github version
 */

  let canvas,
  ctx,
  imageObj;

let condition = 1;
const points = [];

export function onImageMouseDown(e) {
  if (e.which == 1) {
    console.log("adding pointer");
    const pointer = document.createElement("span");
    pointer.style = {
      ...pointer.style,
      position: "absolute",
      backgroundColor: "#000000",
      width: "5px",
      height: "5px",
      top: e.pageY,
      left: e.pageX,
    };
    //store the points on mousedown
    points.push(e.pageX, e.pageY);

    //console.log(points);

    ctx.globalCompositeOperation = "destination-out";
    let oldposx = document.getElementById("oldposx").innerHTML;
    let oldposy = document.getElementById("oldposy").innerHTML;
    let posx = document.getElementById("posx").innerHTML;
    let posy = document.getElementById("posy").innerHTML;
    ctx.beginPath();
    ctx.moveTo(oldposx, oldposy);
    if (oldposx != "") {
      ctx.lineTo(posx, posy);
      ctx.stroke();
    }
    document.getElementById("oldposx").innerHTML = e.offsetX;
    document.getElementById("oldposy").innerHTML = e.offsetY;
    document.body.append(pointer);
    document.getElementById("posx").innerHTML = e.offsetX;
    document.getElementById("posy").innerHTML = e.offsetY;
  }
}

export function onImageMouseMove(e) {
  if (condition == 1) {
    ctx.beginPath();

    document.getElementById("posx").innerHTML = e.offsetX;
    document.getElementById("posy").innerHTML = e.offsetY;
  }
}

export function cropImage(canvas, ctx, imageObj, cb) {
  let spots = document.getElementsByClassName("spot");

  while (spots[0]) spots[0].parentNode.removeChild(spots[0]);
  //clear canvas

  //var context = canvas.getContext("2d");

  ctx.clearRect(0, 0, 300, 300);
  ctx.beginPath();
  ctx.width = 300;
  ctx.height = 300;
  ctx.globalCompositeOperation = "destination-over";
  //draw the polygon

  //console.log(points);
  const rect = document.querySelector("#cropCanvas").getBoundingClientRect();
  const offset = {
    top: rect.top + window.scrollY,
    left: rect.left + window.scrollX,
  };
  //console.log(offset.left,offset.top);

  let leftMost = Number.MAX_SAFE_INTEGER; // higher then bounds of canvas
  let topMost = Number.MAX_SAFE_INTEGER; // higher then bounds of canvas
  let rightMost = 0;
  let bottomMost = 0;
  for (let i = 0; i < points.length; i += 2) {
    console.log(points[i]);
    let x = parseInt(points[i]);
    let y = parseInt(points[i + 1]);

    if (x < leftMost) leftMost = x;
    if (y < topMost) topMost = y;
    if (x > rightMost) rightMost = x;
    if (y > bottomMost) bottomMost = y;

    if (i == 0) ctx.moveTo(x - offset.left, y - offset.top);
    else ctx.lineTo(x - offset.left, y - offset.top);
    //console.log(points[i],points[i+1])
  }
  console.log(imageObj);
  let pattern = ctx.createPattern(imageObj, "repeat");
  ctx.fillStyle = pattern;
  ctx.fill();

  var dataurl = canvas.toDataURL("image/png");

  console.log(dataurl);
  console.log(leftMost, topMost, rightMost, bottomMost);
  const canvasCoords = getOffset(canvas);
  cropImageDimensions(
    dataurl,
    leftMost - canvasCoords.left,
    topMost - canvasCoords.top,
    rightMost - leftMost,
    bottomMost - topMost,
    cb
  );
}

function contrastImage(imgData, contrast){  //input range [-100..100]
  var d = imgData.data;
  contrast = (contrast/100) + 1;  //convert to decimal & shift range: [0..2]
  var intercept = 128 * (1 - contrast);
  for(var i=0;i<d.length;i+=4){   //r,g,b,a
      d[i] = d[i]*contrast + intercept;
      d[i+1] = d[i+1]*contrast + intercept;
      d[i+2] = d[i+2]*contrast + intercept;
  }
  return imgData;
}

export function cropImageDimensions(image, left, top, width, height, cb) {
  console.log(left, top, width, height);
  const rawImageObj = new Image();
  const tempCanvas = document.createElement("canvas");
  rawImageObj.src = image;
  rawImageObj.onload = () => {
    tempCanvas.width = width;
    tempCanvas.height = height;
    const tempCanvasCtx = tempCanvas.getContext("2d");
    tempCanvasCtx.drawImage(rawImageObj, -left, -top);
    tempCanvasCtx.putImageData(contrastImage(tempCanvasCtx.getImageData(0,0,tempCanvas.width, tempCanvas.height), -10), 0, 0);
    const croppedImageObj = new Image();
    croppedImageObj.src = tempCanvas.toDataURL("image/png");
    croppedImageObj.onload = () => cb(croppedImageObj);
  };
}

export function getOffset(el) {
  const rect = el.getBoundingClientRect();
  return {
    left: rect.left + window.scrollX,
    top: rect.top + window.scrollY,
  };
}


export function onFileSelected(e) {
  let image = e.target.files[0];
  let reader = new FileReader();
  reader.readAsDataURL(image);
  reader.onload = (e) => {
    const rawImageObj = new Image();
    const tempCanvas = document.createElement("canvas");
    rawImageObj.src = e.target.result;
    rawImageObj.onload = () => {
      // Handle resizing image as needed on canvas
      const whRatio = rawImageObj.width / rawImageObj.width;
      const width = 300;
      const height = whRatio * width;
      tempCanvas.width = width;
      tempCanvas.height = height;
      tempCanvas.getContext("2d").drawImage(rawImageObj, 0, 0, width, height);
      const resizedImage = new Image();
      imageObj = resizedImage;
      resizedImage.src = tempCanvas.toDataURL("image/jpeg");
      resizedImage.onload = () => {
        ctx.drawImage(resizedImage, 0, 0);
      };
    };
  };
};