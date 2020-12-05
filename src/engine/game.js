import initialPieces from './initialPieces';

export class Game {
  pieces = initialPieces;
  turn = 'w';

  getNextValidMoves() {
    // TODO calculate possible moves instead of mocking them
    return [
      {
        from: 'a2',
        to: 'a3',
      },
      {
        from: 'b2',
        to: 'b4',
      },
      {
        from: 'd5',
        to: 'f5',
      },
      {
        from: 'f6',
        to: 'd6',
      },
      {
        from: 'h2',
        to: 'g4',
      },
      {
        from: 'h7',
        to: 'g5',
      },
      {
        from: 'a7',
        to: 'c6',
      },
      {
        from: 'c5',
        to: 'c3',
      },
    ];
  }
}
