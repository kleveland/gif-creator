<script>
  import ImageImport from "./ImageImport.svelte";
  import CustomizeCanvas from "./CustomizeCanvas.svelte";
  import GifList from "./GifList.svelte";
	import { scale} from 'svelte/transition';
  let step = 1;
  let croppedImage = null, imageSelection;
</script>

<main class="container">
  <div id="app">
    <h1>Face GIF</h1>
    <div class="main-content">
      <div class="mdl-grid">
        {#if step === 1}
          <div
          in:scale="{{duration: 500, delay: 500 }}" out:scale="{{duration: 500 }}" class="mdl-cell mdl-cell--12-col mdl-cell--12-col-tablet mdl-cell--12-col-phone"
          >
            <ImageImport bind:step  bind:croppedImage />
          </div>
        {:else if step === 2}
          <div
          in:scale="{{duration: 500, delay: 500 }}" out:scale="{{duration: 500 }}" class="mdl-cell mdl-cell--6-col mdl-cell--12-col-tablet mdl-cell--12-col-phone"
          >
            <GifList bind:step  bind:selectedOption={imageSelection} />
          </div>
          <div
          in:scale="{{duration: 500, delay: 500 }}" out:scale="{{duration: 500 }}" class="mdl-cell mdl-cell--6-col mdl-cell--12-col-tablet mdl-cell--12-col-phone"
          >
            <CustomizeCanvas bind:step {croppedImage} {imageSelection} />
          </div>
        {/if}
      </div>
    </div>
  </div>
</main>

<style>
  .main-content {
    max-width: 800px;
    margin: auto;
    text-align: center;
  }

  h1 {
    text-align: center;
  }
</style>
