// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyVariation = any;

export type CartVariantChip = {
  key: string;
  text: string; 
  extra: number;
};

const GROUP_PREFIX: Record<string, string> = {
  Size: "Sz",
  Topping: "Topping",
};

function getGroupName(v: AnyVariation) {
  return v?.group ?? v?.variant_name ?? v?.name ?? v?.variationName ?? "";
}

function getGroupPrefix(groupName: string) {
  return GROUP_PREFIX[groupName] ?? groupName.slice(0, 3);
}

function getOptionChoice(v: AnyVariation) {

  return (
    v?.choice ??
    v?.option?.choice ??
    v?.selected?.choice ??
    v?.value ??
    v?.label ??
    ""
  );
}

function getExtraPrice(v: AnyVariation) {
  const p = Number(
    v?.extra_price ??
      v?.option?.extra_price ??
      v?.selected?.extra_price ??
      v?.price ??
      v?.extraPrice ??
      0,
  );
  return Number.isFinite(p) ? p : 0;
}

export function normalizeVariations(variations?: AnyVariation[]) {
  if (!Array.isArray(variations) || variations.length === 0) return [];

  const flattened: AnyVariation[] = [];

  for (const v of variations) {
    if (Array.isArray(v?.options)) {
      for (const opt of v.options) {
        flattened.push({
          ...opt,
          name: v.name,
        });
      }
      continue;
    }

    flattened.push(v);
  }

  return flattened;
}

export function buildVariantChips(variations?: AnyVariation[]) {
  const vars = normalizeVariations(variations);
  if (!vars.length) return [] as CartVariantChip[];

  return vars
    .map((v) => {
      const groupName = getGroupName(v) || "Option";
      const prefix = getGroupPrefix(groupName);
      const choice = String(getOptionChoice(v)).trim();
      const extra = getExtraPrice(v);
      if (!choice) return null;
      if (choice.toLowerCase() === String(groupName).toLowerCase()) return null;

      return {
        key: `${groupName}-${choice}-${extra}`,
        text: `${prefix}: ${choice}`,
        extra,
      };
    })
    .filter(Boolean) as CartVariantChip[];
}