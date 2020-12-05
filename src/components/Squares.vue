<template>
  <div class="squares-wrapper">
    <div class="squares" :style="{ width: boardSizePixels + 'px', height: boardSizePixels + 'px'}">
      <div
        v-for="square in squares"
        :key="square.location"
        :class="['square', square.colour]"
      ></div>
    </div>
    <div v-for="style in hintStyles" :key="JSON.stringify(style)" class="arrow" :style="style.arrow">
      <div class="arrow-head" :style="style.arrowHead"></div>
    </div>
  </div>
</template>

<script>
export default {
  name: "Squares",
  props: {
    boardSizePixels: {
      Type: Number,
      default: 400,
    },
    moveHints: {
      type: Array,
      default: () => [],
    },
  },
  computed: {
    squares() {
      const squares = [];
      for (let i = 0, rank = 8; rank > 0; --rank)
        for (let file = 1; file <= 8; ++file, ++i)
          squares.push({
            colour: (i + Math.floor(i/8)) % 2 === 0 ? 'light' : 'dark',
            location: `${file}${rank}`,
          });
      return squares;
    },
    squareSizePixels() {
      return this.boardSizePixels / 8;
    },
    hintStyles() {
      return this.moveHints.map((h) => {
        // initial estimate of arrow bounding box (may change below if the arrow is horizontal or vertical)
        let topPixels = (8 - Math.max(h.from.rank, h.to.rank)) * this.squareSizePixels + this.squareSizePixels / 2;
        let leftPixels = (Math.min(h.from.file, h.to.file) - 1) * this.squareSizePixels + this.squareSizePixels / 2;
        let widthPixels = Math.abs(h.to.file - h.from.file) * this.squareSizePixels;
        let heightPixels = Math.abs(h.to.rank - h.from.rank) * this.squareSizePixels;

        // calculate arrow angle
        let angleDegrees;
        const arrowMinPixels = 50;
        let arrowHeadTopPercent;
        let arrowHeadLeftPercent;
        if (widthPixels == 0) {
          // ensure arrow has some width if it's vertical
          angleDegrees = 90;
          leftPixels -= arrowMinPixels / 2;
          widthPixels = arrowMinPixels;
          arrowHeadTopPercent = h.from.rank < h.to.rank ? 0 : 100;
          arrowHeadLeftPercent = 50;
        } else if (heightPixels == 0) {
          // ensure arrow has some height if it's horizontal
          angleDegrees = 0;
          topPixels -= arrowMinPixels / 2;
          heightPixels = arrowMinPixels;
          arrowHeadTopPercent = 50;
          arrowHeadLeftPercent = h.from.file < h.to.file ? 100 : 0;
        } else {
          angleDegrees = Math.atan2(h.to.file - h.from.file, h.to.rank - h.from.rank) * 180 / Math.PI + 90;
          arrowHeadTopPercent = h.from.rank < h.to.rank ? 0 : 100;
          arrowHeadLeftPercent = h.from.file < h.to.file ? 100 : 0;
        }

        return {
          arrow: {
            top: `${topPixels}px`,
            left: `${leftPixels}px`,
            width: `${widthPixels}px`,
            height: `${heightPixels}px`,
            background: `linear-gradient(${angleDegrees}deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0) calc(50% - 3px), rgba(255,255,255,1) calc(50% - 2px), rgba(59,166,59,1) 50%, rgba(255,255,255,1) calc(50% + 2px), rgba(255,255,255,0) calc(50% + 3px), rgba(255,255,255,0) 100%)`,
          },
          arrowHead: {
            top: `${arrowHeadTopPercent}%`,
            left: `${arrowHeadLeftPercent}%`,
          },
        };
      });
    },
  },
  
};
</script>

<style scoped lang="scss">
.squares {
  user-select: none;
  display: grid;
  grid-template-rows: repeat(8, 1fr);
  grid-template-columns: repeat(8, 1fr);
}

.square {
  user-select: none;

  &.light {
    background-color: burlywood;
  }
  &.dark {
    background-color: brown;
  }
}

.arrow {
  position: absolute;
}

.arrow-head {
  position: absolute;
  width: 10px;
  height: 10px;
  transform: translate(-50%, -50%); // centre the head in its x and y position
  background-color: rgb(59,166,59);
  border: 2px solid white;
  box-sizing: border-box;
  border-radius: 50%;
}
</style>
