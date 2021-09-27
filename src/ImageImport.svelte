<script>
  import { cropImageDimensions, getOffset } from "./crop";
  import { onMount } from "svelte";

  const ZOOM_INCREASE = 0.3;
  const ZOOM_DECREASE = 0.1;
  const INIT_WIDTH_CANVAS = 400;

  let fileinput;

  export let croppedImage;
  export let step;
  export let nextStep;

  let canvas,
    ctx,
    rawImageObj,
    imageObj,
    outlineImg,
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
    isDragging = false;
  let [prevPointX, prevPointY, curPointX, curPointY] = [null, null, null, null];
  const points = [];

  onMount(() => {
    canvas = document.getElementById("cropCanvas");
    ctx = canvas.getContext("2d");
    outlineImg = new Image();
    outlineImg.src = './outline.png';
    outlineImg.onload = () => {
      drawOutline();
    }
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
    ctx.drawImage(outlineImg,
        canvas.width / 2 - outlineImg.width / 2,
        canvas.height / 2 - outlineImg.height / 2)
  }

  function onImageMouseMove(e) {
    canMouseX = parseInt(e.clientX - offsetX);
    canMouseY = parseInt(e.clientY - offsetY);
    if (isDragging) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      position = {
        x: imageOrigPos.x - (clickOrigPos.x - canMouseX),
        y: imageOrigPos.y - (clickOrigPos.y - canMouseY),
      };
      ctx.drawImage(rawImageObj, position.x, position.y, newWidth, newHeight);
      drawOutline();
    }
    curPointX = e.offsetX;
    curPointY = e.offsetY;
  }

  function onScroll(e) {
    e.preventDefault();
    if (checkScrollDirectionIsUp(e))
      setZoom(zoomLevel + (zoomLevel >= 1 ? ZOOM_INCREASE : ZOOM_DECREASE));
    else setZoom(zoomLevel - (zoomLevel > 1 ? ZOOM_INCREASE : ZOOM_DECREASE));
  }

  function checkScrollDirectionIsUp(event) {
    if (event.wheelDelta) {
      return event.wheelDelta > 0;
    }
    return event.deltaY < 0;
  }

  function onImageMouseDown(e) {
    canMouseX = parseInt(e.clientX - offsetX);
    canMouseY = parseInt(e.clientY - offsetY);
    console.log("current mouse pos", canMouseX, canMouseY);
    console.log("current image pos", position.x, position.y);
    if (
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

  function onImageMouseUp(e) {
    canMouseX = parseInt(e.clientX - offsetX);
    canMouseY = parseInt(e.clientY - offsetY);
    isDragging = false;
    if (e.button === 1 && imageObj)
      setImageLoad(canvas.toDataURL("image/jpeg"));
  }

  function onImageMouseOut(e) {
    canMouseX = parseInt(e.clientX - offsetX);
    canMouseY = parseInt(e.clientY - offsetY);
    isDragging = false;
  }

  function onImageRightClick(e) {
    e.preventDefault();
    ctx.beginPath();
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

    // ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath();
    ctx.moveTo(prevPointX, prevPointY);
    if (prevPointX && prevPointY) {
      ctx.lineTo(curPointX, curPointY);
      ctx.stroke();
    }
    prevPointX = e.offsetX;
    prevPointY = e.offsetY;
    document.body.append(pointer);
    curPointX = e.offsetX;
    curPointY = e.offsetY;
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
        setOffsets();
      };
    };
  }

  function setImageLoad(
    imageSrc,
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
        canvas.getContext("2d").drawImage(rawImageObj, position.x, position.y, newWidth, newHeight);
        ctx.globalCompositeOperation = "destination-out";
        tempCtx.drawImage(canvas, 0, 0);
    appliedImage.src = canvas.toDataURL("image/jpeg");
    let spots = document.getElementsByClassName("spot");

    while (spots[0]) spots[0].parentNode.removeChild(spots[0]);
    //clear canvas
    tempCtx.clearRect(0, 0, canvas.width, canvas.height);
    tempCtx.beginPath();
    tempCtx.globalCompositeOperation = "destination-over";
    //draw the polygon

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

      if (i == 0) tempCtx.moveTo(x - offset.left, y - offset.top);
      else tempCtx.lineTo(x - offset.left, y - offset.top);
      //console.log(points[i],points[i+1])
    }
    console.log(imageObj);
    appliedImage.onload = () => {
      let pattern = tempCtx.createPattern(appliedImage, "repeat");
      tempCtx.fillStyle = pattern;
      tempCtx.fill();

      var dataurl = tempCanvas.toDataURL("image/png");

      console.log(dataurl);
      console.log(leftMost, topMost, rightMost, bottomMost);
      const canvasCoords = getOffset(canvas);
      cropImageDimensions(
        dataurl,
        leftMost - canvasCoords.left,
        topMost - canvasCoords.top,
        rightMost - leftMost,
        bottomMost - topMost,
        (img) => {
          nextStep = 2;
          step = 2;
          croppedImage = img;
        }
      );
    };
  }
</script>

<div class="image-import-container mdl-card mdl-shadow--2dp">
      
  <div class="mdl-card__title">
    <h2 class="mdl-card__title-text">1. Crop</h2>
  </div>
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
  <div class="mdl-card__supporting-text">INSTRUCTIONS HERE</div>
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
  .mdl-card__title {
    justify-content: center;
  }
  canvas {
    box-shadow: 0 2px 2px 0 rgb(0 0 0 / 14%), 0 3px 1px -2px rgb(0 0 0 / 20%),
      0 1px 5px 0 rgb(0 0 0 / 12%);
    margin: 1em auto;
  }
</style>
