// const makeColumn = (letter, count = 5) =>
//   Array.from({ length: count }, (_, i) => ({
//     id: `${letter}${i + 1}`,
//     label: `${letter}${i + 1}`,
//     pricePerHour: 50,
//   }));

// export const COL_A = makeColumn('A');
// export const COL_B = makeColumn('B');
// export const COL_C = makeColumn('C');
// export const COL_D = makeColumn('D');
// export const COL_F = makeColumn('F');
// export const COL_E = makeColumn('E');

// export const ALL_SPACES = [...COL_A, ...COL_B, ...COL_C, ...COL_D, ...COL_F, ...COL_E];
// export const TOTAL_SPACES = ALL_SPACES.length;

// One line per parking space:  s('ID', pricePerHour)
// - Change a price: change the number.
// - Add a space: add a new line (the ID must be unique).
// - Remove a space: delete its line.
// Layout on the screen: [E] lane [A][B] lane [C][D] lane [F]

const s = (id, pricePerHour) => ({ id, label: id, pricePerHour });

export const COL_A = [
  s('A1', 50),
  s('A2', 50),
  s('A3', 50),
  s('A4', 50),
  s('A5', 50),
];

export const COL_B = [
  s('B1', 50),
  s('B2', 50),
  s('B3', 50),
  s('B4', 50),
  s('B5', 50),
];

export const COL_C = [
  s('C1', 50),
  s('C2', 50),
  s('C3', 50),
  s('C4', 50),
  s('C5', 50),
];

export const COL_D = [
  s('D1', 50),
  s('D2', 50),
  s('D3', 50),
  s('D4', 50),
  s('D5', 50),
];

export const COL_F = [
  s('F1', 50),
  s('F2', 50),
  s('F3', 50),
  s('F4', 50),
  s('F5', 50),
];

export const COL_E = [
  s('E1', 50),
  s('E2', 50),
  s('E3', 50),
  s('E4', 50),
  s('E5', 50),
];

export const ALL_SPACES = [...COL_A, ...COL_B, ...COL_C, ...COL_D, ...COL_F, ...COL_E];
export const TOTAL_SPACES = ALL_SPACES.length;