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
