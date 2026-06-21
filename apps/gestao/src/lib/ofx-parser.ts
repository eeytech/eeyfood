export interface OfxEntry {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: "CREDIT" | "DEBIT";
}

export interface OfxParseResult {
  bankId?: string;
  accountId?: string;
  periodStart?: string;
  periodEnd?: string;
  entries: OfxEntry[];
}

function parseOfxDate(raw: string): string {
  const s = raw.replace(/\[.*\]/, "").trim();
  const year = s.slice(0, 4);
  const month = s.slice(4, 6);
  const day = s.slice(6, 8);
  return `${year}-${month}-${day}`;
}

function extractTag(content: string, tag: string): string | undefined {
  const re = new RegExp(`<${tag}>([^<\\n\\r]+)`, "i");
  return re.exec(content)?.[1]?.trim();
}

function extractBetween(content: string, openTag: string, closeTag: string): string[] {
  const re = new RegExp(`<${openTag}>[\\s\\S]*?</${closeTag}>`, "gi");
  return content.match(re) ?? [];
}

export function parseOfx(raw: string): OfxParseResult {
  const bankId = extractTag(raw, "BANKID");
  const accountId = extractTag(raw, "ACCTID");
  const periodStart = extractTag(raw, "DTSTART");
  const periodEnd = extractTag(raw, "DTEND");

  const stmttrn = extractBetween(raw, "STMTTRN", "STMTTRN");

  const entries: OfxEntry[] = stmttrn.map((block, index) => {
    const trntype = extractTag(block, "TRNTYPE") ?? "OTHER";
    const dtposted = extractTag(block, "DTPOSTED") ?? "";
    const trnamt = extractTag(block, "TRNAMT") ?? "0";
    const fitid = extractTag(block, "FITID") ?? `entry-${index}`;
    const memo = extractTag(block, "MEMO") ?? extractTag(block, "NAME") ?? "Lançamento";

    const rawAmount = parseFloat(trnamt.replace(",", "."));
    const isCredit = trntype === "CREDIT" || rawAmount > 0;

    return {
      id: fitid,
      date: dtposted ? parseOfxDate(dtposted) : new Date().toISOString().slice(0, 10),
      description: memo,
      amount: Math.abs(rawAmount),
      type: isCredit ? "CREDIT" : "DEBIT",
    };
  });

  return {
    bankId,
    accountId,
    periodStart: periodStart ? parseOfxDate(periodStart) : undefined,
    periodEnd: periodEnd ? parseOfxDate(periodEnd) : undefined,
    entries,
  };
}
