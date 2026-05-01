import React, { useMemo, useState } from "react";
import {
  ACTIONS,
  advanceTurn,
  applyPlayerAction,
  createNewGame,
  listOtherCountries,
  summarizeStatus,
} from "../sim/engine";
import { hashSeedFromString } from "../sim/rand";
import { clearSave, loadGame, saveGame } from "../sim/storage";
import { CountryId, GameState } from "../sim/types";

function formatB(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1000) return `${(n / 1000).toFixed(2)}T`;
  if (abs >= 10) return `${n.toFixed(1)}B`;
  return `${n.toFixed(2)}B`;
}

function pct(n: number): string {
  return `${(n * 100).toFixed(0)}%`;
}

function scoreBadge(score: number): { label: string; className: string } {
  if (score >= 45) return { label: `Friendly (${score.toFixed(0)})`, className: "badge good" };
  if (score >= 10) return { label: `Warm (${score.toFixed(0)})`, className: "badge" };
  if (score >= -10) return { label: `Neutral (${score.toFixed(0)})`, className: "badge" };
  if (score >= -45) return { label: `Cold (${score.toFixed(0)})`, className: "badge" };
  return { label: `Hostile (${score.toFixed(0)})`, className: "badge bad" };
}

function getRel(state: GameState, a: CountryId, b: CountryId) {
  const key = a < b ? `${a}|${b}` : `${b}|${a}`;
  const r = state.relations.find((x) => {
    const k = x.a < x.b ? `${x.a}|${x.b}` : `${x.b}|${x.a}`;
    return k === key;
  });
  if (!r) throw new Error("missing relation");
  return r;
}

const START_COUNTRY: CountryId = "AUR";

export function App() {
  const [seedText, setSeedText] = useState("new-world");
  const [startCountryId, setStartCountryId] = useState<CountryId>(START_COUNTRY);
  const [targetCountryId, setTargetCountryId] = useState<CountryId | "">("");
  const [toast, setToast] = useState<string | null>(null);

  const [state, setState] = useState<GameState | null>(() => loadGame());

  const countriesList = useMemo(() => {
    if (!state) return null;
    return Object.values(state.countries).sort((a, b) => a.name.localeCompare(b.name));
  }, [state]);

  const player = state ? state.countries[state.playerCountryId] : null;
  const otherCountries = state ? listOtherCountries(state) : [];

  const status = player ? summarizeStatus(player) : null;

  const beginNewGame = () => {
    const seed = hashSeedFromString(seedText.trim() || "new-world");
    const s = createNewGame(seed, startCountryId);
    saveGame(s);
    setState(s);
    setTargetCountryId("");
    setToast(null);
  };

  const doAction = (actionId: (typeof ACTIONS)[number]["id"]) => {
    if (!state) return;
    const res = applyPlayerAction(
      state,
      actionId,
      targetCountryId === "" ? undefined : targetCountryId,
    );
    if (!res.ok) {
      setToast(res.error);
      return;
    }
    saveGame({ ...state });
    setState({ ...state });
    setToast(null);
  };

  const endTurn = () => {
    if (!state) return;
    advanceTurn(state);
    saveGame({ ...state });
    setState({ ...state });
    setToast(null);
  };

  const doLoad = () => {
    const s = loadGame();
    if (!s) {
      setToast("No save found.");
      return;
    }
    setState(s);
    setToast(null);
  };

  const doClear = () => {
    clearSave();
    setState(null);
    setToast(null);
  };

  return (
    <div className="container">
      <div className="topbar">
        <div className="title">
          <h1>Grand Strategy Country Sim</h1>
          <div className="sub">
            Turn-based sandbox: economy, legitimacy, diplomacy, wars, events.
          </div>
        </div>
        <div className="toolbar">
          <button className="btn" onClick={doLoad}>
            Load save
          </button>
          <button className="btn danger" onClick={doClear}>
            Clear
          </button>
          <button className="btn primary" onClick={beginNewGame}>
            New game
          </button>
        </div>
      </div>

      {!state ? (
        <div className="panel">
          <div className="panelHeader">
            <h2>Start</h2>
            <div className="meta">Configure your run</div>
          </div>
          <div className="panelBody">
            <div className="row" style={{ marginBottom: 10 }}>
              <div className="hint">
                Pick a seed (same seed = same world) and choose your country.
              </div>
            </div>
            <div className="row" style={{ marginBottom: 12 }}>
              <input
                className="select"
                style={{ minWidth: 240 }}
                value={seedText}
                onChange={(e) => setSeedText(e.target.value)}
                placeholder="Seed"
              />
              <select
                className="select"
                value={startCountryId}
                onChange={(e) => setStartCountryId(e.target.value as CountryId)}
              >
                {["AUR", "BRY", "CYR", "DOR", "EST", "KHE"].map((id) => (
                  <option key={id} value={id}>
                    {id}
                  </option>
                ))}
              </select>
              <button className="btn primary" onClick={beginNewGame}>
                Begin
              </button>
            </div>
            <div className="hint">
              After starting, take one action per turn, then click “End turn”.
              Wars and random events will shape your run.
            </div>
          </div>
        </div>
      ) : (
        <div className="grid">
          <div className="panel">
            <div className="panelHeader">
              <h2>{player!.name}</h2>
              <div className="meta">
                Turn {state.turn} ·{" "}
                <span className={`badge ${status!.tone}`}>{status!.label}</span>
              </div>
            </div>
            <div className="panelBody">
              <div className="stats">
                <div className="stat">
                  <div className="k">GDP</div>
                  <div className="v">{formatB(player!.gdpB)}</div>
                </div>
                <div className="stat">
                  <div className="k">Treasury</div>
                  <div className="v">{formatB(player!.treasuryB)}</div>
                </div>
                <div className="stat">
                  <div className="k">Debt</div>
                  <div className="v">{formatB(player!.debtB)}</div>
                </div>
                <div className="stat">
                  <div className="k">Stability</div>
                  <div className="v">{player!.stability.toFixed(0)}</div>
                </div>
                <div className="stat">
                  <div className="k">Legitimacy</div>
                  <div className="v">{player!.legitimacy.toFixed(0)}</div>
                </div>
                <div className="stat">
                  <div className="k">War exhaustion</div>
                  <div className="v">{player!.warExhaustion.toFixed(0)}</div>
                </div>
                <div className="stat">
                  <div className="k">Army</div>
                  <div className="v">{player!.army.toFixed(0)}</div>
                </div>
                <div className="stat">
                  <div className="k">Navy</div>
                  <div className="v">{player!.navy.toFixed(0)}</div>
                </div>
                <div className="stat">
                  <div className="k">Tech / Admin</div>
                  <div className="v">
                    {player!.tech.toFixed(0)} / {player!.admin.toFixed(0)}
                  </div>
                </div>
                <div className="stat">
                  <div className="k">Tax rate</div>
                  <div className="v">{pct(player!.taxRate)}</div>
                </div>
                <div className="stat">
                  <div className="k">Conscription</div>
                  <div className="v">{pct(player!.conscription)}</div>
                </div>
                <div className="stat">
                  <div className="k">Population</div>
                  <div className="v">{player!.populationM.toFixed(0)}M</div>
                </div>
              </div>

              <div style={{ height: 12 }} />

              <div className="row" style={{ justifyContent: "space-between" }}>
                <div className="row">
                  <select
                    className="select"
                    value={targetCountryId}
                    onChange={(e) =>
                      setTargetCountryId((e.target.value || "") as CountryId | "")
                    }
                  >
                    <option value="">(target country)</option>
                    {otherCountries.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  {targetCountryId !== "" && (
                    <>
                      <span className={scoreBadge(getRel(state, player!.id, targetCountryId).score).className}>
                        {scoreBadge(getRel(state, player!.id, targetCountryId).score).label}
                      </span>
                      {getRel(state, player!.id, targetCountryId).alliance && (
                        <span className="badge good">Alliance</span>
                      )}
                      {getRel(state, player!.id, targetCountryId).rivalry && (
                        <span className="badge bad">Rivalry</span>
                      )}
                    </>
                  )}
                </div>

                <div className="row">
                  <button className="btn primary" onClick={endTurn}>
                    End turn
                  </button>
                </div>
              </div>

              {toast && (
                <div style={{ marginTop: 10 }} className="hint">
                  <span className="badge bad">Notice</span> {toast}
                </div>
              )}

              <div style={{ height: 12 }} />

              <div className="actions">
                {ACTIONS.map((a) => {
                  const needs = a.requiresTargetCountry;
                  const disabled = needs && targetCountryId === "";
                  return (
                    <div key={a.id} className="card">
                      <h3>{a.name}</h3>
                      <p>{a.description}</p>
                      <div className="cardFooter">
                        <div className="small">
                          {needs ? "Needs target" : "No target"} · 1 action
                        </div>
                        <button
                          className="btn"
                          disabled={disabled}
                          onClick={() => doAction(a.id)}
                        >
                          Do
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div style={{ height: 12 }} />
              <div className="hint">
                Tip: keep stability above ~55 to avoid spirals. High taxes + high debt +
                war exhaustion is the fastest way to collapse.
              </div>
            </div>
          </div>

          <div className="panel">
            <div className="panelHeader">
              <h2>World</h2>
              <div className="meta">Wars · Countries · Log</div>
            </div>
            <div className="panelBody">
              <div className="card" style={{ marginBottom: 10 }}>
                <h3>Active wars</h3>
                {state.wars.length === 0 ? (
                  <p>No active wars.</p>
                ) : (
                  <div className="hint" style={{ color: "rgba(255,255,255,0.86)" }}>
                    {state.wars.map((w) => (
                      <div key={w.id} style={{ marginBottom: 6 }}>
                        <span className="badge bad">War</span>{" "}
                        {w.attackers.map((id) => state.countries[id]!.name).join(", ")} vs{" "}
                        {w.defenders.map((id) => state.countries[id]!.name).join(", ")}{" "}
                        <span className="small">· intensity {w.intensity.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="card" style={{ marginBottom: 10 }}>
                <h3>Great powers (GDP)</h3>
                <div className="hint" style={{ color: "rgba(255,255,255,0.86)" }}>
                  {(countriesList ?? [])
                    .slice()
                    .sort((a, b) => b.gdpB - a.gdpB)
                    .slice(0, 6)
                    .map((c) => (
                      <div key={c.id} style={{ marginBottom: 4 }}>
                        <span className="badge">{c.id}</span> {c.name} · {formatB(c.gdpB)} ·{" "}
                        <span className="small">army {c.army.toFixed(0)}</span>
                      </div>
                    ))}
                </div>
              </div>

              <div className="card">
                <h3>Recent log</h3>
                <div className="log" style={{ marginTop: 8 }}>
                  {state.log.length === 0 ? (
                    <div className="hint">No entries yet.</div>
                  ) : (
                    state.log.map((e) => (
                      <div key={e.id} className="logItem">
                        <div className="t">
                          <div>{e.title}</div>
                          <div className="when">Turn {e.turn}</div>
                        </div>
                        <div className="msg">{e.message}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

