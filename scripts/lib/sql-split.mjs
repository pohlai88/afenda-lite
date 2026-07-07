export function splitSqlStatements(sql) {
  const statements = [];
  let current = "";
  let inDollarQuote = false;
  let dollarTag = "";

  for (let index = 0; index < sql.length; index += 1) {
    const char = sql[index];
    current += char;

    if (!inDollarQuote && char === "$") {
      const match = sql.slice(index).match(/^\$([A-Za-z0-9_]*)\$/);
      if (match) {
        inDollarQuote = true;
        dollarTag = match[0];
        index += match[0].length - 1;
        continue;
      }
    } else if (inDollarQuote && sql.slice(index).startsWith(dollarTag)) {
      current += sql.slice(index + 1, index + dollarTag.length);
      index += dollarTag.length - 1;
      inDollarQuote = false;
      dollarTag = "";
      continue;
    }

    if (char === ";" && !inDollarQuote) {
      const trimmed = current.slice(0, -1).trim();
      if (trimmed) statements.push(trimmed);
      current = "";
    }
  }

  const trailing = current.trim();
  if (trailing) statements.push(trailing);
  return statements;
}

export function stripSqlLineComments(sql) {
  return sql
    .split("\n")
    .map((line) => line.replace(/--.*$/, ""))
    .join("\n");
}
