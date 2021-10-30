<script>
  import { cropImageDimensions } from "./crop";
  import { onMount } from "svelte";

  const ZOOM_INCREASE = 0.2;
  const ZOOM_DECREASE = 0.05;
  const INIT_WIDTH_CANVAS = 400;
  const POINT_SIZE = 4;
  const UNDO_KEYCODE = 90;

  let fileinput;

  export let croppedImage;
  export let step;

  let canvas,
    ctx,
    rawImageObj,
    imageObj,
    zoomLevel = 1,
    canMouseX,
    canMouseY,
    offsetX,
    offsetY,
    position = { x: 0, y: 0 },
    imageOrigPos = { ...position },
    clickOrigPos,
    newWidth,
    newHeight,
    isDragging = false,
    isImageImported = false;
  let points = [];

  onMount(() => {
    canvas = document.getElementById("cropCanvas");
    ctx = canvas.getContext("2d");
    drawOutline();
    setOffsets();
    document.addEventListener("scroll", setOffsets);
    window.addEventListener("resize", setOffsets);
  });

  function setOffsets() {
    const canvasOffset = canvas.getBoundingClientRect();
    offsetX = canvasOffset.left;
    offsetY = canvasOffset.top;
  }

  function drawOutline() {
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const rx = 45;
    const ry = 55;
    ctx.save();
    ctx.beginPath();

    ctx.translate(cx - rx, cy - ry);
    ctx.scale(rx, ry);
    ctx.arc(1, 1, 1, 0, 2 * Math.PI, false);

    ctx.restore();
    ctx.stroke();
  }

  function onImageMouseMove(e) {
    canMouseX = parseInt(e.clientX - offsetX);
    canMouseY = parseInt(e.clientY - offsetY);
    if (isDragging && isImageImported) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      position = {
        x: imageOrigPos.x - (clickOrigPos.x - canMouseX),
        y: imageOrigPos.y - (clickOrigPos.y - canMouseY),
      };
      // ctx.drawImage(rawImageObj, position.x, position.y, newWidth, newHeight);
      // drawOutline();
      refreshFrame();
    }
  }

  function onScroll(e) {
    e.preventDefault();
    if (isImageImported) {
      const zoomMagnitude = zoomLevel >= 1 ? ZOOM_INCREASE : ZOOM_DECREASE;
      const zoomDelta = zoomMagnitude * (checkScrollDirectionIsUp(e) ? 1 : -1);
      setZoom(zoomLevel + zoomDelta);
    }
  }

  function checkScrollDirectionIsUp(event) {
    if (event.wheelDelta) return event.wheelDelta > 0;
    return event.deltaY < 0;
  }

  function onImageMouseDown(e) {
    canMouseX = parseInt(e.clientX - offsetX);
    canMouseY = parseInt(e.clientY - offsetY);
    console.log("current mouse pos", canMouseX, canMouseY);
    console.log("current image pos", position.x, position.y);
    if (
      isImageImported &&
      e.button === 0 &&
      canMouseX > position.x &&
      canMouseY > position.y &&
      canMouseX < position.x + newWidth &&
      canMouseY < position.y + newHeight
    ) {
      clickOrigPos = { x: canMouseX, y: canMouseY };
      imageOrigPos = { ...position };
      console.log("orig pos", clickOrigPos);
      isDragging = true;
    }
  }

  function onKeyDown(e) {
    if (e.keyCode === UNDO_KEYCODE) {
      console.log("undo");
      points.pop();
      console.log(points);

      refreshFrame();
    }
  }

  function onImageMouseUp(e) {
    canMouseX = parseInt(e.clientX - offsetX);
    canMouseY = parseInt(e.clientY - offsetY);
    isDragging = false;
    if (isImageImported && e.button === 1 && imageObj) refreshFrame();
  }

  function onImageMouseOut(e) {
    canMouseX = parseInt(e.clientX - offsetX);
    canMouseY = parseInt(e.clientY - offsetY);
    isDragging = false;
  }

  function onImageRightClick(e) {
    e.preventDefault();
    if (isImageImported) {
      console.log("adding pointer");

      //store the points on mousedown
      const point = { x: e.offsetX, y: e.offsetY };
      points.push(point);

      drawFullPointPath();
    }
  }

  function refreshFrame() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(rawImageObj, position.x, position.y, newWidth, newHeight);
    drawOutline();
    drawFullPointPath();
  }

  function drawPoint(point) {
    ctx.fillStyle = "rgb(63,81,181)";
    ctx.beginPath();
    console.log(point.x, point.y);
    ctx.arc(point.x, point.y, POINT_SIZE, 0, 2 * Math.PI);
    ctx.fill();
  }

  const pathWeight = 1.5;
  function drawPath(firstPoint, secondPoint) {
    console.log("drawPath", firstPoint, secondPoint);
    ctx.lineWidth = pathWeight;
    ctx.beginPath();
    ctx.moveTo(firstPoint.x, firstPoint.y);
    ctx.lineTo(secondPoint.x, secondPoint.y);
    ctx.stroke();
  }

  function drawFullPointPath() {
    console.log(points);
    for (let i = 1; i < points.length; i++) {
      const prevPoint = points[i - 1];
      const currentPoint = points[i];
      drawPath(prevPoint, currentPoint);
    }
    console.log("drew paths");

    for (let i = 0; i < points.length; i++) {
      const currentPoint = points[i];
      drawPoint(currentPoint);
    }
    console.log("drew points");
  }

  function onFileSelected(e) {
    let image = e.target.files[0];
    let reader = new FileReader();
    reader.readAsDataURL(image);
    reader.onload = (e) => {
      rawImageObj = new Image();
      rawImageObj.src = e.target.result;
      rawImageObj.onload = () => {
        const tempCanvas = document.createElement("canvas");
        // Handle resizing image as needed on canvas
        const whRatio = rawImageObj.height / rawImageObj.width;
        const width = INIT_WIDTH_CANVAS;
        const height = whRatio * width;
        tempCanvas.width = width;
        tempCanvas.height = height;
        canvas.width = width;
        canvas.height = height;
        tempCanvas.getContext("2d").drawImage(rawImageObj, 0, 0, width, height);
        setImageLoad(
          tempCanvas.toDataURL("image/jpeg"),
          canvas.width,
          canvas.height,
          true
        );
        isImageImported = true;
        setOffsets();
      };
    };
  }

  function setImageLoad(
    imageSrc = canvas.toDataURL("image/jpeg"),
    width = newWidth,
    height = newHeight,
    newImageObj = false,
    shouldDrawOutline = true
  ) {
    if (newImageObj) imageObj = new Image();
    imageObj.src = imageSrc;
    newWidth = width;
    newHeight = height;
    imageObj.onload = () => {
      console.log("loaded2");
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(rawImageObj, position.x, position.y, width, height);
      if (shouldDrawOutline) drawOutline();
      setOffsets();
    };
  }

  function setZoom(level) {
    if (level < 0.1) zoomLevel = 0.1;
    else if (level > 5) zoomLevel = 5;
    else zoomLevel = level;
    const [origWidth, origHeight] = [canvas.width, canvas.height];
    setImageLoad(
      canvas.toDataURL("image/jpeg"),
      origWidth * level,
      origHeight * level
    );
  }

  function cropImage() {
    const appliedImage = new Image();
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tempCtx = tempCanvas.getContext("2d");
    console.log(rawImageObj, position.x, position.y, newWidth, newHeight);
    canvas
      .getContext("2d")
      .drawImage(rawImageObj, position.x, position.y, newWidth, newHeight);
    ctx.globalCompositeOperation = "destination-out";
    tempCtx.drawImage(canvas, 0, 0);
    appliedImage.src = canvas.toDataURL("image/jpeg");
    //clear canvas
    tempCtx.clearRect(0, 0, canvas.width, canvas.height);
    tempCtx.beginPath();
    tempCtx.globalCompositeOperation = "destination-over";

    let leftMost = Number.MAX_SAFE_INTEGER; // higher then bounds of canvas
    let topMost = Number.MAX_SAFE_INTEGER; // higher then bounds of canvas
    let rightMost = 0;
    let bottomMost = 0;
    for (let i = 0; i < points.length; i++) {
      const { x, y } = points[i];

      if (x < leftMost) leftMost = x;
      if (y < topMost) topMost = y;
      if (x > rightMost) rightMost = x;
      if (y > bottomMost) bottomMost = y;

      if (i == 0) tempCtx.moveTo(x, y);
      else tempCtx.lineTo(x, y);
      //console.log(points[i],points[i+1])
    }
    points = [];

    appliedImage.onload = () => {
      let pattern = tempCtx.createPattern(appliedImage, "repeat");
      tempCtx.fillStyle = pattern;
      tempCtx.fill();

      var dataurl = tempCanvas.toDataURL("image/png");
      cropImageDimensions(
        dataurl,
        leftMost,
        topMost,
        rightMost - leftMost,
        bottomMost - topMost,
        (img) => {
          step = 2;
          croppedImage = img;
        }
      );
    };
  }
</script>

<svelte:window on:keydown={onKeyDown} />
<div class="image-import-container mdl-card mdl-shadow--2dp">
  <div>
    <canvas
      id="cropCanvas"
      width={INIT_WIDTH_CANVAS}
      height={INIT_WIDTH_CANVAS}
      on:contextmenu={onImageRightClick}
      on:wheel={onScroll}
      on:mousedown={onImageMouseDown}
      on:mousemove={onImageMouseMove}
      on:mouseup={onImageMouseUp}
      on:mouseout={onImageMouseOut}
    />
  </div>
  <div class="mdl-card__supporting-text">
      1. Choose an image<br>
        2. Scroll to zoom in and out to fit a face around the size of the outline. <br>
      3. Right click to place points to outline the face. Ctrl+Z to undo.<br>
      4. Press "Crop Selection"
  </div>
  <div class="mdl-card__actions mdl-card--border">
    <button
      class="mdl-button mdl-js-button mdl-button--raised mdl-js-ripple-effect mdl-button--colored"
      id="import"
      on:click={() => fileinput.click()}
    >
      Choose Image
    </button>
    <button
      class="mdl-button mdl-js-button mdl-button--raised mdl-js-ripple-effect mdl-button--colored"
      role="button"
      id="crop"
      on:click={() => {
        croppedImage = cropImage();
      }}
    >
      Crop Selection
    </button>
    <input
      style="display:none"
      type="file"
      accept=".jpg, .jpeg, .png"
      on:change={onFileSelected}
      bind:this={fileinput}
    />
  </div>
</div>

<style>
  .image-import-container {
    width: 100%;
    margin: auto;
  }

  .mdl-card__supporting-text {
    width: 100%;
  }

  canvas {
    box-shadow: 0 2px 2px 0 rgb(0 0 0 / 14%), 0 3px 1px -2px rgb(0 0 0 / 20%),
      0 1px 5px 0 rgb(0 0 0 / 12%);
    margin: 1em auto;
  }
</style>
