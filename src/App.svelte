<script>
  import ImageImport from "./ImageImport.svelte";
  import CustomizeCanvas from "./CustomizeCanvas.svelte";
  import GifList from "./GifList.svelte";

  let croppedImage, imageSelection;
</script>

<main class="container">
  <div id="app">
    <h1>Face GIF</h1>
    <div class="main-content">
      <div class="mdl-grid">
        <div class="mdl-cell mdl-cell--4-col mdl-cell--8-col-tablet mdl-cell--12-col-phone">
          <ImageImport bind:croppedImage />
        </div>
        <div class="mdl-cell mdl-cell--4-col mdl-cell--4-col-tablet mdl-cell--12-col-phone">
            <GifList bind:selectedOption={imageSelection} />
        </div>
        <div class="mdl-cell mdl-cell--4-col mdl-cell--4-col-tablet mdl-cell--12-col-phone">
          <CustomizeCanvas {croppedImage} {imageSelection} />
        </div>
      </div>
    </div>
  </div>
</main>

<style>
  .main-content {
    max-width: 1200px;
    margin: auto;
    text-align: center;
  }

  h1 {
    text-align: center;
  }
</style>
