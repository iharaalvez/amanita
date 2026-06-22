const AREA_WORD_PATTERN = "(One|Two|Three|Four|Five|Six)";
const PROVINCE_PATTERN = "(North|South|East|West) Province";

export function canonicalizeLocationName(rawName: string): string {
  const value = rawName.replace(/\s+/g, " ").trim();

  const reversedProvinceArea = value.match(
    new RegExp(`^Area ${AREA_WORD_PATTERN} \\(${PROVINCE_PATTERN}\\)(.*)$`, "i"),
  );
  if (reversedProvinceArea) {
    const [, area, provinceDirection, suffix = ""] = reversedProvinceArea;
    return `${provinceDirection} Province (Area ${area})${normalizeSuffix(suffix)}`;
  }

  const bareProvinceArea = value.match(
    new RegExp(`^${PROVINCE_PATTERN} Area ${AREA_WORD_PATTERN}(.*)$`, "i"),
  );
  if (bareProvinceArea) {
    const [, provinceDirection, area, suffix = ""] = bareProvinceArea;
    return `${provinceDirection} Province (Area ${area})${normalizeSuffix(suffix)}`;
  }

  return normalizeSuffix(value);
}

function normalizeSuffix(suffix: string): string {
  return suffix.replace(/\b24H\b/g, "24h").trimEnd();
}
