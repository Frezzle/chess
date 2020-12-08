import cloneDeep from 'lodash/cloneDeep';
import initialPieces from './initialPieces';

export class Game {
  turn = 'w';
  check = false; // current turn's king is in check or not
  moveHistory = [];
  // pieces and board reference each other, to make code simpler and faster hopefully
  pieces = initialPieces;
  board; // 9x9 2D array (1st of each array is not used, for easy 1-8 file/rank indexing)
  
  constructor() {
    const empty = [null, null, null, null, null, null, null, null, null];
    this.board = empty.map(() => [...empty]);
    for (let i = 0; i < this.pieces.length; ++i)
      this.board[this.pieces[i].file][this.pieces[i].rank] = this.pieces[i];
  }

  clone() {
    // TODO would be nice to have my own clone method... fewer dependencies.
    // const game = new Game();
    // game.turn = this.turn;
    // game.check = this.check;
    // game.moveHistory = this.moveHistory.map((m) => ({...m}));
    // game.pieces = this.pieces.map((m) => ({...m}));
    // for (let i = 0; i < game.pieces.length; ++i)
    //   game.board[game.pieces[i].file][game.pieces[i].rank] = game.pieces[i];
    // return game;
    return cloneDeep(this);
  }

    // colour defaults to whose turn it is, if not provided
    if (!colour) colour = this.turn;

    let candidatePieces = [...this.pieces];

    // can only move the pieces with the relevant colour
    candidatePieces = candidatePieces.filter((piece) => piece.colour == colour);

    // can only move pieces that have not been captured
    candidatePieces = candidatePieces.filter((piece) => !piece.captured);

    // potential next moves
    let candidateMoves = [];
    candidatePieces.forEach((piece) => {
      const from = { file: piece.file, rank: piece.rank };
      if (piece.type == 'p') {
        // pawn has a single direction depending on its colour
        const direction = piece.colour == 'w' ? 1 : -1;
        // pawn can move forward one space if nothing is in its way
        const pieceInFront = this.board[piece.file][piece.rank + direction];
        if (!pieceInFront)
          candidateMoves.push({ from, to: { file: piece.file, rank: piece.rank + direction }});
        // pawn can move forward two spaces if it never moved AND nothing is in its way
        const rankAheadAhead = piece.rank + 2 * direction;
        const pieceAheadAhead = rankAheadAhead >= 1 && rankAheadAhead <= 8 ? this.board[piece.file][rankAheadAhead] : null;
        if (!pieceInFront && piece.moves == 0 && !pieceAheadAhead)
          candidateMoves.push({ from, to: { file: piece.file, rank: rankAheadAhead }});
        // pawn can take enemy piece in either space diagonally forward
        const diagonalPiece1 = piece.file - 1 >= 1 ? this.board[piece.file - 1][piece.rank + direction] : null;
        const diagonalPiece2 = piece.file + 1 <= 8 ? this.board[piece.file + 1][piece.rank + direction] : null;
        if (diagonalPiece1 && diagonalPiece1.colour != piece.colour)
          candidateMoves.push({ from, to: { file: diagonalPiece1.file, rank: diagonalPiece1.rank }});
        if (diagonalPiece2 && diagonalPiece2.colour != piece.colour)
          candidateMoves.push({ from, to: { file: diagonalPiece2.file, rank: diagonalPiece2.rank }});
        // en passant
        if (this.lastMoveWasPawnDoubleJump()) {
          const lastMove = this.getLastMove();
          const besidePiece1 = piece.file - 1 >= 1 ? this.board[piece.file - 1][piece.rank] : null;
          const besidePiece2 = piece.file + 1 <= 8 ? this.board[piece.file + 1][piece.rank] : null;
          if (besidePiece1 && besidePiece1.colour != piece.colour && besidePiece1.file == lastMove.move.to.file)
            candidateMoves.push({ from, to: { file: besidePiece1.file, rank: besidePiece1.rank + direction }});
          if (besidePiece2 && besidePiece2.colour != piece.colour && besidePiece2.file == lastMove.move.to.file)
            candidateMoves.push({ from, to: { file: besidePiece2.file, rank: besidePiece2.rank + direction }});
        }
      } else if (piece.type == 'n') {
        // knight has 8 possible locations it can move to, each an L-shape from its current square
        const self = this;
        [
          { file: piece.file - 1, rank: piece.rank - 2}, // up 2 left 1
          { file: piece.file + 1, rank: piece.rank - 2}, // up 2 right 1
          { file: piece.file - 1, rank: piece.rank + 2}, // down 2 left 1
          { file: piece.file + 1, rank: piece.rank + 2}, // down 2 right 1
          { file: piece.file - 2, rank: piece.rank - 1}, // left 2 up 1
          { file: piece.file - 2, rank: piece.rank + 1}, // left 2 down 1
          { file: piece.file + 2, rank: piece.rank - 1}, // right 2 up 1
          { file: piece.file + 2, rank: piece.rank + 1}, // right 2 down 1
        ].forEach((square) => {
          // square must be on the board!
          if (square.file > 8 || square.file < 1 || square.rank > 8 || square.rank < 1) return;
          // knight cannot move to square occupied by another friendly piece
          const pieceOnSquare = self.board[square.file][square.rank];
          if (pieceOnSquare && pieceOnSquare.colour == piece.colour) return;
          // square is empty or has enemy piece on it
          candidateMoves.push({ from, to: { file: square.file, rank: square.rank }});
        })
      } else if (piece.type == 'b') {
        // Bishop can move in any diagonal, for any number of spaces until it is either blocked
        // by a friendly piece or can take an enemy piece.
        candidateMoves = candidateMoves.concat(this.getValidDiagonalMoves(piece));
      } else if (piece.type == 'r') {
        // Rook can move vertically and horizontally (orthogonal), for any number of spaces until
        // it is either blocked by a friendly piece or can take an enemy piece.
        candidateMoves = candidateMoves.concat(this.getValidOrthogonalMoves(piece));
      } else if (piece.type == 'q') {
        // Queen can move like a rook and a bishop.
        candidateMoves = candidateMoves.concat(this.getValidDiagonalMoves(piece));
        candidateMoves = candidateMoves.concat(this.getValidOrthogonalMoves(piece));
      } else if (piece.type == 'k') {
        // King can move like a queen, but only one square at a time.
        candidateMoves = candidateMoves.concat(this.getValidDiagonalMoves(piece, 1));
        candidateMoves = candidateMoves.concat(this.getValidOrthogonalMoves(piece, 1));
      }
    });

    // TODO remove potential moves that cause king to become/remain in check

    return candidateMoves;
  }

  // getValidDiagonalMoves gets all the valid diagonal moves that the piece can make,
  // which includes the squares occupied by enemies and any square leading to those or end of board.
  getValidDiagonalMoves(piece, limitPerDirection = 100) {
    const directions = [
      { file: 1, rank: 1 },
      { file: -1, rank: 1 },
      { file: 1, rank: -1 },
      { file: -1, rank: -1 },
    ];
    return this.getValidMovesForEachDirection(piece, directions, limitPerDirection);
  }

  // getValidOrthogonalMoves gets all the valid orthogonal (vertical and horizontal) moves that the piece can make,
  // which includes the squares occupied by enemies and any square leading to those or end of board.
  getValidOrthogonalMoves(piece, limitPerDirection = 100) {
    const directions = [
      { file: 1, rank: 0 },
      { file: -1, rank: 0 },
      { file: 0, rank: 1 },
      { file: 0, rank: -1 },
    ];
    return this.getValidMovesForEachDirection(piece, directions, limitPerDirection);
  }

  // getValidMovesForEachDirection gets all the valid moves that the piece can make,
  // in the given directions that the piece is able to move,
  // up to a limited distance (number of times the direction is applied to traverse the range
  // of squares in each direction).
  getValidMovesForEachDirection(piece, directions, limitPerDirection) {
    const from = { file: piece.file, rank: piece.rank };
    const validMoves = [];
    directions.forEach((dir) => {
      // start traversal first square that would exist in this direction
      let square = { file: piece.file + dir.file, rank: piece.rank + dir.rank };
      // traverse squares in this direction until piece blocks the way or board edge is reached
      let occupyingPiece = null;
      let traversed = 0;
      while (
            traversed < limitPerDirection
            && !occupyingPiece
            && square.file >= 1 && square.file <= 8 && square.rank >= 1 && square.rank <= 8
          ) {
        // check for piece occupying this square
        occupyingPiece = this.board[square.file][square.rank];
        // can move to empty square, or may capture enemy piece
        if (!occupyingPiece || occupyingPiece.colour != piece.colour)
        validMoves.push({ from, to: { file: square.file, rank: square.rank }});
        // traverse to next square in this direction
        square.file += dir.file;
        square.rank += dir.rank;
        ++traversed;
      }
    });
    return validMoves;
  }

  // movePiece returns true if move was valid and was performed, otherwise false.
  movePiece(move) {
    // ensure move is valid
    const validMove = this.getNextValidMoves(this.turn).find((validMove) => (
      validMove.from.file == move.from.file &&
      validMove.to.file == move.to.file &&
      validMove.from.rank == move.from.rank &&
      validMove.to.rank == move.to.rank
    ));
    if (!validMove) return false;

    const pieceIndex = this.pieces.findIndex((piece) => (
      !piece.captured && piece.file == move.from.file && piece.rank == move.from.rank));

    // capture enemy piece on destination square, or behind pawn on en passant
    let pieceCaptured;
    let enemyPieceIndex = this.pieces.findIndex((piece) => (
      !piece.captured && piece.file == move.to.file && piece.rank == move.to.rank));
    if (enemyPieceIndex < 0 && this.pieces[pieceIndex].type == 'p' && move.from.file != move.to.file) {
      // if no enemy was captured on the destination square, and this is a pawn moving diagonally,
      // then an enemy behind the pawn must be an en passant capture.
      const direction = this.turn == 'w' ? 1 : -1;
      enemyPieceIndex = this.pieces.findIndex((piece) => (
        !piece.captured && piece.file == move.to.file && piece.rank == move.to.rank - direction));
    }
    if (enemyPieceIndex >= 0) {
      pieceCaptured = this.pieces[enemyPieceIndex];
      // capture piece...
      this.pieces[enemyPieceIndex].captured = true;
      // ...and update board
      this.board[pieceCaptured.file][pieceCaptured.rank] = null;
    }

    // move piece...
    this.pieces[pieceIndex].file = move.to.file;
    this.pieces[pieceIndex].rank = move.to.rank;
    this.pieces[pieceIndex].moves++;
    // ...and update board
    this.board[move.from.file][move.from.rank] = null;
    this.board[move.to.file][move.to.rank] = this.pieces[pieceIndex];

    // see if enemy king is now in check...
    this.check = this.kingIsInCheck(this.oppositeColour(this.turn));

    // record the move
    this.moveHistory.push({
      move,
      pieceMovedIndex: pieceIndex,
      pieceCapturedIndex: enemyPieceIndex,
      check: this.check,
    });

    // change turns
    this.turn = this.oppositeColour(this.turn);

    return true;
  }

  undoLastMove() {
    if (this.moveHistory.length == 0) {
      this.check = false;
      return { pieceMovedBack: null, pieceResurrected: null };
    }

    // delete the last move from history
    const lastMove = this.moveHistory.pop();

    // put the moved piece back...
    this.pieces[lastMove.pieceMovedIndex].file = lastMove.move.from.file;
    this.pieces[lastMove.pieceMovedIndex].rank = lastMove.move.from.rank;
    this.pieces[lastMove.pieceMovedIndex].moves--;
    // ...and update board
    this.board[lastMove.move.from.file][lastMove.move.from.rank] = this.pieces[lastMove.pieceMovedIndex];
    this.board[lastMove.move.to.file][lastMove.move.to.rank] = null;

    // if a piece was captured on the last move...
    if (lastMove.pieceCapturedIndex >= 0) {
      // ...then resurrect it...
      this.pieces[lastMove.pieceCapturedIndex].captured = false;
      // ...and place it back on the board (the piece's file/rank should be where it was captured)
      const resurrectingPiece = this.pieces[lastMove.pieceCapturedIndex];
      this.board[resurrectingPiece.file][resurrectingPiece.rank] = resurrectingPiece;
    }

    // restore previous check status
    const moveBeforeLast = this.getLastMove();
    this.check = moveBeforeLast ? moveBeforeLast.check : false;

    // change turns
    this.turn = this.oppositeColour(this.turn);

    // return affected pieces, allowing any interface to reverse too
    return {
      pieceMovedBack: this.pieces[lastMove.pieceMovedIndex],
      pieceResurrected: lastMove.pieceCapturedIndex >= 0 ? this.pieces[lastMove.pieceCapturedIndex] : null,
    };
  }

  kingIsInCheck(kingColour) {
    const king = this.pieces.find((piece) => (
      piece.type == 'k' && piece.colour == kingColour
    ));
    if (!king) return false; // it should always return a king in normal chess

    // get the other side's possible moves, assuming they can move next
    const enemyMoves = this.getNextValidMoves(this.oppositeColour(kingColour));

    // if one of their moves is to move to the king's square then the king is in check
    const kingThreatened = enemyMoves.some((move) => (
      move.to.file == king.file && move.to.rank == king.rank
    ));
    return kingThreatened;
  }

  oppositeColour(colour) {
    return colour == 'w' ? 'b' : 'w';
  }

  getLastMove() {
    if (this.moveHistory.length == 0) return null;
    return this.moveHistory[this.moveHistory.length - 1];
  }

  lastMoveWasPawnDoubleJump() {
    const lastMove = this.getLastMove();
    if (!lastMove) return false;
    const lastMovedPiece = this.pieces[lastMove.pieceMovedIndex];
    if (lastMovedPiece.type != 'p') return false;
    return Math.abs(lastMove.move.to.rank - lastMove.move.from.rank) == 2;
  }
}
