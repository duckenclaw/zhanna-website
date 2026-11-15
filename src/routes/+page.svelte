<script lang="ts">
	import CellField from '#lib/cells/CellField.svelte';
</script>

<svelte:head>
	<title>Zhanna Dudnik</title>
	<meta
		name="description"
		content="Zhanna Dudnik — portfolio, CV, prace artystyczne i modele 3D."
	/>
</svelte:head>

<h1 class="visually-hidden">Zhanna Dudnik</h1>
<CellField />

<style>
	.visually-hidden {
		position: absolute;
		width: 1px;
		height: 1px;
		overflow: hidden;
		clip-path: inset(50%);
		white-space: nowrap;
	}
</style>
