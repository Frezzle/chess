import initialPieces from './initialPieces';

export class Game {
  pieces = initialPieces;
  turn = 'w';

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
        // pawns have a single direction depending on their colour
        const direction = piece.colour == 'w' ? 1 : -1;
        // pawns can always move forward one space
        candidateMoves.push({
          from: { file: piece.file, rank: piece.rank },
          to: { file: piece.file, rank: piece.rank + direction },
        });
        // pawns can move forward two spaces if they have not moved before
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

    // move piece
    const pieceIndex = this.pieces.findIndex((piece) => (
      piece.file == move.from.file && piece.rank == move.from.rank));
    this.pieces[pieceIndex].file = move.to.file;
    this.pieces[pieceIndex].rank = move.to.rank;
    this.pieces[pieceIndex].moved = true;

    // TODO record the move

    // change turns
    this.turn = this.turn == 'w' ? 'b' : 'w';

    return true;
  }
}
