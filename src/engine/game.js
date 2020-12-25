import cloneDeep from 'lodash/cloneDeep';
import initialPieces from './initialPieces';

// TODO later: fix warning happening on console for pawn(?) not moving when it was apparently supposed to.
// It doesn't seem to be causing issue AFAICT, so leaving it for now, but maybe there's a hidden bug here...

// TODO fix checks; seems to be broken / regressed at some point...

export class Game {
  turn = 'w';
  check = false; // current turn's king is in check or not
  result = null;
  moveHistory = [];
  // pieces and board reference each other, to make code simpler and faster hopefully
  pieces = initialPieces;
  board; // 9x9 2D array (1st of each array is not used, for easy 1-8 file/rank indexing)
  nextLegalMoves = [];
  promotionSquares = {
    'w': [
      {file: 1, rank: 8},
      {file: 2, rank: 8},
      {file: 3, rank: 8},
      {file: 4, rank: 8},
      {file: 5, rank: 8},
      {file: 6, rank: 8},
      {file: 7, rank: 8},
      {file: 8, rank: 8},
    ],
    'b': [
      {file: 1, rank: 1},
      {file: 2, rank: 1},
      {file: 3, rank: 1},
      {file: 4, rank: 1},
      {file: 5, rank: 1},
      {file: 6, rank: 1},
      {file: 7, rank: 1},
      {file: 8, rank: 1},
    ],
  };
  
  constructor() {
    const empty = [null, null, null, null, null, null, null, null, null];
    this.board = empty.map(() => [...empty]);
    for (let i = 0; i < this.pieces.length; ++i)
      this.board[this.pieces[i].file][this.pieces[i].rank] = this.pieces[i];
    this.updateNextLegalMoves();
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

  updateNextLegalMoves() {
    // start with the potential moves that each piece could make
    const candidateMoves = this.getThreateningMoves(this.turn);

    // remove potential moves that cause king to remain/get-into check
    const legalMoves = [];
    const clone = this.clone();
    candidateMoves.forEach((move) => {
      // ...by making each candidate move temporarily...
      const moved = clone.movePiece(move, true, true);
      if (!moved) console.error('piece did not move; it should always have moved! :O');
      // ...then checking if it puts/keeps the king in check (if it does not then it's legal)...
      if (!clone.kingIsInCheck(clone.oppositeColour(clone.turn))) legalMoves.push(move);
      // ...then reversing the move
      clone.undoLastMove(true);
    });

    // update game result...
    const livePieces = this.pieces.filter((p) => !p.captured);
    if (this.check && legalMoves.length === 0) {
      // ...checkmate (king is checked and has no legal moves that would take him out of check)
      this.result = this.oppositeColour(this.turn);
    } else if (!this.check && legalMoves.length === 0) {
      this.result = 'stalemate';
    } else if (livePieces.length < 3 || (livePieces.length == 3 && livePieces.some((p) => p.type == 'b'))) {
      // ...insufficient material (2 kings, or 2 kings and bishop)
      this.result = 'draw';
    } else {
      // ...reset the result if move is undone
      this.result = null;
    }
    // ...TODO more draw scenarios
    
    // update next legal moves
    this.nextLegalMoves = this.result ? [] : legalMoves;
  }

  // getThreateningMoves calculates the moves of every piece of that colour could make, assuming it's their turn
  // and without worrying about checks. This is useful for checking which squares these pieces are threatening.
  getThreateningMoves(colour) {
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
        let pawnMoves = [];
        // pawn has a single direction depending on its colour
        const direction = piece.colour == 'w' ? 1 : -1;
        // pawn can move forward one space if nothing is in its way
        const pieceInFront = this.board[piece.file][piece.rank + direction];
        if (!pieceInFront)
          pawnMoves.push({ from, to: { file: piece.file, rank: piece.rank + direction }});
        // pawn can move forward two spaces if it never moved AND nothing is in its way
        const rankAheadAhead = piece.rank + 2 * direction;
        const pieceAheadAhead = rankAheadAhead >= 1 && rankAheadAhead <= 8 ? this.board[piece.file][rankAheadAhead] : null;
        if (!pieceInFront && piece.moves == 0 && !pieceAheadAhead)
          pawnMoves.push({ from, to: { file: piece.file, rank: rankAheadAhead }});
        // pawn can take enemy piece in either space diagonally forward
        const diagonalPiece1 = piece.file - 1 >= 1 ? this.board[piece.file - 1][piece.rank + direction] : null;
        const diagonalPiece2 = piece.file + 1 <= 8 ? this.board[piece.file + 1][piece.rank + direction] : null;
        if (diagonalPiece1 && diagonalPiece1.colour != piece.colour)
          pawnMoves.push({ from, to: { file: diagonalPiece1.file, rank: diagonalPiece1.rank }});
        if (diagonalPiece2 && diagonalPiece2.colour != piece.colour)
          pawnMoves.push({ from, to: { file: diagonalPiece2.file, rank: diagonalPiece2.rank }});
        // en passant
        if (this.lastMoveWasPawnDoubleJump()) {
          const lastMove = this.getLastMove();
          const besidePiece1 = piece.file - 1 >= 1 ? this.board[piece.file - 1][piece.rank] : null;
          const besidePiece2 = piece.file + 1 <= 8 ? this.board[piece.file + 1][piece.rank] : null;
          if (besidePiece1 && besidePiece1.colour != piece.colour && besidePiece1.file == lastMove.move.to.file)
            pawnMoves.push({ from, to: { file: besidePiece1.file, rank: besidePiece1.rank + direction }});
          if (besidePiece2 && besidePiece2.colour != piece.colour && besidePiece2.file == lastMove.move.to.file)
            pawnMoves.push({ from, to: { file: besidePiece2.file, rank: besidePiece2.rank + direction }});
        }
        // for each pawn move, see if it requires promotion
        pawnMoves = pawnMoves.map((move) => {
          if (this.isPromotionSquare(this.turn, move.to.file, move.to.rank)) move.mustPromote = true;
          return move;
        })
        // register the candidate pawn moves
        candidateMoves = candidateMoves.concat(pawnMoves);
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

        // King can castle king-side, queen-side, both, or neither.
        const kingSideCastle = this.getCandidateMoveForKingSideCastle(piece);
        if (kingSideCastle) candidateMoves.push(kingSideCastle);
        const queenSideCastle = this.getCandidateMoveForQueenSideCastle(piece);
        if (queenSideCastle) candidateMoves.push(queenSideCastle);
      }
    });

    return candidateMoves;
  }

  getCandidateMoveForKingSideCastle(king) {
    // king cannot castle while checked
    if (this.check) return null;
    // king cannot castle if he has already moved
    if (king.moves > 0) return null;
    const rook = this.board[8][king.rank];
    // ensure the king's rook on that side has not moved yet
    if (!rook || rook.type != 'r' || rook.colour != king.colour || rook.moves > 0) return null;
    // ensure no pieces between rook and king
    if (this.board[6][king.rank] || this.board[7][king.rank]) return null;
    // ensure king would not move through check
    const clone = this.clone();
    let moved = clone.movePiece({from: {file: 5, rank: king.rank}, to: {file: 6, rank: king.rank}}, true, true);
    if (!moved) console.error('king did not move; it should always have moved! :O');
    if (clone.kingIsInCheck(king.colour)) return null;
    clone.undoLastMove(true);
    // no need to be sure here if king is in check in final square, because it is done for every piece already

    return {
      from: {file: king.file, rank: king.rank},
      to: {file: king.file + 2, rank: king.rank},
      extraMove: { // the rook also moves
        from: {file: rook.file, rank: rook.rank},
        to: {file: king.file + 1, rank: rook.rank},
      },
    };
  }

  getCandidateMoveForQueenSideCastle(king) {
    // king cannot castle while checked
    if (this.check) return null;
    // king cannot castle if he has already moved
    if (king.moves > 0) return null;
    const rook = this.board[1][king.rank];
    // ensure the king's rook on that side has not moved yet
    if (!rook || rook.type != 'r' || rook.colour != king.colour || rook.moves > 0) return null;
    // ensure no pieces between rook and king
    if (this.board[2][king.rank] || this.board[3][king.rank] || this.board[4][king.rank]) return null;
    // ensure king would not move through check
    const clone = this.clone();
    let moved = clone.movePiece({from: {file: 5, rank: king.rank}, to: {file: 4, rank: king.rank}}, true, true);
    if (!moved) console.error('king did not move; it should always have moved! :O');
    if (clone.kingIsInCheck(king.colour)) return null;
    clone.undoLastMove(true);
    // no need to be sure here if king is in check in final square, because it is done for every piece already

    return {
      from: {file: king.file, rank: king.rank},
      to: {file: king.file - 2, rank: king.rank},
      extraMove: { // the rook also moves
        from: {file: rook.file, rank: rook.rank},
        to: {file: king.file - 1, rank: rook.rank},
      },
    };
  }

  // getValidDiagonalMoves gets all the legal diagonal moves that the piece can make,
  // which includes the squares occupied by enemies and any square leading to those or end of board.
  getValidDiagonalMoves(piece, limitPerDirection = 100) {
    const directions = [
      { file: 1, rank: 1 },
      { file: -1, rank: 1 },
      { file: 1, rank: -1 },
      { file: -1, rank: -1 },
    ];
    return this.getLegalMovesForEachDirection(piece, directions, limitPerDirection);
  }

  // getValidOrthogonalMoves gets all the legal orthogonal (vertical and horizontal) moves that the piece can make,
  // which includes the squares occupied by enemies and any square leading to those or end of board.
  getValidOrthogonalMoves(piece, limitPerDirection = 100) {
    const directions = [
      { file: 1, rank: 0 },
      { file: -1, rank: 0 },
      { file: 0, rank: 1 },
      { file: 0, rank: -1 },
    ];
    return this.getLegalMovesForEachDirection(piece, directions, limitPerDirection);
  }

  // getLegalMovesForEachDirection gets all the legal moves that the piece can make,
  // in the given directions that the piece is able to move,
  // up to a limited distance (number of times the direction is applied to traverse the range
  // of squares in each direction).
  getLegalMovesForEachDirection(piece, directions, limitPerDirection) {
    const from = { file: piece.file, rank: piece.rank };
    const legalMoves = [];
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
        legalMoves.push({ from, to: { file: square.file, rank: square.rank }});
        // traverse to next square in this direction
        square.file += dir.file;
        square.rank += dir.rank;
        ++traversed;
      }
    });
    return legalMoves;
  }

  // movePiece returns true if move was legal and was performed, otherwise false.
  // hack: ignoreMoveValidity param is a hack to allow internal calculation of kings being in check;
  // always use false yourself.
  // hack: skipCalculatingNextLegalMoves param is also another hack related to
  // calculating check and checkmate, and avoiding infinite recursion.
  movePiece(move, ignoreMoveValidity = false, skipUpdatingNextLegalMoves = false, promotion = null) {

    // get the actual move object the engine has created, as it may contain needed info e.g. extra move when castling
    const legalMove = this.nextLegalMoves.find((legalMove) => (
      legalMove.from.file == move.from.file &&
      legalMove.to.file == move.to.file &&
      legalMove.from.rank == move.from.rank &&
      legalMove.to.rank == move.to.rank
    ));
    if (legalMove) move = legalMove;

    // ensure move is legal, if the check hasn't been disabled by the caller
    // (which it may, to prevent infinite recursion)
    if (!ignoreMoveValidity && !legalMove) return false;

    const pieceIndex = this.pieces.findIndex((piece) => (
      !piece.captured && piece.file == move.from.file && piece.rank == move.from.rank));
    if (pieceIndex < 0) {
      console.error('movePiece: piece not found for move', move);
      return;
    }

    // see if the piece is a pawn being promoted
    if (this.pieces[pieceIndex].type == 'p' && move.mustPromote) {
      // get promotion piece chosen...
      const validPromotedType = ['q', 'r', 'b', 'n'].find((t) => t == promotion);
      // ...or fail if no valid option chosen
      if (!validPromotedType) return false;
      // promote the pawn
      this.pieces[pieceIndex].type = validPromotedType;
    }

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

    // there may be an extra piece to be moved at the same time (i.e. in a castling move)...
    let otherPieceIndex;
    if (move.extraMove) {
      // ...so also do the extra move...
      otherPieceIndex = this.pieces.findIndex((piece) => (
        !piece.captured && piece.file == move.extraMove.from.file && piece.rank == move.extraMove.from.rank));
      this.pieces[otherPieceIndex].file = move.extraMove.to.file;
      this.pieces[otherPieceIndex].rank = move.extraMove.to.rank;
      this.pieces[otherPieceIndex].moves++;
      // ...and update board
      this.board[move.extraMove.from.file][move.extraMove.from.rank] = null;
      this.board[move.extraMove.to.file][move.extraMove.to.rank] = this.pieces[otherPieceIndex];
    }

    // see if enemy king is now in check...
    this.check = this.kingIsInCheck(this.oppositeColour(this.turn));

    // record the move
    this.moveHistory.push({
      move,
      pieceMovedIndex: pieceIndex,
      otherPieceMovedIndex: otherPieceIndex, // e.g. the rook when castling
      pieceCapturedIndex: enemyPieceIndex,
      promoted: !!promotion,
      check: this.check,
    });

    // change turns
    this.turn = this.oppositeColour(this.turn);

    // update next legal moves
    if (!skipUpdatingNextLegalMoves) this.updateNextLegalMoves();

    return true;
  }

  // hack: skipCalculatingNextLegalMoves param is a hack related to
  // calculating check and checkmate, and avoiding infinite recursion.
  undoLastMove(skipUpdatingNextLegalMoves = false) {
    if (this.moveHistory.length == 0) {
      this.check = false;
      return { pieceMovedBack: null, pieceResurrected: null };
    }

    // delete the last move from history
    const lastMove = this.moveHistory.pop();

    // undo any pawn promotion that may have happened
    if (lastMove.promoted) this.pieces[lastMove.pieceMovedIndex].type = 'p';

    // put the moved piece back...
    this.pieces[lastMove.pieceMovedIndex].file = lastMove.move.from.file;
    this.pieces[lastMove.pieceMovedIndex].rank = lastMove.move.from.rank;
    this.pieces[lastMove.pieceMovedIndex].moves--;
    // ...and update board
    this.board[lastMove.move.from.file][lastMove.move.from.rank] = this.pieces[lastMove.pieceMovedIndex];
    this.board[lastMove.move.to.file][lastMove.move.to.rank] = null;

    // there may be an extra piece to be moved at the same time (i.e. in a castling move)...
    if (lastMove.move.extraMove) {
      // ...so move that extra piece back...
      this.pieces[lastMove.otherPieceMovedIndex].file = lastMove.move.extraMove.from.file;
      this.pieces[lastMove.otherPieceMovedIndex].rank = lastMove.move.extraMove.from.rank;
      this.pieces[lastMove.otherPieceMovedIndex].moves--;
      // ...and update board
      this.board[lastMove.move.extraMove.from.file][lastMove.move.extraMove.from.rank] =
        this.pieces[lastMove.otherPieceMovedIndex];
      this.board[lastMove.move.extraMove.to.file][lastMove.move.extraMove.to.rank] = null;
    }

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

    // update next legal moves
    if (!skipUpdatingNextLegalMoves) this.updateNextLegalMoves();

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
    const enemyMoves = this.getThreateningMoves(this.oppositeColour(kingColour));

    // if one of their moves is to move to the king's square then the king is in check
    const kingThreatened = enemyMoves.some((move) => (
      move.to.file == king.file && move.to.rank == king.rank
    ));
    return kingThreatened;
  }

  isPromotionSquare(colour, file, rank) {
    return this.promotionSquares[colour].findIndex((square) => square.file == file && square.rank == rank) >= 0;
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
