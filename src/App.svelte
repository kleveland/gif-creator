<script>
  import ImageImport from "./ImageImport.svelte";
  import CustomizeCanvas from "./CustomizeCanvas.svelte";

  let croppedImage;
</script>

<main>
  <div id="app">
    <h1>Upload Image</h1>
    <div>
      <div class="generate-image-container" id="container">
        <ImageImport
          onCrop={(img) => {
            croppedImage = img;
          }}
        />
        <CustomizeCanvas {croppedImage} />
      </div>
    </div>
  </div>
</main>

<style>
  .generate-image-container {
    display: flex;
  }

  h1 {
    color: #ff3e00;
    text-transform: uppercase;
    font-size: 4em;
    font-weight: 100;
  }
</style>
