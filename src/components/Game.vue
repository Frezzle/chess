<template>
  <div class="game">
    <button @click="undoMove">UNDO</button>
    <span>  Check: <b>{{ check }}</b></span>
    <span> Result: <b>{{ result ? result : 'in progress' }}</b></span>
    <div class="board" ref="board">
      <Squares :moveHints="nextLegalMoves" :promotionSquares="promotionSquares" />
      <div
        v-for="(piece, i) in pieces"
        :key="i"
        :class="[
          'piece',
          `${piece.colour}${piece.type}`,
          {
            [`square-${piece.file}${piece.rank}`]: !piece.captured,
            captured: piece.captured,
          },
        ]"
      ></div>
      <div
        :class="['promotion-selection', {hidden: !promotionSelectionFile}]"
        :style="{
          transform: `translateX(${(promotionSelectionFile - 1) * 100}%)`,
        }"
      >
        <div
          v-for="option in ['q', 'n', 'r', 'b']"
          :key="`${game.turn}${option}`"
          :class="['promotion-option', `${game.turn}${option}`]"
          @click="selectPromotion(option)"
        ></div>
        <div class="promotion-cancel" @click="cancelPromotion"><span>x</span></div>
      </div>
    </div>
  </div>
</template>

<script>
import { Game } from '../engine';
import Squares from "./Squares.vue";

export default {
  name: "Game",
  components: {
    Squares,
  },
  data() {
    const game = new Game();
    return {
      game,
      draggingElement: null,
      promotionMove: null, // to temporarily store the move that will be attempted after player confirms pawn promotion choice.
      promotionSelectionFile: null, // null to hide, otherwise 1-8 to position
      // TODO can the fields below be computed props rather than data?
      pieces: game.pieces,
      nextLegalMoves: game.nextLegalMoves,
      check: false,
      result: null,
    };
  },
  computed: {
    draggingPiece() {
      if (!this.draggingElement) return null;
      return this.pieces.find((piece) => (
        this.draggingElement.classList.contains(`square-${piece.file}${piece.rank}`)
      ));
    },
    promotionSquares() {
      return this.game.promotionSquares[this.game.turn];
    },
  },
  mounted() {
    const pieceElements = document.getElementsByClassName('piece');
    for (const pieceElement of pieceElements) {
      pieceElement.addEventListener('mousedown', this.grabPiece);
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
      this.centrePieceOnCursor(mouseDownEvent.clientX, mouseDownEvent.clientY);
    },
    dragPiece(mouseMoveEvent) {
      if (!this.draggingElement) return;

      this.centrePieceOnCursor(mouseMoveEvent.clientX, mouseMoveEvent.clientY);
    },
    dropPiece(mouseUpEvent) {
      if (!this.draggingElement) return;

      // for now, simple snap piece to the square it lands on
      this.snapPieceToClosestSquare(mouseUpEvent.clientX, mouseUpEvent.clientY);

      this.draggingElement.classList.remove('dragging');
      this.draggingElement.style.transform = null;
      this.draggingElement = null;
    },
    centrePieceOnCursor(mouseClientX, mouseClientY) {
      // get board position
      const board = this.$refs.board.getBoundingClientRect();

      // use piece dimensions to centre it on the cursor
      const pieceWidth = this.draggingElement.offsetWidth;
      const pieceHeight = this.draggingElement.offsetHeight;

      // calculate new position for dragged element, relative to board position
      let elementX = mouseClientX - board.x - (pieceWidth / 2);
      let elementY = mouseClientY - board.y - (pieceHeight / 2);

      // keep centre of piece within board boundary
      elementX = Math.max(Math.min(elementX, board.width - (pieceHeight / 2)), -pieceWidth / 2);
      elementY = Math.max(Math.min(elementY, board.height - (pieceHeight / 2)), -pieceWidth / 2);

      // set element position, relative to board position
      this.draggingElement.style.transform = `translate(${elementX}px, ${elementY}px)`;
    },
    snapPieceToClosestSquare(mouseClientX, mouseClientY) {
      // get board position
      const board = this.$refs.board.getBoundingClientRect();

      // calculate cursor position on board
      const cursorBoardX = mouseClientX - board.x;
      const cursorBoardY = mouseClientY - board.y;

      // get square dimensions
      const squareWidth = board.width / 8;
      const squareHeight = board.height / 8;

      // calculate the closest rank
      let rank = 8 - Math.floor(cursorBoardY / squareHeight);
      rank = Math.max(Math.min(rank, 8), 1); // just in case, keep between 1 and 8

      // calculate the closest file
      let file = 1 + Math.floor(cursorBoardX / squareWidth);
      file = Math.max(Math.min(file, 8), 1); // just in case, keep between 1 and 8 (a and h)

      // allow moving piece back to its original square
      if (this.draggingPiece.file == file && this.draggingPiece.rank == rank) return;

      // construct move
      const move = {
        from: { file: this.draggingPiece.file, rank: this.draggingPiece.rank },
        to: { file, rank },
      };

      // if pawn moved onto a promotion square then prompt user to choose promotion, otherwise confirm the move now
      if (this.draggingPiece.type == 'p' && this.game.isPromotionSquare(this.game.turn, file, rank)) {
        this.promptPromotionBeforeMove(move);
      } else {
        this.confirmMove(move);
      }
    },
    promptPromotionBeforeMove(move) {
      // store move for later confirmation
      this.promotionMove = move;
      // make promotion selection visible at the location where pawn will move to once promoted
      this.promotionSelectionFile = move.to.file;
    },
    cancelPromotion() {
      // clear temporary promotion move
      this.promotionMove = null;
      // hide promotion selection
      this.promotionSelectionFile = null;
    },
    selectPromotion(option) {
      this.confirmMove(this.promotionMove, option);
      // clear temporary promotion move
      this.promotionMove = null;
      // hide promotion selection
      this.promotionSelectionFile = null;
    },
    confirmMove(move, promotion = null) {
      // try the move
      const moved = this.game.movePiece(move, false, false, promotion);
      if (!moved) return;

      this.updateGameState();
    },
    undoMove() {
      this.game.undoLastMove();
      this.updateGameState();
    },
    updateGameState() {
      // update game state with new engine state
      this.pieces = this.game.pieces;
      this.nextLegalMoves = this.game.nextLegalMoves;
      this.check = this.game.check;
      this.result = this.game.result;
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

  &.dragging {
    cursor: grabbing;
    z-index: 1;
  }

  &.captured {
    display: none;
  }
}

// pawn promotion
.promotion-selection {
  user-select: none;
  width: 12.5%;
  height: calc(100% * (4.5 / 8)); // to fit 4/8 squares and half-square sized cross
  display: flex;
  flex-direction: column;
  background-color: whitesmoke;
  position: absolute;
  top: 0;
  left: 0;
}
.promotion-option {
  user-select: none;
  width: 100%;
  height: calc(100% * (2 / 9));
  background-repeat: no-repeat;
  background-size: contain;
  cursor: pointer;

  &:hover {
    background-color: lightgray;
  }
}
.promotion-cancel {
  user-select: none;
  width: 100%;
  height: calc(100% * (1 / 9));
  background-color: rgb(235, 235, 235);
  color: gray;
  font-weight: 900;
  display: grid;
  place-items: center;
  cursor: pointer;

  &:hover {
    background-color: lightgray;
  }
}

.hidden {
  visibility: hidden;
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
.square-11 {
  transform: translate(0%, 700%);
}
.square-12 {
  transform: translate(0%, 600%);
}
.square-13 {
  transform: translate(0%, 500%);
}
.square-14 {
  transform: translate(0%, 400%);
}
.square-15 {
  transform: translate(0%, 300%);
}
.square-16 {
  transform: translate(0%, 200%);
}
.square-17 {
  transform: translate(0%, 100%);
}
.square-18 {
  transform: translate(0%, 0%);
}
.square-21 {
  transform: translate(100%, 700%);
}
.square-22 {
  transform: translate(100%, 600%);
}
.square-23 {
  transform: translate(100%, 500%);
}
.square-24 {
  transform: translate(100%, 400%);
}
.square-25 {
  transform: translate(100%, 300%);
}
.square-26 {
  transform: translate(100%, 200%);
}
.square-27 {
  transform: translate(100%, 100%);
}
.square-28 {
  transform: translate(100%, 0%);
}
.square-31 {
  transform: translate(200%, 700%);
}
.square-32 {
  transform: translate(200%, 600%);
}
.square-33 {
  transform: translate(200%, 500%);
}
.square-34 {
  transform: translate(200%, 400%);
}
.square-35 {
  transform: translate(200%, 300%);
}
.square-36 {
  transform: translate(200%, 200%);
}
.square-37 {
  transform: translate(200%, 100%);
}
.square-38 {
  transform: translate(200%, 0%);
}
.square-41 {
  transform: translate(300%, 700%);
}
.square-42 {
  transform: translate(300%, 600%);
}
.square-43 {
  transform: translate(300%, 500%);
}
.square-44 {
  transform: translate(300%, 400%);
}
.square-45 {
  transform: translate(300%, 300%);
}
.square-46 {
  transform: translate(300%, 200%);
}
.square-47 {
  transform: translate(300%, 100%);
}
.square-48 {
  transform: translate(300%, 0%);
}
.square-51 {
  transform: translate(400%, 700%);
}
.square-52 {
  transform: translate(400%, 600%);
}
.square-53 {
  transform: translate(400%, 500%);
}
.square-54 {
  transform: translate(400%, 400%);
}
.square-55 {
  transform: translate(400%, 300%);
}
.square-56 {
  transform: translate(400%, 200%);
}
.square-57 {
  transform: translate(400%, 100%);
}
.square-58 {
  transform: translate(400%, 0%);
}
.square-61 {
  transform: translate(500%, 700%);
}
.square-62 {
  transform: translate(500%, 600%);
}
.square-63 {
  transform: translate(500%, 500%);
}
.square-64 {
  transform: translate(500%, 400%);
}
.square-65 {
  transform: translate(500%, 300%);
}
.square-66 {
  transform: translate(500%, 200%);
}
.square-67 {
  transform: translate(500%, 100%);
}
.square-68 {
  transform: translate(500%, 0%);
}
.square-71 {
  transform: translate(600%, 700%);
}
.square-72 {
  transform: translate(600%, 600%);
}
.square-73 {
  transform: translate(600%, 500%);
}
.square-74 {
  transform: translate(600%, 400%);
}
.square-75 {
  transform: translate(600%, 300%);
}
.square-76 {
  transform: translate(600%, 200%);
}
.square-77 {
  transform: translate(600%, 100%);
}
.square-78 {
  transform: translate(600%, 0%);
}
.square-81 {
  transform: translate(700%, 700%);
}
.square-82 {
  transform: translate(700%, 600%);
}
.square-83 {
  transform: translate(700%, 500%);
}
.square-84 {
  transform: translate(700%, 400%);
}
.square-85 {
  transform: translate(700%, 300%);
}
.square-86 {
  transform: translate(700%, 200%);
}
.square-87 {
  transform: translate(700%, 100%);
}
.square-88 {
  transform: translate(700%, 0%);
}
</style>
