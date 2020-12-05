import initialPieces from './initialPieces';

export class Game {
  pieces = initialPieces;
  turn = 'w';

  getNextValidMoves() {
    // TODO calculate possible moves instead of mocking them
    return [
      {
        from: {
          file: 1,
          rank: 2,
        },
        to: {
          file: 1,
          rank: 3,
        },
      },
      {
        from: {
          file: 2,
          rank: 2,
        },
        to: {
          file: 2,
          rank: 4,
        },
      },
      {
        from: {
          file: 4,
          rank: 5,
        },
        to: {
          file: 6,
          rank: 5,
        },
      },
      {
        from: {
          file: 6,
          rank: 6,
        },
        to: {
          file: 4,
          rank: 6,
        },
      },
      {
        from: {
          file: 8,
          rank: 2,
        },
        to: {
          file: 7,
          rank: 4,
        },
      },
      {
        from: {
          file: 8,
          rank: 7,
        },
        to: {
          file: 7,
          rank: 5,
        },
      },
      {
        from: {
          file: 1,
          rank: 7,
        },
        to: {
          file: 3,
          rank: 6,
        },
      },
      {
        from: {
          file: 3,
          rank: 5,
        },
        to: {
          file: 3,
          rank: 3,
        },
      },
    ];
  }
}
