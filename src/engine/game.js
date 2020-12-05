import initialPieces from './initialPieces';

export class Game {
  turn = 'w';
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
      if (piece.type == 'p') {
        // pawn has a single direction depending on its colour
        const direction = piece.colour == 'w' ? 1 : -1;
        // pawn cannot move forward one space if that space is occupied
        if (this.board[piece.file][piece.rank + direction]) return;
        // pawn can always move forward one space
        candidateMoves.push({
          from: { file: piece.file, rank: piece.rank },
          to: { file: piece.file, rank: piece.rank + direction },
        });
        // pawn cannot move forward two spaces if that space is occupied
        if (this.board[piece.file][piece.rank + 2 * direction]) return;
        // pawn can move forward two spaces if it has not moved before
        if (!piece.moved)
          candidateMoves.push({
            from: { file: piece.file, rank: piece.rank },
            to: { file: piece.file, rank: piece.rank + 2 * direction },
          });
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

    // TODO take enemy piece which may be there already

    // move piece...
    const pieceIndex = this.pieces.findIndex((piece) => (
      piece.file == move.from.file && piece.rank == move.from.rank));
    this.pieces[pieceIndex].file = move.to.file;
    this.pieces[pieceIndex].rank = move.to.rank;
    this.pieces[pieceIndex].moved = true;
    // ...and update board
    this.board[move.from.file][move.from.rank] = null;
    this.board[move.to.file][move.to.rank] = this.pieces[pieceIndex];

    // TODO record the move

    // change turns
    this.turn = this.turn == 'w' ? 'b' : 'w';

    return true;
  }
}
