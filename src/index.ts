export class FunText {
  text: string;

  constructor(text: string) {
    this.text = text;
  }

  go() {
    return "FunText: " + this.text;
  }
}
