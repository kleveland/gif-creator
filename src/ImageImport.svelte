<script>
  import { cropImageDimensions, getOffset } from "./crop";
  import { getContext, onMount } from "svelte";

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
    const canvasOffset = canvas.getBoundingClientRect();
    offsetX = canvasOffset.left;
    offsetY = canvasOffset.top;
  });

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

  function onScroll(e) {
    e.preventDefault();
    if (checkScrollDirectionIsUp(e))
      setZoom(zoomLevel + (zoomLevel >= 1 ? 0.5 : 0.2));
    else setZoom(zoomLevel - (zoomLevel > 1 ? 0.5 : 0.2));
  }

  function checkScrollDirectionIsUp(event) {
    if (event.wheelDelta) {
      return event.wheelDelta > 0;
    }
    return event.deltaY < 0;
  }

  function onImageMouseDown(e) {
    console.log(e);
    canMouseX = parseInt(e.clientX - offsetX);
    canMouseY = parseInt(e.clientY - offsetY);
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
    if (e.button === 1 && imageObj) {
      console.log(canvas.toDataURL("image/jpeg"));
      imageObj.src = canvas.toDataURL("image/jpeg");
      setImageLoad();
    }
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
        const width = 300;
        const height = whRatio * width;
        tempCanvas.width = width;
        tempCanvas.height = height;
        canvas.width = width;
        canvas.height = height;
        tempCanvas.getContext("2d").drawImage(rawImageObj, 0, 0, width, height);
        const resizedImage = new Image();
        newWidth = canvas.width;
        newHeight = canvas.height;
        imageObj = resizedImage;
        imageObj.src = tempCanvas.toDataURL("image/jpeg");
        setImageLoad();
      };
    };
  }

  function setImageLoad(width = newWidth, height = newHeight) {
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
    console.log("set zoom", level);
    const [origWidth, origHeight] = [canvas.width, canvas.height];
    newWidth = origWidth * level;
    newHeight = origHeight * level;
    imageObj.src = canvas.toDataURL("image/jpeg");
    setImageLoad(newWidth, newHeight);
  }

  function cropImage() {
    const appliedImage = new Image();
    appliedImage.src = canvas.toDataURL("image/jpeg");
    let spots = document.getElementsByClassName("spot");

    while (spots[0]) spots[0].parentNode.removeChild(spots[0]);
    //clear canvas

    //var context = canvas.getContext("2d");

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.beginPath();
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
    appliedImage.onload = () => {
      let pattern = ctx.createPattern(appliedImage, "repeat");
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
        onCrop
      );
    };
  }
</script>

<div
  class="chan"
  on:click={() => {
    fileinput.click();
  }}
>
  Choose Image
</div>
<input
  style="display:none"
  type="file"
  accept=".jpg, .jpeg, .png"
  on:change={onFileSelected}
  bind:this={fileinput}
/>
<div>
  <canvas
    id="cropCanvas"
    width="300"
    height="300"
    style="position:relative;margin-left:0px;margin-top:0px;"
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
<div
  id="zoomIncrease"
  on:click={() => setZoom(zoomLevel + (zoomLevel >= 1 ? 0.5 : 0.2))}
>
  Zoom +
</div>
<div
  id="zoomDecrease"
  on:click={() => setZoom(zoomLevel - (zoomLevel > 1 ? 0.5 : 0.2))}
>
  Zoom -
</div>
<input
  type="button"
  id="crop"
  value="CROP"
  on:click={() => {
    croppedImage = cropImage();
  }}
/>

<style>
  canvas {
    box-shadow: 0 0 10px black;
    margin: 20px;
  }
</style>
