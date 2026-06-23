export const formatOrderNote = (note?: string) => {
  if (!note?.trim()) return '';

  const normalized = note.toLowerCase().replace(/•/g, '-').replace(/\s+/g, ' ').trim();

  // Tách trước theo xuống dòng, dấu phẩy, dấu chấm phẩy
  const roughParts = normalized
    .split(/[\n,;]+/)
    .map((part) => part.trim())
    .filter(Boolean);

  const knownPatterns = [
    /giao trước\s+\d{1,2}(?:h|:\d{2})?/gi,
    /giao sau\s+\d{1,2}(?:h|:\d{2})?/gi,
    /ít đá/gi,
    /đá riêng/gi,
    /không đá/gi,
    /nhiều đá/gi,
    /ít ngọt/gi,
    /không đường/gi,
    /thêm đường/gi,
    /không hành/gi,
    /không rau/gi,
    /không cay/gi,
    /ít cay/gi,
    /thêm bún/gi,
    /thêm bánh tráng/gi,
    /thêm muỗng/gi,
    /thêm đũa/gi,
    /thêm ống hút/gi,
  ];

  const result: string[] = [];

  for (const part of roughParts) {
    let matchedAny = false;

    for (const pattern of knownPatterns) {
      const matches = part.match(pattern);
      if (matches?.length) {
        matchedAny = true;
        for (const m of matches) {
          const clean = m.trim();
          if (clean && !result.includes(clean)) {
            result.push(clean);
          }
        }
      }
    }

    // Nếu không match pattern nào, thử tách theo " và "
    if (!matchedAny) {
      const subParts = part
        .split(/\s+và\s+/i)
        .map((x) => x.trim())
        .filter(Boolean);

      for (const sub of subParts) {
        if (sub && !result.includes(sub)) {
          result.push(sub);
        }
      }
    }
  }

  return result.map((item) => `- ${item}`).join('\n');
};
