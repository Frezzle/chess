import initialPieces from './initialPieces';

export class Game {
  turn = 'w';
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

  getNextValidMoves() {

    let candidatePieces = [...this.pieces];

    // can only move the pieces belonging to the player who's turn it is
    candidatePieces = candidatePieces.filter((piece) => piece.colour == this.turn);

    // can only move pieces that have not been captured
    candidatePieces = candidatePieces.filter((piece) => !piece.captured);

    // potential next moves
    const candidateMoves = [];
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
        if (!pieceInFront && !piece.moved && !pieceAheadAhead)
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
      }
    });

    // TODO remove potential moves that have friendly pieces in the way (or pawn pieces blocking
    // forward movement of other pawns).

    // TODO remove potential moves that cause king to become in check

    return candidateMoves;
  }

  // movePiece returns true if move was valid and was performed, otherwise false.
  movePiece(move) {
    // ensure move is valid
    const validMove = this.getNextValidMoves().find((validMove) => (
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
    this.pieces[pieceIndex].moved = true;
    // ...and update board
    this.board[move.from.file][move.from.rank] = null;
    this.board[move.to.file][move.to.rank] = this.pieces[pieceIndex];

    // record the move
    this.moveHistory.push({ move, pieceMoved: this.pieces[pieceIndex], pieceCaptured });

    // change turns
    this.turn = this.oppositeColour(this.turn);

    return true;
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
    if (lastMove.pieceMoved.type != 'p') return false;
    return Math.abs(lastMove.move.to.rank - lastMove.move.from.rank) == 2;
  }
}
