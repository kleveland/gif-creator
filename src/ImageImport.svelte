<script>
  import { cropImageDimensions, getOffset } from "./crop";
  import { onMount } from "svelte";

  const ZOOM_INCREASE = 0.3;
  const ZOOM_DECREASE = 0.1;

  let fileinput;
  export let onCrop;
  export let croppedImage;

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
    isDragging = false;
  const points = [];

  onMount(() => {
    canvas = document.getElementById("cropCanvas");
    ctx = canvas.getContext("2d");
    setOffsets();
    document.addEventListener("scroll", setOffsets);
    window.addEventListener("resize", setOffsets);
  });

  function setOffsets() {
    console.log("resize", "scroll");
    const canvasOffset = canvas.getBoundingClientRect();
    offsetX = canvasOffset.left;
    offsetY = canvasOffset.top;
  }

  function onImageMouseMove(e) {
    canMouseX = parseInt(e.clientX - offsetX);
    canMouseY = parseInt(e.clientY - offsetY);
    // console.log(canMouseX, canMouseY);
    if (isDragging) {
      console.log(canMouseX, canMouseY);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      position = {
        x: imageOrigPos.x - (clickOrigPos.x - canMouseX),
        y: imageOrigPos.y - (clickOrigPos.y - canMouseY),
      };
      console.log(position.x, position.y);
      ctx.drawImage(rawImageObj, position.x, position.y, newWidth, newHeight);
    }
    document.getElementById("posx").innerHTML = e.offsetX;
    document.getElementById("posy").innerHTML = e.offsetY;
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
        const width = 250;
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
          new Image()
        );
      };
    };
  }

  function setImageLoad(
    imageSrc,
    width = newWidth,
    height = newHeight,
    newImageObj
  ) {
    if (newImageObj) imageObj = newImageObj;
    imageObj.src = imageSrc;
    newWidth = width;
    newHeight = height;
    imageObj.onload = () => {
      console.log("loaded");
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(rawImageObj, position.x, position.y, width, height);
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
        (img) => croppedImage = img
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
      width="250"
      height="250"
      on:contextmenu={onImageRightClick}
      on:wheel={onScroll}
      on:mousedown={onImageMouseDown}
      on:mousemove={onImageMouseMove}
      on:mouseup={onImageMouseUp}
      on:mouseout={onImageMouseOut}
    />
    <div id="oldposx" style="display:none;" />
    <div id="oldposy" style="display:none;" />
    <div id="posx" style="display:none;" />
    <div id="posy" style="display:none;" />
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
