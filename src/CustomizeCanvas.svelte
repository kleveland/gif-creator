<script>
  import { onMount, afterUpdate } from "svelte";
  import { PartyParrotPositions } from "./gifpositions";
  import Button from "./Button.svelte";
  import GIF from "./gif.js";

  let frameCount = 0;
  export let croppedImage;
  let imageSelection = "partyParrot";
  let loadedSelection;
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
    position = { x: 0, y: 0 },
    imageOrigPos = { ...position },
    clickOrigPos,
    playInterval;

  const onScroll = (e) => setOffsets();

  onMount(() => {
    canvas = document.getElementById("gifCanvas");
    ctx = canvas.getContext("2d");
    canvasWidth = canvas.width;
    canvasHeight = canvas.height;
    setOffsets();
    document.addEventListener("scroll", setOffsets);
    window.addEventListener("resize", setOffsets);
    extractGif().then((imgArr) => {
      arr = imgArr;
      setFrame(0);
    });
  });

  afterUpdate(() => {
    console.log(croppedImage);
    if (croppedImage && imageSelection !== loadedSelection) {
      extractGif().then((imgArr) => {
        loadedSelection = imageSelection;
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
    if (arr.length == 10) drawFrame(frameCount);
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
    if (croppedImage) {
      const targetCtx = overrideCtx ?? ctx;
      const midX = croppedImage.width / 4;
      const midY = croppedImage.height / 4;
      console.log(midX, midY);
      console.log(positionsArr, frameCount);
      targetCtx.drawImage(
        croppedImage,
        positionsArr[frameCount].x,
        positionsArr[frameCount].y,
        croppedImage.width,
        croppedImage.height
      );
    }
  }

  function playCanvas() {
    if (!playInterval)
      playInterval = setInterval(() => {
        setFrame(frameCount + 1);
      }, 100);
  }

  function pauseCanvas() {
    if (playInterval) clearInterval(playInterval);
    playInterval = undefined;
  }

  function toggleCanvas() {
    if (!playInterval) playCanvas();
    else pauseCanvas();
  }

  function handleImageMouseDown(e) {
    if (
      e.button === 0 &&
      canMouseX > positionsArr[frameCount].x &&
      canMouseY > positionsArr[frameCount].y &&
      canMouseX < positionsArr[frameCount].x + croppedImage.width &&
      canMouseY < positionsArr[frameCount].y + croppedImage.height
    ) {
      clickOrigPos = { x: canMouseX, y: canMouseY };
      imageOrigPos = { ...positionsArr[frameCount] };
      console.log("orig pos", clickOrigPos);
      isDragging = true;
    }
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
      console.log(canMouseX, canMouseY);
      positionsArr[frameCount] = {
        x: imageOrigPos.x - (clickOrigPos.x - canMouseX),
        y: imageOrigPos.y - (clickOrigPos.y - canMouseY),
      };
      drawFrame();
    }
  }

  function drawFrame(frame = frameCount) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawAnimatedImage(frame);
    drawOverlayImage(frame);
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

<div class="mdl-card mdl-shadow--2dp">
  <span class="gif-canvas-container">
    <canvas
      id="gifCanvas"
      class="gif-canvas"
      width="128"
      height="128"
      on:scroll={onScroll}
      on:mousedown={handleImageMouseDown}
      on:mousemove={handleImageMouseMove}
      on:mouseup={handleImageMouseUp}
      on:mouseout={handleImageMouseOut}
    /></span
  >
  <div class="frame-count-container">
    <button
      class="mdl-button mdl-js-button mdl-button--fab mdl-js-ripple-effect mdl-button--mini-fab"
      on:click={() => setFrame(frameCount - 1)}
    >
      <i class="material-icons">remove</i>
    </button>
    <span class="mdl-chip mdl-chip--deletable">
      <span class="mdl-chip__text">Frame {frameCount}</span>
      <button on:click={toggleCanvas} type="button" class="mdl-chip__action">
        {#if !playInterval}
          <i class="material-icons">play_arrow</i>
        {:else}
          <i class="material-icons">pause</i>
        {/if}
      </button>
    </span>
    <button
      class="mdl-button mdl-js-button mdl-button--fab mdl-js-ripple-effect mdl-button--mini-fab"
      on:click={() => setFrame(frameCount + 1)}
    >
      <i class="material-icons">add</i>
    </button>
  </div>
  <div class="mdl-card__supporting-text">INSTRUCTIONS HERE</div>
  <div class="mdl-card__actions mdl-card--border">
    <Button id="generate" onClick={generateGif} buttonText="Generate" /></div>
</div>

<style>
  .frame-count-container {
    display: flex;
    justify-content: center;
    align-items: center;
    width: 200px;
    margin: auto;
  }
  .gif-canvas {
    box-shadow: 0 2px 2px 0 rgb(0 0 0 / 14%), 0 3px 1px -2px rgb(0 0 0 / 20%),
      0 1px 5px 0 rgb(0 0 0 / 12%);
  }

  .gif-canvas-container {
    width: 128px;
    height: 128px;
    margin: 1em auto;
  }
</style>
