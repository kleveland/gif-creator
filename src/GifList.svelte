<script>
  import * as gifList from "./giflist";
  import Button from './Button.svelte';
  const gifListEntries = Object.entries(gifList);
  export let selectedOption = 'partyParrot';
  export let step;

  function submitGif() {
    step = 2;
  }
</script>

<div class="gif-list-container mdl-card mdl-shadow--2dp">
    
    <div class="mdl-card__title">
        <h2 class="mdl-card__title-text">2. Pick</h2>
      </div>
<ul class="mdl-list">
  {#each gifListEntries as gif, i}
    <li class="mdl-list__item">
      <span class="mdl-list__item-primary-content">
        <img
          class="gif-preview-image"
          src={`${gif[0]}/0.gif`}
          alt={`${gif[0]}-preview`}
        />
        {gif[1].name}
      </span>
      <span class="mdl-list__item-secondary-action">
        <label
          class="demo-list-radio mdl-radio mdl-js-radio mdl-js-ripple-effect"
          for="gif-option-{i}"
        >
          <input
            type="radio"
            id="gif-option-{i}"
            class="mdl-radio__button"
            name="gifselect"
            value={gif[0]}
            bind:group={selectedOption}
          />
        </label>
      </span>
    </li>
  {/each}
</ul>
</div>
<style>
.gif-list-container {
    width: 100%;
}

.mdl-card__title {
    justify-content: center;
  }
  .gif-preview-image {
    width: 36px;
    height: auto;
  }
</style>
