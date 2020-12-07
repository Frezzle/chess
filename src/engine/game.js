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

  // TODO calculate and store next valid moves on start of game and on each turn, to not repeat same recalculations on invalid move attempts.
  getNextValidMoves() {

    let candidatePieces = [...this.pieces];

    // can only move the pieces belonging to the player who's turn it is
    candidatePieces = candidatePieces.filter((piece) => piece.colour == this.turn);

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

      if (piece.type == 'n') {
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
      }

      if (piece.type == 'b') {
        // Bishop can move in any diagonal, for any number of spaces until it is either blocked
        // by a friendly piece or can take an enemy piece.
        candidateMoves = candidateMoves.concat(this.getValidDiagonalMoves(piece));
      }

      if (piece.type == 'r') {
        // Rook can move vertically and horizontally (orthogonal), for any number of spaces until
        // it is either blocked by a friendly piece or can take an enemy piece.
        candidateMoves = candidateMoves.concat(this.getValidOrthogonalMoves(piece));
      }
    });

    // TODO remove potential moves that have friendly pieces in the way (or pawn pieces blocking
    // forward movement of other pawns).

    // TODO remove potential moves that cause king to become in check

    return candidateMoves;
  }

  // getValidDiagonalMoves gets all the valid diagonal moves that the piece can make,
  // which includes the squares occupied by enemies and any square leading to those or end of board.
  getValidDiagonalMoves(piece) {
    const directions = [
      { file: 1, rank: 1 },
      { file: -1, rank: 1 },
      { file: 1, rank: -1 },
      { file: -1, rank: -1 },
    ];
    return this.getValidMovesForEachDirection(piece, directions);
  }

  // getValidOrthogonalMoves gets all the valid orthogonal (vertical and horizontal) moves that the piece can make,
  // which includes the squares occupied by enemies and any square leading to those or end of board.
  getValidOrthogonalMoves(piece) {
    const directions = [
      { file: 1, rank: 0 },
      { file: -1, rank: 0 },
      { file: 0, rank: 1 },
      { file: 0, rank: -1 },
    ];
    return this.getValidMovesForEachDirection(piece, directions);
  }

  // getValidMovesForEachDirection gets all the valid moves that the piece can make,
  // in the given directions that the piece is able to move.
  getValidMovesForEachDirection(piece, directions) {
    const from = { file: piece.file, rank: piece.rank };
    const validMoves = [];
    directions.forEach((dir) => {
      // start traversal first square that would exist in this direction
      let square = { file: piece.file + dir.file, rank: piece.rank + dir.rank };
      // traverse squares in this direction until piece blocks the way or board edge is reached
      let occupyingPiece = null;
      while (!occupyingPiece && square.file >= 1 && square.file <= 8 && square.rank >= 1 && square.rank <= 8) {
        // check for piece occupying this square
        occupyingPiece = this.board[square.file][square.rank];
        // can move to empty square, or may capture enemy piece
        if (!occupyingPiece || occupyingPiece.colour != piece.colour)
        validMoves.push({ from, to: { file: square.file, rank: square.rank }});
        // traverse to next square in this direction
        square.file += dir.file;
        square.rank += dir.rank;
      }
    });
    return validMoves;
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
