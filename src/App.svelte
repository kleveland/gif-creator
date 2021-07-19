<script>
  import ImageImport from "./ImageImport.svelte";
  import CustomizeCanvas from "./CustomizeCanvas.svelte";

  let croppedImage;
</script>

<main class="container">
  <div id="app">
    <h1>Upload Image</h1>
    <div class="main-content">
      <div class="mdl-grid">
        <div class="mdl-cell mdl-cell--6-col">
          <ImageImport
            onCrop={(img) => {
              croppedImage = img;
            }}
          />
        </div>
        <div class="mdl-cell mdl-cell--6-col">
          <CustomizeCanvas {croppedImage} />
        </div>
      </div>
    </div>
  </div>
</main>

<style>
  .main-content {
    max-width: 900px;
    margin:auto;
    text-align: center;
  }
  h1 {
    color: #ff3e00;
    text-transform: uppercase;
    text-align: center;
    font-size: 4em;
    font-weight: 100;
  }
</style>
