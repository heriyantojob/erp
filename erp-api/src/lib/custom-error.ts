// export class CustomError extends Error {
//   message: string;
//   status: number;
//   constructor(message: string, status: number) {
//     super(message);
//     this.status = status;
//   }
// }

export class CustomError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "CustomError"; // Optional: Set a custom error name
    this.status = status;
  }
}
