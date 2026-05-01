import { countryTemplates, createDefaultRelations } from "./data";
import { createRng } from "./rand";
import {
  ActionId,
  ActionSpec,
  Country,
  CountryId,
  GameState,
  LogEntry,
  Relation,
  War,
} from "./types";

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
const round2 = (n: number) => Math.round(n * 100) / 100;

function relKey(a: CountryId, b: CountryId) {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

function getRelation(rels: Relation[], a: CountryId, b: CountryId): Relation {
  const key = relKey(a, b);
  const found = rels.find((r) => relKey(r.a, r.b) === key);
  if (!found) throw new Error(`Missing relation for ${a} ${b}`);
  return found;
}

function addLog(state: GameState, entry: Omit<LogEntry, "id">) {
  const id = `${state.turn}-${state.log.length}-${Math.random().toString(16).slice(2)}`;
  state.log.unshift({ ...entry, id });
  state.log = state.log.slice(0, 120);
}

export const ACTIONS: ActionSpec[] = [
  {
    id: "raise_taxes",
    name: "Raise taxes",
    description: "Increase revenue, but hurts stability and legitimacy.",
  },
  {
    id: "lower_taxes",
    name: "Lower taxes",
    description: "Boost stability, but reduces revenue.",
  },
  {
    id: "invest_economy",
    name: "Invest in economy",
    description: "Spend treasury to grow GDP over time.",
  },
  {
    id: "invest_admin",
    name: "Reform administration",
    description: "Improve state capacity: better taxes, less waste.",
  },
  {
    id: "invest_tech",
    name: "Fund research",
    description: "Long-term military & economic efficiency.",
  },
  {
    id: "recruit_army",
    name: "Recruit army",
    description: "Build land forces (costs money and stability).",
  },
  {
    id: "expand_navy",
    name: "Expand navy",
    description: "Build naval power (costs money).",
  },
  {
    id: "ease_conscription",
    name: "Ease conscription",
    description: "Lower conscription: stability up, army growth slows.",
  },
  {
    id: "increase_conscription",
    name: "Increase conscription",
    description: "Raise conscription: army up, stability down.",
  },
  {
    id: "improve_relations",
    name: "Improve relations",
    description: "Spend influence to improve diplomacy.",
    requiresTargetCountry: true,
  },
  {
    id: "sabotage_relations",
    name: "Sabotage relations",
    description: "Lower relations between you and a target (risky).",
    requiresTargetCountry: true,
  },
  {
    id: "declare_rivalry",
    name: "Declare rivalry",
    description: "Pick a rival: easier to justify war, but raises tensions.",
    requiresTargetCountry: true,
  },
  {
    id: "offer_alliance",
    name: "Offer alliance",
    description: "Attempt to secure an alliance (depends on relations).",
    requiresTargetCountry: true,
  },
  {
    id: "declare_war",
    name: "Declare war",
    description: "Start a war against a target. Big risks, big rewards.",
    requiresTargetCountry: true,
  },
  {
    id: "seek_peace",
    name: "Seek peace",
    description: "Try to end an ongoing war.",
    requiresTargetCountry: true,
  },
];

export function createNewGame(seed: number, playerCountryId: CountryId): GameState {
  const rng = createRng(seed);

  const countries: Record<CountryId, Country> = {};
  for (const t of countryTemplates) {
    const stability = rng.int(52, 78);
    const legitimacy = rng.int(45, 75);
    const admin = rng.int(35, 70);
    const tech = rng.int(28, 66);

    const gdpB = round2(t.baseGdpB * (0.86 + rng.next() * 0.32));
    const treasuryB = round2(Math.max(4, gdpB * (0.03 + rng.next() * 0.05)));
    const army = Math.max(8, Math.round(t.baseArmy * (0.82 + rng.next() * 0.35)));
    const navy = Math.max(0, Math.round(t.baseNavy * (0.82 + rng.next() * 0.35)));

    countries[t.id] = {
      id: t.id,
      name: t.name,
      adjective: t.adjective,
      populationM: t.populationM,
      gdpB,
      treasuryB,
      stability,
      legitimacy,
      army,
      navy,
      tech,
      admin,
      warExhaustion: 0,
      debtB: 0,
      taxRate: 0.22,
      conscription: 0.15,
    };
  }

  const ids = Object.keys(countries) as CountryId[];
  const relations = createDefaultRelations(ids);

  // Seed a few initial biases
  for (const r of relations) {
    r.score = rng.int(-15, 25);
  }

  const state: GameState = {
    seed,
    turn: 1,
    playerCountryId,
    countries,
    relations,
    wars: [],
    log: [],
  };

  addLog(state, {
    turn: state.turn,
    title: "New game",
    message: `You are leading ${countries[playerCountryId]!.name}. Keep stability high, grow the economy, manage diplomacy—and survive your enemies.`,
    tags: ["info"],
  });

  return state;
}

export function listOtherCountries(state: GameState): Country[] {
  const ids = Object.keys(state.countries) as CountryId[];
  return ids
    .map((id) => state.countries[id]!)
    .filter((c) => c.id !== state.playerCountryId)
    .sort((a, b) => a.name.localeCompare(b.name));
}

function treasuryIncomeB(c: Country): number {
  // simplistic: revenue ~ taxRate * GDP scaled by admin efficiency
  const adminEff = 0.55 + (c.admin / 100) * 0.65; // 0.55..1.2
  const base = c.gdpB * c.taxRate * 0.045;
  return base * adminEff;
}

function maintenanceCostB(c: Country): number {
  const armyCost = c.army * 0.035 * (0.85 + c.conscription * 0.5);
  const navyCost = c.navy * 0.05;
  const techOverhead = (c.tech / 100) * 0.8;
  return 0.6 + armyCost + navyCost + techOverhead;
}

function warCostMultiplier(state: GameState, countryId: CountryId): number {
  const activeWars = state.wars.filter(
    (w) => w.attackers.includes(countryId) || w.defenders.includes(countryId),
  );
  if (activeWars.length === 0) return 1;
  const intensity = clamp(activeWars.reduce((a, w) => a + w.intensity, 0), 0, 2);
  return 1 + 0.55 * intensity;
}

function gdpGrowthRate(c: Country): number {
  const st = (c.stability - 50) / 100; // -0.5..0.5
  const tech = c.tech / 100;
  const admin = c.admin / 100;
  const taxDrag = (c.taxRate - 0.2) * 0.9;
  const warDrag = (c.warExhaustion / 100) * 0.8;
  const base = 0.012 + 0.018 * tech + 0.01 * admin + 0.02 * st - taxDrag - warDrag;
  return clamp(base, -0.06, 0.08);
}

function applyBudget(state: GameState, c: Country) {
  const income = treasuryIncomeB(c);
  const costs = maintenanceCostB(c) * warCostMultiplier(state, c.id);
  const interest = c.debtB * 0.02;
  const delta = income - costs - interest;
  c.treasuryB = round2(c.treasuryB + delta);

  if (c.treasuryB < 0) {
    // Auto-borrow
    const borrowed = Math.abs(c.treasuryB) + 1.5;
    c.debtB = round2(c.debtB + borrowed);
    c.treasuryB = 0;
    c.stability = clamp(c.stability - 3, 0, 100);
    c.legitimacy = clamp(c.legitimacy - 2, 0, 100);
  }
}

function tickWarExhaustion(state: GameState, c: Country) {
  const atWar = state.wars.some((w) => w.attackers.includes(c.id) || w.defenders.includes(c.id));
  if (!atWar) {
    c.warExhaustion = clamp(c.warExhaustion - 2.5, 0, 100);
    return;
  }
  const intensity = clamp(
    state.wars
      .filter((w) => w.attackers.includes(c.id) || w.defenders.includes(c.id))
      .reduce((a, w) => a + w.intensity, 0),
    0,
    2,
  );
  c.warExhaustion = clamp(c.warExhaustion + 2.0 + intensity * 3.5, 0, 100);
  c.stability = clamp(c.stability - (0.6 + intensity * 0.8), 0, 100);
}

function simulateWars(state: GameState, rngSeedTurn: number) {
  const rng = createRng(rngSeedTurn);
  for (const w of state.wars) {
    w.intensity = clamp(w.intensity + (rng.next() - 0.5) * 0.14, 0.18, 1);

    const all = [...w.attackers, ...w.defenders];
    const power = (id: CountryId) => {
      const c = state.countries[id]!;
      return c.army * (0.9 + c.tech / 200) + c.navy * 0.55;
    };
    const pAtk = w.attackers.reduce((a, id) => a + power(id), 0);
    const pDef = w.defenders.reduce((a, id) => a + power(id), 0);
    const roll = (p: number) => p * (0.85 + rng.next() * 0.3);
    const scoreAtk = roll(pAtk);
    const scoreDef = roll(pDef);

    const casualtyScale = w.intensity * (0.55 + rng.next() * 0.55);
    const lose = (id: CountryId, amount: number) => {
      const c = state.countries[id]!;
      c.army = Math.max(0, Math.round(c.army - amount));
      c.stability = clamp(c.stability - amount * 0.08, 0, 100);
      c.legitimacy = clamp(c.legitimacy - amount * 0.05, 0, 100);
    };

    const atkLoss = Math.max(0, Math.round((scoreDef / 85) * casualtyScale));
    const defLoss = Math.max(0, Math.round((scoreAtk / 85) * casualtyScale));
    for (const id of w.attackers) lose(id, atkLoss / Math.max(1, w.attackers.length));
    for (const id of w.defenders) lose(id, defLoss / Math.max(1, w.defenders.length));

    // Chance of decisive event
    if (rng.next() < 0.08 + w.intensity * 0.06) {
      const winnerSide = scoreAtk > scoreDef ? "attackers" : "defenders";
      const winner = rng.pick(w[winnerSide]);
      const loser = rng.pick(w[winnerSide === "attackers" ? "defenders" : "attackers"]);
      addLog(state, {
        turn: state.turn,
        title: "Major battle",
        message: `${state.countries[winner]!.adjective} forces win a major battle against ${state.countries[loser]!.adjective} troops.`,
        tags: ["info"],
      });
      const rel = getRelation(state.relations, winner, loser);
      rel.score = clamp(rel.score - 8, -100, 100);
    }

    // Peace pressure if exhaustion high
    const avgExh =
      all.reduce((a, id) => a + state.countries[id]!.warExhaustion, 0) / Math.max(1, all.length);
    if (avgExh > 72 && rng.next() < 0.22) {
      // End war with some penalties
      for (const id of all) {
        const c = state.countries[id]!;
        c.legitimacy = clamp(c.legitimacy - 2, 0, 100);
        c.stability = clamp(c.stability + 2, 0, 100);
      }
      addLog(state, {
        turn: state.turn,
        title: "War ends",
        message: "A negotiated peace ends a costly war. The people are relieved—but grievances remain.",
        tags: ["warn"],
      });
      w.intensity = 0;
    }
  }

  state.wars = state.wars.filter((w) => w.intensity > 0);
}

function randomEvents(state: GameState, rngSeedTurn: number) {
  const rng = createRng(rngSeedTurn ^ 0x9e3779b9);
  const player = state.countries[state.playerCountryId]!;

  // Event chance scales with instability and debt.
  const risk =
    0.08 +
    (50 - player.stability) / 260 +
    player.debtB / 500 +
    player.warExhaustion / 500;

  if (rng.next() > clamp(risk, 0.06, 0.45)) return;

  const roll = rng.next();
  if (roll < 0.25) {
    const hit = rng.int(2, 7);
    player.stability = clamp(player.stability - hit, 0, 100);
    player.legitimacy = clamp(player.legitimacy - Math.ceil(hit / 2), 0, 100);
    addLog(state, {
      turn: state.turn,
      title: "Scandal",
      message: `A corruption scandal hits the capital. Stability drops by ${hit}.`,
      tags: ["bad"],
    });
  } else if (roll < 0.5) {
    const gain = round2(player.gdpB * (0.006 + rng.next() * 0.01));
    player.treasuryB = round2(player.treasuryB + gain);
    player.stability = clamp(player.stability + 2, 0, 100);
    addLog(state, {
      turn: state.turn,
      title: "Booming quarter",
      message: `Trade flows surge; customs bring in +${gain}B.`,
      tags: ["good"],
    });
  } else if (roll < 0.72) {
    const loss = round2(player.gdpB * (0.006 + rng.next() * 0.012));
    player.treasuryB = round2(Math.max(0, player.treasuryB - loss));
    player.stability = clamp(player.stability - 2, 0, 100);
    addLog(state, {
      turn: state.turn,
      title: "Poor harvest",
      message: `Food prices rise; emergency imports cost ${loss}B.`,
      tags: ["warn"],
    });
  } else {
    const gain = rng.int(1, 4);
    player.tech = clamp(player.tech + gain, 0, 100);
    addLog(state, {
      turn: state.turn,
      title: "Breakthrough",
      message: `A research institute publishes key results. Tech +${gain}.`,
      tags: ["good"],
    });
  }
}

function aiTurn(state: GameState, rngSeedTurn: number) {
  const rng = createRng(rngSeedTurn ^ 0x243f6a88);
  const ids = Object.keys(state.countries) as CountryId[];
  const player = state.playerCountryId;

  for (const id of ids) {
    if (id === player) continue;
    const c = state.countries[id]!;

    // Mild drift for AI tax rates toward 0.22
    c.taxRate = clamp(c.taxRate + (0.22 - c.taxRate) * 0.08, 0.08, 0.45);

    // Occasional diplomacy: improve relations with someone
    if (rng.next() < 0.12) {
      const target = rng.pick(ids.filter((x) => x !== id));
      const r = getRelation(state.relations, id, target);
      r.score = clamp(r.score + rng.int(2, 6), -100, 100);
    }

    // AI may declare rivalry against strong neighbors or if relations are poor
    if (rng.next() < 0.05) {
      const target = rng.pick(ids.filter((x) => x !== id));
      const r = getRelation(state.relations, id, target);
      if (r.score < -35 && !r.alliance) r.rivalry = true;
    }

    // AI may start wars rarely
    const alreadyAtWar = state.wars.some(
      (w) => w.attackers.includes(id) || w.defenders.includes(id),
    );
    if (!alreadyAtWar && rng.next() < 0.02) {
      const target = rng.pick(ids.filter((x) => x !== id));
      const r = getRelation(state.relations, id, target);
      const can = r.score < -40 || r.rivalry;
      if (can) {
        const war: War = {
          id: `war-${state.turn}-${id}-${target}`,
          attackers: [id],
          defenders: [target],
          startTurn: state.turn,
          intensity: 0.35,
        };
        state.wars.push(war);
        addLog(state, {
          turn: state.turn,
          title: "War breaks out",
          message: `${c.name} declares war on ${state.countries[target]!.name}.`,
          tags: ["warn"],
        });
      }
    }
  }
}

export type ApplyActionResult = { ok: true } | { ok: false; error: string };

export function applyPlayerAction(
  state: GameState,
  actionId: ActionId,
  targetCountryId?: CountryId,
): ApplyActionResult {
  const me = state.countries[state.playerCountryId]!;
  const target =
    targetCountryId && state.countries[targetCountryId] ? state.countries[targetCountryId] : null;

  const needTarget = ACTIONS.find((a) => a.id === actionId)?.requiresTargetCountry ?? false;
  if (needTarget && !target) return { ok: false, error: "Pick a target country first." };
  if (target && target.id === me.id) return { ok: false, error: "You can't target yourself." };

  const spend = (amountB: number) => {
    me.treasuryB = round2(me.treasuryB - amountB);
    if (me.treasuryB < 0) {
      me.debtB = round2(me.debtB + Math.abs(me.treasuryB));
      me.treasuryB = 0;
    }
  };

  switch (actionId) {
    case "raise_taxes": {
      me.taxRate = clamp(me.taxRate + 0.02, 0.05, 0.5);
      me.stability = clamp(me.stability - 3, 0, 100);
      me.legitimacy = clamp(me.legitimacy - 2, 0, 100);
      addLog(state, {
        turn: state.turn,
        title: "Policy",
        message: `Taxes increased to ${(me.taxRate * 100).toFixed(0)}%.`,
        tags: ["warn"],
      });
      return { ok: true };
    }
    case "lower_taxes": {
      me.taxRate = clamp(me.taxRate - 0.02, 0.05, 0.5);
      me.stability = clamp(me.stability + 3, 0, 100);
      addLog(state, {
        turn: state.turn,
        title: "Policy",
        message: `Taxes reduced to ${(me.taxRate * 100).toFixed(0)}%.`,
        tags: ["good"],
      });
      return { ok: true };
    }
    case "invest_economy": {
      const cost = 6 + me.gdpB * 0.004;
      if (me.treasuryB < cost * 0.5) return { ok: false, error: "Not enough treasury." };
      spend(cost);
      me.gdpB = round2(me.gdpB * 1.01);
      me.stability = clamp(me.stability + 1, 0, 100);
      addLog(state, {
        turn: state.turn,
        title: "Investment",
        message: `You fund infrastructure and industry (-${round2(cost)}B). GDP begins to climb.`,
        tags: ["good"],
      });
      return { ok: true };
    }
    case "invest_admin": {
      const cost = 5.5 + (100 - me.admin) * 0.06;
      if (me.treasuryB < cost * 0.5) return { ok: false, error: "Not enough treasury." };
      spend(cost);
      me.admin = clamp(me.admin + 3, 0, 100);
      me.legitimacy = clamp(me.legitimacy + 1, 0, 100);
      addLog(state, {
        turn: state.turn,
        title: "Reform",
        message: `You streamline bureaucracy (-${round2(cost)}B). Admin +3.`,
        tags: ["good"],
      });
      return { ok: true };
    }
    case "invest_tech": {
      const cost = 6.5 + (100 - me.tech) * 0.07;
      if (me.treasuryB < cost * 0.5) return { ok: false, error: "Not enough treasury." };
      spend(cost);
      me.tech = clamp(me.tech + 3, 0, 100);
      addLog(state, {
        turn: state.turn,
        title: "Research",
        message: `You expand grants and labs (-${round2(cost)}B). Tech +3.`,
        tags: ["good"],
      });
      return { ok: true };
    }
    case "recruit_army": {
      const cost = 4.0 + me.army * 0.08;
      if (me.treasuryB < cost * 0.5) return { ok: false, error: "Not enough treasury." };
      spend(cost);
      me.army = Math.round(me.army + 6 + me.conscription * 10);
      me.stability = clamp(me.stability - 2, 0, 100);
      addLog(state, {
        turn: state.turn,
        title: "Military",
        message: `New regiments raised (-${round2(cost)}B). Army strengthened.`,
        tags: ["info"],
      });
      return { ok: true };
    }
    case "expand_navy": {
      const cost = 5.0 + me.navy * 0.12;
      if (me.treasuryB < cost * 0.5) return { ok: false, error: "Not enough treasury." };
      spend(cost);
      me.navy = Math.round(me.navy + 4);
      addLog(state, {
        turn: state.turn,
        title: "Navy",
        message: `Shipyards deliver new hulls (-${round2(cost)}B). Navy expanded.`,
        tags: ["info"],
      });
      return { ok: true };
    }
    case "ease_conscription": {
      me.conscription = clamp(me.conscription - 0.05, 0, 1);
      me.stability = clamp(me.stability + 3, 0, 100);
      addLog(state, {
        turn: state.turn,
        title: "Policy",
        message: `Conscription eased to ${(me.conscription * 100).toFixed(0)}%.`,
        tags: ["good"],
      });
      return { ok: true };
    }
    case "increase_conscription": {
      me.conscription = clamp(me.conscription + 0.05, 0, 1);
      me.army = Math.round(me.army + 3);
      me.stability = clamp(me.stability - 3, 0, 100);
      addLog(state, {
        turn: state.turn,
        title: "Policy",
        message: `Conscription increased to ${(me.conscription * 100).toFixed(0)}%.`,
        tags: ["warn"],
      });
      return { ok: true };
    }
    case "improve_relations": {
      if (!target) return { ok: false, error: "Pick a target country first." };
      const r = getRelation(state.relations, me.id, target.id);
      const cost = 2.5;
      if (me.treasuryB < cost) return { ok: false, error: "Not enough treasury." };
      spend(cost);
      r.score = clamp(r.score + 12, -100, 100);
      r.rivalry = false;
      addLog(state, {
        turn: state.turn,
        title: "Diplomacy",
        message: `Envoys dispatched to ${target.name} (-${cost}B). Relations improve.`,
        tags: ["good"],
      });
      return { ok: true };
    }
    case "sabotage_relations": {
      if (!target) return { ok: false, error: "Pick a target country first." };
      const r = getRelation(state.relations, me.id, target.id);
      const cost = 2.0;
      if (me.treasuryB < cost) return { ok: false, error: "Not enough treasury." };
      spend(cost);
      r.score = clamp(r.score - 12, -100, 100);
      me.legitimacy = clamp(me.legitimacy - 1, 0, 100);
      addLog(state, {
        turn: state.turn,
        title: "Covert action",
        message: `A deniable operation undermines ties with ${target.name} (-${cost}B).`,
        tags: ["warn"],
      });
      return { ok: true };
    }
    case "declare_rivalry": {
      if (!target) return { ok: false, error: "Pick a target country first." };
      const r = getRelation(state.relations, me.id, target.id);
      r.rivalry = true;
      r.alliance = false;
      r.score = clamp(r.score - 10, -100, 100);
      addLog(state, {
        turn: state.turn,
        title: "Rivalry",
        message: `You declare ${target.name} a rival. Tensions rise.`,
        tags: ["warn"],
      });
      return { ok: true };
    }
    case "offer_alliance": {
      if (!target) return { ok: false, error: "Pick a target country first." };
      const r = getRelation(state.relations, me.id, target.id);
      if (r.rivalry) return { ok: false, error: "You can't ally a declared rival." };
      const chance = clamp(0.12 + (r.score + 100) / 260, 0.08, 0.75);
      const rng = createRng((state.seed ^ state.turn) >>> 0);
      if (rng.next() < chance) {
        r.alliance = true;
        r.score = clamp(r.score + 10, -100, 100);
        addLog(state, {
          turn: state.turn,
          title: "Alliance",
          message: `${target.name} accepts your alliance proposal.`,
          tags: ["good"],
        });
      } else {
        r.score = clamp(r.score - 4, -100, 100);
        addLog(state, {
          turn: state.turn,
          title: "Diplomacy",
          message: `${target.name} declines your alliance proposal.`,
          tags: ["warn"],
        });
      }
      return { ok: true };
    }
    case "declare_war": {
      if (!target) return { ok: false, error: "Pick a target country first." };
      const already = state.wars.some(
        (w) =>
          (w.attackers.includes(me.id) && w.defenders.includes(target.id)) ||
          (w.attackers.includes(target.id) && w.defenders.includes(me.id)),
      );
      if (already) return { ok: false, error: "You are already at war with them." };
      const r = getRelation(state.relations, me.id, target.id);
      if (r.alliance) return { ok: false, error: "You are allied with them." };
      const war: War = {
        id: `war-${state.turn}-${me.id}-${target.id}`,
        attackers: [me.id],
        defenders: [target.id],
        startTurn: state.turn,
        intensity: 0.42,
      };
      state.wars.push(war);
      r.score = clamp(r.score - 25, -100, 100);
      r.rivalry = true;
      addLog(state, {
        turn: state.turn,
        title: "War declared",
        message: `You declare war on ${target.name}.`,
        tags: ["bad"],
      });
      return { ok: true };
    }
    case "seek_peace": {
      if (!target) return { ok: false, error: "Pick a target country first." };
      const idx = state.wars.findIndex(
        (w) =>
          (w.attackers.includes(me.id) && w.defenders.includes(target.id)) ||
          (w.attackers.includes(target.id) && w.defenders.includes(me.id)),
      );
      if (idx === -1) return { ok: false, error: "You are not at war with them." };
      const rng = createRng((state.seed + state.turn * 99991) >>> 0);
      const myExh = me.warExhaustion;
      const theirExh = state.countries[target.id]!.warExhaustion;
      const chance = clamp(0.18 + (myExh + theirExh) / 240, 0.12, 0.85);
      if (rng.next() < chance) {
        state.wars.splice(idx, 1);
        addLog(state, {
          turn: state.turn,
          title: "Peace",
          message: `Peace is signed with ${target.name}.`,
          tags: ["good"],
        });
        me.stability = clamp(me.stability + 4, 0, 100);
        me.legitimacy = clamp(me.legitimacy + 2, 0, 100);
      } else {
        addLog(state, {
          turn: state.turn,
          title: "Peace rejected",
          message: `${target.name} refuses peace terms.`,
          tags: ["warn"],
        });
      }
      return { ok: true };
    }
    default:
      return { ok: false, error: "Unknown action." };
  }
}

export function advanceTurn(state: GameState) {
  // Snapshot RNG seed for this turn so outcomes are reproducible.
  const turnSeed = (state.seed ^ (state.turn * 2654435761)) >>> 0;

  // Budget, growth, and war exhaustion tick for all
  for (const id of Object.keys(state.countries) as CountryId[]) {
    const c = state.countries[id]!;
    applyBudget(state, c);
    c.gdpB = round2(Math.max(20, c.gdpB * (1 + gdpGrowthRate(c))));
    tickWarExhaustion(state, c);

    // Small natural recovery / drift
    c.legitimacy = clamp(c.legitimacy + (c.stability > 55 ? 0.4 : -0.2), 0, 100);
    c.stability = clamp(c.stability + (c.treasuryB > 8 ? 0.5 : -0.1), 0, 100);

    // Soft cap military sizes
    const cap = Math.round(c.populationM * (0.9 + c.conscription * 1.6));
    if (c.army > cap) c.army = Math.round(c.army - (c.army - cap) * 0.12);
  }

  aiTurn(state, turnSeed);
  simulateWars(state, turnSeed);

  // Player-facing events after systemic changes
  randomEvents(state, turnSeed);

  // Drift relations a little
  const rng = createRng(turnSeed ^ 0xdeadbeef);
  for (const r of state.relations) {
    const drift = (r.alliance ? 0.8 : 0) + (r.rivalry ? -0.8 : 0) + (rng.next() - 0.5) * 1.6;
    r.score = clamp(r.score + drift, -100, 100);
  }

  state.turn += 1;
}

export function summarizeStatus(c: Country): { label: string; tone: "good" | "bad" | "warn" } {
  const risk =
    (50 - c.stability) * 1.1 + (50 - c.legitimacy) * 0.8 + c.warExhaustion * 0.7 + c.debtB / 8;
  if (risk < 20) return { label: "Secure", tone: "good" };
  if (risk < 55) return { label: "Tense", tone: "warn" };
  return { label: "Fragile", tone: "bad" };
}

