export type CountryId = string;

export type Country = {
  id: CountryId;
  name: string;
  adjective: string;

  populationM: number; // millions
  gdpB: number; // billions
  treasuryB: number; // billions

  stability: number; // 0..100
  legitimacy: number; // 0..100

  army: number; // abstract strength
  navy: number; // abstract strength

  tech: number; // 0..100
  admin: number; // 0..100

  warExhaustion: number; // 0..100
  debtB: number; // billions

  taxRate: number; // 0.05..0.5
  conscription: number; // 0..1
};

export type Relation = {
  a: CountryId;
  b: CountryId;
  score: number; // -100..100
  rivalry: boolean;
  alliance: boolean;
};

export type War = {
  id: string;
  attackers: CountryId[];
  defenders: CountryId[];
  startTurn: number;
  intensity: number; // 0..1
};

export type LogEntry = {
  id: string;
  turn: number;
  title: string;
  message: string;
  tags?: Array<"good" | "bad" | "warn" | "info">;
};

export type GameState = {
  seed: number;
  turn: number;
  playerCountryId: CountryId;
  countries: Record<CountryId, Country>;
  relations: Relation[];
  wars: War[];
  log: LogEntry[];
};

export type ActionId =
  | "raise_taxes"
  | "lower_taxes"
  | "invest_economy"
  | "invest_admin"
  | "invest_tech"
  | "recruit_army"
  | "expand_navy"
  | "ease_conscription"
  | "increase_conscription"
  | "improve_relations"
  | "sabotage_relations"
  | "declare_rivalry"
  | "offer_alliance"
  | "declare_war"
  | "seek_peace";

export type ActionSpec = {
  id: ActionId;
  name: string;
  description: string;
  requiresTargetCountry?: boolean;
};

