"use client";

import { Loader2, Radio, Search, Signal, Wallet } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { parseEventLogs, type Address } from "viem";
import {
  useAccount,
  useConnect,
  useDisconnect,
  useReadContract,
  useSwitchChain,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { base } from "wagmi/chains";
import {
  MAX_NOTE_LENGTH,
  MAX_STATION_LENGTH,
  TONES,
  waveNoteAbi,
  waveNoteContractAddress,
} from "@/lib/wave-note";

const PRESETS = [
  { station: "Morning Build", frequency: 27, tone: "Clear", note: "Shipping a tiny interface today. Keep the signal useful and visible." },
  { station: "Night Desk", frequency: 64, tone: "Deep", note: "Late session, one clean fix, no extra noise before deploy." },
  { station: "Launch Room", frequency: 88, tone: "Bright", note: "Ready to broadcast a fresh update from the Base app console." },
] as const;

function shortAddress(address?: Address) {
  if (!address || address === "0x0000000000000000000000000000000000000000") return "--";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function formatDate(value?: bigint) {
  if (!value) return "--";
  return new Date(Number(value) * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function friendlyError(error: unknown) {
  if (!(error instanceof Error)) return "Transaction was cancelled.";
  if (error.message.includes("User rejected")) return "Request cancelled in wallet.";
  if (error.message.includes("Invalid station")) return "Station needs 1 to 40 characters.";
  if (error.message.includes("Invalid frequency")) return "Frequency must be 1 to 99.";
  if (error.message.includes("Invalid tone")) return "Choose a tone.";
  if (error.message.includes("Invalid note")) return "Note needs 1 to 120 characters.";
  return error.message;
}

function WaveDisplay({
  station,
  frequency,
  tone,
  note,
  maker,
  createdAt,
}: {
  station: string;
  frequency: number;
  tone: string;
  note: string;
  maker?: Address;
  createdAt?: bigint;
}) {
  return (
    <article className="radio-unit">
      <div className="speaker">
        {Array.from({ length: 18 }).map((_, index) => <span key={index} />)}
      </div>
      <section className="tuner">
        <p>Wave Note</p>
        <h2>{station || "Untitled station"}</h2>
        <div className="dial-row">
          <div className="dial">
            <strong>{frequency.toString().padStart(2, "0")}</strong>
            <span>MHz</span>
          </div>
          <div className="tone-card">
            <span>Tone</span>
            <strong>{tone}</strong>
          </div>
        </div>
        <div className="frequency-bar" style={{ "--level": `${frequency}%` } as React.CSSProperties}>
          <span />
        </div>
        <blockquote>{note || "Tune a short public signal on Base."}</blockquote>
        <footer>
          <div><span>Wallet</span><strong>{shortAddress(maker)}</strong></div>
          <div><span>Broadcast</span><strong>{formatDate(createdAt)}</strong></div>
        </footer>
      </section>
    </article>
  );
}

export function WaveNoteApp() {
  const [waveIdInput, setWaveIdInput] = useState("1");
  const [station, setStation] = useState<string>(PRESETS[0].station);
  const [frequency, setFrequency] = useState<number>(PRESETS[0].frequency);
  const [tone, setTone] = useState<string>(PRESETS[0].tone);
  const [note, setNote] = useState<string>(PRESETS[0].note);
  const [message, setMessage] = useState("Tune a short signal, then save it on Base.");
  const [lastAction, setLastAction] = useState<"save" | null>(null);

  const { address, chainId, connector, isConnected } = useAccount();
  const { connectors, connectAsync, isPending: connecting } = useConnect();
  const { disconnectAsync } = useDisconnect();
  async function disconnectWallet() {
    try {
      if (connector) {
        await disconnectAsync({ connector });
      } else {
        await disconnectAsync();
      }
    } catch {}
  }
  const { switchChain, isPending: switching } = useSwitchChain();
  const { data: hash, writeContractAsync, isPending: writing } = useWriteContract();
  const { data: receipt, isLoading: confirming } = useWaitForTransactionReceipt({ hash });
  const selectedConnector = connectors.find((connector) => connector.id === "injected") ?? connectors.find((connector) => connector.id === "baseAccount") ?? connectors[0];
  const parsedWaveId = BigInt(Math.max(1, Number(waveIdInput || "1")));

  const waveQuery = useReadContract({
    abi: waveNoteAbi,
    address: waveNoteContractAddress,
    functionName: "getWave",
    args: [parsedWaveId],
    query: { enabled: Boolean(waveNoteContractAddress), refetchInterval: 12000 },
  });
  const totalQuery = useReadContract({
    abi: waveNoteAbi,
    address: waveNoteContractAddress,
    functionName: "nextWaveId",
    query: { enabled: Boolean(waveNoteContractAddress), refetchInterval: 12000 },
  });

  const tuple = waveQuery.data as readonly [Address, string, number, string, string, bigint] | undefined;
  const liveWave = useMemo(() => tuple ? {
    maker: tuple[0],
    station: tuple[1],
    frequency: Number(tuple[2]),
    tone: tuple[3],
    note: tuple[4],
    createdAt: tuple[5],
  } : undefined, [tuple]);

  const totalWaves = totalQuery.data ? Math.max(Number(totalQuery.data) - 1, 0) : 0;
  const validFields =
    station.trim().length > 0 &&
    station.trim().length <= MAX_STATION_LENGTH &&
    frequency >= 1 &&
    frequency <= 99 &&
    tone.trim().length > 0 &&
    note.trim().length > 0 &&
    note.trim().length <= MAX_NOTE_LENGTH;
  const saveBlocker = !waveNoteContractAddress
    ? "Contract not deployed yet. Run npm run deploy:contract, then add NEXT_PUBLIC_WAVE_NOTE_CONTRACT_ADDRESS."
    : !isConnected
      ? "Connect wallet first."
      : chainId !== base.id
        ? "Switch to Base first."
        : !validFields
          ? "Fill the station, frequency, tone, and note."
          : "";

  useEffect(() => {
    if (!receipt || lastAction !== "save") return;
    void totalQuery.refetch();
    void waveQuery.refetch();
    const logs = parseEventLogs({ abi: waveNoteAbi, logs: receipt.logs, eventName: "WaveSaved" });
    const waveId = logs[0]?.args.waveId;
    window.setTimeout(() => {
      if (waveId) setWaveIdInput(waveId.toString());
      setMessage(waveId ? `Wave #${waveId.toString()} broadcast on Base.` : "Wave broadcast on Base.");
    }, 0);
  }, [lastAction, receipt, totalQuery, waveQuery]);

  async function connectWallet() {
    const queue = [connectors.find((connector) => connector.id === "injected"), connectors.find((connector) => connector.id === "baseAccount"), selectedConnector]
      .filter((connector): connector is NonNullable<typeof selectedConnector> => Boolean(connector))
      .filter((connector, index, list) => list.findIndex((item) => item.id === connector.id) === index);
    if (!queue.length) {
      setMessage("No wallet connector found. Open this app inside Base App or a wallet browser.");
      return;
    }
    let lastError: unknown;
    setMessage("Opening wallet connection...");
    for (const connector of queue) {
      try {
        await connectAsync({ connector });
        setMessage("Wallet connected. Broadcast when ready.");
        return;
      } catch (error) {
        lastError = error;
      }
    }
    setMessage(friendlyError(lastError));
  }

  async function saveWave() {
    const contractAddress = waveNoteContractAddress;
    if (saveBlocker) {
      setMessage(saveBlocker);
      return;
    }
    if (!contractAddress) return;
    try {
      setLastAction("save");
      setMessage("Confirm the wave in your wallet.");
      await writeContractAsync({
        address: contractAddress,
        abi: waveNoteAbi,
        functionName: "saveWave",
        args: [station.trim(), frequency, tone.trim(), note.trim()],
        chainId: base.id,
      });
      setMessage("Wave sent. Waiting for Base confirmation...");
    } catch (error) {
      setMessage(friendlyError(error));
    }
  }

  function applyPreset(index: number) {
    const preset = PRESETS[index];
    setStation(preset.station);
    setFrequency(preset.frequency);
    setTone(preset.tone);
    setNote(preset.note);
  }

  return (
    <main className="wave-shell">
      <section className="control-deck">
        <header className="deck-head">
          <div><p>Wave Note</p><h1>Tune a signal.</h1></div>
          <Radio />
        </header>
        <div className="deck-stats">
          <div><span>Waves</span><strong>{totalWaves}</strong></div>
          <div><span>Chain</span><strong>Base</strong></div>
        </div>
        <div className="preset-strip">
          {PRESETS.map((preset, index) => (
            <button key={preset.station} onClick={() => applyPreset(index)}>
              <span>{preset.frequency}</span>
              <div><strong>{preset.station}</strong><small>{preset.tone} / {preset.note}</small></div>
            </button>
          ))}
        </div>
        <label><span>Station</span><input value={station} onChange={(event) => setStation(event.target.value)} maxLength={MAX_STATION_LENGTH} /></label>
        <label className="range-label"><span>Frequency {frequency.toString().padStart(2, "0")}</span><input type="range" min="1" max="99" value={frequency} onChange={(event) => setFrequency(Number(event.target.value))} /></label>
        <div className="tone-grid">
          {TONES.map((item) => <button key={item} className={tone === item ? "active" : ""} onClick={() => setTone(item)}>{item}</button>)}
        </div>
        <div className="wave-actions">
          {isConnected && chainId !== base.id ? (
            <button className="broadcast" disabled={switching} onClick={() => switchChain({ chainId: base.id })}>{switching ? <Loader2 className="h-4 w-4 animate-spin" /> : null}Switch to Base</button>
          ) : (
            <button className="broadcast" disabled={writing || confirming} onClick={saveWave}>{writing || confirming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Signal className="h-4 w-4" />}Broadcast on Base</button>
          )}
          {isConnected ? (
            <button className="wallet" onClick={disconnectWallet}>{shortAddress(address)}</button>
          ) : (
            <button className="wallet" disabled={!selectedConnector || connecting} onClick={connectWallet}>{connecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wallet className="h-4 w-4" />}Connect wallet</button>
          )}
        </div>
        <label><span>Signal note</span><textarea value={note} onChange={(event) => setNote(event.target.value)} maxLength={MAX_NOTE_LENGTH} rows={3} /></label>
        <p className="wave-status">{message}</p>
        {hash ? <a className="wave-tx" href={`https://basescan.org/tx/${hash}`} rel="noreferrer" target="_blank">View transaction on BaseScan</a> : null}
      </section>
      <section className="stage">
        <WaveDisplay
          station={liveWave?.station || station}
          frequency={liveWave?.frequency || frequency}
          tone={liveWave?.tone || tone}
          note={liveWave?.note || note}
          maker={liveWave?.maker}
          createdAt={liveWave?.createdAt}
        />
        <div className="stage-lower">
          <section className="load-wave"><div><Search /><h2>Load wave</h2></div><label><span>Wave ID</span><input value={waveIdInput} onChange={(event) => setWaveIdInput(event.target.value.replace(/\D/g, ""))} /></label></section>
          <section className="about-wave"><p>What it does</p><strong>Wave Note saves a small radio-style signal with station, frequency, tone, note, wallet, and timestamp on Base.</strong></section>
        </div>
      </section>
    </main>
  );
}
