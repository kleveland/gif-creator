<script>
  import { onMount, afterUpdate } from "svelte";
  import { PartyParrotPositions } from './gifpositions';
  import GIF from "./gif.js";

  let frameCount = 0;
  export let croppedImage;
  let canvas, ctx;
  let positionsArr = [];
  let arr;

  let canvasOffset,
    canvasWidth,
    offsetX,
    offsetY,
    canMouseX,
    canMouseY,
    canvasHeight,
    isDragging = false,
    canDrag = true,
    playInterval;

  const onScroll = (e) => setOffsets();

  onMount(() => {
    canvas = document.getElementById("gifCanvas");
    ctx = canvas.getContext("2d");
    canvasWidth = canvas.width;
    canvasHeight = canvas.height;
    setOffsets();
  });

  afterUpdate(() => {
    console.log(croppedImage);
    if (croppedImage && !arr?.length) {
      extractGif().then((imgArr) => {
        positionsArr = [...PartyParrotPositions];
        arr = imgArr;
        setFrame(0);
      });
    }
  });

  function setOffsets() {
    canvasOffset = canvas.getBoundingClientRect();
    offsetX = canvasOffset.left;
    offsetY = canvasOffset.top;
  }

  function extractGif() {
    const Img = [];
    let imgsLoaded = 0;
    const totalFrames = 10;
    return new Promise((resolve, reject) => {
      for (var i = 0; i < totalFrames; i++) {
        Img[i] = new Image();
        Img[i].src = "partyparrot/" + i + ".png";
        Img[i].onload = () => {
          imgsLoaded++;
          if (imgsLoaded === totalFrames) resolve(Img);
        };
      }
    });
  }

  function setFrame(frame) {
    ctx.clearRect(0, 0, 1000, 1000);
    frameCount = frame;
    console.log(frameCount, arr.length);
    if (frameCount > arr.length - 1) frameCount = 0;
    if (frameCount < 0) frameCount = arr.length - 1;
    if (arr.length == 10) {
      drawAnimatedImage(frameCount);
      drawOverlayImage(frameCount);
    }
  }

  function drawAnimatedImage(frame, overrideCtx) {
    const targetCtx = overrideCtx ?? ctx;
    if (!!arr[frame]) {
      console.log("drawing parrot", arr[frame]);
      targetCtx.drawImage(arr[frame], 0, 0);
    }
    targetCtx.restore();
    return frame;
  }

  function drawOverlayImage(frameCount, overrideCtx) {
    const targetCtx = overrideCtx ?? ctx;
    const midX = croppedImage.width / 4;
    const midY = croppedImage.height / 4;
    console.log(midX, midY);
    targetCtx.drawImage(
      croppedImage,
      positionsArr[frameCount]?.x ? positionsArr[frameCount]?.x : midX,
      positionsArr[frameCount]?.y ? positionsArr[frameCount]?.y : midY
    );
  }

  function playCanvas() {
    playInterval = setInterval(() => {
      setFrame(frameCount + 1);
    }, 100);
  }

  function pauseCanvas() {
    clearInterval(playInterval);
  }

  function handleImageMouseDown(e) {
    canMouseX = parseInt(e.clientX - offsetX);
    canMouseY = parseInt(e.clientY - offsetY);
    // set the drag flag
    isDragging = true;
  }

  function handleImageMouseUp(e) {
    canMouseX = parseInt(e.clientX - offsetX);
    canMouseY = parseInt(e.clientY - offsetY);
    // clear the drag flag
    isDragging = false;
  }

  function handleImageMouseOut(e) {
    canMouseX = parseInt(e.clientX - offsetX);
    canMouseY = parseInt(e.clientY - offsetY);
    // user has left the canvas, so clear the drag flag
    isDragging = false;
  }

  function handleImageMouseMove(e) {
    canMouseX = parseInt(e.clientX - offsetX);
    canMouseY = parseInt(e.clientY - offsetY);
    // if the drag flag is set, clear the canvas and draw the image
    if (isDragging) {
      ctx.clearRect(0, 0, canvasWidth, canvasHeight);
      drawAnimatedImage(frameCount);
      positionsArr[frameCount] = {
        x: canMouseX - croppedImage.width / 2,
        y: canMouseY - croppedImage.height / 2,
      };
      ctx.drawImage(
        croppedImage,
        positionsArr[frameCount].x,
        positionsArr[frameCount].y
      );
    }
  }

  function generateGif() {
    const gif = new GIF({
      workers: 2,
      quality: 8,
      transparent: 0x000000,
      width: 128,
      height: 128,
    });
    console.log("POSITIONS ARR", positionsArr);
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = 128;
    tempCanvas.height = 128;
    const tempCtx = tempCanvas.getContext("2d");
    // tempCtx.fillStyle = "#ffffff";
    console.log("image arr", arr);
    arr.forEach((image, frameCount) => {
      tempCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
      //   tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
      console.log("frameCount", frameCount);
      drawAnimatedImage(frameCount, tempCtx);
      drawOverlayImage(frameCount, tempCtx);
      gif.addFrame(tempCtx, { copy: true, delay: 100 });
      console.log(image, frameCount);
    });
    gif.on("finished", function (blob) {
      console.log(blob);
      window.open(URL.createObjectURL(blob));
    });
    gif.render();

    console.log("test here");
  }
</script>

<div class="custom-canvas-container">
  <div id="generate" on:click={generateGif}>Generate</div>
  <div id="playCanvas" on:click={playCanvas}>Play</div>
  <div id="pauseCanvas" on:click={pauseCanvas}>Pause</div>
  <div id="incrementFrame" on:click={() => setFrame(frameCount + 1)}>
    Increment
  </div>
  <div id="decrementFrame" on:click={() => setFrame(frameCount - 1)}>
    Decrement
  </div>
  <div>{frameCount}</div>
  <canvas
    id="gifCanvas"
    width="128"
    height="128"
    on:scroll={onScroll}
    on:mousedown={handleImageMouseDown}
    on:mousemove={handleImageMouseMove}
    on:mouseup={handleImageMouseUp}
    on:mouseout={handleImageMouseOut}
  />
</div>

<style>
  canvas {
    box-shadow: 0 0 10px black;
    margin: 20px;
  }
</style>
