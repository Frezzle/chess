<template>
  <div class="board">
    <div :class="[
      'square',
      {
        light: (i + Math.floor(i/8)) % 2 === 0,
        dark: (i + Math.floor(i/8)) % 2 === 1,
      },
    ]"
    v-for="(n, i) in 64" :key="i"></div>
  </div>
</template>

<script>
export default {
  name: "Board",
};
</script>

<style scoped lang="scss">
.board {
  display: grid;
  grid-template-rows: repeat(8, 1fr);
  grid-template-columns: repeat(8, 1fr);
  width: 400px;
  height: 400px;
}

.square {
  &.light {
    background-color: burlywood;
  }
  &.dark {
    background-color: brown;
  }
}
</style>
