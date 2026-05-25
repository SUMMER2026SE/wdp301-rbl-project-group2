export const parseFormData = (body: Record<string, any>) => {
  const parsed: Record<string, any> = {};
  for (const [key, value] of Object.entries(body)) {
    if (typeof value !== 'string') {
      parsed[key] = value;
      continue;
    }

    try {
      parsed[key] = JSON.parse(value);
    } catch (error) {
      parsed[key] = value;
    }
  }
  return parsed;
};
