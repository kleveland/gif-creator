<script>
  import ImageImport from "./ImageImport.svelte";
  import CustomizeCanvas from './CustomizeCanvas.svelte';

  let croppedImage;
</script>

<main>
  <div id="app">
    <h1>Upload Image</h1>
    <div>
      <div id="container">
        <CustomizeCanvas croppedImage={croppedImage} />
        <ImageImport
          onCrop={(img) => {
            console.log("IMAGE", img.src);
            croppedImage = img;
          }}
        />
      </div>
    </div>
  </div>
</main>

<style>
  main {
    text-align: center;
    padding: 1em;
    max-width: 240px;
    margin: 0 auto;
  }

  h1 {
    color: #ff3e00;
    text-transform: uppercase;
    font-size: 4em;
    font-weight: 100;
  }

  canvas {
    box-shadow: 0 0 10px black;
    margin: 20px;
  }
</style>
