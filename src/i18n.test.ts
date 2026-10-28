import { describe, expect, it } from "vitest";
import { LANGS, getLang, isRtl, setLang, stepCount, t } from "./i18n";
import { normalizeTags } from "./library";

describe("languages", () => {
  it("Hebrew is right-to-left", () => {
    setLang("he");
    expect(getLang()).toBe("he");
    expect(isRtl()).toBe(true);
    expect(t("mode.6v5")).toBe("6 על 5");
  });

  it("translates every language and fills in values", () => {
    const seen = new Set<string>();
    for (const l of LANGS) {
      setLang(l);
      const s = t("video.stepOf", { n: 2, total: 4 });
      expect(s).toMatch(/2/);
      expect(s).toMatch(/4/);
      expect(s).not.toMatch(/[{}]/);
      seen.add(t("library"));
    }
    expect(seen.size).toBe(LANGS.length); // כל שפה עם מילה משלה
    setLang("en");
    expect(isRtl()).toBe(false);
    expect(t("mode.6v5")).toBe("6 on 5");
    setLang("sr");
    expect(t("mode.6v5")).toBe("6 na 5");
    setLang("he");
  });

  it("uses singular and plural step counts", () => {
    setLang("he");
    expect(stepCount(1)).toBe("שלב אחד");
    expect(stepCount(4)).toBe("4 שלבים");
    setLang("en");
    expect(stepCount(1)).toBe("1 step");
    expect(stepCount(3)).toBe("3 steps");
    setLang("sr");
    expect(stepCount(21)).toBe("21 korak");
    expect(stepCount(11)).toBe("11 koraka");
    setLang("he");
  });

  it("converts tags saved in Hebrew before languages existed", () => {
    expect(normalizeTags(["התקפה", "יתרון מספרי", "attack", "junk", 7])).toEqual(["attack", "manUp"]);
    expect(normalizeTags(undefined)).toEqual([]);
  });
});
