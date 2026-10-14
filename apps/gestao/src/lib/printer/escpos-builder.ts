/**
 * ESC/POS Command Builder for Thermal Receipt Printers (80mm and 58mm)
 * Compatible with Epson, Bematech, Elgin, Daruma, Xprinter and generic ESC/POS printers.
 */

export interface EscPosOptions {
  paperWidth?: 80 | 58;
  cutPaper?: boolean;
  openDrawer?: boolean;
  drawerPulseHex?: string | null;
}

export class EscPosBuilder {
  private buffer: Buffer[] = [];
  private readonly columns: number;
  private readonly cutPaper: boolean;
  private readonly openDrawer: boolean;
  private readonly drawerPulseHex?: string | null;

  constructor(options: EscPosOptions = {}) {
    const width = options.paperWidth ?? 80;
    this.columns = width === 58 ? 32 : 48;
    this.cutPaper = options.cutPaper ?? true;
    this.openDrawer = options.openDrawer ?? false;
    this.drawerPulseHex = options.drawerPulseHex;

    // Initialize printer: ESC @
    this.buffer.push(Buffer.from([0x1b, 0x40]));
  }

  /**
   * Normalizes text replacing accents with plain ASCII or safe equivalents
   * to prevent garbled symbols on older thermal printer firmware.
   */
  private cleanText(text: string): string {
    return text
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^\x20-\x7E\n\r]/g, "");
  }

  /**
   * Aligns next text: 'LEFT' | 'CENTER' | 'RIGHT'
   */
  align(alignment: "LEFT" | "CENTER" | "RIGHT"): this {
    const val = alignment === "CENTER" ? 0x01 : alignment === "RIGHT" ? 0x02 : 0x00;
    this.buffer.push(Buffer.from([0x1b, 0x61, val]));
    return this;
  }

  /**
   * Enables or disables bold text
   */
  bold(enable = true): this {
    this.buffer.push(Buffer.from([0x1b, 0x45, enable ? 0x01 : 0x00]));
    return this;
  }

  /**
   * Sets text size
   * 'NORMAL' = 1x
   * 'DOUBLE_HEIGHT' = 2x height
   * 'DOUBLE_WIDTH' = 2x width
   * 'LARGE' = 2x height + 2x width
   * 'HUGE' = 3x height + 3x width
   */
  size(sizeMode: "NORMAL" | "DOUBLE_HEIGHT" | "DOUBLE_WIDTH" | "LARGE" | "HUGE"): this {
    let byte = 0x00;
    if (sizeMode === "DOUBLE_HEIGHT") byte = 0x01;
    else if (sizeMode === "DOUBLE_WIDTH") byte = 0x10;
    else if (sizeMode === "LARGE") byte = 0x11;
    else if (sizeMode === "HUGE") byte = 0x22;
    this.buffer.push(Buffer.from([0x1d, 0x21, byte]));
    return this;
  }

  /**
   * Prints text line (appends \n)
   */
  line(text = ""): this {
    const cleaned = this.cleanText(text);
    this.buffer.push(Buffer.from(cleaned + "\n", "ascii"));
    return this;
  }

  /**
   * Prints text without trailing newline
   */
  text(text: string): this {
    const cleaned = this.cleanText(text);
    this.buffer.push(Buffer.from(cleaned, "ascii"));
    return this;
  }

  /**
   * Feeds N blank lines
   */
  feed(lines = 1): this {
    this.buffer.push(Buffer.from([0x1b, 0x64, Math.min(Math.max(lines, 1), 10)]));
    return this;
  }

  /**
   * Prints a divider line with specified char ('-' or '=' or '*')
   */
  divider(char = "-"): this {
    this.align("LEFT");
    this.size("NORMAL");
    this.bold(false);
    this.line(char.repeat(this.columns));
    return this;
  }

  /**
   * Formats a row with left and right text (e.g. "X-BURGER .... R$ 25,00")
   */
  row(left: string, right: string): this {
    const cleanLeft = this.cleanText(left);
    const cleanRight = this.cleanText(right);
    const availableSpace = this.columns - cleanRight.length;

    if (availableSpace <= 0) {
      this.line(cleanLeft);
      this.line(" ".repeat(Math.max(0, this.columns - cleanRight.length)) + cleanRight);
      return this;
    }

    const truncatedLeft = cleanLeft.slice(0, Math.max(0, availableSpace - 1));
    const padding = " ".repeat(Math.max(1, this.columns - truncatedLeft.length - cleanRight.length));
    this.line(truncatedLeft + padding + cleanRight);
    return this;
  }

  /**
   * Drawer kick command (ESC p)
   */
  kickDrawer(): this {
    if (this.drawerPulseHex) {
      try {
        const hex = this.drawerPulseHex.replace(/[^0-9a-fA-F]/g, "");
        if (hex.length % 2 === 0 && hex.length > 0) {
          this.buffer.push(Buffer.from(hex, "hex"));
          return this;
        }
      } catch {
        // Fallback to standard pulse below
      }
    }
    // Standard ESC p 0 25 250
    this.buffer.push(Buffer.from([0x1b, 0x70, 0x00, 0x19, 0xfa]));
    return this;
  }

  /**
   * Paper cut command (GS V 65 3)
   */
  cut(): this {
    this.feed(3);
    // GS V 65 (0x41) 3
    this.buffer.push(Buffer.from([0x1d, 0x56, 0x41, 0x03]));
    return this;
  }

  /**
   * Finalizes the buffer and returns raw binary Buffer
   */
  build(): Buffer {
    if (this.openDrawer) {
      this.kickDrawer();
    }
    if (this.cutPaper) {
      this.cut();
    }
    return Buffer.concat(this.buffer);
  }
}
