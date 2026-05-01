import { Country, CountryId, Relation } from "./types";

export type CountryTemplate = Omit<
  Country,
  | "gdpB"
  | "treasuryB"
  | "stability"
  | "legitimacy"
  | "army"
  | "navy"
  | "tech"
  | "admin"
  | "warExhaustion"
  | "debtB"
  | "taxRate"
  | "conscription"
> & {
  baseGdpB: number;
  baseArmy: number;
  baseNavy: number;
};

export const countryTemplates: CountryTemplate[] = [
  {
    id: "AUR" as CountryId,
    name: "Aurelia",
    adjective: "Aurelian",
    populationM: 42,
    baseGdpB: 620,
    baseArmy: 55,
    baseNavy: 18,
  },
  {
    id: "BRY" as CountryId,
    name: "Borey",
    adjective: "Borean",
    populationM: 28,
    baseGdpB: 410,
    baseArmy: 42,
    baseNavy: 10,
  },
  {
    id: "CYR" as CountryId,
    name: "Cyrannia",
    adjective: "Cyrannian",
    populationM: 65,
    baseGdpB: 820,
    baseArmy: 70,
    baseNavy: 22,
  },
  {
    id: "DOR" as CountryId,
    name: "Dorval",
    adjective: "Dorvali",
    populationM: 16,
    baseGdpB: 240,
    baseArmy: 28,
    baseNavy: 6,
  },
  {
    id: "EST" as CountryId,
    name: "Estmere",
    adjective: "Estmerian",
    populationM: 35,
    baseGdpB: 520,
    baseArmy: 46,
    baseNavy: 14,
  },
  {
    id: "KHE" as CountryId,
    name: "Kheled",
    adjective: "Kheledi",
    populationM: 22,
    baseGdpB: 310,
    baseArmy: 36,
    baseNavy: 8,
  },
];

export function createDefaultRelations(countryIds: CountryId[]): Relation[] {
  const rels: Relation[] = [];
  for (let i = 0; i < countryIds.length; i++) {
    for (let j = i + 1; j < countryIds.length; j++) {
      rels.push({
        a: countryIds[i]!,
        b: countryIds[j]!,
        score: 0,
        rivalry: false,
        alliance: false,
      });
    }
  }
  return rels;
}

