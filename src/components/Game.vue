<template>
  <div class="game">
    <div class="board" ref="board">
      <Squares />
      <div class="piece wp square-a2"></div>
      <div class="piece wp square-b2"></div>
      <div class="piece wp square-c2"></div>
      <div class="piece wp square-d2"></div>
      <div class="piece wp square-e2"></div>
      <div class="piece wp square-f2"></div>
      <div class="piece wp square-g2"></div>
      <div class="piece wp square-h2"></div>
      <div class="piece wr square-a1"></div>
      <div class="piece wn square-b1"></div>
      <div class="piece wb square-c1"></div>
      <div class="piece wq square-d1"></div>
      <div class="piece wk square-e1"></div>
      <div class="piece wb square-f1"></div>
      <div class="piece wn square-g1"></div>
      <div class="piece wr square-h1"></div>
      <div class="piece bp square-a7"></div>
      <div class="piece bp square-b7"></div>
      <div class="piece bp square-c7"></div>
      <div class="piece bp square-d7"></div>
      <div class="piece bp square-e7"></div>
      <div class="piece bp square-f7"></div>
      <div class="piece bp square-g7"></div>
      <div class="piece bp square-h7"></div>
      <div class="piece br square-a8"></div>
      <div class="piece bn square-b8"></div>
      <div class="piece bb square-c8"></div>
      <div class="piece bq square-d8"></div>
      <div class="piece bk square-e8"></div>
      <div class="piece bb square-f8"></div>
      <div class="piece bn square-g8"></div>
      <div class="piece br square-h8"></div>
    </div>
  </div>
</template>

<script>
import Squares from "./Squares.vue";

export default {
  name: "Game",
  components: {
    Squares,
  },
  data() {
    return {
      draggingElement: null,
    };
  },
  mounted() {
    const pieces = document.getElementsByClassName('piece');
    for (const piece of pieces) {
      piece.addEventListener('mousedown', this.grabPiece);
    }
    document.addEventListener('mousemove', this.dragPiece);
    document.addEventListener('mouseup', this.dropPiece);
  },
  destroyed() {
    document.removeEventListener('mousemove', this.dragPiece);
    document.removeEventListener('mouseup', this.dropPiece);
  },
  methods: {
    grabPiece(mouseDownEvent) {
      this.draggingElement = mouseDownEvent.target;
      this.draggingElement.classList.add('dragging');
    },
    dragPiece(mouseMoveEvent) {
      if (!this.draggingElement) return;

      // get board position
      const board = this.$refs.board.getBoundingClientRect();

      // get mouse position within window
      const mouseX = mouseMoveEvent.clientX;
      const mouseY = mouseMoveEvent.clientY;

      // use piece dimensions to centre it on the cursor
      const pieceWidth = this.draggingElement.offsetWidth;
      const pieceHeight = this.draggingElement.offsetHeight;

      // calculate new position for dragged element, relative to board position
      let elementX = mouseX - board.x - (pieceWidth / 2);
      let elementY = mouseY - board.y - (pieceHeight / 2);

      // keep centre of piece within board boundary
      elementX = Math.max(Math.min(elementX, board.width - (pieceHeight / 2)), -pieceWidth / 2);
      elementY = Math.max(Math.min(elementY, board.height - (pieceHeight / 2)), -pieceWidth / 2);

      // set element position, relative to board position
      this.draggingElement.style.transform = `translate(${elementX}px, ${elementY}px)`;
    },
    dropPiece() {
      if (!this.draggingElement) return;

      this.draggingElement.classList.remove('dragging');
      this.draggingElement = null;
    },
  },
};
</script>

<style scoped lang="scss">
.game,
.board {
  user-select: none;
  position: relative;
}

.piece {
  user-select: none;
  width: 12.5%;
  height: 12.5%;
  position: absolute;
  background-repeat: no-repeat;
  background-size: contain;
  top: 0;
  left: 0;

  &:hover {
    cursor: grab;
  }
  &:active {
    cursor: grabbing;
  }

  &.dragging {
    z-index: 1;
  }
}

// images
.wk {
  background-image: url("../assets/wk.png");
}
.wq {
  background-image: url("../assets/wq.png");
}
.wb {
  background-image: url("../assets/wb.png");
}
.wn {
  background-image: url("../assets/wn.png");
}
.wr {
  background-image: url("../assets/wr.png");
}
.wp {
  background-image: url("../assets/wp.png");
}
.bk {
  background-image: url("../assets/bk.png");
}
.bq {
  background-image: url("../assets/bq.png");
}
.bb {
  background-image: url("../assets/bb.png");
}
.bn {
  background-image: url("../assets/bn.png");
}
.br {
  background-image: url("../assets/br.png");
}
.bp {
  background-image: url("../assets/bp.png");
}

// positions
.square-a1 {
  transform: translate(0%, 700%);
}
.square-a2 {
  transform: translate(0%, 600%);
}
.square-a3 {
  transform: translate(0%, 500%);
}
.square-a4 {
  transform: translate(0%, 400%);
}
.square-a5 {
  transform: translate(0%, 300%);
}
.square-a6 {
  transform: translate(0%, 200%);
}
.square-a7 {
  transform: translate(0%, 100%);
}
.square-a8 {
  transform: translate(0%, 0%);
}
.square-b1 {
  transform: translate(100%, 700%);
}
.square-b2 {
  transform: translate(100%, 600%);
}
.square-b3 {
  transform: translate(100%, 500%);
}
.square-b4 {
  transform: translate(100%, 400%);
}
.square-b5 {
  transform: translate(100%, 300%);
}
.square-b6 {
  transform: translate(100%, 200%);
}
.square-b7 {
  transform: translate(100%, 100%);
}
.square-b8 {
  transform: translate(100%, 0%);
}
.square-c1 {
  transform: translate(200%, 700%);
}
.square-c2 {
  transform: translate(200%, 600%);
}
.square-c3 {
  transform: translate(200%, 500%);
}
.square-c4 {
  transform: translate(200%, 400%);
}
.square-c5 {
  transform: translate(200%, 300%);
}
.square-c6 {
  transform: translate(200%, 200%);
}
.square-c7 {
  transform: translate(200%, 100%);
}
.square-c8 {
  transform: translate(200%, 0%);
}
.square-d1 {
  transform: translate(300%, 700%);
}
.square-d2 {
  transform: translate(300%, 600%);
}
.square-d3 {
  transform: translate(300%, 500%);
}
.square-d4 {
  transform: translate(300%, 400%);
}
.square-d5 {
  transform: translate(300%, 300%);
}
.square-d6 {
  transform: translate(300%, 200%);
}
.square-d7 {
  transform: translate(300%, 100%);
}
.square-d8 {
  transform: translate(300%, 0%);
}
.square-e1 {
  transform: translate(400%, 700%);
}
.square-e2 {
  transform: translate(400%, 600%);
}
.square-e3 {
  transform: translate(400%, 500%);
}
.square-e4 {
  transform: translate(400%, 400%);
}
.square-e5 {
  transform: translate(400%, 300%);
}
.square-e6 {
  transform: translate(400%, 200%);
}
.square-e7 {
  transform: translate(400%, 100%);
}
.square-e8 {
  transform: translate(400%, 0%);
}
.square-f1 {
  transform: translate(500%, 700%);
}
.square-f2 {
  transform: translate(500%, 600%);
}
.square-f3 {
  transform: translate(500%, 500%);
}
.square-f4 {
  transform: translate(500%, 400%);
}
.square-f5 {
  transform: translate(500%, 300%);
}
.square-f6 {
  transform: translate(500%, 200%);
}
.square-f7 {
  transform: translate(500%, 100%);
}
.square-f8 {
  transform: translate(500%, 0%);
}

.square-g1 {
  transform: translate(600%, 700%);
}
.square-g2 {
  transform: translate(600%, 600%);
}
.square-g3 {
  transform: translate(600%, 500%);
}
.square-g4 {
  transform: translate(600%, 400%);
}
.square-g5 {
  transform: translate(600%, 300%);
}
.square-g6 {
  transform: translate(600%, 200%);
}
.square-g7 {
  transform: translate(600%, 100%);
}
.square-g8 {
  transform: translate(600%, 0%);
}
.square-h1 {
  transform: translate(700%, 700%);
}
.square-h2 {
  transform: translate(700%, 600%);
}
.square-h3 {
  transform: translate(700%, 500%);
}
.square-h4 {
  transform: translate(700%, 400%);
}
.square-h5 {
  transform: translate(700%, 300%);
}
.square-h6 {
  transform: translate(700%, 200%);
}
.square-h7 {
  transform: translate(700%, 100%);
}
.square-h8 {
  transform: translate(700%, 0%);
}
</style>
