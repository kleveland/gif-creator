<script>
    export let onClick;
    export let buttonText;
    export let id;
</script>

<button
class="mdl-button mdl-js-button mdl-button--raised mdl-js-ripple-effect mdl-button--colored"
role="button"
id={id}
on:click={onClick}
>
{buttonText}
</button>