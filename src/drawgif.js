import GIF from "./gif.js";

let gifCanvas,
  ctx,
  canvasOffset,
  canvasWidth,
  offsetX,
  offsetY,
  canMouseX,
  canMouseY,
  canvasHeight,
  croppedImage,
  isDragging = false;

window.onload = () => {
  gifCanvas = document.getElementById("gifCanvas");
  ctx = gifCanvas.getContext("2d");
  console.log(ctx);
  canvasOffset = gifCanvas.getBoundingClientRect();
  canvasWidth = gifCanvas.width;
  canvasHeight = gifCanvas.height;
  offsetX = canvasOffset.left;
  offsetY = canvasOffset.top;
  gifCanvas.width;
};

export function setCroppedImage(img, onLoad) {
  croppedImage = new Image();
  croppedImage.src = img;
  croppedImage.onload = onLoad;
}

function extractGif() {
  const Img = [];
  for (var i = 0; i < 10; i++) {
    Img[i] = new Image();
    Img[i].src = "partyparrot/" + i + ".png";
  }
  return Img;
}

export let frameCount = 0;
const arr = extractGif();
const positionsArr = [];

export function drawAnimatedImage(arr, ctx, frame) {
  if (!!arr[frame]) {
    ctx.drawImage(arr[frame], 0, 0);
  }
  ctx.restore();
  return frame;
}

function drawOverlayImage(ctx, image, frameCount) {
  const midX = image.width / 4;
  const midY = image.height / 4;
  console.log(midX, midY);
  ctx.drawImage(
    image,
    positionsArr[frameCount]?.x ? positionsArr[frameCount]?.x : midX,
    positionsArr[frameCount]?.y ? positionsArr[frameCount]?.y : midY
  );
}

export function setFrame(frameAdd) {
  ctx.clearRect(0, 0, 1000, 1000);
  frameCount = frameCount + frameAdd;
  if (frameCount > arr.length - 1) frameCount = 0;
  if (frameCount < 0) frameCount = arr.length - 1;
  if (arr.length == 10) {
    drawAnimatedImage(arr, ctx, frameCount);
    drawOverlayImage(ctx, croppedImage, frameCount);
  }
}

export function renderFrame() {}

export function generateGif() {
  const gif = new GIF({
    workers: 2,
    quality: 10,
    transparent: "0x000000",
    width: 128,
    height: 128,
  });
  const tempCanvas = document.createElement("canvas");
  tempCanvas.width = 128;
  tempCanvas.height = 128;
  const ctx = tempCanvas.getContext("2d");
    console.log("image arr", arr);
    arr.forEach((image, frameCount) => {
      ctx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
      console.log("frameCount", frameCount);
      drawAnimatedImage(arr, ctx, frameCount);
      drawOverlayImage(ctx, croppedImage, frameCount);
      gif.addFrame(ctx, { copy: true, delay: 150 });
      console.log(image, frameCount);
    });
    gif.on("finished", function (blob) {
      console.log(blob);
      window.open(URL.createObjectURL(blob));
    });
    gif.render();

  console.log("test here");
}

export function handleImageMouseDown(e) {
  canMouseX = parseInt(e.clientX - offsetX);
  canMouseY = parseInt(e.clientY - offsetY);
  // set the drag flag
  isDragging = true;
}

export function handleImageMouseUp(e) {
  canMouseX = parseInt(e.clientX - offsetX);
  canMouseY = parseInt(e.clientY - offsetY);
  // clear the drag flag
  isDragging = false;
}

export function handleImageMouseOut(e) {
  canMouseX = parseInt(e.clientX - offsetX);
  canMouseY = parseInt(e.clientY - offsetY);
  // user has left the canvas, so clear the drag flag
  //isDragging=false;
}

export function handleImageMouseMove(e, img) {
  canMouseX = parseInt(e.clientX - offsetX);
  canMouseY = parseInt(e.clientY - offsetY);
  // if the drag flag is set, clear the canvas and draw the image
  if (isDragging) {
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    drawAnimatedImage(arr, ctx, frameCount);
    positionsArr[frameCount] = {
      x: canMouseX - croppedImage.width / 2,
      y: canMouseY - croppedImage.height / 2,
    };
    console.log(positionsArr[frameCount]);
    ctx.drawImage(
      croppedImage,
      positionsArr[frameCount].x,
      positionsArr[frameCount].y
    );
  }
}
